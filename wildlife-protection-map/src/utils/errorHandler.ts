// エラータイプの定義
export const ErrorType = {
  PDF_UPLOAD: 'PDF_UPLOAD',
  PDF_PROCESSING: 'PDF_PROCESSING',
  GOOGLE_MAPS_API: 'GOOGLE_MAPS_API',
  COORDINATE_TRANSFORM: 'COORDINATE_TRANSFORM',
  STORAGE: 'STORAGE',
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  FILE_SIZE: 'FILE_SIZE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

// カスタムエラークラス
export class AppError extends Error {
  public type: ErrorType;
  public code?: string;
  public details?: any;
  public userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    userMessage?: string,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.PDF_UPLOAD:
        return 'PDFファイルのアップロードに失敗しました。ファイル形式とサイズを確認してください。';
      case ErrorType.PDF_PROCESSING:
        return 'PDFファイルの処理中にエラーが発生しました。ファイルが破損していないか確認してください。';
      case ErrorType.GOOGLE_MAPS_API:
        return 'Google Mapsの読み込みに失敗しました。インターネット接続を確認してください。';
      case ErrorType.COORDINATE_TRANSFORM:
        return '座標変換処理でエラーが発生しました。基準点の設定を確認してください。';
      case ErrorType.STORAGE:
        return 'データの保存または読み込みに失敗しました。ブラウザの設定を確認してください。';
      case ErrorType.NETWORK:
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      case ErrorType.VALIDATION:
        return '入力データに問題があります。入力内容を確認してください。';
      default:
        return '予期しないエラーが発生しました。ページを再読み込みしてください。';
    }
  }
}

// エラーハンドリング関数
export function handleError(error: unknown, context?: string): AppError {
  console.error(`Error in ${context || 'unknown context'}:`, error);

  // 既にAppErrorの場合はそのまま返す
  if (error instanceof AppError) {
    return error;
  }

  // 標準Errorの場合
  if (error instanceof Error) {
    // 特定のエラーパターンを検出してタイプを決定
    const errorType = detectErrorType(error);
    return new AppError(error.message, errorType, undefined, undefined, error);
  }

  // その他の場合
  const message = typeof error === 'string' ? error : 'Unknown error occurred';
  return new AppError(message, ErrorType.UNKNOWN);
}

// エラータイプを検出する関数
function detectErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  // PDF関連エラー
  if (message.includes('pdf') || message.includes('file')) {
    if (message.includes('upload') || message.includes('select')) {
      return ErrorType.PDF_UPLOAD;
    }
    return ErrorType.PDF_PROCESSING;
  }

  // Google Maps関連エラー
  if (message.includes('google') || message.includes('maps') || message.includes('api')) {
    return ErrorType.GOOGLE_MAPS_API;
  }

  // ストレージ関連エラー
  if (message.includes('storage') || message.includes('localstorage') || 
      message.includes('quota') || message.includes('save') || message.includes('load')) {
    return ErrorType.STORAGE;
  }

  // ネットワーク関連エラー
  if (message.includes('network') || message.includes('fetch') || 
      message.includes('connection') || error.name === 'NetworkError') {
    return ErrorType.NETWORK;
  }

  // 座標変換関連エラー
  if (message.includes('coordinate') || message.includes('transform') || 
      message.includes('reference') || message.includes('overlay')) {
    return ErrorType.COORDINATE_TRANSFORM;
  }

  // バリデーション関連エラー
  if (message.includes('validation') || message.includes('invalid') || 
      message.includes('format') || message.includes('required')) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
}

// 非同期関数のエラーハンドリング用ラッパー
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error, context);
    }
  };
}

// 同期関数のエラーハンドリング用ラッパー
export function withSyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  context?: string
) {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      throw handleError(error, context);
    }
  };
}

// エラー報告用の関数（将来的に外部サービスと連携可能）
export function reportError(error: AppError, additionalInfo?: any): void {
  // 開発環境では詳細ログを出力
  if (import.meta.env.DEV) {
    console.group('🚨 Error Report');
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    console.error('Code:', error.code);
    console.error('Details:', error.details);
    console.error('Additional Info:', additionalInfo);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  // 本番環境では外部エラー報告サービスに送信
  // 例: Sentry, LogRocket, Bugsnag など
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, {
  //     tags: { type: error.type },
  //     extra: { additionalInfo, userMessage: error.userMessage }
  //   });
  // }
}

// ユーザーフレンドリーなエラーメッセージを取得
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    const appError = handleError(error);
    return appError.userMessage;
  }
  
  return '予期しないエラーが発生しました。ページを再読み込みしてください。';
}

// エラーの重要度を判定
export function getErrorSeverity(error: AppError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.type) {
    case ErrorType.VALIDATION:
      return 'low';
    case ErrorType.PDF_UPLOAD:
    case ErrorType.STORAGE:
      return 'medium';
    case ErrorType.GOOGLE_MAPS_API:
    case ErrorType.COORDINATE_TRANSFORM:
    case ErrorType.NETWORK:
      return 'high';
    case ErrorType.PDF_PROCESSING:
    case ErrorType.UNKNOWN:
      return 'critical';
    default:
      return 'medium';
  }
}