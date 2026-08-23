import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import ModalImportarXml from './ModalImportarXml';
import DrawerKardex from './DrawerKardex';
import { 
  Boxes, 
  Search, 
  UploadCloud, 
  Plus, 
  History, 
  Layers
} from 'lucide-react';

export default function WmsPage() {
  const [search, setSearch] = useState('');
  const [modalXmlAberto, setModalXmlAberto] = useState(false);
  const [itemKardex, setItemKardex] = useState(null);

  // Consulta de Itens e Estoque
  const { data: itensResponse, isLoading, refetch } = useQuery({
    queryKey: ['itens', search],
    queryFn: async () => {
      const res = await api.get('/itens', { params: { search } });
      return res.data;
    }
  });

  // Consulta de Depósitos Ativos
  const { data: depositosResponse } = useQuery({
    queryKey: ['wms-depositos'],
    queryFn: async () => {
      const res = await api.get('/wms/depositos');
      return res.data.data;
    }
  });

  const itens = itensResponse?.data || [];
  const depositos = depositosResponse || [];

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-indigo-400" />
            <span>Almoxarifado & WMS</span>
          </h1>
          <p className="text-sm text-slate-400">Controle de saldos fracionados, depósitos e movimentações</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalXmlAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Importar XML NF-e</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-500 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descrição, código SKU ou código de barras..."
          className="w-full bg-transparent border-none text-slate-200 placeholder-slate-500 focus:outline-none text-sm"
        />
      </div>

      {/* Tabela de Itens e Saldos */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Código / SKU</th>
              <th className="p-4">Descrição do Item</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 text-right">Preço Venda</th>
              <th className="p-4 text-right">Saldo Físico</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Carregando catálogo de estoque...</td>
              </tr>
            ) : itens.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">Nenhum item localizado no estoque.</td>
              </tr>
            ) : (
              itens.map((item) => {
                const totalSaldo = item.saldos_por_deposito?.reduce((acc, s) => acc + parseFloat(s.quantidade_saldo), 0) || 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-indigo-400">{item.codigo_sku}</td>
                    <td className="p-4 font-medium text-white">{item.nome}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.tipo_item}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-200">
                      R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-mono font-bold ${totalSaldo > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalSaldo.toFixed(2)} {item.unidade_medida}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setItemKardex(item)}
                        title="Visualizar Kardex"
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modais e Gavetas */}
      <ModalImportarXml
        isOpen={modalXmlAberto}
        onClose={() => setModalXmlAberto(false)}
        depositos={depositos}
        onSucesso={() => refetch()}
      />

      <DrawerKardex
        item={itemKardex}
        onClose={() => setItemKardex(null)}
      />
    </div>
  );
}