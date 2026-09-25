import { create } from 'zustand';

export const useHardwareStore = create((set, get) => ({
  // --- ESTADO DA BALANÇA ---
  pesoBalanca: "0.000",
  balancaConectada: false,
  balancaPort: null,
  balancaReader: null,
  erroBalanca: null,

  // --- ESTADO DA IMPRESSORA ---
  impressoraConectada: false,
  impressoraPort: null,
  isPrinting: false,

  // --- PARAMETRIZAÇÃO DO TENANT ---
  config: {
    impressaoAutomatica: true, // Parametrizável via banco no futuro
  },
  toggleImpressaoAutomatica: () => set((state) => ({
    config: { ...state.config, impressaoAutomatica: !state.config.impressaoAutomatica }
  })),

  // --- AÇÕES DA BALANÇA ---
  conectarBalanca: async () => {
    try {
      if (!navigator.serial) throw new Error("Web Serial API não suportada.");
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      set({ balancaPort: port, balancaReader: reader, balancaConectada: true, erroBalanca: null });

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const numeros = buffer.replace(/[^0-9]/g, '');
        if (numeros.length >= 5) {
          const pesoExtraido = numeros.slice(-5);
          set({ pesoBalanca: (parseInt(pesoExtraido, 10) / 1000).toFixed(3) });
          buffer = "";
        }
        if (buffer.length > 50) buffer = "";
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') set({ erroBalanca: err.message, balancaConectada: false });
    }
  },

  desconectarBalanca: async () => {
    const { balancaReader, balancaPort } = get();
    if (balancaReader) { await balancaReader.cancel(); }
    if (balancaPort) { await balancaPort.close(); }
    set({ balancaConectada: false, balancaReader: null, balancaPort: null, pesoBalanca: "0.000" });
  },

  // --- AÇÕES DA IMPRESSORA ---
  conectarImpressora: async () => {
    try {
      if (!navigator.serial) throw new Error("Web Serial API não suportada.");
      const port = await navigator.serial.requestPort();
      // Não abrimos a porta aqui, apenas guardamos a permissão do utilizador
      set({ impressoraPort: port, impressoraConectada: true });
    } catch (err) {
      console.error(err);
    }
  },

  imprimirCupom: async (bytesPackage) => {
    const { impressoraPort } = get();
    if (!impressoraPort) return false;

    set({ isPrinting: true });
    try {
      await impressoraPort.open({ baudRate: 9600 });
      const writer = impressoraPort.writable.getWriter();
      await writer.write(bytesPackage);
      await writer.close();
      await impressoraPort.close();
      set({ isPrinting: false });
      return true;
    } catch (err) {
      console.error("Falha na impressão:", err);
      set({ isPrinting: false });
      return false;
    }
  }
}));
