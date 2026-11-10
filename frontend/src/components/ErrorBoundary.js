import { Component, createElement as h } from 'react';
export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return h(
      'section',
      { className: 'page-panel', role: 'alert' },
      h('h1', null, 'Góc bếp tạm thời gặp sự cố'),
      h('p', null, 'Bạn có thể tải lại trang để thử lại.'),
      h(
        'button',
        {
          type: 'button',
          className: 'button',
          onClick: () => window.location.reload(),
        },
        'Tải lại trang',
      ),
      h('a', { className: 'button button-secondary', href: '/' }, 'Trang chủ'),
    );
  }
}
