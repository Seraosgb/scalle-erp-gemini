import { create } from 'zustand';
import { api } from '../services/api';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('@scalle:user')) || null,
  token: localStorage.getItem('@scalle:token') || null,
  isAuthenticated: !!localStorage.getItem('@scalle:token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;

      localStorage.setItem('@scalle:token', token);
      localStorage.setItem('@scalle:user', JSON.stringify(user));

      set({ token, user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Erro ao realizar login.'
      };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Falha silenciosa
    } finally {
      localStorage.removeItem('@scalle:token');
      localStorage.removeItem('@scalle:user');
      set({ user: null, token: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  }
}));