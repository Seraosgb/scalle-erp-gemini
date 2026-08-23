import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { usePdvStore } from '../../store/usePdvStore';
import ModalPagamentoPdv from './ModalPagamentoPdv';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Barcode, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function PdvPage() {
  const [buscaItem, setBuscaItem] = useState('');
  const [modalPagamento, setModalPagamento] = useState(false);
  const [loadingFatura, setLoadingFatura] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');
  const inputBuscaRef = useRef(null);

  const { 
    carrinho, 
    adicionarItem, 
    removerItem, 
    limparCarrinho, 
    depositoId, 
    setDepositoId, 
    descontoGeral, 
    setDescontoGeral,
    getSubtotal, 
    getTotalLiquido,
    formaPagamento,
    valorRecebido,
    getTroco
  } = usePdvStore();

  // Consultar Depósitos
  const { data: depositos } = useQuery({
    queryKey: ['wms-depositos'],
    queryFn: async () => {
      const res = await api.get('/wms/depositos');
      return res.data.data;
    }
  });

  // Autoselecionar primeiro depósito
  useEffect(() => {
    if (depositos?.length && !depositoId) {
      setDepositoId(depositos[0].id);
    }
  }, [depositos, depositoId, setDepositoId]);

  // Consultar Itens conforme digitação
  const { data: itensFiltrados } = useQuery({
    queryKey: ['itens-pdv', buscaItem],
    queryFn: async () => {
      if (!buscaItem || buscaItem.length < 2) return [];
      const res = await api.get('/itens', { params: { search: buscaItem } });
      return res.data.data;
    },
    enabled: buscaItem.length >= 2
  });

  // Atalhos Globais de Teclado (F2 = Buscar, F4 = Pagamento, F8 = Limpar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        inputBuscaRef.current?.focus();
      } else if (e.key === 'F4' && carrinho.length > 0) {
        e.preventDefault();
        setModalPagamento(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        limparCarrinho();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho, limparCarrinho]);

  const handleFaturar = async () => {
    setLoadingFatura(true);
    setMensagemErro('');

    const payload = {
      deposito_id: depositoId,
      desconto_geral: descontoGeral,
      itens: carrinho.map((i) => ({
        item_id: i.item_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        desconto_unitario: 0,
      })),
      pagamentos: [
        {
          forma_pagamento: formaPagamento,
          valor_pago: getTotalLiquido(),
          valor_troco: getTroco(),
        }
      ]
    };

    try {
      const res = await api.post('/vendas/faturar', payload);
      setMensagemSucesso('Venda faturada e estoque baixado!');
      limparCarrinho();
      setModalPagamento(false);
      setTimeout(() => setMensagemSucesso(''), 3000);
    } catch (err) {
      setMensagemErro(err.response?.data?.error?.message || 'Falha ao concluir venda.');
    } finally {
      setLoadingFatura(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner com Depósito e Mensagens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">PDV Frente de Caixa</h1>
            <p className="text-xs text-slate-400 font-mono">Atalhos: [F2] Buscar | [F4] Pagar | [F8] Cancelar</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-semibold uppercase">Depósito de Saída:</label>
          <select
            value={depositoId}
            onChange={(e) => setDepositoId(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          >
            {depositos?.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* Grid Principal: Busca + Carrinho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Busca e Seleção de Itens */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputBuscaRef}
              type="text"
              value={buscaItem}
              onChange={(e) => setBuscaItem(e.target.value)}
              placeholder="Pressione [F2] e digite o nome, SKU ou passe o código de barras..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 shadow-xl"
            />
          </div>

          {/* Lista de Resultados Rápidos */}
          {itensFiltrados && itensFiltrados.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 space-y-1 max-h-96 overflow-y-auto shadow-2xl">
              {itensFiltrados.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    adicionarItem(item);
                    setBuscaItem('');
                  }}
                  className="p-3.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.nome}</p>
                    <p className="text-xs text-indigo-400 font-mono">SKU: {item.codigo_sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-white">R$ {parseFloat(item.preco_venda).toFixed(2)}</p>
                    <span className="text-xs text-slate-500">{item.unidade_medida}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Carrinho e Totais */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-[calc(100vh-280px)] shadow-2xl">
          <div className="overflow-y-auto space-y-3 pr-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Itens da Cesta ({carrinho.length})
            </h3>

            {carrinho.length === 0 ? (
              <div className="text-center py-20 text-slate-600 text-sm">
                Nenhum produto adicionado. Pressione [F2] para buscar.
              </div>
            ) : (
              carrinho.map((item) => (
                <div key={item.item_id} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-sm font-semibold text-white truncate">{item.nome}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {item.quantidade} x R$ {item.preco_unitario.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-mono font-bold text-indigo-400">
                      R$ {item.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removerItem(item.item_id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé do Carrinho com Totais e Ação */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-200">R$ {getSubtotal().toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xl font-bold text-white">
              <span>Total Líquido:</span>
              <span className="font-mono text-2xl text-emerald-400">R$ {getTotalLiquido().toFixed(2)}</span>
            </div>

            <button
              disabled={carrinho.length === 0}
              onClick={() => setModalPagamento(true)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 text-base transition-all cursor-pointer"
            >
              Faturar Venda [F4]
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Finalização */}
      <ModalPagamentoPdv
        isOpen={modalPagamento}
        onClose={() => setModalPagamento(false)}
        onConfirmar={handleFaturar}
        loading={loadingFatura}
      />
    </div>
  );
}