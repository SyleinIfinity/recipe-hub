import { test, expect } from '@playwright/test';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { createMediaHarness } from './support/media-harness.js';
let harness, category, png, png2;
const emails = [];
const live = process.env.RUN_CLOUDINARY_LIVE === '1';
const artifact = 'docs/verification/BE-FE-RH-P1.1';
test.beforeAll(async () => {
  harness = await createMediaHarness({ live });
  category = await harness.catalog.models.Category.create({
    name: 'Media verification ' + randomUUID(),
    slug: 'p11-' + randomUUID(),
  });
  png = await sharp({
    create: { width: 32, height: 24, channels: 3, background: '#c48742' },
  })
    .png()
    .toBuffer();
  png2 = await sharp({
    create: { width: 32, height: 24, channels: 3, background: '#4277a4' },
  })
    .png()
    .toBuffer();
  await mkdir(artifact, { recursive: true });
});
test.afterAll(async () => {
  if (!harness) return;
  const cleanup = await harness.cleanupOwned(emails);
  await writeFile(
    `${artifact}/${live ? 'live' : 'browser'}-cleanup.json`,
    JSON.stringify(cleanup, null, 2) + '\n',
  );
  await category?.deleteOne();
  await harness.close();
  expect(cleanup.status).toBe('verified');
});
async function account(page) {
  await harness.route(page);
  const u = {
    email: `p11-${randomUUID()}@example.test`,
    password: randomBytes(18).toString('base64url'),
  };
  emails.push(u.email);
  await page.goto('/auth/register');
  await page.getByLabel('Tên hiển thị', { exact: false }).fill('Bếp media');
  await page.getByLabel('Email', { exact: false }).first().fill(u.email);
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(u.password);
  await page
    .getByLabel('Xác nhận mật khẩu *', { exact: true })
    .fill(u.password);
  await page
    .getByRole('button', { name: 'Tạo tài khoản', exact: true })
    .click();
  await expect(
    page.getByText('Đã tạo tài khoản.', { exact: false }),
  ).toBeVisible();
  await page.goto('/auth/login?returnTo=/my/recipes');
  await page.getByLabel('Email', { exact: false }).first().fill(u.email);
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(u.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/my\/recipes$/);
  return u;
}
const picker = (page, name) => page.getByRole('region', { name, exact: true });
async function pick(page, name, bytes = png) {
  const region = picker(page, name);
  await region
    .getByLabel('Chọn ' + name.toLowerCase(), { exact: true })
    .setInputFiles({
      name: 'synthetic.png',
      mimeType: 'image/png',
      buffer: bytes,
    });
  await region
    .getByRole('button', { name: 'Tải ' + name.toLowerCase(), exact: true })
    .click();
  await expect(
    region.getByText('Ảnh đã tải lên dạng tạm.', { exact: false }),
  ).toBeVisible({ timeout: 30000 });
}
async function image(page, name) {
  const img = picker(page, name).locator('img.recipe-image');
  await expect(img).toBeVisible();
  await img.scrollIntoViewIfNeeded();
  await expect
    .poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  return img.getAttribute('src');
}
async function save(page) {
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu bản nháp.', { exact: true })).toBeVisible(
    { timeout: 30000 },
  );
}
async function status(page, path) {
  return page.evaluate((p) => fetch(p).then((r) => r.status), path);
}
async function mainJourney({ page, browser }) {
  test.setTimeout(180000);
  await account(page);
  await page.getByRole('link', { name: 'Tạo công thức', exact: true }).click();
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Công thức có ảnh kiểm chứng');
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const editor = page.url();
  await page
    .getByLabel('Mô tả', { exact: true })
    .fill('Công thức media kiểm chứng riêng');
  await page
    .getByLabel('Danh mục', { exact: true })
    .selectOption(String(category._id));
  await page.getByLabel('Độ khó', { exact: true }).selectOption('easy');
  await page.getByLabel('Chuẩn bị (phút)', { exact: true }).fill('0');
  await page.getByLabel('Nấu (phút)', { exact: true }).fill('0');
  await page.getByLabel('Khẩu phần', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Thêm nguyên liệu', exact: true })
    .click();
  await page.getByLabel('Tên nguyên liệu 1', { exact: true }).fill('Rau');
  await page.getByLabel('Định lượng 1', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Thêm bước nấu', exact: true })
    .click();
  await page
    .getByLabel('Hướng dẫn bước 1', { exact: true })
    .fill('Rửa và nấu rau');
  await pick(page, 'Ảnh bước 1');
  await pick(page, 'Ảnh bìa');
  await save(page);
  await page.reload();
  const cover = await image(page, 'Ảnh bìa'),
    step = await image(page, 'Ảnh bước 1');
  const digest = await page.evaluate(async (path) => {
    const r = await fetch(path),
      bytes = await r.arrayBuffer();
    return {
      status: r.status,
      mime: r.headers.get('content-type'),
      hash: Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      )
        .map((v) => v.toString(16).padStart(2, '0'))
        .join(''),
    };
  }, cover);
  expect(digest.status).toBe(200);
  expect(digest.mime).toBe('image/png');
  expect(digest.hash).toBe(createHash('sha256').update(png).digest('hex'));
  await page
    .getByRole('button', { name: 'Thêm bước nấu', exact: true })
    .click();
  await page
    .getByLabel('Hướng dẫn bước 2', { exact: true })
    .fill('Dọn món ra bàn');
  await page
    .getByRole('button', { name: 'Đưa bước 2 lên', exact: true })
    .click();
  await save(page);
  await page.reload();
  expect(await image(page, 'Ảnh bước 2')).toBe(step);
  const guest = await browser.newContext(),
    g = await guest.newPage();
  await harness.route(g);
  await g.goto('/');
  expect(await status(g, cover)).toBe(404);
  const other = await browser.newContext(),
    b = await other.newPage();
  await account(b);
  expect(await status(b, cover)).toBe(404);
  await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  const publicLink = page.getByRole('link', {
    name: 'Xem công thức công khai',
    exact: true,
  });
  await expect(publicLink).toBeVisible();
  await g.goto(await publicLink.getAttribute('href'));
  await expect
    .poll(() =>
      g
        .locator('.detail-cover img.recipe-image')
        .evaluate((i) => i.complete && i.naturalWidth > 0),
    )
    .toBe(true);
  expect(await status(g, cover)).toBe(200);
  await page
    .getByRole('button', { name: 'Ngừng xuất bản', exact: true })
    .click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(
    page.getByText('Đã ngừng xuất bản.', { exact: true }),
  ).toBeVisible();
  expect(await status(g, cover)).toBe(404);
  await pick(page, 'Ảnh bìa', png2);
  await save(page);
  const replacement = await image(page, 'Ảnh bìa');
  expect(replacement).not.toBe(cover);
  expect(await status(page, cover)).toBe(404);
  await picker(page, 'Ảnh bìa')
    .getByRole('button', { name: 'Gỡ ảnh bìa', exact: true })
    .click();
  await save(page);
  await page.reload();
  await expect(
    picker(page, 'Ảnh bìa').getByText('Chưa có ảnh đã lưu.', { exact: true }),
  ).toBeVisible();
  expect(await status(page, replacement)).toBe(404);
  await page.goto('/account/profile');
  await pick(page, 'Ảnh đại diện');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi tài khoản.' }),
  ).toBeVisible();
  const avatar = await image(page, 'Ảnh đại diện');
  expect(await status(g, avatar)).toBe(200);
  await page.reload();
  await image(page, 'Ảnh đại diện');
  const id = avatar.match(/users\/([a-f0-9]{24})/)[1];
  await g.goto('/users/' + id);
  await expect
    .poll(() =>
      g
        .locator('img.recipe-image')
        .evaluate((i) => i.complete && i.naturalWidth > 0),
    )
    .toBe(true);
  await pick(page, 'Ảnh đại diện', png2);
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi tài khoản.' }),
  ).toBeVisible();
  expect(await status(g, avatar)).toBe(404);
  await picker(page, 'Ảnh đại diện')
    .getByRole('button', { name: 'Gỡ ảnh đại diện', exact: true })
    .click();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi tài khoản.' }),
  ).toBeVisible();
  await page.goto(editor);
  await picker(page, 'Ảnh bước 2')
    .getByRole('button', { name: 'Gỡ ảnh bước 2', exact: true })
    .click();
  await save(page);
  expect(await status(page, step)).toBe(404);
  await other.close();
  await guest.close();
  await writeFile(
    `${artifact}/${live ? 'live' : 'stub'}-journey.json`,
    JSON.stringify(
      {
        provider: live ? 'actual_cloudinary' : 'cloudinary_sdk_stub',
        applicationComposition: true,
        browserRendering: true,
        processedBytesMatch: true,
        draftOwner200: true,
        draftGuest404: true,
        draftNonowner404: true,
        publishedGuest200: true,
        unpublishedGuest404: true,
        replaceOld404: true,
        stepReorder: true,
        avatarPublic: true,
        avatarReplaceOld404: true,
        removedReferences404: true,
      },
      null,
      2,
    ) + '\n',
  );
}
test(
  'MEDIA-E01..08 cover/step/avatar upload, persistence, replace/remove, ownership and publication',
  mainJourney,
);
if (live)
  test(
    'MEDIA-LIVE controlled actual Cloudinary UI to HTTP to storage and browser journey',
    mainJourney,
  );

