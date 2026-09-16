import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  OUTLETS, SALE, TURNI, tavoliIniziali, prenotazioniIniziali, comandeIniziali,
  VOCI_MENU, CATEGORIE_CLIENTE, oggiISO, turnoCorrente,
  type Comanda, type Outlet, type Prenotazione, type RigaComanda, type StatoRiga,
  type StatoTavolo, type Tavolo, type Turno,
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
  }
}

const oraCorrente = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Totale di una riga, sconto di riga incluso. */
export const totaleRiga = (r: RigaComanda) => r.qta * r.prezzo - r.sconto

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
            // Stessa voce e stessa portata non ancora inviata: alza la quantità
            const gia = c.righe.find(r => r.voceId === voceId && r.portata === portata && r.stato === 'in-comanda')
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
        posti: {},
        tavoli: tavoliIniziali(),
        comande: comandeIniziali(),
        prenotazioni: prenotazioniIniziali(),
        progressivo: comandeIniziali().length,
      }),
    }),
    { name: 'sibylla.fb', version: 2 },
  ),
)

export { OUTLETS, SALE, TURNI }
