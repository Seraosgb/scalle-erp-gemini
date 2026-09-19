import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Adicionado
import { api } from '../../services/api'; // <-- Ajustado o import da API
import { FolderKanban, Plus } from 'lucide-react'; // <-- Ícones

export default function ProjetosList() {
    const [projetos, setProjetos] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // <-- Hook de roteamento

    useEffect(() => {
        carregarProjetos();
    }, []);

    const carregarProjetos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/projetos');
            setProjetos(response.data.data || response.data || []);
        } catch (error) {
            console.error("Erro ao carregar a lista de projetos:", error);
        } finally {
            setLoading(false);
        }
    };

    const criarProjeto = async () => {
        const nome = window.prompt("Qual o nome do novo Projeto?");
        if (!nome) return;

        try {
            const res = await api.post('/projetos', {
                nome,
                orcamento_previsto: 0
            });
            // Opcional: Redirecionar direto para o projeto recém-criado
            // navigate(`/app/projetos/${res.data.data.projeto.id}`);
            carregarProjetos();
        } catch (error) {
            alert("Erro ao criar projeto.");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Acessando central de projetos...</div>;

    return (
        <div className="min-h-screen space-y-6">
            <header className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FolderKanban className="h-6 w-6 text-indigo-500" /> Gestão de Projetos
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Módulo B2B de execução, custos e Kanban</p>
                </div>
                <button
                    onClick={criarProjeto}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition"
                >
                    <Plus className="h-4 w-4" /> Novo Projeto
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetos.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-500 border border-dashed border-slate-700 bg-slate-900/50 rounded-2xl">
                        Nenhum projeto encontrado no seu Tenant. Comece criando um novo!
                    </div>
                )}

                {projetos.map(projeto => (
                    <div
                        key={projeto.id}
                        // Navega para a rota de detalhes passando o ID na URL
                        onClick={() => navigate(`/app/projetos/${projeto.id}`)}
                        className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 hover:border-indigo-500 hover:shadow-indigo-500/20 transition cursor-pointer flex flex-col group"
                    >
                        <h2 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition">{projeto.nome}</h2>
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                            {projeto.descricao || "Sem descrição definida."}
                        </p>

                        <div className="mt-auto border-t border-slate-800 pt-4 flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">
                                Budget: <span className="text-emerald-400 font-bold font-mono">R$ {Number(projeto.orcamento_previsto).toLocaleString('pt-BR')}</span>
                            </span>
                            <span className="bg-indigo-950/50 border border-indigo-800 text-indigo-300 py-1 px-2 rounded-lg font-bold">
                                {projeto.tarefas_count || 0} Tarefas
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