test('MEDIA-E09..11 invalid files, provider errors, selected-only guard, responsive media and session purge', async ({
  page,
}) => {
  test.setTimeout(120000);
  await account(page);
  await page.getByRole('link', { name: 'Tạo công thức', exact: true }).click();
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Ảnh lỗi kiểm chứng');
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const region = picker(page, 'Ảnh bìa'),
    input = region.getByLabel('Chọn ảnh bìa', { exact: true });
  await input.setInputFiles({
    name: 'bad.png',
    mimeType: 'image/png',
    buffer: Buffer.from('invalid'),
  });
  await expect(
    region.getByText('Chỉ nhận JPEG, PNG hoặc WebP', { exact: false }),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'corrupt.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
  });
  await region
    .getByRole('button', { name: 'Tải ảnh bìa', exact: true })
    .click();
  await expect(
    region.getByText('Ảnh không hợp lệ hoặc bị hỏng.', { exact: true }),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'too-big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(
    region.getByText('Chọn ảnh từ 1 byte đến 5 MiB.', { exact: true }),
  ).toBeVisible();
  await input.setInputFiles({
    name: 'valid.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(
    page.getByRole('button', { name: 'Lưu bản nháp', exact: true }),
  ).toBeDisabled();
  await region
    .getByRole('button', { name: 'Tải ảnh bìa', exact: true })
    .click();
  await expect(
    region.getByText('Ảnh đã tải lên dạng tạm.', { exact: false }),
  ).toBeVisible();
  await save(page);
  const path = await image(page, 'Ảnh bìa');
  harness.faults.read = 'unavailable';
  await page.reload();
  await picker(page, 'Ảnh bìa').scrollIntoViewIfNeeded();
  await expect(
    picker(page, 'Ảnh bìa').getByRole('button', {
      name: 'Thử tải lại ảnh',
      exact: true,
    }),
  ).toBeVisible();
  harness.faults.read = 'invalid';
  await picker(page, 'Ảnh bìa')
    .getByRole('button', { name: 'Thử tải lại ảnh', exact: true })
    .click();
  await expect(
    picker(page, 'Ảnh bìa').getByRole('button', {
      name: 'Thử tải lại ảnh',
      exact: true,
    }),
  ).toBeVisible();
  harness.faults.read = null;
  await picker(page, 'Ảnh bìa')
    .getByRole('button', { name: 'Thử tải lại ảnh', exact: true })
    .click();
  await image(page, 'Ảnh bìa');
  const metrics = [];
  for (const [width, height] of [
    [1672, 941],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await picker(page, 'Ảnh bìa').scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(m.scroll).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `docs/screenshots/BE-FE-RH-P1.1/editor-media-${width}.png`,
      fullPage: true,
    });
    metrics.push({ ...m, height });
  }
  await writeFile(
    artifact + '/media-responsive.json',
    JSON.stringify(metrics, null, 2) + '\n',
  );
  const tab = await page.context().newPage();
  await harness.route(tab);
  await tab.goto('/account');
  await tab.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.locator(`img[src="${path}"]`)).toHaveCount(0);
  await account(tab);
  await page.goto('/my/recipes');
  await expect(
    page.getByText('Chưa có bản nháp ở trang này.', { exact: true }),
  ).toBeVisible();
  await tab.close();
});

