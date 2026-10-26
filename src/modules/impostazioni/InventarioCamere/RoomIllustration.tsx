import React from 'react'
import './RoomIllustration.sass'

// ─── Illustrazione della tipologia camera ─────────────────────────────────────
//  Disegno al tratto (frontale) su fondo pastello, composto da primitive SVG:
//  letti, comodini, quadro, divano, castello, sedia a rotelle. Con letti extra
//  la scena si restringe e a destra compare la brandina pieghevole.

const INK = '#33414f'
const PAPER = '#ffffff'
const F = 104 // linea del pavimento

const PALETTE: Record<string, [string, string]> = {
  Singola:      ['#dfeaf8', '#c4d8f0'],
  Doppia:       ['#fbe6d4', '#f3c9a6'],
  Twin:         ['#dcf1e6', '#b8e0ca'],
  Matrimoniale: ['#f9dfe4', '#efbcc6'],
  Tripla:       ['#fdebd3', '#f5cf9c'],
  Quadrupla:    ['#e2eedb', '#c3dcb4'],
  Family:       ['#dfe6ef', '#bccbdd'],
  Suite:        ['#e8e2f6', '#cfc3ee'],
  Accessibile:  ['#e1edf5', '#bcd6e8'],
  DUS:          ['#ece4f5', '#d6c6ea'],
}

const line = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

function Picture({ cx, tint }: { cx: number; tint: string }) {
  return (
    <g {...line}>
      <rect x={cx - 17} y={14} width={34} height={22} rx={1.5} fill={PAPER} />
      <path d={`M${cx - 13} 32 L${cx - 5} 23 L${cx} 28 L${cx + 6} 20 L${cx + 13} 32 Z`} fill={tint} strokeWidth={1.2} />
    </g>
  )
}

function Bed({ x, w, pillows, tint }: { x: number; w: number; pillows: number; tint: string }) {
  const pw = pillows === 1 ? w * 0.5 : w * 0.36
  const px = pillows === 1 ? [x + (w - pw) / 2] : [x + w * 0.1, x + w * 0.9 - pw]
  return (
    <g {...line}>
      <rect x={x} y={F - 48} width={w} height={34} rx={3} fill={PAPER} />
      {px.map((p, i) => <rect key={i} x={p} y={F - 37} width={pw} height={9} rx={3} fill={PAPER} />)}
      <rect x={x - 4} y={F - 28} width={w + 8} height={18} rx={3} fill={PAPER} />
      <path d={`M${x - 4} ${F - 21} H${x + w + 4} V${F - 13} a3 3 0 0 1 -3 3 H${x - 1} a3 3 0 0 1 -3 -3 Z`} fill={tint} />
      <path d={`M${x - 1} ${F - 10} V${F} M${x + w + 1} ${F - 10} V${F}`} />
    </g>
  )
}

function Nightstand({ x, tint }: { x: number; tint: string }) {
  return (
    <g {...line}>
      <rect x={x} y={F - 20} width={18} height={20} rx={1.5} fill={PAPER} />
      <path d={`M${x} ${F - 11} H${x + 18}`} />
      <path d={`M${x + 9} ${F - 20} V${F - 29}`} />
      <path d={`M${x + 4} ${F - 29} H${x + 14} L${x + 12} ${F - 38} H${x + 6} Z`} fill={tint} />
    </g>
  )
}

function Bench({ x, w }: { x: number; w: number }) {
  return (
    <g {...line}>
      <rect x={x} y={F - 9} width={w} height={5} rx={2} fill={PAPER} />
      <path d={`M${x + 3} ${F - 4} V${F} M${x + w - 3} ${F - 4} V${F}`} />
    </g>
  )
}

