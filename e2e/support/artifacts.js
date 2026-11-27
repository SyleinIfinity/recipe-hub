import { test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export function screenshotPath(name) {
  return test.info().outputPath('screenshots', name);
}

export async function writeVerification(name, contents) {
  const path = test.info().outputPath('verification', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}
