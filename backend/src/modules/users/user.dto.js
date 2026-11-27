export function publicAuthorDto(user) {
  return {
    id: String(user._id),
    displayName: user.displayName,
    avatarUrl: user.avatarAssetId
      ? `/api/v1/users/${user._id}/avatar/${user.avatarAssetId}`
      : null,
  };
}
export function publicUserDto(user) {
  return {
    ...publicAuthorDto(user),
    bio: user.bio,
    createdAt: user.createdAt,
  };
}
export function privateUserDto(user) {
  const p = user.preferences;
  return {
    ...publicUserDto(user),
    avatarAssetId:
      user.avatarAssetId == null ? null : String(user.avatarAssetId),
    mediaVersion: user.mediaVersion ?? 0,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    role: user.role,
    status: user.status,
    preferences: {
      dietaryTags: [...p.dietaryTags],
      excludedIngredientIds: p.excludedIngredientIds.map(String),
      favoriteCategoryIds: p.favoriteCategoryIds.map(String),
      maxPrepMinutes: p.maxPrepMinutes,
      timezone: p.timezone,
      notificationSettings: {
        follows: p.notificationSettings.follows,
        recipes: p.notificationSettings.recipes,
        comments: p.notificationSettings.comments,
      },
      recommendationOptIn: p.recommendationOptIn,
    },
  };
}
export function adminUserDto(user) {
  return {
    ...publicUserDto(user),
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    role: user.role,
    status: user.status,
  };
}
