import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ShieldCheck, KeyRound, Mail, Lock, ArrowRight, ArrowLeft, Key } from 'lucide-react';

export default function Login() {
  // Estados de Login e MFA
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequerido, setMfaRequerido] = useState(false);

  // Estados de Recuperação de Senha
  const [view, setView] = useState('LOGIN'); // LOGIN, FORGOT, RESET
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        mfa_code: mfaRequerido ? mfaCode.trim() : undefined
      });

      if (res.data?.data?.mfa_requerido) {
        setMfaRequerido(true);
        setLoading(false);
        return;
      }

      const { token, user } = res.data.data;
      localStorage.setItem('scalle_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('@scalle:token', token);
      localStorage.setItem('scalle_user', JSON.stringify(user));

      window.location.replace('/app/dashboard');
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Falha na autenticação. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarRecuperacao = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setSucesso(res.data?.data?.message || 'Código enviado!');
      setView('RESET');
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinirSenha = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        codigo: resetCode.trim(),
        nova_senha: newPassword
      });
      setSucesso(res.data?.data?.message || 'Senha redefinida com sucesso!');
      setTimeout(() => {
        setView('LOGIN');
        setPassword('');
        setSucesso('');
      }, 3000);
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const voltarParaLogin = () => {
    setView('LOGIN');
    setMfaRequerido(false);
    setMfaCode('');
    setErro('');
    setSucesso('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-950/80 border border-indigo-800 text-indigo-400 mb-1">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scalle ERP</h1>
          <p className="text-xs text-slate-400">
            {view === 'LOGIN' && !mfaRequerido ? 'Acesso corporativo seguro' :
             view === 'FORGOT' ? 'Recuperação de Acesso' :
             view === 'RESET' ? 'Redefinir Senha' : 'Segundo Fator de Segurança'}
          </p>
        </div>

        {erro && (
          <div className="relative z-10 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl text-center">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="relative z-10 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl text-center">
            {sucesso}
          </div>
        )}

        <div className="relative z-10">
          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              {!mfaRequerido ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">E-mail Corporativo</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@empresa.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-semibold text-slate-400">Senha</label>
                      <button type="button" onClick={() => { setView('FORGOT'); setErro(''); setSucesso(''); }} className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer">Esqueceu a senha?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium transition"
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
                  <button type="button" onClick={voltarParaLogin} className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto cursor-pointer">
                    <ArrowLeft className="h-3 w-3" /> Voltar para senha
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition mt-2"
              >
                {loading ? 'Validando...' : (mfaRequerido ? 'Confirmar e Entrar' : 'Acessar Sistema')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {view === 'FORGOT' && (
            <form onSubmit={handleSolicitarRecuperacao} className="space-y-4 text-xs">
              <p className="text-slate-400 text-center mb-4">
                Informe o seu e-mail de acesso. Enviaremos um código de 6 caracteres para redefinir a sua senha.
              </p>
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition"
              >
                {loading ? 'Enviando...' : 'Enviar Código de Recuperação'}
              </button>
              <button type="button" onClick={voltarParaLogin} className="w-full py-3 text-slate-400 hover:text-white transition font-medium cursor-pointer">
                Cancelar e Voltar
              </button>
            </form>
          )}

          {view === 'RESET' && (
            <form onSubmit={handleRedefinirSenha} className="space-y-4 text-xs">
              <p className="text-emerald-400 font-semibold text-center mb-4">
                Verifique a sua caixa de entrada (e o Spam).
              </p>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Código de 6 Caracteres *</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                    placeholder="Ex: A9X7B2"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white uppercase font-mono font-bold tracking-widest focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Nova Senha *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || resetCode.length < 6 || newPassword.length < 6}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition"
              >
                {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
              </button>
              <button type="button" onClick={voltarParaLogin} className="w-full py-3 text-slate-400 hover:text-white transition font-medium cursor-pointer">
                Lembrei a senha, voltar.
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
