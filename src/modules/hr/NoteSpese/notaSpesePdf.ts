// PDF di fine mese della nota spese: un foglio per dipendente (stesse colonne della
// pagina) e la distinta delle ricevute da allegare al cedolino. Generati lato client.
import { jsPDF } from 'jspdf'
import { logoPng } from '../../notifiche/CentroNotifiche/reportPickupPdf'
import {
  CATEGORIE_SPESA, DIPENDENTI_HR, VALORE_BUONO, nomeDipendente, useHrGestioneStore,
} from '../../../store/useHrGestioneStore'
import { cifra, etichettaMese, foglio } from './notaSpeseModel'

const NAVY = '#204769'
const TEAL = '#2F6F73'
const BROWN = '#8A5A2B'
const PURPLE = '#5B4B8A'
const INK = '#1E293B'
const MUTED = '#64748B'
const BORDER = '#D8E2EC'
const WEEKEND = '#F4F6F9'
const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

type Logo = { data: string; ratio: number } | null

function intestazione(pdf: jsPDF, titolo: string, sotto: string, logo: Logo) {
  const pw = pdf.internal.pageSize.getWidth()
  const m = 32
  if (logo) { const lw = 96; pdf.addImage(logo.data, 'PNG', pw - m - lw, m - 8, lw, lw / logo.ratio, 'logo', 'FAST') }
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...rgb(TEAL))
  pdf.text('SIBYLLA · RIMBORSO SPESE', m, m + 2)
  pdf.setFontSize(17); pdf.setTextColor(...rgb(NAVY))
  pdf.text(titolo, m, m + 22)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(...rgb(MUTED))
  pdf.text(sotto, m, m + 36)
  return m + 50
}

function pagineFoglio(pdf: jsPDF, dipendenteId: number, ym: string, primo: boolean, logo: Logo) {
  const { noteSpese, buoniPasto } = useHrGestioneStore.getState()
  const f = foglio(dipendenteId, ym, noteSpese, buoniPasto)
  if (!primo) pdf.addPage()
  const pw = pdf.internal.pageSize.getWidth()
  const m = 32
  const w = pw - m * 2
  const d = DIPENDENTI_HR.find(x => x.id === dipendenteId)
  let y = intestazione(pdf, 'Nota spese mensile', `${nomeDipendente(dipendenteId)} · ${d?.reparto ?? ''} · ${etichettaMese(ym)}`, logo)

  // Colonne: Data, N° trasf., 7 voci, Buono, Totale
  const cols = [
    { k: 'data', l: 'Data', w: 0.09, c: INK },
    { k: 'trasf', l: 'N° trasf.', w: 0.07, c: INK },
    ...CATEGORIE_SPESA.map((v, i) => ({ k: v, l: v, w: 0.095, c: i < 5 ? TEAL : BROWN })),
    { k: 'buono', l: 'Buono', w: 0.07, c: PURPLE },
    { k: 'tot', l: 'Tot. spese', w: 0.105, c: NAVY },
  ]
  const xs: number[] = []
  let acc = m
  for (const c of cols) { xs.push(acc); acc += c.w * w }
  const rowH = 13.2

  pdf.setFillColor(...rgb(NAVY)); pdf.rect(m, y, w, 18, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255)
  cols.forEach((c, i) => {
    const right = i > 0
    pdf.text(c.l, right ? xs[i] + c.w * w - 5 : xs[i] + 5, y + 12, { align: right ? 'right' : 'left' })
  })
  y += 18

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
  for (const r of f.righe) {
    if (r.festivo) { pdf.setFillColor(...rgb(WEEKEND)); pdf.rect(m, y, w, rowH, 'F') }
    pdf.setDrawColor(...rgb(BORDER)); pdf.setLineWidth(0.4); pdf.line(m, y + rowH, m + w, y + rowH)
    pdf.setTextColor(...rgb(r.festivo ? MUTED : INK))
    pdf.text(`${String(r.giorno).padStart(2, '0')} ${r.settimana}`, xs[0] + 5, y + 9.4)
    const ry = y + 9.4
    const cella = (i: number, t: string, col = INK) => {
      if (!t) return
      pdf.setTextColor(...rgb(col))
      pdf.text(t, xs[i] + cols[i].w * w - 5, ry, { align: 'right' })
    }
    cella(1, r.trasferte ? String(r.trasferte) : '')
    CATEGORIE_SPESA.forEach((v, k) => cella(2 + k, r.celle[v].importo ? cifra(r.celle[v].importo) : ''))
    cella(9, r.buono ? 'Sì' : '', PURPLE)
    pdf.setFont('helvetica', 'bold'); cella(10, r.totale ? cifra(r.totale) : '', NAVY); pdf.setFont('helvetica', 'normal')
    y += rowH
  }

  // Totali del mese
  pdf.setFillColor(...rgb(INK)); pdf.rect(m, y, w, 18, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)
  pdf.text('Totali mese', xs[0] + 5, y + 12)
  const tot = (i: number, t: string) => pdf.text(t, xs[i] + cols[i].w * w - 5, y + 12, { align: 'right' })
  tot(1, String(f.trasferte))
  CATEGORIE_SPESA.forEach((v, k) => tot(2 + k, cifra(f.perVoce[v])))
  tot(9, String(f.nBuoni))
  tot(10, cifra(f.spese))
  y += 30

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...rgb(INK))
  pdf.text(`Spese ${cifra(f.spese)} €  ·  Buoni pasto ${f.nBuoni} × ${VALORE_BUONO} € = ${cifra(f.buoniEur)} €  ·  Da approvare ${cifra(f.eurDaApprovare)} €  ·  Le spese rifiutate (${cifra(f.eurRifiutate)} €) non sono incluse.`, m, y)
}

