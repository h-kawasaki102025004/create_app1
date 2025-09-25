import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { NotificationPanel } from '../notifications/NotificationPanel';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Provides the application's page chrome including a header, a collapsible sidebar, a notification panel, and backdrop handlers.
 *
 * Renders the given `children` as the main content area while wiring header actions and backdrops to open and close the sidebar and notification panel.
 *
 * @param children - Content to render as the page's main content
 * @returns A React element that wraps the provided `children` with site chrome (header, sidebar, notification panel, and backdrops)
 */
export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [notificationOpen, setNotificationOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onNotificationClick={() => setNotificationOpen(true)}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Notification backdrop */}
      {notificationOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity"
          onClick={() => setNotificationOpen(false)}
        />
      )}
    </div>
  );
}