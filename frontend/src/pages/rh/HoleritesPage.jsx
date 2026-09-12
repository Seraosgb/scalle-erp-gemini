import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  FileText, Plus, Search, CheckCircle2, AlertTriangle, 
  X, DollarSign, TrendingUp, TrendingDown, Trash2, Printer
} from 'lucide-react';

export default function HoleritesPage() {
  const [holerites, setHolerites] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modais e Formulário
  const [modalNovo, setModalNovo] = useState(false);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [form, setForm] = useState({
    colaborador_id: '',
    competencia: new Date().toISOString().substring(0, 7).replace('-', '/'), // Ex: 2026/09 -> 09/2026
    data_emissao: new Date().toISOString().substring(0, 10),
    observacoes: '',
    itens: []
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resHolerites, resColab] = await Promise.all([
        api.get('/rh/holerites'),
        api.get('/rh/colaboradores')
      ]);
      setHolerites(resHolerites.data?.data || resHolerites.data || []);
      setColaboradores(resColab.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  // Calculadora em tempo real do Holerite
  const totalProventos = form.itens.filter(i => i.tipo === 'PROVENTO').reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
  const totalDescontos = form.itens.filter(i => i.tipo === 'DESCONTO').reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
  const valorLiquido = Math.max(0, totalProventos - totalDescontos);

  const handleSelecionarColaborador = (id) => {
    const colab = colaboradores.find(c => c.id === id);
    setColaboradorSelecionado(colab);
    setForm({
      ...form,
      colaborador_id: id,
      itens: colab ? [{ tipo: 'PROVENTO', descricao: 'Salário Base', referencia: '30 dias', valor: colab.salario_base }] : []
    });
  };

  const adicionarItem = (tipo) => {
    setForm({
      ...form,
      itens: [...form.itens, { tipo, descricao: '', referencia: '', valor: '' }]
    });
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...form.itens];
    novosItens[index][campo] = valor;
    setForm({ ...form, itens: novosItens });
  };

  const removerItem = (index) => {
    const novosItens = [...form.itens];
    novosItens.splice(index, 1);
    setForm({ ...form, itens: novosItens });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (form.itens.length === 0) {
      setFeedback({ tipo: 'erro', msg: 'Adicione pelo menos um item (provento ou desconto) ao holerite.' });
      return;
    }

    try {
      // Ajusta o formato da competência para MM/YYYY se vier como YYYY/MM do input type="month"
      let comp = form.competencia;
      if (comp.includes('-')) {
        const [ano, mes] = comp.split('-');
        comp = `${mes}/${ano}`;
      }

      const payload = { ...form, competencia: comp };
      await api.post('/rh/holerites', payload);
      
      setModalNovo(false);
      setFeedback({ tipo: 'sucesso', msg: 'Holerite gerado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao gerar contracheque.' });
    }
  };

  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  const filtroBusca = Array.isArray(holerites) ? holerites.filter(h => 
    h.colaborador?.pessoa?.nome_razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    h.competencia.includes(search)
  ) : [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-500" /> Folha & Holerites
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Gestão de contracheques e pagamentos da equipe</p>
        </div>
        <button
          onClick={() => {
            setForm({ colaborador_id: '', competencia: new Date().toISOString().substring(0, 7), data_emissao: new Date().toISOString().substring(0, 10), observacoes: '', itens: [] });
            setColaboradorSelecionado(null);
            setModalNovo(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" /> Gerar Holerite
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
              placeholder="Buscar por colaborador ou competência..."
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
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4 text-right">Proventos</th>
                <th className="px-6 py-4 text-right">Descontos</th>
                <th className="px-6 py-4 text-right">Líquido a Pagar</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Carregando folha...</td></tr>
              ) : filtroBusca.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhum holerite gerado.</td></tr>
              ) : (
                filtroBusca.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">{h.competencia}</td>
                    <td className="px-6 py-4 font-bold text-white">{h.colaborador?.pessoa?.nome_razao_social || 'Desconhecido'}</td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400">{formatarMoeda(h.total_proventos)}</td>
                    <td className="px-6 py-4 text-right font-mono text-rose-400">{formatarMoeda(h.total_descontos)}</td>
                    <td className="px-6 py-4 text-right font-mono font-black text-white">{formatarMoeda(h.valor_liquido)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        h.status === 'GERADO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' :
                        h.status === 'PAGO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO HOLERITE */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" /> Gerar Holerite / Recibo de Pagamento
              </h2>
              <button onClick={() => setModalNovo(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSalvar} className="p-6 space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">Colaborador *</label>
                  <select required value={form.colaborador_id} onChange={(e) => handleSelecionarColaborador(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white">
                    <option value="">Selecione...</option>
                    {colaboradores.map(c => <option key={c.id} value={c.id}>{c.pessoa?.nome_razao_social} (Matrícula: {c.matricula})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Competência *</label>
                  <input type="month" required value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white" />
                </div>
              </div>

              {/* Tabela Interativa de Itens */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <span className="font-bold text-slate-300">Lançamentos (Vencimentos e Descontos)</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => adicionarItem('PROVENTO')} className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px] font-bold transition flex items-center gap-1"><Plus className="h-3 w-3" /> Provento</button>
                    <button type="button" onClick={() => adicionarItem('DESCONTO')} className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded text-[10px] font-bold transition flex items-center gap-1"><Plus className="h-3 w-3" /> Desconto</button>
                  </div>
                </div>
                
                {form.itens.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 italic text-xs">Nenhum lançamento adicionado.</div>
                ) : (
                  <div className="p-3 space-y-2">
                    {form.itens.map((item, idx) => (
                      <div key={idx} className={`flex flex-wrap md:flex-nowrap gap-2 items-center p-2 rounded-lg border ${item.tipo === 'PROVENTO' ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-rose-950/20 border-rose-900/30'}`}>
                        <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${item.tipo === 'PROVENTO' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
                          {item.tipo === 'PROVENTO' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <input type="text" required placeholder="Ex: Salário Base, INSS, Faltas..." value={item.descricao} onChange={(e) => atualizarItem(idx, 'descricao', e.target.value)} className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs" />
                        </div>
                        <div className="w-24 shrink-0">
                          <input type="text" placeholder="Ref (Ex: 11%)" value={item.referencia} onChange={(e) => atualizarItem(idx, 'referencia', e.target.value)} className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs text-center" />
                        </div>
                        <div className="w-32 shrink-0 relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                          <input type="number" step="0.01" min="0" required value={item.valor} onChange={(e) => atualizarItem(idx, 'valor', e.target.value)} className={`w-full pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-xs font-bold ${item.tipo === 'PROVENTO' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        </div>
                        <button type="button" onClick={() => removerItem(idx)} className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-900 rounded shrink-0"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Resumo Rodapé da Tabela */}
                <div className="bg-slate-900 p-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Vencimentos</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">{formatarMoeda(totalProventos)}</span>
                  </div>
                  <div className="border-l border-slate-800">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Descontos</span>
                    <span className="text-sm font-mono font-bold text-rose-400">{formatarMoeda(totalDescontos)}</span>
                  </div>
                  <div className="border-l border-slate-800 bg-indigo-950/30 rounded py-1">
                    <span className="block text-[10px] text-indigo-300 font-bold uppercase">Líquido a Pagar</span>
                    <span className="text-base font-mono font-black text-white">{formatarMoeda(valorLiquido)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovo(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Finalizar Holerite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}