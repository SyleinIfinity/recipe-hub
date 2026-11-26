import { ApiError } from '../../services/api.js';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { Button, Icon } from '../../components/ui/primitives.js';
export function Field({
  name,
  label,
  password = false,
  labelEnd,
  error,
  help,
  value,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const id = 'account-' + name;
  return h(
    'div',
    { className: labelEnd ? 'account-field with-support' : 'account-field' },
    h(
      'div',
      { className: 'field-label' },
      h(
        'label',
        { htmlFor: id },
        label,
        props.required && h('span', { className: 'field-required' }, ' *'),
      ),
    ),
    h(
      'div',
      { className: password ? 'password-field' : undefined },
      h(props.multiline ? 'textarea' : 'input', {
        ...props,
        multiline: undefined,
        id,
        name,
        'data-password': password || undefined,
        type: props.multiline
          ? undefined
          : password
            ? visible
              ? 'text'
              : 'password'
            : props.type || 'text',
        defaultValue: value ?? '',
        'aria-invalid': Boolean(error),
        'aria-describedby': error
          ? id + '-error'
          : help
            ? id + '-help'
            : undefined,
      }),
      password &&
        h(
          Button,
          {
            className: 'password-toggle',
            'aria-label': `${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`,
            'aria-pressed': visible,
            onClick: () => setVisible((v) => !v),
          },
          h(Icon, { name: visible ? 'eyeOff' : 'eye', size: 20 }),
        ),
    ),
    labelEnd && h('span', { className: 'field-support' }, labelEnd),
    help && h('small', { id: id + '-help' }, help),
    error && h('p', { className: 'form-error', id: id + '-error' }, error),
  );
}
export function authError(error) {
  if (error.code === 'EMAIL_UNAVAILABLE')
    return 'Dịch vụ email hiện chưa sẵn sàng. Chưa xác nhận gửi email; hãy thử lại khi dịch vụ hoạt động.';
  if (error.mutationOutcomeUncertain)
    return 'Chưa xác định được kết quả. Kiểm tra lại tài khoản trước khi gửi tiếp; hệ thống không tự gửi lại.';
  return (
    {
      INVALID_CREDENTIALS:
        'Thông tin xác thực chưa đúng. Vui lòng kiểm tra lại.',
      EMAIL_EXISTS:
        'Email này đã được đăng ký. Bạn có thể đăng nhập hoặc khôi phục mật khẩu.',
      INVALID_TOKEN:
        'Liên kết không hợp lệ, hết hạn hoặc đã được sử dụng. Hãy yêu cầu liên kết mới.',
      CSRF_INVALID:
        'Phiên bảo vệ đã thay đổi. Hãy tải lại trang trước khi gửi lại.',
      EMAIL_UNAVAILABLE:
        'Dịch vụ email hiện chưa sẵn sàng. Chưa xác nhận gửi email.',
      AUTH_STATE_CHANGED:
        'Trạng thái tài khoản đã thay đổi. Vui lòng đăng nhập lại.',
    }[error.code] ||
    {
      401: 'Phiên đăng nhập đã hết hạn.',
      403: 'Bạn không có quyền thực hiện thao tác này.',
      409: 'Dữ liệu đã thay đổi. Hãy tải lại để kiểm tra.',
      422: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường.',
      429: 'Bạn thao tác quá nhanh. Vui lòng chờ trước khi gửi tiếp.',
    }[error.status] ||
    'Dịch vụ tạm thời không khả dụng. Chưa xác nhận thao tác hoàn tất.'
  );
}
export function validate(values, kind) {
  const errors = {};
  if (
    'email' in values &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ||
      values.email.trim().length > 254)
  )
    errors.email = 'Nhập địa chỉ email hợp lệ (tối đa 254 ký tự).';
  if (
    'displayName' in values &&
    (values.displayName.trim().length < 2 ||
      values.displayName.trim().length > 80)
  )
    errors.displayName = 'Tên hiển thị cần từ 2 đến 80 ký tự.';
  for (const key of ['password', 'currentPassword', 'newPassword'])
    if (key in values) {
      const min = key === 'currentPassword' || kind === 'login' ? 1 : 12;
      if (
        values[key].length < min ||
        values[key].length > 128 ||
        (min === 12 && !values[key].trim())
      )
        errors[key] = `Mật khẩu cần từ ${min} đến 128 ký tự.`;
    }
  if (
    'confirmPassword' in values &&
    values.confirmPassword !== (values.newPassword ?? values.password)
  )
    errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.';
  if ('bio' in values && values.bio.length > 500)
    errors.bio = 'Giới thiệu tối đa 500 ký tự.';
  if ('timezone' in values) {
    try {
      if (!values.timezone || values.timezone.length > 100) throw new Error();
      new Intl.DateTimeFormat('vi', { timeZone: values.timezone });
    } catch {
      errors.timezone = 'Nhập múi giờ hợp lệ, ví dụ Asia/Ho_Chi_Minh.';
    }
  }
  if (
    'maxPrepMinutes' in values &&
    values.maxPrepMinutes !== '' &&
    (!/^(0|[1-9][0-9]*)$/.test(values.maxPrepMinutes) ||
      Number(values.maxPrepMinutes) > 1440)
  )
    errors.maxPrepMinutes = 'Nhập số phút từ 0 đến 1440 hoặc để trống.';
  return errors;
}
export function useSubmission() {
  const lock = useRef(false),
    active = useRef(true),
    controller = useRef(null);
  const [state, setState] = useState({ status: 'initial', errors: {} });
  const [wait, setWait] = useState(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    const seconds = state.error?.retryAfterSeconds || 0;
    setWait(seconds);
    if (!seconds) return;
    const until = Date.now() + seconds * 1000;
    const timer = setInterval(
      () => setWait(Math.max(0, Math.ceil((until - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [state.error]);
  async function submit(event, kind, action) {
    event.preventDefault();
    if (
      lock.current ||
      wait ||
      state.error?.mutationOutcomeUncertain ||
      state.error?.code === 'CSRF_INVALID'
    )
      return;
    const form = event.currentTarget,
      values = Object.fromEntries(new FormData(form));
    const errors = validate(values, kind);
    if (Object.keys(errors).length) {
      setState({ status: 'error', errors });
      document.getElementById('account-' + Object.keys(errors)[0])?.focus();
      return;
    }
    lock.current = true;
    controller.current = new AbortController();
    setState({ status: 'pending', errors: {} });
    try {
      await action(values, controller.current.signal);
      if (active.current) {
        form.reset();
        setState({ status: 'saved', errors: {} });
      }
    } catch (error) {
      if (active.current) {
        const fields = Object.fromEntries(
          (error.details || []).map((d) => [d.field, 'Giá trị chưa hợp lệ.']),
        );
        setState({ status: 'error', errors: fields, error });
        if (Object.keys(fields).length)
          document.getElementById('account-' + Object.keys(fields)[0])?.focus();
        if (error.mutationOutcomeUncertain)
          form
            .querySelectorAll('input[data-password]')
            .forEach((input) => (input.value = ''));
      }
    } finally {
      lock.current = false;
    }
  }
  const feedback =
    state.status === 'pending'
      ? h('p', { role: 'status' }, 'Đang xử lý…')
      : state.status === 'error'
        ? h(
            'div',
            { role: 'alert', className: 'form-error' },
            state.error
              ? authError(state.error)
              : 'Vui lòng kiểm tra các trường được đánh dấu.',
            wait > 0 &&
              h('p', { role: 'status' }, `Có thể gửi lại sau ${wait} giây.`),
          )
        : null;
  function markDirty() {
    setState((previous) =>
      previous.status === 'pending' ||
      previous.error?.mutationOutcomeUncertain ||
      previous.error?.code === 'CSRF_INVALID'
        ? previous
        : { ...previous, status: 'dirty' },
    );
  }
  return {
    ...state,
    markDirty,
    submit,
    feedback,
    active,
    disabled:
      state.status === 'pending' ||
      wait > 0 ||
      Boolean(
        state.error?.mutationOutcomeUncertain ||
        state.error?.code === 'CSRF_INVALID',
      ),
  };
}

export function confirmResponse(result, expectedStatus) {
  if (
    expectedStatus === 204
      ? result !== null
      : result?.http?.status !== expectedStatus
  )
    throw new ApiError(result?.http?.status || 0, 'UNEXPECTED_RESPONSE', {
      mutationOutcomeUncertain: true,
    });
}
