import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
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
import { createMedia } from '../../src/modules/media/index.js';
import { createMediaService } from '../../src/modules/media/media.service.js';
import { createMediaLifecycle } from '../../src/modules/media/media-lifecycle.service.js';
import { createMediaCleanup } from '../../src/modules/media/media-cleanup.js';
import { createUserMediaReferences } from '../../src/modules/media/media-reference.js';
import {
  createImageStorage,
  StorageError,
} from '../../src/integrations/image-storage/index.js';
import { createApp } from '../../src/app.js';
import { loadSpec } from '../../src/openapi/docs.js';
import { schemaValidator } from '../../../scripts/openapi-contract.js';
import { runCleanupCommand } from '../../scripts/media-cleanup.js';
const config = parseEnv({
  NODE_ENV: 'test',
  SMTP_ENABLED: 'false',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  MEDIA_UPLOAD_RATE_LIMIT: 1000,
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
  IMAGE_STORAGE_TIMEOUT_MS: 100,
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  prefix = `lifecycle-${randomUUID()}`;
const spec = loadSpec(),
  validates = schemaValidator(spec);
let identity,
  media,
  app,
  a,
  b,
  client,
  otherClient,
  token,
  png,
  storage,
  refs,
  clock;
const ids = [];
const target = () => ({ kind: 'user_avatar', resourceId: String(a.user._id) });
const raw = () => ({ buffer: png, mime: 'image/png' });
function services(adapter = storage, references = refs, extra = {}) {
  const service = createMediaService({
    MediaAsset: media.MediaAsset,
    storage: adapter,
    config,
  });
  const lifecycle = createMediaLifecycle({
    MediaAsset: media.MediaAsset,
    service,
    references,
    config,
    now: () => new Date(clock),
  });
  const cleanup = createMediaCleanup({
    MediaAsset: media.MediaAsset,
    storage: adapter,
    service,
    lifecycle,
    references,
    config: { ...config, ...extra },
    now: () => new Date(clock),
    logger,
  });
  return { service, lifecycle, cleanup };
}
async function upload(purpose = 'avatar', owner = a, adapter = storage) {
  return services(adapter).service.uploadImage(
    owner,
    raw(),
    purpose,
    randomUUID(),
  );
}
const get = (id) => media.MediaAsset.findById(id);
const advance = (ms = 3600001) => {
  clock += ms;
};
async function expire(asset) {
  await media.MediaAsset.updateOne(
    { _id: asset._id },
    { expiresAt: new Date(clock - 1) },
  );
}
async function login(label) {
  const c = request.agent(app),
    email = `${prefix}-${label}@example.test`,
    password = 'Lifecycle test password!';
  let csrf = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  const reg = await c
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ email, password, displayName: 'Lifecycle User' });
  expect(reg.status).toBe(201);
  ids.push(reg.body.data.id);
  csrf = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await c
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', csrf)
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
  storage = await createImageStorage(config);
  media = await createMedia({
    connection: db.connection,
    identity,
    config,
    storage,
    logger,
  });
  app = createApp({ identity, media, config, logger, isReady: db.isReady });
  const first = await login('a'),
    second = await login('b');
  a = first.actor;
  client = first.client;
  b = second.actor;
  otherClient = second.client;
  token = (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  refs = createUserMediaReferences(identity.models.User);
  png = await sharp({
    create: { width: 12, height: 10, channels: 3, background: 'green' },
  })
    .png()
    .toBuffer();
});
beforeEach(async () => {
  clock = Date.now();
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { avatarAssetId: null, mediaVersion: 0, status: 'active' },
  );
});
afterEach(async () => {
  await media.MediaAsset.deleteMany({ ownerId: { $in: ids } });
});
afterAll(async () => {
  expect(https.request).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  await identity.models.Session.deleteMany({ userId: { $in: ids } });
  await identity.models.User.deleteMany({ _id: { $in: ids } });
  await db.close();
});
it('ML-01/02/03 own metadata and wrong owner are indistinguishable from missing', async () => {
  const asset = await upload();
  expect(
    String((await media.lifecycle.validateOwnedAsset(a, asset._id))._id),
  ).toBe(String(asset._id));
  await expect(
    media.lifecycle.validateOwnedAsset(b, asset._id),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    media.lifecycle.validateOwnedAsset(a, 'bad'),
  ).rejects.toMatchObject({ status: 400 });
});
it('ML-04/05 listing rejects guest and suspended session', async () => {
  expect((await request(app).get('/api/v1/me/media')).status).toBe(401);
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { status: 'suspended' },
  );
  expect((await client.get('/api/v1/me/media')).status).toBe(401);
});
it.each([
  { ownerId: 'spoof' },
  { purpose: 'unknown' },
  { page: '0' },
  { limit: '101' },
  { status: 'expired' },
  { url: 'https://example.test' },
])('ML-06/07 list rejects unsupported query %j', async (query) => {
  expect((await client.get('/api/v1/me/media').query(query)).status).toBe(400);
});
it('ML-55/56/57/60/61/62 list filters pagination and strict private DTO', async () => {
  const first = await upload();
  await upload('recipe_cover');
  await upload('avatar', b);
  const res = await client
    .get('/api/v1/me/media')
    .query({ purpose: 'avatar', limit: 1 });
  expect(res.status).toBe(200);
  expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 1 });
  expect(res.body.data[0].assetId).toBe(String(first._id));
  validates(
    spec.paths['/api/v1/me/media'].get.responses[200].content[
      'application/json'
    ].schema,
    res.body,
  );
  expect(JSON.stringify(res.body)).not.toMatch(
    /cloudinary|quotaSlot|fingerprint|idempotencyKey|ownerId/,
  );
});
it('ML-08/09/10 wrong purpose, target, expiry and reused attachment fail', async () => {
  const asset = await upload();
  const { lifecycle } = services();
  await expect(
    lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: { kind: 'recipe_cover', resourceId: String(a.user._id) },
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: { ...target(), resourceId: String(b.user._id) },
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expire(asset);
  await expect(
    lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ code: 'MEDIA_EXPIRED' });
});
it('ML-11/12/17 attach and release use actual User canonical reference and retain grace', async () => {
  const asset = await upload();
  const { lifecycle } = services();
  await lifecycle.attachMedia(a, {
    assetId: asset._id,
    target: target(),
    expectedVersion: 0,
  });
  expect(
    String((await identity.models.User.findById(a.user._id)).avatarAssetId),
  ).toBe(String(asset._id));
  expect((await get(asset._id)).status).toBe('attached');
  await expect(lifecycle.requestDeletion(a, asset._id)).rejects.toMatchObject({
    code: 'MEDIA_IN_USE',
  });
  await expect(
    lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 1,
    }),
  ).rejects.toMatchObject({ status: 409 });
  await lifecycle.releaseMedia(a, {
    assetId: asset._id,
    target: target(),
    expectedVersion: 1,
  });
  const released = await get(asset._id);
  expect(released.status).toBe('temporary');
  expect(+released.expiresAt).toBe(clock + 30 * 86400000);
  expect(released.quotaSlot).toBeDefined();
});
it('ML-13/14 replace commits new reference before releasing old and stale fails safely', async () => {
  const old = await upload(),
    next = await upload();
  const { lifecycle } = services();
  await lifecycle.attachMedia(a, {
    assetId: old._id,
    target: target(),
    expectedVersion: 0,
  });
  await expect(
    lifecycle.replaceMediaReference(a, {
      assetId: next._id,
      target: target(),
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  expect((await get(old._id)).status).toBe('attached');
  expect((await get(next._id)).status).toBe('temporary');
  await lifecycle.replaceMediaReference(a, {
    assetId: next._id,
    target: target(),
    expectedVersion: 1,
  });
  expect((await get(old._id)).status).toBe('temporary');
  expect((await get(next._id)).status).toBe('attached');
});
it('ML-15 two clients replacing same User version have one winner', async () => {
  const one = await upload(),
    two = await upload();
  const tasks = [one, two].map((asset) =>
    services().lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 0,
    }),
  );
  const result = await Promise.allSettled(tasks);
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(result.find((r) => r.status === 'rejected').reason.status).toBe(409);
  expect(
    await media.MediaAsset.countDocuments({
      ownerId: a.user._id,
      status: 'attached',
    }),
  ).toBe(1);
});
it('ML-16 canonical commit then lost response retains intent; recovery preserves asset', async () => {
  const asset = await upload();
  const references = {
    ...refs,
    async compareAndSwap(...args) {
      await refs.compareAndSwap(...args);
      throw new Error('lost response');
    },
  };
  await expect(
    services(storage, references).lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ status: 503 });
  expect((await get(asset._id)).attachmentIntent).toBeTruthy();
  advance();
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('attached');
  expect((await get(asset._id)).quotaSlot).toBeDefined();
});
it('ML-16/32 recovery fences a suspended writer before it can commit', async () => {
  const asset = await upload();
  let resume, entered;
  const ready = new Promise((r) => {
    entered = r;
  });
  const references = {
    ...refs,
    async compareAndSwap(...args) {
      entered();
      await new Promise((r) => {
        resume = r;
      });
      return refs.compareAndSwap(...args);
    },
  };
  const task = services(storage, references)
    .lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 0,
    })
    .catch((e) => e);
  await ready;
  advance();
  await services().cleanup.runOnce();
  resume();
  expect((await task).code).toBe('VERSION_CONFLICT');
  expect(
    (await identity.models.User.findById(a.user._id)).avatarAssetId,
  ).toBeNull();
  expect((await get(asset._id)).status).toBe('temporary');
});
it('ML-16 DB finalize fails after canonical write, worker repairs durable intent', async () => {
  const asset = await upload();
  const original = media.MediaAsset.findOneAndUpdate.bind(media.MediaAsset);
  const spy = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockImplementation((filter, update, opts) => {
      if (update.$set?.status === 'attached')
        throw new Error('database failure');
      return original(filter, update, opts);
    });
  try {
    await expect(
      services().lifecycle.attachMedia(a, {
        assetId: asset._id,
        target: target(),
        expectedVersion: 0,
      }),
    ).rejects.toMatchObject({ status: 503 });
  } finally {
    spy.mockRestore();
  }
  advance();
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('attached');
});
it('ML-18/19 pending and deleted assets cannot attach', async () => {
  const asset = await upload();
  const { lifecycle, cleanup } = services();
  await lifecycle.requestDeletion(a, asset._id);
  await expect(
    lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ status: 409 });
  await cleanup.runOnce();
  await expect(
    lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: target(),
      expectedVersion: 0,
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it('ML-21/22/23/58/59 DELETE queues once, CSRF/owner isolation, deleted is idempotent 200', async () => {
  const asset = await upload(),
    url = `/api/v1/media/images/${asset._id}`;
  expect((await client.delete(url)).status).toBe(403);
  expect((await client.delete(url).set('X-CSRF-Token', 'wrong')).status).toBe(
    403,
  );
  const otherToken = (await otherClient.get('/api/v1/auth/csrf')).body.data
    .csrfToken;
  expect(
    (await otherClient.delete(url).set('X-CSRF-Token', otherToken)).status,
  ).toBe(404);
  for (let i = 0; i < 2; i++) {
    const r = await client.delete(url).set('X-CSRF-Token', token);
    expect(r.status).toBe(202);
    validates(
      spec.paths['/api/v1/media/images/{assetId}'].delete.responses[202]
        .content['application/json'].schema,
      r.body,
    );
  }
  await media.cleanup.runOnce();
  const done = await client.delete(url).set('X-CSRF-Token', token);
  expect(done.status).toBe(200);
  expect(done.body.data.status).toBe('deleted');
  expect((await get(asset._id)).quotaSlot).toBeUndefined();
  expect((await client.get('/api/v1/me/media')).body.data).toHaveLength(0);
  expect(
    (await client.get('/api/v1/me/media?status=deleted')).body.data,
  ).toHaveLength(1);
});
it('ML-24/53 canonical User reference protects even temporary expired metadata', async () => {
  const asset = await upload();
  await expire(asset);
  await identity.models.User.updateOne(
    { _id: a.user._id },
    { avatarAssetId: asset._id },
  );
  await expect(
    services().lifecycle.requestDeletion(a, asset._id),
  ).rejects.toMatchObject({ code: 'MEDIA_IN_USE' });
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('temporary');
  expect((await get(asset._id)).quotaSlot).toBeDefined();
});
it('ML-25/26 confirmed deletion or same-instance tombstone releases quota', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  await storage.destroyImage({
    publicId: asset.cloudinary.publicId,
    resourceType: 'image',
    deliveryType: 'authenticated',
  });
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('deleted');
});
it.each(['timeout', 'invalid_response', 'error'])(
  'ML-27/28 unknown destroy %s retains slot and records retry',
  async (kind) => {
    const adapter = await createImageStorage(config, {
      faults: [
        {
          operation: 'destroy',
          kind,
          error: new StorageError('STORAGE_TIMEOUT', 'unknown'),
        },
      ],
    });
    const asset = await upload('avatar', a, adapter);
    const { lifecycle, cleanup } = services(adapter);
    await lifecycle.requestDeletion(a, asset._id);
    await cleanup.runOnce();
    let row = await get(asset._id);
    expect(row.status).toBe('delete_failed');
    expect(row.quotaSlot).toBeDefined();
    expect(row.deleteAttempts).toBe(1);
    expect(+row.nextAttemptAt).toBe(clock + 1000);
    advance(1001);
    await cleanup.runOnce();
    row = await get(asset._id);
    expect(row.status).toBe('deleted');
    expect(row.quotaSlot).toBeUndefined();
  },
);
it('ML-30/31 max attempts and exponential backoff prevent endless destroy', async () => {
  const asset = await upload();
  const destroy = vi.fn(async () => {
    throw new Error('secret raw provider details');
  });
  const { lifecycle, cleanup } = services(
    { ...storage, destroyImage: destroy },
    { ...refs },
    { MEDIA_CLEANUP_MAX_ATTEMPTS: 2 },
  );
  await lifecycle.requestDeletion(a, asset._id);
  await cleanup.runOnce();
  await cleanup.runOnce();
  expect(destroy).toHaveBeenCalledTimes(1);
  advance(1001);
  await cleanup.runOnce();
  expect(+(await get(asset._id)).nextAttemptAt).toBe(clock + 2000);
  advance();
  await cleanup.runOnce();
  expect(destroy).toHaveBeenCalledTimes(2);
  expect((await get(asset._id)).quotaSlot).toBeDefined();
});
it('ML-32/33/52 simultaneous workers claim once and preserve tombstone on retry', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  const destroy = vi.fn(storage.destroyImage);
  await Promise.all([
    services({ ...storage, destroyImage: destroy }).cleanup.runOnce(),
    services({ ...storage, destroyImage: destroy }).cleanup.runOnce(),
  ]);
  expect(destroy).toHaveBeenCalledTimes(1);
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('deleted');
});
it('ML-32 worker interrupted after provider success recovers from expired lease', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  await media.MediaAsset.updateOne(
    { _id: asset._id },
    {
      leaseToken: randomUUID(),
      leaseUntil: new Date(clock + 120000),
      deleteAttempts: 1,
    },
  );
  await storage.destroyImage({
    publicId: asset.cloudinary.publicId,
    resourceType: 'image',
    deliveryType: 'authenticated',
  });
  expect(await services().cleanup.runOnce()).toHaveLength(0);
  advance(120001);
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('deleted');
});
it('ML-34/35/36 expired cleanup bounded and no TTL or hard deletion', async () => {
  const first = await upload(),
    second = await upload();
  await expire(first);
  await expire(second);
  const result = await services().cleanup.runOnce({ limit: 1 });
  expect(result).toHaveLength(1);
  expect(await media.MediaAsset.countDocuments({ ownerId: a.user._id })).toBe(
    2,
  );
  expect(
    (await media.MediaAsset.collection.indexes()).some(
      (i) => i.expireAfterSeconds !== undefined,
    ),
  ).toBe(false);
});
it('ML-37 confirmed rejection keeps key, marks deleted, releases slot', async () => {
  const adapter = await createImageStorage(config, {
    faults: [
      {
        operation: 'upload',
        kind: 'error',
        error: new StorageError('STORAGE_REJECTED', 'rejected'),
      },
    ],
  });
  await expect(upload('avatar', a, adapter)).rejects.toMatchObject({
    status: 503,
  });
  advance();
  await services(adapter).cleanup.runOnce();
  const row = await media.MediaAsset.findOne({ ownerId: a.user._id });
  expect(row.status).toBe('deleted');
  expect(row.idempotencyKey).toBeTruthy();
  expect(row.quotaSlot).toBeUndefined();
});
it.each(['commit_timeout', 'invalid_response'])(
  'ML-38/39/40/43 confirmed inspection recovers %s without reupload',
  async (kind) => {
    const adapter = await createImageStorage(config, {
      faults: [{ operation: 'upload', kind }],
    });
    await expect(upload('avatar', a, adapter)).rejects.toBeDefined();
    const uploadSpy = vi.fn(adapter.uploadImage),
      destroySpy = vi.fn(adapter.destroyImage);
    advance();
    await services({
      ...adapter,
      uploadImage: uploadSpy,
      destroyImage: destroySpy,
    }).cleanup.runOnce();
    const row = await media.MediaAsset.findOne({ ownerId: a.user._id });
    expect(row.status).toBe('temporary');
    expect(row.uploadOutcome).toBe('confirmed');
    expect(row.quotaSlot).toBeDefined();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(destroySpy).not.toHaveBeenCalled();
  },
);
it('ML-41/42/44/45 restart fake missing metadata stays unknown and never releases slot', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  const restarted = await createImageStorage(config),
    destroy = vi.fn(restarted.destroyImage);
  await services({ ...restarted, destroyImage: destroy }).cleanup.runOnce();
  expect(destroy).not.toHaveBeenCalled();
  expect((await get(asset._id)).quotaSlot).toBeDefined();
  expect((await get(asset._id)).status).toBe('delete_failed');
});
it('ML-38/50 timeout before provider commit stays uncertain, no blind retry', async () => {
  const adapter = await createImageStorage(config, {
    faults: [{ operation: 'upload', kind: 'timeout' }],
  });
  await expect(upload('avatar', a, adapter)).rejects.toBeDefined();
  advance();
  await services(adapter).cleanup.runOnce();
  const row = await media.MediaAsset.findOne({ ownerId: a.user._id });
  expect(row.status).toBe('pending_upload');
  expect(row.quotaSlot).toBeDefined();
});
it('ML-46 duplicate inspected provider identity does not free quota or claim success', async () => {
  const first = await upload();
  const uncertain = await upload();
  await media.MediaAsset.updateOne(
    { _id: uncertain._id },
    {
      $set: { status: 'pending_upload', uploadOutcome: 'uncertain' },
      $unset: { 'cloudinary.assetId': 1, 'cloudinary.version': 1 },
    },
  );
  const inspected = await storage.inspectImage(
    {
      publicId: uncertain.cloudinary.publicId,
      resourceType: 'image',
      deliveryType: 'authenticated',
    },
    uncertain.assetFolder,
  );
  inspected.asset.providerAssetId = first.cloudinary.assetId;
  advance();
  await services({
    ...storage,
    inspectImage: async () => inspected,
  }).cleanup.runOnce();
  expect((await get(uncertain._id)).status).toBe('pending_upload');
  expect((await get(uncertain._id)).quotaSlot).toBeDefined();
});
it('ML-47/48/49/51/54 full quota, concurrent delete/upload and independent services preserve 20 slots', async () => {
  const assets = [];
  for (let i = 0; i < 20; i++) assets.push(await upload());
  await expect(upload()).rejects.toMatchObject({
    code: 'MEDIA_QUOTA_EXCEEDED',
  });
  await services().lifecycle.requestDeletion(a, assets[0]._id);
  await Promise.allSettled([services().cleanup.runOnce(), upload(), upload()]);
  const count = await media.MediaAsset.countDocuments({
    ownerId: a.user._id,
    quotaSlot: { $exists: true },
  });
  expect(count).toBeLessThanOrEqual(20);
  if (count < 20) await upload();
  expect(
    await media.MediaAsset.countDocuments({
      ownerId: a.user._id,
      quotaSlot: { $exists: true },
    }),
  ).toBe(20);
});
it('ML-53 future Recipe attachments are protected without a domain checker', async () => {
  const asset = await upload('recipe_cover');
  await media.MediaAsset.updateOne(
    { _id: asset._id },
    {
      status: 'attached',
      everAttached: true,
      attachedTo: { kind: 'recipe_cover', resourceId: a.user._id },
    },
  );
  await services().cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('attached');
});
it('ML-35/69 dry-run command does not mutate existing fake reservations', async () => {
  const asset = await upload();
  await expire(asset);
  const result = await runCleanupCommand(config, { dryRun: true, logger });
  expect(result.some((v) => v.assetId === String(asset._id))).toBe(true);
  expect((await get(asset._id)).status).toBe('temporary');
});
it('ML-70 production/live command blocked before provider or DB execution', async () => {
  await expect(
    runCleanupCommand({ ...config, MEDIA_PROVIDER: 'cloudinary' }, { logger }),
  ).rejects.toThrow('disabled');
  await expect(
    services(storage, refs, { NODE_ENV: 'production' }).cleanup.runOnce(),
  ).rejects.toThrow('disabled');
});
it('ML-69 worker logs contain only sanitized event, Mongo ID and outcome', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  const logged = [];
  const s = services();
  const worker = createMediaCleanup({
    MediaAsset: media.MediaAsset,
    storage: {
      ...storage,
      inspectImage: async () => {
        throw new Error('CANARY_CREDENTIAL_AND_PUBLIC_ID');
      },
    },
    service: s.service,
    lifecycle: s.lifecycle,
    references: refs,
    config,
    logger: { info: (...v) => logged.push(v) },
    now: () => new Date(clock),
  });
  await worker.runOnce();
  expect(JSON.stringify(logged)).not.toContain('CANARY');
  expect(JSON.stringify(logged)).not.toContain(asset.cloudinary.publicId);
  expect(logged[0][0]).toMatchObject({
    event: 'media_cleanup',
    outcome: 'retry_pending',
  });
});
it('ML-32 stop during provider delete drains active operation without claiming another', async () => {
  const first = await upload(),
    second = await upload();
  await services().lifecycle.requestDeletion(a, first._id);
  await services().lifecycle.requestDeletion(a, second._id);
  let resume, entered;
  const ready = new Promise((r) => {
    entered = r;
  });
  const destroy = vi.fn(async (ref) => {
    entered();
    await new Promise((r) => {
      resume = r;
    });
    return storage.destroyImage(ref);
  });
  const worker = services({ ...storage, destroyImage: destroy }).cleanup;
  const batch = worker.runOnce();
  await ready;
  const stopped = worker.stop();
  resume();
  await stopped;
  await batch;
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(
    await media.MediaAsset.countDocuments({
      ownerId: a.user._id,
      status: 'pending_delete',
    }),
  ).toBe(1);
});
it('ML-16/32 provider confirms delete but Mongo finalize fails; retry never frees quota early', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  const original = media.MediaAsset.findOneAndUpdate.bind(media.MediaAsset);
  const spy = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockImplementation((filter, update, opts) => {
      if (update.$set?.status === 'deleted')
        throw new Error('database finalize failed');
      return original(filter, update, opts);
    });
  try {
    await services().cleanup.runOnce();
  } finally {
    spy.mockRestore();
  }
  expect((await get(asset._id)).quotaSlot).toBeDefined();
  advance();
  await services().cleanup.runOnce();
  expect((await get(asset._id)).quotaSlot).toBeUndefined();
});
it('ML-70 deletion rejects disabled processing instead of promising an idle job', async () => {
  const asset = await upload();
  const s = services();
  const lifecycle = createMediaLifecycle({
    MediaAsset: media.MediaAsset,
    service: s.service,
    references: refs,
    config: { ...config, MEDIA_CLEANUP_ENABLED: false },
  });
  await expect(lifecycle.requestDeletion(a, asset._id)).rejects.toMatchObject({
    status: 503,
  });
  expect((await get(asset._id)).status).toBe('temporary');
});
it('ML-63 DELETE invalid IDs and provider outage never expose internal metadata', async () => {
  const bad = await client
    .delete('/api/v1/media/images/not-an-id')
    .set('X-CSRF-Token', token);
  expect(bad.status).toBe(400);
  const asset = await upload();
  const q = await client
    .delete(`/api/v1/media/images/${asset._id}`)
    .set('X-CSRF-Token', token);
  expect(q.status).toBe(202);
  expect(JSON.stringify(q.body)).not.toMatch(
    /publicId|cloudinary|idempotencyKey|leaseToken|quotaSlot/,
  );
});
it('ML-08/11/15 Recipe step adapter contract uses stable ID and prevents dual attachment (fixture only)', async () => {
  const asset = await upload('recipe_step');
  const state = { assetId: null, version: 0 };
  const t = {
    kind: 'recipe_step',
    resourceId: String(a.user._id),
    stepId: 'stable-step-1',
  };
  const fixture = {
    async read(target) {
      expect(target.stepId).toBe('stable-step-1');
      return { ...state };
    },
    async compareAndSwap(target, owner, version, id) {
      expect(target.stepId).toBe('stable-step-1');
      expect(String(owner)).toBe(String(a.user._id));
      if (state.version !== version) return false;
      state.assetId = id;
      state.version++;
      return true;
    },
    async fence(_target, _owner, version) {
      if (state.version === version) state.version++;
    },
    async isReferenced(row) {
      return String(state.assetId) === String(row._id);
    },
  };
  const s = services(storage, fixture);
  await s.lifecycle.attachMedia(a, {
    assetId: asset._id,
    target: t,
    expectedVersion: 0,
  });
  expect((await get(asset._id)).attachedTo.stepId).toBe('stable-step-1');
  await expect(
    s.lifecycle.attachMedia(a, {
      assetId: asset._id,
      target: { ...t, stepId: 'different-step' },
      expectedVersion: 1,
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it('ML-33 stale worker cannot finalize or clear a replacement lease after slow destroy', async () => {
  const asset = await upload();
  await services().lifecycle.requestDeletion(a, asset._id);
  let resume, entered;
  const ready = new Promise((r) => {
    entered = r;
  });
  const slow = {
    ...storage,
    async destroyImage(ref) {
      entered();
      await new Promise((r) => {
        resume = r;
      });
      return storage.destroyImage(ref);
    },
  };
  const old = services(slow).cleanup.runOnce();
  await ready;
  advance(120001);
  await services().cleanup.runOnce();
  resume();
  await old;
  const row = await get(asset._id);
  expect(row.status).toBe('deleted');
  expect(row.quotaSlot).toBeUndefined();
  expect(row.leaseToken).toBeNull();
});
it('ML-16 release write failure repairs from canonical reference without deleting old image', async () => {
  const asset = await upload();
  const s = services();
  await s.lifecycle.attachMedia(a, {
    assetId: asset._id,
    target: target(),
    expectedVersion: 0,
  });
  const original = media.MediaAsset.findOneAndUpdate.bind(media.MediaAsset);
  const spy = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockImplementation((filter, update, opts) => {
      if (update.$set?.status === 'temporary')
        throw new Error('Release failed');
      return original(filter, update, opts);
    });
  try {
    await expect(
      s.lifecycle.releaseMedia(a, {
        assetId: asset._id,
        target: target(),
        expectedVersion: 1,
      }),
    ).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect((await get(asset._id)).status).toBe('attached');
  await s.cleanup.runOnce();
  const row = await get(asset._id);
  expect(row.status).toBe('temporary');
  expect(row.quotaSlot).toBeDefined();
  expect(+row.expiresAt).toBe(clock + 30 * 86400000);
});
it('ML-43 legacy BE-08 reservation without lifecycle fields remains recoverable', async () => {
  const adapter = await createImageStorage(config, {
    faults: [{ operation: 'upload', kind: 'commit_timeout' }],
  });
  await expect(upload('avatar', a, adapter)).rejects.toBeDefined();
  const asset = await media.MediaAsset.findOne({ ownerId: a.user._id });
  await media.MediaAsset.collection.updateOne(
    { _id: asset._id },
    {
      $unset: {
        reconcileAttempts: 1,
        nextAttemptAt: 1,
        leaseToken: 1,
        leaseUntil: 1,
        attachmentIntent: 1,
        everAttached: 1,
      },
    },
  );
  advance();
  await services(adapter).cleanup.runOnce();
  expect((await get(asset._id)).status).toBe('temporary');
});
it('ML-55 stable pagination ties use descending ObjectId and owner-only total', async () => {
  const assets = [await upload(), await upload(), await upload()];
  await upload('avatar', b);
  await media.MediaAsset.collection.updateMany(
    { ownerId: a.user._id },
    { $set: { createdAt: new Date('2026-01-01T00:00:00Z') } },
  );
  const first = await client.get('/api/v1/me/media?page=1&limit=2'),
    second = await client.get('/api/v1/me/media?page=2&limit=2');
  expect(
    [...first.body.data, ...second.body.data].map((v) => v.assetId),
  ).toEqual(
    assets
      .map((v) => String(v._id))
      .sort()
      .reverse(),
  );
  expect(first.body.meta.total).toBe(3);
  expect(second.body.meta.total).toBe(3);
});
