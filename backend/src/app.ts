import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import v1Router from './routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { ApiResponse } from './utils/apiResponse';

export function createApp(): Application {
  const app = express();

  // Security and utilities middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: '*', // Allows local Next.js client & preview environments
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-hub-signature-256', 'x-github-event'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Liveness & Readiness check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'who-broke-the-build-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Master API v1 mount
  app.use('/api/v1', v1Router);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    ApiResponse.notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
