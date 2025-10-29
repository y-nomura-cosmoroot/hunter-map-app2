import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker の設定 - ローカルの静的アセットを使用
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// PDFドキュメントのキャッシュ
const documentCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
const MAX_CACHE_SIZE = 3; // 最大3つのドキュメントをキャッシュ

// メモリ使用量の監視
let totalMemoryUsage = 0;
const MAX_MEMORY_MB = 100; // 最大100MBまで使用可能

/**
 * PDFドキュメントを取得（キャッシュ付き）
 */
async function getCachedPDFDocument(pdfFile: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const cacheKey = `${pdfFile.name}_${pdfFile.size}_${pdfFile.lastModified}`;
  
  // キャッシュから取得を試行
  if (documentCache.has(cacheKey)) {
    const cachedDoc = documentCache.get(cacheKey)!;
    return cachedDoc;
  }

  // キャッシュサイズ制限チェック
  if (documentCache.size >= MAX_CACHE_SIZE) {
    // 最も古いドキュメントを削除
    const firstKey = documentCache.keys().next().value;
    if (firstKey) {
      const oldDoc = documentCache.get(firstKey);
      if (oldDoc) {
        oldDoc.destroy();
      }
      documentCache.delete(firstKey);
    }
  }

  // ArrayBufferのdetached問題を回避するため、毎回新しいArrayBufferを作成
  const originalBuffer = await pdfFile.arrayBuffer();
  const arrayBuffer = originalBuffer.slice(); // 新しいArrayBufferを作成
  
  // 大きなファイルの場合は最適化設定を適用
  const fileSizeMB = pdfFile.size / (1024 * 1024);
  const isLargeFile = fileSizeMB > 10;
  
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    // 大きなファイル用の最適化設定
    useWorkerFetch: false, // detached ArrayBuffer問題を回避
    disableAutoFetch: isLargeFile,
    disableStream: false,
    // メモリ使用量を制限
    maxImageSize: isLargeFile ? 1024 * 1024 : -1, // 1MB制限
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  
  // キャッシュに保存
  documentCache.set(cacheKey, pdf);
  
  return pdf;
}

/**
 * メモリ使用量を推定
 */
function estimateMemoryUsage(width: number, height: number): number {
  // RGBA = 4 bytes per pixel
  return (width * height * 4) / (1024 * 1024); // MB単位
}

/**
 * PDFファイルをCanvasに描画してImageDataを生成（最適化版）
 * 
 * @param pdfFile PDFファイル
 * @param pageNumber ページ番号（1から開始）
 * @param scale 描画スケール（デフォルト: 2.0）
 * @returns Canvas要素とImageDataのPromise
 */
