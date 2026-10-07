import React, { useEffect, useState } from 'react'
import GiornaleImpresaPeek from '../GiornaleImpresaPeek/GiornaleImpresaPeek'
import Timone from '../Timone/Timone'
import HomeDashboardTO from '../HomeDashboardTO/HomeDashboardTO'
import { HomeToQuickLinks, HomeToSwitch } from '../HomeToLinks/HomeToLinks'
import { useHomeToView, useIsTourOperator } from '../HomeToLinks/useHomeToView'
import './HomePage.sass'

// Onda di sfondo: pattern "gentle wave" — un unico path riusato 4 volte via
// <use> a quote diverse; stesso blu Sibylla (#204769) ad alpha differenziati,
// tutti in scorrimento orizzontale sinistra→destra ma sfalsati (durate/fasi
// diverse) → parallasse continuo. Stili e alpha in HomePage.sass.
//
// Riproduzione: l'animazione scorre per 4s dal caricamento, poi si BLOCCA.
// Tenendo premuto il mouse sullo sfondo riprende; al rilascio si riferma.

// ── Componente ───────────────────────────────────────────────────────────────
// I Tour Operator hanno due versioni della Home (timone / dashboard) con un
// link per passare dall'una all'altra; gli altri profili vedono solo il timone.
export default function HomePage({ navigate }: { navigate: (p: string) => void }) {
  const isTO = useIsTourOperator()
  const [toView, setToView] = useHomeToView()
  if (isTO && toView === 'dashboard') {
    return <HomeDashboardTO navigate={navigate} onSwitch={setToView} />
  }
  return <HomeTimone navigate={navigate} isTO={isTO} onSwitch={setToView} />
}

function HomeTimone({ navigate, isTO, onSwitch }: {
  navigate: (p: string) => void
  isTO: boolean
  onSwitch: (v: 'timone' | 'dashboard') => void
}) {
  const [initialPlay, setInitialPlay] = useState(true)
  const [pressing, setPressing] = useState(false)

  // Fase iniziale: 4s di scorrimento dal caricamento, poi stop.
  useEffect(() => {
    const t = setTimeout(() => setInitialPlay(false), 4000)
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

  // Il mouse-down muove le onde SOLO se premuto sullo sfondo: se parte dal
  // timone (o dai suoi pulsanti) non deve avviare l'animazione.
  const onHeroMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.home__hero-content, .home__to-bar')) return
    setPressing(true)
  }

  return (
    <div className="home">
      <GiornaleImpresaPeek navigate={navigate} />
      <div className={`home__hero${isTO ? ' home__hero--to' : ''}`} onMouseDown={onHeroMouseDown}>
        {isTO && (
          <div className="home__to-bar">
            <HomeToSwitch view="timone" onSwitch={onSwitch} />
            <HomeToQuickLinks navigate={navigate} tone="hero" />
          </div>
        )}
        <div className="home__hero-content">
          <Timone navigate={navigate} variant={isTO ? 'to' : 'hotel'} />
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
