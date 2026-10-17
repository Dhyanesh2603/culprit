import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../utils/apiResponse';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ApiResponse.badRequest(res, 'Validation failed', error.errors);
        return;
      }
      ApiResponse.badRequest(res, 'Malformed payload');
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ApiResponse.badRequest(res, 'Invalid query parameters', error.errors);
        return;
      }
      ApiResponse.badRequest(res, 'Malformed query parameters');
    }
  };
}
