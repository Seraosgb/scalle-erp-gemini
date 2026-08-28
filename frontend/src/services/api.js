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

// Interceptor de Resposta: trata 401 sem loop infinito e previne logout falso
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const urlRequisicao = error.config?.url || '';
      const isRotaAuth = urlRequisicao.includes('/auth/login') || urlRequisicao.includes('/auth/me');
      const isPublicRoute = 
        window.location.pathname.includes('/login') || 
        window.location.pathname.includes('/portal/os');

      // Só desloga se o endpoint /auth/me falhar ou se não for uma rota pública
      if (!isPublicRoute && isRotaAuth) {
        localStorage.removeItem('scalle_token');
        localStorage.removeItem('token');
        localStorage.removeItem('scalle_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);