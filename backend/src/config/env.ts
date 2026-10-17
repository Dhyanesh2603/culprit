import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'who-broke-the-build-local-secret-key-32chars',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'who-broke-the-build-demo',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'demo_webhook_secret_key_12345',
  DEFAULT_CORRELATION_WINDOW_MINUTES: 60,
};
