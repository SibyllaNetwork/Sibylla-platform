// ─── Preventivo soggiorno: catalogo, calcoli e mail HTML ──────────────────────
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RoomIllustration from '../../../impostazioni/InventarioCamere/RoomIllustration'
import type {
  CameraProposta, PreventivoSoggiorno, PropostaSoggiorno, ServizioExtra, UnitaExtra,
} from '../../../../store/usePreventiviSoggiornoStore'
import { FONT, TEMPLATE_DEFAULT, type BloccoId, type TemplateSoggiorno } from './templateSoggiorno'

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

/** Mescola un colore hex col bianco (peso = quota del colore). */
function tinta(hex: string, peso: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * peso + 255 * (1 - peso)))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

/** Testo del template con i segnaposto sostituiti (già escapato, a capo → <br>). */
export function testoTemplate(s: string, pr: PreventivoSoggiorno, extra: Record<string, string> = {}) {
  const n = pr.proposte.length
  const v: Record<string, string> = {
    cliente: pr.cliente || 'cliente', struttura: pr.struttura, codice: pr.codice, validita: pr.validita,
    soluzioni: n === 1 ? '1 soluzione' : `${n} soluzioni`, ...extra,
  }
  return esc(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? esc(v[k]) : m)).replace(/\n/g, '<br>')
}

/**
 * Mail del preventivo (HTML da client di posta: tabelle e stili in linea),
 * impaginata secondo il template: ordine e visibilità dei blocchi, posizione
 * delle foto, font, colori, dimensioni, bordi e angoli.
 * `stampa`: senza pulsanti di accettazione. Ogni pulsante porta
 * `data-accetta` con l'id della proposta: l'anteprima intercetta il click.
 */
