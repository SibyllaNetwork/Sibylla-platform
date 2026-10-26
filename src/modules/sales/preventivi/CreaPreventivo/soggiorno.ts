// ─── Preventivo soggiorno: catalogo, calcoli e mail HTML ──────────────────────
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RoomIllustration from '../../../impostazioni/InventarioCamere/RoomIllustration'
import type { PreventivoSoggiorno, PropostaSoggiorno } from '../../../../store/usePreventiviSoggiornoStore'

export const TIPOLOGIE: { nome: string; tipo: string; capacita: number; prezzo: number }[] = [
  { nome: 'Singola Classic', tipo: 'Singola', capacita: 1, prezzo: 89 },
  { nome: 'DUS', tipo: 'DUS', capacita: 1, prezzo: 109 },
  { nome: 'Doppia Classic', tipo: 'Doppia', capacita: 2, prezzo: 129 },
  { nome: 'Twin Classic', tipo: 'Twin', capacita: 2, prezzo: 129 },
  { nome: 'Matrimoniale Deluxe', tipo: 'Matrimoniale', capacita: 2, prezzo: 169 },
  { nome: 'Camera accessibile', tipo: 'Accessibile', capacita: 2, prezzo: 129 },
  { nome: 'Tripla Classic', tipo: 'Tripla', capacita: 3, prezzo: 159 },
  { nome: 'Tripla con letto aggiunto', tipo: 'Tripla', capacita: 4, prezzo: 175 },
  { nome: 'Quadrupla', tipo: 'Quadrupla', capacita: 4, prezzo: 189 },
  { nome: 'Family', tipo: 'Family', capacita: 5, prezzo: 199 },
  { nome: 'Suite', tipo: 'Suite', capacita: 4, prezzo: 289 },
]
export const tipologia = (nome: string) => TIPOLOGIE.find((t) => t.nome === nome) ?? TIPOLOGIE[2]

/** Trattamenti con supplemento a persona per notte. */
export const TRATTAMENTI: { nome: string; supplemento: number }[] = [
  { nome: 'Solo pernottamento', supplemento: 0 },
  { nome: 'Pernottamento e colazione', supplemento: 12 },
  { nome: 'Mezza pensione', supplemento: 35 },
  { nome: 'Pensione completa', supplemento: 55 },
]

export const SERVIZI: [string, string][] = [
  ['Wi-Fi', 'fa-wifi'], ['Parcheggio', 'fa-square-parking'], ['Accesso spa', 'fa-spa'],
  ['Transfer aeroporto', 'fa-van-shuttle'], ['Late check-out', 'fa-clock'], ['Welcome drink', 'fa-champagne-glasses'],
  ['Culla', 'fa-baby'], ['Animali ammessi', 'fa-paw'], ['Palestra', 'fa-dumbbell'],
]

export const STRUTTURE = ['Sibylla Grand Hotel', 'Sibylla Resort & Spa', 'Sibylla Country House', 'Sibylla Boutique']

export const VALIDITA = ['3', '7', '15', '30']

export const LETTERE = 'ABCDEFGHIJ'

export const eur = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const giorno = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
export const periodo = (p: PropostaSoggiorno) => `${giorno(p.checkin)} → ${giorno(p.checkout)}`

export const notti = (p: PropostaSoggiorno) => {
  const a = new Date(p.checkin + 'T00:00:00').getTime()
  const b = new Date(p.checkout + 'T00:00:00').getTime()
  return isNaN(a) || isNaN(b) ? 0 : Math.max(0, Math.round((b - a) / 86400000))
}

export const ospitiLabel = (p: PropostaSoggiorno) =>
  `${p.adulti} ${p.adulti === 1 ? 'adulto' : 'adulti'}` + (p.bambini ? ` · ${p.bambini} ${p.bambini === 1 ? 'bambino' : 'bambini'}` : '')

export interface Conto {
  notti: number
  camere: number
  trattamento: number
  sconto: number
  soggiorno: number
  tassa: number
  totale: number
  postiLetto: number
}

