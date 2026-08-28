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

// Interceptor de Resposta: NÃO desloga em 401 de endpoints operacionais
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Apenas loga o erro no console sem redirecionar a janela inteira
    if (error.response) {
      console.warn(`[API] Erro ${error.response.status} na rota: ${error.config?.url}`, error.response.data);
    }
    return Promise.reject(error);
  }
);