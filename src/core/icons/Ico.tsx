// ─── ICO ──────────────────────────────────────────────────────────────────────
// Wrapper icone UI generiche — Font Awesome Pro (Kit JS)
//
// API:
//   <Ico n="home" s={20} c="#fff" />
//   <Ico n="bell" s={20} c="#204769" c2="#5C9CD4" />   ← duotone colori custom
//
// Props:
//   n  — nome icona (vedi FA_MAP)
//   s  — dimensione px (default 20)
//   c  — colore primario (default #fff)
//   c2 — colore secondario duotone (opzionale)
//   w  — weight: 'duotone'|'light'|'regular'|'solid'|'thin' (default 'duotone')

import React from 'react'

type IcoWeight = 'duotone' | 'light' | 'regular' | 'solid' | 'thin'

interface IcoProps {
  n:   string
  s?:  number
  c?:  string
  c2?: string
  w?:  IcoWeight
}

const FA_MAP: Record<string, string> = {
  'home':     'fa-house',
  'back':     'fa-chevron-left',
  'chevd':    'fa-chevron-down',
  'chevr':    'fa-chevron-right',
  'menu':     'fa-bars',
  'search':   'fa-magnifying-glass',
  'edit':     'fa-pen-to-square',
  'trash':    'fa-trash',
  'plus':     'fa-circle-plus',
  'check':    'fa-check',
  'x':        'fa-xmark',
  'upload':   'fa-arrow-up-from-bracket',
  'refresh':  'fa-rotate-right',
  'save':     'fa-floppy-disk',
  'user':     'fa-user',
  'profile':  'fa-circle-user',
  'logout':   'fa-arrow-right-from-bracket',
  'org':      'fa-sitemap',
  'bell':     'fa-bell',
  'alert':    'fa-triangle-exclamation',
  'gear':     'fa-gear',
  'wheel':    'fa-compass',
  'bar':      'fa-chart-column',
  'cart':     'fa-cart-shopping',
  'camera':   'fa-camera',
  'image':    'fa-image',
  'lock':     'fa-lock',
  'unlock':   'fa-lock-open',
  'eye':      'fa-eye',
  'eye-off':  'fa-eye-slash',
  'copy':     'fa-copy',
  'link':     'fa-link',
  'download': 'fa-download',
  'filter':   'fa-filter',
  'sort':     'fa-sort',
  'star':     'fa-star',
  'flag':     'fa-flag',
  'print':    'fa-print',
  'share':    'fa-share-nodes',
  'info':     'fa-circle-info',
  'question': 'fa-circle-question',
  'expand':   'fa-expand',
  'dots':     'fa-ellipsis',
  'dots-v':   'fa-ellipsis-vertical',
  'eraser':   'fa-eraser',
  'send':     'fa-paper-plane',
  'tag':      'fa-tag',
  'calendar': 'fa-calendar-days',
  'clock':    'fa-clock',
  'hourglass': 'fa-hourglass-half',
  'infinity': 'fa-infinity',
  'landmark': 'fa-landmark',
  'minus-circle': 'fa-circle-minus',
  'battery-empty': 'fa-battery-empty',
  'battery-low':   'fa-battery-quarter',
  'battery-mid':   'fa-battery-half',
  'battery-high':  'fa-battery-three-quarters',
  'battery-full':  'fa-battery-full',
  'cloud-sun': 'fa-cloud-sun',
  'phone':    'fa-phone',
  'email':    'fa-envelope',
  'globe':    'fa-globe',
  'headset':  'fa-headset',
  'database': 'fa-database',
  'layers':   'fa-layer-group',
  'power':    'fa-power-off',
  // Icone aggiuntive post-migrazione
  'dollar':      'fa-dollar-sign',
  'minus':       'fa-minus',
  'chart-line':  'fa-chart-line',
  'heartbeat':   'fa-wave-square',
  'file':        'fa-file-lines',
  'book':        'fa-book-open',
  'archive':     'fa-box-archive',
  'briefcase':   'fa-briefcase',
  'arrow-right': 'fa-arrow-right',
  'sliders':     'fa-sliders',
  'medal':       'fa-trophy',
  'mobile':      'fa-mobile-screen',
  'grid':        'fa-table-cells-large',
  'map-pin':     'fa-location-dot',
  'chevu':       'fa-chevron-up',
  'server':      'fa-server',
  'hotel':       'fa-hotel',
  'bed':         'fa-bed-front',
  'building':    'fa-building',
  'store':       'fa-store',
  'utensils':    'fa-utensils',
  'apartment':   'fa-building-user',
  'qrcode':      'fa-qrcode',
  'sliders-alt': 'fa-sliders',
  'house-pen':   'fa-house',
  'building-circle': 'fa-building-circle-check',
  'arrows-rotate':   'fa-arrows-rotate',
  'concierge-bell':  'fa-bell-concierge',
  'list-check':      'fa-list-check',
  'leaf':            'fa-leaf',
  'recycle':         'fa-recycle',
  'trend-up':        'fa-arrow-trend-up',
  'trend-down':      'fa-arrow-trend-down',
  'gauge':           'fa-gauge-high',
  'bullseye':        'fa-bullseye',
}

export default function Ico({ n, s = 20, c = '#fff', c2, w = 'duotone' }: IcoProps) {
  const faName = FA_MAP[n]

  if (!faName) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Ico] icona non trovata: "${n}" — aggiungi a FA_MAP in Ico.tsx`)
    }
    return <i className={`fa-${w} fa-circle-dot`} style={{ fontSize: s, color: c }} />
  }

  const duotoneVars = c2 && w === 'duotone' ? {
    '--fa-primary-color':   c,
    '--fa-secondary-color': c2,
  } as React.CSSProperties : {}

  return (
    <i
      className={`fa-${w} ${faName}`}
      style={{ fontSize: s, color: c, flexShrink: 0, ...duotoneVars }}
    />
  )
}
