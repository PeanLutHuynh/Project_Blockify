import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ENV } from '../config/env';
import { logger } from '../config/logger';

const ensureUploadDirs = () => {
  const uploadDirs = [
    'uploads',
    'uploads/products',
    'uploads/users',
    'uploads/categories',
    'uploads/temp'
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created upload directory: ${dir}`);
    }
  });
};

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    let uploadPath = 'uploads/temp';

    if (req.path.includes('/products')) {
      uploadPath = 'uploads/products';
    } else if (req.path.includes('/users')) {
      uploadPath = 'uploads/users';
    } else if (req.path.includes('/categories')) {
      uploadPath = 'uploads/categories';
    }

    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    
    const sanitizedBaseName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);

    const filename = `${sanitizedBaseName}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is allowed
  if (ENV.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ENV.ALLOWED_FILE_TYPES.join(', ')}`));
  }
};

const multerConfig: multer.Options = {
  storage,
  fileFilter,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE,
    files: 10,
    fields: 20, 
    fieldNameSize: 100, 
    fieldSize: 6024 * 6024 
  }
};

const upload = multer(multerConfig);

export const uploadSingle = (fieldName: string = 'image') => {
  return upload.single(fieldName);
};

export const uploadMultiple = (fieldName: string = 'images', maxCount: number = 5) => {
  return upload.array(fieldName, maxCount);
};

export const uploadFields = (fields: { name: string; maxCount?: number }[]) => {
  return upload.fields(fields);
};

export const uploadAny = () => {
  return upload.any();
};

export const deleteUploadedFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error deleting file ${filePath}:`, error);
  }
};

export const moveFile = (oldPath: string, newPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        logger.error(`Error moving file from ${oldPath} to ${newPath}:`, err);
        reject(err);
      } else {
        logger.info(`File moved from ${oldPath} to ${newPath}`);
        resolve();
      }
    });
  });
};

// Change URL when deploying to production
export const getFileInfo = (file: Express.Multer.File) => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : `http://localhost:${ENV.PORT}`;

  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: `${baseUrl}/${file.path.replace(/\\/g, '/')}`
  };
};

export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size: ${Math.round(ENV.MAX_FILE_SIZE / 6024 / 6024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in request';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
    }

    return res.status(400).json({
      success: false,
      message,
      error: error.message
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      error: error.message
    });
  }

  next(error);
};

export const createImageVariants = async (filePath: string) => {

  return {
    original: filePath,
    thumbnail: filePath,
    medium: filePath,
    large: filePath
  };
};

export const cleanupOldFiles = (directory: string, olderThanDays: number = 30) => {
  const now = Date.now();
  const cutoff = olderThanDays * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > cutoff) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old file: ${filePath}`);
      }
    });
  } catch (error) {
    logger.error(`Error cleaning up directory ${directory}:`, error);
  }
};