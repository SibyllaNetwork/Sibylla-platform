import { useAccessStore } from '../store/useAccessStore'

/**
 * True se il modulo è attivo per chi sta usando la piattaforma, con la stessa
 * regola della sidenav: in assistenza i moduli del cliente assistito, con un
 * profilo caricato i suoi moduli, senza profilo (demo completa) tutto attivo.
 * Il modulo «full» li comprende tutti.
 */
export function useModuloAttivo(modulo: string): boolean {
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist
    ? assist.moduli
    : currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined
  if (!moduli) return true
  return moduli.includes(modulo) || moduli.includes('full')
}
