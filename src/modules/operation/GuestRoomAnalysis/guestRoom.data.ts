// ─── GUEST & ROOM ANALYSIS — dati di lavoro ─────────────────────────────────────
//  Chi sono gli ospiti e come usano le camere nel periodo trascorso: camere
//  occupate e ospiti in casa giorno per giorno, permanenza media, ospiti
//  ripetenti, provenienze, tipologie di camera più vendute, composizione dei
//  soggiorni e quanto rendono upgrade e servizi extra.
//
//  Camere, ricavi e anno precedente dalle primitive condivise di
//  `sales/_data/revenueMock` (stessi numeri di Occupancy e ADR analysis); sopra ci
//  sono le grandezze dell'ospite, deterministiche: stessi filtri → stessi numeri.
import {
  aggiornatoAl, buildGiorni, camereDisponibili, jitter, mixTipologie, STAGIONALITA,
  STRUTTURE, type GiornoBase, type VoceTipologia,
} from '../../sales/_data/revenueMock'

export type PeriodoId = 'mese' | '30' | '90' | 'anno'
export const PERIODI: { id: PeriodoId; label: string }[] = [
  { id: 'mese', label: 'Mese in corso' },
  { id: '30', label: 'Ultimi 30 giorni' },
  { id: '90', label: 'Ultimi 90 giorni' },
  { id: 'anno', label: 'Da inizio anno' },
]

export interface GiornoOspiti extends GiornoBase {
  /** Ospiti in casa la notte (presenze del giorno). */
  ospiti: number
  ospitiLY: number
  /** Ospiti arrivati nel giorno. */
  arrivi: number
  arriviLY: number
  /** Camere occupate l'anno precedente. */
  camereLY: number
}

export interface VoceQuota { label: string; valore: number; quota: number; quotaLY: number; iso?: string }

export interface VoceExtra {
  label: string
  /** Ricavo del servizio nel periodo. */
  ricavo: number
  /** Soggiorni che l'hanno acquistato (%). */
  adesione: number
}

export interface GuestRoomData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  periodo: PeriodoId
  camereDisponibili: number
  giorni: GiornoOspiti[]
  provenienze: VoceQuota[]
  tipologie: VoceTipologia[]
  composizione: VoceQuota[]
  extra: VoceExtra[]
  upgrade: { venduti: number; concessi: number; ricavo: number }
  /** Quota di ospiti ripetenti (%), anno corrente e precedente. */
  ripetenti: number
  ripetentiLY: number
  /** Quota di bambini sugli ospiti (%). */
  bambini: number
  aggiornatoAl: Date
}

/** Inizio del periodo, fino a oggi compreso. */
export function inizioPeriodo(p: PeriodoId, oggi = new Date()) {
  if (p === 'mese') return new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  if (p === 'anno') return new Date(oggi.getFullYear(), 0, 1)
  return new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - (Number(p) - 1))
}

// Provenienze tipiche di un hotel italiano: quota TY e scostamento rispetto all'LY.
const PROVENIENZE: [string, string, number, number][] = [
  ['Italia', 'it', 0.47, 0.5], ['Germania', 'de', 0.11, 0.1], ['Stati Uniti', 'us', 0.08, 0.065],
  ['Regno Unito', 'gb', 0.07, 0.072], ['Francia', 'fr', 0.06, 0.058], ['Svizzera', 'ch', 0.045, 0.043],
  ['Paesi Bassi', 'nl', 0.03, 0.028],
]

// Servizi extra: adesione dei soggiorni e prezzo medio per soggiorno che lo acquista.
const EXTRA: [string, number, number][] = [
  ['Mezza pensione', 0.18, 62], ['Spa e benessere', 0.11, 48], ['Parcheggio', 0.24, 18],
  ['Late check-out', 0.09, 30], ['Transfer', 0.05, 55],
]

