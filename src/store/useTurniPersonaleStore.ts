import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DIPENDENTI_HR, REPARTI_HR, isoOf, nomeDipendente, useHrGestioneStore,
  type Reparto, type RichiestaAssenza, type TipoAssenza,
} from './useHrGestioneStore'
import type { CadenzaTurni } from './useNotifPrefsStore'
export type { CadenzaTurni }

// ─── HUMAN RESOURCES › TURNI DEL PERSONALE ───────────────────────────────────
// Turno settimanale: per ogni giorno, l'elenco dei dipendenti in servizio.
// Lo compilano a mano l'HR e i responsabili di reparto (trascinando i nomi sui
// giorni) oppure l'algoritmo di Sibylla, che tiene conto di ferie, permessi e
// malattie (store HR) e del carico di lavoro (occupazione della struttura).
// Pubblicare la settimana notifica il turno ai dipendenti nel Centro notifiche.
// Mock persistito (demo): il back end sostituirà seed, occupazione e algoritmo.

// ─── Contratti: giorni lavorativi a settimana ────────────────────────────────
export interface ContrattoTurno {
  /** Etichetta del contratto, es. "Part time 60%". */
  tipo: string
  /** Giorni di servizio a settimana previsti dal contratto. */
  giorni: number
}

// Full time su 5 giorni (40 h), full time su 6 giorni (CCNL turismo), part time
// verticali in percentuale (80% = 4 giorni, 60% = 3, 40% = 2) e lavoro a chiamata.
export const CONTRATTI_TURNO: Record<number, ContrattoTurno> = {
  1:  { tipo: 'Full time',              giorni: 5 },
  2:  { tipo: 'Full time',              giorni: 5 },
  3:  { tipo: 'Full time su 6 giorni',  giorni: 6 },
  4:  { tipo: 'Part time 60%',          giorni: 3 },
  5:  { tipo: 'Part time 80%',          giorni: 4 },
  6:  { tipo: 'Full time',              giorni: 5 },
  7:  { tipo: 'Part time 40%',          giorni: 2 },
  8:  { tipo: 'Full time',              giorni: 5 },
  9:  { tipo: 'Full time',              giorni: 5 },
  10: { tipo: 'Full time su 6 giorni',  giorni: 6 },
  11: { tipo: 'A chiamata (3 giorni)',  giorni: 3 },
  12: { tipo: 'Full time',              giorni: 5 },
}
export const contrattoDi = (id: number): ContrattoTurno => CONTRATTI_TURNO[id] ?? { tipo: 'Full time', giorni: 5 }

// ─── Date ─────────────────────────────────────────────────────────────────────
const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12) }
export const addGiorni = (iso: string, n: number) => { const d = parse(iso); d.setDate(d.getDate() + n); return isoOf(d) }
/** Lunedì della settimana che contiene `iso`. */
export const lunediDi = (iso: string) => { const d = parse(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d) }
export const giorniSettimana = (lunedi: string) => Array.from({ length: 7 }, (_, i) => addGiorni(lunedi, i))

const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
export const GIORNI_BREVI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']
export const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
/** "9 – 15 nov 2026" (o "30 nov – 6 dic 2026"). */
export function etichettaSettimana(lunedi: string) {
  const a = parse(lunedi), b = parse(addGiorni(lunedi, 6))
  const fine = `${b.getDate()} ${MESI_BREVI[b.getMonth()]} ${b.getFullYear()}`
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${fine}` : `${a.getDate()} ${MESI_BREVI[a.getMonth()]} – ${fine}`
}
export const giornoMese = (iso: string) => { const d = parse(iso); return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}` }

