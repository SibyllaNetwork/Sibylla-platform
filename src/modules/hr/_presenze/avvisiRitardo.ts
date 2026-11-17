import { useEffect, useMemo, useState } from 'react'
import { DIPENDENTI_PRESENZE, useGiornataPresenze, type DipendentePresenze } from '../../../store/useRegistroPresenzeStore'
import { dataDa, isoDi, minToHHMM, ritardoDi, turnoPrevisto } from './presenze.model'
import { flessibilitaDi } from '../../../store/useTurniPersonaleStore'

// ─── Avvisi di ritardo dall'App Op! ──────────────────────────────────────────
//  Il dipendente in ritardo lo segnala dall'app prima dell'inizio del turno:
//  l'avviso arriva come notifica al responsabile HR (Centro notifiche e
//  campanella), con turno, arrivo previsto, motivo e l'entrata appena timbra.

const MOTIVI_RITARDO = ['Traffico sulla statale', 'Visita medica', 'Sciopero dei mezzi', 'Accompagno i figli a scuola', '']

export interface AvvisoRitardo {
  dip: DipendentePresenze
  /** Minuti dalla mezzanotte. */
  turno: number
  previsto: number
  avvisatoAlle: number
  motivo: string
  /** Prima entrata di oggi, se ha già timbrato. */
  entrata?: number
}

/** Avvisi di ritardo arrivati oggi fino a questo minuto (si aggiorna ogni minuto). */
export function useAvvisiRitardoOggi(): AvvisoRitardo[] {
  const giornata = useGiornataPresenze()
  const [adesso, setAdesso] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => setAdesso(new Date()), 60_000); return () => window.clearInterval(t) }, [])
  const oggiIso = isoDi(adesso)
  const minutiOra = adesso.getHours() * 60 + adesso.getMinutes()

  return useMemo(() => {
    const oggi = dataDa(oggiIso)
    return DIPENDENTI_PRESENZE.flatMap((dip) => {
      const turno = turnoPrevisto(dip.id, oggi)
      const ritardo = ritardoDi(dip.id, oggi)
      // Entro la flessibilità dell'orario di lavoro (Configurazione HR › Orari) non è un ritardo.
      if (!turno || !ritardo || ritardo <= flessibilitaDi(dip.id)) return []
      const g = giornata(dip.id, oggiIso)
      // Chi oggi è in ferie o assente non ha un turno da rispettare.
      if (!g.segmenti.some((s) => s.tipo === 'presente') && !g.timbrature.length && minutiOra > turno.inizio) return []
      const avvisatoAlle = turno.inizio - 12 - (dip.id % 4) * 7
      if (avvisatoAlle > minutiOra) return []
      const entrata = [...g.timbrature].sort((a, b) => a.min - b.min).find((t) => t.verso === 'entrata')
      return [{ dip, turno: turno.inizio, previsto: turno.inizio + ritardo, avvisatoAlle, motivo: MOTIVI_RITARDO[dip.id % MOTIVI_RITARDO.length], entrata: entrata?.min }]
    })
  }, [giornata, oggiIso, minutiOra])
}

/** Testo della notifica per il responsabile HR. */
export function testoAvvisoRitardo(a: AvvisoRitardo) {
  const motivo = a.motivo ? ` Motivo: ${a.motivo.toLowerCase()}.` : ''
  const entrata = a.entrata != null ? ` Entrata timbrata alle ${minToHHMM(a.entrata)}.` : ''
  return `${a.dip.nome} ${a.dip.cognome} (${a.dip.reparto}) arriverà alle ${minToHHMM(a.previsto)} invece delle ${minToHHMM(a.turno)} (+${a.previsto - a.turno}').${motivo}${entrata}`
}
