import { authStorage } from "./authApi";

const BASE = "";

async function req(method, path, data) {
  const token = authStorage.getToken();
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (data !== undefined) opts.body = JSON.stringify(data);
  const r = await fetch(BASE + path, opts);
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || `Errore ${r.status}`);
  return json;
}

const get   = p      => req("GET",    p);
const post  = (p, d) => req("POST",   p, d);
const put   = (p, d) => req("PUT",    p, d);
const patch = (p, d) => req("PATCH",  p, d);
const del   = p      => req("DELETE", p);

export const api = {
  dashboard: () => get("/api/dashboard"),
  getOutlets: () => get("/api/outlets"),
  createOutlet: d => post("/api/outlets", d),
  updateOutlet: (id,d) => put(`/api/outlets/${id}`, d),
  deleteOutlet: id => del(`/api/outlets/${id}`),
  getSale: oid => get(`/api/outlets/${oid}/sale`),
  createSala: (oid,d) => post(`/api/outlets/${oid}/sale`, d),
  updateSala: (id,d) => put(`/api/sale/${id}`, d),
  deleteSala: id => del(`/api/sale/${id}`),
  getTavoli: (sid, turnoId, data) => get(`/api/sale/${sid}/tavoli${turnoId||data ? '?'+(turnoId?'turno_id='+turnoId:'')+(turnoId&&data?'&':'')+(data?'data='+data:'') : ''}`),
  createTavolo: (sid,d) => post(`/api/sale/${sid}/tavoli`, d),
  updateTavolo: (id,d) => put(`/api/tavoli/${id}`, d),
  patchTavolo: (id,d) => patch(`/api/tavoli/${id}`, d),
  deleteTavolo: id => del(`/api/tavoli/${id}`),
  getTurni: p => get(`/api/turni${p}`),
  createTurno: d => post("/api/turni", d),
  updateTurno: (id,d) => put(`/api/turni/${id}`, d),
  deleteTurno: id => del(`/api/turni/${id}`),
  getAllergeni: () => get("/api/allergeni"),
  createAllergene: d => post("/api/allergeni", d),
  updateAllergene: (id,d) => put(`/api/allergeni/${id}`, d),
  deleteAllergene: id => del(`/api/allergeni/${id}`),
  getTipiMenu: () => get("/api/tipi-menu"),
  createTipoMenu: d => post("/api/tipi-menu", d),
  updateTipoMenu: (id,d) => put(`/api/tipi-menu/${id}`, d),
  deleteTipoMenu: id => del(`/api/tipi-menu/${id}`),
  getCategorieMenu: iv => get(`/api/categorie-menu${iv?"?include_voci=1":""}`),
  createCategoriaMenu: d => post("/api/categorie-menu", d),
  updateCategoriaMenu: (id,d) => put(`/api/categorie-menu/${id}`, d),
  deleteCategoriaMenu: id => del(`/api/categorie-menu/${id}`),
  getCategorieCliente: () => get("/api/categorie-cliente"),
  createCategoriaCliente: d => post("/api/categorie-cliente", d),
  updateCategoriaCliente: (id,d) => put(`/api/categorie-cliente/${id}`, d),
  deleteCategoriaCliente: id => del(`/api/categorie-cliente/${id}`),
  getVociMenu: p => get(`/api/voci-menu${p}`),
  getVoce: id => get(`/api/voci-menu/${id}`),
  createVoce: d => post("/api/voci-menu", d),
  updateVoce: (id,d) => put(`/api/voci-menu/${id}`, d),
  deleteVoce: id => del(`/api/voci-menu/${id}`),
  reorderCategorie: items => patch("/api/categorie-menu/reorder", items),
  // Stampanti
  getStampanti:         p    => get(`/api/stampanti${p||""}`),
  createStampante:      d    => post("/api/stampanti", d),
  updateStampante:      (id,d)=> put(`/api/stampanti/${id}`, d),
  deleteStampante:      id   => del(`/api/stampanti/${id}`),
  getVoceStampanti:     vid  => get(`/api/voci-menu/${vid}/stampanti`),
  setVoceStampanti:     (vid,d)=> post(`/api/voci-menu/${vid}/stampanti`, d),
  stampaReparti:        d    => post("/api/stampa-reparti", d),
  reorderVoci:      items => patch("/api/voci-menu/reorder",      items),
  // Voce → Monitor links
  getVoceMonitor:   vid  => get(`/api/voci-menu/${vid}/monitor`),
  setVoceMonitor:   (vid,d)=> fetch(`/api/voci-menu/${vid}/monitor`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("outlet_token")||""}`},body:JSON.stringify(d)}).then(r=>r.json()),
  // Clienti & Wallet
  getClienti:         p     => get(`/api/clienti${p||""}`),
  createCliente:      d     => post("/api/clienti", d),
  updateCliente:      (id,d)=> put(`/api/clienti/${id}`, d),
  deleteCliente:      id    => del(`/api/clienti/${id}`),
  getWallets:         p     => get(`/api/wallets${p||""}`),
  createWallet:       d     => post("/api/wallets", d),
  updateWallet:       (id,d)=> put(`/api/wallets/${id}`, d),
  deleteWallet:       id    => del(`/api/wallets/${id}`),
  ricaricaWallet:     (id,d)=> post(`/api/wallets/${id}/ricarica`, d),
  pagaWallet:         (id,d)=> post(`/api/wallets/${id}/paga`, d),
  scanWallet:         token => fetch(`/api/wallets/scan/${token}`,{headers:{Authorization:`Bearer ${localStorage.getItem("outlet_token")||""}`}}).then(r=>r.json()),
  getMovimentiWallet: id    => get(`/api/wallets/${id}/movimenti`),
  // Mobile Wallet (Apple + Google)
  getMobileWalletConfig:    ()  => get("/api/mobile-wallet-config"),
  updateMobileWalletConfig: d   => put("/api/mobile-wallet-config", d),
  getApplePass:             wid => `${"/api/mobile-wallet/apple/"}${wid}`,
  getGoogleWalletUrl:       wid => get(`/api/mobile-wallet/google/${wid}`),
  // Email Config
  getEmailConfig:     ()    => get("/api/email-config"),
  updateEmailConfig:  d     => put("/api/email-config", d),
  testEmail:          d     => post("/api/email-config/test", d),
  sendWalletEmail:    d     => post("/api/email-config/send-wallet", d),
  // Web Menu
  getWebMenus:     p     => get(`/api/web-menu${p||""}`),
  createWebMenu:   d     => post("/api/web-menu", d),
  updateWebMenu:   (id,d)=> put(`/api/web-menu/${id}`, d),
  deleteWebMenu:   id    => del(`/api/web-menu/${id}`),
  // Monitor KDS
  getMonitor:       p     => get(`/api/monitor${p||""}`),
  createMonitor:    d     => post("/api/monitor", d),
  updateMonitor:    (id,d)=> put(`/api/monitor/${id}`, d),
  deleteMonitor:    id    => del(`/api/monitor/${id}`),
  // Comanda turno
  avanzaTurno:      id    => fetch(`/api/comande/${id}/avanza-turno`,{method:"PATCH",headers:{Authorization:`Bearer ${localStorage.getItem("outlet_token")||""}`}}).then(r=>r.json()),
  getMenuDelGiorno: p => get(`/api/menu-del-giorno${p}`),
  createMenuDelGiorno: d => post("/api/menu-del-giorno", d),
  updateMenuDelGiorno: (id,d) => put(`/api/menu-del-giorno/${id}`, d),
  deleteMenuDelGiorno: id => del(`/api/menu-del-giorno/${id}`),
  getPrenotazioni: p => get(`/api/prenotazioni${p}`),
  createPrenotazione: d => post("/api/prenotazioni", d),
  updatePrenotazione: (id,d) => put(`/api/prenotazioni/${id}`, d),
  deletePrenotazione: id => del(`/api/prenotazioni/${id}`),
  getComande: p => get(`/api/comande${p}`),
  createComanda: d => post("/api/comande", d),
  updateComanda: (id,d) => patch(`/api/comande/${id}`, d),
  chiudiComanda: (id,tipo) => post(`/api/comande/${id}/chiudi?tipo_chiusura=${tipo}`),
  getSalaStats: (sid, data) => get(`/api/sala/${sid}/stats${data?'?data='+data:''}`),
};

// Prenotazioni extra
export const prenotazioniApi = {
  getCapacitaTurno: (tid, data) => fetch(`/api/turni/${tid}/capacita?data=${data}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("outlet_token")||""}` }
  }).then(r => r.json()),

  exportCSV: (params) => {
    const q = new URLSearchParams({...params, format:"csv"}).toString();
    window.open(`/api/prenotazioni/export?${q}`, "_blank");
  },

  exportJSON: (params) => fetch(`/api/prenotazioni/export?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("outlet_token")||""}` }
  }).then(r => r.json()),
};