export function mailHtml(pr: PreventivoSoggiorno, opts: { stampa?: boolean; template?: TemplateSoggiorno } = {}) {
  const T = opts.template ?? TEMPLATE_DEFAULT
  const { colori: C, font: F, forme: S, proposte: L } = T
  const OK = '#1F8A5B'
  const OK_SOFT = '#E8F5EE'
  const fTit = FONT[F.titoli].stack
  const fTxt = FONT[F.testo].stack
  const tx = F.dimTesto
  const pad = S.spaziatura
  const bordo = S.bordo > 0 ? `${S.bordo}px ${S.stileBordo} ${C.bordo}` : 'none'
  const ombra = S.ombra ? 'box-shadow:0 8px 28px rgba(15,23,42,.10);' : ''
  const etichetta = F.etichetteMaiuscole ? 'text-transform:uppercase;letter-spacing:.08em;' : ''
  const titoloCss = `font-family:${fTit};font-weight:${F.pesoTitoli};`
  const accentoSoft = tinta(C.accento, 0.1)
  const primarioSoft = tinta(C.primario, 0.08)
  const scelta = pr.accettata
  const multi = pr.proposte.length > 1
  const extraScelti = pr.extraScelti ?? []
  const griglia = L.disposizione === 'griglia' && multi
  const t = (s: string, extra?: Record<string, string>) => testoTemplate(s, pr, extra)

  const foto = (src: string, alt: string, w: number | '100%', h: number) =>
    `<img src="${src}" alt="${esc(alt)}" width="${w === '100%' ? '' : w}" height="${h}" style="display:block;width:${w === '100%' ? '100%' : w + 'px'};height:${h}px;object-fit:cover;border-radius:${S.raggioFoto}px;border:0">`

  const card = (p: PropostaSoggiorno, i: number) => {
    const isScelta = scelta === p.id
    const k = conto(p, isScelta ? extraScelti : [])
    const date = nottiDate(p)
    const lettera = LETTERE[i]
    const spenta = !!scelta && !isScelta
    const fotoPos = griglia && L.fotoCamera !== 'nascosta' ? 'sopra' : L.fotoCamera
    const giorniOn = L.dettaglioGiorni && !griglia && date.length > 1

    const camera = (c: CameraProposta, j: number) => {
      const riga = (n: number) => (n ? `border-top:1px solid ${C.bordo};` : '')
      const giorni = giorniOn ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border:1px solid ${C.bordo};border-radius:${Math.min(S.raggioCard, 8)}px">
          ${date.map((d, n) => `<tr><td style="padding:4px 8px;font-size:${tx - 1}px;color:${C.tenue};${riga(n)}">${giornoBreve(d)}</td>
            <td style="padding:4px 8px;font-size:${tx - 1}px;color:${C.testo};text-align:right;${riga(n)}">${eur(tariffa(c, d))}</td></tr>`).join('')}
        </table>` : ''
      const numeri = L.mostraNumeriCamera && c.numeri.length
        ? `<div style="font-size:${tx - 1}px;color:${C.tenue};margin-top:2px">${c.numeri.length === 1 ? 'Camera' : 'Camere'} ${c.numeri.map(esc).join(', ')}</div>` : ''
      const info = `
        <div style="${titoloCss}font-size:${tx + 2}px;color:${C.testo}">${c.quantita} × ${esc(c.tipologia)}</div>
        ${numeri}
        ${c.descrizione && !griglia ? `<div style="font-size:${tx}px;color:${C.tenue};line-height:${F.interlinea};margin-top:4px">${esc(c.descrizione)}</div>` : ''}
        <div style="font-size:${tx}px;color:${C.testo};margin-top:6px"><strong>${eur(costoCamera(c, date) * c.quantita)}</strong>
          <span style="color:${C.tenue}"> per ${date.length} ${date.length === 1 ? 'notte' : 'notti'}${c.quantita > 1 ? `, ${c.quantita} camere` : ''}</span></div>
        ${giorni}`
      const sep = j ? `border-top:1px solid ${C.bordo};` : ''
      if (fotoPos === 'nascosta') return `<tr><td style="padding:12px 0;${sep}">${info}</td></tr>`
      if (fotoPos === 'sopra') {
        return `<tr><td style="padding:12px 0;${sep}">${foto(fotoCamera(c), c.tipologia, '100%', griglia ? 130 : 200)}<div style="height:10px;line-height:10px">&nbsp;</div>${info}</td></tr>`
      }
      const img = `<td width="170" style="vertical-align:top;${fotoPos === 'sinistra' ? 'padding-right:16px' : 'padding-left:16px'}">${foto(fotoCamera(c), c.tipologia, 170, 120)}</td>`
      const txt = `<td style="vertical-align:top">${info}</td>`
      return `<tr><td style="padding:12px 0;${sep}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${fotoPos === 'sinistra' ? img + txt : txt + img}</tr></table>
      </td></tr>`
    }

    const servizi = L.mostraServizi ? p.servizi.map((s) =>
      `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:999px;background:${primarioSoft};color:${C.primario};font-size:${tx - 1}px;font-weight:600">✓ ${esc(s)}</span>`).join('') : ''
    const extra = (p.extra ?? []).map((e) => {
      const preso = isScelta && extraScelti.includes(e.id)
      return `<tr><td style="padding:5px 0;font-size:${tx}px;color:${C.testo}">${preso ? '✓ ' : '+ '}${esc(e.nome)} <span style="color:${C.tenue}">· ${eur(e.prezzo)} ${UNITA[e.unita]}</span></td>
        <td style="padding:5px 0;font-size:${tx}px;text-align:right;color:${preso ? OK : C.testo};font-weight:${preso ? 700 : 400}">${eur(costoExtra(e, p))}</td></tr>`
    }).join('')
    const voce = (l: string, v: string, css = '') =>
      `<tr><td style="padding:4px 0;color:${C.tenue};font-size:${tx}px">${l}</td><td style="padding:4px 0;text-align:right;color:${C.testo};font-size:${tx}px;${css}">${v}</td></tr>`
    const cta = opts.stampa || scelta ? '' :
      `<a href="#accetta-${p.id}" data-accetta="${p.id}" style="display:block;margin-top:16px;padding:13px 18px;border-radius:${S.raggioPulsante}px;background:${C.pulsante};color:${C.testoPulsante};text-align:center;text-decoration:none;font-weight:700;font-size:${tx + 2}px;font-family:${fTxt}">${t(T.testi.pulsante, { lettera: multi ? lettera : '' }).trim()}</a>`
    const ribbon = isScelta
      ? `<div style="margin-bottom:12px;padding:8px 12px;border-radius:8px;background:${OK_SOFT};color:${OK};font-weight:700;font-size:${tx}px">✓ Proposta accettata${pr.rispostaIl ? ` il ${esc(pr.rispostaIl)}` : ''}</div>` : ''
    const prezzi = L.prezzi === 'completo' ? `
            ${voce('Camere', eur(k.camere))}
            ${k.trattamento ? voce(`Supplemento ${esc(p.trattamento.toLowerCase())}`, eur(k.trattamento)) : ''}
            ${k.sconto ? voce(`Sconto ${p.scontoPct}%`, '− ' + eur(k.sconto), `color:${OK}`) : ''}
            ${voce('Tassa di soggiorno', eur(k.tassa))}
            <tr><td colspan="2" style="padding:2px 0 0;color:${C.tenue};font-size:${tx - 2}px">${eur(p.tassaImporto)} a persona per notte, max ${p.tassaMaxNotti} notti${p.tassaEsentiMinori ? ', minori esenti' : ''}</td></tr>` : ''
    const totaleTop = griglia ? '' : `
            <td style="vertical-align:top;text-align:right;white-space:nowrap">
              <div style="font-size:${tx - 2}px;color:${C.tenue}">Totale</div>
              <div style="${titoloCss}font-size:${tx + 11}px;color:${C.testo}">${eur(k.totale)}</div>
            </td>`
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:${isScelta ? `2px solid ${OK}` : bordo};border-radius:${S.raggioCard}px;background:${C.superficie};${ombra}${spenta ? 'opacity:.55;' : ''}">
        <tr><td style="padding:${griglia ? 14 : 18}px ${griglia ? 16 : 22}px ${griglia ? 16 : 20}px">
          ${ribbon}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
            <td style="vertical-align:top">
              ${multi ? `<div style="font-size:${tx - 2}px;font-weight:700;${etichetta}color:${C.accento}">Proposta ${lettera}</div>` : ''}
              <div style="${titoloCss}font-size:${tx + 6}px;color:${C.primario};margin-top:2px">${esc(p.titolo || `Soluzione ${lettera}`)}</div>
              <div style="font-size:${tx}px;color:${C.tenue};margin-top:4px">${periodo(p)} · ${k.notti} ${k.notti === 1 ? 'notte' : 'notti'} · ${ospitiLabel(p)}</div>
            </td>${totaleTop}
          </tr></table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px">${p.camere.map(camera).join('')}</table>
          <div style="padding-top:12px;border-top:1px solid ${C.bordo};font-size:${tx}px;color:${C.testo}"><strong>Trattamento:</strong> ${esc(p.trattamento)}</div>
          ${servizi ? `<div style="margin-top:10px"><div style="font-size:${tx - 1}px;color:${C.tenue};margin-bottom:6px">Servizi inclusi</div>${servizi}</div>` : ''}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;border-top:1px solid ${C.bordo}">
            ${prezzi}
            <tr><td style="padding:10px 0 0;font-weight:700;color:${C.testo};font-size:${tx + 2}px;${L.prezzi === 'completo' ? `border-top:1px solid ${C.bordo}` : ''}">Totale</td>
                <td style="padding:10px 0 0;text-align:right;${titoloCss}color:${C.primario};font-size:${tx + 4}px;${L.prezzi === 'completo' ? `border-top:1px solid ${C.bordo}` : ''}">${eur(k.totale)}</td></tr>
            ${L.prezzi === 'totale' ? `<tr><td colspan="2" style="padding:2px 0 0;color:${C.tenue};font-size:${tx - 2}px">Tassa di soggiorno inclusa (${eur(k.tassa)})</td></tr>` : ''}
          </table>
          ${extra ? `
          <div style="margin-top:14px;padding:12px 14px;border-radius:${Math.min(S.raggioCard, 12)}px;background:${accentoSoft}">
            <div style="font-size:${tx}px;font-weight:700;color:${C.accento}">Servizi aggiuntivi a pagamento</div>
            <div style="font-size:${tx - 1}px;color:${C.tenue};margin:2px 0 6px">${isScelta ? 'Quelli con ✓ sono stati aggiunti alla prenotazione' : 'Facoltativi: puoi aggiungerli uno per uno quando accetti la proposta'}</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${extra}</table>
          </div>` : ''}
          ${isScelta && k.extra ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px">
            <tr><td style="font-weight:700;color:${C.testo};font-size:${tx + 2}px">Totale con i servizi aggiuntivi</td>
                <td style="text-align:right;font-weight:800;color:${OK};font-size:${tx + 4}px">${eur(k.totaleConExtra)}</td></tr></table>` : ''}
          ${cta}
        </td></tr>
      </table>`
  }

  const grazie = scelta && !opts.stampa
    ? `<div style="margin-bottom:18px;padding:16px 18px;border-radius:${Math.min(S.raggioCard, 12)}px;background:${OK_SOFT};color:${OK};font-size:${tx + 1}px"><strong>Grazie!</strong> Hai scelto la proposta ${LETTERE[pr.proposte.findIndex((p) => p.id === scelta)] ?? ''}. ${esc(pr.struttura)} ti contatterà a breve per confermare la prenotazione.</div>` : ''

  const elencoProposte = griglia
    ? `<table role="presentation" class="sib-col" width="100%" cellspacing="0" cellpadding="0">${Array.from({ length: Math.ceil(pr.proposte.length / 2) }, (_, r) => {
      const cella = (i: number) => (pr.proposte[i]
        ? `<td width="50%" style="vertical-align:top;padding:0 ${i % 2 ? 0 : 8}px 16px ${i % 2 ? 8 : 0}px">${card(pr.proposte[i], i)}</td>`
        : '<td width="50%"></td>')
      return `<tr>${cella(r * 2)}${cella(r * 2 + 1)}</tr>`
    }).join('')}</table>`
    : pr.proposte.map((p, i) => `<div style="margin-bottom:18px">${card(p, i)}</div>`).join('')

  const H = T.intestazione
  const pieno = H.stile === 'pieno'
  const colTit = pieno ? C.testoIntestazione : H.stile === 'linea' ? C.testo : C.primario
  const blocco: Record<BloccoId, () => string> = {
    intestazione: () => `<tr><td style="padding:${pad}px ${pad}px ${pieno ? pad : pad - 8}px;text-align:${H.allineamento};background:${pieno ? C.primario : C.superficie};${H.stile === 'linea' ? `border-bottom:2px solid ${C.testo};` : ''}">
      ${H.logo ? `<img src="${H.logo}" alt="${esc(pr.struttura)}" height="48" style="display:inline-block;height:48px;max-width:220px;object-fit:contain;margin-bottom:12px;border:0">` : ''}
      ${H.mostraCodice && T.testi.etichetta ? `<div style="font-size:${tx - 1}px;${etichetta}color:${pieno ? C.testoIntestazione : C.accento};opacity:${pieno ? 0.8 : 1}">${t(T.testi.etichetta)}</div>` : ''}
      <div style="${titoloCss}font-size:${F.dimTitolo}px;line-height:1.2;color:${colTit};margin-top:4px">${t(T.testi.titolo)}</div>
      ${T.testi.sottotitolo ? `<div style="font-size:${F.dimSottotitolo}px;color:${pieno ? C.testoIntestazione : C.tenue};opacity:${pieno ? 0.85 : 1};margin-top:6px">${t(T.testi.sottotitolo)}</div>` : ''}
      ${H.stile === 'chiaro' ? `<div style="margin:14px ${H.allineamento === 'left' ? '0' : 'auto'} 0 ${H.allineamento === 'right' ? 'auto' : H.allineamento === 'left' ? '0' : 'auto'};width:56px;height:2px;background:${C.accento};line-height:2px;font-size:0">&nbsp;</div>` : ''}
    </td></tr>`,
    copertina: () => (T.copertina.immagine
      ? `<tr><td style="padding:0;line-height:0;font-size:0"><img src="${T.copertina.immagine}" alt="" width="${S.larghezza}" height="${T.copertina.altezza}" style="display:block;width:100%;height:${T.copertina.altezza}px;object-fit:cover;border:0"></td></tr>` : ''),
    lettera: () => {
      const intro = t(pr.messaggio || '')
      return `<tr><td style="padding:${pad - 4}px ${pad}px 8px">
        ${T.testi.saluto ? `<div style="${titoloCss}font-size:${tx + 3}px;color:${C.testo}">${t(T.testi.saluto)}</div>` : ''}
        ${intro ? `<div style="font-size:${tx + 1}px;color:${C.testo};line-height:${F.interlinea};margin-top:8px">${intro}</div>` : ''}
      </td></tr>`
    },
    proposte: () => `<tr><td style="padding:16px ${pad}px 4px">${grazie}${elencoProposte}</td></tr>`,
    condizioni: () => (T.testi.condizioni
      ? `<tr><td style="padding:12px ${pad}px;color:${C.tenue};font-size:${tx - 1}px;line-height:${F.interlinea};border-top:1px solid ${C.bordo}">${t(T.testi.condizioni)}</td></tr>` : ''),
    firma: () => `<tr><td style="padding:14px ${pad}px ${pad}px;color:${C.testo};font-size:${tx}px;line-height:${F.interlinea}">
      ${T.testi.chiusura ? `<div>${t(T.testi.chiusura)}</div>` : ''}
      ${T.testi.firma ? `<div style="${titoloCss}margin-top:8px;color:${C.primario}">${t(T.testi.firma)}</div>` : ''}
      ${T.testi.contatti ? `<div style="margin-top:6px;color:${C.tenue};font-size:${tx - 1}px">${t(T.testi.contatti)}</div>` : ''}
    </td></tr>`,
  }

  const google = Array.from(new Set([FONT[F.titoli].google, FONT[F.testo].google].filter(Boolean)))
  const fontLink = google.length
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${google.map((g) => `family=${g}`).join('&')}&display=swap">` : ''

  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Preventivo ${esc(pr.codice)} · ${esc(pr.struttura)}</title>${fontLink}
<style>@media print{body{background:#fff!important}}@media (max-width:560px){.sib-col td{display:block!important;width:100%!important;padding:0 0 16px!important}}</style></head>
<body style="margin:0;padding:0;background:${C.sfondo};font-family:${fTxt};color:${C.testo}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.sfondo}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${S.larghezza}px;background:${C.superficie};border:${bordo};border-radius:${S.raggioContenitore}px;overflow:hidden;border-collapse:separate;${ombra}">
  ${T.blocchi.filter((b) => b.visibile).map((b) => blocco[b.id]()).join('')}
</table></td></tr></table></body></html>`
}
