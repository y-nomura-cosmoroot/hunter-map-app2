import React, { useEffect, useState } from 'react';
import { AppError, ErrorType, getErrorSeverity } from '../utils/errorHandler';

interface ErrorNotificationProps {
  error: string | AppError | null;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setIsAnimating(true);

      // 自動非表示の設定
      if (autoHide && autoHideDelay > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
      setIsAnimating(false);
    }
  }, [error, autoHide, autoHideDelay]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 300); // アニメーション時間
  };

  if (!error || !isVisible) {
    return null;
  }

  // エラー情報を解析
  const errorInfo = getErrorInfo(error);

  return (
    <div className={`error-notification ${errorInfo.severity} ${isAnimating ? 'show' : 'hide'}`}>
      <div className="error-notification-content">
        <div className="error-icon">
          {getErrorIcon(errorInfo.type)}
        </div>
        
        <div className="error-message">
          <div className="error-title">
            {getErrorTitle(errorInfo.type)}
          </div>
          <div className="error-description">
            {errorInfo.message}
          </div>
        </div>

        <div className="error-actions">
          {errorInfo.type === ErrorType.GOOGLE_MAPS_API && (
            <button 
              onClick={() => window.location.reload()}
              className="action-button retry"
            >
              再読み込み
            </button>
          )}
          
          {errorInfo.type === ErrorType.STORAGE && (
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="action-button clear"
            >
              データをクリア
            </button>
          )}
          
          <button 
            onClick={handleDismiss}
            className="action-button dismiss"
            aria-label="エラーを閉じる"
          >
            ✕
          </button>
        </div>
      </div>

      {/* プログレスバー（自動非表示の場合） */}
      {autoHide && autoHideDelay > 0 && (
        <div 
          className="error-progress-bar"
          style={{ 
            animationDuration: `${autoHideDelay}ms`,
            animationPlayState: isAnimating ? 'running' : 'paused'
          }}
        />
      )}
    </div>
  );
};

// エラー情報を取得する関数
function getErrorInfo(error: string | AppError): {
  message: string;
  type: ErrorType;
  severity: string;
} {
  if (typeof error === 'string') {
    return {
      message: error,
      type: ErrorType.UNKNOWN,
      severity: 'medium',
    };
  }

  if (error instanceof AppError) {
    return {
      message: error.userMessage,
      type: error.type,
      severity: getErrorSeverity(error),
    };
  }

  return {
    message: 'Unknown error occurred',
    type: ErrorType.UNKNOWN,
    severity: 'medium',
  };
}

// エラータイプに応じたアイコンを取得
function getErrorIcon(type: ErrorType): string {
  switch (type) {
    case ErrorType.PDF_UPLOAD:
    case ErrorType.PDF_PROCESSING:
      return '📄';
    case ErrorType.GOOGLE_MAPS_API:
      return '🗺️';
    case ErrorType.COORDINATE_TRANSFORM:
      return '📍';
    case ErrorType.STORAGE:
      return '💾';
    case ErrorType.NETWORK:
      return '🌐';
    case ErrorType.VALIDATION:
      return '⚠️';
    default:
      return '❌';
  }
}

// エラータイプに応じたタイトルを取得
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.PDF_UPLOAD:
      return 'PDFアップロードエラー';
    case ErrorType.PDF_PROCESSING:
      return 'PDF処理エラー';
    case ErrorType.GOOGLE_MAPS_API:
      return 'Google Mapsエラー';
    case ErrorType.COORDINATE_TRANSFORM:
      return '座標変換エラー';
    case ErrorType.STORAGE:
      return 'データ保存エラー';
    case ErrorType.NETWORK:
      return 'ネットワークエラー';
    case ErrorType.VALIDATION:
      return '入力エラー';
    default:
      return 'エラーが発生しました';
  }
}

export default ErrorNotification;