import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { screenshotPath, writeVerification } from './support/artifacts.js';
import mongoose from 'mongoose';
import { parseEnv } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/database.js';
import {
  newToken,
  hashToken,
} from '../backend/src/modules/auth/session.service.js';
import { recipeSearchFields } from '../backend/src/modules/recipes/search.normalization.js';
let db, authorId, categoryId, ingredientIds, rows, prefix;
test.describe.configure({ mode: 'default' });
test.beforeAll(async () => {
  db = createDatabase(
    parseEnv({
      NODE_ENV: 'test',
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI:
        process.env.TEST_MONGODB_URI ||
        'mongodb://127.0.0.1:27018/recipe-hub-test',
    }),
  );
  await db.connect();
  prefix = randomUUID();
  const now = new Date();
  const id = () => new mongoose.Types.ObjectId();
  authorId = id();
  categoryId = id();
  ingredientIds = [id(), id()];
  await db.connection.collection('user').insertOne({
    _id: authorId,
    email: `fe04-${prefix}@example.test`,
    displayName: 'Đặng Thị Hồng',
    bio: 'Yêu những bữa cơm ấm áp bên gia đình.',
    role: 'user',
    status: 'active',
    authVersion: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.connection.collection('categories').insertOne({
    _id: categoryId,
    name: 'Bữa cơm Việt',
    slug: prefix,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.connection.collection('ingredients').insertMany(
    ingredientIds.map((_id, i) => ({
      _id,
      name: ['Cà rốt FE04', 'Đậu hũ FE04'][i],
      normalizedName: `fe04-${prefix}-${i}`,
      lookupKeys: [`fe04-${prefix}-${i}`],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })),
  );
  rows = [
    'Canh rau củ thanh mát',
    'Đậu hũ sốt cà chua',
    'Cơm chiên rau củ',
    'Nấm kho tiêu',
    'Bản nháp riêng tư',
    'Công thức đã ẩn',
  ].map((title, i) => {
    const r = {
      _id: id(),
      authorId,
      title,
      slug: `fe04-${i}-${prefix}`,
      description: 'Bữa cơm gia đình giản dị, thơm ngon và ấm áp.',
      categoryId,
      tags: [prefix],
      difficulty: 'easy',
      prepMinutes: 10,
      cookMinutes: 15,
      totalMinutes: 25,
      servings: 2,
      ingredients: ingredientIds
        .slice(0, i % 2 ? 1 : 2)
        .map((ingredientId, n) => ({
          ingredientId,
          name: ['Cà rốt', 'Đậu hũ'][n],
          quantity: 1,
          unit: 'phần',
          order: n + 1,
        })),
      steps: [
        {
          stepId: randomUUID(),
          order: 1,
          instruction: 'Sơ chế nguyên liệu, nấu chín rồi dùng khi còn ấm.',
          durationMinutes: 15,
          imageAssetId: null,
        },
      ],
      status: i === 4 ? 'draft' : 'published',
      moderationStatus: i === 5 ? 'hidden' : 'normal',
      deletedAt: null,
      creationState: 'complete',
      creationKey: `${prefix}-${i}`,
      creationFingerprint: prefix,
      coverImageAssetId: null,
      publishedAt: new Date(now.getTime() - i * 1000),
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    return { ...r, ...recipeSearchFields(r) };
  });
  await db.connection.collection('recipes').insertMany(rows);
});
test.afterAll(async () => {
  if (!db) return;
  try {
    if (authorId) {
      await db.connection.collection('recipes').deleteMany({ authorId });
      await db.connection
        .collection('auth_sessions')
        .deleteMany({ userId: authorId });
      await db.connection.collection('user').deleteOne({ _id: authorId });
    }
    if (categoryId)
      await db.connection
        .collection('categories')
        .deleteOne({ _id: categoryId });
    if (ingredientIds)
      await db.connection
        .collection('ingredients')
        .deleteMany({ _id: { $in: ingredientIds } });
  } finally {
    await db.close();
  }
});
async function ready(page) {
  await expect(
    page.getByRole('heading', { name: 'Hôm nay nấu món gì?', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.recipe-section .recipe-card')).toHaveCount(4);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) => image.decode().catch(() => {})),
    );
  });
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function capture(page, name, fullPage = true) {
  await page.screenshot({
    path: screenshotPath(`${name}.png`),
    fullPage,
    animations: 'disabled',
  });
}
test('FE04 Home six viewports, real public data, artwork, fonts and console', async ({
  page,
}) => {
  const errors = [],
    external = [],
    mutations = [],
    apiRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('401'))
      errors.push(m.text());
  });
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/v1/'))
      apiRequests.push(new URL(r.url()).pathname + new URL(r.url()).search);
    if (!r.url().startsWith('http://127.0.0.1:5175')) external.push(r.url());
    if (!['GET', 'HEAD'].includes(r.method())) mutations.push(r.url());
  });
  const metrics = [];
  const pairContexts = [];
  for (const [width, height] of [
    [1672, 941],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    apiRequests.length = 0;
    await page.goto('/');
    await ready(page);
    await noOverflow(page);
    expect(
      await page.locator('.kitchen-scene').getAttribute('aria-hidden'),
    ).toBe('true');
    const m = await page.evaluate(() => ({
      width: innerWidth,
      header: document.querySelector('.site-header').getBoundingClientRect()
        .height,
      main: document.querySelector('main').getBoundingClientRect().width,
      recipes: document.querySelector('.recipe-section').getBoundingClientRect()
        .width,
      font: document.fonts.check(
        '16px "Be Vietnam Pro"',
        'Đặng Thị Hồng Ắằễộự',
      ),
      layoutShiftSupported:
        PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
      artSources: [...document.querySelectorAll('.kitchen-scene img')].map(
        (img) => ({
          src: img.currentSrc,
          loaded: img.complete && img.naturalWidth > 0,
        }),
      ),
      assets: performance
        .getEntriesByType('resource')
        .filter((r) => r.name.includes('/assets/'))
        .map((r) => ({
          url: r.name,
          bytes: r.decodedBodySize,
          duration: r.duration,
        })),
      script: document.fonts.check(
        '40px "Dancing Script"',
        'Chào mừng trở lại',
      ),
      buttons: [
        ...document.querySelectorAll('button,.filter-chip,.quick-action'),
      ]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => ({
          text: e.textContent || e.getAttribute('aria-label'),
          width: e.getBoundingClientRect().width,
          height: e.getBoundingClientRect().height,
        })),
    }));
    expect(m.font && m.script).toBe(true);
    expect(m.artSources.every((img) => img.loaded)).toBe(true);
    if (width <= 560)
      expect(m.assets.filter((a) => a.url.endsWith('-desktop.webp'))).toEqual(
        [],
      );
    else
      expect(m.assets.filter((a) => a.url.endsWith('-mobile.webp'))).toEqual(
        [],
      );
    for (const img of m.artSources.filter((img) => img.src.endsWith('.webp')))
      expect(img.src).toContain(
        width <= 560 ? '-mobile.webp' : '-desktop.webp',
      );
    for (const b of m.buttons) {
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    m.apiRequests = apiRequests.slice();
    expect(
      m.apiRequests.filter(
        (path) => path === '/api/v1/recipes?limit=4&sort=-publishedAt',
      ),
    ).toHaveLength(1);
    expect(
      m.apiRequests.filter((path) => path === '/api/v1/auth/me'),
    ).toHaveLength(1);
    metrics.push(m);
    await capture(page, `home-${width}x${height}-full`);
    await capture(page, `home-${width}x${height}`, false);
    if (process.env.FE04_VR_COMPARE === '1')
      await capture(page, `after-home-${width}x${height}`, false);
    if (width === 1672 || width === 390) {
      const heading = page.locator('#home-heading');
      await heading.screenshot({
        path: screenshotPath(`heading-${width}.png`),
        animations: 'disabled',
      });
      await heading.evaluate((el) => {
        el.style.color = 'transparent';
        el.style.textShadow = 'none';
      });
      await heading.screenshot({
        path: screenshotPath(`heading-backdrop-${width}.png`),
        animations: 'disabled',
      });
      await heading.evaluate((el) => {
        el.style.removeProperty('color');
        el.style.removeProperty('text-shadow');
      });
    }

    if (
      process.env.FE04_VR_COMPARE === '1' &&
      (width === 1672 || width === 390)
    ) {
      const before = await page.context().newPage();
      await before.setViewportSize({ width, height });
      await before.goto('http://127.0.0.1:5176/');
      await ready(before);
      await capture(before, `before-home-${width}x${height}`, false);
      const beforeTitles = await before
        .locator('.recipe-section h3')
        .allTextContents();
      expect(beforeTitles).toEqual(
        await page.locator('.recipe-section h3').allTextContents(),
      );
      pairContexts.push({
        width,
        height,
        auth: 'guest',
        sameTitles: beforeTitles,
        beforeOrigin: 'http://127.0.0.1:5176',
        afterOrigin: 'http://127.0.0.1:5175',
        recipeIds: rows.slice(0, 4).map((r) => String(r._id)),
        beforeAssets: await before.evaluate(() =>
          performance
            .getEntriesByType('resource')
            .filter((r) => r.name.includes('/assets/'))
            .map((r) => ({ url: r.name, bytes: r.decodedBodySize })),
        ),
        fontReady: await before.evaluate(
          () => document.fonts.status === 'loaded',
        ),
        artReady: await before.evaluate(() =>
          [...document.querySelectorAll('.kitchen-scene img')].every(
            (i) => i.complete && i.naturalWidth > 0,
          ),
        ),
      });
      await before.close();
    }
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(mutations).toEqual([]);
  if (pairContexts.length)
    await writeVerification(
      `pair-contexts.json`,
      JSON.stringify(pairContexts, null, 2),
    );
  await writeVerification(
    `browser-metrics.json`,
    JSON.stringify(
      { metrics, errors, external, mutations, pairContexts },
      null,
      2,
    ),
  );
  await page.setViewportSize({ width: 768, height: 600 });
  await page.evaluate(async () => {
    const specimen = document.createElement('section');
    specimen.style.cssText =
      'position:fixed;inset:0;z-index:100;padding:32px;background:#fff9f1;color:#3a231a;overflow:auto';
    const text =
      'Chào mừng trở lại. Công thức nấu ăn. Đặng Thị Hồng. Ắ, ằ, ễ, ộ, ự.';
    for (const family of ['Be Vietnam Pro', 'Dancing Script']) {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.cssText = `font-family:"${family}";font-size:36px;line-height:1.6;font-weight:700;margin:0 0 32px`;
      specimen.append(p);
      await document.fonts.load(`700 36px "${family}"`, text);
    }
    document.body.append(specimen);
  });
  await capture(page, 'typography-vi', false);
});
test('FE04 search, filters, paging, Back/Forward, detail and profile use real API', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('searchbox', { name: 'Tìm công thức' }).fill('canh rau');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/q=canh\+rau/);
  await expect(
    page.locator('.explore .recipe-card').filter({ hasText: rows[0].title }),
  ).toHaveCount(1);
  await page.goto(`/recipes?category=${categoryId}&limit=2&sort=-publishedAt`);
  await expect(page.locator('.explore .recipe-card')).toHaveCount(2);
  await expect(page.getByLabel('Danh mục', { exact: true })).toHaveValue(
    String(categoryId),
  );
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.pagination')).toContainText('Trang 2');
  await page.goBack();
  await expect(page.locator('.pagination')).toContainText('Trang 1');
  await page.goForward();
  await expect(page.locator('.pagination')).toContainText('Trang 2');
  await page.getByLabel('Độ khó', { exact: true }).selectOption('easy');
  await page.getByLabel('Tối đa (phút)').fill('30');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page).toHaveURL(/difficulty=easy/);
  await page
    .getByRole('checkbox', { name: 'Cà rốt FE04', exact: true })
    .check();
  await expect(page).not.toHaveURL(/ingredientMatch=/);
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page).toHaveURL(/ingredientMatch=any/);
  await page
    .getByRole('checkbox', { name: 'Đậu hũ FE04', exact: true })
    .check();
  await page.getByLabel('Cách khớp').selectOption('all');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
  await expect(page).toHaveURL(/ingredientMatch=all/);
  await expect(
    page.getByRole('button', { name: 'Bỏ Đậu hũ FE04', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.explore .recipe-card')).toHaveCount(2);
  await page
    .locator('.explore .recipe-card')
    .getByRole('link', { name: rows[0].title, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: rows[0].title, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Sơ chế nguyên liệu, nấu chín rồi dùng khi còn ấm.'),
  ).toBeVisible();
  await page.locator('.detail-author').getByRole('link').click();
  await expect(
    page.getByRole('heading', { name: 'Đặng Thị Hồng', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Yêu những bữa cơm ấm áp bên gia đình.'),
  ).toBeVisible();
  expect(await page.locator('main').textContent()).not.toContain(
    '@example.test',
  );
});
test('FE04 public screens desktop/mobile snapshots and private visibility', async ({
  page,
}) => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [name, path, heading] of [
      ['explore', `/recipes?category=${categoryId}`, 'Khám phá công thức'],
      ['detail', '/recipes/' + rows[0].slug, rows[0].title],
      ['profile', '/users/' + authorId, 'Đặng Thị Hồng'],
      ['not-found', '/missing', 'Không tìm thấy nội dung'],
      ['forbidden', '/forbidden', 'Bạn không có quyền truy cập'],
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: heading, level: 1 }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await noOverflow(page);
      await capture(page, `${name}-${width}x${height}`);
    }
  }
  for (const r of rows.slice(4)) {
    await page.goto('/recipes/' + r.slug);
    await expect(
      page.getByRole('heading', { name: 'Không tìm thấy nội dung', level: 1 }),
    ).toBeVisible();
    expect(await page.locator('main').textContent()).not.toContain(r.title);
  }
});
test('FE04 native drawer keyboard, outside, focus restoration, resize and reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  const trigger = page.getByRole('button', { name: 'Mở menu' }),
    dialog = page.getByRole('dialog', { name: 'Điều hướng' });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đóng menu' })).toBeFocused();
  await capture(page, 'drawer-390x844', false);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    'hidden',
  );
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          !!document.activeElement.closest('dialog'),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await trigger.click();
  await page.mouse.click(380, 400);
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link', { name: 'Khám phá', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Khám phá công thức', level: 1 }),
  ).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    ),
  ).toBe(true);
  // 720 CSS pixels represents the reflow viewport of a 1440px window at 200% zoom.
  await page.setViewportSize({ width: 720, height: 450 });
  await noOverflow(page);
  await expect(trigger).toBeVisible();
  await capture(page, 'reflow-720x450', false);
});
test('FE04 controlled transport failures distinguish loading, empty, retry and malformed filters', async ({
  page,
}) => {
  let mode = 'error';
  await page.route(
    '**/api/v1/recipes?limit=4&sort=-publishedAt',
    async (route) => {
      if (mode === 'error')
        await route.fulfill({
          status: 503,
          json: { success: false, error: { code: 'UNAVAILABLE' } },
        });
      else
        await route.fulfill({
          json: {
            success: true,
            data: [],
            meta: { total: 0, page: 1, limit: 4 },
          },
        });
    },
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
  mode = 'empty';
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Chưa có công thức nào')).toBeVisible();
  expect(await page.getByText('Gợi ý hôm nay').count()).toBe(0);
  await page.goto('/recipes?role=admin');
  await expect(page.getByRole('alert')).toHaveText(
    'Bộ lọc không hợp lệ. Vui lòng kiểm tra lại.',
  );
});

test('FE04VR long authenticated name/title, loading and text-spacing reflow', async ({
  page,
}) => {
  const longName = 'Đặng Thị Hồng '.repeat(7).slice(0, 80),
    longTitle = 'Ắ'.repeat(150),
    token = newToken();
  await db.connection
    .collection('user')
    .updateOne({ _id: authorId }, { $set: { displayName: longName } });
  await db.connection
    .collection('recipes')
    .updateOne({ _id: rows[0]._id }, { $set: { title: longTitle } });
  const session = await db.connection.collection('auth_sessions').insertOne({
    userId: authorId,
    authVersion: 0,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 3600000),
    revokedAt: null,
  });
  try {
    await page.context().addCookies([
      {
        name: 'recipe-hub-session',
        value: token,
        url: 'http://127.0.0.1:5175',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    for (const [width, height] of [
      [1672, 941],
      [390, 844],
      [360, 800],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        `Chào mừng trở lại, ${longName}!`,
      );
      await expect(page.locator('.recipe-section h3').first()).toHaveText(
        longTitle,
      );
      await page.evaluate(() => document.fonts.ready);
      await noOverflow(page);
      await capture(page, `long-text-${width}x${height}`);
      await page.addStyleTag({
        content:
          'body * {letter-spacing:.12em;word-spacing:.16em;} p {line-height:1.5;margin-bottom:2em;}',
      });
      await noOverflow(page);
    }
    await page.context().clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(
      '**/api/v1/recipes?limit=4&sort=-publishedAt',
      async (route) => {
        await gate;
        await route.continue();
      },
    );
    await page.goto('/');
    await expect(page.locator('.skeleton-grid')).toBeVisible();
    await capture(page, 'loading-390x844', false);
    release();
    await expect(page.locator('.recipe-section .recipe-card')).toHaveCount(4);
    await page.setViewportSize({ width: 1440, height: 900 });
    const beforeZoom = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
    }));
    for (let n = 0; n < 6; n++) await page.keyboard.press('Control+Equal');
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const afterZoom = await page.evaluate(() => ({
      width: innerWidth,
      dpr: devicePixelRatio,
    }));
    await writeVerification(
      `zoom-probe.json`,
      JSON.stringify(
        {
          attempt: 'Control+Equal six times in headless Firefox',
          before: beforeZoom,
          after: afterZoom,
          result:
            afterZoom.width === beforeZoom.width / 2
              ? 'observed_200_percent'
              : 'not_verified',
        },
        null,
        2,
      ),
    );
  } finally {
    await db.connection
      .collection('user')
      .updateOne({ _id: authorId }, { $set: { displayName: 'Đặng Thị Hồng' } });
    await db.connection
      .collection('recipes')
      .updateOne({ _id: rows[0]._id }, { $set: { title: rows[0].title } });
    await db.connection
      .collection('auth_sessions')
      .deleteOne({ _id: session.insertedId });
  }
});

