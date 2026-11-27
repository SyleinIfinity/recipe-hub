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
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/config/logger.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createCatalog } from '../../src/modules/catalog.js';
import { createMedia } from '../../src/modules/media/index.js';
import { createRecipes } from '../../src/modules/recipes/index.js';
import { createRecipeService } from '../../src/modules/recipes/recipe.service.js';
import { createRecipeReferences } from '../../src/modules/recipes/recipe-reference.js';
import { createMediaLifecycle } from '../../src/modules/media/media-lifecycle.service.js';
import { createMediaCleanup } from '../../src/modules/media/media-cleanup.js';
import { createImageStorage } from '../../src/integrations/image-storage/index.js';
import { createApp } from '../../src/app.js';
import { loadSpec } from '../../src/openapi/docs.js';
import { schemaValidator } from '../../../scripts/openapi-contract.js';
const config = parseEnv({
  NODE_ENV: 'test',
  SMTP_ENABLED: 'false',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
  MEDIA_UPLOAD_RATE_LIMIT: 1000,
  IMAGE_STORAGE_TIMEOUT_MS: 100,
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  prefix = `recipe-${randomUUID()}`,
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
  client,
  other,
  token,
  otherToken,
  png,
  storage,
  category,
  ingredient,
  clock;
const raw = () => ({ buffer: png, mime: 'image/png' });
const upload = (purpose = 'recipe_cover', owner = a) =>
  media.service.uploadImage(owner, raw(), purpose, randomUUID());
const create = (body = {}, key = randomUUID()) =>
  recipes.service.create(a, body, key);
const post = (body = {}, key = randomUUID()) =>
  client
    .post('/api/v1/recipes')
    .set('X-CSRF-Token', token)
    .set('Idempotency-Key', key)
    .send(body);
const patch = (r, body) =>
  client
    .patch(`/api/v1/recipes/${r._id || r.recipeId}`)
    .set('X-CSRF-Token', token)
    .send(body);
function worker(
  references = createRecipeReferences({
    Recipe: recipes.Recipe,
    User: identity.models.User,
  }),
  adapter = storage,
) {
  const lifecycle = createMediaLifecycle({
    MediaAsset: media.MediaAsset,
    service: media.service,
    references,
    config,
    now: () => new Date(clock),
  });
  return createMediaCleanup({
    MediaAsset: media.MediaAsset,
    storage: adapter,
    service: media.service,
    lifecycle,
    references,
    config,
    logger,
    now: () => new Date(clock),
  });
}
async function login(label) {
  const c = request.agent(app),
    email = `${prefix}-${label}@example.test`,
    password = 'Recipe integration phrase!';
  let t = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  const reg = await c
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', t)
    .send({ email, password, displayName: 'Recipe Owner' });
  expect(reg.status).toBe(201);
  ids.push(reg.body.data.id);
  t = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await c
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', t)
        .send({ email, password })
    ).status,
  ).toBe(200);
  return {
    client: c,
    actor: {
      user: await identity.models.User.findById(reg.body.data.id).select(
        '+authVersion',
      ),
    },
    token: (await c.get('/api/v1/auth/csrf')).body.data.csrfToken,
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
  storage = await createImageStorage(config);
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
    identity,
    catalog,
    media,
    recipes,
    config,
    logger,
    isReady: db.isReady,
  });
  const aa = await login('a'),
    bb = await login('b');
  a = aa.actor;
  b = bb.actor;
  client = aa.client;
  other = bb.client;
  token = aa.token;
  otherToken = bb.token;
  png = await sharp({
    create: { width: 16, height: 12, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer();
  category = await catalog.models.Category.create({
    name: 'Recipe category',
    slug: prefix,
  });
  ingredient = await catalog.models.Ingredient.create({
    name: prefix,
    defaultUnit: 'g',
  });
});
beforeEach(async () => {
  clock = Date.now();
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { status: 'active' },
  );
  await catalog.models.Category.updateOne(
    { _id: category._id },
    { isActive: true },
  );
  await catalog.models.Ingredient.updateOne(
    { _id: ingredient._id },
    { isActive: true },
  );
});
afterEach(async () => {
  await recipes.Recipe.deleteMany({ authorId: { $in: ids } });
  await media.MediaAsset.deleteMany({ ownerId: { $in: ids } });
});
afterAll(async () => {
  expect(https.request).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  await catalog.models.Category.deleteOne({ _id: category._id });
  await catalog.models.Ingredient.deleteOne({ _id: ingredient._id });
  await identity.models.Session.deleteMany({ userId: { $in: ids } });
  await identity.models.User.deleteMany({ _id: { $in: ids } });
  await db.close();
});
it('RCP-01/02 empty draft and title create in Mongo with defaults, strict DTO and no __v', async () => {
  const r = await post();
  expect(r.status).toBe(201);
  expect(r.body.data).toMatchObject({
    title: '',
    status: 'draft',
    version: 0,
    coverImageUrl: null,
    ingredients: [],
    steps: [],
  });
  validates(spec.components.schemas.OwnerRecipeDTO, r.body.data);
  const row = await recipes.Recipe.findById(r.body.data.recipeId);
  expect(String(row.authorId)).toBe(String(a.user._id));
  expect(row.publishedAt).toBeNull();
  expect(row.__v).toBeUndefined();
  expect(row.slug).toBeNull();
  expect((await post({ title: 'Phở bò' })).body.data.title).toBe('Phở bò');
});
it('RCP-03/10 full draft with cover and multiple step images commits one canonical snapshot', async () => {
  const cover = await upload(),
    first = await upload('recipe_step'),
    second = await upload('recipe_step');
  const response = await post({
    title: 'Canh rau',
    description: 'Bữa tối',
    categoryId: String(category._id),
    difficulty: 'easy',
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    tags: ['VIỆT'],
    coverImageAssetId: String(cover._id),
    ingredients: [
      {
        ingredientId: String(ingredient._id),
        name: 'Tên snapshot',
        quantity: 0.5,
        unit: 'kg',
        order: 1,
      },
    ],
    steps: [
      { order: 1, instruction: 'Rửa rau', imageAssetId: String(first._id) },
      { order: 2, instruction: 'Nấu', imageAssetId: String(second._id) },
    ],
  });
  expect(response.status).toBe(201);
  expect(response.body.data.totalMinutes).toBe(30);
  expect(response.body.data.version).toBe(1);
  validates(spec.components.schemas.OwnerRecipeDTO, response.body.data);
  const rows = await media.MediaAsset.find({ ownerId: a.user._id });
  expect(rows.every((v) => v.status === 'attached')).toBe(true);
  expect(
    rows
      .filter((v) => v.purpose === 'recipe_step')
      .map((v) => v.attachedTo.stepId)
      .sort(),
  ).toEqual(response.body.data.steps.map((v) => v.stepId).sort());
});
it('RCP-04/05/06 guest, suspended and missing/wrong CSRF rejected', async () => {
  const guest = request.agent(app),
    t = (await guest.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await guest
        .post('/api/v1/recipes')
        .set('X-CSRF-Token', t)
        .set('Idempotency-Key', randomUUID())
        .send({})
    ).status,
  ).toBe(401);
  for (const bad of ['', 'bad'])
    expect(
      (
        await client
          .post('/api/v1/recipes')
          .set('X-CSRF-Token', bad)
          .set('Idempotency-Key', randomUUID())
          .send({})
      ).status,
    ).toBe(403);
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { status: 'suspended' },
  );
  expect((await post()).status).toBe(401);
});
it.each([
  { authorId: 'a'.repeat(24) },
  { status: 'published' },
  { moderationStatus: 'hidden' },
  { publishedAt: null },
  { deletedAt: null },
  { creationMedia: [] },
  { $set: { title: 'bad' } },
  JSON.parse('{"__proto__":{"admin":true}}'),
])('RCP-07/08/17 protected payload %j denied', async (body) => {
  expect((await post(body)).status).toBe(422);
});
it('RCP-09 category missing/nonexistent and invalid ObjectId rejected without seed recipe', async () => {
  expect((await post({ categoryId: 'invalid' })).status).toBe(422);
  expect((await post({ categoryId: 'f'.repeat(24) })).status).toBe(422);
  expect(await recipes.Recipe.countDocuments({ authorId: a.user._id })).toBe(0);
});
it('RCP-21..28 owner list/detail, admin B isolation, deleted hidden, stable pagination', async () => {
  const rows = [
    await create({ title: 'One' }),
    await create({ title: 'Two' }),
    await create({ title: 'Three' }),
  ];
  await identity.models.User.updateOne({ _id: b.user._id }, { role: 'admin' });
  expect((await other.get(`/api/v1/me/recipes/${rows[0]._id}`)).status).toBe(
    404,
  );
  expect(
    (await request(app).get(`/api/v1/me/recipes/${rows[0]._id}`)).status,
  ).toBe(401);
  await recipes.Recipe.collection.updateMany(
    { authorId: a.user._id },
    { $set: { updatedAt: new Date('2026-01-01') } },
  );
  const page1 = await client.get('/api/v1/me/recipes?limit=2'),
    page2 = await client.get('/api/v1/me/recipes?limit=2&page=2');
  expect(page1.body.meta.total).toBe(3);
  expect(
    [...page1.body.data, ...page2.body.data].map((v) => v.recipeId),
  ).toEqual(
    rows
      .map((v) => String(v._id))
      .sort()
      .reverse(),
  );
  expect((await other.get('/api/v1/me/recipes')).body.meta.total).toBe(0);
  expect((await client.get('/api/v1/me/recipes?authorId=spoof')).status).toBe(
    400,
  );
  expect(
    (await client.get(`/api/v1/me/recipes/${rows[0]._id}`)).headers[
      'cache-control'
    ],
  ).toBe('no-store');
});
it('RCP-29/30/31 partial scalar edit preserves arrays and full array replacement retains supplied ingredients', async () => {
  let r = await create({
    title: 'Draft',
    ingredients: [
      { name: 'Muối', order: 2 },
      { name: 'Gạo', order: 1 },
    ],
    steps: [{ order: 1, instruction: 'Nấu cơm' }],
  });
  r = await recipes.service.update(a, r._id, {
    version: r.version,
    title: 'Edited',
  });
  expect(r.ingredients.map((v) => v.name)).toEqual(['Gạo', 'Muối']);
  expect(r.steps[0].instruction).toBe('Nấu cơm');
  r = await recipes.service.update(a, r._id, {
    version: r.version,
    ingredients: [
      { name: 'Gạo', quantity: 2, order: 1 },
      { name: 'Muối', order: 2 },
    ],
  });
  expect(r.ingredients).toHaveLength(2);
  expect(r.ingredients[0].quantity).toBe(2);
});
it('RCP-32/33/40/47 stable step reorder preserves image and removing a step releases only its own asset', async () => {
  const one = await upload('recipe_step'),
    two = await upload('recipe_step');
  let r = await create({
    steps: [
      { order: 1, imageAssetId: String(one._id) },
      { order: 2, imageAssetId: String(two._id) },
    ],
  });
  const [first, second] = r.steps;
  r = await recipes.service.update(a, r._id, {
    version: r.version,
    steps: [
      { stepId: second.stepId, order: 1 },
      { stepId: first.stepId, order: 2 },
    ],
  });
  expect(r.steps.map((v) => String(v.imageAssetId))).toEqual([
    String(two._id),
    String(one._id),
  ]);
  r = await recipes.service.update(a, r._id, {
    version: r.version,
    steps: [{ stepId: first.stepId, order: 1 }],
  });
  expect(r.steps[0].stepId).toBe(first.stepId);
  expect((await media.MediaAsset.findById(two._id)).status).toBe('temporary');
  expect((await media.MediaAsset.findById(one._id)).status).toBe('attached');
});
it('RCP-34/35/36 same version concurrent edits have exactly one winner', async () => {
  const r = await create();
  const results = await Promise.all([
    patch(r, { version: 0, title: 'Client A' }),
    patch(r, { version: 0, title: 'Client B' }),
  ]);
  expect(results.map((v) => v.status).sort()).toEqual([200, 409]);
  expect((await recipes.Recipe.findById(r._id)).version).toBe(1);
  expect((await patch(r, { title: 'No version' })).status).toBe(422);
});
it('RCP-37/38 foreign recipe cannot update/delete and invalid ID cannot query', async () => {
  const r = await create();
  expect(
    (
      await other
        .patch(`/api/v1/recipes/${r._id}`)
        .set('X-CSRF-Token', otherToken)
        .send({ version: 0, title: 'stolen' })
    ).status,
  ).toBe(404);
  expect(
    (
      await other
        .delete(`/api/v1/recipes/${r._id}`)
        .set('X-CSRF-Token', otherToken)
    ).status,
  ).toBe(404);
  expect((await client.get('/api/v1/me/recipes/not-id')).status).toBe(400);
});
it.each(['foreign', 'purpose', 'expired', 'pending'])(
  'RCP-41..44 bad media %s cannot attach',
  async (kind) => {
    const asset = await upload(
      kind === 'purpose' ? 'avatar' : 'recipe_cover',
      kind === 'foreign' ? b : a,
    );
    if (kind === 'expired')
      await media.MediaAsset.updateOne(
        { _id: asset._id },
        { expiresAt: new Date(0) },
      );
    if (kind === 'pending') await media.lifecycle.requestDeletion(a, asset._id);
    const result = await post({ coverImageAssetId: String(asset._id) });
    expect(result.status).toBe(
      kind === 'foreign' ? 404 : kind === 'pending' ? 409 : 422,
    );
    expect(await recipes.Recipe.countDocuments({ authorId: a.user._id })).toBe(
      0,
    );
  },
);
it('RCP-39/44/45 cover replacement releases old only after CAS and refuses reuse', async () => {
  const old = await upload(),
    next = await upload();
  let r = await create({ coverImageAssetId: String(old._id) });
  expect((await post({ coverImageAssetId: String(old._id) })).status).toBe(409);
  const stale = await patch(r, {
    version: 0,
    coverImageAssetId: String(next._id),
  });
  expect(stale.status).toBe(409);
  expect((await media.MediaAsset.findById(old._id)).status).toBe('attached');
  r = await recipes.service.update(a, r._id, {
    version: r.version,
    coverImageAssetId: String(next._id),
  });
  expect(String(r.coverImageAssetId)).toBe(String(next._id));
  expect((await media.MediaAsset.findById(old._id)).status).toBe('temporary');
});
it('RCP-46 multiple new media references are all-or-nothing under concurrent edits', async () => {
  const r = await create({ steps: [{ order: 1 }] }),
    coverA = await upload(),
    stepA = await upload('recipe_step'),
    coverB = await upload(),
    stepB = await upload('recipe_step');
  const choices = [
    [coverA, stepA],
    [coverB, stepB],
  ];
  const results = await Promise.all(
    choices.map(([cover, step]) =>
      patch(r, {
        version: 0,
        coverImageAssetId: String(cover._id),
        steps: [
          {
            stepId: r.steps[0].stepId,
            order: 1,
            imageAssetId: String(step._id),
          },
        ],
      }),
    ),
  );
  expect(results.map((v) => v.status).sort()).toEqual([200, 409]);
  const final = await recipes.Recipe.findById(r._id);
  const winner = choices.find(
    ([cover]) => String(cover._id) === String(final.coverImageAssetId),
  );
  expect(String(final.steps[0].imageAssetId)).toBe(String(winner[1]._id));
});
it('RCP-48/51 committed Recipe and failed media finalize recover without duplicate creation', async () => {
  const cover = await upload(),
    step = await upload('recipe_step'),
    key = randomUUID(),
    body = {
      title: 'Recover',
      coverImageAssetId: String(cover._id),
      steps: [{ order: 1, imageAssetId: String(step._id) }],
    };
  const original = media.MediaAsset.findOneAndUpdate.bind(media.MediaAsset);
  const spy = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockImplementation((f, u, o) => {
      if (u.$set?.status === 'attached') throw new Error('Mongo finalize fail');
      return original(f, u, o);
    });
  try {
    expect((await post(body, key)).status).toBe(503);
  } finally {
    spy.mockRestore();
  }
  const row = await recipes.Recipe.findOne({ authorId: a.user._id });
  expect(String(row.coverImageAssetId)).toBe(String(cover._id));
  clock += 3600001;
  await worker().runOnce();
  expect((await post(body, key)).status).toBe(201);
  expect(await recipes.Recipe.countDocuments({ authorId: a.user._id })).toBe(1);
  expect((await media.MediaAsset.findById(step._id)).status).toBe('attached');
});
it('RCP-49/53..60 soft delete keeps references, worker protects and internal restore preserves images', async () => {
  const cover = await upload(),
    step = await upload('recipe_step');
  const r = await create({
    coverImageAssetId: String(cover._id),
    steps: [{ order: 1, imageAssetId: String(step._id) }],
  });
  for (let i = 0; i < 2; i++) {
    const res = await client
      .delete(`/api/v1/recipes/${r._id}`)
      .set('X-CSRF-Token', token);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  }
  expect((await client.get(`/api/v1/me/recipes/${r._id}`)).status).toBe(404);
  expect((await client.get('/api/v1/me/recipes')).body.data).toHaveLength(0);
  clock += 31 * 86400000;
  await worker().runOnce();
  expect((await media.MediaAsset.findById(cover._id)).status).toBe('attached');
  expect((await media.MediaAsset.findById(step._id)).quotaSlot).toBeDefined();
  const deleted = await recipes.Recipe.findById(r._id);
  const late = createRecipeService({
    Recipe: recipes.Recipe,
    ...catalog.models,
    media,
    now: () => new Date(clock),
  });
  await expect(late.restore(a, r._id, deleted.version)).rejects.toMatchObject({
    status: 409,
  });
  const restored = await recipes.service.restore(a, r._id, deleted.version);
  expect(restored.deletedAt).toBeNull();
  expect(String(restored.coverImageAssetId)).toBe(String(cover._id));
});
it('RCP-61..65 catalog rename/inactive does not rewrite snapshots; newly selected inactive rejected', async () => {
  let r = await create({
    categoryId: String(category._id),
    ingredients: [
      {
        ingredientId: String(ingredient._id),
        name: 'Snapshot ban đầu',
        order: 1,
      },
      { name: 'Tự nhập', order: 2 },
    ],
  });
  await catalog.models.Ingredient.updateOne(
    { _id: ingredient._id },
    { name: 'Catalog renamed', isActive: false },
  );
  await catalog.models.Category.updateOne(
    { _id: category._id },
    { isActive: false },
  );
  r = await recipes.service.update(a, r._id, {
    version: r.version,
    categoryId: String(category._id),
    ingredients: [
      {
        ingredientId: String(ingredient._id),
        name: 'Snapshot ban đầu',
        order: 1,
      },
      { name: 'Tự nhập', quantity: 2, order: 2 },
    ],
  });
  expect(r.ingredients[0].name).toBe('Snapshot ban đầu');
  expect((await post({ categoryId: String(category._id) })).status).toBe(422);
  expect(
    (
      await post({
        ingredients: [
          {
            ingredientId: String(ingredient._id),
            name: 'New selection',
            order: 1,
          },
        ],
      })
    ).status,
  ).toBe(422);
});
it('RCP-75 idempotent concurrent create and payload conflict keep a single recipe', async () => {
  const key = randomUUID();
  const results = await Promise.all([
    post({ title: 'Same' }, key),
    post({ title: 'Same' }, key),
  ]);
  expect(results.every((v) => v.status === 201)).toBe(true);
  expect(results[0].body.data.recipeId).toBe(results[1].body.data.recipeId);
  expect((await post({ title: 'Different' }, key)).status).toBe(409);
  expect(await recipes.Recipe.countDocuments({ authorId: a.user._id })).toBe(1);
});
it('RCP-74 oversized JSON and unknown internal fields have sanitized error responses', async () => {
  const res = await post({ description: 'x'.repeat(110000) });
  expect(res.status).toBe(413);
  expect(JSON.stringify(res.body)).not.toMatch(
    /creationFingerprint|passwordHash|cloudinary/,
  );
  expect(
    (await client.post('/api/v1/recipes').set('X-CSRF-Token', token).send({}))
      .status,
  ).toBe(400);
});
it('RCP-50 real Recipe fencing stops a writer paused before canonical CAS', async () => {
  const r = await create(),
    asset = await upload();
  let resume, entered;
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockImplementation(async (f, u, o) => {
      if (u.$set?.coverImageAssetId) {
        entered();
        await new Promise((resolve) => {
          resume = resolve;
        });
      }
      return original(f, u, o);
    });
  const pending = recipes.service
    .update(a, r._id, {
      version: r.version,
      coverImageAssetId: String(asset._id),
    })
    .catch((e) => e);
  try {
    await ready;
    clock += 3600001;
    await worker().runOnce();
    resume();
    expect((await pending).code).toBe('VERSION_CONFLICT');
  } finally {
    spy.mockRestore();
    resume?.();
  }
  const row = await recipes.Recipe.findById(r._id);
  expect(row.coverImageAssetId).toBeNull();
  expect(row.version).toBe(1);
  expect((await media.MediaAsset.findById(asset._id)).status).toBe('temporary');
});
it('RCP-48/51 create interrupted before canonical CAS reuses durable seed and stable step IDs', async () => {
  const cover = await upload(),
    step = await upload('recipe_step'),
    key = randomUUID(),
    body = {
      coverImageAssetId: String(cover._id),
      steps: [{ order: 1, imageAssetId: String(step._id) }],
    };
  const original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockImplementation((f, u, o) => {
      if (u.$set?.creationState === 'complete')
        throw new Error('DB offline before commit');
      return original(f, u, o);
    });
  try {
    expect((await post(body, key)).status).toBe(503);
  } finally {
    spy.mockRestore();
  }
  const seed = await recipes.Recipe.findOne({ authorId: a.user._id });
  expect(seed.creationState).toBe('pending');
  expect((await client.get('/api/v1/me/recipes')).body.data).toHaveLength(0);
  clock += 3600001;
  await worker().runOnce();
  const retry = await post(body, key);
  expect(retry.status).toBe(201);
  expect(retry.body.data.recipeId).toBe(String(seed._id));
  expect(retry.body.data.steps[0].stepId).toBe(seed.steps[0].stepId);
  expect(await recipes.Recipe.countDocuments({ authorId: a.user._id })).toBe(1);
});
it('RCP-48 create canonical commit response lost replays without duplicate', async () => {
  const cover = await upload(),
    key = randomUUID(),
    body = { coverImageAssetId: String(cover._id) };
  const original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockImplementation(async (f, u, o) => {
      const result = await original(f, u, o);
      if (u.$set?.creationState === 'complete')
        throw new Error('Commit response lost');
      return result;
    });
  try {
    expect((await post(body, key)).status).toBe(503);
  } finally {
    spy.mockRestore();
  }
  const retry = await post(body, key);
  expect(retry.status).toBe(201);
  expect(await recipes.Recipe.countDocuments({ authorId: a.user._id })).toBe(1);
  expect((await media.MediaAsset.findById(cover._id)).status).toBe('attached');
});
it('RCP-48 multiple references partly finalized recover the remaining intent safely', async () => {
  const cover = await upload(),
    step = await upload('recipe_step');
  const r = await create({ steps: [{ order: 1 }] });
  const original = media.MediaAsset.findOneAndUpdate.bind(media.MediaAsset);
  let count = 0;
  const spy = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockImplementation((f, u, o) => {
      if (u.$set?.status === 'attached' && ++count === 2)
        throw new Error('Second finalize failed');
      return original(f, u, o);
    });
  try {
    expect(
      (
        await patch(r, {
          version: 0,
          coverImageAssetId: String(cover._id),
          steps: [
            {
              stepId: r.steps[0].stepId,
              order: 1,
              imageAssetId: String(step._id),
            },
          ],
        })
      ).status,
    ).toBe(503);
  } finally {
    spy.mockRestore();
  }
  expect((await media.MediaAsset.findById(cover._id)).status).toBe('attached');
  expect(
    (await media.MediaAsset.findById(step._id)).attachmentIntent,
  ).toBeTruthy();
  clock += 3600001;
  await worker().runOnce();
  expect((await media.MediaAsset.findById(step._id)).status).toBe('attached');
  expect((await recipes.Recipe.findById(r._id)).version).toBe(1);
});
it('RCP-49 unknown Recipe reference check keeps quota and never destroys', async () => {
  const asset = await upload();
  await media.lifecycle.requestDeletion(a, asset._id);
  const spy = vi
    .spyOn(recipes.Recipe, 'exists')
    .mockRejectedValue(new Error('DB reference read unavailable'));
  const destroy = vi.fn(storage.destroyImage);
  try {
    expect(
      await createRecipeReferences({
        Recipe: recipes.Recipe,
        User: identity.models.User,
      }).isReferenced(asset),
    ).toBeNull();
    await worker(undefined, { ...storage, destroyImage: destroy }).runOnce();
    expect(destroy).not.toHaveBeenCalled();
    expect(
      (await media.MediaAsset.findById(asset._id)).quotaSlot,
    ).toBeDefined();
  } finally {
    spy.mockRestore();
  }
});
it('RCP-44 duplicate asset across steps and nonexistent/stolen stable step IDs are rejected', async () => {
  const step = await upload('recipe_step');
  expect(
    (
      await post({
        steps: [
          { order: 1, imageAssetId: String(step._id) },
          { order: 2, imageAssetId: String(step._id) },
        ],
      })
    ).status,
  ).toBe(422);
  const r = await create();
  expect(
    (
      await patch(r, {
        version: 0,
        steps: [{ stepId: randomUUID(), order: 1 }],
      })
    ).status,
  ).toBe(422);
  expect(
    (await post({ steps: [{ stepId: randomUUID(), order: 1 }] })).status,
  ).toBe(422);
});
it('RCP-60 deleted creation key cannot create a duplicate and no public/restore routes exist', async () => {
  const key = randomUUID(),
    r = await create({}, key);
  await recipes.service.remove(a, r._id);
  expect((await post({}, key)).status).toBe(409);
  expect((await client.get(`/api/v1/recipes/${r._id}`)).status).toBe(404);
  expect(
    (
      await client
        .post(`/api/v1/recipes/${r._id}/restore`)
        .set('X-CSRF-Token', token)
    ).status,
  ).toBe(404);
});
it('RCP-73 schema has one version counter and required unique/index behavior', async () => {
  const rows = [await create(), await create()];
  expect(rows.every((r) => r.slug === null)).toBe(true);
  const indexes = await recipes.Recipe.collection.indexes();
  expect(
    indexes.some(
      (i) => i.key.authorId === 1 && i.key.creationKey === 1 && i.unique,
    ),
  ).toBe(true);
  expect(
    indexes.some(
      (i) => i.key.slug === 1 && i.unique && i.partialFilterExpression,
    ),
  ).toBe(true);
  await recipes.Recipe.updateOne(
    { _id: rows[0]._id },
    { slug: 'draft-index-fixture' },
  );
  await expect(
    recipes.Recipe.updateOne(
      { _id: rows[1]._id },
      { slug: 'draft-index-fixture' },
    ),
  ).rejects.toMatchObject({ code: 11000 });
  expect(db.connection.name).toBe('recipe-hub-test');
});

