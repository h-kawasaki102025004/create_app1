const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.MCP_PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Set proper encoding for responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// MCP Server endpoints
app.get('/mcp/info', (req, res) => {
  res.json({
    name: 'food-waste-mcp-server',
    version: '1.0.0',
    description: 'MCP server for food waste reduction app',
    capabilities: {
      tools: [
        'get_food_inventory',
        'add_food_item',
        'get_recipe_suggestions',
        'generate_shopping_list',
        'scan_barcode',
        'get_storage_advice',
        'get_expiry_alerts'
      ],
      resources: [
        'food-categories://list',
        'storage-tips://list'
      ]
    }
  });
});

// Mock tool endpoints
app.post('/mcp/tools/get_food_inventory', (req, res) => {
  const { user_id } = req.body;
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'りんご',
        category: 'fruits',
        quantity: 3,
        unit: '個',
        expiry_date: '2024-01-25',
        status: 'active'
      },
      {
        id: 2,
        name: '牛乳',
        category: 'dairy',
        quantity: 1,
        unit: 'L',
        expiry_date: '2024-01-20',
        status: 'active'
      }
    ]
  });
});

app.post('/mcp/tools/add_food_item', (req, res) => {
  const foodData = req.body;
  res.json({
    success: true,
    data: {
      id: Date.now(),
      ...foodData,
      status: 'active',
      created_at: new Date().toISOString()
    }
  });
});

app.post('/mcp/tools/get_recipe_suggestions', (req, res) => {
  const { user_id, ingredients } = req.body;

  // レシピデータベース
  const recipeDatabase = {
    'りんご': [
      {
        name: 'アップルパイ',
        description: 'りんごを使った簡単デザート',
        ingredients: ['りんご', '小麦粉', 'バター', '砂糖'],
        instructions: ['りんごを切る', '生地を作る', 'オーブンで焼く'],
        prep_time: 30,
        cook_time: 45,
        difficulty: 'medium',
        servings: 4,
        tags: ['デザート', '焼き菓子', 'りんご']
      },
      {
        name: 'りんごサラダ',
        description: 'さっぱり美味しいフルーツサラダ',
        ingredients: ['りんご', 'レタス', 'ナッツ', 'ドレッシング'],
        instructions: ['りんごを薄切りする', 'レタスと混ぜる', 'ナッツをトッピング'],
        prep_time: 10,
        cook_time: 0,
        difficulty: 'easy',
        servings: 2,
        tags: ['サラダ', 'ヘルシー', 'りんご']
      }
    ],
    '牛乳': [
      {
        name: 'ホットミルク',
        description: '温かくて優しい飲み物',
        ingredients: ['牛乳', 'はちみつ', 'シナモン'],
        instructions: ['牛乳を温める', 'はちみつを加える', 'シナモンをトッピング'],
        prep_time: 5,
        cook_time: 3,
        difficulty: 'easy',
        servings: 1,
        tags: ['ドリンク', '温かい', '牛乳']
      },
      {
        name: 'ミルクプリン',
        description: 'なめらかで美味しいプリン',
        ingredients: ['牛乳', '砂糖', 'ゼラチン', 'バニラエッセンス'],
        instructions: ['ゼラチンを溶かす', '牛乳と砂糖を混ぜる', '冷やし固める'],
        prep_time: 15,
        cook_time: 0,
        difficulty: 'medium',
        servings: 4,
        tags: ['デザート', 'プリン', '牛乳']
      }
    ],
    'なす': [
      {
        name: 'なすの味噌炒め',
        description: 'ご飯が進む定番おかず',
        ingredients: ['なす', '味噌', '砂糖', 'みりん', '油'],
        instructions: ['なすを切って油で炒める', '味噌、砂糖、みりんを混ぜた調味料を加える', '全体に絡めて完成'],
        prep_time: 10,
        cook_time: 15,
        difficulty: 'easy',
        servings: 2,
        tags: ['和食', 'おかず', 'なす']
      },
      {
        name: 'なすの揚げ浸し',
        description: '夏にぴったりのさっぱり料理',
        ingredients: ['なす', '出汁', '醤油', 'みりん', '生姜'],
        instructions: ['なすを素揚げする', 'つゆを作る', '揚げたなすをつゆに浸す'],
        prep_time: 15,
        cook_time: 10,
        difficulty: 'medium',
        servings: 3,
        tags: ['和食', '揚げ物', 'なす']
      }
    ]
  };

  // 組み合わせレシピ
  const combinationRecipes = [
    {
      ingredients: ['りんご', '牛乳'],
      recipe: {
        name: 'フルーツミルクシェイク',
        description: '牛乳とりんごの栄養満点ドリンク',
        ingredients: ['牛乳', 'りんご', 'はちみつ', '氷'],
        instructions: ['りんごを切る', '材料をミキサーに入れる', 'よく混ぜる', '氷を加える'],
        prep_time: 5,
        cook_time: 0,
        difficulty: 'easy',
        servings: 2,
        tags: ['ドリンク', 'フルーツ', 'ミルク']
      }
    }
  ];

  // 選択された食材に基づいてレシピを生成
  let suggestedRecipes = [];

  // 組み合わせレシピをチェック
  for (const combo of combinationRecipes) {
    if (combo.ingredients.every(ingredient => ingredients.includes(ingredient))) {
      suggestedRecipes.push(combo.recipe);
    }
  }

  // 個別の食材レシピを追加
  for (const ingredient of ingredients) {
    if (recipeDatabase[ingredient]) {
      suggestedRecipes = [...suggestedRecipes, ...recipeDatabase[ingredient]];
    }
  }

  // 重複削除と最大4つまで制限
  const uniqueRecipes = suggestedRecipes
    .filter((recipe, index, arr) =>
      arr.findIndex(r => r.name === recipe.name) === index
    )
    .slice(0, 4);

  // 食材に合うレシピがない場合のフォールバック
  if (uniqueRecipes.length === 0) {
    uniqueRecipes.push({
      name: '簡単サラダ',
      description: '利用可能な食材で作る簡単サラダ',
      ingredients: [...ingredients, 'ドレッシング'],
      instructions: ['材料を切る', '混ぜ合わせる', 'ドレッシングをかける'],
      prep_time: 10,
      cook_time: 0,
      difficulty: 'easy',
      servings: 2,
      tags: ['簡単', 'サラダ']
    });
  }

  res.json({
    success: true,
    data: uniqueRecipes
  });
});

