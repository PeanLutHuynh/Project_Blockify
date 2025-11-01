import { HttpRequest, HttpResponse } from '../../infrastructure/http/types.js';
import { supabaseAdmin } from '../../config/database.js';
import { logger } from '../../config/logger.js';

export class UploadController {
  /**
   * Upload image to Supabase Storage
   */
  async uploadImage(req: HttpRequest, res: HttpResponse): Promise<void> {
    try {
      // Get file from request body (multipart)
      const contentType = req.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be multipart/form-data'
        });
        return;
      }

      // Parse multipart data (simple implementation)
      const body = req.body as any;
      
      if (!body || !body.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
        return;
      }

      const file = body.file;
      const folder = body.folder || 'uploads';
      
      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalname || file.name || 'image.jpg';
      const fileName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('product-img')
        .upload(filePath, file.buffer || file.data, {
          contentType: file.mimetype || file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logger.error('Upload error:', error);
        res.status(500).json({
          success: false,
          message: `Upload failed: ${error.message}`
        });
        return;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('product-img')
        .getPublicUrl(filePath);

      res.status(200).json({
        success: true,
        data: {
          url: urlData.publicUrl,
          path: filePath,
          filename: fileName
        }
      });
    } catch (error: any) {
      logger.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  }
}
