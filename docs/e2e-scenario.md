# E2Eテストシナリオ仕様書

## 1. E2Eテスト概要

### 1.1 テスト目的
- エンドユーザーの実際の利用シナリオを検証
- システム全体の統合動作確認
- ユーザビリティとパフォーマンスの検証
- リリース前の最終品質保証

### 1.2 テスト方針
- **ユーザージャーニー**に基づくシナリオ設計
- **クリティカルパス**の重点的テスト
- **クロスブラウザ**対応確認
- **レスポンシブデザイン**動作確認

### 1.3 テストツール選定

#### メインフレームワーク
- **Playwright**: クロスブラウザE2Eテストフレームワーク
- **TypeScript**: テストコードの型安全性確保

#### 補助ツール
- **@playwright/test**: Playwrightテストランナー
- **allure-playwright**: テストレポート生成
- **dotenv**: 環境変数管理

#### 対象ブラウザ
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 2. テスト環境設定

### 2.1 テストデータ準備
```typescript
// テストユーザーデータ
export const testUsers = {
  regularUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  newUser: {
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'NewPassword123!',
  },
};

// テスト食品データ
export const testFoods = [
  {
    name: '牛乳',
    category: '乳製品',
    purchase_date: '2024-01-01',
    expiry_date: '2024-01-05',
    quantity: 1,
    unit: 'L',
    storage_location: '冷蔵庫',
  },
  {
    name: 'トマト',
    category: '野菜',
    purchase_date: '2024-01-02',
    expiry_date: '2024-01-10',
    quantity: 3,
    unit: '個',
    storage_location: '常温',
  },
];
```

### 2.2 テスト用データベースセットアップ
```typescript
// database-setup.ts
export async function setupTestDatabase() {
  // テスト用データベースのクリーンアップ
  await clearTestDatabase();

  // 基本データの投入
  await seedCategories();
  await seedStorageTips();
  await seedRecipes();
}

export async function clearTestDatabase() {
  // 全テーブルのデータクリア
  await database.query('TRUNCATE TABLE foods CASCADE');
  await database.query('TRUNCATE TABLE users CASCADE');
}
```

## 3. ユーザージャーニーベーステストシナリオ

### 3.1 新規ユーザー登録〜初回利用フロー

#### シナリオ概要
新規ユーザーがアプリを発見してから、初回の食品登録までの一連の流れ

#### テストステップ
```typescript
test('新規ユーザー初回利用フロー', async ({ page }) => {
  // 1. ランディングページ訪問
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('食品ロス削減アプリ');

  // 2. ユーザー登録
  await page.click('text=新規登録');
  await page.fill('[data-testid=username-input]', testUsers.newUser.username);
  await page.fill('[data-testid=email-input]', testUsers.newUser.email);
  await page.fill('[data-testid=password-input]', testUsers.newUser.password);
  await page.click('[data-testid=register-button]');

  // 3. 登録完了・自動ログイン確認
  await expect(page.locator('[data-testid=welcome-message]'))
    .toContainText('ようこそ');
  await expect(page).toHaveURL('/dashboard');

  // 4. 初回チュートリアル確認
  await expect(page.locator('[data-testid=tutorial-modal]')).toBeVisible();
  await page.click('[data-testid=tutorial-start-button]');

  // 5. 初回食品登録
  await page.click('[data-testid=add-food-fab]');
  await expect(page).toHaveURL('/foods/add');

  // 6. 食品登録フォーム入力
  await page.fill('[data-testid=food-name-input]', '初回登録食品');
  await page.selectOption('[data-testid=category-select]', '野菜');
  await page.fill('[data-testid=purchase-date-input]', '2024-01-01');
  await page.fill('[data-testid=expiry-date-input]', '2024-01-15');
  await page.fill('[data-testid=quantity-input]', '1');
  await page.selectOption('[data-testid=unit-select]', '個');
  await page.selectOption('[data-testid=storage-select]', '冷蔵庫');

  // 7. 保存アドバイス表示確認
  await expect(page.locator('[data-testid=storage-advice]')).toBeVisible();
  await expect(page.locator('[data-testid=storage-advice]'))
    .toContainText('冷蔵庫での保存が最適です');

  // 8. 食品登録実行
  await page.click('[data-testid=save-food-button]');

  // 9. 登録完了確認
  await expect(page.locator('[data-testid=success-toast]'))
    .toContainText('食品を登録しました');
  await expect(page).toHaveURL('/dashboard');

  // 10. ダッシュボードに反映確認
  await expect(page.locator('[data-testid=food-card]').first())
    .toContainText('初回登録食品');
});
```

