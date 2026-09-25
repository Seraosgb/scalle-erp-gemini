import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShoppingCart, Scale, Printer, CreditCard, X, Search,
  Trash2, Keyboard, Banknote, MonitorCheck, PlusCircle, AlertCircle
} from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { EscPosEncoder } from '../../utils/EscPosEncoder';
import { api } from '../../services/api';

export default function PdvPage() {
  const barcodeInputRef = useRef(null);
  const paymentInputRef = useRef(null);

  // Hardware Global Store
  const {
    pesoBalanca, balancaConectada, conectarBalanca, desconectarBalanca,
    impressoraConectada, conectarImpressora, imprimirCupom, config
  } = useHardwareStore();

  // Estado do PDV
  const [codigoBarras, setCodigoBarras] = useState('');
  const [carrinho, setCarrinho] = useState([]);
  const [modalPagamento, setModalPagamento] = useState(false);

  // Estado do Pagamento
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [valorRecebido, setValorRecebido] = useState('');
  const [descontoReal, setDescontoReal] = useState(0);

  // Cálculos de Totais
  const subtotal = useMemo(() => carrinho.reduce((acc, item) => acc + item.total, 0), [carrinho]);
  const totalGeral = useMemo(() => Math.max(0, subtotal - descontoReal), [subtotal, descontoReal]);
  const valorFaltante = useMemo(() => Math.max(0, totalGeral - (parseFloat(valorRecebido) || 0)), [totalGeral, valorRecebido]);
  const troco = useMemo(() => Math.max(0, (parseFloat(valorRecebido) || 0) - totalGeral), [totalGeral, valorRecebido]);

  // Foco Perpétuo
  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (!modalPagamento && barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 1500);
    return () => clearInterval(focusTimer);
  }, [modalPagamento]);

  useEffect(() => {
    if (modalPagamento && paymentInputRef.current) {
      setTimeout(() => paymentInputRef.current.focus(), 100);
    }
  }, [modalPagamento, formaPagamento]);

  // Atalhos de Teclado Globais
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        if (carrinho.length > 0) setModalPagamento(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (window.confirm("Cancelar venda atual?")) {
          setCarrinho([]);
          setDescontoReal(0);
          setModalPagamento(false);
        }
      }
      if (e.key === 'Escape') {
        setModalPagamento(false);
        setValorRecebido('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho]);

  const processarCodigoBarras = async (e) => {
    e.preventDefault();
    if (!codigoBarras.trim()) return;

    // TODO: Integração real API -> const { data } = await api.get(`/itens/sku/${codigoBarras}`);
    const isPesavel = codigoBarras === '2020'; // Simulando código de Picanha
    const mockProduto = {
      id: crypto.randomUUID(),
      nome: isPesavel ? 'Picanha Bovina Resfriada' : `Item Cod. ${codigoBarras}`,
      preco_venda: isPesavel ? 89.90 : 15.50,
      unidade: isPesavel ? 'KG' : 'UN',
      codigo_sku: codigoBarras
    };

    const quantidadeFinal = isPesavel && balancaConectada ? parseFloat(pesoBalanca) : 1.000;

    if (quantidadeFinal <= 0) {
      alert("Atenção: Coloque o produto na balança antes de bipar o código.");
      setCodigoBarras('');
      return;
    }

    setCarrinho(prev => [{
      ...mockProduto,
      quantidade: quantidadeFinal,
      total: mockProduto.preco_venda * quantidadeFinal
    }, ...prev]); // Adiciona no topo da lista (Tier 1 behavior)

    setCodigoBarras('');
  };

  const removerItem = (index) => {
    setCarrinho(prev => prev.filter((_, i) => i !== index));
  };

  const finalizarVenda = async () => {
    if (valorFaltante > 0 && formaPagamento === 'DINHEIRO') {
      alert("Valor recebido é menor que o total da venda!");
      return;
    }

    // TODO: Integração real API -> await api.post('/vendas/pdv', payload);

    if (impressoraConectada) {
      const comandos = [
        EscPosEncoder.init(),
        EscPosEncoder.align(1),
        EscPosEncoder.bold(true),
        EscPosEncoder.text("SCALLE ERP - CUPOM NAO FISCAL\n"),
        EscPosEncoder.bold(false),
        EscPosEncoder.text("--------------------------------\n"),
        EscPosEncoder.align(0),
      ];

      carrinho.forEach(item => {
        comandos.push(EscPosEncoder.text(`${item.codigo_sku} - ${item.nome.substring(0, 18)}`));
        comandos.push(EscPosEncoder.text(`${item.quantidade.toFixed(3)} ${item.unidade} x R$ ${item.preco_venda.toFixed(2)} = R$ ${item.total.toFixed(2)}\n`));
      });

      comandos.push(EscPosEncoder.text("--------------------------------\n"));
      if (descontoReal > 0) {
        comandos.push(EscPosEncoder.text(`SUBTOTAL: R$ ${subtotal.toFixed(2)}\n`));
        comandos.push(EscPosEncoder.text(`DESCONTO: R$ ${descontoReal.toFixed(2)}\n`));
      }

      comandos.push(EscPosEncoder.align(2));
      comandos.push(EscPosEncoder.bold(true));
      comandos.push(EscPosEncoder.text(`TOTAL: R$ ${totalGeral.toFixed(2)}\n`));
      comandos.push(EscPosEncoder.bold(false));
      comandos.push(EscPosEncoder.text(`PAGO EM: ${formaPagamento}\n`));
      if (formaPagamento === 'DINHEIRO') {
         comandos.push(EscPosEncoder.text(`VALOR RECEBIDO: R$ ${parseFloat(valorRecebido).toFixed(2)}\n`));
         comandos.push(EscPosEncoder.text(`TROCO: R$ ${troco.toFixed(2)}\n`));
      }

      comandos.push(EscPosEncoder.align(1));
      comandos.push(EscPosEncoder.text("\nObrigado pela preferencia!\n"));
      comandos.push(EscPosEncoder.text("\n\n\n"));
      comandos.push(EscPosEncoder.cut());
      comandos.push(EscPosEncoder.openDrawer());

      await imprimirCupom(EscPosEncoder.build(comandos));
    }

    // Reset PDV
    setCarrinho([]);
    setDescontoReal(0);
    setValorRecebido('');
    setModalPagamento(false);
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

          {/* Status Hardware Badges */}
          <div className="flex gap-2">
            <button
              onClick={conectado ? desconectarBalanca : conectarBalanca}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold uppercase transition cursor-pointer ${conectado ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
            >
              <Scale className="h-3.5 w-3.5" /> {conectado ? 'Balança ON' : 'Balança OFF'}
            </button>
            <button
              onClick={conectarImpressora}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold uppercase transition cursor-pointer ${impressoraConectada ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}`}
            >
              <Printer className="h-3.5 w-3.5" /> {impressoraConectada ? 'Imp. Pronta' : 'Ligar Imp.'}
            </button>
          </div>
        </div>

        {/* Input Leitor de Barras */}
        <form onSubmit={processarCodigoBarras} className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-indigo-500" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              placeholder="Código de Barras ou SKU [ENTER]"
              className="w-full pl-14 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-xl font-mono text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
            />
          </div>
        </form>

        {/* Cupom Table */}
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
                      <td className="py-3 px-4 text-right text-indigo-400">{item.quantidade.toFixed(3)} {item.unidade}</td>
                      <td className="py-3 px-4 text-right">{item.preco_venda.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{item.total.toFixed(2)}</td>
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

          {/* Visor da Balança (Huge) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Peso Balança</span>
              <span className={conectado ? 'text-emerald-500' : 'text-rose-500'}>{conectado ? 'ON' : 'OFF'}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-right shadow-inner">
              <span className="font-mono text-5xl font-black text-indigo-400 tracking-tighter">{pesoBalanca}</span>
              <span className="text-slate-500 ml-2 font-bold">KG</span>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Resumo Financeiro */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-slate-400 font-mono">
              <span className="text-sm">Subtotal</span>
              <span className="text-lg">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-400 font-mono">
              <span className="text-sm">Desconto</span>
              <span className="text-lg">- R$ {descontoReal.toFixed(2)}</span>
            </div>
            <div className="pt-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Total a Pagar</span>
              <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl text-right">
                <span className="font-mono text-6xl font-black text-emerald-400 tracking-tighter">
                  {totalGeral.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Atalhos de Teclado Footer */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 grid grid-cols-2 gap-3">
          <button
            disabled={carrinho.length === 0}
            onClick={() => setModalPagamento(true)}
            className="col-span-2 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/20"
          >
            <Banknote className="h-6 w-6" /> [F3] RECEBER
          </button>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-center cursor-pointer hover:bg-slate-800 transition">
            <span className="block text-xs font-bold text-slate-400 mb-0.5">[F2]</span>
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Buscar Item</span>
          </div>
          <button
            onClick={() => { if(window.confirm("Cancelar venda?")) setCarrinho([]); }}
            className="bg-rose-950/30 border border-rose-900/50 p-3 rounded-lg text-center cursor-pointer hover:bg-rose-900/50 transition text-rose-400"
          >
            <span className="block text-xs font-bold mb-0.5">[F4]</span>
            <span className="text-[10px] uppercase font-semibold">Cancelar Venda</span>
          </button>
        </div>
      </div>

      {/* MODAL DE PAGAMENTO TIER 1 */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl flex overflow-hidden min-h-[500px]">

            {/* Lado Esquerdo Modal: Formas de Pagamento */}
            <div className="w-1/2 p-8 border-r border-slate-800 bg-slate-900">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Método de Pagamento</h2>
                <button onClick={() => setModalPagamento(false)} className="p-2 text-slate-400 hover:text-white cursor-pointer"><X className="h-5 w-5"/></button>
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
                    onClick={() => { setFormaPagamento(metodo.id); if(metodo.id !== 'DINHEIRO') setValorRecebido(totalGeral.toFixed(2)); }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer ${formaPagamento === metodo.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
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
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorRecebido}
                    onChange={(e) => setValorRecebido(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-indigo-500/50 rounded-xl p-4 text-2xl font-mono text-white focus:outline-none focus:border-indigo-400"
                    placeholder="0.00"
                  />
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {[10, 20, 50, 100].map(val => (
                      <button key={val} onClick={() => setValorRecebido(val.toFixed(2))} className="bg-slate-800 text-slate-300 py-2 rounded-lg font-mono font-bold text-sm hover:bg-slate-700 cursor-pointer border border-slate-700">
                        {val},00
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lado Direito Modal: Resumo Fechamento */}
            <div className="w-1/2 p-8 bg-slate-950 flex flex-col justify-between relative">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Resumo da Operação</h3>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total a Pagar</span>
                  <span className="text-2xl font-black text-white font-mono">R$ {totalGeral.toFixed(2)}</span>
                </div>

                {formaPagamento === 'DINHEIRO' && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Faltante</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">R$ {valorFaltante.toFixed(2)}</span>
                    </div>
                    <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl flex justify-between items-center">
                      <span className="text-emerald-500 font-bold uppercase tracking-wider">Troco</span>
                      <span className="text-4xl font-black text-emerald-400 font-mono">R$ {troco.toFixed(2)}</span>
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
                  disabled={valorFaltante > 0 && formaPagamento === 'DINHEIRO'}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xl py-5 rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-6 w-6" /> CONFIRMAR PAGAMENTO [ENTER]
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
