import {
  DIPENDENTI_HR, repartoDipendente, saldoFerie, giorniLavorativi, fmtDataHr, isoOf,
  type RichiestaAssenza,
} from '../../../store/useHrGestioneStore'
import type { PianoFerie, RegolePiano } from '../../../store/usePianiFerieStore'

// ─── REGOLE DEL PIANO FERIE ──────────────────────────────────────────────────
// Verifiche condivise fra Richieste (valutazione di Sibylla) e Piano ferie
// (calendario): giorni consecutivi, presenza minima del reparto, giorni residui
// e saldo negativo (che richiede sempre l'autorizzazione esplicita dell'HR).

export type LivelloRegola = 'ok' | 'warn' | 'ko'
export interface EsitoRegola { livello: LivelloRegola; testo: string }

const giorno = (iso: string, d: number) => { const x = new Date(`${iso}T12:00:00`); x.setDate(x.getDate() + d); return isoOf(x) }
const giorniCalendario = (dal: string, al: string) => Math.round((new Date(`${al}T12:00:00`).getTime() - new Date(`${dal}T12:00:00`).getTime()) / 86400000) + 1

/** Assenti contemporanei consentiti in un reparto di `n` persone con la presenza minima `pct`. */
export const assentiConsentiti = (n: number, pct?: number) => pct == null ? n : Math.max(0, n - Math.ceil(n * pct / 100))

/** Il piano aperto che contiene il periodo della richiesta di ferie (se c'è). */
export const pianoDi = (r: Pick<RichiestaAssenza, 'tipo' | 'dal' | 'al'>, piani: PianoFerie[]) =>
  r.tipo === 'Ferie' ? piani.find(p => p.stato === 'Aperto' && r.dal <= p.al && r.al >= p.dal) : undefined

/** Ferie aperte o approvate (non rifiutate) di una persona, tipo Ferie. */
const ferieVive = (richieste: RichiestaAssenza[], dipendenteId: number) =>
  richieste.filter(x => x.dipendenteId === dipendenteId && x.tipo === 'Ferie' && x.stato !== 'Rifiutata')

/** Giorni consecutivi del blocco di ferie che contiene la richiesta (richieste attaccate comprese). */
export function bloccoConsecutivo(r: Pick<RichiestaAssenza, 'id' | 'dipendenteId' | 'dal' | 'al'>, richieste: RichiestaAssenza[]) {
  const altre = ferieVive(richieste, r.dipendenteId).filter(x => x.id !== r.id)
  let dal = r.dal, al = r.al, cambiato = true
  while (cambiato) {
    cambiato = false
    for (const x of altre) {
      if (x.dal <= giorno(al, 1) && x.al >= giorno(dal, -1) && (x.dal < dal || x.al > al)) {
        if (x.dal < dal) dal = x.dal
        if (x.al > al) al = x.al
        cambiato = true
      }
    }
  }
  return { dal, al, giorni: giorniCalendario(dal, al) }
}

/** Saldo ferie della persona se la richiesta venisse approvata (le altre in attesa non contano). */
export function saldoDopo(r: Pick<RichiestaAssenza, 'id' | 'dipendenteId' | 'dal' | 'al' | 'stato'>, richieste: RichiestaAssenza[]) {
  const s = saldoFerie(richieste, r.dipendenteId, Number(r.dal.slice(0, 4)))
  return s.residue - (r.stato === 'Approvata' ? 0 : giorniLavorativi(r.dal, r.al))
}

/** Giorni del periodo in cui il reparto scenderebbe sotto la presenza minima approvando la richiesta. */
export function giorniSottoPresenza(r: Pick<RichiestaAssenza, 'id' | 'dipendenteId' | 'dal' | 'al'>, richieste: RichiestaAssenza[], regole: RegolePiano, limite?: { dal: string; al: string }) {
  if (regole.presenzaMinimaReparto == null) return []
  const rep = repartoDipendente(r.dipendenteId)
  const colleghi = DIPENDENTI_HR.filter(d => d.reparto === rep)
  const max = assentiConsentiti(colleghi.length, regole.presenzaMinimaReparto)
  const out: string[] = []
  const dal = limite && limite.dal > r.dal ? limite.dal : r.dal
  const al = limite && limite.al < r.al ? limite.al : r.al
  for (let g = dal; g <= al; g = giorno(g, 1)) {
    const assenti = new Set(richieste
      .filter(x => x.id !== r.id && x.stato === 'Approvata' && x.dal <= g && x.al >= g && colleghi.some(c => c.id === x.dipendenteId))
      .map(x => x.dipendenteId))
    assenti.add(r.dipendenteId)
    if (assenti.size > max) out.push(g)
  }
  return out
}

/** Le regole del piano sulla singola richiesta di ferie, dalla più grave. */
export function verificaRegole(r: RichiestaAssenza, richieste: RichiestaAssenza[], piano: PianoFerie): EsitoRegola[] {
  const g = piano.regole
  const out: EsitoRegola[] = []
  if (g.maxGiorniConsecutivi != null) {
    const b = bloccoConsecutivo(r, richieste)
    if (b.giorni > g.maxGiorniConsecutivi) {
      out.push({ livello: 'ko', testo: `${b.giorni} giorni consecutivi (${fmtDataHr(b.dal)} → ${fmtDataHr(b.al)}): il piano «${piano.nome}» ne consente al massimo ${g.maxGiorniConsecutivi}.` })
    }
  }
  if (g.presenzaMinimaReparto != null) {
    const sotto = giorniSottoPresenza(r, richieste, g, piano)
    if (sotto.length) {
      out.push({ livello: 'ko', testo: `${repartoDipendente(r.dipendenteId)} sotto il ${g.presenzaMinimaReparto}% di presenza ${sotto.length === 1 ? `il ${fmtDataHr(sotto[0])}` : `in ${sotto.length} giorni (dal ${fmtDataHr(sotto[0])})`}.` })
    }
  }
  if (g.entroResidui) {
    const dopo = saldoDopo(r, richieste)
    if (dopo < 0) {
      out.push(-dopo > g.negativoMax
        ? { livello: 'ko', testo: `Saldo a ${dopo} gg: oltre il negativo consentito dal piano (${g.negativoMax ? `massimo ${g.negativoMax} gg` : 'nessuno'}).` }
        : { livello: 'warn', testo: `Saldo a ${dopo} gg: il negativo è consentito solo con l'autorizzazione dell'ufficio del personale.` })
    }
  }
  return out
}

/** Le regole in parole, per la barra del piano e lo storico. */
export function descriviRegole(g: RegolePiano) {
  return [
    g.maxGiorniConsecutivi != null ? `max ${g.maxGiorniConsecutivi} giorni consecutivi` : '',
    g.presenzaMinimaReparto != null ? `presenza minima ${g.presenzaMinimaReparto}% per reparto` : '',
    g.entroResidui ? (g.negativoMax ? `entro i residui (negativo fino a ${g.negativoMax} gg con ok HR)` : 'entro i giorni residui') : 'anche oltre i residui',
  ].filter(Boolean)
}