### 3.2 日常的な食品管理フロー

#### シナリオ概要
既存ユーザーの日常的な食品登録・管理・消費の流れ

#### テストステップ
```typescript
test('日常的な食品管理フロー', async ({ page }) => {
  // 事前準備: ログイン済み状態
  await loginAsTestUser(page, testUsers.regularUser);
  await page.goto('/dashboard');

  // 1. 期限切れ間近食品の確認
  await expect(page.locator('[data-testid=alert-summary]'))
    .toContainText('期限切れ間近');

  const alertCount = await page.locator('[data-testid=expiring-count]').textContent();
  expect(parseInt(alertCount || '0')).toBeGreaterThan(0);

  // 2. 食品リストのフィルタリング
  await page.click('[data-testid=filter-button]');
  await page.check('[data-testid=filter-expiring-soon]');
  await page.click('[data-testid=apply-filter-button]');

  // 3. 期限切れ間近食品のみ表示確認
  const visibleCards = page.locator('[data-testid=food-card]');
  const cardCount = await visibleCards.count();

  for (let i = 0; i < cardCount; i++) {
    const card = visibleCards.nth(i);
    await expect(card).toHaveClass(/expiring-soon/);
  }

  // 4. 特定食品の詳細確認
  await page.click('[data-testid=food-card]', { nth: 0 });
  await expect(page.locator('[data-testid=food-detail-modal]')).toBeVisible();

  // 5. レシピ提案確認
  await page.click('[data-testid=suggest-recipe-button]');
  await expect(page.locator('[data-testid=recipe-suggestions]')).toBeVisible();
  await expect(page.locator('[data-testid=recipe-card]').first()).toBeVisible();

  // 6. レシピ詳細確認
  await page.click('[data-testid=recipe-card]', { nth: 0 });
  await expect(page.locator('[data-testid=recipe-detail-modal]')).toBeVisible();
  await expect(page.locator('[data-testid=recipe-ingredients]')).toBeVisible();
  await expect(page.locator('[data-testid=recipe-instructions]')).toBeVisible();

  // 7. 食品消費記録
  await page.click('[data-testid=close-modal-button]');
  await page.click('[data-testid=mark-consumed-button]');

  // 8. 消費確認ダイアログ
  await expect(page.locator('[data-testid=consume-confirm-dialog]')).toBeVisible();
  await page.click('[data-testid=confirm-consume-button]');

  // 9. 消費完了確認
  await expect(page.locator('[data-testid=success-toast]'))
    .toContainText('食品を消費済みにしました');

  // 10. ダッシュボード更新確認
  const newAlertCount = await page.locator('[data-testid=expiring-count]').textContent();
  expect(parseInt(newAlertCount || '0')).toBeLessThan(parseInt(alertCount || '0'));
});
```

### 3.3 買い物リスト生成・管理フロー

#### シナリオ概要
在庫から買い物リストを自動生成し、買い物を管理する流れ

