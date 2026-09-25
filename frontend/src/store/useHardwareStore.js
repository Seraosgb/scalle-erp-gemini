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
      if (!navigator.serial) throw new Error("Web Serial API não suportada neste navegador. Use Google Chrome ou Microsoft Edge.");

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

        // Remove absolutamente tudo que não for número
        const numerosLidos = buffer.replace(/[^0-9]/g, '');

        // Balanças Filizola/Toledo mandam pacotes contínuos. Precisamos de 5 dígitos para formar 0.000kg
        if (numerosLidos.length >= 5) {
          // Extrai apenas os últimos 5 algarismos garantindo que é a leitura mais recente
          const pesoCru = numerosLidos.slice(-5);

          // Converte para float dividindo por 1000 (Ex: 04227 -> 4.227)
          const pesoMascara = (parseInt(pesoCru, 10) / 1000).toFixed(3);

          set({ pesoBalanca: pesoMascara });

          // Esvazia o buffer para a próxima leitura
          buffer = "";
        }

        // Despeja lixo de memória se o buffer engasgar com a porta serial (Safety net)
        if (buffer.length > 50) buffer = "";
      }
    } catch (err) {
      // O erro NotFoundError é quando o utilizador abre o pop-up e clica em Cancelar. Não é erro real.
      if (err.name !== 'NotFoundError') {
        set({ erroBalanca: err.message, balancaConectada: false });
      }
    }
  },

  desconectarBalanca: async () => {
    const { balancaReader, balancaPort } = get();
    try {
      if (balancaReader) { await balancaReader.cancel(); }
      if (balancaPort) { await balancaPort.close(); }
    } catch (error) {
      console.warn("Erro suave ao desconectar a porta USB:", error);
    }
    set({ balancaConectada: false, balancaReader: null, balancaPort: null, pesoBalanca: "0.000" });
  },

  // --- AÇÕES DA IMPRESSORA ---
  conectarImpressora: async () => {
    try {
      if (!navigator.serial) throw new Error("Web Serial API não suportada.");
      const port = await navigator.serial.requestPort();
      // Guardamos a instância da porta sem a abrir. Só a abrimos e fechamos no milissegundo em que imprimimos.
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
      // Abre a porta térmica a 9600bps (Padrão Epson/Bematech/Elgin)
      await impressoraPort.open({ baudRate: 9600 });
      const writer = impressoraPort.writable.getWriter();
      await writer.write(bytesPackage);
      await writer.close();
      await impressoraPort.close();
      set({ isPrinting: false });
      return true;
    } catch (err) {
      console.error("Falha na impressão térmica:", err);
      // Fecha forçadamente se a porta encravar
      try { await impressoraPort.close(); } catch(e){}
      set({ isPrinting: false });
      return false;
    }
  }
}));
