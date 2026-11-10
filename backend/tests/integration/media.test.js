import { beforeAll, afterAll, afterEach, it, expect, vi } from 'vitest';
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
import { createImageStorage } from '../../src/integrations/image-storage/index.js';
import { createApp } from '../../src/app.js';
import { MiB } from '../../src/modules/media/media.validation.js';
import { loadSpec } from '../../src/openapi/docs.js';
import { schemaValidator } from '../../../scripts/openapi-contract.js';
const config = parseEnv({
  NODE_ENV: 'test',
  MEDIA_UPLOAD_RATE_LIMIT: 1000,
  SMTP_ENABLED: 'false',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
  IMAGE_STORAGE_TIMEOUT_MS: 100,
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  prefix = `media-${randomUUID()}`;
let identity, media, app, user, actor, otherActor, token, storage, png;
const ids = [];
const spec = loadSpec(),
  validates = schemaValidator(spec);
async function csrf(client) {
  return (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
}
async function makeUser(label) {
  const client = request.agent(app),
    email = `${prefix}-${label}@example.test`,
    password = 'Media fixture password!';
  let t = await csrf(client);
  const res = await client
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', t)
    .send({ email, password, displayName: 'Media Test' });
  expect(res.status).toBe(201);
  ids.push(res.body.data.id);
  t = await csrf(client);
  expect(
    (
      await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', t)
        .send({ email, password })
    ).status,
  ).toBe(200);
  return {
    client,
    actor: {
      user: await identity.models.User.findById(res.body.data.id).select(
        '+authVersion',
      ),
    },
  };
}
function upload({
  client = user,
  key = randomUUID(),
  csrfToken = token,
  purpose = 'recipe_cover',
  buffer = png,
  mime = 'image/png',
  field = 'file',
  url = '/api/v1/media/images',
} = {}) {
  return client
    .post(url)
    .set('X-CSRF-Token', csrfToken)
    .set('Idempotency-Key', key)
    .field('purpose', purpose)
    .attach(field, buffer, { filename: 'untrusted.png', contentType: mime });
}
function service(adapter = storage) {
  return createMediaService({
    MediaAsset: media.MediaAsset,
    storage: adapter,
    config,
  });
}
const raw = () => ({ buffer: png, mime: 'image/png' });
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
  });
  app = createApp({ identity, media, config, logger, isReady: db.isReady });
  const u = await makeUser('owner');
  user = u.client;
  actor = u.actor;
  otherActor = (await makeUser('other')).actor;
  token = await csrf(user);
  png = await sharp({
    create: { width: 24, height: 18, channels: 3, background: 'blue' },
  })
    .png()
    .toBuffer();
});
afterEach(async () => {
  if (media) await media.MediaAsset.deleteMany({ ownerId: { $in: ids } });
});
afterAll(async () => {
  expect(https.request).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  if (identity) {
    await identity.models.Session.deleteMany({ userId: { $in: ids } });
    await identity.models.User.deleteMany({ _id: { $in: ids } });
  }
  await db.close();
});
it('MED-01/03/04 guest and invalid CSRF cannot upload', async () => {
  const guest = request.agent(app);
  expect(
    (await upload({ client: guest, csrfToken: await csrf(guest) })).status,
  ).toBe(401);
  for (const csrfToken of ['', 'wrong'])
    expect((await upload({ csrfToken })).status).toBe(403);
  expect(
    await media.MediaAsset.countDocuments({ ownerId: actor.user._id }),
  ).toBe(0);
});
it('MED-02 suspended session cannot upload', async () => {
  await identity.models.User.updateOne(
    { _id: actor.user._id },
    { status: 'suspended' },
  );
  try {
    expect((await upload()).status).toBe(401);
  } finally {
    await identity.models.User.updateOne(
      { _id: actor.user._id },
      { status: 'active' },
    );
  }
});
it.each(['jpeg', 'png', 'webp'])(
  'MED-05/07..09/24..29/35/45..51 persists private %s with decoded metadata',
  async (format) => {
    const buffer = await sharp(png).toFormat(format).toBuffer();
    const res = await upload({ buffer, mime: `image/${format}` });
    expect(res.status).toBe(201);
    validates(
      spec.paths['/api/v1/media/images'].post.responses[201].content[
        'application/json'
      ].schema,
      res.body,
    );
    expect(res.body.data).toMatchObject({
      url: null,
      status: 'temporary',
      width: 24,
      height: 18,
      format: format === 'jpeg' ? 'jpg' : format,
    });
    const record = await media.MediaAsset.findById(res.body.data.assetId);
    expect(record.ownerId.toString()).toBe(actor.user._id.toString());
    expect(record.cloudinary.deliveryType).toBe('authenticated');
    expect(record.assetFolder).toBe('recipe-hub/recipes/covers');
    expect(record.cloudinary.publicId).toMatch(/^[a-f0-9-]{36}$/);
    expect(
      record.expiresAt.getTime() - record.createdAt.getTime(),
    ).toBeGreaterThan(86300000);
    expect(JSON.stringify(res.body)).not.toMatch(
      /cloudinary|publicId|providerAssetId|quotaSlot|fingerprint|idempotencyKey/,
    );
  },
);
it.each(['ownerId', 'publicId', 'assetFolder', 'secureUrl', 'status', '$set'])(
  'MED-06/22/50 rejects protected multipart field %s',
  async (name) => {
    const res = await upload().field(name, 'injected');
    expect(res.status).toBe(400);
    expect(
      await media.MediaAsset.countDocuments({ ownerId: actor.user._id }),
    ).toBe(0);
  },
);
it('MED-10 rejects missing file', async () => {
  expect(
    (
      await user
        .post('/api/v1/media/images')
        .set('X-CSRF-Token', token)
        .set('Idempotency-Key', randomUUID())
        .field('purpose', 'avatar')
    ).status,
  ).toBe(400);
});
it('MED-11 rejects multiple files', async () => {
  expect((await upload().attach('file', png, 'second.png')).status).toBe(400);
});
it('MED-12 empty file rejected', async () => {
  expect((await upload({ buffer: Buffer.alloc(0) })).status).toBe(415);
});
it.each([
  ['image/svg+xml', '<svg/>'],
  ['image/gif', 'GIF89a'],
  ['application/pdf', '%PDF'],
  ['image/png', '<script>bad</script>'],
])('MED-13..15 rejects %s', async (mime, body) => {
  expect((await upload({ mime, buffer: Buffer.from(body) })).status).toBe(415);
});
it('MED-16 corrupt signature-only PNG rejected', async () => {
  expect((await upload({ buffer: png.subarray(0, 40) })).status).toBe(415);
});
it.each(['avatar', 'recipe_cover', 'recipe_step'])(
  'MED-17..19 multipart %s oversize rejected early',
  async (purpose) => {
    expect(
      (
        await upload({
          purpose,
          buffer: Buffer.alloc((purpose === 'avatar' ? 2 : 5) * MiB + 1),
        })
      ).status,
    ).toBe(413);
  },
);
it('MED-20 pixel limit enforced over HTTP', async () => {
  const buffer = await sharp({
    create: { width: 5000, height: 4001, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer();
  expect((await upload({ buffer })).status).toBe(422);
});
it('MED-21 missing or invalid purpose', async () => {
  expect((await upload({ purpose: 'bad' })).status).toBe(422);
  expect(
    (
      await user
        .post('/api/v1/media/images')
        .set('X-CSRF-Token', token)
        .set('Idempotency-Key', randomUUID())
        .attach('file', png, 'a.png')
    ).status,
  ).toBe(422);
});
it('MED-22 rejects unexpected file field', async () => {
  expect((await upload({ field: 'image' })).status).toBe(400);
});
it.each(['multipart/form-data', 'multipart/form-data; boundary=broken'])(
  'MED-23 malformed boundary %s',
  async (type) => {
    expect(
      (
        await user
          .post('/api/v1/media/images')
          .set('X-CSRF-Token', token)
          .set('Idempotency-Key', randomUUID())
          .set('Content-Type', type)
          .send(
            '--broken\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\nContent-Type: image/png\r\n\r\ntruncated',
          )
      ).status,
    ).toBe(400);
  },
);
it('MED-25/30/34 real indexes unique, partial and no TTL', async () => {
  expect(media.MediaAsset.collection.name).toBe('media_assets');
  const indexes = await media.MediaAsset.collection.indexes();
  expect(indexes.some((i) => i.expireAfterSeconds !== undefined)).toBe(false);
  expect(
    indexes.find((i) => i.key['cloudinary.assetId']).partialFilterExpression,
  ).toBeDefined();
  const a = await service().uploadImage(actor, raw(), 'avatar', randomUUID());
  const duplicate = a.toObject();
  delete duplicate._id;
  duplicate.idempotencyKey = randomUUID();
  duplicate.quotaSlot = 1;
  await expect(media.MediaAsset.create(duplicate)).rejects.toMatchObject({
    code: 11000,
  });
});
it('MED-31/42 concurrent duplicate key calls provider once, then replays same asset', async () => {
  const spy = vi.fn(storage.uploadImage),
    key = randomUUID(),
    svc = service({ ...storage, uploadImage: spy });
  const results = await Promise.allSettled([
    svc.uploadImage(actor, raw(), 'avatar', key),
    svc.uploadImage(actor, raw(), 'avatar', key),
  ]);
  expect(spy).toHaveBeenCalledTimes(1);
  expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
  const replay = await svc.uploadImage(actor, raw(), 'avatar', key);
  expect(spy).toHaveBeenCalledTimes(1);
  expect(
    await media.MediaAsset.countDocuments({ ownerId: actor.user._id }),
  ).toBe(1);
  await expect(
    svc.uploadImage(actor, raw(), 'recipe_cover', key),
  ).rejects.toMatchObject({ status: 409 });
  expect(replay.status).toBe('temporary');
});
it('MED-32/33 24 concurrent reservations across service instances never exceed 20 slots', async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 24 }, () =>
      service().uploadImage(actor, raw(), 'avatar', randomUUID()),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(20);
  expect(
    results
      .filter((r) => r.status === 'rejected')
      .every((r) => r.reason.status === 429),
  ).toBe(true);
  expect(
    await media.MediaAsset.countDocuments({ ownerId: actor.user._id }),
  ).toBe(20);
});
it.each([
  ['error', { http_code: 400, message: 'secret provider credential' }],
  ['timeout'],
  ['commit_timeout'],
  ['invalid_response'],
])(
  'MED-36..38/41/43 provider %s persists recovery identity',
  async (kind, error) => {
    const fake = await createImageStorage(config, {
      faults: [{ operation: 'upload', kind, error }],
    });
    const spy = vi.fn(fake.uploadImage),
      svc = service({ ...fake, uploadImage: spy }),
      key = randomUUID();
    await expect(
      svc.uploadImage(actor, raw(), 'avatar', key),
    ).rejects.toMatchObject({ status: 503 });
    const record = await media.MediaAsset.findOne({
      ownerId: actor.user._id,
      idempotencyKey: key,
    });
    expect(record.status).toBe('pending_upload');
    expect(record.cloudinary.publicId).toBeDefined();
    expect(record.uploadOutcome).toBe(
      kind === 'error' ? 'rejected' : 'uncertain',
    );
    expect(record.quotaSlot === undefined).toBe(kind === 'error');
    await expect(
      svc.uploadImage(actor, raw(), 'avatar', key),
    ).rejects.toMatchObject({ status: 409 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(record)).not.toContain('secret provider credential');
  },
);
it('MED-39 reservation failure never calls provider', async () => {
  const fail = vi
    .spyOn(media.MediaAsset.collection, 'insertOne')
    .mockRejectedValueOnce(new Error('private db'));
  const spy = vi.fn(storage.uploadImage);
  try {
    await expect(
      service({ ...storage, uploadImage: spy }).uploadImage(
        actor,
        raw(),
        'avatar',
        randomUUID(),
      ),
    ).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  } finally {
    fail.mockRestore();
  }
});
it('MED-40 finalize failure retains reservation and no blind destroy or success', async () => {
  const fail = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockRejectedValueOnce(new Error('private db'));
  const destroy = vi.fn(storage.destroyImage),
    key = randomUUID();
  try {
    await expect(
      service({ ...storage, destroyImage: destroy }).uploadImage(
        actor,
        raw(),
        'avatar',
        key,
      ),
    ).rejects.toMatchObject({ status: 500 });
    const record = await media.MediaAsset.findOne({ idempotencyKey: key });
    expect(record.status).toBe('pending_upload');
    expect(record.uploadOutcome).toBe('uncertain');
    expect(record.lastErrorCode).toBe('STORAGE_DATABASE_FINALIZE');
    expect(destroy).not.toHaveBeenCalled();
  } finally {
    fail.mockRestore();
  }
});
it('MED-52/53 owned internal read denies cross-user and no GET media endpoint', async () => {
  const asset = await service().uploadImage(
    actor,
    raw(),
    'avatar',
    randomUUID(),
  );
  await expect(
    service().getOwnedMediaMetadata(otherActor, String(asset._id)),
  ).rejects.toMatchObject({ status: 404 });
  expect(
    (await service().getOwnedMediaMetadata(actor, String(asset._id)))._id,
  ).toEqual(asset._id);
  expect((await user.get(`/api/v1/media/images/${asset._id}`)).status).toBe(
    404,
  );
});
it('MED-54 raw DB errors sanitized over HTTP', async () => {
  const fail = vi
    .spyOn(media.MediaAsset.collection, 'insertOne')
    .mockRejectedValueOnce(new Error('PRIVATE DATABASE SECRET'));
  try {
    const res = await upload();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
  } finally {
    fail.mockRestore();
  }
});
it('MED-55 rejects public/fixed/unresolved/live before adapter', async () => {
  for (const changed of [
    { IMAGE_DELIVERY_POLICY: 'public' },
    { IMAGE_DELIVERY_POLICY: 'unresolved' },
    { CLOUDINARY_FOLDER_MODE: 'fixed' },
    { MEDIA_PROVIDER: 'cloudinary' },
  ]) {
    const spy = vi.fn(storage.uploadImage),
      svc = createMediaService({
        MediaAsset: media.MediaAsset,
        storage: { ...storage, uploadImage: spy },
        config: { ...config, ...changed },
      });
    await expect(
      svc.uploadImage(actor, raw(), 'avatar', randomUUID()),
    ).rejects.toMatchObject({ status: 503 });
    expect(spy).not.toHaveBeenCalled();
  }
});
it('MED-42 HTTP retry same key returns same DTO without additional rows', async () => {
  const key = randomUUID(),
    a = await upload({ key }),
    b = await upload({ key });
  expect(a.status).toBe(201);
  expect(b.status).toBe(201);
  expect(b.body).toEqual(a.body);
});
it('MED-23 query, remote URL and bad key rejected', async () => {
  expect((await upload({ url: '/api/v1/media/images?ownerId=x' })).status).toBe(
    400,
  );
  expect((await upload({ key: 'bad' })).status).toBe(400);
  expect(
    (
      await user
        .post('/api/v1/media/images')
        .set('X-CSRF-Token', token)
        .set('Idempotency-Key', randomUUID())
        .field('purpose', 'avatar')
        .field('file', 'https://example.test/a.png')
    ).status,
  ).toBe(400);
});
it('MED-rate rate limit happens before provider', async () => {
  const limited = await createMedia({
    connection: db.connection,
    identity,
    config: { ...config, MEDIA_UPLOAD_RATE_LIMIT: 30 },
    storage,
  });
  const limitedApp = createApp({ identity, media: limited, config, logger });
  const session = await identity.sessions.create(actor.user);
  const client = request.agent(limitedApp);
  const cookie = `${identity.security.sessionCookie}=${session.token}`;
  const t = (await client.get('/api/v1/auth/csrf').set('Cookie', cookie)).body
    .data.csrfToken;
  for (let i = 0; i < 30; i++)
    expect(
      (
        await client
          .post('/api/v1/media/images')
          .set('Cookie', cookie)
          .set('X-CSRF-Token', t)
          .set('Idempotency-Key', 'invalid')
      ).status,
    ).toBe(400);
  expect(
    (
      await client
        .post('/api/v1/media/images')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', t)
        .set('Idempotency-Key', randomUUID())
    ).status,
  ).toBe(429);
  expect((await request(limitedApp).get('/health/live')).status).toBe(200);
});
it('MED-30 distinct public IDs cannot claim one provider asset identity', async () => {
  const a = await service().uploadImage(actor, raw(), 'avatar', randomUUID());
  const duplicate = a.toObject();
  delete duplicate._id;
  duplicate.cloudinary.publicId = randomUUID();
  duplicate.idempotencyKey = randomUUID();
  duplicate.quotaSlot = 1;
  await expect(media.MediaAsset.create(duplicate)).rejects.toMatchObject({
    code: 11000,
  });
});
it('MED-34 expiry does not delete registry or release quota without cleanup', async () => {
  const asset = await service().uploadImage(
    actor,
    raw(),
    'avatar',
    randomUUID(),
  );
  await media.MediaAsset.updateOne(
    { _id: asset._id },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
  await expect(
    service().uploadImage(actor, raw(), 'avatar', asset.idempotencyKey),
  ).rejects.toMatchObject({ status: 409 });
  const record = await media.MediaAsset.findById(asset._id);
  expect(record.quotaSlot).toBe(0);
  expect(record.status).toBe('temporary');
});
it('MED-40 failed outcome write still leaves durable UUID and blocks retry', async () => {
  const finalize = vi
    .spyOn(media.MediaAsset, 'findOneAndUpdate')
    .mockRejectedValueOnce(new Error('db unavailable'));
  const outcome = vi
    .spyOn(media.MediaAsset, 'updateOne')
    .mockRejectedValueOnce(new Error('still unavailable'));
  const key = randomUUID();
  try {
    await expect(
      service().uploadImage(actor, raw(), 'avatar', key),
    ).rejects.toMatchObject({ status: 500 });
    const record = await media.MediaAsset.findOne({ idempotencyKey: key });
    expect(record.uploadOutcome).toBe('pending');
    expect(record.cloudinary.publicId).toBeDefined();
    await expect(
      service().uploadImage(actor, raw(), 'avatar', key),
    ).rejects.toMatchObject({ status: 409 });
  } finally {
    finalize.mockRestore();
    outcome.mockRestore();
  }
});
it('MED-49/54 HTTP provider errors and request logs omit binary, key and raw exception', async () => {
  const log = [];
  const captured = createLogger('info', { write: (line) => log.push(line) });
  const fake = await createImageStorage(config, {
    faults: [
      {
        operation: 'upload',
        kind: 'error',
        error: { http_code: 500, message: 'RAW_PRIVATE_PROVIDER_SECRET' },
      },
    ],
  });
  const failed = await createMedia({
    connection: db.connection,
    identity,
    config,
    storage: fake,
  });
  const failApp = createApp({
    identity,
    media: failed,
    config,
    logger: captured,
  });
  const session = await identity.sessions.create(actor.user);
  const client = request.agent(failApp),
    cookie = `${identity.security.sessionCookie}=${session.token}`;
  const t = (await client.get('/api/v1/auth/csrf').set('Cookie', cookie)).body
    .data.csrfToken;
  const key = randomUUID();
  const res = await client
    .post('/api/v1/media/images')
    .set('Cookie', cookie)
    .set('X-CSRF-Token', t)
    .set('Idempotency-Key', key)
    .field('purpose', 'avatar')
    .attach('file', png, 'secret-filename.png');
  expect(res.status).toBe(503);
  validates(
    spec.paths['/api/v1/media/images'].post.responses[503].content[
      'application/json'
    ].schema,
    res.body,
  );
  const text = log.join('') + JSON.stringify(res.body);
  for (const secret of [
    session.token,
    t,
    key,
    'RAW_PRIVATE_PROVIDER_SECRET',
    'secret-filename.png',
    png.toString('base64'),
  ])
    expect(text).not.toContain(secret);
});
it('MED-45/51 all purposes use private dynamic folder mapping', async () => {
  for (const [purpose, path] of [
    ['avatar', 'avatars'],
    ['recipe_cover', 'recipes/covers'],
    ['recipe_step', 'recipes/steps'],
  ]) {
    const asset = await service().uploadImage(
      actor,
      raw(),
      purpose,
      randomUUID(),
    );
    expect(asset.assetFolder).toBe(`recipe-hub/${path}`);
    expect(asset.cloudinary.publicId).not.toContain('/');
    expect(asset.cloudinary.deliveryType).toBe('authenticated');
  }
});
it('MED-model rejects temporary state without confirmed provider metadata', async () => {
  const a = await service().uploadImage(actor, raw(), 'avatar', randomUUID());
  const record = a.toObject();
  delete record._id;
  delete record.cloudinary.assetId;
  await expect(media.MediaAsset.create(record)).rejects.toMatchObject({
    name: 'ValidationError',
  });
});
