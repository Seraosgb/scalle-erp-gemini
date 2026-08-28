import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  ShoppingCart, Plus, Trash2, CheckCircle2, AlertTriangle, 
  X, Search, DollarSign, CreditCard, QrCode, Banknote, 
  Receipt, ArrowRight, Printer, Package, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PdvPage() {
  const [itensCatalogo, setItensCatalogo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [saldosEstoque, setSaldosEstoque] = useState({});
  const [carrinho, setCarrinho] = useState([]);
  const [searchItem, setSearchItem] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [descontoGeral, setDescontoGeral] = useState('0');
  const [emitirCupom, setEmitirCupom] = useState(true);

  // Pagamento Múltiplo
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalComprovante, setModalComprovante] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [linhasPagamento, setLinhasPagamento] = useState([
    { forma_pagamento: 'DINHEIRO', valor_pago: '' }
  ]);
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
      if (deps.length > 0 && !depositoId) {
        setDepositoId(deps[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const carregarSaldosDoDeposito = async () => {
    if (!depositoId) return;
    try {
      const res = await api.get('/wms/saldos', { params: { deposito_id: depositoId } });
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
    carregarDados();
    if (inputBuscaRef.current) inputBuscaRef.current.focus();
  }, []);

  useEffect(() => {
    carregarSaldosDoDeposito();
  }, [depositoId]);

  const adicionarAoCarrinho = (item) => {
    const saldoAtual = saldosEstoque[item.id] || 0;
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
          saldo_disponivel: saldoAtual,
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

  const totalPagoDigitado = linhasPagamento.reduce((acc, l) => acc + (parseFloat(l.valor_pago) || 0), 0);
  const saldoRestante = Math.max(0, totalLiquido - totalPagoDigitado);
  const troco = Math.max(0, totalPagoDigitado - totalLiquido);

  const adicionarLinhaPagamento = () => {
    if (saldoRestante <= 0) return;
    setLinhasPagamento([...linhasPagamento, { forma_pagamento: 'PIX', valor_pago: saldoRestante.toFixed(2) }]);
  };

  const removerLinhaPagamento = (index) => {
    if (linhasPagamento.length === 1) return;
    setLinhasPagamento(linhasPagamento.filter((_, idx) => idx !== index));
  };

  const atualizarLinhaPagamento = (index, campo, valor) => {
    const novas = [...linhasPagamento];
    novas[index][campo] = valor;
    setLinhasPagamento(novas);
  };

  const handleAbrirPagamento = () => {
    setLinhasPagamento([{ forma_pagamento: 'DINHEIRO', valor_pago: totalLiquido.toFixed(2) }]);
    setModalPagamento(true);
  };

  const handleFinalizarVenda = async (e) => {
    e.preventDefault();
    if (carrinho.length === 0) return;
    if (totalPagoDigitado < totalLiquido) {
      alert(`O valor total pago (R$ ${totalPagoDigitado.toFixed(2)}) não pode ser inferior ao total da venda (R$ ${totalLiquido.toFixed(2)}).`);
      return;
    }

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
        pagamentos: linhasPagamento.map((l) => ({
          forma_pagamento: l.forma_pagamento,
          valor_pago: parseFloat(l.valor_pago) || 0,
          valor_troco: l.forma_pagamento === 'DINHEIRO' ? troco : 0,
        })),
      };

      const res = await api.post('/vendas/faturar', payload);
      setVendaFinalizada(res.data.data.pedido);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setCarrinho([]);
      setDescontoGeral('0');
      setModalPagamento(false);
      setModalComprovante(true);
      carregarSaldosDoDeposito();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-500" />
            Frente de Caixa (PDV Balcão)
          </h1>
          <span className="text-xs text-slate-400">Emissão rápida com saldo em estoque em tempo real</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app/vendas"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Layers className="h-4 w-4 text-indigo-400" /> Ver Orçamentos & Pedidos
          </Link>
          <select
            value={depositoId}
            onChange={(e) => setDepositoId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
          >
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
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

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Esquerda: Busca e Catálogo */}
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

          {searchItem && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 max-h-72 overflow-y-auto space-y-1 shadow-xl">
              {itensFiltrados.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">Nenhum item encontrado.</div>
              ) : (
                itensFiltrados.map((item) => {
                  const saldoEstoque = saldosEstoque[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => adicionarAoCarrinho(item)}
                      className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-white text-xs">{item.nome}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.codigo_sku} | Saldo: <strong className={saldoEstoque > 0 ? 'text-emerald-400' : 'text-rose-400'}>{saldoEstoque.toFixed(2)} {item.unidade_medida}</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400 font-mono text-sm">
                          R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                        </div>
                        <span className="text-[10px] text-indigo-400 font-bold">+ Adicionar</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Produtos em Destaque</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {itensCatalogo.slice(0, 6).map((item) => {
                const saldoEstoque = saldosEstoque[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => adicionarAoCarrinho(item)}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white line-clamp-2">{item.nome}</div>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Saldo: <strong className={saldoEstoque > 0 ? 'text-emerald-400' : 'text-rose-400'}>{saldoEstoque.toFixed(0)} {item.unidade_medida}</strong>
                      </span>
                    </div>
                    <div className="mt-2 font-mono font-bold text-emerald-400 text-sm">
                      R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Direita: Carrinho */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Itens do Pedido ({carrinho.length})</span>
              <button
                type="button"
                onClick={() => setCarrinho([])}
                className="text-[11px] text-rose-400 hover:underline cursor-pointer"
              >
                Limpar Carrinho
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-800/50">
              {carrinho.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">O carrinho está vazio.</div>
              ) : (
                carrinho.map((item) => (
                  <div key={item.item_id} className="pt-2 flex justify-between items-center text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-medium text-white truncate">{item.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        R$ {item.preco_unitario.toFixed(2)} / {item.unidade} (Disp: {item.saldo_disponivel})
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
              onClick={handleAbrirPagamento}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <DollarSign className="h-5 w-5" /> Fechar Venda (Pagamento Misto)
            </button>
          </div>
        </div>
      </div>

      {/* Modal Pagamento Múltiplo */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" /> Fechamento & Pagamento Misto
              </h3>
              <button type="button" onClick={() => setModalPagamento(false)} className="p-1"><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleFinalizarVenda} className="space-y-4 text-xs">
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

              {/* Linhas de Pagamento Misto */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Formas de Pagamento</span>
                  <button
                    type="button"
                    onClick={adicionarLinhaPagamento}
                    disabled={saldoRestante <= 0}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 disabled:text-slate-600 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Outra Forma
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {linhasPagamento.map((linha, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <select
                        value={linha.forma_pagamento}
                        onChange={(e) => atualizarLinhaPagamento(idx, 'forma_pagamento', e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-white text-xs font-semibold"
                      >
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="PIX">PIX Nativo</option>
                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Valor R$"
                        value={linha.valor_pago}
                        onChange={(e) => atualizarLinhaPagamento(idx, 'valor_pago', e.target.value)}
                        className="w-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-right text-emerald-400 font-mono font-bold text-xs"
                      />
                      {linhasPagamento.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerLinhaPagamento(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status de Cobertura e Troco */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Venda:</span>
                  <strong className="text-white">R$ {totalLiquido.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Informado:</span>
                  <strong className="text-indigo-400">R$ {totalPagoDigitado.toFixed(2)}</strong>
                </div>
                {saldoRestante > 0 ? (
                  <div className="flex justify-between text-rose-400 font-bold border-t border-slate-900 pt-1">
                    <span>Falta Pagar:</span>
                    <span>R$ {saldoRestante.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-amber-400 font-bold border-t border-slate-900 pt-1">
                    <span>Troco:</span>
                    <span>R$ {troco.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalPagamento(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || totalPagoDigitado < totalLiquido}
                  className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold"
                >
                  {loading ? 'Faturando...' : 'Finalizar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impressão Térmica de Cupom Não-Fiscal */}
      {modalComprovante && vendaFinalizada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-400" /> Cupom de Venda
              </h3>
              <button type="button" onClick={() => setModalComprovante(false)} className="p-1"><X className="h-4 w-4 text-slate-400" /></button>
            </div>

            <div id="cupom-termico" className="bg-white text-black p-4 rounded font-mono text-[11px] leading-tight space-y-2 select-text">
              <div className="text-center font-bold pb-2 border-b border-dashed border-black">
                <div>SCALLE ENTERPRISE</div>
                <div className="text-[9px] font-normal">COMPROVANTE DE VENDA NÃO FISCAL</div>
                <div className="text-[10px] mt-1">PEDIDO #{vendaFinalizada.numero_pedido}</div>
                <div className="text-[9px] font-normal">{new Date().toLocaleString('pt-BR')}</div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between font-bold border-b border-black pb-0.5 text-[10px]">
                  <span>ITEM / QTD</span>
                  <span>TOTAL</span>
                </div>
                {vendaFinalizada.itens?.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate pr-1">{it.item?.nome || 'Item'} x{parseFloat(it.quantidade).toFixed(0)}</span>
                    <span>R$ {parseFloat(it.valor_total_liquido).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-black pt-2 space-y-0.5 text-right font-bold">
                <div className="flex justify-between"><span>TOTAL LÍQUIDO:</span><span>R$ {parseFloat(vendaFinalizada.valor_total_liquido).toFixed(2)}</span></div>
              </div>

              <div className="text-center text-[9px] pt-2 border-t border-dashed border-black">
                Obrigado pela preferência!
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Imprimir Cupom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}