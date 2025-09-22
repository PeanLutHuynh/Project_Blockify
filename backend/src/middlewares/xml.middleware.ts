import { Request, Response, NextFunction } from 'express';
import * as xml2js from 'xml2js';

export interface XMLMiddlewareOptions {
  xmlParseOptions?: xml2js.OptionsV2;
  limit?: string;
}

export function xmlParserMiddleware(options: XMLMiddlewareOptions = {}) {
  const parser = new xml2js.Parser(options.xmlParseOptions);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only process if content-type is XML
    if (req.headers['content-type']?.includes('application/xml') || 
        req.headers['content-type']?.includes('text/xml')) {
      
      let data = '';
      
      req.on('data', (chunk) => {
        data += chunk;
      });

      req.on('end', async () => {
        try {
          if (data) {
            const result = await parser.parseStringPromise(data);
            req.body = result;
          }
          next();
        } catch (error) {
          res.status(400).json({
            success: false,
            error: 'Invalid XML format'
          });
        }
      });

      req.on('error', (error) => {
        res.status(400).json({
          success: false,
          error: 'Error parsing XML data'
        });
      });
    } else {
      next();
    }
  };
}

export function responseFormatMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add helper method to send both JSON and XML responses
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    const acceptHeader = req.headers.accept;
    
    if (acceptHeader && acceptHeader.includes('application/xml')) {
      res.set('Content-Type', 'application/xml');
      const xml = convertToXML(obj);
      return res.send(xml);
    } else {
      return originalJson.call(this, obj);
    }
  };

  next();
}

function convertToXML(obj: any): string {
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
            xml += `      <${itemKey}>${escapeXml(String(itemValue))}</${itemKey}>\n`;
          }
        } else {
          xml += `      ${escapeXml(String(item))}\n`;
        }
        xml += '    </item>\n';
      });
      xml += `  </${key}>\n`;
    } else if (typeof value === 'object') {
      xml += `  <${key}>\n`;
      for (const [subKey, subValue] of Object.entries(value)) {
        xml += `    <${subKey}>${escapeXml(String(subValue))}</${subKey}>\n`;
      }
      xml += `  </${key}>\n`;
    } else {
      xml += `  <${key}>${escapeXml(String(value))}</${key}>\n`;
    }
  }
  
  xml += '</response>';
  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}