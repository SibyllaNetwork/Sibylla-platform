import React, { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  text?:     string
  content?:  React.ReactNode
  children:  React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ text, content, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords,  setCoords]  = useState({ x: 0, y: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)

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

  const hide = () => setVisible(false)

  // Nascondi se componente viene smontato
  useEffect(() => () => setVisible(false), [])

  const hasContent = content !== undefined && content !== null
  const boxStyle: React.CSSProperties = {
    position:    'fixed',
    zIndex:      9999,
    background:  '#1E293B',
    color:       '#fff',
    fontSize:    11,
    fontWeight:  500,
    borderRadius: 6,
    padding:     hasContent ? '8px 12px' : '5px 10px',
    whiteSpace:  hasContent ? 'normal' : 'nowrap',
    pointerEvents: 'none',
    boxShadow:   '0 4px 12px rgba(32,71,105,0.25)',
    maxWidth:    hasContent ? 320 : 260,
    lineHeight:  1.4,
    ...(position === 'top' && {
      left:      coords.x,
      top:       coords.y - 8,
      transform: 'translateX(-50%) translateY(-100%)',
    }),
    ...(position === 'bottom' && {
      left:      coords.x,
      top:       coords.y + 8,
      transform: 'translateX(-50%)',
    }),
    ...(position === 'left' && {
      left:      coords.x - 8,
      top:       coords.y,
      transform: 'translateX(-100%) translateY(-50%)',
    }),
    ...(position === 'right' && {
      left:      coords.x + 8,
      top:       coords.y,
      transform: 'translateY(-50%)',
    }),
  }

  return (
    <>
      <div
        ref={wrapRef}
        style={{ display: 'inline-flex' }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {visible && (hasContent || text) && (
        <div style={boxStyle}>{hasContent ? content : text}</div>
      )}
    </>
  )
}