export function conto(p: PropostaSoggiorno): Conto {
  const n = notti(p)
  const camere = p.camere.reduce((s, c) => s + c.quantita * c.prezzoNotte * n, 0)
  const sup = TRATTAMENTI.find((t) => t.nome === p.trattamento)?.supplemento ?? 0
  const trattamento = sup * (p.adulti + p.bambini) * n
  const sconto = (camere + trattamento) * (p.scontoPct / 100)
  const soggiorno = camere + trattamento - sconto
  const tassabili = p.adulti + (p.tassaEsentiMinori ? 0 : p.bambini)
  const tassa = tassabili * Math.min(n, p.tassaMaxNotti) * p.tassaImporto
  const postiLetto = p.camere.reduce((s, c) => s + c.quantita * tipologia(c.tipologia).capacita, 0)
  return { notti: n, camere, trattamento, sconto, soggiorno, tassa, totale: soggiorno + tassa, postiLetto }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// L'illustrazione della camera principale, come immagine (le mail non accettano SVG inline).
function illustrazione(nome: string) {
  const t = tipologia(nome)
  const svg = renderToStaticMarkup(React.createElement(RoomIllustration, { tipo: t.tipo }))
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/**
 * Mail del preventivo (HTML da client di posta: tabelle e stili in linea).
 * `stampa`: senza pulsanti di accettazione. Ogni pulsante porta
 * `data-accetta` con l'id della proposta: l'anteprima intercetta il click.
 */
export function mailHtml(pr: PreventivoSoggiorno, opts: { stampa?: boolean } = {}) {
  const C = { primary: '#204769', ink: '#1E293B', mute: '#64748B', line: '#E2E8F0', bg: '#F1F5F9', soft: '#EEF3F8', ok: '#1F8A5B', okSoft: '#E8F5EE' }
  const scelta = pr.accettata
  const multi = pr.proposte.length > 1

  const card = (p: PropostaSoggiorno, i: number) => {
    const k = conto(p)
    const lettera = LETTERE[i]
    const isScelta = scelta === p.id
    const spenta = !!scelta && !isScelta
    const righeCamere = p.camere.map((c) =>
      `<tr><td style="padding:3px 0;color:${C.ink};font-size:14px">${c.quantita} × ${esc(c.tipologia)}</td>
       <td style="padding:3px 0;color:${C.mute};font-size:13px;text-align:right">${eur(c.prezzoNotte)} / notte</td></tr>`).join('')
    const servizi = p.servizi.map((s) =>
      `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:999px;background:${C.soft};color:${C.primary};font-size:12px;font-weight:600">✓ ${esc(s)}</span>`).join('')
    const voce = (l: string, v: string, extra = '') =>
      `<tr><td style="padding:4px 0;color:${C.mute};font-size:13px">${l}</td><td style="padding:4px 0;text-align:right;color:${C.ink};font-size:13px;${extra}">${v}</td></tr>`
    const cta = opts.stampa || scelta ? '' :
      `<a href="#accetta-${p.id}" data-accetta="${p.id}" style="display:block;margin-top:16px;padding:13px 18px;border-radius:10px;background:${C.primary};color:#fff;text-align:center;text-decoration:none;font-weight:700;font-size:15px">Accetta ${multi ? `la proposta ${lettera}` : 'la proposta'}</a>`
    const ribbon = isScelta
      ? `<div style="margin-bottom:12px;padding:8px 12px;border-radius:8px;background:${C.okSoft};color:${C.ok};font-weight:700;font-size:13px">✓ Proposta accettata${pr.rispostaIl ? ` il ${esc(pr.rispostaIl)}` : ''}</div>` : ''
    return `
    <tr><td style="padding:0 0 18px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:${isScelta ? 2 : 1}px solid ${isScelta ? C.ok : C.line};border-radius:14px;background:#fff;${spenta ? 'opacity:.55;' : ''}">
        <tr><td style="padding:0"><img src="${illustrazione(p.camere[0]?.tipologia ?? '')}" alt="" width="100%" height="190" style="display:block;width:100%;height:190px;object-fit:cover;object-position:center 70%;border-radius:13px 13px 0 0"></td></tr>
        <tr><td style="padding:18px 22px 20px">
          ${ribbon}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td style="vertical-align:top">
              ${multi ? `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:${C.mute}">PROPOSTA ${lettera}</div>` : ''}
              <div style="font-size:19px;font-weight:700;color:${C.primary};margin-top:2px">${esc(p.titolo || `Soluzione ${lettera}`)}</div>
              <div style="font-size:13px;color:${C.mute};margin-top:4px">${periodo(p)} · ${k.notti} ${k.notti === 1 ? 'notte' : 'notti'} · ${ospitiLabel(p)}</div>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap">
              <div style="font-size:11px;color:${C.mute}">Totale</div>
              <div style="font-size:24px;font-weight:800;color:${C.ink}">${eur(k.totale)}</div>
            </td>
          </tr></table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border-top:1px solid ${C.line};padding-top:10px">${righeCamere}</table>
          <div style="margin-top:10px;font-size:13px;color:${C.ink}"><strong>Trattamento:</strong> ${esc(p.trattamento)}</div>
          ${servizi ? `<div style="margin-top:10px"><div style="font-size:12px;color:${C.mute};margin-bottom:6px">Servizi inclusi</div>${servizi}</div>` : ''}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;border-top:1px solid ${C.line}">
            ${voce('Camere', eur(k.camere))}
            ${k.trattamento ? voce(`Supplemento ${esc(p.trattamento.toLowerCase())}`, eur(k.trattamento)) : ''}
            ${k.sconto ? voce(`Sconto ${p.scontoPct}%`, '− ' + eur(k.sconto), `color:${C.ok}`) : ''}
            ${voce('Tassa di soggiorno', eur(k.tassa))}
            <tr><td colspan="2" style="padding:2px 0 0;color:${C.mute};font-size:11px">${eur(p.tassaImporto)} a persona per notte, max ${p.tassaMaxNotti} notti${p.tassaEsentiMinori ? ', minori esenti' : ''}</td></tr>
            <tr><td style="padding:10px 0 0;font-weight:700;color:${C.ink};font-size:15px;border-top:1px solid ${C.line}">Totale</td>
                <td style="padding:10px 0 0;text-align:right;font-weight:800;color:${C.primary};font-size:17px;border-top:1px solid ${C.line}">${eur(k.totale)}</td></tr>
          </table>
          ${cta}
        </td></tr>
      </table>
    </td></tr>`
  }

  const intro = esc(pr.messaggio || '').replace(/\n/g, '<br>')
  const grazie = scelta && !opts.stampa
    ? `<tr><td style="padding:0 0 18px"><div style="padding:16px 18px;border-radius:12px;background:${C.okSoft};color:${C.ok};font-size:14px"><strong>Grazie!</strong> Hai scelto la proposta ${LETTERE[pr.proposte.findIndex((p) => p.id === scelta)] ?? ''}. ${esc(pr.struttura)} ti contatterà a breve per confermare la prenotazione.</div></td></tr>` : ''

  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preventivo ${esc(pr.codice)} · ${esc(pr.struttura)}</title>
<style>@media print{body{background:#fff!important}}</style></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Poppins,'Segoe UI',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px">
  <tr><td style="padding:26px 28px;border-radius:16px 16px 0 0;background:${C.primary};color:#fff">
    <div style="font-size:12px;letter-spacing:.08em;opacity:.8">PREVENTIVO ${esc(pr.codice)}</div>
    <div style="font-size:24px;font-weight:700;margin-top:4px">${esc(pr.struttura)}</div>
    <div style="font-size:14px;opacity:.85;margin-top:6px">${multi ? `${pr.proposte.length} soluzioni pensate per te` : 'La soluzione pensata per te'}</div>
  </td></tr>
  <tr><td style="padding:24px 28px 8px;background:#fff">
    <div style="font-size:16px;color:${C.ink};font-weight:600">Gentile ${esc(pr.cliente || 'cliente')},</div>
    ${intro ? `<div style="font-size:14px;color:${C.ink};line-height:1.6;margin-top:8px">${intro}</div>` : ''}
  </td></tr>
  <tr><td style="padding:16px 28px 4px;background:#fff">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${grazie}${pr.proposte.map(card).join('')}</table>
  </td></tr>
  <tr><td style="padding:16px 28px 26px;border-radius:0 0 16px 16px;background:#fff;border-top:1px solid ${C.line};color:${C.mute};font-size:12px;line-height:1.6">
    Offerta valida ${esc(pr.validita)} giorni dalla data di invio, salvo disponibilità al momento della conferma.<br>
    La tassa di soggiorno è dovuta per legge e si paga in struttura.<br>
    ${esc(pr.struttura)}
  </td></tr>
</table></td></tr></table></body></html>`
}
