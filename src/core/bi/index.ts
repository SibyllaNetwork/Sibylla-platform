// ─── KIT BI ─────────────────────────────────────────────────────────────────────
//  Punto d'ingresso unico dei componenti di business intelligence: le pagine BI
//  importano SOLO da qui. Lo standard (palette, animazioni, tooltip, legende,
//  glossario, impianto a schermo fisso) vive nel kit: si corregge una volta e
//  cambia su tutte le pagine.
//
//  Lo strato grafico è incapsulato: i grafici si costruiscono con questi
//  componenti e con i parametri di `chartTheme`, mai con colori o assi scritti a
//  mano nella pagina. Se un domani si cambia libreria di grafici, si riscrive il
//  kit e le pagine restano come sono.

export { default as BiPage } from './BiPage'
export type { BiPageProps } from './BiPage'

export { default as ChartCard } from './ChartCard'
export type { ChartCardProps } from './ChartCard'

export { default as KpiTile } from './KpiTile'
export type { KpiTileProps } from './KpiTile'

export { default as DeltaBadge } from './DeltaBadge'
export type { DeltaBadgeProps } from './DeltaBadge'

export { default as Sparkline } from './Sparkline'
export type { SparklineProps } from './Sparkline'

export { default as BiLegend } from './BiLegend'
export type { BiLegendItem, BiLegendProps } from './BiLegend'

export { default as ChartTooltip } from './ChartTooltip'
export type { ChartTooltipProps } from './ChartTooltip'

export { default as BiDataStamp } from './BiDataStamp'
export type { BiDataStampProps } from './BiDataStamp'

export { default as BiGlossaryRail } from './BiGlossaryRail'
export type { BiGlossaryRailProps } from './BiGlossaryRail'

export { default as BiVerticalTabs } from './BiVerticalTabs'
export type { BiVerticalTab, BiVerticalTabsProps } from './BiVerticalTabs'

export { BI_GLOSSARY, glossaryFor } from './biGlossary'
export type { BiGlossaryEntry } from './biGlossary'

export { useCountUp } from './useCountUp'

export { useFitRows } from './useFitRows'
export type { FitRowsOptions, FitRowsResult } from './useFitRows'

export {
  SERIES, series, ALL_PAIRS_SERIES_CAP, CHART, ANIM, reducedMotion,
  gridProps, xAxisProps, yAxisProps, cursorProps,
  fmtEur, fmtEurK, fmtAxisNum, fmtPct, fmtInt, fmtDelta, fmtStamp,
} from './chartTheme'
