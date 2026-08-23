import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Package, Plus, Search, UploadCloud, RefreshCw, 
  CheckCircle2, AlertTriangle, X 
} from 'lucide-react';

export default function WmsPage() {
  const [itens, setItens] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalKardex, setModalKardex] = useState(false);
  const [modalXml, setModalXml] = useState(false);
  
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [kardexList, setKardexList] = useState([]);
  const [xmlFile, setXmlFile] = useState(null);
  const [depositoXmlId, setDepositoXmlId] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    codigo_sku: '',
    tipo_item: 'PRODUTO',
    preco_venda: '',
    preco_custo: '',
    unidade_medida: 'UN',
    ncm: '',
    controla_estoque: true
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resItens, resDeps] = await Promise.all([
        api.get('/itens', { params: { search } }),
        api.get('/wms/depositos')
      ]);
      setItens(resItens.data.data || resItens.data || []);
      const deps = resDeps.data.data || resDeps.data || [];
      setDepositos(deps);
      if (deps.length > 0 && !depositoXmlId) {
        setDepositoXmlId(deps[0].id);
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

  const abrirKardex = async (item) => {
    setItemSelecionado(item);
    setModalKardex(true);
    try {
      const res = await api.get(`/itens/${item.id}/kardex`);
      setKardexList(res.data.data || []);
    } catch (err) {
      setKardexList([]);
    }
  };

  const handleSalvarItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/itens', formData);
      setModalCadastro(false);
      setFormData({
        nome: '',
        codigo_sku: '',
        tipo_item: 'PRODUTO',
        preco_venda: '',
        preco_custo: '',
        unidade_medida: 'UN',
        ncm: '',
        controla_estoque: true
      });
      setFeedback({ tipo: 'sucesso', msg: 'Item cadastrado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.message || 'Erro ao cadastrar item.' });
    }
  };

  const handleImportarXml = async (e) => {
    e.preventDefault();
    if (!xmlFile || !depositoXmlId) return;

    const data = new FormData();
    data.append('xml_file', xmlFile);
    data.append('deposito_id', depositoXmlId);

    try {
      await api.post('/itens/importar-xml', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setModalXml(false);
      setXmlFile(null);
      setFeedback({ tipo: 'sucesso', msg: 'XML importado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao importar XML.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Package className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Almoxarifado & WMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Controle de saldos fracionados, depósitos e movimentações
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => setModalXml(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 cursor-pointer transition"
          >
            <UploadCloud className="h-4 w-4 text-indigo-400" />
            Importar XML
          </button>
          <button 
            type="button"
            onClick={() => setModalCadastro(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" />
            Novo Item
          </button>
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

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar por descrição, SKU ou código de barras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Visualização Mobile: Cards Empilhados */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
            Carregando itens...
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-xs">
            Nenhum item localizado no estoque.
          </div>
        ) : (
          itens.map((item) => {
            const saldoTotal = item.saldos_por_deposito?.reduce((acc, s) => acc + parseFloat(s.quantidade_saldo || 0), 0) ?? 0;
            return (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-indigo-400 font-semibold">{item.codigo_sku || 'SEM SKU'}</span>
                    <h3 className="text-sm font-semibold text-white truncate">{item.nome}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                    {item.tipo_item}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Preço Venda:</span>
                    <span className="font-mono text-emerald-400 font-semibold">R$ {parseFloat(item.preco_venda || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Saldo em Estoque:</span>
                    <span className={`font-mono font-bold ${saldoTotal <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {saldoTotal.toFixed(2)} {item.unidade_medida}
                    </span>
                  </div>
                </div>
                {item.controla_estoque && (
                  <button
                    type="button"
                    onClick={() => abrirKardex(item)}
                    className="w-full py-1.5 text-xs rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800 hover:bg-indigo-900/80 font-medium cursor-pointer"
                  >
                    Ver Extrato Kardex
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Visualização Desktop/Tablet: Tabela Densa */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">CÓDIGO / SKU</th>
                <th className="py-3 px-4">DESCRIÇÃO DO ITEM</th>
                <th className="py-3 px-4">TIPO</th>
                <th className="py-3 px-4 text-right">PREÇO VENDA</th>
                <th className="py-3 px-4 text-right">SALDO FÍSICO</th>
                <th className="py-3 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500 font-sans">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando estoque...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500 font-sans">
                    Nenhum item localizado no estoque.
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const saldoTotal = item.saldos_por_deposito?.reduce((acc, s) => acc + parseFloat(s.quantidade_saldo || 0), 0) ?? 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition font-sans">
                      <td className="py-3 px-4 text-indigo-400 font-semibold font-mono">{item.codigo_sku || '-'}</td>
                      <td className="py-3 px-4 text-white font-medium">{item.nome}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {item.tipo_item}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold font-mono">
                        R$ {parseFloat(item.preco_venda || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono">
                        {item.controla_estoque ? (
                          <span className={saldoTotal <= 5 ? 'text-amber-400' : 'text-emerald-400'}>
                            {saldoTotal.toFixed(2)} {item.unidade_medida}
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.controla_estoque && (
                          <button
                            type="button"
                            onClick={() => abrirKardex(item)}
                            className="px-2.5 py-1 text-xs rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800 hover:bg-indigo-900/80 cursor-pointer transition"
                          >
                            Kardex
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro Responsivo */}
      {modalCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-400" />
                Novo Item no Catálogo
              </h2>
              <button type="button" onClick={() => setModalCadastro(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarItem} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome / Descrição *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Código SKU *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.codigo_sku}
                    onChange={(e) => setFormData({ ...formData, codigo_sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Item</label>
                  <select 
                    value={formData.tipo_item}
                    onChange={(e) => setFormData({ ...formData, tipo_item: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PRODUTO">Produto</option>
                    <option value="SERVICO">Serviço</option>
                    <option value="MATERIA_PRIMA">Matéria-Prima</option>
                    <option value="INSUMO">Insumo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unidade</label>
                  <input 
                    type="text" 
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">NCM Fiscal</label>
                  <input 
                    type="text" 
                    value={formData.ncm}
                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.preco_custo}
                    onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Venda (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.preco_venda}
                    onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
                <button type="button" onClick={() => setModalCadastro(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kardex Responsivo */}
      {modalKardex && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Kardex: {itemSelecionado.nome}</h2>
                <p className="text-xs text-indigo-400 font-mono">SKU: {itemSelecionado.codigo_sku}</p>
              </div>
              <button type="button" onClick={() => setModalKardex(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {kardexList.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs sm:text-sm">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="space-y-2 sm:space-y-0">
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="p-2.5">Data</th>
                          <th className="p-2.5">Tipo</th>
                          <th className="p-2.5 text-right">Qtd</th>
                          <th className="p-2.5 text-right">Saldo Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {kardexList.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/30">
                            <td className="p-2.5 text-slate-400">{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="p-2.5 font-sans text-slate-200">{m.tipo_movimento}</td>
                            <td className={`p-2.5 text-right font-bold ${m.tipo_movimento.includes('ENTRADA') ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {m.tipo_movimento.includes('ENTRADA') ? '+' : '-'}{parseFloat(m.quantidade).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-white">{parseFloat(m.saldo_posterior).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="sm:hidden space-y-2">
                    {kardexList.map((m) => (
                      <div key={m.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-300">{m.tipo_movimento}</span>
                          <span className={m.tipo_movimento.includes('ENTRADA') ? 'text-emerald-400' : 'text-rose-400'}>
                            {m.tipo_movimento.includes('ENTRADA') ? '+' : '-'}{parseFloat(m.quantidade).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
                          <span>Saldo: <strong className="text-slate-300">{parseFloat(m.saldo_posterior).toFixed(2)}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar XML Responsivo */}
      {modalXml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-400" />
                Importar XML de NF-e
              </h2>
              <button type="button" onClick={() => setModalXml(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleImportarXml} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Depósito de Entrada *</label>
                <select 
                  required
                  value={depositoXmlId}
                  onChange={(e) => setDepositoXmlId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {depositos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Arquivo XML *</label>
                <input 
                  type="file" 
                  required 
                  accept=".xml"
                  onChange={(e) => setXmlFile(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalXml(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Processar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}