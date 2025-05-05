import { Shift, ServiceRequest, Employee, Invoice, PayrollEntry, DashboardStats, CreateInvoicePayload, Location, Opdrachtgever, LocationRate, LocationRateCreate, EmployeeDashboardData, Role, User } from './types';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const baseURL = API_BASE_URL;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function for making API requests
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API request failed:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      });
      throw new Error(errorData.detail || `API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// API functions for shifts
export const shiftsApi = {
  getAll: () => apiRequest<Shift[]>('/planning/'),
  getById: (id: number) => apiRequest<Shift>(`/planning/${id}`),
  create: (shift: Omit<Shift, 'id'>) => apiRequest<Shift>('/planning/', {
    method: 'POST',
    body: JSON.stringify(shift)
  }),
  update: (id: number, shift: Partial<Shift>) => apiRequest<Shift>(`/planning/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(shift)
  }),
  delete: (id: number) => apiRequest<void>(`/planning/${id}/`, {
    method: 'DELETE'
  }),
  getMyShift: (id: number) => apiRequest<Shift>(`/planning/my-shifts/${id}/`)
};

// API functions for service requests
export const serviceRequestsApi = {
  getAll: () => apiRequest<ServiceRequest[]>('/dienstaanvragen/'),
  getMyRequests: () => apiRequest<ServiceRequest[]>('/dienstaanvragen/my-requests/'),
  getAvailableShifts: () => apiRequest<Shift[]>('/planning/available-shifts'),
  create: (data: Partial<ServiceRequest>) => 
    apiRequest<ServiceRequest>('/dienstaanvragen/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ServiceRequest>) =>
    apiRequest<ServiceRequest>(`/dienstaanvragen/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<void>(`/dienstaanvragen/${id}/`, {
      method: 'DELETE',
    }),
  approve: (id: number) =>
    apiRequest<ServiceRequest>(`/dienstaanvragen/${id}/approve/`, {
      method: 'POST',
    }),
  reject: (id: number) =>
    apiRequest<ServiceRequest>(`/dienstaanvragen/${id}/reject/`, {
      method: 'POST',
    }),
};

// API functions for employees
export const employeesApi = {
  getAll: () => apiRequest<Employee[]>('/employee_profiles/'),
  getById: (id: string) => {
    if (!id || id === 'undefined') {
      throw new Error('Employee ID is required');
    }
    return apiRequest<Employee>(`/employee_profiles/${id}`);
  },
  create: (employee: Omit<Employee, 'id'>) => apiRequest<Employee>('/employee_profiles/', {
      method: 'POST',
      body: JSON.stringify(employee)
    }),
  update: (id: string, employee: Partial<Employee>) => {
    if (!id || id === 'undefined') {
      throw new Error('Employee ID is required');
    }
    return apiRequest<Employee>(`/employee_profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee)
    });
  },
  delete: (id: string) => {
    if (!id || id === 'undefined') {
      throw new Error('Employee ID is required');
    }
    return apiRequest<void>(`/employee_profiles/${id}`, {
      method: 'DELETE'
    });
  },
  getMyProfile: () => apiRequest<Employee>('/employee_profiles/my-profile'),
};

// API functions for invoices
export const invoicesApi = {
  getAll: () => apiRequest<Invoice[]>('/facturen/'),
  getById: (id: number) => apiRequest<Invoice>(`/facturen/${id}`),
  getByNumber: (factuurnummer: string) => apiRequest<Invoice>(`/facturen/nummer/${factuurnummer}`),
  create: (data: CreateInvoicePayload) => apiRequest<Invoice>('/facturen/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<Invoice>) => apiRequest<Invoice>(`/facturen/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/facturen/${id}`, {
    method: 'DELETE'
  }),
  deleteByFactuurnummer: (factuurnummer: string) => apiRequest<void>(`/invoice-payroll/facturen/nummer/${factuurnummer}`, {
    method: 'DELETE',
  }),
  markAsPaid: (id: number) => apiRequest<Invoice>(`/facturen/${id}/mark-paid`, {
    method: 'POST'
  }),
  upload: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<{ url: string }>(`/facturen/${id}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json'
      }
    });
  },
  listUploads: (id: number) => apiRequest<{ files: string[] }>(`/facturen/${id}/uploads`),
  download: async (id: number) => {
    const response = await fetch(`${baseURL}/facturen/${id}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept': 'application/pdf'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }
    
    return response.blob();
  },
  generateInvoice: (clientId: number, startDate: string, endDate: string) => {
    const params = new URLSearchParams({
      client_id: clientId.toString(),
      start_date: startDate,
      end_date: endDate
    });
    return apiRequest<Invoice>(`/facturen/generate?${params.toString()}`, {
      method: 'GET'
    });
  },
  exportPdf: async () => {
    const response = await fetch(`${baseURL}/facturen/pdf-export/facturen`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept': 'application/pdf'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facturen_overzicht.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

// API functions for payroll
export const payrollApi = {
  getAll: () => apiRequest<PayrollEntry[]>('/verloning/'),
  getById: (id: string) => apiRequest<PayrollEntry>(`/verloning/${id}`),
  create: (data: Omit<PayrollEntry, 'id'>) => apiRequest<PayrollEntry>('/verloning/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: Partial<PayrollEntry>) => apiRequest<PayrollEntry>(`/verloning/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => apiRequest<void>(`/verloning/${id}`, {
    method: 'DELETE'
  }),
  export: (year: number) => apiRequest<Blob>(`/verloning/export?year=${year}`),
  getMyPayroll: (year?: number) => apiRequest<PayrollEntry[]>(`/verloning/my-payroll${year ? `?year=${year}` : ''}`),
  exportMyPayroll: (year: number) => apiRequest<Blob>(`/verloning/my-payroll/export?year=${year}`)
};

// API functions for locations
export const locationsApi = {
  getAll: () => apiRequest<Location[]>('/locations/'),
  getById: (id: number) => apiRequest<Location>(`/locations/${id}/`),
  create: (data: Omit<Location, 'id'>) => apiRequest<Location>('/locations/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<Location>) => apiRequest<Location>(`/locations/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/locations/${id}/`, {
    method: 'DELETE'
  })
};

