import { recipeRoutes } from '../../src/modules/recipes/recipe.routes.js';
import { createRecipeController } from '../../src/modules/recipes/recipe.controller.js';
import { authenticate } from '../../src/middleware/authenticate.js';
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
import { createRecipeMedia } from '../../src/modules/recipes/recipe-media.service.js';
import { createPublicationService } from '../../src/modules/recipes/publication.service.js';
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
  prefix = `publication-${randomUUID()}`,
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
  ingredient;
const raw = () => ({ buffer: png, mime: 'image/png' });
const upload = (purpose = 'recipe_cover', owner = a) =>
  media.service.uploadImage(owner, raw(), purpose, randomUUID());
const create = (body = {}, key = randomUUID()) =>
  recipes.service.create(a, body, key);
const patch = (r, body) =>
  client
    .patch(`/api/v1/recipes/${r._id || r.recipeId}`)
    .set('X-CSRF-Token', token)
    .send(body);
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

const content = () => ({
  title: 'Thịt kho trứng',
  description: 'Món ăn gia đình Việt Nam',
  categoryId: String(category._id),
  difficulty: 'easy',
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  ingredients: [
    {
      ingredientId: String(ingredient._id),
      name: 'Trứng snapshot',
      quantity: 2,
      unit: 'quả',
      order: 1,
    },
  ],
  steps: [{ order: 1, instruction: 'Nấu trong nồi nhỏ' }],
});
const publish = (r, body = { version: r.version }, c = client, t = token) =>
  c.patch(`/api/v1/recipes/${r._id}/publish`).set('X-CSRF-Token', t).send(body);
const unpublish = (r, body = { version: r.version }) =>
  client
    .patch(`/api/v1/recipes/${r._id}/unpublish`)
    .set('X-CSRF-Token', token)
    .send(body);
const guest = (path) => request(app).get(path);
const detail = (slug) => guest(`/api/v1/recipes/${slug}`);
const service = (extra) =>
  createPublicationService({
    Recipe: recipes.Recipe,
    User: identity.models.User,
    ...catalog.models,
    MediaAsset: media.MediaAsset,
    ...extra,
  });
