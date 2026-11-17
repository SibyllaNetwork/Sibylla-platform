import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DIPENDENTI_HR, REPARTI_HR, isoOf, nomeDipendente, useHrGestioneStore,
  type Reparto, type RichiestaAssenza, type TipoAssenza,
} from './useHrGestioneStore'
import {
  FASCE_ID, PIANIFICAZIONE_DEFAULT, fabbisognoVuoto, oreTurno, useHrConfigStore,
  type FabbisognoRepartoHr, type FasciaId, type TurnoHr,
} from './useHrConfigStore'
import type { CadenzaTurni } from './useNotifPrefsStore'
export type { CadenzaTurni }

// ─── HUMAN RESOURCES › TURNI DEL PERSONALE ───────────────────────────────────
// Turno settimanale: per ogni giorno, chi è in servizio e con QUALE turno
// (Mattina, Pomeriggio, Spezzato… definiti nel Configuratore › Turnistica).
// Il turno dà le ore della giornata: da qui escono le ore settimanali per
// dipendente, il controllo delle 11 ore di riposo, la copertura per fascia e
// l'orario atteso che la timbratura usa per rilevare i ritardi.
// Lo compilano a mano l'HR e i responsabili di reparto (trascinando i nomi sui
// giorni) oppure l'algoritmo di Sibylla, che propone coppie persona + turno.
// Stato della settimana: Bozza → Pubblicato → Modificato dopo la pubblicazione
// (da ripubblicare, con notifica ai soli dipendenti coinvolti).
// Mock persistito (demo): il back end sostituirà seed, occupazione e algoritmo.

// ─── Contratti: ore e giorni a settimana ─────────────────────────────────────
export interface ContrattoTurno {
  /** Etichetta del contratto, es. "Part time 60%". */
  tipo: string
  /** Giorni di servizio a settimana previsti dal contratto. */
  giorni: number
  /** Ore settimanali da contratto. */
  ore: number
}

// Full time 40 h (su 5 o 6 giorni, CCNL turismo), part time verticali in
// percentuale e lavoro a chiamata. Chi non è in elenco non ha ancora il
// contratto in anagrafica: niente controllo delle ore finché non si indica.
export const CONTRATTI_TURNO: Record<number, ContrattoTurno> = {
  1:  { tipo: 'Full time',              giorni: 5, ore: 40 },
  2:  { tipo: 'Full time',              giorni: 5, ore: 40 },
  3:  { tipo: 'Full time su 6 giorni',  giorni: 6, ore: 40 },
  4:  { tipo: 'Part time 80%',          giorni: 4, ore: 32 },
  5:  { tipo: 'Part time 80%',          giorni: 4, ore: 32 },
  6:  { tipo: 'Full time',              giorni: 5, ore: 40 },
  7:  { tipo: 'Part time 40%',          giorni: 2, ore: 16 },
  8:  { tipo: 'Full time',              giorni: 5, ore: 40 },
  9:  { tipo: 'Full time',              giorni: 5, ore: 40 },
  10: { tipo: 'Full time su 6 giorni',  giorni: 6, ore: 40 },
  11: { tipo: 'A chiamata',             giorni: 3, ore: 24 },
}
export const contrattoDi = (id: number): ContrattoTurno | null => CONTRATTI_TURNO[id] ?? null
/** Base usata per pianificare chi non ha ancora il contratto in anagrafica. */
const CONTRATTO_STANDARD: ContrattoTurno = { tipo: 'Full time', giorni: 5, ore: 40 }

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
/** "lunedì 16 nov". */
export const giornoLungo = (iso: string) => `${GIORNI_LUNGHI[(parse(iso).getDay() + 6) % 7].toLowerCase()} ${giornoMese(iso)}`

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
/** Carico di lavoro che l'occupazione comporta (non è un giudizio sull'occupazione). */
export type LivelloCarico = 'basso' | 'medio' | 'alto'
export const livelloCarico = (occ: number): LivelloCarico => occ >= 85 ? 'alto' : occ >= 65 ? 'medio' : 'basso'

// ─── Turni (Configuratore › Turnistica) e fasce della giornata ───────────────
// Fasce, soglie, fabbisogno per reparto e turno predefinito vengono dalle
// «Regole di pianificazione» del tab Turnistica (Configurazione HR).
export type Fascia = FasciaId
const configHr = () => useHrConfigStore.getState()
const pianificazione = () => configHr().pianificazione ?? PIANIFICAZIONE_DEFAULT

