import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'

interface TooltipProps {
  text?:     string
  content?:  React.ReactNode
  children:  React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  variant?:  'dark' | 'light'
}

export default function Tooltip({ text, content, children, position = 'top', variant = 'dark' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords,  setCoords]  = useState({ x: 0, y: 0 })
  // Rientro orizzontale quando la box uscirebbe dal viewport (celle a filo
  // destro delle tabelle): altrimenti il bordo finestra taglia il testo.
  const [shift,   setShift]   = useState(0)
  // Wrapper e box sono <span>: così il Tooltip è annidabile ovunque, anche
  // dentro testo (<p>, <h2>, celle, bottoni), senza markup non valido.
  const wrapRef = useRef<HTMLSpanElement>(null)
  const boxRef  = useRef<HTMLSpanElement>(null)

  const show = () => {
    if (!wrapRef.current) return
    const r = wrapRef.current.getBoundingClientRect()
    let x = r.left + r.width / 2
    let y = r.top
    if (position === 'bottom') y = r.bottom
    if (position === 'left')  { x = r.left;  y = r.top + r.height / 2 }
    if (position === 'right') { x = r.right; y = r.top + r.height / 2 }
    setCoords({ x, y })
    setVisible(true)
  }

  const hide = () => { setVisible(false); setShift(0) }

  // Nascondi se componente viene smontato
  useEffect(() => () => setVisible(false), [])

  useLayoutEffect(() => {
    if (!visible) return
    const el = boxRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const M = 8
    // Misure "a riposo": tolgo il rientro già applicato, così converge in un passo.
    const left = r.left - shift
    const right = r.right - shift
    let next = 0
    if (right > window.innerWidth - M) next = window.innerWidth - M - right
    if (left + next < M) next = M - left
    if (Math.abs(next - shift) > 0.5) setShift(next)
  }, [visible, coords, shift])

  const hasContent = content !== undefined && content !== null
  // Testi lunghi devono andare a capo: con `nowrap` + `maxWidth` il testo
  // sborderebbe dallo sfondo scuro (sembra "tagliato" dalla box).
  const longText = !hasContent && typeof text === 'string' && text.length > 34
  const wrap = hasContent || longText
  const light = variant === 'light'
  const boxStyle: React.CSSProperties = {
    display:     'block',
    position:    'fixed',
    zIndex:      9999,
    background:  light ? '#fff' : '#1E293B',
    color:       light ? '#1f2937' : '#fff',
    border:      light ? '1px solid #E2E8F0' : 'none',
    fontSize:    11,
    fontWeight:  500,
    borderRadius: light ? 10 : 6,
    padding:     hasContent ? (light ? '12px 14px' : '8px 12px') : (wrap ? '7px 11px' : '5px 10px'),
    whiteSpace:  wrap ? 'normal' : 'nowrap',
    overflowWrap: 'anywhere',
    pointerEvents: 'none',
    boxShadow:   light ? '0 8px 24px rgba(32,71,105,0.18)' : '0 4px 12px rgba(32,71,105,0.25)',
    maxWidth:    hasContent ? 320 : 260,
    width:       'max-content',
    lineHeight:  1.4,
    ...(position === 'top' && {
      left:      coords.x,
      top:       coords.y - 8,
      transform: `translateX(calc(-50% + ${shift}px)) translateY(-100%)`,
    }),
    ...(position === 'bottom' && {
      left:      coords.x,
      top:       coords.y + 8,
      transform: `translateX(calc(-50% + ${shift}px))`,
    }),
    ...(position === 'left' && {
      left:      coords.x - 8,
      top:       coords.y,
      transform: `translateX(calc(-100% + ${shift}px)) translateY(-50%)`,
    }),
    ...(position === 'right' && {
      left:      coords.x + 8,
      top:       coords.y,
      transform: `translateX(${shift}px) translateY(-50%)`,
    }),
  }

  return (
    <>
      <span
        ref={wrapRef}
        style={{ display: 'inline-flex' }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {visible && (hasContent || text) && (
        <span ref={boxRef} style={boxStyle}>{hasContent ? content : text}</span>
      )}
    </>
  )
}
