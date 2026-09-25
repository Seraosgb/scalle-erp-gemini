import { useState, useEffect } from 'react';

export function useBalanca() {
    const [peso, setPeso] = useState("0.000");
    const [conectado, setConectado] = useState(false);

    useEffect(() => {
        // Conecta ao micro-serviço local rodando no PC do caixa
        const ws = new WebSocket('ws://localhost:3001');

        ws.onopen = () => setConectado(true);
        ws.onclose = () => setConectado(false);
        ws.onerror = (err) => console.error("Erro no WebSocket da Balança:", err);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.peso) {
                    setPeso(data.peso);
                }
            } catch (e) {
                console.error("Falha ao ler dados da balança", e);
            }
        };

        return () => ws.close(); // Limpa a conexão ao sair da tela
    }, []);

    return { peso, conectado };
}
