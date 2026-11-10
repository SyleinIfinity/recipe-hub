import { beforeAll, afterAll, it, expect, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { createLogger } from '../../src/config/logger.js';
import { createIdentity } from '../../src/modules/auth/identity.js';
import { createCatalog } from '../../src/modules/catalog.js';
import { createApp } from '../../src/app.js';
const config = parseEnv({
  NODE_ENV: 'test',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI:
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/recipe-hub-test',
  AUTH_RATE_LIMIT: 1000,
  CSRF_RATE_LIMIT: 1000,
});
const db = createDatabase(config);
const prefix = `be06-${randomUUID()}`;
const logger = createLogger('silent');
let app, identity, catalog, admin, user, adminId;
let serial = 0;
const name = (label) => `${prefix} ${label} ${serial++}`;
async function csrf(client) {
  const res = await client.get('/api/v1/auth/csrf');
  expect(res.status).toBe(200);
  return res.body.data.csrfToken;
}
async function write(client, method, path, body) {
  const token = await csrf(client);
  return client[method](`/api/v1${path}`).set('X-CSRF-Token', token).send(body);
}
async function login(role) {
  const client = request.agent(app);
  const email = `${prefix}-${role}@example.test`;
  const password = 'Catalog test password!';
  const registered = await write(client, 'post', '/auth/register', {
    email,
    password,
    displayName: 'Catalog Test',
  });
  expect(registered.status).toBe(201);
  const id = registered.body.data.id;
  if (role === 'admin')
    await identity.models.User.updateOne({ _id: id }, { role: 'admin' });
  expect(
    (await write(client, 'post', '/auth/login', { email, password })).status,
  ).toBe(200);
  return { client, id };
}
async function create(kind, body = {}) {
  const res = await write(admin, 'post', `/admin/${kind}`, {
    name: name(kind),
    ...body,
  });
  expect(res.status).toBe(201);
  return res.body.data;
}
beforeAll(async () => {
  await db.connect();
  identity = await createIdentity({
    connection: db.connection,
    config,
    logger,
  });
  catalog = await createCatalog(db.connection, identity);
  app = createApp({ identity, catalog, logger, isReady: db.isReady });
  const a = await login('admin');
  admin = a.client;
  adminId = a.id;
  user = (await login('user')).client;
});
afterAll(async () => {
  vi.restoreAllMocks();
  if (catalog) {
    await catalog.models.Category.deleteMany({
      name: { $regex: `^${prefix}` },
    });
    await catalog.models.Ingredient.deleteMany({
      name: { $regex: `^${prefix}` },
    });
    const users = await identity.models.User.find({
      email: { $regex: `^${prefix}` },
    });
    const ids = users.map((u) => u._id);
    await identity.models.Session.deleteMany({ userId: { $in: ids } });
    await identity.models.User.deleteMany({ _id: { $in: ids } });
  }
  await db.close();
});
it.each(['categories', 'ingredients'])(
  'CAT-01/ING-01 admin create %s persists safe DTO and defaults',
  async (kind) => {
    const data = await create(kind);
    expect(data.isActive).toBe(true);
    expect(data.createdAt).toBeDefined();
    expect(data).not.toHaveProperty('__v');
    expect(data).not.toHaveProperty('lookupKeys');
    expect(data).not.toHaveProperty('normalizedName');
    const Model =
      kind === 'categories'
        ? catalog.models.Category
        : catalog.models.Ingredient;
    expect(Model.collection.name).toBe(kind);
    expect(await Model.findById(data.id)).not.toBeNull();
  },
);
it.each(['categories', 'ingredients'])(
  'CAT-02/03 ING-02/03 guest and ordinary user cannot mutate %s',
  async (kind) => {
    expect(
      (
        await write(request.agent(app), 'post', `/admin/${kind}`, {
          name: name('denied'),
        })
      ).status,
    ).toBe(401);
    expect(
      (await write(user, 'post', `/admin/${kind}`, { name: name('denied') }))
        .status,
    ).toBe(403);
    const data = await create(kind);
    expect(
      (
        await write(user, 'patch', `/admin/${kind}/${data.id}`, {
          isActive: false,
        })
      ).status,
    ).toBe(403);
  },
);
it.each(['categories', 'ingredients'])(
  'CAT-04/05 ING-04 missing/wrong CSRF rejects %s writes',
  async (kind) => {
    for (const token of ['', 'wrong'])
      expect(
        (
          await admin
            .post(`/api/v1/admin/${kind}`)
            .set('X-CSRF-Token', token)
            .send({ name: name('csrf') })
        ).status,
      ).toBe(403);
  },
);
it('CAT-07/08/09 duplicates normalized Unicode slug return 409', async () => {
  const label = name('Món Ăn');
  const first = await create('categories', { name: label });
  expect(first.slug).toContain('món-ăn');
  const res = await write(admin, 'post', '/admin/categories', {
    name: label.toUpperCase().normalize('NFD'),
  });
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('CATEGORY_SLUG_EXISTS');
});
it('CAT-10 name update preserves slug; explicit slug change detects conflicts', async () => {
  const first = await create('categories');
  const other = await create('categories');
  const res = await write(admin, 'patch', `/admin/categories/${first.id}`, {
    name: name('renamed'),
    description: 'Updated',
  });
  expect(res.status).toBe(200);
  expect(res.body.data.slug).toBe(first.slug);
  expect(
    (
      await write(admin, 'patch', `/admin/categories/${first.id}`, {
        slug: other.slug,
      })
    ).status,
  ).toBe(409);
});
it.each(['categories', 'ingredients'])(
  'CAT-06/11 ING-18 body whitelist and boundary errors in %s',
  async (kind) => {
    for (const body of [
      { name: '' },
      { name: { $ne: null } },
      { name: 'a', updatedAt: 'today' },
      { name: 'a', _id: '0'.repeat(24) },
    ])
      expect((await write(admin, 'post', `/admin/${kind}`, body)).status).toBe(
        422,
      );
    const value = await create(kind);
    expect(
      (await write(admin, 'patch', `/admin/${kind}/${value.id}`, {})).status,
    ).toBe(422);
  },
);
it.each(['categories', 'ingredients'])(
  'CAT-12/13/20 ING-21/22 ID and error contracts in %s',
  async (kind) => {
    const invalid = await write(admin, 'patch', `/admin/${kind}/bad-id`, {
      isActive: false,
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
      requestId: expect.any(String),
    });
    expect(
      (
        await write(admin, 'patch', `/admin/${kind}/${'0'.repeat(24)}`, {
          isActive: false,
        })
      ).status,
    ).toBe(404);
  },
);
it.each(['categories', 'ingredients'])(
  'CAT-14/15/19 ING-19/20 deactivation is repeatable, hides %s without deleting',
  async (kind) => {
    const data = await create(kind);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await write(admin, 'patch', `/admin/${kind}/${data.id}`, {
            isActive: false,
          })
        ).status,
      ).toBe(200);
    const url =
      kind === 'categories'
        ? '/api/v1/categories?limit=100'
        : `/api/v1/ingredients?q=${encodeURIComponent(data.name)}`;
    expect(
      (await request(app).get(url)).body.data.map((d) => d.id),
    ).not.toContain(data.id);
    const Model =
      kind === 'categories'
        ? catalog.models.Category
        : catalog.models.Ingredient;
    expect((await Model.findById(data.id)).isActive).toBe(false);
    expect(
      (await write(admin, 'delete', `/admin/${kind}/${data.id}`, {})).status,
    ).toBe(404);
  },
);
it('CAT-16 category ordering and active-only query remain stable', async () => {
  await create('categories', { sortOrder: 20 });
  await create('categories', { sortOrder: 1 });
  const first = await request(app).get('/api/v1/categories?limit=100');
  const second = await request(app).get('/api/v1/categories?limit=100');
  expect(first.body.data).toEqual(second.body.data);
  const keys = first.body.data.map((d) => [d.sortOrder, d.id]);
  expect(keys).toEqual(
    [...keys].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])),
  );
  expect(
    (await request(app).get('/api/v1/categories?active=false')).status,
  ).toBe(400);
  expect((await request(app).get('/api/v1/categories?limit=101')).status).toBe(
    400,
  );
});
it.each(['categories', 'ingredients'])(
  'CAT-17 ING-23 concurrent duplicate create in %s has one winner',
  async (kind) => {
    const token = await csrf(admin);
    const body = { name: name('concurrent') };
    const results = await Promise.all(
      [1, 2].map(() =>
        admin
          .post(`/api/v1/admin/${kind}`)
          .set('X-CSRF-Token', token)
          .send(body),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  },
);
it('CAT-18 ING-24 real unique indexes reject direct duplicate writes', async () => {
  const c = await create('categories');
  const i = await create('ingredients');
  await expect(
    catalog.models.Category.create({ name: name('direct'), slug: c.slug }),
  ).rejects.toMatchObject({ code: 11000 });
  await expect(
    catalog.models.Ingredient.create({ name: i.name.toUpperCase() }),
  ).rejects.toMatchObject({ code: 11000 });
  const indexes = await catalog.models.Ingredient.collection.indexes();
  expect(indexes.some((x) => x.key.normalizedName && x.unique)).toBe(true);
  expect(indexes.some((x) => x.key.lookupKeys && x.unique)).toBe(true);
});
it('ING-05/06/07 Unicode canonical normalization keeps accents distinct', async () => {
  const label = name('Thịt');
  const data = await create('ingredients', {
    name: `  ${label}  `.normalize('NFD'),
  });
  expect(
    (await catalog.models.Ingredient.findById(data.id)).normalizedName,
  ).toBe(label.toLowerCase());
  expect(
    (
      await write(admin, 'post', '/admin/ingredients', {
        name: label.toUpperCase(),
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await write(admin, 'post', '/admin/ingredients', {
        name: label.replace('Thịt', 'Thit'),
      })
    ).status,
  ).toBe(201);
});
it('ING-08/09/10 aliases deduplicate, exclude self and reserve names including inactive entries', async () => {
  const label = name('Heo');
  const alias = name('Lợn');
  const data = await create('ingredients', {
    name: label,
    aliases: [alias, alias.toUpperCase(), label],
  });
  expect(data.aliases).toEqual([alias]);
  expect(
    (await write(admin, 'post', '/admin/ingredients', { name: alias })).status,
  ).toBe(409);
  expect(
    (
      await write(admin, 'post', '/admin/ingredients', {
        name: name('other'),
        aliases: [label],
      })
    ).status,
  ).toBe(409);
  await write(admin, 'patch', `/admin/ingredients/${data.id}`, {
    isActive: false,
  });
  expect(
    (
      await write(admin, 'post', '/admin/ingredients', {
        name: name('other'),
        aliases: [alias],
      })
    ).status,
  ).toBe(409);
});
it('ING-10 alias conflicts are atomic under concurrent creates', async () => {
  const token = await csrf(admin);
  const alias = name('shared');
  const results = await Promise.all(
    [1, 2].map(() =>
      admin
        .post('/api/v1/admin/ingredients')
        .set('X-CSRF-Token', token)
        .send({ name: name('race'), aliases: [alias] }),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
});
it('ING-11/12/13/14/26 searches canonical and alias prefixes once with stable bounded ordering', async () => {
  const group = name('prefix');
  const a = await create('ingredients', {
    name: `${group} b`,
    aliases: [`${group} alias`],
  });
  await create('ingredients', { name: `${group} a` });
  const url = `/api/v1/ingredients?q=${encodeURIComponent(group.toUpperCase().normalize('NFD'))}&limit=100`;
  const first = await request(app).get(url);
  expect(first.body.data).toHaveLength(2);
  expect(first.body.data[1].id).toBe(a.id);
  expect((await request(app).get(url)).body).toEqual(first.body);
  expect(
    (await request(app).get(url.replace('limit=100', 'limit=1'))).body.data,
  ).toHaveLength(1);
  expect(
    (
      await request(app).get(
        `/api/v1/ingredients?q=${encodeURIComponent(group + ' alias')}`,
      )
    ).body.data[0].id,
  ).toBe(a.id);
});
it('ING-15/16 invalid limits/operators are rejected and regex characters searched literally', async () => {
  for (const query of [
    'limit=101',
    'limit=0',
    'limit=1.5',
    'q[$ne]=x',
    'q=' + 'x'.repeat(101),
  ])
    expect(
      (await request(app).get('/api/v1/ingredients?' + query)).status,
    ).toBe(400);
  const label = name('a.*[b]');
  const data = await create('ingredients', { name: label });
  expect(
    (
      await request(app).get('/api/v1/ingredients').query({ q: label })
    ).body.data.map((d) => d.id),
  ).toEqual([data.id]);
  expect(
    (await request(app).get('/api/v1/ingredients').query({ q: '.*' })).body
      .data,
  ).toEqual([]);
});
it('ING-17 updating name and aliases refreshes search keys while preserving identity', async () => {
  const data = await create('ingredients');
  const newName = name('renamed');
  const alias = name('newalias');
  const res = await write(admin, 'patch', `/admin/ingredients/${data.id}`, {
    name: newName,
    aliases: [alias],
    defaultUnit: 'g',
  });
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBe(data.id);
  expect(
    (await catalog.models.Ingredient.findById(data.id)).normalizedName,
  ).toBe(newName.toLowerCase());
  expect(
    (await request(app).get('/api/v1/ingredients').query({ q: data.name })).body
      .data,
  ).toEqual([]);
  expect(
    (await request(app).get('/api/v1/ingredients').query({ q: alias })).body
      .data[0].id,
  ).toBe(data.id);
});
it('ING-25 database errors are sanitized', async () => {
  const fail = vi
    .spyOn(catalog.models.Ingredient.collection, 'insertOne')
    .mockRejectedValueOnce(new Error('private database details'));
  try {
    const res = await write(admin, 'post', '/admin/ingredients', {
      name: name('failure'),
    });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('private database details');
  } finally {
    fail.mockRestore();
  }
});
it('search query uses an index and has a bounded prefix plan', async () => {
  const plan = await catalog.models.Ingredient.find({
    isActive: true,
    lookupKeys: { $regex: '^' + prefix },
  })
    .hint({ isActive: 1, lookupKeys: 1 })
    .limit(20)
    .explain('executionStats');
  expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('IXSCAN');
  expect(JSON.stringify(plan.queryPlanner.winningPlan)).not.toContain(
    'COLLSCAN',
  );
});
it('optimistic concurrency rejects stale model save without overwriting aliases', async () => {
  const data = await create('ingredients');
  const first = await catalog.models.Ingredient.findById(data.id);
  const stale = await catalog.models.Ingredient.findById(data.id);
  first.aliases = [name('saved')];
  await first.save();
  stale.name = name('stale');
  await expect(stale.save()).rejects.toMatchObject({ name: 'VersionError' });
  expect((await catalog.models.Ingredient.findById(data.id)).aliases).toEqual(
    first.aliases,
  );
});
it('suspended admin session cannot mutate either catalog', async () => {
  await identity.models.User.updateOne(
    { _id: adminId },
    { status: 'suspended' },
  );
  try {
    for (const kind of ['categories', 'ingredients'])
      expect(
        (
          await write(admin, 'post', `/admin/${kind}`, {
            name: name('suspended'),
          })
        ).status,
      ).toBe(401);
  } finally {
    await identity.models.User.updateOne(
      { _id: adminId },
      { status: 'active' },
    );
  }
});

it('Vietnamese search normalizes composed/decomposed Unicode and preserves accents', async () => {
  const label = name('Thịt Lợn');
  const data = await create('ingredients', { name: label });
  expect(
    (
      await request(app)
        .get('/api/v1/ingredients')
        .query({ q: label.toUpperCase().normalize('NFD') })
    ).body.data.map((d) => d.id),
  ).toEqual([data.id]);
  expect(
    (
      await request(app)
        .get('/api/v1/ingredients')
        .query({ q: label.replace('Thịt Lợn', 'Thit Lon') })
    ).body.data,
  ).toEqual([]);
});
it('concurrent alias updates cannot claim the same lookup key', async () => {
  const a = await create('ingredients');
  const b = await create('ingredients');
  const alias = name('update-race');
  const token = await csrf(admin);
  const results = await Promise.all(
    [a, b].map((value) =>
      admin
        .patch(`/api/v1/admin/ingredients/${value.id}`)
        .set('X-CSRF-Token', token)
        .send({ aliases: [alias] }),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    await catalog.models.Ingredient.countDocuments({
      lookupKeys: alias.toLowerCase(),
    }),
  ).toBe(1);
});
