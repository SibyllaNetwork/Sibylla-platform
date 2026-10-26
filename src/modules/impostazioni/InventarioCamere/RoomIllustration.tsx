import React from 'react'
import './RoomIllustration.sass'

// ─── Illustrazione della tipologia camera ─────────────────────────────────────
//  Disegno al tratto in prospettiva centrale su fondo pastello: la stanza (parete
//  di fondo, pareti laterali, pavimento) e i mobili come volumi (letti, comodini,
//  divano, castello…), proiettati da coordinate "mondo" con un punto di fuga.
//  X 0..200 sul piano frontale, Y = altezza dal pavimento, Z 0 (davanti) .. 1 (parete).

const INK = '#3a4756'
const PAPER = '#ffffff'
const VP = { x: 100, y: 10 } // punto di fuga
const K = 0.3                // restringimento alla parete di fondo
const H = 120                // altezza del riquadro

const PALETTE: Record<string, [string, string]> = {
  Singola:      ['#dde9f8', '#bcd3f0'],
  Doppia:       ['#fbe5d2', '#f2c59f'],
  Twin:         ['#dbf0e4', '#b3dcc5'],
  Matrimoniale: ['#f9dde3', '#eeb7c3'],
  Tripla:       ['#fde9d0', '#f4cc95'],
  Quadrupla:    ['#e0ecd8', '#bed8ae'],
  Family:       ['#dde4ee', '#b7c7db'],
  Suite:        ['#e7e0f6', '#cbbfee'],
  Accessibile:  ['#dfebf4', '#b7d2e6'],
  DUS:          ['#ebe2f5', '#d3c2ea'],
}

type Pt = [number, number]
const p = (x: number, y: number, z: number): Pt => {
  const s = 1 - K * z
  return [VP.x + (x - VP.x) * s, VP.y + (H - y - VP.y) * s]
}
const pts = (...ps: Pt[]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
const stroke = { stroke: INK, strokeWidth: 1.1, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

// Parallelepipedo: facce visibili (fianco verso il centro, sopra, fronte).
function Box({ x0, x1, y0, y1, z0, z1, fill = PAPER, top }: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; fill?: string; top?: string }) {
  const side = x1 <= VP.x ? x1 : x0 >= VP.x ? x0 : null
  return (
    <g {...stroke}>
      {side !== null && <polygon points={pts(p(side, y0, z0), p(side, y0, z1), p(side, y1, z1), p(side, y1, z0))} fill={fill} />}
      <polygon points={pts(p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1))} fill={top ?? fill} />
      <polygon points={pts(p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0))} fill={fill} />
    </g>
  )
}

const Line = ({ a, b, w }: { a: Pt; b: Pt; w?: number }) => <line {...stroke} strokeWidth={w ?? 1.1} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />

// Le pareti proseguono oltre il bordo alto (TOP < 0): se il riquadro è più alto
// della scena (riga con dettagli aperti) si vede più parete, senza ingrandire.
const TOP = -400
function Room({ bg, tint }: { bg: string; tint: string }) {
  const [lx, ly] = p(0, 0, 1)
  const [rx, ry] = p(200, 0, 1)
  return (
    <g>
      <rect y={TOP} width={200} height={H - TOP} fill={bg} />
      <polygon points={pts(p(0, 0, 0), p(200, 0, 0), p(200, 0, 1), p(0, 0, 1))} fill={tint} opacity={0.45} />
      <polygon points={pts(p(0, 0, 0), [lx, ly], [lx, TOP], [0, TOP])} fill={PAPER} opacity={0.35} />
      <polygon points={pts(p(200, 0, 0), [rx, ry], [rx, TOP], [200, TOP])} fill={PAPER} opacity={0.35} />
      <g stroke={INK} strokeWidth={0.8} opacity={0.3} fill="none">
        <polyline points={pts(p(0, 0, 0), [lx, ly], [rx, ry], p(200, 0, 0))} />
        <line x1={lx} y1={ly} x2={lx} y2={TOP} />
        <line x1={rx} y1={ry} x2={rx} y2={TOP} />
      </g>
    </g>
  )
}

