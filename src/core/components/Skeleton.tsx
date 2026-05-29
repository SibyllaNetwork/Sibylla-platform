import React from 'react'

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle'
  /** Larghezza/altezza geometriche (dinamiche) — l'unico stile inline ammesso */
  width?: number | string
  height?: number | string
  /** Numero di righe (solo variant 'text') */
  count?: number
  className?: string
}

const dim = (v?: number | string) => (typeof v === 'number' ? `${v}px` : v)

/**
 * Placeholder di caricamento con shimmer. Stili in _components.sass (.skeleton).
 * Lo shimmer rispetta prefers-reduced-motion (media query globale).
 */
const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', width, height, count = 1, className = '' }) => {
  const cls = `skeleton skeleton--${variant} ${className}`.trim()
  const style: React.CSSProperties = { width: dim(width), height: dim(height) }

  if (variant === 'text' && count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={cls}
            style={{ ...style, width: i === count - 1 ? '60%' : style.width }}
            aria-hidden="true"
          />
        ))}
      </>
    )
  }

  return <span className={cls} style={style} aria-hidden="true" />
}

export default Skeleton
