import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Lê prioritariamente 'scalle_token' (usado pelo Login.jsx original) e fallbacks
  const token = localStorage.getItem('scalle_token')
             || localStorage.getItem('token')
             || localStorage.getItem('@scalle:token');

  if (token) {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const currentPath = window.location.pathname.toLowerCase();

    if (status === 401) {
      // Limpa todas as possíveis chaves para evitar lixo de sessão
      localStorage.removeItem('scalle_token');
      localStorage.removeItem('scalle_user');
      localStorage.removeItem('token');
      localStorage.removeItem('@scalle:token');
      localStorage.removeItem('@scalle:user');

      // Se não estiver na tela de login, redireciona de forma controlada (sem loop)
      if (!currentPath.includes('login') && !isRedirecting) {
        isRedirecting = true;
        window.location.replace('/login');
      }
    } else if (status === 402) {
      alert('⚠️ Atenção: Sua conta está em período de tolerância (Soft-Lock). Apenas consultas são permitidas.');
    }

    return Promise.reject(error);
  }
);

export default api;
