import { api } from './api';

interface ChatMessageRequest {
  content: string;
  receiver_id: number;
  shift_id?: number;
}

interface ChatMessageResponse {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
  shift_id?: number;
  sender_name: string;
}

export const notificationsApi = {
  sendChatMessage: async (message: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await api.post<ChatMessageResponse>('/notifications/chat/send', message);
    return response.data;
  },

  getChatHistory: async (userId: string): Promise<ChatMessageResponse[]> => {
    const response = await api.get<ChatMessageResponse[]>(`/notifications/chat/history/${userId}`);
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<number>('/notifications/unread-count');
    return response.data;
  },

  markMessageAsRead: async (messageId: number): Promise<void> => {
    await api.post(`/notifications/mark-read/${messageId}`);
  },

  connectToChat: (userId: string): WebSocket => {
    const token = localStorage.getItem('token')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const wsUrl = `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws/chat/${userId}?token=${token}`;
    console.log('Connecting to WebSocket:', wsUrl);
    return new WebSocket(wsUrl);
  }
}; 