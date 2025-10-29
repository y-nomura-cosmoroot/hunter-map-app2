import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  GroundOverlay,
  Circle
} from '@react-google-maps/api';
import type { MapPoint, OverlayConfig, PDFPoint } from '../types';
import { generateHighQualityPDFImage } from '../utils/pdfToImage';
import {
  calculateTransformMatrix,
  transformPDFBoundsToGeoBounds
} from '../utils/coordinateTransform';
import { getPDFPageSize } from '../utils/pdfToImage';
import { handleError, reportError } from '../utils/errorHandler';
import { getCurrentLocationMarkerOptions, getReferencePointMarkerOptions } from '../utils/mapIcons';
import './GoogleMapComponent.css';

interface GoogleMapComponentProps {
  onMapClick: (lat: number, lng: number) => void;
  referencePoints: MapPoint[];
  overlay: OverlayConfig | null; // 現在作成中のオーバーレイ
  activeOverlays: OverlayConfig[]; // 表示中のオーバーレイ一覧
  selectedPointIndex: number;
  pdfFile: File | null;
  pdfPoints: PDFPoint[];
  onOverlayCreated: (config: OverlayConfig) => void;
  onOverlayError: (error: string) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
}

// 三重県の中心座標
const mieCenter = { lat: 34.7303, lng: 136.5086 };

