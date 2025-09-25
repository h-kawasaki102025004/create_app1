# UIデザイン仕様書

## 1. デザインシステム

### 1.1 カラーパレット

#### Primary Colors（メインカラー）
```
Primary Green:    #4CAF50  (食品の新鮮さを表現)
Primary Dark:     #388E3C  (ヘッダー、ボタン)
Primary Light:    #C8E6C9  (背景アクセント)
```

#### Secondary Colors（セカンダリカラー）
```
Orange Warning:   #FF9800  (期限切れ間近アラート)
Red Alert:        #F44336  (期限切れアラート)
Blue Info:        #2196F3  (情報表示)
Gray Neutral:     #9E9E9E  (無効化、サブテキスト)
```

#### Background Colors（背景色）
```
White:           #FFFFFF  (メイン背景)
Light Gray:      #F5F5F5  (カード背景)
Dark Gray:       #333333  (ダークモード背景)
```

#### Text Colors（テキストカラー）
```
Primary Text:    #212121  (メインテキスト)
Secondary Text:  #757575  (サブテキスト)
White Text:      #FFFFFF  (コントラスト用)
```

### 1.2 タイポグラフィ

#### フォントファミリー
- **Primary Font**: 'Noto Sans JP', 'Helvetica Neue', 'Arial', sans-serif
- **Secondary Font**: 'Roboto', sans-serif
- **Monospace**: 'Courier New', monospace (数値表示用)

#### フォントサイズとウェイト
```
h1: 32px, font-weight: 700 (ページタイトル)
h2: 28px, font-weight: 600 (セクションタイトル)
h3: 24px, font-weight: 600 (カードタイトル)
h4: 20px, font-weight: 500 (サブタイトル)
body: 16px, font-weight: 400 (本文)
small: 14px, font-weight: 400 (補足テキスト)
caption: 12px, font-weight: 400 (キャプション)
```

### 1.3 スペーシングシステム
```
xs:  4px   (小さなマージン)
sm:  8px   (コンポーネント内間隔)
md:  16px  (標準間隔)
lg:  24px  (セクション間隔)
xl:  32px  (大きなセクション間隔)
xxl: 48px  (ページ間隔)
```

### 1.4 ブレイクポイント（レスポンシブ）
```
Mobile:    320px - 767px
Tablet:    768px - 1023px
Desktop:   1024px - 1439px
Large:     1440px +
```

## 2. コンポーネント設計

### 2.1 ボタンコンポーネント

#### Primary Button
```css
.btn-primary {
  background-color: #4CAF50;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: #388E3C;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: transparent;
  color: #4CAF50;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #4CAF50;
  color: #FFFFFF;
}
```

#### Floating Action Button
```css
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  background-color: #4CAF50;
  color: #FFFFFF;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
  transition: all 0.3s ease;
}

.fab:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.5);
}
```

### 2.2 カードコンポーネント

#### 食品カード
```css
.food-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.food-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.food-card.expiring-soon {
  border-left: 4px solid #FF9800;
}

.food-card.expired {
  border-left: 4px solid #F44336;
}

.food-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 12px;
}

.food-name {
  font-size: 18px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 8px;
}

.food-expiry {
  font-size: 14px;
  color: #757575;
  margin-bottom: 4px;
}

.food-quantity {
  font-size: 14px;
  color: #4CAF50;
  font-weight: 500;
}
```

#### レシピカード
```css
.recipe-card {
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.recipe-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.recipe-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.recipe-content {
  padding: 20px;
}

.recipe-title {
  font-size: 20px;
  font-weight: 600;
  color: #212121;
  margin-bottom: 8px;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #757575;
  font-size: 14px;
  margin-bottom: 12px;
}

.recipe-ingredients {
  color: #4CAF50;
  font-size: 14px;
  font-weight: 500;
}
```

### 2.3 フォームコンポーネント

#### テキスト入力
```css
.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E0E0E0;
  border-radius: 8px;
  font-size: 16px;
  color: #212121;
  transition: all 0.2s ease;
  background-color: #FFFFFF;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-input.error {
  border-color: #F44336;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #212121;
  margin-bottom: 6px;
  display: block;
}

.form-error {
  color: #F44336;
  font-size: 12px;
  margin-top: 4px;
}
```

### 2.4 アラート・通知コンポーネント

#### アラートバナー
```css
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-warning {
  background-color: #FFF3E0;
  color: #E65100;
  border: 1px solid #FFCC02;
}

.alert-danger {
  background-color: #FFEBEE;
  color: #C62828;
  border: 1px solid #F44336;
}

.alert-info {
  background-color: #E3F2FD;
  color: #1565C0;
  border: 1px solid #2196F3;
}

.alert-success {
  background-color: #E8F5E8;
  color: #2E7D32;
  border: 1px solid #4CAF50;
}
```

