import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  LoadScript,
  Marker,
  GroundOverlay
} from '@react-google-maps/api';
import type { MapPoint, OverlayConfig, PDFPoint } from '../types';
import { generateHighQualityPDFImage } from '../utils/pdfToImage';
import {
  calculateTransformMatrix,
  transformPDFBoundsToGeoBounds
} from '../utils/coordinateTransform';
import { getPDFPageSize } from '../utils/pdfToImage';
import { handleError, reportError } from '../utils/errorHandler';
import './GoogleMapComponent.css';

interface GoogleMapComponentProps {
  onMapClick: (lat: number, lng: number) => void;
  referencePoints: MapPoint[];
  overlay: OverlayConfig | null;
  selectedPointIndex: number;
  pdfFile: File | null;
  pdfPoints: PDFPoint[];
  onOverlayCreated: (config: OverlayConfig) => void;
  onOverlayError: (error: string) => void;
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
  mapTypeId: 'hybrid',
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
  selectedPointIndex,
  pdfFile,
  pdfPoints,
  onOverlayCreated,
  onOverlayError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayImageUrl, setOverlayImageUrl] = useState<string | null>(null);
  const [overlayBounds, setOverlayBounds] = useState<google.maps.LatLngBounds | null>(null);
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

  // オーバーレイ作成処理
  useEffect(() => {
    const createOverlay = async () => {
      if (!pdfFile || pdfPoints.length !== 3 || referencePoints.length !== 3 || overlayCreatedRef.current) {
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
          id: `overlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `${pdfFile.name} - ${new Date().toLocaleString()}`,
          pdfFile: {
            name: pdfFile.name,
            data: (await pdfFile.arrayBuffer()).slice(),
          },
          referencePoints: {
            pdf: pdfPoints,
            map: referencePoints,
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
    overlayCreatedRef.current = false;
    setOverlayImageUrl(null);
    setOverlayBounds(null);
    originalBoundsRef.current = null;
  }, [pdfFile]);

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
              label={{
                text: `${index + 1}`,
                color: 'white',
                fontWeight: 'bold',
              }}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
                scale: 15,
                fillColor: index === selectedPointIndex ? '#ff4444' : '#4285f4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Ground Overlay */}
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