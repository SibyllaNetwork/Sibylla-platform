// ─── Excel City Tax (condiviso) ───────────────────────────────────────────────
// Struttura del file Excel della tassa di soggiorno, per-ospite, generato sia
// dalla pagina Report City Tax sia da Ospiti in casa. Colonne (draft di
// riferimento): Struttura · Camera · Ospite · Check-in · Check-out · RN (n° notti)
// · Canale · Totale · Stato · Motivazione.

// Categoria struttura e tariffa €/persona/notte (sola lettura, da Pannello di
// controllo: ★★★ = 6,00 €, ★★★★ = 7,50 €, per tutte le regioni italiane).
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
export const MOCK_CITY_TAX_STAYS: CityTaxStay[] = [
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

export function downloadCityTaxExcel(stays: CityTaxStay[], opts?: { tariffa?: number; label?: string; fileName?: string }): void {
  const tariffa = opts?.tariffa ?? CITY_TAX_TARIFFA
  const label = opts?.label ?? 'Report City Tax'

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