it('PUB-01/15/33/34/43 publish without cover, guest DTO/schema and first timestamp', async () => {
  const r = await create(content()),
    res = await publish(r);
  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe('published');
  const row = await recipes.Recipe.findById(r._id);
  expect(row.slug).toBe('thit-kho-trung');
  expect(row.publishedAt).toBeInstanceOf(Date);
  expect(row.totalMinutes).toBe(30);
  const d = await detail(row.slug);
  expect(d.status).toBe(200);
  validates(spec.components.schemas.PublicRecipeDetailDTO, d.body.data);
  expect(d.body.data.ingredients[0].name).toBe('Trứng snapshot');
  expect(d.body.data.coverImageUrl).toBeNull();
  expect(JSON.stringify(d.body)).not.toMatch(
    /email|password|preferences|moderationReason|creationKey|fingerprint|cloudinary|quotaSlot|attachmentIntent|imageAssetId/,
  );
  const list = await guest('/api/v1/recipes');
  expect(list.status).toBe(200);
  expect(list.body.data.some((v) => v.recipeId === String(r._id))).toBe(true);
  validates(
    spec.components.schemas.PublicRecipeCardDTO,
    list.body.data.find((v) => v.recipeId === String(r._id)),
  );
  expect(d.headers['cache-control']).toBe('no-store');
  expect((await client.get(`/api/v1/me/recipes/${r._id}`)).status).toBe(200);
});
it.each([
  ['title', ''],
  ['title', 'ab'],
  ['description', ''],
  ['description', 'short'],
  ['categoryId', null],
  ['difficulty', null],
  ['servings', null],
  ['prepMinutes', null],
  ['cookMinutes', null],
  ['ingredients', []],
  ['steps', []],
  ['steps', [{ order: 1, instruction: 'ab' }]],
  ['ingredients', [{ name: 'Salt', order: 1 }]],
])(
  'PUB-02..14 missing/invalid publication %s %j leaves draft unchanged',
  async (field, value) => {
    const r = await create({ ...content(), [field]: value });
    const res = await publish(r);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RECIPE_NOT_PUBLISHABLE');
    expect(res.body.error.details.length).toBeGreaterThan(0);
    expect((await recipes.Recipe.findById(r._id)).version).toBe(r.version);
  },
);
it.each(['category', 'ingredient'])(
  'PUB-07/71 inactive %s rejects without rewriting snapshot',
  async (kind) => {
    const r = await create(content());
    await (
      kind === 'category' ? catalog.models.Category : catalog.models.Ingredient
    ).updateOne(
      { _id: kind === 'category' ? category._id : ingredient._id },
      { isActive: false },
    );
    expect((await publish(r)).status).toBe(422);
    expect((await recipes.Recipe.findById(r._id)).ingredients[0].name).toBe(
      'Trứng snapshot',
    );
  },
);
it('PUB-21..26 duplicate titles concurrently allocate unique stable slugs; stale/repeated transition conflict', async () => {
  const rows = await Promise.all([create(content()), create(content())]);
  const results = await Promise.all(rows.map((r) => publish(r)));
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(new Set(results.map((r) => r.body.data.slug)).size).toBe(2);
  expect((await publish(rows[0])).status).toBe(409);
  const current = await recipes.Recipe.findById(rows[0]._id);
  expect((await publish(current)).status).toBe(409);
});
it('PUB-26/27 one concurrent publisher wins', async () => {
  const r = await create(content());
  expect(
    (await Promise.all([publish(r), publish(r)])).map((v) => v.status).sort(),
  ).toEqual([200, 409]);
});
it('PUB-24/25/28/46..53 unpublish retains slug/timestamp and republish uses same identity', async () => {
  const r = await create(content());
  await publish(r);
  let row = await recipes.Recipe.findById(r._id);
  const stamp = +row.publishedAt;
  expect((await unpublish(row, { version: 0 })).status).toBe(409);
  expect((await unpublish(row)).status).toBe(200);
  expect((await detail(row.slug)).status).toBe(404);
  row = await recipes.Recipe.findById(r._id);
  expect(row.version).toBe(2);
  expect(+row.publishedAt).toBe(stamp);
  expect((await unpublish(row)).status).toBe(409);
  row = await recipes.service.update(a, row._id, {
    version: row.version,
    title: 'Tên thay đổi',
  });
  expect((await publish(row)).body.data.slug).toBe('thit-kho-trung');
  expect(+(await recipes.Recipe.findById(r._id)).publishedAt).toBe(stamp);
});
it.each(['draft', 'hidden', 'deleted', 'pending', 'suspended'])(
  'PUB-35..40/45 visibility excludes %s for list/detail even admin',
  async (state) => {
    const r = await create(content());
    await publish(r);
    const row = await recipes.Recipe.findById(r._id);
    if (state === 'suspended')
      await identity.models.User.updateOne(
        { _id: a.user._id },
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
              : { creationState: 'pending' },
      );
    expect((await detail(row.slug)).status).toBe(404);
    const list = await guest('/api/v1/recipes');
    expect(list.body.data.some((v) => v.recipeId === String(r._id))).toBe(
      false,
    );
    expect((await service().list({})).meta.total).toBe(list.body.meta.total);
  },
);
it('PUB-18..20 hidden/deleted/pending cannot publish; unpublish hidden never clears moderation', async () => {
  for (const fields of [
    { moderationStatus: 'hidden' },
    { deletedAt: new Date() },
    { creationState: 'pending' },
  ]) {
    const r = await create(content());
    await recipes.Recipe.updateOne({ _id: r._id }, fields);
    expect([404, 409]).toContain((await publish(r)).status);
  }
  const r = await create(content());
  await publish(r);
  await recipes.Recipe.updateOne(
    { _id: r._id },
    { moderationStatus: 'hidden' },
  );
  let row = await recipes.Recipe.findById(r._id);
  expect((await unpublish(row)).status).toBe(200);
  row = await recipes.Recipe.findById(r._id);
  expect(row.moderationStatus).toBe('hidden');
  expect((await publish(row)).status).toBe(409);
});
it('PUB-41/42 stable pagination, bounded strict query and unknown slug', async () => {
  for (let i = 0; i < 3; i++) await publish(await create(content()));
  await recipes.Recipe.collection.updateMany(
    { authorId: a.user._id },
    { $set: { publishedAt: new Date('2026-01-01') } },
  );
  const first = await guest('/api/v1/recipes?limit=2&sort=publishedAt'),
    second = await guest('/api/v1/recipes?limit=2&page=2&sort=publishedAt');
  const ids = [...first.body.data, ...second.body.data].map((v) => v.recipeId);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toEqual([...ids].sort());
  expect((await guest('/api/v1/recipes?limit=101')).status).toBe(400);
  expect((await guest('/api/v1/recipes?q[$ne]=search')).status).toBe(400);
  expect((await detail('not-existing-slug')).status).toBe(404);
});
it('PUB-61..67 ownership/session/CSRF/protected body enforced', async () => {
  const r = await create(content());
  expect(
    (await publish(r, { version: r.version }, other, otherToken)).status,
  ).toBe(404);
  expect((await publish(r, { version: 0 }, client, 'invalid')).status).toBe(
    403,
  );
  for (const body of [
    { version: 0, authorId: String(a.user._id) },
    { version: 0, moderationStatus: 'normal' },
    { version: 0, title: 'Spoof' },
    {},
  ])
    expect((await publish(r, body)).status).toBe(422);
  const g = request.agent(app),
    t = (await g.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect((await publish(r, { version: 0 }, g, t)).status).toBe(401);
  await publish(r);
  expect(
    (
      await other
        .patch(`/api/v1/recipes/${r._id}/unpublish`)
        .set('X-CSRF-Token', otherToken)
        .send({ version: 1 })
    ).status,
  ).toBe(404);
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { status: 'suspended' },
  );
  expect((await unpublish({ ...r.toObject(), version: 1 })).status).toBe(401);
});
it.each(['patch', 'delete'])(
  'PUB-29/30 publish versus %s cannot lose updates',
  async (action) => {
    const r = await create(content());
    const results = await Promise.all([
      publish(r),
      action === 'patch'
        ? patch(r, { version: r.version, title: 'Changed title' })
        : client.delete(`/api/v1/recipes/${r._id}`).set('X-CSRF-Token', token),
    ]);
    const row = await recipes.Recipe.findById(r._id);
    expect(results.some((v) => [200, 204].includes(v.status))).toBe(true);
    if (row.status === 'published') {
      expect(row.deletedAt).toBeNull();
      expect(row.title).toBe('Thịt kho trứng');
    } else expect(results[0].status).toBe(409);
  },
);
it.each(['patch', 'delete'])(
  'PUB-31/32 published %s restriction retained while unpublishing',
  async (action) => {
    const r = await create(content());
    await publish(r);
    const row = await recipes.Recipe.findById(r._id);
    expect(
      (
        await (action === 'patch'
          ? patch(row, { version: row.version, title: 'Unsafe edit' })
          : client
              .delete(`/api/v1/recipes/${r._id}`)
              .set('X-CSRF-Token', token))
      ).status,
    ).toBe(404);
    const results = await Promise.all([unpublish(row), unpublish(row)]);
    expect(results.map((v) => v.status).sort()).toEqual([200, 409]);
  },
);
it('PUB-68/69 lost commit response returns 503 and read exposes committed state, no duplicate side effects', async () => {
  const r = await create(content()),
    original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockImplementation(async (...args) => {
      await original(...args);
      throw new Error('private diagnostics');
    });
  try {
    const res = await publish(r);
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('private diagnostics');
  } finally {
    spy.mockRestore();
  }
  expect(
    (await client.get(`/api/v1/me/recipes/${r._id}`)).body.data.status,
  ).toBe('published');
  expect((await publish(r)).status).toBe(409);
  expect((await recipes.Recipe.findById(r._id)).version).toBe(1);
});
it('PUB-71 Catalog deactivation after read has documented standalone boundary; republish revalidates', async () => {
  const r = await create(content()),
    original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockImplementation(async (...args) => {
      await catalog.models.Category.updateOne(
        { _id: category._id },
        { isActive: false },
      );
      return original(...args);
    });
  try {
    expect((await publish(r)).status).toBe(200);
  } finally {
    spy.mockRestore();
  }
  let row = await recipes.Recipe.findById(r._id);
  expect((await detail(row.slug)).status).toBe(200);
  await unpublish(row);
  row = await recipes.Recipe.findById(r._id);
  expect((await publish(row)).status).toBe(422);
});
it('PUB-16/17/51/52/54/58/59 runtime gateway fails closed and references survive unpublish', async () => {
  const cover = await upload(),
    step = await upload('recipe_step');
  const r = await create({
    ...content(),
    coverImageAssetId: String(cover._id),
    steps: [
      { order: 1, instruction: 'Nấu thật kỹ', imageAssetId: String(step._id) },
    ],
  });
  const path = `/api/v1/recipes/${r._id}/images/${cover._id}`;
  expect((await guest(path)).status).toBe(404);
  expect((await other.get(path)).status).toBe(404);
  expect((await client.get(path)).status).toBe(503);
  expect((await publish(r)).status).toBe(200);
  expect((await guest(path)).status).toBe(503);
  let row = await recipes.Recipe.findById(r._id);
  await unpublish(row);
  expect((await guest(path)).status).toBe(404);
  expect((await media.MediaAsset.findById(cover._id)).status).toBe('attached');
  expect((await media.MediaAsset.findById(step._id)).quotaSlot).toBeDefined();
  row = await recipes.Recipe.findById(r._id);
  await media.MediaAsset.updateOne(
    { _id: cover._id },
    { status: 'pending_delete' },
  );
  expect((await publish(row)).status).toBe(409);
});
it.each([
  'hidden',
  'deleted',
  'suspended',
  'detached',
  'intent',
  'wrong-step',
  'wrong-owner',
])(
  'PUB-55..60 media permission rejects %s including former public grant',
  async (state) => {
    const image = await upload('recipe_step');
    const r = await create({
      ...content(),
      steps: [
        {
          order: 1,
          instruction: 'Nấu thật kỹ',
          imageAssetId: String(image._id),
        },
      ],
    });
    await publish(r);
    expect(await recipes.images.authorize(null, r._id, image._id)).toBeTruthy();
    if (state === 'hidden')
      await recipes.Recipe.updateOne(
        { _id: r._id },
        { moderationStatus: 'hidden' },
      );
    if (state === 'deleted')
      await recipes.Recipe.updateOne({ _id: r._id }, { deletedAt: new Date() });
    if (state === 'suspended')
      await identity.models.User.updateOne(
        { _id: a.user._id },
        { status: 'suspended' },
      );
    if (state === 'detached')
      await recipes.Recipe.updateOne({ _id: r._id }, { steps: [] });
    if (state === 'intent')
      await media.MediaAsset.updateOne(
        { _id: image._id },
        {
          attachmentIntent: {
            token: randomUUID(),
            target: {
              kind: 'recipe_step',
              resourceId: r._id,
              stepId: r.steps[0].stepId,
            },
            expectedVersion: r.version,
            startedAt: new Date(),
          },
        },
      );
    if (state === 'wrong-step')
      await media.MediaAsset.updateOne(
        { _id: image._id },
        { 'attachedTo.stepId': randomUUID() },
      );
    if (state === 'wrong-owner')
      await media.MediaAsset.collection.updateOne(
        { _id: image._id },
        { $set: { ownerId: b.user._id } },
      );
    await expect(
      recipes.images.authorize(null, r._id, image._id),
    ).rejects.toMatchObject({ status: 404 });
  },
);
it('PUB-60/87/88 fixture binary contract, recheck revokes in-flight response; no persistent storage claim', async () => {
  const image = await upload();
  const r = await create({
    ...content(),
    coverImageAssetId: String(image._id),
  });
  // Controlled fixture bytes correspond to this registry record; this does not read the upload provider Map.
  const fixture = await sharp(png).rotate().png().toBuffer();
  const asset = await media.MediaAsset.findById(image._id);
  expect(fixture.length).toBe(asset.bytes);
  const bytes = fixture;
  const transport = {
    read: vi.fn(async () => ({ buffer: bytes, contentType: 'image/png' })),
  };
  const gateway = createRecipeMedia({
    Recipe: recipes.Recipe,
    User: identity.models.User,
    MediaAsset: media.MediaAsset,
    publication: recipes.publication,
    transport,
  });
  expect((await gateway.read(a, r._id, image._id)).buffer).toEqual(bytes);
  await expect(gateway.read(b, r._id, image._id)).rejects.toMatchObject({
    status: 404,
  });
  await publish(r);
  expect((await gateway.read(null, r._id, image._id)).buffer).toEqual(bytes);
  transport.read.mockImplementationOnce(async () => {
    const row = await recipes.Recipe.findById(r._id);
    await recipes.publication.unpublish(a, r._id, { version: row.version });
    return { buffer: bytes, contentType: 'image/png' };
  });
  await expect(gateway.read(null, r._id, image._id)).rejects.toMatchObject({
    status: 404,
  });
  await expect(gateway.read(null, r._id, image._id)).rejects.toMatchObject({
    status: 404,
  });
});
it('PUB-23 bounded unique-index collision retry exhaustion never publishes', async () => {
  const r = await create(content());
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockRejectedValue({ code: 11000, keyPattern: { slug: 1 } });
  try {
    expect((await publish(r)).body.error.code).toBe('RECIPE_SLUG_CONFLICT');
    expect(spy).toHaveBeenCalledTimes(5);
  } finally {
    spy.mockRestore();
  }
  expect((await recipes.Recipe.findById(r._id)).status).toBe('draft');
});
it('PUB-24 soft-deleted recipe continues owning its slug', async () => {
  const r = await create(content());
  await publish(r);
  const first = await recipes.Recipe.findById(r._id);
  await unpublish(first);
  await recipes.service.remove(a, r._id);
  const next = await publish(await create(content()));
  expect(next.status).toBe(200);
  expect(next.body.data.slug).not.toBe(first.slug);
});
it('PUB-68 precommit database failure leaves draft unchanged', async () => {
  const r = await create(content());
  const spy = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockRejectedValue(new Error('internal database secret'));
  try {
    expect((await publish(r)).status).toBe(503);
  } finally {
    spy.mockRestore();
  }
  expect((await recipes.Recipe.findById(r._id)).status).toBe('draft');
});
it.each(['hidden', 'suspended'])(
  'PUB-18/40 concurrent %s cannot grant public visibility',
  async (kind) => {
    const r = await create(content()),
      original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
    const spy = vi
      .spyOn(recipes.Recipe, 'findOneAndUpdate')
      .mockImplementation(async (...args) => {
        if (kind === 'hidden')
          await recipes.Recipe.updateOne(
            { _id: r._id },
            { moderationStatus: 'hidden' },
          );
        else
          await identity.models.User.updateOne(
            { _id: a.user._id },
            { status: 'suspended' },
          );
        return original(...args);
      });
    try {
      expect((await publish(r)).status).toBe(kind === 'hidden' ? 409 : 200);
    } finally {
      spy.mockRestore();
    }
    expect(await recipes.publication.isPublic(r._id)).toBeNull();
  },
);
it('PUB-17/72 pending attachment not yet canonical also blocks publication', async () => {
  const r = await create(content()),
    image = await upload();
  await media.MediaAsset.updateOne(
    { _id: image._id },
    {
      attachmentIntent: {
        token: randomUUID(),
        target: { kind: 'recipe_cover', resourceId: r._id },
        expectedVersion: r.version,
        startedAt: new Date(),
      },
    },
  );
  expect((await publish(r)).body.error.code).toBe(
    'MEDIA_RECONCILIATION_REQUIRED',
  );
});
it('PUB-89 delivery failure sanitized; no retry or raw provider URL', async () => {
  const image = await upload(),
    r = await create({ ...content(), coverImageAssetId: String(image._id) });
  const transport = {
    read: vi.fn(async () => {
      throw new Error('https://provider.invalid/private-secret');
    }),
  };
  const gateway = createRecipeMedia({
    Recipe: recipes.Recipe,
    User: identity.models.User,
    MediaAsset: media.MediaAsset,
    publication: recipes.publication,
    transport,
  });
  await expect(gateway.read(a, r._id, image._id)).rejects.toMatchObject({
    status: 503,
    message: 'Secure image delivery unavailable',
  });
  expect(transport.read).toHaveBeenCalledTimes(1);
});
it('PUB-87/88 HTTP fixture gateway returns actual bounded PNG, no cache validators; old path revoked', async () => {
  const image = await upload(),
    r = await create({ ...content(), coverImageAssetId: String(image._id) });
  const buffer = await sharp(png).rotate().png().toBuffer();
  const transport = {
    read: vi.fn(async () => ({ buffer, contentType: 'image/png' })),
  };
  const gateway = createRecipeMedia({
    Recipe: recipes.Recipe,
    User: identity.models.User,
    MediaAsset: media.MediaAsset,
    publication: recipes.publication,
    transport,
  });
  const fixtureApp = createApp({
    identity,
    catalog,
    media,
    config,
    logger,
    recipes: {
      router: recipeRoutes(
        createRecipeController(recipes.service, recipes.publication, gateway),
        authenticate(identity.sessions, identity.security.sessionCookie),
      ),
    },
  });
  const path = `/api/v1/recipes/${r._id}/images/${image._id}`;
  expect((await request(fixtureApp).get(path)).status).toBe(404);
  await publish(r);
  const response = await request(fixtureApp)
    .get(path)
    .set('If-None-Match', '*')
    .set('Range', 'bytes=0-10');
  expect(response.status).toBe(200);
  expect(response.body).toEqual(buffer);
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.headers.etag).toBeUndefined();
  expect(response.headers.location).toBeUndefined();
  expect(response.headers['last-modified']).toBeUndefined();
  await unpublish(await recipes.Recipe.findById(r._id));
  expect((await request(fixtureApp).get(path)).status).toBe(404);
  expect(transport.read).toHaveBeenCalledTimes(1);
});
it.each(['oversize', 'mime', 'empty', 'wrong-size'])(
  'PUB-89 invalid binary %s fails closed',
  async (kind) => {
    const image = await upload(),
      r = await create({ ...content(), coverImageAssetId: String(image._id) });
    const buffer = await sharp(png).rotate().png().toBuffer();
    const gateway = createRecipeMedia({
      Recipe: recipes.Recipe,
      User: identity.models.User,
      MediaAsset: media.MediaAsset,
      publication: recipes.publication,
      transport: {
        read: async () => ({
          buffer:
            kind === 'oversize'
              ? Buffer.alloc(5 * 1024 * 1024 + 1)
              : kind === 'empty'
                ? Buffer.alloc(0)
                : kind === 'wrong-size'
                  ? buffer.subarray(1)
                  : buffer,
          contentType: kind === 'mime' ? 'text/html' : 'image/png',
        }),
      },
    });
    await expect(gateway.read(a, r._id, image._id)).rejects.toMatchObject({
      status: 503,
    });
  },
);
it.each(['patch', 'delete'])(
  'PUB-31/32 concurrent unpublish and %s preserve CAS and draft-only writes',
  async (action) => {
    const r = await create(content());
    await publish(r);
    const row = await recipes.Recipe.findById(r._id);
    const [u, change] = await Promise.all([
      unpublish(row),
      action === 'patch'
        ? patch(row, { version: row.version, title: 'Stale published edit' })
        : client.delete(`/api/v1/recipes/${r._id}`).set('X-CSRF-Token', token),
    ]);
    expect(u.status).toBe(200);
    expect(action === 'patch' ? [404, 409] : [204, 404, 409]).toContain(
      change.status,
    );
    const final = await recipes.Recipe.findById(r._id);
    expect(final.status).toBe('draft');
    expect(final.title).toBe('Thịt kho trứng');
    expect((await detail(row.slug)).status).toBe(404);
  },
);
it('PUB-60 public detail already read may finish; every subsequent request denied', async () => {
  const r = await create(content());
  await publish(r);
  const row = await recipes.Recipe.findById(r._id);
  const snapshot = await recipes.publication.detail(row.slug);
  await unpublish(row);
  expect(snapshot.status).toBe('published');
  expect((await detail(row.slug)).status).toBe(404);
});
it('PUB-89 bounded transport timeout aborts and never grants bytes', async () => {
  const image = await upload(),
    r = await create({ ...content(), coverImageAssetId: String(image._id) });
  let signal;
  const gateway = createRecipeMedia({
    Recipe: recipes.Recipe,
    User: identity.models.User,
    MediaAsset: media.MediaAsset,
    publication: recipes.publication,
    transport: {
      read: async (_asset, options) => {
        signal = options.signal;
        return new Promise(() => {});
      },
    },
  });
  await expect(gateway.read(a, r._id, image._id)).rejects.toMatchObject({
    status: 503,
  });
  expect(signal.aborted).toBe(true);
});
it('PUB-90 disabled media policy allows text-only publication and refuses references', async () => {
  const text = await create(content());
  expect(
    (
      await service({ MediaAsset: null }).publish(a, text._id, {
        version: text.version,
      })
    ).status,
  ).toBe('published');
  const image = await upload(),
    r = await create({ ...content(), coverImageAssetId: String(image._id) });
  await expect(
    service({ MediaAsset: null }).publish(a, r._id, { version: r.version }),
  ).rejects.toMatchObject({ status: 503 });
  expect((await recipes.Recipe.findById(r._id)).status).toBe('draft');
});
it('PUB-57/65 stale session cookie cannot bypass media authorization', async () => {
  const image = await upload(),
    r = await create({ ...content(), coverImageAssetId: String(image._id) });
  await publish(r);
  const path = `/api/v1/recipes/${r._id}/images/${image._id}`;
  const result = await request(app)
    .get(path)
    .set('Cookie', `${identity.security.sessionCookie}=invalid-session`);
  expect(result.status).toBe(401);
  expect((await guest(path)).status).toBe(503);
});

