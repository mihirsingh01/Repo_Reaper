import { apiClient } from './client';
import { User } from './types';

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    return res.data;
  },
};
