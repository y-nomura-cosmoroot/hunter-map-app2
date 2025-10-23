import React from 'react';
import { useApplicationDispatch } from '../store';
import type { PDFPoint, MapPoint } from '../types';
import { STEPS } from '../types';

interface ReferencePointManagerProps {
  pdfPoints: PDFPoint[];
  mapPoints: MapPoint[];
  currentStep: number;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onReset: () => void;
}

const ReferencePointManager: React.FC<ReferencePointManagerProps> = ({
  pdfPoints,
  mapPoints,
  currentStep,
  onNextStep,
  onPreviousStep,
  onReset
}) => {
  const dispatch = useApplicationDispatch();

  // 現在設定中の基準点番号を取得
  const getCurrentPointIndex = (): number => {
    if (currentStep >= STEPS.REFERENCE_POINT_1 && currentStep <= STEPS.REFERENCE_POINT_3) {
      return currentStep - STEPS.REFERENCE_POINT_1;
    }
    return -1;
  };

  // 基準点ペアが完成しているかチェック
  const isPointPairComplete = (index: number): boolean => {
    return pdfPoints[index] !== undefined && mapPoints[index] !== undefined;
  };

  // 全ての基準点が設定されているかチェック
  const areAllPointsSet = (): boolean => {
    return pdfPoints.length === 3 && mapPoints.length === 3;
  };

  // 現在のステップで次に進めるかチェック
  const canProceedToNext = (): boolean => {
    const currentIndex = getCurrentPointIndex();
    if (currentIndex === -1) return false;
    
    return isPointPairComplete(currentIndex);
  };

  // 基準点をリセット
  const handleReset = () => {
    dispatch({ type: 'CLEAR_REFERENCE_POINTS' });
    onReset();
  };

  // 次のステップに進む
  const handleNextStep = () => {
    if (canProceedToNext()) {
      if (areAllPointsSet()) {
        dispatch({ type: 'SET_CURRENT_STEP', payload: STEPS.OVERLAY_CREATION });
      } else {
        dispatch({ type: 'NEXT_STEP' });
      }
      onNextStep();
    }
  };

  // 前のステップに戻る
  const handlePreviousStep = () => {
    if (currentStep > STEPS.REFERENCE_POINT_1) {
      dispatch({ type: 'PREVIOUS_STEP' });
      onPreviousStep();
    }
  };

  // 特定の基準点を削除
  const handleRemovePoint = (index: number) => {
    // 基準点を削除するロジックを実装
    // 現在のreducerには個別削除機能がないため、全体をリセットして再構築
    const newPdfPoints = pdfPoints.filter((_, i) => i !== index);
    const newMapPoints = mapPoints.filter((_, i) => i !== index);
    
    dispatch({ type: 'CLEAR_REFERENCE_POINTS' });
    
    // 残りの基準点を再設定
    newPdfPoints.forEach(point => {
      dispatch({ type: 'ADD_PDF_POINT', payload: point });
    });
    newMapPoints.forEach(point => {
      dispatch({ type: 'ADD_MAP_POINT', payload: point });
    });
    
    // ステップを調整
    const newStep = Math.max(STEPS.REFERENCE_POINT_1, STEPS.REFERENCE_POINT_1 + newPdfPoints.length);
    dispatch({ type: 'SET_CURRENT_STEP', payload: newStep });
  };

  const currentIndex = getCurrentPointIndex();
  const isInReferencePointMode = currentIndex >= 0;

  if (!isInReferencePointMode) {
    return null;
  }

  return (
    <div className="reference-point-manager">
      <div className="manager-header">
        <h3>基準点設定</h3>
        <div className="progress-indicator">
          <span className="progress-text">
            {pdfPoints.length} / 3 基準点が設定済み
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(pdfPoints.length / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="current-step-info">
        <div className="step-badge">
          基準点 {currentIndex + 1}
        </div>
        <div className="step-description">
          <p>
            {!pdfPoints[currentIndex] && !mapPoints[currentIndex] && 
              "PDF上の特徴的な地点をクリックしてください"}
            {pdfPoints[currentIndex] && !mapPoints[currentIndex] && 
              "対応する地図上の地点をクリックしてください"}
            {pdfPoints[currentIndex] && mapPoints[currentIndex] && 
              "基準点ペアが設定されました"}
          </p>
        </div>
      </div>

      {/* 設定済み基準点の一覧 */}
      <div className="points-list">
        <h4>設定済み基準点</h4>
        {pdfPoints.length === 0 ? (
          <p className="no-points">まだ基準点が設定されていません</p>
        ) : (
          <div className="points-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className={`point-item ${index === currentIndex ? 'current' : ''}`}>
                <div className="point-header">
                  <span className="point-label">基準点 {index + 1}</span>
                  {pdfPoints[index] && mapPoints[index] && (
                    <button
                      onClick={() => handleRemovePoint(index)}
                      className="remove-btn"
                      title="この基準点を削除"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="point-status">
                  <div className={`status-item ${pdfPoints[index] ? 'complete' : 'pending'}`}>
                    <span className="status-icon">
                      {pdfPoints[index] ? '✓' : '○'}
                    </span>
                    <span className="status-text">PDF座標</span>
                    {pdfPoints[index] && (
                      <span className="coordinates">
                        ({Math.round(pdfPoints[index].x)}, {Math.round(pdfPoints[index].y)})
                      </span>
                    )}
                  </div>
                  <div className={`status-item ${mapPoints[index] ? 'complete' : 'pending'}`}>
                    <span className="status-icon">
                      {mapPoints[index] ? '✓' : '○'}
                    </span>
                    <span className="status-text">地図座標</span>
                    {mapPoints[index] && (
                      <span className="coordinates">
                        ({mapPoints[index].lat.toFixed(6)}, {mapPoints[index].lng.toFixed(6)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* コントロールボタン */}
      <div className="manager-controls">
        <button
          onClick={handlePreviousStep}
          disabled={currentStep <= STEPS.REFERENCE_POINT_1}
          className="control-btn secondary"
        >
          ← 前へ
        </button>
        
        <button
          onClick={handleReset}
          className="control-btn danger"
          disabled={pdfPoints.length === 0 && mapPoints.length === 0}
        >
          リセット
        </button>
        
        <button
          onClick={handleNextStep}
          disabled={!canProceedToNext()}
          className="control-btn primary"
        >
          {areAllPointsSet() ? 'オーバーレイ作成' : '次へ →'}
        </button>
      </div>

      {/* ヘルプメッセージ */}
      <div className="help-section">
        <h5>💡 ヒント</h5>
        <ul>
          <li>建物の角、道路の交差点など、明確に識別できる地点を選択してください</li>
          <li>3つの基準点は三角形を形成するように配置すると精度が向上します</li>
          <li>基準点は後から削除・再設定できます</li>
        </ul>
      </div>
    </div>
  );
};

export default ReferencePointManager;