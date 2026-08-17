// ─── useCountUp ─────────────────────────────────────────────────────────────────
//  Conta da 0 al valore finale con easing, per i numeri grandi delle KPI.
//  Riparte quando il valore cambia (es. cambio filtro) e rispetta la preferenza
//  di sistema "riduci animazioni": in quel caso il valore appare subito.
import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from './chartTheme'

export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(() => (reducedMotion() ? target : 0))
  const fromRef = useRef(0)

  useEffect(() => {
    if (reducedMotion()) { setVal(target); return }
    const from = fromRef.current
    const delta = target - from
    if (delta === 0) { setVal(target); return }

    let raf = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic: parte veloce e si appoggia sul valore finale
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + delta * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return val
}
