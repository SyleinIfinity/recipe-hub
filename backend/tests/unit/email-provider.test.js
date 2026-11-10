import { afterEach, it, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createEmailProvider } from '../../src/integrations/email-provider.js';
import { parseEnv } from '../../src/config/env.js';

const env = {
  NODE_ENV: 'test',
  DB_NAME: 'recipe-hub-test',
  MONGODB_URI: 'mongodb://127.0.0.1:27018/recipe-hub-test',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_USER: 'sender@example.test',
  SMTP_PASSWORD: 'test-only-placeholder',
  EMAIL_FROM: 'sender@example.test',
};
const config = parseEnv(env);
const message = {
  email: 'recipient@example.test',
  purpose: 'email_verify',
  token: 'a'.repeat(43),
};
function fixture(
  changes = {},
  result = { accepted: [message.email], rejected: [] },
) {
  const transport = {
    sendMail: vi.fn().mockResolvedValue(result),
    verify: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
  };
  const factory = vi.fn(() => transport);
  return {
    transport,
    factory,
    provider: createEmailProvider({ ...config, ...changes }, factory),
  };
}
afterEach(() => vi.useRealTimers());
it.each([465, 587])(
  'SMTP-01/02 uses required TLS for port %s without connecting on construction',
  async (port) => {
    const { provider, factory, transport } = fixture({ SMTP_PORT: port });
    expect(factory).not.toHaveBeenCalled();
    expect(await provider.verify()).toEqual({ verified: true });
    expect(factory.mock.calls[0][0]).toMatchObject({
      secure: port === 465,
      requireTLS: port !== 465,
      opportunisticTLS: false,
      ignoreTLS: false,
      tls: { rejectUnauthorized: true },
      logger: false,
      debug: false,
    });
    expect(transport.sendMail).not.toHaveBeenCalled();
    expect(transport.close).toHaveBeenCalled();
  },
);
it.each(['SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'])(
  'SMTP-03 rejects missing %s with safe diagnostics',
  (field) => {
    const invalid = { ...env };
    delete invalid[field];
    expect(() => parseEnv(invalid)).toThrow('Invalid environment fields');
    try {
      parseEnv(invalid);
    } catch (error) {
      expect(error.message).not.toContain(env.SMTP_PASSWORD);
    }
  },
);
it.each(['EAUTH', 'ETIMEDOUT', 'ESOCKET', 'ETLS'])(
  'SMTP-04/05/06/07 sanitizes provider failure %s',
  async (code) => {
    const { provider, transport } = fixture();
    transport.verify.mockRejectedValue(
      Object.assign(new Error('raw password token provider response'), {
        code,
      }),
    );
    await expect(provider.verify()).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
      message: 'Email operation failed',
    });
  },
);
it('SMTP-08 explicit disable ignores partially configured host and makes no network request', async () => {
  const disabled = parseEnv({
    ...env,
    SMTP_ENABLED: 'false',
    SMTP_PASSWORD: undefined,
  });
  const factory = vi.fn();
  const provider = createEmailProvider(disabled, factory);
  expect(provider.available).toBe(false);
  await expect(provider.verify()).rejects.toMatchObject({
    code: 'EMAIL_UNAVAILABLE',
  });
  await expect(provider.send(message)).rejects.toMatchObject({
    code: 'EMAIL_UNAVAILABLE',
  });
  expect(factory).not.toHaveBeenCalled();
});
it('SMTP-09 returns only acceptance without exposing SMTP response', async () => {
  const { provider } = fixture(
    {},
    {
      accepted: [message.email],
      rejected: [],
      response: 'sensitive-provider-response',
    },
  );
  expect(await provider.send(message)).toEqual({ accepted: true });
});
it('SMTP-10 rejects provider errors and non-accepted recipients', async () => {
  const { provider, transport } = fixture();
  transport.sendMail.mockRejectedValueOnce(
    new Error('raw credential and token'),
  );
  await expect(provider.send(message)).rejects.toMatchObject({
    code: 'EMAIL_DELIVERY_FAILED',
    message: 'Email operation failed',
  });
  transport.sendMail.mockResolvedValueOnce({
    accepted: [],
    rejected: [message.email],
  });
  await expect(provider.send(message)).rejects.toMatchObject({
    code: 'EMAIL_REJECTED',
  });
});
it.each(['email_verify', 'password_reset'])(
  'SMTP-13/14/15 builds Vietnamese safe text and HTML links for %s',
  async (purpose) => {
    const { provider, transport } = fixture();
    await provider.send({ ...message, purpose });
    const mail = transport.sendMail.mock.calls[0][0];
    expect(mail.from).toEqual({ name: 'Recipe Hub', address: env.EMAIL_FROM });
    expect(mail.text).toContain('15 phút');
    expect(mail.html).toContain('bỏ qua email');
    const url = new URL(mail.text.match(/http[^\s]+/)[0]);
    expect(url.origin).toBe('http://localhost:5173');
    expect(url.pathname).toBe(
      purpose === 'email_verify'
        ? '/auth/verify-email'
        : '/auth/reset-password',
    );
    expect(url.search).toBe('');
    expect(new URLSearchParams(url.hash.slice(1)).get('token')).toBe(
      message.token,
    );
    expect(mail.text).not.toContain(env.SMTP_PASSWORD);
    expect(mail.text.split(message.token)).toHaveLength(2);
  },
);
it.each([
  'javascript:alert(1)',
  'https://evil.example',
  'https://user:pass@example.test',
  'http://localhost:5173/?redirect=evil',
  'http://localhost:5173/#x',
  'not-a-url',
])('SMTP-15 rejects unsafe public URL %s', (APP_PUBLIC_URL) => {
  expect(() => parseEnv({ ...env, APP_PUBLIC_URL })).toThrow(
    'Invalid environment fields',
  );
});
it('SMTP-19 bounds even a stalled transport by total deadline', async () => {
  vi.useFakeTimers();
  const { provider, transport } = fixture({ SMTP_TIMEOUT_MS: 1000 });
  transport.sendMail.mockReturnValue(new Promise(() => {}));
  const pending = expect(provider.send(message)).rejects.toMatchObject({
    code: 'EMAIL_TIMEOUT',
  });
  await vi.advanceTimersByTimeAsync(1000);
  await pending;
  expect(transport.close).toHaveBeenCalled();
});
it('manual SMTP verification command requires explicit --connect and never prints environment', () => {
  const result = spawnSync(
    process.execPath,
    ['backend/scripts/verify-smtp.js'],
    {
      env: { ...process.env, SMTP_PASSWORD: 'do-not-print' },
      encoding: 'utf8',
    },
  );
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('No connection made');
  expect(result.stdout + result.stderr).not.toContain('do-not-print');
});
it('Gmail ports and sender header fields are constrained', () => {
  expect(() => parseEnv({ ...env, SMTP_PORT: 25 })).toThrow();
  expect(() =>
    parseEnv({
      ...env,
      EMAIL_FROM_NAME: 'Recipe Hub\r\nBcc: victim@example.test',
    }),
  ).toThrow();
});
