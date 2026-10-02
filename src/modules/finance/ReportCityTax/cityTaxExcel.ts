// ─── Excel City Tax (condiviso) ───────────────────────────────────────────────
// Struttura del file Excel della tassa di soggiorno, per-ospite, generato sia
// dalla pagina Report City Tax sia da Ospiti in casa. Colonne (draft di
// riferimento): Struttura · Camera · Ospite · Check-in · Check-out · RN (n° notti)
// · Canale · Totale · Stato · Motivazione.

// Categoria struttura e tariffa €/persona/notte (sola lettura, da Pannello di
// controllo: ★★★ = 6,00 €, ★★★★ = 7,50 €, per tutte le regioni italiane).
import { pmsAttivo } from '../../operation/_data/pmsDemo'

export const CITY_TAX_CATEGORIA = 3
export const CITY_TAX_TARIFFA = 6.0

export type CityTaxStato = 'pagato' | 'esente' | 'non-pagato'

export const CITY_TAX_STATO_LABEL: Record<CityTaxStato, string> = {
  'pagato': 'Pagato',
  'esente': 'Esente',
  'non-pagato': 'Non pagato',
}

// Principali tipologie di esenzione (mostrate nel pop-up al check-out).
export const CITY_TAX_ESENZIONI = [
  'Residente nel Comune',
  'Day use',
  'Minore',
  'Disabile e accompagnatore',
  'Non specificato',
] as const

export interface CityTaxStay {
  id: string
  struttura: string
  camera: string
  ospite: string
  checkIn: string      // dd/mm/yyyy
  checkOut: string     // dd/mm/yyyy
  canale: string       // agenzia/canale di provenienza (Booking, G2, Travco…)
  stato?: CityTaxStato // default 'pagato'
  motivazione?: string
}

const parseIt = (s: string): Date | null => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null
}

// RN = numero totale di notti soggiornate (check-out − check-in).
export const cityTaxNotti = (checkIn: string, checkOut: string): number => {
  const a = parseIt(checkIn)
  const b = parseIt(checkOut)
  if (!a || !b) return 0
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000))
}

// Totale = notti × tariffa (l'esente non paga).
export const cityTaxTotale = (stay: CityTaxStay, tariffa = CITY_TAX_TARIFFA): number => {
  if ((stay.stato ?? 'pagato') === 'esente') return 0
  return cityTaxNotti(stay.checkIn, stay.checkOut) * tariffa
}

export const CITY_TAX_HEADERS = [
  'Struttura', 'Camera', 'Ospite', 'Check-in', 'Check-out', 'RN', 'Canale', 'Totale €', 'Stato', 'Motivazione',
] as const

// Dataset di esempio (mock) usato per l'export dal Report City Tax.
const MOCK_BASE: CityTaxStay[] = [
  { id: 's1',  struttura: 'Hotel Siracusa', camera: '101', ospite: 'Calabretti Vladimir', checkIn: '24/04/2026', checkOut: '01/05/2026', canale: 'Booking',  stato: 'pagato' },
  { id: 's2',  struttura: 'Hotel Siracusa', camera: '102', ospite: 'Bianchi Marco',        checkIn: '23/04/2026', checkOut: '02/05/2026', canale: 'G2',       stato: 'esente', motivazione: 'Residente nel Comune' },
  { id: 's3',  struttura: 'Hotel Siracusa', camera: '103', ospite: 'Rossi Giulia',         checkIn: '25/04/2026', checkOut: '28/04/2026', canale: 'Travco',   stato: 'non-pagato', motivazione: 'Rifiuto del pagamento' },
  { id: 's4',  struttura: 'Hotel Luce',     camera: '201', ospite: 'Romano Federico',      checkIn: '23/04/2026', checkOut: '30/04/2026', canale: 'Sibylla',  stato: 'pagato' },
  { id: 's5',  struttura: 'Hotel Luce',     camera: '202', ospite: 'De Luca Sara',         checkIn: '26/04/2026', checkOut: '01/05/2026', canale: 'Booking',  stato: 'esente', motivazione: 'Day use' },
  { id: 's6',  struttura: 'Hotel Ortigia',  camera: '305', ospite: 'Ferri Stefano',        checkIn: '24/04/2026', checkOut: '01/05/2026', canale: 'Expedia',  stato: 'pagato' },
  { id: 's7',  struttura: 'Hotel Ortigia',  camera: '306', ospite: 'Costa Marta',          checkIn: '25/04/2026', checkOut: '02/05/2026', canale: 'G2',       stato: 'pagato' },
  { id: 's8',  struttura: 'Resort Plemmirio', camera: 'B12', ospite: 'Greco Alessandro',   checkIn: '25/04/2026', checkOut: '30/04/2026', canale: 'Travco',   stato: 'non-pagato', motivazione: 'Rifiuto del pagamento' },
  { id: 's9',  struttura: 'B&B Aretusa',    camera: '3',   ospite: 'Novi Ruggero',         checkIn: '23/04/2026', checkOut: '30/04/2026', canale: 'Sibylla',  stato: 'pagato' },
  { id: 's10', struttura: 'B&B Aretusa',    camera: '5',   ospite: 'Conti Martina',        checkIn: '24/04/2026', checkOut: '01/05/2026', canale: 'Booking',  stato: 'esente', motivazione: 'Minore' },
]

