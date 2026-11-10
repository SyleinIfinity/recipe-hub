const fixtureRecipeIds = [];
import { writeFileSync } from 'node:fs';
import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
  vi,
} from 'vitest';
import https from 'node:https';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/config/logger.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createCatalog } from '../../src/modules/catalog.js';
import { createMedia } from '../../src/modules/media/index.js';
import { createRecipes } from '../../src/modules/recipes/index.js';
import { createApp } from '../../src/app.js';
import { loadSpec } from '../../src/openapi/docs.js';
import { schemaValidator } from '../../../scripts/openapi-contract.js';
import { backfillRecipeSearch } from '../../src/modules/recipes/search.backfill.js';
import { searchQuery } from '../../src/modules/recipes/search.validation.js';
import { searchPipeline } from '../../src/modules/recipes/search.service.js';
import { favoritePipeline } from '../../src/modules/favorites/favorite.service.js';
import { recipeRoutes } from '../../src/modules/recipes/recipe.routes.js';
import { createRecipeController } from '../../src/modules/recipes/recipe.controller.js';
const config = parseEnv({
  NODE_ENV: 'test',
  SMTP_ENABLED: 'false',
  MEDIA_PROVIDER: 'fake',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  prefix = `search-${randomUUID()}`,
  ids = [];
const spec = loadSpec(),
  validates = schemaValidator(spec);
let identity,
  catalog,
  media,
  recipes,
  app,
  a,
  b,
  category,
  otherCategory,
  ingredients;
async function login(label) {
  const client = request.agent(app),
    email = `${prefix}-${label}@example.test`,
    password = 'Recipe search test phrase!';
  const csrf = async () =>
    (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  let token = await csrf();
  const reg = await client
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', token)
    .send({ email, password, displayName: label });
  expect(reg.status).toBe(201);
  ids.push(reg.body.data.id);
  token = await csrf();
  expect(
    (
      await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email, password })
    ).status,
  ).toBe(200);
  return {
    client,
    token: await csrf(),
    actor: { user: await identity.models.User.findById(reg.body.data.id) },
  };
}
beforeAll(async () => {
  vi.spyOn(https, 'request').mockImplementation(() => {
    throw new Error('External network forbidden');
  });
  await db.connect();
  identity = await createIdentity({
    connection: db.connection,
    config,
    logger,
  });
  catalog = await createCatalog(db.connection, identity);
  media = await createMedia({
    connection: db.connection,
    identity,
    config,
    logger,
  });
  recipes = await createRecipes({
    connection: db.connection,
    identity,
    catalog,
    media,
  });
  app = createApp({
    identity,
    catalog,
    media,
    recipes,
    config,
    logger,
    isReady: db.isReady,
  });
  a = await login('Owner');
  b = await login('Reader');
  category = await catalog.models.Category.create({
    name: 'Search category',
    slug: prefix,
  });
  otherCategory = await catalog.models.Category.create({
    name: 'Other category',
    slug: `${prefix}-other`,
  });
  ingredients = await catalog.models.Ingredient.create(
    [0, 1, 2].map((i) => ({ name: `${prefix}-${i}` })),
  );
});
beforeEach(async () => {
  await identity.models.User.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'active' } },
  );
  await catalog.models.Category.updateMany(
    { _id: { $in: [category._id, otherCategory._id] } },
    { $set: { isActive: true } },
  );
});
afterEach(async () => {
  expect(https.request).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.spyOn(https, 'request').mockImplementation(() => {
    throw new Error('External network forbidden');
  });
  await recipes.Favorite.deleteMany({ userId: { $in: ids } });
  await recipes.Recipe.deleteMany({
    $or: [
      { authorId: { $in: ids } },
      { _id: { $in: fixtureRecipeIds.splice(0) } },
    ],
  });
});
afterAll(async () => {
  expect(https.request).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  await catalog.models.Category.deleteMany({
    _id: { $in: [category._id, otherCategory._id] },
  });
  await catalog.models.Ingredient.deleteMany({
    _id: { $in: ingredients.map((i) => i._id) },
  });
  await identity.models.Session.deleteMany({ userId: { $in: ids } });
  await identity.models.User.deleteMany({ _id: { $in: ids } });
  await db.close();
});
const content = (extra = {}) => ({
  title: 'Thịt kho trứng',
  description: 'Món ăn gia đình Việt Nam',
  categoryId: String(category._id),
  difficulty: 'easy',
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  tags: ['Bữa tối'],
  ingredients: ingredients.slice(0, 2).map((v, i) => ({
    ingredientId: String(v._id),
    name: 'Ingredient snapshot',
    quantity: 1,
    order: i + 1,
  })),
  steps: [{ order: 1, instruction: 'Nấu trong nồi nhỏ' }],
  ...extra,
});
async function published(extra = {}) {
  const r = await recipes.service.create(a.actor, content(extra), randomUUID());
  fixtureRecipeIds.push(r._id);
  return recipes.publication.publish(a.actor, r._id, { version: r.version });
}
const search = (query = {}) =>
  request(app)
    .get('/api/v1/recipes')
    .query({ category: String(category._id), ...query });
