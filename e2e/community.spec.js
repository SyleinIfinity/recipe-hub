import { test, expect } from '@playwright/test';
import { randomUUID, randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { createMediaHarness } from './support/media-harness.js';
import { screenshotPath } from './support/artifacts.js';

const sizes = [
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [768, 900],
  [390, 844],
];
const name = 'Gà chiên Karaage với gừng tươi';
const intro =
  'Gà ướp gừng và xì dầu, áo một lớp bột mỏng rồi chiên theo từng mẻ. Dọn cùng lát chanh khi còn nóng.';
const emails = [];
let kitchen, category, photo;
test.beforeAll(async () => {
  kitchen = await createMediaHarness();
  const key = randomUUID();
  category = await kitchen.catalog.models.Category.create({
    name: 'Bếp gia đình ' + key.slice(0, 5),
    slug: 'community-' + key,
  });
  // CI stays offline. The visual run can supply the seed dish's local reference photograph.
  photo = await sharp(
    process.env.RECIPE_TEST_PHOTO || {
      create: { width: 640, height: 420, channels: 3, background: '#b09a7e' },
    },
  )
    .resize({ width: 800 })
    .png()
    .toBuffer();
});
test.afterAll(async () => {
  if (!kitchen) return;
  try {
    const ids = (
      await kitchen.identity.models.User.find({ email: { $in: emails } })
    ).map((u) => u._id);
    await Promise.all([
      kitchen.recipes.Favorite.deleteMany({ userId: { $in: ids } }),
      kitchen.recipes.Bookmark.deleteMany({ userId: { $in: ids } }),
      kitchen.db.connection.models.Comment.deleteMany({
        authorId: { $in: ids },
      }),
    ]);
    expect((await kitchen.cleanupOwned(emails)).status).toBe('verified');
    await category?.deleteOne();
  } finally {
    await kitchen.close();
  }
});
const btn = (page, name) => page.getByRole('button', { name, exact: true });
const label = (page, name) => page.getByLabel(name, { exact: true });
async function account(page, displayName) {
  await kitchen.route(page);
  const email = 'community-' + randomUUID() + '@example.test',
    password = randomBytes(18).toString('base64url');
  emails.push(email);
  await page.goto('/auth/register');
  await page.getByLabel('Tên hiển thị').fill(displayName);
  await page.getByLabel('Email').first().fill(email);
  await label(page, 'Mật khẩu *').fill(password);
  await label(page, 'Xác nhận mật khẩu *').fill(password);
  await btn(page, 'Tạo tài khoản').click();
  await expect(
    page.getByText('Đã tạo tài khoản.', { exact: false }),
  ).toBeVisible();
  await page.goto('/auth/login?returnTo=/my/recipes');
  await page.getByLabel('Email').first().fill(email);
  await label(page, 'Mật khẩu *').fill(password);
  await btn(page, 'Đăng nhập').click();
  await expect(page).toHaveURL(/\/my\/recipes$/);
  return { email, password };
}
async function capture(page, screen, widths = sizes) {
  for (const [width, height] of widths) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    if (screen === 'comments')
      await page
        .locator('.comment-section')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      )
      .toBe(true);
    await page.evaluate(async () => {
      const visible = [...document.images].filter((img) => {
        const b = img.getBoundingClientRect();
        return (
          b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight
        );
      });
      await Promise.all(visible.map((img) => img.decode().catch(() => {})));
    });
    await page.screenshot({
      path: screenshotPath(screen + '-' + width + '.png'),
      animations: 'disabled',
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
async function addPhoto(page, title) {
  const region = page.getByRole('region', { name: title, exact: true });
  await region.locator('input[type=file]').setInputFiles({
    name: 'recipe.png',
    mimeType: 'image/png',
    buffer: photo,
  });
  await expect(region.locator('img[src^="blob:"]')).toBeVisible();
  await btn(region, 'Tải ' + title.toLowerCase()).click();
  await expect(
    region.getByText('Ảnh đã tải lên dạng tạm.', { exact: false }),
  ).toBeVisible();
}
async function makeRecipe(page, reader) {
  await page.goto('/my/recipes/new');
  await label(page, 'Tên công thức').fill(name);
  await label(page, 'Mô tả').fill(intro);
  await label(page, 'Danh mục').selectOption(category.id);
  await label(page, 'Độ khó').selectOption('medium');
  for (const [field, value] of [
    ['Chuẩn bị (phút)', '35'],
    ['Nấu (phút)', '15'],
    ['Khẩu phần', '3'],
  ])
    await label(page, field).fill(value);
  for (const [i, food, amount] of [
    [1, 'Thịt gà', '500'],
    [2, 'Gừng tươi', '15'],
  ]) {
    await btn(page, 'Thêm nguyên liệu').click();
    await label(page, 'Tên nguyên liệu ' + i).fill(food);
    await label(page, 'Định lượng ' + i).fill(amount);
    await label(page, 'Đơn vị ' + i).fill('g');
  }
  for (const [i, text] of [
    [1, 'Ướp gà cùng gừng trong 25 phút.'],
    [2, 'Áo bột rồi chiên từng mẻ đến khi chín.'],
  ]) {
    await btn(page, 'Thêm bước nấu').click();
    await label(page, 'Hướng dẫn bước ' + i).fill(text);
  }
  await addPhoto(page, 'Ảnh bìa');
  await page.getByText('Thời gian và ảnh bước 1', { exact: true }).click();
  await addPhoto(page, 'Ảnh bước 1');
  const preview = page.getByRole('complementary', {
    name: 'Xem trước công thức',
  });
  await expect(
    preview.getByRole('heading', { name, exact: true }),
  ).toBeVisible();
  await expect(preview.getByText('Gừng tươi', { exact: true })).toBeVisible();
  await expect(preview.locator('img[src^="blob:"]')).toHaveCount(2);
  await page.evaluate(() => scrollTo(0, 0));
  await capture(page, 'editor-live');
  const previewWrites = [];
  const track = (req) => {
    if (req.method() !== 'GET' && req.url().includes('/api/'))
      previewWrites.push(req.url());
  };
  page.on('request', track);
  await btn(page, 'Xem trước toàn màn hình').click();
  const dialog = page.getByRole('dialog', { name: 'Xem trước toàn màn hình' });
  await expect(dialog.getByText(intro, { exact: true })).toBeVisible();
  await capture(page, 'full-detail');
  await btn(dialog, 'Bài viết').click();
  await expect(dialog.getByText(name, { exact: true })).toBeVisible();
  await capture(page, 'full-post');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  page.off('request', track);
  expect(previewWrites).toEqual([]);
  await btn(page, 'Tạo bản nháp').click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(label(page, 'Tên công thức')).toHaveValue(name);
  const id = page.url().match(/recipes\/([a-f0-9]{24})/)[1];
  const ownerData = await page.evaluate(
    async (id) => (await (await fetch('/api/v1/me/recipes/' + id)).json()).data,
    id,
  );
  expect(ownerData.status).toBe('draft');
  expect(
    await reader.evaluate(
      async ({ id, image }) => [
        (await fetch('/api/v1/me/recipes/' + id)).status,
        (await fetch(image)).status,
        (
          await (
            await fetch('/api/v1/me/recipe-interactions?recipeIds=' + id)
          ).json()
        ).data,
      ],
      { id, image: ownerData.coverImageUrl },
    ),
  ).toEqual([404, 404, []]);
  await page.goto('/my/recipes?tab=draft');
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  await capture(page, 'library-drafts');
  await page.goto('/my/recipes/' + id + '/edit');
  await btn(page, 'Xuất bản').click();
  await btn(page, 'Xác nhận').click();
  const link = page.getByRole('link', {
    name: 'Xem công thức công khai',
    exact: true,
  });
  await expect(link).toBeVisible();
  return { id, href: await link.getAttribute('href') };
}

const read = (page, path) =>
  page.evaluate(async (path) => {
    const response = await fetch('/api/v1' + path, { cache: 'no-store' });
    const json = await response.json();
    return { status: response.status, ...json };
  }, path);
async function verifyPublishedEditing(page, reader, id, href, author) {
  const editor = '/my/recipes/' + id + '/edit';
  await reader.goto(href);
  await btn(reader, 'Lưu').click();
  await expect(btn(reader, 'Đã lưu')).toHaveAttribute('aria-pressed', 'true');
  const original = (await read(reader, href)).data;
  const second = await page.context().newPage();
  await kitchen.route(second);
  try {
    await second.goto(editor);
    await expect(label(second, 'Tên công thức')).toHaveValue(name);
    const updated = 'Karaage ướp sả chanh';
    await label(page, 'Tên công thức').fill(updated);
    await label(page, 'Mô tả').fill(intro + ' Thêm chút sả băm.');
    await label(page, 'Tên nguyên liệu 2').fill('Gừng và sả');
    await expect(
      page
        .getByRole('complementary', { name: 'Xem trước công thức' })
        .getByText(updated, { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await capture(page, 'published-edit');
    expect((await read(reader, href)).data.title).toBe(name);
    await btn(page, 'Cập nhật công thức').click();
    await expect(
      page.getByText('Đã cập nhật công thức công khai.', { exact: true }),
    ).toBeVisible();
    await reader.reload();
    await expect(
      reader.getByRole('heading', { name: updated, level: 1 }),
    ).toBeVisible();
    const current = (await read(reader, href)).data;
    expect(current).toMatchObject({
      recipeId: id,
      slug: original.slug,
      publishedAt: original.publishedAt,
      author: original.author,
      coverImageUrl: original.coverImageUrl,
      interactionSummary: { favoriteCount: 1, commentCount: 2 },
    });
    expect(
      (await read(reader, '/recipes?q=karaage+sa+chanh')).data.map(
        (r) => r.recipeId,
      ),
    ).toContain(id);
    await label(second, 'Tên công thức').fill('Nội dung từ tab thứ hai');
    await btn(second, 'Cập nhật công thức').click();
    await expect(
      second.getByRole('heading', { name: 'Bản trên máy chủ' }),
    ).toBeVisible();
    await expect(label(second, 'Tên công thức')).toHaveValue(
      'Nội dung từ tab thứ hai',
    );
    await expect(btn(second, 'Cập nhật công thức')).toBeDisabled();
    expect((await read(reader, href)).data.title).toBe(updated);
  } finally {
    await second.close();
  }
  // A visibility transition keeps local work and never grants readers access to draft media.
  await label(page, 'Mô tả').fill(intro + ' Rắc hành lá khi dọn.');
  await btn(page, 'Ngừng xuất bản').click();
  await expect(page.getByText(/tạm ẩn khỏi cộng đồng/)).toBeVisible();
  await btn(page, 'Xác nhận').click();
  // The second browser tab rotated the anti-CSRF cookie; recover without reloading the draft or replaying the write.
  await expect(btn(page, 'Xác nhận lại phiên')).toBeVisible();
  await btn(page, 'Xác nhận lại phiên').click();
  await btn(page, 'Ngừng xuất bản').click();
  await btn(page, 'Xác nhận').click();
  await expect(btn(page, 'Lưu bản nháp')).toBeVisible();
  await expect(label(page, 'Mô tả')).toHaveValue(
    intro + ' Rắc hành lá khi dọn.',
  );
  expect((await read(reader, href)).status).toBe(404);
  expect(
    await reader.evaluate(
      async (url) => (await fetch(url)).status,
      original.coverImageUrl,
    ),
  ).toBe(404);
  for (const path of [
    '/me/bookmarks',
    '/me/favorites',
    author + '/recipes',
    '/recipes?category=' + category.id,
    '/me/recipe-interactions?recipeIds=' + id,
  ]) {
    const result = await read(reader, path);
    expect(result.status).toBe(200);
    expect(result.data.map((r) => r.recipeId)).not.toContain(id);
  }
  await addPhoto(page, 'Ảnh bìa');
  await btn(page, 'Lưu bản nháp').click();
  await expect(
    page.getByText('Đã lưu bản nháp.', { exact: true }),
  ).toBeVisible();
  await btn(page, 'Xuất bản').click();
  await btn(page, 'Xác nhận').click();
  await expect(
    page.getByText('Máy chủ xác nhận đã xuất bản.', { exact: true }),
  ).toBeVisible();
  const restored = (await read(reader, href)).data;
  expect(restored).toMatchObject({
    recipeId: id,
    slug: original.slug,
    publishedAt: original.publishedAt,
    interactionSummary: { favoriteCount: 1, commentCount: 2 },
  });
  expect(restored.coverImageUrl).not.toBe(original.coverImageUrl);
  expect(
    await reader.evaluate(
      async (url) => (await fetch(url)).status,
      restored.coverImageUrl,
    ),
  ).toBe(200);
  expect(
    await reader.evaluate(
      async (url) => (await fetch(url)).status,
      original.coverImageUrl,
    ),
  ).toBe(404);
  expect(
    (await read(reader, '/me/recipe-interactions?recipeIds=' + id)).data,
  ).toEqual([{ recipeId: id, saved: true, favorited: true }]);
  await reader.reload();
  await expect(btn(reader, 'Đã lưu')).toHaveAttribute('aria-pressed', 'true');
  await expect(
    reader.getByText('Cảm ơn hướng dẫn ướp gà!', { exact: true }),
  ).toBeVisible();
}
test('Community, independent personal libraries and owner replies persist for two cooks', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const reader = await context.newPage();
  try {
    const ownerAccount = await account(page, 'An Nguyễn');
    await account(reader, 'Minh Trần');
    const { id, href } = await makeRecipe(page, reader);
    const feed = '/recipes?view=posts&category=' + category.id;
    await reader.goto(feed);
    const post = reader
      .locator('article')
      .filter({ has: reader.getByText(name, { exact: true }) })
      .first();
    await expect(post).toBeVisible();
    await capture(reader, 'community');
    await btn(post, 'Thích').click();
    await expect(btn(post, 'Đã thích')).toHaveAttribute('aria-pressed', 'true');
    await btn(post, 'Lưu').click();
    await expect(btn(post, 'Đã lưu')).toHaveAttribute('aria-pressed', 'true');
    await post.getByRole('button', { name: /bình luận/i }).click();
    const comment = 'Có thể ướp gà từ tối hôm trước không?';
    await label(post, 'Nội dung bình luận').fill(comment);
    await btn(post, 'Gửi bình luận').click();
    await expect(post.getByText(comment, { exact: true })).toBeVisible();
    await reader.goto(href);
    await expect(btn(reader, 'Đã thích')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(btn(reader, 'Đã lưu')).toHaveAttribute('aria-pressed', 'true');
    await expect(reader.getByText(comment, { exact: true })).toBeVisible();
    await expect(
      reader.getByRole('link', { name: 'Chỉnh sửa công thức', exact: true }),
    ).toHaveCount(0);
    await capture(reader, 'detail');
    await page.goto(href);
    await expect(btn(page, 'Sửa')).toHaveCount(0);
    await btn(page, 'Trả lời').click();
    const reply = 'Mình thường ướp trước rồi để trong ngăn mát.';
    await label(page, 'Nội dung phản hồi').fill(reply);
    await btn(page, 'Gửi phản hồi').click();
    await reader.reload();
    await reader.getByRole('button', { name: /Xem 1 phản hồi/i }).click();
    await expect(reader.getByText(reply, { exact: true })).toBeVisible();
    await btn(reader, 'Sửa').click();
    await label(reader, 'Nội dung chỉnh sửa').fill('Cảm ơn hướng dẫn ướp gà!');
    await btn(reader, 'Lưu thay đổi').click();
    await expect(
      reader.getByText('Cảm ơn hướng dẫn ướp gà!', { exact: true }),
    ).toBeVisible();
    await reader
      .getByRole('heading', { name: 'Bình luận', exact: true })
      .scrollIntoViewIfNeeded();
    await capture(reader, 'comments');
    const author = await page.locator('.detail-author a').getAttribute('href');
    for (const [who, tab] of [
      [reader, 'saved'],
      [reader, 'favorites'],
      [page, 'published'],
    ]) {
      await who.goto('/my/recipes?tab=' + tab);
      await who.reload();
      await expect(who.getByText(name, { exact: true }).first()).toBeVisible();
      await capture(who, 'library-' + tab);
    }
    await reader.goto(href);
    await btn(reader, 'Đã thích').click();
    await expect(btn(reader, 'Thích')).toHaveAttribute('aria-pressed', 'false');
    await reader.goto('/my/recipes?tab=saved');
    await expect(reader.getByText(name, { exact: true }).first()).toBeVisible();
    await reader.goto(href);
    await btn(reader, 'Thích').click();
    await expect(btn(reader, 'Đã thích')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await btn(reader, 'Đã lưu').click();
    await expect(btn(reader, 'Lưu')).toHaveAttribute('aria-pressed', 'false');
    await reader.goto('/my/recipes?tab=favorites');
    await expect(reader.getByText(name, { exact: true }).first()).toBeVisible();
    await reader.goto(author);
    await expect(reader.getByText(name, { exact: true }).first()).toBeVisible();
    await capture(reader, 'author');
    await reader.goto('/my/recipes/' + id + '/edit');
    expect((await read(reader, '/me/recipes/' + id)).status).toBe(404);
    await expect(label(reader, 'Tên công thức')).toHaveCount(0);
    await page.goto('/my/recipes/' + id + '/edit');
    await expect(label(page, 'Tên công thức')).toHaveValue(name);
    await verifyPublishedEditing(page, reader, id, href, author);
    reader.once('dialog', (dialog) => dialog.accept());
    await btn(reader, 'Xóa').click();
    await expect(
      reader.getByText('Chưa có bình luận nào.', { exact: true }),
    ).toBeVisible();
    expect((await read(reader, href)).data.interactionSummary).toMatchObject({
      commentCount: 0,
      favoriteCount: 1,
    });
    await reader.goto('/account');
    await btn(reader, 'Đăng xuất').click();
    await expect(reader).toHaveURL(/\/$/);
    await reader.goto(href);
    const signIn = reader.getByRole('link', { name: 'Đăng nhập để thích' });
    await expect(signIn).toBeVisible();
    await signIn.focus();
    await capture(reader, 'guest-actions', [
      [1440, 900],
      [390, 844],
    ]);
    await signIn.click();
    await reader.getByLabel('Email').first().fill(ownerAccount.email);
    await label(reader, 'Mật khẩu *').fill(ownerAccount.password);
    await btn(reader, 'Đăng nhập').click();
    await expect(btn(reader, 'Thích')).toHaveAttribute('aria-pressed', 'false');
    await expect(btn(reader, 'Lưu')).toHaveAttribute('aria-pressed', 'false');
    // Hold only the test transport to verify private loading/error feedback and manual recovery.
    const savedRoute = '**/api/v1/me/bookmarks?*';
    let unblock;
    const barrier = new Promise((resolve) => {
      unblock = resolve;
    });
    await reader.route(savedRoute, async (route) => {
      await barrier;
      await route.abort('failed');
    });
    await reader.goto('/my/recipes?tab=saved');
    await expect(
      reader.getByText('Đang tải công thức…', { exact: true }),
    ).toBeVisible();
    await capture(reader, 'library-loading', [[1440, 900]]);
    unblock();
    await expect(reader.getByRole('button', { name: /Thử lại/ })).toBeVisible();
    await capture(reader, 'library-error', [[1440, 900]]);
    await reader.unroute(savedRoute);
    await reader.getByRole('button', { name: /Thử lại/ }).click();
    await expect(
      reader.getByRole('heading', { name: /chưa lưu/i }),
    ).toBeVisible();
    await capture(reader, 'library-empty', [
      [1440, 900],
      [390, 844],
    ]);
  } finally {
    await context.close();
  }
});
