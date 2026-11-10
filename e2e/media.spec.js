import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
const origin = 'http://127.0.0.1:3101';
test('MED-57/64 Firefox Swagger multipart file and purpose with cookie/CSRF', async ({
  page,
}) => {
  test.setTimeout(60000);
  const email = `media-browser-${randomUUID()}@example.test`,
    password = 'Media browser fixture phrase';
  const db = createDatabase(
    parseEnv({
      NODE_ENV: 'test',
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI:
        process.env.TEST_MONGODB_URI ||
        'mongodb://127.0.0.1:27018/recipe-hub-test',
    }),
  );
  await db.connect();
  const external = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(origin)) external.push(r.url());
  });
  try {
    await page.goto(`${origin}/api/docs`);
    // Login through same-origin HTTP; upload itself is executed by Swagger UI controls.
    const token = await page.evaluate(
      async ({ email, password }) => {
        const csrf = async () =>
          (await (await fetch('/api/v1/auth/csrf')).json()).data.csrfToken;
        const post = async (path, body) =>
          fetch(path, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': await csrf(),
            },
            body: JSON.stringify(body),
          });
        if (
          (
            await post('/api/v1/auth/register', {
              email,
              password,
              displayName: 'Media Browser',
            })
          ).status !== 201
        )
          throw new Error('Register failed');
        if (
          (await post('/api/v1/auth/login', { email, password })).status !== 200
        )
          throw new Error('Login failed');
        return csrf();
      },
      { email, password },
    );
    const block = page.locator('#operations-Media-uploadImage');
    await block.locator('.opblock-summary').click();
    await block
      .getByRole('button', { name: 'Try it out', exact: true })
      .click();
    await block.locator('input[placeholder="X-CSRF-Token"]').fill(token);
    await block
      .locator('input[placeholder="Idempotency-Key"]')
      .fill(randomUUID());
    await block.locator('input[type="file"]').setInputFiles({
      name: 'fixture.png',
      mimeType: 'image/png',
      buffer: await sharp({
        create: { width: 32, height: 24, channels: 3, background: 'red' },
      })
        .png()
        .toBuffer(),
    });
    await block
      .locator('select')
      .filter({ has: page.locator('option[value="recipe_cover"]') })
      .selectOption('recipe_cover');
    const pending = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/v1/media/images' &&
        r.request().method() === 'POST',
    );
    await block.getByRole('button', { name: 'Execute', exact: true }).click();
    const response = await pending;
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data).toMatchObject({
      url: null,
      purpose: 'recipe_cover',
      width: 32,
      height: 24,
      status: 'temporary',
    });
    expect(response.request().headers()['content-type']).toContain(
      'multipart/form-data; boundary=',
    );
    expect(JSON.stringify(body)).not.toMatch(/cloudinary|publicId|secret/);
    expect(external).toEqual([]);
  } finally {
    const users = await db.connection
      .collection('user')
      .find({ email })
      .toArray();
    const ids = users.map((u) => u._id);
    await db.connection
      .collection('media_assets')
      .deleteMany({ ownerId: { $in: ids } });
    await db.connection
      .collection('auth_sessions')
      .deleteMany({ userId: { $in: ids } });
    await db.connection.collection('user').deleteMany({ email });
    await db.close();
  }
});