export async function convertPDFToCanvas(
  pdfFile: File,
  pageNumber: number = 1,
  scale: number = 2.0
): Promise<{
  canvas: HTMLCanvasElement;
  imageData: string;
  width: number;
  height: number;
}> {
  try {
    // キャッシュされたPDFドキュメントを取得
    const pdf = await getCachedPDFDocument(pdfFile);
    
    // 指定されたページを取得
    const page = await pdf.getPage(pageNumber);
    
    // ビューポートを取得（スケール適用）
    const viewport = page.getViewport({ scale });
    
    // メモリ使用量をチェック
    const estimatedMemory = estimateMemoryUsage(viewport.width, viewport.height);
    if (totalMemoryUsage + estimatedMemory > MAX_MEMORY_MB) {
      // スケールを下げてメモリ使用量を削減
      const reducedScale = Math.sqrt(MAX_MEMORY_MB / (totalMemoryUsage + estimatedMemory)) * scale;
      const reducedViewport = page.getViewport({ scale: reducedScale });
      console.warn(`メモリ使用量制限のためスケールを ${scale} から ${reducedScale} に削減しました`);
      return convertPDFToCanvasInternal(page, reducedViewport);
    }
    
    return convertPDFToCanvasInternal(page, viewport);
  } catch (error) {
    console.error('PDF to Canvas conversion error:', error);
    throw new Error(`PDFの画像変換に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 内部的なCanvas変換処理
 */
async function convertPDFToCanvasInternal(
  page: pdfjsLib.PDFPageProxy,
  viewport: pdfjsLib.PageViewport
): Promise<{
  canvas: HTMLCanvasElement;
  imageData: string;
  width: number;
  height: number;
}> {
  // Canvasを作成
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Canvas 2D contextの取得に失敗しました');
  }
  
  // Canvasのサイズを設定
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // メモリ使用量を追跡
  const memoryUsage = estimateMemoryUsage(viewport.width, viewport.height);
  totalMemoryUsage += memoryUsage;
  
  try {
    // 描画パラメータを設定
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
      // パフォーマンス最適化設定
      intent: 'display',
    };
    
    // PDFページをCanvasに描画
    await page.render(renderContext).promise;
    
    // CanvasをBase64エンコードされた画像データに変換
    // JPEGで圧縮してサイズを大幅削減（透明度が不要な場合）
    const imageData = canvas.toDataURL('image/jpeg', 0.7); // JPEG品質70%でサイズ大幅削減
    
    return {
      canvas,
      imageData,
      width: viewport.width,
      height: viewport.height,
    };
  } finally {
    // メモリ使用量を更新
    totalMemoryUsage -= memoryUsage;
  }
}

/**
 * PDFの全ページを画像に変換
 * 
 * @param pdfFile PDFファイル
 * @param scale 描画スケール（デフォルト: 2.0）
 * @returns 各ページの画像データの配列
 */
export async function convertAllPDFPagesToImages(
  pdfFile: File,
  scale: number = 2.0
): Promise<Array<{
  pageNumber: number;
  canvas: HTMLCanvasElement;
  imageData: string;
  width: number;
  height: number;
}>> {
  try {
    // キャッシュされたドキュメントを使用
    const pdf = await getCachedPDFDocument(pdfFile);
    
    const results = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const result = await convertPDFToCanvas(pdfFile, pageNum, scale);
      results.push({
        pageNumber: pageNum,
        ...result,
      });
    }
    
    return results;
  } catch (error) {
    console.error('PDF pages conversion error:', error);
    throw new Error(`PDFページの変換に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * PDFページの実際のサイズ（ポイント単位）を取得
 * 
 * @param pdfFile PDFファイル
 * @param pageNumber ページ番号（1から開始）
 * @returns ページサイズ（ポイント単位）
 */
export async function getPDFPageSize(
  pdfFile: File,
  pageNumber: number = 1
): Promise<{ width: number; height: number }> {
  try {
    // キャッシュされたドキュメントを使用
    const pdf = await getCachedPDFDocument(pdfFile);
    const page = await pdf.getPage(pageNumber);
    
    // スケール1.0でのビューポートを取得（実際のサイズ）
    const viewport = page.getViewport({ scale: 1.0 });
    
    return {
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    console.error('PDF page size error:', error);
    throw new Error(`PDFページサイズの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 高品質なPDF画像を生成（Ground Overlay用・最適化版）
 * 
 * @param pdfFile PDFファイル
 * @param pageNumber ページ番号
 * @param targetWidth 目標幅（ピクセル）
 * @returns 高品質な画像データ
 */
export async function generateHighQualityPDFImage(
  pdfFile: File,
  pageNumber: number = 1,
  targetWidth: number = 2048
): Promise<{
  canvas: HTMLCanvasElement;
  imageData: string;
  width: number;
  height: number;
  scale: number;
}> {
  try {
    // PDFページの実際のサイズを取得
    const pageSize = await getPDFPageSize(pdfFile, pageNumber);
    
    // ファイルサイズに基づいて目標幅を調整
    const fileSizeMB = pdfFile.size / (1024 * 1024);
    let adjustedTargetWidth = targetWidth;
    
    if (fileSizeMB > 50) {
      adjustedTargetWidth = Math.min(targetWidth, 1024); // 50MB以上は1024px制限
    } else if (fileSizeMB > 20) {
      adjustedTargetWidth = Math.min(targetWidth, 1536); // 20MB以上は1536px制限
    }
    
    // 目標幅に基づいてスケールを計算
    const scale = adjustedTargetWidth / pageSize.width;
    
    // 高品質な画像を生成
    const result = await convertPDFToCanvas(pdfFile, pageNumber, scale);
    
    return {
      ...result,
      scale,
    };
  } catch (error) {
    console.error('High quality PDF image generation error:', error);
    throw new Error(`高品質PDF画像の生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * PDFドキュメントキャッシュをクリア
 */
export function clearPDFCache(): void {
  documentCache.forEach(doc => {
    try {
      doc.destroy();
    } catch (error) {
      console.warn('PDF document cleanup error:', error);
    }
  });
  documentCache.clear();
  totalMemoryUsage = 0;
}

/**
 * メモリ使用量の統計を取得
 */
export function getMemoryStats(): {
  totalMemoryUsage: number;
  maxMemoryLimit: number;
  cachedDocuments: number;
  maxCacheSize: number;
} {
  return {
    totalMemoryUsage,
    maxMemoryLimit: MAX_MEMORY_MB,
    cachedDocuments: documentCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
  };
}