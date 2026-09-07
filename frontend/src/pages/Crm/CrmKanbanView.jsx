import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function CrmKanbanView() {
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [movingCardId, setMovingCardId] = useState(null);

  const carregarBoard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/crm/board');
      setBoardData(res.data.data);
    } catch (err) {
      console.error('Falha ao carregar CRM Board', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarBoard();
  }, []);

  const handleMoverEtapa = async (cardId, etapaDestinoId) => {
    try {
      setMovingCardId(cardId);
      await api.patch(`/crm/oportunidades/${cardId}/mover`, {
        etapa_id_destino: etapaDestinoId
      });
      await carregarBoard();
    } catch (err) {
      alert('Falha ao mover card de etapa.');
    } finally {
      setMovingCardId(null);
    }
  };

  const handleConverterOrcamento = async (cardId) => {
    if (!confirm('Deseja converter esta oportunidade em Orçamento comercial?')) return;
    try {
      const res = await api.post(`/crm/oportunidades/${cardId}/converter-orcamento`);
      alert(res.data.data.message);
      await carregarBoard();
    } catch (err) {
      alert('Erro na conversão: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Carregando Funil de Vendas...</div>;
  }

  const etapas = boardData?.pipeline?.etapas || [];

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400">
            {boardData?.pipeline?.nome || 'CRM — Funil de Vendas'}
          </h1>
          <p className="text-sm text-slate-400">Arraste e avance negociações até a conversão em pedido.</p>
        </div>
        <button
          onClick={carregarBoard}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-semibold rounded-lg border border-slate-700 transition"
        >
          Sincronizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
        {etapas.map((etapa) => (
          <div key={etapa.id} className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col max-h-[85vh]">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 rounded-t-xl">
              <span className="font-semibold text-sm text-slate-200">{etapa.nome}</span>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-indigo-300 font-mono">
                {etapa.oportunidades?.length || 0}
              </span>
            </div>

            <div className="p-3 flex flex-col gap-3 overflow-y-auto">
              {etapa.oportunidades?.map((card) => (
                <div
                  key={card.id}
                  className="bg-slate-800/90 border border-slate-700/60 rounded-lg p-3.5 shadow-sm hover:border-indigo-500/50 transition flex flex-col gap-2"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium text-slate-100">{card.titulo}</h3>
                    <span className="text-xs font-bold text-emerald-400">
                      R$ {Number(card.valor_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                    <span>👤 {card.nome_contato}</span>
                    {card.telefone_contato && <span>📞 {card.telefone_contato}</span>}
                  </div>

                  <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center gap-1">
                    <select
                      value={etapa.id}
                      disabled={movingCardId === card.id}
                      onChange={(e) => handleMoverEtapa(card.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      {etapas.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.nome}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleConverterOrcamento(card.id)}
                      title="Converter em Pedido de Venda"
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition"
                    >
                      Faturar ➔
                    </button>
                  </div>
                </div>
              ))}
              {(!etapa.oportunidades || etapa.oportunidades.length === 0) && (
                <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Nenhum card nesta etapa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
