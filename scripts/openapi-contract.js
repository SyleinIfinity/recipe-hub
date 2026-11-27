import { bookmarkRoutes } from '../backend/src/modules/bookmarks/bookmark.routes.js';
import { socialRoutes } from '../backend/src/modules/social/social.routes.js';
import { favoriteRoutes } from '../backend/src/modules/favorites/favorite.routes.js';
import { recipeRoutes } from '../backend/src/modules/recipes/recipe.routes.js';
import { mediaRoutes } from '../backend/src/modules/media/media.routes.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { createApp } from '../backend/src/app.js';
import { authRoutes } from '../backend/src/modules/auth/auth.routes.js';
import { userRoutes } from '../backend/src/modules/users/user.routes.js';
import { categoryRoutes } from '../backend/src/modules/categories/category.routes.js';
import { ingredientRoutes } from '../backend/src/modules/ingredients/ingredient.routes.js';
import { loadSpec } from '../backend/src/openapi/docs.js';

const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
export function operations(spec) {
  return Object.entries(spec.paths).flatMap(([path, item]) =>
    methods
      .filter((m) => item[m])
      .map((method) => ({ path, method, ...item[method] })),
  );
}
export function resolveRef(spec, value) {
  if (!value.$ref) return value;
  assert(value.$ref.startsWith('#/'), 'Only local references are allowed');
  return value.$ref
    .slice(2)
    .split('/')
    .reduce((v, k) => v[k], spec);
}
export function schemaValidator(spec) {
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema({ $id: 'recipe-hub', components: spec.components });
  return (schema, data) => {
    const copy = JSON.parse(
      JSON.stringify(schema).replaceAll(
        '"#/components/',
        '"recipe-hub#/components/',
      ),
    );
    const validate = ajv.compile(copy);
    assert(validate(data), JSON.stringify(validate.errors));
  };
}

