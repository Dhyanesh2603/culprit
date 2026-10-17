const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine database type from DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://') || process.env.NODE_ENV === 'production';

const prismaDir = path.join(__dirname, '..', 'prisma');
const standardSchema = path.join(prismaDir, 'schema.prisma');
const postgresSchema = path.join(prismaDir, 'schema.postgresql.prisma');

console.log('[Prisma Prepare] Evaluating database environment...');
console.log(`[Prisma Prepare] Target Provider: ${isPostgres ? 'PostgreSQL (Cloud / Railway)' : 'SQLite (Local)'}`);

try {
  if (isPostgres && fs.existsSync(postgresSchema)) {
    // For PostgreSQL deployments (Railway, Docker, Cloud)
    console.log('[Prisma Prepare] Generating Prisma Client for PostgreSQL...');
    execSync(`npx prisma generate --schema="${postgresSchema}"`, { stdio: 'inherit' });
  } else {
    // For SQLite local development
    console.log('[Prisma Prepare] Generating Prisma Client for SQLite...');
    execSync(`npx prisma generate --schema="${standardSchema}"`, { stdio: 'inherit' });
  }
  console.log('[Prisma Prepare] Prisma Client generation complete.');
} catch (error) {
  console.error('[Prisma Prepare] Error during Prisma client generation:', error.message);
  process.exit(1);
}
