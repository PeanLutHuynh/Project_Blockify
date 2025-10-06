import { HttpMethod, Route, RouteHandler, MatchedRoute, Middleware } from './types';

export class Router {
  private routes: Route[] = [];

  /**
   * Add a route to the router
   */
  addRoute(method: HttpMethod, path: string, handler: RouteHandler): void {
    const { pattern, paramNames } = this.pathToRegex(path);
    
    this.routes.push({
      method,
      path,
      pattern,
      paramNames,
      handler
    });
  }

  /**
   * Convert path pattern to regex
   * Example: /users/:id -> /^\/users\/([^\/]+)$/
   */
  private pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    
    // Escape special regex characters except :
    let pattern = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace :param with regex capture group
    pattern = pattern.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    
    // Exact match
    pattern = `^${pattern}$`;
    
    return {
      pattern: new RegExp(pattern),
      paramNames
    };
  }

  /**
   * Find matching route
   */
  findRoute(method: HttpMethod, path: string): MatchedRoute | null {
    console.log(`[Router] Looking for: ${method} ${path}`);
    console.log(`[Router] Available routes:`, this.routes.map(r => `${r.method} ${r.path}`));
    
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      const match = path.match(route.pattern);
      console.log(`[Router] Testing ${route.path} against ${path}: ${match ? 'MATCH' : 'NO MATCH'}`);
      
      if (match) {
        const params: Record<string, string> = {};
        
        // Extract parameters
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        
        console.log(`[Router] Found match: ${route.method} ${route.path}`);
        return {
          handler: route.handler,
          params
        };
      }
    }
    
    console.log(`[Router] No match found for ${method} ${path}`);
    return null;
  }

  /**
   * Merge another router with a base path
   */
  mergeRouter(basePath: string, router: Router): void {
    // Remove trailing slash from base path
    const normalizedBasePath = basePath.replace(/\/$/, '');
    
    router.routes.forEach(route => {
      const fullPath = normalizedBasePath + route.path;
      this.addRoute(route.method, fullPath, route.handler);
    });
  }

  /**
   * Get all routes
   */
  getRoutes(): Route[] {
    return this.routes;
  }

  /**
   * HTTP method helpers
   */
  get(path: string, ...handlers: (RouteHandler | Middleware)[]): void {
    this.addRoute('GET', path, this.combineHandlers(handlers));
  }

  post(path: string, ...handlers: (RouteHandler | Middleware)[]): void {
    this.addRoute('POST', path, this.combineHandlers(handlers));
  }

  put(path: string, ...handlers: (RouteHandler | Middleware)[]): void {
    this.addRoute('PUT', path, this.combineHandlers(handlers));
  }

  patch(path: string, ...handlers: (RouteHandler | Middleware)[]): void {
    this.addRoute('PATCH', path, this.combineHandlers(handlers));
  }

  delete(path: string, ...handlers: (RouteHandler | Middleware)[]): void {
    this.addRoute('DELETE', path, this.combineHandlers(handlers));
  }

  /**
   * Combine multiple handlers into one
   */
  private combineHandlers(handlers: (RouteHandler | Middleware)[]): RouteHandler {
    return async (req, res) => {
      let index = 0;

      const next: any = async () => {
        if (index < handlers.length) {
          const handler = handlers[index++];
          await handler(req, res, next);
        }
      };

      await next();
    };
  }
}
