// ─── NOTA SPESE MENSILE · modello del foglio ────────────────────────────────────
//  Un foglio per dipendente e mese: una riga per giorno, una colonna per voce
//  (trasporti, vitto e altro), il buono pasto e il totale. Le spese rifiutate si
//  vedono ma non contano nei totali: il foglio è quello che va in busta paga.

import {
  CATEGORIE_SPESA, DIPENDENTI_HR, TRASPORTI, VALORE_BUONO, chiaveBuono, isoOf,
  type CategoriaSpesa, type NotaSpesa, type StatoSpesa,
} from '../../../store/useHrGestioneStore'

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export const meseCorrente = () => isoOf(new Date()).slice(0, 7)
export const etichettaMese = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${MESI[m - 1]} ${y}` }
export const spostaMese = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1, 12)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Le spese che contano nei totali (le rifiutate no). */
export const valida = (n: NotaSpesa) => n.stato !== 'Rifiutata'

// Regola unica dell'approvazione: senza ricevuta una spesa non si approva, né in
// blocco né singolarmente né cambiando lo stato dalla modale «Modifica nota».
export const approvabile = (n: NotaSpesa) => !!n.giustificativo
export const SENZA_RICEVUTA_APPROVA = 'Manca la ricevuta: allegala da Modifica per poter approvare la spesa'

export interface Cella { voce: CategoriaSpesa; note: NotaSpesa[]; importo: number; stato: StatoSpesa | 'misto' | null }
export interface RigaGiorno {
  iso: string
  giorno: number
  settimana: string
  festivo: boolean
  futuro: boolean
  oggi: boolean
  celle: Record<CategoriaSpesa, Cella>
  trasferte: number
  buono: boolean
  totale: number
}

const statoCella = (note: NotaSpesa[]): Cella['stato'] => {
  if (!note.length) return null
  const s = new Set(note.map(n => n.stato))
  return s.size === 1 ? note[0].stato : 'misto'
}

export function foglio(dipendenteId: number, ym: string, note: NotaSpesa[], buoni: string[]) {
  const [y, m] = ym.split('-').map(Number)
  const giorni = new Date(y, m, 0).getDate()
  const oggi = isoOf(new Date())
  const mie = note.filter(n => n.dipendenteId === dipendenteId && n.data.startsWith(ym))
  const setBuoni = new Set(buoni)
  const righe: RigaGiorno[] = []
  for (let g = 1; g <= giorni; g++) {
    const iso = `${ym}-${String(g).padStart(2, '0')}`
    const d = new Date(y, m - 1, g, 12)
    const delGiorno = mie.filter(n => n.data === iso)
    const celle = {} as Record<CategoriaSpesa, Cella>
    for (const v of CATEGORIE_SPESA) {
      const qui = delGiorno.filter(n => n.categoria === v)
      celle[v] = { voce: v, note: qui, importo: qui.filter(valida).reduce((s, n) => s + n.importo, 0), stato: statoCella(qui) }
    }
    righe.push({
      iso, giorno: g, settimana: GIORNI[d.getDay()], festivo: d.getDay() === 0 || d.getDay() === 6,
      futuro: iso > oggi, oggi: iso === oggi, celle,
      trasferte: delGiorno.filter(n => valida(n) && TRASPORTI.includes(n.categoria)).length,
      buono: setBuoni.has(chiaveBuono(dipendenteId, iso)),
      totale: delGiorno.filter(valida).reduce((s, n) => s + n.importo, 0),
    })
  }
  const perVoce = Object.fromEntries(CATEGORIE_SPESA.map(v => [v, righe.reduce((s, r) => s + r.celle[v].importo, 0)])) as Record<CategoriaSpesa, number>
  const nBuoni = righe.filter(r => r.buono).length
  const spese = righe.reduce((s, r) => s + r.totale, 0)
  const somma = (st: StatoSpesa) => mie.filter(n => n.stato === st).reduce((s, n) => s + n.importo, 0)
  return {
    righe, note: mie, perVoce, nBuoni,
    trasferte: righe.reduce((s, r) => s + r.trasferte, 0),
    trasporti: TRASPORTI.reduce((s, v) => s + perVoce[v], 0),
    vitto: perVoce.Pasti + perVoce.Varie,
    spese,
    buoniEur: nBuoni * VALORE_BUONO,
    daApprovare: mie.filter(n => n.stato === 'Da approvare'),
    approvate: mie.filter(n => n.stato === 'Approvata'),
    eurDaApprovare: somma('Da approvare'),
    eurApprovate: somma('Approvata'),
    eurRimborsate: somma('Rimborsata'),
    eurRifiutate: somma('Rifiutata'),
  }
}
export type Foglio = ReturnType<typeof foglio>

/** Riepilogo del mese di tutti i dipendenti (Total view, Excel riepilogo). */
export function riepilogoMese(ym: string, note: NotaSpesa[], buoni: string[]) {
  return DIPENDENTI_HR.map(d => ({ dip: d, f: foglio(d.id, ym, note, buoni) }))
}

/** Stato del mese per il dipendente, dal punto di vista della busta paga. */
export function statoMese(f: Foglio): { label: string; cls: 'attesa' | 'info' | 'ok' | 'vuoto' } {
  if (!f.note.length && !f.nBuoni) return { label: 'Nessuna nota', cls: 'vuoto' }
  if (f.daApprovare.length) return { label: `${f.daApprovare.length} da approvare`, cls: 'attesa' }
  if (f.approvate.length) return { label: 'Pronta per la busta paga', cls: 'info' }
  return { label: 'Rimborsata', cls: 'ok' }
}

/** Importo compatto da cella: 89,90 (senza simbolo: la colonna è in euro). */
export const cifra = (n: number) => {
  const [i, dec] = n.toFixed(2).split('.')
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`
}