test('FE05 approved FE04-VR visual baseline', async ({ page }) => {
  for (const [width, height] of [
    [1672, 941],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await ready(page);
    await expect.soft(page).toHaveScreenshot(`kitchen-home-${width}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  }
});

test('FE05 navigation cancels pending GET, respects fragments and browser history', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  let release, started;
  const pending = new Promise((resolve) => (started = resolve));
  const gate = new Promise((resolve) => (release = resolve));
  await page.route('**/api/v1/recipes?*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('q') !== prefix)
      return route.continue();
    started();
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByRole('searchbox').fill(prefix);
  await page.getByRole('search').getByRole('button').click();
  await pending;
  await expect(
    page.getByRole('heading', { name: 'Khám phá công thức', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Chính' })
    .getByRole('link', { name: 'Trang chủ' })
    .click();
  release();
  await expect(page.locator('#home-heading')).toBeVisible();
  await expect(page.locator('main')).toBeFocused();
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await expect(page.locator('main')).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#home-heading')).toBeVisible();
  await page.unrouteAll({ behavior: 'wait' });
});

test('PUB-E01 FE06 six viewport public screens, privacy, landmarks and forced colors', async ({
  page,
}) => {
  const evidence = [];
  for (const [width, height] of [
    [1672, 941],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [name, path, heading] of [
      [
        'explore',
        `/recipes?category=${categoryId}&limit=2`,
        'Khám phá công thức',
      ],
      ['detail', '/recipes/' + rows[0].slug, rows[0].title],
      ['profile', '/users/' + authorId, 'Đặng Thị Hồng'],
      ['notfound', '/unknown-public-route', 'Không tìm thấy nội dung'],
      ['forbidden', '/forbidden', 'Bạn không có quyền truy cập'],
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: heading, level: 1 }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await noOverflow(page);
      expect(await page.getByRole('heading', { level: 1 }).count()).toBe(1);
      expect(await page.locator('main').textContent()).not.toContain(
        '@example.test',
      );
      const m = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        fonts: document.fonts.check('16px "Be Vietnam Pro"', 'Đặng Thị Hồng'),
        duplicateIds: [...document.querySelectorAll('[id]')]
          .map((e) => e.id)
          .filter((id, index, all) => all.indexOf(id) !== index),
        unlabeled: [
          ...document.querySelectorAll(
            'main input:not([type=checkbox]),main select',
          ),
        ]
          .filter((e) => !e.labels?.length && !e.getAttribute('aria-label'))
          .map((e) => e.name),
      }));
      expect(m.duplicateIds).toEqual([]);
      expect(m.unlabeled).toEqual([]);
      expect(m.fonts).toBe(true);
      evidence.push({ name, width, height, ...m });
      await page.screenshot({
        path: screenshotPath(`${name}-${width}x${height}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      if (name === 'detail') {
        await expect(
          page.getByRole('link', { name: 'Bữa cơm Việt', exact: true }),
        ).toHaveAttribute('href', '/recipes?category=' + categoryId);
        const categoryLink = page.getByRole('link', {
          name: 'Bữa cơm Việt',
          exact: true,
        });
        expect(
          (await categoryLink.boundingBox()).height,
        ).toBeGreaterThanOrEqual(44);
      }
    }
  }
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.goto('/recipes');
  await expect(
    page.getByRole('heading', { name: 'Khám phá công thức', exact: true }),
  ).toBeVisible();
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const mainFocusOutline = await page
    .locator('main')
    .evaluate((e) => getComputedStyle(e).outlineStyle);
  await page
    .getByRole('searchbox', { name: 'Tìm công thức', exact: true })
    .focus();
  const forced = await page.evaluate(() => ({
    active: matchMedia('(forced-colors: active)').matches,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    focusOutline: getComputedStyle(document.activeElement).outlineStyle,
    focusWidth: getComputedStyle(document.activeElement).outlineWidth,
  }));
  forced.mainFocusOutline = mainFocusOutline;
  expect(forced.active && forced.reduced).toBe(true);
  expect(forced.focusOutline).toBe('solid');
  expect(parseFloat(forced.focusWidth)).toBeGreaterThanOrEqual(3);
  await noOverflow(page);
  await page.screenshot({
    path: screenshotPath('forced-colors-360.png'),
    fullPage: true,
  });
  await page.emulateMedia({
    forcedColors: 'none',
    reducedMotion: 'no-preference',
  });
  const before = await page.evaluate(() => ({
    width: innerWidth,
    ratio: devicePixelRatio,
  }));
  for (let i = 0; i < 6; i++) await page.keyboard.press('Control+Equal');
  const after = await page.evaluate(() => ({
    width: innerWidth,
    ratio: devicePixelRatio,
  }));
  await writeVerification(
    'responsive-a11y.json',
    JSON.stringify(
      {
        evidence,
        forced,
        nativeZoom: {
          before,
          after,
          status:
            before.width !== after.width || before.ratio !== after.ratio
              ? 'observed_change_not_calibrated_200'
              : 'not_verified',
        },
      },
      null,
      2,
    ) + '\n',
  );
});

test('PUB-E02 FE06 real catalog page2 and ingredient result cap', async ({
  page,
}) => {
  const categories = Array.from({ length: 101 }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    name: `FE06 ${prefix} category ${i}`,
    slug: `${prefix}-category-${i}`,
    sortOrder: 100,
    isActive: true,
  }));
  const inactiveCategory = {
    _id: new mongoose.Types.ObjectId(),
    name: `FE06 ${prefix} inactive category`,
    slug: `${prefix}-inactive-category`,
    sortOrder: 100,
    isActive: false,
  };
  const ingredients = Array.from({ length: 21 }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    name: `FE06 ${prefix} ingredient ${i.toString().padStart(2, '0')}`,
    normalizedName: `fe06 ${prefix} ingredient ${i.toString().padStart(2, '0')}`,
    lookupKeys: [`fe06 ${prefix} ingredient ${i.toString().padStart(2, '0')}`],
    isActive: true,
  }));
  const inactiveIngredient = {
    _id: new mongoose.Types.ObjectId(),
    name: `FE06 ${prefix} inactive ingredient`,
    normalizedName: `fe06 ${prefix} inactive ingredient`,
    lookupKeys: [`fe06 ${prefix} inactive ingredient`],
    isActive: false,
  };
  try {
    await db.connection
      .collection('categories')
      .insertMany([...categories, inactiveCategory]);
    await db.connection
      .collection('ingredients')
      .insertMany([...ingredients, inactiveIngredient]);
    const last = categories.at(-1);
    await page.goto('/recipes?category=' + last._id);
    await expect(page.getByLabel('Danh mục', { exact: true })).toHaveValue(
      String(last._id),
    );
    await page.getByRole('button', { name: 'Tải thêm danh mục' }).click();
    await expect(
      page.getByRole('option', { name: last.name, exact: true }),
    ).toHaveCount(1);
    expect(
      await page.getByRole('option', { name: inactiveCategory.name }).count(),
    ).toBe(0);
    await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click();
    await expect(
      page.getByText('Không tìm thấy công thức phù hợp'),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp('category=' + last._id));
    await page.goto('/recipes');
    const term = `FE06 ${prefix}`;
    const filtered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/v1/ingredients' &&
        url.searchParams.get('q') === term &&
        url.searchParams.get('limit') === '20'
      );
    });
    await page
      .getByRole('searchbox', { name: 'Tìm trong danh mục nguyên liệu' })
      .fill(term);
    expect((await filtered).ok()).toBe(true);
    await expect(
      page.getByRole('checkbox', { name: ingredients[0].name, exact: true }),
    ).toBeVisible();
    expect(
      await page
        .getByRole('checkbox', { name: ingredients[20].name, exact: true })
        .count(),
    ).toBe(0);
    await page.getByRole('button', { name: 'Tải thêm nguyên liệu' }).click();
    await expect(
      page.getByRole('checkbox', { name: ingredients[20].name, exact: true }),
    ).toBeVisible();
    expect(
      await page
        .getByRole('checkbox', { name: inactiveIngredient.name })
        .count(),
    ).toBe(0);
  } finally {
    await db.connection.collection('categories').deleteMany({
      _id: { $in: [...categories, inactiveCategory].map((c) => c._id) },
    });
    await db.connection.collection('ingredients').deleteMany({
      _id: { $in: [...ingredients, inactiveIngredient].map((i) => i._id) },
    });
  }
});

