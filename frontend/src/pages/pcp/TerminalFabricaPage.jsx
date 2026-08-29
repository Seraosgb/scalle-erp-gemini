import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  Factory, Search, CheckCircle2, Play, AlertOctagon, 
  BarChart2, Clock, Check, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TerminalFabricaPage() {
  const [ops, setOps] = useState([]);
  const [opSelecionada, setOpSelecionada] = useState(null);
  const [busca, setBusca] = useState('');
  const [qtdProduzida, setQtdProduzida] = useState('');
  const [qtdRefugo, setQtdRefugo] = useState('0');
  const [horasMod, setHorasMod] = useState('1.0');
  const [horasCif, setHorasCif] = useState('1.0');
  const [genealogia, setGenealogia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const inputBuscaRef = useRef(null);

  useEffect(() => {
    carregarOps();
    inputBuscaRef.current?.focus();
  }, []);

  const carregarOps = async () => {
    try {
      const res = await api.get('/pcp/ordens', { params: { status: 'EM_PRODUCAO' } });
      const raw = res.data?.data || res.data || [];
      const lista = Array.isArray(raw) ? raw : (raw.data || []);
      setOps(lista);
      if (lista.length > 0 && !opSelecionada) {
        selecionarOp(lista[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selecionarOp = async (op) => {
    setOpSelecionada(op);
    setQtdProduzida(Math.max(1, parseFloat(op.quantidade_planejada) - parseFloat(op.quantidade_produzida)).toString());
    try {
      const res = await api.get(`/pcp/ordens/${op.id}/genealogia`);
      setGenealogia(res.data?.data || []);
    } catch (e) {
      setGenealogia([]);
    }
  };

  const handleApontar = async (e) => {
    e.preventDefault();
    if (!opSelecionada) return;

    setLoading(true);
    try {
      await api.post(`/pcp/ordens/${opSelecionada.id}/apontar`, {
        quantidade_produzida: parseFloat(qtdProduzida) || 0,
        quantidade_refugo: parseFloat(qtdRefugo) || 0,
        horas_mod: parseFloat(horasMod) || 0,
        custo_hora_mod: 45.00,
        horas_cif: parseFloat(horasCif) || 0,
        custo_hora_cif: 25.00,
        observacoes: 'Apontamento via Terminal Touch Chão de Fábrica'
      });

      setFeedback({ tipo: 'sucesso', msg: `Apontamento de ${qtdProduzida} UN registrado com sucesso!` });
      setQtdRefugo('0');
      carregarOps();
      const resOp = await api.get(`/pcp/ordens/${opSelecionada.id}`);
      selecionarOp(resOp.data?.data);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao registrar apontamento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto text-slate-200">
      {/* Header Chão de Fábrica */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Factory className="h-6 w-6 text-indigo-400" />
            Terminal de Chão de Fábrica (PCP Touch)
          </h1>
          <p className="text-xs text-slate-400">Apontamento em tempo real, controle de OEE e rastreabilidade de lote</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/app/pcp"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Layers className="h-4 w-4 text-indigo-400" /> Painel de OPs
          </Link>
          <button
            type="button"
            onClick={carregarOps}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center gap-2 text-xs ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coluna Esquerda: Fila de OPs em Produção */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fila de OPs Ativas</span>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {ops.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 text-center text-slate-500 rounded-2xl text-xs">
                Nenhuma OP com status EM_PRODUCAO no momento.
              </div>
            ) : (
              ops.map((op) => {
                const isSelected = opSelecionada?.id === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => selecionarOp(op)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono font-bold text-white text-sm">OP #{op.numero_op}</span>
                        <h3 className="text-xs font-semibold text-slate-200 line-clamp-1 mt-0.5">{op.produto?.nome}</h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-indigo-300 border border-slate-800">
                        OEE: {op.oee_percentual || 100}%
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                      <span>Produzido: <strong className="text-emerald-400">{parseFloat(op.quantidade_produzida).toFixed(0)}</strong> / {parseFloat(op.quantidade_planejada).toFixed(0)}</span>
                      <span>Lote: {op.lote_produzido || 'A Gerar'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Painel de Apontamento e Rastreabilidade */}
        <div className="lg:col-span-8 space-y-4">
          {opSelecionada ? (
            <>
              {/* Card de Informações da OP Ativa */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-indigo-400 font-mono font-bold">OP #{opSelecionada.numero_op} • {opSelecionada.produto?.codigo_sku}</span>
                    <h2 className="text-base font-bold text-white">{opSelecionada.produto?.nome}</h2>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">OEE Apurado</span>
                      <strong className="text-indigo-400 font-mono text-sm">{opSelecionada.oee_percentual || 100}%</strong>
                    </div>
                  </div>
                </div>

                {/* Formulário de Apontamento Chão de Fábrica */}
                <form onSubmit={handleApontar} className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <label className="block text-slate-400 font-semibold mb-1">Qtd Produzida (Boas) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={qtdProduzida}
                      onChange={(e) => setQtdProduzida(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold text-base text-center"
                    />
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <label className="block text-slate-400 font-semibold mb-1">Refugo / Sucata</label>
                    <input
                      type="number"
                      step="0.01"
                      value={qtdRefugo}
                      onChange={(e) => setQtdRefugo(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-rose-400 font-mono font-bold text-base text-center"
                    />
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <label className="block text-slate-400 font-semibold mb-1">Horas MOD (Homem)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={horasMod}
                      onChange={(e) => setHorasMod(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-base text-center"
                    />
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <label className="block text-slate-400 font-semibold mb-1">Horas CIF (Máquina)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={horasCif}
                      onChange={(e) => setHorasCif(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-base text-center"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-4 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition"
                    >
                      <Play className="h-5 w-5 fill-current" />
                      {loading ? 'Processando Baixas e Apontamento...' : 'Registrar Apontamento de Chão de Fábrica'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Rastreabilidade e Genealogia de Lotes */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Genealogia & Rastreabilidade de Lotes Consumidos
                </h3>

                <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
                  {genealogia.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">Nenhum consumo rastreado até o momento.</div>
                  ) : (
                    genealogia.map((g) => (
                      <div key={g.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex justify-between items-center">
                        <div>
                          <span className="text-white font-bold block">{g.insumo?.nome}</span>
                          <span className="text-slate-400 text-[10px]">Lote Insumo: {g.lote_insumo || 'S/L'} • Qtd: {parseFloat(g.quantidade_consumida).toFixed(2)} {g.insumo?.unidade_medida}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Lote Acabado</span>
                          <strong className="text-indigo-400 text-xs">{g.lote_acabado_gerado}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Selecione uma Ordem de Produção à esquerda para iniciar os apontamentos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}