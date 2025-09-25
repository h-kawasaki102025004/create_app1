# 単体テスト方針書

## 1. テスト戦略概要

### 1.1 テスト目的
- コードの品質保証と信頼性向上
- リグレッション防止
- 継続的インテグレーションの実現
- 保守性の向上

### 1.2 テスト方針
- **テスト駆動開発（TDD）** の採用
- **テストピラミッド** に基づく階層的テスト
- **継続的テスト** の実現
- **カバレッジ目標**: 80%以上

### 1.3 テスト分類
```
┌─────────────────────────────────────┐
│           E2E Tests                 │ ← 少数・高価値
├─────────────────────────────────────┤
│         Integration Tests           │ ← 中程度
├─────────────────────────────────────┤
│            Unit Tests               │ ← 多数・高速
└─────────────────────────────────────┘
```

## 2. テストツール・フレームワーク選定

### 2.1 バックエンドテスト
#### メインフレームワーク
- **Jest**: JavaScript/TypeScript用テストフレームワーク
- **Supertest**: HTTP API テスト用
- **@types/jest**: TypeScript型定義

#### モック・スタブライブラリ
- **jest.mock()**: Jestネイティブモック機能
- **msw (Mock Service Worker)**: HTTPリクエストモック
- **testcontainers**: データベースコンテナテスト

#### アサーションライブラリ
- **Jest matcher**: Jestネイティブアサーション
- **@jest/globals**: グローバル型定義

### 2.2 フロントエンドテスト
#### メインフレームワーク
- **Jest**: JavaScript/TypeScript用テストフレームワーク
- **React Testing Library**: React コンポーネントテスト用
- **@testing-library/jest-dom**: DOM アサーション拡張

#### 追加ツール
- **@testing-library/user-event**: ユーザーインタラクションシミュレート
- **jest-environment-jsdom**: JSDOM環境
- **@types/testing-library__jest-dom**: TypeScript型定義

### 2.3 テストユーティリティ
- **Factory Pattern**: テストデータ生成
- **faker.js**: ランダムデータ生成
- **date-fns**: 日付操作テスト用

## 3. テストカバレッジ目標

### 3.1 カバレッジメトリクス
| メトリクス | 目標値 | 最低値 |
|------------|--------|--------|
| Line Coverage | 85% | 80% |
| Branch Coverage | 80% | 75% |
| Function Coverage | 90% | 85% |
| Statement Coverage | 85% | 80% |

