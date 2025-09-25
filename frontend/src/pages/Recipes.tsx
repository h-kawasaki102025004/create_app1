import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const Recipes = () => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const { data: foods } = useQuery({
    queryKey: ['foods'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/foods`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch foods');
      return response.json();
    },
  });

  const foodData = foods?.data || [];
  const availableIngredients = foodData
    .filter((food: any) => food.status === 'active')
    .map((food: any) => food.name)
    .filter((name: string) => name && /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9\s]+$/.test(name)); // 文字化けをフィルタリング


  const fetchRecipes = async () => {
    const ingredientsToUse = selectedIngredients.length > 0 ? selectedIngredients : availableIngredients;

    if (ingredientsToUse.length === 0) {
      toast.error('使用する食材を選択してください。');
      return;
    }

    setIsLoadingRecipes(true);
    try {
      const response = await fetch('http://localhost:8001/mcp/tools/get_recipe_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: 1,
          ingredients: ingredientsToUse.slice(0, 10) // 最大10つの食材を使用
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setRecipes(data.data);
          toast.success(`${data.data.length}件のレシピを取得しました！`);
        } else {
          toast.info('選択した食材でのレシピ提案が見つかりませんでした');
          setRecipes([]);
        }
      } else {
        toast.error('レシピ提案の取得に失敗しました');
      }
    } catch (error) {
      console.error('Recipe fetch error:', error);
      toast.error('レシピ提案機能は現在利用できません');
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const toggleIngredientSelection = (ingredient: string) => {
    setSelectedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(item => item !== ingredient)
        : [...prev, ingredient]
    );
  };

  const selectAllIngredients = () => {
    setSelectedIngredients([...availableIngredients]);
  };

  const clearSelection = () => {
    setSelectedIngredients([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">レシピ提案</h1>
        <p className="mt-2 text-gray-600">在庫食材を活用したレシピを提案します</p>
      </div>

      {/* Ingredient Selection */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">食材選択</h2>
          <div className="flex space-x-2">
            <button
              onClick={selectAllIngredients}
              disabled={availableIngredients.length === 0}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
            >
              すべて選択
            </button>
            <button
              onClick={clearSelection}
              disabled={selectedIngredients.length === 0}
              className="px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400"
            >
              選択解除
            </button>
          </div>
        </div>
        <div className="p-6">

          {availableIngredients.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                レシピ提案に使用したい食材をクリックして選択してください
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {selectedIngredients.length}個選択中
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {availableIngredients.map((ingredient: string, index: number) => {
                  const isSelected = selectedIngredients.includes(ingredient);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleIngredientSelection(ingredient)}
                      className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer transform hover:scale-105 ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                    >
                      <span className="mr-1">{isSelected ? '✓' : '+'}</span>
                      {ingredient}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">利用可能な食材がありません</p>
              <p className="text-sm text-gray-400 mt-1">食材一覧から食材を追加してください</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Ingredients Summary */}
      {selectedIngredients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">選択した食材でレシピを提案します</h3>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {selectedIngredients.length}個選択
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedIngredients.map((ingredient, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Get Recipes Button */}
      <div className="text-center">
        <button
          onClick={fetchRecipes}
          disabled={isLoadingRecipes || (selectedIngredients.length === 0 && availableIngredients.length === 0)}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoadingRecipes ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              レシピを取得中...
            </div>
          ) : selectedIngredients.length > 0 ? (
            `選択した${selectedIngredients.length}個の食材でレシピ提案`
          ) : (
            'すべての食材でレシピ提案'
          )}
        </button>
      </div>

      {/* Recipes */}
      {recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipes.map((recipe: any, index: number) => (
            <div key={index} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{recipe.name}</h3>
                <p className="text-gray-600 mb-4">{recipe.description}</p>

                {/* Recipe Info */}
                <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
                  <span>🕐 準備: {recipe.prep_time}分</span>
                  <span>🔥 調理: {recipe.cook_time}分</span>
                  <span>👥 {recipe.servings || 2}人分</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    recipe.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {recipe.difficulty === 'easy' ? '簡単' :
                     recipe.difficulty === 'medium' ? '普通' : '難しい'}
                  </span>
                </div>

                {/* Ingredients */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">材料:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {recipe.ingredients.map((ingredient: string, idx: number) => (
                      <li key={idx}>• {ingredient}</li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">作り方:</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    {recipe.instructions.map((instruction: string, idx: number) => (
                      <li key={idx}>{idx + 1}. {instruction}</li>
                    ))}
                  </ol>
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {recipes.length === 0 && !isLoadingRecipes && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">レシピ提案を取得してください</p>
          <p className="text-sm text-gray-400 mt-1">利用可能な食材からAIがレシピを提案します</p>
        </div>
      )}
    </div>
  );
};

export default Recipes;