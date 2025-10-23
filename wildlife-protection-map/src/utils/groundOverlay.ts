import type { PDFPoint, MapPoint, OverlayConfig } from '../types';
import {
  calculateTransformMatrix,
  transformPDFBoundsToGeoBounds,
  type TransformMatrix
} from './coordinateTransform';
import { generateHighQualityPDFImage, getPDFPageSize } from './pdfToImage';

/**
 * Ground Overlay の設定
 */
export interface GroundOverlayOptions {
  opacity: number;
  clickable: boolean;
}

/**
 * Ground Overlay を作成してGoogle Mapsに追加
 * 
 * @param map Google Maps インスタンス
 * @param pdfFile PDFファイル
 * @param pdfPoints PDF上の基準点
 * @param mapPoints 地図上の基準点
 * @param options オーバーレイオプション
 * @returns Ground Overlay インスタンスと設定情報
 */
export async function createGroundOverlay(
  map: any, // google.maps.Map
  pdfFile: File,
  pdfPoints: PDFPoint[],
  mapPoints: MapPoint[],
  options: GroundOverlayOptions = { opacity: 0.7, clickable: false }
): Promise<{
  overlay: any; // google.maps.GroundOverlay
  config: OverlayConfig;
  transformMatrix: TransformMatrix;
}> {
  try {
    console.log('オーバーレイ作成開始:', { pdfFile: pdfFile.name, pdfPoints, mapPoints });

    // 基準点の数をチェック
    if (pdfPoints.length !== 3 || mapPoints.length !== 3) {
      throw new Error('基準点は正確に3つ必要です');
    }

    console.log('変換マトリックス計算中...');
    // 変換マトリックスを計算
    const transformMatrix = calculateTransformMatrix(pdfPoints, mapPoints);
    console.log('変換マトリックス計算完了:', transformMatrix);

    console.log('PDFページサイズ取得中...');
    // PDFページのサイズを取得
    const pageSize = await getPDFPageSize(pdfFile);
    console.log('PDFページサイズ取得完了:', pageSize);

    console.log('PDF画像変換中...');
    // PDFを高品質な画像に変換
    const pdfImage = await generateHighQualityPDFImage(pdfFile, 1, 2048);
    console.log('PDF画像変換完了:', { width: pdfImage.width, height: pdfImage.height });

    console.log('地理座標変換中...');
    // PDF境界を地理座標に変換
    const geoBounds = transformPDFBoundsToGeoBounds(
      {
        minX: 0,
        minY: 0,
        maxX: pageSize.width,
        maxY: pageSize.height,
      },
      transformMatrix
    );
    console.log('地理座標変換完了:', geoBounds);

    // Google Maps LatLngBounds を作成
    const bounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(geoBounds.south, geoBounds.west),
      new window.google.maps.LatLng(geoBounds.north, geoBounds.east)
    );

    console.log('Ground Overlay作成中...');
    // Ground Overlay を作成
    const overlay = new window.google.maps.GroundOverlay(
      pdfImage.imageData,
      bounds,
      {
        opacity: options.opacity,
        clickable: options.clickable,
      }
    );

    // マップに追加
    overlay.setMap(map);
    console.log('Ground Overlay作成完了');

    // ArrayBufferのdetached問題を回避するため、新しいArrayBufferを作成
    const originalBuffer = await pdfFile.arrayBuffer();
    const pdfData = originalBuffer.slice(); // 新しいArrayBufferを作成

    // オーバーレイ設定を作成
    const config: OverlayConfig = {
      id: generateOverlayId(),
      name: `${pdfFile.name} - ${new Date().toLocaleString()}`,
      pdfFile: {
        name: pdfFile.name,
        data: pdfData,
      },
      referencePoints: {
        pdf: pdfPoints,
        map: mapPoints,
      },
      position: {
        bounds: bounds,
        center: {
          lat: (geoBounds.north + geoBounds.south) / 2,
          lng: (geoBounds.east + geoBounds.west) / 2,
        },
      },
      opacity: options.opacity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      overlay,
      config,
      transformMatrix,
    };
  } catch (error) {
    console.error('Ground Overlay creation error:', error);
    throw new Error(`Ground Overlayの作成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ground Overlay の位置を更新
 * 
 * @param overlay Ground Overlay インスタンス
 * @param newCenter 新しい中心座標
 * @param currentBounds 現在の境界
 * @returns 更新された境界
 */
export function updateOverlayPosition(
  overlay: any, // google.maps.GroundOverlay
  newCenter: MapPoint,
  currentBounds: any // google.maps.LatLngBounds
): any {
  try {
    // 現在の境界の幅と高さを計算
    const northeast = currentBounds.getNorthEast();
    const southwest = currentBounds.getSouthWest();

    const latSpan = northeast.lat() - southwest.lat();
    const lngSpan = northeast.lng() - southwest.lng();

    // 新しい境界を計算
    const newBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(
        newCenter.lat - latSpan / 2,
        newCenter.lng - lngSpan / 2
      ),
      new window.google.maps.LatLng(
        newCenter.lat + latSpan / 2,
        newCenter.lng + lngSpan / 2
      )
    );

    // オーバーレイの境界を更新
    overlay.setBounds(newBounds);

    return newBounds;
  } catch (error) {
    console.error('Overlay position update error:', error);
    throw new Error(`オーバーレイ位置の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ground Overlay の透明度を更新
 * 
 * @param overlay Ground Overlay インスタンス
 * @param opacity 新しい透明度（0.0-1.0）
 */
export function updateOverlayOpacity(
  overlay: any, // google.maps.GroundOverlay
  opacity: number
): void {
  try {
    // 透明度の範囲をチェック
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    overlay.setOpacity(clampedOpacity);
  } catch (error) {
    console.error('Overlay opacity update error:', error);
    throw new Error(`オーバーレイ透明度の更新に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ground Overlay をマップから削除
 * 
 * @param overlay Ground Overlay インスタンス
 */
export function removeGroundOverlay(overlay: any): void {
  try {
    if (overlay) {
      overlay.setMap(null);
    }
  } catch (error) {
    console.error('Overlay removal error:', error);
  }
}

/**
 * 保存された設定からGround Overlayを復元
 * 
 * @param map Google Maps インスタンス
 * @param config 保存されたオーバーレイ設定
 * @returns 復元されたGround Overlay
 */
export async function restoreGroundOverlay(
  map: any, // google.maps.Map
  config: OverlayConfig
): Promise<{
  overlay: any;
  transformMatrix: TransformMatrix;
}> {
  try {
    // PDFファイルを復元
    const pdfFile = new File([config.pdfFile.data], config.pdfFile.name, {
      type: 'application/pdf',
    });

    // 変換マトリックスを再計算
    const transformMatrix = calculateTransformMatrix(
      config.referencePoints.pdf,
      config.referencePoints.map
    );

    // PDFを画像に変換
    const pdfImage = await generateHighQualityPDFImage(pdfFile, 1, 2048);

    // Ground Overlay を作成
    const overlay = new window.google.maps.GroundOverlay(
      pdfImage.imageData,
      config.position.bounds,
      {
        opacity: config.opacity,
        clickable: false,
        zIndex: 1,
      }
    );

    // マップに追加
    overlay.setMap(map);

    return {
      overlay,
      transformMatrix,
    };
  } catch (error) {
    console.error('Overlay restoration error:', error);
    throw new Error(`オーバーレイの復元に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * オーバーレイIDを生成
 * 
 * @returns ユニークなID
 */
function generateOverlayId(): string {
  return `overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * オーバーレイの境界が有効かチェック
 * 
 * @param bounds Google Maps LatLngBounds
 * @returns 有効性
 */
export function validateOverlayBounds(bounds: any): boolean {
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
 * オーバーレイのメタデータを取得
 * 
 * @param overlay Ground Overlay インスタンス
 * @returns メタデータ
 */
export function getOverlayMetadata(overlay: any): {
  bounds: any;
  opacity: number;
  url: string;
  visible: boolean;
} {
  try {
    return {
      bounds: overlay.getBounds(),
      opacity: overlay.getOpacity(),
      url: overlay.getUrl(),
      visible: overlay.getMap() !== null,
    };
  } catch (error) {
    console.error('Overlay metadata error:', error);
    throw new Error(`オーバーレイメタデータの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}