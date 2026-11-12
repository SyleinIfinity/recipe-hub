import { createDatabase } from '../../backend/src/config/database.js';
import { parseEnv } from '../../backend/src/config/env.js';
import { createLogger } from '../../backend/src/config/logger.js';
import { createIdentity } from '../../backend/src/modules/auth/identity.js';
import { createCatalog } from '../../backend/src/modules/catalog.js';
import { createMedia } from '../../backend/src/modules/media/index.js';
import { createRecipes } from '../../backend/src/modules/recipes/index.js';
import { createApp } from '../../backend/src/app.js';
import { createEmailProvider } from '../../backend/src/integrations/email-provider.js';

// Test-process-only composition using the production DI seams. No mailbox HTTP endpoint.
export async function createAccountHarness({
  configOverrides = {},
  storage,
} = {}) {
  const config = parseEnv({
    NODE_ENV: 'test',
    DB_NAME: 'recipe-hub-test',
    MONGODB_URI:
      process.env.TEST_MONGODB_URI ||
      'mongodb://127.0.0.1:27018/recipe-hub-test',
    SMTP_ENABLED: 'false',
    MEDIA_PROVIDER: 'fake',
    IMAGE_DELIVERY_POLICY: 'authenticated',
    CLOUDINARY_FOLDER_MODE: 'dynamic',
    APP_PUBLIC_URL: 'http://127.0.0.1:5175',
    APP_ORIGINS: 'http://127.0.0.1:5175',
    AUTH_RATE_LIMIT: '1000',
    CSRF_RATE_LIMIT: '1000',
    ...configOverrides,
  });
  const logger = createLogger('silent'),
    db = createDatabase(config),
    mail = [];
  await db.connect();
  const emailProvider = createEmailProvider(
    { ...config, SMTP_ENABLED: true, EMAIL_FROM: 'capture@example.test' },
    () => ({
      async sendMail(message) {
        const link = message.text
          .split('\n')
          .find((line) => line.startsWith('http://127.0.0.1:5175/'));
        if (!link) throw new Error('Missing test mail link');
        mail.push({ email: message.to, url: link });
        return { accepted: [message.to], rejected: [] };
      },
      close() {},
    }),
  );
  const identity = await createIdentity({
    connection: db.connection,
    config,
    logger,
    emailProvider,
  });
  const catalog = await createCatalog(db.connection, identity);
  const media = await createMedia({
    connection: db.connection,
    identity,
    config,
    logger,
    storage,
  });
  const recipes = await createRecipes({
    connection: db.connection,
    identity,
    catalog,
    media,
  });
  const app = createApp({
    config,
    identity,
    catalog,
    media,
    recipes,
    logger,
    isReady: db.isReady,
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  return {
    db,
    catalog,
    media,
    recipes,
    config,
    port: server.address().port,
    identity,
    mail,
    async route(page) {
      await page.route('**/api/v1/**', async (route) => {
        const url = new URL(route.request().url());
        url.port = String(server.address().port);
        try {
          const response = await route.fetch({ url: url.href });
          await route.fulfill({ response });
        } catch {
          // A navigation/unmount can dispose an in-flight test proxy response.
          await route.abort('failed').catch(() => {});
        }
      });
    },
    async cleanup(email) {
      const users = await identity.models.User.find({ email }).select('_id');
      const ids = users.map((user) => user._id);
      await identity.models.Session.deleteMany({ userId: { $in: ids } });
      await identity.models.Token.deleteMany({ userId: { $in: ids } });
      await identity.models.User.deleteMany({ _id: { $in: ids } });
      for (let i = mail.length - 1; i >= 0; i--)
        if (mail[i].email === email) mail.splice(i, 1);
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    },
  };
}