## 3. 画面別UI仕様

### 3.1 ダッシュボード画面

#### レイアウト構成
```
┌─────────────────────────────────────────┐
│ Header (64px height)                    │
├─────────────────────────────────────────┤
│ Alert Summary Cards (120px height)     │
├─────────────────────────────────────────┤
│ Quick Actions Bar (60px height)        │
├─────────────────────────────────────────┤
│ Food Inventory Grid (Flexible height)  │
├─────────────────────────────────────────┤
│ Footer (48px height)                   │
└─────────────────────────────────────────┘
```

#### ヘッダー仕様
- 高さ: 64px
- 背景色: #4CAF50
- ロゴ: 左端配置、32px×32px
- ナビゲーション: 中央配置
- ユーザーメニュー: 右端配置
- 通知アイコン: ユーザーメニュー隣

#### サマリーカード仕様
- 3列グリッド（デスクトップ）、1列（モバイル）
- カード間隔: 16px
- 各カード高さ: 100px
- アイコンサイズ: 48px×48px

### 3.2 食品登録画面

#### 登録方法タブ
```css
.registration-tabs {
  display: flex;
  border-bottom: 2px solid #E0E0E0;
  margin-bottom: 24px;
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 500;
  color: #757575;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.tab-button.active {
  color: #4CAF50;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #4CAF50;
}
```

#### フォームレイアウト
- 単列レイアウト（モバイル優先）
- ラベル上配置
- 入力フィールド間隔: 20px
- 保存ボタン: 固定下部配置

### 3.3 レシピ提案画面

#### フィルターバー
```css
.filter-bar {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #F5F5F5;
  border-radius: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-chip {
  background-color: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  color: #757575;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip.active {
  background-color: #4CAF50;
  color: #FFFFFF;
  border-color: #4CAF50;
}
```

#### レシピグリッド
- デスクトップ: 3列グリッド
- タブレット: 2列グリッド
- モバイル: 1列グリッド
- カード間隔: 20px
- グリッドギャップ: 24px

## 4. レスポンシブデザイン対応

### 4.1 モバイル対応（320px-767px）
- 単列レイアウト
- タッチターゲット最小44px×44px
- フォントサイズ最小16px（ズーム防止）
- ボトムナビゲーション採用
- スワイプジェスチャー対応

### 4.2 タブレット対応（768px-1023px）
- 2列グリッドレイアウト
- サイドバーナビゲーション
- 画面分割表示対応

### 4.3 デスクトップ対応（1024px+）
- 3列以上のグリッドレイアウト
- ホバーエフェクト活用
- キーボードショートカット対応
- マルチウィンドウ対応

## 5. アクセシビリティ考慮事項

### 5.1 色彩対応
- WCAG 2.1 AA準拠
- カラーコントラスト比 4.5:1以上
- 色だけに依存しない情報表示

### 5.2 キーボード操作
- Tab順序の論理的配置
- フォーカス表示の明確化
- スキップリンクの提供

### 5.3 スクリーンリーダー対応
- セマンティックHTMLの使用
- ARIA属性の適切な使用
- 画像にalt属性設定

### 5.4 ユーザビリティ
- 操作フィードバックの提供
- エラーメッセージの分かりやすさ
- ローディング状態の表示

## 6. ダークモード対応

### 6.1 ダークモードカラーパレット
```
Background:      #121212
Surface:         #1E1E1E
Primary:         #81C784
Secondary:       #FFB74D
Text Primary:    #FFFFFF
Text Secondary:  #B0B0B0
```

### 6.2 切り替え機能
- ユーザー設定での切り替え
- システム設定連動オプション
- スムーズなトランジション
- 状態の永続化

## 7. アニメーション・トランジション

### 7.1 基本トランジション
```css
/* Page transition */
.page-enter {
  opacity: 0;
  transform: translateY(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease;
}

/* Card hover */
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Loading animation */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 7.2 マイクロインタラクション
- ボタンクリック時のリップルエフェクト
- フォーム送信時のローディングアニメーション
- 成功・エラー時のフィードバックアニメーション
- カード追加・削除時のトランジション

## 8. パフォーマンス考慮事項

### 8.1 画像最適化
- WebP形式対応
- レスポンシブ画像
- 遅延読み込み（Lazy Loading）
- 画像圧縮

### 8.2 CSS最適化
- Critical CSS インライン化
- 未使用CSS除去
- CSS圧縮
- CSS-in-JS最適化