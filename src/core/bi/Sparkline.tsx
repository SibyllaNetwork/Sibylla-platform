import React, { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { ANIM, reducedMotion, series as seriesColor } from './chartTheme'

// ─── SPARKLINE ──────────────────────────────────────────────────────────────────
//  Micro-andamento senza assi né etichette, per le KPI: dice "sta salendo o
//  scendendo", non i valori esatti (quelli sono nel numero accanto).
//  L'area ha un gradiente che sfuma verso la superficie e la linea si disegna in
//  ingresso; con "riduci animazioni" appare statica.

let uid = 0

export interface SparklineProps {
  values: number[]
  /** Colore della linea: default slot 1 della palette categoriale. */
  color?: string
  height?: number
  /** Ritardo d'ingresso (per l'effetto a cascata su una fila di KPI). */
  delay?: number
  className?: string
}

export default function Sparkline({
  values, color = seriesColor(0), height = 40, delay = 0, className,
}: SparklineProps) {
  const gid = useMemo(() => `spark-grad-${++uid}`, [])
  const data = useMemo(() => values.map((v, i) => ({ i, v })), [values])
  const still = reducedMotion()

  return (
    <div className={className} aria-hidden="true">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gid})`}
            dot={false}
            isAnimationActive={!still}
            animationBegin={delay}
            animationDuration={ANIM.duration}
            animationEasing={ANIM.easing}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
