import React, { useState } from 'react'
import T from '../../../core/tokens'
import Ico from '../../../core/icons/Ico'
import BtnBack from '../../../core/components/BtnBack'
import { SelectField } from '../../../core/components/form'
import './GiornaleImpresa.sass'

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const WDAYS  = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const WDAYS_SHORT = ['D','L','M','M','G','V','S']

// Posizioni delle sfere (%) — sincronizzate con .giornale__node--pN nel .sass
const NODE_POS = [
  { x: 50, y: 6 }, { x: 89, y: 27 }, { x: 89, y: 73 },
  { x: 50, y: 94 }, { x: 11, y: 73 }, { x: 11, y: 27 },
]

// ── Sezioni orbitanti (vista sintetica), ordinate in senso orario dall'alto ──
const ORBIT = [
  { id: 'calendario', label: 'Almanacco',  icon: 'calendar' },
  { id: 'turni',      label: 'Turni',      icon: 'clock'    },
  { id: 'vip',        label: 'Ospiti VIP', icon: 'star'     },
  { id: 'eventi',     label: 'Eventi',     icon: 'bell'     },
  { id: 'numeri',     label: 'I numeri',   icon: 'bar'      },
  { id: 'meteo',      label: 'Meteo',      icon: 'wheel'    },
]

// ── Sezioni riposizionabili (vista estesa) — il primo box (tabella) è escluso ──
const EXT_SECTIONS = ['almanacco', 'meteo', 'eventi', 'turni', 'compleanni'] as const
type ExtId = typeof EXT_SECTIONS[number]

