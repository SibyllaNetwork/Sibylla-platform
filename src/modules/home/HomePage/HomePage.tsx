import React, { useEffect, useState } from 'react'
import GiornaleImpresaPeek from '../GiornaleImpresaPeek/GiornaleImpresaPeek'
import Timone from '../Timone/Timone'
import './HomePage.sass'

// Onda di sfondo: pattern "gentle wave" — un unico path riusato 4 volte via
// <use> a quote diverse; stesso blu Sibylla (#204769) ad alpha differenziati,
// tutti in scorrimento orizzontale sinistra→destra ma sfalsati (durate/fasi
// diverse) → parallasse continuo. Stili e alpha in HomePage.sass.
//
// Riproduzione: l'animazione scorre per 3s dal caricamento, poi si BLOCCA.
// Tenendo premuto il mouse sullo sfondo riprende; al rilascio si riferma.

// ── Componente ───────────────────────────────────────────────────────────────
export default function HomePage({ navigate }: { navigate: (p: string) => void }) {
  const [initialPlay, setInitialPlay] = useState(true)
  const [pressing, setPressing] = useState(false)

  // Fase iniziale: 3s di scorrimento dal caricamento, poi stop.
  useEffect(() => {
    const t = setTimeout(() => setInitialPlay(false), 3000)
    return () => clearTimeout(t)
  }, [])

  // Rilascio del click ovunque → riferma (anche se il mouse esce dallo sfondo).
  useEffect(() => {
    if (!pressing) return
    const up = () => setPressing(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [pressing])

  const wavesRunning = initialPlay || pressing

  return (
    <div className="home">
      <GiornaleImpresaPeek navigate={navigate} />
      <div className="home__hero" onMouseDown={() => setPressing(true)}>
        <div className="home__hero-content">
          <Timone navigate={navigate} />
        </div>
        <div className="home__wave" aria-hidden="true">
          <svg
            className="home__waves"
            viewBox="0 24 150 28"
            preserveAspectRatio="none"
            shapeRendering="auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <path
                id="gentle-wave"
                d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
              />
            </defs>
            <g className={`home__waves-parallax${wavesRunning ? '' : ' is-paused'}`}>
              <use href="#gentle-wave" x="48" y="0" />
              <use href="#gentle-wave" x="48" y="3" />
              <use href="#gentle-wave" x="48" y="5" />
              <use href="#gentle-wave" x="48" y="7" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
