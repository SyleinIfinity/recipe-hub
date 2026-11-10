import { privateUserDto } from '../users/user.dto.js';
export function createAuthController(auth, security) {
  const accepted = (res) =>
    res.status(202).json({
      success: true,
      data: { message: 'If eligible, an email will be sent' },
    });
  return {
    csrf(req, res) {
      res.json({
        success: true,
        data: { csrfToken: security.issueCsrf(req, res) },
      });
    },
    async register(req, res) {
      res.status(201).json({
        success: true,
        data: privateUserDto(await auth.register(req.validated.body)),
      });
    },
    async login(req, res) {
      const result = await auth.login(req.validated.body);
      res.cookie(security.sessionCookie, result.token, {
        ...security.cookieOptions,
        expires: result.session.expiresAt,
      });
      res.json({ success: true, data: privateUserDto(result.user) });
    },
    async logout(req, res) {
      await auth.logout(req.actor);
      security.clearCookies(res);
      res.sendStatus(204);
    },
    me(req, res) {
      res.json({
        success: true,
        data: privateUserDto(auth.getCurrentUser(req.actor)),
      });
    },
    async changePassword(req, res) {
      await auth.changePassword(req.actor, req.validated.body);
      security.clearCookies(res);
      res.sendStatus(204);
    },
    async forgotPassword(req, res) {
      await auth.requestToken(req.validated.body.email, 'password_reset');
      accepted(res);
    },
    async requestVerification(req, res) {
      await auth.requestToken(req.validated.body.email, 'email_verify');
      accepted(res);
    },
    async resetPassword(req, res) {
      await auth.resetPassword(req.validated.body);
      security.clearCookies(res);
      res.sendStatus(204);
    },
    async verifyEmail(req, res) {
      await auth.verifyEmail(req.validated.body);
      res.sendStatus(204);
    },
  };
}
