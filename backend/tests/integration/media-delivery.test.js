import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { createDatabase } from '../../src/config/database.js';
import { parseEnv } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createCatalog } from '../../src/modules/catalog.js';
import { createMedia } from '../../src/modules/media/index.js';
import { createRecipes } from '../../src/modules/recipes/index.js';
import { createApp } from '../../src/app.js';
import { createImageStorage } from '../../src/integrations/image-storage/index.js';
import { createRecipeReferences } from '../../src/modules/recipes/recipe-reference.js';
import { createMediaCleanup } from '../../src/modules/media/media-cleanup.js';
import { mockCloudinary, cloudConfig } from '../helpers/cloudinary-sdk.js';
import { loadSpec } from '../../src/openapi/docs.js';
import {
  schemaValidator,
  resolveRef,
} from '../../../scripts/openapi-contract.js';
const config = parseEnv({
  ...cloudConfig,
  NODE_ENV: 'test',
  IMAGE_STORAGE_TIMEOUT_MS: 1000,
  IMAGE_DELIVERY_POLICY: 'authenticated',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  SMTP_ENABLED: 'false',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  stub = mockCloudinary(),
  prefix = 'p1-' + randomUUID(),
  users = [];
let identity,
  catalog,
  media,
  recipes,
  app,
  png,
  category,
  storage,
  badResponse = false,
  unavailable = false,
  readHook;
async function actor(name) {
  const client = request.agent(app),
    email = `${prefix}-${name}@example.test`,
    password = 'Isolated media delivery phrase!';
  let csrf = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  const reg = await client
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ email, password, displayName: 'Media test' });
  expect(reg.status).toBe(201);
  users.push(reg.body.data.id);
  csrf = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', csrf)
        .send({ email, password })
    ).status,
  ).toBe(200);
  csrf = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  return { client, csrf, id: reg.body.data.id };
}
async function upload(owner) {
  const res = await owner.client
    .post('/api/v1/media/images')
    .set('X-CSRF-Token', owner.csrf)
    .set('Idempotency-Key', randomUUID())
    .field('purpose', 'recipe_cover')
    .attach('file', png, {
      filename: 'synthetic.png',
      contentType: 'image/png',
    });
  expect(res.status).toBe(201);
  return res.body.data.assetId;
}
async function draft(owner, assetId) {
  const res = await owner.client
    .post('/api/v1/recipes')
    .set('X-CSRF-Token', owner.csrf)
    .set('Idempotency-Key', randomUUID())
    .send({
      title: 'Canh riêng tư',
      description: 'Công thức dùng kiểm thử binary',
      categoryId: String(category._id),
      difficulty: 'easy',
      servings: 1,
      prepMinutes: 0,
      cookMinutes: 0,
      ingredients: [{ name: 'Rau', quantity: 0, order: 1 }],
      steps: [{ order: 1, instruction: 'Nấu canh thật kỹ' }],
      coverImageAssetId: assetId,
    });
  expect(res.status).toBe(201);
  return res.body.data;
}
const validate = schemaValidator(loadSpec());
function ownerContract(res, path, method) {
  expect(res.status).toBe(200);
  const spec = loadSpec(),
    schema = resolveRef(spec, spec.paths[path][method].responses['200'])
      .content['application/json'].schema;
  validate(schema, res.body);
}
beforeAll(async () => {
  await db.connect();
  identity = await createIdentity({
    connection: db.connection,
    config,
    logger,
  });
  catalog = await createCatalog(db.connection, identity);
  storage = await createImageStorage(config, {
    sdk: stub.sdk,
    fetchImpl: async (url) => {
      if (unavailable) throw new Error('secret signed URL');
      const id = url.searchParams.get('public_id'),
        buffer = stub.buffers.get('authenticated/' + id);
      if (readHook) await readHook();
      return new Response(badResponse ? Buffer.from('HTML') : buffer, {
        status: buffer ? 200 : 404,
        headers: { 'Content-Type': badResponse ? 'text/html' : 'image/png' },
      });
    },
  });
  media = await createMedia({
    connection: db.connection,
    identity,
    config,
    storage,
    logger,
  });
  recipes = await createRecipes({
    connection: db.connection,
    identity,
    catalog,
    media,
  });
  app = createApp({
    config,
    identity,
    catalog,
    media,
    recipes,
    logger,
    isReady: db.isReady,
  });
  png = await sharp({
    create: { width: 320, height: 240, channels: 3, background: '#dab980' },
  })
    .png()
    .toBuffer();
  category = await catalog.models.Category.create({
    name: prefix,
    slug: prefix,
  });
});
afterAll(async () => {
  if (identity) {
    await recipes?.Recipe.deleteMany({ authorId: { $in: users } });
    await media?.MediaAsset.deleteMany({ ownerId: { $in: users } });
    await identity.models.Session.deleteMany({ userId: { $in: users } });
    await identity.models.Token.deleteMany({ userId: { $in: users } });
    await identity.models.User.deleteMany({ _id: { $in: users } });
  }
  await category?.deleteOne();
  await db.close();
});
it('P1-I01 composed Cloudinary adapter upload/attach/private binary/publish/schema/unpublish/revoke', async () => {
  const a = await actor('owner'),
    b = await actor('other'),
    asset = await upload(a),
    r = await draft(a, asset),
    path = r.coverImageUrl;
  expect(path).toBe(`/api/v1/recipes/${r.recipeId}/images/${asset}`);
  expect((await request(app).get(path)).status).toBe(404);
  expect((await b.client.get(path)).status).toBe(404);
  const owned = await a.client.get(path);
  expect(owned.status).toBe(200);
  expect(owned.headers['content-type']).toBe('image/png');
  expect(owned.headers['cache-control']).toBe('private, no-store');
  expect(owned.headers.etag).toBeUndefined();
  expect(owned.body.length).toBe(png.length);
  ownerContract(
    await a.client.get('/api/v1/me/recipes/' + r.recipeId),
    '/api/v1/me/recipes/{recipeId}',
    'get',
  );
  const publish = await a.client
    .patch('/api/v1/recipes/' + r.recipeId + '/publish')
    .set('X-CSRF-Token', a.csrf)
    .send({ version: r.version });
  ownerContract(publish, '/api/v1/recipes/{recipeId}/publish', 'patch');
  expect(publish.body.data.status).toBe('published');
  ownerContract(
    await a.client.get('/api/v1/me/recipes/' + r.recipeId),
    '/api/v1/me/recipes/{recipeId}',
    'get',
  );
  expect((await request(app).get(path)).status).toBe(200);
  const cards = await request(app)
    .get('/api/v1/recipes')
    .query({ category: String(category._id) });
  expect(
    cards.body.data.find((card) => card.recipeId === r.recipeId)?.coverImageUrl,
  ).toBe(path);
  const unpublish = await a.client
    .patch('/api/v1/recipes/' + r.recipeId + '/unpublish')
    .set('X-CSRF-Token', a.csrf)
    .send({ version: publish.body.data.version });
  ownerContract(unpublish, '/api/v1/recipes/{recipeId}/unpublish', 'patch');
  expect((await request(app).get(path)).status).toBe(404);
  expect((await a.client.get(path)).status).toBe(200);
  expect(
    (
      await a.client
        .delete('/api/v1/recipes/' + r.recipeId)
        .set('X-CSRF-Token', a.csrf)
    ).status,
  ).toBe(204);
  expect((await a.client.get(path)).status).toBe(404);
});
it('P1-I02 upstream malformed502/network503 sanitized; reauthorization revokes in-flight read', async () => {
  const a = await actor('race'),
    asset = await upload(a),
    r = await draft(a, asset);
  badResponse = true;
  const bad = await a.client.get(r.coverImageUrl);
  expect(bad.status).toBe(502);
  expect(JSON.stringify(bad.body)).not.toMatch(
    /secret|signature|cloudinary\.com/,
  );
  badResponse = false;
  unavailable = true;
  expect((await a.client.get(r.coverImageUrl)).status).toBe(503);
  unavailable = false;
  const published = await a.client
    .patch('/api/v1/recipes/' + r.recipeId + '/publish')
    .set('X-CSRF-Token', a.csrf)
    .send({ version: r.version });
  expect(published.status).toBe(200);
  readHook = async () => {
    readHook = undefined;
    await recipes.Recipe.updateOne(
      { _id: r.recipeId },
      { $set: { status: 'draft' }, $inc: { version: 1 } },
    );
  };
  expect((await request(app).get(r.coverImageUrl)).status).toBe(404);
});
it('P1-I03 unused owned Cloudinary asset deletion queue and scoped cleanup use same adapter', async () => {
  const a = await actor('cleanup'),
    assetId = await upload(a);
  const res = await a.client
    .delete('/api/v1/media/images/' + assetId)
    .set('X-CSRF-Token', a.csrf);
  expect(res.status).toBe(202);
  const scoped = new Proxy(media.MediaAsset, {
    get(target, key) {
      if (key === 'find') return (q) => target.find({ ...q, ownerId: a.id });
      return Reflect.get(target, key);
    },
  });
  const worker = createMediaCleanup({
    MediaAsset: scoped,
    storage,
    service: media.service,
    lifecycle: media.lifecycle,
    references: createRecipeReferences({
      Recipe: recipes.Recipe,
      User: identity.models.User,
    }),
    config,
    logger,
  });
  try {
    const outcomes = await worker.runOnce();
    expect(outcomes.some((r) => String(r.assetId) === assetId)).toBe(true);
    expect((await media.MediaAsset.findById(assetId)).status).toBe('deleted');
  } finally {
    await worker.stop();
  }
});
