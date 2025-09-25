# 🥬 FoodKeeper - 食品ロス削減アプリ

React + Node.js + MCPサーバー統合による食品在庫管理・レシピ提案アプリケーション

## 🌟 実装済み機能

### 📱 フロントエンド (React + TypeScript)
- **認証システム**: モックJWT認証（test@example.com / password）
- **食材一覧表示**: リアルタイム在庫確認
- **食材登録**: フォームによる手入力対応
- **レシピ提案**: 食材選択による動的レシピ生成
- **レスポンシブデザイン**: モバイル・デスクトップ対応

### 🔧 バックエンド API (Node.js + Express)
- **RESTful API**: 食品CRUD操作
- **認証機能**: JWT トークンベース認証
- **セキュリティ**: Helmet, CORS設定済み
- **インメモリ保存**: 開発用データストレージ
- **ヘルスチェック**: システム状態監視

### 🤖 MCPサーバー (Model Context Protocol)
- **動的レシピ生成**: 食材ベースのレシピ提案システム
- **組み合わせレシピ**: 複数食材の最適化レシピ
- **フォールバック機能**: 未知食材への対応
- **7つのMCPツール**: 包括的な食品管理機能

### 🎯 レシピ提案システム
- **りんご**: アップルパイ、りんごサラダ
- **牛乳**: ホットミルク、ミルクプリン
- **組み合わせ**: フルーツミルクシェイク（りんご+牛乳）
- **フォールバック**: 簡単サラダ（未知食材用）

## 🏗️ 技術スタック

### フロントエンド
- **React.js + TypeScript**: モダンなWebアプリケーション
- **PWA対応**: オフライン機能とネイティブアプリ体験
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応

### バックエンド
- **Node.js + Express**: 高性能なRESTful API
- **TypeScript**: 型安全性による品質保証
- **JWT認証**: セキュアな認証システム

### データベース・キャッシュ
- **PostgreSQL**: 信頼性の高いリレーショナルデータベース
- **Redis**: 高速キャッシュとセッション管理

### 特殊機能
- **MCPサーバー**: Model Context Protocolによるデータ管理
- **AI統合**: OpenAI/Claude APIによる賢い提案機能
- **外部API連携**: レシピ、価格情報などの外部データ活用

## 🚀 クイックスタート

### 前提条件
- Node.js 18.0.0以上
- npm 9.0.0以上
- Docker & Docker Compose
- PostgreSQL 14以上
- Redis 7以上

