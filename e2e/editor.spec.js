import { test, expect } from '@playwright/test';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createAccountHarness } from './support/account-harness.js';
let harness, category, ingredient;
const users = [];
test.beforeAll(async () => {
  harness = await createAccountHarness();
  const tag = randomUUID().slice(0, 8);
  category = await harness.db.connection.models.Category.create({
    name: 'Món thử FE08 ' + tag,
    slug: 'fe08-' + tag,
  });
  ingredient = await harness.db.connection.models.Ingredient.create({
    name: 'Rau thử ' + tag,
  });
  await mkdir('docs/screenshots/BE-FE-RH-P1.1', { recursive: true });
});
test.afterAll(async () => {
  if (!harness) return;
  for (const u of users) {
    const owner = await harness.identity.models.User.findOne({
      email: u.email,
    });
    if (owner)
      await harness.db.connection.models.Recipe.deleteMany({
        authorId: owner._id,
      });
    await harness.cleanup(u.email);
  }
  await category?.deleteOne();
  await ingredient?.deleteOne();
  await harness.close();
});
async function user(page) {
  const u = {
    email: `fe08-${randomUUID()}@example.test`,
    password: randomBytes(18).toString('base64url'),
    name: 'Bếp biên tập',
  };
  users.push(u);
  await harness.route(page);
  await page.goto('/auth/register');
  await page.getByLabel('Tên hiển thị', { exact: false }).fill(u.name);
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
  await login(page, u);
  return u;
}
async function login(page, u) {
  await page.goto('/auth/login?returnTo=/my/recipes');
  await page.getByLabel('Email', { exact: false }).first().fill(u.email);
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(u.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bản nháp của tôi', exact: true }),
  ).toBeVisible();
}
async function create(page, title = 'Canh rau của tôi') {
  await page.getByRole('link', { name: 'Tạo công thức', exact: true }).click();
  await page.getByLabel('Tên công thức', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
  await expect(page).toHaveURL(/\/my\/recipes\/[a-f0-9]{24}\/edit$/);
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    title,
  );
  return page.url().match(/recipes\/([a-f0-9]{24})/)[1];
}
async function save(page) {
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByText('Đã lưu bản nháp.', { exact: true }),
  ).toBeVisible();
}
async function complete(page) {
  await page
    .getByLabel('Mô tả', { exact: true })
    .fill('Canh rau thanh mát dùng trong bữa cơm');
  await page
    .getByLabel('Danh mục', { exact: true })
    .selectOption(String(category._id));
  await page.getByLabel('Độ khó', { exact: true }).selectOption('easy');
  await page.getByLabel('Chuẩn bị (phút)', { exact: true }).fill('0');
  await page.getByLabel('Nấu (phút)', { exact: true }).fill('5');
  await page.getByLabel('Khẩu phần', { exact: true }).fill('2');
  await page
    .getByRole('button', { name: 'Thêm nguyên liệu', exact: true })
    .click();
  await page.getByLabel('Tên nguyên liệu 1', { exact: true }).fill('Rau xanh');
  await page.getByLabel('Định lượng 1', { exact: true }).fill('0');
  await page
    .getByRole('button', { name: 'Thêm bước nấu', exact: true })
    .click();
  await page
    .getByLabel('Hướng dẫn bước 1', { exact: true })
    .fill('Nấu canh cho đến khi chín');
  await save(page);
}
async function action(page, name) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
}
test('ED-E01 real create/edit ingredients/steps ordering, persistence, publish/public/unpublish/delete', async ({
  page,
}) => {
  await user(page);
  const id = await create(page);
  await complete(page);
  await page
    .getByRole('button', { name: 'Thêm nguyên liệu', exact: true })
    .click();
  await page.getByLabel('Tên nguyên liệu 2', { exact: true }).fill('Muối');
  await page
    .getByRole('group', { name: 'Nguyên liệu 2', exact: true })
    .getByText('Nguyên liệu chuẩn, mô tả lượng và ghi chú', { exact: true })
    .click();
  await page.getByLabel('Mô tả lượng 2', { exact: true }).fill('Vừa đủ');
  await page
    .getByRole('button', { name: 'Đưa nguyên liệu 2 lên', exact: true })
    .click();
  await expect(
    page.getByLabel('Tên nguyên liệu 1', { exact: true }),
  ).toHaveValue('Muối');
  await page
    .getByRole('button', { name: 'Thêm bước nấu', exact: true })
    .click();
  await page
    .getByLabel('Hướng dẫn bước 2', { exact: true })
    .fill('Rửa rau thật sạch');
  await page
    .getByRole('button', { name: 'Đưa bước 2 lên', exact: true })
    .click();
  await save(page);
  await page.reload();
  await expect(
    page.getByLabel('Tên nguyên liệu 1', { exact: true }),
  ).toHaveValue('Muối');
  await expect(page.getByLabel('Định lượng 2', { exact: true })).toHaveValue(
    '0',
  );
  await expect(
    page.getByLabel('Hướng dẫn bước 1', { exact: true }),
  ).toHaveValue('Rửa rau thật sạch');
  await action(page, 'Xuất bản');
  await expect(
    page.getByText('Máy chủ xác nhận đã xuất bản.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xóa bản nháp', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel('Tên công thức', { exact: true }),
  ).toBeDisabled();
  const link = page.getByRole('link', {
    name: 'Xem công thức công khai',
    exact: true,
  });
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  const guest = await page.context().browser().newContext();
  const publicPage = await guest.newPage();
  await harness.route(publicPage);
  await publicPage.goto(href);
  await expect(
    publicPage.getByRole('heading', {
      name: 'Canh rau của tôi',
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await action(page, 'Ngừng xuất bản');
  await expect(
    page.getByText('Đã ngừng xuất bản.', { exact: true }),
  ).toBeVisible();
  await publicPage.reload();
  await expect(
    publicPage.getByRole('heading', {
      name: 'Không tìm thấy nội dung',
      exact: true,
    }),
  ).toBeVisible();
  await guest.close();
  await page
    .getByRole('button', { name: 'Xóa nguyên liệu 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Xóa bước 1', exact: true }).click();
  await save(page);
  await page.reload();
  await expect(
    page.getByLabel('Tên nguyên liệu 1', { exact: true }),
  ).toHaveValue('Rau xanh');
  await action(page, 'Xóa bản nháp');
  await expect(page).toHaveURL(/\/my\/recipes$/);
  expect(
    await harness.db.connection.models.Recipe.findById(id).then((r) =>
      Boolean(r.deletedAt),
    ),
  ).toBe(true);
});
test('ED-E02 real optimistic409 preserves local values and explicit server review', async ({
  page,
}) => {
  const u = await user(page);
  await create(page);
  const secondContext = await page.context().browser().newContext();
  const second = await secondContext.newPage();
  await harness.route(second);
  await login(second, u);
  await second.goto(page.url());
  await second
    .getByLabel('Tên công thức', { exact: true })
    .fill('Bản máy chủ mới');
  await save(second);
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Bản cục bộ cần giữ');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đọc bản máy chủ để đối chiếu',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    'Bản cục bộ cần giữ',
  );
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
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    'Bản máy chủ mới',
  );
  await secondContext.close();
});
test('ED-E03 owner isolation, real non-owner GET/PATCH denial and guest guard', async ({
  page,
  browser,
}) => {
  await user(page);
  const id = await create(page, 'Nội dung riêng của A');
  const other = await browser.newContext(),
    b = await other.newPage();
  await user(b);
  await b.goto(`/my/recipes/${id}/edit`);
  await expect(
    b.getByText('Không tìm thấy công thức hoặc bạn không có quyền truy cập.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(b.getByLabel('Tên công thức', { exact: true })).toHaveCount(0);
  const status = await b.evaluate(async (id) => {
    const csrf = await fetch('/api/v1/auth/csrf').then((r) => r.json());
    return fetch('/api/v1/recipes/' + id, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf.data.csrfToken,
      },
      body: JSON.stringify({ title: 'Illicit', version: 0 }),
    }).then((r) => r.status);
  }, id);
  expect(status).toBe(404);
  const guest = await browser.newContext(),
    g = await guest.newPage();
  await harness.route(g);
  await g.goto(`/my/recipes/${id}/edit`);
  await expect(g).toHaveURL(/\/auth\/login\?returnTo=/);
  await expect(g.getByLabel('Tên công thức', { exact: true })).toHaveCount(0);
  await other.close();
  await guest.close();
});
test('ED-E04 dirty navigation and hard reload warning, row focus, single submit and plaintext validation', async ({
  page,
}) => {
  await user(page);
  await create(page);
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Tên <b>không hợp lệ');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByLabel('Tên công thức', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Tên công thức', { exact: true })).toBeFocused();
  await page.getByLabel('Tên công thức', { exact: true }).fill('Tên hợp lệ');
  page.once('dialog', (d) => d.dismiss());
  await page
    .getByRole('link', { name: 'Bản nháp của tôi', exact: true })
    .click();
  await expect(page).toHaveURL(/\/edit$/);
  page.once('dialog', (d) => d.dismiss());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    'Tên hợp lệ',
  );
  let warning = false;
  page.once('dialog', (d) => {
    warning = d.type() === 'beforeunload';
    d.accept();
  });
  await page.reload();
  expect(warning).toBe(true);
  await page.getByLabel('Tên công thức', { exact: true }).fill('Tên hợp lệ');
  await page
    .getByRole('button', { name: 'Thêm bước nấu', exact: true })
    .click();
  await expect(
    page.getByLabel('Hướng dẫn bước 1', { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel('Hướng dẫn bước 1', { exact: true })
    .fill('Nấu theo hướng dẫn');
  const description = page.getByLabel('Mô tả', { exact: true });
  await description.fill('Dòng đầu\nDòng sau');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(description).toHaveAttribute('aria-invalid', 'true');
  await expect(description).toHaveValue('Dòng đầu\nDòng sau');
  await description.fill('Mô tả hợp lệ trên một dòng.');
  let writes = 0;
  await page.route('**/api/v1/recipes/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      writes++;
      await new Promise((r) => setTimeout(r, 200));
    }
    await route.fallback();
  });
  await page.locator('form[aria-label="Biên tập công thức"]').evaluate((f) => {
    f.requestSubmit();
    f.requestSubmit();
  });
  await expect(
    page.getByText('Đã lưu bản nháp.', { exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.reload();
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    'Tên hợp lệ',
  );
});
test('ED-E05 uncertain create reuses same frozen intent and confirmed database draft', async ({
  page,
}) => {
  const u = await user(page);
  await page.getByRole('link', { name: 'Tạo công thức', exact: true }).click();
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Ý định tạo một lần');
  let count = 0,
    key;
  await page.route('**/api/v1/recipes', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    count++;
    key ??= route.request().headers()['idempotency-key'];
    expect(route.request().headers()['idempotency-key']).toBe(key);
    if (count === 1) {
      const url = new URL(route.request().url());
      url.port = String(harness.port);
      await route.fetch({ url: url.href });
      await route.abort('failed');
    } else await route.fallback();
  });
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Kiểm tra lại cùng yêu cầu tạo',
      exact: true,
    }),
  ).toBeVisible();
  expect(count).toBe(1);
  await page
    .getByRole('button', { name: 'Kiểm tra lại cùng yêu cầu tạo', exact: true })
    .click();
  await expect(page).toHaveURL(/\/edit$/);
  const owner = await harness.identity.models.User.findOne({ email: u.email });
  expect(
    await harness.db.connection.models.Recipe.countDocuments({
      authorId: owner._id,
    }),
  ).toBe(1);
  expect(count).toBe(2);
});
test('ED-E06 real CSRF failure, expired session purges editor, and catalog canonical ID persists', async ({
  page,
}) => {
  const u = await user(page);
  const id = await create(page);
  await page
    .getByRole('button', { name: 'Thêm nguyên liệu', exact: true })
    .click();
  await page.getByLabel('Tên nguyên liệu 1', { exact: true }).fill('Rau');
  await page
    .getByLabel('Tìm nguyên liệu chuẩn', { exact: true })
    .fill(ingredient.name);
  await expect(
    page
      .getByLabel('Nguyên liệu chuẩn 1', { exact: true })
      .locator('option', { hasText: ingredient.name }),
  ).toHaveCount(1);
  await page
    .getByLabel('Nguyên liệu chuẩn 1', { exact: true })
    .selectOption(String(ingredient._id));
  await save(page);
  await page.reload();
  await expect(
    page.getByLabel('Nguyên liệu chuẩn 1', { exact: true }),
  ).toHaveValue(String(ingredient._id));
  await page.route('**/api/v1/recipes/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      const headers = { ...route.request().headers() };
      delete headers['x-csrf-token'];
      const url = new URL(route.request().url());
      url.port = String(harness.port);
      const response = await route.fetch({ url: url.href, headers });
      return route.fulfill({ response });
    }
    return route.fallback();
  });
  await page.getByLabel('Tên công thức', { exact: true }).fill('CSRF từ chối');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByText('Phiên bảo vệ thay đổi.', { exact: false }),
  ).toBeVisible();
  const owner = await harness.identity.models.User.findOne({ email: u.email });
  await harness.identity.models.Session.updateMany(
    { userId: owner._id },
    { $set: { expiresAt: new Date(0) } },
  );
  page.once('dialog', (d) => d.accept());
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveCount(
    0,
  );
  expect((await harness.db.connection.models.Recipe.findById(id)).title).toBe(
    'Canh rau của tôi',
  );
});
test('ED-E07 editor/list/publication responsive six widths and long dynamic lists', async ({
  page,
}) => {
  await user(page);
  await create(page);
  await complete(page);
  for (let i = 1; i < 8; i++) {
    await page
      .getByRole('button', { name: 'Thêm nguyên liệu', exact: true })
      .click();
    await page
      .getByLabel('Tên nguyên liệu ' + (i + 1), { exact: true })
      .fill('Nguyên liệu ' + i + ' ' + 'Đ'.repeat(80));
    await page
      .getByRole('button', { name: 'Thêm bước nấu', exact: true })
      .click();
    await page
      .getByLabel('Hướng dẫn bước ' + (i + 1), { exact: true })
      .fill('Nấu ' + 'Đ'.repeat(1500));
  }
  await save(page);
  const rows = [];
  for (const [width, height] of [
    [1672, 941],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [name, path] of [
      ['editor', page.url()],
      ['draft-list', '/my/recipes'],
      ['create', '/my/recipes/new'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (name === 'editor')
        await expect(
          page.getByLabel('Tên công thức', { exact: true }),
        ).toBeVisible();
      if (name === 'draft-list')
        await expect(
          page.getByRole('link', {
            name: 'Chỉnh sửa Canh rau của tôi',
            exact: true,
          }),
        ).toBeVisible();
      const metrics = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      expect(metrics.scroll).toBeLessThanOrEqual(width);
      rows.push({ name, width, height, ...metrics });
      await page.screenshot({
        path: `docs/screenshots/BE-FE-RH-P1.1/${name}-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto(rows.length ? '/my/recipes' : '/my/recipes');
    await page
      .getByRole('link', { name: 'Canh rau của tôi', exact: true })
      .click();
  }
  await writeFile(
    'docs/screenshots/BE-FE-RH-P1.1/editor-responsive.json',
    JSON.stringify(rows, null, 2) + '\n',
  );
});

test('ED-E08 cross-tab logout/login changes identity and discards private dirty editor', async ({
  page,
}) => {
  await user(page);
  await create(page, 'Riêng tư chỉ của A');
  await page.getByLabel('Mô tả', { exact: true }).fill('Bản cục bộ A chưa lưu');
  const other = await page.context().newPage();
  await harness.route(other);
  await other.goto('/account');
  await other.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveCount(
    0,
  );
  await user(other);
  await expect(
    page.getByText('Riêng tư chỉ của A', { exact: true }),
  ).toHaveCount(0);
  await page.goto('/my/recipes');
  await expect(
    page.getByText('Bạn chưa có bản nháp.', { exact: true }),
  ).toBeVisible();
  await other.close();
});
test('ED-E09 uncertain save reconciles without auto replay; rate-limit and422 feedback', async ({
  page,
}) => {
  await user(page);
  await create(page);
  let writes = 0;
  await page.route('**/api/v1/recipes/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    writes++;
    const url = new URL(route.request().url());
    url.port = String(harness.port);
    await route.fetch({ url: url.href });
    await route.abort('failed');
  });
  await page
    .getByLabel('Tên công thức', { exact: true })
    .fill('Máy chủ đã lưu nhưng mất phản hồi');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Đọc bản máy chủ để đối chiếu',
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toBe(1);
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
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    'Máy chủ đã lưu nhưng mất phản hồi',
  );
  expect(writes).toBe(1);
  await page.unroute('**/api/v1/recipes/*');
  await page.route('**/api/v1/recipes/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    return route.fulfill({
      status: 429,
      headers: { 'Retry-After': '1' },
      json: { success: false, error: { code: 'RATE_LIMITED' } },
    });
  });
  await page.getByLabel('Tên công thức', { exact: true }).fill('Giữ khi chờ');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByText('Bạn thao tác quá nhanh.', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Lưu bản nháp', exact: true }),
  ).toBeDisabled();
  await page.unroute('**/api/v1/recipes/*');
  await page.route('**/api/v1/recipes/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    return route.fulfill({
      status: 422,
      json: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: [{ field: 'title', code: 'invalid' }],
        },
      },
    });
  });
  await expect(
    page.getByRole('button', { name: 'Lưu bản nháp', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await expect(
    page.getByLabel('Tên công thức', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Tên công thức', { exact: true })).toHaveValue(
    'Giữ khi chờ',
  );
});
