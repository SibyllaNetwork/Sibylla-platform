import { useEffect, useState } from 'react'
import { useAccessStore } from '../../../store/useAccessStore'

// ─── HOME TOUR OPERATOR · vista scelta ────────────────────────────────────────
//  I Tour Operator hanno due Home: "timone" (come le strutture ricettive, con le
//  scorciatoie del loro menu) e "dashboard" (riepilogo + meteo/notizie/mercato).
//  La scelta è una comodità per-browser: se lo storage non è disponibile si
//  riparte dal timone.

export type HomeToView = 'timone' | 'dashboard'
const KEY = 'sibylla.home.to.view'

function leggi(): HomeToView {
  try { return localStorage.getItem(KEY) === 'dashboard' ? 'dashboard' : 'timone' } catch { return 'timone' }
}

export function useHomeToView(): [HomeToView, (v: HomeToView) => void] {
  const [view, setView] = useState<HomeToView>(leggi)
  useEffect(() => {
    try { localStorage.setItem(KEY, view) } catch { /* storage non disponibile */ }
  }, [view])
  return [view, setView]
}

/** Moduli del profilo attivo (assistenza > profilo loggato). */
export function useIsTourOperator(): boolean {
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist ? assist.moduli : profiles.find(p => p.id === currentProfileId)?.moduli
  return !!moduli?.includes('tour-operator')
}

/** Nome di battesimo del profilo loggato, per il saluto. */
export function useNomeProfilo(): string | null {
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  if (assist) return null
  const nome = profiles.find(p => p.id === currentProfileId)?.nome
  return nome ? nome.split(' ')[0] : null
}
