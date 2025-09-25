# システムアーキテクチャ設計書

## 1. システム全体アーキテクチャ

### 1.1 システム構成図
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   React 18 +    │  │   Vite Build    │  │  TailwindCSS │ │
│  │   TypeScript    │  │   Tool          │  │  Styling     │ │
│  │   (Port: 3001)  │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP REST API
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Express.js    │  │   JWT Auth      │  │  CORS &      │ │
│  │   API Server    │  │   Middleware    │  │  Security    │ │
│  │   (Port: 5000)  │  │                 │  │  Middleware  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   MCP Server    │  │   SQLite        │  │  Redis       │ │
│  │   (Port: 8001)  │  │   Database      │  │  Cache       │ │
│  │                 │  │   File-based    │  │  (Port: 6379)│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Docker        │  │   Nginx         │  │  Volume      │ │
│  │   Containers    │  │   (Production)  │  │  Storage     │ │
│  │                 │  │   (Port: 80/443)│  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 アーキテクチャ設計原則
- **分離された関心事**: フロントエンド、バックエンド、データ層の明確な分離
- **コンテナ化**: Dockerを使用したマイクロサービス構成
- **開発効率**: ViteとTailwindCSSによる高速開発環境
- **セキュリティ**: JWT認証とHelmet/CORSミドルウェア
- **スケーラビリティ**: Redisキャッシュと水平スケーリング対応
- **保守性**: TypeScriptによる型安全性とモジュラー設計

## 2. データベース設計（PostgreSQL）

### 2.1 データベース接続設定
```javascript
// 環境設定 (.env)
POSTGRES_DB=foodapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:password@localhost:5432/foodapp

// 接続プール設定
Pool Configuration:
- Max connections: 20
- Idle timeout: 30秒
- Connection timeout: 2秒
- SSL: 本番環境のみ有効
```

### 2.2 マイグレーション管理
- **マイグレーションファイル**: 9つのテーブル定義
- **バージョン管理**: schema_migrationsテーブル
- **実行コマンド**: `npm run migrate`
- **ロールバック機能**: 実装済み

### 2.3 エンティティ関連図
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Users       │     │     Foods       │     │   Categories    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │────┐│ id (PK)         │┌───→│ id (PK)         │
│ username        │    ││ user_id (FK)    ││    │ name            │
│ email           │    ││ category_id (FK)││    │ icon            │
│ password_hash   │    ││ name            │└────┘│ color           │
│ created_at      │    ││ purchase_date   │     │ created_at      │
│ updated_at      │    ││ expiry_date     │     │ updated_at      │
└─────────────────┘    ││ quantity        │     └─────────────────┘
                       ││ unit            │
                       ││ storage_location│
                       ││ barcode         │     ┌─────────────────┐
                       ││ status          │     │   Recipes       │
                       ││ created_at      │     ├─────────────────┤
                       ││ updated_at      │┌───→│ id (PK)         │
                       │└─────────────────┘│    │ name            │
                       │                   │    │ description     │
                       │                   │    │ instructions    │
┌─────────────────┐    │                   │    │ prep_time       │
│  Notifications  │    │                   │    │ cook_time       │
├─────────────────┤    │                   │    │ servings        │
│ id (PK)         │    │                   │    │ difficulty      │
│ user_id (FK)    │────┘                   │    │ image_url       │
│ food_id (FK)    │────────────────────────┘    │ created_at      │
│ type            │                             │ updated_at      │
│ message         │                             └─────────────────┘
│ sent_at         │                                     │
│ read_at         │                                     │
│ created_at      │                             ┌─────────────────┐
└─────────────────┘                             │ RecipeIngredients│
                                                ├─────────────────┤
┌─────────────────┐                             │ id (PK)         │
│ ShoppingLists   │                            ┌│ recipe_id (FK)  │
├─────────────────┤                            ││ ingredient_name │
│ id (PK)         │                            ││ quantity        │
│ user_id (FK)    │────────────────────────────┘│ unit            │
│ name            │                             │ optional        │
│ created_at      │                             │ created_at      │
│ updated_at      │                             └─────────────────┘
└─────────────────┘
        │
        │   ┌─────────────────┐
        │   │ShoppingListItems│
        │   ├─────────────────┤
        └──→│ id (PK)         │
            │ list_id (FK)    │
            │ item_name       │
            │ quantity        │
            │ unit            │
            │ purchased       │
            │ created_at      │
            └─────────────────┘

┌─────────────────┐
│ StorageTips     │
├─────────────────┤
│ id (PK)         │
│ food_name       │
│ category        │
│ storage_method  │
│ optimal_temp    │
│ humidity_level  │
│ shelf_life_days │
│ tips            │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

