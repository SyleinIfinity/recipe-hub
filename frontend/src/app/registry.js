export const features = Object.freeze({
  publicRecipes: {
    backend: true,
    integrated: true,
    visible: true,
    owner: 'FE-04',
  },
  authentication: {
    backend: true,
    integrated: true,
    visible: true,
    owner: 'FE-07',
  },
  editor: { backend: true, integrated: true, visible: true, owner: 'FE-08' },
  social: { backend: true, integrated: false, visible: false, owner: 'FE-09' },
  admin: { backend: true, integrated: false, visible: false, owner: 'FE-10' },
  p2: { backend: false, integrated: false, visible: false, owner: 'FE-11+' },
});
export const accountRoutes = [
  ['login', '/auth/login', 'Đăng nhập', 'guest'],
  ['register', '/auth/register', 'Đăng ký', 'guest'],
  ['forgot', '/auth/forgot-password', 'Quên mật khẩu', 'guest'],
  ['reset', '/auth/reset-password', 'Đặt lại mật khẩu', 'public'],
  ['verify', '/auth/verify-email', 'Xác minh email', 'public'],
  ['resend', '/auth/request-email-verification', 'Gửi lại xác minh', 'public'],
  ['account', '/account', 'Tài khoản của tôi', 'authenticated'],
  ['editProfile', '/account/profile', 'Chỉnh sửa hồ sơ', 'authenticated'],
  ['settings', '/account/settings', 'Cài đặt tài khoản', 'authenticated'],
  ['password', '/account/change-password', 'Đổi mật khẩu', 'authenticated'],
].map(([id, pattern, title, access]) => ({
  id,
  pattern,
  title,
  access,
  screen: 'AccountScreens',
  feature: 'authentication',
  implemented: true,
  owner: 'FE-07',
}));
export const editorRoutes = [
  ['myRecipes', '/my/recipes', 'Bản nháp của tôi'],
  ['newRecipe', '/my/recipes/new', 'Tạo công thức'],
  ['editRecipe', '/my/recipes/:recipeId/edit', 'Quản lý công thức'],
].map(([id, pattern, title]) => ({
  id,
  pattern,
  title,
  access: 'authenticated',
  feature: 'editor',
  implemented: true,
  owner: 'FE-08',
}));
export const routes = Object.freeze([
  ...accountRoutes,
  ...editorRoutes,
  {
    id: 'home',
    pattern: '/',
    screen: 'Home',
    access: 'public',
    feature: 'publicRecipes',
    implemented: true,
    owner: 'FE-04',
    label: 'Trang chủ',
    icon: 'home',
  },
  {
    id: 'explore',
    pattern: '/recipes',
    screen: 'Explore',
    access: 'public',
    feature: 'publicRecipes',
    implemented: true,
    owner: 'FE-04',
    label: 'Khám phá',
    icon: 'search',
  },
  {
    id: 'detail',
    pattern: '/recipes/:slug',
    screen: 'RecipeDetail',
    access: 'public',
    feature: 'publicRecipes',
    implemented: true,
    owner: 'FE-04',
  },
  {
    id: 'profile',
    pattern: '/users/:userId',
    screen: 'PublicProfile',
    access: 'public',
    feature: 'publicRecipes',
    implemented: true,
    owner: 'FE-04',
  },
  {
    id: 'forbidden',
    pattern: '/forbidden',
    screen: 'PageError',
    access: 'public',
    feature: 'publicRecipes',
    implemented: true,
    owner: 'FE-04',
  },
  {
    id: 'notfound',
    pattern: '*',
    screen: 'PageError',
    access: 'public',
    feature: 'publicRecipes',
    implemented: true,
    owner: 'FE-04',
  },
]);
export function featureAvailable(name) {
  const feature = features[name];
  return Boolean(feature?.backend && feature.integrated && feature.visible);
}
export function routeAccess(access, session, ownerId) {
  if (access === 'public') return 'allowed';
  if (session.status === 'unknown') return 'pending';
  if (session.status === 'error') return 'unavailable';
  if (access === 'guest')
    return session.status === 'authenticated' ? 'forbidden' : 'allowed';
  if (session.status !== 'authenticated') return 'unauthorized';
  if (access === 'authenticated') return 'allowed';
  if (access === 'admin')
    return session.body?.data?.role === 'admin' ? 'allowed' : 'forbidden';
  if (access === 'owner')
    return ownerId && session.body?.data?.id === ownerId
      ? 'allowed'
      : 'forbidden';
  return 'forbidden';
}
export const navigationRoutes = routes.filter(
  (route) =>
    route.label && route.implemented && featureAvailable(route.feature),
);
