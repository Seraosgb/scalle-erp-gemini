import { create } from 'zustand';

export const usePdvStore = create((set, get) => ({
  carrinho: [],
  descontoGeral: 0,
  depositoId: '',
  formaPagamento: 'PIX',
  valorRecebido: 0,

  setDepositoId: (id) => set({ depositoId: id }),
  setFormaPagamento: (forma) => set({ formaPagamento: forma }),
  setDescontoGeral: (desc) => set({ descontoGeral: parseFloat(desc) || 0 }),
  setValorRecebido: (val) => set({ valorRecebido: parseFloat(val) || 0 }),

  adicionarItem: (item, quantidade = 1) => {
    const { carrinho } = get();
    const index = carrinho.findIndex((c) => c.item_id === item.id);

    if (index > -1) {
      const novoCarrinho = [...carrinho];
      novoCarrinho[index].quantidade += quantidade;
      novoCarrinho[index].total = novoCarrinho[index].quantidade * novoCarrinho[index].preco_unitario;
      set({ carrinho: novoCarrinho });
    } else {
      set({
        carrinho: [
          ...carrinho,
          {
            item_id: item.id,
            nome: item.nome,
            codigo_sku: item.codigo_sku,
            unidade: item.unidade_medida,
            quantidade,
            preco_unitario: parseFloat(item.preco_venda),
            total: quantidade * parseFloat(item.preco_venda),
          }
        ]
      });
    }
  },

  removerItem: (itemId) => {
    set({ carrinho: get().carrinho.filter((c) => c.item_id !== itemId) });
  },

  limparCarrinho: () => {
    set({
      carrinho: [],
      descontoGeral: 0,
      valorRecebido: 0,
      formaPagamento: 'PIX'
    });
  },

  getSubtotal: () => {
    return get().carrinho.reduce((acc, item) => acc + item.total, 0);
  },

  getTotalLiquido: () => {
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - get().descontoGeral);
  },

  getTroco: () => {
    const total = get().getTotalLiquido();
    const recebido = get().valorRecebido;
    return get().formaPagamento === 'DINHEIRO' && recebido > total ? recebido - total : 0;
  }
}));