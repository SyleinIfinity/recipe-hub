import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadSpec } from '../../src/openapi/docs.js';
import { parseEnv } from '../../src/config/env.js';
import {
  validateContract,
  schemaValidator,
  resolveRef,
  operations,
} from '../../../scripts/openapi-contract.js';
import {
  registerSchema,
  loginSchema,
} from '../../src/modules/auth/auth.validation.js';
import {
  profileSchema,
  preferencesSchema,
} from '../../src/modules/users/user.validation.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuery,
} from '../../src/modules/categories/category.validation.js';
import {
  createIngredientSchema,
  ingredientQuery,
} from '../../src/modules/ingredients/ingredient.validation.js';
const spec = loadSpec();
const validates = schemaValidator(spec);
it('DOC-01..04/09/10/13/14/21/22 validates OAS and actual route-factory inventory offline', async () => {
  expect(await validateContract(spec)).toEqual({
    paths: 46,
    operations: 53,
    schemas: 51,
  });
});
it.each(['ref', 'operationId', 'path', 'csrf', '204'])(
  'DOC-21 contract gate fails for %s drift',
  async (kind) => {
    const changed = structuredClone(spec);
    if (kind === 'ref')
      changed.components.schemas.PublicUserDTO = {
        $ref: '#/components/schemas/Missing',
      };
    if (kind === 'operationId')
      changed.paths['/health/live'].get.operationId = 'getReadiness';
    if (kind === 'path') delete changed.paths['/api/v1/categories'];
    if (kind === 'csrf')
      changed.paths['/api/v1/auth/login'].post.parameters = [];
    if (kind === '204')
      changed.paths['/api/v1/auth/logout'].post.responses[204].content = {
        'application/json': { schema: { type: 'object' } },
      };
    await expect(validateContract(changed)).rejects.toThrow();
  },
);
it('DOC-11/12 DTOs are closed and 204 never has content', () => {
  for (const [key, schema] of Object.entries(spec.components.schemas))
    if (key.endsWith('DTO')) expect(schema.additionalProperties).toBe(false);
  expect(spec.components.schemas.AdminUserDTO.properties).not.toHaveProperty(
    'preferences',
  );
  for (const op of operations(spec))
    if (op.responses[204])
      expect(op.responses[204]).not.toHaveProperty('content');
});
it('DOC-15 request examples and canonical boundaries agree with Zod', () => {
  const cases = [
    [
      'RegisterRequest',
      registerSchema,
      {
        email: 'dev@example.test',
        password: 'Example passphrase',
        displayName: 'Dev',
      },
      { email: 'bad', password: 'short', displayName: 'D' },
    ],
    [
      'LoginRequest',
      loginSchema,
      { email: 'dev@example.test', password: 'x' },
      { email: 'dev@example.test', password: '' },
    ],
    [
      'UpdateProfileRequest',
      profileSchema,
      { bio: 'x'.repeat(500) },
      { bio: 'x'.repeat(501) },
    ],
    [
      'UpdatePreferencesRequest',
      preferencesSchema,
      { maxPrepMinutes: 1440 },
      { maxPrepMinutes: 1441 },
    ],
    [
      'CreateCategoryRequest',
      createCategorySchema,
      { name: 'Món', sortOrder: 100000 },
      { name: 'Món', sortOrder: 100001 },
    ],
    ['UpdateCategoryRequest', updateCategorySchema, { isActive: false }, {}],
    [
      'CreateIngredientRequest',
      createIngredientSchema,
      {
        name: 'Gạo',
        aliases: Array.from({ length: 20 }, (_, i) => `Gạo ${i}`),
      },
      {
        name: 'Gạo',
        aliases: Array.from({ length: 21 }, (_, i) => `Gạo ${i}`),
      },
    ],
  ];
  for (const [key, zod, valid, invalid] of cases) {
    expect(zod.safeParse(valid).success).toBe(true);
    expect(() => validates(spec.components.schemas[key], valid)).not.toThrow();
    expect(zod.safeParse(invalid).success).toBe(false);
    expect(() => validates(spec.components.schemas[key], invalid)).toThrow();
    expect(() =>
      validates(spec.components.schemas[key], { ...valid, role: 'admin' }),
    ).toThrow();
  }
  for (const op of operations(spec)) {
    const media = op.requestBody?.content['application/json'];
    if (media?.example) validates(media.schema, media.example);
  }
});
it('DOC-15 query defaults and boundaries match canonical parsed query values', () => {
  for (const [path, zod, queries] of [
    [
      '/api/v1/categories',
      categoryQuery,
      [
        { active: 'true', page: '1000', limit: '100' },
        { active: 'false' },
        { page: '1001' },
        { limit: '101' },
      ],
    ],
    [
      '/api/v1/ingredients',
      ingredientQuery,
      [{ q: 'Thịt', limit: '100' }, { q: 'x'.repeat(101) }, { limit: '101' }],
    ],
  ]) {
    const params = spec.paths[path].get.parameters.map((p) =>
      resolveRef(spec, p),
    );
    for (const query of queries) {
      const valid = Object.entries(query).every(([k, v]) => {
        try {
          const schema = params.find((p) => p.name === k).schema;
          validates(schema, schema.type === 'integer' ? Number(v) : v);
          return true;
        } catch {
          return false;
        }
      });
      expect(zod.safeParse(query).success).toBe(valid);
    }
  }
});
it('DOC-08 production env cannot enable docs, defaults disabled, invalid boolean rejected', () => {
  const base = {
    MONGODB_URI: 'mongodb://localhost:27019/recipe-hub',
    DB_NAME: 'recipe-hub',
  };
  expect(parseEnv(base).APP_DOCS_ENABLED).toBe(false);
  expect(parseEnv({ ...base, APP_DOCS_ENABLED: 'true' }).APP_DOCS_ENABLED).toBe(
    true,
  );
  expect(() => parseEnv({ ...base, APP_DOCS_ENABLED: 'yes' })).toThrow();
  const prod = {
    ...base,
    NODE_ENV: 'production',
    CSRF_SECRET: 'x'.repeat(32),
    APP_ORIGINS: 'https://example.test',
  };
  expect(parseEnv(prod).APP_DOCS_ENABLED).toBe(false);
  expect(() => parseEnv({ ...prod, APP_DOCS_ENABLED: 'true' })).toThrow(
    'APP_DOCS_ENABLED',
  );
});
it('DOC-23 validation is in checks and existing remote CI entry point', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  expect(pkg.scripts.check).toContain('npm run openapi:validate');
  expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain(
    'npm run check',
  );
});
