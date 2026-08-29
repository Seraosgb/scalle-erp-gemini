import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Wrench, CheckCircle2, QrCode, Copy, ShieldCheck, MapPin, 
  Calendar, FileText, Camera, Check, AlertTriangle, UserCheck
} from 'lucide-react';

export default function PortalOsPage() {
  const { token } = useParams();
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Assinatura Canvas
  const [nomeAssinante, setNomeAssinante] = useState('');
  const [docAssinante, setDocAssinante] = useState('');
  const [isDesenhando, setIsDesenhando] = useState(false);
  const [geoLoc, setGeoLoc] = useState({ lat: null, lng: null });
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);

  const canvasRef = useRef(null);

  useEffect(() => {
    carregarOs();
    // Captura geolocalização para metadados da assinatura
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeoLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Geolocalização opcional não autorizada.')
      );
    }
  }, [token]);

  const carregarOs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/portal/os/${token}`);
      setOs(res.data?.data);
    } catch (err) {
      setErro(err.response?.data?.error?.message || 'Ordem de Serviço não localizada ou link expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarOrcamento = async () => {
    try {
      await axios.post(`/api/portal/os/${token}/aprovar`);
      setFeedback({ tipo: 'sucesso', msg: 'Orçamento aprovado com sucesso! A equipe técnica foi notificada.' });
      carregarOs();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Falha ao aprovar orçamento.' });
    }
  };

  const copiarPix = () => {
    if (os?.pix?.payload_copia_cola) {
      navigator.clipboard.writeText(os.pix.payload_copia_cola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  // Funções do Canvas de Assinatura
  const iniciarDesenho = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDesenhando(true);
  };

  const desenhar = (e) => {
    if (!isDesenhando) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const pararDesenho = () => {
    setIsDesenhando(false);
  };

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSalvarAssinatura = async (e) => {
    e.preventDefault();
    if (!nomeAssinante.trim()) {
      alert('Por favor, informe seu nome completo.');
      return;
    }

    const canvas = canvasRef.current;
    const assinaturaBase64 = canvas.toDataURL('image/png');

    setSalvandoAssinatura(true);
    try {
      await axios.post(`/api/portal/os/${token}/assinar`, {
        nome_responsavel: nomeAssinante,
        documento_responsavel: docAssinante,
        assinatura_base64: assinaturaBase64,
        latitude: geoLoc.lat,
        longitude: geoLoc.lng,
      });

      setFeedback({ tipo: 'sucesso', msg: 'Assinatura digital gravada com validade jurídica confirmada!' });
      carregarOs();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao registrar assinatura digital.' });
    } finally {
      setSalvandoAssinatura(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-slate-400 text-sm">Carregando Ordem de Serviço...</div>
      </div>
    );
  }

  if (erro || !os) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-white font-bold text-base">Acesso Não Autorizado</h2>
          <p className="text-xs text-slate-400">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-6 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Cabeçalho da Empresa */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-400" />
              {os.empresa?.nome || 'Scalle ERP'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Laudo Técnico & Autoatendimento de Ordem de Serviço</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              OS #{os.numero_os}
            </span>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
          }`}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* Detalhes do Equipamento e Defeito */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-400" /> Dados do Equipamento & Diagnóstico
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Equipamento / Descrição</span>
              <strong className="text-white block mt-0.5">{os.equipamento}</strong>
              <span className="text-slate-400 text-[11px] block mt-1">Marca/Modelo: {os.marca_modelo || '-'}</span>
              <span className="text-slate-400 text-[11px] block">Nº de Série: {os.numero_serie || '-'}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">Defeito Relatado</span>
              <p className="text-slate-300 mt-0.5">{os.defeito_reclamado}</p>
              {os.diagnostico_tecnico && (
                <div className="mt-2 pt-2 border-t border-slate-900">
                  <span className="text-indigo-400 font-bold block text-[10px]">Parecer Técnico:</span>
                  <p className="text-slate-300 text-[11px]">{os.diagnostico_tecnico}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evidências Fotográficas */}
        {os.fotos && os.fotos.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-indigo-400" /> Evidências Fotográficas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {os.fotos.map((f) => (
                <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <img src={f.url_arquivo} alt={f.descricao} className="w-full h-32 object-cover" />
                  <div className="p-2 text-[10px] text-slate-400 truncate">
                    <span className="font-bold text-white uppercase block">{f.tipo_etapa}</span>
                    {f.descricao}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo Financeiro & Pagamento PIX */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo Financeiro & Pagamento</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Serviços / Mão de Obra:</span>
                <span className="font-mono text-white">R$ {os.valor_servicos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Peças e Materiais:</span>
                <span className="font-mono text-white">R$ {os.valor_pecas.toFixed(2)}</span>
              </div>
              {os.valor_desconto > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Desconto Aplicado:</span>
                  <span className="font-mono">- R$ {os.valor_desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Valor Total da OS:</span>
                <span className="font-mono text-emerald-400 text-base">R$ {os.valor_total.toFixed(2)}</span>
              </div>

              {os.status === 'ABERTA' && (
                <button
                  type="button"
                  onClick={handleAprovarOrcamento}
                  className="w-full mt-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-indigo-600/30 transition"
                >
                  Aprovar Orçamento e Iniciar Execução
                </button>
              )}
            </div>

            {/* QR Code PIX */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-center">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <QrCode className="h-4 w-4 text-emerald-400" /> Pague com PIX Instantâneo
              </span>
              <img 
                src={os.pix?.qr_code_url} 
                alt="QR Code PIX" 
                className="w-36 h-36 rounded-lg bg-white p-1.5 shadow-md"
              />
              <button
                type="button"
                onClick={copiarPix}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-indigo-400" />}
                {copiado ? 'Chave Copiada!' : 'Copiar Chave PIX'}
              </button>
            </div>
          </div>
        </div>

        {/* Assinatura Digital do Cliente */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Assinatura Digital & Aceite do Laudo</h2>
              <span className="text-[10px] text-slate-400">Assinatura eletrônica com validade jurídica (MP nº 2.200-2/2001)</span>
            </div>
          </div>

          {os.assinatura_cliente_base64 ? (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <UserCheck className="h-4 w-4" /> Laudo Assinado por: {os.nome_responsavel_recebimento}
              </div>
              <img src={os.assinatura_cliente_base64} alt="Assinatura" className="h-20 bg-white p-2 rounded-lg" />
              <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-1">
                <div>Data/Hora: {new Date(os.assinado_em).toLocaleString('pt-BR')}</div>
                <div className="truncate">Hash SHA-256: {os.hash_assinatura_sha256}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSalvarAssinatura} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nome Completo do Responsável *</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={nomeAssinante}
                    onChange={(e) => setNomeAssinante(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">CPF ou Documento (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 000.000.000-00"
                    value={docAssinante}
                    onChange={(e) => setDocAssinante(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-semibold">Desenhe sua assinatura abaixo:</label>
                  <button type="button" onClick={limparCanvas} className="text-rose-400 text-[10px] hover:underline cursor-pointer">
                    Limpar
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  onMouseDown={iniciarDesenho}
                  onMouseMove={desenhar}
                  onMouseUp={pararDesenho}
                  onTouchStart={iniciarDesenho}
                  onTouchMove={desenhar}
                  onTouchEnd={pararDesenho}
                  className="w-full h-36 bg-white rounded-xl border border-slate-700 cursor-crosshair touch-none shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={salvandoAssinatura}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition"
              >
                {salvandoAssinatura ? 'Registrando...' : 'Confirmar Assinatura Digital do Laudo'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}