import React, { useMemo, useState, useCallback } from 'react'
import MENU from '../../../navigation/menu'
import './HomePage.sass'

// ── Mappa moduli attivi → file WebM ─────────────────────────────────────────
const MODULE_KEYS: Record<string, string> = {
  sales:    'sales',
  operation:'operation',
  purchasing:'purchasing',
  'human-resources': 'human',
  finance:  'finance',
}

const AVAILABLE: string[] = [
  'finance','finance_human','finance_operation','finance_purchasing',
  'finance_sales','finance_sales_operation','finance_sales_operation_purchasing',
  'human','human_finance','human_finance_sales','human_finance_sales_operation',
  'human_operation','human_purchasing','human_sales',
  'operation_purchasing','operation_purchasing_human','operation_purchasing_human_finance',
  'purchasing','purchasing_finance','purchasing_human','purchasing_human_finance',
  'purchasing_human_finance_sales','purchasing_operation','purchasing_sales',
  'sales','sales_finance','sales_human','sales_operation',
  'sales_operation_purchasing','sales_operation_purchasing_human','sales_purchasing',
]

function getTimoneFile(activeModuleIds: string[]): string | null {
  const keys = activeModuleIds
    .map(id => MODULE_KEYS[id])
    .filter(Boolean)
    .sort()

  if (keys.length === 0) return null

  const keySet = new Set(keys)
  const match = AVAILABLE.find(combo => {
    const parts = combo.split('_')
    if (parts.length !== keys.length) return false
    return parts.every(p => keySet.has(p))
  })

  return match ? `/timoni/timone_${match}.webm` : null
}

// ── Componente ───────────────────────────────────────────────────────────────
export default function HomePage({ navigate }: { navigate: (p: string) => void }) {
  const impresa = (MENU as any[]).find((m: any) => m.id === 'impresa')
  const activeModules = impresa?.children?.map((m: any) => m.id) ?? []
  const timoneUrl = useMemo(() => getTimoneFile(activeModules), [activeModules])
  const [waveAnim, setWaveAnim] = useState(false)

  const triggerWave = useCallback(() => {
    setWaveAnim(false)
    requestAnimationFrame(() => setWaveAnim(true))
    setTimeout(() => setWaveAnim(false), 2200)
  }, [])

  return (
    <div className="home">
      <div className="home__hero">
        <div className="home__hero-content">
          {timoneUrl ? (
            <video
              className="home__timone"
              src={timoneUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <div className="home__timone-placeholder">
              <i className="fa-duotone fa-dharmachakra text-[80px] text-primary opacity-30" aria-hidden="true"/>
            </div>
          )}
        </div>
        <div className={`home__wave ${waveAnim ? 'home__wave--animate' : ''}`} onClick={triggerWave}>
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,120 C240,60 480,160 720,110 C960,60 1200,140 1440,100 L1440,200 L0,200 Z" fill="#2C4A63" opacity="0.5"/>
            <path d="M0,140 C300,80 600,170 900,120 C1100,90 1300,150 1440,130 L1440,200 L0,200 Z" fill="#204769" opacity="0.8"/>
            <path d="M0,160 C360,110 720,180 1080,140 C1200,130 1350,160 1440,150 L1440,200 L0,200 Z" fill="#1a3a56"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
