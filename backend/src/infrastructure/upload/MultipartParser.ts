/**
 * MultipartParser - Infrastructure Layer
 * Parse multipart/form-data requests manually
 * Following Clean Architecture - No external libraries
 */

import { HttpRequest } from "../http/types";

export interface ParsedFile {
  buffer: Buffer;
  mimetype: string;
  filename: string;
  size: number;
}

/**
 * Parse multipart/form-data from request
 */
export async function parseMultipartData(req: HttpRequest): Promise<ParsedFile | null> {
  console.log('🎯 [MultipartParser] parseMultipartData CALLED!');
  console.log('🎯 [MultipartParser] Request URL:', req.url);
  console.log('🎯 [MultipartParser] Request method:', req.method);
  
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    
    console.log('🔍 parseMultipartData - content-type:', contentType);
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.log('❌ Not multipart/form-data');
      resolve(null);
      return;
    }

    // Extract boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      console.log('❌ No boundary found');
      resolve(null);
      return;
    }

    const boundary = '--' + boundaryMatch[1];
    console.log('✅ Boundary found:', boundary);
    const chunks: Buffer[] = [];

    // Use raw IncomingMessage for event handling
    const rawReq = req.raw;

    // Collect data chunks
    rawReq.on('data', (chunk: Buffer) => {
      console.log('📦 Received chunk:', chunk.length, 'bytes');
      chunks.push(chunk);
    });

    rawReq.on('end', () => {
      try {
        console.log('✅ All chunks received, total:', chunks.length, 'chunks');
        const buffer = Buffer.concat(chunks);
        console.log('📊 Total buffer size:', buffer.length, 'bytes');
        
        // Debug: Log first 200 chars of buffer to see actual boundary
        const bufferPreview = buffer.slice(0, Math.min(200, buffer.length)).toString('utf-8');
        console.log('🔍 Buffer preview (first 200 chars):\n', bufferPreview);
        
        const parsed = parseBuffer(buffer, boundary);
        if (parsed) {
          console.log('✅ File parsed successfully:', {
            filename: parsed.filename,
            size: parsed.size,
            type: parsed.mimetype
          });
        } else {
          console.log('❌ Failed to parse file from buffer');
        }
        resolve(parsed);
      } catch (error) {
        console.error('Error parsing multipart data:', error);
        resolve(null);
      }
    });

    rawReq.on('error', (error: Error) => {
      console.error('Request error:', error);
      reject(error);
    });
  });
}

/**
 * Parse buffer to extract file data
 */
function parseBuffer(buffer: Buffer, boundary: string): ParsedFile | null {
  console.log('🔍 parseBuffer - buffer size:', buffer.length);
  console.log('🔍 parseBuffer - boundary to search:', boundary);
  console.log('🔍 Buffer preview (first 500 chars):', buffer.slice(0, 500).toString('utf-8'));
  console.log('🔍 Buffer preview (hex, first 200 bytes):', buffer.slice(0, 200).toString('hex'));
  
  const boundaryBuffer = Buffer.from(boundary);
  const parts: Buffer[] = [];
  
  let start = 0;
  let end = buffer.indexOf(boundaryBuffer, start);

  console.log('🔍 First boundary position:', end);
  
  // If boundary not found, try with different line endings
  if (end === -1) {
    // Try with \r\n prefix (Windows style)
    const altBoundary = '\r\n' + boundary;
    const altBoundaryBuffer = Buffer.from(altBoundary);
    end = buffer.indexOf(altBoundaryBuffer, start);
    console.log('🔍 Trying with \\r\\n prefix, position:', end);
    
    if (end !== -1) {
      // Use this boundary format
      console.log('✅ Found boundary with \\r\\n prefix');
      return parseBufferWithBoundary(buffer, altBoundary);
    }
  }
  
  if (end === -1) {
    console.log('❌ Boundary not found in buffer!');
    // Try to find what boundaries exist in the buffer
    const bufferStr = buffer.toString('utf-8', 0, Math.min(300, buffer.length));
    console.log('🔍 Searching for pattern in buffer start:', bufferStr.substring(0, 100));
    return null;
  }

  // Split by boundary
  while (end !== -1) {
    if (start !== 0) { // Skip first empty part
      const part = buffer.slice(start, end);
      parts.push(part);
      console.log('📦 Found part:', part.length, 'bytes');
    }
    start = end + boundaryBuffer.length;
    end = buffer.indexOf(boundaryBuffer, start);
  }

  console.log('📊 Total parts found:', parts.length);

  // Find the part with file data
  for (let i = 0; i < parts.length; i++) {
    console.log(`🔍 Parsing part ${i + 1}/${parts.length}...`);
    const parsed = parsePartHeaders(parts[i]);
    if (parsed) {
      console.log('✅ File found in part', i + 1);
      return parsed;
    }
  }

  console.log('❌ No file found in any part');
  return null;
}

/**
 * Helper function to parse with specific boundary
 */
function parseBufferWithBoundary(buffer: Buffer, boundary: string): ParsedFile | null {
  const boundaryBuffer = Buffer.from(boundary);
  const parts: Buffer[] = [];
  
  let start = 0;
  let end = buffer.indexOf(boundaryBuffer, start);

  while (end !== -1) {
    if (start !== 0) {
      const part = buffer.slice(start, end);
      parts.push(part);
    }
    start = end + boundaryBuffer.length;
    end = buffer.indexOf(boundaryBuffer, start);
  }

  for (const part of parts) {
    const parsed = parsePartHeaders(part);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Parse headers and extract file from a part
 */
function parsePartHeaders(part: Buffer): ParsedFile | null {
  // Find the double CRLF that separates headers from body
  const headerEnd = part.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    console.log('❌ No header separator found');
    return null;
  }

  const headerText = part.slice(0, headerEnd).toString('utf-8');
  const bodyBuffer = part.slice(headerEnd + 4); // Skip \r\n\r\n

  console.log('📄 Headers:', headerText);

  // Extract field name and filename separately
  const nameMatch = headerText.match(/name="([^"]+)"/);
  const filenameMatch = headerText.match(/filename="([^"]+)"/);
  
  if (!nameMatch) {
    console.log('❌ No field name found');
    return null;
  }

  const fieldName = nameMatch[1];
  const filename = filenameMatch ? filenameMatch[1] : undefined;

  console.log('📝 Field name:', fieldName);
  console.log('📝 Filename:', filename);

  // Only process file fields
  if (!filename) {
    console.log('⏭️ Skipping non-file field');
    return null;
  }

  // Extract Content-Type
  const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
  const mimetype = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

  console.log('📝 MIME type:', mimetype);

  // Remove trailing CRLF from body
  let fileBuffer = bodyBuffer;
  if (fileBuffer.length >= 2 && fileBuffer[fileBuffer.length - 2] === 0x0D && fileBuffer[fileBuffer.length - 1] === 0x0A) {
    fileBuffer = fileBuffer.slice(0, -2);
  }

  console.log('📊 File buffer size:', fileBuffer.length);

  return {
    buffer: fileBuffer,
    mimetype,
    filename,
    size: fileBuffer.length
  };
}

/**
 * Middleware to parse multipart/form-data
 */
export function multipartMiddleware() {
  return async (req: HttpRequest, res: any, next: () => void) => {
    try {
      const fileData = await parseMultipartData(req);
      if (fileData) {
        (req as any).fileData = fileData;
        console.log('✅ File parsed:', {
          filename: fileData.filename,
          size: fileData.size,
          type: fileData.mimetype
        });
      }
      next();
    } catch (error) {
      console.error('❌ Error in multipart middleware:', error);
      next();
    }
  };
}
