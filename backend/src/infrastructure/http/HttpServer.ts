import * as http from 'http';
import * as https from 'https';
import { parse as parseUrl } from 'url';
import { parse as parseQueryString } from 'querystring';
import { Router } from './Router';
import { MiddlewareChain } from './MiddlewareChain';
import { HttpRequest, HttpResponse, HttpMethod, Middleware, RouteHandler } from './types';

export class HttpServer {
  private server: http.Server | https.Server;
  private router: Router;
  private middlewareChain: MiddlewareChain;
  private port: number;
  private host: string;

  constructor(
    port: number = 3001,
    host: string = 'localhost',
    useHttps: boolean = false,
    httpsOptions?: https.ServerOptions
  ) {
    this.port = port;
    this.host = host;
    this.router = new Router();
    this.middlewareChain = new MiddlewareChain();

    // Create server
    if (useHttps && httpsOptions) {
      this.server = https.createServer(httpsOptions, this.handleRequest.bind(this));
    } else {
      this.server = http.createServer(this.handleRequest.bind(this));
    }
  }

  /**
   * Main request handler
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // Parse URL
    const parsedUrl = parseUrl(req.url || '', true);
    const pathname = parsedUrl.pathname || '/';
    const query = parsedUrl.query;

    // Parse body for POST/PUT/PATCH requests
    const body = await this.parseBody(req);

    // Create custom request object
    const request: HttpRequest = {
      method: (req.method?.toUpperCase() || 'GET') as HttpMethod,
      url: req.url || '/',
      path: pathname,
      query: query as Record<string, string | string[]>,
      params: {},
      headers: req.headers as Record<string, string>,
      body: body,
      cookies: this.parseCookies(req.headers.cookie),
      raw: req
    };

    // Create custom response object
    const response: HttpResponse = {
      statusCode: 200,
      headers: {},
      body: null,
      raw: res,
      status: (code: number) => {
        response.statusCode = code;
        return response;
      },
      setHeader: (key: string, value: string) => {
        response.headers[key] = value;
        return response;
      },
      json: (data: any) => {
        response.setHeader('Content-Type', 'application/json');
        response.body = JSON.stringify(data);
        this.sendResponse(response);
      },
      send: (data: string | Buffer) => {
        if (typeof data === 'string') {
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.body = data;
        } else {
          response.body = data.toString();
        }
        this.sendResponse(response);
      },
      redirect: (url: string, code: number = 302) => {
        response.statusCode = code;
        response.setHeader('Location', url);
        this.sendResponse(response);
      },
      setCookie: (name: string, value: string, options?: any) => {
        const cookie = this.serializeCookie(name, value, options);
        const existing = response.headers['Set-Cookie'];
        if (existing) {
          response.headers['Set-Cookie'] = Array.isArray(existing)
            ? [...existing, cookie]
            : [existing, cookie];
        } else {
          response.headers['Set-Cookie'] = cookie;
        }
        return response;
      }
    };

    try {
      console.log(`[HttpServer] Handling request: ${request.method} ${pathname}`);
      
      // Run middleware chain
      await this.middlewareChain.execute(request, response, async () => {
        console.log(`[HttpServer] Middleware chain complete, finding route...`);
        
        // Find and execute route handler
        const handler = this.router.findRoute(request.method, pathname);
        
        if (handler) {
          console.log(`[HttpServer] Route handler found, executing...`);
          request.params = handler.params;
          await handler.handler(request, response);
        } else {
          console.log(`[HttpServer] No route handler found, returning 404`);
          // 404 Not Found
          response.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Cannot ${request.method} ${pathname}`
            }
          });
        }
      });
    } catch (error: any) {
      // Error handler
      console.error('Server error:', error);
      
      if (!res.headersSent) {
        response.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Internal server error'
          }
        });
      }
    }
  }

  /**
   * Parse request body
   */
  private parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const contentType = req.headers['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            resolve(body ? JSON.parse(body) : {});
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            resolve(parseQueryString(body));
          } else {
            resolve(body);
          }
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Parse cookies from header
   */
  private parseCookies(cookieHeader?: string): Record<string, string> {
    if (!cookieHeader) return {};

    return cookieHeader.split(';').reduce((cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    }, {} as Record<string, string>);
  }

  /**
   * Serialize cookie
   */
  private serializeCookie(name: string, value: string, options: any = {}): string {
    let cookie = `${name}=${encodeURIComponent(value)}`;

    if (options.maxAge) {
      cookie += `; Max-Age=${options.maxAge}`;
    }
    if (options.expires) {
      cookie += `; Expires=${options.expires.toUTCString()}`;
    }
    if (options.path) {
      cookie += `; Path=${options.path}`;
    }
    if (options.domain) {
      cookie += `; Domain=${options.domain}`;
    }
    if (options.secure) {
      cookie += '; Secure';
    }
    if (options.httpOnly) {
      cookie += '; HttpOnly';
    }
    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite}`;
    }

    return cookie;
  }

  /**
   * Send response to client
   */
  private sendResponse(response: HttpResponse): void {
    const res = response.raw;

    // Set status code
    res.statusCode = response.statusCode;

    // Set headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Send body
    res.end(response.body);
  }

  /**
   * Add global middleware
   */
  use(middleware: Middleware): void {
    this.middlewareChain.use(middleware);
  }

  /**
   * Register route handlers
   */
  get(path: string, handler: RouteHandler): void {
    this.router.addRoute('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.router.addRoute('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.router.addRoute('PUT', path, handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.router.addRoute('PATCH', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.router.addRoute('DELETE', path, handler);
  }

  /**
   * Mount router at a base path
   */
  useRouter(basePath: string, router: Router): void {
    this.router.mergeRouter(basePath, router);
  }

  /**
   * Start server
   */
  listen(callback?: () => void): http.Server | https.Server {
    this.server.listen(this.port, this.host, () => {
      //console.log(`Server running on http://${this.host}:${this.port}`);
      callback?.();
    });

    return this.server;
  }

  /**
   * Get the router instance
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Close server
   */
  close(): void {
    this.server.close();
  }
}
