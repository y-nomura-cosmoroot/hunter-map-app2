import React, { useCallback, useEffect, useRef } from 'react';
import { useApplicationState, useApplicationDispatch } from '../store';
import { getCurrentPosition, watchPosition, clearWatch, isInMiePrefecture } from '../utils/geolocation';
import { handleError, reportError } from '../utils/errorHandler';
import './LocationControls.css';

interface LocationControlsProps {
  onLocationFound?: (lat: number, lng: number) => void;
}

const LocationControls: React.FC<LocationControlsProps> = ({ onLocationFound }) => {
  const state = useApplicationState();
  const dispatch = useApplicationDispatch();
  const watchIdRef = useRef<number | null>(null);

  // 現在位置を一度だけ取得
  const handleGetCurrentLocation = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOCATION_LOADING', payload: true });
      }
      dispatch({ type: 'SET_LOCATION_ERROR', payload: null });

      const location = await getCurrentPosition();
      
      dispatch({ type: 'SET_USER_LOCATION', payload: location });
      
      // 位置が見つかったことを親コンポーネントに通知
      if (onLocationFound) {
        onLocationFound(location.lat, location.lng);
      }

      // 三重県外の場合は警告を表示
      if (!isInMiePrefecture(location.lat, location.lng)) {
        dispatch({ 
          type: 'SET_LOCATION_ERROR', 
          payload: '現在位置が三重県外のようです。マップの表示範囲を確認してください。' 
        });
      }

    } catch (error) {
      const appError = handleError(error, 'LocationControls.getCurrentLocation');
      reportError(appError);
      dispatch({ type: 'SET_LOCATION_ERROR', payload: appError.userMessage });
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOCATION_LOADING', payload: false });
      }
    }
  }, [dispatch, onLocationFound]);

  // 位置情報の監視を開始
  const handleStartWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      return; // 既に監視中
    }

    dispatch({ type: 'SET_LOCATION_LOADING', payload: true });
    dispatch({ type: 'SET_LOCATION_ERROR', payload: null });

    const watchId = watchPosition(
      (location) => {
        dispatch({ type: 'SET_USER_LOCATION', payload: location });
        dispatch({ type: 'SET_LOCATION_LOADING', payload: false });
        
        if (onLocationFound) {
          onLocationFound(location.lat, location.lng);
        }

        // 三重県外の場合は警告を表示
        if (!isInMiePrefecture(location.lat, location.lng)) {
          dispatch({ 
            type: 'SET_LOCATION_ERROR', 
            payload: '現在位置が三重県外のようです。マップの表示範囲を確認してください。' 
          });
        }
      },
      (error) => {
        const appError = handleError(error, 'LocationControls.watchPosition');
        reportError(appError);
        dispatch({ type: 'SET_LOCATION_ERROR', payload: appError.userMessage });
        dispatch({ type: 'SET_LOCATION_LOADING', payload: false });
      }
    );

    if (watchId !== null) {
      watchIdRef.current = watchId;
    }
  }, [dispatch, onLocationFound]);

  // 位置情報の監視を停止
  const handleStopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    dispatch({ type: 'SET_LOCATION_LOADING', payload: false });
  }, [dispatch]);

  // 位置情報をクリア
  const handleClearLocation = useCallback(() => {
    handleStopWatching();
    dispatch({ type: 'CLEAR_USER_LOCATION' });
  }, [dispatch, handleStopWatching]);

  // コンポーネントマウント時に自動で位置情報を取得
  useEffect(() => {
    // 初回マウント時に自動で位置情報を取得（ローディング表示なし）
    handleGetCurrentLocation(false);
  }, [handleGetCurrentLocation]);

  // コンポーネントのアンマウント時に監視を停止
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 位置情報の精度を表示用にフォーマット
  const formatAccuracy = (accuracy?: number): string => {
    if (!accuracy) return '不明';
    if (accuracy < 10) return '高精度';
    if (accuracy < 50) return '中精度';
    return '低精度';
  };

  // 最終更新時刻をフォーマット
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('ja-JP');
  };

  return (
    <div className="location-controls">
      <div className="location-header">
        <h4>現在位置</h4>
        <div className="location-status">
          {state.isLocationLoading && (
            <span className="status-loading">
              <span className="spinner-small"></span>
              取得中...
            </span>
          )}
          {state.userLocation && !state.isLocationLoading && (
            <span className="status-success">✓ 取得済み</span>
          )}
          {state.locationError && !state.isLocationLoading && (
            <span className="status-error">⚠ エラー</span>
          )}
        </div>
      </div>

      <div className="location-buttons">
        <button
          onClick={() => handleGetCurrentLocation(true)}
          disabled={state.isLocationLoading}
          className="btn btn-primary"
          title="現在位置を一度だけ取得"
        >
          📍 現在位置を取得
        </button>

        {watchIdRef.current === null ? (
          <button
            onClick={handleStartWatching}
            disabled={state.isLocationLoading}
            className="btn btn-secondary"
            title="位置情報の監視を開始（移動に追従）"
          >
            🔄 追跡開始
          </button>
        ) : (
          <button
            onClick={handleStopWatching}
            className="btn btn-secondary"
            title="位置情報の監視を停止"
          >
            ⏹ 追跡停止
          </button>
        )}

        {state.userLocation && (
          <button
            onClick={handleClearLocation}
            className="btn btn-outline"
            title="位置情報をクリア"
          >
            🗑 クリア
          </button>
        )}
      </div>

      {state.userLocation && (
        <div className="location-info">
          <div className="location-success-banner">
            <span className="success-icon">📍</span>
            <span className="success-text">現在位置を取得しました</span>
          </div>
          <div className="location-coords">
            <div className="coord-item">
              <span className="coord-label">緯度:</span>
              <span className="coord-value">{state.userLocation.lat.toFixed(6)}</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">経度:</span>
              <span className="coord-value">{state.userLocation.lng.toFixed(6)}</span>
            </div>
          </div>
          <div className="location-meta">
            <div className="meta-item">
              <span className="meta-label">精度:</span>
              <span className="meta-value">
                {formatAccuracy(state.userLocation.accuracy)}
                {state.userLocation.accuracy && ` (±${Math.round(state.userLocation.accuracy)}m)`}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">更新:</span>
              <span className="meta-value">{formatTimestamp(state.userLocation.timestamp)}</span>
            </div>
          </div>
        </div>
      )}

      {state.locationError && (
        <div className="location-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{state.locationError}</span>
        </div>
      )}
    </div>
  );
};

export default LocationControls;