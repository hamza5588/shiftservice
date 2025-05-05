import { User } from './types';
import { apiRequest } from './api';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: string[];
}

export interface CreateUserData {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  full_name?: string;
}

export const usersApi = {
  getAll: async () => {
    const response = await apiRequest<User[]>('/users/');
    return Array.isArray(response) ? response : [];
  },
  getById: (id: string) => apiRequest<User>(`/users/${id}`),
  create: (user: CreateUserData) => apiRequest<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(user)
  }),
  update: (id: string, user: UpdateUserData) => apiRequest<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user)
  }),
  delete: (id: string) => apiRequest<void>(`/users/${id}`, {
    method: 'DELETE'
  }),
  getCurrentUser: () => apiRequest<User>('/users/me'),
  getRoles: () => apiRequest<string[]>('/roles/'),
}; 