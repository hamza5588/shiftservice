import axios from 'axios';
import { AutoApprovalSetting } from '../types/autoApproval';
import { authService } from '../lib/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error: Could not connect to the server. Please make sure the backend server is running.');
    }
    return Promise.reject(error);
  }
);

export const autoApprovalService = {
    // Get all auto-approval settings
    async getAllSettings(): Promise<AutoApprovalSetting[]> {
        try {
            const response = await api.get('/auto_approval/');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching auto-approval settings:', error);
            if (error.response) {
                throw new Error(error.response.data?.detail || 'Failed to fetch settings');
            }
            throw error;
        }
    },

    // Get all employees
    async getEmployees(): Promise<{ id: string; name: string; username: string }[]> {
        try {
            const response = await api.get('/medewerkers/');
            return response.data.map((emp: any) => ({
                id: emp.id.toString(),
                name: emp.full_name,
                username: emp.username
            }));
        } catch (error: any) {
            console.error('Error fetching employees:', error);
            if (error.response) {
                throw new Error(error.response.data?.detail || 'Failed to fetch employees');
            }
            throw error;
        }
    },

    // Get all locations
    async getLocations(): Promise<string[]> {
        try {
            const response = await api.get('/locations/');
            return response.data.map((loc: any) => loc.naam);
        } catch (error: any) {
            console.error('Error fetching locations:', error);
            if (error.response) {
                throw new Error(error.response.data?.detail || 'Failed to fetch locations');
            }
            throw error;
        }
    },

    // Get a single auto-approval setting
    async getSetting(id: number): Promise<AutoApprovalSetting> {
        try {
            const response = await api.get(`/auto_approval/${id}`);
            return response.data;
        } catch (error: any) {
            console.error(`Error fetching auto-approval setting ${id}:`, error);
            if (error.response) {
                throw new Error(error.response.data?.detail || `Failed to fetch setting ${id}`);
            }
            throw error;
        }
    },

    // Create a new auto-approval setting
    async createSetting(setting: Omit<AutoApprovalSetting, 'id'>): Promise<AutoApprovalSetting> {
        try {
            const response = await api.post('/auto_approval/', setting);
            return response.data;
        } catch (error: any) {
            console.error('Error creating auto-approval setting:', error);
            if (error.response) {
                throw new Error(error.response.data?.detail || 'Failed to create setting');
            }
            throw error;
        }
    },

    // Update an existing auto-approval setting
    async updateSetting(id: number, setting: AutoApprovalSetting): Promise<AutoApprovalSetting> {
        try {
            const response = await api.put(`/auto_approval/${id}`, setting);
            return response.data;
        } catch (error: any) {
            console.error(`Error updating auto-approval setting ${id}:`, error);
            if (error.response) {
                throw new Error(error.response.data?.detail || `Failed to update setting ${id}`);
            }
            throw error;
        }
    },

    // Delete an auto-approval setting
    async deleteSetting(id: number): Promise<void> {
        try {
            await api.delete(`/auto_approval/${id}`);
        } catch (error: any) {
            console.error(`Error deleting auto-approval setting ${id}:`, error);
            if (error.response) {
                throw new Error(error.response.data?.detail || `Failed to delete setting ${id}`);
            }
            throw error;
        }
    },

    // Remove duplicate methods
    // async getSettings(): Promise<AutoApprovalSetting[]> {
    //     const response = await axios.get(`${API_URL}/api/auto-approval/settings`);
    //     return response.data;
    // },

    // async updateSettings(settings: AutoApprovalSetting[]): Promise<AutoApprovalSetting[]> {
    //     const response = await axios.put(`${API_URL}/api/auto-approval/settings`, settings);
    //     return response.data;
    // },

    // async getSettingByType(shiftType: string): Promise<AutoApprovalSetting | null> {
    //     const response = await axios.get(`${API_URL}/api/auto-approval/settings/${shiftType}`);
    //     return response.data;
    // }
}; 