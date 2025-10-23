import type { PDFPoint, MapPoint } from '../types';

/**
 * 座標変換マトリックス
 * アフィン変換を使用してPDF座標を地理座標に変換
 */
export interface TransformMatrix {
  a: number; // x方向のスケール
  b: number; // x方向のスキュー
  c: number; // y方向のスキュー
  d: number; // y方向のスケール
  e: number; // x方向の平行移動
  f: number; // y方向の平行移動
}

/**
 * 3点の基準点から変換マトリックスを計算
 * アフィン変換の6つのパラメータを求める
 * 
 * @param pdfPoints PDF上の3つの基準点
 * @param mapPoints 地図上の対応する3つの基準点
 * @returns 変換マトリックス
 */
export function calculateTransformMatrix(
  pdfPoints: PDFPoint[],
  mapPoints: MapPoint[]
): TransformMatrix {
  if (pdfPoints.length !== 3 || mapPoints.length !== 3) {
    throw new Error('基準点は正確に3つ必要です');
  }

  // PDF座標系の点
  const [p1, p2, p3] = pdfPoints;
  // 地理座標系の点
  const [m1, m2, m3] = mapPoints;

  // 連立方程式を解いてアフィン変換のパラメータを求める
  // x' = ax + by + e
  // y' = cx + dy + f
  
  // 係数行列を作成
  const A = [
    [p1.x, p1.y, 1, 0, 0, 0],
    [0, 0, 0, p1.x, p1.y, 1],
    [p2.x, p2.y, 1, 0, 0, 0],
    [0, 0, 0, p2.x, p2.y, 1],
    [p3.x, p3.y, 1, 0, 0, 0],
    [0, 0, 0, p3.x, p3.y, 1]
  ];

  // 結果ベクトル
  const B = [m1.lng, m1.lat, m2.lng, m2.lat, m3.lng, m3.lat];

  // ガウス消去法で連立方程式を解く
  const solution = solveLinearSystem(A, B);

  return {
    a: solution[0], // x -> lng のスケール
    b: solution[1], // y -> lng のスキュー
    e: solution[2], // lng の平行移動
    c: solution[3], // x -> lat のスキュー
    d: solution[4], // y -> lat のスケール
    f: solution[5]  // lat の平行移動
  };
}

/**
 * ガウス消去法で連立方程式を解く
 * 
 * @param A 係数行列
 * @param B 結果ベクトル
 * @returns 解ベクトル
 */
function solveLinearSystem(A: number[][], B: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, B[i]]);

  // 前進消去
  for (let i = 0; i < n; i++) {
    // ピボット選択
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // 行を交換
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // 特異行列チェック
    if (Math.abs(augmented[i][i]) < 1e-10) {
      throw new Error('変換マトリックスの計算に失敗しました。基準点が一直線上にある可能性があります。');
    }

    // 消去
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // 後退代入
  const solution = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    solution[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      solution[i] -= augmented[i][j] * solution[j];
    }
    solution[i] /= augmented[i][i];
  }

  return solution;
}

/**
 * PDF座標を地理座標に変換
 * 
 * @param pdfPoint PDF上の座標
 * @param matrix 変換マトリックス
 * @returns 地理座標
 */
export function transformPDFToGeo(
  pdfPoint: { x: number; y: number },
  matrix: TransformMatrix
): MapPoint {
  const lng = matrix.a * pdfPoint.x + matrix.b * pdfPoint.y + matrix.e;
  const lat = matrix.c * pdfPoint.x + matrix.d * pdfPoint.y + matrix.f;

  return { lat, lng };
}

/**
 * 地理座標をPDF座標に変換（逆変換）
 * 
 * @param mapPoint 地理座標
 * @param matrix 変換マトリックス
 * @returns PDF座標
 */
export function transformGeoToPDF(
  mapPoint: MapPoint,
  matrix: TransformMatrix
): { x: number; y: number } {
  // 逆行列を計算
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  
  if (Math.abs(det) < 1e-10) {
    throw new Error('変換マトリックスが特異です。逆変換できません。');
  }

  const invA = matrix.d / det;
  const invB = -matrix.b / det;
  const invC = -matrix.c / det;
  const invD = matrix.a / det;
  const invE = (matrix.b * matrix.f - matrix.d * matrix.e) / det;
  const invF = (matrix.c * matrix.e - matrix.a * matrix.f) / det;

  const x = invA * mapPoint.lng + invB * mapPoint.lat + invE;
  const y = invC * mapPoint.lng + invD * mapPoint.lat + invF;

  return { x, y };
}

/**
 * PDFの境界座標を地理座標の境界に変換
 * 
 * @param pdfBounds PDF の境界 { minX, minY, maxX, maxY }
 * @param matrix 変換マトリックス
 * @returns 地理座標の境界
 */
export function transformPDFBoundsToGeoBounds(
  pdfBounds: { minX: number; minY: number; maxX: number; maxY: number },
  matrix: TransformMatrix
): { north: number; south: number; east: number; west: number } {
  // PDF の四隅の座標を変換
  const corners = [
    { x: pdfBounds.minX, y: pdfBounds.minY }, // 左下
    { x: pdfBounds.maxX, y: pdfBounds.minY }, // 右下
    { x: pdfBounds.maxX, y: pdfBounds.maxY }, // 右上
    { x: pdfBounds.minX, y: pdfBounds.maxY }  // 左上
  ];

  const transformedCorners = corners.map(corner => 
    transformPDFToGeo(corner, matrix)
  );

  // 境界を計算
  const lats = transformedCorners.map(p => p.lat);
  const lngs = transformedCorners.map(p => p.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

/**
 * 変換の精度を検証
 * 基準点を使って変換の精度をチェック
 * 
 * @param pdfPoints PDF上の基準点
 * @param mapPoints 地図上の基準点
 * @param matrix 変換マトリックス
 * @returns 平均誤差（メートル単位）
 */
export function validateTransformAccuracy(
  pdfPoints: PDFPoint[],
  mapPoints: MapPoint[],
  matrix: TransformMatrix
): number {
  if (pdfPoints.length !== mapPoints.length) {
    throw new Error('基準点の数が一致しません');
  }

  let totalError = 0;
  
  for (let i = 0; i < pdfPoints.length; i++) {
    const transformed = transformPDFToGeo(pdfPoints[i], matrix);
    const actual = mapPoints[i];
    
    // ハーバーサイン公式で距離を計算（メートル単位）
    const distance = calculateDistance(transformed, actual);
    totalError += distance;
  }

  return totalError / pdfPoints.length;
}

/**
 * 2点間の距離を計算（ハーバーサイン公式）
 * 
 * @param point1 地理座標1
 * @param point2 地理座標2
 * @returns 距離（メートル単位）
 */
function calculateDistance(point1: MapPoint, point2: MapPoint): number {
  const R = 6371000; // 地球の半径（メートル）
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}