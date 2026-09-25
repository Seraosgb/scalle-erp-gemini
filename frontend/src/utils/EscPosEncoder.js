export class EscPosEncoder {
    // 1. Acorda e reseta a impressora
    static init() { return new Uint8Array([0x1B, 0x40]); }

    // 2. Transforma texto em bytes (adicionando quebra de linha e removendo acentos para impressoras antigas)
    static text(str) {
        const cleanStr = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return new TextEncoder().encode(cleanStr + '\n');
    }

    // 3. Centraliza o texto (0 = Esquerda, 1 = Centro, 2 = Direita)
    static align(position) { return new Uint8Array([0x1B, 0x61, position]); }

    // 4. Negrito On/Off
    static bold(on) { return new Uint8Array([0x1B, 0x45, on ? 1 : 0]); }

    // 5. Abre a gaveta de dinheiro ligada à impressora (Pulso RJ11)
    static openDrawer() { return new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]); }

    // 6. Corta o papel (Guilhotina)
    static cut() { return new Uint8Array([0x1D, 0x56, 0x41, 0x10]); }

    // Utilitário para fundir todos os comandos num único pacote de bytes contínuo
    static build(commands) {
        const totalLength = commands.reduce((acc, val) => acc + val.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        commands.forEach(buffer => {
            result.set(buffer, offset);
            offset += buffer.length;
        });
        return result;
    }
}
