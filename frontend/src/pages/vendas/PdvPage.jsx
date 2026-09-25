import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingCart, Scale, Printer, CreditCard, X, Search,
  Trash2, Banknote, MonitorCheck, AlertCircle, SearchCode, CheckCircle2, Tag, Loader2
} from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { EscPosEncoder } from '../../utils/EscPosEncoder';
import { api } from '../../services/api';

// Função auxiliar para formatação de moeda BRL
const formatarMoeda = (valor) => {
  return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Função auxiliar para formatação de peso
const formatarPeso = (valor) => {
  return String(valor).replace('.', ',');
};

export default function PdvPage() {
  const barcodeInputRef = useRef(null);
  const paymentInputRef = useRef(null);
  const discountInputRef = useRef(null);

  // Hardware Global Store
  const {
    pesoBalanca, balancaConectada, conectarBalanca, desconectarBalanca,
    impressoraConectada, conectarImpressora, imprimirCupom, config
  } = useHardwareStore();

  // Estado do PDV e Integração DB
  const [depositos, setDepositos] = useState([]);
  const [depositoSelecionado, setDepositoSelecionado] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [carrinho, setCarrinho] = useState([]);
  const [buscandoItem, setBuscandoItem] = useState(false);
  const [processandoVenda, setProcessandoVenda] = useState(false);

  // Modais
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalDesconto, setModalDesconto] = useState(false);
  const [modalSucesso, setModalSucesso] = useState(false);

  // Estado Financeiro
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [descontoReal, setDescontoReal] = useState(0);
  const [valorDescontoTemp, setValorDescontoTemp] = useState('');

  // Valores Congelados para a Tela de Sucesso
  const [trocoFinal, setTrocoFinal] = useState(0);
  const [totalFinal, setTotalFinal] = useState(0);

  // Cálculos de Totais
  const subtotal = useMemo(() => carrinho.reduce((acc, item) => acc + item.total, 0), [carrinho]);
  const totalGeral = useMemo(() => Math.max(0, subtotal - descontoReal), [subtotal, descontoReal]);
  const valorFaltante = useMemo(() => Math.max(0, totalGeral - (parseFloat(valorRecebido.replace(',', '.')) || 0)), [totalGeral, valorRecebido]);
  const troco = useMemo(() => Math.max(0, (parseFloat(valorRecebido.replace(',', '.')) || 0) - totalGeral), [totalGeral, valorRecebido]);

  // Busca do Depósito Padrão ao abrir o PDV
  useEffect(() => {
    const carregarDepositos = async () => {
      try {
        const res = await api.get('/wms/depositos');
        const deps = res.data?.data || [];
        setDepositos(deps);
        const depPadrao = deps.find(d => d.is_padrao) || deps[0];
        if (depPadrao) setDepositoSelecionado(depPadrao.id);
      } catch (err) {
        console.error("Erro ao carregar depósitos:", err);
      }
    };
    carregarDepositos();
  }, []);

  // Foco Perpétuo
  useEffect(() => {
    const focusTimer = setInterval(() => {
      const isAnyModalOpen = modalPagamento || modalDesconto || modalSucesso;
      if (!isAnyModalOpen && !buscandoItem && !processandoVenda && barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 1500);
    return () => clearInterval(focusTimer);
  }, [modalPagamento, modalDesconto, modalSucesso, buscandoItem, processandoVenda]);

  useEffect(() => {
    if (modalPagamento && paymentInputRef.current) {
      setTimeout(() => paymentInputRef.current.focus(), 100);
    }
  }, [modalPagamento, formaPagamento]);

  useEffect(() => {
    if (modalDesconto && discountInputRef.current) {
      setTimeout(() => discountInputRef.current.focus(), 100);
    }
  }, [modalDesconto]);

  // Atalhos de Teclado Globais
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (modalSucesso && (e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        setModalSucesso(false);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (carrinho.length > 0 && !modalDesconto) setModalPagamento(true);
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (carrinho.length > 0 && !modalPagamento) setModalDesconto(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (!modalPagamento && !modalDesconto && window.confirm("Cancelar venda atual?")) {
          setCarrinho([]);
          setDescontoReal(0);
        }
      }
      if (e.key === 'Escape') {
        if (modalPagamento || modalDesconto) {
          setModalPagamento(false);
          setModalDesconto(false);
          setValorRecebido('');
          setValorDescontoTemp('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho, modalPagamento, modalDesconto, modalSucesso]);

  const processarCodigoBarras = async (e) => {
    e.preventDefault();
    const codigo = codigoBarras.trim();
    if (!codigo) return;

    setBuscandoItem(true);
    try {
      const res = await api.get('/itens', { params: { search: codigo } });
      const itensEncontrados = res.data?.data?.data || res.data?.data || [];

      const produtoReal = itensEncontrados.find(i =>
        i.codigo_sku === codigo || i.codigo_barras_ean === codigo
      );

      if (!produtoReal) {
        alert("Produto não encontrado no catálogo do ERP!");
        setCodigoBarras('');
        setBuscandoItem(false);
        return;
      }

      const isPesavel = produtoReal.unidade_medida === 'KG';
      const quantidadeFinal = isPesavel && balancaConectada ? parseFloat(pesoBalanca) : 1.000;

      if (quantidadeFinal <= 0) {
        alert("Atenção: O produto é vendido a KG. Coloque o item na balança antes de bipar o código.");
        setCodigoBarras('');
        setBuscandoItem(false);
        return;
      }

      setCarrinho(prev => [{
        id: produtoReal.id,
        nome: produtoReal.nome,
        codigo_sku: produtoReal.codigo_sku,
        unidade: produtoReal.unidade_medida,
        preco_venda: parseFloat(produtoReal.preco_venda),
        quantidade: quantidadeFinal,
        total: parseFloat(produtoReal.preco_venda) * quantidadeFinal
      }, ...prev]);

      setCodigoBarras('');
    } catch (err) {
      alert("Erro ao comunicar com o servidor: " + err.message);
    } finally {
      setBuscandoItem(false);
    }
  };

  const removerItem = (index) => {
    setCarrinho(prev => prev.filter((_, i) => i !== index));
    if (carrinho.length === 1) setDescontoReal(0);
  };

  const aplicarDesconto = (e) => {
    e.preventDefault();
    const descFormated = parseFloat(valorDescontoTemp.replace(',', '.')) || 0;

    if (descFormated > subtotal) {
      alert("O desconto não pode ser maior que o valor da venda!");
      return;
    }

    setDescontoReal(descFormated);
    setModalDesconto(false);
    setValorDescontoTemp('');
  };

  const finalizarVenda = async () => {
    if (valorFaltante > 0 && formaPagamento === 'DINHEIRO') {
      alert("Valor recebido é menor que o total da venda!");
      return;
    }

    if (!depositoSelecionado) {
      alert("Atenção: O sistema não encontrou um Depósito de Saída configurado. Contacte o Suporte.");
      return;
    }

    setProcessandoVenda(true);

    try {
      const valorDinheiro = parseFloat(valorRecebido.replace(',', '.')) || 0;
      const valorRecebidoFinal = formaPagamento === 'DINHEIRO' ? valorDinheiro : totalGeral;

      const payload = {
        deposito_id: depositoSelecionado,
        cliente_id: null,
        desconto_geral: descontoReal,
        itens: carrinho.map(item => ({
          item_id: item.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_venda,
          desconto_unitario: 0
        })),
        pagamentos: [{
          forma_pagamento: formaPagamento,
          valor_pago: valorRecebidoFinal,
          valor_troco: formaPagamento === 'DINHEIRO' ? troco : 0
        }],
        emitir_cupom_fiscal: false
      };

      const { data } = await api.post('/vendas/faturar', payload);
      const numPedido = data?.data?.pedido?.numero_pedido || 'N/D';

      setTrocoFinal(troco);
      setTotalFinal(totalGeral);

      if (impressoraConectada && config.impressaoAutomatica) {
        const comandos = [
          EscPosEncoder.init(),
          EscPosEncoder.align(1),
          EscPosEncoder.bold(true),
          EscPosEncoder.text("SCALLE ERP - CUPOM NAO FISCAL\n"),
          EscPosEncoder.bold(false),
          EscPosEncoder.text(`PEDIDO #${numPedido}\n`),
          EscPosEncoder.text("--------------------------------\n"),
          EscPosEncoder.align(0),
        ];

        carrinho.forEach(item => {
          comandos.push(EscPosEncoder.text(`${item.codigo_sku} - ${item.nome.substring(0, 18)}`));
          comandos.push(EscPosEncoder.text(`${formatarPeso(item.quantidade.toFixed(3))} ${item.unidade} x R$ ${formatarMoeda(item.preco_venda)} = R$ ${formatarMoeda(item.total)}\n`));
        });

        comandos.push(EscPosEncoder.text("--------------------------------\n"));
        if (descontoReal > 0) {
          comandos.push(EscPosEncoder.text(`SUBTOTAL: R$ ${formatarMoeda(subtotal)}\n`));
          comandos.push(EscPosEncoder.text(`DESCONTO: R$ ${formatarMoeda(descontoReal)}\n`));
        }

        comandos.push(EscPosEncoder.align(2));
        comandos.push(EscPosEncoder.bold(true));
        comandos.push(EscPosEncoder.text(`TOTAL: R$ ${formatarMoeda(totalGeral)}\n`));
        comandos.push(EscPosEncoder.bold(false));
        comandos.push(EscPosEncoder.text(`PAGO EM: ${formaPagamento}\n`));
        if (formaPagamento === 'DINHEIRO') {
           comandos.push(EscPosEncoder.text(`VALOR RECEBIDO: R$ ${formatarMoeda(valorRecebidoFinal)}\n`));
           comandos.push(EscPosEncoder.text(`TROCO: R$ ${formatarMoeda(troco)}\n`));
        }

        comandos.push(EscPosEncoder.align(1));
        comandos.push(EscPosEncoder.text("\nObrigado pela preferencia!\n"));
        comandos.push(EscPosEncoder.text("\n\n\n"));
        comandos.push(EscPosEncoder.cut());
        comandos.push(EscPosEncoder.openDrawer());

        await imprimirCupom(EscPosEncoder.build(comandos));
      }

      setCarrinho([]);
      setDescontoReal(0);
      setValorRecebido('');
      setModalPagamento(false);
      setModalSucesso(true);

    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      alert("Erro crítico ao faturar: " + msg);
    } finally {
      setProcessandoVenda(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* COLUNA ESQUERDA: LISTA DE PRODUTOS */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 border-r border-slate-800">
        <div className="flex justify-between items-end border-b border-slate-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-7 w-7 text-indigo-500" /> FRENTE DE CAIXA
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase">Caixa Livre • Op: Admin • Terminal 01</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={balancaConectada ? desconectarBalanca : conectarBalanca}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold uppercase transition cursor-pointer ${balancaConectada ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
            >
              <Scale className="h-3.5 w-3.5" /> {balancaConectada ? 'Balança ON' : 'Balança OFF'}
            </button>
            <button
              onClick={conectarImpressora}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold uppercase transition cursor-pointer ${impressoraConectada ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
            >
              <Printer className="h-3.5 w-3.5" /> {impressoraConectada ? 'Imp. Pronta' : 'Ligar Imp.'}
            </button>
          </div>
        </div>

        <form onSubmit={processarCodigoBarras} className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {buscandoItem ? <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" /> : <Search className="h-6 w-6 text-indigo-500" />}
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              disabled={buscandoItem || processandoVenda}
              placeholder="Código de Barras ou SKU [ENTER]"
              className="w-full pl-14 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner disabled:opacity-50"
            />
          </div>
        </form>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950 sticky top-0 z-10 shadow-sm border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Item</th>
                  <th className="py-3 px-4">Descrição do Produto</th>
                  <th className="py-3 px-4 text-right">Qtd</th>
                  <th className="py-3 px-4 text-right">Vl. Unit (R$)</th>
                  <th className="py-3 px-4 text-right">Total (R$)</th>
                  <th className="py-3 px-4 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {carrinho.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-slate-500 font-sans">
                      <div className="flex flex-col items-center justify-center">
                        <MonitorCheck className="h-12 w-12 text-slate-700 mb-3" />
                        <span className="text-lg font-bold text-slate-400">CAIXA ABERTO E LIVRE</span>
                        <span className="text-xs">Bipe o código de barras para iniciar a venda</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  carrinho.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition">
                      <td className="py-3 px-4 text-center text-slate-500">{carrinho.length - idx}</td>
                      <td className="py-3 px-4 font-bold text-white font-sans truncate max-w-[200px]">{item.nome}</td>
                      <td className="py-3 px-4 text-right text-indigo-400">{formatarPeso(item.quantidade.toFixed(3))} {item.unidade}</td>
                      <td className="py-3 px-4 text-right">{formatarMoeda(item.preco_venda)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatarMoeda(item.total)}</td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => removerItem(idx)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: VALORES E ATALHOS */}
      <div className="w-[400px] bg-slate-900 flex flex-col justify-between shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.3)] z-10 relative">
        <div className="p-6 space-y-6">

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Peso Balança</span>
              <span className={balancaConectada ? 'text-emerald-500' : 'text-rose-500'}>{balancaConectada ? 'ON' : 'OFF'}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-right shadow-inner">
              <span className="font-mono text-5xl font-black text-indigo-400 tracking-tighter">{formatarPeso(pesoBalanca)}</span>
              <span className="text-slate-500 ml-2 font-bold">KG</span>
            </div>
          </div>

          <hr className="border-slate-800" />

          <div className="space-y-3">
            <div className="flex justify-between items-center text-slate-400 font-mono">
              <span className="text-sm">Subtotal</span>
              <span className="text-lg">R$ {formatarMoeda(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-400 font-mono">
              <span className="text-sm">Desconto</span>
              <span className="text-lg">- R$ {formatarMoeda(descontoReal)}</span>
            </div>
            <div className="pt-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Total a Pagar</span>
              <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-right">
                <span className="font-mono text-6xl font-black text-emerald-400 tracking-tighter">
                  {formatarMoeda(totalGeral)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-950 border-t border-slate-800 grid grid-cols-3 gap-3">
          <button
            disabled={carrinho.length === 0 || processandoVenda}
            onClick={() => setModalPagamento(true)}
            className="col-span-3 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/20"
          >
            <Banknote className="h-6 w-6" /> [F3] RECEBER
          </button>

          <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center cursor-pointer hover:bg-slate-800 transition">
            <span className="block text-xs font-bold text-slate-400 mb-0.5">[F2]</span>
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Buscar</span>
          </div>

          <button
            disabled={carrinho.length === 0 || processandoVenda}
            onClick={() => setModalDesconto(true)}
            className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center cursor-pointer hover:bg-slate-800 transition disabled:opacity-50"
          >
            <span className="block text-xs font-bold text-indigo-400 mb-0.5">[F8]</span>
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Desconto</span>
          </button>

          <button
            disabled={carrinho.length === 0 || processandoVenda}
            onClick={() => { if(window.confirm("Cancelar venda?")) { setCarrinho([]); setDescontoReal(0); } }}
            className="bg-rose-950/30 border border-rose-900/50 p-2 rounded-lg text-center cursor-pointer hover:bg-rose-900/50 transition text-rose-400 disabled:opacity-50"
          >
            <span className="block text-xs font-bold mb-0.5">[F4]</span>
            <span className="text-[10px] uppercase font-semibold">Cancelar</span>
          </button>
        </div>
      </div>

      {/* MODAL DE DESCONTO */}
      {modalDesconto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center">
            <div className="p-3 bg-indigo-950/50 text-indigo-400 rounded-full mb-4">
              <Tag className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Aplicar Desconto</h2>
            <p className="text-xs text-slate-400 mb-6">Subtotal atual: R$ {formatarMoeda(subtotal)}</p>

            <form onSubmit={aplicarDesconto} className="w-full space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor (R$)</label>
                <input
                  ref={discountInputRef}
                  type="text"
                  required
                  value={valorDescontoTemp}
                  onChange={(e) => setValorDescontoTemp(e.target.value.replace(/[^0-9,]/g, ''))}
                  className="w-full bg-slate-950 border-2 border-indigo-500/50 rounded-xl p-3 text-xl font-mono text-white focus:outline-none focus:border-indigo-400 text-center"
                  placeholder="0,00"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalDesconto(false)} className="flex-1 py-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-sm transition cursor-pointer">
                  [ESC] Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PAGAMENTO TIER 1 */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl flex overflow-hidden min-h-[500px]">

            <div className="w-1/2 p-8 border-r border-slate-800 bg-slate-900">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Método de Pagamento</h2>
                <button disabled={processandoVenda} onClick={() => { setModalPagamento(false); setValorRecebido(''); }} className="p-2 text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"><X className="h-5 w-5"/></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                  { id: 'PIX', label: 'PIX', icon: SearchCode },
                  { id: 'DEBITO', label: 'Cartão Débito', icon: CreditCard },
                  { id: 'CREDITO', label: 'Cartão Crédito', icon: CreditCard }
                ].map(metodo => (
                  <button
                    key={metodo.id}
                    disabled={processandoVenda}
                    onClick={() => { setFormaPagamento(metodo.id); if(metodo.id !== 'DINHEIRO') setValorRecebido(formatarPeso(totalGeral.toFixed(2))); }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer disabled:opacity-50 ${formaPagamento === metodo.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    <metodo.icon className="h-6 w-6" />
                    <span className="text-xs font-bold uppercase">{metodo.label}</span>
                  </button>
                ))}
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Valor Recebido (R$)</label>
                  <input
                    ref={paymentInputRef}
                    type="text"
                    disabled={processandoVenda}
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value.replace(/[^0-9,]/g, ''))}
                    className="w-full bg-slate-950 border-2 border-indigo-500/50 rounded-xl p-4 text-2xl font-mono text-white focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                    placeholder="0,00"
                  />
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {[10, 20, 50, 100].map(val => (
                      <button disabled={processandoVenda} key={val} onClick={() => setValorRecebido(formatarPeso(val.toFixed(2)))} className="bg-slate-800 text-slate-300 py-2 rounded-lg font-mono font-bold text-sm hover:bg-slate-700 cursor-pointer border border-slate-700 disabled:opacity-50">
                        {val},00
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-1/2 p-8 bg-slate-950 flex flex-col justify-between relative">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Resumo da Operação</h3>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total a Pagar</span>
                  <span className="text-2xl font-black text-white font-mono">R$ {formatarMoeda(totalGeral)}</span>
                </div>

                {formaPagamento === 'DINHEIRO' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Faltante</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">R$ {formatarMoeda(valorFaltante)}</span>
                    </div>
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl flex justify-between items-center">
                      <span className="text-emerald-500 font-bold uppercase tracking-wider">Troco</span>
                      <span className="text-4xl font-black text-emerald-400 font-mono">R$ {formatarMoeda(troco)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3 pt-6">
                {(valorFaltante > 0 && formaPagamento === 'DINHEIRO') && (
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-950/30 p-3 rounded-lg border border-rose-900/50">
                    <AlertCircle className="h-4 w-4" /> Valor recebido insuficiente para finalizar a venda.
                  </div>
                )}

                <button
                  onClick={finalizarVenda}
                  disabled={(valorFaltante > 0 && formaPagamento === 'DINHEIRO') || processandoVenda}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xl py-5 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition flex items-center justify-center gap-2"
                >
                  {processandoVenda ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                  {processandoVenda ? 'A FATURAR NA HOSTOO...' : 'CONFIRMAR PAGAMENTO [ENTER]'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO E TROCO FINAL */}
      {modalSucesso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-emerald-950/50 text-emerald-400 rounded-full mb-6 ring-4 ring-emerald-900/30">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Venda Finalizada!</h2>

            {(!impressoraConectada || !config.impressaoAutomatica) && (
               <p className="text-xs text-amber-500 font-medium mb-6 bg-amber-950/30 px-3 py-1 rounded-full border border-amber-900/50">
                 (Sem impressão de talão físico)
               </p>
            )}

            <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-6 shadow-inner">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
              <p className="text-2xl font-bold text-slate-200 font-mono mb-4">R$ {formatarMoeda(totalFinal)}</p>

              <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-1">Troco a Devolver</p>
              <p className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">R$ {formatarMoeda(trocoFinal)}</p>
            </div>

            <button
              onClick={() => setModalSucesso(false)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              PRÓXIMO CLIENTE [ENTER]
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
