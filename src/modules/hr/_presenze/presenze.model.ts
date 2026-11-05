// ─── REGISTRO PRESENZE — modello condiviso dalle due viste ─────────────────────
//  La giornata di un dipendente è una lista di segmenti (presente, pausa,
//  permesso, ferie, assenza). Le timbrature di entrata e uscita si ricavano dai
//  segmenti di presenza; quando l'ufficio del personale le corregge a mano, sono
//  le timbrature a comandare e la presenza si ricalcola da loro.
//  Vista giornaliera (timeline 24h) e vista dettagliata (mese per dipendente)
//  leggono le stesse funzioni: una modifica si vede in entrambe.

export type SegmentoTipo = 'presente' | 'assenza' | 'permesso' | 'ferie' | 'pausa'

export interface SegmentoPresenza {
  tipo: SegmentoTipo
  start_min: number
  end_min: number
  note?: string
}

export type VersoTimbratura = 'entrata' | 'uscita'

export interface Timbratura {
  id: string
  min: number
  verso: VersoTimbratura
  postazione: string
  note?: string
}

export const GIORNO_MIN = 24 * 60

export const hhmmToMin = (s: string): number => { const [h, m] = s.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export const minToHHMM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDi = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const dataDa = (iso: string) => { const [y, m, g] = iso.split('-').map(Number); return new Date(y, m - 1, g) }
export const chiaveGiorno = (dipId: number, iso: string) => `${dipId}|${iso}`

/** Piccolo scarto deterministico in minuti: le timbrature vere non cadono mai al minuto tondo. */
const scarto = (seed: number, ampiezza: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return Math.round((x - Math.floor(x)) * ampiezza * 2 - ampiezza)
}

// Inserisce un permesso (ROL) nella giornata: la presenza resta, spezzata attorno alla finestra del permesso.
export function inserisciPermesso(segmenti: SegmentoPresenza[], start: number, end: number, note?: string): SegmentoPresenza[] {
  const out: SegmentoPresenza[] = []
  for (const s of segmenti) {
    if (s.tipo !== 'presente' || s.end_min <= start || s.start_min >= end) { out.push(s); continue }
    if (s.start_min < start) out.push({ tipo: 'presente', start_min: s.start_min, end_min: start })
    if (s.end_min > end)     out.push({ tipo: 'presente', start_min: end, end_min: s.end_min })
  }
  out.push({ tipo: 'permesso', start_min: start, end_min: end, note: note || 'ROL' })
  return out.sort((a, b) => a.start_min - b.start_min)
}

/** Giornata standard 09:00–18:00 con un'ora di pausa. */
export const giornataStandard = (): SegmentoPresenza[] => [
  { tipo: 'presente', start_min: 9 * 60, end_min: 13 * 60 },
  { tipo: 'pausa',    start_min: 13 * 60, end_min: 14 * 60 },
  { tipo: 'presente', start_min: 14 * 60, end_min: 18 * 60 },
]

/** Turno previsto del giorno (mock deterministico): mattina 7–16 o pomeriggio 13–22, domenica riposo. */
export function turnoPrevisto(dipId: number, d: Date): { inizio: number; fine: number } | null {
  if (d.getDay() === 0) return null
  const seed = (dipId * 7 + d.getDate() * 3 + d.getMonth()) % 14
  const mattina = seed % 2 === 0
  return { inizio: (mattina ? 7 : 13) * 60, fine: (mattina ? 16 : 22) * 60 }
}

/** Minuti di ritardo all'ingresso (mock): qualche giorno ogni tanto. */
export function ritardoDi(dipId: number, d: Date) {
  return (dipId * 3 + d.getDate()) % 11 === 0 ? 12 + (dipId % 4) * 6 : 0
}

// Presenze del giorno (mock deterministico per dipendente+data). Ferie, malattia,
// ROL e permessi arrivano dalle richieste approvate dall'HR, non da qui.
export function segmentiGiorno(dipId: number, d: Date): SegmentoPresenza[] {
  const turno = turnoPrevisto(dipId, d)
  if (!turno) return [{ tipo: 'assenza', start_min: 0, end_min: GIORNO_MIN, note: 'Riposo' }]   // domenica
  const seed = (dipId * 7 + d.getDate() * 3 + d.getMonth()) % 14
  const s0 = dipId * 31 + d.getDate() * 5 + d.getMonth()
  // Qualche minuto di anticipo o ritardo, e ogni tanto un'ora di straordinario a fine turno.
  const ingresso = turno.inizio + scarto(s0, 6) + ritardoDi(dipId, d)
  const uscita = turno.fine + scarto(s0 + 1, 5) + (seed === 9 ? 75 : 0)
  const pausa = turno.inizio + 5 * 60
  return [
    { tipo: 'presente', start_min: ingresso,   end_min: pausa },
    { tipo: 'pausa',    start_min: pausa,      end_min: pausa + 60 },
    { tipo: 'presente', start_min: pausa + 60, end_min: uscita },
  ]
}

/** Giornata con una timbratura dimenticata (mock): ogni tanto manca l'uscita. */
export const uscitaDimenticata = (dipId: number, d: Date) => (dipId * 5 + d.getDate() * 2 + d.getMonth()) % 37 === 0

/** Timbrature ricavate dalla presenza: un'entrata all'inizio e un'uscita alla fine di ogni tratto. */
export function timbratureDaSegmenti(segmenti: SegmentoPresenza[], chiave: string): Timbratura[] {
  const out: Timbratura[] = []
  segmenti.filter((s) => s.tipo === 'presente').sort((a, b) => a.start_min - b.start_min).forEach((s, i) => {
    out.push({ id: `${chiave}-e${i}`, min: s.start_min, verso: 'entrata', postazione: 'principale' })
    out.push({ id: `${chiave}-u${i}`, min: s.end_min, verso: 'uscita', postazione: 'principale' })
  })
  return out
}

/**
 * Presenza ricalcolata dalle timbrature: ogni entrata seguita da un'uscita è un
 * tratto di presenza, il buco tra due tratti è pausa. Le assenze a ore della
 * giornata (permessi) restano dove sono.
 */
export function segmentiDaTimbrature(timbrature: Timbratura[], base: SegmentoPresenza[]): SegmentoPresenza[] {
  const ord = [...timbrature].sort((a, b) => a.min - b.min)
  const tratti: SegmentoPresenza[] = []
  for (let i = 0; i < ord.length - 1; i++) {
    if (ord[i].verso === 'entrata' && ord[i + 1].verso === 'uscita') {
      tratti.push({ tipo: 'presente', start_min: ord[i].min, end_min: ord[i + 1].min })
      i++
    }
  }
  const pause: SegmentoPresenza[] = []
  for (let i = 0; i < tratti.length - 1; i++) {
    if (tratti[i + 1].start_min > tratti[i].end_min) pause.push({ tipo: 'pausa', start_min: tratti[i].end_min, end_min: tratti[i + 1].start_min })
  }
  const permessi = base.filter((s) => s.tipo === 'permesso')
  return [...tratti, ...pause, ...permessi].sort((a, b) => a.start_min - b.start_min)
}

/** Timbrature non accoppiate (entrata senza uscita o viceversa). */
export function timbratureAnomale(timbrature: Timbratura[]): boolean {
  const ord = [...timbrature].sort((a, b) => a.min - b.min)
  if (ord.length % 2 !== 0) return true
  return ord.some((t, i) => t.verso !== (i % 2 === 0 ? 'entrata' : 'uscita'))
}

// ── Classificazione della giornata (vista dettagliata) ─────────────────────────
export type CodiceGiorno = 'ORD' | 'STR' | 'O+P' | 'RIP' | 'FER' | 'ROL' | 'PER' | 'MAL' | 'ASS' | 'ANO' | 'VUO'

export interface LegendaVoce { codice: CodiceGiorno; label: string }
export const LEGENDA: LegendaVoce[] = [
  { codice: 'ORD', label: 'Ordinarie' },
  { codice: 'STR', label: 'Straordinario' },
  { codice: 'RIP', label: 'Riposo' },
  { codice: 'FER', label: 'Ferie' },
  { codice: 'ROL', label: 'ROL' },
  { codice: 'PER', label: 'Permesso' },
  { codice: 'MAL', label: 'Malattia' },
  { codice: 'ASS', label: 'Assente' },
  { codice: 'ANO', label: 'Timbratura anomala' },
]

/** Ore ordinarie di contratto al giorno: oltre è straordinario. */
export const ORE_ORDINARIE = 8
/** Minuti oltre l'orario ordinario da cui la giornata conta come straordinario (sotto restano "ore extra"). */
export const SOGLIA_STRAORDINARIO = 30

export interface GiornoRegistro {
  codice: CodiceGiorno
  descrizione: string
  ingresso?: number
  uscita?: number
  /** Minuti lavorati (somma dei tratti di presenza). */
  lavorati: number
  ordinari: number
  straordinari: number
  /** Minuti di ROL o permesso nella giornata. */
  permesso: number
  tipoPermesso?: 'ROL' | 'Permesso'
}

export function classificaGiorno(segmenti: SegmentoPresenza[], timbrature: Timbratura[], inServizio = false): GiornoRegistro {
  const pres = segmenti.filter((s) => s.tipo === 'presente')
  const lavorati = pres.reduce((t, s) => t + (s.end_min - s.start_min), 0)
  const permessi = segmenti.filter((s) => s.tipo === 'permesso')
  const permesso = permessi.reduce((t, s) => t + (s.end_min - s.start_min), 0)
  const tipoPermesso: 'ROL' | 'Permesso' | undefined = permessi.length ? (/rol/i.test(permessi[0].note ?? '') ? 'ROL' : 'Permesso') : undefined
  const ordinari = Math.min(lavorati, ORE_ORDINARIE * 60)
  const straordinari = Math.max(0, lavorati - ORE_ORDINARIE * 60)
  const ingresso = timbrature.length ? Math.min(...timbrature.filter((t) => t.verso === 'entrata').map((t) => t.min)) : undefined
  const ordT = [...timbrature].sort((a, b) => a.min - b.min)
  // L'uscita è l'ultima timbratura solo se chiude la giornata: con l'entrata aperta non c'è ancora.
  const uscita = ordT.length && ordT[ordT.length - 1].verso === 'uscita' ? ordT[ordT.length - 1].min : undefined
  const tempi = { ingresso: Number.isFinite(ingresso) ? ingresso : undefined, uscita }
  const base = { lavorati, ordinari, straordinari, permesso, tipoPermesso, ...tempi }

  if (inServizio && ordT.length && ordT[ordT.length - 1].verso === 'entrata' && !timbratureAnomale(ordT.slice(0, -1))) {
    return { ...base, codice: 'ORD', descrizione: `In servizio dalle ${minToHHMM(ordT[ordT.length - 1].min)}` }
  }
  if (timbrature.length && timbratureAnomale(timbrature)) return { ...base, codice: 'ANO', descrizione: 'Timbratura anomala: entrata o uscita mancante' }
  if (pres.length) {
    if (permesso) return { ...base, codice: 'O+P', descrizione: `Presente con ${tipoPermesso} di ${fmtOre(permesso)}` }
    if (straordinari >= SOGLIA_STRAORDINARIO) return { ...base, codice: 'STR', descrizione: `Presente con ${fmtOre(straordinari)} di straordinario` }
    return { ...base, codice: 'ORD', descrizione: 'Presente, orario ordinario' }
  }
  const intero = segmenti[0]
  if (!intero) return { ...base, codice: 'VUO', descrizione: 'Nessuna assegnazione' }
  if (intero.tipo === 'ferie') return { ...base, codice: 'FER', descrizione: intero.note && intero.note !== 'Ferie' ? `Ferie — ${intero.note}` : 'Ferie' }
  if (intero.tipo === 'permesso') return { ...base, codice: tipoPermesso === 'ROL' ? 'ROL' : 'PER', descrizione: `${tipoPermesso} di ${fmtOre(permesso)}` }
  if (intero.tipo === 'assenza') {
    if (/riposo/i.test(intero.note ?? '')) return { ...base, codice: 'RIP', descrizione: 'Riposo' }
    if (/malattia/i.test(intero.note ?? '')) return { ...base, codice: 'MAL', descrizione: intero.note ?? 'Malattia' }
    return { ...base, codice: 'ASS', descrizione: intero.note ? `Assente — ${intero.note}` : 'Assente, nessuna giustifica' }
  }
  return { ...base, codice: 'VUO', descrizione: 'Nessuna assegnazione' }
}

export function fmtOre(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`
}

export const oreDecimali = (min: number) => `${(min / 60).toFixed(1).replace('.', ',')}h`

// ── Mese di un dipendente: base comune di vista dettagliata, Excel e PDF ───────
export interface GiornataRegistro {
  segmenti: SegmentoPresenza[]
  timbrature: Timbratura[]
  /** Modificata a mano dall'ufficio del personale. */
  modificato: boolean
  /** Oggi, con il dipendente ancora dentro (ultima timbratura un'entrata). */
  inServizio?: boolean
}

/** Festività nazionali italiane (Pasqua e Pasquetta comprese). */
export function festivitaNazionale(d: Date): string | null {
  const k = `${d.getMonth() + 1}-${d.getDate()}`
  const fisse: Record<string, string> = {
    '1-1': 'Capodanno', '1-6': 'Epifania', '4-25': 'Festa della Liberazione', '5-1': 'Festa dei lavoratori',
    '6-2': 'Festa della Repubblica', '8-15': 'Ferragosto', '11-1': 'Ognissanti', '12-8': 'Immacolata',
    '12-25': 'Natale', '12-26': 'Santo Stefano',
  }
  if (fisse[k]) return fisse[k]
  // Pasqua (algoritmo di Meeus/Jones/Butcher)
  const y = d.getFullYear()
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - dd - g + 15) % 30
  const i = Math.floor(c / 4), kk = c % 4, l = (32 + 2 * e + 2 * i - h - kk) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mese = Math.floor((h + l - 7 * m + 114) / 31), giorno = ((h + l - 7 * m + 114) % 31) + 1
  const pasqua = new Date(y, mese - 1, giorno)
  const pasquetta = new Date(y, mese - 1, giorno + 1)
  if (d.getMonth() === pasqua.getMonth() && d.getDate() === pasqua.getDate()) return 'Pasqua'
  if (d.getMonth() === pasquetta.getMonth() && d.getDate() === pasquetta.getDate()) return "Lunedì dell'Angelo"
  return null
}

export interface GiornoMese {
  iso: string
  n: number
  dow: number
  oggi: boolean
  futuro: boolean
  /** Domenica o festività nazionale. */
  festivo: boolean
  festivita: string | null
  g: GiornoRegistro
  modificato: boolean
}

/** I giorni del mese di un dipendente. Nei giorni futuri le presenze non ci sono ancora: restano ferie, riposi e assenze pianificate. */
export function giorniDelMese(anno: number, mese: number, giornata: (iso: string) => GiornataRegistro, oggi = new Date()): GiornoMese[] {
  const oggiIso = isoDi(oggi)
  const n = new Date(anno, mese + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(anno, mese, i + 1)
    const iso = isoDi(d)
    const gg = giornata(iso)
    let g = classificaGiorno(gg.segmenti, gg.timbrature, gg.inServizio)
    const futuro = iso > oggiIso
    const presenza = g.codice === 'ORD' || g.codice === 'STR' || g.codice === 'O+P' || g.codice === 'ANO'
    const nascondi = futuro && presenza && !gg.modificato
    if (nascondi) g = { ...g, codice: 'VUO', descrizione: 'Giornata non ancora lavorata', ingresso: undefined, uscita: undefined, lavorati: 0, ordinari: 0, straordinari: 0, permesso: 0, tipoPermesso: undefined }
    const festivita = festivitaNazionale(d)
    return { iso, n: i + 1, dow: d.getDay(), oggi: iso === oggiIso, futuro, festivo: d.getDay() === 0 || !!festivita, festivita, g, modificato: nascondi ? false : gg.modificato }
  })
}

/** Voci orarie del registro mensile (come il tracciato per il consulente del lavoro). */
export const VOCI_ORE = ['Ordinarie', 'Straordinario', 'Festive', 'Permessi', 'Infortunio', 'Malattia', 'Ferie', 'Trasferta'] as const
export type VoceOre = typeof VOCI_ORE[number]

/** Ore (decimali) di ciascuna voce in una giornata. */
export function oreGiorno(x: GiornoMese): Record<VoceOre, number> {
  const h = (min: number) => Math.round((min / 60) * 10) / 10
  const lavorate = x.festivo ? 0 : 1
  return {
    Ordinarie: h(x.g.ordinari) * lavorate,
    Straordinario: x.g.codice === 'STR' ? h(x.g.straordinari) * lavorate : 0,
    Festive: x.festivo ? h(x.g.lavorati) : 0,
    Permessi: h(x.g.permesso),
    Infortunio: 0,
    Malattia: x.g.codice === 'MAL' ? ORE_ORDINARIE : 0,
    Ferie: x.g.codice === 'FER' ? ORE_ORDINARIE : 0,
    Trasferta: 0,
  }
}

export interface TotaliMese {
  ordinari: number; straordinari: number; ferie: number; rol: number; permessi: number
  malattia: number; assenze: number; anomalie: number; modificati: number
  /** Ore per voce e giorni con quella voce. */
  ore: Record<VoceOre, { ore: number; gg: number }>
}

export function totaliMese(giorni: GiornoMese[]): TotaliMese {
  const ore = Object.fromEntries(VOCI_ORE.map((v) => [v, { ore: 0, gg: 0 }])) as TotaliMese['ore']
  const t: TotaliMese = { ordinari: 0, straordinari: 0, ferie: 0, rol: 0, permessi: 0, malattia: 0, assenze: 0, anomalie: 0, modificati: 0, ore }
  giorni.forEach((x) => {
    const { g } = x
    t.ordinari += g.ordinari
    t.straordinari += g.straordinari
    if (g.tipoPermesso === 'ROL') t.rol += g.permesso
    else if (g.tipoPermesso === 'Permesso') t.permessi += g.permesso
    if (g.codice === 'FER') t.ferie++
    if (g.codice === 'MAL') t.malattia++
    if (g.codice === 'ASS') t.assenze++
    if (g.codice === 'ANO') t.anomalie++
    if (x.modificato) t.modificati++
    const o = oreGiorno(x)
    VOCI_ORE.forEach((v) => { if (o[v]) { ore[v].ore = Math.round((ore[v].ore + o[v]) * 10) / 10; ore[v].gg++ } })
  })
  return t
}

/** Sigla mostrata nella cella Tipo. */
export const SIGLA: Record<CodiceGiorno, string> = {
  ORD: 'ORD', STR: 'O+S', 'O+P': 'O+P', RIP: 'RIP', FER: 'FER', ROL: 'ROL', PER: 'PER', MAL: 'MAL', ASS: 'ASS', ANO: 'ANO', VUO: '',
}

/** Minuti in formato "ore extra" del registro: 45' oppure 1h 15'. */
export const fmtExtra = (min: number) => (min < 60 ? `${min}'` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}'` : ''}`)

export const MESI_LUNGHI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
export const GSETT = ['D', 'L', 'M', 'M', 'G', 'V', 'S']

// ── Reparti → icona FontAwesome ───────────────────────────────────────────────
const REPARTO_ICONS: Record<string, string> = {
  'Front office': 'fa-bell-concierge', 'Front Office': 'fa-bell-concierge',
  'F&B': 'fa-martini-glass', 'Cucina': 'fa-kitchen-set',
  'Housekeeping': 'fa-broom', 'Pulizie': 'fa-broom',
  'Manutenzione': 'fa-wrench', 'Amministrazione': 'fa-briefcase',
}
export const repartoIcon = (rep: string): string => REPARTO_ICONS[rep] || 'fa-user'
