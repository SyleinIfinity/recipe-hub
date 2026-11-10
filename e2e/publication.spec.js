import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
const origin = 'http://127.0.0.1:3101';
test('PUB-83..86 Firefox Swagger publish, guest detail, unpublish and revoked detail', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
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
    email = `publish-browser-${key}@example.test`,
    password = 'Publication browser phrase!';
  const category = await db.connection
    .collection('categories')
    .insertOne({ name: 'Browser category', slug: key, isActive: true });
  const anonymous = await browser.newContext(),
    guest = await anonymous.newPage();
  const external = [];
  for (const p of [page, guest])
    p.on('request', (r) => {
      if (!r.url().startsWith(origin)) external.push(r.url());
    });
  async function execute(
    p,
    operation,
    method,
    path,
    { id, slug, token, body } = {},
  ) {
    const block = p.locator(`#operations-Recipes-${operation}`);
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
    if (id) await block.locator('input[placeholder="recipeId"]').fill(id);
    if (slug) await block.locator('input[placeholder="slug"]').fill(slug);
    if (token)
      await block.locator('input[placeholder="X-CSRF-Token"]').fill(token);
    if (body) await block.locator('textarea').fill(JSON.stringify(body));
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
      async ({ email, password, categoryId }) => {
        const csrf = async () =>
          (await (await fetch('/api/v1/auth/csrf')).json()).data.csrfToken;
        const post = async (path, body) =>
          fetch(path, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': await csrf(),
              'Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify(body),
          });
        if (
          (
            await post('/api/v1/auth/register', {
              email,
              password,
              displayName: 'Publication Cook',
            })
          ).status !== 201
        )
          throw new Error('register');
        if (
          (await post('/api/v1/auth/login', { email, password })).status !== 200
        )
          throw new Error('login');
        const res = await post('/api/v1/recipes', {
          title: 'Thịt kho trứng',
          description: 'Món ngon cho gia đình Việt',
          categoryId,
          difficulty: 'easy',
          servings: 2,
          prepMinutes: 5,
          cookMinutes: 20,
          ingredients: [{ name: 'Trứng', quantity: 2, order: 1 }],
          steps: [{ order: 1, instruction: 'Nấu thật kỹ rồi thưởng thức' }],
        });
        if (res.status !== 201) throw new Error('create');
        return { token: await csrf(), recipe: (await res.json()).data };
      },
      { email, password, categoryId: String(category.insertedId) },
    );
    const id = fixture.recipe.recipeId;
    const published = await execute(
      page,
      'publishRecipe',
      'PATCH',
      `/api/v1/recipes/${id}/publish`,
      { id, token: fixture.token, body: { version: fixture.recipe.version } },
    );
    expect(published.status()).toBe(200);
    const row = (await published.json()).data;
    await guest.goto(`${origin}/api/docs`);
    let detail = await execute(
      guest,
      'getPublicRecipe',
      'GET',
      `/api/v1/recipes/${row.slug}`,
      { slug: row.slug },
    );
    expect(detail.status()).toBe(200);
    expect(JSON.stringify(await detail.json())).not.toContain(email);
    const unpublished = await execute(
      page,
      'unpublishRecipe',
      'PATCH',
      `/api/v1/recipes/${id}/unpublish`,
      { id, token: fixture.token, body: { version: row.version } },
    );
    expect(unpublished.status()).toBe(200);
    detail = await execute(
      guest,
      'getPublicRecipe',
      'GET',
      `/api/v1/recipes/${row.slug}`,
      { slug: row.slug },
    );
    expect(detail.status()).toBe(404);
    expect(external).toEqual([]);
  } finally {
    await anonymous.close();
    const users = await db.connection
        .collection('user')
        .find({ email })
        .toArray(),
      ids = users.map((v) => v._id);
    await db.connection
      .collection('recipes')
      .deleteMany({ authorId: { $in: ids } });
    await db.connection
      .collection('auth_sessions')
      .deleteMany({ userId: { $in: ids } });
    await db.connection.collection('user').deleteMany({ _id: { $in: ids } });
    await db.connection
      .collection('categories')
      .deleteOne({ _id: category.insertedId });
    await db.close();
  }
});
