import React, { useRef, useState } from 'react';
import { useApplicationDispatch } from '../store';
import { handleError, reportError, ErrorType, AppError } from '../utils/errorHandler';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onFileSelect, isLoading }) => {
  const dispatch = useApplicationDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ファイル形式とサイズの検証
  const validateFile = (file: File): void => {
    // ファイル形式チェック
    if (file.type !== 'application/pdf') {
      throw new AppError(
        'Invalid file type',
        ErrorType.VALIDATION,
        'PDFファイルのみアップロード可能です。',
        'INVALID_FILE_TYPE'
      );
    }

    // ファイルサイズチェック (50MB制限)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new AppError(
        'File size too large',
        ErrorType.VALIDATION,
        'ファイルサイズが大きすぎます。50MB以下のファイルを選択してください。',
        'FILE_TOO_LARGE',
        { fileSize: file.size, maxSize }
      );
    }

    // ファイルが空でないかチェック
    if (file.size === 0) {
      throw new AppError(
        'Empty file',
        ErrorType.VALIDATION,
        'ファイルが空です。有効なPDFファイルを選択してください。',
        'EMPTY_FILE'
      );
    }
  };

  // ファイル処理の共通ロジック
  const handleFile = (file: File) => {
    setError(null);
    
    try {
      // ファイル検証
      validateFile(file);
      
      // ファイル処理
      onFileSelect(file);
      dispatch({ type: 'SET_PDF', payload: file });
    } catch (err) {
      const appError = handleError(err, 'PDFUploader.handleFile');
      reportError(appError, { fileName: file.name, fileSize: file.size });
      
      setError(appError.userMessage);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  };

  // ファイル選択ハンドラー
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    } catch (err) {
      const appError = handleError(err, 'PDFUploader.handleFileSelect');
      reportError(appError);
      setError(appError.userMessage);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  };

  // ドラッグ&ドロップハンドラー
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    try {
      const files = event.dataTransfer.files;
      if (files.length === 0) {
        throw new AppError(
          'No files dropped',
          ErrorType.VALIDATION,
          'ファイルが選択されていません。',
          'NO_FILES_DROPPED'
        );
      }
      
      if (files.length > 1) {
        throw new AppError(
          'Multiple files dropped',
          ErrorType.VALIDATION,
          '一度に複数のファイルをアップロードすることはできません。',
          'MULTIPLE_FILES_DROPPED'
        );
      }
      
      handleFile(files[0]);
    } catch (err) {
      const appError = handleError(err, 'PDFUploader.handleDrop');
      reportError(appError);
      setError(appError.userMessage);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  };

  // ファイル選択ボタンクリック
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="pdf-uploader">
      <div
        className={`upload-area ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-label="PDFファイルをアップロード"
        aria-describedby="upload-instructions upload-requirements"
        aria-busy={isLoading}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
            e.preventDefault();
            handleButtonClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="visually-hidden"
          disabled={isLoading}
          aria-label="PDFファイルを選択"
        />
        
        <div className="upload-content">
          {isLoading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>ファイルを処理中...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon" aria-hidden="true">📄</div>
              <h3>PDFファイルをアップロード</h3>
              <p id="upload-instructions">
                ファイルをここにドラッグ&ドロップするか、<br />
                クリックしてファイルを選択してください
              </p>
              <div className="file-requirements" id="upload-requirements">
                <small>
                  • PDFファイルのみ対応<br />
                  • 最大ファイルサイズ: 50MB
                </small>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert" aria-live="polite">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PDFUploader;