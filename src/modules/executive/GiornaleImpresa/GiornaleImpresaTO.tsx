import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import { SelectField, TextareaField } from '../../../core/components/form'
import { useRichiesteOperativeStore } from '../../../store/useRichiesteOperativeStore'
import './GiornaleImpresaTO.sass'

// ─── Giornale impresa — versione Tour Operator ────────────────────────────────
// Layout dedicato ai TO: hero di sintesi, filtri canale/contratto, KPI ieri→oggi,
// giacenza residua per località (con sbocco BI) ed eventi collegati al planner.

type Canale = 'tutti' | 'diretti' | 'terze'

const CONTRATTI = ['Tutti i contratti', 'Welcome Travel Group', 'Aurora Tours', 'Bluvacanze', 'Robintur']

const fmtInt = (n: number) => n.toLocaleString('it-IT')
const fmtEur = (n: number) => '€ ' + n.toLocaleString('it-IT')
const fmtPct = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'

interface RigaKpi {
  key: string; label: string; ieri: number; oggi: number
  fmt: (n: number) => string; icon: string; highlight?: boolean; accent?: boolean
}
const RIEPILOGO: RigaKpi[] = [
  { key: 'pratiche',  label: 'Pratiche aperte',         ieri: 22,    oggi: 27,    fmt: fmtInt, icon: 'fa-folder-open',    highlight: true },
  { key: 'preventivi',label: 'Preventivi inviati',      ieri: 14,    oggi: 19,    fmt: fmtInt, icon: 'fa-paper-plane' },
  { key: 'conferme',  label: 'Conferme',                ieri: 6,     oggi: 9,     fmt: fmtInt, icon: 'fa-circle-check',   highlight: true },
  { key: 'pax',       label: 'Passeggeri',              ieri: 88,    oggi: 126,   fmt: fmtInt, icon: 'fa-users' },
  { key: 'conv',      label: 'Tasso conversione',       ieri: 38,    oggi: 44,    fmt: fmtPct, icon: 'fa-arrow-trend-up' },
  { key: 'fatt',      label: 'Fatturato',               ieri: 18400, oggi: 24900, fmt: fmtEur, icon: 'fa-sack-dollar',    highlight: true },
  { key: 'ticket',    label: 'Ticket medio',            ieri: 1180,  oggi: 1320,  fmt: fmtEur, icon: 'fa-receipt' },
  { key: 'markup',    label: 'Mark up',                 ieri: 12.0,  oggi: 14.5,  fmt: fmtPct, icon: 'fa-percent',        highlight: true, accent: true },
  { key: 'giactax',   label: 'Giacenza residua (tax)',  ieri: 2300,  oggi: 1850,  fmt: fmtEur, icon: 'fa-coins',          accent: true },
]

interface RigaGiacenza { localita: string; dispon: number; strutture: string[] }
const GIACENZA: RigaGiacenza[] = [
  { localita: 'Roma',    dispon: 50, strutture: ['Ra', 'Hotel X', 'Hotel Y'] },
  { localita: 'Firenze', dispon: 32, strutture: ['FI Centro', 'Arno Suites'] },
  { localita: 'Milano',  dispon: 18, strutture: ['Duomo Palace'] },
  { localita: 'Napoli',  dispon: 27, strutture: ['Vesuvio', 'Mergellina'] },
]
const MAX_DISP = Math.max(...GIACENZA.map(g => g.dispon))

const EVENTI = [
  { data: '12', mese: 'FEB', titolo: 'BIT — Borsa Internazionale del Turismo', luogo: 'Milano · Allianz MiCo' },
  { data: '09', mese: 'OTT', titolo: 'TTG Travel Experience',                   luogo: 'Rimini · Expo Centre' },
  { data: '21', mese: 'MAR', titolo: 'ITB — Fiera del turismo',                 luogo: 'Berlino · Messe' },
]

// freccetta + segno per la variazione ieri→oggi
function Delta({ ieri, oggi }: { ieri: number; oggi: number }) {
  const up = oggi >= ieri
  const pct = ieri === 0 ? 100 : Math.round(((oggi - ieri) / ieri) * 100)
  return (
    <span className={`gioto__delta gioto__delta--${up ? 'up' : 'down'}`}>
      <i className={`fa-solid ${up ? 'fa-arrow-up' : 'fa-arrow-down'}`} aria-hidden="true" />
      {up ? '+' : ''}{pct}%
    </span>
  )
}

