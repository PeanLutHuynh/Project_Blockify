import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/common';
import { logger } from '../config/logger';

export const urlSecurityCheck = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const url = req.originalUrl;
  const method = req.method;

  // Check for path traversal attempts
  const pathTraversalPatterns = [
    /\.\.\//g,                 // ../ sequences
    /\.\.\\/g,                 // ..\ sequences (Windows)
    /%2e%2e%2f/gi,            // URL encoded ../
    /%2e%2e%5c/gi,            // URL encoded ..\
    /\.\.%2f/gi,              // Mixed encoding
    /\.\.%5c/gi,              // Mixed encoding
    /%252e%252e%252f/gi,      // Double URL encoded
    /\.{2,}/g                 // Multiple dots
  ];

  const hasPathTraversal = pathTraversalPatterns.some(pattern => pattern.test(url));
  
  if (hasPathTraversal) {
    logger.error('Path traversal attempt detected:', {
      url,
      method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'CRITICAL'
    });

    const response: ApiResponse = {
      success: false,
      message: 'Invalid URL format',
      error: 'Path traversal attempts are not allowed'
    };

    res.status(400).json(response);
    return;
  }

  // Check for suspicious URL patterns
  const suspiciousPatterns = [
    /\/\.{1,2}\//g,           // Hidden directories
    /\/~[^\/]*\//g,           // User directories
    /\/dev\//gi,              // Device files
    /\/proc\//gi,             // Process files
    /\/sys\//gi,              // System files
    /\/var\/log/gi,           // Log files
    /\/tmp\//gi,              // Temporary files
    /\/boot\//gi,             // Boot files
    /\/root\//gi,             // Root directory
    /\/home\//gi,             // Home directories
    /\/windows\//gi,          // Windows directories
    /\/program files/gi,      // Windows program files
    /\/system32\//gi,         // Windows system
    /\/winnt\//gi,            // Windows NT
    /\/inetpub\//gi,          // IIS web root
    /\/wwwroot\//gi,          // Web root directories
    /\/cgi-bin\//gi,          // CGI directories
    /\/scripts\//gi,          // Script directories
    /\/admin\//gi,            // Admin panels
    /\/manager\//gi,          // Manager interfaces
    /\/console\//gi,          // Console interfaces
    /\/dashboard\//gi,        // Dashboard interfaces (if not part of app)
    /\/debug\//gi,            // Debug interfaces
    /\/test\//gi,             // Test environments
    /\/staging\//gi,          // Staging environments
    /\/backup\//gi,           // Backup directories
    /\/db\//gi,               // Database directories
    /\/database\//gi,         // Database directories
    /\/sql\//gi,              // SQL files
    /\/dump\//gi,             // Database dumps
    /\/config\//gi,           // Config directories
    /\/conf\//gi,             // Configuration
    /\/settings\//gi,         // Settings
    /\/env/gi,                // Environment files
    /\/\.git\//gi,            // Git repositories
    /\/\.svn\//gi,            // SVN repositories
    /\/\.hg\//gi,             // Mercurial repositories
    /\/node_modules\//gi,     // Node modules
    /\/vendor\//gi,           // Vendor directories
    /\/composer\//gi,         // Composer files
    /\/package\.json/gi,      // Package files
    /\/yarn\.lock/gi,         // Lock files
    /\/\.htaccess/gi,         // Apache config
    /\/\.htpasswd/gi,         // Apache passwords
    /\/web\.config/gi,        // IIS config
    /\/crossdomain\.xml/gi,   // Flash policy
    /\/clientaccesspolicy\.xml/gi, // Silverlight policy
    /\/robots\.txt/gi,        // Robots file (might be ok, but log)
    /\/sitemap\.xml/gi,       // Sitemap (might be ok, but log)
    /\/\.well-known\//gi,     // Well-known URIs (might be ok for some use cases)
    /\.(bak|backup|old|orig|tmp|temp|log|ini|conf|config|cfg|inc|sql|db|dbf|mdb|sqlite|env|key|pem|p12|pfx|jks|keystore)$/gi, // Sensitive file extensions
    /\.(php|asp|aspx|jsp|jspx|cfm|cgi|pl|py|rb|sh|bat|cmd|exe|dll|so|dylib)$/gi, // Executable extensions
    /\.(zip|rar|tar|gz|7z|bz2|xz|tgz|tbz|tbz2)$/gi, // Archive files
    /null/gi,                 // Null byte injection attempts
    /%00/gi,                  // URL encoded null byte
    /%0a/gi,                  // Line feed injection
    /%0d/gi,                  // Carriage return injection
    /%09/gi,                  // Tab injection
    /%20/gi,                  // Space (might be normal, but worth monitoring)
    /[<>'"]/g,                // HTML/Script injection attempts in URL
    /javascript:/gi,          // JavaScript protocol
    /data:/gi,                // Data protocol
    /vbscript:/gi,            // VBScript protocol
    /file:/gi,                // File protocol
    /ftp:/gi,                 // FTP protocol (if not expected)
    /mailto:/gi,              // Mailto protocol (if not expected)
    /ldap:/gi,                // LDAP protocol
    /gopher:/gi,              // Gopher protocol
    /telnet:/gi,              // Telnet protocol
    /ssh:/gi,                 // SSH protocol
    /exec/gi,                 // Execution commands
    /eval/gi,                 // Evaluation commands
    /system/gi,               // System commands
    /cmd/gi,                  // Command execution
    /shell/gi,                // Shell commands
    /bash/gi,                 // Bash commands
    /powershell/gi,           // PowerShell commands
    /ping/gi,                 // Network commands
    /nslookup/gi,             // DNS lookup
    /wget/gi,                 // File download
    /curl/gi,                 // HTTP client
    /nc/gi,                   // Netcat
    /netcat/gi                // Netcat
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
  
  if (isSuspicious) {
    logger.warn('Suspicious URL pattern detected:', {
      url,
      method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      severity: 'HIGH',
      type: 'SUSPICIOUS_URL'
    });

    // For suspicious patterns, return 404 to not reveal system information
    const response: ApiResponse = {
      success: false,
      message: 'Resource not found',
      error: 'The requested resource does not exist'
    };

    res.status(404).json(response);
    return;
  }

  const MAX_URL_LENGTH = 2048; // Standard URL length limit
  
  if (url.length > MAX_URL_LENGTH) {
    logger.warn('Excessively long URL detected:', {
      url: url.substring(0, 200) + '...',
      length: url.length,
      method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });

    const response: ApiResponse = {
      success: false,
      message: 'URL too long',
      error: 'Request URL exceeds maximum allowed length'
    };

    res.status(414).json(response);
    return;
  }

  const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
  const MAX_PARAMS = 50;
  
  if (urlParams.size > MAX_PARAMS) {
    logger.warn('Excessive URL parameters detected:', {
      url,
      paramCount: urlParams.size,
      method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'MEDIUM'
    });

    const response: ApiResponse = {
      success: false,
      message: 'Too many parameters',
      error: 'Request contains too many URL parameters'
    };

    res.status(400).json(response);
    return;
  }

  const paramNames = Array.from(urlParams.keys());
  const uniqueParams = new Set(paramNames);
  
  if (paramNames.length !== uniqueParams.size) {
    logger.warn('Duplicate URL parameters detected:', {
      url,
      duplicateParams: paramNames.filter((param, index) => paramNames.indexOf(param) !== index),
      method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'LOW'
    });
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|DECLARE|CAST|CONVERT)\b)/gi,
    /(;|--|\/\*|\*\/|'|")/g,
    /(\bOR\b.*\b=\b|\bAND\b.*\b=\b)/gi,
    /(\b1\s*=\s*1\b|\b1\s*=\s*1\b)/gi,
    /(\bunion\b.*\bselect\b)/gi,
    /(\binsert\b.*\binto\b)/gi,
    /(\bupdate\b.*\bset\b)/gi,
    /(\bdelete\b.*\bfrom\b)/gi,
    /(\bdrop\b.*\btable\b)/gi
  ];

  const urlForSqlCheck = decodeURIComponent(url);
  const hasSqlInjection = sqlPatterns.some(pattern => pattern.test(urlForSqlCheck));
  
  if (hasSqlInjection) {
    logger.error('SQL injection attempt in URL detected:', {
      url: urlForSqlCheck,
      method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'CRITICAL',
      type: 'SQL_INJECTION_URL'
    });

    const response: ApiResponse = {
      success: false,
      message: 'Invalid request format',
      error: 'Request contains invalid characters'
    };

    res.status(400).json(response);
    return;
  }

  next();
};

export const parameterValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const commonParams = ['id', 'page', 'limit', 'sort', 'order', 'search', 'q', 'category'];
  
  for (const param of commonParams) {
    if (req.query[param] && Array.isArray(req.query[param])) {
      logger.warn('Parameter pollution detected:', {
        parameter: param,
        values: req.query[param],
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      req.query[param] = (req.query[param] as string[])[0];
    }
  }

  if (req.params.id) {
    const id = req.params.id;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const isNumber = /^\d+$/.test(id);
    
    if (!isUUID && !isNumber) {
      logger.warn('Invalid ID parameter format:', {
        id,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const response: ApiResponse = {
        success: false,
        message: 'Invalid ID format',
        error: 'ID must be a valid UUID or numeric value'
      };

      res.status(400).json(response);
      return;
    }
  }

  next();
};

export const httpMethodValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  
  if (!allowedMethods.includes(req.method)) {
    logger.warn('Invalid HTTP method:', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const response: ApiResponse = {
      success: false,
      message: 'Method not allowed',
      error: `HTTP method ${req.method} is not supported`
    };

    res.status(405).json(response);
    return;
  }

  next();
};