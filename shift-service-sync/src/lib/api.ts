import { Shift, ServiceRequest, Employee, Invoice, PayrollEntry, DashboardStats, CreateInvoicePayload } from './types';
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
    config.headers.Authorization = `Bearer ${token}`;
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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
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

      // Create a more detailed error message
      let errorMessage = '';
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (typeof errorData === 'object') {
        errorMessage = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
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
  getById: (id: number) => apiRequest<Shift>(`/planning/${id}/`),
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
  getAll: async () => {
    console.log('Fetching all employees...');
    const result = await apiRequest<Employee[]>('/medewerkers/');
    console.log('Employees fetched:', result);
    return result;
  },
  getById: (id: string) => apiRequest<Employee>(`/medewerkers/${id}`),
  create: (employee: Omit<Employee, 'id'>) =>
    apiRequest<Employee>('/medewerkers/', 'POST', employee),
  update: (id: string, employee: Partial<Employee>) =>
    apiRequest<Employee>(`/medewerkers/${id}`, 'PUT', employee),
  delete: (id: string) => apiRequest<void>(`/medewerkers/${id}`, 'DELETE'),
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
  getAll: (year?: number) => apiRequest<PayrollEntry[]>(`/verloning/${year ? `?year=${year}` : ''}`),
  export: (year: number) => apiRequest<Blob>(`/verloning/export?year=${year}`),
  getMyPayroll: (year?: number) => apiRequest<PayrollEntry[]>(`/verloning/my-payroll${year ? `?year=${year}` : ''}`),
  exportMyPayroll: (year: number) => apiRequest<Blob>(`/verloning/my-payroll/export?year=${year}`),
};

// API functions for dashboard
export const dashboardApi = {
  getStats: () => apiRequest<DashboardStats>('/dashboard/'),
  getEmployeeDashboard: () => apiRequest<EmployeeDashboardData>('/dashboard/employee'),
};

// API functions for users
export const usersApi = {
  getAll: () => apiRequest<User[]>('/users/'),
  getById: (id: string) => apiRequest<User>(`/users/${id}`),
  create: (user: Omit<User, 'id'>) => apiRequest<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(user)
  }),
  update: (id: string, user: Partial<User>) => apiRequest<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user)
  }),
  delete: (id: string) => apiRequest<void>(`/users/${id}`, {
    method: 'DELETE'
  }),
  getCurrentUser: () => apiRequest<User>('/users/me'),
};

// API functions for roles
export const rolesApi = {
  getAll: () => apiRequest<Role[]>('/roles/'),
  create: (data: Partial<Role>) => 
    apiRequest<Role>('/roles/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Role>) =>
    apiRequest<Role>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<void>(`/roles/${id}/`, {
      method: 'DELETE',
    }),
};

// API functions for opdrachtgevers (clients)
export const opdrachtgeversApi = {
  getAll: () => apiRequest<Opdrachtgever[]>('/opdrachtgevers/'),
  getById: (id: string) => apiRequest<Opdrachtgever>(`/opdrachtgevers/${id}`),
  create: (opdrachtgever: Omit<Opdrachtgever, 'id'>) =>
    apiRequest<Opdrachtgever>('/opdrachtgevers/', {
      method: 'POST',
      body: JSON.stringify(opdrachtgever)
    }),
  update: (id: string, opdrachtgever: Partial<Opdrachtgever>) =>
    apiRequest<Opdrachtgever>(`/opdrachtgevers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(opdrachtgever)
    }),
  delete: (id: string) => apiRequest<void>(`/opdrachtgevers/${id}`, {
    method: 'DELETE'
  }),
};

// API functions for locations
export const locationsApi = {
  getAll: () => apiRequest<Location[]>('/locations/'),
  getById: (id: string) => apiRequest<Location>(`/locations/${id}`),
  getByOpdrachtgever: (opdrachtgeverId: string) => 
    apiRequest<Location[]>(`/locations/opdrachtgever/${opdrachtgeverId}`),
  create: (location: Omit<Location, 'id'>) => apiRequest<Location>('/locations/', {
    method: 'POST',
    body: JSON.stringify(location)
  }),
  update: (id: string, location: Partial<Location>) => apiRequest<Location>(`/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(location)
  }),
  delete: (id: string) => apiRequest<void>(`/locations/${id}`, {
    method: 'DELETE'
  })
};

// API functions for location rates
export const locationRatesApi = {
  getAll: async () => {
    try {
      const response = await api.get<LocationRate[]>('/facturen/location-rates/');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching location rates:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(JSON.stringify(error.response.data.detail));
      }
      throw error;
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get<LocationRate>(`/facturen/location-rates/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching location rate:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(JSON.stringify(error.response.data.detail));
      }
      throw error;
    }
  },
  create: async (rate: LocationRateCreate) => {
    try {
      const response = await api.post<LocationRate>('/facturen/location-rates', rate);
      return response.data;
    } catch (error: any) {
      console.error('Error creating location rate:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(JSON.stringify(error.response.data.detail));
      }
      throw error;
    }
  },
  update: async (id: number, rate: Partial<LocationRate>) => {
    try {
      const response = await api.put<LocationRate>(`/facturen/location-rates/${id}`, rate);
      return response.data;
    } catch (error: any) {
      console.error('Error updating location rate:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(JSON.stringify(error.response.data.detail));
      }
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      await api.delete(`/facturen/location-rates/${id}`);
    } catch (error: any) {
      console.error('Error deleting location rate:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(JSON.stringify(error.response.data.detail));
      }
      throw error;
    }
  }
};

// Add User interface
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: string[];
}

// Add Role interface
export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

// Add EmployeeDashboardData interface
export interface EmployeeDashboardData {
  shifts: Shift[];
  service_requests: ServiceRequest[];
  payroll: PayrollEntry;
  profile: Employee;
}

export interface CreateInvoicePayload {
  opdrachtgever_id: number;
  opdrachtgever_naam: string;
  locatie: string;
  factuurdatum: string;
  bedrag: number;
  status: string;
  factuur_text?: string;
  invoice_number?: string;
  client_name?: string;
  issue_date?: string;
  due_date?: string;
  total_amount?: number;
  vat_amount?: number;
  subtotal?: number;
  breakdown?: any;
}

export const createInvoice = async (invoice: InvoiceCreate): Promise<Invoice> => {
  const response = await fetch(`${baseURL}/facturen/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(invoice)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create invoice');
  }

  return response.json();
};

export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await fetch(`${baseURL}/facturen/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch invoices');
  }

  return response.json();
};

export const getInvoice = async (id: number): Promise<Invoice> => {
  const response = await fetch(`${baseURL}/facturen/${id}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch invoice');
  }

  return response.json();
};

export const updateInvoice = async (id: number, invoice: Partial<Invoice>): Promise<Invoice> => {
  const response = await fetch(`${baseURL}/facturen/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(invoice)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update invoice');
  }

  return response.json();
};

export const deleteInvoice = async (id: number): Promise<void> => {
  const response = await fetch(`${baseURL}/facturen/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete invoice');
  }
};

export const deleteInvoiceByNumber = async (factuurnummer: string): Promise<void> => {
  return apiRequest<void>(`/invoice-payroll/facturen/nummer/${factuurnummer}`, {
    method: 'DELETE'
  });
};