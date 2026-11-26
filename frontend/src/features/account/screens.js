import { useState } from 'react';
import { MediaPicker } from '../media/MediaPicker.js';
import { RecipeImage } from '../../components/ui/primitives.js';
import { createElement as h } from 'react';
import { Link, navigate, safeReturnPath } from '../../app/router.js';
import { accountRoutes } from '../../app/registry.js';
import { requestApi } from '../../services/api.js';
import { Button, Icon } from '../../components/ui/primitives.js';
import { Field, useSubmission, confirmResponse } from './forms.js';
const authIntros = {
  login: 'Đăng nhập để viết và chỉnh sửa công thức của bạn.',
  register: 'Tạo tài khoản để bắt đầu viết công thức của riêng bạn.',
  forgot: 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.',
  resend: 'Nhập email của tài khoản cần xác minh.',
  reset: 'Chọn mật khẩu mới cho tài khoản của bạn.',
  verify: 'Xác nhận địa chỉ email liên kết với tài khoản của bạn.',
};
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
      ? 'Đã tạo tài khoản. Bạn có thể đăng nhập hoặc yêu cầu email xác minh.'
      : ['forgot', 'resend'].includes(kind)
        ? 'Nếu tài khoản đủ điều kiện, yêu cầu gửi liên kết đã được tiếp nhận. Hãy kiểm tra hộp thư và thư rác.'
        : kind === 'verify'
          ? 'Email đã được xác minh.'
          : 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.';
  return h(
    'section',
    { className: 'auth-panel' },
    h('h1', null, accountRoutes.find((r) => r.id === kind).title),
    !saved &&
      readyToken &&
      h('p', { className: 'form-intro' }, authIntros[kind]),
    tokenFlow && !readyToken && !saved
      ? h(
          'div',
          { role: 'alert', className: 'notice-error' },
          'Thiếu liên kết hợp lệ. Hãy yêu cầu liên kết mới để tiếp tục.',
        )
      : null,
    saved
      ? h('p', { role: 'status', className: 'notice-success' }, success)
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
                            'Chưa xác nhận được phiên đăng nhập. Hãy thử đăng nhập lại.',
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
                    labelEnd:
                      kind === 'login' && name === 'password'
                        ? h(
                            Link,
                            {
                              href: authHref('/auth/forgot-password'),
                              className: 'text-link',
                            },
                            'Quên mật khẩu?',
                          )
                        : undefined,
                    placeholder:
                      name === 'email' ? 'ban@example.com' : undefined,
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
                        ? 'Dùng từ 12 đến 128 ký tự.'
                        : undefined,
                  }),
                ),
                kind === 'verify' &&
                  h('p', null, 'Liên kết xác minh này chỉ dùng được một lần.'),
                h(
                  Button,
                  {
                    type: 'submit',
                    disabled: form.disabled,
                  },
                  form.status === 'pending' ? 'Đang gửi…' : config.submit,
                  h(Icon, { name: 'forward', size: 18 }),
                ),
              ),
            )
          : null,
    ((kind === 'register' && saved) ||
      (kind === 'verify' &&
        (!readyToken || form.error?.code === 'INVALID_TOKEN'))) &&
      h(
        Link,
        {
          className: 'text-link auth-support',
          href: authHref('/auth/request-email-verification'),
        },
        'Gửi lại xác minh email',
      ),
    kind === 'reset' &&
      (!readyToken || form.error?.code === 'INVALID_TOKEN') &&
      h(
        Link,
        { className: 'button', href: authHref('/auth/forgot-password') },
        'Yêu cầu liên kết đặt lại mật khẩu',
      ),
    h(
      'p',
      { className: 'auth-switch' },
      kind === 'login'
        ? 'Chưa có tài khoản? '
        : kind === 'register' && !saved
          ? 'Đã có tài khoản? '
          : '',
      h(
        Link,
        {
          className: 'text-link',
          href:
            kind === 'login'
              ? authHref('/auth/register')
              : session.status === 'authenticated'
                ? '/account'
                : authHref('/auth/login'),
        },
        kind === 'login'
          ? 'Đăng ký'
          : kind === 'register'
            ? 'Đăng nhập'
            : session.status === 'authenticated'
              ? 'Về tài khoản'
              : 'Về đăng nhập',
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
  const [avatarUnresolved, setAvatarUnresolved] = useState(false);
  const [avatar, setAvatar] = useState(undefined);
  const [mediaPending, setMediaPending] = useState(0);
  const overview = kind === 'account';
  const title = accountRoutes.find((r) => r.id === kind).title;
  const icons = {
    account: 'user',
    editProfile: 'edit',
    settings: 'settings',
    password: 'lock',
  };
  const row = (label, value) =>
    h('div', { key: label }, h('dt', null, label), h('dd', null, value));
  return h(
    'section',
    { className: 'account-workspace' },
    h(
      'aside',
      { className: 'account-sidebar' },
      h(
        'nav',
        { 'aria-label': 'Quản lý tài khoản' },
        accountRoutes
          .filter((r) => r.access === 'authenticated')
          .map((r) =>
            h(
              Link,
              {
                key: r.id,
                href: r.pattern,
                'aria-current': kind === r.id ? 'page' : undefined,
              },
              h(Icon, { name: icons[r.id], size: 18 }),
              r.title,
            ),
          ),
      ),
      h(
        Button,
        {
          className: 'logout-button',
          disabled: logoutPending,
          onClick: logout,
        },
        h(Icon, { name: 'logout', size: 17 }),
        'Đăng xuất',
      ),
    ),
    h(
      'div',
      { className: 'account-content' },
      h('h1', null, title),
      overview
        ? h(
            'div',
            { className: 'account-overview' },
            h(
              'div',
              { className: 'identity' },
              h(
                'div',
                { className: 'identity-avatar' },
                user.avatarUrl
                  ? h(RecipeImage, { url: user.avatarUrl })
                  : user.displayName.trim().charAt(0),
              ),
              h(
                'div',
                null,
                h('h2', null, user.displayName),
                h('p', null, user.email),
              ),
            ),
            h(
              'dl',
              { className: 'data-rows' },
              row(
                'Xác minh email',
                h(
                  'div',
                  null,
                  h(
                    'span',
                    null,
                    user.emailVerifiedAt ? 'Đã xác minh' : 'Chưa xác minh',
                  ),
                  !user.emailVerifiedAt &&
                    h(
                      Link,
                      {
                        href: '/auth/request-email-verification',
                        className: 'text-link inline-action',
                      },
                      'Yêu cầu xác minh email',
                    ),
                ),
              ),
              row(
                'Trạng thái tài khoản',
                user.status === 'active' ? 'Đang hoạt động' : 'Không khả dụng',
              ),
              user.bio && row('Giới thiệu', user.bio),
            ),
            h(
              Link,
              { href: '/my/recipes', className: 'account-drafts' },
              h(Icon, { name: 'book', size: 22 }),
              'Bản nháp của tôi',
              h(Icon, { name: 'forward', size: 18 }),
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
                      ...(avatar !== undefined
                        ? {
                            avatarAssetId: avatar,
                            mediaVersion: user.mediaVersion,
                          }
                        : {}),
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

            h(
              'fieldset',
              { disabled: form.status === 'pending' || mediaPending > 0 },
              h('legend', { className: 'sr-only' }, 'Thông tin tài khoản'),
              kind === 'editProfile'
                ? [
                    h(MediaPicker, {
                      key: 'avatar',
                      label: 'Ảnh đại diện',
                      purpose: 'avatar',
                      assetId:
                        avatar === undefined ? user.avatarAssetId : avatar,
                      url: user.avatarUrl,
                      onChange: (id) => {
                        setAvatar(id);
                        form.markDirty();
                        announce('');
                      },
                      onUnresolved: (value) => {
                        setAvatarUnresolved(value);
                        if (value) form.markDirty();
                      },
                      onBusy: (delta) =>
                        setMediaPending((n) => Math.max(0, n + delta)),
                      disabled: form.disabled,
                    }),
                    h(
                      'h2',
                      { key: 'personal', className: 'form-section-heading' },
                      'Thông tin cá nhân',
                    ),
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
                      help: 'Tối đa 500 ký tự.',
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
                      h(
                        'h2',
                        { key: 'region', className: 'form-section-heading' },
                        'Khu vực',
                      ),
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
                      h(
                        'h2',
                        { key: 'cooking', className: 'form-section-heading' },
                        'Sở thích nấu ăn',
                      ),
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
                'div',
                { className: 'form-save' },
                form.feedback,
                h(
                  Button,
                  {
                    type: 'submit',
                    disabled: form.disabled || avatarUnresolved,
                  },
                  form.status === 'pending'
                    ? 'Đang lưu…'
                    : kind === 'password'
                      ? 'Đổi mật khẩu'
                      : 'Lưu thay đổi',
                ),
                form.status === 'dirty' &&
                  h('span', { role: 'status' }, 'Có thay đổi chưa lưu.'),
              ),
            ),
          ),
    ),
  );
}
