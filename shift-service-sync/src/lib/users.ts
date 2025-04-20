import { User } from './types';
import { apiRequest } from './api';

const API_URL = 'http://localhost:8000';

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
  getAll: () => apiRequest<User[]>('/users/'),
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