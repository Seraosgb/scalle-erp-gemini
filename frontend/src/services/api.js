import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@scalle:token')
             || localStorage.getItem('token')
             || localStorage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

// Flag na memória para não disparar múltiplos redirecionamentos simultâneos
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const currentPath = window.location.pathname.toLowerCase();

    if (status === 401) {
      // Limpa dados de sessão
      localStorage.removeItem('@scalle:token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('@scalle:user');

      // Se já estiver em qualquer variação de login, NÃO redireciona de novo
      if (!currentPath.includes('login') && !isRedirecting) {
        isRedirecting = true;
        // Redireciona para a rota padrão de login
        window.location.replace('/app/login');
      }
    } else if (status === 402) {
      alert('⚠️ Atenção: Sua conta está em período de tolerância (Soft-Lock). Apenas consultas são permitidas.');
    }

    return Promise.reject(error);
  }
);

export default api;