function Picture({ cx, tint, y = 62, w = 30 }: { cx: number; tint: string; y?: number; w?: number }) {
  const [x0, y0] = p(cx - w / 2, y + w * 0.62, 1)
  const [x1, y1] = p(cx + w / 2, y, 1)
  const iw = x1 - x0, ih = y1 - y0
  return (
    <g {...stroke}>
      <rect x={x0} y={y0} width={iw} height={ih} fill={PAPER} />
      <rect x={x0 + 2.5} y={y0 + 2.5} width={iw - 5} height={ih - 5} fill={PAPER} strokeWidth={0.7} />
      <path d={`M${x0 + 4} ${y1 - 4} L${x0 + iw * 0.35} ${y0 + ih * 0.42} L${x0 + iw * 0.52} ${y0 + ih * 0.62} L${x0 + iw * 0.7} ${y0 + ih * 0.35} L${x1 - 4} ${y1 - 4} Z`} fill={tint} strokeWidth={0.8} />
    </g>
  )
}

function Bed({ x0, x1, pillows, tint, len = 0.62 }: { x0: number; x1: number; pillows: number; tint: string; len?: number }) {
  const zf = 1 - len
  const w = x1 - x0
  const pw = pillows === 1 ? w * 0.5 : w * 0.38
  const px = pillows === 1 ? [x0 + (w - pw) / 2] : [x0 + w * 0.08, x1 - w * 0.08 - pw]
  return (
    <g>
      <Box x0={x0} x1={x1} y0={0} y1={44} z0={0.96} z1={1} />
      <Line a={p(x0 - 1, 0, zf)} b={p(x0 - 1, 4, zf)} w={1.6} />
      <Line a={p(x1 + 1, 0, zf)} b={p(x1 + 1, 4, zf)} w={1.6} />
      <Box x0={x0 - 2} x1={x1 + 2} y0={4} y1={13} z0={zf} z1={0.96} />
      <Box x0={x0} x1={x1} y0={13} y1={22} z0={zf} z1={0.96} />
      {px.map((x, i) => <Box key={i} x0={x} x1={x + pw} y0={22} y1={27} z0={0.82} z1={0.93} />)}
      <Box x0={x0 - 1} x1={x1 + 1} y0={11} y1={23.5} z0={zf - 0.01} z1={zf + len * 0.62} fill={tint} />
    </g>
  )
}

function Nightstand({ x0, tint, w = 18 }: { x0: number; tint: string; w?: number }) {
  const cx = x0 + w / 2, z = 0.91
  return (
    <g>
      <Box x0={x0} x1={x0 + w} y0={0} y1={18} z0={0.82} z1={1} />
      <Line a={p(x0, 10, 0.82)} b={p(x0 + w, 10, 0.82)} w={0.8} />
      <Line a={p(cx, 18, z)} b={p(cx, 29, z)} />
      <polygon {...stroke} points={pts(p(cx - 6, 29, z), p(cx + 6, 29, z), p(cx + 4, 38, z), p(cx - 4, 38, z))} fill={tint} />
    </g>
  )
}