async function publishFor(owner, title) {
  const draft = await recipes.service.create(
    owner,
    {
      title,
      description: 'Nấu trên lửa nhỏ rồi thưởng thức.',
      categoryId: String(category._id),
      difficulty: 'easy',
      prepMinutes: 5,
      cookMinutes: 20,
      servings: 2,
      ingredients: [{ name: 'Gạo', quantity: 1, unit: 'bát', order: 1 }],
      steps: [{ order: 1, instruction: 'Nấu đến khi gạo chín.' }],
    },
    randomUUID(),
  );
  return recipes.publication.publish(owner, draft._id, {
    version: draft.version,
  });
}

it('owner filters select only completed, non-deleted recipes; moderators retain control of hidden recipes', async () => {
  const draft = await create({ title: 'Bản nháp' });
  const live = await publishFor(a, 'Cơm trắng');
  const hidden = await publishFor(a, 'Cơm gừng');
  const pending = await create({ title: 'Tạo dở' });
  const deleted = await create({ title: 'Đã xóa' });
  await publishFor(b, 'Món của đầu bếp khác');
  await recipes.Recipe.updateOne(
    { _id: hidden._id },
    { moderationStatus: 'hidden' },
  );
  await recipes.Recipe.updateOne(
    { _id: pending._id },
    { creationState: 'pending' },
  );
  await recipes.Recipe.updateOne(
    { _id: deleted._id },
    { deletedAt: new Date() },
  );
  await recipes.Recipe.collection.updateMany(
    { authorId: a.user._id },
    { $set: { updatedAt: new Date('2026-01-01') } },
  );

  const list = (query = {}) => client.get('/api/v1/me/recipes').query(query);
  const ids = (response) => response.body.data.map((row) => row.recipeId);
  expect(ids(await list())).toEqual([String(draft._id)]);
  expect(ids(await list({ status: 'draft' }))).toEqual([String(draft._id)]);
  const published = await list({ status: 'published' });
  expect(published.body.meta.total).toBe(2);
  expect(ids(published)).toEqual([String(hidden._id), String(live._id)]);
  expect(published.body.data[0]).toMatchObject({
    status: 'published',
    moderationStatus: 'hidden',
    publishedAt: hidden.publishedAt.toISOString(),
  });
  const first = await list({ status: 'all', limit: 2 });
  const second = await list({ status: 'all', limit: 2, page: 2 });
  expect(first.body.meta).toEqual({ page: 1, limit: 2, total: 3 });
  expect([...ids(first), ...ids(second)]).toEqual(
    [hidden, live, draft].map((r) => String(r._id)),
  );
  expect((await list({ status: 'deleted' })).status).toBe(400);
  expect(
    (await list({ status: 'all', authorId: String(b.user._id) })).status,
  ).toBe(400);
});

