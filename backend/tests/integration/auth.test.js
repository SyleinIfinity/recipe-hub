import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/config/logger.js';
import { createApp } from '../../src/app.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createEmailProvider } from '../../src/integrations/email-provider.js';
import { hashToken } from '../../src/modules/auth/session.service.js';

const config = parseEnv({
  NODE_ENV: 'test',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
});
const database = createDatabase(config);
const run = randomUUID();
const password = 'A long test passphrase!';
const messages = [];
const emailProvider = {
  available: true,
  async send(message) {
    messages.push(message);
  },
};
let identity, app, User, Session, Token;
let serial = 0;
const input = () => ({
  email: `${run}-${serial++}@example.test`,
  password,
  displayName: 'Test User',
});
const agent = () => request.agent(app);
async function write(client, method, path, body = {}) {
  const csrf = await client.get('/api/v1/auth/csrf');
  expect(csrf.status).toBe(200);
  return client[method](`/api/v1${path}`)
    .set('X-CSRF-Token', csrf.body.data.csrfToken)
    .send(body);
}
async function registered() {
  const credentials = input();
  const client = agent();
  const res = await write(client, 'post', '/auth/register', credentials);
  expect(res.status).toBe(201);
  return { client, credentials, id: res.body.data.id };
}
async function loggedIn() {
  const result = await registered();
  const login = await write(
    result.client,
    'post',
    '/auth/login',
    (result.credentialsForLogin = {
      email: result.credentials.email,
      password,
    }),
  );
  expect(login.status).toBe(200);
  const cookie = login.headers['set-cookie']
    .find((value) => value.startsWith('recipe-hub-session='))
    .split(';')[0];
  return { ...result, cookie, token: cookie.split('=')[1], login };
}
beforeAll(async () => {
  await database.connect();
  identity = await createIdentity({
    connection: database.connection,
    config,
    logger: createLogger('silent'),
    emailProvider,
  });
  ({ User, Session, Token } = identity.models);
  app = createApp({
    identity,
    logger: createLogger('silent'),
    isReady: database.isReady,
  });
});
afterAll(async () => {
  vi.restoreAllMocks();
  if (User) {
    const users = await User.find({ email: { $regex: `^${run}-` } }).select(
      '_id',
    );
    const ids = users.map((user) => user._id);
    await Session.deleteMany({ userId: { $in: ids } });
    await Token.deleteMany({ userId: { $in: ids } });
    await identity.models.AuditLog.deleteMany({ actorId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
  }
  await database.close();
});
it('AUTH-01 register persists normalized user, Argon2id hash and P2 defaults', async () => {
  const { id } = await registered();
  const user = await User.findById(id).select('+passwordHash');
  expect(User.collection.name).toBe('user');
  expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  expect(user.passwordHash).not.toContain(password);
  expect(user.role).toBe('user');
  expect(user.preferences.recommendationOptIn).toBe(false);
  expect(user.avatarAssetId).toBeNull();
});
it('AUTH-02 duplicate email is normalized and rejected by unique index', async () => {
  const { client, credentials } = await registered();
  const response = await write(client, 'post', '/auth/register', {
    ...credentials,
    email: `  ${credentials.email.toUpperCase()}  `,
  });
  expect(response.status).toBe(409);
  expect(await User.countDocuments({ email: credentials.email })).toBe(1);
});
it('AUTH-03 rejects invalid email and Mongo operators', async () => {
  for (const email of ['invalid', { $ne: null }])
    expect(
      (await write(agent(), 'post', '/auth/register', { ...input(), email }))
        .status,
    ).toBe(422);
});
it('AUTH-04 rejects password boundaries', async () => {
  for (const value of ['', 'x'.repeat(11), 'x'.repeat(129), ' '.repeat(12)])
    expect(
      (
        await write(agent(), 'post', '/auth/register', {
          ...input(),
          password: value,
        })
      ).status,
    ).toBe(422);
});
it('AUTH-05 rejects role assignment at registration', async () => {
  const data = input();
  expect(
    (await write(agent(), 'post', '/auth/register', { ...data, role: 'admin' }))
      .status,
  ).toBe(422);
  expect(await User.exists({ email: data.email })).toBeNull();
});
it('AUTH-06 login stores only session hash, not raw token', async () => {
  const { token, id } = await loggedIn();
  const stored = await Session.collection.findOne({
    userId: new User({ _id: id })._id,
  });
  expect(stored.tokenHash).toBe(hashToken(token));
  expect(JSON.stringify(stored)).not.toContain(token);
  expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
});
it('AUTH-07 wrong password is rejected', async () => {
  const { client, credentials } = await registered();
  const res = await write(client, 'post', '/auth/login', {
    email: credentials.email,
    password: 'wrong password',
  });
  expect(res.status).toBe(401);
  expect(res.headers['set-cookie']).toBeUndefined();
});
it('AUTH-08 unknown email uses same generic error', async () => {
  const res = await write(agent(), 'post', '/auth/login', {
    email: input().email,
    password,
  });
  expect(res.status).toBe(401);
  expect(res.body.error).toEqual({
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
  });
});
it('AUTH-09 suspended account cannot log in', async () => {
  const { client, credentials, id } = await registered();
  await User.updateOne({ _id: id }, { status: 'suspended' });
  const res = await write(client, 'post', '/auth/login', {
    email: credentials.email,
    password,
  });
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
});
it('AUTH-10 valid session returns private user and prevents caching', async () => {
  const { client, id } = await loggedIn();
  const res = await client.get('/api/v1/auth/me');
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBe(id);
  expect(res.headers['cache-control']).toBe('no-store');
});
it('AUTH-11 absent or malformed session is rejected', async () => {
  for (const cookie of ['', 'recipe-hub-session=invalid'])
    expect(
      (await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status,
    ).toBe(401);
});
it('AUTH-12 expired session rejected without waiting for TTL cleanup', async () => {
  const { client, token } = await loggedIn();
  await Session.updateOne(
    { tokenHash: hashToken(token) },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  expect((await client.get('/api/v1/auth/me')).status).toBe(401);
});
it('AUTH-13 revoked session is rejected', async () => {
  const { client, token } = await loggedIn();
  await Session.updateOne(
    { tokenHash: hashToken(token) },
    { revokedAt: new Date() },
  );
  expect((await client.get('/api/v1/auth/me')).status).toBe(401);
});
it('AUTH-14 logout revokes session and clears cookie', async () => {
  const { client, token } = await loggedIn();
  const res = await write(client, 'post', '/auth/logout');
  expect(res.status).toBe(204);
  expect(res.headers['set-cookie'].join(' ')).toContain(
    'Expires=Thu, 01 Jan 1970',
  );
  expect(
    (await Session.findOne({ tokenHash: hashToken(token) })).revokedAt,
  ).toBeInstanceOf(Date);
});
it('AUTH-15 replay after logout and repeated logout are rejected', async () => {
  const { client, cookie } = await loggedIn();
  await write(client, 'post', '/auth/logout');
  expect(
    (await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status,
  ).toBe(401);
  expect((await write(client, 'post', '/auth/logout')).status).toBe(401);
});
it('AUTH-16 password change invalidates all sessions atomically and accepts new password', async () => {
  const { client, credentials, cookie } = await loggedIn();
  const other = agent();
  await write(other, 'post', '/auth/login', {
    email: credentials.email,
    password,
  });
  expect(
    (
      await write(client, 'post', '/auth/change-password', {
        currentPassword: password,
        newPassword: 'A brand new password!',
      })
    ).status,
  ).toBe(204);
  expect((await other.get('/api/v1/auth/me')).status).toBe(401);
  expect(
    (await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status,
  ).toBe(401);
  expect(
    (
      await write(client, 'post', '/auth/login', {
        email: credentials.email,
        password,
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await write(client, 'post', '/auth/login', {
        email: credentials.email,
        password: 'A brand new password!',
      })
    ).status,
  ).toBe(200);
});
it('AUTH-17 wrong current password leaves session usable', async () => {
  const { client } = await loggedIn();
  expect(
    (
      await write(client, 'post', '/auth/change-password', {
        currentPassword: 'wrong',
        newPassword: 'A brand new password!',
      })
    ).status,
  ).toBe(401);
  expect((await client.get('/api/v1/auth/me')).status).toBe(200);
});
it('AUTH-18 ordinary user cannot access admin endpoints', async () => {
  const { client, id } = await loggedIn();
  expect((await client.get('/api/v1/admin/users')).status).toBe(403);
  expect(
    (
      await write(client, 'patch', `/admin/users/${id}/status`, {
        status: 'suspended',
        reason: 'test',
      })
    ).status,
  ).toBe(403);
});
it('AUTH-19 admin list is paginated and excludes private preferences/secrets', async () => {
  const { client, id } = await loggedIn();
  await User.updateOne({ _id: id }, { role: 'admin' });
  const res = await client.get('/api/v1/admin/users?limit=2');
  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(2);
  expect(res.body.meta.limit).toBe(2);
  expect(JSON.stringify(res.body)).not.toMatch(
    /passwordHash|tokenHash|preferences|authVersion/,
  );
});
it('AUTH-20 profile update changes only the authenticated user', async () => {
  const { client, id } = await loggedIn();
  const other = await registered();
  const res = await write(client, 'patch', '/me/profile', {
    displayName: 'Changed',
    bio: 'Hello',
  });
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBe(id);
  expect((await User.findById(other.id)).displayName).toBe('Test User');
});
it('AUTH-21 protected fields and arbitrary avatar are rejected', async () => {
  const { client } = await loggedIn();
  for (const body of [
    { role: 'admin' },
    { status: 'active' },
    { passwordHash: 'x' },
    { email: input().email },
    {},
    { avatarAssetId: '123456789012345678901234' },
  ])
    expect((await write(client, 'patch', '/me/profile', body)).status).toBe(
      422,
    );
});
it('AUTH-22 public DTO does not expose email, preferences, secrets or internal fields', async () => {
  const { id } = await loggedIn();
  const res = await request(app).get(`/api/v1/users/${id}`);
  expect(res.status).toBe(200);
  expect(Object.keys(res.body.data).sort()).toEqual([
    'avatarUrl',
    'bio',
    'createdAt',
    'displayName',
    'id',
  ]);
});
it('AUTH-23 missing CSRF token rejects anonymous and authenticated writes', async () => {
  expect(
    (await request(app).post('/api/v1/auth/register').send(input())).status,
  ).toBe(403);
  const { client } = await loggedIn();
  expect(
    (await client.patch('/api/v1/me/profile').send({ bio: 'x' })).status,
  ).toBe(403);
});
it('AUTH-24 wrong CSRF token and cross-origin writes rejected', async () => {
  const { client } = await loggedIn();
  const csrf = await client.get('/api/v1/auth/csrf');
  expect(
    (
      await client
        .patch('/api/v1/me/profile')
        .set('X-CSRF-Token', 'wrong')
        .send({ bio: 'x' })
    ).status,
  ).toBe(403);
  expect(
    (
      await client
        .patch('/api/v1/me/profile')
        .set('X-CSRF-Token', csrf.body.data.csrfToken)
        .set('Origin', 'https://attacker.example')
        .send({ bio: 'x' })
    ).status,
  ).toBe(403);
});
it('AUTH-25 concurrent registration yields exactly one user', async () => {
  const credentials = input();
  const results = await Promise.all([
    write(agent(), 'post', '/auth/register', credentials),
    write(agent(), 'post', '/auth/register', credentials),
  ]);
  expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
  expect(await User.countDocuments({ email: credentials.email })).toBe(1);
});
it('AUTH-26 DB session insertion failure returns no cookie and no secret', async () => {
  const { client, credentials } = await registered();
  const failure = vi
    .spyOn(Session.collection, 'insertOne')
    .mockRejectedValueOnce(new Error('database secret'));
  try {
    const res = await write(client, 'post', '/auth/login', {
      email: credentials.email,
      password,
    });
    expect(res.status).toBe(500);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('database secret');
    expect(
      await Session.countDocuments({
        userId: (await User.findOne({ email: credentials.email }))._id,
      }),
    ).toBe(0);
  } finally {
    failure.mockRestore();
  }
});
it('AUTH-27 session cookie has explicit expiry, HttpOnly, path and SameSite', async () => {
  const { login } = await loggedIn();
  const cookie = login.headers['set-cookie'][0];
  for (const attribute of ['HttpOnly', 'Path=/', 'SameSite=Lax', 'Expires='])
    expect(cookie).toContain(attribute);
});
it('AUTH-28 rate limit login and leave health unaffected', async () => {
  const limited = await createIdentity({
    connection: database.connection,
    config: { ...config, AUTH_RATE_LIMIT: 1 },
    logger: createLogger('silent'),
    emailProvider,
  });
  const smallApp = createApp({
    identity: limited,
    logger: createLogger('silent'),
  });
  const client = request.agent(smallApp);
  expect(
    (
      await write(client, 'post', '/auth/login', {
        email: input().email,
        password,
      })
    ).status,
  ).toBe(401);
  const res = await write(client, 'post', '/auth/login', {
    email: input().email,
    password,
  });
  expect(res.status).toBe(429);
  expect(res.headers['retry-after']).toBeDefined();
  expect((await client.get('/health/live')).status).toBe(200);
});
it('AUTH-29 two sessions coexist; logout revokes only one', async () => {
  const { client, credentials } = await loggedIn();
  const second = agent();
  expect(
    (
      await write(second, 'post', '/auth/login', {
        email: credentials.email,
        password,
      })
    ).status,
  ).toBe(200);
  await write(client, 'post', '/auth/logout');
  expect((await second.get('/api/v1/auth/me')).status).toBe(200);
});
it('AUTH-30 admin suspension invalidates existing session even after reactivation', async () => {
  const admin = await loggedIn();
  const target = await loggedIn();
  await User.updateOne({ _id: admin.id }, { role: 'admin' });
  for (const status of ['suspended', 'active']) {
    expect(
      (
        await write(admin.client, 'patch', `/admin/users/${target.id}/status`, {
          status,
          reason: 'Test moderation',
        })
      ).status,
    ).toBe(200);
    expect((await target.client.get('/api/v1/auth/me')).status).toBe(401);
  }
});
it('reset token is hashed, one-time, invalidates sessions and other reset tokens', async () => {
  const { client, credentials } = await loggedIn();
  expect(
    (
      await write(client, 'post', '/auth/forgot-password', {
        email: credentials.email,
      })
    ).status,
  ).toBe(202);
  const token = messages.at(-1).token;
  const stored = await Token.collection.findOne({
    tokenHash: hashToken(token),
  });
  expect(JSON.stringify(stored)).not.toContain(token);
  const body = { token, newPassword: 'Password after reset!' };
  expect(
    (await write(client, 'post', '/auth/reset-password', body)).status,
  ).toBe(204);
  expect((await client.get('/api/v1/auth/me')).status).toBe(401);
  expect(
    (await write(client, 'post', '/auth/reset-password', body)).status,
  ).toBe(422);
  expect(
    (
      await write(client, 'post', '/auth/login', {
        email: credentials.email,
        password: body.newPassword,
      })
    ).status,
  ).toBe(200);
});
it('expired reset token cannot change credentials', async () => {
  const { client, credentials } = await registered();
  await write(client, 'post', '/auth/forgot-password', {
    email: credentials.email,
  });
  const token = messages.at(-1).token;
  await Token.updateOne(
    { tokenHash: hashToken(token) },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  expect(
    (
      await write(client, 'post', '/auth/reset-password', {
        token,
        newPassword: 'Password after reset!',
      })
    ).status,
  ).toBe(422);
});
it('email verification is single use and purpose-bound', async () => {
  const { client, credentials, id } = await registered();
  await write(client, 'post', '/auth/request-email-verification', {
    email: credentials.email,
  });
  const token = messages.at(-1).token;
  expect(
    (
      await write(client, 'post', '/auth/reset-password', {
        token,
        newPassword: password,
      })
    ).status,
  ).toBe(422);
  expect(
    (await write(client, 'post', '/auth/verify-email', { token })).status,
  ).toBe(204);
  expect((await User.findById(id)).emailVerifiedAt).toBeInstanceOf(Date);
  expect(
    (await write(client, 'post', '/auth/verify-email', { token })).status,
  ).toBe(422);
});
it('forgot password response does not reveal existing email or delivery failures', async () => {
  const { client, credentials } = await registered();
  const exists = await write(client, 'post', '/auth/forgot-password', {
    email: credentials.email,
  });
  const absent = await write(client, 'post', '/auth/forgot-password', {
    email: input().email,
  });
  expect(exists.status).toBe(absent.status);
  expect(exists.body).toEqual(absent.body);
  const fail = vi
    .spyOn(emailProvider, 'send')
    .mockRejectedValueOnce(new Error('smtp password'));
  try {
    expect(
      (
        await write(client, 'post', '/auth/forgot-password', {
          email: credentials.email,
        })
      ).body,
    ).toEqual(absent.body);
  } finally {
    fail.mockRestore();
  }
});
it('preferences validate boundaries, timezone and preserve unspecified nested settings', async () => {
  const { client } = await loggedIn();
  const res = await write(client, 'patch', '/me/preferences', {
    dietaryTags: ['vegan'],
    notificationSettings: { follows: false },
    recommendationOptIn: true,
  });
  expect(res.status).toBe(200);
  expect(res.body.data.notificationSettings).toEqual({
    follows: false,
    comments: true,
    recipes: true,
  });
  expect(
    (
      await write(client, 'patch', '/me/preferences', {
        timezone: 'invalid/timezone',
      })
    ).status,
  ).toBe(422);
  expect(
    (await client.get('/api/v1/me/preferences')).body.data.dietaryTags,
  ).toEqual(['vegan']);
});
it('session and one-time-token TTL indexes exist in real MongoDB', async () => {
  for (const model of [Session, Token]) {
    const indexes = await model.collection.indexes();
    expect(
      indexes.some(
        (index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0,
      ),
    ).toBe(true);
    expect(
      indexes.some((index) => index.key.tokenHash === 1 && index.unique),
    ).toBe(true);
  }
});

it('concurrent use of one reset token allows exactly one password change', async () => {
  const { credentials } = await registered();
  const client = agent();
  await write(client, 'post', '/auth/forgot-password', {
    email: credentials.email,
  });
  const token = messages.at(-1).token;
  const responses = await Promise.all([
    write(agent(), 'post', '/auth/reset-password', {
      token,
      newPassword: 'Concurrent password A',
    }),
    write(agent(), 'post', '/auth/reset-password', {
      token,
      newPassword: 'Concurrent password B',
    }),
  ]);
  expect(responses.map((res) => res.status).sort()).toEqual([204, 422]);
});
it('login racing password change cannot create a usable old-credential session', async () => {
  const { client, credentials } = await loggedIn();
  const original = identity.sessions.create;
  let resume, entered;
  const waiting = new Promise((resolve) => {
    entered = resolve;
  });
  const hold = new Promise((resolve) => {
    resume = resolve;
  });
  const spy = vi
    .spyOn(identity.sessions, 'create')
    .mockImplementationOnce(async (user) => {
      entered();
      await hold;
      return original(user);
    });
  const second = agent();
  const pending = write(second, 'post', '/auth/login', {
    email: credentials.email,
    password,
  });
  try {
    await waiting;
    expect(
      (
        await write(client, 'post', '/auth/change-password', {
          currentPassword: password,
          newPassword: 'Password during race!',
        })
      ).status,
    ).toBe(204);
    resume();
    await pending;
    expect((await second.get('/api/v1/auth/me')).status).toBe(401);
  } finally {
    resume();
    spy.mockRestore();
  }
});
it('pre-login CSRF token cannot be reused after session creation', async () => {
  const { client, credentials } = await registered();
  const csrf = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  const login = await client
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ email: credentials.email, password });
  expect(login.status).toBe(200);
  expect(
    (
      await client
        .patch('/api/v1/me/profile')
        .set('X-CSRF-Token', csrf)
        .send({ bio: 'replay' })
    ).status,
  ).toBe(403);
  expect(
    (await write(client, 'patch', '/me/profile', { bio: 'new csrf' })).status,
  ).toBe(200);
});
it('same-origin Vite request with CSRF works and foreign browser token fails', async () => {
  const { client } = await loggedIn();
  const own = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await client
        .patch('/api/v1/me/profile')
        .set('Origin', 'http://localhost:5173')
        .set('X-CSRF-Token', own)
        .send({ bio: 'same origin' })
    ).status,
  ).toBe(200);
  const foreign = (await agent().get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await client
        .patch('/api/v1/me/profile')
        .set('X-CSRF-Token', foreign)
        .send({ bio: 'foreign' })
    ).status,
  ).toBe(403);
});
it('invalid IDs, pagination and suspended public profiles are rejected', async () => {
  expect((await request(app).get('/api/v1/users/bad-id')).status).toBe(400);
  const { client, id } = await loggedIn();
  await User.updateOne({ _id: id }, { role: 'admin' });
  expect((await client.get('/api/v1/admin/users?limit=101')).status).toBe(400);
  await User.updateOne({ _id: id }, { status: 'suspended' });
  expect((await request(app).get(`/api/v1/users/${id}`)).status).toBe(404);
});
it('audit intent is persisted and write failure prevents account status mutation', async () => {
  const admin = await loggedIn();
  const target = await registered();
  await User.updateOne({ _id: admin.id }, { role: 'admin' });
  const fail = vi
    .spyOn(identity.models.AuditLog.collection, 'insertOne')
    .mockRejectedValueOnce(new Error('audit unavailable'));
  try {
    expect(
      (
        await write(admin.client, 'patch', `/admin/users/${target.id}/status`, {
          status: 'suspended',
          reason: 'Moderation test',
        })
      ).status,
    ).toBe(500);
    expect((await User.findById(target.id)).status).toBe('active');
  } finally {
    fail.mockRestore();
  }
  expect(
    (
      await write(admin.client, 'patch', `/admin/users/${target.id}/status`, {
        status: 'suspended',
        reason: 'Moderation test',
      })
    ).status,
  ).toBe(200);
  const audit = await identity.models.AuditLog.findOne({ targetId: target.id });
  expect(audit.outcome).toBe('applied');
  expect(audit.reason).toBe('Moderation test');
});
it('unconfigured email delivery returns 503 for all accounts', async () => {
  const disabled = await createIdentity({
    connection: database.connection,
    config,
    logger: createLogger('silent'),
  });
  const client = request.agent(
    createApp({ identity: disabled, logger: createLogger('silent') }),
  );
  const { credentials } = await registered();
  for (const email of [credentials.email, input().email])
    expect(
      (await write(client, 'post', '/auth/forgot-password', { email })).status,
    ).toBe(503);
});

it('admin cannot suspend self with uppercase ObjectId', async () => {
  const { client, id } = await loggedIn();
  await User.updateOne({ _id: id }, { role: 'admin' });
  expect(
    (
      await write(client, 'patch', `/admin/users/${id.toUpperCase()}/status`, {
        status: 'suspended',
        reason: 'test',
      })
    ).status,
  ).toBe(409);
  expect((await User.findById(id)).status).toBe('active');
});
it('request logs do not contain password, opaque cookie, CSRF token or email', async () => {
  let output = '';
  const logger = createLogger('info', {
    write(chunk) {
      output += chunk;
    },
  });
  const client = request.agent(createApp({ identity, logger }));
  const credentials = input();
  await write(client, 'post', '/auth/register', credentials);
  const login = await write(client, 'post', '/auth/login', {
    email: credentials.email,
    password,
  });
  expect(login.status).toBe(200);
  const cookie = login.headers['set-cookie'][0].split(';')[0].split('=')[1];
  const csrf = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  await client
    .patch('/api/v1/me/profile')
    .set('X-CSRF-Token', csrf)
    .send({ role: 'admin', passwordHash: 'secret-value' });
  for (const value of [
    password,
    credentials.email,
    cookie,
    csrf,
    'secret-value',
  ])
    expect(output).not.toContain(value);
  expect(output).toContain('request completed');
});
it('password write failure consumes reset token safely without changing password', async () => {
  const { client, credentials } = await registered();
  await write(client, 'post', '/auth/forgot-password', {
    email: credentials.email,
  });
  const token = messages.at(-1).token;
  const fail = vi
    .spyOn(User.collection, 'updateOne')
    .mockRejectedValueOnce(new Error('database failure'));
  try {
    expect(
      (
        await write(client, 'post', '/auth/reset-password', {
          token,
          newPassword: 'Replacement password!',
        })
      ).status,
    ).toBe(500);
  } finally {
    fail.mockRestore();
  }
  expect(
    (
      await write(client, 'post', '/auth/reset-password', {
        token,
        newPassword: 'Replacement password!',
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await write(client, 'post', '/auth/login', {
        email: credentials.email,
        password,
      })
    ).status,
  ).toBe(200);
});
it('audit outcome failure preserves durable intent and successful status change', async () => {
  const admin = await loggedIn();
  const target = await registered();
  await User.updateOne({ _id: admin.id }, { role: 'admin' });
  const fail = vi
    .spyOn(identity.models.AuditLog.collection, 'updateOne')
    .mockRejectedValueOnce(new Error('audit outcome unavailable'));
  try {
    expect(
      (
        await write(admin.client, 'patch', `/admin/users/${target.id}/status`, {
          status: 'suspended',
          reason: 'Test audit recovery',
        })
      ).status,
    ).toBe(200);
  } finally {
    fail.mockRestore();
  }
  expect((await User.findById(target.id)).status).toBe('suspended');
  expect(
    (await identity.models.AuditLog.findOne({ targetId: target.id })).outcome,
  ).toBe('pending');
});

it.each(['email_verify', 'password_reset'])(
  'SMTP-12/17 email link reaches the real %s API without leaking token',
  async (purpose) => {
    const { credentials, id } = await registered();
    let mail;
    const provider = createEmailProvider(
      {
        ...config,
        SMTP_ENABLED: true,
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'test@example.test',
        SMTP_PASSWORD: 'test-only-placeholder',
        EMAIL_FROM: 'test@example.test',
      },
      () => ({
        async sendMail(value) {
          mail = value;
          return { accepted: [credentials.email], rejected: [] };
        },
        close() {},
      }),
    );
    const emailIdentity = await createIdentity({
      connection: database.connection,
      config,
      logger: createLogger('silent'),
      emailProvider: provider,
    });
    const client = request.agent(
      createApp({ identity: emailIdentity, logger: createLogger('silent') }),
    );
    const path =
      purpose === 'email_verify'
        ? '/auth/request-email-verification'
        : '/auth/forgot-password';
    const response = await write(client, 'post', path, {
      email: credentials.email,
    });
    expect(response.status).toBe(202);
    const link = new URL(mail.text.match(/http[^\s]+/)[0]);
    const token = new URLSearchParams(link.hash.slice(1)).get('token');
    expect(JSON.stringify(response.body)).not.toContain(token);
    expect(
      await Token.findOne({ tokenHash: hashToken(token), userId: id }),
    ).not.toBeNull();
    const body =
      purpose === 'email_verify'
        ? { token }
        : { token, newPassword: 'Email reset new password!' };
    expect((await write(client, 'post', link.pathname, body)).status).toBe(204);
    expect((await write(client, 'post', link.pathname, body)).status).toBe(422);
  },
);
it('SMTP-11/16/19/20 timeout stays generic, logs no secrets and consumes failed-delivery token', async () => {
  const { credentials, id } = await registered();
  let output = '',
    rawToken;
  const logger = createLogger('info', {
    write(chunk) {
      output += chunk;
    },
  });
  const provider = createEmailProvider(
    {
      ...config,
      SMTP_ENABLED: true,
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_TIMEOUT_MS: 1000,
      SMTP_USER: 'test@example.test',
      SMTP_PASSWORD: 'test-only-placeholder',
      EMAIL_FROM: 'test@example.test',
    },
    () => ({
      sendMail(mail) {
        rawToken = new URLSearchParams(
          new URL(mail.text.match(/http[^\s]+/)[0]).hash.slice(1),
        ).get('token');
        return new Promise(() => {});
      },
      close() {},
    }),
  );
  const emailIdentity = await createIdentity({
    connection: database.connection,
    config,
    logger,
    emailProvider: provider,
  });
  const client = request.agent(createApp({ identity: emailIdentity, logger }));
  const started = Date.now();
  const known = await write(client, 'post', '/auth/forgot-password', {
    email: credentials.email,
  });
  expect(Date.now() - started).toBeLessThan(4000);
  const unknown = await write(client, 'post', '/auth/forgot-password', {
    email: input().email,
  });
  expect(known.status).toBe(202);
  expect(known.body).toEqual(unknown.body);
  expect(
    (await Token.findOne({ userId: id, tokenHash: hashToken(rawToken) }))
      .usedAt,
  ).toBeInstanceOf(Date);
  expect(output).toContain('email_delivery_failed');
  for (const secret of [rawToken, 'test-only-placeholder', credentials.email])
    expect(output).not.toContain(secret);
});
