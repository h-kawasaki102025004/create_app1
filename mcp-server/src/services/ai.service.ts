export interface RecipeRequest {
  ingredients: string[];
  dietary_restrictions?: string[];
  max_recipes?: number;
  cuisine_preference?: string;
}

export interface Recipe {
  name: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  nutritional_info?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = process.env.AI_API_BASE_URL || 'https://api.openai.com/v1';
  }

  async generateRecipeSuggestions(request: RecipeRequest): Promise<Recipe[]> {
    if (!this.apiKey) {
      // Return mock data if no API key is configured
      return this.getMockRecipes(request);
    }

    try {
      const prompt = this.buildRecipePrompt(request);
      const response = await this.callAI(prompt);
      return this.parseRecipeResponse(response);
    } catch (error) {
      console.error('AI recipe generation failed:', error);
      return this.getMockRecipes(request);
    }
  }

  private buildRecipePrompt(request: RecipeRequest): string {
    const { ingredients, dietary_restrictions, max_recipes = 5, cuisine_preference } = request;

    let prompt = `レシピを${max_recipes}個提案してください。以下の条件を満たすレシピをお願いします：

利用可能な食材：${ingredients.join(', ')}`;

    if (dietary_restrictions && dietary_restrictions.length > 0) {
      prompt += `\n食事制限：${dietary_restrictions.join(', ')}`;
    }

    if (cuisine_preference) {
      prompt += `\n料理のジャンル：${cuisine_preference}`;
    }

    prompt += `

各レシピについて、以下の情報を含めてください：
- 料理名
- 説明
- 必要な食材（分量付き）
- 作り方（ステップごと）
- 調理時間
- 難易度
- タグ

JSON形式で回答してください。`;

    return prompt;
  }

  private async callAI(prompt: string): Promise<string> {
    // This would implement the actual AI API call
    // For now, returning mock response
    throw new Error('AI API not implemented');
  }

  private parseRecipeResponse(response: string): Recipe[] {
    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  }

  private getMockRecipes(request: RecipeRequest): Recipe[] {
    const { ingredients, max_recipes = 5 } = request;

    const mockRecipes: Recipe[] = [
      {
        name: '野菜炒め',
        description: '残り野菜を使った簡単炒め物',
        ingredients: ingredients.slice(0, 3).map(ingredient => ({
          name: ingredient,
          amount: '100',
          unit: 'g'
        })),
        instructions: [
          'フライパンに油を熱する',
          '野菜を炒める',
          '塩コショウで味を調える'
        ],
        prep_time: 10,
        cook_time: 15,
        servings: 2,
        difficulty: 'easy',
        tags: ['簡単', '野菜', 'ヘルシー']
      },
      {
        name: 'ミックスサラダ',
        description: '新鮮な野菜のサラダ',
        ingredients: ingredients.slice(0, 2).map(ingredient => ({
          name: ingredient,
          amount: '50',
          unit: 'g'
        })),
        instructions: [
          '野菜を洗って切る',
          'ドレッシングと和える'
        ],
        prep_time: 15,
        cook_time: 0,
        servings: 2,
        difficulty: 'easy',
        tags: ['生野菜', 'ヘルシー', 'サラダ']
      }
    ];

    return mockRecipes.slice(0, max_recipes);
  }

  async lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
    // This would implement barcode lookup via external API
    // For now, returning mock data
    return {
      barcode,
      name: `商品 ${barcode}`,
      brand: 'サンプルブランド',
      category: '食品',
      nutritional_info: {
        calories: 100,
        protein: 5,
        carbs: 15,
        fat: 2
      }
    };
  }

  async generateShoppingRecommendations(currentInventory: string[], recipeIngredients: string[]): Promise<Array<{name: string, reason: string}>> {
    const needed = recipeIngredients.filter(ingredient =>
      !currentInventory.some(inv =>
        inv.toLowerCase().includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(inv.toLowerCase())
      )
    );

    return needed.map(ingredient => ({
      name: ingredient,
      reason: 'レシピに必要な食材です'
    }));
  }

  async getStorageAdvice(foodName: string, category?: string): Promise<{
    optimal_temperature: string;
    humidity: string;
    storage_location: string;
    tips: string[];
    shelf_life: string;
  }> {
    // Mock storage advice - in real implementation, this would use AI
    return {
      optimal_temperature: '0-4°C',
      humidity: '90-95%',
      storage_location: '冷蔵庫',
      tips: [
        '密閉容器に入れて保存',
        '直射日光を避ける',
        '湿気を避ける'
      ],
      shelf_life: '3-5日'
    };
  }
}