export function buildGuestRoom(strutturaId: number | null, periodo: PeriodoId, oggi = new Date()): GuestRoomData {
  const seedS = (strutturaId ?? 0) % 97
  const giorni: GiornoOspiti[] = buildGiorni(inizioPeriodo(periodo, oggi), oggi, strutturaId, oggi).map((d, i) => {
    const mese = d.data.getMonth()
    // Ospiti per camera: più alti nel weekend e d'estate (famiglie), più bassi in bassa stagione (business).
    const ppc = 1.62 + STAGIONALITA[mese] * 0.34 + (d.weekend ? 0.14 : 0) + jitter(d.g * 13 + mese + seedS, 0.06)
    // Permanenza media: più lunga d'estate, corta in città nei mesi business.
    const alos = 1.75 + STAGIONALITA[mese] * 1.55
    const camereLY = Math.round(d.ricaviLY / Math.max(1, d.adrLY))
    const ospiti = Math.round(d.camere * ppc)
    const ospitiLY = Math.round(camereLY * (ppc - 0.04))
    return {
      ...d,
      ospiti,
      ospitiLY,
      arrivi: Math.round((ospiti / alos) * (1 + jitter(i * 7 + seedS, 0.12))),
      arriviLY: Math.round((ospitiLY / (alos - 0.08)) * (1 + jitter(i * 11 + seedS, 0.12))),
      camereLY,
    }
  })

  const arrivi = giorni.reduce((s, d) => s + d.arrivi, 0)
  const soggiorni = Math.max(1, Math.round(arrivi / 1.9))
  const ricavi = giorni.reduce((s, d) => s + d.ricavi, 0)
  const camere = giorni.reduce((s, d) => s + d.camere, 0)
  const notti = giorni.length * camereDisponibili(strutturaId)
  const occMedia = notti ? (camere / notti) * 100 : 0
  const adrMedio = camere ? ricavi / camere : 0
  const estate = giorni.length ? giorni.reduce((s, d) => s + STAGIONALITA[d.data.getMonth()], 0) / giorni.length : 0.6

  // Provenienze: le prime sette e "Altri paesi" che chiude al 100%.
  const prov = PROVENIENZE.map(([label, iso, q, qLY], i) => {
    const quota = Math.max(0.01, q + jitter(seedS * 5 + i, 0.012))
    return { label, iso, quota, quotaLY: qLY }
  })
  const resto = Math.max(0.02, 1 - prov.reduce((s, x) => s + x.quota, 0))
  const restoLY = Math.max(0.02, 1 - prov.reduce((s, x) => s + x.quotaLY, 0))
  const provenienze: VoceQuota[] = [...prov, { label: 'Altri paesi', iso: undefined, quota: resto, quotaLY: restoLY }]
    .map((x) => ({ label: x.label, iso: x.iso, valore: Math.round(arrivi * x.quota), quota: +(x.quota * 100).toFixed(1), quotaLY: +(x.quotaLY * 100).toFixed(1) }))

  // Composizione dei soggiorni: d'estate pesano di più famiglie e amici, in bassa stagione il business.
  const fam = 0.12 + estate * 0.16
  const bus = 0.26 - estate * 0.14
  const comp: [string, number, number][] = [
    ['Coppie', 0.42, 0.41], ['Famiglie', fam, fam - 0.015], ['Business', bus, bus + 0.02],
    ['Amici', 0.09 + estate * 0.03, 0.09], ['Gruppi', 0.07, 0.075],
  ]
  const totComp = comp.reduce((s, x) => s + x[1], 0)
  const totCompLY = comp.reduce((s, x) => s + x[2], 0)
  const composizione: VoceQuota[] = comp.map(([label, q, qLY]) => ({
    label, valore: Math.round(soggiorni * q / totComp), quota: +((q / totComp) * 100).toFixed(1), quotaLY: +((qLY / totCompLY) * 100).toFixed(1),
  }))

  const extra: VoceExtra[] = EXTRA.map(([label, adesione, prezzo], i) => {
    const a = Math.max(0.01, adesione * (label === 'Mezza pensione' || label === 'Spa e benessere' ? 0.7 + estate * 0.5 : 1) + jitter(seedS + i * 3, 0.015))
    return { label, adesione: +(a * 100).toFixed(1), ricavo: Math.round(soggiorni * a * prezzo) }
  }).sort((a, b) => b.ricavo - a.ricavo)

  const venduti = Math.round(soggiorni * 0.045)
  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    periodo,
    camereDisponibili: camereDisponibili(strutturaId),
    giorni,
    provenienze,
    tipologie: mixTipologie(strutturaId, occMedia, adrMedio, ricavi),
    composizione,
    extra,
    upgrade: { venduti, concessi: Math.round(soggiorni * 0.028), ricavo: Math.round(venduti * adrMedio * 0.22 * 1.9) },
    ripetenti: +(17.5 + jitter(seedS + 41, 2.5) + (1 - estate) * 6).toFixed(1),
    ripetentiLY: +(15.8 + (1 - estate) * 6).toFixed(1),
    bambini: +(5 + estate * 9).toFixed(1),
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface GuestRoomKpi {
  arrivi: number
  deltaArrivi: number
  presenze: number
  deltaPresenze: number
  alos: number
  deltaAlos: number
  ospitiPerCamera: number
  /** Ricavo camere + extra per ospite arrivato. */
  revGuest: number
  deltaRevGuest: number
  ricavoExtra: number
  camereOccupate: number
  sparkArrivi: number[]
  sparkPresenze: number[]
  sparkAlos: number[]
  sparkRevGuest: number[]
}

export function computeGuestRoomKpi(d: GuestRoomData): GuestRoomKpi {
  const g = d.giorni
  const somma = (f: (x: GiornoOspiti) => number) => g.reduce((s, x) => s + f(x), 0)
  const arrivi = somma((x) => x.arrivi)
  const arriviLY = somma((x) => x.arriviLY)
  const presenze = somma((x) => x.ospiti)
  const presenzeLY = somma((x) => x.ospitiLY)
  const camere = somma((x) => x.camere)
  const ricavi = somma((x) => x.ricavi)
  const ricaviLY = somma((x) => x.ricaviLY)
  const ricavoExtra = d.extra.reduce((s, x) => s + x.ricavo, 0) + d.upgrade.ricavo
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)
  const alos = arrivi ? presenze / arrivi : 0
  const alosLY = arriviLY ? presenzeLY / arriviLY : 0
  const revGuest = arrivi ? (ricavi + ricavoExtra) / arrivi : 0
  const revGuestLY = arriviLY ? (ricaviLY + ricavoExtra * 0.93) / arriviLY : 0
  // Sparkline per settimana: con 300 giorni una per giorno sarebbe rumore.
  const sett: GiornoOspiti[][] = []
  g.forEach((x, i) => { (sett[Math.floor(i / 7)] ??= []).push(x) })
  const s = (f: (xs: GiornoOspiti[]) => number) => sett.map(f)
  return {
    arrivi, deltaArrivi: pct(arrivi, arriviLY),
    presenze, deltaPresenze: pct(presenze, presenzeLY),
    alos, deltaAlos: pct(alos, alosLY),
    ospitiPerCamera: camere ? presenze / camere : 0,
    revGuest, deltaRevGuest: pct(revGuest, revGuestLY),
    ricavoExtra,
    camereOccupate: camere,
    sparkArrivi: s((xs) => xs.reduce((t, x) => t + x.arrivi, 0)),
    sparkPresenze: s((xs) => xs.reduce((t, x) => t + x.ospiti, 0)),
    sparkAlos: s((xs) => { const a = xs.reduce((t, x) => t + x.arrivi, 0); return a ? xs.reduce((t, x) => t + x.ospiti, 0) / a : 0 }),
    sparkRevGuest: s((xs) => { const a = xs.reduce((t, x) => t + x.arrivi, 0); return a ? xs.reduce((t, x) => t + x.ricavi, 0) / a : 0 }),
  }
}
