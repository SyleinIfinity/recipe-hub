import { storageEnvFields, refineStorageEnv } from './cloudinary.js';
import { z } from 'zod';

const schema = z
  .object({
    ...storageEnvFields,
    SOCIAL_RATE_LIMIT: z.coerce.number().int().min(1).max(10000).default(120),
    MEDIA_CLEANUP_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),
    MEDIA_CLEANUP_BATCH_SIZE: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
    MEDIA_CLEANUP_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(3600000)
      .default(10000),
    MEDIA_CLEANUP_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5),
    MEDIA_CLEANUP_RETRY_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(3600000)
      .default(1000),
    MEDIA_CLEANUP_LEASE_MS: z.coerce
      .number()
      .int()
      .min(120000)
      .max(600000)
      .default(120000),
    MEDIA_RELEASE_GRACE_MS: z.coerce
      .number()
      .int()
      .min(86400000)
      .max(90 * 86400000)
      .default(30 * 86400000),
    MEDIA_UPLOAD_RATE_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(30),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    APP_DOCS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    APP_ORIGINS: z
      .string()
      .default(
        'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5175',
      )
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .refine((origins) =>
        origins.every((origin) => {
          try {
            const url = new URL(origin);
            return (
              ['http:', 'https:'].includes(url.protocol) &&
              url.origin === origin
            );
          } catch {
            return false;
          }
        }),
      ),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === 'true',
      ),
    CSRF_SECRET: z.string().min(32).optional(),
    SESSION_HOURS: z.coerce.number().int().min(1).max(720).default(168),
    AUTH_TOKEN_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
    CSRF_RATE_LIMIT: z.coerce.number().int().min(1).max(1000).default(120),
    AUTH_RATE_LIMIT: z.coerce.number().int().min(1).max(1000).default(20),
    AUTH_RATE_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(3600000)
      .default(900000),
    SMTP_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === 'true',
      ),
    SMTP_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(30000)
      .default(15000),
    EMAIL_FROM_NAME: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[^\r\n]+$/)
      .default('Recipe Hub'),
    APP_PUBLIC_URL: z
      .string()
      .url()
      .default('http://localhost:5173')
      .refine((value) => {
        try {
          const url = new URL(value);
          return (
            ['http:', 'https:'].includes(url.protocol) &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash &&
            url.pathname === '/'
          );
        } catch {
          return false;
        }
      }),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
    DB_NAME: z.enum(['recipe-hub', 'recipe-hub-test']),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DB_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(3000),
    SHUTDOWN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(30000)
      .default(5000),
  })
  .superRefine((env, ctx) => {
    refineStorageEnv(env, ctx);
    if (env.NODE_ENV === 'production' && env.APP_DOCS_ENABLED)
      ctx.addIssue({
        code: 'custom',
        path: ['APP_DOCS_ENABLED'],
        message: 'Production documentation requires a separate access policy',
      });
    if (
      env.NODE_ENV === 'production' &&
      (!env.CSRF_SECRET ||
        env.COOKIE_SECURE === false ||
        env.APP_ORIGINS.some((origin) => !origin.startsWith('https://')))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['CSRF_SECRET', 'COOKIE_SECURE', 'APP_ORIGINS'],
        message: 'Production requires secure configuration',
      });
    }
    if (
      (env.SMTP_ENABLED ?? Boolean(env.SMTP_HOST)) &&
      (!env.SMTP_HOST ||
        !env.SMTP_USER ||
        !env.SMTP_PASSWORD ||
        !env.EMAIL_FROM)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'Incomplete email configuration',
      });
    if (
      env.COOKIE_SECURE === false &&
      env.APP_ORIGINS.some((origin) => origin.startsWith('https://'))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'HTTPS requires secure cookies',
      });
    if (
      (env.SMTP_ENABLED ?? Boolean(env.SMTP_HOST)) &&
      (!URL.canParse(env.APP_PUBLIC_URL) ||
        !env.APP_ORIGINS.includes(new URL(env.APP_PUBLIC_URL).origin) ||
        (env.NODE_ENV === 'production' &&
          !env.APP_PUBLIC_URL.startsWith('https://')))
    )
      ctx.addIssue({
        code: 'custom',
        path: ['APP_PUBLIC_URL'],
        message: 'Public URL must match allowed origin and production HTTPS',
      });
    if (
      env.SMTP_HOST === 'smtp.gmail.com' &&
      ![465, 587].includes(env.SMTP_PORT)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_PORT'],
        message: 'Gmail requires 465 or 587',
      });
    const expected = env.NODE_ENV === 'test' ? 'recipe-hub-test' : 'recipe-hub';
    // Require both names to agree; never override a development URI during tests.
    const path = env.MONGODB_URI.split('?')[0].split('/').at(-1);
    if (env.DB_NAME !== expected || path !== expected) {
      ctx.addIssue({
        code: 'custom',
        path: ['DB_NAME'],
        message: 'Database isolation mismatch',
      });
    }
  });

export function parseEnv(input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment fields: ${fields.join(', ')}`);
  }
  return Object.fromEntries(
    Object.entries({
      ...result.data,
      SMTP_ENABLED: result.data.SMTP_ENABLED ?? Boolean(result.data.SMTP_HOST),
      COOKIE_SECURE:
        result.data.COOKIE_SECURE ??
        (result.data.NODE_ENV === 'production' ||
          result.data.APP_ORIGINS.some((origin) =>
            origin.startsWith('https://'),
          )),
    }).filter(([, value]) => value !== undefined),
  );
}
