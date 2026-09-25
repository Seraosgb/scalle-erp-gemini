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

    // Converte a String de texto para Bytes (Removendo acentos para evitar falhas em impressoras antigas)
    static text(str) {
        const stringLimpa = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const encoder = new TextEncoder();
        return encoder.encode(stringLimpa);
    }

    // Guilhotina: Corta o papel (Partial Cut)
    static cut() {
        return new Uint8Array([0x1D, 0x56, 0x41, 0x10]);
    }

    // Abre a gaveta de dinheiro
    static openDrawer() {
        return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }

    // Junta todos os arrays de bytes num único pacote binário para enviar à porta COM/USB
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
