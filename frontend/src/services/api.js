import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Interceptor de Requisição: Injeta o token Bearer
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('token') 
           || localStorage.getItem('scalle_token') 
           || localStorage.getItem('auth_token')
           || sessionStorage.getItem('token')
           || sessionStorage.getItem('scalle_token');

  // Fallback para Zustand persist (auth-storage)
  if (!token) {
    const authStorage = localStorage.getItem('auth-storage') || localStorage.getItem('scalle-auth');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || parsed?.state?.user?.token;
      } catch (e) {
        // Ignora erro de parse
      }
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${String(token).replace(/^"|"$/g, '').trim()}`;
  }
  
  return config;
});

// Interceptor de Resposta: Redireciona para o login em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('scalle_token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Suporte a exportação padrão e nomeada simultaneamente
export default api;