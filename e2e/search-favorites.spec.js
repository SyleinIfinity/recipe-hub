import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
const origin = 'http://127.0.0.1:3101';
test('QA-03..06 Firefox Swagger search, combined filters, ANY/ALL, paging, favorites and privacy', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
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
  const key = randomUUID(),
    email = `search-browser-${key}@example.test`;
  const category = await db.connection
    .collection('categories')
    .insertOne({ name: 'Search browser category', slug: key, isActive: true });
  const ingredients = await db.connection.collection('ingredients').insertMany(
    [0, 1].map((i) => ({
      name: `${key}-${i}`,
      normalizedName: `${key}-${i}`,
      lookupKeys: [`${key}-${i}`],
      isActive: true,
    })),
  );
  const anonymous = await browser.newContext(),
    guest = await anonymous.newPage(),
    external = [];
  for (const p of [page, guest])
    p.on('request', (r) => {
      if (!r.url().startsWith(origin)) external.push(r.url());
    });
  async function execute(p, tag, operation, method, path, params = {}) {
    const block = p.locator(`#operations-${tag}-${operation}`);
    await expect(block).toBeVisible();
    if (!(await block.locator('.opblock-body').isVisible()))
      await block.locator('.opblock-summary').click();
    await expect(block.locator('.opblock-body')).toBeVisible();
    if (
      !(await block
        .getByRole('button', { name: 'Cancel', exact: true })
        .count())
    )
      await block
        .getByRole('button', { name: 'Try it out', exact: true })
        .click();
    for (const [name, value] of Object.entries(params)) {
      const row = block
        .locator('tr')
        .filter({ has: block.locator(`[data-param-name="${name}"]`) });
      const input = block.locator(`input[placeholder="${name}"]`);
      if (await input.count()) await input.fill(value);
      else {
        const select = block.locator(`tr[data-param-name="${name}"] select`);
        if (await select.count()) await select.selectOption(value);
        else await row.locator('select').selectOption(value);
      }
    }
    const pending = p.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === path && r.request().method() === method,
    );
    await block.getByRole('button', { name: 'Execute', exact: true }).click();
    return pending;
  }
  try {
    await page.goto(`${origin}/api/docs`);
    const fixture = await page.evaluate(
      async ({ email, categoryId, ingredientIds }) => {
        const csrf = async () =>
          (await (await fetch('/api/v1/auth/csrf')).json()).data.csrfToken;
        const write = async (method, path, body) =>
          fetch(path, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': await csrf(),
              'Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify(body),
          });
        const password = 'Search browser test phrase!';
        if (
          (
            await write('POST', '/api/v1/auth/register', {
              email,
              password,
              displayName: 'Search Cook',
            })
          ).status !== 201
        )
          throw new Error('register');
        if (
          (await write('POST', '/api/v1/auth/login', { email, password }))
            .status !== 200
        )
          throw new Error('login');
        const rows = [];
        for (let i = 0; i < 2; i++) {
          const created = await write('POST', '/api/v1/recipes', {
            title: 'Thịt kho trứng',
            description: 'Món ăn gia đình Việt Nam',
            categoryId,
            difficulty: 'easy',
            tags: ['Bữa tối'],
            servings: 2,
            prepMinutes: 10,
            cookMinutes: 20,
            ingredients: ingredientIds.slice(0, 2 - i).map((id, n) => ({
              ingredientId: id,
              name: 'Browser ingredient',
              quantity: 1,
              order: n + 1,
            })),
            steps: [{ order: 1, instruction: 'Nấu thật kỹ trong nồi' }],
          });
          if (created.status !== 201) throw new Error('create');
          const recipe = (await created.json()).data;
          const result = await write(
            'PATCH',
            `/api/v1/recipes/${recipe.recipeId}/publish`,
            { version: recipe.version },
          );
          if (result.status !== 200) throw new Error('publish');
          rows.push((await result.json()).data);
        }
        return { rows, token: await csrf() };
      },
      {
        email,
        categoryId: String(category.insertedId),
        ingredientIds: Object.values(ingredients.insertedIds).map(String),
      },
    );
    await guest.goto(`${origin}/api/docs`);
    const search = async (params) => {
      const response = await execute(
        guest,
        'Recipes',
        'listPublicRecipes',
        'GET',
        '/api/v1/recipes',
        { category: String(category.insertedId), ...params },
      );
      expect(response.status()).toBe(200);
      return response.json();
    };
    expect((await search({ q: 'thit kho trung' })).meta.total).toBe(2);
    expect(
      (await search({ difficulty: 'easy', maxMinutes: '30', tag: 'BỮA TỐI' }))
        .meta.total,
    ).toBe(2);
    const ids = Object.values(ingredients.insertedIds).map(String).join(',');
    expect(
      (await search({ ingredientIds: ids, ingredientMatch: 'any' })).meta.total,
    ).toBe(2);
    const all = await search({ ingredientMatch: 'all' });
    expect(all.data.map((r) => r.recipeId)).toEqual([fixture.rows[0].recipeId]);
    expect(
      (await search({ ingredientMatch: 'any', limit: '1', page: '2' })).data,
    ).toHaveLength(1);
    const id = fixture.rows[0].recipeId,
      path = `/api/v1/me/favorites/${id}`;
    const favorite = async (operation, method, token = fixture.token) =>
      execute(page, 'Favorites', operation, method, path, {
        recipeId: id,
        'X-CSRF-Token': token,
      });
    expect((await favorite('addFavorite', 'PUT', 'invalid')).status()).toBe(
      403,
    );
    expect((await favorite('addFavorite', 'PUT')).status()).toBe(201);
    expect((await favorite('addFavorite', 'PUT')).status()).toBe(200);
    const get = () =>
      execute(
        page,
        'Favorites',
        'listMyFavorites',
        'GET',
        '/api/v1/me/favorites',
      );
    expect((await (await get()).json()).data.map((r) => r.recipeId)).toEqual([
      id,
    ]);
    expect(
      (
        await execute(
          guest,
          'Favorites',
          'listMyFavorites',
          'GET',
          '/api/v1/me/favorites',
        )
      ).status(),
    ).toBe(401);
    expect(
      (
        await execute(guest, 'Favorites', 'addFavorite', 'PUT', path, {
          recipeId: id,
          'X-CSRF-Token': 'wrong',
        })
      ).status(),
    ).toBe(403);
    // Moderation API belongs to BE-13; set fixture state directly to verify read policy.
    const { ObjectId } = await import('mongoose').then((m) => m.default.Types);
    await db.connection
      .collection('recipes')
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { moderationStatus: 'hidden' } },
      );
    expect(
      (await search({ page: '1', ingredientMatch: 'all' })).meta.total,
    ).toBe(0);
    expect((await (await get()).json()).meta.total).toBe(0);
    expect((await favorite('removeFavorite', 'DELETE')).status()).toBe(204);
    expect((await favorite('removeFavorite', 'DELETE')).status()).toBe(204);
    expect(external).toEqual([]);
  } finally {
    const users = await db.connection
      .collection('user')
      .find({ email })
      .toArray();
    const userIds = users.map((u) => u._id);
    await db.connection
      .collection('favorites')
      .deleteMany({ userId: { $in: userIds } });
    await db.connection
      .collection('recipes')
      .deleteMany({ authorId: { $in: userIds } });
    await db.connection
      .collection('auth_sessions')
      .deleteMany({ userId: { $in: userIds } });
    await db.connection.collection('user').deleteMany({ email });
    await db.connection
      .collection('categories')
      .deleteOne({ _id: category.insertedId });
    await db.connection
      .collection('ingredients')
      .deleteMany({ _id: { $in: Object.values(ingredients.insertedIds) } });
    await anonymous.close();
    await db.close();
  }
});
