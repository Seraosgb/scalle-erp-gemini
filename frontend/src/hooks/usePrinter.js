import { useState } from 'react';

export function usePrinter() {
    const [isPrinting, setIsPrinting] = useState(false);
    const [error, setError] = useState(null);

    const printReceipt = async (bytesPackage) => {
        setIsPrinting(true);
        setError(null);

        try {
            // Verifica se o navegador tem suporte
            if (!navigator.serial) {
                throw new Error("Seu navegador não suporta impressão direta (Use Chrome ou Edge).");
            }

            // Abre o pop-up nativo pedindo para selecionar a impressora USB
            const port = await navigator.serial.requestPort();

            // Abre a porta com velocidade padrão de 9600 bps
            await port.open({ baudRate: 9600 });

            // Prepara o túnel de escrita
            const writer = port.writable.getWriter();

            // Escreve os bytes e fecha o túnel
            await writer.write(bytesPackage);
            await writer.close();
            await port.close();

            return true;
        } catch (err) {
            console.error("Erro na impressão:", err);
            // Ignora o erro se o usuário apenas clicou em "Cancelar" no pop-up
            if (err.name !== 'NotFoundError') {
                setError(err.message);
            }
            return false;
        } finally {
            setIsPrinting(false);
        }
    };

    return { printReceipt, isPrinting, error };
}
