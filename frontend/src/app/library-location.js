export const libraryTabs = {
  published: 'Đã đăng',
  draft: 'Bản nháp',
  saved: 'Đã lưu',
  favorites: 'Yêu thích',
};

export function listLocation(search, library = false) {
  const params = new URLSearchParams(search);
  for (const key of params.keys()) {
    if (
      (key !== 'page' && !(library && key === 'tab')) ||
      params.getAll(key).length !== 1
    )
      return null;
  }
  const page = params.get('page') ?? '1';
  const tab = params.get('tab') ?? 'draft';
  if (
    !/^[1-9]\d{0,3}$/.test(page) ||
    Number(page) > 1000 ||
    !Object.hasOwn(libraryTabs, tab)
  )
    return null;
  return { page: Number(page), tab };
}

export function libraryHref(tab, page = 1) {
  const params = new URLSearchParams({ tab });
  if (page > 1) params.set('page', String(page));
  return '/my/recipes?' + params;
}
