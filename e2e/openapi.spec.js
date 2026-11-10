import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
const origin = 'http://127.0.0.1:3101';
test('DOC-17..20/24 Firefox Swagger manual cookie/CSRF flow and permissions', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const prefix = `swagger-${randomUUID()}`,
    email = `${prefix}@example.test`,
    password = 'Swagger fixture passphrase';
  const config = parseEnv({
    NODE_ENV: 'test',
    DB_NAME: 'recipe-hub-test',
    MONGODB_URI:
      process.env.TEST_MONGODB_URI ||
      'mongodb://127.0.0.1:27018/recipe-hub-test',
  });
  const db = createDatabase(config);
  await db.connect();
  const consoleErrors = [],
    external = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('request', (req) => {
    if (!req.url().startsWith(origin)) external.push(req.url());
  });
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.cspViolations.push(event.violatedDirective),
    );
  });
  const started = new Set();
  async function execute(tag, op, method, path, { body, token } = {}) {
    const block = page.locator(`#operations-${tag}-${op}`);
    if (!started.has(op)) {
      await block.locator('.opblock-summary').click();
      await block
        .getByRole('button', { name: 'Try it out', exact: true })
        .click();
      started.add(op);
    }
    if (token !== undefined)
      await block.locator('input[placeholder="X-CSRF-Token"]').fill(token);
    if (body !== undefined)
      await block
        .locator('textarea.body-param__text')
        .fill(JSON.stringify(body));
    const response = page.waitForResponse(
      (res) =>
        new URL(res.url()).pathname === path &&
        res.request().method() === method,
    );
    await block.getByRole('button', { name: 'Execute', exact: true }).click();
    return await response;
  }
  try {
    await page.goto(`${origin}/api/docs`);
    await expect(page).toHaveTitle('Recipe Hub API Documentation');
    for (const tag of ['Health', 'Auth', 'Users', 'Categories', 'Ingredients'])
      await expect(
        page.locator(`.opblock-tag[data-tag="${tag}"]`),
      ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Authorize', exact: true }),
    ).toHaveCount(0);
    expect(
      (await execute('Health', 'getLiveness', 'GET', '/health/live')).status(),
    ).toBe(200);
    expect(
      (
        await execute(
          'Categories',
          'listCategories',
          'GET',
          '/api/v1/categories',
        )
      ).status(),
    ).toBe(200);
    async function csrf() {
      const response = await execute(
        'Auth',
        'getCsrf',
        'GET',
        '/api/v1/auth/csrf',
      );
      expect(response.status()).toBe(200);
      return (await response.json()).data.csrfToken;
    }
    const token = await csrf();
    expect(
      (
        await execute('Auth', 'register', 'POST', '/api/v1/auth/register', {
          token,
          body: { email, password, displayName: 'Swagger Test' },
        })
      ).status(),
    ).toBe(201);
    const prelogin = await csrf();
    expect(
      (
        await execute('Auth', 'login', 'POST', '/api/v1/auth/login', {
          token: prelogin,
          body: { email, password },
        })
      ).status(),
    ).toBe(200);
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'recipe-hub-session')?.httpOnly).toBe(
      true,
    );
    expect(
      (
        await execute('Users', 'updateProfile', 'PATCH', '/api/v1/me/profile', {
          token: prelogin,
          body: { bio: 'stale' },
        })
      ).status(),
    ).toBe(403);
    const fresh = await csrf();
    expect(
      (
        await execute('Users', 'updateProfile', 'PATCH', '/api/v1/me/profile', {
          token: fresh,
          body: { bio: 'Swagger profile' },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await execute(
          'Categories',
          'createCategory',
          'POST',
          '/api/v1/admin/categories',
          { token: fresh, body: { name: prefix } },
        )
      ).status(),
    ).toBe(403);
    await db.connection
      .collection('user')
      .updateOne({ email }, { $set: { role: 'admin' } });
    expect(
      (
        await execute(
          'Categories',
          'createCategory',
          'POST',
          '/api/v1/admin/categories',
          { token: fresh, body: { name: prefix } },
        )
      ).status(),
    ).toBe(201);
    await expect(
      page.locator('#operations-Auth-login .responses-wrapper'),
    ).toBeVisible();
    const loginBlock = page.locator('#operations-Auth-login');
    await loginBlock
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await loginBlock
      .getByRole('tab', { name: 'Schema', exact: true })
      .first()
      .click();
    await expect(
      loginBlock.getByRole('tabpanel', { name: 'Schema', exact: true }).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(external).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  } finally {
    const users = await db.connection
      .collection('user')
      .find({ email })
      .toArray();
    await db.connection
      .collection('auth_sessions')
      .deleteMany({ userId: { $in: users.map((u) => u._id) } });
    await db.connection.collection('user').deleteMany({ email });
    await db.connection.collection('categories').deleteMany({ name: prefix });
    await db.close();
  }
});
