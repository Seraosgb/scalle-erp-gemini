import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Building2, Users, Plus, RefreshCw, CheckCircle2, 
  AlertTriangle, X, Shield, Mail, Phone, Check
} from 'lucide-react';

export default function UsuariosEmpresasPage() {
  const [activeTab, setActiveTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modais
  const [modalNovoUsuario, setModalNovoUsuario] = useState(false);
  const [modalNovaEmpresa, setModalNovaEmpresa] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Forms
  const [formUsuario, setFormUsuario] = useState({
    name: '',
    email: '',
    password: '',
    telefone: '',
    perfil_id: '',
    empresa_padrao_id: '',
  });

  const [formEmpresa, setFormEmpresa] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    inscricao_estadual: '',
    regime_tributario: 'simples_nacional',
    is_matriz: false,
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUsers, resEmps] = await Promise.all([
        api.get('/usuarios'),
        api.get('/empresas')
      ]);

      setUsuarios(resUsers.data.data.usuarios || []);
      setPerfis(resUsers.data.data.perfis || []);
      const emps = resEmps.data.data || [];
      setEmpresas(emps);

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
  }, []);

  const handleSalvarUsuario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/usuarios', formUsuario);
      setModalNovoUsuario(false);
      setFormUsuario({
        name: '',
        email: '',
        password: '',
        telefone: '',
        perfil_id: '',
        empresa_padrao_id: empresas[0]?.id || '',
      });
      setFeedback({ tipo: 'sucesso', msg: 'Usuário cadastrado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cadastrar usuário.' });
    }
  };

  const handleSalvarEmpresa = async (e) => {
    e.preventDefault();
    try {
      await api.post('/empresas', formEmpresa);
      setModalNovaEmpresa(false);
      setFormEmpresa({
        nome_fantasia: '',
        razao_social: '',
        cnpj: '',
        inscricao_estadual: '',
        regime_tributario: 'simples_nacional',
        is_matriz: false,
      });
      setFeedback({ tipo: 'sucesso', msg: 'Filial cadastrada com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cadastrar filial.' });
    }
  };

  const handleTrocarContexto = async (empresaId) => {
    try {
      const res = await api.post('/empresas/trocar-contexto', { empresa_id: empresaId });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Falha ao alternar contexto de empresa.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Governança & Equipe
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gestão de filiais, controle de acessos por perfil e assentos de usuários
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'usuarios' ? (
            <button 
              type="button"
              onClick={() => setModalNovoUsuario(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" />
              Novo Usuário
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => setModalNovaEmpresa(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" />
              Nova Filial
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Usuários da Equipe ({usuarios.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('empresas')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'empresas'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Empresas & Filiais ({empresas.length})
        </button>
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
            <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-800 flex items-center justify-center font-bold text-indigo-400">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{user.name}</h3>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {user.email}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Perfil:</span>
                  <span className="font-semibold text-slate-200">{user.perfil?.nome || 'Operador Padrão'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Filial Padrão:</span>
                  <span className="font-semibold text-slate-200">{user.empresa_padrao?.nome_fantasia || 'Matriz'}</span>
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
              <p className="text-xs text-slate-400">{emp.razao_social}</p>
              <button
                type="button"
                onClick={() => handleTrocarContexto(emp.id)}
                className="w-full py-1.5 text-xs rounded bg-slate-800 text-indigo-300 border border-slate-700 hover:bg-slate-700 font-medium cursor-pointer"
              >
                Alternar para esta Unidade
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Usuário */}
      {modalNovoUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                Novo Usuário da Equipe
              </h2>
              <button type="button" onClick={() => setModalNovoUsuario(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Senha Provisória *</label>
                <input 
                  type="password" 
                  required 
                  value={formUsuario.password}
                  onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
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
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoUsuario(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Filial */}
      {modalNovaEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                Nova Empresa / Filial
              </h2>
              <button type="button" onClick={() => setModalNovaEmpresa(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
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
                    placeholder="00.000.000/0000-00"
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
                <button type="button" onClick={() => setModalNovaEmpresa(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Cadastrar Filial</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}