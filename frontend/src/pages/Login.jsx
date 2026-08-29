import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ShieldCheck, KeyRound, Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequerido, setMfaRequerido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        mfa_code: mfaRequerido ? mfaCode : undefined
      });

      // Se o backend exigir o 2FA, ativa a tela de desafio
      if (res.data?.data?.mfa_requerido) {
        setMfaRequerido(true);
        setLoading(false);
        return;
      }

      const { token, user } = res.data.data;
      localStorage.setItem('scalle_token', token);
      localStorage.setItem('scalle_user', JSON.stringify(user));

      navigate('/app/dashboard');
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Falha na autenticação. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const voltarParaSenha = () => {
    setMfaRequerido(false);
    setMfaCode('');
    setErro('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-950/80 border border-indigo-800 text-indigo-400 mb-1">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scalle ERP</h1>
          <p className="text-xs text-slate-400">Entre com suas credenciais corporativas</p>
        </div>

        {erro && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          {!mfaRequerido ? (
            <>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <KeyRound className="h-6 w-6 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Segundo Fator (2FA)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Digite o código de 6 dígitos do seu aplicativo autenticador</p>
              </div>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-white font-mono font-bold text-xl tracking-widest focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={voltarParaSenha}
                className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar para senha
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition"
          >
            {loading ? 'Validando...' : (mfaRequerido ? 'Confirmar e Entrar' : 'Acessar Sistema')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}