import { Shift, ServiceRequest, Employee, Invoice, PayrollEntry, DashboardStats, CreateInvoicePayload, Location, Opdrachtgever, LocationRate, LocationRateCreate, EmployeeDashboardData, Role, User } from './types';
import axios from 'axios';

// Use proxy in development mode
const baseURL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL || 'http://localhost:8000';

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