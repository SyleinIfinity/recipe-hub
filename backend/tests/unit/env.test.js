import { describe, it, expect } from 'vitest';
import { parseEnv } from '../../src/config/env.js';

const development = {
  MONGODB_URI: 'mongodb://127.0.0.1:27019/recipe-hub',
  DB_NAME: 'recipe-hub',
};
describe('environment validation', () => {
  it('accepts development configuration with safe defaults', () => {
    expect(parseEnv(development)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      DB_NAME: 'recipe-hub',
    });
  });
  it('accepts an isolated test database', () => {
    expect(
      parseEnv({
        NODE_ENV: 'test',
        DB_NAME: 'recipe-hub-test',
        MONGODB_URI: 'mongodb://127.0.0.1:27018/recipe-hub-test',
      }).DB_NAME,
    ).toBe('recipe-hub-test');
  });
  it.each([
    {},
    { ...development, PORT: 'abc' },
    { ...development, PORT: '-1' },
    { ...development, NODE_ENV: 'staging' },
    { ...development, DB_TIMEOUT_MS: '0' },
    { ...development, NODE_ENV: 'test' },
    { ...development, NODE_ENV: 'test', DB_NAME: 'recipe-hub-test' },
    {
      ...development,
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI: 'mongodb://localhost/recipe-hub-test',
    },
  ])('rejects invalid or cross-environment configuration %#', (input) => {
    expect(() => parseEnv(input)).toThrow('Invalid environment fields');
  });
  it('does not include input values in validation errors', () => {
    expect(() =>
      parseEnv({ ...development, MONGODB_URI: 'secret-value' }),
    ).toThrow('MONGODB_URI');
    try {
      parseEnv({ ...development, MONGODB_URI: 'secret-value' });
    } catch (error) {
      expect(error.message).not.toContain('secret-value');
    }
  });
});