test('PUB-E03 FE06 rapid search, Enter, URL preservation and real retry', async ({
  page,
}) => {
  let release, started;
  const pending = new Promise((resolve) => (started = resolve)),
    gate = new Promise((resolve) => (release = resolve));
  await page.route('**/api/v1/recipes?*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('q') !== 'canh')
      return route.continue();
    const response = await route.fetch();
    started();
    await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.goto('/recipes');
  const length = await page.evaluate(() => history.length);
  await page.getByRole('searchbox', { name: 'Tìm công thức' }).fill('canh');
  await page.getByRole('searchbox', { name: 'Tìm công thức' }).press('Enter');
  await pending;
  await page.getByRole('searchbox', { name: 'Tìm công thức' }).fill('NẤM');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page.locator('.explore .recipe-card')).toHaveCount(1);
  await expect(page.locator('.explore .recipe-card')).toContainText(
    rows[3].title,
  );
  release();
  await expect(page.locator('.explore .recipe-card')).not.toContainText(
    rows[0].title,
  );
  expect(await page.evaluate(() => history.length)).toBe(length + 2);
  await page.unrouteAll({ behavior: 'wait' });
  for (const [status, message] of [
    [401, 'Phiên đăng nhập'],
    [403, 'không có quyền'],
    [429, 'quá nhanh'],
    [503, 'Không tải được công thức'],
  ]) {
    let failed = false;
    await page.route('**/api/v1/recipes/' + rows[0].slug, (route) => {
      if (failed) return route.continue();
      failed = true;
      return route.fulfill({
        status,
        contentType: 'application/json',
        headers: status === 429 ? { 'Retry-After': '1' } : {},
        body: JSON.stringify({
          success: false,
          error: { code: status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE' },
        }),
      });
    });
    await page.goto('/recipes/' + rows[0].slug);
    await expect(page.getByRole('alert')).toContainText(message);
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: rows[0].title }),
    ).toBeVisible();
    await page.unrouteAll({ behavior: 'wait' });
  }
  let attempts = 0;
  await page.route('**/api/v1/recipes?*', (route) => {
    if (new URL(route.request().url()).searchParams.get('q') !== 'canh')
      return route.continue();
    attempts++;
    return attempts === 1
      ? route.fulfill({
          status: 503,
          contentType: 'text/html',
          body: '<html>unavailable</html>',
        })
      : route.continue();
  });
  await page.goto('/recipes?q=canh');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('searchbox', { name: 'Tìm công thức' }),
  ).toHaveValue('canh');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.locator('.explore .recipe-card')).toHaveCount(1);
  expect(attempts).toBe(2);
});

