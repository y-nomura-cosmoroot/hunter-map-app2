import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveConfigs, 
  loadConfigs, 
  deleteConfig, 
  clearAllConfigs,
  getStorageInfo
} from '../utils/simpleStorage';
import type { OverlayConfig } from '../types';

// モックデータ
const mockConfig: OverlayConfig = {
  id: 'test-config-1',
  name: 'Test Config',
  pdfFile: {
    name: 'test.pdf',
    data: new ArrayBuffer(1024), // 1KB
    type: 'application/pdf',
    size: 1024,
    lastModified: Date.now()
  },
  referencePoints: {
    pdf: [],
    map: []
  },
  bounds: {
    north: 35.7,
    south: 35.6,
    east: 139.8,
    west: 139.7
  },
  position: {
    bounds: null,
    center: { lat: 35.65, lng: 139.75 }
  },
  opacity: 0.7,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('SimpleStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveConfigs', () => {
    it('設定を保存できる', async () => {
      const configs = [mockConfig];
      
      await expect(saveConfigs(configs)).resolves.not.toThrow();
    });
  });

  describe('loadConfigs', () => {
    it('設定を読み込める', async () => {
      const configs = await loadConfigs();
      expect(Array.isArray(configs)).toBe(true);
    });
  });

  describe('getStorageInfo', () => {
    it('ストレージ使用状況を正しく取得する', async () => {
      const info = await getStorageInfo();
      
      expect(info).toHaveProperty('totalConfigs');
      expect(info).toHaveProperty('estimatedSize');
      expect(typeof info.totalConfigs).toBe('number');
      expect(typeof info.estimatedSize).toBe('number');
    });
  });

  describe('deleteConfig', () => {
    it('設定を削除できる', async () => {
      // 設定を保存
      await saveConfigs([mockConfig]);
      
      // 削除
      await deleteConfig(mockConfig.id);
      
      // 削除されているかチェック
      const configs = await loadConfigs();
      expect(configs.find(c => c.id === mockConfig.id)).toBeUndefined();
    });
  });

  describe('clearAllConfigs', () => {
    it('全ての設定をクリアできる', async () => {
      // 設定を保存
      await saveConfigs([mockConfig]);
      
      // クリア
      await clearAllConfigs();
      
      // クリアされているかチェック
      const configs = await loadConfigs();
      expect(configs).toHaveLength(0);
    });
  });
});