export default function GiornaleImpresaTO({ navigate }: { navigate: (p: string) => void }) {
  const [canale, setCanale]         = useState<Canale>('tutti')
  const [contratto, setContratto]   = useState(CONTRATTI[0])
  const [note, setNote]             = useState('')
  const [vinoOn, setVinoOn]         = useState(false)
  const [confermato, setConfermato] = useState(false)
  const invia = useRichiesteOperativeStore(s => s.invia)

  const totGiacenza = GIACENZA.reduce((a, r) => a + r.dispon, 0)
  const hero = {
    pratiche: RIEPILOGO.find(r => r.key === 'pratiche')!,
    conferme: RIEPILOGO.find(r => r.key === 'conferme')!,
    fatt:     RIEPILOGO.find(r => r.key === 'fatt')!,
  }

  // "Bottiglia di vino in camera" → richiesta operativa inviata al planner.
  const toggleVino = () => {
    const next = !vinoOn
    setVinoOn(next)
    if (next) {
      invia({
        bookingId: 'gio-to-extra',
        nominativo: contratto === CONTRATTI[0] ? 'Cliente TO' : contratto,
        strutturaNome: GIACENZA[0].strutture[0],
        citta: GIACENZA[0].localita,
        dalISO: new Date().toISOString().split('T')[0],
        alISO: new Date().toISOString().split('T')[0],
        descrizione: 'Bottiglia di vino in camera (welcome)',
        servizi: [{ id: 'vino', label: 'Bottiglia di vino in camera', icon: 'fa-wine-glass', categoryId: 'extra', categoryLabel: 'Extra in camera' }],
      })
    }
  }

  const conferma = () => { setConfermato(true); window.setTimeout(() => setConfermato(false), 2500) }

  return (
    <div className="gioto">
      <BtnBack />

      {/* ── Hero di sintesi ─────────────────────────────────────────── */}
      <div className="gioto__hero">
        <div className="gioto__hero-main">
          <span className="gioto__hero-eyebrow"><i className="fa-solid fa-compass" aria-hidden="true" /> Tour Operator · Cabina di regia</span>
          <h1 className="gioto__hero-title">Giornale impresa</h1>
          <p className="gioto__hero-sub">Pratiche, marginalità e giacenza residua delle strutture, con eventi collegati al planner operativo.</p>
        </div>
        <div className="gioto__hero-stats">
          {[
            { ico: 'fa-folder-open',  lab: 'Pratiche oggi',  ...hero.pratiche },
            { ico: 'fa-circle-check', lab: 'Conferme oggi',  ...hero.conferme },
            { ico: 'fa-sack-dollar',  lab: 'Fatturato oggi', ...hero.fatt },
          ].map(s => (
            <div key={s.lab} className="gioto__hero-stat">
              <i className={`fa-light ${s.ico}`} aria-hidden="true" />
              <div>
                <strong>{s.fmt(s.oggi)}</strong>
                <span>{s.lab}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filtri: canale + contratto ──────────────────────────────── */}
      <div className="gioto__filters">
        <div className="gioto__seg">
          {([['tutti', 'Tutti', 'fa-layer-group'], ['diretti', 'Diretti', 'fa-bolt'], ['terze', 'Terze Parti', 'fa-handshake']] as const).map(([v, l, ic]) => (
            <button key={v} type="button" className={`gioto__seg-btn${canale === v ? ' gioto__seg-btn--on' : ''}`} onClick={() => setCanale(v)}>
              <i className={`fa-light ${ic}`} aria-hidden="true" /> {l}
            </button>
          ))}
        </div>
        <SelectField
          name="contratto" label="Contratti" value={contratto}
          onChange={e => setContratto(e.target.value)}
          options={CONTRATTI.map(c => ({ value: c, label: c }))}
          className="gioto__contratti"
        />
      </div>

      {/* ── Riepilogo + Giacenza ────────────────────────────────────── */}
      <div className="gioto__grid">
        {/* Riepilogo ieri/oggi */}
        <div className="gioto__box">
          <div className="gioto__box-head"><span><i className="fa-light fa-chart-simple" aria-hidden="true" /> Riepilogo</span></div>
          <div className="gioto__riep">
            <div className="gioto__riep-row gioto__riep-row--head">
              <span>Indicatore</span><span>Ieri</span><span>Oggi</span><span>Δ</span>
            </div>
            {RIEPILOGO.map(r => (
              <div key={r.key} className={`gioto__riep-row${r.accent ? ' gioto__riep-row--accent' : ''}`}>
                <span className="gioto__riep-label">{r.label}</span>
                <span className="gioto__riep-val gioto__riep-val--ieri">{r.fmt(r.ieri)}</span>
                <span className="gioto__riep-val gioto__riep-val--oggi">{r.fmt(r.oggi)}</span>
                <span className="gioto__riep-d"><Delta ieri={r.ieri} oggi={r.oggi} /></span>
              </div>
            ))}
          </div>
        </div>

        {/* Giacenza residua */}
        <div className="gioto__box">
          <div className="gioto__box-head">
            <span><i className="fa-light fa-warehouse" aria-hidden="true" /> Giacenza residua</span>
            <button type="button" className="gioto__bi-btn" onClick={() => navigate('analisi-giacenza')}>
              <i className="fa-light fa-chart-mixed" aria-hidden="true" /> Analisi BI
            </button>
          </div>
          <div className="gioto__giac">
            {GIACENZA.map(r => (
              <div key={r.localita} className="gioto__giac-row">
                <div className="gioto__giac-top">
                  <span className="gioto__giac-loc"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {r.localita}</span>
                  <span className="gioto__giac-disp">{r.dispon}</span>
                </div>
                <div className="gioto__giac-bar"><span className="gioto__giac-fill" style={{ '--w': `${(r.dispon / MAX_DISP) * 100}%` } as React.CSSProperties} /></div>
                <div className="gioto__giac-strutt">
                  {r.strutture.map(s => <span key={s} className="gioto__giac-chip">{s}</span>)}
                </div>
              </div>
            ))}
            <div className="gioto__giac-tot">
              <span>Totale disponibilità</span>
              <strong>{totGiacenza}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Eventi + Conferma AUV ───────────────────────────────────── */}
      <div className="gioto__grid">
        <div className="gioto__box">
          <div className="gioto__box-head"><span><i className="fa-light fa-calendar-star" aria-hidden="true" /> Eventi</span></div>
          <div className="gioto__eventi">
            {EVENTI.map((ev, i) => (
              <div key={i} className="gioto__evento">
                <span className="gioto__evento-date"><strong>{ev.data}</strong>{ev.mese}</span>
                <span className="gioto__evento-body">
                  <span className="gioto__evento-titolo">{ev.titolo}</span>
                  <span className="gioto__evento-luogo"><i className="fa-light fa-location-dot" aria-hidden="true" /> {ev.luogo}</span>
                </span>
              </div>
            ))}
          </div>
          {/* Richiesta operativa collegata al planner */}
          <label className={`gioto__vino${vinoOn ? ' gioto__vino--on' : ''}`}>
            <input type="checkbox" className="sib-checkbox" checked={vinoOn} onChange={toggleVino} />
            <i className="fa-light fa-wine-glass" aria-hidden="true" />
            <span>Metti una bottiglia di vino in camera</span>
            {vinoOn && <span className="gioto__vino-tag"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Inviata al planner</span>}
          </label>
        </div>

        <div className="gioto__box">
          <div className="gioto__box-head"><span><i className="fa-light fa-clipboard-check" aria-hidden="true" /> Conferma A.U.V.</span></div>
          <TextareaField
            name="note" label="Note" rows={4}
            className="gioto__note"
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Aggiungi una nota per la conferma…"
          />
          <div className="gioto__auv-actions">
            {confermato && <span className="gioto__auv-ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Confermato</span>}
            <button type="button" className="sib-btn sib-btn--primary" onClick={conferma}>
              <i className="fa-light fa-check" aria-hidden="true" /> Conferma A.U.V.
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
