import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PDFUploader } from '../components/PDFUploader'
import { ReferencePointManager } from '../components/ReferencePointManager'
import { OverlayControls } from '../components/OverlayControls'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ErrorNotification } from '../components/ErrorNotification'
import type { PDFPoint, MapPoint, OverlayConfig } from '../types'
import { STEPS } from '../types'

describe('Component Tests', () => {
  describe('PDFUploader', () => {
    it('should render file input and handle file selection', async () => {
      const mockOnFileSelect = vi.fn()
      const user = userEvent.setup()

      render(<PDFUploader onFileSelect={mockOnFileSelect} isLoading={false} />)

      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      expect(fileInput).toBeInTheDocument()

      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, mockFile)

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)
    })

    it('should show loading state', () => {
      const mockOnFileSelect = vi.fn()

      render(<PDFUploader onFileSelect={mockOnFileSelect} isLoading={true} />)

      expect(screen.getByText(/アップロード中/i)).toBeInTheDocument()
    })

    it('should handle drag and drop', async () => {
      const mockOnFileSelect = vi.fn()

      render(<PDFUploader onFileSelect={mockOnFileSelect} isLoading={false} />)

      const dropZone = screen.getByText(/ドラッグ&ドロップ/i).closest('div')
      expect(dropZone).toBeInTheDocument()

      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      
      fireEvent.dragOver(dropZone!, {
        dataTransfer: {
          files: [mockFile],
        },
      })

      fireEvent.drop(dropZone!, {
        dataTransfer: {
          files: [mockFile],
        },
      })

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)
    })

    it('should validate file type', async () => {
      const mockOnFileSelect = vi.fn()
      const user = userEvent.setup()

      render(<PDFUploader onFileSelect={mockOnFileSelect} isLoading={false} />)

      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      const invalidFile = new File(['text content'], 'test.txt', { type: 'text/plain' })
      
      await user.upload(fileInput, invalidFile)

      // ファイル形式エラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/PDFファイルを選択してください/i)).toBeInTheDocument()
      })
    })
  })

  describe('ReferencePointManager', () => {
    const mockPDFPoints: PDFPoint[] = [
      { x: 100, y: 100, pageNumber: 1 },
      { x: 500, y: 100, pageNumber: 1 },
    ]

    const mockMapPoints: MapPoint[] = [
      { lat: 34.7304, lng: 136.5085 },
      { lat: 34.7304, lng: 136.6085 },
    ]

    it('should display current step information', () => {
      render(
        <ReferencePointManager
          pdfPoints={mockPDFPoints}
          mapPoints={mockMapPoints}
          currentStep={STEPS.REFERENCE_POINT_1}
          onNextStep={vi.fn()}
          onPreviousStep={vi.fn()}
          onReset={vi.fn()}
        />
      )

      expect(screen.getByText(/基準点 1/i)).toBeInTheDocument()
    })

    it('should show progress for each reference point', () => {
      render(
        <ReferencePointManager
          pdfPoints={mockPDFPoints}
          mapPoints={mockMapPoints}
          currentStep={STEPS.REFERENCE_POINT_2}
          onNextStep={vi.fn()}
          onPreviousStep={vi.fn()}
          onReset={vi.fn()}
        />
      )

      // 基準点1は完了、基準点2は進行中
      expect(screen.getByText(/基準点 1.*完了/i)).toBeInTheDocument()
      expect(screen.getByText(/基準点 2/i)).toBeInTheDocument()
    })

    it('should handle next step button', async () => {
      const mockOnNextStep = vi.fn()
      const user = userEvent.setup()

      render(
        <ReferencePointManager
          pdfPoints={[mockPDFPoints[0]]}
          mapPoints={[mockMapPoints[0]]}
          currentStep={STEPS.REFERENCE_POINT_1}
          onNextStep={mockOnNextStep}
          onPreviousStep={vi.fn()}
          onReset={vi.fn()}
        />
      )

      const nextButton = screen.getByText(/次へ/i)
      await user.click(nextButton)

      expect(mockOnNextStep).toHaveBeenCalled()
    })

    it('should handle reset button', async () => {
      const mockOnReset = vi.fn()
      const user = userEvent.setup()

      render(
        <ReferencePointManager
          pdfPoints={mockPDFPoints}
          mapPoints={mockMapPoints}
          currentStep={STEPS.REFERENCE_POINT_2}
          onNextStep={vi.fn()}
          onPreviousStep={vi.fn()}
          onReset={mockOnReset}
        />
      )

      const resetButton = screen.getByText(/リセット/i)
      await user.click(resetButton)

      expect(mockOnReset).toHaveBeenCalled()
    })
  })

  describe('OverlayControls', () => {
    const mockOverlay: OverlayConfig = {
      id: 'test-overlay',
      name: 'Test Overlay',
      pdfFile: { name: 'test.pdf', data: new ArrayBuffer(8) },
      referencePoints: { pdf: [], map: [] },
      position: { bounds: null, center: { lat: 34.7304, lng: 136.5085 } },
      opacity: 0.7,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should display position controls', () => {
      render(
        <OverlayControls
          overlay={mockOverlay}
          onPositionChange={vi.fn()}
          onOpacityChange={vi.fn()}
          savedConfigs={[]}
        />
      )

      expect(screen.getByLabelText(/緯度/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/経度/i)).toBeInTheDocument()
    })

    it('should display opacity control', () => {
      render(
        <OverlayControls
          overlay={mockOverlay}
          onPositionChange={vi.fn()}
          onOpacityChange={vi.fn()}
          savedConfigs={[]}
        />
      )

      expect(screen.getByLabelText(/透明度/i)).toBeInTheDocument()
      const opacitySlider = screen.getByDisplayValue('0.7')
      expect(opacitySlider).toBeInTheDocument()
    })

    it('should handle position changes', async () => {
      const mockOnPositionChange = vi.fn()
      const user = userEvent.setup()

      render(
        <OverlayControls
          overlay={mockOverlay}
          onPositionChange={mockOnPositionChange}
          onOpacityChange={vi.fn()}
          savedConfigs={[]}
        />
      )

      const latInput = screen.getByLabelText(/緯度/i)
      await user.clear(latInput)
      await user.type(latInput, '35.0000')

      expect(mockOnPositionChange).toHaveBeenCalledWith(35.0000, 136.5085)
    })

    it('should handle opacity changes', async () => {
      const mockOnOpacityChange = vi.fn()
      const user = userEvent.setup()

      render(
        <OverlayControls
          overlay={mockOverlay}
          onPositionChange={vi.fn()}
          onOpacityChange={mockOnOpacityChange}
          savedConfigs={[]}
        />
      )

      const opacitySlider = screen.getByLabelText(/透明度/i)
      fireEvent.change(opacitySlider, { target: { value: '0.5' } })

      expect(mockOnOpacityChange).toHaveBeenCalledWith(0.5)
    })
  })

  describe('ErrorBoundary', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>No error</div>
    }

    it('should render children when no error', () => {
      render(
        <ErrorBoundary onError={vi.fn()}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('should catch and display errors', () => {
      const mockOnError = vi.fn()

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()
      expect(mockOnError).toHaveBeenCalled()
    })

    it('should provide retry functionality', async () => {
      const mockOnError = vi.fn()
      const user = userEvent.setup()

      const { rerender } = render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument()

      const retryButton = screen.getByText(/再試行/i)
      await user.click(retryButton)

      // エラーが解決された状態で再レンダリング
      rerender(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('ErrorNotification', () => {
    it('should display error message', () => {
      render(
        <ErrorNotification
          error="Test error message"
          onDismiss={vi.fn()}
          autoHide={false}
        />
      )

      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should not render when no error', () => {
      render(
        <ErrorNotification
          error={null}
          onDismiss={vi.fn()}
          autoHide={false}
        />
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should handle dismiss action', async () => {
      const mockOnDismiss = vi.fn()
      const user = userEvent.setup()

      render(
        <ErrorNotification
          error="Test error"
          onDismiss={mockOnDismiss}
          autoHide={false}
        />
      )

      const dismissButton = screen.getByLabelText(/閉じる/i)
      await user.click(dismissButton)

      expect(mockOnDismiss).toHaveBeenCalled()
    })

    it('should auto-hide after delay', async () => {
      const mockOnDismiss = vi.fn()

      render(
        <ErrorNotification
          error="Test error"
          onDismiss={mockOnDismiss}
          autoHide={true}
          autoHideDelay={100}
        />
      )

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled()
      }, { timeout: 200 })
    })
  })

  describe('Component Integration', () => {
    it('should handle component interactions correctly', async () => {
      const user = userEvent.setup()
      
      // PDFUploader と ReferencePointManager の連携テスト
      const mockOnFileSelect = vi.fn()
      
      const { rerender } = render(
        <PDFUploader onFileSelect={mockOnFileSelect} isLoading={false} />
      )

      const fileInput = screen.getByLabelText(/PDFファイルを選択/i)
      const mockFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, mockFile)

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile)

      // ファイル選択後、ReferencePointManager が表示される
      rerender(
        <ReferencePointManager
          pdfPoints={[]}
          mapPoints={[]}
          currentStep={STEPS.REFERENCE_POINT_1}
          onNextStep={vi.fn()}
          onPreviousStep={vi.fn()}
          onReset={vi.fn()}
        />
      )

      expect(screen.getByText(/基準点 1/i)).toBeInTheDocument()
    })

    it('should maintain state consistency across components', () => {
      const mockOverlay: OverlayConfig = {
        id: 'test',
        name: 'Test',
        pdfFile: { name: 'test.pdf', data: new ArrayBuffer(8) },
        referencePoints: { pdf: [], map: [] },
        position: { bounds: null, center: { lat: 34.7304, lng: 136.5085 } },
        opacity: 0.7,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      render(
        <OverlayControls
          overlay={mockOverlay}
          onPositionChange={vi.fn()}
          onOpacityChange={vi.fn()}
          savedConfigs={[mockOverlay]}
        />
      )

      // 設定値が正しく表示されることを確認
      expect(screen.getByDisplayValue('34.7304')).toBeInTheDocument()
      expect(screen.getByDisplayValue('136.5085')).toBeInTheDocument()
      expect(screen.getByDisplayValue('0.7')).toBeInTheDocument()
    })
  })
})