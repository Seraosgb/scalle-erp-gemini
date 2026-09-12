import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Briefcase, Plus, Users, CheckCircle2, AlertTriangle,
  X, GripVertical, ChevronRight
} from 'lucide-react';

export default function RecrutamentoPage() {
  const [vagas, setVagas] = useState([]);
  const [vagaSelecionada, setVagaSelecionada] = useState(null);
  const [kanban, setKanban] = useState({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modais
  const [modalVaga, setModalVaga] = useState(false);
  const [modalCandidato, setModalCandidato] = useState(false);

  // Formulários
  const [formVaga, setFormVaga] = useState({ titulo: '', departamento: '', descricao: '' });
  const [formCandidato, setFormCandidato] = useState({ nome: '', email: '', telefone: '' });

  // Definição das colunas (Poderá vir da tabela de domínio no futuro)
  const colunasKanban = [
    { id: 'NOVO', titulo: 'Novos', cor: 'border-slate-500' },
    { id: 'TRIAGEM', titulo: 'Triagem', cor: 'border-indigo-500' },
    { id: 'ENTREVISTA', titulo: 'Entrevista', cor: 'border-purple-500' },
    { id: 'TESTE', titulo: 'Teste Técnico', cor: 'border-amber-500' },
    { id: 'PROPOSTA', titulo: 'Proposta', cor: 'border-blue-500' },
    { id: 'CONTRATADO', titulo: 'Contratado', cor: 'border-emerald-500' },
    { id: 'REPROVADO', titulo: 'Reprovado', cor: 'border-rose-500' }
  ];

  const carregarVagas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rh/vagas');
      setVagas(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarKanban = async (vagaId) => {
    try {
      const res = await api.get(`/rh/vagas/${vagaId}/kanban`);
      setVagaSelecionada(res.data?.data?.vaga);
      setKanban(res.data?.data?.kanban || {});
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { carregarVagas(); }, []);

  const handleSalvarVaga = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rh/vagas', formVaga);
      setModalVaga(false);
      setFormVaga({ titulo: '', departamento: '', descricao: '' });
      setFeedback({ tipo: 'sucesso', msg: 'Vaga aberta com sucesso!' });
      carregarVagas();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao abrir vaga.' });
    }
  };

  const handleSalvarCandidato = async (e) => {
    e.preventDefault();
    if (!vagaSelecionada) return;
    try {
      await api.post('/rh/candidatos', { ...formCandidato, vaga_id: vagaSelecionada.id });
      setModalCandidato(false);
      setFormCandidato({ nome: '', email: '', telefone: '' });
      carregarKanban(vagaSelecionada.id);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erro ao adicionar candidato.');
    }
  };

  // --- Lógica Drag & Drop (Arrastar e Soltar) ---
  const onDragStart = (e, candidatoId, etapaOrigem) => {
    e.dataTransfer.setData('candidatoId', candidatoId);
    e.dataTransfer.setData('etapaOrigem', etapaOrigem);
  };

  const onDragOver = (e) => {
    e.preventDefault(); // Necessário para permitir o Drop
  };

  const onDrop = async (e, etapaDestino) => {
    const candidatoId = e.dataTransfer.getData('candidatoId');
    const etapaOrigem = e.dataTransfer.getData('etapaOrigem');

    if (etapaOrigem === etapaDestino) return;

    // Atualização Otimista na UI (Move o card antes da API responder para ficar fluido)
    const novosDados = { ...kanban };
    const candidato = novosDados[etapaOrigem].find(c => c.id === candidatoId);
    novosDados[etapaOrigem] = novosDados[etapaOrigem].filter(c => c.id !== candidatoId);
    if (!novosDados[etapaDestino]) novosDados[etapaDestino] = [];
    novosDados[etapaDestino].push({ ...candidato, etapa_kanban: etapaDestino });
    setKanban(novosDados);

    try {
      await api.put(`/rh/candidatos/${candidatoId}/mover`, { nova_etapa: etapaDestino });
    } catch (err) {
      console.error(err);
      carregarKanban(vagaSelecionada.id); // Reverte se der erro no servidor
      alert('Erro ao mover candidato.');
    }
  };

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col text-slate-200">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" /> Recrutamento & Seleção
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Funil de talentos e vagas</p>
        </div>
        <button
          onClick={() => setModalVaga(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-500/30"
        >
          <Plus className="h-4 w-4" /> Nova Vaga
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm mb-4 shrink-0 ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium">{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Grid Principal: Lista de Vagas vs Kanban */}
      <div className="flex gap-6 flex-1 overflow-hidden">

        {/* Painel Esquerdo: Lista de Vagas */}
        <div className="w-1/4 min-w-[250px] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 font-bold text-slate-300 flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Vagas Abertas
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <p className="text-center text-slate-500 text-xs py-4">Carregando...</p>
            ) : vagas.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-4">Nenhuma vaga ativa.</p>
            ) : (
              vagas.map(v => (
                <button
                  key={v.id}
                  onClick={() => carregarKanban(v.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${vagaSelecionada?.id === v.id ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="font-bold text-sm text-white truncate">{v.titulo}</div>
                  <div className="text-xs text-slate-500 mt-1">{v.departamento}</div>
                  <div className="mt-2 text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded w-fit">
                    {v.candidatos_count || 0} candidatos
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Painel Direito: Board Kanban */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          {!vagaSelecionada ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Users className="h-12 w-12 mb-3 opacity-20" />
              <p>Selecione uma vaga para visualizar o funil</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="font-bold text-white text-lg">{vagaSelecionada.titulo}</h2>
                  <p className="text-xs text-slate-400">Departamento: {vagaSelecionada.departamento}</p>
                </div>
                <button
                  onClick={() => setModalCandidato(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" /> Adicionar Candidato
                </button>
              </div>

              {/* Colunas do Kanban */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-4 items-start">
                {colunasKanban.map(coluna => (
                  <div
                    key={coluna.id}
                    className={`w-72 shrink-0 flex flex-col max-h-full bg-slate-950/50 rounded-xl border-t-4 ${coluna.cor} border-x border-b border-x-slate-800 border-b-slate-800 shadow-sm`}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, coluna.id)}
                  >
                    <div className="p-3 border-b border-slate-800/60 font-bold text-xs uppercase text-slate-300 flex justify-between items-center shrink-0">
                      {coluna.titulo}
                      <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                        {kanban[coluna.id]?.length || 0}
                      </span>
                    </div>

                    {/* Lista de Cards (Arrastáveis) */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[150px]">
                      {(kanban[coluna.id] || []).map(c => (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, c.id, coluna.id)}
                          className="bg-slate-900 border border-slate-700 hover:border-indigo-500/50 p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing group transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white text-sm leading-tight">{c.nome}</h3>
                            <GripVertical className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono space-y-1">
                            {c.telefone && <div>📞 {c.telefone}</div>}
                            {c.email && <div className="truncate">✉️ {c.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL NOVA VAGA */}
      {modalVaga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="font-bold text-white">Nova Vaga</h2>
              <button onClick={() => setModalVaga(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSalvarVaga} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Título da Vaga *</label>
                <input type="text" required value={formVaga.titulo} onChange={e => setFormVaga({...formVaga, titulo: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" placeholder="Ex: Desenvolvedor Senior" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Departamento *</label>
                <input type="text" required value={formVaga.departamento} onChange={e => setFormVaga({...formVaga, departamento: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" placeholder="Ex: Engenharia" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Descrição</label>
                <textarea rows="3" value={formVaga.descricao} onChange={e => setFormVaga({...formVaga, descricao: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-sm">Abrir Vaga</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO CANDIDATO */}
      {modalCandidato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="font-bold text-white">Novo Candidato</h2>
              <button onClick={() => setModalCandidato(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSalvarCandidato} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome Completo *</label>
                <input type="text" required value={formCandidato.nome} onChange={e => setFormCandidato({...formCandidato, nome: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">E-mail</label>
                <input type="email" value={formCandidato.email} onChange={e => setFormCandidato({...formCandidato, email: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input type="text" value={formCandidato.telefone} onChange={e => setFormCandidato({...formCandidato, telefone: e.target.value})} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono" />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-sm">Adicionar ao Funil</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