function Bunk({ x, tint }: { x: number; tint: string }) {
  const w = 42
  return (
    <g {...line}>
      <path d={`M${x} ${F - 66} V${F} M${x + w} ${F - 66} V${F}`} />
      {[F - 52, F - 20].map((y) => (
        <g key={y}>
          <rect x={x + 6} y={y - 6} width={14} height={6} rx={2} fill={PAPER} />
          <rect x={x} y={y} width={w} height={10} rx={2} fill={PAPER} />
          <path d={`M${x} ${y + 5} H${x + w}`} />
          <rect x={x + 20} y={y} width={w - 20} height={5} fill={tint} strokeWidth={0} />
        </g>
      ))}
      <path d={`M${x + w - 10} ${F - 42} V${F - 20} M${x + w - 2} ${F - 42} V${F - 20} M${x + w - 10} ${F - 35} H${x + w - 2} M${x + w - 10} ${F - 28} H${x + w - 2}`} strokeWidth={1.2} />
    </g>
  )
}

function Teddy({ x, tint }: { x: number; tint: string }) {
  return (
    <g {...line} fill={tint} strokeWidth={1.3}>
      <circle cx={x - 4} cy={F - 21} r={2.5} /><circle cx={x + 4} cy={F - 21} r={2.5} />
      <circle cx={x} cy={F - 17} r={5} />
      <ellipse cx={x} cy={F - 6} rx={6.5} ry={6} />
    </g>
  )
}

function Sofa({ x, w, tint }: { x: number; w: number; tint: string }) {
  return (
    <g {...line}>
      <rect x={x + 6} y={F - 42} width={w - 12} height={22} rx={4} fill={PAPER} />
      <rect x={x + 8} y={F - 26} width={w - 16} height={12} rx={3} fill={tint} />
      <rect x={x} y={F - 34} width={10} height={24} rx={3} fill={PAPER} />
      <rect x={x + w - 10} y={F - 34} width={10} height={24} rx={3} fill={PAPER} />
      <path d={`M${x + 2} ${F - 10} V${F - 4} M${x + w - 2} ${F - 10} V${F - 4}`} />
    </g>
  )
}

function CoffeeTable({ cx }: { cx: number }) {
  return (
    <g {...line}>
      <ellipse cx={cx} cy={F - 10} rx={16} ry={3.5} fill={PAPER} />
      <path d={`M${cx} ${F - 7} V${F} M${cx - 6} ${F} H${cx + 6}`} />
    </g>
  )
}

function FloorLamp({ x, tint }: { x: number; tint: string }) {
  return (
    <g {...line}>
      <path d={`M${x} ${F} V${F - 50} M${x - 6} ${F} H${x + 6}`} />
      <path d={`M${x - 7} ${F - 50} H${x + 7} L${x + 4} ${F - 62} H${x - 4} Z`} fill={tint} />
    </g>
  )
}

function Door({ x }: { x: number }) {
  return (
    <g {...line}>
      <rect x={x} y={F - 74} width={30} height={74} fill={PAPER} />
      <circle cx={x + 24} cy={F - 36} r={1.6} fill={INK} />
    </g>
  )
}

function GrabBar({ x, y, w }: { x: number; y: number; w: number }) {
  return <path {...line} strokeWidth={2.4} d={`M${x} ${y} H${x + w} M${x + 2} ${y} V${y - 4} M${x + w - 2} ${y} V${y - 4}`} />
}

function Wheelchair({ x, tint }: { x: number; tint: string }) {
  return (
    <g {...line}>
      <circle cx={x + 12} cy={F - 13} r={13} fill={PAPER} />
      <circle cx={x + 12} cy={F - 13} r={9} fill={tint} />
      <circle cx={x + 36} cy={F - 4} r={4} fill={PAPER} />
      <path d={`M${x + 4} ${F - 52} V${F - 24} H${x + 30} L${x + 36} ${F - 8} M${x + 4} ${F - 52} H${x - 2} M${x + 12} ${F - 34} H${x + 32} V${F - 24}`} fill="none" />
    </g>
  )
}

