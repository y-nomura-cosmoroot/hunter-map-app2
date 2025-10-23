# 設計文書

## 概要

三重県鳥獣保護区マップアプリケーションは、PDFで提供される保護区地図をGoogleマップ上にオーバーレイ表示するReact/Viteベースのシングルページアプリケーションです。ユーザーは直感的なインターフェースでPDFをアップロードし、基準点を設定して座標合わせを行い、設定を永続化できます。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    ブラウザ環境                              │
├─────────────────────────────────────────────────────────────┤
│  React アプリケーション                                      │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   PDF Viewer    │  │  Google Maps    │                  │
│  │   Component     │  │   Component     │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Reference Point │  │ Overlay Control │                  │
│  │   Manager       │  │   Component     │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────────────────────────────┐                │
│  │        State Management (Context)       │                │
│  └─────────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ブラウザAPI                                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Local Storage  │  │   File API      │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
         │                           │
         │                           │
    ┌────▼────┐                 ┌────▼────┐
    │ PDF.js  │                 │ Google  │
    │ Library │                 │Maps API │
    └─────────┘                 └─────────┘
```

### 技術スタック

- **フロントエンド**: React 18 + TypeScript
- **ビルドツール**: Vite
- **PDF処理**: PDF.js (react-pdf)
- **地図**: Google Maps JavaScript API
- **状態管理**: React Context + useReducer
- **ストレージ**: Browser LocalStorage API
- **スタイリング**: CSS Modules または Tailwind CSS

## コンポーネントとインターフェース

### 主要コンポーネント

#### 1. App Component
- アプリケーションのルートコンポーネント
- 全体的なレイアウトとナビゲーション
- Context Providerの配置

#### 2. PDFUploader Component
```typescript
interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}
```

#### 3. PDFViewer Component
```typescript
interface PDFViewerProps {
  pdfFile: File | null;
  onPointSelect: (x: number, y: number) => void;
  referencePoints: PDFPoint[];
  selectedPointIndex: number;
}

interface PDFPoint {
  x: number;
  y: number;
  pageNumber: number;
}
```

#### 4. GoogleMapComponent
```typescript
interface GoogleMapProps {
  onMapClick: (lat: number, lng: number) => void;
  referencePoints: MapPoint[];
  overlay: OverlayConfig | null;
  selectedPointIndex: number;
}

interface MapPoint {
  lat: number;
  lng: number;
}
```

#### 5. ReferencePointManager Component
```typescript
interface ReferencePointManagerProps {
  pdfPoints: PDFPoint[];
  mapPoints: MapPoint[];
  currentStep: number;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onReset: () => void;
}
```

#### 6. OverlayControls Component
```typescript
interface OverlayControlsProps {
  overlay: OverlayConfig;
  onPositionChange: (lat: number, lng: number) => void;
  onOpacityChange: (opacity: number) => void;
  onSave: () => void;
  onLoad: (configName: string) => void;
}
```

### データモデル

#### OverlayConfig
```typescript
interface OverlayConfig {
  id: string;
  name: string;
  pdfFile: {
    name: string;
    data: ArrayBuffer;
  };
  referencePoints: {
    pdf: PDFPoint[];
    map: MapPoint[];
  };
  position: {
    bounds: google.maps.LatLngBounds;
    center: { lat: number; lng: number };
  };
  opacity: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ApplicationState
```typescript
interface ApplicationState {
  currentPDF: File | null;
  referencePoints: {
    pdf: PDFPoint[];
    map: MapPoint[];
  };
  currentStep: number; // 0-5: アップロード→基準点設定(3回)→オーバーレイ→調整
  overlay: OverlayConfig | null;
  savedConfigs: OverlayConfig[];
  isLoading: boolean;
  error: string | null;
}
```

## エラーハンドリング

### エラータイプと対応

1. **PDFアップロードエラー**
   - ファイル形式不正
   - ファイルサイズ制限超過
   - PDF解析エラー

2. **Google Maps APIエラー**
   - APIキー不正
   - ネットワークエラー
   - 地図読み込み失敗

3. **座標変換エラー**
   - 基準点不足
   - 変換マトリックス計算失敗

4. **ストレージエラー**
   - LocalStorage容量不足
   - データ破損

### エラー処理戦略

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// グローバルエラーハンドラー
const handleError = (error: Error, context: string) => {
  console.error(`Error in ${context}:`, error);
  // ユーザーフレンドリーなエラーメッセージを表示
  // 必要に応じてエラー報告サービスに送信
};
```

## テスト戦略

### テスト階層

1. **単体テスト**
   - 座標変換ロジック
   - データ変換関数
   - ユーティリティ関数

2. **コンポーネントテスト**
   - PDF表示コンポーネント
   - 地図コンポーネント
   - フォームコンポーネント

3. **統合テスト**
   - PDF→地図オーバーレイフロー
   - 設定保存・読み込み
   - エラーハンドリング

### テストツール

- **テストフレームワーク**: Vitest
- **コンポーネントテスト**: React Testing Library
- **モック**: MSW (Mock Service Worker)

## パフォーマンス考慮事項

### 最適化戦略

1. **PDF処理最適化**
   - 大きなPDFファイルの遅延読み込み
   - Canvas描画の最適化
   - メモリ使用量の監視

2. **地図レンダリング最適化**
   - オーバーレイの効率的な更新
   - 不要な再描画の防止

3. **状態管理最適化**
   - 不要な再レンダリングの防止
   - メモ化の活用

### メモリ管理

```typescript
// PDFファイルのクリーンアップ
useEffect(() => {
  return () => {
    if (pdfDocument) {
      pdfDocument.destroy();
    }
  };
}, [pdfDocument]);
```

## セキュリティ考慮事項

### データ保護

1. **APIキー保護**
   - 環境変数での管理
   - ドメイン制限の設定

2. **ファイルアップロード制限**
   - ファイル形式検証
   - サイズ制限
   - マルウェアスキャン（将来的）

3. **ローカルストレージ**
   - 機密データの暗号化
   - データ有効期限の設定

## 実装フェーズ

### Phase 1: 基本構造
- プロジェクト初期化
- 基本コンポーネント作成
- ルーティング設定

### Phase 2: PDF機能
- PDFアップロード
- PDF表示
- 基準点選択

### Phase 3: 地図統合
- Google Maps統合
- 基準点選択
- 座標変換

### Phase 4: オーバーレイ
- Ground Overlay実装
- 位置調整
- 透明度制御

### Phase 5: 永続化
- LocalStorage統合
- 設定保存・読み込み
- 設定管理UI

### Phase 6: 最適化
- パフォーマンス改善
- エラーハンドリング強化
- テスト追加