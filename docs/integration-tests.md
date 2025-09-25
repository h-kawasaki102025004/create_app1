# 結合テスト方針書

## 1. 結合テスト概要

### 1.1 テスト目的
- システム間の連携動作確認
- データの整合性検証
- 外部サービスとの統合確認
- APIとデータベースの結合動作検証
- MCPサーバーとの連携確認

### 1.2 テスト方針
- **ボトムアップ統合**：下位モジュールから段階的に統合
- **リスクベース**：クリティカルな統合ポイントを重点的にテスト
- **データドリブン**：多様なテストデータによる検証
- **環境分離**：本番環境に影響しない専用テスト環境

### 1.3 統合レベル
```
┌─────────────────────────────────────────────────────────┐
│                 System Integration                      │
│              (External APIs)                            │
├─────────────────────────────────────────────────────────┤
│              Component Integration                      │
│           (Frontend ↔ Backend API)                     │
├─────────────────────────────────────────────────────────┤
│               Service Integration                       │
│        (Business Logic ↔ Data Access)                  │
├─────────────────────────────────────────────────────────┤
│                Module Integration                       │
│            (Class ↔ Class)                            │
└─────────────────────────────────────────────────────────┘
```

## 2. テスト環境・ツール設定

### 2.1 テストフレームワーク
- **Jest + Supertest**: APIエンドポイントテスト
- **Testcontainers**: データベースコンテナテスト
- **MSW (Mock Service Worker)**: 外部API モック
- **Docker Compose**: 統合テスト環境構築

### 2.2 テスト用インフラ
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:14
    environment:
      POSTGRES_DB: foodapp_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    volumes:
      - test_db_data:/var/lib/postgresql/data

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"

  app-test:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://test:test@postgres-test:5432/foodapp_test
      REDIS_URL: redis://redis-test:6379
    depends_on:
      - postgres-test
      - redis-test
    ports:
      - "3001:3000"

  mcp-server-test:
    build:
      context: ./mcp-server
      dockerfile: Dockerfile.test
    environment:
      DATABASE_URL: postgresql://test:test@postgres-test:5432/foodapp_test
    depends_on:
      - postgres-test
    ports:
      - "8001:8000"

volumes:
  test_db_data:
```

### 2.3 テストデータ管理
```typescript
// test-data-manager.ts
export class TestDataManager {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async setupTestData(): Promise<void> {
    // ユーザーデータ
    await this.createTestUsers();

    // カテゴリデータ
    await this.createTestCategories();

    // 食品データ
    await this.createTestFoods();

    // レシピデータ
    await this.createTestRecipes();
  }

  async cleanupTestData(): Promise<void> {
    await this.db.query('TRUNCATE TABLE foods CASCADE');
    await this.db.query('TRUNCATE TABLE users CASCADE');
    await this.db.query('TRUNCATE TABLE categories CASCADE');
    await this.db.query('TRUNCATE TABLE recipes CASCADE');
  }

