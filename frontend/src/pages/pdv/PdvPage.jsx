import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingCart, Barcode, Search, Plus, Minus, Trash2, 
  DollarSign, CreditCard, QrCode, CheckCircle2, AlertTriangle, 
  X, User, ArrowRight, RefreshCw, Receipt
} from 'lucide-react';

export default function PdvPage() {
  const [itensCatalogo, setItensCatalogo] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [depositoId, setDepositoId] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  
  // Carrinho e Busca
  const [carrinho, setCarrinho] = useState([]);
  const [buscaCodigo, setBuscaCodigo] = useState('');
  const [descontoGeral, setDescontoGeral] = useState(0);
  
  // Modal de Checkout / Pagamento
  const [modalCheckout, setModalCheckout] = useState(false);
  const [modalComprovante, setModalComprovante] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [pagamentosAdicionados, setPagamentosAdicionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const barcodeInputRef = useRef(null);

  const carregarDadosIniciais = async () => {
    try {
      const [resItens, resDeps, resClientes] = await Promise.all([
        api.get('/itens'),
        api.get('/wms/depositos'),
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } })
      ]);

      const listaItens = resItens.data.data || resItens.data || [];
      const listaDeps = resDeps.data.data || resDeps.data || [];
      const listaCli = resClientes.data.data || [];

      setItensCatalogo(listaItens);
      setDepositos(listaDeps);
      setClientes(listaCli);

      const depPadrao = listaDeps.find(d => d.is_padrao) || listaDeps[0];
      if (depPadrao) {
        setDepositoId(depPadrao.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
    barcodeInputRef.current?.focus();
  }, []);

  // Adicionar item por leitor de código de barras ou SKU
  const handleAdicionarPorCodigo = (e) => {
    if (e.key === 'Enter' && buscaCodigo.trim()) {
      e.preventDefault();
      const termo = buscaCodigo.trim().toLowerCase();
      
      const itemEncontrado = itensCatalogo.find(
        i => (i.codigo_barras_ean && i.codigo_barras_ean.toLowerCase() === termo) ||
             (i.codigo_sku && i.codigo_sku.toLowerCase() === termo) ||
             i.nome.toLowerCase().includes(termo)
      );

      if (itemEncontrado) {
        adicionarAoCarrinho(itemEncontrado);
        setBuscaCodigo('');
      } else {
        setFeedback({ tipo: 'erro', msg: `Nenhum item localizado com o código: ${buscaCodigo}` });
      }
    }
  };

  const adicionarAoCarrinho = (item) => {
    setCarrinho((prev) => {
      const index = prev.findIndex(ci => ci.id === item.id);
      if (index > -1) {
        const novo = [...prev];
        novo[index].quantidade += 1;
        return novo;
      }
      return [...prev, {
        id: item.id,
        nome: item.nome,
        codigo_sku: item.codigo_sku,
        unidade_medida: item.unidade_medida,
        preco_unitario: parseFloat(item.preco_venda || 0),
        quantidade: 1,
        desconto_unitario: 0,
      }];
    });
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho((prev) => 
      prev.map(i => {
        if (i.id === id) {
          const novaQtd = Math.max(1, i.quantidade + delta);
          return { ...i, quantidade: novaQtd };
        }
        return i;
      })
    );
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(prev => prev.filter(i => i.id !== id));
  };

  // Cálculos de Totais
  const subtotal = carrinho.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0);
  const totalLiquido = Math.max(0, subtotal - parseFloat(descontoGeral || 0));

  const totalPagoAdicionado = pagamentosAdicionados.reduce((acc, p) => acc + parseFloat(p.valor_pago || 0), 0);
  const saldoRestante = Math.max(0, totalLiquido - totalPagoAdicionado);
  const trocoCalculado = Math.max(0, totalPagoAdicionado - totalLiquido);

  const abrirCheckout = () => {
    if (carrinho.length === 0) {
      setFeedback({ tipo: 'erro', msg: 'Adicione ao menos um item no carrinho para fechar a venda.' });
      return;
    }
    setPagamentosAdicionados([
      { forma_pagamento: 'DINHEIRO', valor_pago: totalLiquido, valor_troco: 0 }
    ]);
    setValorRecebido(totalLiquido.toFixed(2));
    setModalCheckout(true);
  };

  const handleFinalizarVenda = async () => {
    setLoading(true);
    try {
      const payload = {
        deposito_id: depositoId,
        cliente_id: clienteId || null,
        desconto_geral: parseFloat(descontoGeral || 0),
        itens: carrinho.map(i => ({
          item_id: i.id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_unitario: i.desconto_unitario,
        })),
        pagamentos: pagamentosAdicionados,
      };

      const res = await api.post('/vendas/faturar', payload);
      setVendaFinalizada(res.data.data.pedido);
      setModalCheckout(false);
      setModalComprovante(true);
      setCarrinho([]);
      setDescontoGeral(0);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao processar venda no PDV.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col gap-4">
      {/* Topbar Operacional do PDV */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Frente de Caixa / PDV</h1>
            <p className="text-xs text-slate-400">Venda Balcão Direta com Baixa Atômica</p>
          </div>
        </div>

        {/* Seletores Rápidos de Caixa e Cliente */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <select
              value={depositoId}
              onChange={(e) => setDepositoId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              {depositos.map(d => (
                <option key={d.id} value={d.id}>Depósito: {d.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 sm:flex-initial">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="">Cliente: Consumidor Final</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome_razao_social}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3 rounded-xl flex items-center justify-between text-xs sm:text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Grid Principal do PDV */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Painel Esquerdo: Entrada de Produtos e Catálogo (7 Colunas) */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
          {/* Input com Foco no Leitor de Código de Barras */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
            <label className="block text-xs font-semibold text-indigo-400 mb-1.5 flex items-center gap-1.5">
              <Barcode className="h-4 w-4" />
              Leitor de Código de Barras / SKU / Busca Rápida (Pressione Enter)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Passe o código de barras ou digite o nome do produto..."
                value={buscaCodigo}
                onChange={(e) => setBuscaCodigo(e.target.value)}
                onKeyDown={handleAdicionarPorCodigo}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white font-mono placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>
          </div>

          {/* Grade Rápida de Produtos */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 overflow-y-auto min-h-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
              Itens Disponíveis para Venda
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {itensCatalogo.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => adicionarAoCarrinho(item)}
                  className="p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-600/50 rounded-xl text-left transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-400 line-clamp-2 transition leading-tight">
                      {item.nome}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      SKU: {item.codigo_sku || '-'}
                    </span>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Direito: Carrinho de Compras & Checkout (5 Colunas) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden shadow-lg min-h-0">
          {/* Cabeçalho do Carrinho */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-sm text-white">Itens da Venda ({carrinho.length})</span>
            </div>
            {carrinho.length > 0 && (
              <button
                type="button"
                onClick={() => setCarrinho([])}
                className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
              >
                Limpar Carrinho
              </button>
            )}
          </div>

          {/* Lista de Itens no Carrinho */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {carrinho.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-10">
                <ShoppingCart className="h-10 w-10 mb-2 stroke-1 text-slate-600" />
                Nenhum item adicionado ao carrinho
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{item.nome}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      R$ {item.preco_unitario.toFixed(2)} x {item.quantidade} = <strong className="text-emerald-400 font-bold">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item.id, -1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 font-mono font-bold text-xs text-white">{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => alterarQuantidade(item.id, 1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removerDoCarrinho(item.id)}
                      className="p-1 rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900 border border-rose-800 cursor-pointer ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé Consolidado de Totais e Fechamento */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Subtotal Itens:</span>
              <span className="font-mono font-semibold text-slate-200">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Desconto Geral (R$):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={descontoGeral}
                onChange={(e) => setDescontoGeral(e.target.value)}
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-right font-mono text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total a Pagar</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  R$ {totalLiquido.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                disabled={carrinho.length === 0}
                onClick={abrirCheckout}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition"
              >
                <span>Fechar Venda</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Checkout / Pagamento */}
      {modalCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  Finalização de Pagamento
                </h2>
                <p className="text-xs text-slate-400">Total Líquido: <strong className="text-emerald-400 font-mono">R$ {totalLiquido.toFixed(2)}</strong></p>
              </div>
              <button type="button" onClick={() => setModalCheckout(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Forma de Pagamento Principal</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'DINHEIRO', label: 'Dinheiro', icon: DollarSign },
                    { id: 'PIX', label: 'PIX', icon: QrCode },
                    { id: 'CARTAO_CREDITO', label: 'Cartão', icon: CreditCard },
                  ].map((fp) => {
                    const Icon = fp.icon;
                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => {
                          setFormaPagamento(fp.id);
                          setPagamentosAdicionados([
                            { forma_pagamento: fp.id, valor_pago: totalLiquido, valor_troco: 0 }
                          ]);
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition cursor-pointer ${
                          formaPagamento === fp.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {fp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Valor Recebido (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorRecebido}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setValorRecebido(e.target.value);
                        setPagamentosAdicionados([
                          { 
                            forma_pagamento: 'DINHEIRO', 
                            valor_pago: Math.max(val, totalLiquido), 
                            valor_troco: Math.max(0, val - totalLiquido) 
                          }
                        ]);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Troco Calculado</label>
                    <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono font-black text-sm">
                      R$ {trocoCalculado.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalCheckout(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalizarVenda}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Confirmar & Faturar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Comprovante Não Fiscal */}
      {modalComprovante && vendaFinalizada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto p-4 sm:p-6 space-y-4 text-xs font-mono">
            <div className="text-center border-b border-slate-800 pb-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-1.5" />
              <h2 className="text-base font-bold text-white font-sans">Venda Faturada com Sucesso!</h2>
              <p className="text-slate-400">Cupom de Venda Balcão #{vendaFinalizada.numero_pedido}</p>
            </div>

            <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Data:</span>
                <span className="text-slate-200">{new Date(vendaFinalizada.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cliente:</span>
                <span className="text-slate-200">{vendaFinalizada.cliente?.nome_razao_social || 'Consumidor Final'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Líquido:</span>
                <span className="text-emerald-400 font-bold">R$ {parseFloat(vendaFinalizada.valor_total_liquido).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalComprovante(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-sans cursor-pointer transition"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}