// マップのスタイル設定
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// マップのオプション
const mapOptions = {
  center: mieCenter,
  zoom: 10,
  mapTypeId: 'roadmap', // 地図表示に変更
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  gestureHandling: 'cooperative',
  disableDefaultUI: false,
  clickableIcons: false,
  restriction: {
    latLngBounds: {
      north: 35.5,
      south: 33.5,
      east: 137.5,
      west: 135.5,
    },
    strictBounds: false,
  },
};

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  onMapClick,
  referencePoints,
  overlay,
  activeOverlays,
  selectedPointIndex,
  pdfFile,
  pdfPoints,
  onOverlayCreated,
  onOverlayError,
  userLocation,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayImageUrl, setOverlayImageUrl] = useState<string | null>(null);
  const [overlayBounds, setOverlayBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [activeOverlayData, setActiveOverlayData] = useState<Array<{
    id: string;
    imageUrl: string;
    bounds: google.maps.LatLngBounds;
    opacity: number;
  }>>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayCreatedRef = useRef<boolean>(false);
  const originalBoundsRef = useRef<google.maps.LatLngBounds | null>(null);

  // マップクリックハンドラー
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      onMapClick(lat, lng);
    }
  }, [onMapClick]);

  // マップロード完了ハンドラー
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // 現在位置が更新されたときにマップの中心を移動
  useEffect(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      // ズームレベルを調整（現在位置が見つかった場合は少しズームイン）
      if (mapRef.current.getZoom() && mapRef.current.getZoom()! < 14) {
        mapRef.current.setZoom(14);
      }
    }
  }, [userLocation]);

  // 保存されたオーバーレイを表示する処理
  useEffect(() => {
    const displaySavedOverlay = async () => {
      console.log('displaySavedOverlay called:', { 
        hasOverlay: !!overlay, 
        hasPdfFile: !!overlay?.pdfFile, 
        overlayCreated: overlayCreatedRef.current,
        overlayId: overlay?.id 
      });
      
      if (!overlay || !overlay.pdfFile || overlayCreatedRef.current) {
        console.log('displaySavedOverlay early return');
        return;
      }

      try {
        console.log('保存されたオーバーレイを表示中...', overlay);
        setIsLoading(true);
        setError(null);
        overlayCreatedRef.current = true;

        // PDFファイルを再作成
        const pdfFile = new File([overlay.pdfFile.data], overlay.pdfFile.name, {
          type: 'application/pdf',
        });

        // PDFを高品質な画像に変換
        const pdfImage = await generateHighQualityPDFImage(pdfFile, 1, 2048);

        // 保存された境界情報を使用してGoogle Maps LatLngBounds を作成
        let bounds: google.maps.LatLngBounds;
        
        if (overlay.bounds) {
          // 新しい形式の境界データ
          bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(overlay.bounds.south, overlay.bounds.west),
            new google.maps.LatLng(overlay.bounds.north, overlay.bounds.east)
          );
        } else if (overlay.position.bounds) {
          // 古い形式の境界データ
          bounds = overlay.position.bounds;
        } else {
          // 境界データがない場合は中心点から推定
          const center = overlay.position.center;
          const offset = 0.01; // 適当なオフセット
          bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(center.lat - offset, center.lng - offset),
            new google.maps.LatLng(center.lat + offset, center.lng + offset)
          );
        }

        // 画像URLとバウンドを設定
        console.log('Setting overlay image and bounds:', { 
          imageDataLength: pdfImage.imageData.length,
          bounds: {
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng()
          }
        });
        
        setOverlayImageUrl(pdfImage.imageData);
        setOverlayBounds(bounds);
        originalBoundsRef.current = bounds;

        // マップビューを調整
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds);
        }

        console.log('保存されたオーバーレイ表示完了');

      } catch (err) {
        console.error('保存されたオーバーレイ表示エラー:', err);
        overlayCreatedRef.current = false;
        const appError = handleError(err, 'GoogleMapComponent.displaySavedOverlay');
        reportError(appError);
        setError(appError.userMessage);
        onOverlayError(appError.userMessage);
      } finally {
        setIsLoading(false);
      }
    };

    displaySavedOverlay();
  }, [overlay]);

  // アクティブオーバーレイを処理
  useEffect(() => {
    const processActiveOverlays = async () => {
      console.log('Processing active overlays:', activeOverlays);
      
      const overlayDataPromises = activeOverlays.map(async (overlayConfig) => {
        try {
          // PDFファイルを再作成
          const pdfFile = new File([overlayConfig.pdfFile.data], overlayConfig.pdfFile.name, {
            type: 'application/pdf',
          });

          // PDFを高品質な画像に変換
          const pdfImage = await generateHighQualityPDFImage(pdfFile, 1, 2048);

          // 境界情報を復元
          let bounds: google.maps.LatLngBounds;
          
          if (overlayConfig.bounds) {
            bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(overlayConfig.bounds.south, overlayConfig.bounds.west),
              new google.maps.LatLng(overlayConfig.bounds.north, overlayConfig.bounds.east)
            );
          } else {
            // フォールバック: 中心点から推定
            const center = overlayConfig.position.center;
            const offset = 0.01;
            bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(center.lat - offset, center.lng - offset),
              new google.maps.LatLng(center.lat + offset, center.lng + offset)
            );
          }

          return {
            id: overlayConfig.id,
            imageUrl: pdfImage.imageData,
            bounds: bounds,
            opacity: overlayConfig.opacity,
          };
        } catch (error) {
          console.error(`Failed to process overlay ${overlayConfig.id}:`, error);
          return null;
        }
      });

      const overlayData = (await Promise.all(overlayDataPromises)).filter(data => data !== null);
      setActiveOverlayData(overlayData as any[]);
    };

    if (activeOverlays.length > 0) {
      processActiveOverlays();
    } else {
      setActiveOverlayData([]);
    }
  }, [activeOverlays]);

  // オーバーレイの変更を監視
  useEffect(() => {
    console.log('Overlay changed in GoogleMapComponent:', {
      hasOverlay: !!overlay,
      overlayId: overlay?.id,
      overlayName: overlay?.name,
      hasPdfFile: !!overlay?.pdfFile,
      pdfFileName: overlay?.pdfFile?.name,
      hasPosition: !!overlay?.position,
      hasBounds: !!overlay?.bounds,
      overlayCreated: overlayCreatedRef.current,
      activeOverlaysCount: activeOverlays.length
    });
  }, [overlay, activeOverlays]);

  // オーバーレイ作成処理
  useEffect(() => {
    const createOverlay = async () => {
      if (!pdfFile || pdfPoints.length !== 3 || referencePoints.length !== 3 || overlayCreatedRef.current || overlay) {
        return;
      }

      try {
        console.log('オーバーレイ作成開始...');
        setIsLoading(true);
        setError(null);
        overlayCreatedRef.current = true;

        // 変換マトリックスを計算
        const transformMatrix = calculateTransformMatrix(pdfPoints, referencePoints);

        // PDFを高品質な画像に変換
        const pdfImage = await generateHighQualityPDFImage(pdfFile, 1, 2048);

        // PDFページのサイズを取得
        const pageSize = await getPDFPageSize(pdfFile);

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

        // Google Maps LatLngBounds を作成
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(geoBounds.south, geoBounds.west),
          new google.maps.LatLng(geoBounds.north, geoBounds.east)
        );

        // 画像URLとバウンドを設定
        setOverlayImageUrl(pdfImage.imageData);
        setOverlayBounds(bounds);
        originalBoundsRef.current = bounds; // 元の境界を保存

        // オーバーレイ設定を作成
        const config: OverlayConfig = {
          id: `overlay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          name: `${pdfFile.name} - ${new Date().toLocaleString()}`,
          pdfFile: {
            name: pdfFile.name,
            data: (await pdfFile.arrayBuffer()).slice(),
            type: pdfFile.type,
            size: pdfFile.size,
            lastModified: pdfFile.lastModified,
          },
          referencePoints: {
            pdf: pdfPoints,
            map: referencePoints,
          },
          bounds: {
            north: geoBounds.north,
            south: geoBounds.south,
            east: geoBounds.east,
            west: geoBounds.west,
          },
          position: {
            bounds: bounds,
            center: {
              lat: (geoBounds.north + geoBounds.south) / 2,
              lng: (geoBounds.east + geoBounds.west) / 2,
            },
          },
          opacity: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 作成完了をコールバック
        onOverlayCreated(config);

        // マップビューを調整
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds);
        }

        console.log('オーバーレイ作成完了');

      } catch (err) {
        console.error('オーバーレイ作成エラー:', err);
        overlayCreatedRef.current = false;
        const appError = handleError(err, 'GoogleMapComponent.createOverlay');
        reportError(appError);
        setError(appError.userMessage);
        onOverlayError(appError.userMessage);
      } finally {
        setIsLoading(false);
      }
    };

    createOverlay();
  }, [pdfFile, pdfPoints, referencePoints, onOverlayCreated, onOverlayError]);

  // PDFファイルが変更されたときに作成済みフラグをリセット
  useEffect(() => {
    console.log('PDF file changed, resetting overlay state');
    overlayCreatedRef.current = false;
    setOverlayImageUrl(null);
    setOverlayBounds(null);
    originalBoundsRef.current = null;
  }, [pdfFile]);

  // オーバーレイIDが変更されたときに作成済みフラグをリセット
  useEffect(() => {
    console.log('Overlay ID changed, resetting overlay state:', overlay?.id);
    overlayCreatedRef.current = false;
  }, [overlay?.id]);

  // オーバーレイの位置更新処理
  useEffect(() => {
    if (overlay && originalBoundsRef.current) {
      const originalBounds = originalBoundsRef.current;
      const newCenter = overlay.position.center;
      
      // 元の境界の幅と高さを計算
      const northeast = originalBounds.getNorthEast();
      const southwest = originalBounds.getSouthWest();
      const latSpan = northeast.lat() - southwest.lat();
      const lngSpan = northeast.lng() - southwest.lng();
      
      // 新しい境界を計算
      const newBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(
          newCenter.lat - latSpan / 2,
          newCenter.lng - lngSpan / 2
        ),
        new google.maps.LatLng(
          newCenter.lat + latSpan / 2,
          newCenter.lng + lngSpan / 2
        )
      );
      
      setOverlayBounds(newBounds);
    }
  }, [overlay?.position.center.lat, overlay?.position.center.lng]);

  if (error) {
    return (
      <div className="map-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="google-map-container">
      {isLoading && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>オーバーレイを作成中...</p>
        </div>
      )}

      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
        libraries={['maps']}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          options={mapOptions}
          onClick={handleMapClick}
          onLoad={onMapLoad}
        >
          {/* 基準点マーカー */}
          {referencePoints.map((point, index) => (
            <Marker
              key={`marker-${index}`}
              position={{ lat: point.lat, lng: point.lng }}
              {...getReferencePointMarkerOptions(index + 1, index === selectedPointIndex)}
            />
          ))}

          {/* 現在位置の精度円 */}
          {userLocation && userLocation.accuracy && userLocation.accuracy > 10 && (
            <Circle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={userLocation.accuracy}
              options={{
                fillColor: '#1a73e8',
                fillOpacity: 0.08,
                strokeColor: '#1a73e8',
                strokeOpacity: 0.25,
                strokeWeight: 1,
              }}
            />
          )}

          {/* 現在位置マーカー（点滅アニメーション付き） */}
          {userLocation && (
            <Marker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              {...getCurrentLocationMarkerOptions(true)}
            />
          )}

          {/* 保存されたオーバーレイ一覧 */}
          {activeOverlayData.map((overlayData) => (
            <GroundOverlay
              key={overlayData.id}
              url={overlayData.imageUrl}
              bounds={{
                north: overlayData.bounds.getNorthEast().lat(),
                south: overlayData.bounds.getSouthWest().lat(),
                east: overlayData.bounds.getNorthEast().lng(),
                west: overlayData.bounds.getSouthWest().lng(),
              }}
              opacity={overlayData.opacity}
            />
          ))}

          {/* 現在作成中のオーバーレイ */}
          {overlayImageUrl && overlayBounds && (
            <GroundOverlay
              url={overlayImageUrl}
              bounds={{
                north: overlayBounds.getNorthEast().lat(),
                south: overlayBounds.getSouthWest().lat(),
                east: overlayBounds.getNorthEast().lng(),
                west: overlayBounds.getSouthWest().lng(),
              }}
              opacity={overlay?.opacity || 0.7}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default GoogleMapComponent;