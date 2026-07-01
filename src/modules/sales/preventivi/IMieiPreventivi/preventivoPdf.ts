// Genera lato client un PDF A4 del singolo preventivo (nessun dato sul server).
import { jsPDF } from 'jspdf'

export interface PreventivoPdfData {
  codice?: string
  stato?: string
  utente?: string
  data_creazione?: string
  data_scadenza?: string
  cliente?: string
  email?: string
  camere?: number
  checkin?: string
  checkout?: string
  prezzo?: number
}

const fmtPrezzo = (n?: number) =>
  n == null ? '—' : `${n.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`

/** Costruisce e scarica il PDF del preventivo. */
export function exportPreventivoPdf(p: PreventivoPdfData) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const margin = 48
  let y = margin

  pdf.setFontSize(18)
  pdf.text(`Preventivo ${p.codice ?? ''}`.trim(), margin, y)
  y += 10
  pdf.setDrawColor(200)
  pdf.line(margin, y, pw - margin, y)
  y += 28

  const rows: [string, string][] = [
    ['Stato', p.stato ?? '—'],
    ['Utente', p.utente ?? '—'],
    ['Data creazione', p.data_creazione ?? '—'],
    ['Data scadenza', p.data_scadenza ?? '—'],
    ['Cliente', p.cliente ?? '—'],
    ['Email', p.email || '—'],
    ['Camere', p.camere != null ? String(p.camere) : '—'],
    ['Check-in', p.checkin ?? '—'],
    ['Check-out', p.checkout ?? '—'],
    ['Prezzo', fmtPrezzo(p.prezzo)],
  ]

  pdf.setFontSize(11)
  for (const [label, value] of rows) {
    pdf.setTextColor(120)
    pdf.text(label, margin, y)
    pdf.setTextColor(30)
    pdf.text(value, margin + 150, y)
    y += 24
  }

  pdf.save(`${p.codice ?? 'preventivo'}.pdf`)
}