#### テストステップ
```typescript
test('買い物リスト生成・管理フロー', async ({ page }) => {
  // 事前準備: ログイン済み状態
  await loginAsTestUser(page, testUsers.regularUser);

  // 1. 買い物リストページへ移動
  await page.goto('/shopping-lists');
  await expect(page.locator('h1')).toContainText('買い物リスト');

  // 2. 自動生成機能の実行
  await page.click('[data-testid=auto-generate-button]');
  await expect(page.locator('[data-testid=generating-loader]')).toBeVisible();

  // 3. 生成完了確認
  await expect(page.locator('[data-testid=generating-loader]')).not.toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid=generated-list]')).toBeVisible();

  // 4. 提案された商品の確認
  const suggestedItems = page.locator('[data-testid=suggested-item]');
  const itemCount = await suggestedItems.count();
  expect(itemCount).toBeGreaterThan(0);

  // 5. 商品の選択・追加
  await page.check('[data-testid=suggested-item-checkbox]', { nth: 0 });
  await page.check('[data-testid=suggested-item-checkbox]', { nth: 1 });
  await page.click('[data-testid=add-selected-items-button]');

  // 6. カスタム商品の追加
  await page.click('[data-testid=add-custom-item-button]');
  await page.fill('[data-testid=custom-item-name]', 'カスタム商品');
  await page.fill('[data-testid=custom-item-quantity]', '2');
  await page.selectOption('[data-testid=custom-item-unit]', '個');
  await page.click('[data-testid=add-custom-item-confirm]');

  // 7. リスト保存
  await page.fill('[data-testid=list-name-input]', 'テスト買い物リスト');
  await page.click('[data-testid=save-list-button]');

  // 8. 保存完了確認
  await expect(page.locator('[data-testid=success-toast]'))
    .toContainText('買い物リストを保存しました');

  // 9. 価格比較機能確認
  await page.click('[data-testid=price-comparison-button]');
  await expect(page.locator('[data-testid=price-comparison-modal]')).toBeVisible();
  await expect(page.locator('[data-testid=store-price-info]')).toBeVisible();

  // 10. 買い物完了処理
  await page.click('[data-testid=close-modal-button]');
  await page.check('[data-testid=shopping-item-checkbox]', { nth: 0 });
  await page.check('[data-testid=shopping-item-checkbox]', { nth: 1 });

  // 11. 完了アイテムの視覚的確認
  const completedItems = page.locator('[data-testid=shopping-item-completed]');
  const completedCount = await completedItems.count();
  expect(completedCount).toBe(2);
});
```

### 3.4 通知・アラート機能フロー

#### シナリオ概要
通知設定から実際のアラート受信・対応までの流れ

#### テストステップ
```typescript
test('通知・アラート機能フロー', async ({ page, context }) => {
  // 事前準備: ログイン済み状態
  await loginAsTestUser(page, testUsers.regularUser);

  // 1. 通知設定ページへ移動
  await page.goto('/settings/notifications');
  await expect(page.locator('h1')).toContainText('通知設定');

  // 2. プッシュ通知の有効化
  await page.check('[data-testid=enable-push-notifications]');

  // 3. 期限アラート設定
  await page.selectOption('[data-testid=alert-timing-select]', '3'); // 3日前
  await page.check('[data-testid=daily-summary-enabled]');
  await page.fill('[data-testid=summary-time-input]', '09:00');

  // 4. 設定保存
  await page.click('[data-testid=save-notification-settings]');
  await expect(page.locator('[data-testid=success-toast]'))
    .toContainText('通知設定を保存しました');

  // 5. テスト用期限切れ間近食品の追加
  await page.goto('/foods/add');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await page.fill('[data-testid=food-name-input]', '期限テスト食品');
  await page.selectOption('[data-testid=category-select]', '野菜');
  await page.fill('[data-testid=purchase-date-input]', '2024-01-01');
  await page.fill('[data-testid=expiry-date-input]', tomorrowStr);
  await page.fill('[data-testid=quantity-input]', '1');
  await page.click('[data-testid=save-food-button]');

  // 6. ダッシュボードでアラート確認
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid=alert-banner]')).toBeVisible();
  await expect(page.locator('[data-testid=alert-banner]'))
    .toContainText('期限切れ間近の食品があります');

  // 7. アラート詳細確認
  await page.click('[data-testid=alert-banner]');
  await expect(page.locator('[data-testid=alert-detail-modal]')).toBeVisible();
  await expect(page.locator('[data-testid=expiring-food-list]')).toBeVisible();

  // 8. アラートからレシピ提案
  await page.click('[data-testid=suggest-recipes-from-alert]');
  await expect(page.locator('[data-testid=alert-recipe-suggestions]')).toBeVisible();

  // 9. 通知履歴確認
  await page.click('[data-testid=close-modal-button]');
  await page.goto('/notifications');
  await expect(page.locator('[data-testid=notification-list]')).toBeVisible();

  const notifications = page.locator('[data-testid=notification-item]');
  const notificationCount = await notifications.count();
  expect(notificationCount).toBeGreaterThan(0);

  // 10. 通知の既読処理
  await page.click('[data-testid=notification-item]', { nth: 0 });
  await expect(page.locator('[data-testid=notification-item]', { nth: 0 }))
    .toHaveClass(/read/);
});
```