### 1. プロジェクトのクローン
\`\`\`bash
git clone https://github.com/food-waste-reduction/app.git
cd app
\`\`\`

### 2. 環境変数の設定
\`\`\`bash
cp .env.example .env
# .envファイルを編集して適切な値を設定
\`\`\`

### 3. 依存関係のインストール
\`\`\`bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ../mcp-server && npm install
cd ..
\`\`\`

### 4. データベースのセットアップ
\`\`\`bash
# Dockerでデータベースを起動
docker-compose up -d postgres redis

# データベースマイグレーション実行
npm run db:migrate

# 初期データの投入
npm run db:seed
\`\`\`

### 5. 開発サーバーの起動
\`\`\`bash
# 全サービスを並行して起動
npm run dev
\`\`\`

アプリケーションが以下のURLでアクセス可能になります：
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3001
- **MCPサーバー**: http://localhost:8000

## 📦 プロジェクト構造

\`\`\`
food-waste-reduction-app/
├── docs/                    # 設計資料
│   ├── architecture.md      # システム設計書
│   ├── ui-design.md        # UI設計仕様
│   ├── tasks.md            # 開発タスク一覧
│   ├── testing-plan.md     # テスト方針
│   ├── e2e-scenario.md     # E2Eテストシナリオ
│   └── integration-tests.md # 結合テスト方針
├── backend/                 # Node.js バックエンド
│   ├── src/
│   │   ├── controllers/     # APIコントローラー
│   │   ├── services/        # ビジネスロジック
│   │   ├── repositories/    # データアクセス層
│   │   ├── middleware/      # 認証・ログ等のミドルウェア
│   │   ├── models/         # データベースモデル
│   │   ├── routes/         # APIルート定義
│   │   └── utils/          # ユーティリティ関数
│   ├── migrations/         # データベースマイグレーション
│   ├── seeds/              # 初期データ
│   └── tests/              # バックエンドテスト
├── frontend/               # React.js フロントエンド
│   ├── public/             # 静的ファイル
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── pages/          # ページコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── services/       # API通信
│   │   ├── store/          # 状態管理
│   │   ├── utils/          # ユーティリティ
│   │   └── types/          # TypeScript型定義
│   └── tests/              # フロントエンドテスト
├── mcp-server/             # MCPサーバー
│   ├── src/
│   │   ├── tools/          # MCPツール実装
│   │   ├── services/       # サービス層
│   │   └── utils/          # ユーティリティ
│   └── tests/              # MCPサーバーテスト
├── shared/                 # 共通型定義・ユーティリティ
├── database/               # データベース設定
└── nginx/                  # リバースプロキシ設定
\`\`\`

## 🧪 テスト

### 全テスト実行
\`\`\`bash
npm run test
\`\`\`

### 個別テスト実行
\`\`\`bash
# バックエンドテスト
npm run test:backend

# フロントエンドテスト
npm run test:frontend

# MCPサーバーテスト
npm run test:mcp-server

# 結合テスト
npm run test:integration

# E2Eテスト
npm run test:e2e
\`\`\`

### テストカバレッジ
- **目標カバレッジ**: 80%以上
- **レポート生成**: \`npm run test -- --coverage\`

## 🔧 開発ツール

### リント・フォーマット
\`\`\`bash
# コード品質チェック
npm run lint

# コードフォーマット
npm run format
\`\`\`

### データベース管理
\`\`\`bash
# マイグレーション実行
npm run db:migrate

# 初期データ投入
npm run db:seed

# テスト用データベース準備
npm run db:migrate:test
npm run db:seed:test
\`\`\`

## 🐳 Docker開発環境

### 開発環境起動
\`\`\`bash
# 全サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f
\`\`\`

### 本番環境ビルド
\`\`\`bash
# 本番用イメージビルド
docker-compose -f docker-compose.prod.yml build

# 本番環境起動
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## 📱 機能詳細

### PWA機能
- オフライン対応
- プッシュ通知
- ホーム画面への追加
- バックグラウンド同期

### セキュリティ機能
- JWT認証
- CSRF保護
- XSS対策
- SQLインジェクション対策
- レート制限

### AI機能
- 食材ベースレシピ提案
- 保存方法アドバイス
- 栄養バランス分析
- パーソナライゼーション

## 🤝 貢献方法

1. プロジェクトをフォーク
2. 機能ブランチを作成 (\`git checkout -b feature/amazing-feature\`)
3. 変更をコミット (\`git commit -m 'Add amazing feature'\`)
4. ブランチにプッシュ (\`git push origin feature/amazing-feature\`)
5. プルリクエストを作成

### 開発ガイドライン
- TypeScriptの型安全性を保つ
- テストカバレッジ80%以上を維持
- ESLint・Prettierの規則に従う
- コミットメッセージは具体的に記述

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🆘 サポート

- **イシュー報告**: [GitHub Issues](https://github.com/food-waste-reduction/app/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/food-waste-reduction/app/discussions)
- **ドキュメント**: [docs/](./docs/)フォルダ内の設計資料

## 📊 ロードマップ

- [x] 基本的な食品管理機能
- [x] レシピ提案システム
- [x] AI統合機能
- [ ] 多言語対応
- [ ] 家族アカウント共有
- [ ] 統計・レポート機能
- [ ] ゲーミフィケーション要素

---

**食品ロスを減らし、持続可能な食生活を実現するために。** 🌱