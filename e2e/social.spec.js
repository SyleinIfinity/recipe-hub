import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
const origin = 'http://127.0.0.1:3101';
test('BE13 Firefox Swagger User reviews/comments/reports and Admin audited moderation', async ({
  page,
  browser,
}) => {
  test.setTimeout(150000);
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
  const prefix = `social-browser-${randomUUID()}`,
    password = 'Social browser test phrase!';
  const category = await db.connection.collection('categories').insertOne({
    name: 'Social browser category',
    slug: prefix,
    isActive: true,
  });
  const adminContext = await browser.newContext(),
    adminPage = await adminContext.newPage(),
    guestContext = await browser.newContext(),
    guest = await guestContext.newPage();
  const external = [];
  for (const p of [page, adminPage, guest])
    p.on('request', (r) => {
      if (!r.url().startsWith(origin)) external.push(r.url());
    });
  async function execute(
    p,
    tag,
    operation,
    method,
    path,
    { params = {}, body } = {},
  ) {
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
    for (const [name, value] of Object.entries(params))
      await block.locator(`input[placeholder="${name}"]`).fill(value);
    if (body) await block.locator('textarea').fill(JSON.stringify(body));
    const pending = p.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === path && r.request().method() === method,
    );
    await block.getByRole('button', { name: 'Execute', exact: true }).click();
    return pending;
  }
  async function login(p, label) {
    await p.goto(`${origin}/api/docs`);
    return p.evaluate(
      async ({ email, password, label }) => {
        const csrf = async () =>
          (await (await fetch('/api/v1/auth/csrf')).json()).data.csrfToken;
        const write = async (path, body) =>
          fetch(path, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': await csrf(),
            },
            body: JSON.stringify(body),
          });
        const reg = await write('/api/v1/auth/register', {
          email,
          password,
          displayName: label,
        });
        if (reg.status !== 201) throw new Error('register');
        if (
          (await write('/api/v1/auth/login', { email, password })).status !==
          200
        )
          throw new Error('login');
        return { id: (await reg.json()).data.id, token: await csrf() };
      },
      {
        email: `${prefix}-${label.toLowerCase()}@example.test`,
        password,
        label,
      },
    );
  }
  try {
    // Setup owner/recipe through real APIs; browser test actions below use Swagger controls.
    await login(page, 'Owner');
    const recipe = await page.evaluate(async (categoryId) => {
      const token = (await (await fetch('/api/v1/auth/csrf')).json()).data
        .csrfToken;
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        'Idempotency-Key': crypto.randomUUID(),
      };
      const created = await fetch('/api/v1/recipes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Món ăn cộng đồng',
          description: 'Công thức cho mọi người cùng thử',
          categoryId,
          difficulty: 'easy',
          servings: 2,
          prepMinutes: 5,
          cookMinutes: 20,
          ingredients: [{ name: 'Trứng', quantity: 2, order: 1 }],
          steps: [{ order: 1, instruction: 'Nấu thật kỹ trong nồi' }],
        }),
      });
      if (created.status !== 201) throw new Error('create');
      const row = (await created.json()).data,
        published = await fetch(`/api/v1/recipes/${row.recipeId}/publish`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ version: row.version }),
        });
      if (published.status !== 200) throw new Error('publish');
      return (await published.json()).data;
    }, String(category.insertedId));
    await page.evaluate(async () => {
      const t = (await (await fetch('/api/v1/auth/csrf')).json()).data
        .csrfToken;
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': t },
      });
    });
    const user = await login(page, 'Reader'),
      admin = await login(adminPage, 'Moderator');
    const { ObjectId } = await import('mongoose').then((m) => m.default.Types);
    await db.connection
      .collection('user')
      .updateOne({ _id: new ObjectId(admin.id) }, { $set: { role: 'admin' } });
    await guest.goto(`${origin}/api/docs`);
    const id = recipe.recipeId,
      base = `/api/v1/recipes/${id}`;
    const userParams = { recipeId: id, 'X-CSRF-Token': user.token };
    const put = (body) =>
      execute(page, 'Reviews', 'putMyReview', 'PUT', `${base}/my-review`, {
        params: userParams,
        body,
      });
    expect((await put({ rating: 5, content: 'Rất ngon' })).status()).toBe(201);
    expect((await put({ rating: 4, content: 'Đã thử lại' })).status()).toBe(
      200,
    );
    const list = await execute(
      guest,
      'Reviews',
      'listRecipeReviews',
      'GET',
      `${base}/reviews`,
      { params: { recipeId: id } },
    );
    expect(list.status()).toBe(200);
    expect((await list.json()).summary).toEqual({
      averageRating: 4,
      ratingCount: 1,
    });
    const createComment = async (body) =>
      execute(
        page,
        'Comments',
        'createRecipeComment',
        'POST',
        `${base}/comments`,
        { params: { ...userParams, 'Idempotency-Key': randomUUID() }, body },
      );
    const rootResponse = await createComment({
      content: 'Bình luận qua Swagger',
    });
    expect(rootResponse.status()).toBe(201);
    const root = (await rootResponse.json()).data;
    const replyResponse = await createComment({
      content: 'Trả lời một cấp',
      parentId: root.commentId,
    });
    expect(replyResponse.status()).toBe(201);
    const reply = (await replyResponse.json()).data;
    const edited = await execute(
      page,
      'Comments',
      'updateMyComment',
      'PATCH',
      `/api/v1/comments/${root.commentId}`,
      {
        params: { commentId: root.commentId, 'X-CSRF-Token': user.token },
        body: { content: 'Bình luận đã chỉnh sửa', version: root.version + 1 },
      },
    );
    expect(edited.status()).toBe(200);
    const current = (await edited.json()).data;
    const reported = await execute(
      page,
      'Reports',
      'createReport',
      'POST',
      '/api/v1/reports',
      {
        params: { 'X-CSRF-Token': user.token },
        body: {
          targetType: 'recipe',
          targetId: id,
          reason: 'other',
          details: 'Kiểm tra moderation từ Swagger',
        },
      },
    );
    expect(reported.status()).toBe(201);
    const report = (await reported.json()).data;
    expect(
      (
        await execute(
          page,
          'Reports',
          'listAdminReports',
          'GET',
          '/api/v1/admin/reports',
        )
      ).status(),
    ).toBe(403);
    const backlog = await execute(
      adminPage,
      'Reports',
      'listAdminReports',
      'GET',
      '/api/v1/admin/reports',
    );
    expect(backlog.status()).toBe(200);
    expect(
      (await backlog.json()).data.some((r) => r.reportId === report.reportId),
    ).toBe(true);
    const moderateComment = async (status, version) =>
      execute(
        adminPage,
        'Moderation',
        'moderateComment',
        'PATCH',
        `/api/v1/admin/comments/${root.commentId}/moderation`,
        {
          params: {
            commentId: root.commentId,
            'X-CSRF-Token': admin.token,
            'Idempotency-Key': randomUUID(),
          },
          body: { status, version, reason: 'Xem xét bình luận' },
        },
      );
    expect((await moderateComment('hidden', current.version)).status()).toBe(
      200,
    );
    const hiddenComments = await execute(
      guest,
      'Comments',
      'listRecipeComments',
      'GET',
      `${base}/comments`,
      { params: { recipeId: id } },
    );
    expect((await hiddenComments.json()).meta.total).toBe(0);
    expect(
      (await moderateComment('visible', current.version + 1)).status(),
    ).toBe(200);
    for (const target of [reply.commentId, root.commentId])
      expect(
        (
          await execute(
            page,
            'Comments',
            'deleteMyComment',
            'DELETE',
            `/api/v1/comments/${target}`,
            { params: { commentId: target, 'X-CSRF-Token': user.token } },
          )
        ).status(),
      ).toBe(204);
    const hide = await execute(
      adminPage,
      'Moderation',
      'moderateRecipe',
      'PATCH',
      `/api/v1/admin/recipes/${id}/moderation`,
      {
        params: {
          recipeId: id,
          'X-CSRF-Token': admin.token,
          'Idempotency-Key': randomUUID(),
        },
        body: {
          status: 'hidden',
          version: recipe.version,
          reason: 'Xem xét báo cáo',
        },
      },
    );
    expect(hide.status()).toBe(200);
    expect(
      (
        await execute(
          guest,
          'Reviews',
          'listRecipeReviews',
          'GET',
          `${base}/reviews`,
          { params: { recipeId: id } },
        )
      ).status(),
    ).toBe(404);
    const resolved = await execute(
      adminPage,
      'Moderation',
      'resolveReport',
      'PATCH',
      `/api/v1/admin/reports/${report.reportId}/resolve`,
      {
        params: {
          reportId: report.reportId,
          'X-CSRF-Token': admin.token,
          'Idempotency-Key': randomUUID(),
        },
        body: {
          version: 0,
          resolution: 'resolved',
          action: 'none',
          reason: 'Đã kiểm tra và ẩn công thức',
        },
      },
    );
    expect(resolved.status()).toBe(200);
    expect(
      (
        await execute(
          page,
          'Reviews',
          'deleteMyReview',
          'DELETE',
          `${base}/my-review`,
          { params: userParams },
        )
      ).status(),
    ).toBe(204);
    const audit = await db.connection
      .collection('audit_logs')
      .find({ actorId: new ObjectId(admin.id) })
      .toArray();
    expect(audit.filter((a) => a.outcome === 'applied')).toHaveLength(4);
    expect(audit.every((a) => a.requestId && a.reason && a.reconciledAt)).toBe(
      true,
    );
    expect(external).toEqual([]);
  } finally {
    const users = await db.connection
        .collection('user')
        .find({ email: { $regex: `^${prefix}-` } })
        .toArray(),
      ids = users.map((u) => u._id),
      rows = await db.connection
        .collection('recipes')
        .find({ authorId: { $in: ids } }, { projection: { _id: 1 } })
        .toArray(),
      recipeIds = rows.map((r) => r._id);
    await db.connection
      .collection('reviews')
      .deleteMany({ recipeId: { $in: recipeIds } });
    await db.connection
      .collection('comments')
      .deleteMany({ recipeId: { $in: recipeIds } });
    await db.connection
      .collection('reports')
      .deleteMany({ reporterId: { $in: ids } });
    await db.connection
      .collection('audit_logs')
      .deleteMany({ actorId: { $in: ids } });
    await db.connection
      .collection('recipes')
      .deleteMany({ _id: { $in: recipeIds } });
    await db.connection
      .collection('auth_sessions')
      .deleteMany({ userId: { $in: ids } });
    await db.connection.collection('user').deleteMany({ _id: { $in: ids } });
    await db.connection
      .collection('categories')
      .deleteOne({ _id: category.insertedId });
    await adminContext.close();
    await guestContext.close();
    await db.close();
  }
});
