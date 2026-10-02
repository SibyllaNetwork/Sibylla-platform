// ─── Date d'esempio "vive" (Agorà) ────────────────────────────────────────────
//  I dati mock sono stati scritti intorno a una data di riferimento: a runtime
//  tutte le date (yyyy-MM-dd, con eventuale orario, e dd/MM/yyyy) si spostano in
//  avanti dei giorni trascorsi da allora, mantenendo gli scarti relativi. Così
//  pubblicazioni, scadenze e periodi restano attuali anche nei prossimi mesi.

/** Data intorno a cui sono stati scritti i dati d'esempio dell'Agorà. */
export const RIFERIMENTO_AGORA = new Date(2026, 3, 23)

const pad = (n: number) => String(n).padStart(2, '0')

/** Giorni fra la data di riferimento e oggi. */
export const giorniDaRiferimento = (riferimento = RIFERIMENTO_AGORA) =>
  Math.round((new Date(new Date().toDateString()).getTime() - riferimento.getTime()) / 86400000)

/** Sposta tutte le date contenute nel testo di `giorni`. */
export function spostaTesto(testo: string, giorni: number): string {
  return testo
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, a, m, g) => {
      const d = new Date(Number(a), Number(m) - 1, Number(g) + giorni)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })
    .replace(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g, (_, g, m, a) => {
      const d = new Date(Number(a), Number(m) - 1, Number(g) + giorni)
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
    })
}

/** Copia profonda del dato con tutte le date spostate a oggi. */
export function aOggi<T>(dato: T, riferimento = RIFERIMENTO_AGORA): T {
  const giorni = giorniDaRiferimento(riferimento)
  const visita = (v: unknown): unknown => {
    if (typeof v === 'string') return spostaTesto(v, giorni)
    if (Array.isArray(v)) return v.map(visita)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, visita(x)]))
    }
    return v
  }
  return visita(dato) as T
}
