import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { SelectField } from '../../../../core/components/form'
import { useEfficienzaStore } from '../../../../store/useEfficienzaStore'
import './EfficienzaOperativa.sass'

// ─── Mock data ────────────────────────────────────────────────────────────────
type StrutturaRow = {
  id: string
  nome: string
  destinazione: string
  categoria: string
  camere: number
}

const STRUTTURE: StrutturaRow[] = [
  { id: 'archimede', nome: 'Hotel Archimede', destinazione: 'Roma',    categoria: '4 stelle', camere: 155 },
  { id: 'lazio',     nome: 'Hotel Lazio',     destinazione: 'Roma',    categoria: '3 stelle', camere: 58 },
  { id: 'siracusa',  nome: 'Hotel Siracusa',  destinazione: 'Firenze', categoria: '4 stelle', camere: 137 },
  { id: 'floridia',  nome: 'Hotel Floridia',  destinazione: 'Firenze', categoria: '3 stelle', camere: 42 },
  { id: 'luce',      nome: 'Hotel Luce',      destinazione: 'Milano',  categoria: '5 stelle', camere: 66 },
  { id: 'noto',      nome: 'Hotel Noto',      destinazione: 'Milano',  categoria: '4 stelle', camere: 130 },
  { id: 'regio',     nome: 'Hotel Regio',     destinazione: 'Napoli',  categoria: '5 stelle', camere: 75 },
  { id: 'lux',       nome: 'Hotel Lux',       destinazione: 'Napoli',  categoria: '4 stelle', camere: 83 },
]

