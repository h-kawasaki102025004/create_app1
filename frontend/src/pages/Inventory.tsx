import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFoods, setSelectedFoods] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const queryClient = useQueryClient();

  const { data: foods, isLoading } = useQuery({
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

  const addFoodMutation = useMutation({
    mutationFn: async (foodData: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(foodData),
      });
      if (!response.ok) throw new Error('Failed to add food');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      queryClient.refetchQueries({ queryKey: ['foods'] });
      setShowAddForm(false);
      setNewFood({
        name: '',
        quantity: 1,
        unit: '個',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        storage_location: '冷蔵庫',
        category_id: 1
      });
      toast.success('食材を追加しました！');
    },
    onError: () => {
      toast.error('食材の追加に失敗しました');
    },
  });

  const deleteFoodsMutation = useMutation({
    mutationFn: async (foodIds: number[]) => {
      const promises = foodIds.map(id =>
        fetch(`${import.meta.env.VITE_API_BASE_URL}/foods/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        })
      );
      const responses = await Promise.all(promises);
      const failedRequests = responses.filter(response => !response.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to delete ${failedRequests.length} items`);
      }
    },
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      queryClient.refetchQueries({ queryKey: ['foods'] });
      setSelectedFoods([]);
      setSelectAll(false);
      toast.success(`${deletedIds.length}個の食材を削除しました！`);
    },
    onError: (error: any) => {
      toast.error('食材の削除に失敗しました');
    },
  });

  const [newFood, setNewFood] = useState({
    name: '',
    quantity: 1,
    unit: '個',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    storage_location: '冷蔵庫',
    category_id: 1
  });

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    addFoodMutation.mutate(newFood);
  };

  const handleSelectAll = () => {
    const foodData = foods?.data || [];
    if (selectAll) {
      setSelectedFoods([]);
    } else {
      setSelectedFoods(foodData.map((food: any) => food.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectFood = (foodId: number) => {
    if (selectedFoods.includes(foodId)) {
      setSelectedFoods(selectedFoods.filter(id => id !== foodId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedFoods, foodId];
      setSelectedFoods(newSelected);
      const foodData = foods?.data || [];
      if (newSelected.length === foodData.length) {
        setSelectAll(true);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFoods.length === 0) return;

    if (window.confirm(`選択した${selectedFoods.length}個の食材を削除しますか？この操作は取り消せません。`)) {
      deleteFoodsMutation.mutate(selectedFoods);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const foodData = foods?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">食材一覧</h1>
          <p className="mt-2 text-gray-600">登録している食材を管理できます</p>
        </div>
        <div className="flex space-x-3">
          {selectedFoods.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleteFoodsMutation.isPending}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400"
            >
              {deleteFoodsMutation.isPending ? '削除中...' : `選択項目を削除 (${selectedFoods.length})`}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            {showAddForm ? 'キャンセル' : '食材を追加'}
          </button>
        </div>
      </div>

      {/* Add Food Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">新しい食材を追加</h2>
          <form onSubmit={handleAddFood} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">食材名</label>
              <input
                type="text"
                required
                value={newFood.name}
                onChange={(e) => setNewFood({...newFood, name: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                placeholder="例: りんご"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">数量</label>
              <div className="mt-1 flex">
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={newFood.quantity}
                  onChange={(e) => setNewFood({...newFood, quantity: parseFloat(e.target.value)})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                />
                <select
                  value={newFood.unit}
                  onChange={(e) => setNewFood({...newFood, unit: e.target.value})}
                  className="border border-gray-300 rounded-r-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
                >
                  <option value="個">個</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="パック">パック</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">購入日</label>
              <input
                type="date"
                required
                value={newFood.purchase_date}
                onChange={(e) => setNewFood({...newFood, purchase_date: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">賞味期限</label>
              <input
                type="date"
                required
                value={newFood.expiry_date}
                onChange={(e) => setNewFood({...newFood, expiry_date: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">保存場所</label>
              <select
                value={newFood.storage_location}
                onChange={(e) => setNewFood({...newFood, storage_location: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 text-gray-900"
              >
                <option value="冷蔵庫">冷蔵庫</option>
                <option value="冷凍庫">冷凍庫</option>
                <option value="常温">常温</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={addFoodMutation.isPending}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
              >
                {addFoodMutation.isPending ? '追加中...' : '食材を追加'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Food List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">登録済み食材</h2>
            {foodData.length > 0 && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                />
                <span className="text-sm text-gray-600">全て選択</span>
              </label>
            )}
          </div>
        </div>
        <div className="overflow-hidden">
          {foodData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">まだ食材が登録されていません</p>
              <p className="text-sm text-gray-400 mt-1">「食材を追加」ボタンから始めましょう</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {foodData.map((food: any) => {
                const expiryDate = new Date(food.expiry_date);
                const today = new Date();
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let statusColor = 'bg-green-100 text-green-800';
                if (diffDays <= 0) statusColor = 'bg-red-100 text-red-800';
                else if (diffDays <= 3) statusColor = 'bg-yellow-100 text-yellow-800';

                return (
                  <div key={food.id} className={`border border-gray-200 rounded-lg p-4 transition-colors ${selectedFoods.includes(food.id) ? 'bg-blue-50 border-blue-300' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedFoods.includes(food.id)}
                          onChange={() => handleSelectFood(food.id)}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-1"
                        />
                        <h3 className="text-lg font-medium text-gray-900">{food.name}</h3>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                        {diffDays <= 0 ? '期限切れ' : diffDays <= 3 ? '期限間近' : '良好'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>数量: {food.quantity} {food.unit}</p>
                      <p>保存場所: {food.storage_location}</p>
                      <p>賞味期限: {food.expiry_date}</p>
                      <p className={diffDays <= 3 ? 'text-orange-600 font-medium' : ''}>
                        {diffDays <= 0 ? '期限切れ' : `あと${diffDays}日`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;