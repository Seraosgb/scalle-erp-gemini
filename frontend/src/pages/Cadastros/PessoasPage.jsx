import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Users, Plus, Search, CheckCircle2, AlertTriangle,
  X, Building2, User as UserIcon, Tag, SearchCode
} from 'lucide-react';

export default function PessoasPage() {
  const [pessoas, setPessoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [feedback, setFeedback] = useState(null);

  // Modais
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({
    id: null,
    tipo_pessoa: 'PF',
    nome_razao_social: '',
    nome_fantasia_apelido: '',
    cpf_cnpj: '',
    email_principal: '',
    telefone_principal: '',
    is_cliente: false,
    is_fornecedor: false,
    is_tecnico: false,
    is_transportadora: false,
  });

  const carregarPessoas = async () => {
    setLoading(true);
    try {
      // O backend aceita 'search' via query params
      const res = await api.get('/pessoas', { params: { search } });
      const data = res.data?.data?.data || res.data?.data || [];
      setPessoas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setFeedback({ tipo: 'erro', msg: 'Erro ao carregar a base de pessoas.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => { carregarPessoas(); }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        cpf_cnpj: form.cpf_cnpj.replace(/\D/g, '') // Envia apenas números
      };

      if (form.id) {
        await api.put(`/pessoas/${form.id}`, payload);
        setFeedback({ tipo: 'sucesso', msg: 'Cadastro atualizado com sucesso!' });
      } else {
        await api.post('/pessoas', payload);
        setFeedback({ tipo: 'sucesso', msg: 'Nova pessoa cadastrada no ERP!' });
      }
      setModalNovo(false);
      carregarPessoas();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao salvar o registro.' });
    }
  };

  const handleEditar = (pessoa) => {
    setForm({
      id: pessoa.id,
      tipo_pessoa: pessoa.tipo_pessoa || 'PF',
      nome_razao_social: pessoa.nome_razao_social || '',
      nome_fantasia_apelido: pessoa.nome_fantasia_apelido || '',
      cpf_cnpj: pessoa.cpf_cnpj || '',
      email_principal: pessoa.email_principal || '',
      telefone_principal: pessoa.telefone_principal || '',
      is_cliente: pessoa.is_cliente || false,
      is_fornecedor: pessoa.is_fornecedor || false,
      is_tecnico: pessoa.is_tecnico || false,
      is_transportadora: pessoa.is_transportadora || false,
    });
    setModalNovo(true);
  };

  // Filtro local adicional pelas abas
  const pessoasFiltradas = pessoas.filter(p => {
    if (filtroTipo === 'TODOS') return true;
    if (filtroTipo === 'PF' && p.tipo_pessoa === 'PF') return true;
    if (filtroTipo === 'PJ' && p.tipo_pessoa === 'PJ') return true;
    return false;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" /> Diretório Global de Pessoas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Base central unificada para RH, Clientes e Fornecedores</p>
        </div>
        <button
          onClick={() => {
            setForm({ id: null, tipo_pessoa: 'PF', nome_razao_social: '', nome_fantasia_apelido: '', cpf_cnpj: '', email_principal: '', telefone_principal: '', is_cliente: false, is_fornecedor: false, is_tecnico: false, is_transportadora: false });
            setModalNovo(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" /> Novo Cadastro
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm mb-6 ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium">{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Abas e Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/50">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={() => setFiltroTipo('TODOS')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${filtroTipo === 'TODOS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>Todos</button>
            <button onClick={() => setFiltroTipo('PF')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${filtroTipo === 'PF' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>Pessoa Física (PF)</button>
            <button onClick={() => setFiltroTipo('PJ')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${filtroTipo === 'PJ' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>Pessoa Jurídica (PJ)</button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por Nome, CPF ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
            <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Nome / Razão Social</th>
                <th className="px-6 py-4">CPF / CNPJ</th>
                <th className="px-6 py-4">Contatos</th>
                <th className="px-6 py-4">Classificação (Tags)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-slate-500">Carregando diretório...</td></tr>
              ) : pessoasFiltradas.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : (
                pessoasFiltradas.map((p) => (
                  <tr key={p.id} onClick={() => handleEditar(p)} className="hover:bg-slate-800/40 transition cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${p.tipo_pessoa === 'PJ' ? 'bg-indigo-950 border-indigo-800 text-indigo-400' : 'bg-emerald-950 border-emerald-800 text-emerald-400'}`}>
                        {p.tipo_pessoa === 'PJ' ? <Building2 className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white group-hover:text-indigo-400 transition">{p.nome_razao_social}</div>
                      <div className="text-[11px] text-slate-500">{p.nome_fantasia_apelido || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{p.cpf_cnpj}</td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-300">{p.email_principal || 'Sem e-mail'}</div>
                      <div className="text-slate-400">{p.telefone_principal || 'Sem telefone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.is_cliente && <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[9px] font-bold uppercase">Cliente</span>}
                        {p.is_fornecedor && <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-bold uppercase">Fornecedor</span>}
                        {p.is_tecnico && <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[9px] font-bold uppercase">Técnico</span>}
                        {!p.is_cliente && !p.is_fornecedor && !p.is_tecnico && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-bold uppercase">Sem Tag</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CADASTRAR/EDITAR PESSOA */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" /> {form.id ? 'Editar Cadastro' : 'Nova Pessoa Fís./Jur.'}
              </h2>
              <button onClick={() => setModalNovo(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-5 text-sm">
              <div className="flex gap-4 p-1 bg-slate-950 border border-slate-800 rounded-xl w-fit">
                <label className={`px-4 py-2 rounded-lg cursor-pointer font-bold text-xs transition flex items-center gap-2 ${form.tipo_pessoa === 'PF' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <input type="radio" name="tipo_pessoa" value="PF" checked={form.tipo_pessoa === 'PF'} onChange={(e) => setForm({...form, tipo_pessoa: e.target.value})} className="hidden" />
                  <UserIcon className="h-4 w-4" /> Pessoa Física (RH)
                </label>
                <label className={`px-4 py-2 rounded-lg cursor-pointer font-bold text-xs transition flex items-center gap-2 ${form.tipo_pessoa === 'PJ' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <input type="radio" name="tipo_pessoa" value="PJ" checked={form.tipo_pessoa === 'PJ'} onChange={(e) => setForm({...form, tipo_pessoa: e.target.value})} className="hidden" />
                  <Building2 className="h-4 w-4" /> Pessoa Jurídica
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{form.tipo_pessoa === 'PF' ? 'CPF *' : 'CNPJ *'}</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={form.cpf_cnpj}
                      onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                      placeholder={form.tipo_pessoa === 'PF' ? 'Apenas números...' : 'CNPJ sem pontuação...'}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">O sistema valida a matemática do documento.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">{form.tipo_pessoa === 'PF' ? 'Nome Completo *' : 'Razão Social *'}</label>
                  <input type="text" required value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white uppercase focus:border-indigo-500" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">{form.tipo_pessoa === 'PF' ? 'Apelido (Opcional)' : 'Nome Fantasia'}</label>
                  <input type="text" value={form.nome_fantasia_apelido} onChange={(e) => setForm({ ...form, nome_fantasia_apelido: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">E-mail Principal</label>
                  <input type="email" value={form.email_principal} onChange={(e) => setForm({ ...form, email_principal: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input type="text" value={form.telefone_principal} onChange={(e) => setForm({ ...form, telefone_principal: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:border-indigo-500" />
                </div>
              </div>

              {/* Tags de Classificação */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5"><Tag className="h-4 w-4" /> Classificações no ERP (Tags)</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input type="checkbox" checked={form.is_cliente} onChange={(e) => setForm({...form, is_cliente: e.target.checked})} className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-600" />
                    Cliente
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input type="checkbox" checked={form.is_fornecedor} onChange={(e) => setForm({...form, is_fornecedor: e.target.checked})} className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-600" />
                    Fornecedor
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input type="checkbox" checked={form.is_tecnico} onChange={(e) => setForm({...form, is_tecnico: e.target.checked})} className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-600" />
                    Técnico de Campo
                  </label>
                </div>
                {form.tipo_pessoa === 'PF' && (
                  <p className="text-[10px] text-amber-500 mt-3 font-semibold">Nota RH: Para admissão, basta salvar a pessoa. A "Tag" de colaborador é dada automaticamente na tela de Admissão no menu RH.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovo(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition shadow-lg shadow-indigo-600/30">Gravar no Diretório</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
