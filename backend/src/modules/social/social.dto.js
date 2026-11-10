const id = (v) => (v == null ? null : String(v));
const author = (r) => ({ id: id(r._id), displayName: r.displayName });
export const reviewDTO = (r) => ({
  reviewId: id(r._id),
  recipeId: id(r.recipeId),
  rating: r.rating,
  content: r.content,
  author: author(r.publicAuthor),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
export const commentDTO = (r) => ({
  commentId: id(r._id),
  recipeId: id(r.recipeId),
  parentId: id(r.parentId),
  content: r.content,
  author: author(r.publicAuthor),
  version: r.version,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
export const reportDTO = (r) => ({
  reportId: id(r._id),
  targetType: r.targetType,
  targetId: id(r.targetId),
  status: r.status,
  createdAt: r.createdAt,
});
export const adminReportDTO = (r) => ({
  ...reportDTO(r),
  reporterId: id(r.reporterId),
  reason: r.reason,
  details: r.details,
  reviewedBy: id(r.reviewedBy),
  reviewedAt: r.reviewedAt,
  resolutionNote: r.resolutionNote,
  resolutionAction: r.resolutionAction,
  version: r.version,
  processing: Boolean(r.decisionIntent),
  target: r.targetContext ?? null,
});
export const moderationReceipt = (r) => ({
  auditId: id(r._id),
  targetId: id(r.targetId),
  targetType: r.targetType,
  status: r.after.status,
  version: r.after.version,
});
