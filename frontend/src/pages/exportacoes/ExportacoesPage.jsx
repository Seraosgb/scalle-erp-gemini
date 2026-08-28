import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  FileSpreadsheet, Download, Calendar, CheckCircle2, 
  AlertTriangle, X, FileText, Database, ShieldCheck, DollarSign
} from 'lucide-react';

export default function ExportacoesPage() {
  const [dataInicio, setDataInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10));
  const [dataFim, setDataFim] = useState(new Date().toISOString().substring(0, 10));
  const [formato, setFormato] = useState('DOMINIO');
  const [metricas, setMetricas] = useState(null);
  const [loadingMetricas, setLoadingMetricas] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const carregarMetricas = async () => {
    setLoadingMetricas(true);
    try {
      const res = await api.get('/exportacoes/metricas', {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setMetricas(res.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMetricas(false);
    }
  };

  useEffect(() => {
    carregarMetricas();
  }, [dataInicio, dataFim]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/exportacoes/download', {
        params: { tipo_formato: formato, data_inicio: dataInicio, data_fim: dataFim },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extensao = formato === 'CSV_FINANCEIRO' ? 'csv' : 'txt';
      link.setAttribute('download', `${formato.toLowerCase()}_${dataInicio}_${dataFim}.${extensao}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setFeedback({ tipo: 'sucesso', msg: 'Arquivo contábil gerado e baixado com sucesso!' });
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao gerar arquivo contábil para o período selecionado.' });
    } finally {
      setDownloading(false);
    }
  };

  const formatosDisponiveis = [
    {
      id: 'DOMINIO',
      titulo: 'Domínio Sistemas (Lançamentos Contábeis TXT)',
      descricao: 'Estruturação de partidas dobradas e liquidações de Contas a Pagar/Receber para importação na escrita contábil.',
      icone: FileText,
      badge: 'Contábil'
    },
    {
      id: 'SPED_FISCAL',
      titulo: 'SPED Fiscal ICMS/IPI (Blocos 0, C, E e 9)',
      descricao: 'Arquivo EFD Fiscal oficial com notas autorizadas, catálogo de itens, participantes e apuração de tributos.',
      icone: ShieldCheck,
      badge: 'Fiscal Oficial'
    },
    {
      id: 'CSV_FINANCEIRO',
      titulo: 'Extrato Analítico Financeiro & Livro Caixa (CSV)',
      descricao: 'Planilha analítica com separação de clientes, centros de custo, impostos e conferência bancária.',
      icone: FileSpreadsheet,
      badge: 'Gerencial'
    }
  ];

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-500 shrink-0" />
            Exportações Fiscais & Contábeis
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Ponte de integração para escritórios de contabilidade (SPED, Domínio Sistemas e Livro Caixa)
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl flex items-center justify-between text-xs sm:text-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Cards de Prévia do Período */}
      {metricas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Títulos Liquidados no Período</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">{metricas.total_titulos_liquidados}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Documentos Fiscais Autorizados</span>
            <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">{metricas.total_documentos_fiscais}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-xs text-slate-400 font-semibold block">Volume Financeiro Movimentado</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              R$ {metricas.volume_financeiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Painel de Parametrização e Download */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Calendar className="h-4 w-4 text-indigo-400" /> Parâmetros de Competência & Filtros
        </h2>

        {/* Seleção de Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Data Inicial *</label>
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Data Final *</label>
            <input
              type="date"
              required
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs"
            />
          </div>
        </div>

        {/* Seleção do Formato */}
        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-400">Selecione o Leiaute Contábil / Fiscal Desejado:</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {formatosDisponiveis.map((fmt) => {
              const Icone = fmt.icone;
              const isSelected = formato === fmt.id;
              return (
                <div
                  key={fmt.id}
                  onClick={() => setFormato(fmt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                    isSelected 
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-600/10' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <Icone className="h-5 w-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {fmt.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-xs">{fmt.titulo}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{fmt.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botão de Geração e Download */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Compilando Arquivo...' : 'Gerar & Baixar Arquivo Contábil'}
          </button>
        </div>
      </div>
    </div>
  );
}