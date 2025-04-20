import axios from 'axios';
import { User } from './api';

const API_URL = '/api'; // Using the proxy

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('Attempting login with username:', credentials.username);
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      
      const response = await axios.post(`${API_URL}/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,  // Include credentials for CORS
      });
      
      console.log('Login response received:', {
        status: response.status,
        hasToken: !!response.data.access_token,
        data: response.data
      });
      
      if (!response.data.access_token) {
        throw new Error('No access token received');
      }
      
      const { access_token, token_type } = response.data;
      localStorage.setItem('token', access_token);
      console.log('Token stored in localStorage:', !!access_token);
      
      return { access_token, token_type };
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid username or password');
        }
        if (error.response?.data?.detail) {
          throw new Error(error.response.data.detail);
        }
      }
      throw new Error('Login failed');
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true,  // Include credentials for CORS
      });
      
      console.log('User data from server:', response.data);
      
      // Ensure roles is an array of strings
      let roles: string[] = [];
      if (Array.isArray(response.data.roles)) {
        roles = response.data.roles;
      } else if (response.data.role) {
        roles = [response.data.role];
      } else if (response.data.roles && typeof response.data.roles === 'object') {
        // Handle case where roles might be an object with name property
        roles = [response.data.roles.name];
      }
      
      // Create the user object with the correct format
      const userData: User = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        full_name: response.data.full_name,
        roles: roles
      };
      
      console.log('Processed user data:', userData);
      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          this.logout();
          throw new Error('Session expired - Please login again');
        }
        throw new Error(error.response?.data?.detail || 'Failed to get user data');
      }
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('token');
    // Optionally make a request to invalidate the token on the server
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}; 