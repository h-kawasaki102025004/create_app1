# 推奨コマンド（Windows環境）

## ファイル・ディレクトリ操作
- `dir` - ディレクトリ内容の表示
- `mkdir <dirname>` - ディレクトリ作成
- `type <filename>` - ファイル内容表示
- `copy <source> <dest>` - ファイルコピー
- `move <source> <dest>` - ファイル移動
- `del <filename>` - ファイル削除

## Git操作
- `git status` - リポジトリ状態確認
- `git add .` - 変更をステージング
- `git commit -m "message"` - コミット
- `git branch` - ブランチ一覧
- `git checkout <branch>` - ブランチ切り替え
- `git merge <branch>` - ブランチマージ

## Node.js/npm操作
- `npm init -y` - package.json初期化
- `npm install` - 依存関係インストール
- `npm install <package>` - パッケージインストール
- `npm run <script>` - スクリプト実行
- `npm test` - テスト実行
- `npm run build` - ビルド実行

## TypeScript操作
- `tsc --init` - tsconfig.json初期化
- `tsc` - TypeScriptコンパイル
- `tsc --watch` - ウォッチモード

## 開発サーバー
- `npm run dev` - 開発サーバー起動（予定）
- `npm start` - プロダクションサーバー起動（予定）

## テスト・品質チェック
- `npm run lint` - リント実行（予定）
- `npm run format` - フォーマット実行（予定）
- `npm run test` - ユニットテスト実行（予定）
- `npm run e2e` - E2Eテスト実行（予定）