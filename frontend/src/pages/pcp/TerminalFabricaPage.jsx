import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import {
  Factory, Search, CheckCircle2, Play, AlertOctagon,
  BarChart2, Clock, Check, RefreshCw, Layers, ShieldCheck,
  Activity, Settings, AlertTriangle, PauseCircle, PlayCircle, Cpu, Wifi, Save, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TerminalFabricaPage() {
  // Estado do Backend (OPs e Genealogia)
  const [ops, setOps] = useState([]);
  const [opSelecionada, setOpSelecionada] = useState(null);
  const [genealogia, setGenealogia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Variáveis de Apontamento (Controladas Manualmente ou pelo IoT)
  const [produzidas, setProduzidas] = useState(0);
  const [refugos, setRefugos] = useState(0);
  const [horasMod, setHorasMod] = useState('1.0');
  const [horasCif, setHorasCif] = useState('1.0');

  // Estado da Telemetria IoT (ESP32 Simulator)
  const [statusMaquina, setStatusMaquina] = useState('PARADA'); // RODANDO, PARADA
  const [simuladorEsp32, setSimuladorEsp32] = useState(false);
  const [ultimoPulso, setUltimoPulso] = useState(new Date());

  const inputBuscaRef = useRef(null);

  useEffect(() => {
    carregarOps();
    inputBuscaRef.current?.focus();
  }, []);

  // Lógica de Telemetria IoT Real via WebSocket
  useEffect(() => {
    let ws;

    // Só abre a conexão de rede se o operador ligou o sensor, a máquina está rodando e há OP selecionada
    if (simuladorEsp32 && statusMaquina === 'RODANDO' && opSelecionada) {

      // Em produção, utilize uma variável de ambiente (ex: import.meta.env.VITE_IOT_WS_URL)
      ws = new WebSocket('ws://localhost:8080');

      ws.onopen = () => {
        console.log('[Terminal] Conectado ao Broker IoT da fábrica.');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Diretriz de Arquitetura: Filtro Multi-Pipeline por Tenant
          // (Substitua 'scalle_tenant_alpha' pela variável de estado do usuário logado no ERP)
          if (payload.tenant === 'scalle_tenant_alpha') {

            // Cada pacote recebido indica um ciclo da máquina.
            setProduzidas(prev => prev + 1);
            setUltimoPulso(new Date());

            // Regra de Negócio: Se a telemetria relatar temperatura da máquina acima de 40°C,
            // assume-se que a peça sofreu avaria térmica (Refugo).
            if (payload.dados && parseFloat(payload.dados.temperatura_celsius) > 40.0) {
                setRefugos(prev => prev + 1);
            }
          }
        } catch (err) {
          console.error('[Terminal] Erro de parse no pacote IoT:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[Terminal] Falha na conexão WebSocket:', error);
        setFeedback({ tipo: 'erro', msg: 'Falha de comunicação com os sensores IoT.' });
      };
    }

    // Cleanup: Encerra a conexão WebSocket automaticamente se o componente for desmontado
    // ou se o status da máquina mudar para PARADA.
    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [simuladorEsp32, statusMaquina, opSelecionada]);

  const carregarOps = async () => {
    try {
      const res = await api.get('/pcp/ordens-producao');
      const raw = res.data?.data || res.data || [];
      const lista = Array.isArray(raw) ? raw : (raw.data || []);

      const ativas = lista.filter(op => op.status !== 'CONCLUIDA' && op.status !== 'CANCELADA');

      setOps(ativas);
      if (ativas.length > 0 && !opSelecionada) {
        selecionarOp(ativas[0]);
      }
    } catch (e) {
      console.error("Erro ao carregar OPs:", e);
    }
  };

  const selecionarOp = async (op) => {
    // Reseta o terminal ao trocar de OP
    setStatusMaquina('PARADA');
    setSimuladorEsp32(false);
    setProduzidas(0);
    setRefugos(0);
    setOpSelecionada(op);

    try {
      const res = await api.get(`/pcp/ordens-producao/${op.id}/genealogia`);
      setGenealogia(res.data?.data || []);
    } catch (e) {
      setGenealogia([]);
    }
  };

  const handleApontar = async (e) => {
    if (e) e.preventDefault();
    if (!opSelecionada) return;

    if (produzidas === 0 && refugos === 0) {
      setFeedback({ tipo: 'erro', msg: 'Nenhuma peça contada para apontamento. Inicie a máquina ou insira manualmente.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/pcp/ordens-producao/${opSelecionada.id}/apontar`, {
        quantidade_produzida: produzidas,
        quantidade_refugo: refugos,
        horas_mod: parseFloat(horasMod) || 0,
        custo_hora_mod: 45.00,
        horas_cif: parseFloat(horasCif) || 0,
        custo_hora_cif: 25.00,
        observacoes: 'Apontamento via Terminal Touch / Telemetria IoT'
      });

      setFeedback({ tipo: 'sucesso', msg: `Sincronização ERP: ${produzidas} UN boas e ${refugos} refugos apontados com sucesso!` });

      // Zera o contador do painel após o envio para o ERP
      setProduzidas(0);
      setRefugos(0);

      if (res.data?.data?.op) {
        selecionarOp(res.data.data.op);
      }
      carregarOps();

    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao registrar apontamento.' });
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de Produção Dinâmicos
  const totalHistorico = opSelecionada ? parseFloat(opSelecionada.quantidade_produzida || 0) : 0;
  const meta = opSelecionada ? parseFloat(opSelecionada.quantidade_planejada || 0) : 1;
  const percentualConclusao = Math.min(100, Math.round(((totalHistorico + produzidas) / meta) * 100));
  const pecasBoasPercentual = produzidas > 0 ? ((produzidas - refugos) / produzidas) * 100 : 100;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-950 text-slate-200 overflow-hidden font-sans p-4 sm:p-6 gap-6">

      {/* HEADER TIER 1 - CHÃO DE FÁBRICA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Factory className="h-7 w-7 md:h-8 md:w-8 text-indigo-500" />
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">Terminal Máquina 01</h1>
          </div>
          <p className="text-slate-400 mt-1 font-mono text-xs md:text-sm">Célula de Montagem A • Operador(a) Logado(a)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Link
            to="/app/pcp"
            className="flex-1 md:flex-none justify-center px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-inner"
          >
            <Layers className="h-4 w-4 text-indigo-400" /> Voltar ao PCP
          </Link>

          <button
            type="button"
            onClick={carregarOps}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer shadow-inner"
            title="Atualizar OPs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-end w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={() => setSimuladorEsp32(!simuladorEsp32)}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer shadow-inner ${
                simuladorEsp32 ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400' : 'bg-slate-950 border-slate-700 text-slate-500 hover:text-white'
              }`}
            >
              {simuladorEsp32 ? <Wifi className="h-4 w-4 animate-pulse" /> : <Cpu className="h-4 w-4" />}
              {simuladorEsp32 ? 'RECEBENDO TELEMETRIA IOT' : 'LIGAR SENSOR IOT (ESP32)'}
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-lg shrink-0 ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/90 border border-emerald-800 text-emerald-300' : 'bg-rose-950/90 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span className="font-bold">{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

        {/* COLUNA ESQUERDA: Fila de OPs em Produção */}
        <div className="lg:col-span-3 flex flex-col gap-2 min-h-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block shrink-0">Fila de OPs Ativas</span>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-thin">
            {ops.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 text-center text-slate-500 rounded-2xl text-xs">
                Nenhuma OP planejada ou em execução.
              </div>
            ) : (
              ops.map((op) => {
                const isSelected = opSelecionada?.id === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => selecionarOp(op)}
                    className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected ? 'bg-indigo-950/80 border-indigo-500 shadow-lg shadow-indigo-950/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`font-mono font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>OP #{op.numero_op}</span>
                        <h3 className={`text-xs font-semibold line-clamp-2 mt-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{op.produto?.nome}</h3>
                      </div>
                    </div>

                    <div className={`mt-2 flex justify-between items-center text-[10px] font-mono border-t pt-2 ${isSelected ? 'border-indigo-800/50 text-indigo-300' : 'border-slate-800/80 text-slate-500'}`}>
                      <span>Prod: {parseFloat(op.quantidade_produzida).toFixed(0)} / {parseFloat(op.quantidade_planejada).toFixed(0)}</span>
                      <span>{op.oee_percentual || 100}% OEE</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: DASHBOARD DA OP E TELEMETRIA */}
        {opSelecionada ? (
          <div className="lg:col-span-9 flex flex-col gap-6 min-h-0 overflow-y-auto scrollbar-thin pr-2">

            {/* CABEÇALHO DA OP E PROGRESSO */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg shrink-0">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-indigo-950 border border-indigo-800 text-indigo-400 font-bold rounded text-[10px] uppercase tracking-wider">
                      OP Em Execução
                    </span>
                    <span className="text-xl font-black text-white font-mono">#{opSelecionada.numero_op}</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-200 leading-tight">{opSelecionada.produto?.nome}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">SKU: {opSelecionada.produto?.codigo_sku || 'N/A'} | Lote: {opSelecionada.lote_produzido || 'A Gerar'}</p>
                </div>

                <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Qualidade OEE Atual</p>
                    <p className="text-xl font-black text-white font-mono">{pecasBoasPercentual.toFixed(1)}%</p>
                  </div>
                  <div className={`p-3 rounded-full ${pecasBoasPercentual >= 95 ? 'bg-emerald-950 text-emerald-500' : 'bg-amber-950 text-amber-500'}`}>
                    {pecasBoasPercentual >= 95 ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                  </div>
                </div>
              </div>

              {/* Barra de Progresso Global */}
              <div className="pt-2">
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progresso do Lote</span>
                  <span className="text-xl font-black text-indigo-400 font-mono">{percentualConclusao}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 shadow-inner">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                    style={{ width: `${percentualConclusao}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono font-bold">
                  <span>Já no ERP: {parseFloat(opSelecionada.quantidade_produzida).toFixed(0)} UN</span>
                  <span>Meta: {meta.toFixed(0)} UN</span>
                </div>
              </div>
            </div>

            {/* CONTADORES GIGANTES (TIER 1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
              {/* Contador de Produzidas */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-5 left-5">
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Leitura Válida
                  </span>
                </div>
                <div className="text-center mt-6">
                  <input
                    type="number"
                    value={produzidas}
                    onChange={(e) => setProduzidas(Number(e.target.value))}
                    className="w-full bg-transparent text-[6rem] md:text-[8rem] font-black text-white font-mono leading-none tracking-tighter text-center focus:outline-none focus:ring-0"
                  />
                  <span className="text-lg font-bold text-slate-500 uppercase tracking-widest block mt-2">Unidades Boas</span>
                </div>
                <div className="absolute bottom-4 w-full text-center left-0">
                  <span className="text-[10px] font-mono text-slate-600">Último pulso: {ultimoPulso.toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>

              {/* Contador de Refugo */}
              <div className="bg-slate-950 border border-rose-900/30 p-6 rounded-2xl shadow-lg flex flex-col justify-center relative group">
                <div className="absolute top-5 left-5">
                  <span className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Refugo / Sucata
                  </span>
                </div>
                <div className="text-center mt-6">
                  <input
                    type="number"
                    value={refugos}
                    onChange={(e) => setRefugos(Number(e.target.value))}
                    className="w-full bg-transparent text-[6rem] md:text-[8rem] font-black text-rose-500 font-mono leading-none tracking-tighter text-center focus:outline-none focus:ring-0"
                  />
                  <span className="text-lg font-bold text-rose-900 uppercase tracking-widest block mt-2">Unidades Perdidas</span>
                </div>
              </div>
            </div>

            {/* CONTROLES DE MÁQUINA E APONTAMENTO */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0">

              <div className="flex items-center gap-4 w-full xl:w-auto bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className={`w-3 h-3 rounded-full shrink-0 ${statusMaquina === 'RODANDO' ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></div>
                <span className="text-sm font-black text-white uppercase tracking-widest shrink-0">
                  {statusMaquina === 'RODANDO' ? 'MÁQUINA EM OPERAÇÃO' : 'MÁQUINA PARADA'}
                </span>

                <div className="ml-auto flex gap-2">
                  {statusMaquina === 'RODANDO' ? (
                    <button
                      onClick={() => setStatusMaquina('PARADA')}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <PauseCircle className="h-4 w-4" /> Pausar
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatusMaquina('RODANDO')}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <PlayCircle className="h-4 w-4" /> Retomar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:w-28">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Horas Homem</label>
                    <input
                      type="number" step="0.1" value={horasMod} onChange={e => setHorasMod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-mono px-3 py-2 rounded-lg text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1 sm:w-28">
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Horas Máquina</label>
                    <input
                      type="number" step="0.1" value={horasCif} onChange={e => setHorasCif(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-mono px-3 py-2 rounded-lg text-center focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleApontar}
                  disabled={loading || (produzidas === 0 && refugos === 0)}
                  className="w-full sm:w-auto px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition mt-2 sm:mt-0"
                >
                  <Save className="h-4 w-4" /> Sincronizar ERP
                </button>
              </div>
            </div>

            {/* RASTREABILIDADE INFERIOR */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shrink-0">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase mb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Rastreabilidade e Genealogia (BOM)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                {genealogia.length === 0 ? (
                  <div className="col-span-full text-slate-500 text-xs py-2">Rastreabilidade visível após o primeiro apontamento sincronizado.</div>
                ) : (
                  genealogia.map((g) => (
                    <div key={g.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-white font-bold block truncate max-w-[150px] sm:max-w-[200px]">{g.insumo?.nome}</span>
                        <span className="text-slate-500 text-[10px]">Lote Consumido: {g.lote_insumo || 'Sem Lote'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-mono font-bold block">{parseFloat(g.quantidade_consumida).toFixed(2)} {g.insumo?.unidade_medida}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-9 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center min-h-[400px]">
            <div className="text-center text-slate-500">
              <Factory className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-bold">Terminal em Standby</p>
              <p className="text-sm mt-1">Selecione uma ordem de produção na fila à esquerda para iniciar a operação.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
