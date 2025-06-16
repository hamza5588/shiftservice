import { Shift, ServiceRequest, Employee, Invoice, PayrollEntry, DashboardStats, CreateInvoicePayload, Location, Opdrachtgever, LocationRate, LocationRateCreate, EmployeeDashboardData, Role, User } from './types';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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

export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  requiresAuth: boolean = true
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const responseData = await response.json();

    if (!response.ok) {
      console.error('Error response data:', responseData);
      
      // Log detailed error information
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        errorData: responseData,
        endpoint,
        method,
        requestData: data
      });

      let errorMessage = 'An error occurred';

      // Handle different error response formats
      if (responseData.detail) {
        if (typeof responseData.detail === 'string') {
          errorMessage = responseData.detail;
        } else if (Array.isArray(responseData.detail)) {
          errorMessage = responseData.detail.join(', ');
        } else if (typeof responseData.detail === 'object') {
          // Handle field-specific errors
          const fieldErrors = Object.entries(responseData.detail)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          errorMessage = fieldErrors || 'Validation error';
        }
      } else if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.error) {
        errorMessage = responseData.error;
      }

      // Create a custom error with the message
      const error = new Error(errorMessage);
      // Add additional properties to the error object
      (error as any).status = response.status;
      (error as any).responseData = responseData;
      throw error;
    }

    return responseData;
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
  getAll: () => apiRequest<Invoice[]>('/facturen'),
  getById: (id: number) => apiRequest<Invoice>(`/facturen/${id}`),
  getByNumber: (number: string) => apiRequest<Invoice>(`/facturen/nummer/${number}`),
  create: (data: CreateInvoicePayload) => apiRequest<Invoice>('/facturen', {
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
  send: (id: number) => apiRequest<Invoice>(`/facturen/${id}/send`, 'POST'),
  exportPdf: () => apiRequest<Blob>('/facturen/pdf-export', {
    headers: {
      'Accept': 'application/pdf'
    }
  })
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
  getAll: () => apiRequest<LocationRate[]>('/location-rates/'),
  getById: (id: number) => apiRequest<LocationRate>(`/location-rates/${id}/`),
  create: async (data: LocationRateCreate) => {
    try {
      // Log the request data
      console.log('Creating location rate with data:', JSON.stringify(data, null, 2));

      // Validate the data before sending
      if (!data.location_id || !data.pass_type) {
        throw new Error('Location ID and pass type are required');
      }

      if (data.pass_type !== 'blue' && data.pass_type !== 'grey') {
        throw new Error('Pass type must be either "blue" or "grey"');
      }

      // Validate all rates are positive numbers
      const rates = [
        data.base_rate,
        data.evening_rate,
        data.night_rate,
        data.weekend_rate,
        data.holiday_rate,
        data.new_years_eve_rate
      ];

      if (rates.some(rate => isNaN(rate) || rate <= 0)) {
        throw new Error('All rates must be positive numbers');
      }

      // Use the exact endpoint format from the FastAPI router
      const response = await fetch(`${API_BASE_URL}/location-rates/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...data,
          pass_type: data.pass_type.toLowerCase() // Ensure pass type is lowercase
        })
      });

      // Try to parse the response as JSON
      let responseData;
      try {
        responseData = await response.json();
        console.log('Server response data:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON:', e);
        responseData = null;
      }

      // Log the full response details
      console.log('Server response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      });

      if (!response.ok) {
        // Try to extract a meaningful error message
        const errorMessage = 
          responseData?.detail || 
          responseData?.message || 
          responseData?.error || 
          (typeof responseData === 'string' ? responseData : null) ||
          response.statusText;

        throw new Error(`Failed to create location rate: ${errorMessage || 'Unknown error'}`);
      }

      return responseData;
    } catch (error) {
      console.error('Location rate creation error:', error);
      // Re-throw the error with more context
      if (error instanceof Error) {
        throw new Error(`Location rate creation failed: ${error.message}`);
      }
      throw error;
    }
  },
  update: (id: number, data: Partial<LocationRate>) => apiRequest<LocationRate>(`/location-rates/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: number) => apiRequest<void>(`/location-rates/${id}/`, {
    method: 'DELETE'
  }),
  getByLocation: (locationId: number) => apiRequest<LocationRate[]>(`/location-rates/location/${locationId}/`)
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

export const hourIncreaseApi = {
  request: async (data: { shift_id: number; requested_end_time: string }) => {
    try {
      return await apiRequest<HourIncreaseResponse>('/hour-increase/request', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Error requesting hour increase:', error);
      throw error;
    }
  },

  getAll: async (): Promise<HourIncreaseRequest[]> => {
    try {
      console.log('Fetching all hour increase requests...');
      const response = await apiRequest<HourIncreaseRequest[]>('/hour-increase/requests');
      console.log('Hour increase requests response:', response);
      
      if (!Array.isArray(response)) {
        console.error('Invalid response format:', response);
        return [];
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching hour increase requests:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }
  },

  approve: async (requestId: number) => {
    try {
      return await apiRequest<HourIncreaseResponse>(`/hour-increase/${requestId}/approve`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error approving hour increase request:', error);
      throw error;
    }
  },

  reject: async (requestId: number) => {
    try {
      return await apiRequest<HourIncreaseResponse>(`/hour-increase/${requestId}/reject`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error rejecting hour increase request:', error);
      throw error;
    }
  },
};