/** Fasce di copertura attive, in minuti (la notte prosegue oltre la mezzanotte). */
export function fasceCopertura(): { id: Fascia; nome: string; da: number; a: number }[] {
  return pianificazione().fasce.filter(f => f.attiva).map(f => {
    const da = minuti(f.inizio) ?? 0
    const a0 = minuti(f.fine) ?? 0
    return { id: f.id, nome: f.nome, da, a: a0 <= da ? a0 + 1440 : a0 }
  })
}
export const nomeFascia = (id: Fascia) => pianificazione().fasce.find(f => f.id === id)?.nome ?? id
/** Riposo minimo fra due turni (ore). */
export const riposoMinOre = () => pianificazione().riposoMinOre
/** Ore minime dentro una fascia perché il turno la copra. */
const coperturaMinMin = () => pianificazione().coperturaMinOre * 60

const minuti = (hhmm?: string) => {
  const m = (hhmm ?? '').match(/^(\d{1,2}):(\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}
/** Intervalli di lavoro del turno in minuti dalla mezzanotte del giorno (la fine può superare 1440). */
export function intervalliTurno(t: TurnoHr): [number, number][] {
  const out: [number, number][] = []
  const add = (i?: string, f?: string) => {
    const a = minuti(i), b = minuti(f)
    if (a == null || b == null) return
    out.push([a, b <= a ? b + 1440 : b])
  }
  add(t.inizio, t.fine)
  add(t.inizio2, t.fine2)
  return out
}
export const inizioTurno = (t: TurnoHr) => Math.min(...intervalliTurno(t).map(x => x[0]))
export const fineTurno = (t: TurnoHr) => Math.max(...intervalliTurno(t).map(x => x[1]))
export const orarioTurno = (t: TurnoHr) =>
  [`${t.inizio}–${t.fine}`, t.inizio2 && t.fine2 ? `${t.inizio2}–${t.fine2}` : ''].filter(Boolean).join(' / ')
export const fmtOre = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')}`

const sovrapp = (a: [number, number], b: [number, number]) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]))
export function fasceTurno(t: TurnoHr): Fascia[] {
  const iv = intervalliTurno(t)
  const min = coperturaMinMin()
  return fasceCopertura().filter(f => {
    const tot = iv.reduce((s, x) => s + sovrapp(x, [f.da, f.a]) + sovrapp(x, [f.da - 1440, f.a - 1440]), 0)
    return tot >= min
  }).map(f => f.id)
}

export const repartoHr = (r: Reparto) => configHr().reparti.find(x => x.nome === r)
/** Turni utilizzabili nel reparto (quelli senza reparti indicati valgono per tutti). */
export function turniValidi(r: Reparto, turni: TurnoHr[] = configHr().turni): TurnoHr[] {
  const id = repartoHr(r)?.id
  return turni.filter(t => !t.reparti.length || (id != null && t.reparti.includes(id)))
}
/** Regole di fabbisogno del reparto (Turnistica › Regole di pianificazione). */
export function regolaReparto(r: Reparto): FabbisognoRepartoHr {
  const id = repartoHr(r)?.id ?? r
  return pianificazione().fabbisogni.find(f => f.id === id) ?? fabbisognoVuoto(id)
}
/** Turno proposto di default nel reparto (se è ancora valido, altrimenti il primo valido). */
export function turnoPredefinito(r: Reparto, turni: TurnoHr[] = configHr().turni): TurnoHr | undefined {
  const validi = turniValidi(r, turni)
  const pred = regolaReparto(r).turnoPredefinito
  return validi.find(t => t.id === pred) ?? validi[0]
}
export const turnoById = (id?: string, turni: TurnoHr[] = configHr().turni) => (id ? turni.find(t => t.id === id) : undefined)
export const repartoDi = (id: number) => DIPENDENTI_HR.find(d => d.id === id)?.reparto

// ─── Fabbisogno per reparto e fascia ─────────────────────────────────────────
/** Il fabbisogno del reparto segue l'occupazione (altrimenti è un minimo fisso). */
export const fabbisognoAOccupazione = (r: Reparto) => regolaReparto(r).modalita === 'occupazione'

/** Persone necessarie per fascia nel giorno: base, più il rinforzo oltre la soglia di occupazione. */
export function fabbisognoFasce(r: Reparto, iso: string): Record<Fascia, number> {
  const reg = regolaReparto(r)
  const wd = (parse(iso).getDay() + 6) % 7
  const attive = new Set(fasceCopertura().map(f => f.id))
  const out: Record<Fascia, number> = { M: 0, P: 0, N: 0 }
  if (reg.giorniChiusura.includes(wd)) return out
  const rinforzo = reg.modalita === 'occupazione' && occupazione(iso) >= reg.sogliaOccupazione
  for (const f of FASCE_ID) if (attive.has(f)) out[f] = Math.max(0, (reg.base[f] ?? 0) + (rinforzo ? reg.rinforzo[f] ?? 0 : 0))
  return out
}

