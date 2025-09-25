import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification } from '@shared/types';
import { notificationApi } from '../services/api/notification.api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Accesses the notifications context provided by NotificationProvider.
 *
 * @returns The context value containing notifications, unreadCount, isLoading, and mutation/refetch functions.
 * @throws Error if called outside of a NotificationProvider.
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Provides notification state and actions to descendant components via context.
 *
 * @param children - React nodes that will receive the notification context.
 * @returns The provider element that supplies notifications, unread count, loading state, and action methods to its children.
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const data = await notificationApi.getAll();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number): Promise<void> => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true
        }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (id: number): Promise<void> => {
    try {
      await notificationApi.delete(id);
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  };

  const refetchNotifications = async (): Promise<void> => {
    await fetchNotifications();
  };

  // Fetch notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated]);

  // Poll for new notifications every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}