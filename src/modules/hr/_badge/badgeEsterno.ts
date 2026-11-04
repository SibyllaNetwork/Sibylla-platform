import QRCode from 'qrcode'
import type { Fornitore } from '../../../admin/SibyllaAdminPanel/catalogo/types'
import type { BadgeConfigHr, CategoriaEsterniHr } from '../../../store/useHrConfigStore'
import type { CollaboratoreEsterno } from '../../../store/useCollaboratoriEsterniStore'

// ─── BADGE DI RICONOSCIMENTO DEL COLLABORATORE ESTERNO ───────────────────────
//  Tessera degli addetti delle imprese in appalto (art. 26 c. 8 D.Lgs. 81/2008,
//  art. 5 L. 136/2010): fotografia, generalità, impresa datrice di lavoro, data
//  di assunzione e, in subappalto, l'autorizzazione. UNA sola sorgente HTML per
//  l'anteprima (iframe) e per la stampa (finestra dedicata): è un documento a
//  sé, quindi gli stili vivono nel suo <style> (dimensioni in mm, formato CR80).

export interface BadgeDati {
  collaboratore: CollaboratoreEsterno
  azienda?: Fornitore
  categoria?: CategoriaEsterniHr
  /** Nome del committente (struttura) se l'intestazione del badge è vuota. */
  struttura: string
}

const esc = (v?: string | number | null) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')