// Date d'esempio (fine aprile 2026) spostate così che oggi corrisponda al 28/04.
const RIFERIMENTO = new Date(2026, 3, 28)
const spostaIt = (it: string) => {
  const [g, m, a] = it.split('/').map(Number)
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const d = new Date(a, m - 1, g + Math.round((oggi.getTime() - RIFERIMENTO.getTime()) / 86400000))
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
export const MOCK_CITY_TAX_STAYS: CityTaxStay[] = MOCK_BASE.map((x) => ({ ...x, checkIn: spostaIt(x.checkIn), checkOut: spostaIt(x.checkOut) }))

const isoIt = (iso: string) => iso.split('-').reverse().join('/')
const ESENZIONI_DEMO: Array<[CityTaxStato, string | undefined]> = [
  ['pagato', undefined], ['pagato', undefined], ['pagato', undefined], ['pagato', undefined],
  ['esente', 'Minore'], ['pagato', undefined], ['non-pagato', 'Rifiuto del pagamento'], ['pagato', undefined],
  ['esente', 'Residente nel Comune'], ['pagato', undefined],
]

/** Ospiti della struttura selezionata (gestionale demo) con soggiorno nell'ultima settimana. */
function staysDemo(): CityTaxStay[] {
  const pms = pmsAttivo()
  const oggi = new Date()
  const da = new Date(oggi); da.setDate(da.getDate() - 7)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const daIso = iso(da), aIso = iso(oggi)
  return pms.prenotazioni
    .filter((p) => p.stato !== 'noshow' && p.checkIn <= aIso && p.checkOut > daIso && p.checkin !== 'da-fare')
    .flatMap((p) => p.ospiti.map((o) => ({ p, o })))
    .map(({ p, o }, i) => {
      const [stato, motivazione] = o.fascia !== 'Adulto' ? ['esente', 'Minore'] as [CityTaxStato, string] : ESENZIONI_DEMO[i % ESENZIONI_DEMO.length]
      return {
        id: `ct-${p.id}-${i}`, struttura: pms.nome, camera: p.camera, ospite: o.nome,
        checkIn: isoIt(p.checkIn), checkOut: isoIt(p.checkOut), canale: p.canale, stato, motivazione,
      }
    })
}

export function downloadCityTaxExcel(stays: CityTaxStay[], opts?: { tariffa?: number; label?: string; fileName?: string }): void {
  const tariffa = opts?.tariffa ?? CITY_TAX_TARIFFA
  const label = opts?.label ?? 'Report City Tax'
  // Con il dataset d'esempio si esportano gli ospiti veri della struttura selezionata.
  if (stays === MOCK_CITY_TAX_STAYS) {
    const demo = staysDemo()
    if (demo.length) stays = demo
  }

  const body = stays.map((s) => {
    const stato: CityTaxStato = s.stato ?? 'pagato'
    return [
      s.struttura, s.camera, s.ospite, s.checkIn, s.checkOut,
      cityTaxNotti(s.checkIn, s.checkOut), s.canale,
      cityTaxTotale(s, tariffa).toFixed(2), CITY_TAX_STATO_LABEL[stato], s.motivazione ?? '',
    ]
  })
  const totale = stays.reduce((a, s) => a + cityTaxTotale(s, tariffa), 0)
  const rows = [
    [label],
    [`Categoria ${CITY_TAX_CATEGORIA}★ · Tariffa ${tariffa.toFixed(2)} € per persona a notte`],
    [...CITY_TAX_HEADERS],
    ...body,
    ['TOTALE', '', '', '', '', '', '', totale.toFixed(2), '', ''],
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts?.fileName ?? 'report-city-tax.csv'
  a.click()
  URL.revokeObjectURL(url)
}
