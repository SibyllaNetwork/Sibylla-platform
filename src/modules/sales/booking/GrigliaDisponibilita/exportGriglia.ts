// Export della Griglia disponibilità: XLSX (file Excel reale via SheetJS) e
// PDF (cattura della tabella via html2canvas + jsPDF). Nessun dato sul server:
// i file vengono generati e scaricati lato client.
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// nome foglio Excel: max 31 char, niente caratteri vietati : \ / ? * [ ]
const sheetName = (title?: string) =>
  (title || 'Foglio1').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Foglio1'

/**
 * Esporta una tabella (header + righe) in un vero file .xlsx apribile in Excel.
 * Accetta filename con estensione .xls o .xlsx (viene comunque normalizzato a .xlsx).
 */
export function exportTableToXls(
  filename: string,
  header: string[],
  rows: (string | number)[][],
  title?: string,
) {
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName(title))
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const xlsxName = filename.replace(/\.(xls|xlsx)$/i, '') + '.xlsx'
  triggerDownload(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    xlsxName,
  )
}

/** Cattura un elemento (la tabella) e lo salva come PDF orizzontale A4. */
export async function exportElementToPdf(el: HTMLElement | null, filename: string, title?: string) {
  if (!el) return
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    windowWidth: el.scrollWidth,
  })
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margin = 24
  const top = title ? margin + 22 : margin

  if (title) {
    pdf.setFontSize(14)
    pdf.text(title, margin, margin + 12)
  }

  const availW = pw - margin * 2
  const availH = ph - top - margin
  const ratio = canvas.height / canvas.width
  let w = availW
  let h = w * ratio
  if (h > availH) {
    h = availH
    w = h / ratio
  }
  pdf.addImage(img, 'PNG', (pw - w) / 2, top, w, h)
  pdf.save(filename)
}