test('PUB-E04 FE06 inclusive time and long Detail/Profile text at six widths', async ({
  page,
}) => {
  const longName = 'Đ'.repeat(80),
    longTitle = 'Ắ'.repeat(150);
  const original = await db.connection
    .collection('recipes')
    .findOne({ _id: rows[0]._id });
  try {
    await db.connection
      .collection('recipes')
      .updateOne(
        { _id: rows[0]._id },
        { $set: { totalMinutes: 30, prepMinutes: 20, cookMinutes: 10 } },
      );
    await page.goto(`/recipes?category=${categoryId}&maxMinutes=30`);
    await expect(
      page.locator('.explore .recipe-card').filter({ hasText: rows[0].title }),
    ).toHaveCount(1);
    await page.goto(`/recipes?category=${categoryId}&maxMinutes=29`);
    await expect(page.locator('.explore .recipe-card')).toHaveCount(3);
    await expect(
      page.locator('.explore .recipe-card').filter({ hasText: rows[0].title }),
    ).toHaveCount(0);
    const ingredients = original.ingredients.map((item, i) =>
      i
        ? item
        : {
            ...item,
            name: 'Ắ'.repeat(100),
            quantity: null,
            quantityText: 'Đ'.repeat(100),
            note: 'Ớ'.repeat(500),
          },
    );
    const steps = original.steps.map((item, i) =>
      i ? item : { ...item, instruction: 'Ừ'.repeat(2000) },
    );
    await db.connection.collection('recipes').updateOne(
      { _id: rows[0]._id },
      {
        $set: {
          title: longTitle,
          description: 'Ễ'.repeat(2000),
          ingredients,
          steps,
        },
      },
    );
    await db.connection
      .collection('user')
      .updateOne(
        { _id: authorId },
        { $set: { displayName: longName, bio: 'Ứ'.repeat(500) } },
      );
    for (const [width, height] of [
      [1672, 941],
      [1440, 900],
      [1024, 768],
      [768, 1024],
      [390, 844],
      [360, 800],
    ]) {
      await page.setViewportSize({ width, height });
      for (const [name, path, title] of [
        ['detail', '/recipes/' + rows[0].slug, longTitle],
        ['profile', '/users/' + authorId, longName],
      ]) {
        await page.goto(path);
        await expect(
          page.getByRole('heading', { name: title, level: 1 }),
        ).toBeVisible();
        const overflow = await page.evaluate(() => ({
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          elements: [...document.querySelectorAll('main *')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .map((e) => ({
              tag: e.tagName,
              class: e.className,
              width: e.getBoundingClientRect().width,
              text: e.textContent.slice(0, 30),
            })),
        }));
        await writeVerification(
          `long-layout-${name}-${width}.json`,
          JSON.stringify(overflow, null, 2) + '\n',
        );
        await noOverflow(page);
        await page.screenshot({
          path: screenshotPath(`long-${name}-${width}.png`),
          fullPage: false,
          animations: 'disabled',
        });
      }
    }
  } finally {
    await db.connection.collection('recipes').updateOne(
      { _id: rows[0]._id },
      {
        $set: {
          title: original.title,
          description: original.description,
          ingredients: original.ingredients,
          steps: original.steps,
          totalMinutes: original.totalMinutes,
          prepMinutes: original.prepMinutes,
          cookMinutes: original.cookMinutes,
        },
      },
    );
    await db.connection.collection('user').updateOne(
      { _id: authorId },
      {
        $set: {
          displayName: 'Đặng Thị Hồng',
          bio: 'Yêu những bữa cơm ấm áp bên gia đình.',
        },
      },
    );
  }
});
