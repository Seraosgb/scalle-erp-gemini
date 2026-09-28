import React, { useState } from 'react';

export default function FiscalTestScreen() {
  // Estados de Autenticação
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('scalle_token') || '');
  const [usuarioNome, setUsuarioNome] = useState('');

  // Estados do Certificado
  const [arquivo, setArquivo] = useState(null);
  const [senhaCert, setSenhaCert] = useState('123456');
  const [ambiente, setAmbiente] = useState('HOMOLOGACAO');

  // Estados do PDV (Simulação de Venda)
  const [depositoId, setDepositoId] = useState('');
  const [itemId, setItemId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [valorTotal, setValorTotal] = useState('180.50');

  // Estado do PDF Base64
  const [cupomPdf, setCupomPdf] = useState(null);

  // Log
  const [log, setLog] = useState('');

  const addLog = (message) => {
    setLog((prev) => prev + '\n[' + new Date().toLocaleTimeString() + '] ' + message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    addLog('⏳ Tentando autenticação...');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.data.token);
        setUsuarioNome(data.data.user.name);
        localStorage.setItem('scalle_token', data.data.token);
        addLog(`✅ Login aprovado! Bem-vindo(a), ${data.data.user.name}.`);
      } else {
        addLog(`❌ Erro no Login: ${data.error?.message}`);
      }
    } catch (err) {
      addLog(`❌ Falha na requisição: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUsuarioNome('');
    localStorage.removeItem('scalle_token');
    addLog('👋 Logout realizado. Sessão encerrada.');
  };

  const handleUploadCertificado = async (e) => {
    e.preventDefault();
    if (!arquivo) return addLog('❌ Erro: Selecione o arquivo .pfx!');
    addLog('⏳ Enviando certificado para o cofre do Tenant...');

    const formData = new FormData();
    formData.append('certificado', arquivo);
    formData.append('senha', senhaCert);
    formData.append('ambiente_emissao', ambiente);

    try {
      const response = await fetch('/api/fiscal/certificado/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        addLog(`✅ Sucesso: Certificado ${data.data.certificado.razao_social} importado!`);
      } else {
        addLog(`❌ Erro Upload: ${data.error?.message}`);
      }
    } catch (err) {
      addLog(`❌ Falha na requisição: ${err.message}`);
    }
  };

  // EMISSÃO VIA PDV (GAVETA + NFC-e)
  const handleFaturarPdv = async (e) => {
    e.preventDefault();
    if (!depositoId || !itemId) return addLog('❌ Erro: Informe os UUIDs do Depósito e do Item!');

    addLog('⏳ Faturando venda no PDV e gerando Cupom Fiscal (NFC-e)...');
    setCupomPdf(null); // Limpa o cupom anterior

    const payload = {
      deposito_id: depositoId,
      cliente_id: clienteId || null, // Consumidor Final se vazio
      itens: [
        {
          item_id: itemId,
          quantidade: 1,
          preco_unitario: parseFloat(valorTotal)
        }
      ],
      pagamentos: [
        {
          forma_pagamento: 'DINHEIRO',
          valor_pago: parseFloat(valorTotal)
        }
      ],
      emitir_cupom_fiscal: true // Aciona o MotorFiscalService para modelo 65
    };

    try {
      const response = await fetch('/api/vendas/faturar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        addLog(`✅ Venda Faturada! Caixa alimentado. Status Fiscal: ${data.data.documento_fiscal?.status}`);

        if (data.data.cupom_termico_base64) {
            addLog('🖨️ DANFE NFC-e (PDF Base64) recebido com sucesso!');
            setCupomPdf(data.data.cupom_termico_base64);
        }
      } else {
        addLog(`❌ Erro PDV: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (err) {
      addLog(`❌ Falha na requisição PDV: ${err.message}`);
    }
  };

  // Funções de Impressão Direta
  const handlePrintIframe = () => {
    const iframe = document.getElementById('print-iframe');
    if (iframe) {
        iframe.contentWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-indigo-400">Scalle ERP - Laboratório Fiscal & PDV</h1>

        {!token ? (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">1. Login no ERP</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-slate-400">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-400">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-indigo-500" required />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition-colors">Entrar no Sistema</button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
            <div>
              <span className="text-emerald-400 font-bold">● Conectado</span>
              <span className="ml-2 text-sm text-slate-400">Operador: {usuarioNome}</span>
            </div>
            <button onClick={handleLogout} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded">Sair</button>
          </div>
        )}

        {token && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400">2. Cofre do Certificado</h2>
              <form onSubmit={handleUploadCertificado} className="space-y-4">
                <div>
                  <input type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files[0])} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Senha</label>
                  <input type="password" value={senhaCert} onChange={(e) => setSenhaCert(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-emerald-500" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors">Salvar no Tenant</button>
              </form>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">3. Emissão PDV (NFC-e)</h2>
              <form onSubmit={handleFaturarPdv} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs mb-1 text-slate-400">UUID Depósito</label>
                        <input type="text" value={depositoId} onChange={(e) => setDepositoId(e.target.value)} placeholder="Obrigatório" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs focus:outline-none focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-xs mb-1 text-slate-400">UUID Produto</label>
                        <input type="text" value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="Obrigatório" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs focus:outline-none focus:border-blue-500" required />
                    </div>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">UUID Cliente (Opcional - Em branco = Consumidor)</label>
                  <input type="text" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Valor Pago (R$)</label>
                  <input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors">Cobrar e Emitir Cupom</button>
              </form>
            </div>
          </div>
        )}

        {/* ÁREA DE RENDERIZAÇÃO DO CUPOM TÉRMICO */}
        {cupomPdf && (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-amber-400">🧾 DANFE NFC-e (Bobina 80mm)</h2>
                    <button onClick={handlePrintIframe} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-bold">
                        🖨️ Imprimir
                    </button>
                </div>
                <div className="flex justify-center bg-gray-300 p-4 rounded overflow-hidden">
                    <iframe
                        id="print-iframe"
                        src={`data:application/pdf;base64,${cupomPdf}#toolbar=0&navpanes=0`}
                        className="w-80 h-96 border border-gray-400 shadow-lg bg-white"
                        title="Cupom Fiscal"
                    />
                </div>
            </div>
        )}

        <div className="bg-black p-4 rounded-lg border border-slate-700 h-48 overflow-y-auto font-mono text-sm">
          <h3 className="text-slate-500 mb-2 border-b border-slate-800 pb-1">Terminal de Logs</h3>
          <pre className="whitespace-pre-wrap text-green-400">{log || 'Aguardando ações...'}</pre>
        </div>
      </div>
    </div>
  );
}
