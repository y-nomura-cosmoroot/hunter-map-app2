import type { OverlayConfig } from '../types';
import { AppError, ErrorType } from './errorHandler';

// LocalStorage キー
const STORAGE_KEY = 'wildlife-protection-map-configs';
const STORAGE_VERSION_KEY = 'wildlife-protection-map-version';
const CURRENT_VERSION = '1.0.0';

// ストレージエラーの型定義（後方互換性のため残す）
export class StorageError extends AppError {
  public code: string;
  
  constructor(message: string, code: string) {
    super(message, ErrorType.STORAGE, undefined, code);
    this.name = 'StorageError';
    this.code = code;
  }
}

// ストレージ容量チェック
export function checkStorageCapacity(): { available: boolean; usage: number; limit: number } {
  try {
    // LocalStorageの使用量を計算
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }

    // 一般的なLocalStorageの制限は5MB
    const limit = 5 * 1024 * 1024; // 5MB in bytes
    const usage = totalSize;
    const available = usage < limit * 0.9; // 90%以下で利用可能とする

    return { available, usage, limit };
  } catch (error) {
    throw new AppError(
      'Storage capacity check failed',
      ErrorType.STORAGE,
      'ストレージ容量の確認に失敗しました。ブラウザの設定を確認してください。',
      'CAPACITY_CHECK_FAILED'
    );
  }
}

// ArrayBufferをBase64文字列に変換
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64文字列をArrayBufferに変換
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// OverlayConfigをシリアライズ可能な形式に変換
function serializeConfig(config: OverlayConfig): any {
  return {
    ...config,
    pdfFile: {
      ...config.pdfFile,
      data: arrayBufferToBase64(config.pdfFile.data),
    },
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

// シリアライズされたデータをOverlayConfigに変換
function deserializeConfig(serialized: any): OverlayConfig {
  return {
    ...serialized,
    pdfFile: {
      ...serialized.pdfFile,
      data: base64ToArrayBuffer(serialized.pdfFile.data),
    },
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}

// 設定を保存
export function saveConfigs(configs: OverlayConfig[]): void {
  try {
    // ストレージ容量をチェック
    const capacity = checkStorageCapacity();
    if (!capacity.available) {
      throw new AppError(
        'Storage capacity full',
        ErrorType.STORAGE,
        'ストレージ容量が不足しています。不要な設定を削除してください。',
        'STORAGE_FULL',
        { usage: capacity.usage, limit: capacity.limit }
      );
    }

    // バージョン情報を保存
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);

    // 設定をシリアライズして保存
    const serializedConfigs = configs.map(serializeConfig);
    const dataToSave = JSON.stringify(serializedConfigs);
    
    localStorage.setItem(STORAGE_KEY, dataToSave);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new AppError(
        'Storage quota exceeded',
        ErrorType.STORAGE,
        'ストレージ容量を超過しました。データを削除してください。',
        'QUOTA_EXCEEDED'
      );
    }
    
    throw new AppError(
      'Failed to save configuration',
      ErrorType.STORAGE,
      '設定の保存に失敗しました。ブラウザの設定を確認してください。',
      'SAVE_FAILED'
    );
  }
}

// 設定を読み込み
export function loadConfigs(): OverlayConfig[] {
  try {
    // LocalStorageが利用可能かチェック
    if (typeof Storage === 'undefined') {
      throw new AppError(
        'LocalStorage not supported',
        ErrorType.STORAGE,
        'ブラウザがLocalStorageをサポートしていません。',
        'STORAGE_NOT_SUPPORTED'
      );
    }

    // バージョンチェック
    const savedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (savedVersion && savedVersion !== CURRENT_VERSION) {
      console.warn(`Storage version mismatch: ${savedVersion} vs ${CURRENT_VERSION}`);
      // 必要に応じてマイグレーション処理を実装
    }

    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return [];
    }

    const parsedData = JSON.parse(savedData);
    if (!Array.isArray(parsedData)) {
      throw new AppError(
        'Invalid data format',
        ErrorType.STORAGE,
        '保存されたデータの形式が正しくありません。',
        'INVALID_DATA_FORMAT'
      );
    }

    // データをデシリアライズ
    return parsedData.map(deserializeConfig);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new AppError(
        'Data corrupted',
        ErrorType.STORAGE,
        '保存されたデータが破損しています。設定をリセットしてください。',
        'DATA_CORRUPTED'
      );
    }
    
    throw new AppError(
      'Failed to load configuration',
      ErrorType.STORAGE,
      '設定の読み込みに失敗しました。ブラウザの設定を確認してください。',
      'LOAD_FAILED'
    );
  }
}

// 特定の設定を削除
export function deleteConfig(configId: string): void {
  try {
    const configs = loadConfigs();
    const updatedConfigs = configs.filter(config => config.id !== configId);
    saveConfigs(updatedConfigs);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError(
      'Failed to delete configuration',
      ErrorType.STORAGE,
      '設定の削除に失敗しました。ブラウザの設定を確認してください。',
      'DELETE_FAILED'
    );
  }
}

// すべての設定をクリア
export function clearAllConfigs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_VERSION_KEY);
  } catch (error) {
    throw new AppError(
      'Failed to clear configuration',
      ErrorType.STORAGE,
      '設定のクリアに失敗しました。ブラウザの設定を確認してください。',
      'CLEAR_FAILED'
    );
  }
}

// ストレージの使用状況を取得
export function getStorageInfo(): {
  totalConfigs: number;
  storageUsage: number;
  storageLimit: number;
  usagePercentage: number;
} {
  try {
    const configs = loadConfigs();
    const capacity = checkStorageCapacity();
    
    return {
      totalConfigs: configs.length,
      storageUsage: capacity.usage,
      storageLimit: capacity.limit,
      usagePercentage: Math.round((capacity.usage / capacity.limit) * 100),
    };
  } catch (error) {
    return {
      totalConfigs: 0,
      storageUsage: 0,
      storageLimit: 5 * 1024 * 1024,
      usagePercentage: 0,
    };
  }
}