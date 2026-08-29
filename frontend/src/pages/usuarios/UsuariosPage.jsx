import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Users, Plus, ShieldCheck, Mail, Phone, CheckCircle2, AlertTriangle, X, KeyRound } from 'lucide-react';
import MfaConfigModal from '../../components/MfaConfigModal';

export default function UsuariosPage() {
  const [modalNovo, setModalNovo] = useState(false);
  const [modalMfa, setModalMfa] = useState(false);
  const [usuarioMfaSelecionado, setUsuarioMfaSelecionado] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', telefone: '' });

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['usuarios-lista'],
    queryFn: async () => {
      const res = await api.get('/usuarios');
      return res.data;
    }
  });

  const rawUsuarios = usersData?.data?.usuarios || usersData?.data;
  const usuarios = Array.isArray(rawUsuarios) ? rawUsuarios : [];

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/usuarios', form);
      setModalNovo(false);
      setForm({ name: '', email: '', password: '', telefone: '' });
      setFeedback({ tipo: 'sucesso', msg: 'Usuário cadastrado com sucesso!' });
      refetch();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cadastrar usuário.' });
    }
  };

  const abrirConfigMfa = (u) => {
    setUsuarioMfaSelecionado(u);
    setModalMfa(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-3 sm:p-5 text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Governança & Equipe</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">Controle de acessos, perfis, assentos e operadores do tenant</p>
        </div>
        <button
          type="button"
          onClick={() => setModalNovo(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl flex items-center justify-between text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <span>{feedback.msg}</span>
          <button type="button" onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Lista de Membros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-3 text-center py-8 text-slate-500">Carregando usuários...</div>
        ) : usuarios.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-slate-500">Nenhum usuário cadastrado.</div>
        ) : (
          usuarios.map((u) => (
            <div key={u.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-white text-sm block">{u.name}</span>
                  <span className="text-[11px] text-indigo-400 font-medium">{u.perfil?.nome || (u.is_master ? 'SaaS Master' : 'Operador')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 ${u.mfa_ativo ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                    <ShieldCheck className="h-3 w-3" /> {u.mfa_ativo ? '2FA Ativo' : '2FA Off'}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${u.is_ativo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-500" /> {u.email}</div>
                {u.telefone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-500" /> {u.telefone}</div>}
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => abrirConfigMfa(u)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Configurar Autenticação em 2 Etapas (MFA)"
                >
                  <KeyRound className="h-3 w-3" /> Configurar 2FA
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Usuário */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">Novo Membro da Equipe</h3>
              <button type="button" onClick={() => setModalNovo(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvar} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome Completo *</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">E-mail de Acesso *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Senha Inicial *</label>
                <input required type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input type="text" value={form.telefone} onChange={(e) => setForm({...form, telefone: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovo(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestão de MFA / 2FA */}
      {modalMfa && usuarioMfaSelecionado && (
        <MfaConfigModal
          usuario={usuarioMfaSelecionado}
          onClose={() => {
            setModalMfa(false);
            setUsuarioMfaSelecionado(null);
            refetch();
          }}
          onAtualizado={(status) => {
            refetch();
          }}
        />
      )}
    </div>
  );
}