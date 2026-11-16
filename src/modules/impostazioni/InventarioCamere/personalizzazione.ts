import type { ElementoLetto, LayoutCamera, PersonalizzazioneCamera, SegmentoOspite, TipologiaCamera } from '../../../store/useTipologieCamereStore'

// ─── Personalizzazione tipologia: regole di housekeeping ──────────────────────
//  Cambio lenzuola: intervallo per segmento d'ospite, contato dall'arrivo del
//  soggiorno. Il giorno della partenza il cambio c'è SEMPRE (obbligatorio).

export const SEGMENTI: { id: SegmentoOspite; label: string; icona: string; hint: string }[] = [
  { id: 'individuali', label: 'Individuali', icona: 'fa-user', hint: 'Ospiti leisure e famiglie' },
  { id: 'corporate', label: 'Corporate', icona: 'fa-briefcase', hint: 'Clientela aziendale e business' },
  { id: 'gruppi', label: 'Gruppi', icona: 'fa-users', hint: 'Gruppi, tour operator, eventi' },
]

export const MAX_INTERVALLO = 7

export const PERSONALIZZAZIONE_DEFAULT: PersonalizzazioneCamera = {
  cambioLenzuola: { individuali: 3, corporate: 2, gruppi: 4 },
  modoLenzuola: 'segmento',
  cambioLenzuolaTutti: 3,
}

export const personalizzazioneDi = (t: TipologiaCamera): PersonalizzazioneCamera => ({ ...PERSONALIZZAZIONE_DEFAULT, ...t.personalizzazione })

/** Intervallo del cambio lenzuola effettivo per il segmento (tiene conto di "uguale per tutti"). */
export const intervalloLenzuola = (p: PersonalizzazioneCamera, segmento: SegmentoOspite) =>
  p.modoLenzuola === 'tutti' ? p.cambioLenzuolaTutti ?? PERSONALIZZAZIONE_DEFAULT.cambioLenzuolaTutti! : p.cambioLenzuola[segmento]

export const etichettaIntervallo = (n: number) =>
  n === 0 ? 'Solo alla partenza' : n === 1 ? 'Ogni giorno' : `Ogni ${n} giorni`

export const OPZIONI_INTERVALLO = [
  ...Array.from({ length: MAX_INTERVALLO }, (_, i) => ({ value: i + 1, label: etichettaIntervallo(i + 1) })),
  { value: 0, label: etichettaIntervallo(0) },
]

/**
 * Giorni del soggiorno (0 = arrivo, notti = partenza) in cui è previsto il cambio
 * lenzuola: ogni `intervallo` giorni dall'arrivo, più sempre il giorno della partenza.
 */
export function giorniCambioLenzuola(intervallo: number, notti: number): number[] {
  const giorni: number[] = []
  if (intervallo > 0) for (let g = intervallo; g < notti; g += intervallo) giorni.push(g)
  giorni.push(notti)
  return giorni
}

/** Date dei cambi lenzuola per un soggiorno reale (arrivo → partenza). */
export function dateCambioLenzuola(t: TipologiaCamera, segmento: SegmentoOspite, arrivo: Date, partenza: Date): Date[] {
  const giorno = 86_400_000
  const a = new Date(arrivo.getFullYear(), arrivo.getMonth(), arrivo.getDate())
  const p = new Date(partenza.getFullYear(), partenza.getMonth(), partenza.getDate())
  const notti = Math.max(0, Math.round((p.getTime() - a.getTime()) / giorno))
  return giorniCambioLenzuola(intervalloLenzuola(personalizzazioneDi(t), segmento), notti)
    .map((g) => new Date(a.getFullYear(), a.getMonth(), a.getDate() + g))
}

// ─── Layout di configurazione ─────────────────────────────────────────────────
//  Disposizione dei letti: ogni tipologia ha la sua libreria di layout (base del
//  tipo finché non viene modificata), uno predefinito e, camera per camera, un
//  layout specifico che prevale sul predefinito.

export const ELEMENTI_LETTO: { id: ElementoLetto; label: string; icona: string; posti: number }[] = [
  { id: 'matrimoniale', label: 'Letto matrimoniale', icona: 'fa-bed', posti: 2 },
  { id: 'king', label: 'Letto king size', icona: 'fa-bed', posti: 2 },
  { id: 'singolo', label: 'Letto singolo', icona: 'fa-bed-front', posti: 1 },
  { id: 'divano-letto', label: 'Divano letto', icona: 'fa-couch', posti: 2 },
  { id: 'castello', label: 'Letto a castello', icona: 'fa-bed-bunk', posti: 2 },
  { id: 'brandina', label: 'Brandina', icona: 'fa-bed-empty', posti: 1 },
  { id: 'culla', label: 'Culla', icona: 'fa-baby', posti: 0 },
]
export const elementoLetto = (id: ElementoLetto) => ELEMENTI_LETTO.find((e) => e.id === id) ?? ELEMENTI_LETTO[0]

