import { test, expect } from '@playwright/test';

test('React connects to the running API and MongoDB', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Recipe Hub — Trang chủ' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Kết nối thành công');
});
