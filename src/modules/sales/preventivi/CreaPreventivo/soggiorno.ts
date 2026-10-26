// ─── Preventivo soggiorno: catalogo, calcoli e mail HTML ──────────────────────
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RoomIllustration from '../../../impostazioni/InventarioCamere/RoomIllustration'
import type {
  CameraProposta, PreventivoSoggiorno, PropostaSoggiorno, ServizioExtra, UnitaExtra,
} from '../../../../store/usePreventiviSoggiornoStore'

export const TIPOLOGIE: { nome: string; tipo: string; capacita: number; prezzo: number; descrizione: string }[] = [
  { nome: 'Singola Classic', tipo: 'Singola', capacita: 1, prezzo: 89, descrizione: 'Letto singolo, scrivania e bagno privato con doccia: essenziale e silenziosa.' },
  { nome: 'DUS', tipo: 'DUS', capacita: 1, prezzo: 109, descrizione: 'Camera doppia a uso singola: letto matrimoniale e tutto lo spazio per te.' },
  { nome: 'Doppia Classic', tipo: 'Doppia', capacita: 2, prezzo: 129, descrizione: 'Letto matrimoniale, spaziosa e accogliente: perfetta per le coppie.' },
  { nome: 'Twin Classic', tipo: 'Twin', capacita: 2, prezzo: 129, descrizione: 'Due letti singoli separati, ideale per amici o colleghi.' },
  { nome: 'Matrimoniale Deluxe', tipo: 'Matrimoniale', capacita: 2, prezzo: 169, descrizione: 'Letto king size, area relax e set di cortesia premium.' },
  { nome: 'Camera accessibile', tipo: 'Accessibile', capacita: 2, prezzo: 129, descrizione: 'Spazi di manovra, maniglioni di sostegno e bagno senza barriere.' },
  { nome: 'Tripla Classic', tipo: 'Tripla', capacita: 3, prezzo: 159, descrizione: 'Letto matrimoniale più un singolo, ideale per tre ospiti.' },
  { nome: 'Tripla con letto aggiunto', tipo: 'Tripla', capacita: 4, prezzo: 175, descrizione: 'Tre posti letto più una brandina: per gruppi e famiglie numerose.' },
  { nome: 'Quadrupla', tipo: 'Quadrupla', capacita: 4, prezzo: 189, descrizione: 'Due letti matrimoniali, fino a quattro ospiti.' },
  { nome: 'Family', tipo: 'Family', capacita: 5, prezzo: 199, descrizione: 'Matrimoniale e letto a castello: spaziosa e versatile per le famiglie.' },
  { nome: 'Suite', tipo: 'Suite', capacita: 4, prezzo: 289, descrizione: 'Camera da letto e soggiorno separati, vista panoramica e servizio dedicato.' },
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

export const UNITA: Record<UnitaExtra, string> = {
  soggiorno: 'a soggiorno', persona: 'a persona', notte: 'a notte', 'persona-notte': 'a persona per notte',
}

/** Servizi aggiuntivi a pagamento proposti di frequente. */
export const EXTRA_CATALOGO: Omit<ServizioExtra, 'id'>[] = [
  { nome: 'Transfer aeroporto (a/r)', prezzo: 60, unita: 'soggiorno' },
  { nome: 'Parcheggio custodito', prezzo: 15, unita: 'notte' },
  { nome: 'Percorso spa', prezzo: 45, unita: 'persona' },
  { nome: 'Massaggio rilassante 50 min', prezzo: 70, unita: 'persona' },
  { nome: 'Cena romantica', prezzo: 90, unita: 'soggiorno' },
  { nome: 'Colazione in camera', prezzo: 10, unita: 'persona-notte' },
  { nome: 'Late check-out (ore 16)', prezzo: 35, unita: 'soggiorno' },
  { nome: 'Escursione guidata', prezzo: 40, unita: 'persona' },
  { nome: 'Bottiglia di prosecco in camera', prezzo: 28, unita: 'soggiorno' },
  { nome: 'Noleggio biciclette', prezzo: 18, unita: 'persona' },
]

export const STRUTTURE = ['Sibylla Grand Hotel', 'Sibylla Resort & Spa', 'Sibylla Country House', 'Sibylla Boutique']

export const VALIDITA = ['3', '7', '15', '30']

export const LETTERE = 'ABCDEFGHIJ'

export const eur = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const data = (iso: string) => new Date(iso + 'T00:00:00')
const giorno = (iso: string) => {
  const d = data(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
export const giornoBreve = (iso: string) => data(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
export const periodo = (p: PropostaSoggiorno) => `${giorno(p.checkin)} → ${giorno(p.checkout)}`

export const notti = (p: PropostaSoggiorno) => {
  const a = data(p.checkin).getTime()
  const b = data(p.checkout).getTime()
  return isNaN(a) || isNaN(b) ? 0 : Math.max(0, Math.round((b - a) / 86400000))
}

/** Le notti del soggiorno, come date ISO (la sera di ciascuna). */
export function nottiDate(p: PropostaSoggiorno): string[] {
  const out: string[] = []
  const d = data(p.checkin)
  for (let i = 0; i < notti(p); i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}

export const tariffa = (c: CameraProposta, iso: string) => c.tariffe?.[iso] ?? c.prezzoNotte

/** Somma delle tariffe di una camera su tutte le notti. */
export const costoCamera = (c: CameraProposta, date: string[]) => date.reduce((s, d) => s + tariffa(c, d), 0)

export const ospitiLabel = (p: PropostaSoggiorno) =>
  `${p.adulti} ${p.adulti === 1 ? 'adulto' : 'adulti'}` + (p.bambini ? ` · ${p.bambini} ${p.bambini === 1 ? 'bambino' : 'bambini'}` : '')

export function costoExtra(e: ServizioExtra, p: PropostaSoggiorno) {
  const persone = p.adulti + p.bambini
  const n = notti(p)
  return e.prezzo * (e.unita === 'persona' ? persone : e.unita === 'notte' ? n : e.unita === 'persona-notte' ? persone * n : 1)
}

export interface Conto {
  notti: number
  camere: number
  trattamento: number
  sconto: number
  soggiorno: number
  tassa: number
  totale: number
  /** Servizi aggiuntivi scelti dal cliente. */
  extra: number
  totaleConExtra: number
  postiLetto: number
}

export function conto(p: PropostaSoggiorno, extraScelti: string[] = []): Conto {
  const date = nottiDate(p)
  const n = date.length
  const camere = p.camere.reduce((s, c) => s + c.quantita * costoCamera(c, date), 0)
  const sup = TRATTAMENTI.find((t) => t.nome === p.trattamento)?.supplemento ?? 0
  const trattamento = sup * (p.adulti + p.bambini) * n
  const sconto = (camere + trattamento) * (p.scontoPct / 100)
  const soggiorno = camere + trattamento - sconto
  const tassabili = p.adulti + (p.tassaEsentiMinori ? 0 : p.bambini)
  const tassa = tassabili * Math.min(n, p.tassaMaxNotti) * p.tassaImporto
  const extra = (p.extra ?? []).filter((e) => extraScelti.includes(e.id)).reduce((s, e) => s + costoExtra(e, p), 0)
  const postiLetto = p.camere.reduce((s, c) => s + c.quantita * tipologia(c.tipologia).capacita, 0)
  const totale = soggiorno + tassa
  return { notti: n, camere, trattamento, sconto, soggiorno, tassa, totale, extra, totaleConExtra: totale + extra, postiLetto }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Illustrazione della tipologia come immagine (le mail non accettano SVG inline). */
export function illustrazione(nome: string) {
  const t = tipologia(nome)
  const svg = renderToStaticMarkup(React.createElement(RoomIllustration, { tipo: t.tipo }))
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
export const fotoCamera = (c: CameraProposta) => c.immagine || illustrazione(c.tipologia)

/** Foto ridimensionata e compressa (JPEG ~800px): resta leggera nello store e nella mail. */
export function comprimiFoto(file: File, lato = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = reject
    r.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const k = Math.min(1, lato / Math.max(img.width, img.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k)
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
        resolve(cv.toDataURL('image/jpeg', 0.78))
      }
      img.src = r.result as string
    }
    r.readAsDataURL(file)
  })
}

/**
 * Mail del preventivo (HTML da client di posta: tabelle e stili in linea).
 * `stampa`: senza pulsanti di accettazione. Ogni pulsante porta
 * `data-accetta` con l'id della proposta: l'anteprima intercetta il click.
 */
export function mailHtml(pr: PreventivoSoggiorno, opts: { stampa?: boolean } = {}) {
  const C = { primary: '#204769', ink: '#1E293B', mute: '#64748B', line: '#E2E8F0', bg: '#F1F5F9', soft: '#EEF3F8', ok: '#1F8A5B', okSoft: '#E8F5EE', gold: '#9A6B12', goldSoft: '#FBF4E6' }
  const scelta = pr.accettata
  const multi = pr.proposte.length > 1
  const extraScelti = pr.extraScelti ?? []

  const card = (p: PropostaSoggiorno, i: number) => {
    const isScelta = scelta === p.id
    const k = conto(p, isScelta ? extraScelti : [])
    const date = nottiDate(p)
    const lettera = LETTERE[i]
    const spenta = !!scelta && !isScelta

    // Camera: foto a sinistra; descrizione e tariffe giorno per giorno a destra.
    const camera = (c: CameraProposta) => {
      const bordo = (j: number) => (j ? `border-top:1px solid ${C.line};` : '')
      const giorni = date.length > 1 ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border:1px solid ${C.line};border-radius:8px">
          ${date.map((d, j) => `<tr><td style="padding:4px 8px;font-size:12px;color:${C.mute};${bordo(j)}">${giornoBreve(d)}</td>
            <td style="padding:4px 8px;font-size:12px;color:${C.ink};text-align:right;${bordo(j)}">${eur(tariffa(c, d))}</td></tr>`).join('')}
        </table>` : ''
      return `<tr><td style="padding:12px 0;border-top:1px solid ${C.line}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
          <td width="190" style="vertical-align:top;padding-right:16px">
            <img src="${fotoCamera(c)}" alt="${esc(c.tipologia)}" width="190" height="130" style="display:block;width:190px;height:130px;object-fit:cover;border-radius:10px;border:1px solid ${C.line}">
          </td>
          <td style="vertical-align:top">
            <div style="font-size:15px;font-weight:700;color:${C.ink}">${c.quantita} × ${esc(c.tipologia)}</div>
            ${c.descrizione ? `<div style="font-size:13px;color:${C.mute};line-height:1.5;margin-top:4px">${esc(c.descrizione)}</div>` : ''}
            <div style="font-size:13px;color:${C.ink};margin-top:6px"><strong>${eur(costoCamera(c, date) * c.quantita)}</strong>
              <span style="color:${C.mute}"> per ${date.length} ${date.length === 1 ? 'notte' : 'notti'}${c.quantita > 1 ? `, ${c.quantita} camere` : ''}</span></div>
            ${giorni}
          </td>
        </tr></table>
      </td></tr>`
    }

    const servizi = p.servizi.map((s) =>
      `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:999px;background:${C.soft};color:${C.primary};font-size:12px;font-weight:600">✓ ${esc(s)}</span>`).join('')
    const extra = (p.extra ?? []).map((e) => {
      const preso = isScelta && extraScelti.includes(e.id)
      return `<tr><td style="padding:5px 0;font-size:13px;color:${C.ink}">${preso ? '✓ ' : '+ '}${esc(e.nome)} <span style="color:${C.mute}">· ${eur(e.prezzo)} ${UNITA[e.unita]}</span></td>
        <td style="padding:5px 0;font-size:13px;text-align:right;color:${preso ? C.ok : C.ink};font-weight:${preso ? 700 : 400}">${eur(costoExtra(e, p))}</td></tr>`
    }).join('')
    const voce = (l: string, v: string, css = '') =>
      `<tr><td style="padding:4px 0;color:${C.mute};font-size:13px">${l}</td><td style="padding:4px 0;text-align:right;color:${C.ink};font-size:13px;${css}">${v}</td></tr>`
    const cta = opts.stampa || scelta ? '' :
      `<a href="#accetta-${p.id}" data-accetta="${p.id}" style="display:block;margin-top:16px;padding:13px 18px;border-radius:10px;background:${C.primary};color:#fff;text-align:center;text-decoration:none;font-weight:700;font-size:15px">Accetta ${multi ? `la proposta ${lettera}` : 'la proposta'}</a>`
    const ribbon = isScelta
      ? `<div style="margin-bottom:12px;padding:8px 12px;border-radius:8px;background:${C.okSoft};color:${C.ok};font-weight:700;font-size:13px">✓ Proposta accettata${pr.rispostaIl ? ` il ${esc(pr.rispostaIl)}` : ''}</div>` : ''
    return `
    <tr><td style="padding:0 0 18px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:${isScelta ? 2 : 1}px solid ${isScelta ? C.ok : C.line};border-radius:14px;background:#fff;${spenta ? 'opacity:.55;' : ''}">
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
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px">${p.camere.map(camera).join('')}</table>
          <div style="padding-top:12px;border-top:1px solid ${C.line};font-size:13px;color:${C.ink}"><strong>Trattamento:</strong> ${esc(p.trattamento)}</div>
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
          ${extra ? `
          <div style="margin-top:14px;padding:12px 14px;border-radius:10px;background:${C.goldSoft}">
            <div style="font-size:13px;font-weight:700;color:${C.gold}">Servizi aggiuntivi a pagamento</div>
            <div style="font-size:12px;color:${C.mute};margin:2px 0 6px">${isScelta ? 'Quelli con ✓ sono stati aggiunti alla prenotazione' : 'Facoltativi: puoi aggiungerli uno per uno quando accetti la proposta'}</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${extra}</table>
          </div>` : ''}
          ${isScelta && k.extra ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px">
            <tr><td style="font-weight:700;color:${C.ink};font-size:15px">Totale con i servizi aggiuntivi</td>
                <td style="text-align:right;font-weight:800;color:${C.ok};font-size:17px">${eur(k.totaleConExtra)}</td></tr></table>` : ''}
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
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px">
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
