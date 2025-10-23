import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // エラーが発生したときに状態を更新
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラー情報を状態に保存
    this.setState({
      error,
      errorInfo,
    });

    // エラーログを出力
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // カスタムエラーハンドラーがあれば呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 本番環境では外部のエラー報告サービスに送信することも可能
    // 例: Sentry, LogRocket, Bugsnag など
  }

  handleRetry = () => {
    // エラー状態をリセット
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // ページをリロード
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIがあれば使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>申し訳ございません</h2>
            <p>アプリケーションでエラーが発生しました。</p>
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button primary"
              >
                再試行
              </button>
              <button 
                onClick={this.handleReload}
                className="reload-button secondary"
              >
                ページを再読み込み
              </button>
            </div>

            {/* 開発環境でのみエラー詳細を表示 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>エラー詳細（開発者向け）</summary>
                <div className="error-stack">
                  <h4>エラーメッセージ:</h4>
                  <pre>{this.state.error.message}</pre>
                  
                  <h4>スタックトレース:</h4>
                  <pre>{this.state.error.stack}</pre>
                  
                  {this.state.errorInfo && (
                    <>
                      <h4>コンポーネントスタック:</h4>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;