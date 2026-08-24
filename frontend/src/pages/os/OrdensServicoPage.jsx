import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  Wrench, Plus, Search, RefreshCw, CheckCircle2, AlertTriangle, 
  X, Camera, PenTool, Printer, Clock, User, Building2, Eye, Upload,
  Kanban, Calendar, ShieldCheck, Tag
} from 'lucide-react';

export default function OrdensServicoPage() {
  const [abaAtiva, setAbaAtiva] = useState('kanban'); // 'kanban' | 'lista' | 'pmoc'
  const [ordens, setOrdens] = useState([]);
  const [planosPmoc, setPlanosPmoc] = useState([]);
  const [ativos, setAtivos] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modais
  const [modalNovaOs, setModalNovaOs] = useState(false);
  const [modalNovoPmoc, setModalNovoPmoc] = useState(false);
  const [modalNovoAtivo, setModalNovoAtivo] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalConcluir, setModalConcluir] = useState(false);
  const [modalFoto, setModalFoto] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Auxiliares
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]);

  // Form Abertura OS
  const [formOs, setFormOs] = useState({
    cliente_id: '',
    ativo_id: '',
    tecnico_responsavel_id: '',
    deposito_saida_id: '',
    equipamento_descricao: '',
    equipamento_marca_modelo: '',
    equipamento_numero_serie: '',
    defeito_reclamado: '',
    prioridade: 'NORMAL',
    tipo_manutencao: 'CORRETIVA',
  });

  // Form PMOC
  const [formPmoc, setFormPmoc] = useState({
    cliente_id: '',
    ativo_id: '',
    tecnico_padrao_id: '',
    titulo_plano: '',
    frequencia: 'MENSAL',
    proxima_execucao: new Date().toISOString().substring(0, 10),
    instrucoes_tecnicas: '',
  });

  // Form Ativo Rápido
  const [formAtivo, setFormAtivo] = useState({
    descricao: '',
    codigo_patrimonio: '',
    marca_modelo: '',
    numero_serie: '',
    localizacao_fisica: '',
  });

  // Form Conclusão
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [docResponsavel, setDocResponsavel] = useState('');
  const [itensUsados, setItensUsados] = useState([]);
  const canvasRef = useRef(null);
  const [desenhando, setDesenhando] = useState(false);

  // Form Foto
  const [tipoEtapaFoto, setTipoEtapaFoto] = useState('ANTES');
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [descFoto, setDescFoto] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resOs, resCli, resUsers, resDeps, resItens, resAtivos, resPrios, resPmoc] = await Promise.all([
        api.get('/os', { params: { search } }),
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } }),
        api.get('/usuarios'),
        api.get('/wms/depositos'),
        api.get('/itens'),
        api.get('/ativos'),
        api.get('/os/prioridades'),
        api.get('/os/planos-preventivos')
      ]);

      setOrdens(resOs.data.data || []);
      setClientes(resCli.data.data || []);
      setTecnicos(resUsers.data.data?.usuarios || resUsers.data.data || []);
      const deps = resDeps.data.data || [];
      setDepositos(deps);
      setItensCatalogo(resItens.data.data || []);
      setAtivos(resAtivos.data.data || []);
      setPrioridades(resPrios.data.data || []);
      setPlanosPmoc(resPmoc.data.data || []);

      if (deps.length > 0 && !formOs.deposito_saida_id) {
        setFormOs(prev => ({ ...prev, deposito_saida_id: deps[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search]);

  // Handler seleção de ativo
  const handleSelecionarAtivo = (ativoId) => {
    const ativo = ativos.find(a => a.id === ativoId);
    if (ativo) {
      setFormOs(prev => ({
        ...prev,
        ativo_id: ativo.id,
        equipamento_descricao: ativo.descricao,
        equipamento_marca_modelo: ativo.marca_modelo || '',
        equipamento_numero_serie: ativo.numero_serie || '',
      }));
    } else {
      setFormOs(prev => ({ ...prev, ativo_id: '' }));
    }
  };

  const handleSalvarAtivoRapido = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/ativos', formAtivo);
      setAtivos([...ativos, res.data.data]);
      handleSelecionarAtivo(res.data.data.id);
      setModalNovoAtivo(false);
      setFeedback({ tipo: 'sucesso', msg: 'Ativo patrimonial cadastrado!' });
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao cadastrar ativo.' });
    }
  };

  const handleSalvarOs = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/os', formOs);
      setModalNovaOs(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao abrir OS.' });
    }
  };

  const handleSalvarPmoc = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/os/planos-preventivos', formPmoc);
      setModalNovoPmoc(false);
      setFeedback({ tipo: 'sucesso', msg: 'Plano Preventivo PMOC cadastrado!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao cadastrar PMOC.' });
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
        itens: itensUsados,
      };

      const res = await api.post(`/os/${osSelecionada.id}/concluir`, payload);
      setModalConcluir(false);
      setModalDetalhes(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
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
    data.append('descricao', descFoto);

    try {
      const res = await api.post(`/os/${osSelecionada.id}/fotos`, data);
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
    { id: 'EM_ANDAMENTO', titulo: 'Em Execução', cor: 'border-indigo-500' },
    { id: 'AGUARDANDO_PECA', titulo: 'Aguardando Peça', cor: 'border-amber-500' },
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
            Manutenção de campo, ativos tombados, planos preventivos PMOC e assinatura digital (MP 2.200-2)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalNovoPmoc(true)}
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

      {/* Navegação entre Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
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
            <ShieldCheck className="h-3.5 w-3.5" /> Cronograma PMOC ({planosPmoc.length})
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

      {/* Feedback Toast */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {colunasKanban.map((col) => {
            const ordensColuna = ordens.filter(o => o.status === col.id);
            return (
              <div key={col.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[500px]">
                <div className={`flex justify-between items-center pb-2.5 mb-2 border-b-2 ${col.cor}`}>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{col.titulo}</span>
                  <span className="text-xs font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                    {ordensColuna.length}
                  </span>
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

      {/* Visualização 2: Cronograma PMOC */}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs font-sans">
              {planosPmoc.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-500">Nenhum cronograma PMOC cadastrado.</td></tr>
              ) : (
                planosPmoc.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{p.titulo_plano}</td>
                    <td className="py-3 px-4 text-slate-300">{p.cliente?.nome_razao_social}</td>
                    <td className="py-3 px-4 text-indigo-400">{p.ativo?.descricao || 'Equipamento Geral'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">{p.frequencia}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{new Date(p.proxima_execucao).toLocaleDateString('pt-BR')}</td>
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

      {/* Visualização 3: Lista Analítica */}
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
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs font-sans">
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
                  <select required value={formOs.cliente_id} onChange={(e) => setFormOs({ ...formOs, cliente_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Selecione o Cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-400">Ativo Tombado / Máquina (Opcional)</label>
                    <button type="button" onClick={() => setModalNovoAtivo(true)} className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer">+ Cadastrar Ativo</button>
                  </div>
                  <select value={formOs.ativo_id} onChange={(e) => handleSelecionarAtivo(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Nenhum Ativo Selecionado (Digitar Manualmente)</option>
                    {ativos.map(a => <option key={a.id} value={a.id}>{a.descricao} — Patr: {a.codigo_patrimonio}</option>)}
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Defeito / Solicitação *</label>
                  <textarea required rows="3" value={formOs.defeito_reclamado} onChange={(e) => setFormOs({ ...formOs, defeito_reclamado: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovaOs(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Registrar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Ativo Rápido */}
      {modalNovoAtivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Cadastrar Novo Ativo / Equipamento</h3>
            <form onSubmit={handleSalvarAtivoRapido} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Descrição do Ativo *</label>
                <input type="text" required placeholder="Ex: Fan Coil 15TR" value={formAtivo.descricao} onChange={(e) => setFormAtivo({ ...formAtivo, descricao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Código de Patrimônio (TAG) *</label>
                <input type="text" required placeholder="Ex: EQ-045" value={formAtivo.codigo_patrimonio} onChange={(e) => setFormAtivo({ ...formAtivo, codigo_patrimonio: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoAtivo(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar Ativo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro PMOC */}
      {modalNovoPmoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" /> Cadastrar Plano Preventivo PMOC
            </h3>
            <form onSubmit={handleSalvarPmoc} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Título do Plano PMOC *</label>
                <input type="text" required placeholder="Ex: Plano de Higienização Mensal Bloco A" value={formPmoc.titulo_plano} onChange={(e) => setFormPmoc({ ...formPmoc, titulo_plano: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Cliente *</label>
                  <select required value={formPmoc.cliente_id} onChange={(e) => setFormPmoc({ ...formPmoc, cliente_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Selecione o Cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_razao_social}</option>)}
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
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoPmoc(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar Cronograma</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes & Finalização com Assinatura */}
      {modalDetalhes && osSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">OS #{osSelecionada.numero_os} — {osSelecionada.equipamento_descricao}</h2>
                <p className="text-xs text-slate-400">Cliente: {osSelecionada.cliente?.nome_razao_social}</p>
              </div>
              <button type="button" onClick={() => setModalDetalhes(false)} className="p-1 cursor-pointer"><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div><span className="text-slate-500 block">Status:</span><span className="font-bold text-indigo-400">{osSelecionada.status}</span></div>
                <div><span className="text-slate-500 block">Prioridade:</span><span className="font-bold text-white">{osSelecionada.prioridade}</span></div>
                <div><span className="text-slate-500 block">SLA Resolução:</span><span className="font-mono text-emerald-400">{osSelecionada.prazo_sla_resolucao ? new Date(osSelecionada.prazo_sla_resolucao).toLocaleString('pt-BR') : '-'}</span></div>
                <div><span className="text-slate-500 block">Total OS:</span><span className="font-mono font-bold text-emerald-400">R$ {parseFloat(osSelecionada.valor_total || 0).toFixed(2)}</span></div>
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

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
              {osSelecionada.status !== 'CONCLUIDA' ? (
                <button type="button" onClick={() => { setLaudoTecnico(''); setNomeResponsavel(osSelecionada.cliente?.nome_razao_social || ''); setItensUsados([]); setModalConcluir(true); }} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/30">
                  <PenTool className="h-4 w-4" /> Concluir OS & Coletar Assinatura
                </button>
              ) : (
                <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5">
                  <Printer className="h-4 w-4" /> Imprimir Relatório
                </button>
              )}
              <button type="button" onClick={() => setModalDetalhes(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs cursor-pointer">Fechar</button>
            </div>
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

              {/* Peças Utilizadas */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peças & Insumos Aplicados</label>
                  <button type="button" onClick={() => setItensUsados([...itensUsados, { item_id: '', tipo_item: 'PRODUTO', quantidade: 1, valor_unitario: 0 }])} className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer">+ Adicionar Peça</button>
                </div>
                {itensUsados.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="col-span-7">
                      <select required value={it.item_id} onChange={(e) => {
                        const id = e.target.value;
                        const found = itensCatalogo.find(c => c.id === id);
                        const novos = [...itensUsados];
                        novos[idx].item_id = id;
                        novos[idx].valor_unitario = found ? parseFloat(found.preco_venda || 0) : 0;
                        setItensUsados(novos);
                      }} className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white">
                        <option value="">Selecione o Insumo/Peça...</option>
                        {itensCatalogo.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="1" placeholder="Qtd" value={it.quantidade} onChange={(e) => {
                        const novos = [...itensUsados];
                        novos[idx].quantidade = parseFloat(e.target.value) || 1;
                        setItensUsados(novos);
                      }} className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono" />
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-mono text-xs text-emerald-400 font-bold block pt-1">R$ {(it.quantidade * it.valor_unitario).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responsável e Assinatura */}
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
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Camera className="h-4 w-4 text-indigo-400" /> Anexar Foto</h3>
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
    </div>
  );
}
function SlaTimerBadge({ prazo }) {
  if (!prazo) return null;

  const diffMs = new Date(prazo) - new Date();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs <= 0) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
        SLA Estourado
      </span>
    );
  }

  if (diffHours < 2) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
        Risco ({diffHours}h {diffMins}m)
      </span>
    );
  }

  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
      {diffHours}h {diffMins}m
    </span>
  );
}