import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingCart, Plus, Trophy, CheckCircle2, 
  AlertTriangle, X, Building2, Calendar, FileText, ArrowRight
} from 'lucide-react';

export default function CotacoesComprasPage() {
  const [cotacoes, setCotacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaCotacao, setModalNovaCotacao] = useState(false);
  const [modalProposta, setModalProposta] = useState(false);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [depositos, setDepositos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]);

  // Form Nova Cotação
  const [formCotacao, setFormCotacao] = useState({
    titulo: '', deposito_destino_id: '', data_limite_resposta: '', observacoes: '',
    itens: [{ item_id: '', quantidade: 1 }]
  });

  // Form Proposta
  const [formProposta, setFormProposta] = useState({
    fornecedor_id: '', valor_frete: 0, prazo_entrega_dias: 3, condicoes_pagamento: 'Boleto 30 dias',
    itens: []
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resCot, resDeps, resForn, resItens] = await Promise.all([
        api.get('/compras/cotacoes'),
        api.get('/wms/depositos'),
        api.get('/pessoas', { params: { tipo: 'FORNECEDOR' } }),
        api.get('/itens')
      ]);
      setCotacoes(resCot.data?.data || (Array.isArray(resCot.data) ? resCot.data : []));
      setDepositos(resDeps.data?.data || []);
      setFornecedores(resForn.data?.data || []);
      setItensCatalogo(resItens.data?.data || []);

      if (resDeps.data?.data?.length > 0 && !formCotacao.deposito_destino_id) {
        setFormCotacao(prev => ({ ...prev, deposito_destino_id: resDeps.data.data[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSalvarCotacao = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/compras/cotacoes', formCotacao);
      setModalNovaCotacao(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao abrir cotação.' });
    }
  };

  const handleAbrirModalProposta = (cot) => {
    setCotacaoSelecionada(cot);
    setFormProposta({
      fornecedor_id: '', valor_frete: 0, prazo_entrega_dias: 3, condicoes_pagamento: 'Boleto 30 dias',
      itens: cot.itens.map(i => ({ cotacao_item_id: i.id, valor_unitario: 0 }))
    });
    setModalProposta(true);
  };

  const handleSalvarProposta = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/compras/cotacoes/${cotacaoSelecionada.id}/propostas`, formProposta);
      setModalProposta(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao registrar proposta no mapa comparativo.' });
    }
  };

  const handleAprovarProposta = async (cotacaoId, propostaId) => {
    try {
      const res = await api.put(`/compras/cotacoes/${cotacaoId}/propostas/${propostaId}/aprovar`);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao aprovar proposta vencedora.' });
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-500 shrink-0" />
            Mapa Comparativo de Cotações (Suprimentos)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Quadro comparativo de múltiplos fornecedores e aprovação de compras em 2 etapas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalNovaCotacao(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Nova Cotação
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl flex items-center justify-between text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Lista de Cotações e Mapas Comparativos */}
      <div className="space-y-4">
        {cotacoes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            Nenhuma cotação de compras em andamento.
          </div>
        ) : (
          cotacoes.map((cot) => (
            <div key={cot.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base">{cot.titulo}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cot.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {cot.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Depósito Destino: {cot.deposito?.nome}</span>
                </div>

                {cot.status === 'ABERTA' && (
                  <button
                    type="button"
                    onClick={() => handleAbrirModalProposta(cot)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold border border-slate-700 flex items-center gap-1 self-start sm:self-center cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Inserir Proposta de Fornecedor
                  </button>
                )}
              </div>

              {/* Quadro Comparativo de Propostas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Propostas Recebidas no Mapa:</span>
                {cot.propostas?.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">Aguardando inserção de propostas de fornecedores...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {cot.propostas.map((prop) => (
                      <div key={prop.id} className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                        prop.is_vencedora ? 'bg-emerald-950/30 border-emerald-600' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-white text-xs">{prop.fornecedor?.nome_razao_social}</span>
                            {prop.is_vencedora && <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Vencedora</span>}
                          </div>
                          <div className="text-base font-bold font-mono text-emerald-400">R$ {parseFloat(prop.valor_total).toFixed(2)}</div>
                          <div className="text-[10px] text-slate-400">Frete: R$ {parseFloat(prop.valor_frete).toFixed(2)} | Prazo: {prop.prazo_entrega_dias} dias</div>
                          <div className="text-[10px] text-slate-500 font-medium">Condições: {prop.condicoes_pagamento}</div>
                        </div>

                        {cot.status === 'ABERTA' && (
                          <button
                            type="button"
                            onClick={() => handleAprovarProposta(cot.id, prop.id)}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md cursor-pointer"
                          >
                            <Trophy className="h-3.5 w-3.5" /> Aprovar Fornecedor
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nova Cotação */}
      {modalNovaCotacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-indigo-400" /> Abrir Cotação de Compras</h3>
              <button type="button" onClick={() => setModalNovaCotacao(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarCotacao} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Título da Cotação *</label>
                <input type="text" required placeholder="Ex: Cotação de Insumos e Filtros HVAC" value={formCotacao.titulo} onChange={(e) => setFormCotacao({ ...formCotacao, titulo: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Depósito Destino *</label>
                <select required value={formCotacao.deposito_destino_id} onChange={(e) => setFormCotacao({ ...formCotacao, deposito_destino_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovaCotacao(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Abrir Cotação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inserir Proposta */}
      {modalProposta && cotacaoSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Trophy className="h-4 w-4 text-indigo-400" /> Proposta de Fornecedor: {cotacaoSelecionada.titulo}</h3>
              <button type="button" onClick={() => setModalProposta(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarProposta} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Fornecedor *</label>
                <select required value={formProposta.fornecedor_id} onChange={(e) => setFormProposta({ ...formProposta, fornecedor_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  <option value="">Selecione o Fornecedor...</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_razao_social}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Valor do Frete (R$)</label>
                  <input type="number" step="0.01" min="0" value={formProposta.valor_frete} onChange={(e) => setFormProposta({ ...formProposta, valor_frete: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Prazo de Entrega (Dias)</label>
                  <input type="number" min="1" required value={formProposta.prazo_entrega_dias} onChange={(e) => setFormProposta({ ...formProposta, prazo_entrega_dias: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-400 block">Preços Unitários por Item:</span>
                {cotacaoSelecionada.itens?.map((it, idx) => (
                  <div key={it.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-white font-medium">{it.item?.nome} (Qtd: {it.quantidade})</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.01"
                      required
                      placeholder="Preço Unit."
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newItens = [...formProposta.itens];
                        newItens[idx].valor_unitario = val;
                        setFormProposta({ ...formProposta, itens: newItens });
                      }}
                      className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-right"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalProposta(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar Proposta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}