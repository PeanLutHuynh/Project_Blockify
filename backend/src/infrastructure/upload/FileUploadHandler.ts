import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { HttpRequest, HttpResponse, Middleware } from '../http/types';

/**
 * Custom multipart/form-data parser - No Multer
 * Hand-written using Node.js native streams
 */

export interface UploadedFile {
  fieldName: string;
  originalName: string;
  encoding: string;
  mimeType: string;
  size: number;
  path: string;
  filename: string;
}

export interface UploadOptions {
  uploadDir?: string;
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
  preserveFileName?: boolean;
}

export class FileUploadHandler {
  private uploadDir: string;
  private maxFileSize: number;
  private allowedMimeTypes: string[];
  private preserveFileName: boolean;

  constructor(options: UploadOptions = {}) {
    this.uploadDir = options.uploadDir || path.join(process.cwd(), 'uploads');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.allowedMimeTypes = options.allowedMimeTypes || [];
    this.preserveFileName = options.preserveFileName || false;

    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Parse multipart/form-data request
   */
  async parseMultipartRequest(req: http.IncomingMessage): Promise<{
    fields: Record<string, string>;
    files: UploadedFile[];
  }> {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);

    if (!boundaryMatch) {
      throw new Error('Invalid multipart/form-data: no boundary found');
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const fields: Record<string, string> = {};
    const files: UploadedFile[] = [];

    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      let currentFile: {
        fieldName: string;
        originalName: string;
        encoding: string;
        mimeType: string;
        data: Buffer[];
      } | null = null;
      let currentField: { name: string; value: string } | null = null;

      req.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        // Check size limit
        if (buffer.length > this.maxFileSize) {
          req.removeAllListeners();
          reject(new Error('File size exceeds maximum allowed'));
          return;
        }

        // Process complete parts
        this.processParts(buffer, boundary, fields, files, (remaining) => {
          buffer = Buffer.from(remaining);
        });
      });

      req.on('end', () => {
        try {
          // Process any remaining data
          this.processParts(buffer, boundary, fields, files, () => {});

          resolve({ fields, files });
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Process multipart parts
   */
  private processParts(
    buffer: Buffer,
    boundary: string,
    fields: Record<string, string>,
    files: UploadedFile[],
    updateBuffer: (remaining: Buffer) => void
  ): void {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = this.splitBuffer(buffer, boundaryBuffer);

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      this.processPart(part, fields, files);
    }

    // Keep last incomplete part in buffer
    updateBuffer(parts[parts.length - 1]);
  }

  /**
   * Split buffer by boundary
   */
  private splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
    const parts: Buffer[] = [];
    let start = 0;

    while (start < buffer.length) {
      const index = buffer.indexOf(delimiter, start);
      if (index === -1) {
        parts.push(buffer.slice(start));
        break;
      }

      if (index > start) {
        parts.push(buffer.slice(start, index));
      }

      start = index + delimiter.length;
    }

    return parts;
  }

  /**
   * Process individual part
   */
  private processPart(
    part: Buffer,
    fields: Record<string, string>,
    files: UploadedFile[]
  ): void {
    // Find double CRLF that separates headers from content
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const headerSection = part.slice(0, headerEnd).toString('utf-8');
    const content = part.slice(headerEnd + 4);

    // Parse headers
    const headers = this.parseHeaders(headerSection);
    const disposition = headers['content-disposition'];

    if (!disposition) return;

    // Extract field name
    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch) return;

    const fieldName = nameMatch[1];

    // Check if it's a file
    const filenameMatch = disposition.match(/filename="([^"]+)"/);

    if (filenameMatch) {
      // It's a file
      const originalName = filenameMatch[1];
      const mimeType = headers['content-type'] || 'application/octet-stream';

      // Check mime type
      if (
        this.allowedMimeTypes.length > 0 &&
        !this.allowedMimeTypes.includes(mimeType)
      ) {
        throw new Error(`File type ${mimeType} is not allowed`);
      }

      // Generate filename
      const filename = this.generateFilename(originalName);
      const filePath = path.join(this.uploadDir, filename);

      // Write file
      fs.writeFileSync(filePath, content);

      files.push({
        fieldName,
        originalName,
        encoding: 'binary',
        mimeType,
        size: content.length,
        path: filePath,
        filename,
      });
    } else {
      // It's a regular field
      fields[fieldName] = content.toString('utf-8').trim();
    }
  }

  /**
   * Parse headers from header section
   */
  private parseHeaders(headerSection: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = headerSection.split('\r\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        const value = line.slice(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    return headers;
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    if (this.preserveFileName) {
      return originalName;
    }

    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');

    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Create middleware for file uploads
   */
  middleware(): Middleware {
    return async (req: HttpRequest, res: HttpResponse, next) => {
      const contentType = req.headers['content-type'] || '';

      if (!contentType.includes('multipart/form-data')) {
        return next();
      }

      try {
        const { fields, files } = await this.parseMultipartRequest(req.raw);

        // Attach parsed data to request
        (req as any).files = files;
        (req as any).fields = fields;

        await next();
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_UPLOAD_ERROR',
            message: error.message,
          },
        });
      }
    };
  }

  /**
   * Delete uploaded file
   */
  deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Create file upload handler instance
 */
export function createFileUploadHandler(options?: UploadOptions): FileUploadHandler {
  return new FileUploadHandler(options);
}
