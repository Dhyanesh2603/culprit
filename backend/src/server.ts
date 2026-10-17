import http from 'http';
import { createApp } from './app';
import { initializeSocketIO } from './sockets/socketServer';
import { ENV } from './config/env';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Real-time Socket.IO Server
  initializeSocketIO(server);

  server.listen(ENV.PORT, () => {
    logger.info(`=======================================================`);
    logger.info(` WHO BROKE THE BUILD? - Real-time Incident Server`);
    logger.info(` Environment: ${ENV.NODE_ENV}`);
    logger.info(` API Base URL: http://localhost:${ENV.PORT}/api/v1`);
    logger.info(` Socket.IO:    http://localhost:${ENV.PORT}`);
    logger.info(` Healthcheck:  http://localhost:${ENV.PORT}/health`);
    logger.info(`=======================================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      logger.info('HTTP & Socket.IO server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Failed to start application server', err);
  process.exit(1);
});
