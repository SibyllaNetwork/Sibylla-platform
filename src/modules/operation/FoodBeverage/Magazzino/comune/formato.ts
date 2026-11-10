// ─── Magazzino ristorazione: formati di quantità, importi e date ─────────────
//  § B2.7 della scheda 17: quantità con la virgola e l'unità (`2,500 kg`,
//  `12 pz`), importi in euro con 2 decimali.

import type { TipoMovimento, OrigineMovimento, Unita, TipoPunto } from '../api/tipi'

/** Quantità: kg e l sempre con 3 decimali, pz senza decimali se interi. */
export function fmtQ(n: number | null | undefined, unita?: Unita): string {
  if (n == null) return '—'
  const intero = Number.isInteger(n)
  const dec = unita === 'pz' && intero ? 0 : 3
  const s = n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: 3 })
  return unita ? `${s} ${unita}` : s
}

/** Quantità con segno (movimenti e differenze). */
export const fmtQs = (n: number | null | undefined, unita?: Unita) =>
  n == null ? '—' : `${n > 0 ? '+' : ''}${fmtQ(n, unita)}`

export const euro = (n: number | null | undefined, dec = 2) =>
  n == null ? '—' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec })

/** Prezzo unitario: fino a 4 decimali (0,0125 €/g è possibile). */
export const euroU = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 4 })

export const fmtData = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('it-IT') : '—'

export const fmtDataOra = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

/** "aaaa-mm-gg" del giorno locale. */
export function isoGiorno(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Istante ISO 8601 con il fuso locale ("2026-11-10T09:30:00+01:00"), dal valore di un campo datetime-local. */
export function isoConFuso(locale: string): string {
  const d = new Date(locale)
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  return `${isoGiorno(d)}T${p(d.getHours())}:${p(d.getMinutes())}:00${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`
}

/** Valore per un campo datetime-local (adesso). */
export function oraLocale(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${isoGiorno(d)}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Numero da un campo di testo: accetta la virgola; `null` se vuoto o non valido. */
export function numero(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export const TIPI_MOVIMENTO: { key: TipoMovimento; nome: string; icona: string }[] = [
  { key: 'carico', nome: 'Carico', icona: 'fa-truck-ramp-box' },
  { key: 'scarico', nome: 'Scarico', icona: 'fa-arrow-right-from-bracket' },
  { key: 'trasferimento', nome: 'Trasferimento', icona: 'fa-right-left' },
  { key: 'reso', nome: 'Reso al fornitore', icona: 'fa-rotate-left' },
  { key: 'scarto', nome: 'Scarto', icona: 'fa-trash-can' },
  { key: 'vendita', nome: 'Vendita', icona: 'fa-utensils' },
  { key: 'rettifica', nome: 'Rettifica', icona: 'fa-scale-balanced' },
]
export const nomeTipo = (t: TipoMovimento) => TIPI_MOVIMENTO.find(x => x.key === t)?.nome ?? t
export const iconaTipo = (t: TipoMovimento) => TIPI_MOVIMENTO.find(x => x.key === t)?.icona ?? 'fa-circle'

export const ORIGINI: { key: OrigineMovimento; nome: string }[] = [
  { key: 'manuale', nome: 'Manuale' },
  { key: 'codice_a_barre', nome: 'Codice a barre' },
  { key: 'bolla', nome: 'Da bolla' },
  { key: 'comanda', nome: 'Comanda' },
  { key: 'inventario', nome: 'Inventario' },
]
export const nomeOrigine = (o: OrigineMovimento) => ORIGINI.find(x => x.key === o)?.nome ?? o

export const TIPI_PUNTO: { key: TipoPunto; nome: string }[] = [
  { key: 'magazzino', nome: 'Magazzino' },
  { key: 'cucina', nome: 'Cucina' },
  { key: 'bar', nome: 'Bar' },
]
