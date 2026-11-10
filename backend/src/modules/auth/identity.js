import { createAuditLogModel } from '../users/audit-log.model.js';
import { createUserModel } from '../users/user.model.js';
import { createSessionModel } from './auth-session.model.js';
import { createTokenModel } from './auth-token.model.js';
import { createSessionService } from './session.service.js';
import { createAuthService } from './auth.service.js';
import { createUserService } from '../users/user.service.js';
import { createAuthController } from './auth.controller.js';
import { createUserController } from '../users/user.controller.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from '../users/user.routes.js';
import { authenticate } from '../../middleware/authenticate.js';
import { createSecurity } from '../../config/security.js';
import { createEmailProvider } from '../../integrations/email-provider.js';
export async function createIdentity({
  connection,
  config,
  logger,
  emailProvider = createEmailProvider(config),
}) {
  const AuditLog = createAuditLogModel(connection);
  const User = createUserModel(connection);
  const Session = createSessionModel(connection);
  const Token = createTokenModel(connection);
  // Create required unique/TTL indexes before accepting writes, including production.
  await Promise.all([
    User.createIndexes(),
    Session.createIndexes(),
    Token.createIndexes(),
    AuditLog.createIndexes(),
  ]);
  const sessions = createSessionService({
    User,
    Session,
    sessionHours: config.SESSION_HOURS,
  });
  const auth = await createAuthService({
    User,
    Token,
    sessions,
    emailProvider,
    tokenMinutes: config.AUTH_TOKEN_MINUTES,
    logger,
  });
  const users = createUserService({ User, AuditLog, logger });
  const security = createSecurity(config);
  const requireAuth = authenticate(sessions, security.sessionCookie);
  return {
    models: { User, Session, Token, AuditLog },
    sessions,
    auth,
    users,
    security,
    authRouter: authRoutes(
      createAuthController(auth, security),
      requireAuth,
      security,
    ),
    userRouter: userRoutes(createUserController(users), requireAuth),
  };
}
