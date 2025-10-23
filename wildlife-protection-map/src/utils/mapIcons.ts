/**
 * Google Maps用のカスタムアイコンを生成するユーティリティ
 */

/**
 * 現在位置用のカスタムアイコンSVGを生成
 * @param size アイコンのサイズ
 * @param color メインカラー
 * @param pulseColor 点滅時のカラー
 * @returns SVGデータURL
 */
export const createCurrentLocationIcon = (
  size: number = 24,
  color: string = '#1a73e8',
  pulseColor: string = '#4285f4'
): string => {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .pulse-ring {
            animation: pulse-ring 2s ease-out infinite;
            transform-origin: center;
          }
          @keyframes pulse-ring {
            0% {
              opacity: 0.8;
              transform: scale(0.8);
            }
            100% {
              opacity: 0;
              transform: scale(1.4);
            }
          }
        </style>
      </defs>
      <!-- 外側の点滅リング -->
      <circle class="pulse-ring" cx="12" cy="12" r="8" fill="none" stroke="${pulseColor}" stroke-width="2" opacity="0.6"/>
      <!-- 内側の固定円 -->
      <circle cx="12" cy="12" r="6" fill="${color}" stroke="white" stroke-width="2"/>
      <!-- 中心点 -->
      <circle cx="12" cy="12" r="2" fill="white"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * 現在位置用の静的アイコン（点滅なし）を生成
 * @param size アイコンのサイズ
 * @param color メインカラー
 * @returns SVGデータURL
 */
export const createStaticLocationIcon = (
  size: number = 20,
  color: string = '#1a73e8'
): string => {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <!-- 外側の円 -->
      <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
      <!-- 中心点 -->
      <circle cx="10" cy="10" r="3" fill="white"/>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * 基準点用のカスタムアイコンを生成
 * @param number 基準点の番号
 * @param isSelected 選択状態かどうか
 * @param size アイコンのサイズ
 * @returns SVGデータURL
 */
export const createReferencePointIcon = (
  number: number,
  isSelected: boolean = false,
  size: number = 30
): string => {
  const color = isSelected ? '#ff4444' : '#4285f4';
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <!-- 外側の円 -->
      <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2"/>
      <!-- 番号テキスト -->
      <text x="15" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${number}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * 現在位置マーカー用のGoogle Maps MarkerOptionsを生成
 * @param animated 点滅アニメーションを有効にするか
 * @returns Partial<google.maps.MarkerOptions>
 */
export const getCurrentLocationMarkerOptions = (animated: boolean = true): any => {
  if (animated) {
    return {
      icon: {
        url: createCurrentLocationIcon(24, '#1a73e8', '#4285f4'),
        scaledSize: typeof google !== 'undefined' ? new google.maps.Size(24, 24) : { width: 24, height: 24 },
        anchor: typeof google !== 'undefined' ? new google.maps.Point(12, 12) : { x: 12, y: 12 },
      },
      zIndex: 1000,
      title: '現在位置',
      optimized: false, // SVGアニメーションを有効にするため
    };
  } else {
    return {
      icon: {
        url: createStaticLocationIcon(20, '#1a73e8'),
        scaledSize: typeof google !== 'undefined' ? new google.maps.Size(20, 20) : { width: 20, height: 20 },
        anchor: typeof google !== 'undefined' ? new google.maps.Point(10, 10) : { x: 10, y: 10 },
      },
      zIndex: 1000,
      title: '現在位置',
    };
  }
};

/**
 * 基準点マーカー用のGoogle Maps MarkerOptionsを生成
 * @param number 基準点の番号
 * @param isSelected 選択状態かどうか
 * @returns Partial<google.maps.MarkerOptions>
 */
export const getReferencePointMarkerOptions = (
  number: number,
  isSelected: boolean = false
): any => {
  return {
    icon: {
      url: createReferencePointIcon(number, isSelected, 30),
      scaledSize: typeof google !== 'undefined' ? new google.maps.Size(30, 30) : { width: 30, height: 30 },
      anchor: typeof google !== 'undefined' ? new google.maps.Point(15, 15) : { x: 15, y: 15 },
    },
    zIndex: isSelected ? 999 : 998,
    title: `基準点 ${number}`,
  };
};