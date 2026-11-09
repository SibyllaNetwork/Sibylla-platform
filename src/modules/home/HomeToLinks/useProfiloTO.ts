import { useAccessStore, profiloDellaStruttura } from '../../../store/useAccessStore'
import { isFbStandalone } from '../../../navigation/filterMenu'

// ─── HOME TOUR OPERATOR · profilo attivo ──────────────────────────────────────

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

/** Pagina Home propria del profilo attivo (es. Dashboard F&B), se configurata. */
export function useHomeProfilo(): string | undefined {
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  // Ristorazione stand alone (solo il modulo Ristorazione): senza una Home scelta si apre la Dashboard F&B.
  const standalone = (home: string | undefined, moduli?: string[]) => home ?? (isFbStandalone(moduli) ? 'fb-dashboard' : undefined)
  if (assist) return standalone(assist.struttureIds.map(id => profiloDellaStruttura(id, profiles)).find(Boolean)?.home, assist.moduli)
  const p = profiles.find(x => x.id === currentProfileId)
  return standalone(p?.home, p?.moduli)
}
