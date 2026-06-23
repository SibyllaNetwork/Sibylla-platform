// Export della Griglia disponibilità: XLS (HTML che Excel apre nativamente) e
// PDF (cattura della tabella via html2canvas + jsPDF). Nessun dato sul server:
// i file vengono generati e scaricati lato client.
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Esporta una tabella (header + righe) in un file .xls apribile in Excel. */
export function exportTableToXls(
  filename: string,
  header: string[],
  rows: (string | number)[][],
  title?: string,
) {
  const thead = `<tr>${header.map((h) => `<th style="background:#eef2f6;border:1px solid #cbd5e1;padding:4px 8px;font-weight:700">${esc(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td style="border:1px solid #cbd5e1;padding:4px 8px">${esc(c)}</td>`).join('')}</tr>`,
    )
    .join('')
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"></head><body>` +
    (title ? `<h3>${esc(title)}</h3>` : '') +
    `<table>${thead}${tbody}</table></body></html>`
  triggerDownload(new Blob([html], { type: 'application/vnd.ms-excel' }), filename)
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
