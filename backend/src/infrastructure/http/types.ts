import * as http from 'http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: any;
  cookies: Record<string, string>;
  raw: http.IncomingMessage;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string | null;
  raw: http.ServerResponse;
  status: (code: number) => HttpResponse;
  setHeader: (key: string, value: string) => HttpResponse;
  json: (data: any) => void;
  send: (data: string | Buffer) => void;
  redirect: (url: string, code?: number) => void;
  setCookie: (name: string, value: string, options?: CookieOptions) => HttpResponse;
}

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export type NextFunction = (error?: Error) => void | Promise<void>;

export type Middleware = (
  req: HttpRequest,
  res: HttpResponse,
  next: NextFunction
) => void | Promise<void>;
// Nên để thành hàm, kh tạo type

export type RouteHandler = (
  req: HttpRequest,
  res: HttpResponse
) => void | Promise<void>;

export interface Route {
  method: HttpMethod;
  path: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export interface MatchedRoute {
  handler: RouteHandler;
  params: Record<string, string>;
}
