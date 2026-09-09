import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Clock, MapPin, CheckCircle2, AlertTriangle,
  X, Fingerprint, LogIn, LogOut, Coffee
} from 'lucide-react';

export default function PontoEletronicoPage() {
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [batidas, setBatidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega o histórico do dia
  const carregarHistorico = async () => {
    try {
      const res = await api.get('/rh/ponto/hoje');
      setBatidas(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar batidas de hoje', err);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const formatarTipo = (tipo) => {
    const tipos = {
      'ENTRADA': { label: 'Entrada', cor: 'text-emerald-400', icone: LogIn },
      'SAIDA_INTERVALO': { label: 'Saída Almoço', cor: 'text-amber-400', icone: Coffee },
      'RETORNO_INTERVALO': { label: 'Retorno Almoço', cor: 'text-indigo-400', icone: LogIn },
      'SAIDA': { label: 'Saída Final', cor: 'text-rose-400', icone: LogOut },
      'ENTRADA_EXTRA': { label: 'Entrada Extra', cor: 'text-purple-400', icone: LogIn },
      'SAIDA_EXTRA': { label: 'Saída Extra', cor: 'text-rose-400', icone: LogOut },
    };
    return tipos[tipo] || { label: tipo, cor: 'text-slate-400', icone: Clock };
  };

  const handleBaterPonto = () => {
    setFeedback(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setFeedback({ tipo: 'erro', msg: 'Seu navegador não suporta geolocalização. Use um dispositivo compatível.' });
      setLoading(false);
      return;
    }

    // Captura as coordenadas com alta precisão
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await api.post('/rh/ponto/registrar', { latitude, longitude });
          setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
          carregarHistorico();
        } catch (err) {
          setFeedback({
            tipo: 'erro',
            msg: err.response?.data?.error?.message || 'Erro ao comunicar com o servidor.'
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        let msg = 'Erro desconhecido ao obter GPS.';
        if (error.code === 1) msg = 'Permissão de localização negada! Habilite o GPS no seu navegador para bater o ponto.';
        if (error.code === 2) msg = 'Sinal de GPS indisponível no momento.';
        if (error.code === 3) msg = 'Tempo limite esgotado ao buscar o GPS.';

        setFeedback({ tipo: 'erro', msg });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto text-slate-200 min-h-[85vh] flex flex-col justify-center">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <Fingerprint className="h-8 w-8 text-indigo-500" />
          PONTO ELETRÔNICO
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 flex items-center justify-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> Controle de Jornada Georreferenciado (Portaria 671/2021)
        </p>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm mb-6 ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
            <span className="font-medium">{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Relógio e Botão Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">

        {/* Efeito de Fundo */}
        <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="text-5xl sm:text-7xl font-black font-mono text-white tracking-widest drop-shadow-md mb-2 z-10">
          {horaAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-sm sm:text-base text-slate-400 font-medium uppercase tracking-widest mb-10 z-10">
          {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleBaterPonto}
          className="relative group w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] cursor-pointer z-10"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
          ) : (
            <>
              <Fingerprint className="h-16 w-16 text-white group-hover:scale-110 transition-transform duration-300" />
              <span className="text-white font-black text-xl tracking-wide uppercase">Registrar</span>
            </>
          )}
        </button>
      </div>

      {/* Resumo do Dia */}
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-slate-800 pb-2">
          Suas Batidas de Hoje
        </h3>

        {batidas.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-4 italic">
            Nenhum registro encontrado hoje.
          </div>
        ) : (
          <div className="space-y-3">
            {batidas.map((b) => {
              const info = formatarTipo(b.tipo_registro);
              const Icone = info.icone;
              return (
                <div key={b.id} className="flex items-center justify-between bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-900 ${info.cor} border border-slate-800`}>
                      <Icone className="h-5 w-5" />
                    </div>
                    <div>
                      <span className={`text-xs font-bold block uppercase tracking-wider ${info.cor}`}>{info.label}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> GPS Registrado
                      </span>
                    </div>
                  </div>
                  <div className="text-xl font-black font-mono text-white tracking-widest">
                    {new Date(b.data_hora_registro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