// ─── Assenze (dalle richieste HR) ────────────────────────────────────────────
export interface AssenzaGiorno { tipo: TipoAssenza; inAttesa: boolean; /** ROL/permesso a ore nella giornata. */ ore?: number }
/** Assenza del dipendente nel giorno: approvata, oppure in attesa di approvazione. */
export function assenzaDi(richieste: RichiestaAssenza[], id: number, iso: string): AssenzaGiorno | null {
  const attive = richieste.filter(x => x.dipendenteId === id && x.dal <= iso && x.al >= iso
    && (x.stato === 'Approvata' || x.stato === 'Da approvare' || x.stato === 'Al responsabile'))
  // Le approvate prevalgono sulle richieste ancora da decidere.
  const pick = attive.find(x => x.stato === 'Approvata') ?? attive[0]
  return pick ? { tipo: pick.tipo, inAttesa: pick.stato !== 'Approvata', ore: pick.dal === pick.al ? pick.ore : undefined } : null
}
/** Permesso e ROL di poche ore: il dipendente resta assegnabile. */
export const bloccaTurno = (a: AssenzaGiorno | null) =>
  !!a && !a.inAttesa && a.tipo !== 'Permesso' && !(a.tipo === 'ROL' && a.ore != null && a.ore < 8)

// ─── Modello delle assegnazioni ──────────────────────────────────────────────
/** Giorno → dipendenti in servizio. */
export type Assegnazioni = Record<string, number[]>
/** "iso|idDipendente" → id del turno (Configuratore › Turnistica). */
export type TurniAssegnati = Record<string, string>
export const chiaveTurno = (iso: string, id: number) => `${iso}|${id}`

/** Turno del dipendente nel giorno (se assegnato); senza scelta esplicita vale il predefinito del reparto. */
export function turnoDel(assegnazioni: Assegnazioni, turni: TurniAssegnati, iso: string, id: number, catalogo?: TurnoHr[]): TurnoHr | undefined {
  if (!(assegnazioni[iso] ?? []).includes(id)) return undefined
  const t = turnoById(turni[chiaveTurno(iso, id)], catalogo)
  if (t) return t
  const r = repartoDi(id)
  return r ? turnoPredefinito(r, catalogo) : undefined
}

/** Ore di riposo tra il turno del giorno prima e quello di `iso` (null se uno dei due manca). */
export function riposoPrima(assegnazioni: Assegnazioni, turni: TurniAssegnati, iso: string, id: number, turnoOggi?: TurnoHr, catalogo?: TurnoHr[]): number | null {
  const oggi = turnoOggi ?? turnoDel(assegnazioni, turni, iso, id, catalogo)
  const ieri = turnoDel(assegnazioni, turni, addGiorni(iso, -1), id, catalogo)
  if (!oggi || !ieri) return null
  return (1440 + inizioTurno(oggi) - fineTurno(ieri)) / 60
}
/** Ore di riposo tra il turno di `iso` e quello del giorno dopo. */
export function riposoDopo(assegnazioni: Assegnazioni, turni: TurniAssegnati, iso: string, id: number, turnoOggi?: TurnoHr, catalogo?: TurnoHr[]): number | null {
  const oggi = turnoOggi ?? turnoDel(assegnazioni, turni, iso, id, catalogo)
  const domani = turnoDel(assegnazioni, turni, addGiorni(iso, 1), id, catalogo)
  if (!oggi || !domani) return null
  return (1440 + inizioTurno(domani) - fineTurno(oggi)) / 60
}

export type StatoOre = 'ok' | 'sotto' | 'sopra' | 'senza-contratto'
export interface RiepilogoSettimana {
  ore: number
  giorni: number
  /** Giorni senza turno e senza assenza: riposi della settimana. */
  riposi: number
  assenze: number
  contratto: ContrattoTurno | null
  /** Ore attese nella settimana: contratto meno le giornate di assenza (ferie, malattia…). */
  oreAttese: number | null
  stato: StatoOre
  /** Giorni in cui il riposo dal turno precedente è sotto le 11 ore. */
  riposoBreve: string[]
}
/** Una giornata di assenza vale ore/giorni del contratto (es. 40 h su 5 giorni = 8 h). */
export const oreAtteseSettimana = (c: ContrattoTurno, giorniAssenza: number) =>
  Math.max(0, Math.round((c.ore - giorniAssenza * (c.ore / c.giorni)) * 10) / 10)

export function riepilogoSettimana(assegnazioni: Assegnazioni, turni: TurniAssegnati, lunedi: string, id: number, richieste: RichiestaAssenza[], catalogo?: TurnoHr[]): RiepilogoSettimana {
  const giorni = giorniSettimana(lunedi)
  let ore = 0, n = 0, assenze = 0
  const riposoBreve: string[] = []
  for (const g of giorni) {
    const t = turnoDel(assegnazioni, turni, g, id, catalogo)
    if (t) {
      ore += oreTurno(t); n++
      const r = riposoPrima(assegnazioni, turni, g, id, t, catalogo)
      if (r != null && r < riposoMinOre()) riposoBreve.push(g)
    } else if (bloccaTurno(assenzaDi(richieste, id, g))) assenze++
  }
  const contratto = contrattoDi(id)
  const oreAttese = contratto ? oreAtteseSettimana(contratto, assenze) : null
  const stato: StatoOre = oreAttese == null ? 'senza-contratto'
    : ore > oreAttese ? 'sopra'
    : ore < oreAttese - pianificazione().tolleranzaSottoOre ? 'sotto' : 'ok'
  return { ore: Math.round(ore * 10) / 10, giorni: n, riposi: Math.max(0, 7 - n - assenze), assenze, contratto, oreAttese, stato, riposoBreve }
}

