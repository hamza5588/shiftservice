import { LocationRate, LocationRateCreate } from '../types';
import { api } from '../api';

// Use /api prefix to be consistent with Nginx configuration
const baseUrl = '/api/location-rates';

export class LocationRatesApi {
  constructor() {
    console.log('LocationRatesApi initialized with baseUrl:', baseUrl);
  }

  async getAll(): Promise<LocationRate[]> {
    try {
      console.log('API base URL:', api.defaults.baseURL);
      console.log('Full URL:', `${api.defaults.baseURL}${baseUrl}`);
      const response = await api.get<LocationRate[]>(baseUrl);
      console.log('Response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching location rates:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error URL:', error.config?.url);
      }
      throw error;
    }
  }

  async getById(id: number): Promise<LocationRate> {
    try {
      const url = `${baseUrl}/${id}`;
      console.log('Fetching rate from:', url);
      const response = await api.get<LocationRate>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching location rate:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error URL:', error.config?.url);
      }
      throw error;
    }
  }

  async create(rate: LocationRateCreate): Promise<LocationRate> {
    try {
      console.log('Creating rate at:', baseUrl, 'with data:', rate);
      const response = await api.post<LocationRate>(baseUrl, rate);
      return response.data;
    } catch (error: any) {
      console.error('Error creating location rate:', error);
      if (error.response?.status === 422) {
        // Handle validation errors
        const errorData = error.response.data;
        if (Array.isArray(errorData.detail)) {
          throw new Error(JSON.stringify(errorData.detail.map(err => err.msg || err)));
        } else if (typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        } else if (errorData.detail) {
          throw new Error(JSON.stringify(errorData.detail));
        }
      }
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error URL:', error.config?.url);
      }
      throw error;
    }
  }

  async update(id: number, rate: LocationRateCreate): Promise<LocationRate> {
    try {
      const url = `${baseUrl}/${id}`;
      console.log('Updating rate at:', url, 'with data:', rate);
      const response = await api.put<LocationRate>(url, rate);
      return response.data;
    } catch (error: any) {
      console.error('Error updating location rate:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error URL:', error.config?.url);
      }
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const url = `${baseUrl}/${id}`;
      console.log('Deleting rate at:', url);
      await api.delete(url);
    } catch (error: any) {
      console.error('Error deleting location rate:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error URL:', error.config?.url);
      }
      throw error;
    }
  }
} 