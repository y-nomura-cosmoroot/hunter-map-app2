# 三重県鳥獣保護区マップ (Wildlife Protection Map)

PDFで提供される鳥獣保護区地図をGoogleマップ上にオーバーレイ表示するWebアプリケーション。

## 機能

- PDFファイルのアップロードと表示
- PDF上とGoogleマップ上での基準点設定
- 座標変換によるオーバーレイ表示
- オーバーレイの位置・透明度調整
- 設定の永続化（LocalStorage）

## 技術スタック

- **フロントエンド**: React 19 + TypeScript
- **ビルドツール**: Vite
- **PDF処理**: react-pdf
- **地図**: Google Maps JavaScript API
- **状態管理**: React Context + useReducer

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、Google Maps APIキーを設定してください：

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. ビルド

```bash
npm run build
```

## プロジェクト構造

```
src/
├── components/     # Reactコンポーネント
├── context/        # Context API関連
├── hooks/          # カスタムフック
├── types/          # TypeScript型定義
├── utils/          # ユーティリティ関数
├── App.tsx         # メインアプリケーション
└── main.tsx        # エントリーポイント
```

## Google Maps API設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Maps JavaScript APIを有効化
3. APIキーを作成し、適切な制限を設定
4. `.env`ファイルにAPIキーを設定

## 開発ガイドライン

- TypeScriptの型安全性を維持
- Reactのベストプラクティスに従う
- コンポーネントの再利用性を考慮
- エラーハンドリングを適切に実装
- パフォーマンスを考慮した実装

## ライセンス

MIT License