const MESI_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function genGiorni(startDate: Date, nGiorni: number) {
  return Array.from({ length: nGiorni }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}

// disponibilità mock deterministica
function mockDispon(seed: number, gi: number, camere: number) {
  const v = ((seed * 31 + gi * 17) % 100) / 100
  return Math.round(camere * (0.1 + v * 0.4))
}

// ── Suggerimenti di riallocazione (opportunità) ───────────────────────────────
// Ogni opportunità è ancorata a una cella (strutturaId, giorno) e propone di
// spostare camere da una struttura in surplus, con il ricavo prima/dopo.
type Sugg = {
  strutturaId: string
  gi: number
  daStruttura: string
  camere: number
  ricavoPre: number
  ricavoPost: number
  markupGain: number
}
const SUGGERIMENTI: Sugg[] = [
  { strutturaId: 'archimede', gi: 1, daStruttura: 'Hotel Lazio',    camere: 12, ricavoPre: 35000, ricavoPost: 39200, markupGain: 0.4 },
  { strutturaId: 'noto',      gi: 2, daStruttura: 'Hotel Luce',     camere: 18, ricavoPre: 52000, ricavoPost: 58500, markupGain: 0.6 },
  { strutturaId: 'floridia',  gi: 3, daStruttura: 'Hotel Siracusa', camere: 7,  ricavoPre: 18500, ricavoPost: 21300, markupGain: 0.3 },
  { strutturaId: 'regio',     gi: 4, daStruttura: 'Hotel Lux',      camere: 9,  ricavoPre: 24000, ricavoPost: 27100, markupGain: 0.3 },
]
const suggKey = (id: string, gi: number) => `${id}-${gi}`

// Riepilogo di partenza
const FATTURATO_BASE = 318000
const RICAVO_BASE    = 142800
const MARKUP_BASE    = 8.0

const fmtEur = (n: number) => '€ ' + Math.round(n).toLocaleString('it-IT')
const fmtPct = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
const fmtSignEur = (n: number) => (n >= 0 ? '+ ' : '− ') + '€ ' + Math.abs(Math.round(n)).toLocaleString('it-IT')
const fmtSignPct = (n: number) => (n >= 0 ? '+ ' : '− ') + Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'

// ─── Componente ───────────────────────────────────────────────────────────────
export default function EfficienzaOperativa({ navigate }: { navigate: (p: string) => void }) {
  const [destinazione, setDestinazione] = useState('Tutte')
  const [categoria,    setCategoria]    = useState('Tutte')
  const [periodo]                       = useState('2026-05-22')
  const [nGiorni,      setNGiorni]      = useState(10)
  const [suggerimentiOn, setSuggerimentiOn] = useState(true)
  const [applicati, setApplicati] = useState<Set<string>>(new Set())

  const modalita      = useEfficienzaStore(s => s.modalita)
  const setModalita   = useEfficienzaStore(s => s.setModalita)
  const notificaOn    = useEfficienzaStore(s => s.notificaOn)
  const setNotificaOn = useEfficienzaStore(s => s.setNotificaOn)
  const registra      = useEfficienzaStore(s => s.registra)

  const PERIODI_GIORNI = [5, 10, 15, 20, 30]
  const DESTINAZIONI = ['Tutte', ...Array.from(new Set(STRUTTURE.map(s => s.destinazione)))]
  const CATEGORIE    = ['Tutte', '3 stelle', '4 stelle', '5 stelle']

  const startDate = new Date(periodo)
  const giorni    = genGiorni(startDate, nGiorni)

  const struttureFiltered = STRUTTURE.filter(s =>
    (destinazione === 'Tutte' || s.destinazione === destinazione) &&
    (categoria === 'Tutte' || s.categoria === categoria))

  const grid = struttureFiltered.map((s, si) => ({
    ...s,
    giorni: giorni.map((_g, gi) => mockDispon(si + 1, gi, s.camere)),
  }))

  // Suggerimenti visibili = quelli su strutture mostrate e giorni in finestra
  const suggMap = useMemo(() => {
    const m = new Map<string, Sugg>()
    SUGGERIMENTI.forEach(sg => {
      if (sg.gi < nGiorni && struttureFiltered.some(s => s.id === sg.strutturaId)) {
        m.set(suggKey(sg.strutturaId, sg.gi), sg)
      }
    })
    return m
  }, [struttureFiltered, nGiorni])

  // ── Riepilogo ottimizzazione (reattivo agli applicati) ───────────────────────
  const applicatiSugg = SUGGERIMENTI.filter(sg => applicati.has(suggKey(sg.strutturaId, sg.gi)))
  const guadagnoEur   = applicatiSugg.reduce((a, sg) => a + (sg.ricavoPost - sg.ricavoPre), 0)
  const markupGain    = applicatiSugg.reduce((a, sg) => a + sg.markupGain, 0)
  const potenzialeEur = SUGGERIMENTI.reduce((a, sg) => a + (sg.ricavoPost - sg.ricavoPre), 0)
  const ricavoOtt     = RICAVO_BASE + guadagnoEur
  const markupOtt     = MARKUP_BASE + markupGain
  const guadagnoPct   = RICAVO_BASE ? (guadagnoEur / RICAVO_BASE) * 100 : 0

  // valore di una singola opportunità nella modalità scelta
  const valoreSugg = (sg: Sugg) =>
    modalita === 'eur'
      ? fmtSignEur(sg.ricavoPost - sg.ricavoPre)
      : fmtSignPct(((sg.ricavoPost - sg.ricavoPre) / sg.ricavoPre) * 100)

  const applica = (sg: Sugg) => {
    const k = suggKey(sg.strutturaId, sg.gi)
    if (applicati.has(k)) return
    setApplicati(prev => new Set(prev).add(k))
    const struttura = STRUTTURE.find(s => s.id === sg.strutturaId)
    // registra l'ottimizzazione → genera la notifica ricavo (se attiva)
    registra({
      destinazione: struttura?.destinazione ?? '',
      struttura: struttura?.nome ?? '',
      daStruttura: sg.daStruttura,
      camere: sg.camere,
      ricavoPre: sg.ricavoPre,
      ricavoPost: sg.ricavoPost,
    })
  }
  const applicaTutti = () => suggMap.forEach(sg => applica(sg))

  // ── Slider orizzontale: frecce + rotella ─────────────────────────────────────
  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [nav, setNav] = useState({ prev: false, next: false })
  const updateNav = useCallback(() => {
    const el = tableWrapRef.current
    if (!el) return
    setNav({ prev: el.scrollLeft > 4, next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }, [])
  useEffect(() => {
    updateNav()
    window.addEventListener('resize', updateNav)
    return () => window.removeEventListener('resize', updateNav)
  }, [nGiorni, destinazione, categoria, updateNav])
  const scrollDays = (dir: number) => {
    const el = tableWrapRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' })
  }
  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      const atStart = el.scrollLeft <= 0
      const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
      if ((delta > 0 && !atEnd) || (delta < 0 && !atStart)) {
        el.scrollLeft += delta
        e.preventDefault()
        updateNav()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [updateNav])

  const nApplicati  = applicatiSugg.length
  const nDisponibili = suggMap.size

  return (
    <div className="eop">
      <PageHead
        title="Efficienza operativa"
        subtitle="Ottimizza la disponibilità delle camere con suggerimenti intelligenti per massimizzare occupazione e ricavi"
      />

      {/* ── Toolbar: filtri + pannello ottimizzazione ───────────────────────── */}
      <div className="eop__toolbar">
        <div className="eop__filters">
          <SelectField
            label="Destinazione" name="destinazione" className="w-[160px]"
            value={destinazione} onChange={e => setDestinazione(e.target.value)}
            options={DESTINAZIONI.map(d => ({ value: d, label: d }))}
          />
          <SelectField
            label="Categoria" name="categoria" className="w-[140px]"
            value={categoria} onChange={e => setCategoria(e.target.value)}
            options={CATEGORIE.map(c => ({ value: c, label: c }))}
          />
          <div className="eop__period">
            <label className="eop__period-label">Giorni</label>
            <div className="eop__seg" role="group" aria-label="Giorni della timeline">
              {PERIODI_GIORNI.map(n => (
                <button key={n} type="button"
                  className={`eop__seg-btn ${nGiorni === n ? 'is-active' : ''}`}
                  onClick={() => setNGiorni(n)} aria-pressed={nGiorni === n}>{n}</button>
              ))}
            </div>
          </div>
          <div className="eop__suggerimenti">
            <label className="eop__period-label">Suggerimenti</label>
            <button type="button" role="switch" aria-checked={suggerimentiOn}
              className={`eop__switch ${suggerimentiOn ? 'is-on' : ''}`}
              onClick={() => setSuggerimentiOn(v => !v)}>
              <span className="eop__switch-thumb" />
            </button>
          </div>
        </div>

        {/* Pannello efficienza operativa: €/%, configuratore, notifica */}
        <div className="eop__panel">
          <span className="eop__panel-title"><i className="fa-light fa-gauge-high" aria-hidden="true" /> Efficienza operativa</span>
          <div className="eop__panel-row">
            <div className="eop__mode" role="group" aria-label="Modalità valore">
              <button type="button" className={`eop__mode-btn ${modalita === 'eur' ? 'is-on' : ''}`} onClick={() => setModalita('eur')} aria-pressed={modalita === 'eur'}>
                <i className="fa-solid fa-euro-sign" aria-hidden="true" />
              </button>
              <button type="button" className={`eop__mode-btn ${modalita === 'pct' ? 'is-on' : ''}`} onClick={() => setModalita('pct')} aria-pressed={modalita === 'pct'}>
                <i className="fa-solid fa-percent" aria-hidden="true" />
              </button>
            </div>
            <button type="button" className="eop__config-btn" onClick={() => navigate('configuratore')}>
              <i className="fa-regular fa-sliders" aria-hidden="true" /> Configuratore
            </button>
            <button
              type="button"
              className={`eop__bell ${notificaOn ? 'is-on' : 'is-off'}`}
              onClick={() => setNotificaOn(!notificaOn)}
              aria-pressed={notificaOn}
              title={notificaOn ? 'Notifica ricavo attiva — clicca per disattivare' : 'Notifica ricavo disattivata — clicca per attivare'}
            >
              <i className={`fa-regular ${notificaOn ? 'fa-bell' : 'fa-bell-slash'}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Griglia disponibilità ───────────────────────────────────────────── */}
      <div className="eop__timeline">
        {nav.prev && (
          <button type="button" className="eop__nav eop__nav--prev" onClick={() => scrollDays(-1)} aria-label="Giorni precedenti">
            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        {nav.next && (
          <button type="button" className="eop__nav eop__nav--next" onClick={() => scrollDays(1)} aria-label="Giorni successivi">
            <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <div className="eop__table-wrap" ref={tableWrapRef} onScroll={updateNav}>
          <table className="eop__table">
            <thead>
              <tr>
                <th className="eop__th eop__th--struct">Struttura</th>
                <th className="eop__th eop__th--camere">Camere</th>
                {giorni.map((g, i) => {
                  const wd = WEEKDAY_SHORT[g.getDay()]
                  const isWeekend = g.getDay() === 0 || g.getDay() === 6
                  return (
                    <th key={i} className={`eop__th eop__th--day ${isWeekend ? 'is-weekend' : ''}`}>
                      <div className="eop__day-head">
                        <span className="eop__day-chip">{wd}</span>
                        <span className="eop__day-date">{g.getDate()} {MESI_IT[g.getMonth()]}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {grid.map(row => (
                <tr key={row.id} className="eop__tr">
                  <td className="eop__td eop__td--struct">
                    <div className="eop__hotel">
                      <i className="eop__hotel-ico fa-solid fa-hotel" aria-hidden="true" />
                      <span className="eop__hotel-info">
                        <span className="eop__hotel-name">{row.nome}</span>
                        <span className="eop__hotel-meta">{row.destinazione} · {row.categoria}</span>
                      </span>
                    </div>
                  </td>
                  <td className="eop__td eop__td--camere">{row.camere}</td>
                  {row.giorni.map((disp, i) => {
                    const sg = suggMap.get(suggKey(row.id, i))
                    const applied = sg ? applicati.has(suggKey(row.id, i)) : false
                    return (
                      <td key={i} className={`eop__td eop__td--day ${sg ? 'has-sugg' : ''}`}>
                        <span className="eop__disp">{disp}</span>
                        {sg && suggerimentiOn && (
                          applied ? (
                            <span className="eop__sugg eop__sugg--done" title={`Riallocate ${sg.camere} camere da ${sg.daStruttura}`}>
                              <i className="fa-solid fa-check" aria-hidden="true" /> {valoreSugg(sg)}
                            </span>
                          ) : (
                            <button type="button" className="eop__sugg" onClick={() => applica(sg)}
                              title={`Rialloca ${sg.camere} camere da ${sg.daStruttura} → +${valoreSugg(sg)}`}>
                              <i className="fa-solid fa-right-left" aria-hidden="true" /> {valoreSugg(sg)}
                            </button>
                          )
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* finestra giorni (sketch: "10gg") */}
      <div className="eop__window">
        <i className="fa-light fa-calendar-range" aria-hidden="true" />
        Finestra di analisi: <strong>{nGiorni} giorni</strong>
      </div>

      {/* ── Riepilogo ottimizzazione ────────────────────────────────────────── */}
      <div className="eop__riepilogo">
        <div className="eop__riep-head">
          <span className="eop__riep-title"><i className="fa-light fa-wand-magic-sparkles" aria-hidden="true" /> Rendimento da ottimizzazione</span>
          <span className="eop__riep-count">{nApplicati}/{nDisponibili} suggerimenti applicati</span>
        </div>

        <div className="eop__metrics">
          <div className="eop__metric">
            <span className="eop__metric-lab">Fatturato</span>
            <strong className="eop__metric-val">{fmtEur(FATTURATO_BASE)}</strong>
          </div>
          <div className="eop__metric">
            <span className="eop__metric-lab">Ricavo</span>
            <strong className="eop__metric-val">
              <span className="eop__metric-from">{fmtEur(RICAVO_BASE)}</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              <span className="eop__metric-to">{fmtEur(ricavoOtt)}</span>
            </strong>
          </div>
          <div className="eop__metric">
            <span className="eop__metric-lab">Mark up medio</span>
            <strong className="eop__metric-val">
              <span className="eop__metric-from">{fmtPct(MARKUP_BASE)}</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              <span className="eop__metric-to">{fmtPct(markupOtt)}</span>
            </strong>
          </div>
          <div className="eop__metric eop__metric--gain">
            <span className="eop__metric-lab">Guadagno ottimizzazione</span>
            <strong className="eop__metric-val">
              {modalita === 'eur' ? fmtSignEur(guadagnoEur) : fmtSignPct(guadagnoPct)}
            </strong>
            <span className="eop__metric-sub">
              potenziale {modalita === 'eur' ? fmtSignEur(potenzialeEur) : fmtSignPct((potenzialeEur / RICAVO_BASE) * 100)}
            </span>
          </div>
        </div>

        <div className="eop__riep-foot">
          <span className="eop__riep-note">
            <i className={`fa-light ${notificaOn ? 'fa-bell' : 'fa-bell-slash'}`} aria-hidden="true" />
            {notificaOn
              ? 'Il ricavo da ottimizzazione viene notificato nel Centro notifiche'
              : 'Notifica ricavo disattivata — riattivala nelle impostazioni del Centro notifiche'}
          </span>
          <button type="button" className="sib-btn sib-btn--primary" onClick={applicaTutti} disabled={nApplicati >= nDisponibili || nDisponibili === 0}>
            <i className="fa-light fa-wand-magic-sparkles" aria-hidden="true" /> Applica tutti i suggerimenti
          </button>
        </div>
      </div>
    </div>
  )
}