### 2.4 実装済みテーブル定義

#### Users テーブル (001_create_users_table.sql)
| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | SERIAL | PRIMARY KEY | ユーザーID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | ユーザー名 |
| email | VARCHAR(100) | NOT NULL, UNIQUE | メールアドレス |
| password_hash | VARCHAR(255) | NOT NULL | ハッシュ化パスワード |
| email_verified | BOOLEAN | DEFAULT FALSE | メール認証状態 |
| verification_token | VARCHAR(255) | | 認証トークン |
| reset_password_token | VARCHAR(255) | | パスワードリセットトークン |
| reset_password_expires | TIMESTAMP WITH TIME ZONE | | リセット有効期限 |
| last_login | TIMESTAMP WITH TIME ZONE | | 最終ログイン時刻 |
| is_active | BOOLEAN | DEFAULT TRUE | アカウント有効状態 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

#### Foods テーブル
| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | SERIAL | PRIMARY KEY | 食品ID |
| user_id | INTEGER | FOREIGN KEY (users.id) | ユーザーID |
| category_id | INTEGER | FOREIGN KEY (categories.id) | カテゴリID |
| name | VARCHAR(100) | NOT NULL | 食品名 |
| purchase_date | DATE | NOT NULL | 購入日 |
| expiry_date | DATE | NOT NULL | 賞味期限 |
| quantity | DECIMAL(10,2) | NOT NULL | 数量 |
| unit | VARCHAR(20) | NOT NULL | 単位 |
| storage_location | VARCHAR(50) | | 保存場所 |
| barcode | VARCHAR(50) | | バーコード |
| status | VARCHAR(20) | DEFAULT 'active' | 状態 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

#### Categories テーブル
| カラム名 | データ型 | 制約 | 説明 |
|----------|----------|------|------|
| id | SERIAL | PRIMARY KEY | カテゴリID |
| name | VARCHAR(50) | NOT NULL, UNIQUE | カテゴリ名 |
| icon | VARCHAR(50) | | アイコン名 |
| color | VARCHAR(7) | | カラーコード |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

## 3. API設計仕様

### 3.1 認証API
```
POST   /api/auth/register     # ユーザー登録
POST   /api/auth/login        # ログイン
POST   /api/auth/logout       # ログアウト
POST   /api/auth/refresh      # トークンリフレッシュ
GET    /api/auth/me           # 現在のユーザー情報取得
```

### 3.2 食品管理API
```
GET    /api/foods             # 食品一覧取得（フィルター・ソート対応）
POST   /api/foods             # 食品登録
GET    /api/foods/:id         # 食品詳細取得
PUT    /api/foods/:id         # 食品更新
DELETE /api/foods/:id         # 食品削除
GET    /api/foods/expiring    # 期限切れ間近食品取得
POST   /api/foods/bulk        # 一括食品登録
```

### 3.3 カテゴリAPI
```
GET    /api/categories        # カテゴリ一覧取得
POST   /api/categories        # カテゴリ作成
PUT    /api/categories/:id    # カテゴリ更新
DELETE /api/categories/:id    # カテゴリ削除
```

### 3.4 レシピAPI
```
GET    /api/recipes           # レシピ一覧取得
GET    /api/recipes/suggest   # レシピ提案（AI連携）
GET    /api/recipes/:id       # レシピ詳細取得
POST   /api/recipes/favorite  # お気に入り追加
```

### 3.5 通知API
```
GET    /api/notifications     # 通知一覧取得
PUT    /api/notifications/:id/read  # 通知既読
POST   /api/notifications/subscribe # プッシュ通知登録
DELETE /api/notifications/:id # 通知削除
```

### 3.6 買い物リストAPI
```
GET    /api/shopping          # 買い物リスト一覧
POST   /api/shopping          # 買い物リスト作成
GET    /api/shopping/:id      # 買い物リスト詳細
PUT    /api/shopping/:id      # 買い物リスト更新
DELETE /api/shopping/:id      # 買い物リスト削除
```

### 3.7 保存アドバイスAPI
```
GET    /api/storage           # 保存アドバイス一覧
GET    /api/storage/:foodName # 特定食品のアドバイス
```

## 4. 画面設計書（ワイヤーフレーム）

