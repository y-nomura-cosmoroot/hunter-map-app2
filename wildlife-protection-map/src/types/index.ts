// PDF関連の型定義
export interface PDFPoint {
  x: number;
  y: number;
  pageNumber: number;
}

// 地図関連の型定義
export interface MapPoint {
  lat: number;
  lng: number;
}

// 現在位置の型定義
export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

// オーバーレイ設定の型定義
export interface OverlayConfig {
  id: string;
  name: string;
  pdfFile: {
    name: string;
    data: ArrayBuffer;
  };
  referencePoints: {
    pdf: PDFPoint[];
    map: MapPoint[];
  };
  position: {
    bounds: any | null; // google.maps.LatLngBounds will be available when Google Maps is loaded
    center: { lat: number; lng: number };
  };
  opacity: number;
  createdAt: Date;
  updatedAt: Date;
}

// アプリケーション状態の型定義
export interface ApplicationState {
  currentPDF: File | null;
  referencePoints: {
    pdf: PDFPoint[];
    map: MapPoint[];
  };
  currentStep: number; // 0-5: アップロード→基準点設定(3回)→オーバーレイ→調整
  overlay: OverlayConfig | null;
  savedConfigs: OverlayConfig[];
  userLocation: UserLocation | null;
  isLocationLoading: boolean;
  locationError: string | null;
  isLoading: boolean;
  error: string | null;
}

// アクションの型定義
export type ApplicationAction =
  | { type: 'SET_PDF'; payload: File }
  | { type: 'CLEAR_PDF' }
  | { type: 'ADD_PDF_POINT'; payload: PDFPoint }
  | { type: 'ADD_MAP_POINT'; payload: MapPoint }
  | { type: 'CLEAR_REFERENCE_POINTS' }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SET_OVERLAY'; payload: OverlayConfig }
  | { type: 'UPDATE_OVERLAY_POSITION'; payload: { lat: number; lng: number } }
  | { type: 'UPDATE_OVERLAY_OPACITY'; payload: number }
  | { type: 'SAVE_CONFIG'; payload: OverlayConfig }
  | { type: 'LOAD_CONFIG'; payload: OverlayConfig }
  | { type: 'DELETE_CONFIG'; payload: string }
  | { type: 'LOAD_SAVED_CONFIGS'; payload: OverlayConfig[] }
  | { type: 'CLEAR_ALL_CONFIGS' }
  | { type: 'SET_USER_LOCATION'; payload: UserLocation }
  | { type: 'SET_LOCATION_LOADING'; payload: boolean }
  | { type: 'SET_LOCATION_ERROR'; payload: string | null }
  | { type: 'CLEAR_USER_LOCATION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' };

// ステップの定数
export const STEPS = {
  PDF_UPLOAD: 0,
  REFERENCE_POINT_1: 1,
  REFERENCE_POINT_2: 2,
  REFERENCE_POINT_3: 3,
  OVERLAY_CREATION: 4,
  OVERLAY_ADJUSTMENT: 5,
} as const;

export type StepType = typeof STEPS[keyof typeof STEPS];