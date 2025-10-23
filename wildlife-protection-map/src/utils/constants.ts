// アプリケーション定数
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'Wildlife Protection Map',
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
} as const;

// ステップ定数
export const STEPS = {
  UPLOAD_PDF: 0,
  SET_REFERENCE_POINT_1: 1,
  SET_REFERENCE_POINT_2: 2,
  SET_REFERENCE_POINT_3: 3,
  CREATE_OVERLAY: 4,
  ADJUST_OVERLAY: 5,
} as const;

// ファイル制限
export const FILE_CONSTRAINTS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ['application/pdf'],
} as const;

// LocalStorage キー
export const STORAGE_KEYS = {
  OVERLAY_CONFIGS: 'wildlife_protection_overlay_configs',
  CURRENT_CONFIG: 'wildlife_protection_current_config',
} as const;