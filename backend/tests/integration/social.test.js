const fixtureRecipeIds = [];
const originalHttpsRequest = https.request;
let networkCalls = 0;
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
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/config/logger.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createCatalog } from '../../src/modules/catalog.js';
import { createMedia } from '../../src/modules/media/index.js';
import { createRecipes } from '../../src/modules/recipes/index.js';
import { createApp } from '../../src/app.js';
import { loadSpec } from '../../src/openapi/docs.js';
import { schemaValidator } from '../../../scripts/openapi-contract.js';
const config = parseEnv({
  NODE_ENV: 'test',
  SMTP_ENABLED: 'false',
  MEDIA_PROVIDER: 'fake',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
  SOCIAL_RATE_LIMIT: 1000,
});
const db = createDatabase(config),
  logger = createLogger('silent'),
  prefix = `social-${randomUUID()}`,
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
  category,
  otherCategory,
  ingredients,
  c,
  admin,
  admin2;
async function login(label) {
  const client = request.agent(app),
    email = `${prefix}-${label}@example.test`,
    password = 'Recipe search test phrase!';
  const csrf = async () =>
    (await client.get('/api/v1/auth/csrf')).body.data.csrfToken;
  let token = await csrf();
  const reg = await client
    .post('/api/v1/auth/register')
    .set('X-CSRF-Token', token)
    .send({ email, password, displayName: label });
  expect(reg.status).toBe(201);
  ids.push(reg.body.data.id);
  token = await csrf();
  expect(
    (
      await client
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email, password })
    ).status,
  ).toBe(200);
  return {
    client,
    token: await csrf(),
    actor: { user: await identity.models.User.findById(reg.body.data.id) },
  };
}
beforeAll(async () => {
  https.request = () => {
    networkCalls++;
    throw new Error('External network forbidden');
  };
  await db.connect();
  identity = await createIdentity({
    connection: db.connection,
    config,
    logger,
  });
  catalog = await createCatalog(db.connection, identity);
  media = await createMedia({
    connection: db.connection,
    identity,
    config,
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
  a = await login('Owner');
  b = await login('Reader');
  c = await login('Third');
  admin = await login('Admin');
  admin2 = await login('SecondAdmin');
  for (const who of [admin, admin2]) {
    await identity.models.User.updateOne(
      { _id: who.actor.user._id },
      { role: 'admin' },
    );
    who.actor.user.role = 'admin';
  }
  category = await catalog.models.Category.create({
    name: 'Search category',
    slug: prefix,
  });
  otherCategory = await catalog.models.Category.create({
    name: 'Other category',
    slug: `${prefix}-other`,
  });
  ingredients = await catalog.models.Ingredient.create(
    [0, 1, 2].map((i) => ({ name: `${prefix}-${i}` })),
  );
});
beforeEach(async () => {
  await identity.models.User.updateMany(
    { _id: { $in: ids } },
    { $set: { status: 'active' } },
  );
  for (const who of [admin, admin2])
    await identity.models.User.updateOne(
      { _id: who.actor.user._id },
      { role: 'admin' },
    );
  await catalog.models.Category.updateMany(
    { _id: { $in: [category._id, otherCategory._id] } },
    { $set: { isActive: true } },
  );
});
afterEach(async () => {
  expect(networkCalls).toBe(0);
  vi.restoreAllMocks();
  https.request = () => {
    networkCalls++;
    throw new Error('External network forbidden');
  };
  for (const model of Object.values(recipes.social.models))
    await model.deleteMany(
      {
        $or: [
          { authorId: { $in: ids } },
          { userId: { $in: ids } },
          { reporterId: { $in: ids } },
          { recipeId: { $in: fixtureRecipeIds } },
        ],
      },
      { strictQuery: false },
    );
  await identity.models.AuditLog.deleteMany({ actorId: { $in: ids } });
  await recipes.Favorite.deleteMany({ userId: { $in: ids } });
  await recipes.Recipe.deleteMany({
    $or: [
      { authorId: { $in: ids } },
      { _id: { $in: fixtureRecipeIds.splice(0) } },
    ],
  });
});
afterAll(async () => {
  expect(networkCalls).toBe(0);
  https.request = originalHttpsRequest;
  vi.restoreAllMocks();
  await catalog.models.Category.deleteMany({
    _id: { $in: [category._id, otherCategory._id] },
  });
  await catalog.models.Ingredient.deleteMany({
    _id: { $in: ingredients.map((i) => i._id) },
  });
  await identity.models.Session.deleteMany({ userId: { $in: ids } });
  await identity.models.User.deleteMany({ _id: { $in: ids } });
  await db.close();
});
const content = () => ({
  title: 'Social recipe',
  description: 'Món ăn gia đình Việt Nam',
  categoryId: String(category._id),
  difficulty: 'easy',
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  ingredients: [{ name: 'Trứng', quantity: 2, order: 1 }],
  steps: [{ order: 1, instruction: 'Nấu kỹ trong nồi' }],
});
async function published() {
  const row = await recipes.service.create(a.actor, content(), randomUUID());
  fixtureRecipeIds.push(row._id);
  return recipes.publication.publish(a.actor, row._id, {
    version: row.version,
  });
}
const recipeId = (r) => String(r._id ?? r.recipeId);
const commentId = (r) => String(r._id ?? r.commentId);
const template = (path) =>
  path
    .replace(/recipes\/[a-f0-9]{24}/g, 'recipes/{recipeId}')
    .replace(/comments\/[a-f0-9]{24}/g, 'comments/{commentId}')
    .replace(/reports\/[a-f0-9]{24}/g, 'reports/{reportId}');
function contract(method, path, res) {
  const op = spec.paths[template(path.split('?')[0])]?.[method];
  if (op) {
    expect(
      op.responses[res.status],
      `${method} ${path} status ${res.status}`,
    ).toBeDefined();
    if (res.status === 204) expect(res.text).toBe('');
    else
      validates(
        op.responses[res.status].content['application/json'].schema,
        res.body,
      );
  }
  return res;
}
async function write(
  who,
  method,
  path,
  body,
  key = randomUUID(),
  token = who.token,
) {
  return contract(
    method,
    path,
    await who.client[method](path)
      .set('X-CSRF-Token', token)
      .set('Idempotency-Key', key)
      .send(body),
  );
}
async function get(path, who) {
  return contract('get', path, await (who?.client ?? request(app)).get(path));
}
const review = (r, body = { rating: 4 }, who = b) =>
  write(who, 'put', `/api/v1/recipes/${recipeId(r)}/my-review`, body);
const reviews = (r, q = {}) =>
  get(`/api/v1/recipes/${recipeId(r)}/reviews?${new URLSearchParams(q)}`);
const newComment = (
  r,
  body = { content: 'Bình luận' },
  who = b,
  key = randomUUID(),
) => write(who, 'post', `/api/v1/recipes/${recipeId(r)}/comments`, body, key);
const comments = (r) => get(`/api/v1/recipes/${recipeId(r)}/comments`);
const report = (r, targetType = 'recipe', who = b) =>
  write(who, 'post', '/api/v1/reports', {
    targetType,
    targetId: targetType === 'recipe' ? recipeId(r) : commentId(r),
    reason: 'spam',
    details: 'Needs review',
  });
const moderate = (
  r,
  status = 'hidden',
  kind = 'recipe',
  who = admin,
  key = randomUUID(),
  version = r.version,
) =>
  write(
    who,
    'patch',
    `/api/v1/admin/${kind === 'recipe' ? 'recipes' : 'comments'}/${kind === 'recipe' ? recipeId(r) : commentId(r)}/moderation`,
    { status, reason: 'Moderation test', version },
    key,
  );
const resolve = (r, body = {}, who = admin, key = randomUUID()) =>
  write(
    who,
    'patch',
    `/api/v1/admin/reports/${r.reportId ?? r._id}/resolve`,
    {
      version: r.version ?? 0,
      resolution: 'resolved',
      action: 'none',
      reason: 'Reviewed',
      ...body,
    },
    key,
  );
const auditRows = () =>
  identity.models.AuditLog.find({ actorId: { $in: ids } }).sort({
    createdAt: 1,
  });
it('REV-01/02/12/14 PUT creates/updates once; live summary and idempotent own delete', async () => {
  const r = await published();
  expect((await reviews(r)).body.summary).toEqual({
    averageRating: null,
    ratingCount: 0,
  });
  expect((await review(r, { rating: 5, content: 'Rất ngon' })).status).toBe(
    201,
  );
  expect((await review(r, { rating: 3 })).status).toBe(200);
  await review(r, { rating: 4 }, c);
  const list = await reviews(r);
  expect(list.status).toBe(200);
  expect(list.body.summary).toEqual({ averageRating: 3.5, ratingCount: 2 });
  expect(
    await recipes.social.models.Review.countDocuments({ recipeId: r._id }),
  ).toBe(2);
  expect(
    (await write(b, 'delete', `/api/v1/recipes/${r._id}/my-review`)).status,
  ).toBe(204);
  expect(
    (await write(b, 'delete', `/api/v1/recipes/${r._id}/my-review`)).status,
  ).toBe(204);
  expect((await reviews(r)).body.summary).toEqual({
    averageRating: 4,
    ratingCount: 1,
  });
  expect((await review(r)).status).toBe(200);
});
it('REV-03/04/15 concurrent PUT unique and concurrent DELETE summary matches DB', async () => {
  const r = await published();
  const results = await Promise.all(
    Array.from({ length: 10 }, () => review(r, { rating: 4 })),
  );
  expect(results.filter((v) => v.status === 201)).toHaveLength(1);
  expect(results.every((v) => [200, 201].includes(v.status))).toBe(true);
  expect(
    await recipes.social.models.Review.countDocuments({ recipeId: r._id }),
  ).toBe(1);
  await Promise.all([
    review(r, { rating: 5 }),
    write(b, 'delete', `/api/v1/recipes/${r._id}/my-review`),
  ]);
  const row = await recipes.social.models.Review.findOne({ recipeId: r._id });
  const summary = (await reviews(r)).body.summary;
  expect(summary).toEqual(
    row && !row.deletedAt
      ? { averageRating: row.rating, ratingCount: 1 }
      : { averageRating: null, ratingCount: 0 },
  );
});
it.each([
  { rating: 0 },
  { rating: 6 },
  { rating: 1.5 },
  { rating: '4' },
  { rating: 3, content: '<script>' },
  { rating: 3, status: 'hidden' },
])('REV-05/06 HTTP invalid %j', async (body) => {
  expect((await review(await published(), body)).status).toBe(422);
});
it('REV-07/13 own author/admin self-review forbidden and cannot delete another user review', async () => {
  const r = await published();
  expect((await review(r, { rating: 4 }, a)).status).toBe(422);
  await review(r);
  expect(
    (await write(c, 'delete', `/api/v1/recipes/${r._id}/my-review`)).status,
  ).toBe(204);
  expect((await reviews(r)).body.summary.ratingCount).toBe(1);
});
it('REV-16 hidden/suspended review authors excluded before count/page/summary', async () => {
  const r = await published();
  await review(r, { rating: 1 });
  await review(r, { rating: 5 }, c);
  await recipes.social.models.Review.updateOne(
    { recipeId: r._id, userId: b.actor.user._id },
    { status: 'hidden' },
  );
  expect((await reviews(r)).body.summary).toEqual({
    averageRating: 5,
    ratingCount: 1,
  });
  expect((await review(r)).status).toBe(409);
  await identity.models.User.updateOne(
    { _id: c.actor.user._id },
    { status: 'suspended' },
  );
  expect((await reviews(r)).body.summary.ratingCount).toBe(0);
});
it('COM-01/02/03/04 root/reply depth and same-recipe policy, version fence', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  expect(root.parentId).toBe(null);
  const reply = await newComment(
    r,
    { content: 'Trả lời', parentId: root.commentId },
    c,
  );
  expect(reply.status).toBe(201);
  expect(
    (
      await newComment(r, {
        content: 'Too deep',
        parentId: reply.body.data.commentId,
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await newComment(await published(), {
        content: 'Cross recipe',
        parentId: root.commentId,
      })
    ).status,
  ).toBe(422);
  const list = await comments(r);
  expect(list.body.data).toHaveLength(2);
  expect(list.body.data[0].version).toBe(1);
});
it('COM-07/08/09/10 owner PATCH CAS, protected fields, soft delete/repeat retains replies', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  await newComment(r, { content: 'Reply', parentId: root.commentId }, c);
  expect(
    (
      await write(c, 'patch', `/api/v1/comments/${root.commentId}`, {
        content: 'Steal',
        version: 1,
      })
    ).status,
  ).toBe(404);
  expect(
    (
      await write(b, 'patch', `/api/v1/comments/${root.commentId}`, {
        content: 'Edit',
        version: 0,
      })
    ).status,
  ).toBe(409);
  const patched = await write(
    b,
    'patch',
    `/api/v1/comments/${root.commentId}`,
    { content: 'Edit', version: 1 },
  );
  expect(patched.status).toBe(200);
  expect(
    (
      await write(b, 'patch', `/api/v1/comments/${root.commentId}`, {
        content: 'Edit',
        version: 2,
        parentId: null,
      })
    ).status,
  ).toBe(422);
  expect(
    (await write(b, 'delete', `/api/v1/comments/${root.commentId}`)).status,
  ).toBe(204);
  expect(
    (await write(b, 'delete', `/api/v1/comments/${root.commentId}`)).status,
  ).toBe(204);
  expect((await comments(r)).body.meta.total).toBe(0);
  expect(
    await recipes.social.models.Comment.countDocuments({ recipeId: r._id }),
  ).toBe(2);
  expect(
    (await newComment(r, { content: 'After delete', parentId: root.commentId }))
      .status,
  ).toBe(422);
});
it('COM-11 simultaneous edits exactly one CAS winner; edit/delete cannot resurrect', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  const results = await Promise.all(
    ['One', 'Two'].map((content) =>
      write(b, 'patch', `/api/v1/comments/${root.commentId}`, {
        content,
        version: 0,
      }),
    ),
  );
  expect(results.map((v) => v.status).sort()).toEqual([200, 409]);
  await Promise.all([
    write(b, 'patch', `/api/v1/comments/${root.commentId}`, {
      content: 'Late',
      version: 1,
    }),
    write(b, 'delete', `/api/v1/comments/${root.commentId}`),
  ]);
  const row = await recipes.social.models.Comment.findById(root.commentId);
  if (!row.deletedAt)
    expect(
      (await write(b, 'delete', `/api/v1/comments/${root.commentId}`)).status,
    ).toBe(204);
  expect((await comments(r)).body.meta.total).toBe(0);
});
it('COM-12 parent delete between eligibility and reply fence rejects and leaves no public reply', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data,
    Model = recipes.social.models.Comment,
    original = Model.findOneAndUpdate.bind(Model);
  vi.spyOn(Model, 'findOneAndUpdate').mockImplementationOnce(
    async (...args) => {
      await Model.updateOne(
        { _id: root.commentId },
        { $set: { deletedAt: new Date() }, $inc: { version: 1 } },
      );
      return original(...args);
    },
  );
  expect(
    (await newComment(r, { content: 'Racing reply', parentId: root.commentId }))
      .status,
  ).toBe(409);
  expect((await comments(r)).body.meta.total).toBe(0);
});
it('COM-02/12 durable reply after finalize failure is recovered by same key without duplicate', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data,
    Model = recipes.social.models.Comment,
    key = randomUUID(),
    original = Model.findOneAndUpdate.bind(Model);
  vi.spyOn(Model, 'findOneAndUpdate').mockImplementation(async (...args) => {
    if (args[0].creationState === 'pending') throw new Error('finalize canary');
    return original(...args);
  });
  const first = await newComment(
    r,
    { content: 'Recover reply', parentId: root.commentId },
    c,
    key,
  );
  expect(first.status).toBe(503);
  expect((await comments(r)).body.meta.total).toBe(1);
  vi.restoreAllMocks();
  const replay = await newComment(
    r,
    { content: 'Recover reply', parentId: root.commentId },
    c,
    key,
  );
  expect(replay.status).toBe(201);
  expect(
    (
      await newComment(
        r,
        { content: 'Recover reply', parentId: root.commentId },
        c,
        key,
      )
    ).body.data.commentId,
  ).toBe(replay.body.data.commentId);
  expect(await Model.countDocuments({ recipeId: r._id })).toBe(2);
  expect(
    (await Model.findById(root.commentId).select('+replyIntent')).replyIntent,
  ).toBe(null);
});
it('COM-13 stable same-time pagination counts only visible rows', async () => {
  const r = await published();
  for (let i = 0; i < 4; i++) await newComment(r, { content: `Text ${i}` });
  await recipes.social.models.Comment.updateMany(
    { recipeId: r._id },
    { createdAt: new Date('2025-01-01') },
  );
  const all = (await comments(r)).body.data;
  const path = `/api/v1/recipes/${r._id}/comments`;
  const first = await contract(
    'get',
    path,
    await request(app).get(path).query({ limit: 2 }),
  );
  const second = await contract(
    'get',
    path,
    await request(app).get(path).query({ page: 2, limit: 2 }),
  );
  expect(
    [...first.body.data, ...second.body.data].map((v) => v.commentId),
  ).toEqual(all.map((v) => v.commentId));
  expect(first.body.meta.total).toBe(4);
});
it.each(['draft', 'hidden', 'deleted', 'suspended'])(
  'REV-08/09 COM-15 MOD-11/12 all interactions/search/favorites blocked for %s',
  async (state) => {
    let r = await published();
    await review(r);
    await newComment(r);
    await recipes.favorites.add(b.actor, String(r._id));
    if (state === 'suspended')
      await identity.models.User.updateOne(
        { _id: a.actor.user._id },
        { status: 'suspended' },
      );
    else if (state === 'hidden') await moderate(r);
    else
      await recipes.Recipe.updateOne(
        { _id: r._id },
        state === 'draft' ? { status: 'draft' } : { deletedAt: new Date() },
      );
    expect((await reviews(r)).status).toBe(404);
    expect((await comments(r)).status).toBe(404);
    expect((await review(r)).status).toBe(404);
    expect((await newComment(r)).status).toBe(404);
    expect((await report(r)).status).toBe(404);
    expect((await recipes.favorites.list(b.actor, {})).meta.total).toBe(0);
    expect(
      (await recipes.publication.list({ category: String(category._id) })).meta
        .total,
    ).toBe(0);
  },
);
it('RPT-01/02/04/05 partial unique pending concurrent protection and comment target', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  const results = await Promise.all(Array.from({ length: 8 }, () => report(r)));
  expect(results.filter((v) => v.status === 201)).toHaveLength(1);
  expect(results.filter((v) => v.status === 409)).toHaveLength(7);
  expect((await report(root, 'comment')).status).toBe(201);
  expect(
    await recipes.social.models.Report.countDocuments({
      reporterId: b.actor.user._id,
    }),
  ).toBe(2);
});
it('RPT-03/06/07/08 REV-10/11 COM-16 session, role, CSRF, invalid ID and strict bodies', async () => {
  const r = await published(),
    guest = request.agent(app),
    token = (await guest.get('/api/v1/auth/csrf')).body.data.csrfToken;
  expect(
    (
      await guest
        .put(`/api/v1/recipes/${r._id}/my-review`)
        .set('X-CSRF-Token', token)
        .send({ rating: 4 })
    ).status,
  ).toBe(401);
  expect((await review(r, { rating: 4 }, b)).status).toBe(201);
  expect(
    (
      await write(
        b,
        'post',
        '/api/v1/reports',
        { targetType: 'recipe', targetId: String(r._id), reason: 'spam' },
        randomUUID(),
        'wrong',
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await write(b, 'post', '/api/v1/reports', {
        targetType: 'media',
        targetId: String(r._id),
        reason: 'spam',
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await write(b, 'post', '/api/v1/reports', {
        targetType: 'recipe',
        targetId: String(r._id),
        reason: 'spam',
        status: 'resolved',
      })
    ).status,
  ).toBe(422);
  expect((await get('/api/v1/recipes/bad/reviews')).status).toBe(400);
  expect((await get('/api/v1/admin/reports', b)).status).toBe(403);
  await identity.models.User.updateOne(
    { _id: b.actor.user._id },
    { status: 'suspended' },
  );
  expect((await review(r)).status).toBe(401);
  expect((await newComment(r)).status).toBe(401);
});
it('RPT-09/10/11/12 MOD-05 rejected decision, concurrent admins, state terminal and new pending report', async () => {
  const r = await published(),
    rep = (await report(r)).body.data;
  const pending = await get('/api/v1/admin/reports', admin);
  expect(pending.body.data).toHaveLength(1);
  expect(pending.body.data[0].target.title).toBe(r.title);
  const decisions = await Promise.all([
    resolve(rep, { resolution: 'rejected' }, admin),
    resolve(rep, { resolution: 'resolved' }, admin2),
  ]);
  expect(decisions.map((v) => v.status).sort()).toEqual([200, 409]);
  const stored = await recipes.social.models.Report.findById(rep.reportId);
  expect(['resolved', 'rejected']).toContain(stored.status);
  expect(stored.reviewedBy).not.toBe(null);
  expect((await resolve(stored)).status).toBe(409);
  expect((await report(r)).status).toBe(201);
  expect(
    (await auditRows()).filter(
      (r) => r.outcome === 'applied' && r.action === 'report_resolution',
    ),
  ).toHaveLength(1);
});
it('MOD-01/02/08/09/10/14/15 Recipe moderation CAS, idempotent audited receipt and restore does not publish draft', async () => {
  let r = await published();
  const key = randomUUID(),
    old = await recipes.Recipe.findById(r._id).lean();
  const hidden = await moderate(r, 'hidden', 'recipe', admin, key);
  expect(hidden.status).toBe(200);
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).body.data).toEqual(
    hidden.body.data,
  );
  expect((await moderate(r)).status).toBe(409);
  r = await recipes.Recipe.findById(r._id);
  expect(r.status).toBe(old.status);
  expect(r.slug).toBe(old.slug);
  expect(r.authorId).toEqual(old.authorId);
  expect(r.steps.toObject()).toEqual(old.steps);
  r = await recipes.publication.unpublish(a.actor, r._id, {
    version: r.version,
  });
  await expect(
    recipes.publication.publish(a.actor, r._id, { version: r.version }),
  ).rejects.toMatchObject({ code: 'RECIPE_STATE_CONFLICT' });
  expect((await moderate(r, 'normal')).status).toBe(200);
  expect((await recipes.Recipe.findById(r._id)).status).toBe('draft');
  expect((await reviews(r)).status).toBe(404);
  const audits = await auditRows();
  expect(audits.filter((v) => v.outcome === 'applied')).toHaveLength(2);
  expect(audits[0].before.status).toBe('normal');
  expect(audits[0].after.status).toBe('hidden');
});
it('MOD-09 concurrent admins exactly one target transition/audit applied', async () => {
  const r = await published();
  const results = await Promise.all([
    moderate(r, 'hidden', 'recipe', admin),
    moderate(r, 'hidden', 'recipe', admin2),
  ]);
  expect(results.map((v) => v.status).sort()).toEqual([200, 409]);
  expect(
    (await auditRows()).filter((v) => v.outcome === 'applied'),
  ).toHaveLength(1);
});
it('COM-05/06/14 MOD-03/04 hide parent suppresses replies; restore cannot undelete', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  await newComment(r, { content: 'Reply', parentId: root.commentId }, c);
  const current = await recipes.social.models.Comment.findById(root.commentId);
  expect((await moderate(current, 'hidden', 'comment')).status).toBe(200);
  expect((await comments(r)).body.meta.total).toBe(0);
  expect(
    (
      await newComment(r, {
        content: 'Hidden parent reply',
        parentId: root.commentId,
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await write(b, 'patch', `/api/v1/comments/${root.commentId}`, {
        version: current.version + 1,
        content: 'Bypass',
      })
    ).status,
  ).toBe(404);
  const hidden = await recipes.social.models.Comment.findById(root.commentId);
  expect((await moderate(hidden, 'visible', 'comment')).status).toBe(200);
  expect((await comments(r)).body.meta.total).toBe(2);
  await write(b, 'delete', `/api/v1/comments/${root.commentId}`);
  expect(
    (
      await moderate(
        await recipes.social.models.Comment.findById(root.commentId),
        'visible',
        'comment',
      )
    ).status,
  ).toBe(404);
});
it('MOD-03/08 admin hide vs owner edit uses same version fence', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  const results = await Promise.all([
    moderate(root, 'hidden', 'comment'),
    write(b, 'patch', `/api/v1/comments/${root.commentId}`, {
      content: 'Edit',
      version: 0,
    }),
  ]);
  expect(results.filter((v) => v.status === 200)).toHaveLength(1);
  const row = await recipes.social.models.Comment.findById(root.commentId);
  expect(row.version).toBe(1);
});
it('MOD-05/06/07 RBAC freshness, spoof input, CSRF, and never-public draft deny', async () => {
  const r = await published();
  expect((await moderate(r, 'hidden', 'recipe', b)).status).toBe(403);
  const path = `/api/v1/admin/recipes/${r._id}/moderation`;
  expect(
    (
      await write(admin, 'patch', path, {
        version: 0,
        status: 'hidden',
        reason: 'x',
        role: 'admin',
      })
    ).status,
  ).toBe(422);
  expect(
    (
      await write(
        admin,
        'patch',
        path,
        { version: r.version, status: 'hidden', reason: 'x' },
        randomUUID(),
        'wrong',
      )
    ).status,
  ).toBe(403);
  await identity.models.User.updateOne(
    { _id: admin.actor.user._id },
    { role: 'user' },
  );
  expect((await moderate(r)).status).toBe(403);
  await identity.models.User.updateOne(
    { _id: admin.actor.user._id },
    { role: 'admin' },
  );
  const draft = await recipes.service.create(a.actor, {}, randomUUID());
  expect((await moderate(draft)).status).toBe(404);
});
it('RPT-10 AUD-01/02/09 resolution hide emits two linked durable audits and no duplicate retry', async () => {
  const r = await published(),
    rep = (await report(r)).body.data,
    key = randomUUID(),
    body = { action: 'hide', targetVersion: r.version };
  const result = await resolve(rep, body, admin, key);
  expect(result.status).toBe(200);
  expect((await resolve(rep, body, admin, key)).body.data).toEqual(
    result.body.data,
  );
  expect((await recipes.Recipe.findById(r._id)).moderationStatus).toBe(
    'hidden',
  );
  expect(
    (await auditRows()).filter((v) => v.outcome === 'applied'),
  ).toHaveLength(2);
  expect((await reviews(r)).status).toBe(404);
  expect(
    (
      await resolve(rep, {
        resolution: 'rejected',
        action: 'hide',
        targetVersion: r.version,
      })
    ).status,
  ).toBe(422);
});
it('RPT-13/14 admin resolution after target deleted/unpublished has no content leak or accidental restore', async () => {
  let r = await published();
  const rep = (await report(r)).body.data;
  r = await recipes.publication.unpublish(a.actor, r._id, {
    version: r.version,
  });
  await recipes.service.update(a.actor, r._id, {
    version: r.version,
    title: 'PRIVATE DRAFT CONTENT',
  });
  const listed = await get('/api/v1/admin/reports', admin);
  expect(JSON.stringify(listed.body)).not.toContain('PRIVATE DRAFT CONTENT');
  expect(listed.body.data[0].target.available).toBe(false);
  await recipes.Recipe.updateOne({ _id: r._id }, { deletedAt: new Date() });
  expect((await resolve(rep)).status).toBe(200);
  expect((await recipes.Recipe.findById(r._id)).deletedAt).not.toBe(null);
});
it('AUD-05 intent persistence failure leaves target unchanged and no fake success', async () => {
  const r = await published();
  vi.spyOn(identity.models.AuditLog, 'create').mockRejectedValueOnce(
    new Error('sensitive-canary'),
  );
  const result = await moderate(r);
  expect(result.status).toBe(503);
  expect(result.text).not.toContain('sensitive-canary');
  expect((await recipes.Recipe.findById(r._id)).moderationStatus).toBe(
    'normal',
  );
  expect(await auditRows()).toHaveLength(0);
});
it('AUD-06/08 target failure preserves intent; bounded reconciliation applies it exactly once', async () => {
  const r = await published();
  vi.spyOn(recipes.Recipe, 'findOneAndUpdate').mockRejectedValueOnce(
    new Error('DB unavailable'),
  );
  expect((await moderate(r)).status).toBe(503);
  expect((await auditRows())[0].outcome).toBe('pending');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ['backend/scripts/social-reconcile.js', '--apply', '--limit=20'],
    {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        SMTP_ENABLED: 'false',
        DB_NAME: 'recipe-hub-test',
        MONGODB_URI: config.MONGODB_URI,
      },
      timeout: 10000,
    },
  );
  expect(JSON.parse(stdout).moderation.applied).toBe(1);
  expect((await recipes.Recipe.findById(r._id)).version).toBe(r.version + 1);
  expect((await recipes.social.moderation.reconcile()).scanned).toBe(0);
});
it('AUD-07/08 target committed but response lost; retry uses durable marker not duplicate side effect', async () => {
  const r = await published(),
    key = randomUUID(),
    original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  vi.spyOn(recipes.Recipe, 'findOneAndUpdate').mockImplementationOnce(
    async (...args) => {
      await original(...args);
      throw new Error('lost response');
    },
  );
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).status).toBe(503);
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).status).toBe(200);
  expect((await recipes.Recipe.findById(r._id)).version).toBe(r.version + 1);
  expect(await auditRows()).toHaveLength(1);
});
it('AUD-05/07 audit finalize failure blocks next moderation and repairs without lost committed action', async () => {
  const r = await published(),
    key = randomUUID(),
    Audit = identity.models.AuditLog,
    original = Audit.updateOne.bind(Audit);
  vi.spyOn(Audit, 'updateOne').mockImplementationOnce(async (...args) => {
    if (args[1].$set.outcome === 'applied')
      throw new Error('audit finalization unavailable');
    return original(...args);
  });
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).status).toBe(503);
  const row = await recipes.Recipe.findById(r._id);
  expect(row.moderationStatus).toBe('hidden');
  expect((await moderate(row, 'normal')).status).toBe(409);
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).status).toBe(200);
  expect((await auditRows())[0].outcome).toBe('applied');
  expect(
    (await recipes.Recipe.findById(r._id).select('+moderationIntent'))
      .moderationIntent,
  ).toBe(null);
});
it('AUD-07 applied audit with uncleared target marker is reconciled after cleanup failure', async () => {
  const r = await published(),
    original = recipes.Recipe.updateOne.bind(recipes.Recipe);
  vi.spyOn(recipes.Recipe, 'updateOne').mockImplementationOnce(
    async (...args) => {
      if (args[0].moderationIntent) throw new Error('cleanup unavailable');
      return original(...args);
    },
  );
  expect((await moderate(r)).status).toBe(503);
  expect((await auditRows())[0].outcome).toBe('applied');
  expect((await recipes.social.moderation.reconcile()).applied).toBe(1);
  expect(
    (await recipes.Recipe.findById(r._id).select('+moderationIntent'))
      .moderationIntent,
  ).toBe(null);
});
it('AUD-07/09 report target committed before report failure; recovery retains decision and dedupes both audits', async () => {
  const r = await published(),
    rep = (await report(r)).body.data,
    Report = recipes.social.models.Report,
    original = Report.findOneAndUpdate.bind(Report);
  vi.spyOn(Report, 'findOneAndUpdate').mockImplementation(async (...args) => {
    if (args[1].$set?.status) throw new Error('report finalize unavailable');
    return original(...args);
  });
  expect(
    (await resolve(rep, { action: 'hide', targetVersion: r.version })).status,
  ).toBe(503);
  expect((await recipes.Recipe.findById(r._id)).moderationStatus).toBe(
    'hidden',
  );
  expect((await resolve(rep, {}, admin2)).status).toBe(409);
  vi.restoreAllMocks();
  const result = await recipes.social.moderation.reconcile();
  expect(result.uncertain).toBe(0);
  expect((await Report.findById(rep.reportId)).status).toBe('resolved');
  expect(
    (await auditRows()).filter((v) => v.outcome === 'applied'),
  ).toHaveLength(2);
  expect((await recipes.Recipe.findById(r._id)).version).toBe(r.version + 1);
});
it('AUD-07 report final commit response lost can be repaired without a second resolution', async () => {
  const r = await published(),
    rep = (await report(r)).body.data,
    Report = recipes.social.models.Report,
    original = Report.findOneAndUpdate.bind(Report),
    key = randomUUID();
  vi.spyOn(Report, 'findOneAndUpdate').mockImplementation(async (...args) => {
    const value = await original(...args);
    if (args[1].$set?.status) throw new Error('lost resolution response');
    return value;
  });
  expect((await resolve(rep, {}, admin, key)).status).toBe(503);
  vi.restoreAllMocks();
  expect((await resolve(rep, {}, admin, key)).status).toBe(200);
  expect(
    (await auditRows()).filter((v) => v.outcome === 'applied'),
  ).toHaveLength(1);
});
it('AUD-06 report target CAS conflict fences report claim; no false applied decision', async () => {
  const r = await published(),
    rep = (await report(r)).body.data,
    original = recipes.Recipe.findOneAndUpdate.bind(recipes.Recipe);
  vi.spyOn(recipes.Recipe, 'findOneAndUpdate').mockImplementationOnce(
    async (...args) => {
      await recipes.Recipe.updateOne({ _id: r._id }, { $inc: { version: 1 } });
      return original(...args);
    },
  );
  expect(
    (await resolve(rep, { action: 'hide', targetVersion: r.version })).status,
  ).toBe(409);
  const stored = await recipes.social.models.Report.findById(
    rep.reportId,
  ).select('+decisionIntent');
  expect(stored.status).toBe('pending');
  expect(stored.version).toBe(1);
  expect(stored.decisionIntent).toBe(null);
  expect((await recipes.Recipe.findById(r._id)).moderationStatus).toBe(
    'normal',
  );
  expect(
    (await auditRows()).filter((v) => v.outcome === 'applied'),
  ).toHaveLength(0);
  expect((await resolve(stored)).status).toBe(200);
});
it('AUD-05/08 child audit creation failure retains report claim and replay finishes both steps', async () => {
  const r = await published(),
    rep = (await report(r)).body.data,
    Audit = identity.models.AuditLog,
    original = Audit.create.bind(Audit),
    key = randomUUID();
  vi.spyOn(Audit, 'create').mockImplementation(async (...args) => {
    if (args[0].action === 'recipe_moderation')
      throw new Error('child audit unavailable');
    return original(...args);
  });
  expect(
    (
      await resolve(
        rep,
        { action: 'hide', targetVersion: r.version },
        admin,
        key,
      )
    ).status,
  ).toBe(503);
  expect((await recipes.Recipe.findById(r._id)).moderationStatus).toBe(
    'normal',
  );
  vi.restoreAllMocks();
  expect(
    (
      await resolve(
        rep,
        { action: 'hide', targetVersion: r.version },
        admin,
        key,
      )
    ).status,
  ).toBe(200);
  expect(
    (await auditRows()).filter((v) => v.outcome === 'applied'),
  ).toHaveLength(2);
});
it('AUD-04/09 operation key cannot be reused for different target/state/body', async () => {
  const r = await published(),
    key = randomUUID();
  await moderate(r, 'hidden', 'recipe', admin, key);
  expect((await moderate(r, 'normal', 'recipe', admin, key)).status).toBe(409);
  expect(
    (await moderate(await published(), 'hidden', 'recipe', admin, key)).status,
  ).toBe(409);
  expect(await auditRows()).toHaveLength(1);
});
it('COM-12 reply parent commit response loss and cleanup error recover through bounded command service', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data,
    Model = recipes.social.models.Comment,
    original = Model.findOneAndUpdate.bind(Model),
    key = randomUUID();
  vi.spyOn(Model, 'findOneAndUpdate').mockImplementationOnce(
    async (...args) => {
      await original(...args);
      throw new Error('parent response lost');
    },
  );
  expect(
    (
      await newComment(
        r,
        { content: 'Pending reply', parentId: root.commentId },
        c,
        key,
      )
    ).status,
  ).toBe(503);
  expect((await recipes.social.comments.reconcile()).completed).toBe(1);
  expect((await comments(r)).body.meta.total).toBe(2);
  const replay = await newComment(
    r,
    { content: 'Pending reply', parentId: root.commentId },
    c,
    key,
  );
  expect(replay.status).toBe(201);
});
it('COM-02/16 comment root lost create response, idempotent retry and hidden replay fail-closed', async () => {
  const r = await published(),
    Model = recipes.social.models.Comment,
    original = Model.create.bind(Model),
    key = randomUUID();
  vi.spyOn(Model, 'create').mockImplementationOnce(async (...args) => {
    await original(...args);
    throw new Error('lost root response');
  });
  expect(
    (await newComment(r, { content: 'Root recovery' }, b, key)).status,
  ).toBe(503);
  const result = await newComment(r, { content: 'Root recovery' }, b, key);
  expect(result.status).toBe(201);
  expect(await Model.countDocuments({ recipeId: r._id })).toBe(1);
  await moderate(result.body.data, 'hidden', 'comment');
  expect(
    (await newComment(r, { content: 'Root recovery' }, b, key)).status,
  ).toBe(404);
});
it('MOD-13 actual Recipe moderation revokes existing secure media gateway grant without storage mutation', async () => {
  const r = await published();
  const { createRecipeMedia } =
    await import('../../src/modules/recipes/recipe-media.service.js');
  const { randomBytes } = await import('node:crypto');
  const assetId = new mongoose.Types.ObjectId();
  // Registry fixture only: no upload/provider invocation or public URL.
  const asset = {
    _id: assetId,
    ownerId: r.authorId,
    status: 'attached',
    purpose: 'recipe_cover',
    uploadOutcome: 'confirmed',
    cloudinary: { deliveryType: 'authenticated' },
    attachedTo: { resourceId: r._id, kind: 'recipe_cover' },
  };
  await recipes.Recipe.updateOne(
    { _id: r._id },
    { coverImageAssetId: assetId },
  );
  const gateway = createRecipeMedia({
    Recipe: recipes.Recipe,
    User: identity.models.User,
    MediaAsset: { findOne: async () => asset },
    publication: recipes.publication,
    transport: {
      read: async () => ({ buffer: randomBytes(1), contentType: 'image/png' }),
    },
  });
  expect(
    await gateway.authorize(undefined, String(r._id), String(assetId)),
  ).toBeDefined();
  await moderate(r);
  await expect(
    gateway.authorize(undefined, String(r._id), String(assetId)),
  ).rejects.toMatchObject({ status: 404 });
});
it('QA-02 audit payload minimal, admin context bounded and public DTO no private metadata', async () => {
  const r = await published();
  await review(r);
  const root = (await newComment(r)).body.data;
  await report(root, 'comment');
  await moderate(root, 'hidden', 'comment');
  const audits = JSON.stringify(await auditRows());
  expect(audits).not.toMatch(
    /passwordHash|tokenHash|csrfToken|cloudinary|creationKey|Bình luận/,
  );
  const backlog = await get('/api/v1/admin/reports', admin);
  expect(backlog.body.data[0].target.content).toBe('Bình luận');
  expect((await report(root, 'comment', c)).status).toBe(404);
  expect((await comments(r)).body.meta.total).toBe(0);
});
it('REV-16 COM-13 RPT-09 database indexes and explain plans on representative local fixtures', async () => {
  const r = await published(),
    { Review, Comment, Report } = recipes.social.models;
  await Review.insertMany(
    Array.from({ length: 100 }, () => ({
      userId: new mongoose.Types.ObjectId(),
      recipeId: r._id,
      rating: 4,
      status: 'visible',
    })),
  );
  await Comment.insertMany(
    Array.from({ length: 100 }, () => ({
      authorId: b.actor.user._id,
      recipeId: r._id,
      content: 'Indexed comment',
    })),
  );
  const plans = [];
  for (const [Model, filter, index] of [
    [
      Review,
      { recipeId: r._id, status: 'visible' },
      'recipeId_1_status_1_createdAt_-1__id_-1',
    ],
    [
      Comment,
      {
        recipeId: r._id,
        status: 'visible',
        deletedAt: null,
        creationState: 'complete',
      },
      'recipeId_1_status_1_deletedAt_1_creationState_1_createdAt_1__id_1',
    ],
    [Report, { status: 'pending' }, 'status_1_createdAt_-1__id_-1'],
  ]) {
    const plan = await Model.find(filter)
      .sort({
        createdAt: Model === Comment ? 1 : -1,
        _id: Model === Comment ? 1 : -1,
      })
      .limit(20)
      .maxTimeMS(3000)
      .explain('executionStats');
    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain(index);
    plans.push({
      collection: Model.collection.name,
      index,
      docs: plan.executionStats.totalDocsExamined,
      keys: plan.executionStats.totalKeysExamined,
      millis: plan.executionStats.executionTimeMillis,
    });
  }
  const indexes = await Report.collection.indexes();
  expect(indexes.find((i) => i.unique).partialFilterExpression).toEqual({
    status: 'pending',
  });
  const AuditIndexes = await identity.models.AuditLog.collection.indexes();
  expect(AuditIndexes.find((i) => i.name === 'operationKey_1').unique).toBe(
    true,
  );
  console.log('BE13_EXPLAIN', JSON.stringify(plans));
  // Exact IDs created by this performance case, including synthetic review users.
  await Review.deleteMany({ recipeId: r._id });
});
it('COM-12 deterministic parent hide after eligibility rejects reply fence; replay key cannot bypass', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data,
    Model = recipes.social.models.Comment,
    original = Model.findOneAndUpdate.bind(Model);
  vi.spyOn(Model, 'findOneAndUpdate').mockImplementationOnce(
    async (...args) => {
      await moderate(root, 'hidden', 'comment');
      return original(...args);
    },
  );
  expect(
    (
      await newComment(
        r,
        { content: 'Racing hidden parent', parentId: root.commentId },
        c,
      )
    ).status,
  ).toBe(409);
  expect((await comments(r)).body.meta.total).toBe(0);
});
it('COM-15 deterministic unpublish during comment create keeps interaction inaccessible and returns no private content', async () => {
  let r = await published();
  const Model = recipes.social.models.Comment,
    original = Model.create.bind(Model),
    key = randomUUID();
  vi.spyOn(Model, 'create').mockImplementationOnce(async (...args) => {
    r = await recipes.publication.unpublish(a.actor, r._id, {
      version: r.version,
    });
    return original(...args);
  });
  const res = await newComment(r, { content: 'Before unpublish' }, b, key);
  expect(res.status).toBe(404);
  expect(res.text).not.toContain('Before unpublish');
  expect((await comments(r)).status).toBe(404);
  expect(
    (await newComment(r, { content: 'Before unpublish' }, b, key)).status,
  ).toBe(404);
});
it('MOD-04 owner deletion before Admin restore CAS keeps deleted content hidden', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data;
  await moderate(root, 'hidden', 'comment');
  const hidden = await recipes.social.models.Comment.findById(root.commentId),
    Model = recipes.social.models.Comment,
    original = Model.findOneAndUpdate.bind(Model);
  vi.spyOn(Model, 'findOneAndUpdate').mockImplementationOnce(
    async (...args) => {
      await write(b, 'delete', `/api/v1/comments/${root.commentId}`);
      return original(...args);
    },
  );
  expect((await moderate(hidden, 'visible', 'comment')).status).toBe(409);
  expect((await Model.findById(root.commentId)).deletedAt).not.toBe(null);
  expect((await comments(r)).body.meta.total).toBe(0);
});
it('AUD-07 completed reply with uncleared marker is repaired without adding another reply', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data,
    Model = recipes.social.models.Comment,
    original = Model.updateOne.bind(Model);
  vi.spyOn(Model, 'updateOne').mockImplementationOnce(async (...args) => {
    if (args[0].replyIntent) throw new Error('reply marker cleanup');
    return original(...args);
  });
  expect(
    (
      await newComment(
        r,
        { content: 'Durable reply', parentId: root.commentId },
        c,
      )
    ).status,
  ).toBe(503);
  expect((await recipes.social.comments.reconcile()).completed).toBe(1);
  expect(await Model.countDocuments({ recipeId: r._id })).toBe(2);
  expect(
    (await Model.findById(root.commentId).select('+replyIntent')).replyIntent,
  ).toBe(null);
});
it('REV-16 public review paging tie-breaker and strict query; suspended count remains correct', async () => {
  const r = await published();
  for (const who of [b, c, admin]) await review(r, { rating: 4 }, who);
  await recipes.social.models.Review.updateMany(
    { recipeId: r._id },
    { createdAt: new Date('2025-01-01') },
  );
  const path = `/api/v1/recipes/${r._id}/reviews`,
    all = await request(app).get(path).query({ sort: 'createdAt' });
  const pages = [];
  for (let page = 1; page <= 3; page++) {
    const res = await request(app)
      .get(path)
      .query({ page, limit: 1, sort: 'createdAt' });
    expect(res.body.meta.total).toBe(3);
    pages.push(res.body.data[0].reviewId);
  }
  expect(pages).toEqual(all.body.data.map((v) => v.reviewId));
  expect(
    (await request(app).get(path).query({ page: 4, limit: 1 })).body.data,
  ).toEqual([]);
  expect((await request(app).get(path).query({ sort: 'rating' })).status).toBe(
    400,
  );
});
it('RPT-10 comment report hide action uses Comment CAS and linked audit', async () => {
  const r = await published(),
    root = (await newComment(r)).body.data,
    rep = (await report(root, 'comment', c)).body.data;
  expect(
    (await resolve(rep, { action: 'hide', targetVersion: root.version }))
      .status,
  ).toBe(200);
  expect((await comments(r)).body.meta.total).toBe(0);
  expect((await auditRows()).map((a) => a.action).sort()).toEqual([
    'comment_moderation',
    'report_resolution',
  ]);
});
it('QA-07 mutation rate limit is independent of auth/health and retains CSRF', async () => {
  const { socialRoutes } =
    await import('../../src/modules/social/social.routes.js');
  const { createSocialController } =
    await import('../../src/modules/social/social.controller.js');
  const { authenticate } = await import('../../src/middleware/authenticate.js');
  const r = await published(),
    social = {
      ...recipes.social,
      router: socialRoutes(
        createSocialController(recipes.social),
        authenticate(identity.sessions, identity.security.sessionCookie),
        { ...identity.security, socialRateLimit: 1 },
      ),
    };
  const server = createApp({
      identity,
      catalog,
      media,
      recipes: { ...recipes, social },
      config,
      logger,
      isReady: db.isReady,
    }),
    client = request(server);
  const cookies = await b.client.get('/api/v1/auth/csrf');
  b.token = cookies.body.data.csrfToken;
  // Use the real authenticated agent against another application sharing the identity service.
  const session = await identity.sessions.create(
    await identity.models.User.findById(b.actor.user._id).select(
      '+authVersion',
    ),
  );
  const cookie = `${identity.security.sessionCookie}=${session.token}`;
  const agent = request.agent(server);
  await agent.get('/api/v1/auth/csrf').set('Cookie', cookie);
  const token = (await agent.get('/api/v1/auth/csrf').set('Cookie', cookie))
    .body.data.csrfToken;
  expect(
    (
      await agent
        .put(`/api/v1/recipes/${r._id}/my-review`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ rating: 4 })
    ).status,
  ).toBe(201);
  expect(
    (
      await agent
        .put(`/api/v1/recipes/${r._id}/my-review`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ rating: 4 })
    ).status,
  ).toBe(429);
  expect((await client.get('/health/live')).status).toBe(200);
  expect(cookies.status).toBe(200);
});
it('AUD-05 intent creation committed but acknowledgement lost is recovered by same key', async () => {
  const r = await published(),
    key = randomUUID(),
    Audit = identity.models.AuditLog,
    original = Audit.create.bind(Audit);
  vi.spyOn(Audit, 'create').mockImplementationOnce(async (...args) => {
    await original(...args);
    throw new Error('lost audit acknowledgement');
  });
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).status).toBe(503);
  expect((await recipes.Recipe.findById(r._id)).moderationStatus).toBe(
    'normal',
  );
  expect((await moderate(r, 'hidden', 'recipe', admin, key)).status).toBe(200);
  expect(await auditRows()).toHaveLength(1);
});
it('RPT-11 explicit rejection records reviewer/audit and never hides or edits target', async () => {
  const r = await published(),
    rep = (await report(r)).body.data,
    before = await recipes.Recipe.findById(r._id).lean();
  expect((await resolve(rep, { resolution: 'rejected' })).status).toBe(200);
  const stored = await recipes.social.models.Report.findById(rep.reportId);
  expect(stored.status).toBe('rejected');
  expect(String(stored.reviewedBy)).toBe(String(admin.actor.user._id));
  expect(await recipes.Recipe.findById(r._id).lean()).toEqual(before);
  expect((await auditRows())[0].after.status).toBe('rejected');
});
it('REV-12 moderation survives review deletion; hidden review cannot be recreated as visible', async () => {
  const r = await published(),
    created = await review(r),
    id = created.body.data.reviewId,
    Model = recipes.social.models.Review;
  await Model.updateOne({ _id: id }, { status: 'hidden' });
  expect(
    (await write(b, 'delete', `/api/v1/recipes/${r._id}/my-review`)).status,
  ).toBe(204);
  expect((await review(r, { rating: 5 })).status).toBe(409);
  const row = await Model.findById(id);
  expect(row.status).toBe('hidden');
  expect(row.deletedAt).toBeInstanceOf(Date);
  expect((await reviews(r)).body.summary.ratingCount).toBe(0);
});
