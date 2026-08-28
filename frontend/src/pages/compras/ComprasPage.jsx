import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { 
  ShoppingCart, Plus, RefreshCw, CheckCircle2, 
  AlertTriangle, X, Trash2, UserPlus, Building2, 
  FileCode, Upload, Layers
} from 'lucide-react';

export default function ComprasPage() {
  const navigate = useNavigate();
  const [compras, setCompras] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [itensCatalogo, setItensCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modais
  const [modalNovaCompra, setModalNovaCompra] = useState(false);
  const [modalNovoFornecedor, setModalNovoFornecedor] = useState(false);
  const [modalImportarXml, setModalImportarXml] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Forms
  const [formCompra, setFormCompra] = useState({
    fornecedor_id: '',
    deposito_destino_id: '',
    numero_nota: '',
    serie_nota: '1',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    valor_frete: 0,
    valor_desconto: 0,
    itens: [
      { item_id: '', quantidade: 1, valor_unitario: 0, lote: '', data_validade: '' }
    ]
  });

  const [formFornecedor, setFormFornecedor] = useState({
    tipo_pessoa: 'PJ',
    nome_razao_social: '',
    nome_fantasia_apelido: '',
    cpf_cnpj: '',
    email_principal: '',
    telefone_principal: '',
    is_fornecedor: true,
    is_cliente: false
  });

  const [formXml, setFormXml] = useState({
    xml_file: null,
    deposito_id: ''
  });
  const [importandoXml, setImportandoXml] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resCompras, resPessoas, resDeps, resItens] = await Promise.all([
        api.get('/compras'),
        api.get('/pessoas'),
        api.get('/wms/depositos'),
        api.get('/itens')
      ]);

      const comprasRaw = resCompras.data?.data || resCompras.data || [];
      setCompras(Array.isArray(comprasRaw) ? comprasRaw : (comprasRaw.data || []));

      const todasPessoas = resPessoas.data?.data || resPessoas.data || [];
      const forns = Array.isArray(todasPessoas) ? todasPessoas.filter(p => p.is_fornecedor) : [];
      setFornecedores(forns.length > 0 ? forns : (Array.isArray(todasPessoas) ? todasPessoas : []));
      
      const deps = resDeps.data?.data || resDeps.data || [];
      const listaDeps = Array.isArray(deps) ? deps : [];
      setDepositos(listaDeps);
      
      const itensRaw = resItens.data?.data || resItens.data || [];
      setItensCatalogo(Array.isArray(itensRaw) ? itensRaw : (itensRaw.data || []));

      const depPadrao = listaDeps.find(d => d.is_padrao) || listaDeps[0];
      if (depPadrao) {
        setFormCompra(prev => ({ ...prev, deposito_destino_id: prev.deposito_destino_id || depPadrao.id }));
        setFormXml(prev => ({ ...prev, deposito_id: prev.deposito_id || depPadrao.id }));
      }
    } catch (err) {
      console.error('Erro ao carregar compras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAddItem = () => {
    setFormCompra({
      ...formCompra,
      itens: [...formCompra.itens, { item_id: '', quantidade: 1, valor_unitario: 0, lote: '', data_validade: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formCompra.itens.length === 1) return;
    const novosItens = formCompra.itens.filter((_, i) => i !== index);
    setFormCompra({ ...formCompra, itens: novosItens });
  };

  const handleItemChange = (index, field, value) => {
    const novosItens = [...formCompra.itens];
    novosItens[index][field] = value;
    
    if (field === 'item_id') {
      const itemAchado = itensCatalogo.find(i => i.id === value);
      if (itemAchado) {
        novosItens[index].valor_unitario = parseFloat(itemAchado.preco_custo || 0);
      }
    }
    
    setFormCompra({ ...formCompra, itens: novosItens });
  };

  const handleSalvarCompra = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/compras', formCompra);
      setModalNovaCompra(false);
      setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message || 'Compra efetuada, estoque creditado e Contas a Pagar lançado!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao registrar compra.' });
    }
  };

  const handleSalvarFornecedor = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/pessoas', formFornecedor);
      const novoForn = res.data?.data;
      setModalNovoFornecedor(false);
      setFormFornecedor({
        tipo_pessoa: 'PJ',
        nome_razao_social: '',
        nome_fantasia_apelido: '',
        cpf_cnpj: '',
        email_principal: '',
        telefone_principal: '',
        is_fornecedor: true,
        is_cliente: false
      });
      setFeedback({ tipo: 'sucesso', msg: 'Fornecedor cadastrado com sucesso!' });
      await carregarDados();
      if (novoForn?.id) {
        setFormCompra(prev => ({ ...prev, fornecedor_id: novoForn.id }));
      }
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || err.response?.data?.message || 'Erro ao cadastrar fornecedor.' });
    }
  };

  const handleImportarXml = async (e) => {
    e.preventDefault();
    if (!formXml.xml_file || !formXml.deposito_id) return;

    setImportandoXml(true);
    const data = new FormData();
    data.append('xml_file', formXml.xml_file);
    data.append('deposito_id', formXml.deposito_id);

    try {
      const res = await api.post('/wms/importar-xml', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setModalImportarXml(false);
      setFormXml(prev => ({ ...prev, xml_file: null }));
      setFeedback({ tipo: 'sucesso', msg: res.data?.data?.message || 'XML de NF-e importado e estoque provisionado com sucesso!' });
      carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: err.response?.data?.error?.message || 'Erro ao importar XML de NF-e.' });
    } finally {
      setImportandoXml(false);
    }
  };

  const calcularTotalForm = () => {
    const totalItens = formCompra.itens.reduce((acc, i) => acc + (parseFloat(i.quantidade || 0) * parseFloat(i.valor_unitario || 0)), 0);
    return Math.max(0, totalItens + parseFloat(formCompra.valor_frete || 0) - parseFloat(formCompra.valor_desconto || 0));
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-500 shrink-0" />
            Compras & Suprimentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Entradas de notas de fornecedores com integração ao WMS e Financeiro
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => navigate('/app/compras/cotacoes')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-indigo-400 text-xs font-bold cursor-pointer transition shadow-sm"
          >
            <Layers className="h-4 w-4" />
            Mapa de Cotações
          </button>
          <button 
            type="button"
            onClick={() => setModalImportarXml(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 text-xs font-bold cursor-pointer transition shadow-sm"
          >
            <FileCode className="h-4 w-4" />
            Importar XML NF-e
          </button>
          <button 
            type="button"
            onClick={() => setModalNovoFornecedor(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer transition shadow-sm"
          >
            <UserPlus className="h-4 w-4 text-indigo-400" />
            Novo Fornecedor
          </button>
          <button 
            type="button"
            onClick={() => setModalNovaCompra(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer transition"
          >
            <Plus className="h-4 w-4" />
            Novo Pedido de Entrada
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs sm:text-sm ${
          feedback.tipo === 'sucesso' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span className="truncate">{feedback.msg}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabela de Compras */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[700px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] sm:text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="py-3.5 px-4">DOCUMENTO / NF</th>
                <th className="py-3.5 px-4">FORNECEDOR</th>
                <th className="py-3.5 px-4">DEPÓSITO ENTRADA</th>
                <th className="py-3.5 px-4">DATA ENTRADA</th>
                <th className="py-3.5 px-4 text-right">VALOR TOTAL</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500 font-sans">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando pedidos de suprimentos...
                  </td>
                </tr>
              ) : compras.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500 font-sans">
                    Nenhum registro de compras localizado.
                  </td>
                </tr>
              ) : (
                compras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-slate-800/40 transition font-sans">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      {compra.numero_nota ? `NF ${compra.numero_nota}` : `DOC-${compra.id.substring(0, 8).toUpperCase()}`}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">
                      {compra.fornecedor?.nome_razao_social || 'Fornecedor Diversos'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {compra.deposito_destino?.nome || compra.depositoDestino?.nome || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {compra.data_entrada ? new Date(compra.data_entrada).toLocaleDateString('pt-BR') : (compra.data_emissao ? new Date(compra.data_emissao).toLocaleDateString('pt-BR') : '-')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold font-mono">
                      R$ {parseFloat(compra.valor_total || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        compra.status === 'RECEBIDO' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}>
                        {compra.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Importar XML NF-e */}
      {modalImportarXml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="h-5 w-5 text-emerald-400" />
                Importar XML de NF-e
              </h2>
              <button type="button" onClick={() => setModalImportarXml(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleImportarXml} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Arquivo XML da NF-e *</label>
                <input 
                  type="file" 
                  accept=".xml" 
                  required 
                  onChange={(e) => setFormXml({ ...formXml, xml_file: e.target.files[0] })}
                  className="w-full text-slate-300 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Depósito de Entrada *</label>
                <select 
                  required
                  value={formXml.deposito_id}
                  onChange={(e) => setFormXml({ ...formXml, deposito_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  {depositos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalImportarXml(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium">Cancelar</button>
                <button type="submit" disabled={importandoXml} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold cursor-pointer">
                  {importandoXml ? 'Processando XML...' : 'Importar & Dar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Fornecedor */}
      {modalNovoFornecedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                Novo Fornecedor
              </h2>
              <button type="button" onClick={() => setModalNovoFornecedor(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarFornecedor} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Razão Social / Nome *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Distribuidora de Peças Ltda"
                  value={formFornecedor.nome_razao_social}
                  onChange={(e) => setFormFornecedor({ ...formFornecedor, nome_razao_social: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-400 mb-1">CNPJ / CPF *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="00.000.000/0001-00"
                  value={formFornecedor.cpf_cnpj}
                  onChange={(e) => setFormFornecedor({ ...formFornecedor, cpf_cnpj: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={formFornecedor.email_principal}
                    onChange={(e) => setFormFornecedor({ ...formFornecedor, email_principal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={formFornecedor.telefone_principal}
                    onChange={(e) => setFormFornecedor({ ...formFornecedor, telefone_principal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalNovoFornecedor(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">Salvar Fornecedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Compra */}
      {modalNovaCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50 shrink-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-400" />
                Lançar Compra / Entrada de Mercadoria
              </h2>
              <button type="button" onClick={() => setModalNovaCompra(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarCompra} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-400">Fornecedor *</label>
                    <button 
                      type="button" 
                      onClick={() => setModalNovoFornecedor(true)}
                      className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      + Cadastrar Novo
                    </button>
                  </div>
                  <select 
                    required
                    value={formCompra.fornecedor_id}
                    onChange={(e) => setFormCompra({ ...formCompra, fornecedor_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.nome_razao_social} ({f.cpf_cnpj})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Depósito de Entrada *</label>
                  <select 
                    required
                    value={formCompra.deposito_destino_id}
                    onChange={(e) => setFormCompra({ ...formCompra, deposito_destino_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome} ({d.codigo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Número da Nota Fiscal</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 1234"
                    value={formCompra.numero_nota}
                    onChange={(e) => setFormCompra({ ...formCompra, numero_nota: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Data de Emissão</label>
                  <input 
                    type="date" 
                    value={formCompra.data_emissao}
                    onChange={(e) => setFormCompra({ ...formCompra, data_emissao: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Vencimento do Pagamento *</label>
                  <input 
                    type="date" 
                    required
                    value={formCompra.data_vencimento}
                    onChange={(e) => setFormCompra({ ...formCompra, data_vencimento: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Itens e Produtos da Compra</span>
                  <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="px-2.5 py-1 text-xs rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800 hover:bg-indigo-900/80 font-bold cursor-pointer"
                  >
                    + Adicionar Item
                  </button>
                </div>
                {formCompra.itens.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Item do Catálogo *</label>
                      <select 
                        required
                        value={item.item_id}
                        onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="">Selecione o produto...</option>
                        {itensCatalogo.map(it => (
                          <option key={it.id} value={it.id}>{it.nome} ({it.codigo_sku})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Qtd *</label>
                      <input 
                        type="number" 
                        step="0.0001" 
                        required 
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Valor Unit. (R$) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        value={item.valor_unitario}
                        onChange={(e) => handleItemChange(idx, 'valor_unitario', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Lote</label>
                      <input 
                        type="text" 
                        value={item.lote}
                        onChange={(e) => handleItemChange(idx, 'lote', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white uppercase"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <span className="text-[10px] text-slate-500 block">Total:</span>
                        <strong className="text-xs text-emerald-400 font-mono">
                          R$ {(parseFloat(item.quantidade || 0) * parseFloat(item.valor_unitario || 0)).toFixed(2)}
                        </strong>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totalizador */}
              <div className="flex justify-between items-center p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-xs font-semibold text-slate-400">Total a Lançar no Contas a Pagar:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  R$ {calcularTotalForm().toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800 shrink-0">
                <button type="button" onClick={() => setModalNovaCompra(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-md">Confirmar Entrada & Financeiro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}