test('MEDIA-E13 uncertain upload reuses same key and409 attachment preserves canonical image', async ({
  page,
}) => {
  const u = await account(page);
  await page.getByRole('link', { name: 'Tạo công thức', exact: true }).click();
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Ảnh gốc an toàn');
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await pick(page, 'Ảnh bìa');
  await save(page);
  const canonical = await image(page, 'Ảnh bìa');
  let writes = 0,
    key;
  await page.route('**/api/v1/media/images', async (route) => {
    writes++;
    const current = route.request().headers()['idempotency-key'];
    key ??= current;
    expect(current).toBe(key);
    if (writes === 1) {
      const url = new URL(route.request().url());
      url.port = String(harness.port);
      await route.fetch({ url: url.href });
      await route.abort('failed');
    } else await route.fallback();
  });
  const region = picker(page, 'Ảnh bìa');
  await region.getByLabel('Chọn ảnh bìa', { exact: true }).setInputFiles({
    name: 'replace.png',
    mimeType: 'image/png',
    buffer: png2,
  });
  await region
    .getByRole('button', { name: 'Tải ảnh bìa', exact: true })
    .click();
  await expect(
    region.getByRole('button', {
      name: 'Kiểm tra lại cùng upload',
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await expect(
    page.getByRole('button', { name: 'Lưu bản nháp', exact: true }),
  ).toBeDisabled();
  expect(await status(page, canonical)).toBe(200);
  await region
    .getByRole('button', { name: 'Kiểm tra lại cùng upload', exact: true })
    .click();
  await expect(
    region.getByText('Ảnh đã tải lên dạng tạm.', { exact: false }),
  ).toBeVisible();
  expect(writes).toBe(2);
  const owner = await harness.identity.models.User.findOne({ email: u.email });
  const row = await harness.recipes.Recipe.findOne({ authorId: owner._id });
  await harness.recipes.Recipe.updateOne(
    { _id: row._id },
    { $inc: { version: 1 } },
  );
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đọc bản máy chủ để đối chiếu',
      exact: true,
    }),
  ).toBeVisible();
  expect(await status(page, canonical)).toBe(200);
  expect(
    await harness.media.MediaAsset.countDocuments({
      ownerId: owner._id,
      status: 'temporary',
    }),
  ).toBe(1);
  await page
    .getByRole('button', { name: 'Đọc bản máy chủ để đối chiếu', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Bản trên máy chủ', exact: true }),
  ).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('button', { name: 'Dùng bản máy chủ', exact: true })
    .click();
  expect(await image(page, 'Ảnh bìa')).toBe(canonical);
});
