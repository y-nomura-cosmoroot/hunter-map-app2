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

  return (
    <div className="location-controls-header">
      <div className="location-buttons-compact">
        <button
          onClick={() => handleGetCurrentLocation(true)}
          disabled={state.isLocationLoading}
          className="btn-header btn-primary"
          title="現在位置を取得"
        >
          {state.isLocationLoading ? (
            <>
              <span className="spinner-small"></span>
              取得中...
            </>
          ) : (
            <>
              📍 現在位置を再度取得
            </>
          )}
        </button>

        {watchIdRef.current === null ? (
          <button
            onClick={handleStartWatching}
            disabled={state.isLocationLoading}
            className="btn-header btn-secondary"
            title="位置情報の監視を開始（移動に追従）"
          >
            🔄 現在位置を追跡
          </button>
        ) : (
          <button
            onClick={handleStopWatching}
            className="btn-header btn-active"
            title="位置情報の監視を停止"
          >
            ⏹ 停止
          </button>
        )}
      </div>

      {state.locationError && (
        <div className="location-error-compact">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{state.locationError}</span>
        </div>
      )}
    </div>
  );
};

export default LocationControls;