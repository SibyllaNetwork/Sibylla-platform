// Genera lato client il PDF della notifica sotto-soglia (Bottom rate):
// numero prenotazione, TO/canale, segmento, tariffa applicata, BAR configurata,
// differenza, data e ora, azione effettuata da Sibylla e la dicitura sulla
// chiusura automatica del canale. Stesso impianto grafico degli altri PDF
// della piattaforma (reportPickupPdf): blu Platform + accenti.
import { jsPDF } from 'jspdf'

const NAVY   = '#204769'
const TINT   = '#E8EEF4'
const INK    = '#1E293B'
const MUTED  = '#64748B'
const BORDER = '#D8E2EC'
const RED    = '#B3261E'

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)

export interface SottoSogliaPdfData {
  numeroPrenotazione: string
  canale: string
  segmento: string
  tariffaApplicata: number
  barConfigurata: number
  pianoTariffario: string
  dataOra: Date
}

export function scaricaSottoSogliaPdf(d: SottoSogliaPdfData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 18
  let y = 22

  // ── Intestazione ─────────────────────────────────────────────────────────────
  doc.setFillColor(...rgb(NAVY))
  doc.rect(0, 0, W, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Notifica sotto-soglia — Bottom rate', M, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text('Sibylla Platform · Configuratore Bottom rate', M, 22)
  const quando = d.dataOra.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  doc.text(`Rilevamento del ${quando}`, M, 28)

  y = 46

  // ── Dettaglio del rilevamento ────────────────────────────────────────────────
  const differenza = d.barConfigurata - d.tariffaApplicata
  const righe: [string, string][] = [
    ['Numero prenotazione',   d.numeroPrenotazione],
    ['TO / canale',           d.canale],
    ['Segmento',              d.segmento],
    ['Piano tariffario',      d.pianoTariffario],
    ['Tariffa applicata',     fmtEur(d.tariffaApplicata)],
    ['B.A.R. configurata',    fmtEur(d.barConfigurata)],
    ['Differenza rilevata',   `− ${fmtEur(differenza)}`],
    ['Data e ora',            quando],
    ['Azione di Sibylla',     `Chiusura immediata del canale ${d.canale} per il segmento ${d.segmento}`],
  ]

  doc.setFontSize(10)
  const rowH = 10
  righe.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...rgb(TINT))
      doc.rect(M, y - 6.5, W - M * 2, rowH, 'F')
    }
    doc.setTextColor(...rgb(MUTED))
    doc.setFont('helvetica', 'normal')
    doc.text(label, M + 3, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...rgb(label === 'Differenza rilevata' ? RED : INK))
    doc.text(value, M + 62, y, { maxWidth: W - M * 2 - 66 })
    y += rowH
  })

  y += 6
  doc.setDrawColor(...rgb(BORDER))
  doc.line(M, y, W - M, y)
  y += 9

  // ── Dicitura sulla chiusura automatica ───────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...rgb(NAVY))
  doc.text('Chiusura automatica del canale', M, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...rgb(INK))
  const dicitura =
    `Prenotazione n. ${d.numeroPrenotazione} effettuata da ${d.canale} al prezzo di ${fmtEur(d.tariffaApplicata)}, ` +
    `a fronte di una BAR configurata di ${fmtEur(d.barConfigurata)}. A seguito del rilevamento dello scostamento, ` +
    `Sibylla provvede automaticamente alla chiusura immediata del canale per il segmento interessato, ` +
    `al fine di evitare ulteriori prenotazioni a una tariffa inferiore a quella configurata.`
  const wrapped = doc.splitTextToSize(dicitura, W - M * 2)
  doc.text(wrapped, M, y)
  y += wrapped.length * 4.6 + 8

  doc.setTextColor(...rgb(MUTED))
  doc.setFontSize(8.5)
  doc.text(
    'La riapertura del canale è riservata agli utenti autorizzati dal profilo di accesso.',
    M, y,
  )

  // ── Piè di pagina ────────────────────────────────────────────────────────────
  doc.setDrawColor(...rgb(BORDER))
  doc.line(M, 282, W - M, 282)
  doc.setFontSize(8)
  doc.setTextColor(...rgb(MUTED))
  doc.text('Documento generato automaticamente da Sibylla Platform', M, 288)

  doc.save(`notifica-sotto-soglia-${d.numeroPrenotazione.replace(/\//g, '-')}.pdf`)
}
