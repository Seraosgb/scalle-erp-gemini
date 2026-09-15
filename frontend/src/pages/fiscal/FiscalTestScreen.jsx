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

  // Estados da Emissão
  const [destinatarioId, setDestinatarioId] = useState('');
  const [valorTotal, setValorTotal] = useState('180.50');

  // Log
  const [log, setLog] = useState('');

  const addLog = (message) => {
    setLog((prev) => prev + '\n[' + new Date().toLocaleTimeString() + '] ' + message);
  };

  // 1. LOGIN INTEGRADO
  const handleLogin = async (e) => {
    e.preventDefault();
    addLog('⏳ Tentando autenticação...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        const authToken = data.data.token;
        setToken(authToken);
        setUsuarioNome(data.data.user.name);
        localStorage.setItem('scalle_token', authToken); // Opcional: guarda no navegador
        addLog(`✅ Login aprovado! Bem-vindo(a), ${data.data.user.name}.`);
      } else {
        addLog(`❌ Erro no Login: ${data.error?.message || 'Credenciais inválidas'}`);
      }
    } catch (err) {
      addLog(`❌ Falha na requisição de login: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUsuarioNome('');
    localStorage.removeItem('scalle_token');
    addLog('👋 Logout realizado. Sessão encerrada no front-end.');
  };

  // 2. UPLOAD DO CERTIFICADO
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        addLog(`✅ Sucesso: Certificado ${data.data.certificado.razao_social} importado!`);
      } else {
        addLog(`❌ Erro Upload: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (err) {
      addLog(`❌ Falha na requisição: ${err.message}`);
    }
  };

  // 3. EMISSÃO DA NFE
  const handleEmitirNFe = async (e) => {
    e.preventDefault();
    if (!destinatarioId) return addLog('❌ Erro: Informe o UUID do Destinatário!');

    addLog('⏳ Iniciando orquestração da NFe...');

    const payload = {
      destinatario_id: destinatarioId,
      modelo_documento: '55',
      itens: [
        {
          tipo_item: 'PRODUTO',
          cfop: '5102',
          valor_total: parseFloat(valorTotal)
        }
      ]
    };

    try {
      const response = await fetch('/api/fiscal/emitir', {
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
        addLog(`✅ GOLAÇO! NFe Emitida! Status: ${data.data.documento.status}`);
        console.log("XML Assinado na íntegra:", data.data.documento.xml_assinado);
      } else {
        addLog(`❌ Erro Emissão: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (err) {
      addLog(`❌ Falha na requisição de emissão: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-indigo-400">Scalle ERP - Laboratório Fiscal</h1>

        {/* BLOCO DE LOGIN INTEGRADO */}
        {!token ? (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">1. Login no ERP</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-slate-400">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-400">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition-colors">
                Entrar no Sistema
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
            <div>
              <span className="text-emerald-400 font-bold">● Conectado</span>
              <span className="ml-2 text-sm text-slate-400">Autenticado no módulo fiscal</span>
            </div>
            <button onClick={handleLogout} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded">
              Sair
            </button>
          </div>
        )}

        {/* MÓDULOS FISCAIS SÓ APARECEM SE ESTIVER LOGADO */}
        {token && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400">2. Cofre do Certificado</h2>
              <form onSubmit={handleUploadCertificado} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Arquivo .pfx de Teste</label>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) => setArquivo(e.target.files[0])}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Senha (ex: 123456)</label>
                  <input
                    type="password"
                    value={senhaCert}
                    onChange={(e) => setSenhaCert(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors">
                  Salvar no Tenant
                </button>
              </form>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">3. Disparo da NFe</h2>
              <form onSubmit={handleEmitirNFe} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-400">UUID do Cliente</label>
                  <input
                    type="text"
                    value={destinatarioId}
                    onChange={(e) => setDestinatarioId(e.target.value)}
                    placeholder="Ex: 550e8400-e29b-41d4..."
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-400">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors">
                  Assinar e Emitir
                </button>
              </form>
            </div>
          </div>
        )}

        {/* LOG DE EXECUÇÃO */}
        <div className="bg-black p-4 rounded-lg border border-slate-700 h-48 overflow-y-auto font-mono text-sm">
          <h3 className="text-slate-500 mb-2 border-b border-slate-800 pb-1">Terminal de Logs</h3>
          <pre className="whitespace-pre-wrap text-green-400">{log || 'Aguardando ações...'}</pre>
        </div>
      </div>
    </div>
  );
}