const put = (r, who = b) =>
  who.client
    .put(`/api/v1/me/favorites/${r._id}`)
    .set('X-CSRF-Token', who.token);
const remove = (r, who = b) =>
  who.client
    .delete(`/api/v1/me/favorites/${r._id}`)
    .set('X-CSRF-Token', who.token);
const list = (who = b, q = {}) =>
  who.client.get('/api/v1/me/favorites').query(q);
const found = (res) => res.body.data.map((r) => r.recipeId);
it('SRCH-01 empty public scope returns zero', async () => {
  const res = await search();
  expect(res.status).toBe(200);
  expect(res.body.meta.total).toBe(0);
  expect(res.body.data).toEqual([]);
});
it.each([
  'thit kho trung',
  'THỊT KHO TRỨNG',
  'Thịt kho trứng'.normalize('NFD'),
  'gia dinh viet',
])('SRCH-02..05 title/description normalization %s', async (q) => {
  const r = await published();
  const res = await search({ q });
  expect(found(res)).toEqual([String(r._id)]);
  validates(spec.components.schemas.PublicRecipeCardDTO, res.body.data[0]);
  expect(JSON.stringify(res.body)).not.toMatch(
    /email|passwordHash|searchTokens|searchVersion|creationKey|moderationReason|imageAssetId|cloudinary/,
  );
});
it.each([
  { category: 'bad' },
  { difficulty: 'bad' },
  { maxMinutes: '-1' },
  { maxMinutes: 'Infinity' },
  { maxMinutes: '1e2' },
  { q: 'x'.repeat(121) },
  { q: '' },
  { q: { $ne: '' } },
  { q: '.*' },
  { ingredientIds: '' },
  { ingredientIds: 'bad' },
  { ingredientMatch: 'all' },
  { ingredientIds: Array(21).fill('123456789012345678901234').join(',') },
  { page: 1001 },
  { limit: 101 },
  { sort: 'rating' },
  { status: 'draft' },
])('SRCH-06..09/18..20/25..27/35 HTTP rejects %j', async (q) => {
  const res = await search(q);
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});
it('SRCH-08/09 repeated params/operators cannot broaden scope', async () => {
  await published();
  for (const path of [
    'q=a&q=b',
    'ingredientIds[]=123456789012345678901234',
    'category[$ne]=x',
    '$where=1',
  ])
    expect((await request(app).get(`/api/v1/recipes?${path}`)).status).toBe(
      400,
    );
  const res = await search({ q: 'nomatch.*' });
  expect(res.status).toBe(200);
  expect(res.body.meta.total).toBe(0);
});
it('SRCH-11..17 combined category/difficulty/time/tag/q AND; inactive retained category', async () => {
  const r = await published();
  await published({ categoryId: String(otherCategory._id) });
  await published({ difficulty: 'hard' });
  await published({ cookMinutes: 31 });
  await published({ tags: ['Lunch'] });
  const q = { q: 'thit', difficulty: 'easy', maxMinutes: 30, tag: ' BỮA TỐI ' };
  expect(found(await search(q))).toEqual([String(r._id)]);
  expect((await search({ ...q, maxMinutes: 29 })).body.meta.total).toBe(0);
  expect((await search({ ...q, tag: 'bua toi' })).body.meta.total).toBe(0);
  await catalog.models.Category.updateOne(
    { _id: category._id },
    { isActive: false },
  );
  expect(found(await search(q))).toEqual([String(r._id)]);
  expect(
    (await search({ category: String(new mongoose.Types.ObjectId()) })).body
      .meta.total,
  ).toBe(0);
});
it('SRCH-13 zero totalMinutes included, null excluded', async () => {
  const r = await published({ prepMinutes: 0, cookMinutes: 0 });
  const broken = await published();
  await recipes.Recipe.updateOne({ _id: broken._id }, { totalMinutes: null });
  expect(found(await search({ maxMinutes: '0' }))).toEqual([String(r._id)]);
});
it('SRCH-21..24/28..30 ingredient any/all/distinct/free-text/cross-recipe and combined filters', async () => {
  const both = await published();
  const only = await published({ ingredients: [content().ingredients[0]] });
  await published({
    ingredients: [{ name: 'Ingredient snapshot', quantity: 1, order: 1 }],
  });
  const [x, y, z] = ingredients.map((v) => String(v._id));
  expect(new Set(found(await search({ ingredientIds: `${x},${y}` })))).toEqual(
    new Set([String(both._id), String(only._id)]),
  );
  expect(
    found(
      await search({
        ingredientIds: `${x},${y}`,
        ingredientMatch: 'all',
        q: 'thit',
        difficulty: 'easy',
        maxMinutes: 30,
        tag: 'bữa tối',
      }),
    ),
  ).toEqual([String(both._id)]);
  expect(
    (await search({ ingredientIds: `${x},${z}`, ingredientMatch: 'all' })).body
      .meta.total,
  ).toBe(0);
  expect(
    found(
      await search({
        ingredientIds: `${x.toUpperCase()},${x},${y}`,
        ingredientMatch: 'all',
      }),
    ),
  ).toEqual([String(both._id)]);
});
it.each([
  'draft',
  'hidden',
  'deleted',
  'pending',
  'suspended',
  'missing-author',
])(
  'SRCH-10/36 FAV-09..12/15/23 shared visibility excludes %s',
  async (state) => {
    const r = await published();
    expect((await put(r)).status).toBe(201);
    if (state === 'suspended')
      await identity.models.User.updateOne(
        { _id: a.actor.user._id },
        { status: 'suspended' },
      );
    else
      await recipes.Recipe.updateOne(
        { _id: r._id },
        state === 'draft'
          ? { status: 'draft' }
          : state === 'hidden'
            ? { moderationStatus: 'hidden' }
            : state === 'deleted'
              ? { deletedAt: new Date() }
              : state === 'pending'
                ? { creationState: 'pending' }
                : { authorId: new mongoose.Types.ObjectId() },
        { overwriteImmutable: true },
      );
    expect((await search({ q: 'thit' })).body.meta.total).toBe(0);
    expect((await list()).body.meta.total).toBe(0);
    expect((await request(app).get(`/api/v1/recipes/${r.slug}`)).status).toBe(
      404,
    );
    expect((await put(r)).status).toBe(404);
    expect(await recipes.Favorite.countDocuments({ recipeId: r._id })).toBe(1);
    expect((await remove(r)).status).toBe(204);
  },
);
it('SRCH-31..34 FAV-14/15 stable ties, pagination after visibility, beyond last', async () => {
  const rows = [];
  for (let i = 0; i < 5; i++) rows.push(await published());
  await recipes.Recipe.updateMany(
    { _id: { $in: rows.map((r) => r._id) } },
    { publishedAt: new Date('2025-01-01') },
  );
  for (const r of rows) await put(r);
  await recipes.Favorite.updateMany(
    { userId: b.actor.user._id },
    { createdAt: new Date('2025-01-01') },
    { overwriteImmutable: true },
  );
  await recipes.Recipe.updateOne(
    { _id: rows[4]._id },
    { moderationStatus: 'hidden' },
  );
  const sorted = rows
    .slice(0, 4)
    .map((r) => String(r._id))
    .sort();
  expect(found(await search({ sort: 'publishedAt', limit: 2 }))).toEqual(
    sorted.slice(0, 2),
  );
  expect(
    found(await search({ sort: '-publishedAt', page: 2, limit: 2 })),
  ).toEqual(sorted.slice(0, 2).reverse());
  expect((await search({ page: 3, limit: 2 })).body.data).toEqual([]);
  const fav = await list(b, { limit: 2 });
  expect(fav.body.meta.total).toBe(4);
  expect(fav.body.data).toHaveLength(2);
  const expectedFavorites = await recipes.Favorite.find({
    userId: b.actor.user._id,
    recipeId: { $ne: rows[4]._id },
  }).sort({ createdAt: -1, _id: -1 });
  expect(found(fav)).toEqual(
    expectedFavorites.slice(0, 2).map((v) => String(v.recipeId)),
  );
  const next = await list(b, { page: 2, limit: 2 });
  expect(new Set([...found(fav), ...found(next)]).size).toBe(4);
  expect((await list(b, { page: 3, limit: 2 })).body.data).toEqual([]);
});
it('FAV-01..04 idempotent/concurrent HTTP PUT and unique DB index', async () => {
  const r = await published();
  const results = await Promise.all(Array.from({ length: 12 }, () => put(r)));
  expect(results.filter((v) => v.status === 201)).toHaveLength(1);
  expect(results.filter((v) => v.status === 200)).toHaveLength(11);
  expect(
    await recipes.Favorite.countDocuments({
      userId: b.actor.user._id,
      recipeId: r._id,
    }),
  ).toBe(1);
  for (const res of results)
    validates(spec.components.schemas.FavoriteStateDTO, res.body.data);
  const old = await recipes.Favorite.findOne({ recipeId: r._id });
  expect((await put(r)).status).toBe(200);
  expect(
    (await recipes.Favorite.findOne({ recipeId: r._id })).createdAt,
  ).toEqual(old.createdAt);
  await expect(
    recipes.Favorite.create({ userId: b.actor.user._id, recipeId: r._id }),
  ).rejects.toMatchObject({ code: 11000 });
});
it('FAV-05..08 guest/session/CSRF/params/body/query guards', async () => {
  const r = await published(),
    guest = request.agent(app),
    token = (await guest.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect((await guest.get('/api/v1/me/favorites')).status).toBe(401);
  expect(
    (
      await guest
        .put(`/api/v1/me/favorites/${r._id}`)
        .set('X-CSRF-Token', token)
    ).status,
  ).toBe(401);
  for (const method of ['put', 'delete']) {
    expect(
      (await b.client[method](`/api/v1/me/favorites/${r._id}`)).status,
    ).toBe(403);
    expect(
      (
        await b.client[method](`/api/v1/me/favorites/${r._id}`).set(
          'X-CSRF-Token',
          'wrong',
        )
      ).status,
    ).toBe(403);
  }
  expect(
    (
      await b.client
        .put('/api/v1/me/favorites/bad')
        .set('X-CSRF-Token', b.token)
    ).status,
  ).toBe(400);
  expect((await put(r).send({ userId: String(a.actor.user._id) })).status).toBe(
    422,
  );
  expect(
    (await put(r).query({ userId: String(a.actor.user._id) })).status,
  ).toBe(400);
  expect((await list(b, { userId: String(a.actor.user._id) })).status).toBe(
    400,
  );
  await identity.models.User.updateOne(
    { _id: b.actor.user._id },
    { status: 'suspended' },
  );
  expect((await put(r)).status).toBe(401);
  expect((await list()).status).toBe(401);
});
it('FAV-13/16..20/25 owner isolation; delete absent twice; no Recipe/Media writes', async () => {
  const r = await published();
  await put(r);
  await put(r, a);
  expect(found(await list())).toEqual([String(r._id)]);
  validates(
    spec.paths['/api/v1/me/favorites'].get.responses[200].content[
      'application/json'
    ].schema,
    (await list()).body,
  );
  const before = await recipes.Recipe.findById(r._id).lean(),
    mediaCount = await media.MediaAsset.countDocuments({
      ownerId: a.actor.user._id,
    });
  expect((await remove(r)).status).toBe(204);
  expect((await remove(r)).text).toBe('');
  expect((await list()).body.meta.total).toBe(0);
  expect(found(await list(a))).toEqual([String(r._id)]);
  expect(await recipes.Recipe.findById(r._id).lean()).toEqual(before);
  expect(
    await media.MediaAsset.countDocuments({ ownerId: a.actor.user._id }),
  ).toBe(mediaCount);
});
it('FAV-21/22 full publish/search/favorite/unpublish/revoke/republish retention cycle', async () => {
  let r = await published();
  await put(r);
  r = await recipes.publication.unpublish(a.actor, r._id, {
    version: r.version,
  });
  expect((await search()).body.meta.total).toBe(0);
  expect((await list()).body.meta.total).toBe(0);
  expect((await request(app).get(`/api/v1/recipes/${r.slug}`)).status).toBe(
    404,
  );
  r = await recipes.publication.publish(a.actor, r._id, { version: r.version });
  expect(found(await search())).toEqual([String(r._id)]);
  expect(found(await list())).toEqual([String(r._id)]);
});
it('FAV-24 deterministic unpublish between eligibility and upsert never grants private access', async () => {
  let r = await published();
  const original = recipes.Favorite.updateOne.bind(recipes.Favorite);
  vi.spyOn(recipes.Favorite, 'updateOne').mockImplementationOnce(
    async (...args) => {
      r = await recipes.publication.unpublish(a.actor, r._id, {
        version: r.version,
      });
      return original(...args);
    },
  );
  expect((await put(r)).status).toBe(201);
  expect(await recipes.Favorite.countDocuments({ recipeId: r._id })).toBe(1);
  expect((await list()).body.meta.total).toBe(0);
  expect((await search()).body.meta.total).toBe(0);
  expect((await request(app).get(`/api/v1/recipes/${r.slug}`)).status).toBe(
    404,
  );
});
it('FAV-24 unknown successful PUT outcome sanitized, retry converges to one relation', async () => {
  const r = await published(),
    original = recipes.Favorite.updateOne.bind(recipes.Favorite);
  vi.spyOn(recipes.Favorite, 'updateOne').mockImplementationOnce(
    async (...args) => {
      await original(...args);
      throw new Error('secret-provider-canary');
    },
  );
  const first = await put(r);
  expect(first.status).toBe(500);
  expect(first.text).not.toContain('secret-provider-canary');
  expect((await put(r)).status).toBe(200);
  expect(await recipes.Favorite.countDocuments({ recipeId: r._id })).toBe(1);
});
it('SRCH-39 bounded DB timeout sanitized without bypassing private scope', async () => {
  vi.spyOn(recipes.Recipe, 'aggregate').mockReturnValueOnce({
    option: async () => {
      throw Object.assign(new Error('secret-query'), { code: 50 });
    },
  });
  const res = await search();
  expect(res.status).toBe(503);
  expect(res.body.error.code).toBe('QUERY_TIMEOUT');
  expect(res.text).not.toContain('secret-query');
});
it('SRCH-39 process-local search limiter leaves health available', async () => {
  const limited = {
    ...recipes,
    router: recipeRoutes(
      createRecipeController(
        recipes.service,
        recipes.publication,
        recipes.images,
      ),
      (_q, _s, n) => n(),
      undefined,
      identity.security.limit(1),
    ),
  };
  const server = createApp({
    identity,
    catalog,
    media,
    recipes: limited,
    config,
    logger,
    isReady: db.isReady,
  });
  expect((await request(server).get('/api/v1/recipes')).status).toBe(200);
  expect((await request(server).get('/api/v1/recipes')).status).toBe(429);
  expect((await request(server).get('/health/live')).status).toBe(200);
});
it('SRCH-37 legacy backfill dry-run/apply/CAS, immutable business state and idempotency', async () => {
  const r = await published();
  await recipes.Recipe.collection.updateOne(
    { _id: r._id },
    { $unset: { searchTokens: '', searchVersion: '' } },
  );
  const before = await recipes.Recipe.findById(r._id).lean();
  expect(
    (await backfillRecipeSearch(recipes.Recipe, { limit: 500 })).updated,
  ).toBe(0);
  expect((await search({ q: 'thit' })).body.meta.total).toBe(0);
  await backfillRecipeSearch(recipes.Recipe, { apply: true, limit: 500 });
  expect(found(await search({ q: 'thit' }))).toEqual([String(r._id)]);
  expect(await recipes.Recipe.findById(r._id).lean()).toEqual(before);
  expect(
    (await backfillRecipeSearch(recipes.Recipe, { apply: true, limit: 500 }))
      .updated,
  ).toBe(0);
});
it('SRCH-37 backfill concurrent edit does not write stale tokens', async () => {
  const r = await published();
  await recipes.Recipe.collection.updateOne(
    { _id: r._id },
    { $unset: { searchTokens: '', searchVersion: '' } },
  );
  const original = recipes.Recipe.updateOne.bind(recipes.Recipe);
  vi.spyOn(recipes.Recipe, 'updateOne').mockImplementationOnce(
    async (...args) => {
      await original(
        { _id: r._id },
        { $set: { title: 'New title' }, $inc: { version: 1 } },
      );
      return original(...args);
    },
  );
  const result = await backfillRecipeSearch(recipes.Recipe, {
    apply: true,
    limit: 500,
  });
  expect(result.conflicts).toBeGreaterThanOrEqual(1);
  const row = await recipes.Recipe.findById(r._id).select('+searchTokens');
  expect(row.searchTokens).toBeUndefined();
});
it('SRCH-02 search derives new tokens after unpublish/edit/republish, client cannot assign tokens', async () => {
  let r = await published();
  r = await recipes.publication.unpublish(a.actor, r._id, {
    version: r.version,
  });
  r = await recipes.service.update(a.actor, r._id, {
    version: r.version,
    title: 'Bánh mì',
    description: 'Đặc sản Việt Nam',
  });
  r = await recipes.publication.publish(a.actor, r._id, { version: r.version });
  expect((await search({ q: 'thit' })).body.meta.total).toBe(0);
  expect(found(await search({ q: 'banh mi' }))).toEqual([String(r._id)]);
  const res = await a.client
    .patch(`/api/v1/recipes/${r._id}`)
    .set('X-CSRF-Token', a.token)
    .send({ version: r.version, searchTokens: ['hack'] });
  expect(res.status).toBe(422);
});
it('SRCH-37..40 executionStats on 5000 recipes, bounded indexed pipelines and no application N+1', async () => {
  const timestamp = new Date('2025-01-01'),
    seed = randomUUID();
  const rows = Array.from({ length: 5000 }, (_, i) => ({
    ...content({
      categoryId: i % 5 === 0 ? category._id : otherCategory._id,
      title: i % 100 === 0 ? 'Cá kho tiêu' : 'Canh rau xanh',
      tags: ['bữa tối'],
    }),
    ingredients: i % 100 === 0 ? content().ingredients : [],
    steps: [],
    authorId: a.actor.user._id,
    status: i % 10 === 1 ? 'draft' : 'published',
    moderationStatus: 'normal',
    publishedAt: timestamp,
    creationKey: `${seed}-${i}`,
    creationFingerprint: 'fixture',
    slug: `${seed}-${i}`,
    totalMinutes: 30,
  }));
  await recipes.Recipe.insertMany(rows);
  const evidence = [];
  for (const [label, raw] of [
    ['q', { q: 'ca tieu' }],
    ['category', { category: String(category._id) }],
    ['ingredients', { ingredientIds: String(ingredients[0]._id) }],
    [
      'combined',
      {
        q: 'ca',
        category: String(category._id),
        ingredientIds: ingredients
          .map((v) => String(v._id))
          .slice(0, 2)
          .join(','),
        ingredientMatch: 'all',
        tag: 'bữa tối',
        maxMinutes: 30,
      },
    ],
  ]) {
    const query = searchQuery.parse(raw),
      pipeline = searchPipeline(identity.models.User, query);
    const plan = await recipes.Recipe.aggregate(pipeline)
      .option({ maxTimeMS: 3000, allowDiskUse: false })
      .explain('executionStats');
    const cursor = plan.stages?.find((v) => v.$cursor)?.$cursor ?? plan;
    const winning = JSON.stringify(cursor.queryPlanner.winningPlan);
    expect(winning).toContain('IXSCAN');
    expect(winning).not.toContain('COLLSCAN');
    const times = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await recipes.publication.list(raw);
      times.push(performance.now() - start);
    }
    evidence.push({
      label,
      indexes: [...winning.matchAll(/"indexName":"([^"]+)"/g)].map((v) => v[1]),
      docsExamined: cursor.executionStats.totalDocsExamined,
      keysExamined: cursor.executionStats.totalKeysExamined,
      executionTimeMillis: cursor.executionStats.executionTimeMillis,
      localP95Ms: Math.ceil(times.sort((x, y) => x - y).at(-1)),
    });
  }
  const visible = await recipes.Recipe.find({
    authorId: a.actor.user._id,
    status: 'published',
  }).limit(100);
  await recipes.Favorite.insertMany(
    visible.map((r) => ({
      userId: b.actor.user._id,
      recipeId: r._id,
      createdAt: timestamp,
    })),
  );
  const favoritePlan = await recipes.Favorite.aggregate(
    favoritePipeline(
      { Recipe: recipes.Recipe, User: identity.models.User },
      b.actor.user._id,
      { page: 1, limit: 20 },
    ),
  )
    .option({ maxTimeMS: 3000 })
    .explain('executionStats');
  expect(JSON.stringify(favoritePlan)).toContain(
    'userId_1_createdAt_-1__id_-1',
  );
  const aggregate = vi.spyOn(recipes.Recipe, 'aggregate');
  const result = await recipes.publication.list({ q: 'ca tieu' });
  expect(result.meta.total).toBe(50);
  expect(aggregate).toHaveBeenCalledTimes(1);
  const favoriteAggregate = vi.spyOn(recipes.Favorite, 'aggregate');
  await recipes.favorites.list(b.actor, {});
  expect(favoriteAggregate).toHaveBeenCalledTimes(1);
  const indexes = await recipes.Favorite.collection.indexes();
  expect(indexes.find((v) => v.name === 'userId_1_recipeId_1').unique).toBe(
    true,
  );
  writeFileSync(
    '/tmp/be12-performance.json',
    JSON.stringify(
      {
        dataset: 5000,
        measurements: evidence,
        favorites: 100,
        queryMaxTimeMS: 3000,
      },
      null,
      2,
    ),
  );
  console.log(
    'BE12_PERFORMANCE',
    JSON.stringify({
      dataset: 5000,
      measurements: evidence,
      favorites: 100,
      queryMaxTimeMS: 3000,
    }),
  );
}, 30000);
it.each(['hidden', 'deleted', 'suspended'])(
  'FAV-22/23 retained relation reappears after %s state is restored',
  async (state) => {
    const r = await published();
    await put(r);
    if (state === 'suspended')
      await identity.models.User.updateOne(
        { _id: a.actor.user._id },
        { status: 'suspended' },
      );
    else
      await recipes.Recipe.updateOne(
        { _id: r._id },
        state === 'hidden'
          ? { moderationStatus: 'hidden' }
          : { deletedAt: new Date() },
      );
    expect((await list()).body.meta.total).toBe(0);
    expect((await search()).body.meta.total).toBe(0);
    await identity.models.User.updateOne(
      { _id: a.actor.user._id },
      { status: 'active' },
    );
    await recipes.Recipe.updateOne(
      { _id: r._id },
      { moderationStatus: 'normal', deletedAt: null },
    );
    expect(found(await list())).toEqual([String(r._id)]);
    expect(found(await search())).toEqual([String(r._id)]);
    expect((await request(app).get(`/api/v1/recipes/${r.slug}`)).status).toBe(
      200,
    );
  },
);
it('FAV-05/25 invalid session and bounded favorite read errors preserve error contract', async () => {
  expect(
    (
      await request(app)
        .get('/api/v1/me/favorites')
        .set('Cookie', 'recipe-hub-session=invalid')
    ).status,
  ).toBe(401);
  vi.spyOn(recipes.Favorite, 'aggregate').mockReturnValueOnce({
    option: async () => {
      throw Object.assign(new Error('private-query-canary'), { code: 50 });
    },
  });
  const res = await list();
  expect(res.status).toBe(503);
  expect(res.body.error.code).toBe('QUERY_TIMEOUT');
  expect(res.text).not.toContain('private-query-canary');
});
