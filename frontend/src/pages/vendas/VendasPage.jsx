import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingBag, Plus, Search, DollarSign, CheckCircle2, 
  AlertTriangle, X, FileText, Ban, ShoppingCart, Check, Trash2, Calendar, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';

function formatarDataHora(dataValor, fallbackCreatedAt) {
  const valor = (dataValor && !dataValor.includes('00:00:00')) ? dataValor : fallbackCreatedAt || dataValor;
  if (!valor) return '-';
  
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor;

  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VendasPage() {
  const [pedidos, setPedidos] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]);
  const [saldosEstoque, setSaldosEstoque] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modais
  const [modalNovoOrcamento, setModalNovoOrcamento] = useState(false);
  const [modalConverter, setModalConverter] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);

  // Form Orçamento
  const [formOrcamento, setFormOrcamento] = useState({
    cliente_id: '',
    deposito_id: '',
    desconto_geral: '0',
    data_validade: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    itens: []
  });

  // Busca e Seleção de Item no Orçamento (Padrão PDV)
  const [searchItemOrcamento, setSearchItemOrcamento] = useState('');
  const [itemTemp, setItemTemp] = useState({ item_id: '', nome: '', sku: '', quantidade: 1, preco_unitario: 0, saldo_disponivel: 0 });

  // Form Conversão
  const [formaPagamentoConversao, setFormaPagamentoConversao] = useState('DINHEIRO');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resVendas, resMetricas, resCli, resDeps, resItens] = await Promise.all([
        api.get('/vendas', { params: { search, status: filtroStatus } }).catch(() => ({ data: { data: [] } })),
        api.get('/vendas/metricas').catch(() => ({ data: { data: null } })),
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } }).catch(() => ({ data: { data: [] } })),
        api.get('/wms/depositos').catch(() => ({ data: { data: [] } })),
        api.get('/itens').catch(() => ({ data: { data: [] } })),
      ]);

      const raw = resVendas.data?.data;
      setPedidos(Array.isArray(raw) ? raw : (raw?.data || []));
      setMetricas(resMetricas.data?.data);

      const rawCli = resCli.data?.data;
      setClientes(Array.isArray(rawCli) ? rawCli : (rawCli?.data || []));

      const deps = resDeps.data?.data || [];
      setDepositos(deps);
      if (deps.length > 0 && !formOrcamento.deposito_id) {
        setFormOrcamento(prev => ({ ...prev, deposito_id: deps[0].id }));
      }

      const rawItens = resItens.data?.data;
      setItensCatalogo(Array.isArray(rawItens) ? rawItens : (rawItens?.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarSaldosDoDeposito = async (depId) => {
    if (!depId) return;
    try {
      const res = await api.get('/wms/saldos', { params: { deposito_id: depId } });
      const mapa = {};
      (res.data?.data || []).forEach((linha) => {
        mapa[linha.item_id] = (mapa[linha.item_id] || 0) + parseFloat(linha.quantidade_saldo || 0);
      });
      setSaldosEstoque(mapa);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const delay = setTimeout(carregarDados, 300);
    return () => clearTimeout(delay);
  }, [search, filtroStatus]);

  useEffect(() => {
    if (formOrcamento.deposito_id) {
      carregarSaldosDoDeposito(formOrcamento.deposito_id);
    }
  }, [formOrcamento.deposito_id]);

  const selecionarItemBusca = (prod) => {
    const saldo = saldosEstoque[prod.id] || 0;
    setItemTemp({
      item_id: prod.id,
      nome: prod.nome,
      sku: prod.codigo_sku,
      quantidade: 1,
      preco_unitario: parseFloat(prod.preco_venda || 0),
      saldo_disponivel: saldo
    });
    setSearchItemOrcamento('');
  };

  const handleAddItemOrcamento = () => {
    if (!itemTemp.item_id || itemTemp.quantidade <= 0) return;

    setFormOrcamento(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          item_id: itemTemp.item_id,
          nome: itemTemp.nome,
          sku: itemTemp.sku,
          quantidade: parseFloat(itemTemp.quantidade),
          preco_unitario: parseFloat(itemTemp.preco_unitario),
          total: parseFloat(itemTemp.quantidade) * parseFloat(itemTemp.preco_unitario),
          saldo_disponivel: itemTemp.saldo_disponivel
        }
      ]
    }));

    setItemTemp({ item_id: '', nome: '', sku: '', quantidade: 1, preco_unitario: 0, saldo_disponivel: 0 });
  };

  const handleRemoverItemOrcamento = (idx) => {
    setFormOrcamento(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== idx)
    }));
  };

  const subtotalOrcamento = formOrcamento.itens.reduce((acc, i) => acc + i.total, 0);
  const totalLiquidoOrcamento = Math.max(0, subtotalOrcamento - (parseFloat(formOrcamento.desconto_geral) || 0));

  const handleSalvarOrcamento = async (e) => {
    e.preventDefault();
    if (formOrcamento.itens.length === 0) {
      alert('Adicione pelo menos um produto ao orçamento.');
      return;
    }

    try {
      const payload = {
        cliente_id: formOrcamento.cliente_id,
        deposito_id: formOrcamento.deposito_id,
        desconto_geral: parseFloat(formOrcamento.desconto_geral) || 0,
        data_validade: formOrcamento.data_validade,
        itens: formOrcamento.itens.map(i => ({
          item_id: i.item_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
        }))
      };

      const res = await api.post('/vendas/orcamento', payload);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setModalNovoOrcamento(false);
      setFormOrcamento({
        cliente_id: '',
        deposito_id: depositos[0]?.id || '',
        desconto_geral: '0',
        data_validade: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        itens: []
      });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao criar orçamento.' });
    }
  };

  const handleConfirmarConversao = async (e) => {
    e.preventDefault();
    if (!orcamentoSelecionado) return;

    try {
      const res = await api.post(`/vendas/${orcamentoSelecionado.id}/converter`, {
        pagamentos: [
          { forma_pagamento: formaPagamentoConversao, valor_pago: parseFloat(orcamentoSelecionado.valor_total_liquido) }
        ]
      });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setModalConverter(false);
      setOrcamentoSelecionado(null);
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao converter orçamento.' });
    }
  };

  const handleCancelar = async (pedido) => {
    const motivo = window.prompt(`Motivo do cancelamento do Pedido #${pedido.numero_pedido}:`);
    if (!motivo) return;

    try {
      const res = await api.post(`/vendas/${pedido.id}/cancelar`, { motivo });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cancelar pedido.' });
    }
  };

  const itensFiltradosOrcamento = searchItemOrcamento
    ? itensCatalogo.filter(
        (i) =>
          i.nome.toLowerCase().includes(searchItemOrcamento.toLowerCase()) ||
          (i.codigo_sku && i.codigo_sku.toLowerCase().includes(searchItemOrcamento.toLowerCase())) ||
          (i.codigo_barras_ean && i.codigo_barras_ean.includes(searchItemOrcamento))
      )
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-indigo-500" />
            Gestão Comercial: Pedidos & Orçamentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Criação de Propostas, Orçamentos com Reserva WMS e Faturamento Balcão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalNovoOrcamento(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Novo Orçamento Comercial
          </button>
          <Link
            to="/app/pdv"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
          >
            <ShoppingCart className="h-4 w-4" /> Abrir PDV Balcão
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {metricas && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Vendas Hoje</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1 block">
              R$ {metricas.faturamento_hoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Qtd Vendas Hoje</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white mt-1 block">{metricas.vendas_hoje_qtd}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Orçamentos em Aberto</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1 block">{metricas.orcamentos_abertos_qtd}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-semibold block">Faturamento Mês</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-indigo-400 mt-1 block">
              R$ {metricas.faturamento_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: '', label: 'Todos' },
            { id: 'ORCAMENTO', label: 'Orçamentos Abertos' },
            { id: 'FATURADO', label: 'Faturados' },
            { id: 'AGUARDANDO_APROVACAO', label: 'Alçada Pendente' },
            { id: 'CANCELADO', label: 'Cancelados' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFiltroStatus(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filtroStatus === st.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nº Pedido ou Cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <span>{feedback.msg}</span>
          <button type="button" onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabela de Vendas e Orçamentos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
            <tr>
              <th className="py-3 px-4">NÚMERO</th>
              <th className="py-3 px-4">TIPO</th>
              <th className="py-3 px-4">CLIENTE</th>
              <th className="py-3 px-4 text-center">EMISSÃO</th>
              <th className="py-3 px-4 text-right">TOTAL LÍQUIDO</th>
              <th className="py-3 px-4 text-center">STATUS</th>
              <th className="py-3 px-4 text-center">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {pedidos.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-10 text-slate-500">Nenhum registro comercial encontrado.</td></tr>
            ) : (
              pedidos.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">#{p.numero_pedido}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.tipo_documento === 'ORCAMENTO' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {p.tipo_documento}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{p.cliente?.nome_razao_social}</td>
                  <td className="py-3 px-4 text-center text-slate-300 font-mono text-xs whitespace-nowrap">
                    {formatarDataHora(p.data_emissao, p.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    R$ {parseFloat(p.valor_total_liquido).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'FATURADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      p.status === 'ORCAMENTO' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      p.status === 'AGUARDANDO_APROVACAO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {p.status === 'ORCAMENTO' && (
                        <button
                          type="button"
                          onClick={() => {
                            setOrcamentoSelecionado(p);
                            setModalConverter(true);
                          }}
                          title="Converter em Venda Faturada"
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer shadow flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Converter
                        </button>
                      )}
                      {p.status !== 'CANCELADO' && (
                        <button
                          type="button"
                          onClick={() => handleCancelar(p)}
                          title="Cancelar Pedido/Orçamento"
                          className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-800 cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Orçamento Comercial com Busca Dinâmica */}
      {modalNovoOrcamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" /> Elaborar Orçamento Comercial (Proposta)
              </h3>
              <button type="button" onClick={() => setModalNovoOrcamento(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSalvarOrcamento} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-400 mb-1">Cliente *</label>
                  <select
                    required
                    value={formOrcamento.cliente_id}
                    onChange={(e) => setFormOrcamento({ ...formOrcamento, cliente_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">Selecione o Cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Validade da Proposta</label>
                  <input
                    type="date"
                    required
                    value={formOrcamento.data_validade}
                    onChange={(e) => setFormOrcamento({ ...formOrcamento, data_validade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Almoxarifado de Saída / Reserva *</label>
                <select
                  required
                  value={formOrcamento.deposito_id}
                  onChange={(e) => setFormOrcamento({ ...formOrcamento, deposito_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>

              {/* Inclusão de Produtos via Busca Inteligente */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-white block">Adicionar Produtos à Proposta</span>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por Código de Barras (EAN), SKU ou Nome..."
                    value={searchItemOrcamento}
                    onChange={(e) => setSearchItemOrcamento(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                {/* Dropdown de Resultados */}
                {searchItemOrcamento && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 shadow-lg">
                    {itensFiltradosOrcamento.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-xs">Nenhum item encontrado.</div>
                    ) : (
                      itensFiltradosOrcamento.map((item) => {
                        const saldoDisponivel = saldosEstoque[item.id] || 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => selecionarItemBusca(item)}
                            className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{item.nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {item.codigo_sku} | Saldo: <strong className={saldoDisponivel > 0 ? 'text-emerald-400' : 'text-rose-400'}>{saldoDisponivel.toFixed(2)} {item.unidade_medida}</strong>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-emerald-400 block">
                                R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-indigo-400 font-bold">Selecionar</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Linha de Inserção do Item */}
                {itemTemp.item_id && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-900 p-2.5 rounded-lg border border-indigo-500/40 items-center">
                    <div className="sm:col-span-6">
                      <div className="text-white font-bold truncate">{itemTemp.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {itemTemp.sku} | Saldo Disp: <strong className="text-emerald-400">{itemTemp.saldo_disponivel}</strong>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Qtd"
                        value={itemTemp.quantidade}
                        onChange={(e) => setItemTemp({ ...itemTemp, quantidade: e.target.value })}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-white text-center font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preço R$"
                        value={itemTemp.preco_unitario}
                        onChange={(e) => setItemTemp({ ...itemTemp, preco_unitario: e.target.value })}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-white text-right font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddItemOrcamento}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded cursor-pointer"
                      >
                        Inserir
                      </button>
                    </div>
                  </div>
                )}

                {/* Grade de Itens Adicionados */}
                <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                  {formOrcamento.itens.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-xs">Nenhum produto adicionado ao orçamento.</div>
                  ) : (
                    formOrcamento.itens.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-900 text-xs border border-slate-800/80">
                        <span className="truncate pr-2">{it.nome} ({it.quantidade} UN x R$ {it.preco_unitario.toFixed(2)})</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">R$ {it.total.toFixed(2)}</span>
                          <button type="button" onClick={() => handleRemoverItemOrcamento(idx)} className="text-rose-400 p-1 hover:bg-rose-950 rounded cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Totais do Orçamento */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal dos Produtos:</span>
                  <span className="font-mono text-white">R$ {subtotalOrcamento.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Desconto Comercial (R$):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formOrcamento.desconto_geral}
                    onChange={(e) => setFormOrcamento({ ...formOrcamento, desconto_geral: e.target.value })}
                    className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-right text-white font-mono"
                  />
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-slate-900 pt-2 text-emerald-400">
                  <span>TOTAL DA PROPOSTA:</span>
                  <span className="font-mono text-base">R$ {totalLiquidoOrcamento.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoOrcamento(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-lg shadow-indigo-600/30">
                  Salvar & Reservar Estoque WMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conversão em Venda Faturada */}
      {modalConverter && orcamentoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> Converter Orçamento #{orcamentoSelecionado.numero_pedido}
              </h3>
              <button type="button" onClick={() => setModalConverter(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleConfirmarConversao} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Cliente: <strong className="text-white">{orcamentoSelecionado.cliente?.nome_razao_social}</strong></div>
                <div className="text-slate-400">Total a Faturar: <strong className="text-emerald-400 font-mono text-sm">R$ {parseFloat(orcamentoSelecionado.valor_total_liquido).toFixed(2)}</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Forma de Pagamento de Liquidação *</label>
                <select
                  value={formaPagamentoConversao}
                  onChange={(e) => setFormaPagamentoConversao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX Nativo</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalConverter(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Confirmar Faturamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}