function Bench({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  return (
    <g>
      <Line a={p(x0 + 3, 0, z)} b={p(x0 + 3, 6, z)} w={1.4} />
      <Line a={p(x1 - 3, 0, z)} b={p(x1 - 3, 6, z)} w={1.4} />
      <Box x0={x0} x1={x1} y0={6} y1={11} z0={z} z1={z + 0.1} />
    </g>
  )
}

function Bunk({ x0, x1, tint }: { x0: number; x1: number; tint: string }) {
  const zf = 0.45
  return (
    <g>
      <Line a={p(x0, 0, 1)} b={p(x0, 64, 1)} /><Line a={p(x1, 0, 1)} b={p(x1, 64, 1)} />
      {[6, 38].map((y) => (
        <g key={y}>
          <Box x0={x0} x1={x1} y0={y} y1={y + 8} z0={zf} z1={0.98} />
          <Box x0={x0 + 8} x1={x1 - 8} y0={y + 8} y1={y + 12} z0={0.86} z1={0.96} />
          <Box x0={x0} x1={x1} y0={y + 6} y1={y + 9} z0={zf - 0.01} z1={0.7} fill={tint} />
        </g>
      ))}
      <Line a={p(x0, 0, zf)} b={p(x0, 64, zf)} w={1.4} /><Line a={p(x1, 0, zf)} b={p(x1, 64, zf)} w={1.4} />
      <Line a={p(x0, 60, zf)} b={p(x1, 60, zf)} />
      <Line a={p(x1 - 12, 14, zf - 0.02)} b={p(x1 - 12, 46, zf - 0.02)} />
      {[22, 30, 38].map((y) => <Line key={y} a={p(x1 - 12, y, zf - 0.02)} b={p(x1, y, zf - 0.02)} w={0.9} />)}
    </g>
  )
}

function Teddy({ x, z, tint }: { x: number; z: number; tint: string }) {
  const [cx, cy] = p(x, 0, z)
  return (
    <g {...stroke} fill={tint} strokeWidth={0.9}>
      <ellipse cx={cx} cy={cy - 5} rx={5.5} ry={5} />
      <circle cx={cx - 3.6} cy={cy - 15} r={2} /><circle cx={cx + 3.6} cy={cy - 15} r={2} />
      <circle cx={cx} cy={cy - 12.5} r={4.2} />
    </g>
  )
}

function Sofa({ x0, x1, tint }: { x0: number; x1: number; tint: string }) {
  const zf = 0.62
  return (
    <g>
      <Box x0={x0} x1={x1} y0={0} y1={34} z0={0.9} z1={0.98} />
      <Box x0={x0 + 9} x1={x1 - 9} y0={0} y1={15} z0={zf} z1={0.9} fill={tint} />
      <Box x0={x0 + 9} x1={(x0 + x1) / 2} y0={15} y1={19} z0={zf} z1={0.9} />
      <Box x0={(x0 + x1) / 2} x1={x1 - 9} y0={15} y1={19} z0={zf} z1={0.9} />
      <Box x0={x0} x1={x0 + 9} y0={0} y1={24} z0={zf} z1={0.98} />
      <Box x0={x1 - 9} x1={x1} y0={0} y1={24} z0={zf} z1={0.98} />
    </g>
  )
}

function CoffeeTable({ cx, z }: { cx: number; z: number }) {
  return (
    <g>
      <Line a={p(cx, 0, z + 0.06)} b={p(cx, 10, z + 0.06)} w={1.6} />
      <Box x0={cx - 18} x1={cx + 18} y0={10} y1={12} z0={z} z1={z + 0.14} />
    </g>
  )
}

function FloorLamp({ x, z, tint }: { x: number; z: number; tint: string }) {
  return (
    <g>
      <Line a={p(x, 0, z)} b={p(x, 56, z)} />
      <Line a={p(x - 6, 0, z)} b={p(x + 6, 0, z)} w={1.6} />
      <polygon {...stroke} points={pts(p(x - 8, 56, z), p(x + 8, 56, z), p(x + 5, 68, z), p(x - 5, 68, z))} fill={tint} />
    </g>
  )
}

function Door({ x0 }: { x0: number }) {
  const [a, b] = [p(x0, 70, 1), p(x0 + 28, 0, 1)]
  return (
    <g {...stroke}>
      <rect x={a[0]} y={a[1]} width={b[0] - a[0]} height={b[1] - a[1]} fill={PAPER} />
      <circle cx={b[0] - 3.5} cy={(a[1] + b[1]) / 2} r={1.1} fill={INK} />
    </g>
  )
}

function GrabBar({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  return (
    <g>
      <Line a={p(x0, y, 1)} b={p(x1, y, 1)} w={2.2} />
      <Line a={p(x0 + 2, y, 1)} b={p(x0 + 2, y + 4, 1)} /><Line a={p(x1 - 2, y, 1)} b={p(x1 - 2, y + 4, 1)} />
    </g>
  )
}

function Wheelchair({ x, z, tint }: { x: number; z: number; tint: string }) {
  const [bx, by] = p(x, 0, z)
  return (
    <g {...stroke}>
      <path d={`M${bx - 2} ${by - 44} H${bx + 4} V${by - 22} H${bx + 26} L${bx + 31} ${by - 5} M${bx + 8} ${by - 30} H${bx + 26} V${by - 22}`} fill="none" strokeWidth={1.4} />
      <circle cx={bx + 9} cy={by - 12} r={12} fill={PAPER} />
      <circle cx={bx + 9} cy={by - 12} r={8.5} fill={tint} />
      <circle cx={bx + 9} cy={by - 12} r={1.4} fill={INK} />
      <circle cx={bx + 31} cy={by - 3} r={3} fill={PAPER} />
    </g>
  )
}

// Brandina pieghevole (letto extra) in primo piano a destra.
function Rollaway({ tint }: { tint: string }) {
  const x0 = 156, x1 = 192, z0 = 0.04, z1 = 0.36
  return (
    <g>
      <Box x0={x0} x1={x1} y0={6} y1={24} z0={z1 - 0.03} z1={z1} />
      <Box x0={x0} x1={x1} y0={6} y1={12} z0={z0} z1={z1 - 0.03} />
      <Box x0={x0 + 7} x1={x1 - 7} y0={12} y1={16} z0={z1 - 0.12} z1={z1 - 0.04} />
      <Box x0={x0 - 1} x1={x1 + 1} y0={10} y1={13} z0={z0 - 0.01} z1={z0 + 0.18} fill={tint} />
      {[x0 + 2, x1 - 2].map((x) => {
        const [cx, cy] = p(x, 2.5, z0)
        return <circle key={x} {...stroke} cx={cx} cy={cy} r={2.4} fill={PAPER} />
      })}
      <Line a={p(x0 + 4, 6, z0)} b={p(x1 - 4, 3, z0)} w={0.9} /><Line a={p(x1 - 4, 6, z0)} b={p(x0 + 4, 3, z0)} w={0.9} />
    </g>
  )
}

function Scena({ tipo, tint }: { tipo: string; tint: string }) {
  switch (tipo) {
    case 'Singola':
      return <><Picture cx={98} tint={tint} /><Nightstand x0={42} tint={tint} /><Bed x0={70} x1={122} pillows={1} tint={tint} /><Box x0={150} x1={186} y0={0} y1={72} z0={0.8} z1={1} /></>
    case 'Twin':
      return <><Picture cx={100} tint={tint} /><Bed x0={20} x1={70} pillows={1} tint={tint} /><Nightstand x0={91} tint={tint} /><Bed x0={130} x1={180} pillows={1} tint={tint} /></>
    case 'Tripla':
      return <><Picture cx={58} tint={tint} /><Bed x0={14} x1={100} pillows={2} tint={tint} /><Nightstand x0={108} tint={tint} /><Bed x0={136} x1={186} pillows={1} tint={tint} /></>
    case 'Quadrupla':
      return <><Picture cx={100} tint={tint} /><Bed x0={6} x1={86} pillows={2} tint={tint} /><Nightstand x0={91} tint={tint} /><Bed x0={114} x1={194} pillows={2} tint={tint} /></>
    case 'Family':
      return <><Picture cx={66} tint={tint} /><Nightstand x0={8} tint={tint} /><Bed x0={32} x1={108} pillows={2} tint={tint} /><Bunk x0={138} x1={188} tint={tint} /><Teddy x={124} z={0.32} tint={tint} /></>
    case 'Suite':
      return <><Picture cx={78} tint={tint} /><Door x0={150} /><FloorLamp x={136} z={0.85} tint={tint} /><Sofa x0={24} x1={132} tint={tint} /><CoffeeTable cx={78} z={0.28} /></>
    case 'Accessibile':
      return <><Picture cx={63} tint={tint} y={68} /><GrabBar x0={26} x1={70} y={52} /><GrabBar x0={110} x1={134} y={42} /><Bed x0={30} x1={96} pillows={1} tint={tint} /><Wheelchair x={128} z={0.32} tint={tint} /></>
    case 'Matrimoniale':
      return <><Picture cx={100} tint={tint} w={40} /><Nightstand x0={28} tint={tint} /><Nightstand x0={154} tint={tint} /><Bed x0={52} x1={148} pillows={2} tint={tint} /><Bench x0={64} x1={136} z={0.24} /></>
    default: // Doppia, DUS
      return <><Picture cx={100} tint={tint} /><Nightstand x0={28} tint={tint} /><Nightstand x0={154} tint={tint} /><Bed x0={54} x1={146} pillows={2} tint={tint} /></>
  }
}

// `fill`: riempie il contenitore; la scena resta in scala, ancorata al pavimento.
export default function RoomIllustration({ tipo, lettiExtra = 0, fill, className }: { tipo: string; lettiExtra?: number; fill?: boolean; className?: string }) {
  const [bg, tint] = PALETTE[tipo] ?? PALETTE.Doppia
  return (
    <svg className={'room-ill' + (fill ? ' room-ill--fill' : '') + (className ? ` ${className}` : '')} viewBox={`0 0 200 ${H}`}
      preserveAspectRatio={fill ? 'xMidYMax meet' : undefined} role="img" aria-label={`Camera ${tipo}`}>
      <Room bg={bg} tint={tint} />
      <Scena tipo={tipo} tint={tint} />
      {lettiExtra > 0 && <Rollaway tint={tint} />}
      {lettiExtra > 1 && <text x={174} y={p(174, 30, 0.2)[1]} textAnchor="middle" className="room-ill__more" fill={INK}>×{lettiExtra}</text>}
    </svg>
  )
}
