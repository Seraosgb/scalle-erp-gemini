import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

// Interceptor de Requisição: anexa o Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('scalle_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta: trata 401 sem loop infinito
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isLoginEndpoint = url.includes('/auth/login');
    const isMeEndpoint = url.includes('/auth/me');

    // Desloga apenas se o próprio endpoint de checagem de perfil (/auth/me) retornar 401
    if (error.response && error.response.status === 401 && isMeEndpoint) {
      localStorage.removeItem('scalle_token');
      localStorage.removeItem('token');
      localStorage.removeItem('scalle_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);