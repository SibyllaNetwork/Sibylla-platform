import React, { useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Tooltip from './Tooltip'

/**
 * Testo di tabella su una sola riga con ellipsis. Standard piattaforma:
 * niente testi su due righe (titoli o celle); se il testo viene troncato
 * (overflow) oppure è volutamente abbreviato/puntato (`full` ≠ `text`), mostra
 * SEMPRE una finestra con il testo completo all'hover del mouse.
 *
 * La `max-width` che determina il troncamento va fornita dal chiamante via
 * `className` (es. una classe di colonna); l'utility `.sib-truncate` gestisce
 * overflow/ellipsis/nowrap.
 */
interface Props {
  /** Testo visualizzato (eventualmente abbreviato). */
  text: string
  /** Testo completo per il tooltip. Default: `text`. */
  full?: string
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function TruncatedText({ text, full, className, position = 'top' }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)
  const abbreviated = full != null && full !== text

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  const span = <span ref={ref} className={clsx('sib-truncate', className)}>{text}</span>

  if (overflow || abbreviated) {
    return <Tooltip content={full ?? text} position={position} variant="light">{span}</Tooltip>
  }
  return span
}
