import { test, expect } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createAccountHarness } from './support/account-harness.js';
let harness;
const users = [];
const credentials = () => {
  const result = {
    email: `fe07-${randomUUID()}@example.test`,
    password: randomBytes(18).toString('base64url'),
    name: 'Bếp xác thực',
  };
  users.push(result.email);
  return result;
};
test.beforeAll(async () => {
  harness = await createAccountHarness();
  await mkdir('docs/screenshots/BE-FE-RH-P1.1', { recursive: true });
});
test.afterAll(async () => {
  if (harness) {
    for (const email of users) await harness.cleanup(email);
    await harness.close();
  }
});
async function register(page, user) {
  await page.goto('/auth/register');
  await page.getByLabel('Tên hiển thị', { exact: false }).fill(user.name);
  await page.getByRole('textbox', { name: 'Email *', exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(user.password);
  await page
    .getByLabel('Xác nhận mật khẩu *', { exact: true })
    .fill(user.password);
  await page
    .getByRole('button', { name: 'Tạo tài khoản', exact: true })
    .click();
  await expect(
    page.getByText('Đã tạo tài khoản.', { exact: false }),
  ).toBeVisible();
}
async function login(page, user, returnTo = '/account') {
  await page.goto('/auth/login?' + new URLSearchParams({ returnTo }));
  await page.getByRole('textbox', { name: 'Email *', exact: true }).fill(user.email);
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(returnTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
  );
}
async function emailLink(page, email, path) {
  const link = harness.mail.findLast(
    (message) =>
      message.email === email && new URL(message.url).pathname === path,
  );
  expect(Boolean(link)).toBe(true);
  // Navigate a captured production-rendered mail link without writing its secret to an artifact.
  await page.evaluate((url) => {
    window.location.href = url;
  }, link.url);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => location.hash === '' && location.search === ''),
    )
    .toBe(true);
}
test('ACC-E01 register, real login/session reload, profile, settings, password change and logout', async ({
  page,
}) => {
  await harness.route(page);
  const user = credentials();
  await register(page, user);
  expect(
    (await page.context().cookies()).some((c) => c.name.includes('session')),
  ).toBe(false);
  await login(page, user);
  await expect(page.getByText('Chưa xác minh', { exact: true })).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === 'recipe-hub-session',
  );
  expect(Boolean(cookie?.httpOnly && cookie?.sameSite === 'Lax')).toBe(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: user.name, level: 2 }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Chỉnh sửa hồ sơ', exact: true })
    .click();
  await page
    .getByLabel('Tên hiển thị', { exact: false })
    .fill('Bếp mới xác nhận');
  await page
    .getByLabel('Giới thiệu', { exact: true })
    .fill('Dòng đầu\nDòng thứ hai');
  await expect(
    page.getByText('Có thay đổi chưa lưu.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Đã lưu thay đổi tài khoản.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Tên hiển thị', { exact: false })).toHaveValue(
    'Bếp mới xác nhận',
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Chào mừng trở lại, Bếp mới xác nhận!',
      level: 1,
    }),
  ).toBeVisible();
  await page.goto('/account/settings');
  await page.getByLabel('Múi giờ', { exact: false }).fill('Asia/Tokyo');
  await page
    .getByLabel('Thời gian chuẩn bị tối đa', { exact: false })
    .fill('45');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByLabel('Múi giờ', { exact: false })).toHaveValue(
    'Asia/Tokyo',
  );
  await page.goto('/account/change-password');
  const nextPassword = randomBytes(18).toString('base64url');
  await page
    .getByLabel('Mật khẩu hiện tại', { exact: false })
    .first()
    .fill(user.password);
  await page
    .getByLabel('Mật khẩu mới', { exact: false })
    .first()
    .fill(nextPassword);
  await page
    .getByLabel('Xác nhận mật khẩu *', { exact: true })
    .fill(nextPassword);
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await login(page, { ...user, password: nextPassword });
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/account');
  await expect(page).toHaveURL(/\/auth\/login\?returnTo/);
  expect(
    (await page.context().cookies()).some(
      (c) => c.name === 'recipe-hub-session',
    ),
  ).toBe(false);
});
test('ACC-E02 captured verification and recovery mail journeys, one-use token and reset invalidation', async ({
  page,
}) => {
  await harness.route(page);
  const user = credentials();
  await register(page, user);
  await page.goto('/auth/request-email-verification');
  await page.getByRole('textbox', { name: 'Email *', exact: true }).fill(user.email);
  await page
    .getByRole('button', { name: 'Yêu cầu xác minh email', exact: true })
    .click();
  await expect(
    page.getByText('Nếu tài khoản đủ điều kiện', { exact: false }),
  ).toBeVisible();
  await emailLink(page, user.email, '/auth/verify-email');
  await page
    .getByRole('button', { name: 'Xác nhận xác minh email', exact: true })
    .click();
  await expect(
    page.getByText('Email đã được xác minh.', { exact: true }),
  ).toBeVisible();
  await login(page, user);
  await expect(page.getByText('Đã xác minh', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/auth/forgot-password');
  await page.getByRole('textbox', { name: 'Email *', exact: true }).fill(user.email);
  await page
    .getByRole('button', { name: 'Yêu cầu đặt lại mật khẩu', exact: true })
    .click();
  await expect(
    page.getByText('Nếu tài khoản đủ điều kiện', { exact: false }),
  ).toBeVisible();
  await emailLink(page, user.email, '/auth/reset-password');
  const nextPassword = randomBytes(18).toString('base64url');
  await page
    .getByLabel('Mật khẩu mới', { exact: false })
    .first()
    .fill(nextPassword);
  await page
    .getByLabel('Xác nhận mật khẩu *', { exact: true })
    .fill(nextPassword);
  await page
    .getByRole('button', { name: 'Đặt lại mật khẩu', exact: true })
    .click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await login(page, { ...user, password: nextPassword });
  await emailLink(page, user.email, '/auth/reset-password');
  await page
    .getByLabel('Mật khẩu mới', { exact: false })
    .first()
    .fill(user.password);
  await page
    .getByLabel('Xác nhận mật khẩu *', { exact: true })
    .fill(user.password);
  await page
    .getByRole('button', { name: 'Đặt lại mật khẩu', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Liên kết không hợp lệ');
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});

test('ACC-E03 six viewports for every implemented account screen and authenticated navigation', async ({
  page,
}) => {
  // This scenario renders and captures ten account screens at six viewport sizes.
  test.setTimeout(120000);
  await harness.route(page);
  const user = credentials();
  user.name = 'Đ'.repeat(80);
  user.email =
    'fe07-' +
    randomUUID() +
    '@' +
    'a'.repeat(60) +
    '.' +
    'b'.repeat(60) +
    '.' +
    'c'.repeat(50) +
    '.test';
  users.push(user.email);
  await register(page, user);
  for (const [path, action] of [
    ['/auth/forgot-password', 'Yêu cầu đặt lại mật khẩu'],
    ['/auth/request-email-verification', 'Yêu cầu xác minh email'],
  ]) {
    await page.goto(path);
    await page.getByLabel('Email *', { exact: true }).fill(user.email);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(
      page.getByText('Nếu tài khoản đủ điều kiện', { exact: false }),
    ).toBeVisible();
  }
  const report = [];
  const sizes = [
    [1672, 941],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const [name, path] of [
      ['login', '/auth/login'],
      ['register', '/auth/register'],
      ['forgot', '/auth/forgot-password'],
      ['resend', '/auth/request-email-verification'],
      ['reset', '/auth/reset-password'],
      ['verify', '/auth/verify-email'],
    ]) {
      if (['reset', 'verify'].includes(name))
        await emailLink(page, user.email, path);
      else await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (name === 'verify')
        await expect(
          page.getByRole('button', {
            name: 'Xác nhận xác minh email',
            exact: true,
          }),
        ).toBeVisible();
      else if (name === 'reset')
        await expect(
          page.getByLabel('Mật khẩu mới *', { exact: true }),
        ).toBeVisible();
      else
        await expect(page.getByLabel('Email *', { exact: true })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(overflow).toBe(false);
      await page.screenshot({
        path: `docs/screenshots/BE-FE-RH-P1.1/${name}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      report.push({ name, width, height, overflow });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, user);
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    for (const [name, path] of [
      ['account', '/account'],
      ['profile', '/account/profile'],
      ['settings', '/account/settings'],
      ['password', '/account/change-password'],
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Đăng xuất', exact: true }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(overflow).toBe(false);
      // Screenshots contain only synthetic test-account data; passwords are empty.
      await page.screenshot({
        path: `docs/screenshots/BE-FE-RH-P1.1/${name}-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      report.push({ name, width, height, overflow });
    }
  }
  await writeFile(
    'docs/screenshots/BE-FE-RH-P1.1/responsive.json',
    JSON.stringify(report, null, 2) + '\n',
  );
});

test('ACC-E04 real CSRF rejection, session expiry, two identities and token expiration', async ({
  page,
  context,
}) => {
  await harness.route(page);
  const first = credentials(),
    second = credentials();
  await register(page, first);
  await register(page, second);
  await page.goto('/auth/login?returnTo=https://evil.example/');
  await page.getByLabel('Email *', { exact: true }).fill(first.email);
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(first.password);
  await page.route('**/api/v1/auth/login', async (route) => {
    const headers = { ...route.request().headers() };
    delete headers['x-csrf-token'];
    const response = await route.fetch({
      url: `http://127.0.0.1:${harness.port}/api/v1/auth/login`,
      headers,
    });
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Phiên bảo vệ');
  await expect(
    page.getByRole('button', { name: 'Đăng nhập', exact: true }),
  ).toBeDisabled();
  // Only remove the overriding route; retain the real-backend transport route.
  await page.unroute('**/api/v1/auth/login');
  await login(page, first);
  const other = await context.newPage();
  await harness.route(other);
  await other.goto('/account/profile');
  await expect(
    other.getByLabel('Tên hiển thị *', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(other).toHaveURL(/\/auth\/login/);
  await login(page, second);
  await other.goto('/account');
  await expect(other.getByText(second.email, { exact: true })).toBeVisible();
  expect(
    (await other.locator('main').textContent()).includes(first.email),
  ).toBe(false);
  const identity = await harness.identity.models.User.findOne({
    email: second.email,
  });
  await harness.identity.models.Session.updateMany(
    { userId: identity._id },
    { expiresAt: new Date(0) },
  );
  await page.goto('/account/settings');
  await expect(page).toHaveURL(/\/auth\/login/);
  await other.close();
  await page.goto('/auth/forgot-password');
  await page.getByLabel('Email *', { exact: true }).fill(first.email);
  await page
    .getByRole('button', { name: 'Yêu cầu đặt lại mật khẩu', exact: true })
    .click();
  await expect(
    page.getByText('Nếu tài khoản đủ điều kiện', { exact: false }),
  ).toBeVisible();
  const owner = await harness.identity.models.User.findOne({
    email: first.email,
  });
  await harness.identity.models.Token.updateMany(
    { userId: owner._id, purpose: 'password_reset' },
    { expiresAt: new Date(0) },
  );
  await emailLink(page, first.email, '/auth/reset-password');
  await page
    .getByLabel('Mật khẩu mới *', { exact: true })
    .fill(second.password);
  await page
    .getByLabel('Xác nhận mật khẩu *', { exact: true })
    .fill(second.password);
  await page
    .getByRole('button', { name: 'Đặt lại mật khẩu', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('hết hạn');
});

test('ACC-E05 invalid credentials, duplicate submit and uncertain logout never replay writes', async ({
  page,
}) => {
  await harness.route(page);
  const user = credentials();
  await register(page, user);
  await page.goto('/auth/login');
  await page.getByLabel('Email *', { exact: true }).fill(user.email);
  const password = page.getByLabel('Mật khẩu *', { exact: true });
  const toggle = page.getByRole('button', {
    name: 'Hiện mật khẩu',
    exact: true,
  });
  await password.focus();
  await page.keyboard.press('Tab');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Space');
  await expect(password).toHaveAttribute('type', 'text');
  await page.keyboard.press('Space');
  await expect(password).toHaveAttribute('type', 'password');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Quên mật khẩu?' }),
  ).toBeFocused();
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('incorrect');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Thông tin xác thực');
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(user.password);
  let count = 0,
    started,
    release;
  const pending = new Promise((resolve) => (started = resolve)),
    gate = new Promise((resolve) => (release = resolve));
  await page.route('**/api/v1/auth/login', async (route) => {
    count++;
    const response = await route.fetch({
      url: `http://127.0.0.1:${harness.port}/api/v1/auth/login`,
    });
    started();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole('form', { name: 'Đăng nhập', exact: true })
    .evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
  await pending;
  await expect(
    page.getByRole('button', { name: 'Đang gửi…', exact: true }),
  ).toBeDisabled();
  expect(count).toBe(1);
  release();
  await expect(page).toHaveURL(/\/account$/);
  let logoutCount = 0;
  await page.route('**/api/v1/auth/logout', async (route) => {
    logoutCount++;
    await route.fetch({
      url: `http://127.0.0.1:${harness.port}/api/v1/auth/logout`,
    });
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(
    page.getByRole('status').filter({ hasText: 'Chưa xác nhận đăng xuất' }),
  ).toBeVisible();
  expect((await page.locator('main').textContent()).includes(user.email)).toBe(
    false,
  );
  expect(logoutCount).toBe(1);
});

test('ACC-E06 unavailable mail provider never claims email delivery or auto retries', async ({
  page,
}) => {
  // Default test server has SMTP_ENABLED=false. This case intentionally does not use the capture transport.
  await page.goto('/auth/forgot-password');
  await page
    .getByLabel('Email *', { exact: true })
    .fill('not-a-real-account@example.test');
  let writes = 0;
  page.on('request', (request) => {
    if (
      request.url().endsWith('/auth/forgot-password') &&
      request.method() === 'POST'
    )
      writes++;
  });
  await page
    .getByRole('button', { name: 'Yêu cầu đặt lại mật khẩu', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Dịch vụ email hiện chưa sẵn sàng',
  );
  expect(
    (await page.locator('main').textContent()).includes(
      'yêu cầu gửi liên kết đã được tiếp nhận',
    ),
  ).toBe(false);
  expect(writes).toBe(1);
});