## 4. クロスブラウザテストシナリオ

### 4.1 ブラウザ固有機能テスト

#### Chrome: カメラAPI テスト
```typescript
test('Chrome: バーコードスキャン機能', async ({ page }) => {
  await loginAsTestUser(page, testUsers.regularUser);
  await page.goto('/foods/add');

  // カメラアクセス許可のモック
  await context.grantPermissions(['camera']);

  // バーコードスキャンタブ選択
  await page.click('[data-testid=barcode-scan-tab]');
  await expect(page.locator('[data-testid=camera-view]')).toBeVisible();

  // モックバーコードデータでテスト
  await page.evaluate(() => {
    // カメラのモックレスポンス
    window.mockBarcodeDetection('4901234567890');
  });

  // 商品情報自動入力確認
  await expect(page.locator('[data-testid=food-name-input]')).toHaveValue('モック商品名');
  await expect(page.locator('[data-testid=category-select]')).toHaveValue('その他');
});
```

#### Firefox: プライベートモードテスト
```typescript
test('Firefox: プライベートモードでの動作確認', async ({ page }) => {
  // プライベートモードでの制限確認
  await page.goto('/');

  // localStorage アクセステスト
  await page.evaluate(() => {
    try {
      localStorage.setItem('test', 'value');
      localStorage.removeItem('test');
    } catch (error) {
      console.log('localStorage access restricted');
    }
  });

  // 基本機能の動作確認
  await page.click('[data-testid=login-button]');
  await page.fill('[data-testid=email-input]', testUsers.regularUser.email);
  await page.fill('[data-testid=password-input]', testUsers.regularUser.password);
  await page.click('[data-testid=submit-login]');

  await expect(page).toHaveURL('/dashboard');
});
```

### 4.2 レスポンシブデザインテスト

#### モバイルビューテスト
```typescript
test('モバイル表示での操作確認', async ({ page }) => {
  // モバイルビューポート設定
  await page.setViewportSize({ width: 375, height: 667 });

  await loginAsTestUser(page, testUsers.regularUser);
  await page.goto('/dashboard');

  // モバイル専用ナビゲーション確認
  await expect(page.locator('[data-testid=mobile-nav]')).toBeVisible();
  await expect(page.locator('[data-testid=desktop-nav]')).not.toBeVisible();

  // タッチ操作確認
  await page.tap('[data-testid=add-food-fab]');
  await expect(page).toHaveURL('/foods/add');

  // スワイプ操作確認（食品カード）
  await page.goto('/dashboard');
  const firstCard = page.locator('[data-testid=food-card]').first();
  await firstCard.tap();

  // カード詳細モーダルの表示確認
  await expect(page.locator('[data-testid=food-detail-modal]')).toBeVisible();
});
```

#### タブレットビューテスト
```typescript
test('タブレット表示での操作確認', async ({ page }) => {
  // タブレットビューポート設定
  await page.setViewportSize({ width: 768, height: 1024 });

  await loginAsTestUser(page, testUsers.regularUser);
  await page.goto('/dashboard');

  // 2カラムレイアウト確認
  await expect(page.locator('[data-testid=sidebar]')).toBeVisible();
  await expect(page.locator('[data-testid=main-content]')).toBeVisible();

  // サイドバーナビゲーション確認
  await page.click('[data-testid=sidebar-recipes]');
  await expect(page).toHaveURL('/recipes');

  // 画面分割表示確認
  await page.click('[data-testid=recipe-card]', { nth: 0 });
  await expect(page.locator('[data-testid=recipe-detail-panel]')).toBeVisible();
  await expect(page.locator('[data-testid=recipe-list-panel]')).toBeVisible();
});
```

