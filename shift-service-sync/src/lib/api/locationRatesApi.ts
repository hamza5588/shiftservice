import { LocationRate, LocationRateCreate } from '../types';
import { api } from './api';

const baseUrl = '/facturen';

export class LocationRatesApi {
  constructor() {}

  async getRates(): Promise<LocationRate[]> {
    try {
      const url = `${baseUrl}/location-rates`;
      console.log('Fetching location rates from:', url);
      const response = await api.get<LocationRate[]>(url);
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
  }

  async createRate(rate: LocationRateCreate): Promise<LocationRate> {
    try {
      const url = `${baseUrl}/location-rates`;
      console.log('Creating location rate at:', url);
      const response = await api.post<LocationRate>(url, rate);
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
  }

  async updateRate(id: number, rate: Partial<LocationRateCreate>): Promise<LocationRate> {
    try {
      const url = `${baseUrl}/location-rates/${id}`;
      console.log('Updating rate at:', url);
      
      const response = await api.put<LocationRate>(url, rate);
      console.log('Update rate response:', response);
      return response.data;
    } catch (error: any) {
      console.error('Error updating location rate:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        url: error.config?.url
      });
      
      const errorResponse = {
        message: error.response?.data?.detail || 'Failed to update location rate',
        status: error.response?.status,
        data: error.response?.data,
        validationErrors: error.response?.data?.detail || []
      };
      throw errorResponse;
    }
  }

  async deleteRate(id: number): Promise<void> {
    try {
      const url = `${baseUrl}/location-rates/${id}`;
      console.log('Deleting rate at:', url);
      
      await api.delete(url);
    } catch (error: any) {
      console.error('Error deleting location rate:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        url: error.config?.url
      });
      
      const errorResponse = {
        message: error.response?.data?.detail || 'Failed to delete location rate',
        status: error.response?.status,
        data: error.response?.data,
        validationErrors: error.response?.data?.detail || []
      };
      throw errorResponse;
    }
  }
} 