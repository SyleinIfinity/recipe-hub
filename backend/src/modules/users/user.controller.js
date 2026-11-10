import { publicUserDto, privateUserDto, adminUserDto } from './user.dto.js';
export function createUserController(users) {
  return {
    async publicProfile(req, res) {
      res.json({
        success: true,
        data: publicUserDto(
          await users.getPublicProfile(req.validated.params.userId),
        ),
      });
    },
    async updateProfile(req, res) {
      res.json({
        success: true,
        data: privateUserDto(
          await users.updateProfile(req.actor, req.validated.body),
        ),
      });
    },
    preferences(req, res) {
      res.json({
        success: true,
        data: privateUserDto(users.getCurrentProfile(req.actor)).preferences,
      });
    },
    async updatePreferences(req, res) {
      res.json({
        success: true,
        data: privateUserDto(
          await users.updatePreferences(req.actor, req.validated.body),
        ).preferences,
      });
    },
    async list(req, res) {
      const result = await users.listUsers(req.actor, req.validated.query);
      res.json({
        success: true,
        data: result.users.map(adminUserDto),
        meta: result.meta,
      });
    },
    async changeStatus(req, res) {
      res.json({
        success: true,
        data: adminUserDto(
          await users.changeUserStatus(
            req.actor,
            req.validated.params.userId,
            req.validated.body,
            req.requestId,
          ),
        ),
      });
    },
  };
}
