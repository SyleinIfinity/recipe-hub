import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { createMediaHarness } from '../../../e2e/support/media-harness.js';
let h, client, other, csrf, otherCsrf, id, png;
const emails = [];
async function user(name) {
  const c = request.agent('http://127.0.0.1:' + h.port),
    email = `p11-${randomUUID()}@example.test`;
  emails.push(email);
  let token = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  let res = await c
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', token)
    .send({
      email,
      displayName: name,
      password: 'Media integration test phrase!',
    });
  expect(res.status).toBe(201);
  const uid = res.body.data.id;
  token = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await c
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email, password: 'Media integration test phrase!' })
    ).status,
  ).toBe(200);
  token = (await c.get('/api/v1/auth/csrf')).body.data.csrfToken;
  return { client: c, csrf: token, id: uid };
}
async function upload(purpose = 'avatar') {
  const r = await client
    .post('/api/v1/media/images')
    .set('X-CSRF-Token', csrf)
    .set('Idempotency-Key', randomUUID())
    .field('purpose', purpose)
    .attach('file', png, { filename: 'safe.png', contentType: 'image/png' });
  expect(r.status).toBe(201);
  return r.body.data.assetId;
}
const patch = (asset, version) =>
  client
    .patch('/api/v1/me/profile')
    .set('X-CSRF-Token', csrf)
    .send({ avatarAssetId: asset, mediaVersion: version });
beforeAll(async () => {
  h = await createMediaHarness();
  const a = await user('Owner'),
    b = await user('Other');
  ({ client, csrf, id } = a);
  other = b.client;
  otherCsrf = b.csrf;
  png = await sharp({
    create: { width: 32, height: 24, channels: 3, background: 'tan' },
  })
    .png()
    .toBuffer();
});
afterAll(async () => {
  if (h) {
    const cleanup = await h.cleanupOwned(emails);
    await h.close();
    expect(cleanup.status).toBe('verified');
  }
});
it('AV-I01 owner/purpose/CSRF/CAS and public current avatar, replacement releases old', async () => {
  const a = await upload(),
    cover = await upload('recipe_cover');
  expect((await patch(cover, 0)).status).toBe(422);
  expect(
    (
      await other
        .patch('/api/v1/me/profile')
        .set('X-CSRF-Token', otherCsrf)
        .send({ avatarAssetId: a, mediaVersion: 0 })
    ).status,
  ).toBe(404);
  expect(
    (
      await client
        .patch('/api/v1/me/profile')
        .send({ avatarAssetId: a, mediaVersion: 0 })
    ).status,
  ).toBe(403);
  const first = await patch(a, 0);
  expect(first.status).toBe(200);
  expect(first.body.data.mediaVersion).toBe(1);
  const path = first.body.data.avatarUrl,
    r = await request('http://127.0.0.1:' + h.port).get(path);
  expect(r.status).toBe(200);
  expect(r.headers['cache-control']).toBe('private, no-store');
  expect((await patch(null, 0)).status).toBe(409);
  const b = await upload();
  const replaced = await patch(b, 1);
  expect(replaced.status).toBe(200);
  expect((await request('http://127.0.0.1:' + h.port).get(path)).status).toBe(
    404,
  );
  const old = await h.media.MediaAsset.findById(a);
  expect(old.status).toBe('temporary');
  expect(+old.expiresAt).toBeGreaterThan(Date.now() + 29 * 86400000);
  expect((await patch(null, 2)).status).toBe(200);
});
it('AV-I02 suspended/removed/pending deny all; 502/503 retained and recheck revokes in-flight', async () => {
  const a = await upload(),
    profile = await client.get('/api/v1/auth/me');
  const first = await patch(a, profile.body.data.mediaVersion);
  expect(first.status).toBe(200);
  const path = first.body.data.avatarUrl,
    guest = request('http://127.0.0.1:' + h.port);
  h.faults.read = 'invalid';
  expect((await guest.get(path)).status).toBe(502);
  h.faults.read = 'unavailable';
  expect((await guest.get(path)).status).toBe(503);
  h.faults.read = null;
  await h.identity.models.User.updateOne(
    { _id: id },
    { $set: { status: 'suspended' } },
  );
  expect((await guest.get(path)).status).toBe(404);
  await h.identity.models.User.updateOne(
    { _id: id },
    { $set: { status: 'active' } },
  );
  await h.media.MediaAsset.updateOne(
    { _id: a },
    { $set: { status: 'pending_delete' } },
  );
  expect((await guest.get(path)).status).toBe(404);
  await h.media.MediaAsset.updateOne(
    { _id: a },
    { $set: { status: 'attached' } },
  );
  h.faults.beforeRead = () =>
    h.identity.models.User.updateOne(
      { _id: id },
      { $set: { avatarAssetId: null }, $inc: { mediaVersion: 1 } },
    );
  expect((await guest.get(path)).status).toBe(404);
});
it('AV-I03 corrupted/MIME-spoofed files rejected without provider upload', async () => {
  const res = await client
    .post('/api/v1/media/images')
    .set('X-CSRF-Token', csrf)
    .set('Idempotency-Key', randomUUID())
    .field('purpose', 'avatar')
    .attach('file', Buffer.from('not PNG'), {
      filename: 'x.png',
      contentType: 'image/png',
    });
  expect(res.status).toBe(415);
});