type L = LayoutCamera['letti']
const l = (...x: [ElementoLetto, number][]): L => x.map(([tipo, quantita]) => ({ tipo, quantita }))
const LAYOUT_BASE: Record<string, [string, L][]> = {
  Singola: [['Letto singolo', l(['singolo', 1])]],
  Doppia: [['Matrimoniale', l(['matrimoniale', 1])], ['Letti separati', l(['singolo', 2])]],
  Twin: [['Letti separati', l(['singolo', 2])], ['Letti uniti', l(['matrimoniale', 1])]],
  Matrimoniale: [['King size', l(['king', 1])], ['Matrimoniale con culla', l(['matrimoniale', 1], ['culla', 1])]],
  Tripla: [['Matrimoniale + singolo', l(['matrimoniale', 1], ['singolo', 1])], ['Tre letti singoli', l(['singolo', 3])]],
  Quadrupla: [['Due matrimoniali', l(['matrimoniale', 2])], ['Matrimoniale + due singoli', l(['matrimoniale', 1], ['singolo', 2])]],
  Family: [['Matrimoniale + castello', l(['matrimoniale', 1], ['castello', 1])], ['Matrimoniale + divano letto', l(['matrimoniale', 1], ['divano-letto', 1])]],
  Suite: [['King size + divano letto', l(['king', 1], ['divano-letto', 1])], ['King size', l(['king', 1])]],
  Accessibile: [['Matrimoniale', l(['matrimoniale', 1])], ['Letti separati', l(['singolo', 2])]],
  DUS: [['Matrimoniale uso singola', l(['matrimoniale', 1])]],
}

export const layoutsBase = (tipo: string): LayoutCamera[] =>
  (LAYOUT_BASE[tipo] ?? [['Standard', l(['matrimoniale', 1])]]).map(([nome, letti], i) => ({ id: `base-${i + 1}`, nome, letti }))

export const layoutsDi = (t: TipologiaCamera) => t.personalizzazione?.layouts ?? layoutsBase(t.tipo)

/** Layout predefinito della tipologia (il primo se quello scelto non esiste più). */
export const layoutPredefinitoDi = (t: TipologiaCamera): LayoutCamera | undefined => {
  const ls = layoutsDi(t)
  return ls.find((x) => x.id === t.personalizzazione?.layoutPredefinito) ?? ls[0]
}

/** Layout effettivo della camera: quello assegnato, altrimenti il predefinito della tipologia. */
export const layoutDellaCamera = (t: TipologiaCamera, numero: string): LayoutCamera | undefined => {
  const id = t.personalizzazione?.layoutCamere?.[numero]
  return layoutsDi(t).find((x) => x.id === id) ?? layoutPredefinitoDi(t)
}

export const postiLetto = (letti: L) => letti.reduce((s, x) => s + elementoLetto(x.tipo).posti * x.quantita, 0)

export const descriviLetti = (letti: L) =>
  letti.map((x) => `${x.quantita > 1 ? `${x.quantita} × ` : ''}${elementoLetto(x.tipo).label.toLowerCase()}`).join(' + ')

// ─── Numerazione camere ───────────────────────────────────────────────────────
/**
 * Numeri delle camere per tipologia: quelli registrati (`camere`), completati fino
 * a `numero` con i primi numeri liberi del primo piano della tipologia (101, 102…),
 * senza doppioni fra tipologie.
 */
export function numerazioneCamere(tipologie: TipologiaCamera[], pianoIndice: (nome: string) => number): Map<string, string[]> {
  const usati = new Set(tipologie.flatMap((t) => (t.camere ?? []).slice(0, t.numero)))
  return new Map(tipologie.map((t) => {
    const numeri = (t.camere ?? []).slice(0, t.numero)
    const piano = Math.max(1, pianoIndice(t.piani?.[0] ?? ''))
    for (let k = 1; numeri.length < t.numero; k++) {
      const n = String(piano * 100 + k)
      if (!usati.has(n)) { usati.add(n); numeri.push(n) }
    }
    return [t.id, numeri]
  }))
}
