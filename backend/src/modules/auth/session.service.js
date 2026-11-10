import { randomBytes, createHash } from 'node:crypto';
import { unauthenticated } from '../../shared/errors.js';
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token) =>
  createHash('sha256').update(token).digest('hex');
export function createSessionService({ User, Session, sessionHours }) {
  return {
    async create(user) {
      const token = newToken();
      const expiresAt = new Date(Date.now() + sessionHours * 3600000);
      const session = await Session.create({
        userId: user._id,
        authVersion: user.authVersion,
        tokenHash: hashToken(token),
        expiresAt,
      });
      // A concurrent password/status change invalidates this session even if it was just inserted.
      return { token, session };
    },
    async authenticate(token) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token))
        throw unauthenticated();
      const session = await Session.findOne({
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!session) throw unauthenticated();
      const user = await User.findById(session.userId).select('+authVersion');
      if (
        !user ||
        user.status !== 'active' ||
        user.authVersion !== session.authVersion
      )
        throw unauthenticated();
      return { user, session };
    },
    async revokeSession(sessionId, userId) {
      await Session.updateOne(
        { _id: sessionId, userId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    },
  };
}
