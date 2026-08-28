import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Layers, Lock, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const authStore = typeof useAuthStore === 'function' ? useAuthStore() : null;
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authStore?.login) {
        await authStore.login(email, password);
      } else {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data?.data || {};

        if (token) {
localStorage.setItem('scalle_token', res.data.data.token);        }
        if (user) {
localStorage.setItem('scalle_user', JSON.stringify(res.data.data.user));        }
      }

      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      const apiMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message;

      setError(apiMessage || 'Credenciais inválidas ou serviço indisponível.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scalle ERP</h1>
          <p className="text-xs font-mono text-indigo-400">v2.0.0 Enterprise</p>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <div
            role="alert"
            className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm text-rose-300"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com.br"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}