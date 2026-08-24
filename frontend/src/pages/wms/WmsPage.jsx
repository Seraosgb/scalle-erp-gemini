import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Package, Plus, Search, UploadCloud, RefreshCw, 
  Warehouse, ArrowRightLeft, SlidersHorizontal, 
  CheckCircle2, AlertTriangle, X, Check, MapPin, Edit2, Trash2
} from 'lucide-react';

export default function WmsPage() {
  const [activeTab, setActiveTab] = useState('itens');
  const [itens, setItens] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modais
  const [modalItem, setModalItem] = useState(false);
  const [modalDeposito, setModalDeposito] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [modalKardex, setModalKardex] = useState(false);
  const [modalXml, setModalXml] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Estados de Operação
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [kardexList, setKardexList] = useState([]);
  const [xmlFile, setXmlFile] = useState(null);
  const [depositoXmlId, setDepositoXmlId] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Formulários
  const [formItem, setFormItem] = useState({
    nome: '',
    codigo_sku: '',
    tipo_item: 'PRODUTO',
    preco_venda: '',
    preco_custo: '',
    unidade_medida: 'UN',
    ncm: '',
    controla_estoque: true
  });

  const [formDeposito, setFormDeposito] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    is_padrao: false
  });

  const [formAjuste, setFormAjuste] = useState({
    deposito_id: '',
    item_id: '',
    novo_saldo: '',
    motivo: 'Inventário Geral e Contagem Física',
    lote: '',
    data_validade: '',
    localizacao_rua: '',
    localizacao_predio: '',
    localizacao_nivel: '',
    localizacao_vao: '',
  });

  const [formTransferencia, setFormTransferencia] = useState({
    deposito_origem_id: '',
    deposito_destino_id: '',
    item_id: '',
    quantidade: '',
    modalidade: 'DIRETO',
    observacoes: '',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resItens, resDeps] = await Promise.all([
        api.get('/itens', { params: { search } }),
        api.get('/wms/depositos', { params: { search: activeTab === 'depositos' ? search : '' } })
      ]);
      setItens(resItens.data.data || resItens.data || []);
      const deps = resDeps.data.data || resDeps.data || [];
      setDepositos(deps);
      
      const padrao = deps.find(d => d.is_padrao) || deps[0];
      if (padrao && !depositoXmlId) {
        setDepositoXmlId(padrao.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [search, activeTab]);

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

  const abrirModalAjuste = (item) => {
    setItemSelecionado(item);
    const depPadrao = depositos.find(d => d.is_padrao) || depositos[0];
    const saldoAtual = item.saldos_por_deposito?.find(s => s.deposito_id === depPadrao?.id);
    
    setFormAjuste({
      deposito_id: depPadrao?.id || '',
      item_id: item.id,
      novo_saldo: saldoAtual ? saldoAtual.quantidade_saldo : '0',
      motivo: 'Inventário Geral e Contagem Física',
      lote: saldoAtual?.lote || '',
      data_validade: saldoAtual?.data_validade || '',
      localizacao_rua: saldoAtual?.localizacao_rua || '',
      localizacao_predio: saldoAtual?.localizacao_predio || '',
      localizacao_nivel: saldoAtual?.localizacao_nivel || '',
      localizacao_vao: saldoAtual?.localizacao_vao || '',
    });
    setModalAjuste(true);
  };

  const abrirModalTransferencia = (item) => {
    setItemSelecionado(item);
    const depOrigem = depositos[0]?.id || '';
    const depDestino = depositos[1]?.id || depositos[0]?.id || '';
    setFormTransferencia({
      deposito_origem_id: depOrigem,
      deposito_destino_id: depDestino,
      item_id: item.id,
      quantidade: '1',
      modalidade: 'DIRETO',
      observacoes: 'Transferência operacional interna',
    });
    setModalTransferencia(true);
  };

  const abrirEdicaoItem = (item) => {
    setEditandoId(item.id);
    setFormItem({
      nome: item.nome,
      codigo_sku: item.codigo_sku,
      tipo_item: item.tipo_item,
      preco_venda: item.preco_venda,
      preco_custo: item.preco_custo || '',
      unidade_medida: item.unidade_medida,
      ncm: item.ncm || '',
      controla_estoque: item.controla_estoque
    });
    setModalItem(true);
  };

  const abrirEdicaoDeposito = (dep) => {
    setEditandoId(dep.id);
    setFormDeposito({
      nome: dep.nome,
      codigo: dep.codigo,
      descricao: dep.descricao || '',
      is_padrao: dep.is_padrao
    });
    setModalDeposito(true);
  };

  const handleSalvarItem = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await api.put(`/itens/${editandoId}`, formItem);
        setFeedback({ tipo: 'sucesso', msg: 'Item atualizado com sucesso!' });
      } else {
        await api.post('/itens', formItem);
        setFeedback({ tipo: 'sucesso', msg: 'Item cadastrado com sucesso!' });
      }
      setModalItem(false);
      setEditandoId(null);
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.message || 'Erro ao salvar item.' });
    }
  };

  const handleSalvarDeposito = async (e) => {
    e.preventDefault();
    try {
      if (editandoId) {
        await api.put(`/wms/depositos/${editandoId}`, formDeposito);
        setFeedback({ tipo: 'sucesso', msg: 'Depósito atualizado com sucesso!' });
      } else {
        await api.post('/wms/depositos', formDeposito);
        setFeedback({ tipo: 'sucesso', msg: 'Depósito cadastrado com sucesso!' });
      }
      setModalDeposito(false);
      setEditandoId(null);
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || err.response?.data?.message || 'Erro ao salvar depósito.' });
    }
  };

  const handleExcluirItem = async (id) => {
    if (!window.confirm('Deseja realmente remover este item do catálogo?')) return;
    try {
      await api.delete(`/itens/${id}`);
      setFeedback({ tipo: 'sucesso', msg: 'Item removido do catálogo com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.message || 'Erro ao excluir item.' });
    }
  };

  const handleExcluirDeposito = async (id) => {
    if (!window.confirm('Deseja realmente remover este depósito?')) return;
    try {
      await api.delete(`/wms/depositos/${id}`);
      setFeedback({ tipo: 'sucesso', msg: 'Depósito removido com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao excluir depósito.' });
    }
  };

  const handleExecutarAjuste = async (e) => {
    e.preventDefault();
    try {
      await api.post('/wms/ajustar-saldo', formAjuste);
      setModalAjuste(false);
      setFeedback({ tipo: 'sucesso', msg: 'Inventário e saldo físico atualizados com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao ajustar saldo.' });
    }
  };

  const handleExecutarTransferencia = async (e) => {
    e.preventDefault();
    try {
      await api.post('/wms/transferir', formTransferencia);
      setModalTransferencia(false);
      setFeedback({ tipo: 'sucesso', msg: 'Transferência realizada com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Falha ao transferir estoque.' });
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
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Package className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500" />
            Almoxarifado & WMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Gestão física, endereçamento logístico, transferências e trilha Kardex
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => setModalXml(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 cursor-pointer transition"
          >
            <UploadCloud className="h-4 w-4 text-indigo-400" />
            Importar XML
          </button>
          {activeTab === 'itens' ? (
            <button 
              type="button"
              onClick={() => {
                setEditandoId(null);
                setFormItem({ nome: '', codigo_sku: '', tipo_item: 'PRODUTO', preco_venda: '', preco_custo: '', unidade_medida: 'UN', ncm: '', controla_estoque: true });
                setModalItem(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" />
              Novo Item
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => {
                setEditandoId(null);
                setFormDeposito({ nome: '', codigo: '', descricao: '', is_padrao: false });
                setModalDeposito(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
            >
              <Plus className="h-4 w-4" />
              Novo Depósito
            </button>
          )}
        </div>
      </div>

      {/* Navegação e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('itens')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'itens' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="h-4 w-4" />
            Itens & Saldos Físicos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('depositos')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'depositos' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Warehouse className="h-4 w-4" />
            Depósitos & Almoxarifados ({depositos.length})
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por descrição, SKU..." 
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

      {/* Conteúdo Aba 1: Itens */}
      {activeTab === 'itens' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400">
                <tr>
                  <th className="py-3 px-4">CÓDIGO / SKU</th>
                  <th className="py-3 px-4">DESCRIÇÃO DO ITEM</th>
                  <th className="py-3 px-4">TIPO</th>
                  <th className="py-3 px-4 text-right">PREÇO VENDA</th>
                  <th className="py-3 px-4 text-right">SALDO FÍSICO</th>
                  <th className="py-3 px-4 text-center">AÇÕES OPERACIONAIS</th>
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
                          <div className="flex items-center justify-center gap-1.5">
                            {item.controla_estoque && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => abrirModalAjuste(item)}
                                  title="Ajustar Inventário e Endereçamento"
                                  className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1"
                                >
                                  <SlidersHorizontal className="h-3 w-3 text-indigo-400" />
                                  Inventário
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirModalTransferencia(item)}
                                  title="Transferir entre Depósitos"
                                  className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1"
                                >
                                  <ArrowRightLeft className="h-3 w-3 text-indigo-400" />
                                  Transferir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirKardex(item)}
                                  className="px-2 py-1 text-xs rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800 hover:bg-indigo-900/80 cursor-pointer transition"
                                >
                                  Kardex
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => abrirEdicaoItem(item)}
                              title="Editar Item"
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluirItem(item.id)}
                              title="Excluir Item"
                              className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Depósitos */}
      {activeTab === 'depositos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {depositos.map((dep) => (
            <div key={dep.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 relative overflow-hidden">
              {dep.is_padrao && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Padrão
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{dep.nome}</h3>
                  <span className="text-xs font-mono text-slate-400">Cód: {dep.codigo}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 min-h-[32px] line-clamp-2">
                {dep.descricao || 'Sem descrição cadastrada.'}
              </p>
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Itens com saldo: <strong className="text-white font-mono">{dep.saldos_count || 0}</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirEdicaoDeposito(dep)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
                  </button>
                  {!dep.is_padrao && (
                    <button
                      type="button"
                      onClick={() => handleExcluirDeposito(dep.id)}
                      className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Item */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-400" />
                {editandoId ? 'Editar Item no Catálogo' : 'Novo Item no Catálogo'}
              </h2>
              <button type="button" onClick={() => setModalItem(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
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
                    value={formItem.nome}
                    onChange={(e) => setFormItem({ ...formItem, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Código SKU *</label>
                  <input 
                    type="text" 
                    required 
                    value={formItem.codigo_sku}
                    onChange={(e) => setFormItem({ ...formItem, codigo_sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Item</label>
                  <select 
                    value={formItem.tipo_item}
                    onChange={(e) => setFormItem({ ...formItem, tipo_item: e.target.value })}
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
                    value={formItem.unidade_medida}
                    onChange={(e) => setFormItem({ ...formItem, unidade_medida: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">NCM Fiscal</label>
                  <input 
                    type="text" 
                    value={formItem.ncm}
                    onChange={(e) => setFormItem({ ...formItem, ncm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formItem.preco_custo}
                    onChange={(e) => setFormItem({ ...formItem, preco_custo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Venda (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formItem.preco_venda}
                    onChange={(e) => setFormItem({ ...formItem, preco_venda: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
                <button type="button" onClick={() => setModalItem(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Depósito */}
      {modalDeposito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-indigo-400" />
                {editandoId ? 'Editar Depósito' : 'Novo Depósito'}
              </h2>
              <button type="button" onClick={() => setModalDeposito(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarDeposito} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Depósito *</label>
                <input 
                  type="text" 
                  required 
                  value={formDeposito.nome}
                  onChange={(e) => setFormDeposito({ ...formDeposito, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Código Identificador *</label>
                <input 
                  type="text" 
                  required 
                  value={formDeposito.codigo}
                  onChange={(e) => setFormDeposito({ ...formDeposito, codigo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
                <textarea 
                  rows="2"
                  value={formDeposito.descricao}
                  onChange={(e) => setFormDeposito({ ...formDeposito, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="dep_padrao_modal_edit"
                  checked={formDeposito.is_padrao}
                  onChange={(e) => setFormDeposito({ ...formDeposito, is_padrao: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="dep_padrao_modal_edit" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Definir como Depósito Principal da Empresa
                </label>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
                <button type="button" onClick={() => setModalDeposito(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Inventário */}
      {modalAjuste && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
                  Ajuste de Inventário / Saldo Físico
                </h2>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">{itemSelecionado.nome} (SKU: {itemSelecionado.codigo_sku})</p>
              </div>
              <button type="button" onClick={() => setModalAjuste(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleExecutarAjuste} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Depósito Alvo *</label>
                  <select 
                    required
                    value={formAjuste.deposito_id}
                    onChange={(e) => setFormAjuste({ ...formAjuste, deposito_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Novo Saldo Apurado *</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    required 
                    value={formAjuste.novo_saldo}
                    onChange={(e) => setFormAjuste({ ...formAjuste, novo_saldo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Motivo do Ajuste *</label>
                  <input 
                    type="text" 
                    required 
                    value={formAjuste.motivo}
                    onChange={(e) => setFormAjuste({ ...formAjuste, motivo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Lote</label>
                  <input 
                    type="text" 
                    value={formAjuste.lote}
                    onChange={(e) => setFormAjuste({ ...formAjuste, lote: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Validade</label>
                  <input 
                    type="date" 
                    value={formAjuste.data_validade}
                    onChange={(e) => setFormAjuste({ ...formAjuste, data_validade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Endereçamento */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Endereçamento Logístico
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <input 
                    type="text" 
                    placeholder="Rua" 
                    value={formAjuste.localizacao_rua}
                    onChange={(e) => setFormAjuste({ ...formAjuste, localizacao_rua: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white text-center"
                  />
                  <input 
                    type="text" 
                    placeholder="Prédio" 
                    value={formAjuste.localizacao_predio}
                    onChange={(e) => setFormAjuste({ ...formAjuste, localizacao_predio: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white text-center"
                  />
                  <input 
                    type="text" 
                    placeholder="Nível" 
                    value={formAjuste.localizacao_nivel}
                    onChange={(e) => setFormAjuste({ ...formAjuste, localizacao_nivel: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white text-center"
                  />
                  <input 
                    type="text" 
                    placeholder="Vão" 
                    value={formAjuste.localizacao_vao}
                    onChange={(e) => setFormAjuste({ ...formAjuste, localizacao_vao: e.target.value })}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalAjuste(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Salvar Ajuste</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferência */}
      {modalTransferencia && itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                  Transferência Interna
                </h2>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">{itemSelecionado.nome}</p>
              </div>
              <button type="button" onClick={() => setModalTransferencia(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleExecutarTransferencia} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Origem (Saída) *</label>
                <select 
                  required
                  value={formTransferencia.deposito_origem_id}
                  onChange={(e) => setFormTransferencia({ ...formTransferencia, deposito_origem_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {depositos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Destino (Entrada) *</label>
                <select 
                  required
                  value={formTransferencia.deposito_destino_id}
                  onChange={(e) => setFormTransferencia({ ...formTransferencia, deposito_destino_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {depositos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Quantidade *</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    required 
                    value={formTransferencia.quantidade}
                    onChange={(e) => setFormTransferencia({ ...formTransferencia, quantidade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Modalidade</label>
                  <select 
                    value={formTransferencia.modalidade}
                    onChange={(e) => setFormTransferencia({ ...formTransferencia, modalidade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DIRETO">Direto (Instantâneo)</option>
                    <option value="EM_TRANSITO">Em Trânsito</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalTransferencia(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">Executar Transferência</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kardex */}
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
                <table className="w-full text-left text-xs font-mono text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Depósito</th>
                      <th className="p-2.5 text-right">Qtd</th>
                      <th className="p-2.5 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {kardexList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-400">{new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2.5 font-sans text-slate-200">{m.tipo_movimento}</td>
                        <td className="p-2.5 font-sans text-slate-400">{m.deposito?.nome || '-'}</td>
                        <td className={`p-2.5 text-right font-bold ${m.tipo_movimento.includes('ENTRADA') ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.tipo_movimento.includes('ENTRADA') ? '+' : '-'}{parseFloat(m.quantidade).toFixed(2)}
                        </td>
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