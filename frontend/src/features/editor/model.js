import { ApiError } from '../../services/api.js';
export const emptyRecipe = () => ({
  title: '',
  description: '',
  categoryId: '',
  tags: [],
  difficulty: '',
  prepMinutes: '',
  cookMinutes: '',
  servings: '',
  ingredients: [],
  steps: [],
});
export const rowKey = () => crypto.randomUUID();
export function editValues(recipe) {
  return {
    ...emptyRecipe(),
    ...recipe,
    categoryId: recipe.categoryId ?? '',
    difficulty: recipe.difficulty ?? '',
    prepMinutes: recipe.prepMinutes ?? '',
    cookMinutes: recipe.cookMinutes ?? '',
    servings: recipe.servings ?? '',
    ingredients: recipe.ingredients.map((r) => ({
      ...r,
      key: rowKey(),
      quantity: r.quantity ?? '',
      ingredientId: r.ingredientId ?? '',
      unit: r.unit ?? '',
      quantityText: r.quantityText ?? '',
      note: r.note ?? '',
    })),
    steps: recipe.steps.map((r) => ({
      ...r,
      key: rowKey(),
      durationMinutes: r.durationMinutes ?? '',
    })),
  };
}
export function moveRow(rows, key, direction) {
  const index = rows.findIndex((r) => r.key === key),
    target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
const numeric = (v) => (v === '' || v == null ? null : Number(v));
export function serializeRecipe(v, version) {
  return {
    ...(version === undefined ? {} : { version }),
    title: v.title,
    description: v.description,
    categoryId: v.categoryId || null,
    tags: v.tags,
    difficulty: v.difficulty || null,
    prepMinutes: numeric(v.prepMinutes),
    cookMinutes: numeric(v.cookMinutes),
    servings: numeric(v.servings),
    ingredients: v.ingredients.map((r, i) => ({
      ingredientId: r.ingredientId || null,
      name: r.name,
      quantity: numeric(r.quantity),
      unit: r.unit || null,
      quantityText: r.quantityText || null,
      note: r.note || null,
      order: i + 1,
    })),
    steps: v.steps.map((r, i) => ({
      ...(r.stepId ? { stepId: r.stepId } : {}),
      order: i + 1,
      instruction: r.instruction,
      durationMinutes: numeric(r.durationMinutes),
      ...(r.imageAssetId !== undefined
        ? { imageAssetId: r.imageAssetId || null }
        : {}),
    })),
    // Preserve the existing canonical cover without exposing attachment controls.
    ...(v.coverImageAssetId !== undefined
      ? { coverImageAssetId: v.coverImageAssetId || null }
      : {}),
  };
}
export function validateRecipe(v, publication = false) {
  const errors = {};
  const text = (field, value, max, min = 0) => {
    if (
      typeof value !== 'string' ||
      value.length > max ||
      /[<>\p{Cc}\p{Cf}]/u.test(value) ||
      value.normalize('NFC').trim().length < min
    )
      errors[field] =
        `Nhập ${min}–${max} ký tự, một dòng; không dùng dấu < > hoặc ký tự điều khiển.`;
  };
  const number = (field, value, min, max, integer = true, required = false) => {
    if (value === '' || value == null) {
      if (required) errors[field] = 'Cần nhập giá trị.';
      return;
    }
    const n = Number(value);
    if (
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      (integer && !Number.isInteger(n))
    )
      errors[field] =
        `Nhập số ${integer ? 'nguyên ' : ''}từ ${min} đến ${max}.`;
  };
  text('title', v.title, 150, publication ? 3 : 0);
  text('description', v.description, 2000, publication ? 10 : 0);
  if (v.tags.length > 12) errors.tags = 'Tối đa 12 nhãn.';
  v.tags.forEach((t) => text('tags', t, 40, 1));
  if (v.categoryId && !/^[a-f\d]{24}$/i.test(v.categoryId))
    errors.categoryId = 'Danh mục không hợp lệ.';
  if (publication && !v.categoryId)
    errors.categoryId = 'Chọn danh mục còn hoạt động.';
  if (v.difficulty && !['easy', 'medium', 'hard'].includes(v.difficulty))
    errors.difficulty = 'Độ khó không hợp lệ.';
  if (publication && !v.difficulty) errors.difficulty = 'Chọn độ khó.';
  for (const f of ['prepMinutes', 'cookMinutes'])
    number(f, v[f], 0, 1440, true, publication);
  number('servings', v.servings, 1, 100, true, publication);
  if (v.ingredients.length > 40 || (publication && !v.ingredients.length))
    errors.ingredients =
      'Cần 1–40 nguyên liệu để xuất bản (nháp có thể trống).';
  const ids = new Set();
  v.ingredients.forEach((r, i) => {
    const prefix = `ingredients.${i}`;
    text(prefix + '.name', r.name, 100, 1);
    text(prefix + '.unit', r.unit ?? '', 32);
    text(prefix + '.quantityText', r.quantityText ?? '', 100);
    text(prefix + '.note', r.note ?? '', 500);
    number(prefix + '.quantity', r.quantity, 0, 1e9, false);
    if (
      publication &&
      (r.quantity === '' || r.quantity == null) &&
      !r.quantityText?.trim()
    )
      errors[prefix + '.quantity'] = 'Nhập định lượng hoặc mô tả lượng.';
    if (r.ingredientId) {
      if (
        !/^[a-f\d]{24}$/i.test(r.ingredientId) ||
        ids.has(r.ingredientId.toLowerCase())
      )
        errors[prefix + '.ingredientId'] =
          'Nguyên liệu chuẩn không hợp lệ hoặc bị trùng.';
      ids.add(r.ingredientId.toLowerCase());
    }
  });
  if (v.steps.length > 30 || (publication && !v.steps.length))
    errors.steps = 'Cần 1–30 bước để xuất bản (nháp có thể trống).';
  v.steps.forEach((r, i) => {
    text(`steps.${i}.instruction`, r.instruction, 2000, publication ? 5 : 0);
    number(`steps.${i}.durationMinutes`, r.durationMinutes, 0, 1440);
  });
  return errors;
}
export function confirmedRecipe(response, status = 200) {
  const r = response?.data;
  if (
    response?.http?.status !== status ||
    !/^[a-f\d]{24}$/i.test(r?.recipeId || '') ||
    !Number.isSafeInteger(r.version) ||
    r.version < 0 ||
    !['draft', 'published'].includes(r.status) ||
    !['normal', 'hidden'].includes(r.moderationStatus) ||
    !Array.isArray(r.ingredients) ||
    !Array.isArray(r.steps)
  )
    throw new ApiError(0, 'INVALID_RESPONSE', {
      mutationOutcomeUncertain: true,
    });
  return r;
}
export function recipeError(error) {
  if (error?.code === 'CSRF_INVALID')
    return 'Phiên bảo vệ thay đổi. Tải lại trang trước khi gửi tiếp.';
  if (error?.status === 401) return 'Phiên đăng nhập đã hết hạn.';
  if (error?.status === 404)
    return 'Không tìm thấy công thức hoặc bạn không có quyền truy cập.';
  if (error?.status === 403)
    return 'Bạn không có quyền thực hiện thao tác này.';
  if (error?.status === 409)
    return 'Dữ liệu hoặc trạng thái đã thay đổi. Đối chiếu bản trên máy chủ trước khi gửi tiếp.';
  if (error?.status === 429)
    return 'Bạn thao tác quá nhanh. Chờ trước khi thử lại.';
  if (error?.status === 422)
    return 'Dữ liệu chưa hợp lệ. Kiểm tra các trường được đánh dấu.';
  if (error?.mutationOutcomeUncertain)
    return 'Chưa xác định được kết quả. Không tự gửi lại; hãy đối chiếu dữ liệu trên máy chủ.';
  return 'Chưa tải được dữ liệu. Kiểm tra kết nối rồi thử lại.';
}
