import './App.css'
import { useCallback, useMemo, useEffect } from 'react'
import { useApplicationState, useApplicationDispatch } from './store'
import { STEPS } from './types'
import { 
  PDFUploader, 
  PDFViewer, 
  ReferencePointManager, 
  GoogleMapComponent, 
  OverlayControls,
  ErrorBoundary,
  ErrorNotification,
  LocationControls
} from './components'
import './components/PDFUploader.css'
import './components/PDFViewer.css'
import './components/ReferencePointManager.css'
import './components/GoogleMapComponent.css'
import './components/OverlayControls.css'
import './components/ErrorBoundary.css'
import './components/ErrorNotification.css'
import './components/LocationControls.css'
import { handleError, reportError } from './utils/errorHandler'
import { clearPDFCache, getMemoryStats } from './utils/pdfToImage'

function App() {
  const state = useApplicationState();
  const dispatch = useApplicationDispatch();

  // デバッグ: ステップ変更をログ出力
  useEffect(() => {
    console.log('現在のステップ:', state.currentStep, 'オーバーレイ:', !!state.overlay);
    console.log('STEPS.OVERLAY_CREATION:', STEPS.OVERLAY_CREATION);
    console.log('STEPS.OVERLAY_ADJUSTMENT:', STEPS.OVERLAY_ADJUSTMENT);
    console.log('条件チェック - OVERLAY_CREATION:', state.currentStep === STEPS.OVERLAY_CREATION);
    console.log('条件チェック - OVERLAY_ADJUSTMENT:', state.currentStep === STEPS.OVERLAY_ADJUSTMENT && !!state.overlay);
  }, [state.currentStep, state.overlay]);

  // メモリ監視とクリーンアップ
  useEffect(() => {
    const memoryCheckInterval = setInterval(() => {
      const stats = getMemoryStats();
      if (stats.totalMemoryUsage > stats.maxMemoryLimit * 0.8) {
        console.warn('メモリ使用量が制限の80%を超えました。キャッシュをクリアします。');
        clearPDFCache();
      }
    }, 30000); // 30秒ごとにチェック

    return () => {
      clearInterval(memoryCheckInterval);
      // アプリ終了時にキャッシュをクリア
      clearPDFCache();
    };
  }, []);

  // PDFファイル選択ハンドラー（メモ化）
  const handleFileSelect = useCallback((file: File) => {
    try {
      dispatch({ type: 'SET_PDF', payload: file });
    } catch (error) {
      const appError = handleError(error, 'handleFileSelect');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  }, [dispatch]);

  // PDF上の基準点選択ハンドラー（メモ化）
  const handlePDFPointSelect = useCallback((x: number, y: number, pageNumber: number) => {
    try {
      if (state.currentStep >= STEPS.REFERENCE_POINT_1 && state.currentStep <= STEPS.REFERENCE_POINT_3) {
        const currentIndex = state.currentStep - STEPS.REFERENCE_POINT_1;
        
        // 現在のインデックスに対応するPDF基準点がまだ設定されていない場合のみ追加
        if (!state.referencePoints.pdf[currentIndex]) {
          dispatch({ 
            type: 'ADD_PDF_POINT', 
            payload: { x, y, pageNumber } 
          });
        }
      }
    } catch (error) {
      const appError = handleError(error, 'handlePDFPointSelect');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  }, [state.currentStep, state.referencePoints.pdf, dispatch]);

  // 地図上の基準点選択ハンドラー（メモ化）
  const handleMapClick = useCallback((lat: number, lng: number) => {
    try {
      if (state.currentStep >= STEPS.REFERENCE_POINT_1 && state.currentStep <= STEPS.REFERENCE_POINT_3) {
        const currentIndex = state.currentStep - STEPS.REFERENCE_POINT_1;
        
        // 対応するPDF基準点が設定されており、地図基準点がまだ設定されていない場合のみ追加
        if (state.referencePoints.pdf[currentIndex] && !state.referencePoints.map[currentIndex]) {
          dispatch({ 
            type: 'ADD_MAP_POINT', 
            payload: { lat, lng } 
          });
        }
      }
    } catch (error) {
      const appError = handleError(error, 'handleMapClick');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  }, [state.currentStep, state.referencePoints.pdf, state.referencePoints.map, dispatch]);

  // オーバーレイ作成完了ハンドラー（メモ化）
  const handleOverlayCreated = useCallback((overlayConfig: any) => {
    try {
      console.log('handleOverlayCreated呼び出し:', overlayConfig);
      dispatch({ type: 'SET_OVERLAY', payload: overlayConfig });
      console.log('SET_OVERLAYディスパッチ完了');
    } catch (error) {
      console.error('handleOverlayCreatedエラー:', error);
      const appError = handleError(error, 'handleOverlayCreated');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  }, [dispatch]);

  // オーバーレイエラーハンドラー（メモ化）
  const handleOverlayError = useCallback((error: string) => {
    try {
      const appError = handleError(error, 'handleOverlayError');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    } catch (err) {
      // フォールバック: 最低限のエラー処理
      dispatch({ type: 'SET_ERROR', payload: error });
    }
  }, [dispatch]);

  // 基準点管理のハンドラー
  const handleNextStep = () => {
    // ReferencePointManagerが内部でdispatchを呼ぶため、ここでは何もしない
  };

  const handlePreviousStep = () => {
    // ReferencePointManagerが内部でdispatchを呼ぶため、ここでは何もしない
  };

  const handleReset = () => {
    // ReferencePointManagerが内部でdispatchを呼ぶため、ここでは何もしない
  };

  // オーバーレイ調整のハンドラー（メモ化）
  const handlePositionChange = useCallback((lat: number, lng: number) => {
    try {
      dispatch({ type: 'UPDATE_OVERLAY_POSITION', payload: { lat, lng } });
    } catch (error) {
      const appError = handleError(error, 'handlePositionChange');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  }, [dispatch]);

  const handleOpacityChange = useCallback((opacity: number) => {
    try {
      dispatch({ type: 'UPDATE_OVERLAY_OPACITY', payload: opacity });
    } catch (error) {
      const appError = handleError(error, 'handleOpacityChange');
      reportError(appError);
      dispatch({ type: 'SET_ERROR', payload: appError.userMessage });
    }
  }, [dispatch]);

  // エラー通知の閉じるハンドラー（メモ化）
  const handleErrorDismiss = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, [dispatch]);

  // 位置情報が見つかったときのハンドラー（メモ化）
  const handleLocationFound = useCallback((lat: number, lng: number) => {
    // 位置情報が見つかったことをログに記録
    console.log(`現在位置が見つかりました: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  }, []);

  // 現在選択中の基準点インデックスを取得（メモ化）
  const selectedPointIndex = useMemo((): number => {
    if (state.currentStep >= STEPS.REFERENCE_POINT_1 && state.currentStep <= STEPS.REFERENCE_POINT_3) {
      return state.currentStep - STEPS.REFERENCE_POINT_1;
    }
    return -1;
  }, [state.currentStep]);
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        const appError = handleError(error, 'ErrorBoundary');
        reportError(appError, { errorInfo });
      }}
    >
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-title">
              <h1>三重県鳥獣保護区マップ</h1>
              <p>Wildlife Protection Map</p>
            </div>
            <div className="header-controls">
              <ErrorBoundary>
                <LocationControls onLocationFound={handleLocationFound} />
              </ErrorBoundary>
              <button
                onClick={() => {
                  if (state.isPanelVisible) {
                    // パネルを閉じる時にPDFをリセット
                    dispatch({ type: 'CLEAR_PDF' });
                  }
                  dispatch({ type: 'TOGGLE_PANEL_VISIBILITY' });
                }}
                className="btn-header btn-pdf-upload"
                title={state.isPanelVisible ? 'パネルを閉じてリセット' : 'PDFアップロード'}
              >
                {state.isPanelVisible ? '✕ 閉じる' : '📄 PDFアップロード'}
              </button>
            </div>
          </div>
        </header>
        
        <div className="app-body">
          <aside className={`app-sidebar ${state.isPanelVisible ? 'visible' : 'hidden'}`}>
            <div className="sidebar-content">
              <div className="step-indicator">
                {/* ステップ1: PDFアップロード */}
                <div className={`step ${state.currentStep === STEPS.PDF_UPLOAD ? 'active' : ''}`}>
                  <span className="step-number">1</span>
                  <span className="step-label">PDFアップロード</span>
                </div>

                {/* ステップ2: 基準点設定 */}
                <div className={`step ${state.currentStep >= STEPS.REFERENCE_POINT_1 && state.currentStep <= STEPS.REFERENCE_POINT_3 ? 'active' : ''}`}>
                  <span className="step-number">2</span>
                  <span className="step-label">基準点設定</span>
                </div>
                {state.currentStep >= STEPS.REFERENCE_POINT_1 && state.currentStep <= STEPS.REFERENCE_POINT_3 && (
                  <div className="step-content">
                    <ErrorBoundary>
                      <ReferencePointManager
                        pdfPoints={state.referencePoints.pdf}
                        mapPoints={state.referencePoints.map}
                        currentStep={state.currentStep}
                        onNextStep={handleNextStep}
                        onPreviousStep={handlePreviousStep}
                        onReset={handleReset}
                      />
                    </ErrorBoundary>
                  </div>
                )}

                {state.currentStep === STEPS.OVERLAY_CREATION && (
                  <div className="step-content">
                    <p>オーバーレイを作成中です...</p>
                  </div>
                )}

                {/* ステップ4: 調整 */}
                <div className={`step ${state.currentStep === STEPS.OVERLAY_ADJUSTMENT ? 'active' : ''}`}>
                  <span className="step-number">3</span>
                  <span className="step-label">調整</span>
                </div>
                {/* 強制的な条件チェック */}
                {(() => {
                  console.log('レンダリング時の条件チェック:', {
                    currentStep: state.currentStep,
                    OVERLAY_ADJUSTMENT: STEPS.OVERLAY_ADJUSTMENT,
                    hasOverlay: !!state.overlay,
                    stepMatch: state.currentStep === STEPS.OVERLAY_ADJUSTMENT,
                    finalCondition: state.currentStep === STEPS.OVERLAY_ADJUSTMENT && state.overlay
                  });
                  
                  if (state.currentStep === STEPS.OVERLAY_ADJUSTMENT && state.overlay) {
                    try {
                      console.log('レンダリング開始...');

                      const overlay = (
                        <ErrorBoundary>
                          <OverlayControls
                            overlay={state.overlay}
                            onPositionChange={handlePositionChange}
                            onOpacityChange={handleOpacityChange}
                            savedConfigs={state.savedConfigs}
                          />
                        </ErrorBoundary>
                      );
                      let result = overlay;
                      if(import.meta.env.VITE_DEBUG_MODE === "TRUE"){
                        result = (
                          <div>
                            <p>デバッグ: OverlayControlsを表示中</p>
                            <div style={{ padding: '10px', border: '1px solid #ccc', margin: '10px 0' }}>
                              <h4>オーバーレイ調整</h4>
                              <p>オーバーレイが正常に作成されました！</p>
                              <p>オーバーレイ名: {state.overlay.name}</p>
                              <p>透明度: {state.overlay.opacity}</p>
                              <p>中心座標: {state.overlay.position.center.lat.toFixed(6)}, {state.overlay.position.center.lng.toFixed(6)}</p>
                            </div>
                            <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
                              <p>OverlayControlsコンポーネントをロード中...</p>
                              {overlay}
                            </div>
                          </div>
                        );
                      }
                      console.log('レンダリング完了:', result);
                      return result;
                    } catch (error) {
                      console.error('レンダリングエラー:', error);
                      return (
                        <div style={{ padding: '10px', border: '2px solid red', margin: '10px 0' }}>
                          <h4>レンダリングエラー</h4>
                          <p>エラー: {error instanceof Error ? error.message : 'Unknown error'}</p>
                        </div>
                      );
                    }
                  }
                  
                  return null;
                })()}
                {/* デバッグ情報 */}
                {import.meta.env.VITE_DEBUG_MODE === "TRUE" &&
                <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  <p>現在のステップ: {state.currentStep}</p>
                  <p>オーバーレイ: {state.overlay ? 'あり' : 'なし'}</p>
                  <p>OVERLAY_ADJUSTMENT: {STEPS.OVERLAY_ADJUSTMENT}</p>
                </div>
                }
              </div>
            </div>
          </aside>
          
          <main className="app-main">
            <div className="main-content">
              <div className={`content-area ${state.isPanelVisible ? 'split-view' : 'map-only'}`}>
                <div className={`pdf-section ${state.isPanelVisible ? 'visible' : 'hidden'}`}>
                  <h3>PDF表示エリア</h3>
                  <ErrorBoundary>
                    {state.currentStep === STEPS.PDF_UPLOAD ? (
                      <PDFUploader
                        onFileSelect={handleFileSelect}
                        isLoading={state.isLoading}
                      />
                    ) : (
                      <PDFViewer
                        pdfFile={state.currentPDF}
                        onPointSelect={handlePDFPointSelect}
                        referencePoints={state.referencePoints.pdf}
                        selectedPointIndex={selectedPointIndex}
                      />
                    )}
                  </ErrorBoundary>
                </div>
                
                <div className="map-section">
                  <h3>Googleマップ</h3>
                  <ErrorBoundary>
                    <GoogleMapComponent
                      onMapClick={handleMapClick}
                      referencePoints={state.referencePoints.map}
                      overlay={state.overlay}
                      selectedPointIndex={selectedPointIndex}
                      pdfFile={state.currentPDF}
                      pdfPoints={state.referencePoints.pdf}
                      onOverlayCreated={handleOverlayCreated}
                      onOverlayError={handleOverlayError}
                      userLocation={state.userLocation}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* エラー通知 */}
        <ErrorNotification
          error={state.error}
          onDismiss={handleErrorDismiss}
          autoHide={true}
          autoHideDelay={7000}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App
