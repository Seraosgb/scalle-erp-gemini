import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  Wrench, Plus, Search, CheckCircle2, AlertTriangle, 
  X, Camera, PenTool, Printer, Clock, User, Building2, Upload,
  Kanban, Calendar, ShieldCheck, Share2, Activity, Gauge, TrendingUp,
  Settings, Edit, ToggleLeft, ToggleRight, Play, Pause, PackageCheck,
  CheckSquare, FileText, ArrowRight, Package
} from 'lucide-react';

function SlaTimerBadge({ prazo }) {
  if (!prazo) return null;
  const diffMs = new Date(prazo) - new Date();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs <= 0) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">SLA Estourado</span>;
  if (diffHours < 2) return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">Risco ({diffHours}h {diffMins}m)</span>;
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">{diffHours}h {diffMins}m</span>;
}

export default function OrdensServicoPage() {
  const [abaAtiva, setAbaAtiva] = useState('kanban'); // 'kanban' | 'lista' | 'pmoc' | 'ativos' | 'slas'
  const [ordens, setOrdens] = useState([]);
  const [planosPmoc, setPlanosPmoc] = useState([]);
  const [ativos, setAtivos] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [metricasCmms, setMetricasCmms] = useState({ mttr_horas: 0, mtbf_dias: 0, sla_conformidade_percent: 100, total_concluidas: 0, total_corretivas: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modais
  const [modalNovaOs, setModalNovaOs] = useState(false);
  const [modalNovoPmoc, setModalNovoPmoc] = useState(false);
  const [modalNovoAtivo, setModalNovoAtivo] = useState(false);
  const [modalPrioridade, setModalPrioridade] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalConcluir, setModalConcluir] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);
  const [modalAddPeca, setModalAddPeca] = useState(false);
  const [modalImprimirLaudo, setModalImprimirLaudo] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Auxiliares
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]);

  // Form Abertura OS
  const [formOs, setFormOs] = useState({
    cliente_id: '', ativo_id: '', tecnico_responsavel_id: '', deposito_saida_id: '',
    equipamento_descricao: '', equipamento_marca_modelo: '', equipamento_numero_serie: '',
    defeito_reclamado: '', prioridade: 'NORMAL', tipo_manutencao: 'CORRETIVA',
  });

  // Form PMOC
  const [formPmoc, setFormPmoc] = useState({
    id: null, cliente_id: '', ativo_id: '', tecnico_padrao_id: '',
    titulo_plano: '', frequencia: 'MENSAL', proxima_execucao: new Date().toISOString().substring(0, 10),
    instrucoes_tecnicas: '',
  });

  // Form Ativo
  const [formAtivo, setFormAtivo] = useState({
    cliente_id: '', descricao: '', codigo_patrimonio: '', marca_modelo: '', numero_serie: '',
    localizacao_fisica: '', valor_aquisicao: '', data_aquisicao: new Date().toISOString().substring(0, 10),
  });

  // Form Prioridade
  const [formPrioridade, setFormPrioridade] = useState({
    nome: '', codigo: '', cor_hex: '#3b82f6', horas_sla: 24, ordem_exibicao: 1, is_ativo: true
  });
  const [prioridadeEmEdicao, setPrioridadeEmEdicao] = useState(null);

  // Form Requisitar Peça ao Almoxarifado
  const [novaPeca, setNovaPeca] = useState({ item_id: '', quantidade: 1, valor_unitario: 0 });

  // Form Conclusão
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [docResponsavel, setDocResponsavel] = useState('');
  const canvasRef = useRef(null);
  const [desenhando, setDesenhando] = useState(false);

  // Form Foto
  const [tipoEtapaFoto, setTipoEtapaFoto] = useState('ANTES');
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [descFoto, setDescFoto] = useState('');

  const carregarDadosIniciais = async () => {
    setLoading(true);
    try {
      const resBootstrap = await api.get('/os/bootstrap', { params: { search } });
      const data = resBootstrap.data?.data || {};

      setOrdens(data.ordens || []);
      setMetricasCmms(data.metricas || { mttr_horas: 0, mtbf_dias: 0, sla_conformidade_percent: 100, total_concluidas: 0, total_corretivas: 0 });
      setPrioridades(data.prioridades || []);
    } catch (err) {
      try {
        const resOs = await api.get('/os', { params: { search } });
        const raw = resOs.data?.data;
        setOrdens(Array.isArray(raw) ? raw : (raw?.data || []));
      } catch (e) {}
    } finally {
      setLoading(false);
    }

    try {
      const [resCli, resUsers, resDeps, resItens, resAtivos, resPmoc] = await Promise.all([
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } }).catch(() => ({ data: { data: [] } })),
        api.get('/usuarios').catch(() => ({ data: { data: [] } })),
        api.get('/wms/depositos').catch(() => ({ data: { data: [] } })),
        api.get('/itens').catch(() => ({ data: { data: [] } })),
        api.get('/ativos').catch(() => ({ data: { data: [] } })),
        api.get('/os/planos-preventivos').catch(() => ({ data: { data: [] } }))
      ]);

      const cliList = resCli.data?.data || [];
      const userList = resUsers.data?.data?.usuarios || resUsers.data?.data || [];
      const depList = resDeps.data?.data || [];
      const itList = resItens.data?.data || [];
      const atList = resAtivos.data?.data || [];
      const pmList = resPmoc.data?.data || [];

      setClientes(cliList);
      setTecnicos(userList);
      setDepositos(depList);
      setItensCatalogo(itList);
      setAtivos(atList);
      setPlanosPmoc(pmList);

      if (depList.length > 0 && !formOs.deposito_saida_id) {
        setFormOs(prev => ({ ...prev, deposito_saida_id: depList[0].id }));
      }
    } catch (err) {
      console.warn('Carregamento secundário concluído com avisos:', err);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, [search]);

  const handleSalvarAtivo = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        descricao: formAtivo.descricao,
        codigo_patrimonio: formAtivo.codigo_patrimonio,
        marca_modelo: formAtivo.marca_modelo || null,
        numero_serie: formAtivo.numero_serie || null,
        localizacao_fisica: formAtivo.localizacao_fisica || null,
        cliente_id: formAtivo.cliente_id && formAtivo.cliente_id !== '' ? formAtivo.cliente_id : null,
        valor_aquisicao: formAtivo.valor_aquisicao ? parseFloat(formAtivo.valor_aquisicao) : 0.00,
        data_aquisicao: formAtivo.data_aquisicao || null,
      };

      const res = await api.post('/ativos', payload);
      setAtivos([...ativos, res.data.data]);
      setModalNovoAtivo(false);
      setFormAtivo({ cliente_id: '', descricao: '', codigo_patrimonio: '', marca_modelo: '', numero_serie: '', localizacao_fisica: '', valor_aquisicao: '', data_aquisicao: new Date().toISOString().substring(0, 10) });
      setFeedback({ tipo: 'sucesso', msg: 'Ativo patrimonial cadastrado com sucesso!' });
    } catch (err) {
      const msgErro = err.response?.data?.error?.message 
                   || (err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : 'Erro ao cadastrar ativo.');
      setFeedback({ tipo: 'erro', msg: msgErro });
    }
  };

  const handleMudarStatusOs = async (novoStatus) => {
    try {
      const res = await api.put(`/os/${osSelecionada.id}/status`, { status: novoStatus });
      setOsSelecionada(res.data.data.os);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao transitar status da OS.' });
    }
  };

  const handleAdicionarPecaEmAndamento = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/os/${osSelecionada.id}/pecas`, novaPeca);
      setOsSelecionada(res.data.data.os);
      setModalAddPeca(false);
      setNovaPeca({ item_id: '', quantidade: 1, valor_unitario: 0 });
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao requisitar peça ao almoxarifado.' });
    }
  };

  const handleTratarPecaAlmox = async (itemId, novoStatus) => {
    try {
      const res = await api.put(`/os/${osSelecionada.id}/pecas/${itemId}/almoxarifado`, { status_requisicao: novoStatus });
      setOsSelecionada(res.data.data.os);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao atualizar status da peça no almoxarifado.' });
    }
  };

  const handleSalvarOs = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/os', formOs);
      setModalNovaOs(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao abrir OS.' });
    }
  };

  const handleSalvarPmoc = async (e) => {
    e.preventDefault();
    try {
      if (formPmoc.id) {
        await api.put(`/os/planos-preventivos/${formPmoc.id}`, formPmoc);
        setFeedback({ tipo: 'sucesso', msg: 'Plano PMOC atualizado com sucesso!' });
      } else {
        await api.post('/os/planos-preventivos', formPmoc);
        setFeedback({ tipo: 'sucesso', msg: 'Plano PMOC cadastrado com sucesso!' });
      }
      setModalNovoPmoc(false);
      setFormPmoc({ id: null, cliente_id: '', ativo_id: '', tecnico_padrao_id: '', titulo_plano: '', frequencia: 'MENSAL', proxima_execucao: new Date().toISOString().substring(0, 10), instrucoes_tecnicas: '' });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar PMOC.' });
    }
  };

  const handleToggleStatusPmoc = async (id) => {
    try {
      await api.put(`/os/planos-preventivos/${id}/status`);
      carregarDadosIniciais();
      setFeedback({ tipo: 'sucesso', msg: 'Status do plano PMOC alterado!' });
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao alterar status do PMOC.' });
    }
  };

  const handleSalvarPrioridade = async (e) => {
    e.preventDefault();
    try {
      if (prioridadeEmEdicao) {
        await api.put(`/os/prioridades/${prioridadeEmEdicao.id}`, formPrioridade);
        setFeedback({ tipo: 'sucesso', msg: 'Regra de SLA atualizada!' });
      } else {
        await api.post('/os/prioridades', formPrioridade);
        setFeedback({ tipo: 'sucesso', msg: 'Nova prioridade cadastrada!' });
      }
      setModalPrioridade(false);
      setPrioridadeEmEdicao(null);
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar regra de SLA.' });
    }
  };

  // Canvas Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.moveTo(x, y);
    setDesenhando(true);
  };

  const draw = (e) => {
    if (!desenhando) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setDesenhando(false);
  const limparCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleConcluirOs = async (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const assinaturaBase64 = canvas ? canvas.toDataURL('image/png') : '';

    if (!assinaturaBase64 || assinaturaBase64.length < 1000) {
      alert('É obrigatório coletar a assinatura do cliente para concluir a OS.');
      return;
    }

    try {
      const payload = {
        laudo_tecnico: laudoTecnico,
        nome_responsavel: nomeResponsavel,
        documento_responsavel: docResponsavel,
        assinatura_base64: assinaturaBase64,
        itens: [],
      };

      const res = await api.post(`/os/${osSelecionada.id}/concluir`, payload);
      setModalConcluir(false);
      setModalDetalhes(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDadosIniciais();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao concluir OS.' });
    }
  };

  const handleUploadFoto = async (e) => {
    e.preventDefault();
    if (!arquivoFoto) return;

    const data = new FormData();
    data.append('foto', arquivoFoto);
    data.append('tipo_etapa', tipoEtapaFoto);
    data.append('descricao', descFoto || `Evidência (${tipoEtapaFoto})`);

    try {
      const res = await api.post(`/os/${osSelecionada.id}/fotos`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setModalFoto(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      const resUpdated = await api.get(`/os/${osSelecionada.id}`);
      setOsSelecionada(resUpdated.data.data);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao enviar foto.' });
    }
  };

  const colunasKanban = [
    { id: 'ABERTA', titulo: 'Triagem / Novas', cor: 'border-blue-500' },
    { id: 'EM_EXECUCAO', titulo: 'Em Execução / Campo', cor: 'border-indigo-500' },
    { id: 'AGUARDANDO_PECA', titulo: 'Aguardando Peça (Almox)', cor: 'border-amber-500' },
    { id: 'MATERIAL_DISPONIVEL', titulo: 'Material Disponível', cor: 'border-purple-500' },
    { id: 'CONCLUIDA', titulo: 'Concluídas & Faturadas', cor: 'border-emerald-500' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Wrench className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Ordens de Serviço & CMMS 100%
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Apontamento contínuo de horas técnicas, workflow de almoxarifado, PMOC e laudo com assinatura digital (MP 2.200-2)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalNovoAtivo(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition"
          >
            <Plus className="h-4 w-4 text-indigo-400" /> Novo Ativo
          </button>
          <button
            type="button"
            onClick={() => { setFormPmoc({ id: null, cliente_id: '', ativo_id: '', tecnico_padrao_id: '', titulo_plano: '', frequencia: 'MENSAL', proxima_execucao: new Date().toISOString().substring(0, 10), instrucoes_tecnicas: '' }); setModalNovoPmoc(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 text-xs font-bold cursor-pointer transition"
          >
            <Calendar className="h-4 w-4" /> Novo PMOC
          </button>
          <button
            type="button"
            onClick={() => setModalNovaOs(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" /> Abrir OS
          </button>
        </div>
      </div>

      {/* Cards de Métricas Analíticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">MTTR (Tempo Reparo)</span>
            <span className="text-lg font-bold font-mono text-white">{metricasCmms.mttr_horas} <span className="text-xs text-slate-500">horas</span></span>
          </div>
          <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-indigo-400"><Clock className="h-5 w-5" /></div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">MTBF (Entre Falhas)</span>
            <span className="text-lg font-bold font-mono text-white">{metricasCmms.mtbf_dias} <span className="text-xs text-slate-500">dias</span></span>
          </div>
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400"><Activity className="h-5 w-5" /></div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Conformidade SLA</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{metricasCmms.sla_conformidade_percent}%</span>
          </div>
          <div className="p-2 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400"><Gauge className="h-5 w-5" /></div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">OS Concluídas / Mês</span>
            <span className="text-lg font-bold font-mono text-white">{metricasCmms.total_concluidas}</span>
          </div>
          <div className="p-2 bg-blue-950/60 border border-blue-800/60 rounded-xl text-blue-400"><TrendingUp className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('kanban')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'kanban' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" /> Quadro Kanban
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('lista')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'lista' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Lista Analítica
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('pmoc')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'pmoc' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Cronogramas PMOC ({planosPmoc.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('ativos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'ativos' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Wrench className="h-3.5 w-3.5" /> Ativos ({ativos.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('slas')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'slas' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" /> SLAs & Prioridades ({prioridades.length})
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar OS, Ativo, Cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Visualização 1: Quadro Kanban */}
      {abaAtiva === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {colunasKanban.map((col) => {
            const ordensColuna = ordens.filter(o => o.status === col.id || (col.id === 'EM_EXECUCAO' && o.status === 'EM_ANDAMENTO'));
            return (
              <div key={col.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[500px]">
                <div className={`flex justify-between items-center pb-2.5 mb-2 border-b-2 ${col.cor}`}>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{col.titulo}</span>
                  <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{ordensColuna.length}</span>
                </div>

                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {ordensColuna.map((os) => (
                    <div
                      key={os.id}
                      onClick={() => { setOsSelecionada(os); setModalDetalhes(true); }}
                      className="bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 p-3 rounded-xl cursor-pointer transition shadow-sm space-y-2 group"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-indigo-400">#{os.numero_os}</span>
                        <div className="flex items-center gap-1.5">
                          <SlaTimerBadge prazo={os.prazo_sla_resolucao} />
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            os.prioridade === 'URGENTE' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            os.prioridade === 'ALTA' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {os.prioridade}
                          </span>
                        </div>
                      </div>

                      <div className="font-bold text-white text-xs line-clamp-1">{os.equipamento_descricao}</div>
                      <div className="text-[11px] text-slate-400 truncate">{os.cliente?.nome_razao_social}</div>

                      <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {os.tecnico?.name || 'Não atribuído'}</span>
                        <span className="font-mono text-emerald-400 font-bold">R$ {parseFloat(os.valor_total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualização 2: Cronogramas PMOC */}
      {abaAtiva === 'pmoc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">PLANO PREVENTIVO PMOC</th>
                <th className="py-3 px-4">CLIENTE / LOCAL</th>
                <th className="py-3 px-4">ATIVO VINCULADO</th>
                <th className="py-3 px-4">FREQUÊNCIA</th>
                <th className="py-3 px-4">PRÓXIMA EXECUÇÃO</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {planosPmoc.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-500">Nenhum cronograma PMOC cadastrado.</td></tr>
              ) : (
                planosPmoc.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{p.titulo_plano}</td>
                    <td className="py-3 px-4 text-slate-300">{p.cliente?.nome_razao_social}</td>
                    <td className="py-3 px-4 text-indigo-400">{p.ativo?.descricao || 'Equipamento Geral'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">{p.frequencia}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{new Date(p.proxima_execucao).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_ativo ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                        {p.is_ativo ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormPmoc({
                              id: p.id,
                              cliente_id: p.cliente_id,
                              ativo_id: p.ativo_id || '',
                              tecnico_padrao_id: p.tecnico_padrao_id || '',
                              titulo_plano: p.titulo_plano,
                              frequencia: p.frequencia,
                              proxima_execucao: p.proxima_execucao ? p.proxima_execucao.substring(0, 10) : '',
                              instrucoes_tecnicas: p.instrucoes_tecnicas || ''
                            });
                            setModalNovoPmoc(true);
                          }}
                          className="p-1.5 text-indigo-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition"
                          title="Editar Plano PMOC"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatusPmoc(p.id)}
                          className={`p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer transition ${p.is_ativo ? 'text-amber-400' : 'text-emerald-400'}`}
                          title={p.is_ativo ? 'Inativar Plano' : 'Ativar Plano'}
                        >
                          {p.is_ativo ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Visualização 3: Ativos Cadastrados */}
      {abaAtiva === 'ativos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">TAG / PATRIMÔNIO</th>
                <th className="py-3 px-4">DESCRIÇÃO DO ATIVO</th>
                <th className="py-3 px-4">CLIENTE / PROPRIETÁRIO</th>
                <th className="py-3 px-4">MARCA / MODELO</th>
                <th className="py-3 px-4">Nº DE SÉRIE</th>
                <th className="py-3 px-4">LOCALIZAÇÃO / SALA</th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {ativos.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-500">Nenhum ativo tombado cadastrado.</td></tr>
              ) : (
                ativos.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-indigo-400 font-mono">{a.codigo_patrimonio}</td>
                    <td className="py-3 px-4 font-medium text-white">{a.descricao}</td>
                    <td className="py-3 px-4 text-indigo-300 font-semibold">{a.cliente?.nome_razao_social || 'Equipamento Próprio'}</td>
                    <td className="py-3 px-4 text-slate-300">{a.marca_modelo || '-'}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{a.numero_serie || '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{a.localizacao_fisica || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">ATIVO</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Visualização 4: Regras de SLA */}
      {abaAtiva === 'slas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
            <div>
              <h2 className="text-sm font-bold text-white">Prioridades e Prazos de SLA (Tenant Ativo)</h2>
              <p className="text-xs text-slate-400">Prazos de resolução e criticidade de chamados</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPrioridadeEmEdicao(null);
                setFormPrioridade({ nome: '', codigo: '', cor_hex: '#3b82f6', horas_sla: 24, ordem_exibicao: prioridades.length + 1, is_ativo: true });
                setModalPrioridade(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Prioridade
            </button>
          </div>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">PRIORIDADE</th>
                <th className="py-3 px-4">CÓDIGO IDENTIFICADOR</th>
                <th className="py-3 px-4">PRAZO SLA (HORAS)</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {prioridades.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.cor_hex || '#3b82f6' }}></span>
                    {p.nome}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{p.codigo}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">{p.metadados?.horas_sla || 24} horas</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_ativo ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                      {p.is_ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPrioridadeEmEdicao(p);
                        setFormPrioridade({
                          nome: p.nome,
                          codigo: p.codigo,
                          cor_hex: p.cor_hex || '#3b82f6',
                          horas_sla: p.metadados?.horas_sla || 24,
                          ordem_exibicao: p.ordem_exibicao || 1,
                          is_ativo: p.is_ativo ?? true,
                        });
                        setModalPrioridade(true);
                      }}
                      className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold cursor-pointer"
                    >
                      Editar SLA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Visualização 5: Lista Analítica */}
      {abaAtiva === 'lista' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Nº OS</th>
                <th className="py-3 px-4">CLIENTE</th>
                <th className="py-3 px-4">EQUIPAMENTO / ATIVO</th>
                <th className="py-3 px-4">TÉCNICO</th>
                <th className="py-3 px-4">PRIORIDADE</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {ordens.map((os) => (
                <tr key={os.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 text-indigo-400 font-semibold font-mono">#{os.numero_os}</td>
                  <td className="py-3 px-4 text-white font-medium">{os.cliente?.nome_razao_social}</td>
                  <td className="py-3 px-4 text-slate-300">{os.equipamento_descricao}</td>
                  <td className="py-3 px-4 text-slate-300">{os.tecnico?.name || '-'}</td>
                  <td className="py-3 px-4">{os.prioridade}</td>
                  <td className="py-3 px-4 text-center">{os.status}</td>
                  <td className="py-3 px-4 text-center">
                    <button type="button" onClick={() => { setOsSelecionada(os); setModalDetalhes(true); }} className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer">
                      Ver Painel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Abertura de OS */}
      {modalNovaOs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-400" /> Abertura de Ordem de Serviço
              </h2>
              <button type="button" onClick={() => setModalNovaOs(false)} className="p-1 cursor-pointer"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarOs} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente *</label>
                  <select required value={formOs.cliente_id} onChange={(e) => setFormOs({ ...formOs, cliente_id: e.target.value, ativo_id: '' })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Selecione o Cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ativo Tombado / Máquina (Do Cliente)</label>
                  <select value={formOs.ativo_id} onChange={(e) => {
                    const ativo = ativos.find(a => a.id === e.target.value);
                    if (ativo) {
                      setFormOs({ ...formOs, ativo_id: ativo.id, equipamento_descricao: ativo.descricao, equipamento_marca_modelo: ativo.marca_modelo || '', equipamento_numero_serie: ativo.numero_serie || '' });
                    } else {
                      setFormOs({ ...formOs, ativo_id: '' });
                    }
                  }} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Nenhum Ativo Selecionado (Digitar Manualmente)</option>
                    {ativos.filter(a => !formOs.cliente_id || !a.cliente_id || a.cliente_id === formOs.cliente_id).map(a => (
                      <option key={a.id} value={a.id}>{a.descricao} — Patr: {a.codigo_patrimonio}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição do Equipamento *</label>
                  <input type="text" required placeholder="Ex: Ar Condicionado Chiller 50TR" value={formOs.equipamento_descricao} onChange={(e) => setFormOs({ ...formOs, equipamento_descricao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Prioridade (SLA)</label>
                  <select value={formOs.prioridade} onChange={(e) => setFormOs({ ...formOs, prioridade: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    {prioridades.map(p => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Manutenção</label>
                  <select value={formOs.tipo_manutencao} onChange={(e) => setFormOs({ ...formOs, tipo_manutencao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva (PMOC)</option>
                    <option value="INSTALACAO">Instalação</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Defeito Reclamado pelo Cliente *</label>
                  <textarea required rows="3" value={formOs.defeito_reclamado} onChange={(e) => setFormOs({ ...formOs, defeito_reclamado: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovaOs(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Registrar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Ativo */}
      {modalNovoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Wrench className="h-4 w-4 text-indigo-400" /> Cadastrar Ativo Patrimonial</h3>
              <button type="button" onClick={() => setModalNovoAtivo(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarAtivo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-400 mb-1">Cliente / Proprietário</label>
                  <select value={formAtivo.cliente_id} onChange={(e) => setFormAtivo({ ...formAtivo, cliente_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Equipamento Próprio</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-400 mb-1">Descrição do Ativo *</label>
                  <input type="text" required placeholder="Ex: Ar Condicionado Chiller 50TR" value={formAtivo.descricao} onChange={(e) => setFormAtivo({ ...formAtivo, descricao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Código / TAG *</label>
                  <input type="text" required placeholder="Ex: CH-001" value={formAtivo.codigo_patrimonio} onChange={(e) => setFormAtivo({ ...formAtivo, codigo_patrimonio: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Marca / Modelo</label>
                  <input type="text" placeholder="Ex: Daikin 50TR" value={formAtivo.marca_modelo} onChange={(e) => setFormAtivo({ ...formAtivo, marca_modelo: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Número de Série</label>
                  <input type="text" placeholder="Ex: SN-123456" value={formAtivo.numero_serie} onChange={(e) => setFormAtivo({ ...formAtivo, numero_serie: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Localização Física / Sala</label>
                  <input type="text" placeholder="Ex: Casa de Máquinas Bloco A" value={formAtivo.localizacao_fisica} onChange={(e) => setFormAtivo({ ...formAtivo, localizacao_fisica: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoAtivo(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar Ativo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição PMOC */}
      {modalNovoPmoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2"><Calendar className="h-5 w-5 text-indigo-400" /> {formPmoc.id ? 'Editar Plano PMOC' : 'Cadastrar Plano Preventivo PMOC'}</h3>
              <button type="button" onClick={() => setModalNovoPmoc(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarPmoc} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Título do Plano PMOC *</label>
                <input type="text" required placeholder="Ex: PMOC Mensal Central Bloco A" value={formPmoc.titulo_plano} onChange={(e) => setFormPmoc({ ...formPmoc, titulo_plano: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Cliente *</label>
                  <select required value={formPmoc.cliente_id} onChange={(e) => setFormPmoc({ ...formPmoc, cliente_id: e.target.value, ativo_id: '' })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Selecione o Cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Ativo Vinculado</label>
                  <select value={formPmoc.ativo_id} onChange={(e) => setFormPmoc({ ...formPmoc, ativo_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Equipamento Geral do Local</option>
                    {ativos.filter(a => !formPmoc.cliente_id || !a.cliente_id || a.cliente_id === formPmoc.cliente_id).map(a => <option key={a.id} value={a.id}>{a.descricao} ({a.codigo_patrimonio})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Frequência *</label>
                  <select value={formPmoc.frequencia} onChange={(e) => setFormPmoc({ ...formPmoc, frequencia: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="MENSAL">Mensal</option>
                    <option value="BIMESTRAL">Bimestral</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Próxima Execução *</label>
                  <input type="date" required value={formPmoc.proxima_execucao} onChange={(e) => setFormPmoc({ ...formPmoc, proxima_execucao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Instruções Técnicas & Normas ANVISA</label>
                <textarea rows="2" placeholder="Descreva os parâmetros técnicos de conformidade..." value={formPmoc.instrucoes_tecnicas} onChange={(e) => setFormPmoc({ ...formPmoc, instrucoes_tecnicas: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoPmoc(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar Cronograma</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes da OS */}
      {modalDetalhes && osSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-indigo-400">OS #{osSelecionada.numero_os}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    osSelecionada.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    osSelecionada.status === 'EM_EXECUCAO' || osSelecionada.status === 'EM_ANDAMENTO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse' :
                    osSelecionada.status === 'AGUARDANDO_PECA' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    osSelecionada.status === 'MATERIAL_DISPONIVEL' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {osSelecionada.status}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">{osSelecionada.equipamento_descricao}</h2>
                <p className="text-xs text-slate-400">Cliente: <span className="text-slate-200">{osSelecionada.cliente?.nome_razao_social}</span></p>
              </div>
              <button type="button" onClick={() => setModalDetalhes(false)} className="p-1 cursor-pointer self-start sm:self-center"><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            {/* Corpo do Painel */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">

              {/* Barra de Transição de Status */}
              {osSelecionada.status !== 'CONCLUIDA' && (
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                  <div>
                    <span className="font-bold text-white text-xs block">Controle Operacional de Campo:</span>
                    <span className="text-[11px] text-slate-400">Ao iniciar a execução, a mão de obra passa a ser computada atomicamente.</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {osSelecionada.status !== 'EM_EXECUCAO' && osSelecionada.status !== 'EM_ANDAMENTO' && (
                      <button
                        type="button"
                        onClick={() => handleMudarStatusOs('EM_EXECUCAO')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <Play className="h-3.5 w-3.5" /> Iniciar / Retomar Execução
                      </button>
                    )}
                    {osSelecionada.status === 'EM_EXECUCAO' && (
                      <button
                        type="button"
                        onClick={() => handleMudarStatusOs('AGUARDANDO_PECA')}
                        className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-300 hover:bg-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Pause className="h-3.5 w-3.5" /> Pausar p/ Peça ou Reprogramar
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Informações Gerais & Prazos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div><span className="text-slate-500 block">Técnico:</span><span className="font-bold text-white">{osSelecionada.tecnico?.name || 'Não atribuído'}</span></div>
                <div><span className="text-slate-500 block">Tipo:</span><span className="font-bold text-indigo-400">{osSelecionada.tipo_manutencao || 'CORRETIVA'}</span></div>
                <div><span className="text-slate-500 block">SLA Resolução:</span><span className="font-mono text-emerald-400">{osSelecionada.prazo_sla_resolucao ? new Date(osSelecionada.prazo_sla_resolucao).toLocaleString('pt-BR') : '-'}</span></div>
                <div><span className="text-slate-500 block">Total Geral:</span><span className="font-mono font-bold text-emerald-400">R$ {parseFloat(osSelecionada.valor_total || 0).toFixed(2)}</span></div>
              </div>

              {/* Mão de Obra Apontada em Tempo Real */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-400" /> Jornada Técnica & Mão de Obra Apontada</h3>
                  <span className="font-mono font-bold text-emerald-400">Total M.O: R$ {parseFloat(osSelecionada.valor_servicos || 0).toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                  {osSelecionada.apontamentos?.length === 0 ? (
                    <div className="py-3 text-center text-slate-500">Nenhum apontamento registrado ainda. Clique em "Iniciar Execução" para abrir a contagem.</div>
                  ) : (
                    osSelecionada.apontamentos?.map((ap) => (
                      <div key={ap.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex justify-between items-center">
                        <div>
                          <span className="text-white font-bold block">{ap.tecnico?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Início: {new Date(ap.data_hora_inicio).toLocaleString('pt-BR')} 
                            {ap.data_hora_fim ? ` — Fim: ${new Date(ap.data_hora_fim).toLocaleString('pt-BR')}` : ' (Em execução contínua...)'}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-indigo-300 font-bold block">{ap.total_horas}h</span>
                          <span className="text-[11px] text-emerald-400 font-bold">R$ {parseFloat(ap.valor_total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Peças e Workflow de Almoxarifado */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-white flex items-center gap-2"><Package className="h-4 w-4 text-indigo-400" /> Peças & Materiais da OS</h3>
                  {osSelecionada.status !== 'CONCLUIDA' && (
                    <button
                      type="button"
                      onClick={() => setModalAddPeca(true)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Requisitar Peça ao Almoxarifado
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {osSelecionada.itens?.length === 0 ? (
                    <div className="py-3 text-center text-slate-500">Nenhum material solicitado para esta OS.</div>
                  ) : (
                    osSelecionada.itens?.map((it) => (
                      <div key={it.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <span className="text-white font-bold block">{it.item?.nome}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Qtd: {it.quantidade} | Un: R$ {parseFloat(it.valor_unitario).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            it.status_requisicao === 'RETIRADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            it.status_requisicao === 'DISPONIVEL' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {it.status_requisicao || 'RETIRADO'}
                          </span>

                          {osSelecionada.status !== 'CONCLUIDA' && (
                            <div className="flex items-center gap-1">
                              {it.status_requisicao === 'SOLICITADO' && (
                                <button
                                  type="button"
                                  onClick={() => handleTratarPecaAlmox(it.id, 'DISPONIVEL')}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Disponibilizar
                                </button>
                              )}
                              {it.status_requisicao === 'DISPONIVEL' && (
                                <button
                                  type="button"
                                  onClick={() => handleTratarPecaAlmox(it.id, 'RETIRADO')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Confirmar Retirada
                                </button>
                              )}
                            </div>
                          )}

                          <span className="font-mono text-emerald-400 font-bold text-xs">R$ {parseFloat(it.valor_total).toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Defeito e Diagnóstico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 block font-bold">Defeito Relatado pelo Cliente:</span>
                  <p className="text-slate-300 whitespace-pre-line">{osSelecionada.defeito_reclamado || 'Nenhum defeito detalhado.'}</p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 block font-bold">Diagnóstico Técnico Preliminar:</span>
                  <p className="text-slate-300 whitespace-pre-line">{osSelecionada.diagnostico_tecnico || 'Aguardando diagnóstico em campo.'}</p>
                </div>
              </div>

              {/* Link Público do Portal */}
              <div className="flex justify-between items-center bg-indigo-950/40 border border-indigo-800/60 p-3 rounded-xl">
                <div>
                  <span className="text-white font-bold block">Portal do Cliente (Self-Service)</span>
                  <span className="text-slate-400 text-[11px]">Envie o link seguro para o cliente acompanhar o laudo e pagar via PIX</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const urlPortal = `${window.location.origin}/portal/os/${osSelecionada.id}`;
                    navigator.clipboard.writeText(urlPortal);
                    setFeedback({ tipo: 'sucesso', msg: 'Link do Portal copiado!' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <Share2 className="h-3.5 w-3.5" /> Copiar Link
                </button>
              </div>

              {/* Galeria de Fotos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Camera className="h-4 w-4 text-indigo-400" /> Evidências Fotográficas</h3>
                  {osSelecionada.status !== 'CONCLUIDA' && (
                    <button type="button" onClick={() => setModalFoto(true)} className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-[11px] font-semibold cursor-pointer flex items-center gap-1">
                      <Upload className="h-3 w-3" /> Anexar Foto
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {osSelecionada.fotos?.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">Nenhuma foto de evidência anexada.</div>
                  ) : (
                    osSelecionada.fotos?.map(f => (
                      <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                        <img src={f.url_arquivo} alt="Evidência" className="h-24 w-full object-cover" />
                        <div className="p-1.5 text-[10px] flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${f.tipo_etapa === 'ANTES' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>{f.tipo_etapa}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Conclusão */}
              {osSelecionada.status === 'CONCLUIDA' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div><span className="text-slate-500 block font-bold mb-1">Laudo Técnico Executado:</span><p className="text-slate-200">{osSelecionada.servico_executado}</p></div>
                  <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-slate-500 block font-bold">Aceite Jurídico Coletado (MP 2.200-2):</span>
                      <div className="text-white font-semibold">{osSelecionada.nome_responsavel_recebimento}</div>
                      <span className="text-[10px] text-slate-500 font-mono block">Hash SHA-256: {osSelecionada.hash_assinatura_sha256?.substring(0, 24)}...</span>
                    </div>
                    {osSelecionada.assinatura_cliente_base64 && <img src={osSelecionada.assinatura_cliente_base64} alt="Assinatura" className="h-14 bg-white rounded p-1" />}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
              {osSelecionada.status !== 'CONCLUIDA' ? (
                <button
                  type="button"
                  onClick={() => {
                    setLaudoTecnico('');
                    setNomeResponsavel(osSelecionada.cliente?.nome_razao_social || '');
                    setModalConcluir(true);
                  }}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <PenTool className="h-4 w-4" /> Concluir OS & Coletar Assinatura Digital
                </button>
              ) : (
                <button type="button" onClick={() => setModalImprimirLaudo(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md">
                  <Printer className="h-4 w-4" /> Visualizar & Imprimir Laudo Oficial
                </button>
              )}
              <button type="button" onClick={() => setModalDetalhes(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs cursor-pointer">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Requisitar Peça ao Almoxarifado */}
      {modalAddPeca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Package className="h-4 w-4 text-indigo-400" /> Requisitar Peça ao Almoxarifado</h3>
              <button type="button" onClick={() => setModalAddPeca(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAdicionarPecaEmAndamento} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Item / Peça do Catálogo *</label>
                <select
                  required
                  value={novaPeca.item_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = itensCatalogo.find(c => c.id === id);
                    setNovaPeca({
                      ...novaPeca,
                      item_id: id,
                      valor_unitario: found ? parseFloat(found.preco_venda || 0) : 0,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">Selecione a Peça...</option>
                  {itensCatalogo.map(c => <option key={c.id} value={c.id}>{c.nome} (R$ {parseFloat(c.preco_venda || 0).toFixed(2)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Quantidade *</label>
                  <input type="number" step="0.01" min="0.01" required value={novaPeca.quantidade} onChange={(e) => setNovaPeca({ ...novaPeca, quantidade: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Valor Unitário (R$)</label>
                  <input type="number" step="0.01" min="0" required value={novaPeca.valor_unitario} onChange={(e) => setNovaPeca({ ...novaPeca, valor_unitario: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalAddPeca(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Requisitar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conclusão com Canvas de Assinatura */}
      {modalConcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <PenTool className="h-5 w-5 text-emerald-400" /> Laudo Técnico & Assinatura Digital
              </h2>
              <button type="button" onClick={() => setModalConcluir(false)} className="p-1 cursor-pointer"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleConcluirOs} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Laudo Técnico dos Serviços Executados *</label>
                <textarea required rows="3" placeholder="Descreva os reparos, testes de pressão e parametrizações realizadas..." value={laudoTecnico} onChange={(e) => setLaudoTecnico(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Recebedor *</label>
                  <input type="text" required value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Documento (CPF / RG)</label>
                  <input type="text" value={docResponsavel} onChange={(e) => setDocResponsavel(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400">Assinatura na Tela (Touch ou Mouse) *</label>
                  <button type="button" onClick={limparCanvas} className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer">Limpar Traço</button>
                </div>
                <div className="border border-slate-700 bg-white rounded-xl overflow-hidden touch-none">
                  <canvas ref={canvasRef} width={500} height={150} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full cursor-crosshair block" />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalConcluir(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">Confirmar & Faturar OS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Fotos */}
      {modalFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Camera className="h-4 w-4 text-indigo-400" /> Anexar Evidência</h3>
              <button type="button" onClick={() => setModalFoto(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUploadFoto} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTipoEtapaFoto('ANTES')} className={`p-2 rounded-lg border font-bold text-center cursor-pointer ${tipoEtapaFoto === 'ANTES' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Antes</button>
                <button type="button" onClick={() => setTipoEtapaFoto('DEPOIS')} className={`p-2 rounded-lg border font-bold text-center cursor-pointer ${tipoEtapaFoto === 'DEPOIS' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>Depois</button>
              </div>
              <input type="file" accept="image/*" required onChange={(e) => setArquivoFoto(e.target.files[0])} className="w-full text-slate-300 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white" />
              <input type="text" placeholder="Descrição da evidência..." value={descFoto} onChange={(e) => setDescFoto(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalFoto(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configurar/Editar SLAs e Prioridades */}
      {modalPrioridade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Settings className="h-4 w-4 text-indigo-400" /> {prioridadeEmEdicao ? 'Editar Regra de SLA' : 'Nova Prioridade'}</h3>
              <button type="button" onClick={() => setModalPrioridade(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarPrioridade} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Nome de Exibição *</label>
                <input type="text" required placeholder="Ex: Emergência Crítica (4h)" value={formPrioridade.nome} onChange={(e) => setFormPrioridade({ ...formPrioridade, nome: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Código Identificador *</label>
                  <input type="text" required disabled={!!prioridadeEmEdicao} placeholder="Ex: EMERGENCIA" value={formPrioridade.codigo} onChange={(e) => setFormPrioridade({ ...formPrioridade, codigo: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono disabled:opacity-50" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Prazo SLA (Horas) *</label>
                  <input type="number" min="1" required placeholder="4" value={formPrioridade.horas_sla} onChange={(e) => setFormPrioridade({ ...formPrioridade, horas_sla: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
              </div>
              {prioridadeEmEdicao && (
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="check_ativo_prio" checked={formPrioridade.is_ativo} onChange={(e) => setFormPrioridade({ ...formPrioridade, is_ativo: e.target.checked })} className="rounded bg-slate-950 border-slate-800" />
                  <label htmlFor="check_ativo_prio" className="text-slate-300 font-medium">Prioridade Ativa no Sistema</label>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalPrioridade(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar Regra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Laudo Técnico Oficial para Visualização e Impressão A4 */}
      {modalImprimirLaudo && osSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-400" /> Laudo Técnico Oficial: OS #{osSelecionada.numero_os}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir Laudo (A4)
                </button>
                <button type="button" onClick={() => setModalImprimirLaudo(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
              </div>
            </div>

            {/* Documento A4 */}
            <div id="laudo-oficial-impressao" className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl font-sans text-xs space-y-4 select-text">
              {/* Cabeçalho */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div className="space-y-1">
                  <div className="text-xl font-black tracking-tight text-indigo-900">{osSelecionada.empresa?.nome_fantasia || 'SCALLE ENTERPRISE'}</div>
                  <div className="text-[11px] text-slate-600">{osSelecionada.empresa?.razao_social || 'Aliados da Manutenção'}</div>
                  <div className="text-[10px] text-slate-500">CNPJ: {osSelecionada.empresa?.cnpj || '00.000.000/0001-91'}</div>
                </div>
                <div className="text-right space-y-1 font-mono">
                  <div className="text-base font-black text-indigo-600">OS #{osSelecionada.numero_os}</div>
                  <div className="text-[11px] text-slate-600">Data: {new Date(osSelecionada.data_abertura).toLocaleDateString('pt-BR')}</div>
                  <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{osSelecionada.tipo_manutencao}</div>
                </div>
              </div>

              {/* Cliente e Equipamento */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700 block">CLIENTE:</span>
                  <div className="font-medium text-slate-900">{osSelecionada.cliente?.nome_razao_social}</div>
                  <div className="text-slate-500">Documento: {osSelecionada.cliente?.cpf_cnpj}</div>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">EQUIPAMENTO / ATIVO:</span>
                  <div className="font-medium text-slate-900">{osSelecionada.equipamento_descricao}</div>
                  <div className="text-slate-500">Marca/Modelo: {osSelecionada.equipamento_marca_modelo || 'N/A'} | Série: {osSelecionada.equipamento_numero_serie || 'N/A'}</div>
                </div>
              </div>

              {/* Diagnóstico e Laudo */}
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-slate-800 block">DEFEITO RECLAMADO:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 mt-0.5">{osSelecionada.defeito_reclamado}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">LAUDO TÉCNICO & SERVIÇO EXECUTADO:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 mt-0.5">{osSelecionada.servico_executado || osSelecionada.diagnostico_tecnico || 'Execução técnica em conformidade com as normas.'}</p>
                </div>
              </div>

              {/* Peças e Insumos */}
              {osSelecionada.itens && osSelecionada.itens.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-slate-800 block">MATERIAIS E PEÇAS APLICADOS:</span>
                  <table className="w-full text-left border border-slate-200 text-[10px]">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-1.5">Item</th>
                        <th className="p-1.5 text-center">Qtd</th>
                        <th className="p-1.5 text-right">Valor Unitário</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {osSelecionada.itens.map((it) => (
                        <tr key={it.id}>
                          <td className="p-1.5 font-sans">{it.item?.nome}</td>
                          <td className="p-1.5 text-center">{it.quantidade}</td>
                          <td className="p-1.5 text-right">R$ {parseFloat(it.valor_unitario).toFixed(2)}</td>
                          <td className="p-1.5 text-right font-bold">R$ {parseFloat(it.valor_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Evidências Fotográficas */}
              {osSelecionada.fotos && osSelecionada.fotos.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 block">EVIDÊNCIAS FOTOGRÁFICAS (COMPROVAÇÃO TÉCNICA):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {osSelecionada.fotos.map((f) => (
                      <div key={f.id} className="border border-slate-200 rounded p-1 text-center bg-slate-50">
                        <img src={f.url_arquivo} alt="Evidência" className="h-24 w-full object-cover rounded" />
                        <span className="text-[9px] font-bold text-indigo-700 block mt-1">{f.tipo_etapa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assinatura Jurídica e Hash MP 2.200-2 */}
              <div className="border-t border-slate-300 pt-4 flex justify-between items-end">
                <div className="space-y-1 font-mono text-[9px] text-slate-500 max-w-sm">
                  <div className="font-bold text-slate-700">CONFORMIDADE JURÍDICA MP 2.200-2/2001:</div>
                  <div className="truncate">Hash SHA-256: {osSelecionada.hash_assinatura_sha256 || 'Assinatura Registrada'}</div>
                  <div>IP: {osSelecionada.ip_assinatura || '127.0.0.1'} | Data: {osSelecionada.assinado_em ? new Date(osSelecionada.assinado_em).toLocaleString('pt-BR') : 'N/A'}</div>
                </div>
                <div className="text-center">
                  {osSelecionada.assinatura_cliente_base64 && (
                    <img src={osSelecionada.assinatura_cliente_base64} alt="Assinatura" className="h-12 mx-auto" />
                  )}
                  <div className="border-t border-slate-400 w-48 mt-1 pt-1 font-bold text-[10px] text-slate-800">
                    {osSelecionada.nome_responsavel_recebimento || osSelecionada.cliente?.nome_razao_social}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}