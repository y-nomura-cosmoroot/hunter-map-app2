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

describe('LocalStorage Utils', () => {
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

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true)
    })

    it('should return false when localStorage throws error', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage not available')
      })

      expect(isLocalStorageAvailable()).toBe(false)

      localStorage.setItem = originalSetItem
    })
  })

  describe('saveOverlayConfig', () => {
    it('should save configuration to localStorage', () => {
      const result = saveOverlayConfig(mockConfig)
      
      expect(result.success).toBe(true)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'wildlife-protection-configs',
        expect.any(String)
      )
    })

    it('should update existing configuration', () => {
      // 最初の保存
      saveOverlayConfig(mockConfig)
      
      // 同じIDで更新
      const updatedConfig = {
        ...mockConfig,
        name: 'Updated Configuration',
        opacity: 0.5,
        updatedAt: new Date('2024-01-02'),
      }
      
      const result = saveOverlayConfig(updatedConfig)
      expect(result.success).toBe(true)
      
      const configs = loadOverlayConfigs()
      expect(configs.length).toBe(1)
      expect(configs[0].name).toBe('Updated Configuration')
      expect(configs[0].opacity).toBe(0.5)
    })

    it('should handle multiple configurations', () => {
      const config1 = { ...mockConfig, id: 'config-1', name: 'Config 1' }
      const config2 = { ...mockConfig, id: 'config-2', name: 'Config 2' }
      
      saveOverlayConfig(config1)
      saveOverlayConfig(config2)
      
      const configs = loadOverlayConfigs()
      expect(configs.length).toBe(2)
      expect(configs.find(c => c.id === 'config-1')?.name).toBe('Config 1')
      expect(configs.find(c => c.id === 'config-2')?.name).toBe('Config 2')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      const result = saveOverlayConfig(mockConfig)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage quota exceeded')
    })

    it('should handle large configurations', () => {
      // 大きなArrayBufferを持つ設定
      const largeConfig = {
        ...mockConfig,
        pdfFile: {
          name: 'large.pdf',
          data: new ArrayBuffer(1024 * 1024), // 1MB
        },
      }

      const result = saveOverlayConfig(largeConfig)
      expect(result.success).toBe(true)
    })
  })

  describe('loadOverlayConfigs', () => {
    it('should return empty array when no configs exist', () => {
      const configs = loadOverlayConfigs()
      expect(configs).toEqual([])
    })

    it('should load saved configurations', () => {
      saveOverlayConfig(mockConfig)
      
      const configs = loadOverlayConfigs()
      expect(configs.length).toBe(1)
      expect(configs[0].id).toBe(mockConfig.id)
      expect(configs[0].name).toBe(mockConfig.name)
    })

    it('should handle corrupted data gracefully', () => {
      localStorage.setItem('wildlife-protection-configs', 'invalid json')
      
      const configs = loadOverlayConfigs()
      expect(configs).toEqual([])
    })

    it('should restore Date objects correctly', () => {
      saveOverlayConfig(mockConfig)
      
      const configs = loadOverlayConfigs()
      expect(configs[0].createdAt).toBeInstanceOf(Date)
      expect(configs[0].updatedAt).toBeInstanceOf(Date)
    })

    it('should restore ArrayBuffer correctly', () => {
      saveOverlayConfig(mockConfig)
      
      const configs = loadOverlayConfigs()
      expect(configs[0].pdfFile.data).toBeInstanceOf(ArrayBuffer)
      expect(configs[0].pdfFile.data.byteLength).toBe(8)
    })
  })

  describe('deleteOverlayConfig', () => {
    it('should delete specific configuration', () => {
      const config1 = { ...mockConfig, id: 'config-1', name: 'Config 1' }
      const config2 = { ...mockConfig, id: 'config-2', name: 'Config 2' }
      
      saveOverlayConfig(config1)
      saveOverlayConfig(config2)
      
      const result = deleteOverlayConfig('config-1')
      expect(result.success).toBe(true)
      
      const configs = loadOverlayConfigs()
      expect(configs.length).toBe(1)
      expect(configs[0].id).toBe('config-2')
    })

    it('should handle non-existent configuration', () => {
      const result = deleteOverlayConfig('non-existent')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle localStorage errors during deletion', () => {
      saveOverlayConfig(mockConfig)
      
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage error')
      })

      const result = deleteOverlayConfig(mockConfig.id)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage error')
    })
  })

  describe('clearAllConfigs', () => {
    it('should clear all configurations', () => {
      saveOverlayConfig(mockConfig)
      saveOverlayConfig({ ...mockConfig, id: 'config-2' })
      
      const result = clearAllConfigs()
      expect(result.success).toBe(true)
      
      const configs = loadOverlayConfigs()
      expect(configs.length).toBe(0)
    })

    it('should handle localStorage errors during clear', () => {
      localStorage.removeItem = vi.fn(() => {
        throw new Error('Storage error')
      })

      const result = clearAllConfigs()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage error')
    })
  })

  describe('Storage limits and performance', () => {
    it('should handle storage quota limits', () => {
      // 大量のデータを保存してクォータ制限をテスト
      const largeConfigs = Array.from({ length: 100 }, (_, i) => ({
        ...mockConfig,
        id: `config-${i}`,
        name: `Configuration ${i}`,
        pdfFile: {
          name: `test-${i}.pdf`,
          data: new ArrayBuffer(10000), // 10KB each
        },
      }))

      let successCount = 0
      largeConfigs.forEach(config => {
        const result = saveOverlayConfig(config)
        if (result.success) successCount++
      })

      // 少なくともいくつかは保存できるはず
      expect(successCount).toBeGreaterThan(0)
    })

    it('should perform efficiently with multiple configurations', () => {
      // 複数の設定を保存
      const configs = Array.from({ length: 10 }, (_, i) => ({
        ...mockConfig,
        id: `config-${i}`,
        name: `Configuration ${i}`,
      }))

      const startTime = performance.now()
      
      configs.forEach(config => saveOverlayConfig(config))
      const loadedConfigs = loadOverlayConfigs()
      
      const endTime = performance.now()
      const operationTime = endTime - startTime

      expect(loadedConfigs.length).toBe(10)
      expect(operationTime).toBeLessThan(1000) // 1秒以内
    })
  })
})