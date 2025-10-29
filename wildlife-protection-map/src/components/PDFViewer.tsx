import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { PDFPoint } from '../types';

// PDF.js worker設定 - ローカルの静的アセットを使用
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  pdfFile: File | null;
  onPointSelect: (x: number, y: number, pageNumber: number) => void;
  referencePoints: PDFPoint[];
  selectedPointIndex: number;
}

// PDFファイルのURLを管理するためのカスタムフック
const usePDFUrl = (pdfFile: File | null) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfFile) {
      // 新しいURLを作成
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);

      // クリーンアップ関数でURLを解放
      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    } else {
      setPdfUrl(null);
    }
  }, [pdfFile]);

  return pdfUrl;
};

const PDFViewer: React.FC<PDFViewerProps> = React.memo(({
  pdfFile,
  onPointSelect,
  referencePoints,
  selectedPointIndex
}) => {
  const [currentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [_pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  
  // PDFファイルのURLを取得
  const pdfUrl = usePDFUrl(pdfFile);

  // PDF読み込み成功時のハンドラー
  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    // 前のドキュメントをクリーンアップ
    if (documentRef.current && documentRef.current !== pdf) {
      documentRef.current.destroy();
    }
    
    documentRef.current = pdf;
    setPdfDocument(pdf);
    setIsLoading(false);
    setError(null);
  }, []);

  // PDF読み込み開始時のハンドラー
  const onDocumentLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  // PDF読み込みエラー時のハンドラー
  const onDocumentLoadError = useCallback((error: Error) => {
    setIsLoading(false);
    setError('PDFファイルの読み込みに失敗しました。ファイルが破損している可能性があります。');
    console.error('PDF load error:', error);
  }, []);

  // ページクリック時のハンドラー
  const handlePageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    onPointSelect(x, y, currentPage);
  }, [currentPage, scale, onPointSelect]);

  // ズーム操作
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1.0);
  }, []);

  // 現在のページの基準点を取得（メモ化）
  const currentPagePoints = useMemo(() => 
    referencePoints.filter(point => point.pageNumber === currentPage),
    [referencePoints, currentPage]
  );

  // PDFファイルのサイズチェック（大きなファイルの検出）
  const isLargePDF = useMemo(() => {
    if (!pdfFile) return false;
    const fileSizeMB = pdfFile.size / (1024 * 1024);
    return fileSizeMB > 10; // 10MB以上を大きなファイルとする
  }, [pdfFile]);

  // react-pdfのoptionsをメモ化
  const pdfOptions = useMemo(() => ({
    // detached ArrayBuffer問題を回避するための設定
    useWorkerFetch: false,
    disableAutoFetch: isLargePDF,
    disableStream: false,
  }), [isLargePDF]);

  // メモリクリーンアップ
  useEffect(() => {
    return () => {
      if (documentRef.current) {
        documentRef.current.destroy();
        documentRef.current = null;
      }
    };
  }, []);

  // PDFファイル変更時のクリーンアップ
  useEffect(() => {
    if (pdfUrl) {
      // 新しいファイルが選択された時、前のドキュメントをクリーンアップ
      if (documentRef.current) {
        documentRef.current.destroy();
        documentRef.current = null;
      }
      setPdfDocument(null);
      setError(null);
    }
  }, [pdfUrl]);

  if (!pdfFile) {
    return (
      <div className="pdf-viewer-empty">
        <div className="empty-content">
          <div className="empty-icon">📄</div>
          <h3>PDFファイルが選択されていません</h3>
          <p>左側のアップロードエリアからPDFファイルを選択してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      {/* PDF表示エリア */}
      <div className="pdf-display-area">
        {/* ズームコントロール（右端に配置） */}
        <div className="zoom-controls-overlay">
          <button onClick={handleZoomIn} className="zoom-btn" title="拡大">+</button>
          <span className="zoom-info">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomOut} className="zoom-btn" title="縮小">-</button>
          <button onClick={handleZoomReset} className="zoom-btn reset" title="リセット">⟲</button>
        </div>
        {isLoading && (
          <div className="pdf-loading">
            <div className="spinner"></div>
            <p>PDFを読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {pdfUrl && !error && (
          <div className="pdf-container" style={{ transform: `scale(${scale})` }}>
            {isLargePDF && (
              <div className="large-pdf-warning">
                <span className="warning-icon">⚠️</span>
                <p>大きなPDFファイルです。読み込みに時間がかかる場合があります。</p>
              </div>
            )}
            <Document
              file={pdfUrl}
              onLoadStart={onDocumentLoadStart}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
              options={pdfOptions}
            >
              <div 
                ref={pageRef}
                className="pdf-page-container"
                onClick={handlePageClick}
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  // 大きなPDFの場合は低解像度でレンダリング
                  scale={isLargePDF ? Math.min(scale, 1.5) : scale}
                  // メモリ使用量を制限
                  canvasBackground="white"
                />
                
                {/* 基準点の表示（メモ化されたコンポーネント） */}
                <ReferencePointMarkers
                  points={currentPagePoints}
                  allPoints={referencePoints}
                  selectedPointIndex={selectedPointIndex}
                />
              </div>
            </Document>
          </div>
        )}
      </div>

      {/* 基準点設定のヘルプ */}
      {referencePoints.length < 3 && (
        <div className="pdf-help">
          <p>
            📍 基準点 {referencePoints.length + 1}/3 を設定してください。
            PDF上の基準点をクリックしてください。
          </p>
        </div>
      )}
    </div>
  );
});

// メモ化された基準点マーカーコンポーネント
const ReferencePointMarkers: React.FC<{
  points: PDFPoint[];
  allPoints: PDFPoint[];
  selectedPointIndex: number;
}> = React.memo(({ points, allPoints, selectedPointIndex }) => {
  return (
    <>
      {points.map((point) => {
        const globalIndex = allPoints.indexOf(point);
        const isSelected = globalIndex === selectedPointIndex;
        
        return (
          <div
            key={`point-${globalIndex}`}
            className={`reference-point ${isSelected ? 'selected' : ''}`}
            style={{
              left: `${point.x}px`,
              top: `${point.y}px`,
            }}
          >
            <div className="point-marker">
              <span className="point-number">{globalIndex + 1}</span>
            </div>
          </div>
        );
      })}
    </>
  );
});

ReferencePointMarkers.displayName = 'ReferencePointMarkers';

export default PDFViewer;