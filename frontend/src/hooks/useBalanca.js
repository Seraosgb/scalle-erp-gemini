import { useState, useRef } from 'react';

export function useBalanca() {
    const [peso, setPeso] = useState("0.000");
    const [conectado, setConectado] = useState(false);
    const [erro, setErro] = useState(null);

    // Referências para podermos fechar a conexão depois
    const portRef = useRef(null);
    const readerRef = useRef(null);

    const conectarBalanca = async () => {
        setErro(null);
        try {
            if (!navigator.serial) {
                throw new Error("Navegador não suporta Web Serial API.");
            }

            // Pede permissão ao usuário e abre a porta (Padrão Toledo/Filizola: 9600 ou 4800 bps)
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });

            portRef.current = port;
            setConectado(true);

            // Cria um decodificador de texto para ler a Stream (fluxo contínuo) da porta USB
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();
            readerRef.current = reader;

            let buffer = "";

            // Loop infinito escutando a balança
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    reader.releaseLock();
                    break;
                }

                buffer += value;

                // Balanças geralmente separam os envios por quebra de linha ou caracteres de controle
                // Vamos usar um Regex simples para pegar os últimos 5 números recebidos
                const numeros = buffer.replace(/[^0-9]/g, '');

                if (numeros.length >= 5) {
                    // Pega os últimos 5 dígitos (Ex: Toledo envia STX + 02150 + ETX -> 02150 = 2.150 Kg)
                    const pesoExtraido = numeros.slice(-5);
                    const pesoFormatado = (parseInt(pesoExtraido, 10) / 1000).toFixed(3);
                    setPeso(pesoFormatado);
                    buffer = ""; // Limpa o buffer após leitura de sucesso
                }

                // Prevenção de estouro de memória caso a balança mande lixo
                if (buffer.length > 50) buffer = "";
            }

        } catch (err) {
            console.error("Erro na balança USB:", err);
            if (err.name !== 'NotFoundError') {
                setErro(err.message);
            }
            setConectado(false);
        }
    };

    const desconectarBalanca = async () => {
        try {
            if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current = null;
            }
            if (portRef.current) {
                await portRef.current.close();
                portRef.current = null;
            }
            setConectado(false);
            setPeso("0.000");
        } catch (err) {
            console.error("Erro ao desconectar:", err);
        }
    };

    return { peso, conectado, erro, conectarBalanca, desconectarBalanca };
}
