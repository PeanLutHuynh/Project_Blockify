import { HttpRequest, HttpResponse, Middleware, NextFunction } from './types';

export class MiddlewareChain {
  private middlewares: Middleware[] = [];

  /**
   * Add middleware to the chain
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Execute all middlewares in order
   */
  async execute(
    req: HttpRequest,
    res: HttpResponse,
    finalHandler: () => Promise<void>
  ): Promise<void> {
    let index = 0;

    const next: NextFunction = async (error?: Error) => {
      if (error) {
        throw error;
      }

      if (index >= this.middlewares.length) {
        // All middlewares executed, run final handler
        await finalHandler();
        return;
      }

      const middleware = this.middlewares[index++];
      
      try {
        await middleware(req, res, next);
      } catch (err) {
        throw err;
      }
    };

    await next();
  }

  /**
   * Get all middlewares
   */
  getMiddlewares(): Middleware[] {
    return this.middlewares;
  }
}
