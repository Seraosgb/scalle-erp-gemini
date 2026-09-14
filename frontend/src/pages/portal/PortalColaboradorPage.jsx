import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Clock, FileText, Target, MapPin,
  CheckCircle2, AlertTriangle, X, Download, Star
} from 'lucide-react';

export default function PortalColaboradorPage() {
  const [activeTab, setActiveTab] = useState('ponto');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Estados dos Dados
  const [batidasHoje, setBatidasHoje] = useState([]);
  const [holerites, setHolerites] = useState([]);
  const [campanhas, setCampanhas] = useState([]);

  // Estados eNPS
  const [modalEnps, setModalEnps] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState(null);
  const [formResposta, setFormResposta] = useState({ nota: 10, comentario: '' });

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ponto') {
        const res = await api.get('/rh/ponto/hoje');
        setBatidasHoje(res.data?.data || []);
      } else if (activeTab === 'holerites') {
        // Rota blindada: Traz APENAS os holerites deste usuário logado
        const res = await api.get('/rh/holerites/meus');
        setHolerites(res.data?.data || res.data || []);
      } else if (activeTab === 'enps') {
        const res = await api.get('/rh/enps/campanhas');
        const ativas = (res.data?.data || []).filter(c => c.status === 'ATIVA');
        setCampanhas(ativas);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [activeTab]);

  // --- LÓGICA DE DOWNLOAD DO PDF ---
  const handleBaixarHolerite = async (holeriteId, competencia) => {
    try {
      setFeedback({ tipo: 'sucesso', msg: 'Gerando PDF, aguarde...' });

      const res = await api.get(`/rh/holerites/meus/${holeriteId}/pdf`, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Holerite_${competencia.replace('/', '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setFeedback(null);
    } catch (err) {
      // MÁGICA: Se o erro vier em formato de arquivo (Blob), ele converte de volta para texto para lermos!
      if (err.response && err.response.data instanceof Blob) {
        const textError = await err.response.data.text();
        try {
          const jsonError = JSON.parse(textError);
          setFeedback({ tipo: 'erro', msg: jsonError.error?.message || 'Erro ao gerar o arquivo PDF.' });
        } catch (e) {
          setFeedback({ tipo: 'erro', msg: 'Erro fatal no servidor ao gerar o PDF.' });
        }
      } else {
        setFeedback({ tipo: 'erro', msg: 'Falha na comunicação ao tentar baixar o PDF.' });
      }
    }
  };

  // --- LÓGICA DO PONTO COM GPS ---
  const registrarPonto = () => {
    if (!navigator.geolocation) {
      setFeedback({ tipo: 'erro', msg: 'Geolocalização não suportada pelo navegador.' });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const res = await api.post('/rh/ponto/registrar', payload);
        setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message || 'Ponto registrado!' });
        carregarDados();
      } catch (err) {
        setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao registrar ponto.' });
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setLoading(false);
      setFeedback({ tipo: 'erro', msg: 'Permita o acesso à localização para bater o ponto.' });
    });
  };

  // --- LÓGICA DO ENPS ---
  const handleResponderEnps = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/rh/enps/campanhas/${campanhaSelecionada.id}/responder`, formResposta);
      setModalEnps(false);
      setFormResposta({ nota: 10, comentario: '' });
      setFeedback({ tipo: 'sucesso', msg: 'Sua resposta foi enviada anonimamente. Obrigado!' });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erro ao enviar pesquisa.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8 text-center md:text-left">
          <h1 className="text-2xl font-black text-white">Meu Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Serviços e Autoatendimento</p>
        </div>

        {/* Abas Navegação */}
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 mb-6 overflow-x-auto">
          <button onClick={() => setActiveTab('ponto')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'ponto' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            <Clock className="h-4 w-4" /> Ponto Eletrônico
          </button>
          <button onClick={() => setActiveTab('holerites')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'holerites' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            <FileText className="h-4 w-4" /> Holerites
          </button>
          <button onClick={() => setActiveTab('enps')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'enps' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
            <Target className="h-4 w-4" /> Pesquisas
          </button>
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

        {/* CONTEÚDO: PONTO */}
        {activeTab === 'ponto' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
              <div className="w-20 h-20 bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-indigo-500/20">
                <MapPin className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Registro de Ponto</h2>
              <p className="text-sm text-slate-400 mb-6">O registro utiliza o GPS do seu dispositivo para validação legal.</p>

              <button
                onClick={registrarPonto}
                disabled={loading}
                className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-lg rounded-2xl transition shadow-xl shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? 'Obtendo Localização...' : 'BATER PONTO AGORA'}
              </button>
            </div>

            <div>
              <h3 className="font-bold text-slate-300 mb-4 px-2">Minhas Batidas de Hoje</h3>
              <div className="space-y-3">
                {batidasHoje.length === 0 ? (
                  <p className="text-sm text-slate-500 px-2">Nenhum registro encontrado hoje.</p>
                ) : (
                  batidasHoje.map(batida => (
                    <div key={batida.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                          <div className="font-bold text-white">{new Date(batida.data_hora_registro).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          <div className="text-xs text-slate-400">{batida.tipo_registro.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded">
                        GPS OK
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO: HOLERITES */}
        {activeTab === 'holerites' && (
          <div className="space-y-4">
            {loading ? <p className="text-center text-slate-500 py-10">Carregando...</p> :
             holerites.length === 0 ? <p className="text-center text-slate-500 py-10">Nenhum holerite disponível.</p> :
             holerites.map(holerite => (
              <div key={holerite.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">Competência: {holerite.competencia}</h3>
                  <p className="text-sm text-slate-400">Líquido a receber: <span className="font-mono text-emerald-400 font-bold">R$ {parseFloat(holerite.valor_liquido).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></p>
                </div>
                <button
                  onClick={() => handleBaixarHolerite(holerite.id, holerite.competencia)}
                  className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition"
                >
                  <Download className="h-4 w-4" /> Baixar PDF
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CONTEÚDO: eNPS */}
        {activeTab === 'enps' && (
          <div className="space-y-4">
            <div className="bg-indigo-950/50 border border-indigo-900/50 p-4 rounded-2xl mb-6 text-sm text-indigo-200">
              <Star className="h-5 w-5 inline mr-2 text-indigo-400" />
              Sua opinião importa! As pesquisas de clima são <strong>100% anônimas</strong> e protegidas pelo sistema.
            </div>
            {loading ? <p className="text-center text-slate-500 py-10">Carregando...</p> :
             campanhas.length === 0 ? <p className="text-center text-slate-500 py-10">Nenhuma pesquisa ativa no momento.</p> :
             campanhas.map(campanha => (
              <div key={campanha.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{campanha.titulo}</h3>
                  <p className="text-xs text-slate-400 font-mono">Encerra em: {campanha.data_fim}</p>
                </div>
                <button
                  onClick={() => { setCampanhaSelecionada(campanha); setModalEnps(true); }}
                  className="w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
                >
                  Responder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL RESPONDER eNPS */}
      {modalEnps && campanhaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-indigo-600 p-6 text-center">
              <h2 className="font-black text-white text-xl mb-1">Pesquisa de Clima</h2>
              <p className="text-indigo-200 text-sm">Sua resposta é segura e anônima.</p>
            </div>
            <form onSubmit={handleResponderEnps} className="p-6 space-y-6">
              <div className="text-center">
                <label className="block text-sm font-bold text-slate-300 mb-4">Em uma escala de 0 a 10, o quanto você recomendaria a empresa como um bom lugar para se trabalhar?</label>
                <input
                  type="number" required min="0" max="10"
                  value={formResposta.nota}
                  onChange={e => setFormResposta({...formResposta, nota: parseInt(e.target.value)})}
                  className="w-24 text-center px-2 py-3 bg-slate-950 border-2 border-indigo-500 rounded-xl text-white text-3xl font-black mx-auto block focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Por que você deu essa nota? (Opcional)</label>
                <textarea
                  rows="3"
                  value={formResposta.comentario}
                  onChange={e => setFormResposta({...formResposta, comentario: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Deixe sua sugestão ou elogio..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalEnps(false)} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20">Enviar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
