import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  OUTLETS, SALE, TURNI, tavoliIniziali, prenotazioniIniziali, comandeIniziali,
  VOCI_MENU, CATEGORIE_MENU, TIPI_MENU, CATEGORIE_CLIENTE, oggiISO, turnoCorrente,
  menuGiornoIniziali, webMenuIniziali,
  ALLERGENI_UE, STAMPANTI, MONITOR_KDS, CONFIG_EMAIL, CONFIG_WALLET,
  RUOLI_FB, UTENTI_FB, WALLET_CLIENTI,
  type CategoriaMenu, type Comanda, type Outlet, type Prenotazione, type RigaComanda,
  type StatoRiga, type StatoTavolo, type Tavolo, type TipoMenu, type Turno, type VoceMenu,
  type MenuGiorno, type WebMenu, type Allergene, type CategoriaCliente,
  type Stampante, type MonitorKds, type ConfigEmail, type ConfigWallet,
  type RuoloFb, type UtenteFb, type WalletCliente, type MovimentoWallet,
  type Ingrediente, type ExtraRiga,
} from '../modules/operation/FoodBeverage/fb.model'

// ─── Store operativo Food & Beverage ─────────────────────────────────────────
//  Sorgente unica per le pagine operative della sezione (Sala ristorante,
//  Gestione comanda, Libro prenotazioni, Ospiti del giorno): tavoli e loro
//  stato, comande aperte con le righe, prenotazioni del giorno.
//
//  Il modello ricalca quello dell'Outlet Manager, così il passaggio alle API
//  reali resta una sostituzione di questo strato e non una riscrittura delle
//  pagine.

