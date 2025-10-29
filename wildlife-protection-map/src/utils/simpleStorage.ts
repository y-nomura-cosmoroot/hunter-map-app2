import type { OverlayConfig } from '../types';
import { AppError, ErrorType } from './errorHandler';

// IndexedDB設定
const DB_NAME = 'WildlifeProtectionMapDB';
const DB_VERSION = 1;
const STORE_NAME = 'overlayConfigs';

// IndexedDBインスタンス
let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDBを初期化
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new AppError(
        'IndexedDB initialization failed',
        ErrorType.STORAGE,
        'データベースの初期化に失敗しました。ブラウザがIndexedDBをサポートしているか確認してください。',
        'INDEXEDDB_INIT_FAILED'
      ));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // オブジェクトストアを作成
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };
  });
}

/**
 * 設定を保存
 */
export async function saveConfigs(configs: OverlayConfig[]): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // 既存のデータをクリア
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // 新しいデータを保存
    for (const config of configs) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.add({
          ...config,
          pdfFile: {
            ...config.pdfFile,
            data: Array.from(new Uint8Array(config.pdfFile.data)), // ArrayBufferを配列に変換
          },
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString(),
        });
        
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

  } catch (error) {
    throw new AppError(
      'Failed to save to IndexedDB',
      ErrorType.STORAGE,
      '設定の保存に失敗しました。ブラウザの設定を確認してください。',
      'INDEXEDDB_SAVE_FAILED',
      { originalError: error }
    );
  }
}

/**
 * 設定を読み込み
 */
export async function loadConfigs(): Promise<OverlayConfig[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const results = request.result.map((item: any) => ({
          ...item,
          pdfFile: {
            ...item.pdfFile,
            data: new Uint8Array(item.pdfFile.data).buffer, // 配列をArrayBufferに変換
          },
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }));
        
        resolve(results);
      };
      
      request.onerror = () => {
        reject(new AppError(
          'Failed to load from IndexedDB',
          ErrorType.STORAGE,
          '設定の読み込みに失敗しました。',
          'INDEXEDDB_LOAD_FAILED'
        ));
      };
    });

  } catch (error) {
    throw new AppError(
      'Failed to load from IndexedDB',
      ErrorType.STORAGE,
      '設定の読み込みに失敗しました。ブラウザの設定を確認してください。',
      'INDEXEDDB_LOAD_FAILED',
      { originalError: error }
    );
  }
}

/**
 * 特定の設定を削除
 */
export async function deleteConfig(configId: string): Promise<void> {
  try {
    // 現在の設定を読み込み
    const configs = await loadConfigs();
    
    // 指定されたIDの設定を除外
    const updatedConfigs = configs.filter(config => config.id !== configId);
    
    // 更新された設定を保存
    await saveConfigs(updatedConfigs);
  } catch (error) {
    throw new AppError(
      'Failed to delete configuration',
      ErrorType.STORAGE,
      '設定の削除に失敗しました。',
      'DELETE_FAILED',
      { originalError: error }
    );
  }
}

/**
 * 全ての設定をクリア
 */
export async function clearAllConfigs(): Promise<void> {
  try {
    await saveConfigs([]);
  } catch (error) {
    throw new AppError(
      'Failed to clear configurations',
      ErrorType.STORAGE,
      '設定のクリアに失敗しました。',
      'CLEAR_FAILED',
      { originalError: error }
    );
  }
}

/**
 * ストレージ使用状況を取得
 */
export async function getStorageInfo(): Promise<{
  totalConfigs: number;
  estimatedSize: number;
}> {
  try {
    const configs = await loadConfigs();
    
    // サイズを推定
    let estimatedSize = 0;
    configs.forEach(config => {
      estimatedSize += config.pdfFile.data.byteLength;
      estimatedSize += JSON.stringify({
        ...config,
        pdfFile: { ...config.pdfFile, data: null }
      }).length;
    });

    return {
      totalConfigs: configs.length,
      estimatedSize,
    };
  } catch (error) {
    return {
      totalConfigs: 0,
      estimatedSize: 0,
    };
  }
}