// ─── Carico di lavoro: occupazione della struttura ───────────────────────────
// Mock deterministico per data: weekend più pieni, piccola variazione giornaliera.
const BASE_OCC = [62, 58, 61, 67, 83, 94, 76]
export function occupazione(iso: string) {
  const d = parse(iso)
  const wd = (d.getDay() + 6) % 7
  const seed = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) * 9301 + 49297
  const rumore = ((seed % 233280) / 233280) * 12 - 6
  return Math.max(35, Math.min(99, Math.round(BASE_OCC[wd] + rumore)))
}
export type LivelloCarico = 'basso' | 'medio' | 'alto'
export const livelloCarico = (occ: number): LivelloCarico => occ >= 85 ? 'alto' : occ >= 65 ? 'medio' : 'basso'

/** Persone necessarie per reparto in base all'occupazione del giorno. */
export function fabbisognoReparto(reparto: Reparto, iso: string) {
  const occ = occupazione(iso)
  const wd = (parse(iso).getDay() + 6) % 7
  switch (reparto) {
    case 'Front office':    return occ >= 85 ? 3 : occ >= 60 ? 2 : 1
    case 'Cucina':          return occ >= 80 ? 2 : 1
    case 'Housekeeping':    return occ >= 85 ? 2 : 1
    case 'Manutenzione':    return wd === 6 ? 0 : 1
    case 'Amministrazione': return wd >= 5 ? 0 : 1
    case 'F&B':             return occ >= 80 ? 2 : 1
  }
}
export const fabbisogno = (iso: string, reparto?: Reparto | '') =>
  (reparto ? [reparto] : REPARTI_HR).reduce((s, r) => s + fabbisognoReparto(r, iso), 0)

// ─── Assenze (dalle richieste HR) ────────────────────────────────────────────
export interface AssenzaGiorno { tipo: TipoAssenza; inAttesa: boolean }
/** Assenza del dipendente nel giorno: approvata, oppure in attesa di approvazione. */
export function assenzaDi(richieste: RichiestaAssenza[], id: number, iso: string): AssenzaGiorno | null {
  const attive = richieste.filter(x => x.dipendenteId === id && x.dal <= iso && x.al >= iso
    && (x.stato === 'Approvata' || x.stato === 'Da approvare'))
  // Le approvate prevalgono sulle richieste ancora da decidere.
  const pick = attive.find(x => x.stato === 'Approvata') ?? attive[0]
  return pick ? { tipo: pick.tipo, inAttesa: pick.stato === 'Da approvare' } : null
}
/** Il permesso è a ore: il dipendente resta assegnabile. */
export const bloccaTurno = (a: AssenzaGiorno | null) => !!a && !a.inAttesa && a.tipo !== 'Permesso'

// ─── Algoritmo di Sibylla ─────────────────────────────────────────────────────
export type Assegnazioni = Record<string, number[]>

export interface SuggerimentoTurni {
  lunedi: string
  assegnazioni: Assegnazioni
  occupazioneMedia: number
  picco: { iso: string; occ: number }
  turni: number
  fabbisognoTot: number
  assenzeConsiderate: { id: number; tipo: TipoAssenza; inAttesa: boolean; giorni: number }[]
  scoperture: { iso: string; reparto: Reparto; mancano: number }[]
  note: string[]
}

