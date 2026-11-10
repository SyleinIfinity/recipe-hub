import { it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';
import { requestContext, errorHandler } from '../../src/middleware/http.js';

const logger = createLogger('silent');
it('app import and construction do not start a listener or connect to MongoDB', () => {
  const app = createApp({ logger });
  expect(typeof app).toBe('function');
});
it('liveness stays healthy without MongoDB; default readiness fails closed', async () => {
  const app = createApp({ logger });
  expect((await request(app).get('/health/live')).body).toEqual({
    success: true,
    data: { status: 'alive' },
  });
  expect((await request(app).get('/health/ready')).status).toBe(503);
});
it('readiness handles dependency exceptions without revealing them', async () => {
  const res = await request(
    createApp({
      logger,
      isReady: () => {
        throw new Error('private');
      },
    }),
  ).get('/health/ready');
  expect(res.status).toBe(503);
  expect(res.text).not.toContain('private');
});
it('unknown routes return a consistent 404 with a unique request ID and security headers', async () => {
  const app = createApp({ logger });
  const res = await request(app)
    .get('/unknown')
    .set('X-Request-ID', 'untrusted');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
    requestId: res.headers['x-request-id'],
  });
  expect(res.body.requestId).not.toBe('untrusted');
  expect(res.headers['x-content-type-options']).toBe('nosniff');
  expect(res.headers['x-powered-by']).toBeUndefined();
  expect((await request(app).get('/unknown')).body.requestId).not.toBe(
    res.body.requestId,
  );
});
it('malformed JSON returns 400', async () => {
  const res = await request(createApp({ logger }))
    .post('/api/v1/unknown')
    .set('Content-Type', 'application/json')
    .send('{');
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('INVALID_JSON');
});
it('oversized JSON returns 413', async () => {
  const res = await request(createApp({ logger }))
    .post('/api/v1/unknown')
    .send({ content: 'x'.repeat(110000) });
  expect(res.status).toBe(413);
  expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
});
it('unexpected errors return 500 without raw error, stack, body or URL in logs', async () => {
  let output = '';
  const log = createLogger('info', {
    write: (chunk) => {
      output += chunk;
    },
  });
  const app = express();
  app.use(requestContext(log));
  app.get('/failure', () => {
    throw new Error('sensitive-error');
  });
  app.use(errorHandler(log));
  const res = await request(app)
    .get('/failure?token=sensitive-query')
    .set('Authorization', 'sensitive-header');
  expect(res.status).toBe(500);
  expect(res.body.error).toEqual({
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
  expect(res.body.stack).toBeUndefined();
  expect(output).not.toMatch(
    /sensitive-error|sensitive-query|sensitive-header/,
  );
  expect(output).toContain(res.body.requestId);
});
