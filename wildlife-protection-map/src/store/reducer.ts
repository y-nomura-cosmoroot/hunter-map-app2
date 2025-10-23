import type { ApplicationState, ApplicationAction } from '../types';
import { STEPS } from '../types';

// 初期状態
export const initialState: ApplicationState = {
  currentPDF: null,
  referencePoints: {
    pdf: [],
    map: [],
  },
  currentStep: STEPS.PDF_UPLOAD,
  overlay: null,
  savedConfigs: [],
  userLocation: null,
  isLocationLoading: false,
  locationError: null,
  isLoading: false,
  error: null,
};

// Reducer関数
export function applicationReducer(
  state: ApplicationState,
  action: ApplicationAction
): ApplicationState {
  switch (action.type) {
    case 'SET_PDF':
      return {
        ...state,
        currentPDF: action.payload,
        currentStep: STEPS.REFERENCE_POINT_1,
        error: null,
      };

    case 'CLEAR_PDF':
      return {
        ...state,
        currentPDF: null,
        currentStep: STEPS.PDF_UPLOAD,
        referencePoints: { pdf: [], map: [] },
        overlay: null,
        error: null,
      };

    case 'ADD_PDF_POINT':
      const newPdfPoints = [...state.referencePoints.pdf, action.payload];
      return {
        ...state,
        referencePoints: {
          ...state.referencePoints,
          pdf: newPdfPoints,
        },
        error: null,
      };

    case 'ADD_MAP_POINT':
      const newMapPoints = [...state.referencePoints.map, action.payload];
      const shouldAdvanceStep = 
        newMapPoints.length === state.referencePoints.pdf.length &&
        newMapPoints.length < 3;
      
      return {
        ...state,
        referencePoints: {
          ...state.referencePoints,
          map: newMapPoints,
        },
        currentStep: shouldAdvanceStep 
          ? state.currentStep + 1 
          : newMapPoints.length === 3 
            ? STEPS.OVERLAY_CREATION 
            : state.currentStep,
        error: null,
      };

    case 'CLEAR_REFERENCE_POINTS':
      return {
        ...state,
        referencePoints: { pdf: [], map: [] },
        currentStep: state.currentPDF ? STEPS.REFERENCE_POINT_1 : STEPS.PDF_UPLOAD,
        overlay: null,
        error: null,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
        error: null,
      };

    case 'NEXT_STEP':
      const nextStep = Math.min(state.currentStep + 1, STEPS.OVERLAY_ADJUSTMENT);
      return {
        ...state,
        currentStep: nextStep,
        error: null,
      };

    case 'PREVIOUS_STEP':
      const prevStep = Math.max(state.currentStep - 1, STEPS.PDF_UPLOAD);
      return {
        ...state,
        currentStep: prevStep,
        error: null,
      };

    case 'SET_OVERLAY':
      return {
        ...state,
        overlay: action.payload,
        currentStep: STEPS.OVERLAY_ADJUSTMENT,
        error: null,
      };

    case 'UPDATE_OVERLAY_POSITION':
      if (!state.overlay) return state;
      
      return {
        ...state,
        overlay: {
          ...state.overlay,
          position: {
            ...state.overlay.position,
            center: action.payload,
          },
          updatedAt: new Date(),
        },
        error: null,
      };

    case 'UPDATE_OVERLAY_OPACITY':
      if (!state.overlay) return state;
      
      return {
        ...state,
        overlay: {
          ...state.overlay,
          opacity: action.payload,
          updatedAt: new Date(),
        },
        error: null,
      };

    case 'SAVE_CONFIG':
      const existingConfigIndex = state.savedConfigs.findIndex(
        config => config.id === action.payload.id
      );
      
      let updatedConfigs;
      if (existingConfigIndex >= 0) {
        // 既存の設定を更新
        updatedConfigs = [...state.savedConfigs];
        updatedConfigs[existingConfigIndex] = action.payload;
      } else {
        // 新しい設定を追加
        updatedConfigs = [...state.savedConfigs, action.payload];
      }
      
      return {
        ...state,
        savedConfigs: updatedConfigs,
        error: null,
      };

    case 'LOAD_CONFIG':
      return {
        ...state,
        currentPDF: new File([action.payload.pdfFile.data], action.payload.pdfFile.name, {
          type: 'application/pdf',
        }),
        referencePoints: action.payload.referencePoints,
        overlay: action.payload,
        currentStep: STEPS.OVERLAY_ADJUSTMENT,
        error: null,
      };

    case 'DELETE_CONFIG':
      return {
        ...state,
        savedConfigs: state.savedConfigs.filter(config => config.id !== action.payload),
        error: null,
      };

    case 'LOAD_SAVED_CONFIGS':
      return {
        ...state,
        savedConfigs: action.payload,
        error: null,
      };

    case 'CLEAR_ALL_CONFIGS':
      return {
        ...state,
        savedConfigs: [],
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'SET_USER_LOCATION':
      return {
        ...state,
        userLocation: action.payload,
        isLocationLoading: false,
        locationError: null,
      };

    case 'SET_LOCATION_LOADING':
      return {
        ...state,
        isLocationLoading: action.payload,
        locationError: action.payload ? null : state.locationError,
      };

    case 'SET_LOCATION_ERROR':
      return {
        ...state,
        locationError: action.payload,
        isLocationLoading: false,
      };

    case 'CLEAR_USER_LOCATION':
      return {
        ...state,
        userLocation: null,
        isLocationLoading: false,
        locationError: null,
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        savedConfigs: state.savedConfigs, // 保存された設定は保持
      };

    default:
      return state;
  }
}