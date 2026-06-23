import React, { useState, useCallback } from 'react'
import GiornaleImpresaPeek from '../GiornaleImpresaPeek/GiornaleImpresaPeek'
import Timone from '../Timone/Timone'
import './HomePage.sass'

// ── Componente ───────────────────────────────────────────────────────────────
export default function HomePage({ navigate }: { navigate: (p: string) => void }) {
  const [waveAnim, setWaveAnim] = useState(false)

  const triggerWave = useCallback(() => {
    setWaveAnim(false)
    requestAnimationFrame(() => setWaveAnim(true))
    setTimeout(() => setWaveAnim(false), 2200)
  }, [])

  return (
    <div className="home">
      <GiornaleImpresaPeek navigate={navigate} />
      <div className="home__hero">
        <div className="home__hero-content">
          <Timone />
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
