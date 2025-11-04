import fs from 'fs';
import path from 'path';
import { HttpRequest, HttpResponse } from '../infrastructure/http/types';
import { ENV, isDevelopment } from './env';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: any;
}

class CustomLogger {
  private logFile: string;
  private errorFile: string;

  constructor() {
    this.logFile = path.join(logDir, 'combined.log');
    this.errorFile = path.join(logDir, 'error.log');
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private formatConsoleTimestamp(): string {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }

  private writeToFile(filename: string, entry: LogEntry): void {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(filename, logLine, 'utf8');
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      meta
    };

    this.writeToFile(this.logFile, entry);
    if (level === 'error') {
      this.writeToFile(this.errorFile, entry);
    }

    if (isDevelopment) {
      const colors: Record<LogLevel, string> = {
        debug: '\x1b[36m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m'
      };
      const reset = '\x1b[0m';
      const color = colors[level];
      const time = this.formatConsoleTimestamp();
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${time} ${color}[${level.toUpperCase()}]${reset}: ${message}${metaStr}`);
    }
  }

  debug(message: string, meta?: any): void {
    if (isDevelopment) {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | any): void {
    const meta = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    this.log('error', message, meta);
  }
}

export const logger = new CustomLogger();

export const logRequest = async (req: HttpRequest, res: HttpResponse, next: () => Promise<void>) => {
  const start = Date.now();
  const { method, path: url } = req;
  const ip = req.headers['x-forwarded-for'] || req.raw.socket.remoteAddress || 'unknown';

  await next();

  const duration = Date.now() - start;
  const statusCode = res.statusCode || 200;

  const logData = {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    ip,
    userAgent: req.headers['user-agent'] || 'unknown'
  };

  if (statusCode >= 500) {
    logger.error('HTTP Request', logData);
  } else if (statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

export default logger;
