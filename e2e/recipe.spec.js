import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
const origin = 'http://127.0.0.1:3101';
test('RCP-67..70 Firefox Swagger draft create/list/detail/version/media/soft-delete', async ({
  page,
}) => {
  test.setTimeout(90000);
  const email = `recipe-browser-${randomUUID()}@example.test`,
    password = 'Recipe browser phrase!';
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
  async function execute(
    operation,
    method,
    path,
    { token, key, id, body } = {},
  ) {
    const block = page.locator(`#operations-Recipes-${operation}`);
    if (!(await block.locator('.opblock-body').isVisible()))
      await block.locator('.opblock-summary').click();
    const tryButton = block.getByRole('button', {
      name: 'Try it out',
      exact: true,
    });
    await expect(block.locator('.opblock-body')).toBeVisible();
    if (
      !(await block
        .getByRole('button', { name: 'Cancel', exact: true })
        .count())
    ) {
      await expect(tryButton).toBeVisible();
      await tryButton.click();
    }
    if (token !== undefined)
      await block.locator('input[placeholder="X-CSRF-Token"]').fill(token);
    if (key)
      await block.locator('input[placeholder="Idempotency-Key"]').fill(key);
    if (id) await block.locator('input[placeholder="recipeId"]').fill(id);
    if (body !== undefined)
      await block.locator('textarea').fill(JSON.stringify(body));
    const pending = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === path && r.request().method() === method,
    );
    await block.getByRole('button', { name: 'Execute', exact: true }).click();
    return pending;
  }
  try {
    await page.goto(`${origin}/api/docs`);
    expect(
      (await execute('listOwnRecipes', 'GET', '/api/v1/me/recipes')).status(),
    ).toBe(401);
    const bytes = (
      await sharp({
        create: { width: 20, height: 15, channels: 3, background: 'green' },
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
        if (
          (
            await post('/api/v1/auth/register', {
              email,
              password,
              displayName: 'Recipe Browser',
            })
          ).status !== 201
        )
          throw new Error('Register failed');
        if (
          (await post('/api/v1/auth/login', { email, password })).status !== 200
        )
          throw new Error('Login failed');
        const token = await csrf();
        const upload = async (purpose) => {
          const form = new FormData();
          form.append('purpose', purpose);
          form.append(
            'file',
            new Blob([Uint8Array.from(atob(bytes), (v) => v.charCodeAt(0))], {
              type: 'image/png',
            }),
            'recipe.png',
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
          cover: await upload('recipe_cover'),
          step: await upload('recipe_step'),
        };
      },
      { email, password, bytes },
    );
    const key = randomUUID(),
      body = {
        title: 'Canh rau Việt',
        coverImageAssetId: fixture.cover,
        ingredients: [{ name: 'Rau cải', quantity: 200, unit: 'g', order: 1 }],
        steps: [
          { order: 1, instruction: 'Rửa rau', imageAssetId: fixture.step },
        ],
      };
    expect(
      (
        await execute('createRecipeDraft', 'POST', '/api/v1/recipes', {
          token: 'invalid',
          key,
          body,
        })
      ).status(),
    ).toBe(403);
    const created = await execute(
      'createRecipeDraft',
      'POST',
      '/api/v1/recipes',
      { token: fixture.token, key, body },
    );
    expect(created.status()).toBe(201);
    let recipe = (await created.json()).data;
    expect(recipe.coverImageUrl).toBe(
      `/api/v1/recipes/${recipe.recipeId}/images/${fixture.cover}`,
    );
    expect(recipe.steps[0].imageUrl).toBe(
      `/api/v1/recipes/${recipe.recipeId}/images/${fixture.step}`,
    );
    expect(JSON.stringify(recipe)).not.toMatch(
      /signature=|cloudinary\.com|api_secret/,
    );
    expect(
      (await execute('listOwnRecipes', 'GET', '/api/v1/me/recipes')).status(),
    ).toBe(200);
    const detail = await execute(
      'getOwnRecipe',
      'GET',
      `/api/v1/me/recipes/${recipe.recipeId}`,
      { id: recipe.recipeId },
    );
    expect(detail.status()).toBe(200);
    const path = `/api/v1/recipes/${recipe.recipeId}`,
      version = recipe.version;
    const changed = await execute('updateRecipeDraft', 'PATCH', path, {
      id: recipe.recipeId,
      token: fixture.token,
      body: { version, title: 'Canh rau đã sửa' },
    });
    expect(changed.status()).toBe(200);
    recipe = (await changed.json()).data;
    expect(recipe.version).toBe(version + 1);
    expect(recipe.steps[0].imageAssetId).toBe(fixture.step);
    expect(
      (
        await execute('updateRecipeDraft', 'PATCH', path, {
          id: recipe.recipeId,
          token: fixture.token,
          body: { version, title: 'Stale' },
        })
      ).status(),
    ).toBe(409);
    const deleted = await execute('deleteRecipeDraft', 'DELETE', path, {
      id: recipe.recipeId,
      token: fixture.token,
    });
    expect(deleted.status()).toBe(204);
    expect(await deleted.text()).toBe('');
    expect(
      (
        await execute(
          'getOwnRecipe',
          'GET',
          `/api/v1/me/recipes/${recipe.recipeId}`,
          { id: recipe.recipeId },
        )
      ).status(),
    ).toBe(404);
    const user = await db.connection.collection('user').findOne({ email });
    const assets = await db.connection
      .collection('media_assets')
      .find({ ownerId: user._id })
      .toArray();
    expect(assets.every((a) => a.status === 'attached')).toBe(true);
    expect(external).toEqual([]);
  } finally {
    const users = await db.connection
        .collection('user')
        .find({ email })
        .toArray(),
      ids = users.map((u) => u._id);
    await db.connection
      .collection('recipes')
      .deleteMany({ authorId: { $in: ids } });
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