// ─── Copertura per reparto e fascia ──────────────────────────────────────────
export interface CoperturaFascia { fascia: Fascia; serve: number; ha: number }
export interface CoperturaReparto {
  reparto: Reparto
  fasce: CoperturaFascia[]
  /** true = tutte le fasce richieste sono coperte. */
  ok: boolean
  /** Il reparto quel giorno non ha fabbisogno e nessuno in turno. */
  chiuso: boolean
}
/** In copertura conta solo chi è in turno e non ha un'assenza che lo blocca (ferie, malattia…). */
export function inServizio(assegnazioni: Assegnazioni, iso: string, richieste: RichiestaAssenza[]) {
  return (assegnazioni[iso] ?? []).filter(id => !bloccaTurno(assenzaDi(richieste, id, iso)))
}
export function coperturaReparto(r: Reparto, iso: string, assegnazioni: Assegnazioni, turni: TurniAssegnati, richieste: RichiestaAssenza[], catalogo?: TurnoHr[]): CoperturaReparto {
  const serve = fabbisognoFasce(r, iso)
  const ha: Record<Fascia, number> = { M: 0, P: 0, N: 0 }
  for (const id of inServizio(assegnazioni, iso, richieste)) {
    if (repartoDi(id) !== r) continue
    const t = turnoDel(assegnazioni, turni, iso, id, catalogo)
    if (t) for (const f of fasceTurno(t)) ha[f]++
  }
  const fasce = fasceCopertura().map(f => ({ fascia: f.id, serve: serve[f.id], ha: ha[f.id] })).filter(x => x.serve > 0 || x.ha > 0)
  return { reparto: r, fasce, ok: fasce.every(x => x.ha >= x.serve), chiuso: fasce.length === 0 }
}

// ─── Algoritmo di Sibylla: coppie persona + turno ───────────────────────────
export interface SuggerimentoTurni {
  lunedi: string
  assegnazioni: Assegnazioni
  turni: number
  turniAssegnati: TurniAssegnati
  occupazioneMedia: number
  picco: { iso: string; occ: number }
  /** Fasce (reparto × giorno × fascia × persona) coperte sul totale richiesto. */
  fasceCoperte: number
  fasceTot: number
  assenzeConsiderate: { id: number; tipo: TipoAssenza; inAttesa: boolean; giorni: number }[]
  scoperture: { iso: string; reparto: Reparto; fascia: Fascia; mancano: number }[]
  /** Giorni passati lasciati come sono (hanno già timbrature). */
  giorniBloccati: string[]
  note: string[]
}

interface OpzioniSuggerimento {
  /** Turno in essere: i giorni prima di `daGiorno` si tengono com'erano. */
  esistenti?: { assegnazioni: Assegnazioni; turni: TurniAssegnati }
  daGiorno?: string
}

