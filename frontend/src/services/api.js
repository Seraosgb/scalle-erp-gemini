import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Interceptor de Requisição: Injeta o Bearer Token
api.interceptors.request.use((config) => {
  let token = null;

  // 1. Tenta recuperar do storage do Zustand
  const authStorage = localStorage.getItem('auth-storage') || localStorage.getItem('scalle-auth');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      token = parsed?.state?.token || parsed?.state?.user?.token;
    } catch (e) {}
  }

  // 2. Fallbacks diretos
  if (!token) {
    token = localStorage.getItem('token') 
         || localStorage.getItem('scalle_token') 
         || localStorage.getItem('auth_token')
         || sessionStorage.getItem('token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${String(token).replace(/^"|"$/g, '').trim()}`;
  }
  
  return config;
});

// Interceptor de Resposta seguro (sem window.location.href para evitar loop)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Apenas propaga o erro para ser tratado pelos hooks sem derrubar a tela
    return Promise.reject(error);
  }
);

export default api;