import { createReviewModel } from '../reviews/review.model.js';
import { createCommentModel } from '../comments/comment.model.js';
import { createReportModel } from '../reports/report.model.js';
import { createReviewService } from '../reviews/review.service.js';
import { createCommentService } from '../comments/comment.service.js';
import { createReportService } from '../reports/report.service.js';
import { createModerationService } from '../moderation/moderation.service.js';
import { createSocialController } from './social.controller.js';
import { socialRoutes } from './social.routes.js';
import { authenticate } from '../../middleware/authenticate.js';
export async function createSocial({
  connection,
  identity,
  Recipe,
  publication,
}) {
  const Review = createReviewModel(connection),
    Comment = createCommentModel(connection),
    Report = createReportModel(connection);
  await Promise.all([
    Review.createIndexes(),
    Comment.createIndexes(),
    Report.createIndexes(),
  ]);
  const shared = {
    Recipe,
    User: identity.models.User,
    Review,
    Comment,
    Report,
    publication,
  };
  const reviews = createReviewService(shared),
    comments = createCommentService(shared),
    reports = createReportService({ ...shared, comments }),
    moderation = createModerationService({
      ...shared,
      AuditLog: identity.models.AuditLog,
    });
  const services = { reviews, comments, reports, moderation };
  return {
    ...services,
    models: { Review, Comment, Report },
    router: socialRoutes(
      createSocialController(services),
      authenticate(identity.sessions, identity.security.sessionCookie),
      identity.security,
    ),
  };
}
