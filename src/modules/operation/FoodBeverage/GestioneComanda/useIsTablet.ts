import { useEffect, useState } from 'react'

// ─── useIsTablet ──────────────────────────────────────────────────────────────
//  Vero su un tablet: schermo touch (puntatore "grossolano") largo almeno 600px
//  e non più di 1400px. Su un tablet la Gestione comanda passa alla versione a
//  tutto schermo per il cameriere; su desktop resta la pagina classica.
//  Per provarla da desktop (demo, QA): localStorage `sibylla.comanda.tablet` = '1'.

const QUERY = '(pointer: coarse) and (min-width: 600px) and (max-width: 1400px)'

const forzato = () => {
  try { return localStorage.getItem('sibylla.comanda.tablet') === '1' } catch { return false }
}

const rileva = () => forzato() || (typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches)

export function useIsTablet(): boolean {
  const [tablet, setTablet] = useState(rileva)
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY)
    if (!mq) return
    const cambia = () => setTablet(rileva())
    mq.addEventListener?.('change', cambia)
    window.addEventListener('resize', cambia)
    return () => { mq.removeEventListener?.('change', cambia); window.removeEventListener('resize', cambia) }
  }, [])
  return tablet
}
