import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Varre todas as convenções de chave de token comuns
  const token = localStorage.getItem('@scalle:token')
             || localStorage.getItem('token')
             || localStorage.getItem('auth_token')
             || localStorage.getItem('@scalle_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpa todas as chaves
      localStorage.removeItem('@scalle:token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('@scalle_token');
      localStorage.removeItem('@scalle:user');
      localStorage.removeItem('user');

      // Se não estiver na tela de login, redireciona suavemente
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login')) {
        window.location.href = '/app/login';
      }
    } else if (error.response?.status === 402) {
      alert('⚠️ Atenção: Sua conta está em período de tolerância (Soft-Lock). Apenas consultas são permitidas.');
    }
    return Promise.reject(error);
  }
);

export default api;