### 4.1 メイン画面構成
```
┌─────────────────────────────────────────────────────────┐
│ Header: [ロゴ] [ナビ] [ユーザーメニュー] [通知アイコン]   │
├─────────────────────────────────────────────────────────┤
│ Dashboard:                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │期限切れ間近 │ │今日のレシピ │ │買い物リスト │       │
│ │   Alert     │ │ Suggestion  │ │   Status    │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────┤
│ Main Content:                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              Food Inventory List                    │ │
│ │ [検索] [フィルター] [並び替え] [追加ボタン]          │ │
│ │                                                     │ │
│ │ ┌─食品カード─┐ ┌─食品カード─┐ ┌─食品カード─┐ │ │
│ │ │   画像     │ │   画像     │ │   画像     │ │ │
│ │ │   名前     │ │   名前     │ │   名前     │ │ │
│ │ │  期限日    │ │  期限日    │ │  期限日    │ │ │
│ │ │   数量     │ │   数量     │ │   数量     │ │ │
│ │ └───────────┘ └───────────┘ └───────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4.2 食品登録画面
```
┌─────────────────────────────────────────────────────────┐
│ Header: [戻る] 食品登録 [保存]                           │
├─────────────────────────────────────────────────────────┤
│ 登録方法選択:                                           │
│ [手入力] [バーコード] [音声入力]                        │
├─────────────────────────────────────────────────────────┤
│ 食品情報入力:                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 食品名: [テキスト入力欄]                             │ │
│ │ カテゴリ: [ドロップダウン]                          │ │
│ │ 購入日: [日付ピッカー]                               │ │
│ │ 賞味期限: [日付ピッカー]                            │ │
│ │ 数量: [数値入力] 単位: [ドロップダウン]              │ │
│ │ 保存場所: [ドロップダウン]                          │ │
│ │ 写真: [カメラ/ファイル選択]                          │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ AI保存アドバイス表示エリア                              │
│ [アイコン] 最適な保存方法をアドバイス                    │
└─────────────────────────────────────────────────────────┘
```

### 4.3 レシピ提案画面
```
┌─────────────────────────────────────────────────────────┐
│ Header: レシピ提案 [設定]                                │
├─────────────────────────────────────────────────────────┤
│ 提案フィルター:                                         │
│ [使いたい食材] [調理時間] [難易度] [人数]               │
├─────────────────────────────────────────────────────────┤
│ おすすめレシピ:                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ┌─レシピカード─┐                                   │ │
│ │ │    画像      │ [期限切れ間近食材使用マーク]        │ │
│ │ │   料理名     │                                    │ │
│ │ │   調理時間   │ [お気に入り] [詳細]               │ │
│ │ │   使用食材   │                                    │ │
│ │ └─────────────┘                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 5. MCPサーバー連携方式

### 5.1 MCP統合アーキテクチャ
```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Express.js    │  │   MCP Client    │            │
│  │   Controllers   │←→│   HTTP Client   │            │
│  │   (Port: 3001)  │  │                 │            │
│  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────┘
                              │ HTTP REST
┌─────────────────────────────────────────────────────────┐
│                    MCP Server Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Express.js    │  │   AI Service    │            │
│  │   (Port: 8000)  │  │   Integration   │            │
│  └─────────────────┘  └─────────────────┘            │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Food Waste    │  │   Database      │            │
│  │   Service       │  │   Service       │            │
│  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    Data Storage Layer                   │
│              PostgreSQL Database                        │
└─────────────────────────────────────────────────────────┘
```

### 5.2 MCPサーバー機能
- **食品在庫管理**: 在庫追跡とアラート機能
- **AI連携**: OpenAI/Claude API統合
- **データ分析**: 食品廃棄パターン分析
- **レシピ提案**: AI使用のレシピ生成
- **保存アドバイス**: 食材別最適保存方法

### 5.3 技術スタック詳細

#### データベース層
- **PostgreSQL 14**: メインデータストレージ
  - 接続プール: 最大20接続
  - 自動マイグレーション管理
  - インデックス最適化
  - トランザクション対応
- **Redis 7**: セッション・キャッシュストレージ
  - レート制限管理
  - 一時データ保存

#### 環境設定
```bash
# 開発環境の起動コマンド
npm run dev        # 各サービス個別起動
start-all.bat     # 全サービス一括起動 (Windows)
start-all.sh      # 全サービス一括起動 (Unix)

# マイグレーション管理
cd backend
npm run migrate     # マイグレーション実行
npm run migrate:status  # 状況確認
```

#### 技術スタック
- **フロントエンド**: React 18, TypeScript, Vite, TailwindCSS, React Query
- **バックエンド**: Node.js, Express.js, JWT, bcryptjs, Joi, pg
- **データベース**: PostgreSQL 14, Redis 7
- **インフラ**: Docker, Docker Compose
- **開発ツール**: TypeScript, ESLint, Prettier