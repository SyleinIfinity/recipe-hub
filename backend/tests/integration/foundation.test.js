import { beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';
import { startServer } from '../../src/server.js';

const config = parseEnv({
  NODE_ENV: 'test',
  PORT: 0,
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  DB_TIMEOUT_MS: 500,
  LOG_LEVEL: 'silent',
  SHUTDOWN_TIMEOUT_MS: 500,
});
const database = createDatabase(config);
const logger = createLogger('silent');
beforeAll(async () => {
  await database.connect();
});
afterAll(async () => {
  await database.close();
});

it('connects to the real isolated database and executes a ping', async () => {
  expect(database.connection.name).toBe('recipe-hub-test');
  expect(database.connection.name).not.toBe('recipe-hub');
  expect(await database.isReady()).toBe(true);
});
it('live and versioned readiness endpoints report actual MongoDB availability', async () => {
  const app = createApp({ logger, isReady: database.isReady });
  for (const path of ['/health/ready', '/api/v1/health']) {
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ready' } });
  }
  expect((await request(app).get('/health/live')).status).toBe(200);
});
it('readiness becomes 503 after disconnect while liveness stays 200', async () => {
  const local = createDatabase(config);
  await local.connect();
  const app = createApp({ logger, isReady: local.isReady });
  expect((await request(app).get('/health/ready')).status).toBe(200);
  await local.close();
  expect((await request(app).get('/health/ready')).status).toBe(503);
  expect((await request(app).get('/health/live')).status).toBe(200);
});
it('startup rejects an unreachable MongoDB and leaves no open connection', async () => {
  // Reserve a port without serving MongoDB; avoids depending on a supposedly unused port.
  const blocker = createServer((socket) => socket.destroy());
  blocker.listen(0, '127.0.0.1');
  await once(blocker, 'listening');
  const badConfig = {
    ...config,
    MONGODB_URI: `mongodb://127.0.0.1:${blocker.address().port}/recipe-hub-test`,
  };
  try {
    await expect(startServer(badConfig, logger)).rejects.toThrow(
      'Startup failed',
    );
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});
it('shutdown is idempotent and closes HTTP and MongoDB', async () => {
  const runtime = await startServer(config, logger);
  expect((await request(runtime.server).get('/health/ready')).status).toBe(200);
  await Promise.all([runtime.shutdown(), runtime.shutdown()]);
  expect(runtime.server.listening).toBe(false);
  expect(runtime.database.connection.readyState).toBe(0);
});
it('a real server process starts and exits cleanly on SIGTERM', async () => {
  const child = spawn(process.execPath, ['backend/src/server.js'], {
    env: {
      ...process.env,
      ...Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key, String(value)]),
      ),
      LOG_LEVEL: 'info',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const exited = once(child, 'exit');
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Server startup timed out')),
        8000,
      );
      child.once('exit', () => {
        clearTimeout(timeout);
        reject(new Error('Server exited before startup'));
      });
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        for (const line of output.split('\n')) {
          try {
            const event = JSON.parse(line);
            if (event.event === 'listening') {
              clearTimeout(timeout);
              resolve(event.port);
            }
          } catch {
            /* Wait for complete JSON lines. */
          }
        }
      });
    });
    const res = await fetch(`http://127.0.0.1:${port}/health/ready`);
    expect(res.status).toBe(200);
    child.kill('SIGTERM');
    expect(await exited).toEqual([0, null]);
    expect(output).toContain('shutdown_complete');
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