app.post('/mcp/tools/generate_shopping_list', (req, res) => {
  const { user_id } = req.body;
  res.json({
    success: true,
    data: [
      { item: '卵', quantity: 6, unit: '個', priority: 'high' },
      { item: 'パン', quantity: 1, unit: '斤', priority: 'medium' },
      { item: '野菜', quantity: 1, unit: 'パック', priority: 'low' }
    ]
  });
});

app.post('/mcp/tools/scan_barcode', (req, res) => {
  const { barcode } = req.body;
  res.json({
    success: true,
    data: {
      barcode,
      name: `商品 ${barcode}`,
      category: '食品',
      suggested_expiry_days: 7,
      storage_advice: '冷蔵庫で保存してください'
    }
  });
});

app.post('/mcp/tools/get_storage_advice', (req, res) => {
  const { food_name } = req.body;
  res.json({
    success: true,
    data: {
      food_name,
      optimal_temperature: '2-5°C',
      storage_location: '冷蔵庫',
      tips: [
        '密閉容器に入れる',
        '湿気を避ける',
        '他の食材と分けて保存'
      ],
      shelf_life: '5-7日'
    }
  });
});

app.post('/mcp/tools/get_expiry_alerts', (req, res) => {
  const { user_id, days_ahead = 3 } = req.body;
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'りんご',
        expiry_date: '2024-01-25',
        days_until_expiry: 2,
        urgency: 'medium',
        suggestions: ['アップルパイを作る', 'ジュースにする']
      }
    ]
  });
});

// Resource endpoints
app.get('/mcp/resources/food-categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: '野菜', icon: '🥬' },
      { id: 2, name: '果物', icon: '🍎' },
      { id: 3, name: '肉類', icon: '🥩' },
      { id: 4, name: '乳製品', icon: '🥛' },
      { id: 5, name: '穀物', icon: '🌾' }
    ]
  });
});

app.get('/mcp/resources/storage-tips', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        category: '野菜',
        tips: [
          '湿気を保つため野菜室で保存',
          'エチレンガス発生野菜は分けて保存',
          '葉物野菜は乾燥を防ぐ'
        ]
      },
      {
        category: '果物',
        tips: [
          'バナナは常温で保存',
          'りんごは冷蔵庫で長持ち',
          '熟していない果物は常温で追熟'
        ]
      }
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MCP Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `MCP endpoint ${req.originalUrl} not found`,
    available_endpoints: [
      'GET /mcp/info',
      'POST /mcp/tools/*',
      'GET /mcp/resources/*',
      'GET /health'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔗 Food Waste MCP Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Server info: http://localhost:${PORT}/mcp/info`);
  console.log('');
  console.log('Available MCP Tools:');
  console.log('  - get_food_inventory');
  console.log('  - add_food_item');
  console.log('  - get_recipe_suggestions');
  console.log('  - generate_shopping_list');
  console.log('  - scan_barcode');
  console.log('  - get_storage_advice');
  console.log('  - get_expiry_alerts');
});

module.exports = app;