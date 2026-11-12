import { createElement as h, useEffect, useRef, useState } from 'react';
import { requestApi, ApiError } from '../../services/api.js';
import { Button, RecipeImage } from '../../components/ui/primitives.js';
export async function validateMediaFile(file, purpose) {
  const limit = (purpose === 'avatar' ? 2 : 5) * 1024 * 1024;
  if (!file || file.size === 0 || file.size > limit)
    throw new Error(
      `Chọn ảnh từ 1 byte đến ${purpose === 'avatar' ? 2 : 5} MiB.`,
    );
  const b = new Uint8Array(await file.arrayBuffer());
  const type =
    b[0] === 255 && b[1] === 216 && b[2] === 255
      ? 'image/jpeg'
      : b.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
        ? 'image/png'
        : String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
            String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
          ? 'image/webp'
          : null;
  if (!type || file.type !== type)
    throw new Error('Chỉ nhận JPEG, PNG hoặc WebP có nội dung khớp MIME.');
}
export function MediaPicker({
  label,
  purpose,
  assetId,
  url,
  onChange,
  onBusy = () => {},
  onUnresolved = () => {},
  disabled = false,
}) {
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState(null),
    [state, setState] = useState('ready'),
    [message, setMessage] = useState('');
  const unresolved = useRef(onUnresolved);
  unresolved.current = onUnresolved;
  const intent = useRef(null),
    active = useRef(true),
    lock = useRef(false),
    abort = useRef(null);
  useEffect(
    () => () => {
      active.current = false;
      unresolved.current(false);
      abort.current?.abort();
      intent.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setPreview(local);
    return () => {
      URL.revokeObjectURL(local);
    };
  }, [file]);
  const attached = Boolean(assetId && url?.endsWith('/' + assetId));
  const uncertain = state === 'uncertain';
  useEffect(() => {
    if (assetId && url?.endsWith('/' + assetId)) {
      setFile(null);
      setPreview(null);
      setState('ready');
    }
  }, [assetId, url]);
  async function upload() {
    if (lock.current || !file) return;
    lock.current = true;
    onBusy(1);
    setState('uploading');
    setMessage('');
    abort.current = new AbortController();
    try {
      if (!intent.current) intent.current = { key: crypto.randomUUID(), file };
      const body = new FormData();
      body.append('purpose', purpose);
      body.append(
        'file',
        intent.current.file,
        'image.' +
          { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[
            file.type
          ],
      );
      const response = await requestApi('/media/images', {
        method: 'POST',
        body,
        idempotencyKey: intent.current.key,
        signal: abort.current.signal,
        timeoutMs: 20000,
      });
      const a = response?.data;
      if (
        response?.http?.status !== 201 ||
        !/^[a-f\d]{24}$/i.test(a?.assetId || '') ||
        a.purpose !== purpose ||
        a.status !== 'temporary' ||
        a.url !== null
      )
        throw new ApiError(0, 'INVALID_RESPONSE', {
          mutationOutcomeUncertain: true,
        });
      if (!active.current) return;
      onChange(a.assetId);
      unresolved.current(false);
      intent.current = null;
      setState('temporary');
      setMessage('Ảnh đã tải lên dạng tạm. Cần lưu biểu mẫu để gắn ảnh.');
    } catch (error) {
      if (!active.current) return;
      setState(
        error.mutationOutcomeUncertain || error.status === 409
          ? 'uncertain'
          : 'error',
      );
      setMessage(
        error.mutationOutcomeUncertain
          ? 'Chưa xác định được upload. Không tạo yêu cầu mới; chỉ kiểm tra lại cùng khóa.'
          : error.code === 'CSRF_INVALID'
            ? 'Phiên bảo vệ thay đổi. Tải lại trang trước khi tiếp tục.'
            : error.status === 413
              ? 'Ảnh vượt giới hạn dung lượng.'
              : error.status === 415 || error.status === 422
                ? 'Ảnh không hợp lệ hoặc bị hỏng.'
                : error.status === 409
                  ? 'Upload cần đối chiếu trạng thái media; không gửi tự động.'
                  : 'Chưa tải được ảnh. Kiểm tra kết nối hoặc dịch vụ ảnh.',
      );
      if (!error.mutationOutcomeUncertain && error.status !== 409)
        intent.current = null;
    } finally {
      lock.current = false;
      onBusy(-1);
    }
  }
  return h(
    'section',
    { className: 'media-picker', 'aria-label': label },
    h('h3', null, label),
    url &&
      h(
        'div',
        null,
        h(
          'p',
          null,
          attached
            ? 'Ảnh đã gắn trên máy chủ'
            : 'Ảnh đang lưu trên máy chủ (chưa xác nhận thay đổi)',
        ),
        h(RecipeImage, { key: url, url }),
      ),
    !url && h('p', null, 'Chưa có ảnh đã lưu.'),
    h(
      'label',
      null,
      'Chọn ' + label.toLowerCase(),
      h('input', {
        type: 'file',
        accept: 'image/jpeg,image/png,image/webp',
        disabled: disabled || lock.current || uncertain,
        onChange: async (e) => {
          const next = e.target.files?.[0];
          if (!next) return;
          try {
            await validateMediaFile(next, purpose);
            if (active.current) {
              intent.current = null;
              unresolved.current(true);
              setFile(next);
              setState('selected');
              setMessage('Ảnh xem trước cục bộ, chưa tải lên hoặc lưu.');
            }
          } catch (error) {
            if (active.current) {
              setMessage(error.message);
              setState('error');
            }
          }
          e.target.value = '';
        },
      }),
    ),
    file &&
      preview &&
      h(
        'figure',
        null,
        h('img', {
          src: preview,
          alt: 'Xem trước cục bộ: ' + label,
          onError: () =>
            setMessage(
              'Không đọc được ảnh xem trước. Backend sẽ kiểm tra ảnh trước khi lưu.',
            ),
        }),
        h('figcaption', null, 'Xem trước cục bộ — không phải ảnh đã lưu.'),
      ),
    h(
      'p',
      { role: 'status' },
      state === 'uploading'
        ? 'Đang tải ảnh…'
        : attached && state !== 'selected'
          ? 'Ảnh đã được gắn; tải lại trang vẫn giữ ảnh.'
          : message,
    ),
    file &&
      h(
        Button,
        { disabled: disabled || lock.current, onClick: upload },
        uncertain ? 'Kiểm tra lại cùng upload' : 'Tải ' + label.toLowerCase(),
      ),
    file &&
      !uncertain &&
      state !== 'uploading' &&
      h(
        Button,
        {
          disabled,
          onClick: () => {
            onChange(url?.match(/\/([a-f0-9]{24})$/i)?.[1] || null);
            unresolved.current(false);
            setFile(null);
            setPreview(null);
            setState('ready');
            setMessage('Đã bỏ lựa chọn cục bộ; chưa xóa ảnh trên máy chủ.');
          },
        },
        'Bỏ lựa chọn ' + label.toLowerCase(),
      ),
    assetId &&
      !uncertain &&
      h(
        Button,
        {
          disabled: disabled || lock.current,
          onClick: () => {
            onChange(null);
            setFile(null);
            setPreview(null);
            setState('removed');
            setMessage('Đã chọn gỡ ảnh. Cần lưu biểu mẫu để xác nhận.');
          },
        },
        'Gỡ ' + label.toLowerCase(),
      ),
  );
}