const editPublished = (recipe, changes, agent = client, csrf = token) =>
  agent
    .patch('/api/v1/recipes/' + recipe.recipeId + '/published-content')
    .set('X-CSRF-Token', csrf)
    .send({ version: recipe.version, ...changes });
async function publishedRecipe(body = content()) {
  const response = await publish(await create(body));
  expect(response.status).toBe(200);
  return response.body.data;
}
it('updates complete published content with one CAS and preserves public identity and date', async () => {
  const recipe = await publishedRecipe();
  const changes = {
    title: 'Súp bí ngô',
    cookMinutes: 12,
    steps: [
      {
        stepId: recipe.steps[0].stepId,
        order: 1,
        instruction: 'Ninh bí đến khi mềm.',
      },
      { order: 2, instruction: 'Nêm vừa ăn.' },
    ],
  };
  const results = await Promise.all([
    editPublished(recipe, changes),
    editPublished(recipe, changes),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  const updated = results.find((r) => r.status === 200).body.data;
  validates(spec.components.schemas.OwnerRecipeDTO, updated);
  expect(updated).toMatchObject({
    recipeId: recipe.recipeId,
    slug: recipe.slug,
    publishedAt: recipe.publishedAt,
    version: recipe.version + 1,
    status: 'published',
    title: changes.title,
    totalMinutes: 22,
  });
  expect(updated.steps[0].stepId).toBe(recipe.steps[0].stepId);
  expect((await detail(recipe.slug)).body.data.title).toBe(changes.title);
  expect(
    (await guest('/api/v1/recipes?q=sup')).body.data.map((r) => r.recipeId),
  ).toContain(recipe.recipeId);
});
it('rejects unpublishable changes, protected fields and inactive references while preserving the public version', async () => {
  const recipe = await publishedRecipe();
  for (const changes of [
    { ingredients: [] },
    { steps: [] },
    { description: 'a' },
    { authorId: b.user.id },
    { publishedAt: new Date().toISOString() },
    { slug: 'other' },
    { moderationStatus: 'normal' },
  ]) {
    expect((await editPublished(recipe, changes)).status).toBe(422);
  }
  await catalog.models.Ingredient.updateOne(
    { _id: ingredient.id },
    { isActive: false },
  );
  expect(
    (await editPublished(recipe, { title: 'Món đang cập nhật' })).status,
  ).toBe(422);
  expect((await detail(recipe.slug)).body.data.title).toBe(recipe.title);
  expect((await recipes.Recipe.findById(recipe.recipeId)).version).toBe(
    recipe.version,
  );
});
it('requires the active owner, a CSRF token and a visible moderation state', async () => {
  const recipe = await publishedRecipe(),
    changes = { title: 'Thịt kho mật ong' };
  expect((await editPublished(recipe, changes, other, otherToken)).status).toBe(
    404,
  );
  expect(
    (
      await client
        .patch('/api/v1/recipes/' + recipe.recipeId + '/published-content')
        .send({ version: recipe.version, ...changes })
    ).status,
  ).toBe(403);
  await recipes.Recipe.updateOne(
    { _id: recipe.recipeId },
    { moderationIntent: b.user._id },
  );
  expect((await editPublished(recipe, changes)).status).toBe(409);
  await recipes.Recipe.updateOne(
    { _id: recipe.recipeId },
    { moderationIntent: null, moderationStatus: 'hidden' },
  );
  expect((await editPublished(recipe, changes)).status).toBe(409);
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { status: 'suspended' },
  );
  await expect(
    service().updatePublished(a, recipe.recipeId, {
      version: recipe.version,
      ...changes,
    }),
  ).rejects.toMatchObject({ status: 401 });
});
it('only one concurrent unpublish and published update commits', async () => {
  const recipe = await publishedRecipe();
  const results = await Promise.all([
    unpublish({ _id: recipe.recipeId, version: recipe.version }),
    editPublished(recipe, { description: 'Nấu lửa nhỏ đến khi thịt mềm.' }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  expect((await recipes.Recipe.findById(recipe.recipeId)).version).toBe(
    recipe.version + 1,
  );
});
it('keeps attached image slots on reorder and rejects replacing, deleting or moving a published image', async () => {
  const asset = await upload('recipe_step'),
    cover = await upload();
  const recipe = await publishedRecipe({
    ...content(),
    coverImageAssetId: String(cover._id),
    steps: [
      {
        order: 1,
        instruction: 'Đun sôi nước.',
        imageAssetId: String(asset._id),
      },
      { order: 2, instruction: 'Dọn món ra đĩa.' },
    ],
  });
  const first = recipe.steps[0].stepId,
    second = recipe.steps[1].stepId;
  for (const changes of [
    { coverImageAssetId: null },
    { steps: [{ stepId: second, order: 1 }] },
    {
      steps: [
        { stepId: first, order: 1, imageAssetId: null },
        { stepId: second, order: 2, imageAssetId: String(asset._id) },
      ],
    },
  ]) {
    const response = await editPublished(recipe, changes);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PUBLISHED_MEDIA_CHANGE');
  }
  const updated = await editPublished(recipe, {
    steps: [
      { stepId: second, order: 1 },
      { stepId: first, order: 2 },
    ],
  });
  expect(updated.status).toBe(200);
  expect(updated.body.data.steps[1].imageAssetId).toBe(String(asset._id));
  await media.MediaAsset.updateOne(
    { _id: asset._id },
    { status: 'pending_delete' },
  );
  expect(
    (await editPublished(updated.body.data, { title: 'Thịt kho trứng mềm' }))
      .status,
  ).toBe(409);
});

it('fails closed if moderation starts after validating the proposed content', async () => {
  const recipe = await publishedRecipe();
  const original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  const update = vi
    .spyOn(recipes.Recipe, 'findOneAndUpdate')
    .mockImplementationOnce(async (...args) => {
      // Interleave a real moderation claim exactly at the write boundary.
      await recipes.Recipe.updateOne(
        { _id: recipe.recipeId },
        { moderationIntent: b.user._id },
      );
      return original(...args);
    });
  try {
    const response = await editPublished(recipe, { title: 'Bữa tối gia đình' });
    expect(response.status).toBe(409);
    expect((await recipes.Recipe.findById(recipe.recipeId)).title).toBe(
      recipe.title,
    );
  } finally {
    update.mockRestore();
  }
});
it('rechecks the owner after the catalog and media reads and before the published write', async () => {
  const recipe = await publishedRecipe();
  const mediaRead = vi
    .spyOn(media.MediaAsset, 'exists')
    .mockImplementationOnce(async () => {
      await identity.models.User.updateOne(
        { _id: a.user._id },
        { status: 'suspended' },
      );
      return null;
    });
  try {
    await expect(
      service().updatePublished(a, recipe.recipeId, {
        version: recipe.version,
        title: 'Bữa tối gia đình',
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect((await recipes.Recipe.findById(recipe.recipeId)).version).toBe(
      recipe.version,
    );
    expect((await detail(recipe.slug)).status).toBe(404);
  } finally {
    mediaRead.mockRestore();
  }
});
