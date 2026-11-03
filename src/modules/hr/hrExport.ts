import { toast } from '../../core/components/Toast/useToast'

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Esporta righe in un file .xls (tabella HTML apribile da Excel), come le altre pagine della piattaforma. */
export function exportXls(fileName: string, cols: string[], rows: (string | number)[][]) {
  const head = cols.map(c => `<th>${esc(c)}</th>`).join('')
  const body = rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')
  const html = `<html><head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast.success(`${rows.length} righe esportate in Excel.`, 'Esportazione completata')
}
