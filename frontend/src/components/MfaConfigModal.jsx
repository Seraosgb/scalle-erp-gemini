import React, { useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, QrCode, KeyRound, CheckCircle2, AlertTriangle, X, Lock } from 'lucide-react';

export default function MfaConfigModal({ usuario, onClose, onAtualizado }) {
  const [etapa, setEtapa] = useState(usuario?.mfa_ativo ? 'DESATIVAR' : 'INICIO');
  const [setupData, setSetupData] = useState(null);
  const [codigoConfirmacao, setCodigoConfirmacao] = useState('');
  const [senhaDesativacao, setSenhaDesativacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const iniciarSetup = async () => {
    setLoading(true);
    setErro('');
    try {
      const res = await api.post('/auth/mfa/setup');
      setSetupData(res.data?.data);
      setEtapa('CONFIRMAR');
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Falha ao iniciar configuração do MFA.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAtivacao = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      await api.post('/auth/mfa/confirmar', { codigo: codigoConfirmacao });
      setSucesso('Autenticação em Dois Fatores (MFA) ativada com sucesso!');
      if (onAtualizado) onAtualizado(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Código inválido. Tente novamente com o código atual do app.');
    } finally {
      setLoading(false);
    }
  };

  const handleDesativarMfa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      await api.post('/auth/mfa/desativar', { password: senhaDesativacao });
      setSucesso('Autenticação em Dois Fatores desativada.');
      if (onAtualizado) onAtualizado(false);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Senha incorreta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 text-slate-200">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Segurança Avançada (MFA / 2FA)</h2>
              <span className="text-[11px] text-slate-400">Proteção por aplicativo autenticador TOTP</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {erro && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* Etapa 1: Apresentação para Ativar */}
        {etapa === 'INICIO' && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              A ativação da Autenticação em Duas Etapas adiciona uma camada extra de segurança à sua conta corporativa exigindo um código de 6 dígitos gerado no celular a cada login.
            </p>
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1.5 text-[11px] text-slate-400">
              <div>✔ Compatível com <strong>Google Authenticator</strong>, <strong>Authy</strong> e <strong>Microsoft Authenticator</strong>.</div>
              <div>✔ Obrigatório para conformidade de segurança e perfis administrativos.</div>
            </div>
            <button
              type="button"
              onClick={iniciarSetup}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition"
            >
              {loading ? 'Gerando Chave...' : 'Configurar Aplicativo Autenticador'}
            </button>
          </div>
        )}

        {/* Etapa 2: Escanear QR Code e Digitar Código */}
        {etapa === 'CONFIRMAR' && setupData && (
          <form onSubmit={handleConfirmarAtivacao} className="space-y-4 text-xs">
            <div className="flex flex-col items-center justify-center p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-center">
              <span className="text-[11px] font-semibold text-slate-300">1. Escaneie o QR Code abaixo com seu app:</span>
              <img src={setupData.qr_code_url} alt="QR Code MFA" className="w-40 h-40 rounded-xl bg-white p-2 shadow-md" />
              <span className="text-[10px] text-slate-500 font-mono">Chave Manual: {setupData.secret}</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-center">2. Digite o código de 6 dígitos gerado:</label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={codigoConfirmacao}
                onChange={(e) => setCodigoConfirmacao(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-white font-mono font-bold text-lg tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || codigoConfirmacao.length < 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition"
            >
              {loading ? 'Validando...' : 'Confirmar e Ativar 2FA'}
            </button>
          </form>
        )}

        {/* Etapa 3: Desativação (caso já esteja ativo) */}
        {etapa === 'DESATIVAR' && (
          <form onSubmit={handleDesativarMfa} className="space-y-4 text-xs">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" /> MFA está atualmente ATIVADO nesta conta
              </div>
              <p className="text-slate-400 text-[11px]">
                Para desativar o segundo fator, confirme sua senha atual de acesso:
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1">Sua Senha Atual</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={senhaDesativacao}
                  onChange={(e) => setSenhaDesativacao(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !senhaDesativacao}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition"
            >
              {loading ? 'Desativando...' : 'Desativar Autenticação em 2 Etapas'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}