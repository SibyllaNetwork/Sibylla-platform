import React from 'react'

// ─── Toque ────────────────────────────────────────────────────────────────────
//  Il cappello da chef è il segno identitario del tavolo nell'Outlet Manager:
//  ogni tavolo ha il suo colore e lo si riconosce a distanza. Silhouette piena
//  (tre lobi + fascia con le pieghe in negativo): a 24px resta leggibile quanto
//  a 52px, cosa che un disegno a tratto non garantisce.
export default function ChefHat({
  color = 'currentColor', size = 46, className, soft = false,
}: {
  color?: string
  size?: number
  className?: string
  /** Tavolo libero: stessa forma, tinta più tenue. */
  soft?: boolean
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 0.92}
      viewBox="0 0 64 59"
      aria-hidden="true"
      focusable="false"
    >
      <g fill={color} fillOpacity={soft ? 0.42 : 1}>
        <circle cx="19" cy="24" r="12.5" />
        <circle cx="45" cy="24" r="12.5" />
        <circle cx="32" cy="17" r="14" />
        <rect x="14" y="30" width="36" height="26" rx="5" />
      </g>
      {/* Pieghe della fascia, in negativo */}
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity={soft ? 0.95 : 0.9}>
        <path d="M24 35v17M32 35v17M40 35v17" />
      </g>
    </svg>
  )
}
