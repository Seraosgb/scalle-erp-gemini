const DB_NAME = 'scalle_pdv_db';
const STORE_NAME = 'vendas_offline';

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'offline_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const pdvOfflineService = {
  async salvarVendaOffline(vendaData) {
    const db = await abrirBanco();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      offline_id: `OFFLINE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payload: vendaData,
      criado_em: new Date().toISOString(),
      sincronizado: false
    };
    store.add(item);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(item);
    });
  },

  async listarVendasPendentes() {
    const db = await abrirBanco();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  async removerVendaSincronizada(offlineId) {
    const db = await abrirBanco();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(offlineId);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  }
};