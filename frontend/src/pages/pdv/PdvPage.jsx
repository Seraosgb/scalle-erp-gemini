import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Scale, Printer, CreditCard, X, Search, Settings } from 'lucide-react';
import { useHardwareStore } from '../../store/useHardwareStore';
import { EscPosEncoder } from '../../utils/EscPosEncoder';
import { api } from '../../services/api';

export default function PdvPage() {
  const barcodeInputRef = useRef(null);
  const {
    pesoBalanca, balancaConectada, conectarBalanca, desconectarBalanca,
    impressoraConectada, conectarImpressora, imprimirCupom, config, toggleImpressaoAutomatica
  } = useHardwareStore();

  const [codigoBarras, setCodigoBarras] = useState('');
  const [carrinho, setCarrinho] = useState([]);
  const [modalPagamento, setModalPagamento] = useState(false);

  // Foco perpétuo no leitor de código de barras
  useEffect(() => {
    const keepFocus = setInterval(() => {
      if (!modalPagamento && barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 1000);
    return () => clearInterval(keepFocus);
  }, [modalPagamento]);

  // Captura de Atalhos Globais (F2, F3, F4)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        if (carrinho.length > 0) setModalPagamento(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setCarrinho([]); // Cancela venda
      }
      if (e.key === 'Escape') {
        setModalPagamento(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho]);

  // Processa o Código de Barras (Enter do Leitor USB)
  const processarCodigoBarras = async (e) => {
    e.preventDefault();
    if (!codigoBarras.trim()) return;

    // TODO: Num cenário real, faremos um api.get(`/itens/sku/${codigoBarras}`)
    // Mock Temporário para validar o fluxo
    const mockProduto = {
      id: crypto.randomUUID(),
      nome: codigoBarras === '2020' ? 'Picanha Bovina Resfriada' : `Produto SKU ${codigoBarras}`,
      preco_venda: codigoBarras === '2020' ? 89.90 : 15.50,
      unidade: codigoBarras === '2020' ? 'KG' : 'UN'
    };

    // Se a unidade for KG e a balança estiver conectada, injeta o peso real
    const quantidadeFinal = mockProduto.unidade === 'KG' && balancaConectada
      ? parseFloat(pesoBalanca)
      : 1.000;

    setCarrinho(prev => [...prev, {
      ...mockProduto,
      quantidade: quantidadeFinal,
      total: mockProduto.preco_venda * quantidadeFinal
    }]);

    setCodigoBarras('');
  };

  const totalVenda = carrinho.reduce((acc, item) => acc + item.total, 0);

  const finalizarVenda = async () => {
    // TODO: Num cenário real, fazemos um api.post('/vendas/faturar', payload)

    if (config.impressaoAutomatica && impressoraConectada) {
      const comandos = [
        EscPosEncoder.init(),
        EscPosEncoder.align(1),
        EscPosEncoder.bold(true),
        EscPosEncoder.text("SCALLE ERP - TICKET DE VENDA"),
        EscPosEncoder.bold(false),
        EscPosEncoder.text("--------------------------------\n"),
        EscPosEncoder.align(0),
      ];

      carrinho.forEach(item => {
        comandos.push(EscPosEncoder.text(`${item.quantidade}x ${item.nome.substring(0, 15)}... R$ ${item.total.toFixed(2)}`));
      });

      comandos.push(EscPosEncoder.text("--------------------------------\n"));
      comandos.push(EscPosEncoder.align(2));
      comandos.push(EscPosEncoder.bold(true));
      comandos.push(EscPosEncoder.text(`TOTAL: R$ ${totalVenda.toFixed(2)}\n`));
      comandos.push(EscPosEncoder.bold(false));
      comandos.push(EscPosEncoder.text("\n\n\n"));
      comandos.push(EscPosEncoder.cut());
      comandos.push(EscPosEncoder.openDrawer());

      await imprimirCupom(EscPosEncoder.build(comandos));
    } else if (!config.impressaoAutomatica && impressoraConectada) {
       // Se parametrizado para não imprimir automático, exibiria um modal aqui.
       alert("Venda finalizada. Impressão ignorada pelas configurações do Tenant.");
    }

    setCarrinho([]);
    setModalPagamento(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-200">
      {/* Coluna Esquerda: Carrinho e Input */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Input Leitor de Código de Barras Oculto/Focado */}
        <form onSubmit={processarCodigoBarras} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500" />
          <input
            ref={barcodeInputRef}
            type="text"
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
            placeholder="Passe o leitor de código de barras ou digite o SKU..."
            className="w-full pl-12 pr-4 py-4 bg-slate-900 border-2 border-indigo-500/50 rounded-2xl text-xl font-mono text-white focus:outline-none focus:border-indigo-400 shadow-lg shadow-indigo-900/20"
            autoFocus
          />
        </form>

        {/* Cupom Fiscal Visual */}
        <div className="flex-1 bg-slate-100 rounded-2xl p-6 overflow-y-auto shadow-inner border border-slate-300 relative">
          <div className="w-full max-w-lg mx-auto font-mono text-slate-800 text-sm">
            <div className="text-center border-b-2 border-dashed border-slate-400 pb-4 mb-4">
              <h2 className="font-bold text-lg">CUPOM DE VENDA</h2>
              <p className="text-xs">Operador: Caixa 01</p>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="pb-2">ITEM</th>
                  <th className="pb-2 text-right">QTD</th>
                  <th className="pb-2 text-right">VL.UN</th>
                  <th className="pb-2 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {carrinho.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200/50">
                    <td className="py-2 pr-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{item.nome}</td>
                    <td className="py-2 text-right">{item.quantidade} {item.unidade}</td>
                    <td className="py-2 text-right">{item.preco_venda.toFixed(2)}</td>
                    <td className="py-2 text-right font-bold">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {carrinho.length === 0 && (
              <div className="text-center py-20 text-slate-400 italic">Caixa Livre. Aguardando leitura de itens...</div>
            )}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Dashboard do Caixa & Hardware */}
      <div className="w-96 bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-400" /> PDV Balcão
          </h2>

          {/* Painel Hardware Global */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400 flex items-center gap-1.5"><Scale className="h-4 w-4"/> Balança:</span>
              {balancaConectada ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded cursor-pointer" onClick={desconectarBalanca}>Ativa</span>
              ) : (
                <button onClick={conectarBalanca} className="text-indigo-400 underline hover:text-indigo-300 cursor-pointer">Ligar</button>
              )}
            </div>

            {/* Visor Grande Balança */}
            <div className={`p-4 rounded-lg text-right font-mono text-4xl tabular-nums font-bold tracking-tight shadow-inner ${balancaConectada ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/50' : 'bg-slate-900 text-slate-600 border border-slate-800'}`}>
              {pesoBalanca} <span className="text-sm">KG</span>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
              <span className="font-bold text-slate-400 flex items-center gap-1.5"><Printer className="h-4 w-4"/> Impressora USB:</span>
              {impressoraConectada ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">Pronta</span>
              ) : (
                <button onClick={conectarImpressora} className="text-indigo-400 underline hover:text-indigo-300 cursor-pointer">Autorizar</button>
              )}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
               <span>Impressão Automática</span>
               <button onClick={toggleImpressaoAutomatica} className={`px-2 py-0.5 rounded ${config.impressaoAutomatica ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                 {config.impressaoAutomatica ? 'LIGADA' : 'DESLIGADA'}
               </button>
            </div>
          </div>
        </div>

        {/* Painel de Fechamento */}
        <div className="space-y-4">
          <div className="bg-slate-950 p-6 rounded-2xl border border-indigo-900/50 shadow-[0_0_15px_rgba(79,70,229,0.1)]">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
            <p className="text-5xl font-black text-emerald-400 tabular-nums tracking-tighter">
              R$ {totalVenda.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold font-mono">
             <button className="bg-slate-800 text-slate-400 py-3 rounded-xl border border-slate-700">F2 - BUSCAR</button>
             <button onClick={() => setCarrinho([])} className="bg-rose-950/50 text-rose-400 py-3 rounded-xl border border-rose-900/50 hover:bg-rose-900 cursor-pointer transition">F4 - CANCELAR</button>
          </div>

          <button
            onClick={() => setModalPagamento(true)}
            disabled={carrinho.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg cursor-pointer transition shadow-lg shadow-indigo-600/20"
          >
            <CreditCard className="h-6 w-6" />
            [F3] RECEBER VENDA
          </button>
        </div>
      </div>

      {/* Modal de Pagamento Rápido */}
      {modalPagamento && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Liquidar Venda</h2>

            <div className="text-center bg-slate-950 py-6 rounded-2xl border border-indigo-500/30">
              <span className="text-emerald-400 font-black text-5xl">R$ {totalVenda.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={finalizarVenda} className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex flex-col items-center gap-1 cursor-pointer transition">
                <span>DINHEIRO</span>
              </button>
              <button onClick={finalizarVenda} className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex flex-col items-center gap-1 cursor-pointer transition">
                <span>PIX / CARTÃO</span>
              </button>
            </div>

            <button onClick={() => setModalPagamento(false)} className="w-full py-3 text-slate-400 hover:text-white font-bold text-sm cursor-pointer mt-4">
              [ESC] Voltar ao Caixa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
