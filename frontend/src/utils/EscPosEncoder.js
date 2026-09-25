export class EscPosEncoder {

    // Inicializa a impressora (Limpa o buffer)
    static init() {
        return new Uint8Array([0x1B, 0x40]);
    }

    // Alinhamento: 0 = Esquerda, 1 = Centro, 2 = Direita
    static align(mode) {
        return new Uint8Array([0x1B, 0x61, mode]);
    }

    // Negrito: true = Ligado, false = Desligado
    static bold(on) {
        return new Uint8Array([0x1B, 0x45, on ? 1 : 0]);
    }

    // Converte a String de texto para Bytes
    static text(str) {
        const stringLimpa = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const encoder = new TextEncoder();
        return encoder.encode(stringLimpa);
    }

    // Guilhotina: Corta o papel
    static cut() {
        return new Uint8Array([0x1D, 0x56, 0x41, 0x10]);
    }

    // Abre a gaveta de dinheiro
    static openDrawer() {
        return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }

    // --- NOVO: Impressão Nativa de Código de Barras (CODE 128) ---
    static barcode128(data) {
        // Envolve em chave B para o padrão Code 128
        const textBytes = this.text('{B' + data);
        return new Uint8Array([
            0x1D, 0x68, 0x40, // GS h 64 : Altura do código de barras (64 dots)
            0x1D, 0x77, 0x02, // GS w 2 : Largura das barras
            0x1D, 0x48, 0x02, // GS H 2 : Posição do texto (Abaixo do código)
            0x1D, 0x6B, 0x49, textBytes.length, // GS k 73 [tamanho] [dados]
            ...textBytes
        ]);
    }

    // Junta todos os arrays de bytes num único pacote
    static build(commands) {
        const totalLength = commands.reduce((acc, cmd) => acc + cmd.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const cmd of commands) {
            result.set(cmd, offset);
            offset += cmd.length;
        }

        return result;
    }
}