// Express 5's Layer matcher is internal. Fail closed on unknown routers/mounts.
// Paths are read from real route factories; the explicit mount map is checked
// against the actual app stack, rather than inferred from regexp strings.
export function routeInventory(app, identity, catalog, media, recipes) {
  const mounts = new Map([
    [identity.authRouter, '/api/v1/auth'],
    [identity.userRouter, '/api/v1'],
    ...catalog.routers.map((r) => [r, '/api/v1']),
    ...(media ? [[media.router, '/api/v1']] : []),
    ...(recipes ? [[recipes.router, '/api/v1']] : []),
    ...(recipes?.favoriteRouter ? [[recipes.favoriteRouter, '/api/v1']] : []),
    ...(recipes?.bookmarkRouter ? [[recipes.bookmarkRouter, '/api/v1']] : []),
    ...(recipes?.social ? [[recipes.social.router, '/api/v1']] : []),
  ]);
  const found = [];
  function walk(stack, prefix = '') {
    for (const layer of stack) {
      if (layer.route) {
        assert.equal(
          typeof layer.route.path,
          'string',
          'Unsupported route path',
        );
        const path = prefix + layer.route.path;
        if (
          path === '/api/openapi.json' ||
          path === '/api/docs' ||
          path.startsWith('/api/docs/')
        )
          continue;
        for (const method of Object.keys(layer.route.methods)) {
          assert(methods.includes(method), 'Unsupported HTTP method');
          found.push(
            `${method.toUpperCase()} ${path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`,
          );
        }
      } else if (layer.handle?.stack) {
        const mount = mounts.get(layer.handle);
        assert(
          mount,
          'New router requires an explicit verified mount in contract inventory',
        );
        assert(
          layer.matchers?.some((match) => match(mount)?.path === mount),
          'Router mount differs from verified map',
        );
        walk(layer.handle.stack, prefix + mount);
      }
    }
  }
  walk(app.router.stack);
  assert.equal(new Set(found).size, found.length, 'Duplicate runtime route');
  return found.sort();
}
export function currentRouteInventory() {
  const pass = (_req, _res, next) => next();
  const controller = new Proxy({}, { get: () => pass });
  const security = { protect: pass, limit: () => pass };
  const identity = {
    security,
    authRouter: authRoutes(controller, pass, security),
    userRouter: userRoutes(controller, pass),
  };
  const catalog = {
    routers: [
      categoryRoutes(controller, pass),
      ingredientRoutes(controller, pass),
    ],
  };
  const media = { router: mediaRoutes(controller, pass, security) };
  const recipes = {
    router: recipeRoutes(controller, pass),
    favoriteRouter: favoriteRoutes(controller, pass, pass),
    bookmarkRouter: bookmarkRoutes(controller, pass, pass, pass, pass),
    social: { router: socialRoutes(controller, pass, security) },
  };
  return routeInventory(
    createApp({ identity, catalog, media, recipes }),
    identity,
    catalog,
    media,
    recipes,
  );
}
export async function validateContract(
  spec = loadSpec(),
  inventory = currentRouteInventory(),
) {
  assert.equal(spec.openapi, '3.1.0');
  for (const key of ['schemas', 'parameters', 'responses', 'securitySchemes'])
    assert(spec.components[key]);
  // No network/file reference resolution in CI, even if the spec is edited.
  function refs(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) assert(resolveRef(spec, value), `Unresolved ${value.$ref}`);
    for (const v of Object.values(value)) refs(v);
  }
  refs(spec);
  await SwaggerParser.validate(structuredClone(spec), {
    resolve: { external: false },
  });
  const markdown = readFileSync(
    new URL('../docs/API.md', import.meta.url),
    'utf8',
  );
  const section = markdown
    .split('<!-- live-operations:start -->')[1]
    ?.split('<!-- live-operations:end -->')[0];
  assert(section, 'Missing Markdown inventory');
  assert.deepEqual(
    [
      ...section.matchAll(
        /`((?:GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS) [^`]+)`/g,
      ),
    ]
      .map((m) => m[1])
      .sort(),
    inventory,
    'Markdown route inventory drift',
  );
  const ops = operations(spec);
  assert.equal(
    new Set(ops.map((v) => v.operationId)).size,
    ops.length,
    'Duplicate operationId',
  );
  assert.deepEqual(
    ops.map((v) => `${v.method.toUpperCase()} ${v.path}`).sort(),
    inventory,
  );
  for (const op of ops) {
    assert(op.operationId && op.summary && op.tags.length);
    assert(Array.isArray(op.parameters) && Array.isArray(op.security));
    assert(Object.keys(op.responses).some((code) => /^2\d\d$/.test(code)));
    if (op.responses['204'])
      assert(
        !resolveRef(spec, op.responses['204']).content,
        '204 must have no body',
      );
    if (['post', 'patch', 'put', 'delete'].includes(op.method)) {
      assert(
        op.parameters
          .map((p) => resolveRef(spec, p))
          .some((p) => p.name === 'X-CSRF-Token' && p.required),
      );
      assert(op.responses['403']);
    }
    if (op.path.includes('/admin/'))
      assert.deepEqual(op.security, [{ SessionCookie: [] }]);
    if (op.requestBody)
      assert.equal(
        resolveRef(
          spec,
          (
            op.requestBody.content['application/json'] ||
            op.requestBody.content['multipart/form-data']
          ).schema,
        ).additionalProperties,
        false,
      );
  }
  assert.deepEqual(spec.servers, [
    { url: '/', description: 'Cùng origin với backend' },
  ]);
  assert.equal(spec.components.securitySchemes.SessionCookie.in, 'cookie');
  assert(
    !JSON.stringify(spec.components.schemas).match(
      /passwordHash|authVersion|tokenHash|lookupKeys|normalizedName/,
    ),
  );
  return {
    paths: Object.keys(spec.paths).length,
    operations: ops.length,
    schemas: Object.keys(spec.components.schemas).length,
  };
}
