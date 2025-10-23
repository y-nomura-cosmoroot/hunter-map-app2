import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  saveConfigs, 
  loadConfigs, 
  deleteConfig, 
  clearAllConfigs,
  checkStorageCapacity,
  getStorageInfo
} from '../utils/localStorage'
import type { OverlayConfig } from '../types'

describe('LocalStorage Utils - Simple Tests', () => {
  const mockConfig: OverlayConfig = {
    id: 'test-config-1',
    name: 'Test Configuration',
    pdfFile: {
      name: 'test.pdf',
      data: new ArrayBuffer(8),
    },
    referencePoints: {
      pdf: [
        { x: 100, y: 100, pageNumber: 1 },
        { x: 500, y: 100, pageNumber: 1 },
        { x: 100, y: 400, pageNumber: 1 },
      ],
      map: [
        { lat: 34.7304, lng: 136.5085 },
        { lat: 34.7304, lng: 136.6085 },
        { lat: 34.6304, lng: 136.5085 },
      ],
    },
    position: {
      bounds: null,
      center: { lat: 34.7304, lng: 136.5085 },
    },
    opacity: 0.7,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('checkStorageCapacity', () => {
    it('should return storage capacity information', () => {
      const capacity = checkStorageCapacity()
      
      expect(capacity).toBeDefined()
      expect(typeof capacity.available).toBe('boolean')
      expect(typeof capacity.usage).toBe('number')
      expect(typeof capacity.limit).toBe('number')
      expect(capacity.usage).toBeGreaterThanOrEqual(0)
      expect(capacity.limit).toBeGreaterThan(0)
    })
  })

  describe('saveConfigs and loadConfigs', () => {
    it('should save and load configurations', () => {
      const configs = [mockConfig]
      
      // 設定を保存
      expect(() => saveConfigs(configs)).not.toThrow()
      
      // 設定を読み込み
      const loadedConfigs = loadConfigs()
      expect(loadedConfigs).toHaveLength(1)
      expect(loadedConfigs[0].id).toBe(mockConfig.id)
      expect(loadedConfigs[0].name).toBe(mockConfig.name)
    })

    it('should return empty array when no configs exist', () => {
      const configs = loadConfigs()
      expect(configs).toEqual([])
    })

    it('should handle multiple configurations', () => {
      const config1 = { ...mockConfig, id: 'config-1', name: 'Config 1' }
      const config2 = { ...mockConfig, id: 'config-2', name: 'Config 2' }
      const configs = [config1, config2]
      
      saveConfigs(configs)
      
      const loadedConfigs = loadConfigs()
      expect(loadedConfigs).toHaveLength(2)
      expect(loadedConfigs.find(c => c.id === 'config-1')?.name).toBe('Config 1')
      expect(loadedConfigs.find(c => c.id === 'config-2')?.name).toBe('Config 2')
    })

    it('should restore Date objects correctly', () => {
      saveConfigs([mockConfig])
      
      const configs = loadConfigs()
      expect(configs[0].createdAt).toBeInstanceOf(Date)
      expect(configs[0].updatedAt).toBeInstanceOf(Date)
    })

    it('should restore ArrayBuffer correctly', () => {
      saveConfigs([mockConfig])
      
      const configs = loadConfigs()
      expect(configs[0].pdfFile.data).toBeInstanceOf(ArrayBuffer)
      expect(configs[0].pdfFile.data.byteLength).toBe(8)
    })
  })

  describe('deleteConfig', () => {
    it('should delete specific configuration', () => {
      const config1 = { ...mockConfig, id: 'config-1', name: 'Config 1' }
      const config2 = { ...mockConfig, id: 'config-2', name: 'Config 2' }
      
      saveConfigs([config1, config2])
      
      expect(() => deleteConfig('config-1')).not.toThrow()
      
      const configs = loadConfigs()
      expect(configs).toHaveLength(1)
      expect(configs[0].id).toBe('config-2')
    })

    it('should handle non-existent configuration gracefully', () => {
      expect(() => deleteConfig('non-existent')).not.toThrow()
    })
  })

  describe('clearAllConfigs', () => {
    it('should clear all configurations', () => {
      saveConfigs([mockConfig])
      
      expect(() => clearAllConfigs()).not.toThrow()
      
      const configs = loadConfigs()
      expect(configs).toHaveLength(0)
    })
  })

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      const info = getStorageInfo()
      
      expect(info).toBeDefined()
      expect(typeof info.totalConfigs).toBe('number')
      expect(typeof info.storageUsage).toBe('number')
      expect(typeof info.storageLimit).toBe('number')
      expect(typeof info.usagePercentage).toBe('number')
      expect(info.totalConfigs).toBeGreaterThanOrEqual(0)
      expect(info.usagePercentage).toBeGreaterThanOrEqual(0)
      expect(info.usagePercentage).toBeLessThanOrEqual(100)
    })

    it('should reflect saved configurations', () => {
      const initialInfo = getStorageInfo()
      expect(initialInfo.totalConfigs).toBe(0)

      saveConfigs([mockConfig])
      
      const updatedInfo = getStorageInfo()
      expect(updatedInfo.totalConfigs).toBe(1)
    })
  })

  describe('Error handling', () => {
    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('wildlife-protection-map-configs', 'invalid json')
      
      expect(() => loadConfigs()).toThrow()
    })

    it('should handle localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      })

      expect(() => saveConfigs([mockConfig])).toThrow()

      localStorage.setItem = originalSetItem
    })
  })
})