## 5. パフォーマンステストシナリオ

### 5.1 大量データテスト

#### 大量食品データでの動作確認
```typescript
test('大量食品データでのパフォーマンス確認', async ({ page }) => {
  // 大量テストデータの準備
  await setupLargeDataSet(1000); // 1000件の食品データ

  await loginAsTestUser(page, testUsers.regularUser);

  // ページロード時間測定
  const startTime = Date.now();
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid=food-grid]');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(3000); // 3秒以内

  // スクロールパフォーマンス確認
  await page.evaluate(() => {
    return new Promise((resolve) => {
      let scrollCount = 0;
      const maxScrolls = 10;

      const scroll = () => {
        window.scrollBy(0, 500);
        scrollCount++;

        if (scrollCount < maxScrolls) {
          requestAnimationFrame(scroll);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(scroll);
    });
  });

  // レンダリングパフォーマンス確認
  const metrics = await page.evaluate(() => performance.getEntriesByType('measure'));
  console.log('Performance metrics:', metrics);
});
```

### 5.2 ネットワーク制限テスト

#### 低速ネットワークでの動作確認
```typescript
test('低速ネットワークでの動作確認', async ({ page, context }) => {
  // ネットワーク速度制限
  await context.route('**/*', (route) => {
    // 500ms の遅延を追加
    setTimeout(() => route.continue(), 500);
  });

  await loginAsTestUser(page, testUsers.regularUser);

  // ローディング表示確認
  const dashboardPromise = page.goto('/dashboard');
  await expect(page.locator('[data-testid=loading-spinner]')).toBeVisible();

  await dashboardPromise;
  await expect(page.locator('[data-testid=loading-spinner]')).not.toBeVisible();

  // オフライン機能確認
  await context.setOffline(true);

  // キャッシュされたデータの表示確認
  await page.reload();
  await expect(page.locator('[data-testid=offline-banner]')).toBeVisible();
  await expect(page.locator('[data-testid=food-grid]')).toBeVisible(); // キャッシュから表示
});
```

## 6. 自動化対象範囲・実行設定

### 6.1 自動化対象機能
#### 高優先度（毎日実行）
- ユーザー認証フロー
- 食品CRUD操作
- 基本的なナビゲーション
- アラート機能

#### 中優先度（週次実行）
- レシピ提案機能
- 買い物リスト機能
- 通知設定
- 設定変更

#### 低優先度（リリース前実行）
- パフォーマンステスト
- クロスブラウザテスト
- レスポンシブテスト

### 6.2 Playwright設定ファイル
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['allure-playwright'],
    ['github']
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run start:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 6.3 CI/CD統合設定
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright Browsers
      run: npx playwright install --with-deps

    - name: Start application
      run: |
        npm run build
        npm run start:test &

    - name: Wait for server
      run: npx wait-on http://localhost:3000

    - name: Run Playwright tests
      run: npx playwright test

    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## 7. テスト結果分析・レポート

### 7.1 テスト実行レポート
- **実行結果サマリー**: 成功/失敗/スキップ数
- **実行時間分析**: 各テストケースの実行時間
- **エラー分析**: 失敗原因の詳細分析
- **スクリーンショット**: 失敗時の画面キャプチャ

### 7.2 品質メトリクス
- **テストカバレッジ**: 機能カバレッジ率
- **安定性指標**: フレーク率、成功率推移
- **パフォーマンス指標**: ページロード時間、レスポンス時間
- **ユーザビリティ指標**: 操作完了率、エラー発生率

### 7.3 継続的改善
- **定期的なテスト見直し**: 月次でテストケースレビュー
- **フレークテスト対策**: 不安定なテストの特定と修正
- **新機能テスト追加**: 機能追加に合わせたテスト拡張
- **パフォーマンス監視**: 継続的なパフォーマンス劣化チェック