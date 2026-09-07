import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@scalle:token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@scalle:token');
      localStorage.removeItem('token');
      localStorage.removeItem('@scalle:user');

      // Evita loop caso o próprio erro 401 ocorra durante uma tentativa de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/app/login';
      }
    } else if (error.response?.status === 402) {
      alert('⚠️ Atenção: Sua conta está em período de tolerância (Soft-Lock). Apenas consultas são permitidas.');
    }
    return Promise.reject(error);
  }
);

export default api;
