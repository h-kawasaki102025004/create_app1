import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Recipes from './pages/Recipes';
import Login from './pages/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/**
 * Root application component that manages login state, global providers, routing, navigation, and toast notifications.
 *
 * Renders a login gate wrapped in a shared QueryClientProvider when not authenticated; after login it renders the main app
 * UI (QueryClientProvider + Router) with a top navigation, routes for Dashboard, Inventory, and Recipes, and a Toaster.
 *
 * @returns The root React element containing the login screen or the authenticated application layout with providers and routes.
 */
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <QueryClientProvider client={queryClient}>
        <Login onLogin={() => setIsLoggedIn(true)} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <h1 className="text-xl font-bold text-green-600">
                      🥬 FoodKeeper
                    </h1>
                  </div>
                  <div className="ml-6 flex space-x-8">
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          isActive
                            ? 'border-green-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`
                      }
                    >
                      ダッシュボード
                    </NavLink>
                    <NavLink
                      to="/inventory"
                      className={({ isActive }) =>
                        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          isActive
                            ? 'border-green-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`
                      }
                    >
                      食材一覧
                    </NavLink>
                    <NavLink
                      to="/recipes"
                      className={({ isActive }) =>
                        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          isActive
                            ? 'border-green-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`
                      }
                    >
                      レシピ提案
                    </NavLink>
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => setIsLoggedIn(false)}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    ログアウト
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto py-6 px-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/recipes" element={<Recipes />} />
            </Routes>
          </main>
        </div>
      </Router>

      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;