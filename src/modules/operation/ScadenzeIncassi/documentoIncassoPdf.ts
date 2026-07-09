// Genera lato client il PDF di un documento di incasso (quietanza / fattura /
// acconto / nota di credito) della pagina "Scadenze incassi". Stessa identità
// grafica del Report Pickup: blu Platform + oro Sibylla, logo in basso.
import { jsPDF } from 'jspdf'

// ─── Palette (identità Sibylla + blu Platform) ───────────────────────────────
const NAVY      = '#204769'
const NAVY_TINT = '#E8EEF4'
const ROW_TINT  = '#F3F7FB'
const GOLD      = '#A2864C'
const INK       = '#1E293B'
const MUTED     = '#64748B'
const BORDER    = '#D8E2EC'
const OK        = '#1A7F4B'
const KO        = '#D10011'

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

const fmtEur2 = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Logo Sibylla (SVG inline → PNG) ──────────────────────────────────────────
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1106.5" height="350.1" viewBox="0 0 1106.5 350.1"><defs><style>.st0{fill:none;stroke:#a2864c;stroke-miterlimit:10;stroke-width:5px}.st2{fill:#010101}.st1{fill:#a2864c}</style></defs><g><path class="st0" d="M238.9,142.1s3.5-3.3,7.2-7l7-6.5s15.4,20.5,14.7,48.1c-.7,27.6-11.4,41.6-11.4,41.6l21.7,13.1s5.1-5.1,10.1-18.2c7-17.8,8.6-48.5,3.3-66.7-9.8-33.9-32.7-59.1-64.4-76.6-9.3-5.4-18.9-10-18.9-10l4.7-17s41.1,11.4,72.3,48.5c28.7,34.3,29.4,64.7,29.4,64.7h36l-.3-11.7c-.7-14.7-3.3-19.6-3.3-19.6,0,0-5.2-16.6-10.1-26.9-21-42.9-61.8-76.1-110.9-90.1-23.8-6.8-68.8-7.2-91.3-.9-33.2,9.1-62.3,26.1-85,50.4-8.2,8.6-12.8,15.4-12.8,15.4,0,0,1.4,1.4,2.3,2.1,1.9,1.6,8.9,7.9,15.6,13.8l12.6,11s15.2-25.9,47.6-43.4c33.1-17.8,63.7-15.2,63.7-15.2v18.7c.2,0-17.8,1.9-17.8,1.9-52,8.2-89.8,45.1-97.1,96.4-3,46.7,7,60.7,7,60.7l23.3-13.6s-10.1-29.6,4.5-65.1c22.9-46.4,79.3-63.9,124.2-38,5.9,3.3,11.2,8.2,11.2,8.2l-11.4,14M145.5,302.7c-7.5-1.6-19.4-6.3-26.8-10-13.5-7-18.7-11.9-18.7-11.9l4.2-5.8,4.4-6.1,15.2,8.4c8.4,4.2,21.3,8.9,29,10.5,16.8,3.5,47.9,2.1,61.9-3l9.6-3.5,6.8,15.2s-8.4,3.3-17,5.6c-18.5,5.1-49.2,5.6-68.8.7h0v-.2ZM350.9,170.1h-36l-1.2,23.1c-3.5,31.7-15.9,53.7-38.3,75.8l-13.1,10.8-5.6-7-5.6-6.8s7.7-6.1,10.8-9.3,7.5-10,7.5-10l-21.7-16.6-10.7,8.9c-38.7,32.2-91.2,29.6-123.7-6.3l-13.3-13.6-23.3,13.5s2.3,5.1,4,8.2l5.2,8-4.9,4.9c-2.6,2.4-5.1,4.7-5.1,4.7,0,0-21.2-15.4-29.4-54.6-4.2-19.8-4-50.6,1.9-70.3,1.9-6.1,8.6-18.9,8.6-18.9,0,0-8.9-4-18.4-8.2-9.4-4.2-18.4-8-18.4-8,0,0-6.1,12.1-11.4,27.6C1.3,149.8.2,191.1,6.9,216.6c14.5,56.2,59.1,103.8,115.3,122.6,22.2,7.5,33.9,8.9,63.3,8.2,21-.7,30.8-2.1,45.5-7h0c49.3-16.1,85.7-46.5,105.5-88l8.6-18c12.2-42,5.8-64.4,5.8-64.4h0Z"/><path class="st1" d="M231.9,130c-9.3-9.4-13.3-11.9-22.6-16.4-17.7-8.7-42.2-9.1-60.2-1.2-14.9,6.8-28.5,19.2-36.2,36.4-7.9,22.9-4.4,43.4-4.4,43.4h119s-3.7,17.3-18.5,26.8c-17.1,10.7-39.9,12.4-59.5,1-16.4-9.4-21.9-19.8-21.9-19.8h-18.5c0,.2,9.3,23.8,35.5,35.3,14.5,6.5,33.9,11,54.9,4.9,20.5-5.8,40.9-26.8,46.4-47.2,1.9-7,2.1-17.5,2.1-17.5h-120.7s.2-7,.9-10.5c2.6-12.8,10.3-24.5,19.9-31.1,10.3-7,27.5-10.1,38-8,18.7,3.5,35,17,40.6,33.8,1.4,4.2,2.6,7.7,2.6,7.7h18.7s-.3-5.1-1.2-9.3c-.7-3.7-2.1-7.3-3.3-10.8-.9-2.3-5.8-11.9-11.7-17.7"/></g><g><path class="st2" d="M404.4,253.3l3.5-33c14.4,7.6,35.8,12,50.7,12s25.5-3.5,25.5-16-9.9-17-27.6-23.3c-31.1-9.2-50.5-22.4-50.5-49.5s27.1-49,60.4-49,34.2,3.3,49.8,10.1l-4.7,33.2c-16.3-7.1-29.7-10.4-42.7-10.4s-22.6,3.3-22.6,15.3,7.8,15.3,26.2,21.7c31.8,9.4,51.9,23.3,51.9,51.4s-27.8,49.8-62.9,49.8-40.8-4.2-56.8-12.3h-.2Z"/><path class="st2" d="M542.3,117.5v-30.2h37.7v30.2h-37.7ZM543,262.3v-130.2h36.5v130.1h-36.5Z"/><path class="st2" d="M642.3,249.3v13h-36.3V88.2h36.3v56.8c9.4-11.3,21.9-15.8,35.4-15.8,30.4,0,52.3,25.2,52.3,67.4s-22.2,68.4-51.9,68.4-26.4-4.7-35.8-15.8h0ZM693.2,196.7c0-23.3-10.1-35.4-24.8-35.4s-26.2,16.7-26.2,36.1,9.2,35.8,26.2,35.8,24.8-12.3,24.8-36.5Z"/><path class="st2" d="M823.6,132.1h38l-45.7,130.1-13.9,40.3h-37.2l14.1-39.1-46.2-131.3h38l26.2,89.4h.2l26.6-89.4h0Z"/><path class="st2" d="M877.8,262.3V88.2h36.3v174h-36.3Z"/><path class="st2" d="M940.7,262.3V88.2h36.3v174h-36.3Z"/><path class="st2" d="M1106.5,183.5v78.8h-36.1v-16c-6.6,11.6-19.1,18.9-35.6,18.9s-39.1-15.8-39.1-41.5,13.9-39.1,45.5-39.1,21,.7,29.2,1.4v-2.8c0-14.8-8.3-23.3-25-23.3s-24.1,2.8-33.7,6.8l-3.5-30.2c12-4.2,26.2-7.1,41.7-7.1,39.8,0,56.6,20.5,56.6,54.2h0ZM1070.4,207.3v-.5c-6.1-.7-12-1.2-19.8-1.2-14.4,0-20.3,4.2-20.3,14.6s6.6,15.1,17,15.1c15.3,0,23.1-9.2,23.1-28.1h0Z"/></g></svg>`

