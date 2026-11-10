import { createRecipes } from '../../src/modules/recipes/index.js';
import { createMedia } from '../../src/modules/media/index.js';
import sharp from 'sharp';
import { beforeAll, afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/config/logger.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createCatalog } from '../../src/modules/catalog.js';
import { createApp } from '../../src/app.js';
import { loadSpec } from '../../src/openapi/docs.js';
import {
  routeInventory,
  validateContract,
  resolveRef,
  schemaValidator,
} from '../../../scripts/openapi-contract.js';
const config = parseEnv({
  NODE_ENV: 'test',
  APP_DOCS_ENABLED: 'true',
  SMTP_ENABLED: 'false',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  prefix = `docs-${randomUUID()}`;
const spec = loadSpec(),
  validates = schemaValidator(spec),
  messages = [];
const password = 'Documentation test phrase';
let app, identity, catalog, media, recipes, admin, user, userId;
const covered = new Set();
function contract(method, path, res) {
  const op = spec.paths[path][method];
  expect(
    op.responses[res.status],
    `${method} ${path}: undocumented ${res.status}`,
  ).toBeDefined();
  const response = resolveRef(spec, op.responses[res.status]);
  if (res.status === 204) expect(res.text).toBe('');
  else validates(response.content['application/json'].schema, res.body);
  covered.add(`${method} ${path}`);
  return res;
}
async function csrf(client) {
  const res = await client.get('/api/v1/auth/csrf');
  contract('get', '/api/v1/auth/csrf', res);
  return res.body.data.csrfToken;
}
async function write(client, method, path, body, template = path) {
  const token = await csrf(client);
  return contract(
    method,
    template,
    await client[method](path).set('X-CSRF-Token', token).send(body),
  );
}
async function login(role) {
  const client = request.agent(app),
    email = `${prefix}-${role}@example.test`;
  const res = await write(client, 'post', '/api/v1/auth/register', {
    email,
    password,
    displayName: 'Docs Test',
  });
  expect(res.status).toBe(201);
  if (role === 'admin')
    await identity.models.User.updateOne(
      { _id: res.body.data.id },
      { role: 'admin' },
    );
  expect(
    (await write(client, 'post', '/api/v1/auth/login', { email, password }))
      .status,
  ).toBe(200);
  return { client, id: res.body.data.id };
}
beforeAll(async () => {
  await db.connect();
  identity = await createIdentity({
    connection: db.connection,
    config,
    logger,
    emailProvider: {
      available: true,
      send: async (message) => {
        messages.push(message);
      },
    },
  });
  catalog = await createCatalog(db.connection, identity);
  media = await createMedia({ connection: db.connection, identity, config });
  recipes = await createRecipes({
    connection: db.connection,
    identity,
    catalog,
    media,
  });
  app = createApp({
    recipes,
    identity,
    catalog,
    media,
    config,
    logger,
    isReady: db.isReady,
  });
  admin = (await login('admin')).client;
  const u = await login('user');
  user = u.client;
  userId = u.id;
});
afterAll(async () => {
  if (identity) {
    const ids = (
      await identity.models.User.find({ email: { $regex: `^${prefix}` } })
    ).map((u) => u._id);
    for (const Model of [identity.models.Session, identity.models.Token])
      await Model.deleteMany({ userId: { $in: ids } });
    await identity.models.AuditLog.deleteMany({ targetId: { $in: ids } });
    await identity.models.User.deleteMany({ _id: { $in: ids } });
    if (recipes) await recipes.Recipe.deleteMany({ authorId: { $in: ids } });
    if (media) await media.MediaAsset.deleteMany({ ownerId: { $in: ids } });
  }
  if (catalog)
    for (const Model of Object.values(catalog.models))
      await Model.deleteMany({ name: { $regex: `^${prefix}` } });
  await db.close();
});
it('DOC-05/06/21 real app UI/spec and router inventory agree', async () => {
  const html = await request(app).get('/api/docs');
  expect(html.status).toBe(200);
  expect(html.text).toContain('Recipe Hub API Documentation');
  expect(html.headers['cache-control']).toBe('no-store');
  const json = await request(app).get('/api/openapi.json');
  expect(json.body).toEqual(spec);
  expect(json.headers['cache-control']).toBe('no-store');
  await validateContract(
    json.body,
    routeInventory(app, identity, catalog, media, recipes),
  );
  expect(html.headers['content-security-policy']).toContain(
    "script-src 'self'",
  );
  expect((await request(app).get('/api/docs/init.js')).text).toContain(
    'validatorUrl: null',
  );
});
it.each([
  { NODE_ENV: 'development', APP_DOCS_ENABLED: false },
  { NODE_ENV: 'production', APP_DOCS_ENABLED: false },
  { NODE_ENV: 'production', APP_DOCS_ENABLED: true },
])('DOC-07/08 UI JSON and assets disabled under %j', async (docsConfig) => {
  const disabled = createApp({ config: docsConfig, logger });
  for (const path of [
    '/api/docs',
    '/api/docs/',
    '/api/docs/init.js',
    '/api/docs/swagger-ui-bundle.js',
    '/api/openapi.json',
  ])
    expect((await request(disabled).get(path)).status).toBe(404);
});
it('DOC-11 secure cookie name is derived from actual security config without raw token', async () => {
  const secure = createApp({
    config: { ...config, COOKIE_SECURE: true },
    identity: {
      ...identity,
      security: {
        ...identity.security,
        sessionCookie: '__Host-recipe-hub-session',
      },
    },
    logger,
  });
  const res = await request(secure).get('/api/openapi.json');
  expect(res.body.components.securitySchemes.SessionCookie.name).toBe(
    '__Host-recipe-hub-session',
  );
  expect(JSON.stringify(res.body)).not.toMatch(
    /passwordHash|authVersion|tokenHash|lookupKeys|normalizedName/,
  );
});
it('DOC-09..16 success responses for every live operation conform to schemas', async () => {
  for (const path of ['/health/live', '/health/ready', '/api/v1/health'])
    contract('get', path, await request(app).get(path));
  for (const path of ['/api/v1/auth/me', '/api/v1/me/preferences'])
    contract('get', path, await user.get(path));
  contract(
    'get',
    '/api/v1/users/{userId}',
    await request(app).get(`/api/v1/users/${userId}`),
  );
  expect(
    (await write(user, 'patch', '/api/v1/me/profile', { bio: 'Docs profile' }))
      .status,
  ).toBe(200);
  expect(
    (
      await write(user, 'patch', '/api/v1/me/preferences', {
        timezone: 'Asia/Ho_Chi_Minh',
        notificationSettings: { recipes: false },
      })
    ).status,
  ).toBe(200);
  contract(
    'get',
    '/api/v1/admin/users',
    await admin.get('/api/v1/admin/users'),
  );
  expect(
    (
      await write(
        admin,
        'patch',
        `/api/v1/admin/users/${userId}/status`,
        { status: 'active', reason: 'Docs contract test' },
        '/api/v1/admin/users/{userId}/status',
      )
    ).status,
  ).toBe(200);
  // Status mutation revokes prior sessions; login afresh.
  expect(
    (
      await write(user, 'post', '/api/v1/auth/login', {
        email: `${prefix}-user@example.test`,
        password,
      })
    ).status,
  ).toBe(200);
  for (const [kind, key] of [
    ['categories', 'categoryId'],
    ['ingredients', 'ingredientId'],
  ]) {
    const created = await write(admin, 'post', `/api/v1/admin/${kind}`, {
      name: `${prefix} ${kind}`,
    });
    expect(created.status).toBe(201);
    contract('get', `/api/v1/${kind}`, await user.get(`/api/v1/${kind}`));
    expect(
      (
        await write(
          admin,
          'patch',
          `/api/v1/admin/${kind}/${created.body.data.id}`,
          { isActive: false },
          `/api/v1/admin/${kind}/{${key}}`,
        )
      ).status,
    ).toBe(200);
  }
  for (const [endpoint, purpose, target] of [
    ['request-email-verification', 'email_verify', 'verify-email'],
    ['forgot-password', 'password_reset', 'reset-password'],
  ]) {
    expect(
      (
        await write(user, 'post', `/api/v1/auth/${endpoint}`, {
          email: `${prefix}-user@example.test`,
        })
      ).status,
    ).toBe(202);
    const token = messages.findLast((m) => m.purpose === purpose).token;
    expect(
      (
        await write(user, 'post', `/api/v1/auth/${target}`, {
          token,
          ...(purpose === 'password_reset' ? { newPassword: password } : {}),
        })
      ).status,
    ).toBe(204);
  }
  expect(
    (
      await write(user, 'post', '/api/v1/auth/login', {
        email: `${prefix}-user@example.test`,
        password,
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await write(user, 'post', '/api/v1/auth/change-password', {
        currentPassword: password,
        newPassword: password,
      })
    ).status,
  ).toBe(204);
  expect(
    (
      await write(user, 'post', '/api/v1/auth/login', {
        email: `${prefix}-user@example.test`,
        password,
      })
    ).status,
  ).toBe(200);
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer();
  const uploadToken = await csrf(user);
  const uploaded = contract(
    'post',
    '/api/v1/media/images',
    await user
      .post('/api/v1/media/images')
      .set('X-CSRF-Token', uploadToken)
      .set('Idempotency-Key', randomUUID())
      .field('purpose', 'recipe_cover')
      .attach('file', png, { filename: 'image.png', contentType: 'image/png' }),
  );
  expect(uploaded.status).toBe(201);
  expect(
    contract('get', '/api/v1/me/media', await user.get('/api/v1/me/media'))
      .status,
  ).toBe(200);
  expect(
    (
      await write(
        user,
        'delete',
        `/api/v1/media/images/${uploaded.body.data.assetId}`,
        undefined,
        '/api/v1/media/images/{assetId}',
      )
    ).status,
  ).toBe(202);
  const recipeToken = await csrf(user);
  const createdRecipe = contract(
    'post',
    '/api/v1/recipes',
    await user
      .post('/api/v1/recipes')
      .set('X-CSRF-Token', recipeToken)
      .set('Idempotency-Key', randomUUID())
      .send({}),
  );
  expect(createdRecipe.status).toBe(201);
  const rid = createdRecipe.body.data.recipeId;
  contract('get', '/api/v1/me/recipes', await user.get('/api/v1/me/recipes'));
  contract(
    'get',
    '/api/v1/me/recipes/{recipeId}',
    await user.get(`/api/v1/me/recipes/${rid}`),
  );
  expect(
    (
      await write(
        user,
        'patch',
        `/api/v1/recipes/${rid}`,
        { version: 0, title: 'Contract recipe' },
        '/api/v1/recipes/{recipeId}',
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await write(
        user,
        'delete',
        `/api/v1/recipes/${rid}`,
        undefined,
        '/api/v1/recipes/{recipeId}',
      )
    ).status,
  ).toBe(204);
  expect((await write(user, 'post', '/api/v1/auth/logout')).status).toBe(204);
  contract('get', '/api/v1/recipes', await user.get('/api/v1/recipes'));
  contract(
    'get',
    '/api/v1/recipes/{slug}',
    await user.get('/api/v1/recipes/nonexistent'),
  );
  await write(
    user,
    'patch',
    `/api/v1/recipes/${rid}/publish`,
    { version: 0 },
    '/api/v1/recipes/{recipeId}/publish',
  );
  await write(
    user,
    'patch',
    `/api/v1/recipes/${rid}/unpublish`,
    { version: 0 },
    '/api/v1/recipes/{recipeId}/unpublish',
  );
  contract(
    'get',
    '/api/v1/recipes/{recipeId}/images/{assetId}',
    await user.get(
      `/api/v1/recipes/${rid}/images/${uploaded.body.data.assetId}`,
    ),
  );
  contract(
    'get',
    '/api/v1/me/favorites',
    await user.get('/api/v1/me/favorites'),
  );
  await write(
    user,
    'put',
    `/api/v1/me/favorites/${rid}`,
    undefined,
    '/api/v1/me/favorites/{recipeId}',
  );
  await write(
    user,
    'delete',
    `/api/v1/me/favorites/${rid}`,
    undefined,
    '/api/v1/me/favorites/{recipeId}',
  );
  const socialOperations = [
    [
      'get',
      `/api/v1/recipes/${rid}/reviews`,
      '/api/v1/recipes/{recipeId}/reviews',
    ],
    [
      'put',
      `/api/v1/recipes/${rid}/my-review`,
      '/api/v1/recipes/{recipeId}/my-review',
    ],
    [
      'delete',
      `/api/v1/recipes/${rid}/my-review`,
      '/api/v1/recipes/{recipeId}/my-review',
    ],
    [
      'get',
      `/api/v1/recipes/${rid}/comments`,
      '/api/v1/recipes/{recipeId}/comments',
    ],
    [
      'post',
      `/api/v1/recipes/${rid}/comments`,
      '/api/v1/recipes/{recipeId}/comments',
    ],
    ['patch', `/api/v1/comments/${rid}`, '/api/v1/comments/{commentId}'],
    ['delete', `/api/v1/comments/${rid}`, '/api/v1/comments/{commentId}'],
    ['post', '/api/v1/reports', '/api/v1/reports'],
    ['get', '/api/v1/admin/reports', '/api/v1/admin/reports'],
    [
      'patch',
      `/api/v1/admin/reports/${rid}/resolve`,
      '/api/v1/admin/reports/{reportId}/resolve',
    ],
    [
      'patch',
      `/api/v1/admin/recipes/${rid}/moderation`,
      '/api/v1/admin/recipes/{recipeId}/moderation',
    ],
    [
      'patch',
      `/api/v1/admin/comments/${rid}/moderation`,
      '/api/v1/admin/comments/{commentId}/moderation',
    ],
  ];
  for (const [method, path, pattern] of socialOperations) {
    if (method === 'get') contract(method, pattern, await admin.get(path));
    else await write(admin, method, path, undefined, pattern);
  }
  expect(covered.size).toBe(53);
});
it('DOC-16/19/20 actual CSRF, permission, expiry and validation error contracts', async () => {
  const guest = request.agent(app);
  for (const token of ['', 'invalid'])
    expect(
      contract(
        'post',
        '/api/v1/admin/categories',
        await guest
          .post('/api/v1/admin/categories')
          .set('X-CSRF-Token', token)
          .send({ name: prefix }),
      ).status,
    ).toBe(403);
  expect(
    (await write(guest, 'post', '/api/v1/admin/categories', { name: prefix }))
      .status,
  ).toBe(401);
  const before = await csrf(guest);
  expect(
    (
      await guest
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', before)
        .send({ email: `${prefix}-user@example.test`, password })
    ).status,
  ).toBe(200);
  expect(
    (
      await guest
        .patch('/api/v1/me/profile')
        .set('X-CSRF-Token', before)
        .send({ bio: 'stale' })
    ).status,
  ).toBe(403);
  expect(
    (await write(guest, 'patch', '/api/v1/me/profile', { bio: 'fresh' }))
      .status,
  ).toBe(200);
  expect(
    (await write(guest, 'post', '/api/v1/admin/categories', { name: prefix }))
      .status,
  ).toBe(403);
  expect(
    (await write(guest, 'patch', '/api/v1/me/profile', { role: 'admin' }))
      .status,
  ).toBe(422);
  for (const path of [
    '/api/v1/categories?active=false',
    '/api/v1/ingredients?limit=101',
  ])
    expect(
      contract('get', path.split('?')[0], await guest.get(path)).status,
    ).toBe(400);
  await identity.models.Session.updateMany(
    { userId },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  expect(
    contract('get', '/api/v1/auth/me', await guest.get('/api/v1/auth/me'))
      .status,
  ).toBe(401);
});
