import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Users, Plus, Search, CheckCircle2, AlertTriangle,
  X, Briefcase, CalendarClock, Download, ShieldCheck, MapPin
} from 'lucide-react';

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modais
  const [modalNovo, setModalNovo] = useState(false);
  const [modalPonto, setModalPonto] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [espelhoPonto, setEspelhoPonto] = useState({});

  const [form, setForm] = useState({
    pessoa_id: '', usuario_id: '', matricula: '', cargo: '', departamento: '',
    data_admissao: new Date().toISOString().substring(0, 10), salario_base: '', tipo_contrato: 'CLT'
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resColab, resPess, resUsers] = await Promise.all([
        api.get('/rh/colaboradores'),
        api.get('/pessoas'), // Busca pessoas para vincular (física)
        api.get('/usuarios') // Busca usuários para vincular (login)
      ]);
      setColaboradores(resColab.data.data || []);
      setPessoas(resPess.data.data || resPess.data || []);
      setUsuarios(resUsers.data?.data?.usuarios || resUsers.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rh/colaboradores', form);
      setModalNovo(false);
      setFeedback({ tipo: 'sucesso', msg: 'Colaborador admitido com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao registrar.' });
    }
  };

  const abrirEspelhoPonto = async (colaborador) => {
    setColaboradorSelecionado(colaborador);
    setEspelhoPonto({});
    setModalPonto(true);
    try {
      const dataAtual = new Date();
      const res = await api.get(`/rh/colaboradores/${colaborador.id}/espelho?mes=${dataAtual.getMonth() + 1}&ano=${dataAtual.getFullYear()}`);
      setEspelhoPonto(res.data.data.espelho_diario || {});
    } catch (err) {
      console.error('Erro ao carregar espelho', err);
    }
  };

  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const filtroBusca = colaboradores.filter(c =>
    c.pessoa?.nome_razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    c.matricula.toLowerCase().includes(search.toLowerCase()) ||
    c.cargo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-500" /> Gestão de Equipes (RH)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Fichas funcionais e relatórios de jornada</p>
        </div>
        <button
          onClick={() => setModalNovo(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" /> Nova Admissão
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, matrícula ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
            <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-6 py-4">Matrícula</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo / Depto</th>
                <th className="px-6 py-4 text-center">Contrato</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Carregando equipe...</td></tr>
              ) : filtroBusca.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhum colaborador encontrado.</td></tr>
              ) : (
                filtroBusca.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">{c.matricula}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{c.pessoa?.nome_razao_social || 'Desconhecido'}</div>
                      <div className="text-[10px] text-slate-500">Doc: {c.pessoa?.cpf_cnpj || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{c.cargo}</div>
                      <div className="text-[11px] text-slate-500">{c.departamento || 'Geral'}</div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-semibold">{c.tipo_contrato}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        c.status === 'ATIVO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        c.status === 'AFASTADO' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => abrirEspelhoPonto(c)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <CalendarClock className="h-3.5 w-3.5" /> Ponto
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA ADMISSÃO */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" /> Registrar Nova Admissão
              </h2>
              <button onClick={() => setModalNovo(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSalvar} className="p-6 space-y-4 text-sm">

              {/* Alerta de Desacoplamento */}
              <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-3 flex gap-3 text-xs text-indigo-200">
                <ShieldCheck className="h-5 w-5 text-indigo-400 shrink-0" />
                <p><strong>Padrão Arquitetural:</strong> A ficha de funcionário apenas <em>conecta</em> o cadastro da Pessoa (para folha) ao Usuário (para login). O RH não gera senhas de acesso.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Pessoa (Dados Físicos) *</label>
                  <select required value={form.pessoa_id} onChange={(e) => setForm({ ...form, pessoa_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white">
                    <option value="">Selecione a pessoa...</option>
                    {pessoas.filter(p => p.tipo_pessoa === 'PF').map(p => <option key={p.id} value={p.id}>{p.nome_razao_social} ({p.cpf_cnpj})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Usuário do Sistema (Login)</label>
                  <select value={form.usuario_id} onChange={(e) => setForm({ ...form, usuario_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white">
                    <option value="">Nenhum (Apenas ponto mecânico)</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Matrícula (RE) *</label>
                  <input type="text" required value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Data de Admissão *</label>
                  <input type="date" required value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Cargo *</label>
                  <input type="text" required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Departamento</label>
                  <input type="text" value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Salário Base Mensal (R$) *</label>
                  <input type="number" step="0.01" min="0" required value={form.salario_base} onChange={(e) => setForm({ ...form, salario_base: parseFloat(e.target.value) })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Tipo de Contrato</label>
                  <select value={form.tipo_contrato} onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white">
                    <option value="CLT">CLT Efetivo</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                    <option value="ESTAGIO">Estágio</option>
                    <option value="TEMPORARIO">Temporário</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovo(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition shadow-lg shadow-indigo-600/30">Gravar Admissão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ESPELHO DE PONTO */}
      {modalPonto && colaboradorSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-indigo-400" /> Espelho de Ponto (Portaria 671)
                </h2>
                <p className="text-xs text-slate-400 mt-1">Colaborador: <strong className="text-white">{colaboradorSelecionado.pessoa?.nome_razao_social}</strong> | Mês Atual</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition">
                  <Download className="h-3.5 w-3.5" /> Exportar (AFD)
                </button>
                <button onClick={() => setModalPonto(false)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg ml-2"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto bg-slate-950">
              {Object.keys(espelhoPonto).length === 0 ? (
                <div className="text-center py-10 text-slate-500 italic">Nenhum registro de ponto encontrado para este período.</div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(espelhoPonto).sort().reverse().map(dia => (
                    <div key={dia} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-800 font-bold text-sm text-indigo-300">
                        {new Date(dia + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
                      </div>
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {espelhoPonto[dia].map((p, idx) => (
                          <div key={p.id} className="bg-slate-950 border border-slate-700/50 p-2.5 rounded-lg text-center relative group">
                            <span className="text-[9px] font-bold uppercase text-slate-500 block mb-1">{p.tipo_registro.replace('_', ' ')}</span>
                            <span className="text-lg font-black font-mono text-white">{new Date(p.data_hora_registro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>

                            {/* Tooltip Hover MTP 671 */}
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-[9px] text-left text-slate-300 rounded shadow-xl border border-slate-700 z-10">
                              <div className="font-bold text-white mb-1">Auditoria (Hash)</div>
                              <div className="truncate font-mono text-indigo-300">{p.hash_registro}</div>
                              <div>IP: {p.ip_origem}</div>
                              <div className="mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.latitude}, {p.longitude}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
