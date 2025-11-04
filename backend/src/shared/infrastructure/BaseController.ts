import { HttpRequest, HttpResponse } from '../../infrastructure/http/types';
import { BaseService } from '../application/BaseService';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export abstract class BaseController<T> {
  protected service: BaseService<T>;

  constructor(service: BaseService<T>) {
    this.service = service;
  }

  protected sendResponse<U>(
    res: HttpResponse,
    statusCode: number,
    data?: U,
    message?: string,
    error?: string
  ): void {
    const response: ApiResponse<U> = {
      success: statusCode < 400,
      data,
      message,
      error
    };

    res.status(statusCode).json(response);
  }

  async getAll(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const data = await this.service.findAll();
      this.sendResponse(res, 200, data, 'Data retrieved successfully');
    } catch (error) {
      this.sendResponse(res, 500, undefined, undefined, (error as Error).message);
    }
  }

  async getById(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.findById(id);
      
      if (!data) {
        this.sendResponse(res, 404, undefined, undefined, 'Resource not found');
        return;
      }

      this.sendResponse(res, 200, data, 'Data retrieved successfully');
    } catch (error) {
      this.sendResponse(res, 500, undefined, undefined, (error as Error).message);
    }
  }

  async create(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const data = await this.service.create(req.body);
      this.sendResponse(res, 201, data, 'Data created successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async update(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.update(id, req.body);
      this.sendResponse(res, 200, data, 'Data updated successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async delete(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      this.sendResponse(res, 200, undefined, 'Data deleted successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }
}