export function suggerisciTurni(lunedi: string, richieste: RichiestaAssenza[]): SuggerimentoTurni {
  const giorni = giorniSettimana(lunedi)
  const out: Assegnazioni = Object.fromEntries(giorni.map(g => [g, [] as number[]]))
  const scoperture: SuggerimentoTurni['scoperture'] = []
  const note: string[] = []
  // Ordine di copertura: prima i giorni più carichi.
  const perCarico = [...giorni].sort((a, b) => occupazione(b) - occupazione(a))

  for (const rep of REPARTI_HR) {
    const staff = DIPENDENTI_HR.filter(d => d.reparto === rep)
    const residui = new Map(staff.map(d => [d.id, contrattoDi(d.id).giorni]))
    // Disponibile: nessuna assenza approvata; le richieste in attesa vengono evitate.
    const libero = (id: number, iso: string) => !assenzaDi(richieste, id, iso)
    const assegna = (id: number, iso: string) => { out[iso].push(id); residui.set(id, (residui.get(id) ?? 0) - 1) }

    // 1° giro: copre il fabbisogno dei giorni più carichi.
    for (const iso of perCarico) {
      let serve = fabbisognoReparto(rep, iso)
      const candidati = () => staff
        .filter(d => (residui.get(d.id) ?? 0) > 0 && !out[iso].includes(d.id) && libero(d.id, iso))
        .sort((a, b) => (residui.get(b.id) ?? 0) - (residui.get(a.id) ?? 0))
      while (serve > 0) {
        const c = candidati()[0]
        if (!c) break
        assegna(c.id, iso); serve--
      }
      if (serve > 0) scoperture.push({ iso, reparto: rep, mancano: serve })
    }
    // 2° giro: i giorni di contratto rimasti vanno sui giorni con più occupazione.
    for (const d of staff) {
      for (const iso of perCarico) {
        if ((residui.get(d.id) ?? 0) <= 0) break
        if (out[iso].includes(d.id) || !libero(d.id, iso)) continue
        if (fabbisognoReparto(rep, iso) === 0) continue
        assegna(d.id, iso)
      }
    }
  }

  // Assenze della settimana che l'algoritmo ha considerato.
  const assenze = new Map<string, SuggerimentoTurni['assenzeConsiderate'][number]>()
  for (const iso of giorni) for (const d of DIPENDENTI_HR) {
    const a = assenzaDi(richieste, d.id, iso)
    if (!a) continue
    const k = `${d.id}-${a.tipo}-${a.inAttesa}`
    const cur = assenze.get(k)
    if (cur) cur.giorni++
    else assenze.set(k, { id: d.id, tipo: a.tipo, inAttesa: a.inAttesa, giorni: 1 })
  }
  const assenzeConsiderate = Array.from(assenze.values())

  const occs = giorni.map(occupazione)
  const occupazioneMedia = Math.round(occs.reduce((s, x) => s + x, 0) / 7)
  const iPicco = occs.indexOf(Math.max(...occs))
  const turni = giorni.reduce((s, g) => s + out[g].length, 0)
  const fabbisognoTot = giorni.reduce((s, g) => s + fabbisogno(g), 0)

  note.push(`Picco di occupazione ${GIORNI_LUNGHI[iPicco].toLowerCase()} ${giornoMese(giorni[iPicco])} (${occs[iPicco]}%): più personale su Front office, Cucina e Housekeeping.`)
  for (const a of assenzeConsiderate) {
    const chi = nomeDipendente(a.id)
    note.push(a.inAttesa
      ? `${chi}: richiesta di ${a.tipo.toLowerCase()} ancora da approvare (${a.giorni} gg), lasciata libera per prudenza.`
      : `${chi} assente per ${a.tipo.toLowerCase()} (${a.giorni} gg): turni coperti dai colleghi del reparto.`)
  }
  // Scoperture raggruppate per reparto: una nota sola con i giorni interessati.
  for (const rep of REPARTI_HR) {
    const sc = scoperture.filter(s => s.reparto === rep).sort((x, y) => x.iso.localeCompare(y.iso))
    if (!sc.length) continue
    const tot = sc.reduce((n, s) => n + s.mancano, 0)
    const quando = sc.map(s => `${GIORNI_BREVI[giorni.indexOf(s.iso)].toLowerCase()}${s.mancano > 1 ? ` (${s.mancano})` : ''}`).join(', ')
    note.push(`${rep}: ${tot === 1 ? 'manca 1 turno' : `mancano ${tot} turni`} (${quando}). Valuta un extra o lo spostamento di un riposo.`)
  }

  for (const g of giorni) out[g].sort((a, b) => a - b)
  return { lunedi, assegnazioni: out, occupazioneMedia, picco: { iso: giorni[iPicco], occ: occs[iPicco] }, turni, fabbisognoTot, assenzeConsiderate, scoperture, note }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export type OrigineTurno = 'manuale' | 'sibylla'

export interface SettimanaTurni {
  origine: OrigineTurno
  /** Modificata a mano dopo il suggerimento di Sibylla. */
  modificata?: boolean
  salvataAt?: string
  pubblicataAt?: string
}

export interface PubblicazioneTurno {
  id: string
  lunedi: string
  /** ISO datetime. */
  at: string
  /** Fotografia del turno inviato ai dipendenti. */
  assegnazioni: Assegnazioni
  destinatari: number
}

interface TurniState {
  assegnazioni: Assegnazioni
  settimane: Record<string, SettimanaTurni>
  pubblicazioni: PubblicazioneTurno[]
  /** Settimana da aprire quando si arriva da una notifica. */
  focusLunedi: string | null

  assegna: (iso: string, id: number) => void
  rimuovi: (iso: string, id: number) => void
  sposta: (da: string, a: string, id: number) => void
  svuota: (lunedi: string) => void
  applicaSuggerimento: (s: SuggerimentoTurni) => void
  salva: (lunedi: string) => void
  pubblica: (lunedi: string) => PubblicazioneTurno
  setFocus: (lunedi: string | null) => void
}

const uid = () => `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const settimanaDi = (iso: string) => lunediDi(iso)
const toccata = (st: TurniState, iso: string): Record<string, SettimanaTurni> => {
  const l = settimanaDi(iso)
  const cur = st.settimane[l] ?? { origine: 'manuale' as OrigineTurno }
  return { ...st.settimane, [l]: { ...cur, modificata: cur.origine === 'sibylla' ? true : cur.modificata } }
}

function seed(): Pick<TurniState, 'assegnazioni' | 'settimane' | 'pubblicazioni' | 'focusLunedi'> {
  const richieste = useHrGestioneStore.getState().richieste
  const oggi = lunediDi(isoOf(new Date()))
  const prec = addGiorni(oggi, -7)
  const assegnazioni: Assegnazioni = {}
  const pubblicazioni: PubblicazioneTurno[] = []
  // Settimana scorsa e corrente: generate da Sibylla, la corrente ritoccata a mano.
  for (const l of [prec, oggi]) {
    const s = suggerisciTurni(l, richieste)
    Object.assign(assegnazioni, s.assegnazioni)
    const at = `${addGiorni(l, -3)}T17:30:00`
    pubblicazioni.unshift({ id: `pt-seed-${l}`, lunedi: l, at, assegnazioni: s.assegnazioni, destinatari: new Set(Object.values(s.assegnazioni).flat()).size })
  }
  return {
    assegnazioni,
    settimane: {
      [prec]: { origine: 'sibylla', salvataAt: `${addGiorni(prec, -3)}T17:20:00`, pubblicataAt: `${addGiorni(prec, -3)}T17:30:00` },
      [oggi]: { origine: 'sibylla', modificata: true, salvataAt: `${addGiorni(oggi, -3)}T17:20:00`, pubblicataAt: `${addGiorni(oggi, -3)}T17:30:00` },
    },
    pubblicazioni,
    focusLunedi: null,
  }
}

export const useTurniPersonaleStore = create<TurniState>()(persist((set, get) => ({
  ...seed(),

  assegna: (iso, id) => set(st => (st.assegnazioni[iso] ?? []).includes(id) ? st : ({
    assegnazioni: { ...st.assegnazioni, [iso]: [...(st.assegnazioni[iso] ?? []), id] },
    settimane: toccata(st, iso),
  })),
  rimuovi: (iso, id) => set(st => ({
    assegnazioni: { ...st.assegnazioni, [iso]: (st.assegnazioni[iso] ?? []).filter(x => x !== id) },
    settimane: toccata(st, iso),
  })),
  sposta: (da, a, id) => set(st => {
    if (da === a || (st.assegnazioni[a] ?? []).includes(id)) return st
    return {
      assegnazioni: { ...st.assegnazioni, [da]: (st.assegnazioni[da] ?? []).filter(x => x !== id), [a]: [...(st.assegnazioni[a] ?? []), id] },
      settimane: toccata(st, a),
    }
  }),
  svuota: (lunedi) => set(st => {
    const next = { ...st.assegnazioni }
    for (const g of giorniSettimana(lunedi)) next[g] = []
    return { assegnazioni: next, settimane: { ...st.settimane, [lunedi]: { origine: 'manuale' } } }
  }),
  applicaSuggerimento: (s) => set(st => ({
    assegnazioni: { ...st.assegnazioni, ...s.assegnazioni },
    settimane: { ...st.settimane, [s.lunedi]: { ...st.settimane[s.lunedi], origine: 'sibylla', modificata: false } },
  })),
  salva: (lunedi) => set(st => ({ settimane: { ...st.settimane, [lunedi]: { ...(st.settimane[lunedi] ?? { origine: 'manuale' }), salvataAt: new Date().toISOString() } } })),
  pubblica: (lunedi) => {
    const st = get()
    const snap: Assegnazioni = Object.fromEntries(giorniSettimana(lunedi).map(g => [g, [...(st.assegnazioni[g] ?? [])]]))
    const at = new Date().toISOString()
    const p: PubblicazioneTurno = { id: uid(), lunedi, at, assegnazioni: snap, destinatari: new Set(Object.values(snap).flat()).size }
    set({
      pubblicazioni: [p, ...st.pubblicazioni],
      settimane: { ...st.settimane, [lunedi]: { ...(st.settimane[lunedi] ?? { origine: 'manuale' }), salvataAt: at, pubblicataAt: at } },
    })
    return p
  },
  setFocus: (lunedi) => set({ focusLunedi: lunedi }),
}), { name: 'sibylla.turni-personale', version: 1, migrate: () => seed() as unknown as TurniState }))

/** Giorni ancora assegnabili al dipendente nella settimana (contratto − assegnati). */
export function giorniResidui(assegnazioni: Assegnazioni, lunedi: string, id: number) {
  const usati = giorniSettimana(lunedi).filter(g => (assegnazioni[g] ?? []).includes(id)).length
  return contrattoDi(id).giorni - usati
}

// ─── Notifiche "Suggerimento turni" (cadenza dal Configura notifiche) ────────
export const CADENZE_TURNI: { value: CadenzaTurni; label: string }[] = [
  { value: 'giornaliera',   label: 'Ogni giorno' },
  { value: 'settimanale',   label: 'Ogni settimana' },
  { value: 'bisettimanale', label: 'Ogni due settimane' },
  { value: 'mensile',       label: 'Ogni mese' },
]

/** Quando sono arrivati i suggerimenti (giorni fa) e per quale settimana, secondo la cadenza. */
export function suggerimentiPerCadenza(cadenza: CadenzaTurni): { giorniFa: number; lunedi: string }[] {
  const oggi = isoOf(new Date())
  const prossimo = addGiorni(lunediDi(oggi), 7)
  const daLunedi = (parse(oggi).getDay() + 6) % 7
  switch (cadenza) {
    case 'giornaliera':   return [0, 1, 2].map(g => ({ giorniFa: g, lunedi: prossimo }))
    case 'settimanale':   return [{ giorniFa: daLunedi, lunedi: prossimo }, { giorniFa: daLunedi + 7, lunedi: addGiorni(prossimo, -7) }]
    case 'bisettimanale': return [{ giorniFa: daLunedi, lunedi: prossimo }]
    case 'mensile':       return [{ giorniFa: parse(oggi).getDate() - 1, lunedi: prossimo }]
  }
}
