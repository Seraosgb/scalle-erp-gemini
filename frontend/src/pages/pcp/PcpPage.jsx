import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Factory, Plus, CheckCircle2, AlertTriangle, X, Play, 
  Layers, PackageCheck, Search, ArrowRight, TrendingUp
} from 'lucide-react';

export default function PcpPage() {
  const [abaAtiva, setAbaAtiva] = useState('ops'); // 'ops' | 'bom' | 'kpis'
  const [ops, setOps] = useState([]);
  const [estruturas, setEstruturas] = useState([]);
  const [itens, setItens] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modais
  const [modalNovaOp, setModalNovaOp] = useState(false);
  const [modalNovoInsumo, setModalNovoInsumo] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [opSelecionada, setOpSelecionada] = useState(null);

  // Formulários
  const [formOp, setFormOp] = useState({ produto_id: '', deposito_origem_id: '', deposito_destino_id: '', quantidade_planejada: '', observacoes: '' });
  const [formInsumo, setFormInsumo] = useState({ produto_pai_id: '', insumo_filho_id: '', quantidade_necessaria: '', percentual_perda_estimada: '0' });
  const [formFinalizar, setFormFinalizar] = useState({ quantidade_produzida: '' });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resOps, resBoms, resItens, resDeps] = await Promise.all([
        api.get('/pcp/ordens-producao', { params: { search } }).catch(() => ({ data: { data: [] } })),
        api.get('/pcp/estruturas').catch(() => ({ data: { data: [] } })),
        api.get('/itens').catch(() => ({ data: { data: [] } })),
        api.get('/wms/depositos').catch(() => ({ data: { data: [] } })),
      ]);

      const rawOps = resOps.data?.data;
      setOps(Array.isArray(rawOps) ? rawOps : (rawOps?.data || []));

      setEstruturas(resBoms.data?.data || []);

      const rawItens = resItens.data?.data;
      setItens(Array.isArray(rawItens) ? rawItens : (rawItens?.data || []));

      const deps = resDeps.data?.data || [];
      setDepositos(deps);

      if (deps.length > 0 && !formOp.deposito_origem_id) {
        setFormOp(prev => ({
          ...prev,
          deposito_origem_id: deps[0].id,
          deposito_destino_id: deps[0].id,
        }));
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

  const handleSalvarOp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/pcp/ordens-producao', formOp);
      setModalNovaOp(false);
      setFormOp({ produto_id: '', deposito_origem_id: depositos[0]?.id || '', deposito_destino_id: depositos[0]?.id || '', quantidade_planejada: '', observacoes: '' });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao gerar Ordem de Produção.' });
    }
  };

  const handleSalvarInsumo = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pcp/estruturas', formInsumo);
      setModalNovoInsumo(false);
      setFormInsumo({ produto_pai_id: '', insumo_filho_id: '', quantidade_necessaria: '', percentual_perda_estimada: '0' });
      setFeedback({ tipo: 'sucesso', msg: 'Item vinculado à Ficha Técnica com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao vincular insumo.' });
    }
  };

  const handleFinalizarOp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/pcp/ordens-producao/${opSelecionada.id}/finalizar`, formFinalizar);
      setModalFinalizar(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao finalizar OP.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Factory className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Indústria & PCP
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Ficha técnica (BOM), Ordens de Produção (OP) e consumo atômico de insumos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalNovoInsumo(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition"
          >
            <Layers className="h-4 w-4 text-indigo-400" /> Configurar BOM
          </button>
          <button
            type="button"
            onClick={() => setModalNovaOp(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" /> Nova Ordem de Produção (OP)
          </button>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('ops')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'ops' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Ordens de Produção ({ops.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('bom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'bom' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Fichas Técnicas (BOM) ({estruturas.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar OP, produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Aba 1: Ordens de Produção */}
      {abaAtiva === 'ops' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">NÚMERO OP</th>
                <th className="py-3 px-4">PRODUTO ACABADO</th>
                <th className="py-3 px-4 text-center">QTD PLANEJADA</th>
                <th className="py-3 px-4 text-center">QTD PRODUZIDA</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {ops.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-500">Nenhuma Ordem de Produção registrada.</td></tr>
              ) : (
                ops.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">OP-{op.numero_op}</td>
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{op.produto?.nome}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {op.produto?.codigo_sku}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white">{parseFloat(op.quantidade_planejada).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">{parseFloat(op.quantidade_produzida).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        op.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}>
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {op.status !== 'CONCLUIDA' && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpSelecionada(op);
                            setFormFinalizar({ quantidade_produzida: op.quantidade_planejada });
                            setModalFinalizar(true);
                          }}
                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                        >
                          Apontar & Finalizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba 2: Fichas Técnicas (BOM) */}
      {abaAtiva === 'bom' && (
        <div className="space-y-4">
          {estruturas.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              Nenhuma Ficha Técnica cadastrada. Clique em "Configurar BOM" para compor a estrutura de um produto.
            </div>
          ) : (
            estruturas.map((est, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{est.produto_pai?.nome}</h3>
                    <span className="text-[10px] text-indigo-400 font-mono">SKU Pai: {est.produto_pai?.codigo_sku}</span>
                  </div>
                  <span className="text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-400 font-mono">
                    {est.insumos?.length} Insumo(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {est.insumos?.map((ins) => (
                    <div key={ins.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="font-semibold text-slate-200">{ins.insumo?.nome}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Consumo: <strong className="text-emerald-400">{parseFloat(ins.quantidade_necessaria).toFixed(4)} {ins.insumo?.unidade_medida}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Perda Estimada: {parseFloat(ins.percentual_perda_estimada).toFixed(2)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Nova OP */}
      {modalNovaOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Plus className="h-4 w-4 text-indigo-400" /> Nova Ordem de Produção</h3>
              <button type="button" onClick={() => setModalNovaOp(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarOp} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Produto Acabado a Produzir *</label>
                <select required value={formOp.produto_id} onChange={(e) => setFormOp({ ...formOp, produto_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  <option value="">Selecione o Produto...</option>
                  {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Almoxarifado Insumos *</label>
                  <select required value={formOp.deposito_origem_id} onChange={(e) => setFormOp({ ...formOp, deposito_origem_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Almoxarifado Destino *</label>
                  <select required value={formOp.deposito_destino_id} onChange={(e) => setFormOp({ ...formOp, deposito_destino_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Quantidade Planejada *</label>
                <input type="number" step="0.0001" min="0.0001" required value={formOp.quantidade_planejada} onChange={(e) => setFormOp({ ...formOp, quantidade_planejada: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Observações Operacionais</label>
                <input type="text" placeholder="Instruções de lote ou linha..." value={formOp.observacoes} onChange={(e) => setFormOp({ ...formOp, observacoes: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovaOp(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Criar OP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configurar Insumo BOM */}
      {modalNovoInsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Layers className="h-4 w-4 text-indigo-400" /> Vincular Insumo à Ficha Técnica</h3>
              <button type="button" onClick={() => setModalNovoInsumo(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarInsumo} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Produto Acabado (Pai) *</label>
                <select required value={formInsumo.produto_pai_id} onChange={(e) => setFormInsumo({ ...formInsumo, produto_pai_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  <option value="">Selecione...</option>
                  {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Matéria-Prima / Insumo (Filho) *</label>
                <select required value={formInsumo.insumo_filho_id} onChange={(e) => setFormInsumo({ ...formInsumo, insumo_filho_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  <option value="">Selecione...</option>
                  {itens.filter(i => i.id !== formInsumo.produto_pai_id).map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Qtd Necessária (por UN) *</label>
                  <input type="number" step="0.0001" min="0.0001" required value={formInsumo.quantidade_necessaria} onChange={(e) => setFormInsumo({ ...formInsumo, quantidade_necessaria: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">% Perda Estimada</label>
                  <input type="number" step="0.01" min="0" max="100" value={formInsumo.percentual_perda_estimada} onChange={(e) => setFormInsumo({ ...formInsumo, percentual_perda_estimada: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoInsumo(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Gravar na BOM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Apontar e Finalizar OP */}
      {modalFinalizar && opSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald-400" /> Apontamento de Produção</h3>
              <button type="button" onClick={() => setModalFinalizar(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleFinalizarOp} className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Ordem: <strong className="text-white">OP-{opSelecionada.numero_op}</strong></span>
                <span className="text-slate-400 block">Produto: <strong className="text-indigo-400">{opSelecionada.produto?.nome}</strong></span>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Quantidade Efetivamente Produzida *</label>
                <input type="number" step="0.0001" min="0.0001" required value={formFinalizar.quantidade_produzida} onChange={(e) => setFormFinalizar({ quantidade_produzida: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 italic">
                * Ao confirmar, o sistema executará a baixa automática dos insumos e registrará a entrada do produto acabado com recálculo de custo médio.
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalFinalizar(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Confirmar & Estocar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}