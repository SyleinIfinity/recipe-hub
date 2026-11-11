import { createElement as h } from 'react';
import { Link, navigate, safeReturnPath } from '../../app/router.js';
import { accountRoutes } from '../../app/registry.js';
import { requestApi } from '../../services/api.js';
import { Button } from '../../components/ui/primitives.js';
import { Field, useSubmission, confirmResponse } from './forms.js';
const configs = {
  login: {
    endpoint: '/auth/login',
    submit: 'Đăng nhập',
    fields: ['email', 'password'],
  },
  register: {
    endpoint: '/auth/register',
    submit: 'Tạo tài khoản',
    fields: ['displayName', 'email', 'password', 'confirmPassword'],
  },
  forgot: {
    endpoint: '/auth/forgot-password',
    submit: 'Yêu cầu đặt lại mật khẩu',
    fields: ['email'],
  },
  resend: {
    endpoint: '/auth/request-email-verification',
    submit: 'Yêu cầu xác minh email',
    fields: ['email'],
  },
  reset: {
    endpoint: '/auth/reset-password',
    submit: 'Đặt lại mật khẩu',
    fields: ['newPassword', 'confirmPassword'],
  },
  verify: {
    endpoint: '/auth/verify-email',
    submit: 'Xác nhận xác minh email',
    fields: [],
  },
};
const labels = {
  email: 'Email',
  displayName: 'Tên hiển thị',
  password: 'Mật khẩu',
  currentPassword: 'Mật khẩu hiện tại',
  newPassword: 'Mật khẩu mới',
  confirmPassword: 'Xác nhận mật khẩu',
};
export function AuthScreen({ kind, session, tokenLink, search, announce }) {
  const config = configs[kind],
    form = useSubmission();
  const tokenFlow = ['reset', 'verify'].includes(kind);
  const authHref = (path) =>
    new URLSearchParams(search).has('returnTo')
      ? path +
        '?' +
        new URLSearchParams({
          returnTo: safeReturnPath(
            new URLSearchParams(search).get('returnTo'),
            '/account',
          ),
        })
      : path;
  const destination = safeReturnPath(
    new URLSearchParams(search).get('returnTo'),
    '/account',
  );
  const readyToken = !tokenFlow || Boolean(tokenLink.token);
  const saved = form.status === 'saved';
  const success =
    kind === 'register'
      ? 'Đã tạo tài khoản. Bạn có thể đăng nhập; email chưa được tự xác minh.'
      : ['forgot', 'resend'].includes(kind)
        ? 'Nếu tài khoản đủ điều kiện, yêu cầu gửi liên kết đã được tiếp nhận. Chưa xác nhận email đã được nhận.'
        : kind === 'verify'
          ? 'Email đã được xác minh.'
          : 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.';
  return h(
    'section',
    { className: 'page-panel account-panel' },
    h('h1', null, accountRoutes.find((r) => r.id === kind).title),
    tokenFlow && !readyToken && !saved
      ? h(
          'div',
          { role: 'alert' },
          'Thiếu liên kết hợp lệ hoặc liên kết đã được xóa khỏi bộ nhớ. Hãy yêu cầu liên kết mới.',
        )
      : null,
    saved
      ? h('p', { role: 'status' }, success)
      : session.status === 'unknown'
        ? h('p', { role: 'status' }, 'Đang xác minh phiên…')
        : readyToken
          ? h(
              'form',
              {
                noValidate: true,
                'aria-label': accountRoutes.find((r) => r.id === kind).title,
                onSubmit: (event) =>
                  form.submit(event, kind, async (values, signal) => {
                    const body = { ...values };
                    delete body.confirmPassword;
                    if (body.email)
                      body.email = body.email.trim().toLowerCase();
                    if (body.displayName)
                      body.displayName = body.displayName.trim();
                    if (tokenFlow) body.token = tokenLink.token;
                    try {
                      const result = await requestApi(config.endpoint, {
                        method: 'POST',
                        body,
                        signal,
                      });
                      confirmResponse(
                        result,
                        kind === 'register'
                          ? 201
                          : ['forgot', 'resend'].includes(kind)
                            ? 202
                            : tokenFlow
                              ? 204
                              : 200,
                      );

                      if (['login', 'reset', 'verify'].includes(kind)) {
                        const next = await session.transition();
                        if (
                          kind === 'login' &&
                          next.status !== 'authenticated'
                        ) {
                          announce(
                            'Đăng nhập chưa được Backend xác nhận. Vui lòng kiểm tra lại phiên.',
                          );
                          throw Object.assign(new Error(), {
                            code: 'IDENTITY_UNCONFIRMED',
                          });
                        }
                        if (form.active.current && kind === 'login')
                          navigate(destination, { replace: true });
                        if (form.active.current && kind === 'reset') {
                          announce(
                            'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.',
                          );
                          navigate('/auth/login', { replace: true });
                        }
                      }
                      if (tokenFlow) tokenLink.clear();
                    } catch (error) {
                      if (
                        ['login', 'reset'].includes(kind) &&
                        error.mutationOutcomeUncertain
                      ) {
                        session.conceal();
                        await session.transition();
                      }
                      throw error;
                    }
                  }),
              },
              form.feedback,
              h(
                'fieldset',
                { disabled: form.status === 'pending' },
                h('legend', { className: 'sr-only' }, 'Thông tin tài khoản'),
                config.fields.map((name) =>
                  h(Field, {
                    key: name,
                    name,
                    label: labels[name],
                    required: true,
                    password: /password/i.test(name),
                    error: form.errors[name],
                    type: name === 'email' ? 'email' : undefined,
                    maxLength:
                      name === 'displayName'
                        ? 80
                        : name === 'email'
                          ? 254
                          : 128,
                    autoComplete:
                      name === 'email'
                        ? 'email'
                        : name === 'displayName'
                          ? 'nickname'
                          : kind === 'login'
                            ? 'current-password'
                            : 'new-password',
                    help:
                      /password/i.test(name) &&
                      kind !== 'login' &&
                      name !== 'confirmPassword'
                        ? 'Từ 12 đến 128 ký tự; giữ nguyên khoảng trắng trong mật khẩu.'
                        : undefined,
                  }),
                ),
                kind === 'verify' &&
                  h(
                    'p',
                    null,
                    'Xác nhận để sử dụng liên kết một lần. Hệ thống không tự gửi xác minh khi mở trang.',
                  ),
                h(
                  Button,
                  { type: 'submit', disabled: form.disabled },
                  config.submit,
                ),
              ),
            )
          : null,
    form.error?.mutationOutcomeUncertain &&
      h(
        'p',
        null,
        'Bạn có thể kiểm tra phiên hoặc thử đăng nhập; không gửi lại thao tác vừa rồi một cách tự động.',
      ),
    h(
      'nav',
      { className: 'account-links', 'aria-label': 'Tài khoản' },
      h(
        Link,
        { className: 'text-link', href: authHref('/auth/login') },
        'Đăng nhập',
      ),
      h(
        Link,
        { className: 'text-link', href: authHref('/auth/register') },
        'Đăng ký',
      ),
      h(
        Link,
        { className: 'text-link', href: authHref('/auth/forgot-password') },
        'Quên mật khẩu',
      ),
      h(
        Link,
        {
          className: 'text-link',
          href: authHref('/auth/request-email-verification'),
        },
        'Gửi lại xác minh email',
      ),
    ),
  );
}
export function AccountScreen({
  kind,
  session,
  logout,
  logoutPending,
  announce,
}) {
  const user = session.body.data,
    form = useSubmission();
  const overview = kind === 'account';
  return h(
    'section',
    { className: 'page-panel account-panel' },
    h('h1', null, accountRoutes.find((r) => r.id === kind).title),
    h(
      'nav',
      { className: 'account-links', 'aria-label': 'Quản lý tài khoản' },
      accountRoutes
        .filter((r) => r.access === 'authenticated')
        .map((r) =>
          h(
            Link,
            {
              key: r.id,
              href: r.pattern,
              className: 'text-link',
              'aria-current': kind === r.id ? 'page' : undefined,
            },
            r.title,
          ),
        ),
      h(
        Button,
        {
          className: 'button-secondary',
          disabled: logoutPending,
          onClick: logout,
        },
        'Đăng xuất',
      ),
    ),
    overview
      ? h(
          'div',
          { className: 'account-overview' },
          h('h2', null, user.displayName),
          h(
            'dl',
            null,
            h('dt', null, 'Email'),
            h('dd', null, user.email),
            h('dt', null, 'Xác minh email'),
            h(
              'dd',
              null,
              user.emailVerifiedAt ? 'Đã xác minh' : 'Chưa xác minh',
            ),
            h('dt', null, 'Trạng thái tài khoản'),
            h(
              'dd',
              null,
              user.status === 'active' ? 'Đang hoạt động' : 'Không khả dụng',
            ),
          ),
          user.bio && h('p', { className: 'account-bio' }, user.bio),
          !user.emailVerifiedAt &&
            h(
              Link,
              {
                href: '/auth/request-email-verification',
                className: 'text-link',
              },
              'Yêu cầu xác minh email',
            ),
        )
      : h(
          'form',
          {
            noValidate: true,
            onChange: () => {
              form.markDirty();
              announce('');
            },
            'aria-label': accountRoutes.find((r) => r.id === kind).title,
            onSubmit: (event) =>
              form.submit(event, kind, async (values, signal) => {
                let endpoint,
                  body,
                  method = 'PATCH';
                if (kind === 'editProfile') {
                  endpoint = '/me/profile';
                  body = {
                    displayName: values.displayName.trim(),
                    bio: values.bio,
                  };
                } else if (kind === 'password') {
                  endpoint = '/auth/change-password';
                  method = 'POST';
                  body = {
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                  };
                } else {
                  endpoint = '/me/preferences';
                  body = {
                    timezone: values.timezone,
                    maxPrepMinutes:
                      values.maxPrepMinutes === ''
                        ? null
                        : Number(values.maxPrepMinutes),
                    recommendationOptIn: values.recommendationOptIn === 'on',
                  };
                }
                try {
                  const result = await requestApi(endpoint, {
                    method,
                    body,
                    signal,
                  });
                  confirmResponse(result, kind === 'password' ? 204 : 200);
                  announce(
                    kind === 'password'
                      ? 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.'
                      : 'Đã lưu thay đổi tài khoản.',
                  );
                  await session.transition();
                  if (kind === 'password')
                    navigate('/auth/login', { replace: true });
                } catch (error) {
                  if (error.mutationOutcomeUncertain) {
                    announce(
                      'Chưa xác định được kết quả. Dữ liệu được tải lại để đối chiếu, không tự gửi lại.',
                    );
                    session.conceal();
                    await session.transition();
                  }
                  throw error;
                }
              }),
          },
          form.status === 'dirty' &&
            h('p', { role: 'status' }, 'Có thay đổi chưa lưu.'),
          form.feedback,
          h(
            'fieldset',
            { disabled: form.status === 'pending' },
            h('legend', { className: 'sr-only' }, 'Thông tin tài khoản'),
            kind === 'editProfile'
              ? [
                  h(Field, {
                    key: 'displayName',
                    name: 'displayName',
                    label: 'Tên hiển thị',
                    required: true,
                    maxLength: 80,
                    value: user.displayName,
                    error: form.errors.displayName,
                    autoComplete: 'nickname',
                  }),
                  h(Field, {
                    key: 'bio',
                    name: 'bio',
                    label: 'Giới thiệu',
                    multiline: true,
                    rows: 5,
                    maxLength: 500,
                    value: user.bio,
                    error: form.errors.bio,
                    help: 'Tối đa 500 ký tự. Nội dung được lưu nguyên văn, cho phép xuống dòng.',
                  }),
                ]
              : kind === 'password'
                ? ['currentPassword', 'newPassword', 'confirmPassword'].map(
                    (name) =>
                      h(Field, {
                        key: name,
                        name,
                        label: labels[name],
                        password: true,
                        required: true,
                        maxLength: 128,
                        error: form.errors[name],
                        autoComplete:
                          name === 'currentPassword'
                            ? 'current-password'
                            : 'new-password',
                      }),
                  )
                : [
                    h(Field, {
                      key: 'timezone',
                      name: 'timezone',
                      label: 'Múi giờ',
                      required: true,
                      value: user.preferences.timezone,
                      maxLength: 100,
                      error: form.errors.timezone,
                      help: 'Ví dụ Asia/Ho_Chi_Minh.',
                    }),
                    h(Field, {
                      key: 'minutes',
                      name: 'maxPrepMinutes',
                      label: 'Thời gian chuẩn bị tối đa (phút)',
                      type: 'number',
                      min: 0,
                      max: 1440,
                      value: user.preferences.maxPrepMinutes ?? '',
                      error: form.errors.maxPrepMinutes,
                    }),
                    h(
                      'label',
                      { key: 'opt', className: 'account-checkbox' },
                      h('input', {
                        type: 'checkbox',
                        name: 'recommendationOptIn',
                        defaultChecked: user.preferences.recommendationOptIn,
                      }),
                      'Cho phép sử dụng sở thích cho gợi ý khi tính năng khả dụng',
                    ),
                  ],
            h(
              Button,
              { type: 'submit', disabled: form.disabled },
              kind === 'password' ? 'Đổi mật khẩu' : 'Lưu thay đổi',
            ),
          ),
        ),
  );
}
