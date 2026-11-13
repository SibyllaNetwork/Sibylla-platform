import type { PersonalizzazioneCamera, SegmentoOspite, TipologiaCamera } from '../../../store/useTipologieCamereStore'

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
}

export const personalizzazioneDi = (t: TipologiaCamera): PersonalizzazioneCamera => t.personalizzazione ?? PERSONALIZZAZIONE_DEFAULT

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
  return giorniCambioLenzuola(personalizzazioneDi(t).cambioLenzuola[segmento], notti)
    .map((g) => new Date(a.getFullYear(), a.getMonth(), a.getDate() + g))
}
