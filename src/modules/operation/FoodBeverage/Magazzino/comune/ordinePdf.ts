// ─── Magazzino ristorazione: PDF dell'ordine al fornitore ────────────────────
//  Generato nel browser con jspdf: è il documento che l'utente vede ("Scarica
//  PDF") e lo stesso che il Portal allega all'email al fornitore
//  (`invia_ordine`, docs/portal-magazzino-riordino.md). Intestato al ristorante,
//  non a Sibylla. Importi e totale sono solo quelli dell'ordine (quantità ×
//  prezzo atteso): nessun calcolo di magazzino.

import { jsPDF } from 'jspdf'
import type { Ordine } from '../api/tipi'
import { euro, euroU, fmtData, fmtQ } from './formato'

const NAVY = '#204769'
const INK = '#1E293B'
const MUTED = '#64748B'
const BORDER = '#D8E2EC'
const TINT = '#F3F7FB'

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// jspdf con i font standard non ha il simbolo dell'euro in tutti i visualizzatori: si scrive "EUR".
const eur = (n: number | null) => (n == null ? '—' : euro(n).replace('€', 'EUR').trim())
const eurU = (n: number | null) => (n == null ? '—' : euroU(n).replace('€', 'EUR').trim())

export interface PdfOrdine { nomeFile: string; base64: string; blob: Blob }

export function creaPdfOrdine(o: Ordine, struttura: string): PdfOrdine {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = 16
  const R = 194
  let y = 18

  // Intestazione: il ristorante che ordina
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...rgb(NAVY))
  doc.text(struttura, L, y)
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...rgb(MUTED))
  doc.text('Ordine di acquisto', L, y + 6)
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...rgb(INK))
  doc.text(o.numero, R, y, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...rgb(MUTED))
  doc.text(`del ${fmtData(o.creato_il)}`, R, y + 6, { align: 'right' })
  y += 14
  doc.setDrawColor(...rgb(BORDER)).line(L, y, R, y)
  y += 8

  // Fornitore e consegna
  doc.setFontSize(9).setTextColor(...rgb(MUTED)).text('FORNITORE', L, y)
  doc.text('CONSEGNA RICHIESTA', 120, y)
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...rgb(INK))
  doc.text(o.fornitore.nome, L, y + 6)
  doc.text(o.consegna_richiesta ? fmtData(o.consegna_richiesta) : 'Da concordare', 120, y + 6)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...rgb(MUTED))
  if (o.fornitore.email) doc.text(o.fornitore.email, L, y + 11)
  y += 20

  // Righe
  const col = { cod: L, art: L + 28, q: 128, pr: 160, imp: R }
  doc.setFillColor(...rgb(TINT)).rect(L, y - 5, R - L, 8, 'F')
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...rgb(NAVY))
  doc.text('Codice', col.cod + 1, y)
  doc.text('Articolo', col.art, y)
  doc.text('Quantità', col.q, y, { align: 'right' })
  doc.text('Prezzo', col.pr, y, { align: 'right' })
  doc.text('Importo', col.imp - 1, y, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...rgb(INK))
  for (const r of o.righe) {
    if (y > 270) { doc.addPage(); y = 20 }
    const nome = doc.splitTextToSize(r.nome, col.q - col.art - 20) as string[]
    doc.text(r.codice_fornitore ?? '—', col.cod + 1, y)
    doc.text(nome, col.art, y)
    doc.text(fmtQ(r.quantita, r.unita), col.q, y, { align: 'right' })
    doc.text(r.prezzo_atteso == null ? '—' : `${eurU(r.prezzo_atteso)}/${r.unita}`, col.pr, y, { align: 'right' })
    doc.text(r.prezzo_atteso == null ? '—' : eur(r.quantita * r.prezzo_atteso), col.imp - 1, y, { align: 'right' })
    y += 5 * nome.length + 2
    doc.setDrawColor(...rgb(BORDER)).line(L, y - 3, R, y - 3)
  }
  y += 3
  doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...rgb(NAVY))
  doc.text(`Totale indicativo ${eur(o.totale_atteso)}`, R - 1, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...rgb(MUTED))
  doc.text('Prezzi indicativi, basati sull\'ultimo acquisto: fanno fede quelli del documento di trasporto.', R - 1, y, { align: 'right' })

  if (o.note) {
    y += 10
    doc.setFontSize(9).setTextColor(...rgb(MUTED)).text('NOTE', L, y)
    doc.setFontSize(10).setTextColor(...rgb(INK)).text(doc.splitTextToSize(o.note, R - L) as string[], L, y + 5)
  }

  doc.setFontSize(8).setTextColor(...rgb(MUTED))
  doc.text(`Per conferme e consegne rispondere a questa email citando l'ordine ${o.numero}.`, L, 287)

  const base64 = doc.output('datauristring').replace(/^data:[^,]*,/, '')
  return { nomeFile: `${o.numero}.pdf`, base64, blob: doc.output('blob') }
}
