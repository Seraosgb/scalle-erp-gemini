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
    if (error.response && error.response.status === 401) {
      const isPublicRoute = 
        window.location.pathname.includes('/login') || 
        window.location.pathname.includes('/portal/os');

      if (!isPublicRoute) {
        localStorage.removeItem('scalle_token');
        localStorage.removeItem('token');
        localStorage.removeItem('scalle_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);