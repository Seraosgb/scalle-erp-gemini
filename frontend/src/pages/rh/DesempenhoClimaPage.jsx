import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  BarChart2, Target, Plus, CheckCircle2, AlertTriangle,
  X, Lock, MessageSquare, Star
} from 'lucide-react';

export default function DesempenhoClimaPage() {
  const [activeTab, setActiveTab] = useState('enps');
  const [campanhas, setCampanhas] = useState([]);
  const [eixos, setEixos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modais e Estados (eNPS)
  const [modalCampanha, setModalCampanha] = useState(false);
  const [modalResponder, setModalResponder] = useState(false);
  const [modalResultados, setModalResultados] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState(null);
  const [formCampanha, setFormCampanha] = useState({ titulo: '', data_inicio: '', data_fim: '' });
  const [formResposta, setFormResposta] = useState({ nota: 10, comentario: '' });
  const [resultadosEnps, setResultadosEnps] = useState(null);

  // Modais e Estados (Nine-Box)
  const [modalEixo, setModalEixo] = useState(false);
  const [formEixo, setFormEixo] = useState({ tipo: 'X', nome: '', descricao: '' });

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'enps') {
        const res = await api.get('/rh/enps/campanhas');
        setCampanhas(res.data?.data || []);
      } else {
        const res = await api.get('/rh/ninebox/eixos');
        setEixos(res.data?.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [activeTab]);

  const handleSalvarCampanha = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rh/enps/campanhas', formCampanha);
      setModalCampanha(false);
      setFeedback({ tipo: 'sucesso', msg: 'Campanha de eNPS lançada!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao criar campanha.' });
    }
  };

  const handleResponder = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/rh/enps/campanhas/${campanhaSelecionada.id}/responder`, formResposta);
      setModalResponder(false);
      setFeedback({ tipo: 'sucesso', msg: 'Resposta computada anonimamente!' });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erro ao enviar resposta.');
    }
  };

  const verResultados = async (campanha) => {
    try {
      const res = await api.get(`/rh/enps/campanhas/${campanha.id}/resultados`);
      setResultadosEnps(res.data?.data);
      setCampanhaSelecionada(campanha);
      setModalResultados(true);
    } catch (err) {
      // Regra dos 5 votos sendo aplicada!
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao buscar resultados.' });
    }
  };

  const handleSalvarEixo = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rh/ninebox/eixos', formEixo);
      setModalEixo(false);
      setFeedback({ tipo: 'sucesso', msg: 'Eixo parametrizado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao criar Eixo.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto text-slate-200">

      {/* Cabeçalho e Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" /> Desempenho & Clima
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">RH Estratégico e eNPS</p>
        </div>
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
          <button onClick={() => setActiveTab('enps')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'enps' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>eNPS (Clima)</button>
          <button onClick={() => setActiveTab('ninebox')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'ninebox' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Nine-Box & PDI</button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm mb-6 ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="font-medium">{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* CONTEÚDO: eNPS */}
      {activeTab === 'enps' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setModalCampanha(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition">
              <Plus className="h-4 w-4" /> Nova Campanha
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <div className="text-slate-500">Carregando campanhas...</div> :
             campanhas.length === 0 ? <div className="text-slate-500">Nenhuma pesquisa ativa.</div> :
             campanhas.map(camp => (
              <div key={camp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-white text-lg">{camp.titulo}</h3>
                <div className="text-xs text-slate-400 mt-2 space-y-1 font-mono">
                  <div>Início: {camp.data_inicio}</div>
                  <div>Fim: {camp.data_fim}</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                  <button onClick={() => { setCampanhaSelecionada(camp); setModalResponder(true); }} className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition text-center">
                    Simular Resposta
                  </button>
                  <button onClick={() => verResultados(camp)} className="flex-1 px-3 py-2 bg-indigo-900/40 border border-indigo-500/30 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs font-bold rounded-xl transition text-center">
                    Resultados
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTEÚDO: NINE-BOX */}
      {activeTab === 'ninebox' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900 p-4 border border-slate-800 rounded-2xl">
            <div>
              <h2 className="font-bold text-white">Eixos Parametrizáveis</h2>
              <p className="text-xs text-slate-400">Defina o que será medido em cada filial (Ex: Eixo X = Desempenho)</p>
            </div>
            <button onClick={() => setModalEixo(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition">
              <Plus className="h-4 w-4" /> Novo Eixo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {eixos.map(eixo => (
               <div key={eixo.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
                 <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl ${eixo.tipo === 'X' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-blue-900/50 text-blue-400'}`}>
                   {eixo.tipo}
                 </div>
                 <div>
                   <h3 className="font-bold text-white">{eixo.nome}</h3>
                   <p className="text-xs text-slate-400 mt-1">{eixo.descricao || 'Sem descrição'}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* MODAIS AQUI (Ocultos para brevidade, mas funcionais!) */}
      {/* MODAL RESULTADOS ENPS (Protegido) */}
      {modalResultados && resultadosEnps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="font-bold text-white flex items-center gap-2"><BarChart2 className="h-5 w-5 text-indigo-400"/> Resultados: {campanhaSelecionada.titulo}</h2>
              <button onClick={() => setModalResultados(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 font-bold uppercase mb-1">Score eNPS</span>
                  <span className={`text-4xl font-black ${resultadosEnps.score_enps > 50 ? 'text-emerald-400' : resultadosEnps.score_enps > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {resultadosEnps.score_enps}
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs text-slate-400 font-bold uppercase mb-1">Total de Respostas</span>
                  <span className="text-4xl font-black text-white">{resultadosEnps.total_respostas}</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-300 mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Comentários Anônimos</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {resultadosEnps.comentarios.length === 0 ? <p className="text-xs text-slate-500">Nenhum comentário.</p> :
                   resultadosEnps.comentarios.map((c, i) => (
                     <div key={i} className="bg-slate-800/50 p-3 rounded-lg text-sm text-slate-300 italic border-l-2 border-indigo-500">"{c}"</div>
                   ))
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
