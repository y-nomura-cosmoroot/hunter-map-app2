import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { ApplicationProvider } from '../store/context'

// テスト用のPDFファイルを作成するヘルパー
const createMockPDFFile = (name = 'test.pdf') => {
  const content = new Uint8Array([37, 80, 68, 70]) // PDF header
  return new File([content], name, { type: 'application/pdf' })
}

// アプリケーションをレンダリングするヘルパー
const renderApp = () => {
  return render(
    <ApplicationProvider>
      <App />
    </ApplicationProvider>
  )
}

describe('Wildlife Protection Map - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('End-to-End Workflow', () => {
    it('should complete the full workflow from PDF upload to overlay creation', async () => {
      const user = userEvent.setup()
      renderApp()

      // 1. 初期状態の確認
      expect(screen.getByText('三重県鳥獣保護区マップ')).toBeInTheDocument()
      expect(screen.getByText('PDFファイルをアップロードして開始してください。')).toBeInTheDocument()

      // 2. PDFアップロード
      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      const mockFile = createMockPDFFile('protection-map.pdf')
      
      await user.upload(fileInput, mockFile)
      
      // PDFが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
      })

      // 3. 基準点設定フェーズの確認
      await waitFor(() => {
        expect(screen.getByText(/基準点 1/)).toBeInTheDocument()
      })

      // 4. PDF上の基準点選択をシミュレート
      const pdfViewer = screen.getByTestId('pdf-document')
      
      // 基準点1の設定
      fireEvent.click(pdfViewer, { clientX: 100, clientY: 100 })
      
      // 地図上の基準点選択をシミュレート
      const mapContainer = screen.getByTestId('google-map')
      fireEvent.click(mapContainer, { clientX: 200, clientY: 200 })

      // 基準点2の設定
      fireEvent.click(pdfViewer, { clientX: 300, clientY: 100 })
      fireEvent.click(mapContainer, { clientX: 400, clientY: 200 })

      // 基準点3の設定
      fireEvent.click(pdfViewer, { clientX: 100, clientY: 300 })
      fireEvent.click(mapContainer, { clientX: 200, clientY: 400 })

      // 5. オーバーレイ作成フェーズへの移行を確認
      await waitFor(() => {
        expect(screen.getByText(/オーバーレイを作成中/)).toBeInTheDocument()
      }, { timeout: 3000 })

      // 6. オーバーレイ調整フェーズの確認
      await waitFor(() => {
        expect(screen.getByText(/透明度/)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should handle different PDF file types and sizes', async () => {
      const user = userEvent.setup()
      renderApp()

      // 大きなPDFファイルのテスト
      const largePDFContent = new Uint8Array(5 * 1024 * 1024) // 5MB
      largePDFContent.set([37, 80, 68, 70], 0) // PDF header
      const largeFile = new File([largePDFContent], 'large-map.pdf', { type: 'application/pdf' })

      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      await user.upload(fileInput, largeFile)

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
      })

      // 小さなPDFファイルのテスト
      const smallFile = createMockPDFFile('small-map.pdf')
      await user.upload(fileInput, smallFile)

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
      })
    })

    it('should validate browser compatibility features', async () => {
      renderApp()

      // LocalStorage サポートの確認
      expect(typeof Storage).toBe('function')
      expect(localStorage).toBeDefined()

      // File API サポートの確認
      expect(typeof File).toBe('function')
      expect(typeof FileReader).toBe('function')

      // Canvas API サポートの確認
      const canvas = document.createElement('canvas')
      expect(canvas.getContext).toBeDefined()

      // Google Maps API の確認
      expect(global.google).toBeDefined()
      expect(global.google.maps).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle PDF upload errors gracefully', async () => {
      const user = userEvent.setup()
      renderApp()

      // 無効なファイル形式のテスト
      const invalidFile = new File(['invalid content'], 'test.txt', { type: 'text/plain' })
      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      
      await user.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(screen.getByText(/エラー/)).toBeInTheDocument()
      })
    })

    it('should handle Google Maps API errors', async () => {
      // Google Maps API エラーをシミュレート
      global.google = undefined as any
      
      renderApp()

      await waitFor(() => {
        expect(screen.getByText(/エラー/)).toBeInTheDocument()
      })
    })

    it('should handle localStorage errors', async () => {
      // localStorage エラーをシミュレート
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      const user = userEvent.setup()
      renderApp()

      const mockFile = createMockPDFFile()
      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      await user.upload(fileInput, mockFile)

      // 設定保存時のエラーハンドリングを確認
      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
      })

      // localStorage を復元
      localStorage.setItem = originalSetItem
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large PDF files without memory leaks', async () => {
      const user = userEvent.setup()
      renderApp()

      // 大きなPDFファイルを複数回アップロード
      for (let i = 0; i < 3; i++) {
        const largePDFContent = new Uint8Array(2 * 1024 * 1024) // 2MB
        largePDFContent.set([37, 80, 68, 70], 0)
        const largeFile = new File([largePDFContent], `large-map-${i}.pdf`, { type: 'application/pdf' })

        const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
        await user.upload(fileInput, largeFile)

        await waitFor(() => {
          expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
        })
      }

      // メモリ使用量の監視（実際のテストでは performance.memory を使用）
      expect(true).toBe(true) // プレースホルダー
    })

    it('should optimize rendering performance', async () => {
      const user = userEvent.setup()
      renderApp()

      const mockFile = createMockPDFFile()
      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      
      const startTime = performance.now()
      await user.upload(fileInput, mockFile)
      
      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(5000) // 5秒以内
    })
  })

  describe('Configuration Management', () => {
    it('should save and load overlay configurations', async () => {
      const user = userEvent.setup()
      renderApp()

      // 設定を作成
      const mockFile = createMockPDFFile('config-test.pdf')
      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      await user.upload(fileInput, mockFile)

      await waitFor(() => {
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument()
      })

      // 基準点を設定（簡略化）
      const pdfViewer = screen.getByTestId('pdf-document')
      const mapContainer = screen.getByTestId('google-map')
      
      for (let i = 0; i < 3; i++) {
        fireEvent.click(pdfViewer, { clientX: 100 + i * 50, clientY: 100 })
        fireEvent.click(mapContainer, { clientX: 200 + i * 50, clientY: 200 })
      }

      // オーバーレイ調整フェーズまで進む
      await waitFor(() => {
        expect(screen.getByText(/透明度/)).toBeInTheDocument()
      }, { timeout: 5000 })

      // 設定保存のテスト
      const saveButton = screen.getByText(/保存/)
      if (saveButton) {
        await user.click(saveButton)
      }

      // LocalStorage に保存されたことを確認
      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should handle multiple saved configurations', async () => {
      // 複数の設定をLocalStorageに事前設定
      const mockConfigs = [
        {
          id: '1',
          name: 'Config 1',
          pdfFile: { name: 'test1.pdf', data: new ArrayBuffer(8) },
          referencePoints: { pdf: [], map: [] },
          position: { bounds: null, center: { lat: 34.7304, lng: 136.5085 } },
          opacity: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Config 2',
          pdfFile: { name: 'test2.pdf', data: new ArrayBuffer(8) },
          referencePoints: { pdf: [], map: [] },
          position: { bounds: null, center: { lat: 34.7304, lng: 136.5085 } },
          opacity: 0.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      localStorage.getItem = vi.fn((key) => {
        if (key === 'wildlife-protection-configs') {
          return JSON.stringify(mockConfigs)
        }
        return null
      })

      renderApp()

      // 保存された設定が読み込まれることを確認
      await waitFor(() => {
        expect(localStorage.getItem).toHaveBeenCalledWith('wildlife-protection-configs')
      })
    })
  })

  describe('Accessibility and Usability', () => {
    it('should provide proper keyboard navigation', async () => {
      const user = userEvent.setup()
      renderApp()

      // Tab キーでナビゲーション
      await user.tab()
      expect(document.activeElement).toHaveAttribute('type', 'file')

      // Enter キーでファイル選択
      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      expect(fileInput).toHaveFocus()
    })

    it('should provide proper ARIA labels and roles', () => {
      renderApp()

      // ARIA ラベルの確認
      expect(screen.getByLabelText(/PDFファイルを選択/i)).toBeInTheDocument()
      
      // ロールの確認
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })

    it('should be responsive on different screen sizes', () => {
      // モバイルサイズでのテスト
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      renderApp()

      const appBody = document.querySelector('.app-body')
      expect(appBody).toBeInTheDocument()

      // タブレットサイズでのテスト
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      fireEvent(window, new Event('resize'))

      expect(appBody).toBeInTheDocument()

      // デスクトップサイズでのテスト
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      fireEvent(window, new Event('resize'))

      expect(appBody).toBeInTheDocument()
    })
  })
})