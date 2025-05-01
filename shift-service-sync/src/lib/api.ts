import { Shift, ServiceRequest, Employee, Invoice, PayrollEntry, DashboardStats, CreateInvoicePayload, Location, Opdrachtgever, LocationRate, LocationRateCreate, EmployeeDashboardData, Role, User } from './types';
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers as Record<string, string>,
  };

  // Log the headers (excluding the token for security)
  console.log('Request headers:', {
    ...headers,
    Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined
  });

  // Convert any number IDs in the endpoint to strings
  const processedEndpoint = endpoint.replace(/\/(\d+)\//g, (match, id) => `/${id}/`);

  console.log(`Making API request to: ${baseURL}${processedEndpoint}`, {
    method: options.method || 'GET',
    headers: {
      ...headers,
      Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined
    },
    hasBody: !!options.body
  });

  try {
    const response = await fetch(`${baseURL}${processedEndpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include credentials for CORS
      mode: 'cors', // Explicitly set CORS mode
    });

    console.log(`API response status: ${response.status}`, {
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: response.statusText };
      }
      
      console.error('API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      let errorMessage = '';
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Handle FastAPI validation errors
          errorMessage = errorData.detail
            .map((err: any) => {
              if (err.loc && err.msg) {
                const field = err.loc[err.loc.length - 1];
                return `${field}: ${err.msg}`;
              }
              return err.msg || err;
            })
            .join('\n');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = Object.entries(errorData.detail)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        } else {
          errorMessage = errorData.detail;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (typeof errorData === 'object') {
        errorMessage = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
      } else {
        errorMessage = `API request failed with status ${response.status}: ${response.statusText}`;
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    const data = await response.json();
    console.log(`API response data for ${processedEndpoint}:`, data);
    return data;
  } catch (error) {
    console.error('API request failed:', {
      endpoint: processedEndpoint,
      error: error instanceof Error ? {
        message: error.message,
        status: (error as any).status,
        data: (error as any).data
      } : error
    });
    throw error;
  }
}

// API functions for shifts
export const shiftsApi = {
  getAll: () => apiRequest<Shift[]>('/planning/'),
  getById: (id: number) => apiRequest<Shift>(`/planning/${id}`),
  create: (data: Omit<Shift, 'id'>) => apiRequest<Shift>('/planning/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<Shift>) => apiRequest<Shift>(`/planning/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
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
  getAll: () => apiRequest<Employee[]>('/medewerkers/'),
  getById: (id: string) => apiRequest<Employee>(`/medewerkers/${id}`),
  create: (employee: Omit<Employee, 'id'>) => apiRequest<Employee>('/medewerkers/', {
      method: 'POST',
      body: JSON.stringify(employee)
    }),
  update: (id: string, employee: Partial<Employee>) => apiRequest<Employee>(`/medewerkers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee)
    }),
  delete: (id: string) => apiRequest<void>(`/medewerkers/${id}`, {
    method: 'DELETE'
  }),
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
  getAll: () => apiRequest<LocationRate[]>('/facturen/location-rates/'),
  getById: (id: number) => apiRequest<LocationRate>(`/facturen/location-rates/${id}`),
  create: (data: LocationRateCreate) => apiRequest<LocationRate>('/facturen/location-rates/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: number, data: Partial<LocationRate>) => apiRequest<LocationRate>(`/facturen/location-rates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/facturen/location-rates/${id}`, {
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
  getAll: () => apiRequest<Role[]>('/roles/'),
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
  getUnreadCount: () => apiRequest<number>('/notifications/unread-count/'),
  getChatHistory: (userId: string) => apiRequest<ChatMessageResponse[]>(`/notifications/chat/history/${userId}/`),
  sendChatMessage: (data: ChatMessageCreate) => apiRequest<ChatMessageResponse>('/notifications/chat/send/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  markAsRead: (messageId: number) => apiRequest<void>(`/notifications/chat/mark-read/${messageId}/`, {
    method: 'POST'
  }),
  connectToChat: (userId: string, onMessage: (message: ChatMessageResponse) => void) => {
    const ws = new WebSocket(`${baseURL.replace('http', 'ws')}/notifications/ws/chat/${userId}/`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        onMessage(data.message);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        notificationsApi.connectToChat(userId, onMessage);
      }, 5000);
    };

    return ws;
  }
};

export const usersApi = {
  getAll: () => apiRequest<User[]>('/users/'),
  getById: (id: string) => apiRequest<User>(`/users/${id}`),
  getCurrentUser: () => apiRequest<User>('/users/me')
};