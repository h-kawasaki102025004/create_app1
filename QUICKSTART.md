# 🚀 FoodKeeper - クイックスタート

食品廃棄削減アプリケーション「FoodKeeper」の起動方法です。

## ⚡ 簡単起動

### Windows
```bash
start-all.bat
```

### Mac/Linux
```bash
chmod +x start-all.sh
./start-all.sh
```

## 📱 アクセス情報

起動完了後、以下のURLにアクセスできます：

- **🌐 フロントエンド**: http://localhost:3004
- **🔗 バックエンドAPI**: http://localhost:5000
- **🔧 MCPサーバー**: http://localhost:8000

## 🔐 テスト用ログイン

```
メール: test@example.com
パスワード: password
```

## 🎯 主な機能

1. **ダッシュボード** - 食材統計と期限間近のアラート
2. **食材一覧** - 食材の追加・管理・賞味期限チェック
3. **レシピ提案** (MCPサーバー経由) - AI による使い切りレシピ
4. **買い物リスト** (MCPサーバー経由) - 自動生成機能

## 🛠️ 手動起動

個別にサービスを起動する場合：

```bash
# 1. バックエンドAPI (ポート 5000)
cd backend && npm run dev

# 2. フロントエンド (ポート 3004)
cd frontend && npm run dev

# 3. MCPサーバー (ポート 8000)
cd mcp-server && npm run dev
```

## 🔍 動作確認

各サービスの動作を確認：

```bash
# バックエンドAPI
curl http://localhost:5000/health

# MCPサーバー
curl http://localhost:8000/health

# フロントエンド
# ブラウザで http://localhost:3004 にアクセス
```

## 🚨 トラブルシューティング

### ポート競合エラー
- ポートが既に使用されている場合は、該当プロセスを停止してください
- Windowsの場合: `netstat -ano | findstr :[PORT]` でプロセス確認

### 依存関係エラー
```bash
# 依存関係を再インストール
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd mcp-server && npm install && cd ..
```

### ネットワークエラー
- バックエンドAPIが起動していることを確認
- CORS設定が正しく構成されていることを確認

## 📞 サポート

問題が発生した場合は、各サービスのログを確認してください：
- バックエンド: コンソール出力を確認
- フロントエンド: ブラウザのコンソールを確認
- MCPサーバー: サーバーログを確認

---

🥬 **食品廃棄削減で持続可能な未来を！**