import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: HomeIcon },
  { name: '食材一覧', href: '/inventory', icon: ArchiveBoxIcon },
  { name: 'レシピ', href: '/recipes', icon: DocumentTextIcon },
  { name: '買い物リスト', href: '/shopping', icon: ShoppingCartIcon },
  { name: '設定', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-6">
            <div className="flex items-center space-x-2">
              <ArchiveBoxIcon className="h-8 w-8 text-green-600" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                FoodKeeper
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col px-4 pb-4">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                            isActive
                              ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                              : 'text-gray-700 hover:text-green-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-green-400 dark:hover:bg-gray-700'
                          }`
                        }
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
      >
        <div className="flex">
          <div className="relative flex w-full max-w-xs flex-1">
            <div className="flex grow flex-col overflow-y-auto bg-white dark:bg-gray-800">
              {/* Close button */}
              <div className="flex h-16 shrink-0 items-center justify-between px-6">
                <div className="flex items-center space-x-2">
                  <ArchiveBoxIcon className="h-8 w-8 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    FoodKeeper
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex flex-1 flex-col px-4 pb-4">
                <ul className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul className="space-y-1">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <NavLink
                            to={item.href}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                                isActive
                                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                  : 'text-gray-700 hover:text-green-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-green-400 dark:hover:bg-gray-700'
                              }`
                            }
                          >
                            <item.icon className="h-6 w-6 shrink-0" />
                            {item.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}