async function logoPng(): Promise<{ data: string; ratio: number } | null> {
  try {
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG)
    const img = new Image()
    img.src = url
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('logo')) })
    const scale = 3
    const canvas = document.createElement('canvas')
    canvas.width = 1106.5 * scale
    canvas.height = 350.1 * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { data: canvas.toDataURL('image/png'), ratio: 1106.5 / 350.1 }
  } catch {
    return null
  }
}

export interface DocumentoPdfData {
  numero: string
  tipologia: string
  dataDocumento: string   // ISO
  emessoDa: string
  riferimento: string
  ragioneSociale: string
  importo: number
  saldo: number
  voceIncasso: string
  dataScadenza: string    // ISO
  stato: string
  gruppo?: string
}

export async function exportDocumentoIncassoPdf(d: DocumentoPdfData) {
  const gruppo = d.gruppo ?? 'Gruppo Alberghiero Sibylla'
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margin = 48
  const contentW = pw - margin * 2

  // ── Intestazione: titolo + numero documento (pill oro) ──
  let y = margin + 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.setTextColor(...rgb(NAVY))
  pdf.text('Documento di incasso', margin, y + 6)

  pdf.setFontSize(11)
  const pillTxt = d.numero
  const pillTw = pdf.getTextWidth(pillTxt)
  const pillPadX = 12
  const pillW = pillTw + pillPadX * 2
  const pillH = 24
  const pillX = pw - margin - pillW
  const pillY = y - 8
  pdf.setFillColor(...rgb(NAVY_TINT))
  pdf.setDrawColor(...rgb(GOLD))
  pdf.setLineWidth(1)
  pdf.roundedRect(pillX, pillY, pillW, pillH, 6, 6, 'FD')
  pdf.setTextColor(...rgb(NAVY))
  pdf.text(pillTxt, pillX + pillPadX, pillY + 16)

  // Gruppo + tipologia
  y += 30
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(...rgb(GOLD))
  pdf.text(gruppo, margin, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(...rgb(MUTED))
  pdf.text(d.tipologia, pw - margin, y, { align: 'right' })

  // Riga divisoria oro
  y += 12
  pdf.setDrawColor(...rgb(GOLD))
  pdf.setLineWidth(1.5)
  pdf.line(margin, y, pw - margin, y)

  // ── Dettaglio (coppie etichetta / valore su due colonne) ──
  y += 26
  const rows: [string, string][] = [
    ['Data documento', fmtDate(d.dataDocumento)],
    ['Scadenza', fmtDate(d.dataScadenza)],
    ['Emesso da', d.emessoDa],
    ['Voce incasso', d.voceIncasso],
    ['Riferimento', d.riferimento && d.riferimento !== '-' ? d.riferimento : '—'],
    ['Ragione sociale', d.ragioneSociale && d.ragioneSociale !== '-' ? d.ragioneSociale : '—'],
  ]
  const colW = contentW / 2
  const lineH = 40
  rows.forEach(([label, value], i) => {
    const col = i % 2
    const rowIdx = Math.floor(i / 2)
    const x = margin + col * colW
    const ry = y + rowIdx * lineH
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...rgb(MUTED))
    pdf.text(label.toUpperCase(), x, ry)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...rgb(INK))
    pdf.text(value, x, ry + 16)
  })
  y += Math.ceil(rows.length / 2) * lineH + 8

  // ── Riquadro importi ──
  const boxH = 96
  pdf.setFillColor(...rgb(ROW_TINT))
  pdf.setDrawColor(...rgb(BORDER))
  pdf.setLineWidth(0.75)
  pdf.roundedRect(margin, y, contentW, boxH, 8, 8, 'FD')

  const incassato = d.importo - d.saldo
  const amounts: [string, string, string][] = [
    ['Importo', fmtEur2(d.importo), INK],
    ['Incassato', fmtEur2(incassato), OK],
    ['Saldo residuo', fmtEur2(d.saldo), d.saldo > 0 ? KO : OK],
  ]
  const aColW = contentW / 3
  amounts.forEach(([label, value, color], i) => {
    const x = margin + i * aColW + 16
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    pdf.setTextColor(...rgb(MUTED))
    pdf.text(label.toUpperCase(), x, y + 32)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(17)
    pdf.setTextColor(...rgb(color))
    pdf.text(value, x, y + 62)
  })
  // Stato pill in fondo al riquadro
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  const statoColor = d.saldo <= 0 ? OK : d.stato.toLowerCase().includes('scad') && !d.stato.toLowerCase().includes('in ') ? KO : NAVY
  pdf.setTextColor(...rgb(statoColor))
  pdf.text(`Stato: ${d.stato}`, pw - margin - 16, y + boxH - 12, { align: 'right' })
  y += boxH

  // ── Footer: logo Sibylla ──
  const logo = await logoPng()
  const footY = ph - margin
  pdf.setDrawColor(...rgb(BORDER))
  pdf.setLineWidth(0.5)
  pdf.line(margin, footY - 62, pw - margin, footY - 62)
  if (logo) {
    const lw = 138
    const lh = lw / logo.ratio
    pdf.addImage(logo.data, 'PNG', (pw - lw) / 2, footY - 48, lw, lh)
  } else {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(...rgb(GOLD))
    pdf.text('Sibylla', pw / 2, footY - 24, { align: 'center' })
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...rgb(MUTED))
  pdf.text('Generato da Sibylla Platform', pw / 2, footY - 6, { align: 'center' })

  pdf.save(`${d.numero.replace(/[\/\s]+/g, '-')}.pdf`)
}
