import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ApplicationState, ApplicationAction } from '../types';
import { applicationReducer, initialState } from './reducer';
import { loadConfigs, saveConfigs } from '../utils/simpleStorage';
import { handleError, reportError, getUserFriendlyMessage } from '../utils/errorHandler';
import type { OverlayConfig } from '../types';

// Context型定義
interface ApplicationContextType {
  state: ApplicationState;
  dispatch: React.Dispatch<ApplicationAction>;
}

// Context作成
const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

// Provider Props型定義
interface ApplicationProviderProps {
  children: ReactNode;
}

// Provider コンポーネント
export function ApplicationProvider({ children }: ApplicationProviderProps) {
  const [state, dispatch] = useReducer(applicationReducer, initialState);

  // デバウンス用のタイマー
  const saveTimeoutRef = React.useRef<number | undefined>(undefined);

  // LocalStorageから保存された設定を読み込み
  useEffect(() => {
    const loadSavedConfigs = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const configs = await loadConfigs(); // awaitを追加
        
        console.log('Loaded configs from storage:', configs);
        
        // 保存された設定を状態に設定
        dispatch({ type: 'LOAD_SAVED_CONFIGS', payload: configs });
      } catch (error) {
        const appError = handleError(error, 'ApplicationProvider.loadSavedConfigs');
        reportError(appError);
        
        const userMessage = getUserFriendlyMessage(appError);
        dispatch({ type: 'SET_ERROR', payload: userMessage });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadSavedConfigs();
  }, []);

  // 設定が変更されたときにLocalStorageに保存（デバウンス付き）
  useEffect(() => {
    const saveCurrentConfigs = async () => {
      try {
        if (state.savedConfigs.length >= 0) { // 空配列でも保存する
          await saveConfigs(state.savedConfigs); // awaitを追加
        }
      } catch (error) {
        const appError = handleError(error, 'ApplicationProvider.saveCurrentConfigs');
        reportError(appError);
        
        const userMessage = getUserFriendlyMessage(appError);
        dispatch({ type: 'SET_ERROR', payload: userMessage });
      }
    };

    // デバウンス処理：連続した変更を500ms遅延させて保存
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      // 初期読み込み時は保存をスキップ
      if (state.savedConfigs.length > 0 || state.savedConfigs.length === 0) {
        saveCurrentConfigs();
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.savedConfigs]);

  // Context値をメモ化
  const contextValue: ApplicationContextType = useMemo(() => ({
    state,
    dispatch,
  }), [state, dispatch]);

  return (
    <ApplicationContext.Provider value={contextValue}>
      {children}
    </ApplicationContext.Provider>
  );
}

// Custom Hook
export function useApplication(): ApplicationContextType {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
}

// 便利なカスタムフック
export function useApplicationState(): ApplicationState {
  const { state } = useApplication();
  return state;
}

export function useApplicationDispatch(): React.Dispatch<ApplicationAction> {
  const { dispatch } = useApplication();
  return dispatch;
}

// ストレージ操作用のカスタムフック（最適化版）
export function useStorageOperations() {
  const { dispatch } = useApplication();

  const saveConfigToStorage = useCallback(async (config: OverlayConfig) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SAVE_CONFIG', payload: config });
    } catch (error) {
      const appError = handleError(error, 'useStorageOperations.saveConfigToStorage');
      reportError(appError);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: getUserFriendlyMessage(appError)
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const deleteConfigFromStorage = useCallback(async (configId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'DELETE_CONFIG', payload: configId });
    } catch (error) {
      const appError = handleError(error, 'useStorageOperations.deleteConfigFromStorage');
      reportError(appError);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: getUserFriendlyMessage(appError)
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const clearAllConfigs = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ALL_CONFIGS' });
    } catch (error) {
      const appError = handleError(error, 'useStorageOperations.clearAllConfigs');
      reportError(appError);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: getUserFriendlyMessage(appError)
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  return useMemo(() => ({
    saveConfigToStorage,
    deleteConfigFromStorage,
    clearAllConfigs,
  }), [saveConfigToStorage, deleteConfigFromStorage, clearAllConfigs]);
}