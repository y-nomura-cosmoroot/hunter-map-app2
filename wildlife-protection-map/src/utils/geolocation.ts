import type { UserLocation } from '../types';

// 位置情報取得のオプション
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1分間キャッシュ
};

// 位置情報取得エラーメッセージ
const ERROR_MESSAGES = {
  PERMISSION_DENIED: '位置情報の取得が拒否されました。ブラウザの設定で位置情報を許可してください。',
  POSITION_UNAVAILABLE: '位置情報を取得できませんでした。GPS機能を確認してください。',
  TIMEOUT: '位置情報の取得がタイムアウトしました。再度お試しください。',
  NOT_SUPPORTED: 'このブラウザは位置情報機能をサポートしていません。',
  UNKNOWN: '位置情報の取得中に不明なエラーが発生しました。',
};

/**
 * 現在位置を取得する
 * @returns Promise<UserLocation>
 */
export const getCurrentPosition = (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    // Geolocation APIがサポートされているかチェック
    if (!navigator.geolocation) {
      reject(new Error(ERROR_MESSAGES.NOT_SUPPORTED));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        resolve(userLocation);
      },
      (error) => {
        let errorMessage: string;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = ERROR_MESSAGES.PERMISSION_DENIED;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = ERROR_MESSAGES.POSITION_UNAVAILABLE;
            break;
          case error.TIMEOUT:
            errorMessage = ERROR_MESSAGES.TIMEOUT;
            break;
          default:
            errorMessage = ERROR_MESSAGES.UNKNOWN;
        }
        
        reject(new Error(errorMessage));
      },
      GEOLOCATION_OPTIONS
    );
  });
};

/**
 * 位置情報の監視を開始する
 * @param onSuccess 位置情報取得成功時のコールバック
 * @param onError エラー時のコールバック
 * @returns watchId (監視を停止するために使用)
 */
export const watchPosition = (
  onSuccess: (location: UserLocation) => void,
  onError: (error: string) => void
): number | null => {
  if (!navigator.geolocation) {
    onError(ERROR_MESSAGES.NOT_SUPPORTED);
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const userLocation: UserLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      onSuccess(userLocation);
    },
    (error) => {
      let errorMessage: string;
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = ERROR_MESSAGES.PERMISSION_DENIED;
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = ERROR_MESSAGES.POSITION_UNAVAILABLE;
          break;
        case error.TIMEOUT:
          errorMessage = ERROR_MESSAGES.TIMEOUT;
          break;
        default:
          errorMessage = ERROR_MESSAGES.UNKNOWN;
      }
      
      onError(errorMessage);
    },
    GEOLOCATION_OPTIONS
  );
};

/**
 * 位置情報の監視を停止する
 * @param watchId watchPositionから返されたID
 */
export const clearWatch = (watchId: number): void => {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * 2点間の距離を計算する（メートル単位）
 * @param lat1 地点1の緯度
 * @param lng1 地点1の経度
 * @param lat2 地点2の緯度
 * @param lng2 地点2の経度
 * @returns 距離（メートル）
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 位置情報が三重県内かどうかをチェックする
 * @param lat 緯度
 * @param lng 経度
 * @returns 三重県内の場合true
 */
export const isInMiePrefecture = (lat: number, lng: number): boolean => {
  // 三重県の大まかな境界
  const MIE_BOUNDS = {
    north: 35.2,
    south: 33.7,
    east: 137.0,
    west: 135.8,
  };

  return (
    lat >= MIE_BOUNDS.south &&
    lat <= MIE_BOUNDS.north &&
    lng >= MIE_BOUNDS.west &&
    lng <= MIE_BOUNDS.east
  );
};