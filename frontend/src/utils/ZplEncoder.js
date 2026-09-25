export class ZplEncoder {
    static buildLabel(produtoNome, quantidade, data, sku) {
        const nomeLimpo = produtoNome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 40);

        // Estrutura padrão ZPL para uma etiqueta de 4x2 polegadas
        const zpl = `^XA
^PW600
^FO40,40^A0N,30,30^FDSCALLE WMS - RECEBIMENTO^FS
^FO40,90^A0N,25,25^FD${nomeLimpo}^FS
^FO40,140^A0N,20,20^FDQTD RECEBIDA: ${quantidade} | DT: ${data}^FS
^FO40,190^BCN,80,Y,N,N^FD${sku}^FS
^XZ
`;
        const encoder = new TextEncoder();
        return encoder.encode(zpl);
    }
}
