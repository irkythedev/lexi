// ErrorBoundary — 捕获渲染错误，显示错误信息而非白屏。
// 帮助用户和开发者定位崩溃原因。
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-trap-soft)]">
            <span className="text-[calc(24px*var(--type-scale))] font-bold text-[var(--color-trap)]">!</span>
          </div>
          <h2 className="text-[calc(20px*var(--type-scale))] font-bold text-[var(--color-text)]">页面出错了</h2>
          <p className="mt-2 text-[calc(14px*var(--type-scale))] text-[var(--color-text-2)]">
            {this.state.error.message}
          </p>
          <button onClick={() => this.setState({ error: null })} className="press mt-6 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">
            重试
          </button>
          <button onClick={() => window.location.href = '/'} className="press mt-3 ml-3 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-medium">
            回到首页
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}