// ─── TEMA GRAFICI BI ────────────────────────────────────────────────────────────
//  Parametri unici di tutti i grafici della piattaforma: palette categoriale,
//  cromature (griglia/assi/inchiostro), formattatori e tempi di animazione.
//  I colori sono SEMPRE riferimenti ai token `--chart-*` (definiti per tema in
//  styles/_themes.sass): passandoli come stringhe `var(...)` agli attributi SVG
//  di recharts i grafici seguono tema e dark mode senza una riga di JS.
//
//  Regole della piattaforma incorporate qui (vedi regole_ui.md §13):
//   • gli slot categoriali si assegnano in ordine e non si riciclano: dalla nona
//     serie si aggrega in "Altro";
//   • un solo asse dei valori per grafico (mai due scale y);
//   • il colore segue l'entità, non la sua posizione in classifica.

/** Slot categoriali in ordine fisso. `series(i)` è l'unico modo di prenderli. */
export const SERIES = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
] as const

/** Colore della serie n (0-based). Oltre l'ottava serie si aggrega in "Altro". */
export function series(i: number): string {
  return SERIES[Math.min(i, SERIES.length - 1)]
}

/** Tetto di serie per le forme dove due marchi qualsiasi possono affiancarsi. */
export const ALL_PAIRS_SERIES_CAP = 3

/** Ruoli non categoriali e cromature. */
export const CHART = {
  /** Confronto con lo stesso periodo dell'anno precedente (neutro). */
  ly: 'var(--chart-ly)',
  /** Previsione / forecast (oro brand, sempre tratteggiato). */
  forecast: 'var(--chart-forecast)',
  /** Estremi della scala sequenziale (magnitudine: chiaro → scuro). */
  seqFrom: 'var(--chart-seq-from)',
  seqTo: 'var(--chart-seq-to)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  ink: 'var(--chart-ink)',
  inkMuted: 'var(--chart-ink-muted)',
  surface: 'var(--chart-surface)',
  /** Stato: significato riservato, mai come "serie N". */
  good: 'var(--chart-good)',
  bad: 'var(--chart-bad)',
} as const

// ── Animazioni ────────────────────────────────────────────────────────────────
//  Ingresso in cascata: ogni serie parte 90ms dopo la precedente, così il
//  grafico si "costruisce" invece di comparire tutto insieme.
export const ANIM = {
  duration: 900,
  step: 90,
  easing: 'ease-out' as const,
  /** Ritardo d'ingresso della serie i-esima. */
  begin: (i = 0) => i * 90,
}

/** L'utente ha chiesto meno movimento? Le animazioni si spengono. */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ── Props condivise per gli assi e la griglia ─────────────────────────────────
//  Griglia e assi sono recessivi: orizzontali sottili, nessuna linea verticale,
//  nessun tick sporgente. Le etichette non ruotano MAI (nel BI legacy erano
//  inclinate e illeggibili): se non c'è spazio si riduce il numero di tick.
export const gridProps = {
  stroke: CHART.grid,
  vertical: false,
  strokeWidth: 1,
} as const

export const xAxisProps = {
  tick: { fontSize: 11, fill: CHART.inkMuted },
  tickLine: false,
  axisLine: { stroke: CHART.axis },
  angle: 0,
  minTickGap: 12,
} as const

export const yAxisProps = {
  tick: { fontSize: 11, fill: CHART.inkMuted },
  tickLine: false,
  axisLine: false,
  width: 46,
} as const

/** Crosshair tratteggiato del tooltip su linee e aree. */
export const cursorProps = { stroke: CHART.axis, strokeDasharray: '3 3' } as const

// ── Formattatori ──────────────────────────────────────────────────────────────
const nf = (min = 0, max = 0) => new Intl.NumberFormat('it-IT', { minimumFractionDigits: min, maximumFractionDigits: max })

/** 1.234,56 € — importo esatto (tooltip, tabelle, valori KPI). */
export const fmtEur = (n: number, decimals = 2) => `${nf(decimals, decimals).format(n)} €`

/** 12,3k € / 1,2M € — importo compatto (assi, badge). */
export function fmtEurK(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${nf(0, 1).format(n / 1_000_000)}M €`
  if (a >= 1_000) return `${nf(0, 1).format(n / 1_000)}k €`
  return `${nf(0, 0).format(n)} €`
}

/** Tick d'asse senza valuta: 12k, 1,2M. */
export function fmtAxisNum(n: number): string {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${nf(0, 1).format(n / 1_000_000)}M`
  if (a >= 1_000) return `${nf(0, 1).format(n / 1_000)}k`
  return nf(0, 0).format(n)
}

/** 78,4% */
export const fmtPct = (n: number, decimals = 1) => `${nf(decimals, decimals).format(n)}%`

/** 1.234 */
export const fmtInt = (n: number) => nf(0, 0).format(n)

/** Variazione con segno: +8,2% / −3,0% (meno tipografico, non il trattino). */
export function fmtDelta(n: number, suffix = '%', decimals = 1): string {
  const s = nf(decimals, decimals).format(Math.abs(n))
  return `${n >= 0 ? '+' : '−'}${s}${suffix}`
}

/** dd/MM/yyyy HH:mm — timestamp del dato BI. */
export function fmtStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
