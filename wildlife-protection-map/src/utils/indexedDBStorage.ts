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
 * 設定をIndexedDBに保存
 */
export async function saveConfigsToIndexedDB(configs: OverlayConfig[]): Promise<void> {
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
      'IndexedDBへの保存に失敗しました。ブラウザの設定を確認してください。',
      'INDEXEDDB_SAVE_FAILED',
      { originalError: error }
    );
  }
}

/**
 * IndexedDBから設定を読み込み
 */
export async function loadConfigsFromIndexedDB(): Promise<OverlayConfig[]> {
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
          'IndexedDBからの読み込みに失敗しました。',
          'INDEXEDDB_LOAD_FAILED'
        ));
      };
    });

  } catch (error) {
    throw new AppError(
      'Failed to load from IndexedDB',
      ErrorType.STORAGE,
      'IndexedDBからの読み込みに失敗しました。ブラウザの設定を確認してください。',
      'INDEXEDDB_LOAD_FAILED',
      { originalError: error }
    );
  }
}

/**
 * 特定の設定をIndexedDBから削除
 */
export async function deleteConfigFromIndexedDB(configId: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(configId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

  } catch (error) {
    throw new AppError(
      'Failed to delete from IndexedDB',
      ErrorType.STORAGE,
      'IndexedDBからの削除に失敗しました。',
      'INDEXEDDB_DELETE_FAILED',
      { originalError: error }
    );
  }
}

/**
 * IndexedDBの使用量を取得
 */
export async function getIndexedDBUsage(): Promise<{
  totalConfigs: number;
  estimatedSize: number;
}> {
  try {
    const configs = await loadConfigsFromIndexedDB();
    
    // サイズを推定（正確な値ではないが目安として）
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

/**
 * IndexedDBをクリア
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

  } catch (error) {
    throw new AppError(
      'Failed to clear IndexedDB',
      ErrorType.STORAGE,
      'IndexedDBのクリアに失敗しました。',
      'INDEXEDDB_CLEAR_FAILED'
    );
  }
}