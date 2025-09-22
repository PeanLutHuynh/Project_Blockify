import { Request, Response } from 'express';
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
    res: Response,
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

    // Check if client wants XML response
    const acceptHeader = res.req.headers.accept;
    if (acceptHeader && acceptHeader.includes('application/xml')) {
      res.set('Content-Type', 'application/xml');
      const xml = this.convertToXML(response);
      res.status(statusCode).send(xml);
    } else {
      // Default to JSON
      res.status(statusCode).json(response);
    }
  }

  private convertToXML(obj: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<response>\n';
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        xml += `  <${key} />\n`;
      } else if (Array.isArray(value)) {
        xml += `  <${key}>\n`;
        value.forEach((item, index) => {
          xml += `    <item index="${index}">\n`;
          if (typeof item === 'object') {
            for (const [itemKey, itemValue] of Object.entries(item)) {
              xml += `      <${itemKey}>${this.escapeXml(String(itemValue))}</${itemKey}>\n`;
            }
          } else {
            xml += `      ${this.escapeXml(String(item))}\n`;
          }
          xml += '    </item>\n';
        });
        xml += `  </${key}>\n`;
      } else if (typeof value === 'object') {
        xml += `  <${key}>\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          xml += `    <${subKey}>${this.escapeXml(String(subValue))}</${subKey}>\n`;
        }
        xml += `  </${key}>\n`;
      } else {
        xml += `  <${key}>${this.escapeXml(String(value))}</${key}>\n`;
      }
    }
    
    xml += '</response>';
    return xml;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.service.findAll();
      this.sendResponse(res, 200, data, 'Data retrieved successfully');
    } catch (error) {
      this.sendResponse(res, 500, undefined, undefined, (error as Error).message);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
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

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.service.create(req.body);
      this.sendResponse(res, 201, data, 'Data created successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.update(id, req.body);
      this.sendResponse(res, 200, data, 'Data updated successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      this.sendResponse(res, 200, undefined, 'Data deleted successfully');
    } catch (error) {
      this.sendResponse(res, 400, undefined, undefined, (error as Error).message);
    }
  }
}