export function suggerisciTurni(lunedi: string, richieste: RichiestaAssenza[], opz: OpzioniSuggerimento = {}): SuggerimentoTurni {
  const catalogo = configHr().turni
  const giorni = giorniSettimana(lunedi)
  const bloccati = opz.esistenti && opz.daGiorno ? giorni.filter(g => g < opz.daGiorno!) : []
  const out: Assegnazioni = Object.fromEntries(giorni.map(g => [g, bloccati.includes(g) ? [...(opz.esistenti!.assegnazioni[g] ?? [])] : []]))
  const tAss: TurniAssegnati = {}
  // Domenica precedente (per il riposo di 11 ore del lunedì) e giorni bloccati.
  if (opz.esistenti) {
    const dom = addGiorni(lunedi, -1)
    out[dom] = [...(opz.esistenti.assegnazioni[dom] ?? [])]
    for (const g of [dom, ...bloccati]) for (const id of out[g]) {
      const t = turnoDel(opz.esistenti.assegnazioni, opz.esistenti.turni, g, id, catalogo)
      if (t) tAss[chiaveTurno(g, id)] = t.id
    }
  }
  const liberi = giorni.filter(g => !bloccati.includes(g))
  const scoperture: SuggerimentoTurni['scoperture'] = []
  const note: string[] = []
  const perCarico = [...liberi].sort((a, b) => occupazione(b) - occupazione(a))

  const oreDi = (id: number) => giorni.reduce((s, g) => { const t = turnoDel(out, tAss, g, id, catalogo); return s + (t ? oreTurno(t) : 0) }, 0)
  const giorniDi = (id: number) => giorni.filter(g => out[g].includes(id)).length
  const metti = (id: number, iso: string, t: TurnoHr) => { out[iso].push(id); tAss[chiaveTurno(iso, id)] = t.id }
  // Le giornate di assenza approvate riducono giorni e ore da assegnare nella settimana.
  const assenzeDi = (id: number) => giorni.filter(g => bloccaTurno(assenzaDi(richieste, id, g))).length
  const limiti = (id: number) => {
    const c = contrattoDi(id) ?? CONTRATTO_STANDARD
    const a = assenzeDi(id)
    return { giorni: Math.max(0, c.giorni - a), ore: oreAtteseSettimana(c, a) }
  }
  const puo = (id: number, iso: string, t: TurnoHr) => {
    if (out[iso].includes(id) || assenzaDi(richieste, id, iso)) return false
    const lim = limiti(id)
    if (giorniDi(id) >= lim.giorni || oreDi(id) + oreTurno(t) > lim.ore) return false
    const prima = riposoPrima(out, tAss, iso, id, t, catalogo)
    const dopo = riposoDopo(out, tAss, iso, id, t, catalogo)
    const min = riposoMinOre()
    return (prima == null || prima >= min) && (dopo == null || dopo >= min)
  }
  let fasceTot = 0, fasceCoperte = 0

  for (const rep of REPARTI_HR) {
    const staff = DIPENDENTI_HR.filter(d => d.reparto === rep)
    const validi = turniValidi(rep, catalogo)
    const pred = turnoPredefinito(rep, catalogo)
    const residuo = (id: number) => limiti(id).ore - oreDi(id)
    const mancanti = (iso: string, cap: number) => {
      const c = coperturaReparto(rep, iso, out, tAss, richieste, catalogo)
      return Object.fromEntries(c.fasce.map(f => [f.fascia, Math.max(0, Math.min(f.serve, cap) - f.ha)])) as Partial<Record<Fascia, number>>
    }

    // 1° giro: copre le fasce richieste, prima i giorni più carichi. Prima una
    // persona per fascia su tutti i giorni, poi i rinforzi dei picchi. Fra i turni
    // validi sceglie quello che copre più fasce scoperte (a pari merito il predefinito).
    for (const cap of [1, 99]) for (const iso of perCarico) {
      for (let guard = 0; guard < 12; guard++) {
        const manca = mancanti(iso, cap)
        const scop = (Object.keys(manca) as Fascia[]).filter(f => (manca[f] ?? 0) > 0)
        if (!scop.length) break
        const ordinati = [...validi]
          .map(t => ({ t, utile: fasceTurno(t).filter(f => scop.includes(f)).length }))
          .filter(x => x.utile > 0)
          .sort((a, b) => b.utile - a.utile || (a.t.id === pred?.id ? -1 : b.t.id === pred?.id ? 1 : 0))
        let fatto = false
        for (const { t } of ordinati) {
          const c = staff.filter(d => puo(d.id, iso, t)).sort((a, b) => residuo(b.id) - residuo(a.id))[0]
          if (c) { metti(c.id, iso, t); fatto = true; break }
        }
        if (!fatto) break
      }
    }
    // 2° giro: le ore di contratto rimaste vanno sui giorni con più occupazione,
    // sul turno della fascia meno coperta (mai nei giorni in cui il reparto è chiuso).
    for (const d of staff) {
      for (const iso of perCarico) {
        const fab = fabbisognoFasce(rep, iso)
        if (fab.M + fab.P + fab.N === 0) continue
        const cop = coperturaReparto(rep, iso, out, tAss, richieste, catalogo)
        const margine = (f: Fascia) => { const x = cop.fasce.find(y => y.fascia === f); return x ? x.ha - x.serve : 99 }
        const candidati = validi
          .filter(t => fasceTurno(t).some(f => fab[f] > 0))
          .sort((a, b) => Math.min(...fasceTurno(a).map(margine)) - Math.min(...fasceTurno(b).map(margine))
            || (a.id === pred?.id ? -1 : b.id === pred?.id ? 1 : 0))
        const t = candidati.find(x => puo(d.id, iso, x))
        if (t) metti(d.id, iso, t)
      }
    }
    // Scoperture residue per fascia.
    for (const iso of liberi) {
      for (const f of coperturaReparto(rep, iso, out, tAss, richieste, catalogo).fasce) {
        fasceTot += f.serve
        fasceCoperte += Math.min(f.ha, f.serve)
        if (f.ha < f.serve) scoperture.push({ iso, reparto: rep, fascia: f.fascia, mancano: f.serve - f.ha })
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

  if (bloccati.length) note.push(`${bloccati.length === 1 ? 'Il giorno passato resta' : `I ${bloccati.length} giorni passati restano`} com'${bloccati.length === 1 ? 'è' : 'erano'}: hanno già timbrature collegate.`)
  const aOcc = REPARTI_HR.filter(fabbisognoAOccupazione)
  const fissi = REPARTI_HR.filter(r => !fabbisognoAOccupazione(r))
  note.push(`Picco di occupazione ${GIORNI_LUNGHI[iPicco].toLowerCase()} ${giornoMese(giorni[iPicco])} (${occs[iPicco]}%)${aOcc.length ? `: più personale su ${aOcc.join(', ')}` : ''}.${fissi.length ? ` ${fissi.join(', ')}: minimo fisso.` : ''}`)
  note.push(`Ogni turno rispetta il monte ore del contratto e le ${riposoMinOre()} ore di riposo fra un turno e l'altro.`)
  for (const d of DIPENDENTI_HR) if (!contrattoDi(d.id)) note.push(`${d.nome} ${d.cognome}: contratto non indicato in anagrafica, pianificato su ${CONTRATTO_STANDARD.ore} h standard.`)
  for (const a of assenzeConsiderate) {
    const chi = nomeDipendente(a.id)
    note.push(a.inAttesa
      ? `${chi}: richiesta di ${a.tipo.toLowerCase()} ancora da approvare (${a.giorni} gg), lasciata libera per prudenza.`
      : `${chi} assente per ${a.tipo.toLowerCase()} (${a.giorni} gg): turni coperti dai colleghi del reparto.`)
  }
  // Scoperture raggruppate per reparto: una nota sola con giorni e fasce interessate.
  for (const rep of REPARTI_HR) {
    const sc = scoperture.filter(s => s.reparto === rep).sort((x, y) => x.iso.localeCompare(y.iso))
    if (!sc.length) continue
    const tot = sc.reduce((n, s) => n + s.mancano, 0)
    const quando = sc.map(s => `${GIORNI_BREVI[giorni.indexOf(s.iso)].toLowerCase()} ${s.fascia}${s.mancano > 1 ? ` (${s.mancano})` : ''}`).join(', ')
    note.push(`${rep}: ${tot === 1 ? 'resta scoperta 1 fascia' : `restano scoperte ${tot} fasce`} (${quando}). Valuta un extra o lo spostamento di un riposo.`)
  }

  // Si restituisce solo la settimana (la domenica precedente serviva per il riposo).
  const assegnazioni: Assegnazioni = Object.fromEntries(giorni.map(g => [g, [...out[g]].sort((a, b) => a - b)]))
  const turniAssegnati: TurniAssegnati = Object.fromEntries(Object.entries(tAss).filter(([k]) => giorni.includes(k.split('|')[0])))
  const turni = giorni.reduce((s, g) => s + assegnazioni[g].length, 0)
  return {
    lunedi, assegnazioni, turniAssegnati, turni, occupazioneMedia, picco: { iso: giorni[iPicco], occ: occs[iPicco] },
    fasceCoperte, fasceTot, assenzeConsiderate, scoperture, giorniBloccati: bloccati, note,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export type OrigineTurno = 'manuale' | 'sibylla'

export interface SettimanaTurni {
  origine: OrigineTurno
  /** Modificata a mano dopo il suggerimento di Sibylla. */
  modificata?: boolean
  pubblicataAt?: string
  /** Modificata dopo l'ultima pubblicazione: va ripubblicata. */
  daRipubblicare?: boolean
}
export type StatoSettimana = 'bozza' | 'pubblicato' | 'da-ripubblicare'
export const statoSettimana = (s?: SettimanaTurni): StatoSettimana =>
  !s?.pubblicataAt ? 'bozza' : s.daRipubblicare ? 'da-ripubblicare' : 'pubblicato'

export interface PubblicazioneTurno {
  id: string
  lunedi: string
  /** ISO datetime. */
  at: string
  /** Fotografia del turno inviato ai dipendenti. */
  assegnazioni: Assegnazioni
  turni?: TurniAssegnati
  destinatari: number
  /** Ripubblicazione dopo modifiche: notificata solo ai dipendenti coinvolti. */
  aggiornamento?: boolean
  coinvolti?: number[]
}

interface TurniState {
  assegnazioni: Assegnazioni
  turni: TurniAssegnati
  settimane: Record<string, SettimanaTurni>
  pubblicazioni: PubblicazioneTurno[]
  /** Settimana da aprire quando si arriva da una notifica. */
  focusLunedi: string | null

  assegna: (iso: string, id: number, turnoId?: string) => void
  setTurno: (iso: string, id: number, turnoId: string) => void
  rimuovi: (iso: string, id: number) => void
  sposta: (da: string, a: string, id: number) => void
  /** Svuota i giorni indicati (di norma quelli non ancora passati). */
  svuota: (lunedi: string, giorni: string[]) => void
  applicaSuggerimento: (s: SuggerimentoTurni) => void
  pubblica: (lunedi: string) => PubblicazioneTurno
  setFocus: (lunedi: string | null) => void
}

const uid = () => `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const toccata = (st: TurniState, iso: string): Record<string, SettimanaTurni> => {
  const l = lunediDi(iso)
  const cur = st.settimane[l] ?? { origine: 'manuale' as OrigineTurno }
  return { ...st.settimane, [l]: { ...cur, modificata: cur.origine === 'sibylla' ? true : cur.modificata, daRipubblicare: !!cur.pubblicataAt } }
}
const fotografia = (st: Pick<TurniState, 'assegnazioni' | 'turni'>, lunedi: string) => {
  const giorni = giorniSettimana(lunedi)
  const assegnazioni: Assegnazioni = Object.fromEntries(giorni.map(g => [g, [...(st.assegnazioni[g] ?? [])]]))
  const turni: TurniAssegnati = {}
  for (const g of giorni) for (const id of assegnazioni[g]) {
    const t = turnoDel(st.assegnazioni, st.turni, g, id)
    if (t) turni[chiaveTurno(g, id)] = t.id
  }
  return { assegnazioni, turni }
}
/** Dipendenti il cui turno è cambiato fra due fotografie della stessa settimana. */
export function dipendentiCoinvolti(lunedi: string, prima: { assegnazioni: Assegnazioni; turni?: TurniAssegnati }, dopo: { assegnazioni: Assegnazioni; turni?: TurniAssegnati }) {
  const ids = new Set<number>()
  for (const g of giorniSettimana(lunedi)) {
    const a = prima.assegnazioni[g] ?? [], b = dopo.assegnazioni[g] ?? []
    for (const id of Array.from(new Set([...a, ...b]))) {
      const k = chiaveTurno(g, id)
      if (a.includes(id) !== b.includes(id) || (b.includes(id) && (prima.turni?.[k] ?? '') !== (dopo.turni?.[k] ?? ''))) ids.add(id)
    }
  }
  return Array.from(ids).sort((x, y) => x - y)
}

function seed(): Pick<TurniState, 'assegnazioni' | 'turni' | 'settimane' | 'pubblicazioni' | 'focusLunedi'> {
  const richieste = useHrGestioneStore.getState().richieste
  const oggi = lunediDi(isoOf(new Date()))
  const prec = addGiorni(oggi, -7)
  const assegnazioni: Assegnazioni = {}
  const turni: TurniAssegnati = {}
  const pubblicazioni: PubblicazioneTurno[] = []
  // Settimana scorsa e corrente: generate da Sibylla e pubblicate il giovedì prima.
  for (const l of [prec, oggi]) {
    const s = suggerisciTurni(l, richieste, { esistenti: { assegnazioni, turni }, daGiorno: l })
    Object.assign(assegnazioni, s.assegnazioni)
    Object.assign(turni, s.turniAssegnati)
    const at = `${addGiorni(l, -3)}T17:30:00`
    pubblicazioni.unshift({ id: `pt-seed-${l}`, lunedi: l, at, assegnazioni: s.assegnazioni, turni: s.turniAssegnati, destinatari: new Set(Object.values(s.assegnazioni).flat()).size })
  }
  return {
    assegnazioni,
    turni,
    settimane: {
      [prec]: { origine: 'sibylla', pubblicataAt: `${addGiorni(prec, -3)}T17:30:00` },
      [oggi]: { origine: 'sibylla', pubblicataAt: `${addGiorni(oggi, -3)}T17:30:00` },
    },
    pubblicazioni,
    focusLunedi: null,
  }
}

export const useTurniPersonaleStore = create<TurniState>()(persist((set, get) => ({
  ...seed(),

  assegna: (iso, id, turnoId) => set(st => {
    if ((st.assegnazioni[iso] ?? []).includes(id)) return st
    const r = repartoDi(id)
    const tid = turnoId ?? (r ? turnoPredefinito(r)?.id : undefined)
    return {
      assegnazioni: { ...st.assegnazioni, [iso]: [...(st.assegnazioni[iso] ?? []), id] },
      turni: tid ? { ...st.turni, [chiaveTurno(iso, id)]: tid } : st.turni,
      settimane: toccata(st, iso),
    }
  }),
  setTurno: (iso, id, turnoId) => set(st => st.turni[chiaveTurno(iso, id)] === turnoId ? st : ({
    turni: { ...st.turni, [chiaveTurno(iso, id)]: turnoId },
    settimane: toccata(st, iso),
  })),
  rimuovi: (iso, id) => set(st => {
    const turni = { ...st.turni }
    delete turni[chiaveTurno(iso, id)]
    return {
      assegnazioni: { ...st.assegnazioni, [iso]: (st.assegnazioni[iso] ?? []).filter(x => x !== id) },
      turni,
      settimane: toccata(st, iso),
    }
  }),
  sposta: (da, a, id) => set(st => {
    if (da === a || (st.assegnazioni[a] ?? []).includes(id)) return st
    const turni = { ...st.turni }
    const tid = turni[chiaveTurno(da, id)]
    delete turni[chiaveTurno(da, id)]
    if (tid) turni[chiaveTurno(a, id)] = tid
    return {
      assegnazioni: { ...st.assegnazioni, [da]: (st.assegnazioni[da] ?? []).filter(x => x !== id), [a]: [...(st.assegnazioni[a] ?? []), id] },
      turni,
      settimane: toccata({ ...st, settimane: toccata(st, da) }, a),
    }
  }),
  svuota: (lunedi, giorni) => set(st => {
    if (!giorni.length) return st
    const next = { ...st.assegnazioni }
    const turni = { ...st.turni }
    for (const g of giorni) {
      for (const id of next[g] ?? []) delete turni[chiaveTurno(g, id)]
      next[g] = []
    }
    const cur = st.settimane[lunedi]
    return { assegnazioni: next, turni, settimane: { ...st.settimane, [lunedi]: { origine: 'manuale', pubblicataAt: cur?.pubblicataAt, daRipubblicare: !!cur?.pubblicataAt } } }
  }),
  applicaSuggerimento: (s) => set(st => {
    const giorni = giorniSettimana(s.lunedi).filter(g => !s.giorniBloccati.includes(g))
    const assegnazioni = { ...st.assegnazioni }
    const turni = { ...st.turni }
    for (const g of giorni) {
      for (const id of assegnazioni[g] ?? []) delete turni[chiaveTurno(g, id)]
      assegnazioni[g] = [...(s.assegnazioni[g] ?? [])]
      for (const id of assegnazioni[g]) { const t = s.turniAssegnati[chiaveTurno(g, id)]; if (t) turni[chiaveTurno(g, id)] = t }
    }
    const cur = st.settimane[s.lunedi]
    return {
      assegnazioni, turni,
      settimane: { ...st.settimane, [s.lunedi]: { ...cur, origine: 'sibylla', modificata: false, daRipubblicare: !!cur?.pubblicataAt } },
    }
  }),
  pubblica: (lunedi) => {
    const st = get()
    const snap = fotografia(st, lunedi)
    const prec = st.pubblicazioni.find(p => p.lunedi === lunedi)
    const at = new Date().toISOString()
    const tutti = new Set(Object.values(snap.assegnazioni).flat()).size
    const coinvolti = prec ? dipendentiCoinvolti(lunedi, prec, snap) : undefined
    const p: PubblicazioneTurno = {
      id: uid(), lunedi, at, ...snap,
      destinatari: coinvolti ? coinvolti.length : tutti,
      aggiornamento: !!prec, coinvolti,
    }
    set({
      pubblicazioni: [p, ...st.pubblicazioni],
      settimane: { ...st.settimane, [lunedi]: { ...(st.settimane[lunedi] ?? { origine: 'manuale' }), pubblicataAt: at, daRipubblicare: false } },
    })
    return p
  },
  setFocus: (lunedi) => set({ focusLunedi: lunedi }),
}), { name: 'sibylla.turni-personale', version: 2, migrate: () => seed() as unknown as TurniState }))

/** Dipendenti che una ripubblicazione notificherebbe adesso (modifiche rispetto all'ultima pubblicazione). */
export function coinvoltiDaRipubblicare(st: Pick<TurniState, 'assegnazioni' | 'turni' | 'pubblicazioni'>, lunedi: string) {
  const prec = st.pubblicazioni.find(p => p.lunedi === lunedi)
  return prec ? dipendentiCoinvolti(lunedi, prec, fotografia(st, lunedi)) : []
}

// ─── Orario atteso per le timbrature ─────────────────────────────────────────
/**
 * Turno pianificato del dipendente nel giorno, in minuti dalla mezzanotte, per
 * la timbratura (ritardi, presenze attese). `undefined` = la settimana non è
 * pianificata in Turni del personale; `null` = riposo. I turni a cavallo della
 * mezzanotte restano a carico del modello presenze (undefined).
 */
export function turnoPianificato(id: number, iso: string): { inizio: number; fine: number; stacco?: { da: number; a: number } } | null | undefined {
  const st = useTurniPersonaleStore.getState()
  const pianificata = giorniSettimana(lunediDi(iso)).some(g => (st.assegnazioni[g] ?? []).length > 0)
  if (!pianificata) return undefined
  const t = turnoDel(st.assegnazioni, st.turni, iso, id)
  if (!t) return null
  const iv = intervalliTurno(t).sort((a, b) => a[0] - b[0])
  const fine = fineTurno(t)
  if (fine > 1440) return undefined
  return { inizio: inizioTurno(t), fine, stacco: iv.length > 1 ? { da: iv[0][1], a: iv[1][0] } : undefined }
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
