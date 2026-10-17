const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

console.log('[Culprit Launcher] Starting unified production stack for Railway...');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

const railwayPort = String(process.env.PORT || '5001');
const backendPort = '4000'; // Dedicated internal port for Express API

// Set fallback SQLite database if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
  console.log('[Culprit Launcher] DATABASE_URL not detected. Defaulting to local SQLite file:./dev.db');
}

const isPostgres =
  process.env.DATABASE_URL.startsWith('postgresql://') ||
  process.env.DATABASE_URL.startsWith('postgres://') ||
  process.env.USE_POSTGRES === 'true';

console.log(`[Culprit Launcher] Database target: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);

// 1. Prepare and apply database schema
try {
  console.log('[Culprit Launcher] Synchronizing Prisma Client and schema...');
  execSync('node scripts/prepare-prisma.js', { cwd: backendDir, stdio: 'inherit' });

  const schemaArg = isPostgres
    ? '--schema=prisma/schema.postgresql.prisma'
    : '--schema=prisma/schema.prisma';

  console.log(`[Culprit Launcher] Applying migrations via prisma db push (${schemaArg})...`);
  execSync(`npx prisma db push ${schemaArg} --accept-data-loss`, { cwd: backendDir, stdio: 'inherit' });

  console.log('[Culprit Launcher] Checking initial database seed...');
  try {
    execSync('npx tsx prisma/seed.ts', { cwd: backendDir, stdio: 'inherit' });
  } catch (seedErr) {
    console.log('[Culprit Launcher] Database seed notice (already seeded or skipped):', seedErr.message);
  }
} catch (dbErr) {
  console.warn('[Culprit Launcher] Database preparation notice:', dbErr.message);
}

// 2. Spawn backend on internal port
console.log(`[Culprit Launcher] Launching backend API service on internal port ${backendPort}...`);
const backendProcess = spawn('node', ['dist/server.js'], {
  cwd: backendDir,
  env: {
    ...process.env,
    PORT: backendPort,
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

// 3. Helper to wait for backend readiness
function waitForBackendReady(port, maxAttempts = 30) {
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          console.log(`[Culprit Launcher] Backend API is live and healthy on port ${port}!`);
          resolve(true);
        }
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.warn('[Culprit Launcher] Backend warmup timed out, continuing to launch frontend...');
          resolve(false);
        }
      });
      req.setTimeout(800, () => req.destroy());
    }, 500);
  });
}

// 4. Launch Next.js frontend once backend is ready
waitForBackendReady(backendPort).then(() => {
  console.log(`[Culprit Launcher] Launching Next.js frontend on public Railway PORT ${railwayPort}...`);
  const frontendProcess = spawn('npx', ['next', 'start', '-p', railwayPort, '-H', '0.0.0.0'], {
    cwd: frontendDir,
    env: {
      ...process.env,
      PORT: railwayPort,
      HOSTNAME: '0.0.0.0',
      INTERNAL_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
    shell: true,
  });

  const cleanup = () => {
    console.log('[Culprit Launcher] Shutting down services...');
    try { backendProcess.kill('SIGTERM'); } catch (e) {}
    try { frontendProcess.kill('SIGTERM'); } catch (e) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  frontendProcess.on('exit', (code) => {
    console.log(`[Culprit Launcher] Frontend process exited with code ${code}`);
    cleanup();
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[Culprit Launcher] Backend process exited unexpectedly with code ${code}`);
    }
  });
});
