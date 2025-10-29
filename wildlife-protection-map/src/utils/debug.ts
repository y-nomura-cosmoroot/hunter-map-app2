// デバッグ用ユーティリティ

/**
 * ストレージの内容を確認
 */
export function debugStorage() {
  console.log('=== Storage Debug ===');
  
  // LocalStorage
  console.log('LocalStorage keys:', Object.keys(localStorage));
  const configsKey = 'wildlife-protection-map-configs';
  const configs = localStorage.getItem(configsKey);
  if (configs) {
    try {
      const parsedConfigs = JSON.parse(configs);
      console.log('LocalStorage configs:', parsedConfigs);
    } catch (error) {
      console.log('LocalStorage configs (raw):', configs);
    }
  }
  
  // IndexedDB (簡易チェック)
  if ('indexedDB' in window) {
    console.log('IndexedDB is available');
  } else {
    console.log('IndexedDB is not available');
  }
}

/**
 * アプリケーション状態を確認
 */
export function debugAppState(state: any) {
  console.log('=== App State Debug ===');
  console.log('Current step:', state.currentStep);
  console.log('Has PDF:', !!state.currentPDF);
  console.log('PDF points:', state.referencePoints.pdf.length);
  console.log('Map points:', state.referencePoints.map.length);
  console.log('Has overlay:', !!state.overlay);
  console.log('Saved configs count:', state.savedConfigs.length);
  
  if (state.overlay) {
    console.log('Overlay details:', {
      id: state.overlay.id,
      name: state.overlay.name,
      hasPdfFile: !!state.overlay.pdfFile,
      hasPosition: !!state.overlay.position,
      hasBounds: !!state.overlay.bounds,
      opacity: state.overlay.opacity
    });
  }
}

// グローバルに公開（開発時のみ）
if (import.meta.env.DEV) {
  (window as any).debugStorage = debugStorage;
  (window as any).debugAppState = debugAppState;
}