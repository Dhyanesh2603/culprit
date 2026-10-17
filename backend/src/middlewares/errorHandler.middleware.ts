import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`Unhandled request error on ${req.method} ${req.originalUrl}:`, err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error occurred';
  const code = err.code || 'INTERNAL_ERROR';

  if (status === 409) {
    ApiResponse.conflict(res, message, err);
    return;
  }

  if (status === 404) {
    ApiResponse.notFound(res, message);
    return;
  }

  if (status === 400) {
    ApiResponse.badRequest(res, message, err.details);
    return;
  }

  ApiResponse.error(res, message, status, code, process.env.NODE_ENV !== 'production' ? err.stack : undefined);
}
