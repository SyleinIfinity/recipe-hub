import pino from 'pino';

export function createLogger(level = 'info', destination) {
  return pino(
    {
      level,
      base: undefined,
      redact: {
        paths: [
          'password',
          'passwordHash',
          'tokenHash',
          'csrfToken',
          'CSRF_SECRET',
          'SMTP_PASSWORD',
          'CLOUDINARY_API_KEY',
          'CLOUDINARY_API_SECRET',
          'CLOUDINARY_URL',
          'api_key',
          'api_secret',
          'token',
          'authorization',
          'cookie',
          'MONGODB_URI',
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body',
        ],
        censor: '[REDACTED]',
      },
    },
    destination,
  );
}
