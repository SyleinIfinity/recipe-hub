import { randomBytes } from 'node:crypto';
import { AppError, unauthenticated } from '../../shared/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { hashToken, newToken } from './session.service.js';
const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
const invalidToken = () =>
  new AppError(422, 'INVALID_TOKEN', 'Token invalid, expired or already used');
export async function createAuthService({
  User,
  Token,
  sessions,
  emailProvider,
  tokenMinutes,
  logger,
}) {
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  async function consumeToken(token, purpose) {
    const record = await Token.findOneAndUpdate(
      {
        tokenHash: hashToken(token),
        purpose,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!record) throw invalidToken();
    return record;
  }
  return {
    async register(input) {
      const email = input.email.trim().toLowerCase();
      if (await User.exists({ email }))
        throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
      const passwordHash = await hashPassword(input.password);
      try {
        return await User.create({
          email,
          displayName: input.displayName,
          passwordHash,
          role: 'user',
          status: 'active',
        });
      } catch (error) {
        if (error.code === 11000)
          throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
        throw error;
      }
    },
    async login({ email, password }) {
      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      }).select('+passwordHash +authVersion');
      const valid = await verifyPassword(
        user?.passwordHash ?? dummyHash,
        password,
      );
      if (!user || !valid || user.status !== 'active')
        throw invalidCredentials();
      const result = await sessions.create(user);
      return { user, ...result };
    },
    getCurrentUser: (actor) => actor.user,
    logout: (actor) =>
      sessions.revokeSession(actor.session._id, actor.user._id),
    revokeSession: sessions.revokeSession,
    async changePassword(actor, { currentPassword, newPassword }) {
      const user = await User.findOne({
        _id: actor.user._id,
        status: 'active',
        authVersion: actor.session.authVersion,
      }).select('+passwordHash +authVersion');
      if (!user) throw unauthenticated();
      if (!(await verifyPassword(user.passwordHash, currentPassword)))
        throw invalidCredentials();
      const passwordHash = await hashPassword(newPassword);
      const result = await User.updateOne(
        { _id: user._id, authVersion: user.authVersion, status: 'active' },
        { $set: { passwordHash }, $inc: { authVersion: 1 } },
      );
      if (result.modifiedCount !== 1)
        throw new AppError(
          409,
          'AUTH_STATE_CHANGED',
          'Authentication state changed; sign in again',
        );
      // The atomic version bump revokes ALL sessions and outstanding tokens without a multi-document transaction.
    },
    async requestToken(email, purpose) {
      if (!emailProvider.available)
        throw new AppError(
          503,
          'EMAIL_UNAVAILABLE',
          'Email delivery unavailable',
        );
      const user = await User.findOne({ email, status: 'active' }).select(
        '+authVersion',
      );
      if (!user || (purpose === 'email_verify' && user.emailVerifiedAt)) return;
      const token = newToken();
      const record = await Token.create({
        userId: user._id,
        purpose,
        tokenHash: hashToken(token),
        authVersion: user.authVersion,
        expiresAt: new Date(Date.now() + tokenMinutes * 60000),
      });
      try {
        await emailProvider.send({ email: user.email, purpose, token });
      } catch {
        // Preserve the same public response for existing/non-existing users on delivery errors.
        logger.error(
          { event: 'email_delivery_failed' },
          'email delivery failed',
        );
        await Token.updateOne(
          { _id: record._id },
          { $set: { usedAt: new Date() } },
        );
      }
    },
    async resetPassword({ token, newPassword }) {
      const passwordHash = await hashPassword(newPassword);
      const record = await consumeToken(token, 'password_reset');
      const result = await User.updateOne(
        {
          _id: record.userId,
          authVersion: record.authVersion,
          status: 'active',
        },
        { $set: { passwordHash }, $inc: { authVersion: 1 } },
      );
      if (result.modifiedCount !== 1) throw invalidToken();
    },
    async verifyEmail({ token }) {
      const record = await consumeToken(token, 'email_verify');
      const result = await User.updateOne(
        {
          _id: record.userId,
          authVersion: record.authVersion,
          status: 'active',
          emailVerifiedAt: null,
        },
        { $set: { emailVerifiedAt: new Date() } },
      );
      if (result.modifiedCount !== 1) throw invalidToken();
    },
  };
}
