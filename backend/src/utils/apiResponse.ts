import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created<T>(res: Response, data: T, message: string = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    });
  }

  static badRequest(res: Response, message: string = 'Bad request', details?: any) {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized access') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message: string = 'Forbidden - Insufficient permissions') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res: Response, message: string = 'Resource not found') {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  static conflict(res: Response, message: string = 'Resource conflict or concurrency mismatch', details?: any) {
    return this.error(res, message, 409, 'CONFLICT', details);
  }
}
