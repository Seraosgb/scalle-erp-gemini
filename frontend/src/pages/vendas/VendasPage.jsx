import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingBag, Plus, Search, Filter, RefreshCw, 
  FileText, CheckCircle2, AlertTriangle, X, Printer, 
  ArrowRightLeft, Ban, FileCheck2, User, Building2
} from 'lucide-react';

export default function VendasPage() {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  
  // Modais
  const [modalNovoOrcamento, setModalNovoOrcamento] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalImpressao, setModalImpressao] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Dados para formulários
  const [clientes, setClientes] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]);

  // Form Orçamento
  const [formOrcamento, setFormOrcamento] = useState({
    cliente_id: '',
    deposito_id: '',
    desconto_geral: 0,
    data_validade: '',
    itens: [{ item_id: '', quantidade: 1, preco_unitario: 0 }]
  });

  const carregarVendas = async () => {
    setLoading(true);
    try {
      const [resVendas, resCli, resDeps, resItens] = await Promise.all([
        api.get('/vendas', { params: { search, status: statusFiltro } }),
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } }),
        api.get('/wms/depositos'),
        api.get('/itens')
      ]);

      setVendas(resVendas.data.data || []);
      setClientes(resCli.data.data || []);
      const deps = resDeps.data.data || [];
      setDepositos(deps);
      setItensCatalogo(resItens.data.data || []);

      if (deps.length > 0 && !formOrcamento.deposito_id) {
        setFormOrcamento(prev => ({ ...prev, deposito_id: deps[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarVendas();
  }, [search, statusFiltro]);

  const abrirDetalhes = (v) => {
    setVendaSelecionada(v);
    setModalDetalhes(true);
  };

  const abrirImpressao = (v) => {
    setVendaSelecionada(v);
    setModalImpressao(true);
  };

  const handleSalvarOrcamento = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/vendas/orcamento', formOrcamento);
      setModalNovoOrcamento(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarVendas();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || err.response?.data?.message || 'Erro ao registrar proposta.' });
    }
  };

  const handleConverter = async (vendaId) => {
    if (!window.confirm('Deseja faturar este orçamento e dar baixa imediata no estoque?')) return;
    try {
      const res = await api.post(`/vendas/${vendaId}/converter`, {
        pagamentos: [{ forma_pagamento: 'DINHEIRO', valor_pago: vendaSelecionada.valor_total_liquido }]
      });
      setModalDetalhes(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarVendas();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao faturar orçamento.' });
    }
  };

  const handleCancelar = async (vendaId) => {
    const motivo = window.prompt('Informe o motivo do cancelamento da venda:');
    if (!motivo) return;
    try {
      const res = await api.post(`/vendas/${vendaId}/cancelar`, { motivo });
      setModalDetalhes(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarVendas();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao cancelar venda.' });
    }
  };

  const handleEmitirFiscal = async (vendaId) => {
    try {
      const res = await api.post(`/vendas/${vendaId}/emitir-fiscal`);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha na emissão fiscal.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Gestão Comercial & Pedidos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Acompanhamento de vendas, orçamentos, faturamento e emissão fiscal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setModalNovoOrcamento(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" />
            Novo Orçamento / Proposta
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['', 'FATURADO', 'ORCAMENTO', 'AGUARDANDO_APROVACAO', 'CANCELADO'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFiltro(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                statusFiltro === st 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === '' ? 'Todos os Pedidos' : st}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por Nº do Pedido ou Cliente..." 
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

      {/* Tabela de Vendas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Nº PEDIDO</th>
                <th className="py-3 px-4">DATA</th>
                <th className="py-3 px-4">CLIENTE</th>
                <th className="py-3 px-4">VENDEDOR</th>
                <th className="py-3 px-4 text-right">TOTAL LÍQUIDO</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500 font-sans">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando pedidos de venda...
                  </td>
                </tr>
              ) : vendas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500 font-sans">
                    Nenhum pedido de venda registrado.
                  </td>
                </tr>
              ) : (
                vendas.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition font-sans">
                    <td className="py-3 px-4 text-indigo-400 font-semibold font-mono">#{v.numero_pedido}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{new Date(v.data_emissao).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4 text-white font-medium">{v.cliente?.nome_razao_social || 'Consumidor Final'}</td>
                    <td className="py-3 px-4 text-slate-300">{v.vendedor?.name || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-emerald-400">
                      R$ {parseFloat(v.valor_total_liquido).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'FATURADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        v.status === 'ORCAMENTO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                        v.status === 'AGUARDANDO_APROVACAO' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirDetalhes(v)}
                          title="Detalhes da Venda"
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirImpressao(v)}
                          title="Imprimir Pedido"
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5 text-indigo-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes do Pedido */}
      {modalDetalhes && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Pedido #{vendaSelecionada.numero_pedido}</h2>
                <p className="text-xs text-slate-400">Cliente: {vendaSelecionada.cliente?.nome_razao_social}</p>
              </div>
              <button type="button" onClick={() => setModalDetalhes(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Itens do Pedido */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Itens Vendidos</h3>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Qtd</th>
                        <th className="p-2.5 text-right">Unitário</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {vendaSelecionada.itens?.map((i) => (
                        <tr key={i.id}>
                          <td className="p-2.5 font-sans text-slate-200">{i.item?.nome}</td>
                          <td className="p-2.5 text-center">{parseFloat(i.quantidade).toFixed(2)}</td>
                          <td className="p-2.5 text-right">R$ {parseFloat(i.preco_venda_unitario).toFixed(2)}</td>
                          <td className="p-2.5 text-right text-emerald-400 font-bold">R$ {parseFloat(i.valor_total_liquido).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totais */}
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-sans">Total Líquido do Pedido:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">R$ {parseFloat(vendaSelecionada.valor_total_liquido).toFixed(2)}</span>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {vendaSelecionada.status === 'ORCAMENTO' && (
                  <button
                    type="button"
                    onClick={() => handleConverter(vendaSelecionada.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Converter em Venda
                  </button>
                )}
                {vendaSelecionada.status === 'FATURADO' && (
                  <button
                    type="button"
                    onClick={() => handleEmitirFiscal(vendaSelecionada.id)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <FileCheck2 className="h-4 w-4" /> Emitir NFC-e
                  </button>
                )}
                {vendaSelecionada.status !== 'CANCELADO' && (
                  <button
                    type="button"
                    onClick={() => handleCancelar(vendaSelecionada.id)}
                    className="px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Ban className="h-4 w-4" /> Cancelar Venda
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalDetalhes(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Impressão de Espelho do Pedido */}
      {modalImpressao && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-400" /> Impressão de Espelho
              </h2>
              <button type="button" onClick={() => setModalImpressao(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Layout Térmico 80mm / A4 */}
            <div className="p-6 bg-white text-slate-950 font-mono text-xs space-y-3 print:p-0">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <h3 className="font-bold text-sm">SCALLE ERP — COMPROVANTE</h3>
                <p className="text-[10px] text-slate-600">PEDIDO DE VENDA #{vendaSelecionada.numero_pedido}</p>
                <p className="text-[10px] text-slate-600">{new Date(vendaSelecionada.data_emissao).toLocaleString('pt-BR')}</p>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2 space-y-0.5 text-[11px]">
                <div>CLIENTE: {vendaSelecionada.cliente?.nome_razao_social || 'Consumidor Final'}</div>
                <div>DOC: {vendaSelecionada.cliente?.cpf_cnpj || '000.000.000-00'}</div>
                <div>VENDEDOR: {vendaSelecionada.vendedor?.name || '-'}</div>
              </div>

              <div className="border-b border-dashed border-slate-400 pb-2">
                <div className="font-bold mb-1 text-[11px]">ITENS</div>
                {vendaSelecionada.itens?.map((i, idx) => (
                  <div key={i.id} className="flex justify-between text-[10px]">
                    <span className="truncate pr-2">{idx + 1}. {i.item?.nome} ({parseFloat(i.quantidade).toFixed(0)}x)</span>
                    <span className="font-bold">R$ {parseFloat(i.valor_total_liquido).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>R$ {parseFloat(vendaSelecionada.valor_subtotal_itens).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>TOTAL LÍQUIDO:</span>
                  <span>R$ {parseFloat(vendaSelecionada.valor_total_liquido).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Orçamento */}
      {modalNovoOrcamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-indigo-400" />
                Nova Proposta / Orçamento Comercial
              </h2>
              <button type="button" onClick={() => setModalNovoOrcamento(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarOrcamento} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente *</label>
                  <select
                    required
                    value={formOrcamento.cliente_id}
                    onChange={(e) => setFormOrcamento({ ...formOrcamento, cliente_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_razao_social}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Depósito de Saída *</label>
                  <select
                    required
                    value={formOrcamento.deposito_id}
                    onChange={(e) => setFormOrcamento({ ...formOrcamento, deposito_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Itens do Orçamento */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Itens da Proposta</label>
                {formOrcamento.itens.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="col-span-6">
                      <select
                        required
                        value={item.item_id}
                        onChange={(e) => {
                          const itemId = e.target.value;
                          const it = itensCatalogo.find(c => c.id === itemId);
                          const novos = [...formOrcamento.itens];
                          novos[idx].item_id = itemId;
                          novos[idx].preco_unitario = it ? parseFloat(it.preco_venda || 0) : 0;
                          setFormOrcamento({ ...formOrcamento, itens: novos });
                        }}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                      >
                        <option value="">Item...</option>
                        {itensCatalogo.map(it => (
                          <option key={it.id} value={it.id}>{it.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        required
                        placeholder="Qtd"
                        value={item.quantidade}
                        onChange={(e) => {
                          const novos = [...formOrcamento.itens];
                          novos[idx].quantidade = parseFloat(e.target.value) || 1;
                          setFormOrcamento({ ...formOrcamento, itens: novos });
                        }}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-mono text-xs text-emerald-400 font-bold block pt-1.5">
                        R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
                <button type="button" onClick={() => setModalNovoOrcamento(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar Orçamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}