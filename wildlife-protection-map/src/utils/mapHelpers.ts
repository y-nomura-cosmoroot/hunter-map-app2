import type { OverlayConfig } from '../types';

/**
 * オーバーレイIDを生成
 */
export function generateOverlayId(): string {
  return `overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * オーバーレイの境界が有効かチェック
 */
export function validateOverlayBounds(bounds: google.maps.LatLngBounds): boolean {
  try {
    if (!bounds) return false;
    
    const northeast = bounds.getNorthEast();
    const southwest = bounds.getSouthWest();
    
    // 緯度経度の範囲をチェック
    const latValid = southwest.lat() >= -90 && northeast.lat() <= 90;
    const lngValid = southwest.lng() >= -180 && northeast.lng() <= 180;
    const sizeValid = northeast.lat() > southwest.lat() && northeast.lng() > southwest.lng();
    
    return latValid && lngValid && sizeValid;
  } catch (error) {
    console.error('Bounds validation error:', error);
    return false;
  }
}

/**
 * オーバーレイの位置を更新
 */
export function updateOverlayPosition(
  currentBounds: google.maps.LatLngBounds,
  newCenter: { lat: number; lng: number }
): google.maps.LatLngBounds {
  // 現在の境界の幅と高さを計算
  const northeast = currentBounds.getNorthEast();
  const southwest = currentBounds.getSouthWest();
  
  const latSpan = northeast.lat() - southwest.lat();
  const lngSpan = northeast.lng() - southwest.lng();
  
  // 新しい境界を計算
  return new google.maps.LatLngBounds(
    new google.maps.LatLng(
      newCenter.lat - latSpan / 2,
      newCenter.lng - lngSpan / 2
    ),
    new google.maps.LatLng(
      newCenter.lat + latSpan / 2,
      newCenter.lng + lngSpan / 2
    )
  );
}