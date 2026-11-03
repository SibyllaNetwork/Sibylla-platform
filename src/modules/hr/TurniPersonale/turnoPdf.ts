// PDF del turno settimanale pubblicato (unico formato di download, dal pulsante
// "Scarica PDF" della notifica che riceve il dipendente). Generato lato client:
// tabella dipendenti per reparto × giorni, come la visualizzazione digitale.
import { jsPDF } from 'jspdf'
import { logoPng } from '../../notifiche/CentroNotifiche/reportPickupPdf'
import { DIPENDENTI_HR, REPARTI_HR, useHrGestioneStore } from '../../../store/useHrGestioneStore'
import {
  GIORNI_BREVI, assenzaDi, etichettaSettimana, giorniSettimana, giornoMese, type PubblicazioneTurno,
} from '../../../store/useTurniPersonaleStore'

const NAVY = '#204769'
const NAVY_TINT = '#E8EEF4'
const GOLD = '#A2864C'
const INK = '#1E293B'
const MUTED = '#64748B'
const AMBER = '#B7791F'
const BORDER = '#D8E2EC'
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export async function scaricaTurnoPdf(p: PubblicazioneTurno, struttura?: string) {
  const richieste = useHrGestioneStore.getState().richieste
  const giorni = giorniSettimana(p.lunedi)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const m = 40
  const w = pw - m * 2

  const intestazione = () => {
    let y = m + 14
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.setTextColor(...rgb(NAVY))
    pdf.text('Turno del personale', m, y)
    pdf.setFontSize(11); pdf.setTextColor(...rgb(GOLD))
    const sett = `Settimana ${etichettaSettimana(p.lunedi)}`
    pdf.text(sett, pw - m - pdf.getTextWidth(sett), y)
    y += 18
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(...rgb(MUTED))
    const pubbl = new Date(p.at)
    pdf.text(`${struttura ? `${struttura} · ` : ''}Pubblicato il ${pubbl.toLocaleDateString('it-IT')} alle ${pubbl.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`, m, y)
    y += 10
    pdf.setDrawColor(...rgb(GOLD)); pdf.setLineWidth(1.2); pdf.line(m, y, pw - m, y)
    return y + 16
  }

  const wDip = 170, wTot = 60
  const wDay = (w - wDip - wTot) / 7
  const rowH = 20
  const header = (y: number) => {
    pdf.setFillColor(...rgb(NAVY)); pdf.rect(m, y, w, rowH + 6, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
    pdf.text('Dipendente', m + 8, y + 16)
    giorni.forEach((g, i) => {
      const cx = m + wDip + wDay * i + wDay / 2
      pdf.text(`${GIORNI_BREVI[i]} ${giornoMese(g)}`, cx, y + 16, { align: 'center' })
    })
    pdf.text('Giorni', m + wDip + wDay * 7 + wTot / 2, y + 16, { align: 'center' })
    return y + rowH + 6
  }

  let y = header(intestazione())
  for (const rep of REPARTI_HR) {
    const staff = DIPENDENTI_HR.filter(d => d.reparto === rep)
    if (y + rowH * (staff.length + 1) > ph - m - 30) { pdf.addPage(); y = header(intestazione()) }
    pdf.setFillColor(...rgb(NAVY_TINT)); pdf.rect(m, y, w, rowH, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...rgb(NAVY))
    pdf.text(rep, m + 8, y + 14)
    y += rowH
    for (const d of staff) {
      pdf.setDrawColor(...rgb(BORDER)); pdf.setLineWidth(0.6); pdf.line(m, y + rowH, m + w, y + rowH)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...rgb(INK))
      pdf.text(`${d.nome} ${d.cognome}`, m + 8, y + 14)
      let tot = 0
      giorni.forEach((g, i) => {
        const cx = m + wDip + wDay * i + wDay / 2
        const inTurno = (p.assegnazioni[g] ?? []).includes(d.id)
        const a = assenzaDi(richieste, d.id, g)
        if (inTurno) {
          tot++
          pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb(NAVY)); pdf.text('In turno', cx, y + 14, { align: 'center' })
        } else if (a && !a.inAttesa) {
          pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb(AMBER)); pdf.text(a.tipo, cx, y + 14, { align: 'center' })
        } else {
          pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...rgb(MUTED)); pdf.text('Riposo', cx, y + 14, { align: 'center' })
        }
      })
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...rgb(INK))
      pdf.text(String(tot), m + wDip + wDay * 7 + wTot / 2, y + 14, { align: 'center' })
      y += rowH
    }
  }

  const logo = await logoPng()
  if (logo) {
    const lw = 80
    pdf.addImage(logo.data, 'PNG', pw - m - lw, ph - m - lw / logo.ratio + 10, lw, lw / logo.ratio)
  }
  pdf.save(`turno_${p.lunedi}.pdf`)
}
