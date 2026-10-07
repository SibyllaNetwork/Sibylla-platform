import { useAccessStore } from '../../../store/useAccessStore'

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