export default function GiornaleImpresa({ navigate }: { navigate: (p: string) => void }) {
  const today     = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  const [struttura, setStruttura] = useState('Hotel Noto')
  const [activeTab, setActiveTab] = useState('panoramica')
  const [viewMode,  setViewMode]  = useState<'sintetica' | 'estesa'>('sintetica')

  // vista sintetica
  const [active, setActive] = useState(0)

  // vista estesa
  const [order, setOrder]       = useState<ExtId[]>([...EXT_SECTIONS])
  const [editMode, setEditMode] = useState(false)
  const [dragId, setDragId]     = useState<ExtId | null>(null)

  const fmtDay = (d: Date) => `${WDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`

  // striscia settimana centrata su oggi (3 giorni prima/dopo)
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d
  })

  const strutture = ['Hotel Noto','Grand Hotel Roma','Villa Bellini','Terrazza sul Mare','Palazzo Storico']
  const tabs = [
    {id:'panoramica',label:'Panoramica impresa'},
    {id:'vendite',   label:'Analisi vendite'},
    {id:'gestione',  label:'Controllo gestione'},
    {id:'acquisti',  label:'Analisi acquisti'},
    {id:'operativa', label:'Analisi operativa'},
    {id:'personale', label:'Analisi del personale'},
  ]

  // Indicatori con valore di ieri e di oggi (tabella unica della vista estesa)
  const statsRows = [
    {label:'Arrivi',          ieri:'12',      oggi:'18'},
    {label:'Partenze',        ieri:'9',       oggi:'14'},
    {label:'Gruppi',          ieri:'40,00%',  oggi:'55,00%'},
    {label:'Individuali',     ieri:'60,00%',  oggi:'45,00%'},
    {label:'Camere',          ieri:'34',      oggi:'41'},
    {label:'Presenze',        ieri:'58',      oggi:'72'},
    {label:'Occupazione',     ieri:'71,00 %', oggi:'85,00 %'},
    {label:'Revenue',         ieri:'4.210 €', oggi:'5.380 €'},
    {label:'Av. Daily Rate',  ieri:'124 €',   oggi:'131 €'},
    {label:'Av. Daily Guest', ieri:'72 €',    oggi:'81 €'},
  ]

  const eventi = [
    'Roma Creativa 365 – Cultura tutto l\'anno',
    'Stagione del Teatro dell\'Opera di Roma',
    'Mostra "Tesori dei Faraoni"',
  ]
  const vip = [
    { nome:'Famiglia Conti',   nota:'Suite Belvedere · check-in 15:00' },
    { nome:'Dott. M. Ferrara', nota:'Late check-out · allergie segnalate' },
    { nome:'Gruppo Aurora',    nota:'Tavolo riservato ristorante 20:30' },
  ]
  const news = [
    {
      cat:'Economia', fonte:'Il Sole 24 Ore', tempo:'2h',
      img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=70&auto=format&fit=crop',
      titolo:'Turismo, presenze in crescita del 6% nel trimestre',
      testo:'Il comparto ricettivo italiano chiude il trimestre con un incremento delle presenze trainato dal turismo internazionale e dall\'allungamento della stagione nelle località costiere.',
    },
    {
      cat:'Trasporti', fonte:'Travel Daily', tempo:'4h',
      img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70&auto=format&fit=crop',
      titolo:'Nuove rotte aeree verso il Sud Italia per l\'estate',
    },
    {
      cat:'Tecnologia', fonte:'HotelMag', tempo:'6h',
      img:'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=400&q=70&auto=format&fit=crop',
      titolo:'Revenue management: l\'AI cambia le tariffe dinamiche',
    },
    {
      cat:'Mercato', fonte:'Largo Consumo', tempo:'8h',
      img:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=70&auto=format&fit=crop',
      titolo:'Food & Beverage, i consumi premium trainano i ricavi',
    },
  ]

  // ── Contenuto dello stage centrale (vista sintetica) ───────────────────────
  function renderStage(id: string) {
    switch (id) {
      case 'calendario':
        return (
          <div className="giornale__cal">
            <div className="giornale__cal-hero">
              <span className="giornale__cal-weekday">{WDAYS[today.getDay()]}</span>
              <span className="giornale__cal-num">{today.getDate()}</span>
              <span className="giornale__cal-monthyear">{MONTHS[today.getMonth()]} {today.getFullYear()}</span>
            </div>
            <div className="giornale__cal-week">
              {weekStrip.map((d, i) => (
                <div key={i} className={`giornale__cal-wday ${d.getDate() === today.getDate() ? 'giornale__cal-wday--today' : ''}`}>
                  <span className="giornale__cal-wday-l">{WDAYS_SHORT[d.getDay()]}</span>
                  <span className="giornale__cal-wday-n">{d.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="giornale__cal-insight">
              <Ico n="info" s={12} c={T.primary} />
              <span>Accadde nel mese di {MONTHS[today.getMonth()]}: un mese di contrasti, tra sole e pioggia.</span>
            </div>
            <button className="giornale__stage-link" onClick={() => navigate('scadenzario')}>
              Scadenzario <Ico n="chevr" s={11} c={T.blue} />
            </button>
          </div>
        )
      case 'turni':
        return <div className="giornale__stage-empty">Non ci sono turni per oggi.</div>
      case 'vip':
        return (
          <div className="giornale__stage-list">
            {vip.map((v, i) => (
              <div key={i} className="giornale__stage-list-item">
                <div className="giornale__stage-list-title">{v.nome}</div>
                <div className="giornale__stage-list-sub">{v.nota}</div>
              </div>
            ))}
          </div>
        )
      case 'eventi':
        return (
          <div className="giornale__stage-list">
            {eventi.map((ev, i) => (
              <div key={i} className="giornale__stage-list-item">
                <div className="giornale__stage-list-title">{ev}</div>
              </div>
            ))}
          </div>
        )
      case 'numeri':
        return (
          <div className="giornale__stage-numbers">
            {statsRows.slice(4, 8).map((r, i) => (
              <div key={i} className="giornale__stage-num">
                <div className="giornale__stage-num-val">{r.oggi}</div>
                <div className="giornale__stage-num-label">{r.label}</div>
              </div>
            ))}
          </div>
        )
      case 'meteo':
        return (
          <div className="giornale__stage-meteo">
            <i className="fa-duotone fa-sun giornale__stage-meteo-icon" aria-hidden="true" />
            <div className="giornale__stage-meteo-temp">19°</div>
            <div className="giornale__stage-meteo-city">MILANO</div>
            <p className="giornale__stage-note">
              Velature sparse. Soleggiato per il resto del giorno. Folate di vento fino a 3,6 km/h.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  // ── Card riposizionabili (vista estesa) ─────────────────────────────────────
  function renderExtCard(id: ExtId) {
    switch (id) {
      case 'almanacco':
        return (
          <>
            <div className="giornale__info-header"><Ico n="calendar" s={13} c={T.primary} />Almanacco</div>
            <div className="giornale__almanacco-body">
              <div className="giornale__almanacco-date">
                <div className="giornale__almanacco-day-name">{WDAYS[today.getDay()]}</div>
                <div className="giornale__almanacco-day-num">{today.getDate()}</div>
                <div className="giornale__almanacco-month">{MONTHS[today.getMonth()]}</div>
              </div>
              <div className="giornale__almanacco-content">
                <div className="giornale__almanacco-text-title">Accadde nel mese di {MONTHS[today.getMonth()]}:</div>
                <p className="giornale__almanacco-text">Un mese di contrasti, tra piogge che bagnano l'anima e giornate di sole che la illuminano.</p>
                <button className="giornale__almanacco-link" onClick={() => navigate('scadenzario')}>
                  Scadenzario <Ico n="chevr" s={11} c={T.blue} />
                </button>
              </div>
            </div>
          </>
        )
      case 'meteo':
        return (
          <>
            <div className="giornale__info-header"><Ico n="wheel" s={13} c={T.primary} />Meteo</div>
            <div className="giornale__meteo-body">
              <p className="giornale__meteo-desc">Velature sparse. Soleggiato per il resto del giorno. Folate di vento fino a 3,6 km/h.</p>
              <div className="giornale__meteo-row">
                <i className="fa-duotone fa-sun giornale__meteo-icon" aria-hidden="true" />
                <div>
                  <div className="giornale__meteo-city">MILANO</div>
                  <div className="giornale__meteo-temp">19°</div>
                </div>
              </div>
            </div>
          </>
        )
      case 'eventi':
        return (
          <>
            <div className="giornale__info-header"><Ico n="bell" s={13} c={T.primary} />Eventi</div>
            <div className="giornale__eventi-body">
              {eventi.map((ev, i) => (
                <div key={i} className={`giornale__event-item ${i < eventi.length - 1 ? 'giornale__event-item--border' : ''}`}>{ev}</div>
              ))}
            </div>
          </>
        )
      case 'turni':
        return (
          <>
            <div className="giornale__info-header"><Ico n="clock" s={13} c={T.primary} />Turni di oggi</div>
            <div className="giornale__empty"><p>Non ci sono turni per oggi.</p></div>
          </>
        )
      case 'compleanni':
        return (
          <>
            <div className="giornale__info-header"><Ico n="star" s={13} c={T.primary} />Oggi è il compleanno di</div>
            <div className="giornale__empty"><p>Non ci sono compleanni.</p></div>
          </>
        )
      default:
        return null
    }
  }

  // ── Drag & drop (vista estesa) ──────────────────────────────────────────────
  const handleDrop = (targetId: ExtId) => {
    if (!dragId || dragId === targetId) return
    setOrder(prev => {
      const next = prev.filter(x => x !== dragId)
      const idx  = next.indexOf(targetId)
      next.splice(idx, 0, dragId)
      return next
    })
    setDragId(null)
  }

  return (
    <div className="giornale">
      {/* Top bar */}
      <div className="giornale__top-bar">
        <div>
          <BtnBack onClick={() => navigate('home')} />
          <h1 className="giornale__title">Giornale impresa</h1>
          <p className="giornale__subtitle">
            Centro strategico per il monitoraggio aziendale, che offre una visione complessiva e dettagliata dell'andamento economico e operativo della struttura
          </p>
        </div>
        <button className="giornale__live-btn" onClick={() => navigate('sugg-data-driven')}>
          <div className="giornale__live-dot" />LIVE
        </button>
      </div>

      {/* Struttura + toggle vista */}
      <div className="giornale__control-bar">
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
          options={strutture.map(s => ({ value: s, label: s }))}
          className="w-48"
        />
        <div className="giornale__view-toggle">
          <button
            className={`giornale__view-btn ${viewMode === 'sintetica' ? 'giornale__view-btn--active' : ''}`}
            onClick={() => setViewMode('sintetica')}
          >
            Sintetica
          </button>
          <button
            className={`giornale__view-btn ${viewMode === 'estesa' ? 'giornale__view-btn--active' : ''}`}
            onClick={() => setViewMode('estesa')}
          >
            Estesa
          </button>
        </div>
      </div>

      {/* ───────────────────────── VISTA SINTETICA ───────────────────────── */}
      {viewMode === 'sintetica' && (
        <>
          <div className="giornale__ring">
            {/* Orbita ellittica + raggi verso il centro */}
            <svg className="giornale__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <ellipse className="giornale__orbit-ring" cx="50" cy="50" rx="39" ry="44" vectorEffect="non-scaling-stroke" />
              {ORBIT.map((_, i) => (
                <line
                  key={i}
                  className={`giornale__spoke ${i === active ? 'giornale__spoke--active' : ''}`}
                  x1="50" y1="50" x2={NODE_POS[i].x} y2={NODE_POS[i].y}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            <button
              className="giornale__ring-arrow giornale__ring-arrow--prev"
              onClick={() => setActive(a => (a - 1 + ORBIT.length) % ORBIT.length)}
              aria-label="Sezione precedente"
            >
              <Ico n="back" s={18} c={T.primary} />
            </button>

            {/* Stage centrale */}
            <div className="giornale__stage">
              <div className="giornale__stage-head">
                <Ico n={ORBIT[active].icon} s={14} c={T.primary} />
                {ORBIT[active].label}
              </div>
              <div className="giornale__stage-body" key={ORBIT[active].id}>
                {renderStage(ORBIT[active].id)}
              </div>
            </div>

            <button
              className="giornale__ring-arrow giornale__ring-arrow--next"
              onClick={() => setActive(a => (a + 1) % ORBIT.length)}
              aria-label="Sezione successiva"
            >
              <Ico n="chevr" s={18} c={T.primary} />
            </button>

            {/* Sfere orbitanti */}
            {ORBIT.map((node, i) => (
              <button
                key={node.id}
                className={`giornale__node giornale__node--p${i} ${i === active ? 'giornale__node--active' : ''}`}
                onClick={() => setActive(i)}
              >
                <span className="giornale__node-circle">
                  <Ico n={node.icon} s={20} c={i === active ? T.white : T.primary} />
                </span>
                <span className="giornale__node-label">{node.label}</span>
              </button>
            ))}
          </div>

          {/* News in basso — sezione editoriale */}
          <div className="giornale__news">
            <div className="giornale__news-head">
              <span className="giornale__news-head-title"><Ico n="bar" s={14} c={T.primary} />News &amp; comunicazione</span>
              <button className="giornale__news-all" onClick={() => navigate('scadenzario')}>
                Tutte le news <Ico n="chevr" s={11} c={T.blue} />
              </button>
            </div>
            <div className="giornale__news-grid">
              {/* articolo in evidenza */}
              <article className="giornale__news-feat">
                <div className="giornale__news-feat-media" style={{ '--img': `url(${news[0].img})` } as React.CSSProperties}>
                  <span className="giornale__news-cat">{news[0].cat}</span>
                </div>
                <div className="giornale__news-feat-body">
                  <h3 className="giornale__news-feat-title">{news[0].titolo}</h3>
                  <p className="giornale__news-feat-text">{news[0].testo}</p>
                  <div className="giornale__news-meta">{news[0].fonte} · {news[0].tempo} fa</div>
                </div>
              </article>

              {/* lista secondaria con thumbnail */}
              <div className="giornale__news-list">
                {news.slice(1).map((n, i) => (
                  <article key={i} className="giornale__news-item">
                    <div className="giornale__news-thumb" style={{ '--img': `url(${n.img})` } as React.CSSProperties} />
                    <div className="giornale__news-item-body">
                      <span className="giornale__news-cat giornale__news-cat--sm">{n.cat}</span>
                      <h4 className="giornale__news-item-title">{n.titolo}</h4>
                      <div className="giornale__news-meta">{n.fonte} · {n.tempo} fa</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ───────────────────────── VISTA ESTESA ───────────────────────── */}
      {viewMode === 'estesa' && (
        <>
          {/* Tabs */}
          <div className="giornale__tabs">
            {tabs.map(tab => (
              <button key={tab.id} className={`giornale__tab ${activeTab === tab.id ? 'giornale__tab--active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Toolbar personalizzazione */}
          <div className="giornale__ext-toolbar">
            <button
              className={`giornale__personalize ${editMode ? 'giornale__personalize--on' : ''}`}
              onClick={() => setEditMode(v => !v)}
            >
              <Ico n="sliders" s={14} c={editMode ? T.white : T.primary} />
              {editMode ? 'Fine' : 'Personalizza'}
            </button>
          </div>

          {/* Primo box: tabella unica Ieri / Oggi (fisso, non trascinabile) */}
          <div className="giornale__card giornale__merged">
            <div className="giornale__panel-header">
              <div className="giornale__panel-title"><Ico n="bar" s={14} c={T.primary} />I numeri – {fmtDay(today)}</div>
              <span className="giornale__panel-sdly">S.D.L.Y.</span>
            </div>
            <div className="giornale__merged-row giornale__merged-row--head">
              <div className="giornale__merged-label">Indicatore</div>
              <div className="giornale__merged-val">Ieri</div>
              <div className="giornale__merged-val">Oggi</div>
            </div>
            {statsRows.map((row, i) => (
              <div key={i} className="giornale__merged-row">
                <div className="giornale__merged-label">{row.label}</div>
                <div className="giornale__merged-val giornale__merged-val--ieri">{row.ieri}</div>
                <div className="giornale__merged-val">{row.oggi}</div>
              </div>
            ))}
            <div className="giornale__panel-footer">
              <button className="giornale__panel-link" onClick={() => navigate('tariffe-disp')}>
                Distribuzione di rete <Ico n="chevr" s={11} c={T.blue} />
              </button>
            </div>
          </div>

          {/* Sezioni riposizionabili (drag & drop) */}
          <div className={`giornale__ext-grid ${editMode ? 'giornale__ext-grid--edit' : ''}`}>
            {order.map(id => (
              <div
                key={id}
                className={`giornale__card giornale__ext-card ${dragId === id ? 'giornale__ext-card--dragging' : ''}`}
                draggable={editMode}
                onDragStart={() => editMode && setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={e => { if (editMode) e.preventDefault() }}
                onDrop={() => editMode && handleDrop(id)}
              >
                {editMode && (
                  <span className="giornale__drag-handle"><Ico n="dots-v" s={14} c={T.primary} /></span>
                )}
                {renderExtCard(id)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