// API functions for clients
export const clientsApi = {
  getAll: () => apiRequest<Opdrachtgever[]>('/opdrachtgevers/'),
  getById: (id: number) => apiRequest<Opdrachtgever>(`/opdrachtgevers/${id}/`),
  create: (data: Omit<Opdrachtgever, 'id'>) => apiRequest<Opdrachtgever>('/opdrachtgevers/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<Opdrachtgever>) => apiRequest<Opdrachtgever>(`/opdrachtgevers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/opdrachtgevers/${id}/`, {
    method: 'DELETE'
  })
};

// API functions for dashboard
export const dashboardApi = {
  getStats: () => apiRequest<DashboardStats>('/dashboard/'),
  getEmployeeDashboard: () => apiRequest<EmployeeDashboardData>('/dashboard/employee'),
};

// API functions for location rates
export const locationRatesApi = {
  getAll: () => apiRequest<LocationRate[]>('/api/location-rates/'),
  getById: (id: number) => apiRequest<LocationRate>(`/api/location-rates/${id}/`),
  create: (rate: LocationRateCreate) => apiRequest<LocationRate>('/api/location-rates/', {
    method: 'POST',
    body: JSON.stringify(rate)
  }),
  update: (id: number, rate: LocationRateCreate) => apiRequest<LocationRate>(`/api/location-rates/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(rate)
  }),
  delete: (id: number) => apiRequest<void>(`/api/location-rates/${id}/`, {
    method: 'DELETE'
  })
};

// API functions for opdrachtgevers (clients)
export const opdrachtgeversApi = {
  getAll: () => apiRequest<Opdrachtgever[]>('/opdrachtgevers/'),
  getById: (id: number) => apiRequest<Opdrachtgever>(`/opdrachtgevers/${id}/`),
  create: (data: Omit<Opdrachtgever, 'id'>) => apiRequest<Opdrachtgever>('/opdrachtgevers/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<Opdrachtgever>) => apiRequest<Opdrachtgever>(`/opdrachtgevers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/opdrachtgevers/${id}/`, {
    method: 'DELETE'
  })
};

// API functions for roles
export const rolesApi = {
  getAll: async () => {
    const response = await apiRequest<Role[]>('/roles/');
    return Array.isArray(response) ? response : [];
  },
  create: (data: Partial<Role>) => apiRequest<Role>('/roles/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<Role>) => apiRequest<Role>(`/roles/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/roles/${id}/`, {
    method: 'DELETE'
  })
};

// Chat message types
export interface ChatMessageCreate {
  content: string;
  receiver_id: number;
  shift_id?: number;
}

export interface ChatMessageResponse {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
  shift_id?: number;
  sender_name: string;
}

// API functions for notifications and chat
export const notificationsApi = {
  getUnreadCount: () => apiRequest<number>('/notifications/unread-count'),
  getChatHistory: (userId: string) => apiRequest<ChatMessageResponse[]>(`/notifications/chat/history/${userId}/`),
  sendChatMessage: (data: ChatMessageCreate) => apiRequest<ChatMessageResponse>('/notifications/chat/send/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  markAsRead: (messageId: number) => apiRequest<void>(`/notifications/chat/mark-read/${messageId}/`, {
    method: 'POST'
  }),
  connectToChat: (userId: string, onMessage: (message: ChatMessageResponse) => void) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Encode the token to handle special characters
    const encodedToken = encodeURIComponent(token);
    const wsUrl = `${baseURL.replace('http', 'ws')}/notifications/ws/chat/${userId}?token=${encodedToken}`;
    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established successfully');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        // Validate the message data structure
        if (!data || typeof data !== 'object') {
          console.error('Invalid message format:', data);
          return;
        }

        if (data.type === 'message') {
          // Ensure all required fields exist and have valid types
          const message: ChatMessageResponse = {
            id: typeof data.id === 'number' ? data.id : 0,
            sender_id: typeof data.sender_id === 'number' ? data.sender_id : 0,
            receiver_id: typeof data.receiver_id === 'number' ? data.receiver_id : 0,
            content: typeof data.content === 'string' ? data.content : '',
            timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
            shift_id: typeof data.shift_id === 'number' ? data.shift_id : undefined,
            sender_name: typeof data.sender_name === 'string' ? data.sender_name : 'Unknown'
          };

          // Log the processed message for debugging
          console.log('Processed message:', message);
          
          onMessage(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        console.error('Raw message data:', event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Log additional connection details
      console.log('WebSocket state:', ws.readyState);
      console.log('WebSocket URL:', ws.url);
      console.log('User ID:', userId);
      console.log('Token present:', !!token);
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        userId: userId
      });
      // Only attempt to reconnect if the connection was closed unexpectedly
      if (event.code !== 1000) {
        console.log('Attempting to reconnect in 5 seconds...');
        setTimeout(() => {
          notificationsApi.connectToChat(userId, onMessage);
        }, 5000);
      }
    };

    return ws;
  }
};

// Notifications service
export const notificationsService = {
  getUnreadCount: () => apiRequest<number>('/notifications/unread-count'),
  // ... rest of the notifications service
};