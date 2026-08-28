import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Boxes, Plus, Search, ArrowRightLeft, Upload, CheckCircle2, 
  AlertTriangle, X, Check, TrendingUp, Warehouse, Package, MapPin
} from 'lucide-react';

export default function WmsPage() {
  const [abaAtiva, setAbaAtiva] = useState('saldos'); // 'saldos' | 'transferencias' | 'depositos' | 'abc'
  const [saldos, setSaldos] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [itens, setItens] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [curvaAbc, setCurvaAbc] = useState({ valor_total_saidas_90d: 0, itens: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [depositoFiltro, setDepositoFiltro] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Modais
  const [modalAjuste, setModalAjuste] = useState(false);
  const [modalTransf, setModalTransf] = useState(false);
  const [modalConferir, setModalConferir] = useState(false);
  const [modalXml, setModalXml] = useState(false);
  const [modalNovoDeposito, setModalNovoDeposito] = useState(false);
  const [transfSelecionada, setTransfSelecionada] = useState(null);

  // Formulários
  const [formAjuste, setFormAjuste] = useState({ 
    deposito_id: '', 
    item_id: '', 
    novo_saldo: '', 
    motivo: 'Inventário Físico', 
    lote: '', 
    data_validade: '',
    localizacao_rua: '',
    localizacao_predio: ''
  });
  const [formTransf, setFormTransf] = useState({ deposito_origem_id: '', deposito_destino_id: '', item_id: '', quantidade: '', modalidade: 'EM_TRANSITO', lote: '', observacoes: '' });
  const [formConferencia, setFormConferencia] = useState({ quantidade_recebida: '', motivo_divergencia: '' });
  const [formDeposito, setFormDeposito] = useState({ nome: '', codigo: '', descricao: '', is_padrao: false });
  const [arquivoXml, setArquivoXml] = useState(null);
  const [depositoXml, setDepositoXml] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resSaldos, resDeps, resItens, resTransfs, resAbc] = await Promise.all([
        api.get('/wms/saldos', { params: { search, deposito_id: depositoFiltro } }),
        api.get('/wms/depositos'),
        api.get('/itens'),
        api.get('/wms/transferencias').catch(() => ({ data: { data: [] } })),
        api.get('/wms/curva-abc').catch(() => ({ data: { data: { valor_total_saidas_90d: 0, itens: [] } } }))
      ]);

      const rawSaldos = resSaldos.data?.data;
      setSaldos(Array.isArray(rawSaldos) ? rawSaldos : (rawSaldos?.data || []));

      const deps = resDeps.data?.data || [];
      setDepositos(deps);

      const rawItens = resItens.data?.data;
      setItens(Array.isArray(rawItens) ? rawItens : (rawItens?.data || []));

      setTransferencias(resTransfs.data?.data || []);
      setCurvaAbc(resAbc.data?.data || { valor_total_saidas_90d: 0, itens: [] });

      if (deps.length > 0 && !depositoXml) {
        setDepositoXml(deps[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search, depositoFiltro]);

  const handleSalvarAjuste = async (e) => {
    e.preventDefault();
    try {
      await api.post('/wms/ajustar-saldo', formAjuste);
      setModalAjuste(false);
      setFeedback({ tipo: 'sucesso', msg: 'Saldo ajustado e endereçamento logístico gravado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao ajustar saldo.' });
    }
  };

  const handleSalvarTransferencia = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/wms/transferir', formTransf);
      setModalTransf(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao realizar transferência.' });
    }
  };

  const handleConferirTransferencia = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/wms/transferencias/${transfSelecionada.id}/conferir`, formConferencia);
      setModalConferir(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao conferir transferência.' });
    }
  };

  const handleSalvarDeposito = async (e) => {
    e.preventDefault();
    try {
      await api.post('/wms/depositos', formDeposito);
      setModalNovoDeposito(false);
      setFormDeposito({ nome: '', codigo: '', descricao: '', is_padrao: false });
      setFeedback({ tipo: 'sucesso', msg: 'Almoxarifado cadastrado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao cadastrar depósito.' });
    }
  };

  const handleUploadXml = async (e) => {
    e.preventDefault();
    if (!arquivoXml) return;
    const data = new FormData();
    data.append('xml_file', arquivoXml);
    data.append('deposito_id', depositoXml);

    try {
      const res = await api.post('/itens/importar-xml', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModalXml(false);
      setFeedback({ tipo: 'sucesso', msg: res.data.data.message });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Falha na importação do XML.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Warehouse className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Almoxarifado & WMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Múltiplos depósitos, transferências em trânsito, FEFO, Lotes e Curva ABC
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalNovoDeposito(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition"
          >
            <Plus className="h-4 w-4 text-indigo-400" /> Novo Almoxarifado
          </button>
          <button
            type="button"
            onClick={() => setModalXml(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer transition"
          >
            <Upload className="h-4 w-4 text-indigo-400" /> Importar XML
          </button>
          <button
            type="button"
            onClick={() => {
              setFormTransf({ deposito_origem_id: depositos[0]?.id || '', deposito_destino_id: '', item_id: '', quantidade: '', modalidade: 'EM_TRANSITO', lote: '', observacoes: '' });
              setModalTransf(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 text-xs font-bold cursor-pointer transition"
          >
            <ArrowRightLeft className="h-4 w-4" /> Transferência
          </button>
          <button
            type="button"
            onClick={() => {
              setFormAjuste({ deposito_id: depositos[0]?.id || '', item_id: '', novo_saldo: '', motivo: 'Inventário Físico', lote: '', data_validade: '', localizacao_rua: '', localizacao_predio: '' });
              setModalAjuste(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" /> Ajustar Saldo
          </button>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('saldos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'saldos' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Posições de Estoque
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('transferencias')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'transferencias' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Transferências em Trânsito ({transferencias.filter(t => t.status === 'EM_TRANSITO').length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('depositos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'depositos' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Almoxarifados ({depositos.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('abc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              abaAtiva === 'abc' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Curva ABC (80/15/5)
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={depositoFiltro}
            onChange={(e) => setDepositoFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
          >
            <option value="">Todos os Almoxarifados</option>
            {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar item, SKU, lote..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
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

      {/* Aba 1: Posições de Estoque */}
      {abaAtiva === 'saldos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">ITEM / DESCRIÇÃO</th>
                <th className="py-3 px-4">ALMOXARIFADO</th>
                <th className="py-3 px-4">LOTE / VALIDADE (FEFO)</th>
                <th className="py-3 px-4">ENDEREÇAMENTO LOGÍSTICO</th>
                <th className="py-3 px-4 text-right">SALDO FÍSICO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {saldos.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-slate-500">Nenhum item localizado no catálogo.</td></tr>
              ) : (
                saldos.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{s.item?.nome}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {s.item?.codigo_sku} | UN: {s.item?.unidade_medida}</div>
                    </td>
                    <td className="py-3 px-4 text-indigo-400 font-semibold">{s.deposito?.nome}</td>
                    <td className="py-3 px-4 font-mono">
                      {s.lote ? (
                        <div>
                          <span className="text-slate-200">Lote: {s.lote}</span>
                          {s.data_validade && (
                            <span className="block text-[10px] text-amber-400 font-bold">Val: {new Date(s.data_validade).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">Sem lote</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-indigo-400" />
                      {s.localizacao_rua ? `Rua ${s.localizacao_rua} / Prédio ${s.localizacao_predio || 'P01'}` : 'Não Endereçado'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm font-bold text-emerald-400">
                      {parseFloat(s.quantidade_saldo || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba 2: Transferências em Trânsito */}
      {abaAtiva === 'transferencias' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">ITEM TRANSFERIDO</th>
                <th className="py-3 px-4">ORIGEM ➔ DESTINO</th>
                <th className="py-3 px-4 text-center">QTD ENVIADA</th>
                <th className="py-3 px-4 text-center">QTD RECEBIDA</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {transferencias.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-500">Nenhuma transferência em trânsito.</td></tr>
              ) : (
                transferencias.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium text-white">{t.item?.nome}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="text-rose-400">{t.origem?.nome}</span> ➔ <span className="text-emerald-400 font-bold">{t.destino?.nome}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-white">{parseFloat(t.quantidade_enviada).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">{t.quantidade_recebida !== null ? parseFloat(t.quantidade_recebida).toFixed(2) : '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        t.status === 'DIVERGENCIA' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.status === 'EM_TRANSITO' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransfSelecionada(t);
                            setFormConferencia({ quantidade_recebida: t.quantidade_enviada, motivo_divergencia: '' });
                            setModalConferir(true);
                          }}
                          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                        >
                          Conferir & Receber
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba 3: Almoxarifados Cadastrados */}
      {abaAtiva === 'depositos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">CÓDIGO</th>
                <th className="py-3 px-4">NOME DO ALMOXARIFADO</th>
                <th className="py-3 px-4">DESCRIÇÃO</th>
                <th className="py-3 px-4 text-center">TIPO</th>
                <th className="py-3 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {depositos.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-400">{d.codigo}</td>
                  <td className="py-3 px-4 font-medium text-white">{d.nome}</td>
                  <td className="py-3 px-4 text-slate-400">{d.descricao || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    {d.is_padrao ? (
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold text-[10px]">PADRÃO MATRIZ</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Secundário</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">ATIVO</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aba 4: Curva ABC */}
      {abaAtiva === 'abc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Análise de Giro & Curva ABC (Últimos 90 Dias)</h2>
              <p className="text-xs text-slate-400">Classificação financeira 80% (A), 15% (B) e 5% (C) com indicação de reposição crítica</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-slate-400 block">Total Movimentado:</span>
              <span className="text-base font-bold text-emerald-400">R$ {parseFloat(curvaAbc.valor_total_saidas_90d || 0).toFixed(2)}</span>
            </div>
          </div>

          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-2.5 px-3">CLASSE</th>
                <th className="py-2.5 px-3">ITEM</th>
                <th className="py-2.5 px-3 text-center">SAÍDAS (90D)</th>
                <th className="py-2.5 px-3 text-right">VALOR TOTAL</th>
                <th className="py-2.5 px-3 text-center">SALDO ATUAL</th>
                <th className="py-2.5 px-3 text-center">STATUS REPOSIÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {curvaAbc.itens?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.classe_abc === 'A' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      item.classe_abc === 'B' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      Classe {item.classe_abc}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-white">{item.nome}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{item.quantidade_saidas_90d}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">R$ {item.valor_movimentado_90d.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{item.saldo_atual}</td>
                  <td className="py-2.5 px-3 text-center">
                    {item.status_reposicao === 'CRITICO' ? (
                      <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold animate-pulse">Estoque Baixo</span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajuste de Saldo */}
      {modalAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Plus className="h-4 w-4 text-indigo-400" /> Ajuste Físico de Saldo</h3>
              <button type="button" onClick={() => setModalAjuste(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarAjuste} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Almoxarifado *</label>
                <select required value={formAjuste.deposito_id} onChange={(e) => setFormAjuste({ ...formAjuste, deposito_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Item / Produto *</label>
                <select required value={formAjuste.item_id} onChange={(e) => setFormAjuste({ ...formAjuste, item_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  <option value="">Selecione o Item...</option>
                  {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Novo Saldo Físico *</label>
                  <input type="number" step="0.01" min="0" required value={formAjuste.novo_saldo} onChange={(e) => setFormAjuste({ ...formAjuste, novo_saldo: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Lote</label>
                  <input type="text" placeholder="Ex: LOT-2026" value={formAjuste.lote} onChange={(e) => setFormAjuste({ ...formAjuste, lote: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Rua / Corredor</label>
                  <input type="text" placeholder="Ex: A01" value={formAjuste.localizacao_rua} onChange={(e) => setFormAjuste({ ...formAjuste, localizacao_rua: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Prédio / Estante</label>
                  <input type="text" placeholder="Ex: P02" value={formAjuste.localizacao_predio} onChange={(e) => setFormAjuste({ ...formAjuste, localizacao_predio: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Data de Validade (FEFO)</label>
                <input type="date" value={formAjuste.data_validade} onChange={(e) => setFormAjuste({ ...formAjuste, data_validade: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Motivo do Ajuste</label>
                <input type="text" required value={formAjuste.motivo} onChange={(e) => setFormAjuste({ ...formAjuste, motivo: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalAjuste(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Gravar Ajuste</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Despachar Transferência */}
      {modalTransf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-indigo-400" /> Transferência entre Almoxarifados</h3>
              <button type="button" onClick={() => setModalTransf(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarTransferencia} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Origem *</label>
                  <select required value={formTransf.deposito_origem_id} onChange={(e) => setFormTransf({ ...formTransf, deposito_origem_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Destino *</label>
                  <select required value={formTransf.deposito_destino_id} onChange={(e) => setFormTransf({ ...formTransf, deposito_destino_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="">Selecione...</option>
                    {depositos.filter(d => d.id !== formTransf.deposito_origem_id).map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Item a Transferir *</label>
                <select required value={formTransf.item_id} onChange={(e) => setFormTransf({ ...formTransf, item_id: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  <option value="">Selecione o Item...</option>
                  {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Quantidade *</label>
                  <input type="number" step="0.01" min="0.01" required value={formTransf.quantidade} onChange={(e) => setFormTransf({ ...formTransf, quantidade: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Modalidade *</label>
                  <select value={formTransf.modalidade} onChange={(e) => setFormTransf({ ...formTransf, modalidade: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                    <option value="EM_TRANSITO">Em Trânsito (Exige Conferência)</option>
                    <option value="DIRETO">Direto (Entrada Imediata)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalTransf(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Despachar Transferência</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conferência Cega */}
      {modalConferir && transfSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Conferência Física de Recebimento</h3>
              <button type="button" onClick={() => setModalConferir(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleConferirTransferencia} className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Item: <strong className="text-white">{transfSelecionada.item?.nome}</strong></span>
                <span className="text-slate-400 block">Qtd Despachada: <strong className="text-indigo-400 font-mono">{parseFloat(transfSelecionada.quantidade_enviada).toFixed(2)}</strong></span>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Quantidade Física Conferida *</label>
                <input type="number" step="0.01" min="0" required value={formConferencia.quantidade_recebida} onChange={(e) => setFormConferencia({ ...formConferencia, quantidade_recebida: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-sm font-bold text-emerald-400" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Justificativa em Caso de Divergência</label>
                <textarea rows="2" placeholder="Descreva se faltou ou avariou mercadoria..." value={formConferencia.motivo_divergencia} onChange={(e) => setFormConferencia({ ...formConferencia, motivo_divergencia: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalConferir(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">Confirmar Entrada no WMS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Almoxarifado */}
      {modalNovoDeposito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Warehouse className="h-4 w-4 text-indigo-400" /> Cadastrar Almoxarifado</h3>
              <button type="button" onClick={() => setModalNovoDeposito(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSalvarDeposito} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Nome do Almoxarifado / Depósito *</label>
                <input type="text" required placeholder="Ex: Almoxarifado Central" value={formDeposito.nome} onChange={(e) => setFormDeposito({ ...formDeposito, nome: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Código Identificador (TAG) *</label>
                <input type="text" required placeholder="Ex: DEP-02" value={formDeposito.codigo} onChange={(e) => setFormDeposito({ ...formDeposito, codigo: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase" />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Descrição / Localização</label>
                <input type="text" placeholder="Ex: Galpão Logístico Bloco B" value={formDeposito.descricao} onChange={(e) => setFormDeposito({ ...formDeposito, descricao: e.target.value })} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoDeposito(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar XML */}
      {modalXml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Upload className="h-4 w-4 text-indigo-400" /> Importador de XML NF-e</h3>
              <button type="button" onClick={() => setModalXml(false)} className="p-1 cursor-pointer"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUploadXml} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Almoxarifado de Entrada *</label>
                <select required value={depositoXml} onChange={(e) => setDepositoXml(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white">
                  {depositos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Arquivo XML da NF-e *</label>
                <input type="file" accept=".xml" required onChange={(e) => setArquivoXml(e.target.files[0])} className="w-full text-slate-300 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalXml(false)} className="px-3 py-1.5 rounded bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer">Processar XML</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}