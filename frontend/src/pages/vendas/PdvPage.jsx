import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingCart, Plus, Trash2, CheckCircle2, AlertTriangle, 
  X, Search, DollarSign, CreditCard, QrCode, Banknote, 
  Receipt, ArrowRight, RefreshCw, UserCheck
} from 'lucide-react';

export default function PdvPage() {
  const [itensCatalogo, setItensCatalogo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [searchItem, setSearchItem] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [descontoGeral, setDescontoGeral] = useState('0');
  const [emitirCupom, setEmitirCupom] = useState(true);

  // Pagamento
  const [modalPagamento, setModalPagamento] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputBuscaRef = useRef(null);

  const carregarDados = async () => {
    try {
      const [resItens, resCli, resDeps] = await Promise.all([
        api.get('/itens').catch(() => ({ data: { data: [] } })),
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } }).catch(() => ({ data: { data: [] } })),
        api.get('/wms/depositos').catch(() => ({ data: { data: [] } })),
      ]);

      const rawItens = resItens.data?.data;
      setItensCatalogo(Array.isArray(rawItens) ? rawItens : (rawItens?.data || []));

      const rawCli = resCli.data?.data;
      setClientes(Array.isArray(rawCli) ? rawCli : (rawCli?.data || []));

      const deps = resDeps.data?.data || [];
      setDepositos(deps);
      if (deps.length > 0) setDepositoId(deps[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarDados();
    if (inputBuscaRef.current) inputBuscaRef.current.focus();
  }, []);

  const adicionarAoCarrinho = (item) => {
    setCarrinho((prev) => {
      const existente = prev.find((p) => p.item_id === item.id);
      if (existente) {
        return prev.map((p) =>
          p.item_id === item.id
            ? { ...p, quantidade: p.quantidade + 1, total: (p.quantidade + 1) * p.preco_unitario }
            : p
        );
      }
      return [
        ...prev,
        {
          item_id: item.id,
          nome: item.nome,
          sku: item.codigo_sku,
          unidade: item.unidade_medida,
          quantidade: 1,
          preco_unitario: parseFloat(item.preco_venda || 0),
          total: parseFloat(item.preco_venda || 0),
        },
      ];
    });
    setSearchItem('');
  };

  const atualizarQtd = (itemId, novaQtd) => {
    const qtd = parseFloat(novaQtd) || 0;
    if (qtd <= 0) {
      setCarrinho((prev) => prev.filter((i) => i.item_id !== itemId));
    } else {
      setCarrinho((prev) =>
        prev.map((i) => (i.item_id === itemId ? { ...i, quantidade: qtd, total: qtd * i.preco_unitario } : i))
      );
    }
  };

  const subtotal = carrinho.reduce((acc, i) => acc + i.total, 0);
  const desconto = parseFloat(descontoGeral) || 0;
  const totalLiquido = Math.max(0, subtotal - desconto);
  const troco = Math.max(0, (parseFloat(valorRecebido) || 0) - totalLiquido);

  const handleFinalizarVenda = async (e) => {
    e.preventDefault();
    if (carrinho.length === 0) return;

    setLoading(true);
    try {
      const payload = {
        deposito_id: depositoId,
        cliente_id: clienteId || null,
        desconto_geral: desconto,
        emitir_cupom_fiscal: emitirCupom,
        itens: carrinho.map((i) => ({
          item_id: i.item_id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
        })),
        pagamentos: [
          {
            forma_pagamento: formaPagamento,
            valor_pago: totalLiquido,
            valor_troco: troco,
          },
        ],
      };

      const res = await api.post('/vendas/faturar', payload);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setCarrinho([]);
      setDescontoGeral('0');
      setValorRecebido('');
      setModalPagamento(false);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao processar venda no PDV.' });
    } finally {
      setLoading(false);
    }
  };

  const itensFiltrados = searchItem
    ? itensCatalogo.filter(
        (i) =>
          i.nome.toLowerCase().includes(searchItem.toLowerCase()) ||
          (i.codigo_sku && i.codigo_sku.toLowerCase().includes(searchItem.toLowerCase())) ||
          (i.codigo_barras_ean && i.codigo_barras_ean.includes(searchItem))
      )
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto text-slate-200">
      {/* Header PDV */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-500" />
            PDV Balcão (Frente de Caixa)
          </h1>
          <span className="text-xs text-slate-400">Emissão ágil com baixa atômica e cupom NFC-e</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={depositoId}
            onChange={(e) => setDepositoId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
          >
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Grid Principal: Busca/Catálogo à esquerda e Carrinho/Totais à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Esquerda: Busca de Itens */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={inputBuscaRef}
              type="text"
              placeholder="Escanear Código de Barras (EAN), SKU ou Nome..."
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Lista de Resultados da Busca */}
          {searchItem && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 max-h-72 overflow-y-auto space-y-1 shadow-xl">
              {itensFiltrados.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">Nenhum item encontrado.</div>
              ) : (
                itensFiltrados.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => adicionarAoCarrinho(item)}
                    className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-white text-xs">{item.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {item.codigo_sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400 font-mono text-sm">
                        R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold">+ Adicionar</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Grade de Itens Frequentes / Catálogo Rápido */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Produtos em Destaque</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {itensCatalogo.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => adicionarAoCarrinho(item)}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="text-xs font-semibold text-white line-clamp-2">{item.nome}</div>
                  <div className="mt-2 font-mono font-bold text-emerald-400 text-sm">
                    R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Direita: Carrinho e Totais */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Itens do Pedido ({carrinho.length})</span>
              <button
                type="button"
                onClick={() => setCarrinho([])}
                className="text-[11px] text-rose-400 hover:underline cursor-pointer"
              >
                Limpar Tudo
              </button>
            </div>

            {/* Tabela do Carrinho */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-800/50">
              {carrinho.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">O carrinho está vazio.</div>
              ) : (
                carrinho.map((item) => (
                  <div key={item.item_id} className="pt-2 flex justify-between items-center text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-medium text-white truncate">{item.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        R$ {item.preco_unitario.toFixed(2)} / {item.unidade}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => atualizarQtd(item.item_id, e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-center text-white font-mono"
                      />
                      <span className="font-mono font-bold text-white w-16 text-right">
                        R$ {item.total.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => atualizarQtd(item.item_id, 0)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totais e Botão de Pagamento */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Desconto Geral (R$):</span>
              <input
                type="number"
                min="0"
                value={descontoGeral}
                onChange={(e) => setDescontoGeral(e.target.value)}
                className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-right text-white font-mono text-xs"
              />
            </div>
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
              <span className="text-sm font-bold text-white">TOTAL A PAGAR:</span>
              <span className="text-xl font-black font-mono text-emerald-400">
                R$ {totalLiquido.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              disabled={carrinho.length === 0}
              onClick={() => {
                setValorRecebido(totalLiquido.toString());
                setModalPagamento(true);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <DollarSign className="h-5 w-5" /> Fechar Venda (F2)
            </button>
          </div>
        </div>
      </div>

      {/* Modal Fechamento de Pagamento */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" /> Fechamento de Venda
              </h3>
              <button type="button" onClick={() => setModalPagamento(false)} className="p-1"><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleFinalizarVenda} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Cliente (Opcional)</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">Consumidor Final (Não Identificado)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_razao_social} ({c.cpf_cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Forma de Pagamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  {['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'].map((fp) => (
                    <button
                      key={fp}
                      type="button"
                      onClick={() => setFormaPagamento(fp)}
                      className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                        formaPagamento === fp
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {fp === 'DINHEIRO' && <Banknote className="h-4 w-4" />}
                      {fp === 'PIX' && <QrCode className="h-4 w-4" />}
                      {fp.includes('CARTAO') && <CreditCard className="h-4 w-4" />}
                      {fp.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Valor Entregue (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1">Troco a Devolver</span>
                    <span className="font-mono font-black text-amber-400 text-base block mt-1">
                      R$ {troco.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cupom"
                  checked={emitirCupom}
                  onChange={(e) => setEmitirCupom(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                />
                <label htmlFor="cupom" className="text-slate-300 font-medium">Emitir Cupom Fiscal NFC-e automaticamente</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalPagamento(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {loading ? 'Faturando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}