it('public author pages respect visibility before counting and use first publication and ID for stable paging', async () => {
  const authorList = (id, query = {}) =>
    request(app)
      .get('/api/v1/users/' + id + '/recipes')
      .query(query);
  const empty = await authorList(a.user._id);
  expect(empty.status).toBe(200);
  expect(empty.body).toEqual({
    success: true,
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  });
  const first = await publishFor(a, 'Cá hấp');
  const second = await publishFor(a, 'Cá kho');
  const hidden = await publishFor(a, 'Canh cá');
  const deleted = await publishFor(a, 'Cá rán');
  const pending = await publishFor(a, 'Cá nướng');
  await publishFor(b, 'Món tác giả khác');
  await create({ title: 'Bản nháp riêng tư' });
  await recipes.Recipe.updateOne(
    { _id: hidden._id },
    { moderationStatus: 'hidden' },
  );
  await recipes.Recipe.updateOne(
    { _id: deleted._id },
    { deletedAt: new Date() },
  );
  await recipes.Recipe.updateOne(
    { _id: pending._id },
    { creationState: 'pending' },
  );
  await recipes.Recipe.updateMany(
    { _id: { $in: [first._id, second._id] } },
    { publishedAt: first.publishedAt },
  );
  for (const [page, recipe] of [
    [1, second],
    [2, first],
  ]) {
    const response = await authorList(a.user._id, { page, limit: 1 });
    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page, limit: 1, total: 2 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      recipeId: String(recipe._id),
      title: recipe.title,
      author: { id: String(a.user._id), displayName: a.user.displayName },
    });
    expect(response.body.data[0].author).not.toHaveProperty('email');
    expect(response.body.data[0]).not.toHaveProperty('moderationStatus');
    validates(
      spec.components.schemas.PublicRecipeCardDTO,
      response.body.data[0],
    );
  }
  expect((await authorList(a.user._id, { limit: 101 })).status).toBe(400);
  expect((await authorList(a.user._id, { status: 'draft' })).status).toBe(400);
  expect((await authorList('invalid-id')).status).toBe(400);
  expect((await authorList('f'.repeat(24))).body.error.code).toBe(
    'USER_NOT_FOUND',
  );
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { status: 'suspended' },
  );
  const suspended = await authorList(a.user._id);
  expect(suspended.status).toBe(404);
  expect(suspended.body.error.code).toBe('USER_NOT_FOUND');
});
