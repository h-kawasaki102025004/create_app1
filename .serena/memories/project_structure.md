# プロジェクト構造

## 現在の構造
```
create_app1/
├── .git/           # Git repository
├── .serena/        # Serena configuration
│   └── project.yml # Project configuration (TypeScript project)
└── test           # テストファイル
```

## 計画される構造
```
create_app1/
├── docs/                    # 設計資料
│   ├── architecture.md      # システム設計書
│   ├── ui-design.md        # UI設計仕様
│   ├── tasks.md            # タスク一覧
│   ├── testing-plan.md     # テスト方針
│   ├── e2e-scenario.md     # E2Eテストシナリオ
│   └── integration-tests.md # 結合テスト方針
├── frontend/               # React.js フロントエンド
├── backend/                # Node.js バックエンド
├── mcp-server/            # MCPサーバー
├── database/              # データベーススキーマ
├── tests/                 # テストファイル群
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # プロジェクト概要
```

## 開発フロー
1. 設計フェーズ（現在）
2. 実装フェーズ
3. テストフェーズ
4. デプロイフェーズ