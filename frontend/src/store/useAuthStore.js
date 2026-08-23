import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        const cleanToken = String(token).replace(/^"|"$/g, '').trim();
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('scalle_token', cleanToken);
        set({ user, token: cleanToken, isAuthenticated: true });
      },

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        
        // Tratamento para extrair token independentemente de data.data.token ou data.token
        const payload = response.data?.data || response.data;
        const token = payload.token || response.data.token;
        const user = payload.user || response.data.user;

        if (!token) {
          throw new Error('Token de autenticação não retornado pelo servidor.');
        }

        const cleanToken = String(token).replace(/^"|"$/g, '').trim();
        localStorage.setItem('token', cleanToken);
        localStorage.setItem('scalle_token', cleanToken);

        set({
          user,
          token: cleanToken,
          isAuthenticated: true,
        });

        return response.data;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          // Ignora falhas de rede no logout
        } finally {
          localStorage.removeItem('token');
          localStorage.removeItem('scalle_token');
          localStorage.removeItem('auth-storage');
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);