/** Colore della palette --chart-N risolto dal tema corrente (il documento del badge non ha le variabili). */
function coloreBanda(n: number) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--chart-${n}`).trim()
  return v || '#204769'
}

/** Payload del QR: identifica il badge per la verifica al varco / in reception. */
export const payloadQr = (c: CollaboratoreEsterno) => `SIBYLLA-EST|${c.numeroBadge ?? c.id}|${c.cognome} ${c.nome}|${c.autorizzatoAl}`

export async function qrDataUrl(c: CollaboratoreEsterno): Promise<string> {
  try { return await QRCode.toDataURL(payloadQr(c), { margin: 0, width: 220 }) } catch { return '' }
}

const iniziali = (c: CollaboratoreEsterno) => `${c.nome[0] ?? ''}${c.cognome[0] ?? ''}`.toUpperCase()

function fronte(d: BadgeDati, cfg: BadgeConfigHr, qr: string) {
  const { collaboratore: c, azienda: a, categoria } = d
  const da = a?.datiAppalto
  const righe: [string, string][] = [
    ['Impresa', da?.ragioneSociale || a?.nome || '—'],
    ...(cfg.mostraPartitaIva && da?.partitaIva ? [['P. IVA', da.partitaIva] as [string, string]] : []),
    ...(cfg.mostraNascita ? [['Nato/a il', fmt(c.dataNascita)] as [string, string]] : []),
    ['Assunto/a il', fmt(c.dataAssunzione)],
    ...(cfg.mostraCategoria && categoria ? [['Mansione', categoria.nome] as [string, string]] : []),
    ...(cfg.mostraValidita ? [['Valido', `${fmt(c.autorizzatoDal)} – ${fmt(c.autorizzatoAl)}`] as [string, string]] : []),
  ]
  return `
  <div class="card front">
    <div class="band"><span class="cmt">${esc(cfg.intestazione || d.struttura)}</span><span class="kind">Collaboratore esterno</span></div>
    <div class="main">
      <div class="photo">${c.foto ? `<img src="${esc(c.foto)}" alt="">` : `<span>${esc(iniziali(c))}</span>`}</div>
      <div class="info">
        <div class="name">${esc(c.cognome)} ${esc(c.nome)}</div>
        <dl>${righe.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      </div>
      ${cfg.mostraQr && qr ? `<div class="qr"><img src="${qr}" alt=""><span>${esc(c.numeroBadge ?? '')}</span></div>` : ''}
    </div>
    ${da?.subappalto && da.subappaltoAutorizzazione ? `<div class="sub">Subappalto · ${esc(da.subappaltoAutorizzazione)}</div>` : ''}
    <div class="foot">${esc(cfg.dicitura)}${!cfg.mostraQr ? ` · N. ${esc(c.numeroBadge ?? '')}` : ''}</div>
  </div>`
}

function retro(d: BadgeDati, cfg: BadgeConfigHr) {
  const da = d.azienda?.datiAppalto
  return `
  <div class="card back">
    <div class="band thin"><span class="cmt">${esc(cfg.intestazione || d.struttura)}</span><span class="kind">N. ${esc(d.collaboratore.numeroBadge ?? '')}</span></div>
    <p class="txt">${esc(cfg.testoRetro)}</p>
    <dl class="contacts">
      <dt>Impresa</dt><dd>${esc(da?.ragioneSociale || d.azienda?.nome || '—')}${da?.sedeLegale ? ` · ${esc(da.sedeLegale)}` : ''}</dd>
      ${da?.contrattoNumero ? `<dt>Contratto</dt><dd>${esc(da.contrattoNumero)}${da.contrattoData ? ` del ${fmt(da.contrattoData)}` : ''}</dd>` : ''}
      ${da?.referente ? `<dt>Referente</dt><dd>${esc(da.referente)}${da.referenteTelefono ? ` · ${esc(da.referenteTelefono)}` : ''}</dd>` : ''}
    </dl>
    <div class="sign"><span>Firma del titolare</span></div>
  </div>`
}

function stile(cfg: BadgeConfigHr, modo: 'anteprima' | 'stampa') {
  const v = cfg.orientamento === 'verticale'
  const w = v ? 54 : 85.6
  const h = v ? 85.6 : 54
  const band = coloreBanda(cfg.colore)
  const pagina = modo === 'anteprima'
    ? 'body{margin:0;padding:6mm;display:flex;flex-direction:column;gap:6mm;background:transparent}.card{box-shadow:0 1px 3px rgba(15,23,42,.12)}'
    : cfg.formatoStampa === 'cr80'
      ? `@page{size:${w}mm ${h}mm;margin:0}body{margin:0}.card{page-break-after:always;border:0!important;border-radius:0!important}`
      : '@page{size:A4;margin:10mm}body{margin:0;display:flex;flex-wrap:wrap;gap:4mm;align-content:flex-start}.card{break-inside:avoid}'
  return `
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Open Sans',Arial,sans-serif;color:#1E293B}
  ${pagina}
  .card{width:${w}mm;height:${h}mm;border:0.3mm solid #CBD5E1;border-radius:3mm;overflow:hidden;display:flex;flex-direction:column;background:#fff}
  .band{background:${band};color:#fff;display:flex;justify-content:space-between;align-items:center;gap:2mm;padding:1.6mm 3mm;font-size:2.3mm;font-weight:700}
  .band.thin{padding:1.2mm 3mm}
  .band .cmt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .band .kind{text-transform:uppercase;letter-spacing:.2mm;font-size:1.9mm;white-space:nowrap}
  .main{flex:1;display:flex;gap:2.5mm;padding:2.5mm 3mm 1mm;min-height:0;${v ? 'flex-direction:column;align-items:center;text-align:center' : ''}}
  .photo{flex:none;width:${v ? 24 : 22}mm;height:${v ? 30 : 28}mm;border-radius:1.5mm;background:#E2E8F0;overflow:hidden;display:flex;align-items:center;justify-content:center}
  .photo img{width:100%;height:100%;object-fit:cover}
  .photo span{font-size:7mm;font-weight:700;color:#64748B}
  .info{flex:1;min-width:0}
  .name{font-size:3.9mm;font-weight:700;line-height:1.15;margin-bottom:1.2mm}
  dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.4mm 1.5mm;font-size:2.3mm;line-height:1.3;${v ? 'text-align:left' : ''}}
  dt{color:#64748B}
  dd{margin:0;font-weight:600;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .qr{flex:none;display:flex;flex-direction:column;align-items:center;gap:.6mm;${v ? 'margin-top:auto' : ''}}
  .qr img{width:${v ? 15 : 14}mm;height:${v ? 15 : 14}mm}
  .qr span{font-size:1.8mm;font-weight:700}
  .sub{padding:0 3mm;font-size:1.7mm;color:#B45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .foot{padding:1mm 3mm 1.6mm;font-size:1.6mm;color:#64748B;border-top:0.2mm solid #E2E8F0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .back .txt{margin:2.5mm 3mm 1.5mm;font-size:2.2mm;line-height:1.4}
  .back .contacts{margin:0 3mm}
  .sign{margin:auto 3mm 2.5mm;border-top:0.2mm solid #94A3B8;padding-top:.6mm;font-size:1.6mm;color:#64748B}
  `
}

/** Documento HTML del badge (fronte ed eventuale retro). */
export function badgeHtml(items: { dati: BadgeDati; qr: string }[], cfg: BadgeConfigHr, modo: 'anteprima' | 'stampa') {
  const cards = items.map(({ dati, qr }) => fronte(dati, cfg, qr) + (cfg.retro ? retro(dati, cfg) : '')).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Badge collaboratori esterni</title><style>${stile(cfg, modo)}</style></head><body>${cards}</body></html>`
}

/** Apre la finestra di stampa con i badge indicati. */
export async function stampaBadge(dati: BadgeDati[], cfg: BadgeConfigHr) {
  const w = window.open('', '_blank')
  if (!w) throw new Error('Il browser ha bloccato la finestra di stampa: consenti i pop-up per questo sito.')
  const items = await Promise.all(dati.map(async (d) => ({ dati: d, qr: cfg.mostraQr ? await qrDataUrl(d.collaboratore) : '' })))
  w.document.write(badgeHtml(items, cfg, 'stampa'))
  w.document.close()
  // Attende il caricamento delle immagini (foto, QR) prima di stampare
  setTimeout(() => { try { w.focus(); w.print() } catch { /* finestra chiusa */ } }, 400)
}
