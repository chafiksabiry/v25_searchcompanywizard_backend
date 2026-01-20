import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      details: error.message
    });
  }

  if (error.name === 'MongoError' && (error as any).code === 11000) {
    return res.status(409).json({
      message: 'Duplicate Entry',
      details: 'A resource with that unique identifier already exists'
    });
  }

  res.status(500).json({
    message: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};