test('ML-65/68 Firefox Swagger list/delete, ownership, CSRF and worker completion', async ({
  page,
}) => {
  test.setTimeout(90000);
  const email = `lifecycle-browser-${randomUUID()}@example.test`,
    password = 'Lifecycle browser phrase!';
  const db = createDatabase(
    parseEnv({
      NODE_ENV: 'test',
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI:
        process.env.TEST_MONGODB_URI ||
        'mongodb://127.0.0.1:27018/recipe-hub-test',
    }),
  );
  await db.connect();
  try {
    await page.goto(`${origin}/api/docs`);
    const bytes = (
      await sharp({
        create: { width: 12, height: 10, channels: 3, background: 'blue' },
      })
        .png()
        .toBuffer()
    ).toString('base64');
    const fixture = await page.evaluate(
      async ({ email, password, bytes }) => {
        const csrf = async () =>
          (await (await fetch('/api/v1/auth/csrf')).json()).data.csrfToken;
        const post = async (path, body) =>
          fetch(path, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': await csrf(),
            },
            body: JSON.stringify(body),
          });
        const other = await (
          await post('/api/v1/auth/register', {
            email: `other-${email}`,
            password,
            displayName: 'Other Browser',
          })
        ).json();
        const registered = await (
          await post('/api/v1/auth/register', {
            email,
            password,
            displayName: 'Lifecycle Browser',
          })
        ).json();
        if (
          (await post('/api/v1/auth/login', { email, password })).status !== 200
        )
          throw new Error('Login failed');
        const token = await csrf();
        const upload = async () => {
          const form = new FormData();
          form.append('purpose', 'avatar');
          form.append(
            'file',
            new Blob([Uint8Array.from(atob(bytes), (v) => v.charCodeAt(0))], {
              type: 'image/png',
            }),
            'image.png',
          );
          const res = await fetch('/api/v1/media/images', {
            method: 'POST',
            headers: {
              'X-CSRF-Token': token,
              'Idempotency-Key': crypto.randomUUID(),
            },
            body: form,
          });
          if (res.status !== 201) throw new Error('Upload failed');
          return (await res.json()).data.assetId;
        };
        return {
          token,
          userId: registered.data.id,
          otherId: other.data.id,
          temporary: await upload(),
          inUse: await upload(),
          otherAsset: await upload(),
        };
      },
      { email, password, bytes },
    );
    const users = db.connection.collection('user'),
      assets = db.connection.collection('media_assets');
    const owner = await users.findOne({ email }),
      other = await users.findOne({ email: `other-${email}` });
    const rows = await assets.find({ ownerId: owner._id }).toArray();
    const owned = rows.find((r) => String(r._id) === fixture.inUse);
    await users.updateOne(
      { _id: owner._id },
      { $set: { avatarAssetId: owned._id } },
    );
    await assets.updateOne(
      { _id: rows.find((r) => String(r._id) === fixture.otherAsset)._id },
      { $set: { ownerId: other._id } },
    );
    const list = page.locator('#operations-Media-listOwnMedia');
    await list.locator('.opblock-summary').click();
    await list.getByRole('button', { name: 'Try it out', exact: true }).click();
    const listing = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/v1/me/media' &&
        r.request().method() === 'GET',
    );
    await list.getByRole('button', { name: 'Execute', exact: true }).click();
    const result = await listing;
    expect(result.status()).toBe(200);
    expect((await result.json()).data).toHaveLength(2);
    const block = page.locator('#operations-Media-deleteMediaImage');
    await block.locator('.opblock-summary').click();
    await block
      .getByRole('button', { name: 'Try it out', exact: true })
      .click();
    const run = async (id, csrf) => {
      await block.locator('input[placeholder="assetId"]').fill(id);
      await block.locator('input[placeholder="X-CSRF-Token"]').fill(csrf);
      const response = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === `/api/v1/media/images/${id}` &&
          r.request().method() === 'DELETE',
      );
      await block.getByRole('button', { name: 'Execute', exact: true }).click();
      return response;
    };
    expect((await run(fixture.temporary, 'invalid')).status()).toBe(403);
    expect((await run(fixture.otherAsset, fixture.token)).status()).toBe(404);
    expect((await run(fixture.inUse, fixture.token)).status()).toBe(409);
    const queued = await run(fixture.temporary, fixture.token);
    expect(queued.status()).toBe(202);
    expect((await queued.json()).data).toMatchObject({
      status: 'pending_delete',
      url: null,
    });
    await expect
      .poll(
        async () => {
          const rows = await assets.find({ ownerId: owner._id }).toArray();
          return rows.find((r) => String(r._id) === fixture.temporary)?.status;
        },
        { timeout: 30000, intervals: [1000] },
      )
      .toBe('deleted');
    expect((await run(fixture.temporary, fixture.token)).status()).toBe(200);
  } finally {
    const users = await db.connection
      .collection('user')
      .find({ email: { $in: [email, `other-${email}`] } })
      .toArray();
    const ids = users.map((u) => u._id);
    await db.connection
      .collection('media_assets')
      .deleteMany({ ownerId: { $in: ids } });
    await db.connection
      .collection('auth_sessions')
      .deleteMany({ userId: { $in: ids } });
    await db.connection.collection('user').deleteMany({ _id: { $in: ids } });
    await db.close();
  }
});