export async function scaricaNotaSpesePdf(ym: string, dipendenti: number[]) {
  const logo = await logoPng().catch(() => null)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  dipendenti.forEach((id, i) => pagineFoglio(pdf, id, ym, i === 0, logo))
  pdf.save(dipendenti.length === 1
    ? `nota-spese_${ym}_${nomeDipendente(dipendenti[0]).toLowerCase().replace(/\s+/g, '-')}.pdf`
    : `nota-spese_${ym}.pdf`)
}

/** Distinta delle ricevute del mese: cosa allegare e cosa manca. */
export async function scaricaDistintaRicevute(ym: string, dipendenti: number[]) {
  const logo = await logoPng().catch(() => null)
  const { noteSpese } = useHrGestioneStore.getState()
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const m = 32
  const w = pw - m * 2
  const righe = noteSpese
    .filter(n => n.data.startsWith(ym) && dipendenti.includes(n.dipendenteId) && n.stato !== 'Rifiutata')
    .sort((a, b) => nomeDipendente(a.dipendenteId).localeCompare(nomeDipendente(b.dipendenteId)) || a.data.localeCompare(b.data))
  let y = intestazione(pdf, 'Distinta delle ricevute', `${etichettaMese(ym)} · ${righe.length} ricevute · ${righe.filter(r => !r.giustificativo).length} mancanti`, logo)
  const cols = [0.12, 0.22, 0.12, 0.38, 0.16]
  const xs = cols.reduce<number[]>((a, c, i) => [...a, i ? a[i - 1] + cols[i - 1] * w : m], [])
  const head = () => {
    pdf.setFillColor(...rgb(NAVY)); pdf.rect(m, y, w, 18, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)
    ;['Data', 'Dipendente', 'Voce', 'Ricevuta', 'Importo'].forEach((t, i) => pdf.text(t, i === 4 ? xs[i] + cols[i] * w - 5 : xs[i] + 5, y + 12, { align: i === 4 ? 'right' : 'left' }))
    y += 18
  }
  head()
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
  for (const n of righe) {
    if (y > ph - m - 20) { pdf.addPage(); y = m; head(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8) }
    pdf.setDrawColor(...rgb(BORDER)); pdf.setLineWidth(0.4); pdf.line(m, y + 15, m + w, y + 15)
    pdf.setTextColor(...rgb(INK))
    pdf.text(n.data.split('-').reverse().join('/'), xs[0] + 5, y + 10.5)
    pdf.text(nomeDipendente(n.dipendenteId), xs[1] + 5, y + 10.5)
    pdf.text(n.categoria, xs[2] + 5, y + 10.5)
    if (n.giustificativo) pdf.text(pdf.splitTextToSize(n.giustificativo, cols[3] * w - 10)[0], xs[3] + 5, y + 10.5)
    else { pdf.setTextColor(185, 28, 28); pdf.text('Ricevuta mancante', xs[3] + 5, y + 10.5) }
    pdf.setTextColor(...rgb(INK))
    pdf.text(`${cifra(n.importo)} €`, xs[4] + cols[4] * w - 5, y + 10.5, { align: 'right' })
    y += 15
  }
  pdf.save(`ricevute_${ym}.pdf`)
}
