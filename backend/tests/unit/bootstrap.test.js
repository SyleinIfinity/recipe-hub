import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { it, expect } from 'vitest';

const exec = promisify(execFile);
it('importing app exits without listening or requiring env', async () => {
  const result = await exec(
    process.execPath,
    ['--input-type=module', '-e', "await import('./backend/src/app.js')"],
    { timeout: 3000, env: { PATH: process.env.PATH } },
  );
  expect(result.stdout).toBe('');
  expect(result.stderr).toBe('');
});
it('server rejects invalid env with safe field diagnostics and nonzero exit', async () => {
  try {
    await exec(process.execPath, ['backend/src/server.js'], {
      timeout: 3000,
      env: { PATH: process.env.PATH, MONGODB_URI: 'sensitive-input' },
    });
    throw new Error('Expected startup rejection');
  } catch (error) {
    expect(error.code).toBe(1);
    expect(error.stdout).toContain('configuration_invalid');
    expect(error.stdout).toContain('MONGODB_URI');
    expect(error.stdout).not.toContain('sensitive-input');
  }
});