### 3.2 カバレッジ除外対象
- 設定ファイル（config/*）
- テストファイル（*.test.ts, *.spec.ts）
- 型定義ファイル（*.d.ts）
- ビルド成果物（dist/, build/）

## 4. バックエンド単体テスト詳細

### 4.1 APIエンドポイントテスト

#### テスト対象
```typescript
// 認証API
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh

// 食品管理API
GET    /api/foods
POST   /api/foods
GET    /api/foods/:id
PUT    /api/foods/:id
DELETE /api/foods/:id

// その他API...
```

#### テストケース例（食品登録API）
```typescript
describe('POST /api/foods', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('正常系', () => {
    it('有効なデータで食品を登録できる', async () => {
      const foodData = {
        name: 'テスト食品',
        category_id: 1,
        purchase_date: '2024-01-01',
        expiry_date: '2024-01-15',
        quantity: 1,
        unit: '個',
        storage_location: '冷蔵庫'
      };

      const response = await request(app)
        .post('/api/foods')
        .set('Authorization', `Bearer ${validToken}`)
        .send(foodData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(foodData.name);
    });
  });

  describe('異常系', () => {
    it('認証なしでは401エラーになる', async () => {
      const foodData = { name: 'テスト食品' };

      await request(app)
        .post('/api/foods')
        .send(foodData)
        .expect(401);
    });

    it('必須項目なしでは400エラーになる', async () => {
      const invalidData = { name: '' };

      await request(app)
        .post('/api/foods')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData)
        .expect(400);
    });
  });
});
```

### 4.2 サービス層テスト

#### テスト対象
- ビジネスロジック
- データ変換処理
- 外部API連携処理
- バリデーション処理

#### テストケース例
```typescript
describe('FoodService', () => {
  let foodService: FoodService;
  let mockRepository: jest.Mocked<FoodRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    foodService = new FoodService(mockRepository);
  });

  describe('getExpiringFoods', () => {
    it('期限切れ間近の食品を正しく取得する', async () => {
      // Arrange
      const mockFoods = [
        createMockFood({ expiry_date: addDays(new Date(), 1) }),
        createMockFood({ expiry_date: addDays(new Date(), 10) }),
      ];
      mockRepository.findExpiringWithinDays.mockResolvedValue(mockFoods);

      // Act
      const result = await foodService.getExpiringFoods(3);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockRepository.findExpiringWithinDays).toHaveBeenCalledWith(3);
    });
  });
});
```

### 4.3 リポジトリ層テスト

#### テスト対象
- データベースCRUD操作
- クエリロジック
- トランザクション処理

#### テストケース例
```typescript
describe('FoodRepository', () => {
  let repository: FoodRepository;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    repository = new FoodRepository(testDb.connection);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('create', () => {
    it('食品データを正常に作成する', async () => {
      const foodData = createFoodData();

      const createdFood = await repository.create(foodData);

      expect(createdFood.id).toBeDefined();
      expect(createdFood.name).toBe(foodData.name);
    });
  });
});
```

### 4.4 MCPサーバーテスト

#### テスト対象
- MCPツール実装
- データ変換処理
- エラーハンドリング

#### テストケース例
```typescript
describe('FoodInventoryManager MCP Tool', () => {
  let mcpServer: MockMCPServer;

  beforeEach(() => {
    mcpServer = new MockMCPServer();
  });

  describe('addFood', () => {
    it('食品を正常に追加する', async () => {
      const request = {
        method: 'addFood',
        params: {
          name: 'テスト食品',
          expiry_date: '2024-12-31'
        }
      };

      const response = await mcpServer.handleRequest(request);

      expect(response.result.success).toBe(true);
      expect(response.result.food_id).toBeDefined();
    });
  });
});
```

## 5. フロントエンド単体テスト詳細

### 5.1 コンポーネントテスト

#### テスト対象
- レンダリング確認
- プロパティ受け渡し
- イベントハンドリング
- 条件分岐表示

#### テストケース例
```typescript
describe('FoodCard Component', () => {
  const mockFood = {
    id: 1,
    name: 'テスト食品',
    expiry_date: '2024-12-31',
    quantity: 1,
    unit: '個',
    status: 'active'
  };

  describe('レンダリング', () => {
    it('食品情報を正しく表示する', () => {
      render(<FoodCard food={mockFood} />);

      expect(screen.getByText('テスト食品')).toBeInTheDocument();
      expect(screen.getByText('2024-12-31')).toBeInTheDocument();
      expect(screen.getByText('1個')).toBeInTheDocument();
    });

    it('期限切れ間近の場合は警告スタイルを表示する', () => {
      const expiringFood = {
        ...mockFood,
        expiry_date: format(addDays(new Date(), 1), 'yyyy-MM-dd')
      };

      render(<FoodCard food={expiringFood} />);

      const card = screen.getByTestId('food-card');
      expect(card).toHaveClass('expiring-soon');
    });
  });

  describe('インタラクション', () => {
    it('クリック時にonClick関数が呼ばれる', async () => {
      const mockOnClick = jest.fn();
      render(<FoodCard food={mockFood} onClick={mockOnClick} />);

      const card = screen.getByTestId('food-card');
      await userEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockFood.id);
    });
  });
});
```

### 5.2 カスタムフックテスト

#### テスト対象
- ステート管理
- 副作用処理
- API呼び出し処理

#### テストケース例
```typescript
describe('useFoodList Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('データ取得', () => {
    it('初期化時に食品リストを取得する', async () => {
      const mockFoods = [createMockFood(), createMockFood()];
      (foodApi.getFoods as jest.Mock).mockResolvedValue(mockFoods);

      const { result } = renderHook(() => useFoodList());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.foods).toEqual(mockFoods);
      });
    });

    it('エラー時には適切にエラーを処理する', async () => {
      const errorMessage = 'API Error';
      (foodApi.getFoods as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useFoodList());

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.foods).toEqual([]);
      });
    });
  });
});
```

### 5.3 ページコンポーネントテスト

#### テスト対象
- ページ全体の統合動作
- ナビゲーション
- 状態管理連携

#### テストケース例
```typescript
describe('Dashboard Page', () => {
  beforeEach(() => {
    setupMockStore({
      auth: { user: mockUser, isAuthenticated: true },
      foods: { items: mockFoods, loading: false }
    });
  });

  it('ダッシュボード要素が正しく表示される', () => {
    render(<Dashboard />);

    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByTestId('food-summary')).toBeInTheDocument();
    expect(screen.getByTestId('alert-summary')).toBeInTheDocument();
  });

  it('期限切れ間近の食品がアラートに表示される', () => {
    const expiringFoods = mockFoods.filter(food =>
      isWithinDays(parseISO(food.expiry_date), 3)
    );

    render(<Dashboard />);

    expect(screen.getByText(`${expiringFoods.length}件の食品が期限切れ間近です`))
      .toBeInTheDocument();
  });
});
```

## 6. テストデータ管理

### 6.1 テストデータファクトリー

#### ファクトリーパターンの実装
```typescript
// テストデータファクトリー
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.datatype.number(),
  username: faker.internet.userName(),
  email: faker.internet.email(),
  created_at: faker.date.recent(),
  updated_at: faker.date.recent(),
  ...overrides,
});

export const createMockFood = (overrides?: Partial<Food>): Food => ({
  id: faker.datatype.number(),
  user_id: 1,
  category_id: 1,
  name: faker.commerce.productName(),
  purchase_date: format(faker.date.recent(), 'yyyy-MM-dd'),
  expiry_date: format(faker.date.future(), 'yyyy-MM-dd'),
  quantity: faker.datatype.number({ min: 1, max: 10 }),
  unit: faker.helpers.arrayElement(['個', 'kg', 'L']),
  storage_location: faker.helpers.arrayElement(['冷蔵庫', '冷凍庫', '常温']),
  status: 'active',
  created_at: faker.date.recent(),
  updated_at: faker.date.recent(),
  ...overrides,
});
```

### 6.2 データベース設定

#### テスト用データベース設定
```typescript
export class TestDatabase {
  private connection: Database;

  async setup(): Promise<void> {
    // テスト用データベース接続
    this.connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Food, Category],
      synchronize: true,
    });

    // 初期データ投入
    await this.seedData();
  }

  async cleanup(): Promise<void> {
    await this.connection.close();
  }

  async clear(): Promise<void> {
    const entities = this.connection.entityMetadatas;
    for (const entity of entities) {
      await this.connection.query(`DELETE FROM ${entity.tableName}`);
    }
  }

  private async seedData(): Promise<void> {
    // テスト用初期データを投入
    const categories = [
      { name: '野菜', icon: '🥬', color: '#4CAF50' },
      { name: '肉類', icon: '🥩', color: '#F44336' },
      { name: '乳製品', icon: '🥛', color: '#2196F3' },
    ];

    for (const category of categories) {
      await this.connection.query(
        `INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)`,
        [category.name, category.icon, category.color]
      );
    }
  }
}
```

## 7. テスト環境設定

### 7.1 Jest設定（jest.config.js）
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testTimeout: 10000,
};
```

### 7.2 フロントエンド用Jest設定（jest.config.frontend.js）
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/frontend/src'],
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/frontend/src/test/setup.ts',
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'frontend/src/**/*.{ts,tsx}',
    '!frontend/src/**/*.stories.tsx',
    '!frontend/src/**/*.d.ts',
  ],
};
```

## 8. テスト実行・CI/CD連携

### 8.1 NPMスクリプト設定
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:backend": "jest --config jest.config.js",
    "test:frontend": "jest --config jest.config.frontend.js"
  }
}
```

### 8.2 GitHub Actions設定
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 9. テスト保守・運用

### 9.1 テスト保守方針
- **定期的なテストレビュー**: 月1回のテストコード品質チェック
- **フレークテスト対応**: 不安定なテストの特定と修正
- **テスト性能監視**: 実行時間の監視と最適化
- **テストデータ管理**: 古いテストデータの定期清掃

### 9.2 テストメトリクス監視
- テスト実行時間
- テスト成功率
- コードカバレッジ推移
- テスト追加・削除履歴

### 9.3 品質ゲート設定
- **プルリクエスト**: 全テスト成功必須
- **カバレッジ**: 80%以上必須
- **新機能**: テスト実装必須
- **バグ修正**: リグレッションテスト必須