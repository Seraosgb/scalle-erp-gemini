import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, Plus, Search, UploadCloud, RefreshCw, 
  Warehouse, FileText, CheckCircle2, AlertTriangle, X 
} from 'lucide-react';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('scalle_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function ItensWms() {
  const [itens, setItens] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  
  // Modais de Controle
  const [modalCadastro, setModalCadastro] = useState(false);
  const [modalKardex, setModalKardex] = useState(false);
  const [modalXml, setModalXml] = useState(false);
  
  // Seleção e Histórico
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [kardexList, setKardexList] = useState([]);
  const [xmlFile, setXmlFile] = useState(null);
  const [depositoXmlId, setDepositoXmlId] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Formulário de Cadastro
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
        api.get('/itens', { params: { search, tipo: tipoFilter } }),
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
  }, [search, tipoFilter]);

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
      setFeedback({ tipo: 'sucesso', msg: 'XML importado e estoque provisionado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao importar XML.' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto relative z-10">
      {/* Header Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-indigo-500" />
            Catálogo de Itens & WMS Estoque
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestão unificada de produtos, insumos, serviços, almoxarifados e trilha de auditoria Kardex.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setModalXml(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 cursor-pointer transition"
          >
            <UploadCloud className="h-4 w-4 text-indigo-400" />
            Importar XML NF-e
          </button>
          <button 
            type="button"
            onClick={() => {
              setModalCadastro(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" />
            Novo Item
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <span className="text-sm font-medium">{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Barra de Filtros Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, código SKU ou barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <select 
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos os Tipos</option>
            <option value="PRODUTO">Produtos</option>
            <option value="SERVICO">Serviços</option>
            <option value="MATERIA_PRIMA">Matérias-Primas</option>
            <option value="INSUMO">Insumos</option>
          </select>
        </div>
      </div>

      {/* Tabela Corporativa Densa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Descrição do Item</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Unidade</th>
                <th className="py-3 px-4 text-right">Preço Custo</th>
                <th className="py-3 px-4 text-right">Preço Venda</th>
                <th className="py-3 px-4 text-right">Saldo Físico</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando estoque e catálogo...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500 font-sans">
                    Nenhum item cadastrado no catálogo.
                  </td>
                </tr>
              ) : (
                itens.map((item) => {
                  const saldoTotal = item.saldos_por_deposito?.reduce((acc, s) => acc + parseFloat(s.quantidade_saldo || 0), 0) ?? 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-indigo-400 font-semibold">{item.codigo_sku || '-'}</td>
                      <td className="py-3 px-4 font-sans text-white font-medium text-sm">{item.nome}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {item.tipo_item}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{item.unidade_medida}</td>
                      <td className="py-3 px-4 text-right text-slate-400">R$ {parseFloat(item.preco_custo || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-semibold">R$ {parseFloat(item.preco_venda || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {item.controla_estoque ? (
                          <span className={saldoTotal <= 5 ? 'text-amber-400' : 'text-emerald-400'}>
                            {saldoTotal.toFixed(2)} {item.unidade_medida}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
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

      {/* Modal de Cadastro com z-index alto e foco garantido */}
      {modalCadastro && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-400" />
                Novo Item no Catálogo
              </h2>
              <button 
                type="button" 
                onClick={() => setModalCadastro(false)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarItem} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome / Descrição *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Sensor de Temperatura NTC 10k"
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
                    placeholder="Ex: SEN-001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1">NCM</label>
                  <input 
                    type="text" 
                    value={formData.ncm}
                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                    placeholder="Ex: 85414032"
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
                    placeholder="0.00"
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
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setModalCadastro(false)} 
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kardex */}
      {modalKardex && itemSelecionado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
              <div>
                <h2 className="text-lg font-bold text-white">Extrato de Movimentação (Kardex)</h2>
                <p className="text-xs text-indigo-400 mt-0.5">{itemSelecionado.nome} (SKU: {itemSelecionado.codigo_sku})</p>
              </div>
              <button 
                type="button" 
                onClick={() => setModalKardex(false)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 max-h-96 overflow-y-auto">
              {kardexList.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-sm">Nenhuma movimentação registrada no Kardex.</p>
              ) : (
                <table className="w-full text-left text-xs font-mono text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5 text-right">Qtd</th>
                      <th className="p-2.5 text-right">Saldo Ant.</th>
                      <th className="p-2.5 text-right">Saldo Atual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {kardexList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-400">{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2.5 font-sans font-medium text-slate-200">{m.tipo_movimento}</td>
                        <td className={`p-2.5 text-right font-bold ${m.tipo_movimento.includes('ENTRADA') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.tipo_movimento.includes('ENTRADA') ? '+' : '-'}{parseFloat(m.quantidade).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right text-slate-400">{parseFloat(m.saldo_anterior).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-white">{parseFloat(m.saldo_posterior).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar XML */}
      {modalXml && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-400" />
                Importar XML de NF-e
              </h2>
              <button 
                type="button" 
                onClick={() => setModalXml(false)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleImportarXml} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Depósito de Destino *</label>
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Arquivo XML da Nota Fiscal *</label>
                <input 
                  type="file" 
                  required 
                  accept=".xml"
                  onChange={(e) => setXmlFile(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setModalXml(false)} 
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Processar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}