const nuovaRiga = (voceId: number, portata: number): RigaComanda => {
  const v = VOCI_MENU.find(x => x.id === voceId)!
  return {
    id: `r${voceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    voceId, nome: v.nome, prezzo: v.prezzo, qta: 1, portata, note: '', stato: 'in-comanda', sconto: 0,
    senza: [], extra: [],
  }
}

const oraCorrente = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Supplemento degli extra su una singola porzione. */
export const extraRiga = (r: RigaComanda) =>
  (r.extra ?? []).reduce((a, e) => a + e.prezzo * e.qta, 0)

/** Totale di una riga: gli extra seguono la quantità, lo sconto si toglie dopo. */
export const totaleRiga = (r: RigaComanda) => r.qta * (r.prezzo + extraRiga(r)) - r.sconto

/** Imponibile della comanda prima dello sconto di categoria cliente. */
export const totaleComanda = (c: Comanda | undefined) =>
  c ? c.righe.reduce((a, r) => a + totaleRiga(r), 0) : 0

/** Sconto (in €) derivante dalla categoria cliente della comanda. */
export const scontoComanda = (c: Comanda | undefined) => {
  if (!c) return 0
  const cat = CATEGORIE_CLIENTE.find(x => x.id === c.categoriaClienteId)
  return cat ? (totaleComanda(c) * cat.scontoPerc) / 100 : 0
}

/** Totale da incassare. */
export const totaleConto = (c: Comanda | undefined) => totaleComanda(c) - scontoComanda(c)

/** Contesto di servizio condiviso fra Sala, Comanda, Prenotazioni e Ospiti. */
export interface ContestoFb {
  outletId: number
  salaId: number
  turnoId: number | null
  /** Tavolo su cui si sta lavorando: è quello che apre Gestione comanda. */
  tavoloId: number | null
  /** yyyy-MM-dd della giornata di servizio. */
  data: string
}

interface FbState {
  /** Anagrafica della sezione: outlet e turni si configurano dalle loro pagine. */
  outlets: Outlet[]
  turni: Turno[]
  salvaOutlet: (o: Outlet) => void
  eliminaOutlet: (id: number) => void
  salvaTurno: (t: Turno) => void
  eliminaTurno: (id: number) => void

  /** Catalogo: tipi di menu → categorie → voci. È ciò che si ordina in comanda. */
  tipiMenu: TipoMenu[]
  categorie: CategoriaMenu[]
  voci: VoceMenu[]
  salvaTipoMenu: (t: TipoMenu) => void
  eliminaTipoMenu: (id: number) => void
  salvaCategoria: (c: CategoriaMenu) => void
  eliminaCategoria: (id: number) => void
  ordinaCategorie: (ids: number[]) => void
  salvaVoce: (v: VoceMenu) => void
  eliminaVoce: (id: number) => void

  /** Menu del giorno e menu pubblicati online. */
  menuGiorno: MenuGiorno[]
  webMenu: WebMenu[]
  salvaMenuGiorno: (m: MenuGiorno) => void
  eliminaMenuGiorno: (id: number) => void
  salvaWebMenu: (m: WebMenu) => void
  eliminaWebMenu: (id: number) => void

  /** Generali: allergeni, categorie cliente, periferiche e servizi. */
  allergeni: Allergene[]
  categorieCliente: CategoriaCliente[]
  stampanti: Stampante[]
  monitor: MonitorKds[]
  configEmail: ConfigEmail
  configWallet: ConfigWallet
  salvaAllergene: (a: Allergene) => void
  eliminaAllergene: (codice: string) => void
  salvaCategoriaCliente: (c: CategoriaCliente) => void
  eliminaCategoriaCliente: (id: number) => void
  salvaStampante: (s: Stampante) => void
  eliminaStampante: (id: number) => void
  salvaMonitor: (m: MonitorKds) => void
  eliminaMonitor: (id: number) => void
  salvaConfigEmail: (c: ConfigEmail) => void
  salvaConfigWallet: (c: ConfigWallet) => void

  /** Amministrazione: utenti, ruoli e wallet dei clienti. */
  utenti: UtenteFb[]
  ruoli: RuoloFb[]
  wallet: WalletCliente[]
  salvaUtente: (u: UtenteFb) => void
  eliminaUtente: (id: number) => void
  salvaRuolo: (r: RuoloFb) => void
  eliminaRuolo: (id: number) => void
  salvaWallet: (w: WalletCliente) => void
  eliminaWallet: (id: number) => void
  aggiungiMovimento: (walletId: number, m: Omit<MovimentoWallet, 'id'>) => void

  /** Posti occupati per tavolo: indici delle sedie attorno al tavolo.
   *  Serve alla vista planimetria, dove si lavora sedia per sedia. */
  posti: Record<number, number[]>
  occupaPosto: (tavoloId: number, indice: number) => void
  liberaPosti: (tavoloId: number) => void

  contesto: ContestoFb
  setContesto: (c: Partial<ContestoFb>) => void

  tavoli: Tavolo[]
  comande: Comanda[]
  prenotazioni: Prenotazione[]
  /** Progressivo delle comande della giornata. */
  progressivo: number

  // ── Tavoli ──
  setStatoTavolo: (id: number, stato: StatoTavolo) => void
  apriTavolo: (id: number, coperti: number, cameriere: string, turnoId: number | null, categoriaClienteId: number) => number
  liberaTavolo: (id: number) => void
  trasferisci: (daId: number, aId: number) => void
  unisci: (id: number, aId: number | null) => void
  setCoperti: (id: number, coperti: number) => void
  setCameriere: (id: number, cameriere: string) => void

  // ── Comande ──
  comandaDiTavolo: (tavoloId: number) => Comanda | undefined
  /** Seconda comanda sullo stesso tavolo (conti separati). */
  nuovaComanda: (tavoloId: number) => number
  /** Stacca le righe scelte in un conto a parte, già chiuso e incassato. */
  staccaConto: (comandaId: number, righeIds: string[], pagamento: Comanda['pagamento']) => number
  setNotaComanda: (comandaId: number, nota: string) => void
  aggiungiVoce: (comandaId: number, voceId: number, portata: number) => void
  setQta: (comandaId: number, rigaId: string, qta: number) => void
  setNotaRiga: (comandaId: number, rigaId: string, note: string) => void
  setPortataRiga: (comandaId: number, rigaId: string, portata: number) => void
  /** Toglie o rimette un ingrediente della ricetta ("senza cipolla"). */
  toggleSenzaRiga: (comandaId: number, rigaId: string, ingredienteId: number) => void
  /** Porta a `qta` l'aggiunta indicata; 0 la toglie dalla riga. */
  setExtraRiga: (comandaId: number, rigaId: string, ingrediente: Ingrediente, qta: number) => void
  setScontoRiga: (comandaId: number, rigaId: string, sconto: number) => void
  rimuoviRiga: (comandaId: number, rigaId: string) => void
  inviaComanda: (comandaId: number) => number
  avanzaRiga: (comandaId: number, rigaId: string) => void
  setStatoRighe: (comandaId: number, stato: StatoRiga) => void
  setCategoriaCliente: (comandaId: number, categoriaClienteId: number) => void
  setAddebitoCamera: (comandaId: number, camera: string) => void
  chiudiConto: (comandaId: number, pagamento: Comanda['pagamento']) => void

  // ── Prenotazioni ──
  creaPrenotazione: (p: Omit<Prenotazione, 'id'>) => number
  aggiornaPrenotazione: (id: number, p: Partial<Prenotazione>) => void
  eliminaPrenotazione: (id: number) => void
  assegnaTavolo: (prenotazioneId: number, tavoloId: number | null) => void

  reset: () => void
}

export const useFbStore = create<FbState>()(
  persist(
    (set, get) => ({
      outlets: OUTLETS,
      turni: TURNI,
      tipiMenu: TIPI_MENU,
      categorie: CATEGORIE_MENU,
      voci: VOCI_MENU,

      salvaTipoMenu: t =>
        set(s => ({
          tipiMenu: s.tipiMenu.some(x => x.id === t.id)
            ? s.tipiMenu.map(x => x.id === t.id ? t : x)
            : [...s.tipiMenu, { ...t, id: Math.max(0, ...s.tipiMenu.map(x => x.id)) + 1 }],
        })),

      eliminaTipoMenu: id =>
        set(s => ({ tipiMenu: s.tipiMenu.filter(t => t.id !== id) })),

      salvaCategoria: c =>
        set(s => ({
          categorie: s.categorie.some(x => x.id === c.id)
            ? s.categorie.map(x => x.id === c.id ? c : x)
            : [...s.categorie, {
                ...c,
                id: Math.max(0, ...s.categorie.map(x => x.id)) + 1,
                ordine: Math.max(0, ...s.categorie.map(x => x.ordine)) + 1,
              }],
        })),

      eliminaCategoria: id =>
        set(s => ({ categorie: s.categorie.filter(c => c.id !== id) })),

      // L'ordine delle categorie è quello in cui compaiono nel POS: si riordina
      // trascinando, e qui si riscrive la sequenza per intero
      ordinaCategorie: ids =>
        set(s => ({
          categorie: s.categorie.map(c => {
            const i = ids.indexOf(c.id)
            return i < 0 ? c : { ...c, ordine: i + 1 }
          }),
        })),

      salvaVoce: v =>
        set(s => ({
          voci: s.voci.some(x => x.id === v.id)
            ? s.voci.map(x => x.id === v.id ? v : x)
            : [...s.voci, { ...v, id: Math.max(0, ...s.voci.map(x => x.id)) + 1 }],
        })),

      eliminaVoce: id =>
        set(s => ({ voci: s.voci.filter(v => v.id !== id) })),

      menuGiorno: menuGiornoIniziali(),
      webMenu: webMenuIniziali(),

      salvaMenuGiorno: m =>
        set(s => ({
          menuGiorno: s.menuGiorno.some(x => x.id === m.id)
            ? s.menuGiorno.map(x => x.id === m.id ? m : x)
            : [...s.menuGiorno, { ...m, id: Math.max(0, ...s.menuGiorno.map(x => x.id)) + 1 }],
        })),

      eliminaMenuGiorno: id =>
        set(s => ({ menuGiorno: s.menuGiorno.filter(m => m.id !== id) })),

      salvaWebMenu: m =>
        set(s => ({
          webMenu: s.webMenu.some(x => x.id === m.id)
            ? s.webMenu.map(x => x.id === m.id ? m : x)
            : [...s.webMenu, { ...m, id: Math.max(0, ...s.webMenu.map(x => x.id)) + 1 }],
        })),

      eliminaWebMenu: id =>
        set(s => ({ webMenu: s.webMenu.filter(m => m.id !== id) })),

      allergeni: ALLERGENI_UE,
      categorieCliente: CATEGORIE_CLIENTE,
      stampanti: STAMPANTI,
      monitor: MONITOR_KDS,
      configEmail: CONFIG_EMAIL,
      configWallet: CONFIG_WALLET,

      salvaAllergene: a =>
        set(s => ({
          allergeni: s.allergeni.some(x => x.codice === a.codice)
            ? s.allergeni.map(x => x.codice === a.codice ? a : x)
            : [...s.allergeni, a],
        })),

      eliminaAllergene: codice =>
        set(s => ({ allergeni: s.allergeni.filter(a => a.codice !== codice) })),

      salvaCategoriaCliente: c =>
        set(s => ({
          categorieCliente: s.categorieCliente.some(x => x.id === c.id)
            ? s.categorieCliente.map(x => x.id === c.id ? c : x)
            : [...s.categorieCliente, { ...c, id: Math.max(0, ...s.categorieCliente.map(x => x.id)) + 1 }],
        })),

      eliminaCategoriaCliente: id =>
        set(s => ({ categorieCliente: s.categorieCliente.filter(c => c.id !== id) })),

      salvaStampante: st =>
        set(s => ({
          stampanti: s.stampanti.some(x => x.id === st.id)
            ? s.stampanti.map(x => x.id === st.id ? st : x)
            : [...s.stampanti, { ...st, id: Math.max(0, ...s.stampanti.map(x => x.id)) + 1 }],
        })),

      eliminaStampante: id =>
        set(s => ({ stampanti: s.stampanti.filter(x => x.id !== id) })),

      salvaMonitor: m =>
        set(s => ({
          monitor: s.monitor.some(x => x.id === m.id)
            ? s.monitor.map(x => x.id === m.id ? m : x)
            : [...s.monitor, { ...m, id: Math.max(0, ...s.monitor.map(x => x.id)) + 1 }],
        })),

      eliminaMonitor: id =>
        set(s => ({ monitor: s.monitor.filter(m => m.id !== id) })),

      salvaConfigEmail: c => set({ configEmail: c }),
      salvaConfigWallet: c => set({ configWallet: c }),

      utenti: UTENTI_FB,
      ruoli: RUOLI_FB,
      wallet: WALLET_CLIENTI,

      salvaUtente: u =>
        set(s => ({
          utenti: s.utenti.some(x => x.id === u.id)
            ? s.utenti.map(x => x.id === u.id ? u : x)
            : [...s.utenti, { ...u, id: Math.max(0, ...s.utenti.map(x => x.id)) + 1 }],
        })),

      eliminaUtente: id =>
        set(s => ({ utenti: s.utenti.filter(u => u.id !== id) })),

      salvaRuolo: r =>
        set(s => ({
          ruoli: s.ruoli.some(x => x.id === r.id)
            ? s.ruoli.map(x => x.id === r.id ? r : x)
            : [...s.ruoli, { ...r, id: Math.max(0, ...s.ruoli.map(x => x.id)) + 1 }],
        })),

      eliminaRuolo: id =>
        set(s => ({
          ruoli: s.ruoli.filter(r => r.id !== id),
          // Gli utenti che lo avevano restano senza ruolo, non senza accesso
          utenti: s.utenti.map(u => u.ruoloId === id ? { ...u, ruoloId: null } : u),
        })),

      salvaWallet: w =>
        set(s => ({
          wallet: s.wallet.some(x => x.id === w.id)
            ? s.wallet.map(x => x.id === w.id ? w : x)
            : [...s.wallet, { ...w, id: Math.max(0, ...s.wallet.map(x => x.id)) + 1 }],
        })),

      eliminaWallet: id =>
        set(s => ({ wallet: s.wallet.filter(w => w.id !== id) })),

      aggiungiMovimento: (walletId, m) =>
        set(s => ({
          wallet: s.wallet.map(w => w.id === walletId
            ? { ...w, movimenti: [...w.movimenti, { ...m, id: `m${Date.now().toString(36)}` }] }
            : w),
        })),

      salvaOutlet: o =>
        set(s => ({
          outlets: s.outlets.some(x => x.id === o.id)
            ? s.outlets.map(x => x.id === o.id ? o : x)
            : [...s.outlets, { ...o, id: Math.max(0, ...s.outlets.map(x => x.id)) + 1 }],
        })),

      eliminaOutlet: id =>
        set(s => ({ outlets: s.outlets.filter(o => o.id !== id) })),

      salvaTurno: t =>
        set(s => ({
          turni: s.turni.some(x => x.id === t.id)
            ? s.turni.map(x => x.id === t.id ? t : x)
            : [...s.turni, { ...t, id: Math.max(0, ...s.turni.map(x => x.id)) + 1 }],
        })),

      eliminaTurno: id =>
        set(s => ({ turni: s.turni.filter(t => t.id !== id) })),

      posti: {},

      occupaPosto: (tavoloId, indice) =>
        set(s => {
          const attuali = s.posti[tavoloId] ?? []
          const nuovi = attuali.includes(indice)
            ? attuali.filter(i => i !== indice)
            : [...attuali, indice].sort((a, b) => a - b)
          return {
            posti: { ...s.posti, [tavoloId]: nuovi },
            // I coperti del tavolo seguono le sedie occupate
            tavoli: s.tavoli.map(t => t.id === tavoloId ? { ...t, coperti: nuovi.length } : t),
            comande: s.comande.map(c =>
              c.tavoloId === tavoloId && c.stato === 'aperta' ? { ...c, coperti: nuovi.length } : c),
          }
        }),

      liberaPosti: tavoloId =>
        set(s => ({ posti: { ...s.posti, [tavoloId]: [] } })),

      contesto: { outletId: 1, salaId: 1, turnoId: turnoCorrente(1)?.id ?? null, tavoloId: null, data: oggiISO() },
      setContesto: c => set(s => ({ contesto: { ...s.contesto, ...c } })),

      tavoli: tavoliIniziali(),
      comande: comandeIniziali(),
      prenotazioni: prenotazioniIniziali(),
      progressivo: comandeIniziali().length,

      // ── Tavoli ────────────────────────────────────────────────────────────
      setStatoTavolo: (id, stato) =>
        set(s => ({ tavoli: s.tavoli.map(t => t.id === id ? { ...t, stato } : t) })),

      apriTavolo: (id, coperti, cameriere, turnoId, categoriaClienteId) => {
        const st = get()
        const esistente = st.comande.find(c => c.tavoloId === id && c.stato === 'aperta')
        if (esistente) {
          set({ tavoli: st.tavoli.map(t => t.id === id ? { ...t, stato: 'occupato', coperti, cameriere } : t) })
          return esistente.id
        }
        const tavolo = st.tavoli.find(t => t.id === id)
        const sala = SALE.find(x => x.id === tavolo?.salaId)
        const numero = st.progressivo + 1
        const comanda: Comanda = {
          id: Date.now(),
          numero: String(numero).padStart(3, '0'),
          outletId: sala?.outletId ?? 1,
          salaId: tavolo?.salaId ?? 1,
          tavoloId: id,
          turnoId,
          coperti,
          cameriere,
          categoriaClienteId,
          apertaAlle: oraCorrente(),
          chiusaAlle: null,
          stato: 'aperta',
          righe: [],
          nota: '',
          addebitoCamera: '',
          pagamento: null,
        }
        set({
          comande: [...st.comande, comanda],
          progressivo: numero,
          tavoli: st.tavoli.map(t =>
            t.id === id ? { ...t, stato: 'occupato', coperti, cameriere, apertoAlle: comanda.apertaAlle } : t),
        })
        return comanda.id
      },

      liberaTavolo: id =>
        set(s => ({
          tavoli: s.tavoli.map(t =>
            t.id === id ? { ...t, stato: 'libero', coperti: 0, cameriere: null, apertoAlle: null, unitoA: null } : t),
          posti: { ...s.posti, [id]: [] },
        })),

      trasferisci: (daId, aId) =>
        set(s => {
          const da = s.tavoli.find(t => t.id === daId)
          if (!da) return {}
          return {
            tavoli: s.tavoli.map(t => {
              if (t.id === aId) return { ...t, stato: da.stato, coperti: da.coperti, cameriere: da.cameriere, apertoAlle: da.apertoAlle }
              if (t.id === daId) return { ...t, stato: 'pulizia', coperti: 0, cameriere: null, apertoAlle: null }
              return t
            }),
            comande: s.comande.map(c => c.tavoloId === daId && c.stato === 'aperta' ? { ...c, tavoloId: aId } : c),
          }
        }),

      unisci: (id, aId) =>
        set(s => ({ tavoli: s.tavoli.map(t => t.id === id ? { ...t, unitoA: aId } : t) })),

      setCoperti: (id, coperti) =>
        set(s => ({
          tavoli: s.tavoli.map(t => t.id === id ? { ...t, coperti: Math.max(0, coperti) } : t),
          comande: s.comande.map(c => c.tavoloId === id && c.stato === 'aperta' ? { ...c, coperti: Math.max(0, coperti) } : c),
        })),

      setCameriere: (id, cameriere) =>
        set(s => ({
          tavoli: s.tavoli.map(t => t.id === id ? { ...t, cameriere } : t),
          comande: s.comande.map(c => c.tavoloId === id && c.stato === 'aperta' ? { ...c, cameriere } : c),
        })),

      // ── Comande ───────────────────────────────────────────────────────────
      comandaDiTavolo: tavoloId => get().comande.find(c => c.tavoloId === tavoloId && c.stato === 'aperta'),

      nuovaComanda: tavoloId => {
        const st = get()
        const t = st.tavoli.find(x => x.id === tavoloId)
        const sala = SALE.find(x => x.id === t?.salaId)
        const madre = st.comande.find(c => c.tavoloId === tavoloId && c.stato === 'aperta')
        const numero = st.progressivo + 1
        const comanda: Comanda = {
          id: Date.now(),
          numero: String(numero).padStart(3, '0'),
          outletId: sala?.outletId ?? 1,
          salaId: t?.salaId ?? 1,
          tavoloId,
          turnoId: madre?.turnoId ?? null,
          coperti: 1,
          cameriere: madre?.cameriere ?? '',
          categoriaClienteId: madre?.categoriaClienteId ?? 0,
          apertaAlle: oraCorrente(),
          chiusaAlle: null,
          stato: 'aperta',
          righe: [],
          nota: '',
          addebitoCamera: '',
          pagamento: null,
        }
        set({ comande: [...st.comande, comanda], progressivo: numero })
        return comanda.id
      },

      // Le righe scelte escono dalla comanda e diventano un conto a sé, già
      // chiuso: è il "dividi conto" del cameriere, che incassa per gruppi.
      staccaConto: (comandaId, righeIds, pagamento) => {
        const st = get()
        const madre = st.comande.find(c => c.id === comandaId)
        if (!madre) return 0
        const righe = madre.righe.filter(r => righeIds.includes(r.id))
        if (!righe.length) return 0
        const numero = st.progressivo + 1
        const staccata: Comanda = {
          ...madre,
          id: Date.now(),
          numero: `${String(numero).padStart(3, '0')}`,
          righe,
          stato: 'chiusa',
          chiusaAlle: oraCorrente(),
          pagamento,
        }
        set({
          progressivo: numero,
          comande: st.comande.map(c =>
            c.id === comandaId ? { ...c, righe: c.righe.filter(r => !righeIds.includes(r.id)) } : c,
          ).concat(staccata),
        })
        return staccata.id
      },

      setNotaComanda: (comandaId, nota) =>
        set(s => ({ comande: s.comande.map(c => c.id === comandaId ? { ...c, nota } : c) })),

      aggiungiVoce: (comandaId, voceId, portata) =>
        set(s => ({
          comande: s.comande.map(c => {
            if (c.id !== comandaId) return c
            // Stessa voce e stessa portata non ancora inviata: alza la quantità.
            // Una riga già personalizzata resta a sé: il bis non eredita le sue varianti.
            const gia = c.righe.find(r => r.voceId === voceId && r.portata === portata && r.stato === 'in-comanda'
              && !r.note && !(r.senza ?? []).length && !(r.extra ?? []).length)
            return gia
              ? { ...c, righe: c.righe.map(r => r.id === gia.id ? { ...r, qta: r.qta + 1 } : r) }
              : { ...c, righe: [...c.righe, nuovaRiga(voceId, portata)] }
          }),
        })),

      setQta: (comandaId, rigaId, qta) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c : {
            ...c,
            righe: qta <= 0
              ? c.righe.filter(r => r.id !== rigaId)
              : c.righe.map(r => r.id === rigaId ? { ...r, qta } : r),
          }),
        })),

      setNotaRiga: (comandaId, rigaId, note) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c
            : { ...c, righe: c.righe.map(r => r.id === rigaId ? { ...r, note } : r) }),
        })),

      setPortataRiga: (comandaId, rigaId, portata) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c
            : { ...c, righe: c.righe.map(r => r.id === rigaId ? { ...r, portata } : r) }),
        })),

      toggleSenzaRiga: (comandaId, rigaId, ingredienteId) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c : {
            ...c,
            righe: c.righe.map(r => {
              if (r.id !== rigaId) return r
              const senza = r.senza ?? []
              return {
                ...r,
                senza: senza.includes(ingredienteId)
                  ? senza.filter(x => x !== ingredienteId)
                  : [...senza, ingredienteId],
              }
            }),
          }),
        })),

      setExtraRiga: (comandaId, rigaId, ingrediente, qta) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c : {
            ...c,
            righe: c.righe.map(r => {
              if (r.id !== rigaId) return r
              const extra = r.extra ?? []
              const gia = extra.find(e => e.ingredienteId === ingrediente.id)
              if (qta <= 0) return { ...r, extra: extra.filter(e => e.ingredienteId !== ingrediente.id) }
              const nuovo: ExtraRiga = {
                ingredienteId: ingrediente.id, nome: ingrediente.nome,
                prezzo: ingrediente.prezzoExtra, qta,
              }
              return {
                ...r,
                extra: gia
                  ? extra.map(e => e.ingredienteId === ingrediente.id ? { ...e, qta } : e)
                  : [...extra, nuovo],
              }
            }),
          }),
        })),

      setScontoRiga: (comandaId, rigaId, sconto) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c
            : { ...c, righe: c.righe.map(r => r.id === rigaId ? { ...r, sconto } : r) }),
        })),

      rimuoviRiga: (comandaId, rigaId) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c
            : { ...c, righe: c.righe.filter(r => r.id !== rigaId) }),
        })),

      inviaComanda: comandaId => {
        const c = get().comande.find(x => x.id === comandaId)
        const daInviare = c ? c.righe.filter(r => r.stato === 'in-comanda').length : 0
        if (!daInviare) return 0
        set(s => ({
          comande: s.comande.map(x => x.id !== comandaId ? x
            : { ...x, righe: x.righe.map(r => r.stato === 'in-comanda' ? { ...r, stato: 'inviata' } : r) }),
          tavoli: s.tavoli.map(t => t.id === c!.tavoloId ? { ...t, stato: 'ordinato' } : t),
        }))
        return daInviare
      },

      avanzaRiga: (comandaId, rigaId) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c : {
            ...c,
            righe: c.righe.map(r => {
              if (r.id !== rigaId) return r
              const ordine: StatoRiga[] = ['in-comanda', 'inviata', 'in-preparazione', 'pronta', 'servita']
              const i = ordine.indexOf(r.stato)
              return { ...r, stato: ordine[Math.min(i + 1, ordine.length - 1)] }
            }),
          }),
        })),

      setStatoRighe: (comandaId, stato) =>
        set(s => ({
          comande: s.comande.map(c => c.id !== comandaId ? c
            : { ...c, righe: c.righe.map(r => ({ ...r, stato })) }),
        })),

      setCategoriaCliente: (comandaId, categoriaClienteId) =>
        set(s => ({ comande: s.comande.map(c => c.id === comandaId ? { ...c, categoriaClienteId } : c) })),

      setAddebitoCamera: (comandaId, camera) =>
        set(s => ({ comande: s.comande.map(c => c.id === comandaId ? { ...c, addebitoCamera: camera } : c) })),

      chiudiConto: (comandaId, pagamento) =>
        set(s => {
          const c = s.comande.find(x => x.id === comandaId)
          return {
            comande: s.comande.map(x => x.id !== comandaId ? x
              : { ...x, stato: 'chiusa', chiusaAlle: oraCorrente(), pagamento }),
            tavoli: s.tavoli.map(t =>
              t.id === c?.tavoloId ? { ...t, stato: 'pulizia', coperti: 0, cameriere: null, apertoAlle: null } : t),
          }
        }),

      // ── Prenotazioni ──────────────────────────────────────────────────────
      creaPrenotazione: p => {
        const id = Math.max(0, ...get().prenotazioni.map(x => x.id)) + 1
        set(s => ({ prenotazioni: [...s.prenotazioni, { ...p, id }] }))
        return id
      },

      aggiornaPrenotazione: (id, p) =>
        set(s => ({ prenotazioni: s.prenotazioni.map(x => x.id === id ? { ...x, ...p } : x) })),

      eliminaPrenotazione: id =>
        set(s => ({ prenotazioni: s.prenotazioni.filter(x => x.id !== id) })),

      assegnaTavolo: (prenotazioneId, tavoloId) =>
        set(s => {
          const pren = s.prenotazioni.find(p => p.id === prenotazioneId)
          const precedente = pren?.tavoloId ?? null
          return {
            prenotazioni: s.prenotazioni.map(p => p.id === prenotazioneId ? { ...p, tavoloId } : p),
            tavoli: s.tavoli.map(t => {
              if (t.id === tavoloId) return { ...t, stato: t.stato === 'libero' ? 'riservato' : t.stato }
              if (t.id === precedente && t.stato === 'riservato') return { ...t, stato: 'libero' }
              return t
            }),
          }
        }),

      reset: () => set({
        outlets: OUTLETS,
        turni: TURNI,
        tipiMenu: TIPI_MENU,
        categorie: CATEGORIE_MENU,
        voci: VOCI_MENU,
        menuGiorno: menuGiornoIniziali(),
        webMenu: webMenuIniziali(),
        allergeni: ALLERGENI_UE,
        categorieCliente: CATEGORIE_CLIENTE,
        stampanti: STAMPANTI,
        monitor: MONITOR_KDS,
        configEmail: CONFIG_EMAIL,
        configWallet: CONFIG_WALLET,
        utenti: UTENTI_FB,
        ruoli: RUOLI_FB,
        wallet: WALLET_CLIENTI,
        posti: {},
        tavoli: tavoliIniziali(),
        comande: comandeIniziali(),
        prenotazioni: prenotazioniIniziali(),
        progressivo: comandeIniziali().length,
      }),
    }),
    { name: 'sibylla.fb', version: 7 },
  ),
)

export { OUTLETS, SALE, TURNI }
