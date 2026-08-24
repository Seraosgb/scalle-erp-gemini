import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  Wrench, Plus, Search, RefreshCw, CheckCircle2, AlertTriangle, 
  X, Camera, PenTool, Printer, Clock, User, Building2, Eye, Upload
} from 'lucide-react';

export default function OrdensServicoPage() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  // Modais
  const [modalNovaOs, setModalNovaOs] = useState(false);
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

  // Form Abertura
  const [formOs, setFormOs] = useState({
    cliente_id: '',
    tecnico_responsavel_id: '',
    deposito_saida_id: '',
    equipamento_descricao: '',
    equipamento_marca_modelo: '',
    equipamento_numero_serie: '',
    defeito_reclamado: '',
    prioridade: 'NORMAL',
    tipo_manutencao: 'CORRETIVA',
  });

  // Form Conclusão
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [docResponsavel, setDocResponsavel] = useState('');
  const [itensUsados, setItensUsados] = useState([]);
  
  // Canvas de Assinatura
  const canvasRef = useRef(null);
  const [desenhando, setDesenhando] = useState(false);

  // Form Foto
  const [tipoEtapaFoto, setTipoEtapaFoto] = useState('ANTES');
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [descFoto, setDescFoto] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resOs, resCli, resUsers, resDeps, resItens] = await Promise.all([
        api.get('/os', { params: { search, status: statusFiltro } }),
        api.get('/pessoas', { params: { tipo: 'CLIENTE' } }),
        api.get('/empresa/usuarios'),
        api.get('/wms/depositos'),
        api.get('/itens')
      ]);

      setOrdens(resOs.data.data || []);
      setClientes(resCli.data.data || []);
      setTecnicos(resUsers.data.data?.usuarios || resUsers.data.data || []);
      const deps = resDeps.data.data || [];
      setDepositos(deps);
      setItensCatalogo(resItens.data.data || []);

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
  }, [search, statusFiltro]);

  const handleSalvarOs = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/os', formOs);
      setModalNovaOs(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      setFormOs({
        cliente_id: '',
        tecnico_responsavel_id: '',
        deposito_saida_id: depositos[0]?.id || '',
        equipamento_descricao: '',
        equipamento_marca_modelo: '',
        equipamento_numero_serie: '',
        defeito_reclamado: '',
        prioridade: 'NORMAL',
        tipo_manutencao: 'CORRETIVA',
      });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao abrir OS.' });
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

  const stopDrawing = () => {
    setDesenhando(false);
  };

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
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
      setArquivoFoto(null);
      setDescFoto('');
      
      const resUpdated = await api.get(`/os/${osSelecionada.id}`);
      setOsSelecionada(resUpdated.data.data);
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao enviar foto.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Ordens de Serviço & CMMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manutenção de campo, evidências fotográficas e assinatura digital (MP 2.200-2)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalNovaOs(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
        >
          <Plus className="h-4 w-4" /> Abrir Nova OS
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['', 'ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFiltro(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                statusFiltro === st 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === '' ? 'Todas as OS' : st}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por Equipamento, Cliente, Nº..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-lg flex items-center justify-between text-xs sm:text-sm ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span className="truncate">{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabela de OS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">Nº OS</th>
                <th className="py-3 px-4">CLIENTE</th>
                <th className="py-3 px-4">EQUIPAMENTO</th>
                <th className="py-3 px-4">TÉCNICO</th>
                <th className="py-3 px-4">PRIORIDADE</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500 font-sans">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando ordens de serviço...
                  </td>
                </tr>
              ) : ordens.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500 font-sans">
                    Nenhuma ordem de serviço registrada.
                  </td>
                </tr>
              ) : (
                ordens.map((os) => (
                  <tr key={os.id} className="hover:bg-slate-800/40 transition font-sans">
                    <td className="py-3 px-4 text-indigo-400 font-semibold font-mono">#{os.numero_os}</td>
                    <td className="py-3 px-4 text-white font-medium">{os.cliente?.nome_razao_social}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{os.equipamento_descricao}</div>
                      <span className="text-[10px] text-slate-500 font-mono">{os.equipamento_marca_modelo || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{os.tecnico?.name || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        os.prioridade === 'URGENTE' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        os.prioridade === 'ALTA' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {os.prioridade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        os.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        os.status === 'EM_ANDAMENTO' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {os.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => { setOsSelecionada(os); setModalDetalhes(true); }}
                        className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        Abrir Painel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Abertura de OS */}
      {modalNovaOs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-400" />
                Abertura de Chamado / Ordem de Serviço
              </h2>
              <button type="button" onClick={() => setModalNovaOs(false)} className="p-1 cursor-pointer"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarOs} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cliente *</label>
                  <select
                    required
                    value={formOs.cliente_id}
                    onChange={(e) => setFormOs({ ...formOs, cliente_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_razao_social}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Técnico Designado</label>
                  <select
                    value={formOs.tecnico_responsavel_id}
                    onChange={(e) => setFormOs({ ...formOs, tecnico_responsavel_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">Selecione o Técnico</option>
                    {tecnicos.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Depósito para Peças</label>
                  <select
                    value={formOs.deposito_saida_id}
                    onChange={(e) => setFormOs({ ...formOs, deposito_saida_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Equipamento / Máquina *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ar Condicionado Split 24000 BTUs"
                    value={formOs.equipamento_descricao}
                    onChange={(e) => setFormOs({ ...formOs, equipamento_descricao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Prioridade</label>
                  <select
                    value={formOs.prioridade}
                    onChange={(e) => setFormOs({ ...formOs, prioridade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="BAIXA">Baixa (72h)</option>
                    <option value="NORMAL">Normal (24h)</option>
                    <option value="ALTA">Alta (12h)</option>
                    <option value="URGENTE">Urgente (6h)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Manutenção</label>
                  <select
                    value={formOs.tipo_manutencao}
                    onChange={(e) => setFormOs({ ...formOs, tipo_manutencao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva (PMOC)</option>
                    <option value="INSTALACAO">Instalação</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Defeito Reclamado *</label>
                  <textarea
                    required
                    rows="3"
                    value={formOs.defeito_reclamado}
                    onChange={(e) => setFormOs({ ...formOs, defeito_reclamado: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovaOs(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Registrar Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes e Operação de Campo */}
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
              {/* SLA & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span className="font-bold text-indigo-400">{osSelecionada.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Prioridade:</span>
                  <span className="font-bold text-white">{osSelecionada.prioridade}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SLA Resolução:</span>
                  <span className="font-mono text-emerald-400">{osSelecionada.prazo_sla_resolucao ? new Date(osSelecionada.prazo_sla_resolucao).toLocaleString('pt-BR') : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total OS:</span>
                  <span className="font-mono font-bold text-emerald-400">R$ {parseFloat(osSelecionada.valor_total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Galeria de Evidências Fotográficas */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-indigo-400" /> Evidências Fotográficas (Antes / Depois)
                  </h3>
                  {osSelecionada.status !== 'CONCLUIDA' && (
                    <button
                      type="button"
                      onClick={() => setModalFoto(true)}
                      className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" /> Anexar Foto
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {osSelecionada.fotos?.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                      Nenhuma foto de evidência anexada.
                    </div>
                  ) : (
                    osSelecionada.fotos?.map((f) => (
                      <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group">
                        <img src={f.url_arquivo} alt="Evidência" className="h-24 w-full object-cover" />
                        <div className="p-1.5 text-[10px] flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${f.tipo_etapa === 'ANTES' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                            {f.tipo_etapa}
                          </span>
                          <span className="text-slate-500 font-mono">{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Laudo e Assinatura se Concluída */}
              {osSelecionada.status === 'CONCLUIDA' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <span className="text-slate-500 block font-bold mb-1">Laudo / Serviço Executado:</span>
                    <p className="text-slate-200">{osSelecionada.servico_executado}</p>
                  </div>
                  <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-slate-500 block font-bold">Aceite Coletado (MP 2.200-2):</span>
                      <div className="text-white font-semibold">{osSelecionada.nome_responsavel_recebimento}</div>
                      <span className="text-[10px] text-slate-500 font-mono block">Hash SHA-256: {osSelecionada.hash_assinatura_sha256?.substring(0, 24)}...</span>
                    </div>
                    {osSelecionada.assinatura_cliente_base64 && (
                      <img src={osSelecionada.assinatura_cliente_base64} alt="Assinatura" className="h-14 bg-white rounded p-1" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
              {osSelecionada.status !== 'CONCLUIDA' ? (
                <button
                  type="button"
                  onClick={() => {
                    setLaudoTecnico('');
                    setNomeResponsavel(osSelecionada.cliente?.nome_razao_social || '');
                    setItensUsados([]);
                    setModalConcluir(true);
                  }}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <PenTool className="h-4 w-4" /> Finalizar OS & Assinar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" /> Imprimir Laudo
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalDetalhes(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium text-xs cursor-pointer"
              >
                Fechar
              </button>
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
                <PenTool className="h-5 w-5 text-emerald-400" />
                Laudo Técnico & Assinatura do Cliente
              </h2>
              <button type="button" onClick={() => setModalConcluir(false)} className="p-1 cursor-pointer"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleConcluirOs} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Laudo Técnico dos Serviços Executados *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Descreva detalhadamente o que foi corrigido ou instalado..."
                  value={laudoTecnico}
                  onChange={(e) => setLaudoTecnico(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              {/* Peças Utilizadas */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peças & Insumos Aplicados</label>
                  <button
                    type="button"
                    onClick={() => setItensUsados([...itensUsados, { item_id: '', tipo_item: 'PRODUTO', quantidade: 1, valor_unitario: 0 }])}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    + Adicionar Peça
                  </button>
                </div>
                {itensUsados.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="col-span-7">
                      <select
                        required
                        value={it.item_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const found = itensCatalogo.find(c => c.id === id);
                          const novos = [...itensUsados];
                          novos[idx].item_id = id;
                          novos[idx].valor_unitario = found ? parseFloat(found.preco_venda || 0) : 0;
                          setItensUsados(novos);
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                      >
                        <option value="">Selecione o Insumo/Peça...</option>
                        {itensCatalogo.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={it.quantidade}
                        onChange={(e) => {
                          const novos = [...itensUsados];
                          novos[idx].quantidade = parseFloat(e.target.value) || 1;
                          setItensUsados(novos);
                        }}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-mono text-xs text-emerald-400 font-bold block pt-1">
                        R$ {(it.quantidade * it.valor_unitario).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responsável pelo Aceite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Recebedor *</label>
                  <input
                    type="text"
                    required
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Documento (CPF / RG)</label>
                  <input
                    type="text"
                    value={docResponsavel}
                    onChange={(e) => setDocResponsavel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Canvas de Assinatura Digital */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400">Assinatura na Tela (Touch ou Mouse) *</label>
                  <button type="button" onClick={limparCanvas} className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer">Limpar Traço</button>
                </div>
                <div className="border border-slate-700 bg-white rounded-xl overflow-hidden touch-none">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair block"
                  />
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

      {/* Modal Upload de Fotos */}
      {modalFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-indigo-400" /> Anexar Foto de Evidência
              </h3>
              <button type="button" onClick={() => setModalFoto(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUploadFoto} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Etapa da Foto *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoEtapaFoto('ANTES')}
                    className={`p-2 rounded-lg border font-bold text-center cursor-pointer ${tipoEtapaFoto === 'ANTES' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Antes do Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEtapaFoto('DEPOIS')}
                    className={`p-2 rounded-lg border font-bold text-center cursor-pointer ${tipoEtapaFoto === 'DEPOIS' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Depois do Serviço
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Arquivo de Imagem *</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setArquivoFoto(e.target.files[0])}
                  className="w-full text-slate-300 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Serpentina higienizada"
                  value={descFoto}
                  onChange={(e) => setDescFoto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalFoto(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Enviar Foto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}