// Brandina pieghevole (letto extra) in fondo a destra.
function Rollaway({ x, tint }: { x: number; tint: string }) {
  const w = 30
  return (
    <g {...line}>
      <rect x={x + 4} y={F - 38} width={w - 8} height={20} rx={3} fill={PAPER} />
      <rect x={x + 8} y={F - 30} width={w - 16} height={6} rx={2} fill={PAPER} />
      <rect x={x} y={F - 22} width={w} height={10} rx={2} fill={tint} />
      <path d={`M${x + 3} ${F - 12} L${x + w - 3} ${F - 4} M${x + w - 3} ${F - 12} L${x + 3} ${F - 4}`} strokeWidth={1.2} />
      <circle cx={x + 3} cy={F - 2} r={2} fill={PAPER} /><circle cx={x + w - 3} cy={F - 2} r={2} fill={PAPER} />
    </g>
  )
}

function Scena({ tipo, tint }: { tipo: string; tint: string }) {
  switch (tipo) {
    case 'Singola':
      return <><Picture cx={92} tint={tint} /><Nightstand x={34} tint={tint} /><Bed x={68} w={48} pillows={1} tint={tint} /></>
    case 'Twin':
      return <><Picture cx={100} tint={tint} /><Bed x={26} w={44} pillows={1} tint={tint} /><Nightstand x={91} tint={tint} /><Bed x={130} w={44} pillows={1} tint={tint} /></>
    case 'Tripla':
      return <><Picture cx={58} tint={tint} /><Bed x={22} w={70} pillows={2} tint={tint} /><Nightstand x={104} tint={tint} /><Bed x={138} w={44} pillows={1} tint={tint} /></>
    case 'Quadrupla':
      return <><Picture cx={100} tint={tint} /><Bed x={14} w={64} pillows={2} tint={tint} /><Nightstand x={91} tint={tint} /><Bed x={122} w={64} pillows={2} tint={tint} /></>
    case 'Family':
      return <><Picture cx={64} tint={tint} /><Nightstand x={6} tint={tint} /><Bed x={34} w={64} pillows={2} tint={tint} /><Teddy x={120} tint={tint} /><Bunk x={138} tint={tint} /></>
    case 'Suite':
      return <><Picture cx={74} tint={tint} /><Sofa x={28} w={92} tint={tint} /><CoffeeTable cx={74} /><FloorLamp x={136} tint={tint} /><Door x={154} /></>
    case 'Accessibile':
      return <><GrabBar x={22} y={46} w={40} /><Bed x={30} w={56} pillows={1} tint={tint} /><GrabBar x={102} y={52} w={20} /><Wheelchair x={128} tint={tint} /></>
    case 'Matrimoniale':
      return <><Picture cx={100} tint={tint} /><Nightstand x={30} tint={tint} /><Bed x={60} w={80} pillows={2} tint={tint} /><Bench x={74} w={52} /><Nightstand x={152} tint={tint} /></>
    default: // Doppia, DUS
      return <><Picture cx={100} tint={tint} /><Nightstand x={30} tint={tint} /><Bed x={60} w={80} pillows={2} tint={tint} /><Nightstand x={152} tint={tint} /></>
  }
}

export default function RoomIllustration({ tipo, lettiExtra = 0, className }: { tipo: string; lettiExtra?: number; className?: string }) {
  const [bg, tint] = PALETTE[tipo] ?? PALETTE.Doppia
  const s = 0.8 // con letto extra la scena si restringe tenendo il pavimento
  return (
    <svg className={'room-ill' + (className ? ` ${className}` : '')} viewBox="0 0 200 120" role="img" aria-label={`Camera ${tipo}`}>
      <rect width="200" height="120" fill={bg} />
      <path d={`M0 ${F} H200`} stroke={INK} strokeWidth={1.2} opacity={0.35} />
      {lettiExtra > 0 ? (
        <>
          <g transform={`translate(0 ${F * (1 - s)}) scale(${s})`}><Scena tipo={tipo} tint={tint} /></g>
          <Rollaway x={164} tint={tint} />
          {lettiExtra > 1 && <text x={179} y={F - 46} textAnchor="middle" className="room-ill__more" fill={INK}>×{lettiExtra}</text>}
        </>
      ) : <Scena tipo={tipo} tint={tint} />}
    </svg>
  )
}
