import nodemailer from 'nodemailer';
import { AppError } from '../shared/errors.js';

const unavailable = () =>
  new AppError(503, 'EMAIL_UNAVAILABLE', 'Email delivery unavailable');
const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ],
  );

export function createEmailProvider(
  config,
  createTransport = nodemailer.createTransport,
) {
  if (!(config.SMTP_ENABLED ?? Boolean(config.SMTP_HOST)))
    return {
      available: false,
      async verify() {
        throw unavailable();
      },
      async send() {
        throw unavailable();
      },
    };
  const timeout = config.SMTP_TIMEOUT_MS;
  async function execute(operation) {
    let transport, timer;
    try {
      transport = createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        requireTLS: config.SMTP_PORT !== 465,
        opportunisticTLS: false,
        ignoreTLS: false,
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
        connectionTimeout: timeout,
        greetingTimeout: timeout,
        socketTimeout: timeout,
        dnsTimeout: timeout,
        logger: false,
        debug: false,
        transactionLog: false,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      return await Promise.race([
        operation(transport),
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new AppError(503, 'EMAIL_TIMEOUT', 'Email operation timed out'),
              ),
            timeout,
          );
        }),
      ]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        503,
        'EMAIL_DELIVERY_FAILED',
        'Email operation failed',
      );
    } finally {
      clearTimeout(timer);
      try {
        transport?.close?.();
      } catch {
        /* Do not expose provider errors during cleanup. */
      }
    }
  }
  return {
    available: true,
    async verify() {
      return execute(async (transport) => {
        if ((await transport.verify()) !== true) throw unavailable();
        return { verified: true };
      });
    },
    async send({ email, purpose, token }) {
      if (
        !['password_reset', 'email_verify'].includes(purpose) ||
        !/^[A-Za-z0-9_-]{43}$/.test(token)
      )
        throw new AppError(
          503,
          'EMAIL_CONTENT_INVALID',
          'Invalid email content',
        );
      const reset = purpose === 'password_reset';
      const label = reset ? 'Đặt lại mật khẩu' : 'Xác minh email';
      const url = new URL(
        reset ? '/auth/reset-password' : '/auth/verify-email',
        config.APP_PUBLIC_URL,
      );
      url.hash = new URLSearchParams({ token }).toString();
      const expiry = `Liên kết có hiệu lực trong ${config.AUTH_TOKEN_MINUTES} phút và chỉ được sử dụng một lần.`;
      const ignore =
        'Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.';
      return execute(async (transport) => {
        const result = await transport.sendMail({
          from: { name: config.EMAIL_FROM_NAME, address: config.EMAIL_FROM },
          to: email,
          subject: `Recipe Hub — ${label}`,
          text: `Xin chào,\n\n${label} cho tài khoản Recipe Hub của bạn:\n${url.href}\n\n${expiry}\n${ignore}`,
          html: `<p>Xin chào,</p><p><a href="${escapeHtml(url.href)}">${label} cho tài khoản Recipe Hub</a></p><p>${expiry}</p><p>${ignore}</p>`,
        });
        if (
          !result?.accepted?.some(
            (address) => address.toLowerCase() === email.toLowerCase(),
          ) ||
          result.rejected?.length
        )
          throw new AppError(503, 'EMAIL_REJECTED', 'Email was not accepted');
        return { accepted: true };
      });
    },
  };
}
