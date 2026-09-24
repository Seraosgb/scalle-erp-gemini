export class EscPosEncoder {
    // Inicializa a impressora
    static init() { return new Uint8Array([0x1B, 0x40]); }

    // Converte string para bytes (Suporte básico Latin)
    static text(str) {
        return new TextEncoder().encode(str + '\n');
    }

    // Negrito On/Off
    static bold(on) { return new Uint8Array([0x1B, 0x45, on ? 1 : 0]); }

    // Abre a gaveta de dinheiro (Kick Drawer)
    static openDrawer() { return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]); }

    // Corta o papel (Guilhotina)
    static cut() { return new Uint8Array([0x1D, 0x56, 0x41, 0x10]); }

    // Utilitário para juntar todos os bytes
    static concat(buffers) {
        const totalLength = buffers.reduce((acc, val) => acc + val.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        buffers.forEach(buffer => {
            result.set(buffer, offset);
            offset += buffer.length;
        });
        return result;
    }
}
