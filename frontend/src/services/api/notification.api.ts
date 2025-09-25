import { BaseApi } from './base.api';
import { Notification, PaginatedResponse, ApiResponse } from '@shared/types';

class NotificationApi extends BaseApi {
  async getAll(): Promise<ApiResponse<Notification[]>> {
    return this.get<ApiResponse<Notification[]>>('/notifications');
  }

  async getUnread(): Promise<ApiResponse<Notification[]>> {
    return this.get<ApiResponse<Notification[]>>('/notifications/unread');
  }

  async markAsRead(id: number): Promise<void> {
    return this.patch<void>(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    return this.patch<void>('/notifications/mark-all-read');
  }

  async delete(id: number): Promise<void> {
    return this.delete<void>(`/notifications/${id}`);
  }
}

export const notificationApi = new NotificationApi();