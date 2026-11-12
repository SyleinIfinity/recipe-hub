import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import {
  hashPassword,
  verifyPassword,
} from '../../src/modules/auth/password.js';
import {
  registerSchema,
  loginSchema,
} from '../../src/modules/auth/auth.validation.js';
import {
  profileSchema,
  preferencesSchema,
} from '../../src/modules/users/user.validation.js';
import { createUserModel } from '../../src/modules/users/user.model.js';
import {
  privateUserDto,
  publicUserDto,
  adminUserDto,
} from '../../src/modules/users/user.dto.js';
import { createSessionService } from '../../src/modules/auth/session.service.js';
import { authorize } from '../../src/middleware/authenticate.js';
import { createSecurity } from '../../src/config/security.js';
import { createEmailProvider } from '../../src/integrations/email-provider.js';
import { parseEnv } from '../../src/config/env.js';
import { createAuthService } from '../../src/modules/auth/auth.service.js';
import { createLogger } from '../../src/config/logger.js';

it('normalizes email without changing password whitespace', () => {
  const result = registerSchema.parse({
    email: '  PERSON@EXAMPLE.COM ',
    password: ' twelve characters ',
    displayName: ' Name ',
  });
  expect(result.email).toBe('person@example.com');
  expect(result.password).toBe(' twelve characters ');
  expect(result.displayName).toBe('Name');
});
it('Argon2id uses unique salts and verifies correct/incorrect passwords', async () => {
  const a = await hashPassword('Correct long password');
  const b = await hashPassword('Correct long password');
  expect(a).not.toBe(b);
  expect(a).toContain('$argon2id$v=19$m=65536,t=3,p=1$');
  expect(await verifyPassword(a, 'Correct long password')).toBe(true);
  expect(await verifyPassword(a, 'Incorrect')).toBe(false);
});
it('validates profile boundaries, protected fields and input types', () => {
  for (const input of [
    {},
    { bio: 'x'.repeat(501) },
    { displayName: 'x' },
    { role: 'admin' },
    { status: 'active' },
    { passwordHash: 'x' },
    { displayName: 123 },
  ])
    expect(profileSchema.safeParse(input).success).toBe(false);
  expect(
    profileSchema.safeParse({
      displayName: 'x'.repeat(80),
      bio: 'x'.repeat(500),
      avatarAssetId: null,
      mediaVersion: 0,
    }).success,
  ).toBe(true);
  expect(
    loginSchema.safeParse({ email: { $ne: null }, password: 'anything' })
      .success,
  ).toBe(false);
});
it('validates P2 consent, taxonomy and time boundaries', () => {
  for (const input of [
    { dietaryTags: ['unknown'] },
    { maxPrepMinutes: -1 },
    { maxPrepMinutes: 1.5 },
    { recommendationOptIn: 'true' },
    { favoriteCategoryIds: ['bad-id'] },
  ])
    expect(preferencesSchema.safeParse(input).success).toBe(false);
  expect(
    preferencesSchema.safeParse({
      maxPrepMinutes: null,
      timezone: 'Asia/Ho_Chi_Minh',
      recommendationOptIn: false,
    }).success,
  ).toBe(true);
});
it('User schema and DTOs retain P2 fields but never expose secrets', async () => {
  const connection = mongoose.createConnection();
  const User = createUserModel(connection);
  const user = new User({
    email: ' PERSON@EXAMPLE.COM ',
    displayName: 'Person',
    passwordHash: 'secret-hash',
  });
  await expect(user.validate()).resolves.toBeUndefined();
  expect(user.email).toBe('person@example.com');
  expect(user.status).toBe('active');
  expect(user.preferences.timezone).toBe('Asia/Ho_Chi_Minh');
  for (const dto of [
    publicUserDto(user),
    privateUserDto(user),
    adminUserDto(user),
  ])
    expect(JSON.stringify(dto)).not.toMatch(
      /secret-hash|passwordHash|authVersion|__v/,
    );
  expect(publicUserDto(user)).not.toHaveProperty('email');
  expect(adminUserDto(user)).not.toHaveProperty('preferences');
});
it('authorize uses server actor role and ignores submitted role', () => {
  const next = vi.fn();
  authorize('admin')(
    { actor: { user: { role: 'user' } }, body: { role: 'admin' } },
    {},
    next,
  );
  expect(next.mock.calls[0][0].status).toBe(403);
  const allowed = vi.fn();
  authorize('admin')({ actor: { user: { role: 'admin' } } }, {}, allowed);
  expect(allowed).toHaveBeenCalledWith();
});
it('session query enforces expiry/revocation and rejects version mismatch', async () => {
  const Session = {
    findOne: vi.fn().mockResolvedValue({ userId: 'id', authVersion: 0 }),
  };
  const User = {
    findById: () => ({
      select: async () => ({ status: 'active', authVersion: 1 }),
    }),
  };
  const sessions = createSessionService({ User, Session, sessionHours: 1 });
  await expect(sessions.authenticate('a'.repeat(43))).rejects.toMatchObject({
    status: 401,
  });
  expect(Session.findOne.mock.calls[0][0]).toMatchObject({
    revokedAt: null,
    expiresAt: { $gt: expect.any(Date) },
  });
});
it('session revocation is constrained to owner and active session', async () => {
  const Session = {
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  await createSessionService({ Session }).revokeSession('session', 'user');
  expect(Session.updateOne.mock.calls[0][0]).toEqual({
    _id: 'session',
    userId: 'user',
    revokedAt: null,
  });
});
it('production cookies use host prefix, Secure and HttpOnly', async () => {
  const security = createSecurity({
    COOKIE_SECURE: true,
    APP_ORIGINS: ['https://example.test'],
  });
  const app = express();
  app.use(cookieParser());
  app.get('/', (req, res) => {
    res.cookie(security.sessionCookie, 'opaque', {
      ...security.cookieOptions,
      expires: new Date(Date.now() + 10000),
    });
    res.json({ csrfToken: security.issueCsrf(req, res) });
  });
  const res = await request(app).get('/');
  for (const cookie of res.headers['set-cookie']) {
    expect(cookie).toMatch(/^__Host-/);
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
  }
});
it('missing email provider fails explicitly instead of delivering fake mail', async () => {
  const provider = createEmailProvider({});
  expect(provider.available).toBe(false);
  await expect(provider.send({})).rejects.toMatchObject({ status: 503 });
});
it('production requires HTTPS origins, cookie security and CSRF secret', () => {
  const config = {
    NODE_ENV: 'production',
    DB_NAME: 'recipe-hub',
    MONGODB_URI: 'mongodb://127.0.0.1/recipe-hub',
  };
  expect(() => parseEnv(config)).toThrow();
  expect(
    parseEnv({
      ...config,
      APP_ORIGINS: 'https://example.test',
      CSRF_SECRET: 'x'.repeat(32),
    }).COOKIE_SECURE,
  ).toBe(true);
  expect(() =>
    parseEnv({
      ...config,
      APP_ORIGINS: 'https://example.test',
      CSRF_SECRET: 'x'.repeat(32),
      COOKIE_SECURE: 'false',
    }),
  ).toThrow();
});
describe('auth service rules', () => {
  it('rejects duplicate registration and normalizes query before hashing', async () => {
    const User = { exists: vi.fn().mockResolvedValue(true) };
    const auth = await createAuthService({
      User,
      sessions: { revokeSession: vi.fn() },
      logger: createLogger('silent'),
    });
    await expect(
      auth.register({ email: ' TEST@EXAMPLE.COM ' }),
    ).rejects.toMatchObject({ status: 409 });
    expect(User.exists).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
  it('rejects suspended user with generic login failure and no session creation', async () => {
    const user = {
      status: 'suspended',
      passwordHash: await hashPassword('correct password'),
    };
    const User = { findOne: () => ({ select: async () => user }) };
    const sessions = { create: vi.fn() };
    const auth = await createAuthService({
      User,
      sessions,
      logger: createLogger('silent'),
    });
    await expect(
      auth.login({ email: 'test@example.com', password: 'correct password' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
