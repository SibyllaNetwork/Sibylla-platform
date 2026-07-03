// ─── GhostIcon ────────────────────────────────────────────────────────────────
// Icona "ghost" di Font Awesome (Free 7.3.0) come SVG inline: scala col font-size
// (width/height 1em) ed eredita il colore (fill: currentColor). Usata per il
// blocco fantasma del Planner (freccia + indicatori camera).

import React from 'react'

interface Props {
  className?: string
  title?: string
}

export default function GhostIcon({ className, title }: Props) {
  return (
    <svg
      className={className}
      width="1em"
      height="1em"
      viewBox="0 0 384 512"
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <path d="M40.1 467.1l-11.2 9C25.7 478.6 21.8 480 17.8 480 8 480 0 472 0 462.2L0 192C0 86 86 0 192 0S384 86 384 192l0 270.2c0 9.8-8 17.8-17.8 17.8-4 0-7.9-1.4-11.1-3.9l-11.2-9c-13.4-10.7-32.8-9-44.1 3.9L269.3 506c-3.3 3.8-8.2 6-13.3 6s-9.9-2.2-13.3-6l-26.6-30.5c-12.7-14.6-35.4-14.6-48.2 0L141.3 506c-3.3 3.8-8.2 6-13.3 6s-9.9-2.2-13.3-6L84.2 471c-11.3-12.9-30.7-14.6-44.1-3.9z M160 192a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z m96 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z" />
    </svg>
  )
}
