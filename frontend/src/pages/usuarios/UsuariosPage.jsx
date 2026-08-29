import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Building2, Users, Plus, RefreshCw, CheckCircle2, 
  AlertTriangle, X, Shield, Mail, Check, Edit2, Trash2, Search, Power,
  ShieldCheck, KeyRound, Phone, UserCheck
} from 'lucide-react';
import MfaConfigModal from '../../components/MfaConfigModal';

export default function UsuariosEmpresasPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [permissoesDisponiveis, setPermissoesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modais
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [modalMfa, setModalMfa] = useState(false);
  const [usuarioMfaSelecionado, setUsuarioMfaSelecionado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Forms
  const [formUsuario, setFormUsuario] = useState({
    name: '',
    email: '',
    password: '',
    telefone: '',
    perfil_id: '',
    empresa_padrao_id: '',
    is_ativo: true,
  });

  const [formEmpresa, setFormEmpresa] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    inscricao_estadual: '',
    regime_tributario: 'simples_nacional',
    is_matriz: false,
  });

  const [formPerfil, setFormPerfil] = useState({
    nome: '',
    descricao: '',
    is_admin: false,
    permissoes: [],
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUsers, resEmps, resPerfis] = await Promise.all([
        api.get('/usuarios', { params: { search } }),
        api.get('/empresas', { params: { search } }),
        api.get('/perfis', { params: { search } })
      ]);

      setUsuarios(resUsers.data.data.usuarios || resUsers.data.data || []);
      const emps = resEmps.data.data || [];
      setEmpresas(emps);
      setPerfis(resPerfis.data.data.perfis || resPerfis.data.data || []);
      setPermissoesDisponiveis(resPerfis.data.data.permissoes || []);

      if (emps.length > 0 && !formUsuario.empresa_padrao_id) {
        setFormUsuario(prev => ({ ...prev, empresa_padrao_id: emps[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search]);

  // Abertura de Modais de Edição
  const abrirEdicaoUsuario = (u) => {
    setEditandoId(u.id);
    setFormUsuario({
      name: u.name || '',
      email: u.email || '',
      password: '',
      telefone: u.telefone || '',
      perfil_id: u.perfil_id || '',
      empresa_padrao_id: u.empresa_padrao_id || (empresas[0]?.id ?? ''),
      is_ativo: u.is_ativo ?? true,
    });
    setModalUsuario(true);
  };

  const abrirEdicaoEmpresa = (emp) => {
    setEditandoId(emp.id);
    setFormEmpresa({
      nome_fantasia: emp.nome_fantasia,
      razao_social: emp.razao_social,
      cnpj: emp.cnpj,
      inscricao_estadual: emp.inscricao_estadual || '',
      regime_tributario: emp.regime_tributario || 'simples_nacional',
      is_matriz: emp.is_matriz,
    });
    setModalEmpresa(true);
  };

  const abrirEdicaoPerfil = (p) => {
    setEditandoId(p.id);
    setFormPerfil({
      nome: p.nome,
      descricao: p.descricao || '',
      is_admin: p.is_admin,
      permissoes: p.permissoes ? p.permissoes.map(perm => perm.id) : [],
    });
    setModalPerfil(true);
  };

  const abrirConfigMfa = (u) => {
    setUsuarioMfaSelecionado(u);
    setModalMfa(true);
  };

  // Submits
  const handleSalvarUsuario = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formUsuario };
      if (editandoId && !payload.password) {
        delete payload.password;
      }

      if (editandoId) {
        await api.put(`/usuarios/${editandoId}`, payload);
        setFeedback({ tipo: 'sucesso', msg: 'Usuário atualizado com sucesso!' });
      } else {
        await api.post('/usuarios', payload);
        setFeedback({ tipo: 'sucesso', msg: 'Usuário cadastrado com sucesso!' });
      }
      setModalUsuario(false);
      setEditandoId(null);
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || err.response?.data?.message || 'Falha ao salvar usuário.' });
    }
  };

  const handleSalvarEmpresa = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await api.put(`/empresas/${editandoId}`, formEmpresa);
        setFeedback({ tipo: 'sucesso', msg: 'Filial atualizada com sucesso!' });
      } else {
        await api.post('/empresas', formEmpresa);
        setFeedback({ tipo: 'sucesso', msg: 'Filial cadastrada com sucesso!' });
      }
      setModalEmpresa(false);
      setEditandoId(null);
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao salvar filial.' });
    }
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await api.put(`/perfis/${editandoId}`, formPerfil);
        setFeedback({ tipo: 'sucesso', msg: 'Perfil atualizado com sucesso!' });
      } else {
        await api.post('/perfis', formPerfil);
        setFeedback({ tipo: 'sucesso', msg: 'Perfil cadastrado com sucesso!' });
      }
      setModalPerfil(false);
      setEditandoId(null);
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao salvar perfil.' });
    }
  };

  // Exclusões
  const handleExcluirUsuario = async (id) => {
    if (!window.confirm('Deseja realmente inativar/remover este usuário?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      setFeedback({ tipo: 'sucesso', msg: 'Usuário removido com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao excluir usuário.' });
    }
  };

  const handleExcluirEmpresa = async (id) => {
    if (!window.confirm('Deseja realmente remover esta filial?')) return;
    try {
      await api.delete(`/empresas/${id}`);
      setFeedback({ tipo: 'sucesso', msg: 'Filial removida com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao excluir filial.' });
    }
  };

  const handleExcluirPerfil = async (id) => {
    if (!window.confirm('Deseja realmente remover este perfil?')) return;
    try {
      await api.delete(`/perfis/${id}`);
      setFeedback({ tipo: 'sucesso', msg: 'Perfil removido com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao excluir perfil.' });
    }
  };

  const togglePermissao = (permId) => {
    const list = [...formPerfil.permissoes];
    const index = list.indexOf(permId);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(permId);
    }
    setFormPerfil({ ...formPerfil, permissoes: list });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Governança, ACL & Equipe
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Controle de acessos, perfis, assentos e operadores do tenant
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'usuarios' && (
            <button 
              type="button"
              onClick={() => {
                setEditandoId(null);
                setFormUsuario({ name: '', email: '', password: '', telefone: '', perfil_id: '', empresa_padrao_id: empresas[0]?.id || '', is_ativo: true });
                setModalUsuario(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" /> Novo Usuário
            </button>
          )}
          {activeTab === 'empresas' && (
            <button 
              type="button"
              onClick={() => {
                setEditandoId(null);
                setFormEmpresa({ nome_fantasia: '', razao_social: '', cnpj: '', inscricao_estadual: '', regime_tributario: 'simples_nacional', is_matriz: false });
                setModalEmpresa(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" /> Nova Filial
            </button>
          )}
          {activeTab === 'perfis' && (
            <button 
              type="button"
              onClick={() => {
                setEditandoId(null);
                setFormPerfil({ nome: '', descricao: '', is_admin: false, permissoes: [] });
                setModalPerfil(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" /> Novo Perfil
            </button>
          )}
        </div>
      </div>

      {/* Navegação e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'usuarios' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" /> Operadores & Assentos ({usuarios.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('empresas')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'empresas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" /> Filiais ({empresas.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('perfis')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'perfis' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="h-4 w-4" /> Perfis ACL ({perfis.length})
          </button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-lg flex items-center justify-between text-xs sm:text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span className="truncate">{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Aba 1: Usuários */}
      {activeTab === 'usuarios' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usuarios.map((user) => (
            <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs ${user.is_ativo ? 'bg-indigo-950/80 border-indigo-800 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{user.name}</h3>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {user.email}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${user.is_ativo ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                    {user.is_ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 ${user.mfa_ativo ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                    <ShieldCheck className="h-3 w-3" /> {user.mfa_ativo ? '2FA Ativo' : '2FA Off'}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Perfil de Acesso:</span>
                  <span className="font-semibold text-slate-200">{user.perfil?.nome || (user.is_master ? 'SaaS Master' : 'Operador Padrão')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Filial Vinculada:</span>
                  <span className="font-semibold text-slate-200">{user.empresa_padrao?.nome_fantasia || 'Matriz'}</span>
                </div>
                {user.telefone && (
                  <div className="flex justify-between text-slate-400">
                    <span>Telefone:</span>
                    <span className="font-semibold text-slate-200">{user.telefone}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => abrirConfigMfa(user)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 flex items-center gap-1 cursor-pointer"
                  title="Configurar Autenticação em 2 Etapas (MFA)"
                >
                  <KeyRound className="h-3 w-3" /> 2FA
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEdicaoUsuario(user)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3 text-indigo-400" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirUsuario(user.id)}
                    className="px-2.5 py-1 text-xs rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba 2: Empresas e Filiais */}
      {activeTab === 'empresas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {empresas.map((emp) => (
            <div key={emp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative">
              {emp.is_matriz && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Matriz
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{emp.nome_fantasia}</h3>
                  <span className="text-xs font-mono text-slate-400">CNPJ: {emp.cnpj}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 min-h-[32px]">{emp.razao_social}</p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => abrirEdicaoEmpresa(emp)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="h-3 w-3 text-indigo-400" /> Editar
                </button>
                {!emp.is_matriz && (
                  <button
                    type="button"
                    onClick={() => handleExcluirEmpresa(emp.id)}
                    className="px-2.5 py-1 text-xs rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aba 3: Perfis ACL */}
      {activeTab === 'perfis' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {perfis.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">{p.nome}</h3>
                </div>
                {p.is_admin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Admin Total
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 min-h-[32px]">{p.descricao || 'Sem descrição cadastrada.'}</p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Permissões: <strong className="text-indigo-400">{p.is_admin ? 'Todas (*)' : (p.permissoes?.length || 0)}</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirEdicaoPerfil(p)}
                    className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3 text-indigo-400" />
                  </button>
                  {!p.is_sistema && (
                    <button
                      type="button"
                      onClick={() => handleExcluirPerfil(p.id)}
                      className="px-2 py-1 text-xs rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Usuário */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                {editandoId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button type="button" onClick={() => setModalUsuario(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarUsuario} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required 
                  value={formUsuario.name}
                  onChange={(e) => setFormUsuario({ ...formUsuario, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail de Acesso *</label>
                <input 
                  type="email" 
                  required 
                  value={formUsuario.email}
                  onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {editandoId ? 'Nova Senha (deixe em branco para manter)' : 'Senha de Acesso *'}
                </label>
                <input 
                  type="password" 
                  required={!editandoId}
                  value={formUsuario.password}
                  onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  value={formUsuario.telefone}
                  onChange={(e) => setFormUsuario({ ...formUsuario, telefone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Perfil de Acesso</label>
                  <select 
                    value={formUsuario.perfil_id}
                    onChange={(e) => setFormUsuario({ ...formUsuario, perfil_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Operador Padrão</option>
                    {perfis.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Filial Vinculada</label>
                  <select 
                    value={formUsuario.empresa_padrao_id}
                    onChange={(e) => setFormUsuario({ ...formUsuario, empresa_padrao_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
                    ))}
                  </select>
                </div>
              </div>
              {editandoId && (
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="user_ativo"
                    checked={formUsuario.is_ativo}
                    onChange={(e) => setFormUsuario({ ...formUsuario, is_ativo: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="user_ativo" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Usuário Ativo (Permite login)
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalUsuario(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Filial */}
      {modalEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                {editandoId ? 'Editar Filial' : 'Nova Filial'}
              </h2>
              <button type="button" onClick={() => setModalEmpresa(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarEmpresa} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Fantasia *</label>
                <input 
                  type="text" 
                  required 
                  value={formEmpresa.nome_fantasia}
                  onChange={(e) => setFormEmpresa({ ...formEmpresa, nome_fantasia: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Razão Social *</label>
                <input 
                  type="text" 
                  required 
                  value={formEmpresa.razao_social}
                  onChange={(e) => setFormEmpresa({ ...formEmpresa, razao_social: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">CNPJ *</label>
                  <input 
                    type="text" 
                    required 
                    value={formEmpresa.cnpj}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, cnpj: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Inscrição Estadual</label>
                  <input 
                    type="text" 
                    value={formEmpresa.inscricao_estadual}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, inscricao_estadual: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalEmpresa(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Perfil ACL */}
      {modalPerfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                {editandoId ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}
              </h2>
              <button type="button" onClick={() => setModalPerfil(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarPerfil} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Perfil *</label>
                <input 
                  type="text" 
                  required 
                  value={formPerfil.nome}
                  onChange={(e) => setFormPerfil({ ...formPerfil, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={formPerfil.descricao}
                  onChange={(e) => setFormPerfil({ ...formPerfil, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="perfil_admin_modal"
                  checked={formPerfil.is_admin}
                  onChange={(e) => setFormPerfil({ ...formPerfil, is_admin: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="perfil_admin_modal" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Acesso de Administrador Total (Ignora restrições granulares)
                </label>
              </div>

              {!formPerfil.is_admin && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Matriz de Permissões Granulares
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    {permissoesDisponiveis.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded-lg cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formPerfil.permissoes.includes(perm.id)}
                          onChange={() => togglePermissao(perm.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs text-white font-medium truncate">{perm.nome}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{perm.slug}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
                <button type="button" onClick={() => setModalPerfil(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar</button>
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
          }}
          onAtualizado={(status) => {
            setUsuarios(prev => prev.map(u => u.id === usuarioMfaSelecionado.id ? { ...u, mfa_ativo: status } : u));
          }}
        />
      )}
    </div>
  );
}