  private async createTestUsers(): Promise<void> {
    const users = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        password_hash: await hashPassword('password123')
      },
      {
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: await hashPassword('password123')
      }
    ];

    for (const user of users) {
      await this.db.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
        [user.username, user.email, user.password_hash]
      );
    }
  }
}
```

## 3. API・データベース結合テスト

### 3.1 認証システム結合テスト

#### ユーザー登録・認証フロー
```typescript
describe('Authentication Integration', () => {
  let testDb: TestDatabase;
  let app: Express;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = createApp(testDb.connection);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('User Registration Flow', () => {
    it('新規ユーザー登録からログインまでの一連の流れ', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePassword123!'
      };

      // 1. ユーザー登録
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(userData.email);

      // 2. データベース確認
      const dbUser = await testDb.query(
        'SELECT * FROM users WHERE email = $1',
        [userData.email]
      );
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].username).toBe(userData.username);

      // 3. ログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body).toHaveProperty('user');

      // 4. トークン検証
      const token = loginResponse.body.token;
      const protectedResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body.user.id).toBe(registerResponse.body.user.id);
    });
  });

  describe('JWT Token Management', () => {
    let userId: number;
    let accessToken: string;

    beforeEach(async () => {
      // テストユーザー作成
      const user = await createTestUser();
      userId = user.id;

      // ログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123'
        });

      accessToken = loginResponse.body.token;
    });

    it('トークンリフレッシュ機能', async () => {
      // リフレッシュトークンでアクセストークン更新
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('token');
      expect(refreshResponse.body.token).not.toBe(accessToken);

      // 新しいトークンで認証確認
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .expect(200);
    });

    it('トークン失効処理', async () => {
      // ログアウト
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 失効したトークンでアクセス試行
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
```

### 3.2 食品管理システム結合テスト

#### 食品CRUD操作とデータ整合性
```typescript
describe('Food Management Integration', () => {
  let testDb: TestDatabase;
  let app: Express;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = createApp(testDb.connection);

    // テストユーザーでログイン
    const authResult = await setupAuthenticatedUser(app);
    authToken = authResult.token;
    userId = authResult.userId;
  });

  describe('Food Creation and Validation', () => {
    it('食品登録時のデータ検証と関連テーブル更新', async () => {
      const foodData = {
        name: '統合テスト食品',
        category_id: 1,
        purchase_date: '2024-01-01',
        expiry_date: '2024-01-15',
        quantity: 2.5,
        unit: 'kg',
        storage_location: '冷蔵庫'
      };

      // 1. 食品登録
      const createResponse = await request(app)
        .post('/api/foods')
        .set('Authorization', `Bearer ${authToken}`)
        .send(foodData)
        .expect(201);

      const createdFood = createResponse.body;
      expect(createdFood.id).toBeDefined();
      expect(createdFood.name).toBe(foodData.name);

      // 2. データベース直接確認
      const dbFood = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [createdFood.id]
      );
      expect(dbFood.rows).toHaveLength(1);
      expect(dbFood.rows[0].user_id).toBe(userId);
      expect(dbFood.rows[0].quantity).toBe('2.5');

      // 3. 関連テーブル確認（カテゴリ）
      const categoryCheck = await testDb.query(
        `SELECT f.*, c.name as category_name
         FROM foods f
         JOIN categories c ON f.category_id = c.id
         WHERE f.id = $1`,
        [createdFood.id]
      );
      expect(categoryCheck.rows[0].category_name).toBeDefined();

      // 4. API経由での取得確認
      const getResponse = await request(app)
        .get(`/api/foods/${createdFood.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.name).toBe(foodData.name);
      expect(getResponse.body.category).toHaveProperty('name');
    });
  });

  describe('Food Update and Cascade Operations', () => {
    let foodId: number;

    beforeEach(async () => {
      const food = await createTestFood(userId);
      foodId = food.id;
    });

    it('食品更新時のトランザクション処理', async () => {
      const updateData = {
        name: '更新された食品名',
        quantity: 1,
        expiry_date: '2024-02-01'
      };

      // 更新前の状態確認
      const beforeUpdate = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [foodId]
      );
      const originalUpdatedAt = beforeUpdate.rows[0].updated_at;

      // 更新実行
      const updateResponse = await request(app)
        .put(`/api/foods/${foodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // API レスポンス確認
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.quantity).toBe(updateData.quantity);

      // データベース確認
      const afterUpdate = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [foodId]
      );
      const updatedRecord = afterUpdate.rows[0];

      expect(updatedRecord.name).toBe(updateData.name);
      expect(parseFloat(updatedRecord.quantity)).toBe(updateData.quantity);
      expect(updatedRecord.updated_at).not.toEqual(originalUpdatedAt);
    });
  });

  describe('Food Deletion and Cleanup', () => {
    it('食品削除時の関連データクリーンアップ', async () => {
      // テスト用食品と関連データ作成
      const food = await createTestFood(userId);
      const foodId = food.id;

      // 関連する通知作成
      await testDb.query(
        'INSERT INTO notifications (user_id, food_id, type, message) VALUES ($1, $2, $3, $4)',
        [userId, foodId, 'expiry_alert', 'テスト通知']
      );

      // 削除前の関連データ確認
      const beforeDelete = await testDb.query(
        'SELECT COUNT(*) FROM notifications WHERE food_id = $1',
        [foodId]
      );
      expect(parseInt(beforeDelete.rows[0].count)).toBeGreaterThan(0);

      // 削除実行
      await request(app)
        .delete(`/api/foods/${foodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 食品削除確認
      const foodCheck = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [foodId]
      );
      expect(foodCheck.rows).toHaveLength(0);

      // 関連する通知の削除確認（CASCADE）
      const afterDelete = await testDb.query(
        'SELECT COUNT(*) FROM notifications WHERE food_id = $1',
        [foodId]
      );
      expect(parseInt(afterDelete.rows[0].count)).toBe(0);
    });
  });
});
```

## 4. MCPサーバー結合テスト

### 4.1 MCP通信プロトコルテスト

#### MCPクライアント・サーバー間通信
```typescript
describe('MCP Server Integration', () => {
  let mcpClient: MCPClient;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    mcpClient = new MCPClient({
      serverUrl: 'http://localhost:8001',
      timeout: 5000
    });
    await mcpClient.connect();
  });

  afterAll(async () => {
    await mcpClient.disconnect();
    await testDb.cleanup();
  });

  describe('Food Inventory Management', () => {
    it('MCPサーバー経由での食品管理', async () => {
      // 1. MCP経由で食品追加
      const addRequest = {
        method: 'food_inventory_add',
        params: {
          user_id: 1,
          name: 'MCP経由食品',
          category: '野菜',
          expiry_date: '2024-12-31',
          quantity: 3,
          unit: '個'
        }
      };

      const addResponse = await mcpClient.request(addRequest);
      expect(addResponse.result.success).toBe(true);
      expect(addResponse.result.food_id).toBeDefined();

      const foodId = addResponse.result.food_id;

      // 2. データベース直接確認
      const dbCheck = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [foodId]
      );
      expect(dbCheck.rows).toHaveLength(1);
      expect(dbCheck.rows[0].name).toBe('MCP経由食品');

      // 3. MCP経由で食品一覧取得
      const listRequest = {
        method: 'food_inventory_list',
        params: {
          user_id: 1,
          limit: 10
        }
      };

      const listResponse = await mcpClient.request(listRequest);
      expect(listResponse.result.foods).toBeDefined();

      const createdFood = listResponse.result.foods.find(
        (food: any) => food.id === foodId
      );
      expect(createdFood).toBeDefined();
      expect(createdFood.name).toBe('MCP経由食品');

      // 4. MCP経由で食品削除
      const deleteRequest = {
        method: 'food_inventory_delete',
        params: {
          food_id: foodId,
          user_id: 1
        }
      };

      const deleteResponse = await mcpClient.request(deleteRequest);
      expect(deleteResponse.result.success).toBe(true);

      // 5. 削除確認
      const afterDeleteCheck = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [foodId]
      );
      expect(afterDeleteCheck.rows).toHaveLength(0);
    });
  });

  describe('Expiry Alert System', () => {
    it('期限切れアラート機能統合テスト', async () => {
      // 期限切れ間近食品作成
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await testDb.query(
        `INSERT INTO foods (user_id, category_id, name, purchase_date, expiry_date, quantity, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [1, 1, '期限切れ間近食品', '2024-01-01', tomorrow.toISOString().split('T')[0], 1, '個']
      );

      // MCPサーバー経由でアラートチェック
      const alertRequest = {
        method: 'expiry_alert_check',
        params: {
          user_id: 1,
          days_threshold: 3
        }
      };

      const alertResponse = await mcpClient.request(alertRequest);
      expect(alertResponse.result.alerts).toBeDefined();
      expect(alertResponse.result.alerts.length).toBeGreaterThan(0);

      const alert = alertResponse.result.alerts[0];
      expect(alert.food_name).toBe('期限切れ間近食品');
      expect(alert.days_until_expiry).toBeLessThanOrEqual(1);

      // 通知生成確認
      const notificationRequest = {
        method: 'expiry_alert_generate_notifications',
        params: {
          user_id: 1,
          alerts: alertResponse.result.alerts
        }
      };

      const notificationResponse = await mcpClient.request(notificationRequest);
      expect(notificationResponse.result.notifications_created).toBeGreaterThan(0);

      // データベースで通知作成確認
      const dbNotifications = await testDb.query(
        'SELECT * FROM notifications WHERE user_id = $1 AND type = $2',
        [1, 'expiry_alert']
      );
      expect(dbNotifications.rows.length).toBeGreaterThan(0);
    });
  });
});
```

### 4.2 MCPエラーハンドリングテスト

#### 通信エラー・データエラー処理
```typescript
describe('MCP Error Handling Integration', () => {
  let mcpClient: MCPClient;

  describe('Connection Error Handling', () => {
    it('MCPサーバー接続失敗時の処理', async () => {
      mcpClient = new MCPClient({
        serverUrl: 'http://localhost:9999', // 存在しないサーバー
        timeout: 1000
      });

      await expect(mcpClient.connect()).rejects.toThrow();
    });

    it('タイムアウト処理', async () => {
      mcpClient = new MCPClient({
        serverUrl: 'http://localhost:8001',
        timeout: 100 // 非常に短いタイムアウト
      });

      await mcpClient.connect();

      const request = {
        method: 'food_inventory_list',
        params: { user_id: 1, limit: 1000 } // 重い処理
      };

      await expect(mcpClient.request(request)).rejects.toThrow('timeout');
    });
  });

  describe('Data Validation Error Handling', () => {
    beforeAll(async () => {
      mcpClient = new MCPClient({
        serverUrl: 'http://localhost:8001',
        timeout: 5000
      });
      await mcpClient.connect();
    });

    it('無効なパラメータでのエラー処理', async () => {
      const invalidRequest = {
        method: 'food_inventory_add',
        params: {
          user_id: 'invalid', // 数値が期待される箇所に文字列
          name: '',           // 空文字
          expiry_date: 'invalid-date' // 無効な日付
        }
      };

      const response = await mcpClient.request(invalidRequest);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('権限エラー処理', async () => {
      const unauthorizedRequest = {
        method: 'food_inventory_delete',
        params: {
          food_id: 999,   // 存在しない食品ID
          user_id: 1
        }
      };

      const response = await mcpClient.request(unauthorizedRequest);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe('NOT_FOUND');
    });
  });
});
```

## 5. 外部API結合テスト

### 5.1 レシピAPI統合テスト

#### 楽天レシピAPI連携
```typescript
describe('External Recipe API Integration', () => {
  let app: Express;
  let authToken: string;

  // MSWでモックサーバー設定
  const server = setupServer(
    rest.get('https://app.rakuten.co.jp/services/api/Recipe/CategoryList/20170426', (req, res, ctx) => {
      return res(
        ctx.json({
          result: {
            large: [
              { categoryId: '30', categoryName: '肉' },
              { categoryId: '31', categoryName: '魚' }
            ]
          }
        })
      );
    }),

    rest.get('https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426', (req, res, ctx) => {
      const keyword = req.url.searchParams.get('keyword');

      return res(
        ctx.json({
          result: [
            {
              recipeId: 1234567890,
              recipeTitle: `${keyword}を使ったレシピ`,
              recipeUrl: 'https://recipe.rakuten.co.jp/recipe/1234567890',
              foodImageUrl: 'https://image.rakuten.co.jp/recipe/1234567890.jpg',
              recipeMaterial: [`${keyword} 200g`, 'たまねぎ 1個'],
              recipeIndication: '30分'
            }
          ]
        })
      );
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(async () => {
    app = createApp();
    const authResult = await setupAuthenticatedUser(app);
    authToken = authResult.token;
  });

  it('食材に基づくレシピ提案統合フロー', async () => {
    // 1. ユーザーの食材一覧取得
    const foodsResponse = await request(app)
      .get('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const foods = foodsResponse.body;
    expect(foods.length).toBeGreaterThan(0);

    // 2. 食材を基にしたレシピ提案リクエスト
    const suggestionRequest = {
      ingredients: foods.map(food => food.name),
      max_results: 5
    };

    const suggestResponse = await request(app)
      .post('/api/recipes/suggest')
      .set('Authorization', `Bearer ${authToken}`)
      .send(suggestionRequest)
      .expect(200);

    // 3. レスポンス検証
    expect(suggestResponse.body.recipes).toBeDefined();
    expect(suggestResponse.body.recipes.length).toBeGreaterThan(0);

    const recipe = suggestResponse.body.recipes[0];
    expect(recipe).toHaveProperty('recipeTitle');
    expect(recipe).toHaveProperty('recipeMaterial');
    expect(recipe).toHaveProperty('recipeIndication');

    // 4. 使用食材のマッチング確認
    const usedIngredients = recipe.recipeMaterial;
    const availableIngredients = foods.map(food => food.name);

    const matchingIngredients = usedIngredients.filter(ingredient =>
      availableIngredients.some(available =>
        ingredient.toLowerCase().includes(available.toLowerCase())
      )
    );

    expect(matchingIngredients.length).toBeGreaterThan(0);
  });

  it('外部APIエラー時のフォールバック処理', async () => {
    // MSWでエラーレスポンスを設定
    server.use(
      rest.get('https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const suggestionRequest = {
      ingredients: ['にんじん', 'たまねぎ'],
      max_results: 5
    };

    const suggestResponse = await request(app)
      .post('/api/recipes/suggest')
      .set('Authorization', `Bearer ${authToken}`)
      .send(suggestionRequest)
      .expect(200); // エラーでも200で返す（フォールバック）

    // フォールバックレシピが返されることを確認
    expect(suggestResponse.body.recipes).toBeDefined();
    expect(suggestResponse.body.fallback).toBe(true);
    expect(suggestResponse.body.message).toContain('外部API利用不可');
  });
});
```

### 5.2 AI API統合テスト

#### OpenAI/Claude API連携
```typescript
describe('AI API Integration', () => {
  let app: Express;
  let authToken: string;

  // OpenAI API モック
  const server = setupServer(
    rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
      return res(
        ctx.json({
          choices: [{
            message: {
              content: JSON.stringify({
                recipes: [
                  {
                    name: 'AI提案レシピ',
                    ingredients: ['にんじん 1本', 'たまねぎ 1個'],
                    instructions: ['材料を切る', '炒める', '調味料で味付け'],
                    cooking_time: 20,
                    difficulty: 'easy'
                  }
                ],
                storage_advice: {
                  recommended_storage: '冷蔵庫',
                  temperature: '4-6度',
                  humidity: '85-90%',
                  shelf_life_days: 7
                }
              })
            }
          }]
        })
      );
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(async () => {
    app = createApp();
    const authResult = await setupAuthenticatedUser(app);
    authToken = authResult.token;
  });

  it('AI保存アドバイス統合フロー', async () => {
    const foodData = {
      name: 'トマト',
      category: '野菜',
      purchase_date: '2024-01-01'
    };

    // AI保存アドバイス取得
    const adviceResponse = await request(app)
      .post('/api/storage-advice/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send(foodData)
      .expect(200);

    expect(adviceResponse.body.storage_advice).toBeDefined();
    expect(adviceResponse.body.storage_advice.recommended_storage).toBeDefined();
    expect(adviceResponse.body.storage_advice.shelf_life_days).toBeGreaterThan(0);

    // アドバイスに基づく賞味期限自動設定
    const suggestedExpiryDate = new Date();
    suggestedExpiryDate.setDate(
      suggestedExpiryDate.getDate() + adviceResponse.body.storage_advice.shelf_life_days
    );

    const createFoodData = {
      ...foodData,
      expiry_date: suggestedExpiryDate.toISOString().split('T')[0],
      storage_location: adviceResponse.body.storage_advice.recommended_storage,
      quantity: 3,
      unit: '個'
    };

    const createResponse = await request(app)
      .post('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createFoodData)
      .expect(201);

    expect(createResponse.body.storage_location)
      .toBe(adviceResponse.body.storage_advice.recommended_storage);
  });

  it('AIレシピ提案とパーソナライゼーション', async () => {
    // ユーザーの食材と嗜好データ
    const suggestionData = {
      available_ingredients: ['鶏肉', 'にんじん', 'たまねぎ'],
      dietary_preferences: ['低カロリー', '時短'],
      cooking_skill: 'beginner',
      cooking_time_limit: 30
    };

    const aiSuggestionResponse = await request(app)
      .post('/api/recipes/ai-suggest')
      .set('Authorization', `Bearer ${authToken}`)
      .send(suggestionData)
      .expect(200);

    expect(aiSuggestionResponse.body.recipes).toBeDefined();
    expect(aiSuggestionResponse.body.recipes.length).toBeGreaterThan(0);

    const recipe = aiSuggestionResponse.body.recipes[0];
    expect(recipe.cooking_time).toBeLessThanOrEqual(30);
    expect(recipe.difficulty).toBe('easy');

    // 提案された料理の学習データ保存
    const learningData = {
      recipe_id: recipe.id,
      user_feedback: 'liked',
      cooking_completed: true
    };

    await request(app)
      .post('/api/recipes/feedback')
      .set('Authorization', `Bearer ${authToken}`)
      .send(learningData)
      .expect(200);

    // 学習データがパーソナライゼーションに反映されることを確認
    const personalizedResponse = await request(app)
      .post('/api/recipes/ai-suggest')
      .set('Authorization', `Bearer ${authToken}`)
      .send(suggestionData)
      .expect(200);

    // 過去に好評だった料理に類似したレシピが上位に来る
    expect(personalizedResponse.body.personalized).toBe(true);
  });
});
```

## 6. パフォーマンス結合テスト

### 6.1 データベース負荷テスト

#### 大量データでの結合動作確認
```typescript
describe('Database Performance Integration', () => {
  let testDb: TestDatabase;
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = createApp(testDb.connection);

    const authResult = await setupAuthenticatedUser(app);
    authToken = authResult.token;

    // 大量テストデータ作成
    await generateLargeDataSet(10000); // 10,000件の食品データ
  });

  it('大量データでのページング性能確認', async () => {
    const startTime = Date.now();

    // 1ページ目取得
    const page1Response = await request(app)
      .get('/api/foods?page=1&limit=50&sort=expiry_date')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const page1Time = Date.now() - startTime;
    expect(page1Time).toBeLessThan(1000); // 1秒以内

    expect(page1Response.body.foods).toHaveLength(50);
    expect(page1Response.body.total_count).toBeGreaterThan(10000);
    expect(page1Response.body.page).toBe(1);

    // 100ページ目取得（オフセット大）
    const page100StartTime = Date.now();

    const page100Response = await request(app)
      .get('/api/foods?page=100&limit=50&sort=expiry_date')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const page100Time = Date.now() - page100StartTime;
    expect(page100Time).toBeLessThan(2000); // 2秒以内（オフセット大でも許容範囲）

    expect(page100Response.body.foods).toHaveLength(50);
  });

  it('複雑な検索クエリの性能確認', async () => {
    const complexQuery = {
      search: 'テスト',
      categories: [1, 2, 3],
      expiry_within_days: 7,
      storage_locations: ['冷蔵庫', '冷凍庫'],
      quantity_min: 1,
      quantity_max: 10,
      sort: 'expiry_date',
      order: 'asc'
    };

    const startTime = Date.now();

    const searchResponse = await request(app)
      .post('/api/foods/search')
      .set('Authorization', `Bearer ${authToken}`)
      .send(complexQuery)
      .expect(200);

    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeLessThan(1500); // 1.5秒以内

    expect(searchResponse.body.foods).toBeDefined();
    expect(Array.isArray(searchResponse.body.foods)).toBe(true);
  });
});
```

### 6.2 並行処理テスト

#### 同時リクエスト処理確認
```typescript
describe('Concurrent Request Integration', () => {
  let app: Express;
  let authTokens: string[];

  beforeAll(async () => {
    app = createApp();

    // 複数ユーザーでの同時アクセス準備
    authTokens = [];
    for (let i = 0; i < 5; i++) {
      const authResult = await setupAuthenticatedUser(app, `user${i}`);
      authTokens.push(authResult.token);
    }
  });

  it('同時食品登録処理', async () => {
    const concurrentRequests = authTokens.map((token, index) => {
      const foodData = {
        name: `並行テスト食品${index}`,
        category_id: 1,
        purchase_date: '2024-01-01',
        expiry_date: '2024-01-15',
        quantity: index + 1,
        unit: '個',
        storage_location: '冷蔵庫'
      };

      return request(app)
        .post('/api/foods')
        .set('Authorization', `Bearer ${token}`)
        .send(foodData);
    });

    const startTime = Date.now();
    const responses = await Promise.all(concurrentRequests);
    const totalTime = Date.now() - startTime;

    // 全リクエスト成功確認
    responses.forEach((response, index) => {
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(`並行テスト食品${index}`);
    });

    // 並行処理時間確認
    expect(totalTime).toBeLessThan(3000); // 3秒以内

    // データベースの整合性確認
    for (let i = 0; i < responses.length; i++) {
      const foodId = responses[i].body.id;
      const dbCheck = await testDb.query(
        'SELECT * FROM foods WHERE id = $1',
        [foodId]
      );
      expect(dbCheck.rows).toHaveLength(1);
    }
  });

  it('同時読み込みと書き込みの混在処理', async () => {
    const mixedRequests = authTokens.flatMap((token, index) => [
      // 読み込みリクエスト
      request(app)
        .get('/api/foods')
        .set('Authorization', `Bearer ${token}`),

      // 書き込みリクエスト
      request(app)
        .post('/api/foods')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `混在テスト食品${index}`,
          category_id: 1,
          purchase_date: '2024-01-01',
          expiry_date: '2024-01-15',
          quantity: 1,
          unit: '個'
        })
    ]);

    const startTime = Date.now();
    const responses = await Promise.all(mixedRequests);
    const totalTime = Date.now() - startTime;

    // 全リクエスト成功確認
    responses.forEach(response => {
      expect([200, 201]).toContain(response.status);
    });

    console.log(`Mixed concurrent requests completed in ${totalTime}ms`);
    expect(totalTime).toBeLessThan(5000); // 5秒以内
  });
});
```

## 7. エラー処理・障害復旧テスト

### 7.1 データベース接続エラー処理

#### 接続断・再接続テスト
```typescript
describe('Database Connection Error Handling', () => {
  let app: Express;
  let authToken: string;
  let dbConnection: any;

  beforeEach(async () => {
    app = createApp();
    const authResult = await setupAuthenticatedUser(app);
    authToken = authResult.token;
    dbConnection = getDbConnection();
  });

  it('データベース接続断からの復旧', async () => {
    // 正常な状態で食品一覧取得
    await request(app)
      .get('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // データベース接続を意図的に切断
    await dbConnection.close();

    // 接続断時のエラーレスポンス確認
    const errorResponse = await request(app)
      .get('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(503);

    expect(errorResponse.body.error).toBe('Service temporarily unavailable');

    // 接続復旧後の動作確認
    await dbConnection.reconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 復旧待機

    const recoveryResponse = await request(app)
      .get('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(recoveryResponse.body.foods).toBeDefined();
  });

  it('トランザクション中断時のロールバック', async () => {
    const foodData = {
      name: 'トランザクションテスト食品',
      category_id: 1,
      purchase_date: '2024-01-01',
      expiry_date: '2024-01-15',
      quantity: 1,
      unit: '個'
    };

    // トランザクション開始
    const createPromise = request(app)
      .post('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .send(foodData);

    // トランザクション処理中にDB接続を切断
    setTimeout(async () => {
      await dbConnection.close();
    }, 100);

    // エラーレスポンス確認
    const response = await createPromise;
    expect([500, 503]).toContain(response.status);

    // 接続復旧後、不完全なデータが残っていないことを確認
    await dbConnection.reconnect();

    const verifyResponse = await request(app)
      .get('/api/foods')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const createdFood = verifyResponse.body.foods.find(
      food => food.name === 'トランザクションテスト食品'
    );
    expect(createdFood).toBeUndefined(); // ロールバックされて存在しない
  });
});
```

### 7.2 外部サービス障害対応テスト

#### 外部API障害時のフェイルオーバー
```typescript
describe('External Service Failure Handling', () => {
  let server: SetupServerApi;
  let app: Express;
  let authToken: string;

  beforeEach(async () => {
    app = createApp();
    const authResult = await setupAuthenticatedUser(app);
    authToken = authResult.token;
  });

  it('レシピAPI障害時のローカルデータフォールバック', async () => {
    // 外部APIを障害状態に設定
    server = setupServer(
      rest.get('https://app.rakuten.co.jp/services/api/*', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Service unavailable' }));
      })
    );
    server.listen();

    const suggestionRequest = {
      ingredients: ['にんじん', 'たまねぎ'],
      max_results: 5
    };

    const response = await request(app)
      .post('/api/recipes/suggest')
      .set('Authorization', `Bearer ${authToken}`)
      .send(suggestionRequest)
      .expect(200);

    // フォールバックレシピが返されることを確認
    expect(response.body.recipes).toBeDefined();
    expect(response.body.source).toBe('local_database');
    expect(response.body.fallback_reason).toContain('external_api_error');

    server.close();
  });

  it('AI API障害時のルールベースフォールバック', async () => {
    // AI APIを障害状態に設定
    server = setupServer(
      rest.post('https://api.openai.com/v1/*', (req, res, ctx) => {
        return res(ctx.status(503));
      })
    );
    server.listen();

    const adviceRequest = {
      food_name: 'トマト',
      category: '野菜',
      storage_condition: '常温'
    };

    const response = await request(app)
      .post('/api/storage-advice/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send(adviceRequest)
      .expect(200);

    // ルールベースアドバイスが返されることを確認
    expect(response.body.storage_advice).toBeDefined();
    expect(response.body.advice_source).toBe('rule_based');
    expect(response.body.confidence_level).toBe('medium');

    server.close();
  });
});
```

## 8. テスト自動化・継続的統合

### 8.1 CI/CD パイプライン設定

#### GitHub Actions設定
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: foodapp_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          npm run db:migrate:test
          npm run db:seed:test

      - name: Start MCP Server
        run: |
          cd mcp-server
          npm start &
          cd ..

      - name: Wait for services
        run: |
          npx wait-on http://localhost:8001/health
          npx wait-on tcp:5432

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/foodapp_test
          REDIS_URL: redis://localhost:6379
          MCP_SERVER_URL: http://localhost:8001

      - name: Generate test report
        if: always()
        run: npm run test:report

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: |
            coverage/
            test-results/
```

### 8.2 テスト環境管理

#### Docker Compose for Testing
```yaml
# docker-compose.integration.yml
version: '3.8'

services:
  app-integration:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      NODE_ENV: integration
      DATABASE_URL: postgresql://postgres:test@postgres-integration:5432/foodapp_integration
      REDIS_URL: redis://redis-integration:6379
      MCP_SERVER_URL: http://mcp-server-integration:8000
    depends_on:
      postgres-integration:
        condition: service_healthy
      redis-integration:
        condition: service_started
      mcp-server-integration:
        condition: service_healthy
    ports:
      - "3000:3000"
    volumes:
      - ./test-results:/app/test-results

  postgres-integration:
    image: postgres:14
    environment:
      POSTGRES_DB: foodapp_integration
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: test
    healthcheck:
      test: pg_isready -U postgres -d foodapp_integration
      interval: 10s
      timeout: 5s
      retries: 5

  redis-integration:
    image: redis:7-alpine
    command: redis-server --maxmemory 100mb --maxmemory-policy allkeys-lru

  mcp-server-integration:
    build:
      context: ./mcp-server
      dockerfile: Dockerfile.test
    environment:
      DATABASE_URL: postgresql://postgres:test@postgres-integration:5432/foodapp_integration
    healthcheck:
      test: curl -f http://localhost:8000/health
      interval: 10s
      timeout: 5s
      retries: 3
    depends_on:
      postgres-integration:
        condition: service_healthy
```

### 8.3 テストデータ管理・クリーンアップ

#### テストデータライフサイクル管理
```typescript
// test-lifecycle-manager.ts
export class TestLifecycleManager {
  private testDb: TestDatabase;
  private mcpClient: MCPClient;
  private redisClient: RedisClient;

  constructor(config: TestConfig) {
    this.testDb = new TestDatabase(config.database);
    this.mcpClient = new MCPClient(config.mcpServer);
    this.redisClient = new RedisClient(config.redis);
  }

  async setupIntegrationTest(): Promise<void> {
    // データベース初期化
    await this.testDb.initialize();
    await this.testDb.migrate();
    await this.testDb.seedBasicData();

    // MCPサーバー接続
    await this.mcpClient.connect();
    await this.mcpClient.healthCheck();

    // Redis接続・クリア
    await this.redisClient.connect();
    await this.redisClient.flushAll();

    // テスト用外部APIモック開始
    await this.startExternalApiMocks();
  }

  async teardownIntegrationTest(): Promise<void> {
    // テストデータクリーンアップ
    await this.testDb.cleanupTestData();

    // 接続クローズ
    await this.mcpClient.disconnect();
    await this.redisClient.disconnect();
    await this.testDb.close();

    // モックサーバー停止
    await this.stopExternalApiMocks();
  }

  async isolateTestCase(testName: string): Promise<TestCaseContext> {
    const testId = `test_${testName}_${Date.now()}`;

    // テスト専用ユーザー作成
    const testUser = await this.createIsolatedTestUser(testId);

    // テスト専用データ作成
    const testData = await this.setupTestCaseData(testId, testUser);

    return {
      testId,
      testUser,
      testData,
      cleanup: async () => {
        await this.cleanupTestCase(testId);
      }
    };
  }

  private async cleanupTestCase(testId: string): Promise<void> {
    // テストケース固有のデータを削除
    await this.testDb.query(
      'DELETE FROM foods WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)',
      [`%${testId}%`]
    );

    await this.testDb.query(
      'DELETE FROM users WHERE username LIKE $1',
      [`%${testId}%`]
    );

    // Redis のテスト用キー削除
    const keys = await this.redisClient.keys(`*${testId}*`);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}

// テスト実行例
describe('Integration Test with Lifecycle Management', () => {
  let lifecycleManager: TestLifecycleManager;

  beforeAll(async () => {
    lifecycleManager = new TestLifecycleManager(integrationTestConfig);
    await lifecycleManager.setupIntegrationTest();
  });

  afterAll(async () => {
    await lifecycleManager.teardownIntegrationTest();
  });

  it('isolated test case example', async () => {
    const testContext = await lifecycleManager.isolateTestCase('food_management');

    try {
      // テスト実行
      const authToken = await generateAuthToken(testContext.testUser);

      const response = await request(app)
        .get('/api/foods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.foods).toHaveLength(0); // 新規ユーザーなので空
    } finally {
      await testContext.cleanup();
    }
  });
});
```