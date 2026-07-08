// Genera lato client il PDF del contratto "CONDIZIONI DI VENDITA — MERCATO
// GRUPPI" a partire dal modello Contratto. Il documento rispecchia l'anteprima
// stampabile: intestazione oro/blu Sibylla, parti, sezioni con tabelle e
// paragrafi, firme e logo a piè di pagina. Palette allineata al Report Pickup.
import { jsPDF } from 'jspdf'
import type { Contratto } from './contratto'

// ─── Palette (identità Sibylla + blu Platform) ───────────────────────────────
const NAVY      = '#204769'
const NAVY_TINT = '#E8EEF4'
const ROW_TINT  = '#F3F7FB'
const GOLD      = '#A2864C'
const INK       = '#1E293B'
const MUTED     = '#64748B'
const BORDER    = '#D8E2EC'

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// ─── Logo Sibylla (SVG inline → PNG), come nel Report Pickup ──────────────────
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

const dash = (s: string) => (s && s.trim() ? s : '—')

interface Col { header: string; w: number; align?: 'left' | 'right' }

/** Costruisce il documento jsPDF completo del contratto. */
async function buildDoc(c: Contratto): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margin = 44
  const contentW = pw - margin * 2
  const footReserve = 70 // spazio riservato al footer/logo
  let y = margin

  // Aggiunge una nuova pagina se non c'è spazio per `h` punti.
  const ensure = (h: number) => {
    if (y + h > ph - footReserve) { pdf.addPage(); y = margin }
  }

  // ── Intestazione (fascia oro→blu) ──
  const headH = 82
  pdf.setFillColor(...rgb(NAVY))
  pdf.rect(0, 0, pw, headH, 'F')
  pdf.setFillColor(...rgb(GOLD))
  pdf.rect(0, headH - 4, pw, 4, 'F')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...rgb(GOLD))
  pdf.text('CONDIZIONI DI VENDITA — MERCATO GRUPPI', margin, margin - 6)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.setTextColor(255, 255, 255)
  pdf.text(dash(c.struttura), margin, margin + 18)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...rgb(NAVY_TINT))
  pdf.text(`Segmento: ${c.segmento}`, margin, margin + 36)

  // Numero / data a destra
  pdf.setFontSize(9)
  pdf.setTextColor(...rgb(NAVY_TINT))
  pdf.text(`N. ${dash(c.numero)}`, pw - margin, margin - 2, { align: 'right' })
  pdf.text(`Data: ${dash(c.data)}`, pw - margin, margin + 13, { align: 'right' })

  y = headH + 22

  // ── Parti / condizioni generali (griglia 2 colonne) ──
  const parties: [string, string][] = [
    ['Cliente', dash(c.cliente)],
    ['Tour operator', dash(c.tourOperator)],
    ['Periodo', dash(c.periodo)],
    ['Pagamento', dash(c.pagamento)],
  ]
  const colW = contentW / 2
  parties.forEach(([label, value], i) => {
    const x = margin + (i % 2) * colW
    // Inizio di una nuova riga (ogni 2 voci): scendi di un blocco.
    if (i % 2 === 0 && i > 0) y += 34
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...rgb(MUTED))
    pdf.text(label.toUpperCase(), x, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(...rgb(INK))
    pdf.text(value, x, y + 14)
  })
  y += 34
  pdf.setDrawColor(...rgb(BORDER))
  pdf.setLineWidth(0.75)
  pdf.line(margin, y, pw - margin, y)
  y += 22

  // Titolo di sezione (barra oro a sinistra).
  const sectionTitle = (title: string) => {
    ensure(30)
    pdf.setFillColor(...rgb(GOLD))
    pdf.rect(margin, y - 9, 3, 13, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(...rgb(NAVY))
    pdf.text(title, margin + 10, y)
    y += 14
  }

  // Paragrafo con eventuale etichetta.
  const paragraph = (text: string, label?: string) => {
    if (label) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(...rgb(GOLD))
      ensure(14)
      pdf.text(label.toUpperCase(), margin, y)
      y += 12
    }
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...rgb(INK))
    const lines = pdf.splitTextToSize(dash(text), contentW) as string[]
    lines.forEach((ln) => { ensure(14); pdf.text(ln, margin, y); y += 14 })
    y += 8
  }

  // Tabella generica con header blu, zebra e bordi.
  const table = (cols: Col[], rows: string[][]) => {
    const rowH = 22
    const cellPad = 8
    const xs: number[] = []
    let acc = margin
    for (const col of cols) { xs.push(acc); acc += col.w }

    const drawHeader = () => {
      pdf.setFillColor(...rgb(NAVY))
      pdf.rect(margin, y, contentW, rowH, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(255, 255, 255)
      cols.forEach((col, i) => {
        const tx = col.align === 'right' ? xs[i] + col.w - cellPad : xs[i] + cellPad
        pdf.text(col.header, tx, y + rowH / 2 + 3, { align: col.align === 'right' ? 'right' : 'left' })
      })
      y += rowH
    }

    ensure(rowH * 2)
    const top = y
    drawHeader()
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    rows.forEach((r, ri) => {
      if (y + rowH > ph - footReserve) { pdf.addPage(); y = margin; drawHeader(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5) }
      if (ri % 2 === 1) { pdf.setFillColor(...rgb(ROW_TINT)); pdf.rect(margin, y, contentW, rowH, 'F') }
      pdf.setTextColor(...rgb(INK))
      cols.forEach((col, i) => {
        const tx = col.align === 'right' ? xs[i] + col.w - cellPad : xs[i] + cellPad
        pdf.text(dash(r[i]), tx, y + rowH / 2 + 3, { align: col.align === 'right' ? 'right' : 'left' })
      })
      pdf.setDrawColor(...rgb(BORDER)); pdf.setLineWidth(0.5)
      pdf.line(margin, y + rowH, margin + contentW, y + rowH)
      y += rowH
    })
    // Bordo perimetrale + separatori verticali
    pdf.setDrawColor(...rgb(BORDER)); pdf.setLineWidth(0.75)
    pdf.rect(margin, top, contentW, y - top)
    xs.slice(1).forEach((x) => pdf.line(x, top, x, y))
    y += 16
  }

  // ── DISTRIBUZIONE ──
  sectionTitle(`Distribuzione (${c.segmento})`)
  paragraph(c.distribuzione)

  // ── STAGIONALITÀ ──
  sectionTitle(`Stagionalità · anno ${dash(c.annoStagione)}`)
  table(
    [{ header: 'Stagionalità', w: contentW * 0.45 }, { header: 'Periodo', w: contentW * 0.55 }],
    c.stagioni.map((r) => [r.nome, r.periodo]),
  )

  // ── TARIFFE ──
  sectionTitle(`Tariffe ${dash(c.annoStagione)}`)
  table(
    [
      { header: 'Stagione', w: contentW * 0.26 },
      { header: 'Segmento', w: contentW * 0.20 },
      { header: 'Base', w: contentW * 0.22 },
      { header: 'Prezzo (€)', w: contentW * 0.16, align: 'right' },
      { header: 'Suppl. (€)', w: contentW * 0.16, align: 'right' },
    ],
    c.tariffe.map((r) => [r.stagione, r.segmento, r.base, r.prezzo, r.suppl]),
  )

  // ── MERCATO SPECIFICO ──
  sectionTitle('Mercato specifico')
  table(
    [
      { header: 'Nazionalità', w: contentW * 0.28 },
      { header: 'Segmento', w: contentW * 0.22 },
      { header: 'Note', w: contentW * 0.50 },
    ],
    c.mercato.map((r) => [r.nazionalita, r.segmento, r.note]),
  )

  // ── SUPPLEMENTI ──
  sectionTitle('Supplementi')
  table(
    [
      { header: 'Segmento', w: contentW * 0.28 },
      { header: 'Categoria', w: contentW * 0.20 },
      { header: 'Voce', w: contentW * 0.34 },
      { header: 'Importo (€)', w: contentW * 0.18, align: 'right' },
    ],
    c.supplementi.map((r) => [r.segmento, r.categoria, r.voce, r.importo]),
  )
  paragraph(c.gratuita, 'Gratuità, tassa di soggiorno e IVA')

  // ── CONTINGENTE CAMERE / LOTTI ──
  sectionTitle('Contingente camere — Lotti')
  table(
    [
      { header: 'Mese', w: contentW * 0.34 },
      { header: 'Anno', w: contentW * 0.22 },
      { header: 'Lotti', w: contentW * 0.22, align: 'right' },
      { header: 'Camere/giorno', w: contentW * 0.22, align: 'right' },
    ],
    c.lotti.map((r) => [r.mese, r.anno, r.lotti, r.camereGiorno]),
  )

  // ── PENALI ──
  sectionTitle('Penali')
  paragraph(c.penali)

  // ── FIRME ──
  ensure(90)
  y += 6
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(...rgb(MUTED))
  pdf.text('LUOGO E DATA', margin, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(...rgb(INK))
  pdf.text(dash(c.luogo), margin, y + 14)
  y += 46

  const signW = (contentW - 30) / 2
  const signs: [string, string][] = [
    ['Amministratore struttura', dash(c.struttura)],
    ['Amministratore cliente', dash(c.cliente)],
  ]
  signs.forEach(([label, name], i) => {
    const x = margin + i * (signW + 30)
    pdf.setDrawColor(...rgb(INK)); pdf.setLineWidth(0.75)
    pdf.line(x, y, x + signW, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(...rgb(INK))
    pdf.text(name, x, y + 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...rgb(MUTED))
    pdf.text(label.toUpperCase(), x, y + 26)
  })

  // ── Footer con logo su ogni pagina ──
  const logo = await logoPng()
  const pages = pdf.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    const fy = ph - margin
    pdf.setDrawColor(...rgb(BORDER)); pdf.setLineWidth(0.5)
    pdf.line(margin, fy - 34, pw - margin, fy - 34)
    if (logo) {
      const lw = 96
      const lh = lw / logo.ratio
      pdf.addImage(logo.data, 'PNG', margin, fy - 24, lw, lh)
    }
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...rgb(MUTED))
    pdf.text(`Generato da Sibylla Platform · pag. ${p}/${pages}`, pw - margin, fy - 8, { align: 'right' })
  }

  return pdf
}

/** Nome file coerente col numero contratto. */
const fileName = (c: Contratto) =>
  `Contratto_${(c.numero || 'MERCATO-GRUPPI').replace(/[\\/\s]+/g, '-')}.pdf`

/** Costruisce e scarica il PDF del contratto. */
export async function scaricaContrattoPdf(c: Contratto): Promise<void> {
  const pdf = await buildDoc(c)
  pdf.save(fileName(c))
}

/** Genera un object URL (Blob PDF) del contratto — da revocare quando sostituito. */
export async function contrattoPdfObjectUrl(c: Contratto): Promise<string> {
  const pdf = await buildDoc(c)
  return URL.createObjectURL(pdf.output('blob'))
}
