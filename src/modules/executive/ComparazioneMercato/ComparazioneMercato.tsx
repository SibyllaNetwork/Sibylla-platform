import React, { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Legend,
} from 'recharts'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import './ComparazioneMercato.sass'

// ─── Modello dati ─────────────────────────────────────────────────────────────
interface Hotel {
  id: string
  nome: string
  indirizzo?: string
  stelle?: number
  seed: number          // determina le serie pricing/brand (demo deterministico)
  basePrice: number     // € a notte di riferimento
  baseScore: number     // brand reputation /10
  camere: string[]      // tipologie camere della struttura
  pin?: { x: number; y: number }  // posizione sulla mappa stilizzata (%)
}

// Hotel dell'utente (il "tuo hotel")
const MY_HOTEL: Hotel = {
  id: 'mine', nome: 'Hotel Archimede', seed: 0, basePrice: 132, baseScore: 9.4,
  camere: ['Doppia Classic', 'Singola Standard', 'Tripla Comfort', 'Suite Vista'],
}

// Tipologie standard di piattaforma per il mapping camere
const STANDARD_ROOMS = [
  'Double Economy', 'Double Standard', 'Double Superior',
  'Single Economy', 'Single Standard', 'Triple', 'Suite', 'Family',
]

// Strutture trovate nell'area del CAP (lista candidati a sinistra)
const CANDIDATI: Hotel[] = [
  { id: 'c1', nome: 'Hotel Felice',         indirizzo: 'Via Tiburtina, 30, Roma',        stelle: 3,   seed: 11, basePrice: 109, baseScore: 8.9, camere: ['Doppia Classic', 'Singola Economy'],          pin: { x: 30, y: 22 } },
  { id: 'c2', nome: 'Ateneo Garden Palace', indirizzo: 'Via dei Salentini, 3, Roma',      stelle: 4,   seed: 19, basePrice: 148, baseScore: 9.2, camere: ['Doppia Superior', 'Junior Suite'],            pin: { x: 52, y: 30 } },
  { id: 'c3', nome: 'Hotel Caracciolo Roma', indirizzo: 'Via Cairoli, 86, Roma',          stelle: 4,   seed: 23, basePrice: 139, baseScore: 9.0, camere: ['Doppia Classic', 'Tripla'],                  pin: { x: 41, y: 48 } },
  { id: 'c4', nome: 'Hotel Filippo Roma',    indirizzo: 'Via Filippo Turati, 163, Roma',  stelle: 3.5, seed: 31, basePrice: 124, baseScore: 8.7, camere: ['Doppia Standard', 'Singola Standard'],        pin: { x: 60, y: 55 } },
  { id: 'c5', nome: 'Ritmo Blues B&B',       indirizzo: 'Via Cairoli, 115, Roma',         stelle: 4,   seed: 37, basePrice: 96,  baseScore: 9.1, camere: ['Doppia Classic', 'Family'],                  pin: { x: 35, y: 64 } },
  { id: 'c6', nome: 'Hotel Elyse',           indirizzo: 'Via Cairoli, 133, Roma',         stelle: 3.5, seed: 41, basePrice: 118, baseScore: 8.8, camere: ['Doppia Classic', 'Suite'],                   pin: { x: 70, y: 40 } },
  { id: 'c7', nome: 'San Lorenzo Rooms',     indirizzo: 'Via Tiburtina Antica, 12, Roma', stelle: 3.5, seed: 47, basePrice: 102, baseScore: 8.6, camere: ['Doppia Economy', 'Tripla'],                  pin: { x: 24, y: 50 } },
  { id: 'c8', nome: 'Domus Sessoriana',      indirizzo: 'Piazza Santa Croce, 10, Roma',   stelle: 4.5, seed: 53, basePrice: 165, baseScore: 9.5, camere: ['Doppia Superior', 'Suite Deluxe'],           pin: { x: 64, y: 72 } },
]

// Lista di monitoraggio iniziale (competitor già seguiti)
const SEED_MONITORATI: Hotel[] = [
  { id: 'm1', nome: 'Hotel Aphrodite',        indirizzo: 'Via Marsala, 90, Roma',  stelle: 3,   seed: 61, basePrice: 121, baseScore: 9.0, camere: ['Doppia Classic', 'Singola Standard'] },
  { id: 'm2', nome: 'Madison Hotel',          indirizzo: 'Via Marsala, 60, Roma',  stelle: 4,   seed: 67, basePrice: 137, baseScore: 9.2, camere: ['Doppia Superior', 'Tripla'] },
  { id: 'm3', nome: 'Hotel Milani',           indirizzo: 'Via Magenta, 12, Roma',  stelle: 3.5, seed: 71, basePrice: 115, baseScore: 8.8, camere: ['Doppia Classic', 'Family'] },
  { id: 'm4', nome: 'Augusta Lucilla Palace', indirizzo: 'Via Marsala, 104, Roma', stelle: 4,   seed: 73, basePrice: 152, baseScore: 9.3, camere: ['Doppia Deluxe', 'Junior Suite'] },
  { id: 'm5', nome: 'Hotel Assisi',           indirizzo: 'Via Vicenza, 5, Roma',   stelle: 3,   seed: 79, basePrice: 108, baseScore: 8.7, camere: ['Doppia Economy', 'Singola Economy'] },
  { id: 'm6', nome: 'Hotel Villa Delle Rose', indirizzo: 'Via Vicenza, 5, Roma',   stelle: 3.5, seed: 83, basePrice: 126, baseScore: 9.1, camere: ['Doppia Classic', 'Suite'] },
]

const LINE_COLORS = ['#E07B39', '#5A8A3C', '#9B59B6', '#2E86C1', '#C0392B', '#16A085']
const MY_COLOR = '#204769'

const TODAY = new Date('2026-06-09T00:00:00')
const fmtDate = (offset: number) => {
  const d = new Date(TODAY.getTime() - offset * 86400000)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

type Metric = 'pricing' | 'brand'

// Valore deterministico per la serie temporale di una struttura
const priceVal = (h: Hotel, i: number) =>
  Math.round(h.basePrice + 14 * Math.sin((i + h.seed) / 9) + (h.seed % 7) - 3)
const brandVal = (h: Hotel, i: number) =>
  Math.round((h.baseScore + 0.28 * Math.sin((i + h.seed) / 8)) * 10) / 10

// Stelle (con mezza stella)
function Stelle({ n = 0 }: { n?: number }) {
  return (
    <span className="cm-stars" aria-label={`${n} stelle`}>
      {[1, 2, 3, 4, 5].map(s => {
        const cls = n >= s ? 'fa-solid fa-star' : n >= s - 0.5 ? 'fa-solid fa-star-half-stroke' : 'fa-regular fa-star'
        return <i key={s} className={cls} aria-hidden="true" />
      })}
    </span>
  )
}

export default function ComparazioneMercato({ navigate }: { navigate: (p: string) => void }) {
  const [cap, setCap]           = useState('00185')
  const [paese, setPaese]       = useState('Italia')
  const [struttura, setStrutt]  = useState('Hotel Archimede')
  const [metric, setMetric]     = useState<Metric>('pricing')
  const [giorni, setGiorni]     = useState<30 | 60 | 90>(30)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Pre-popolata con alcuni competitor; restano slot liberi per sceglierne altri col +
  const [monitorati, setMonitorati] = useState<Hotel[]>(SEED_MONITORATI.slice(0, 3))
  const [checked, setChecked]       = useState<string[]>([])

  // Modali
  const [addPending, setAddPending] = useState<Hotel | null>(null)
  const [mapping, setMapping]       = useState<Hotel | null>(null)
  // Associazioni camere: { [hotelId]: { [cameraStruttura]: tipologiaStandard } }
  const [mappings, setMappings] = useState<Record<string, Record<string, string>>>({})

  const MAX = 6
  const isMonitored = (id: string) => monitorati.some(m => m.id === id)

  // Simula il caricamento dati quando cambia il CAP
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 750)
    return () => clearTimeout(t)
  }, [cap])

  const toggleCheck = (id: string) =>
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const removeMonitor = (id: string) => {
    setMonitorati(prev => prev.filter(m => m.id !== id))
    setChecked(prev => prev.filter(x => x !== id))
  }

  const confirmAdd = () => {
    if (!addPending) return
    if (!isMonitored(addPending.id) && monitorati.length < MAX) {
      setMonitorati(prev => [...prev, addPending])
    }
    setAddPending(null)
  }

  const setMap = (hotelId: string, camera: string, std: string) =>
    setMappings(prev => ({ ...prev, [hotelId]: { ...(prev[hotelId] ?? {}), [camera]: std } }))

  // Serie per il grafico: hotel visibili = il tuo + i selezionati
  const visibili = useMemo(
    () => [MY_HOTEL, ...monitorati.filter(m => checked.includes(m.id))],
    [monitorati, checked],
  )

  const chartData = useMemo(() => {
    const step = giorni <= 30 ? 2 : giorni <= 60 ? 4 : 6
    const idxs: number[] = []
    for (let i = giorni; i >= 0; i -= step) idxs.push(i)
    return idxs.map(i => {
      const row: Record<string, number | string> = { label: fmtDate(i) }
      visibili.forEach(h => { row[h.id] = metric === 'pricing' ? priceVal(h, i) : brandVal(h, i) })
      return row
    })
  }, [visibili, giorni, metric])

  const colorFor = (h: Hotel, idx: number) => h.id === 'mine' ? MY_COLOR : LINE_COLORS[idx % LINE_COLORS.length]
  const metricLabel = metric === 'pricing' ? 'Pricing' : 'Brand reputation (Booking)'
  const yFmt = (v: number) => metric === 'pricing' ? `€${v}` : `${v}`

  return (
    <div className="cm">
      <BtnBack onClick={() => navigate('analisi-dist-exec')} />
      <PageHeader
        title="Comparazione di mercato"
        subtitle="Raffronto con i competitor su pricing e brand reputation"
        className="cm__header"
      />

      {/* ── Barra filtri + toggle metrica ─────────────────────────────── */}
      <div className="cm__toolbar">
        <div className="cm__filters">
          <div className="cm__field-raw">
            <label className="text-[12px] font-semibold font-poppins text-primary" htmlFor="cm-cap">Trova hotel:</label>
            <input
              id="cm-cap"
              className="sib-input cm__cap"
              value={cap}
              onChange={e => setCap(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="CAP"
              inputMode="numeric"
            />
          </div>
          <SelectField
            name="paese" label="Paese" value={paese}
            onChange={e => setPaese(e.target.value)}
            options={[{ value: 'Italia', label: 'Italia' }, { value: 'Francia', label: 'Francia' }, { value: 'Spagna', label: 'Spagna' }]}
          />
          <SelectField
            name="struttura" label="Strutture" value={struttura}
            onChange={e => setStrutt(e.target.value)}
            options={[{ value: 'Hotel Archimede', label: 'Hotel Archimede' }]}
          />
        </div>

        <div className="cm__metrics">
          <button
            type="button"
            className={'cm__metric-btn' + (metric === 'brand' ? ' cm__metric-btn--active' : '')}
            onClick={() => setMetric('brand')}
          >
            <i className="fa-light fa-chart-line" aria-hidden="true" /> Brand reputation
          </button>
          <button
            type="button"
            className={'cm__metric-btn' + (metric === 'pricing' ? ' cm__metric-btn--active' : '')}
            onClick={() => setMetric('pricing')}
          >
            <i className="fa-light fa-chart-line" aria-hidden="true" /> Pricing
          </button>
        </div>
      </div>

      {/* ── Corpo: esplora (mappa + candidati) | monitoraggio ─────────── */}
      <div className="cm__body">
        {/* Esplora */}
        <section className="cm__explore">
          <div className="cm__map">
            <span className="cm__map-park cm__map-park--1" />
            <span className="cm__map-park cm__map-park--2" />
            <span className="cm__map-river" />
            <span className="cm__map-road cm__map-road--h1" />
            <span className="cm__map-road cm__map-road--h2" />
            <span className="cm__map-road cm__map-road--v1" />
            <span className="cm__map-road cm__map-road--d1" />

            {!loading && CANDIDATI.map(c => (
              <Tooltip key={c.id} text={c.nome} position="top">
                <span className="cm__pin" style={{ left: `${c.pin!.x}%`, top: `${c.pin!.y}%` }}>
                  <i className="fa-solid fa-location-dot" aria-hidden="true" />
                </span>
              </Tooltip>
            ))}

            <Tooltip text="Schermo intero" position="left">
              <button type="button" className="cm__map-ctrl cm__map-expand"><i className="fa-light fa-expand" /></button>
            </Tooltip>
            <div className="cm__map-zoom">
              <button type="button" aria-label="Zoom avanti"><i className="fa-light fa-plus" /></button>
              <button type="button" aria-label="Zoom indietro"><i className="fa-light fa-minus" /></button>
            </div>
            <span className="cm__map-attr">Mappa stilizzata · Sibylla</span>
          </div>

          {/* Lista candidati / loader */}
          <div className="cm__candidates">
            {loading ? (
              <div className="cm__loading">
                <span className="cm__spinner" aria-hidden="true" />
                <p>Stiamo caricando le informazioni!</p>
              </div>
            ) : (
              CANDIDATI.map(c => {
                const already = isMonitored(c.id)
                return (
                  <div key={c.id} className="cm__cand">
                    <div className="cm__cand-info">
                      <Stelle n={c.stelle} />
                      <span className="cm__cand-nome">{c.nome}</span>
                      <span className="cm__cand-addr">{c.indirizzo}</span>
                    </div>
                    <Tooltip text={already ? 'Già monitorato' : monitorati.length >= MAX ? 'Massimo 6 strutture' : 'Aggiungi al monitoraggio'} position="left">
                      <button
                        type="button"
                        className="cm__cand-add"
                        disabled={already || monitorati.length >= MAX}
                        onClick={() => setAddPending(c)}
                        aria-label={`Aggiungi ${c.nome}`}
                      >
                        <i className="fa-light fa-plus" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Monitoraggio */}
        <section className="cm__monitor">
          <h3 className="cm__monitor-title">Lista di monitoraggio</h3>

          <div className="cm__monitor-box">
            <div className="cm__monitor-head">
              <span className="cm__monitor-mine">{MY_HOTEL.nome}</span>
              <span className="cm__monitor-mine-tag"><i className="fa-light fa-hotel" aria-hidden="true" /> Il tuo hotel</span>
            </div>

            <div className="cm__monitor-list">
              {monitorati.length === 0 && (
                <p className="cm__monitor-empty">Aggiungi fino a 6 strutture dall'elenco a sinistra con il pulsante +.</p>
              )}
              {monitorati.map(m => {
                const associato = !!mappings[m.id] && Object.keys(mappings[m.id]).length > 0
                return (
                  <div key={m.id} className="cm__monitor-row">
                    <span className="cm__monitor-nome">{m.nome}</span>
                    <Tooltip text={associato ? 'Mapping camere associato' : 'Associa tipologie camere'} position="top">
                      <button
                        type="button"
                        className={'cm__chip' + (associato ? ' cm__chip--ok' : '')}
                        onClick={() => setMapping(m)}
                        aria-label={`Mapping ${m.nome}`}
                      >
                        <i className="fa-solid fa-link" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <label className="cm__check">
                      <input type="checkbox" checked={checked.includes(m.id)} onChange={() => toggleCheck(m.id)} aria-label={`Confronta ${m.nome}`} />
                    </label>
                    <Tooltip text="Rimuovi" position="left">
                      <button type="button" className="cm__monitor-del" onClick={() => removeMonitor(m.id)} aria-label={`Rimuovi ${m.nome}`}>
                        <i className="fa-light fa-xmark" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Toolbar grafico */}
          <div className="cm__chart-toolbar">
            <Tooltip text={expanded ? 'Riduci grafico' : 'Espandi grafico'} position="top">
              <button type="button" className="cm__chart-ic" onClick={() => setExpanded(v => !v)}><i className="fa-light fa-expand" /></button>
            </Tooltip>
            {([30, 60, 90] as const).map(g => (
              <Tooltip key={g} text={`Ultimi ${g} giorni`} position="top">
                <button
                  type="button"
                  className={'cm__days' + (giorni === g ? ' cm__days--active' : '')}
                  onClick={() => setGiorni(g)}
                >
                  <i className="fa-light fa-calendar" aria-hidden="true" /> {g}
                </button>
              </Tooltip>
            ))}
            <span className="cm__chart-metric">{metricLabel}</span>
            <Tooltip text="Confronto basato sulle tariffe/recensioni pubbliche dei competitor selezionati" position="left">
              <span className="cm__chart-info"><i className="fa-solid fa-circle-info" aria-hidden="true" /></span>
            </Tooltip>
          </div>

          {/* Grafico */}
          <div className={'cm__chart' + (expanded ? ' cm__chart--expanded' : '')}>
            <span className="cm__chart-ylab">Value</span>
            <ResponsiveContainer width="100%" height={expanded ? 420 : 260}>
              <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E0E7EE" />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#C3C9D0' }} tick={{ fontSize: 11, fill: '#6E7175' }} />
                <YAxis
                  tickLine={false} axisLine={false} width={48}
                  tick={{ fontSize: 11, fill: '#6E7175' }}
                  domain={metric === 'pricing' ? ['dataMin - 10', 'dataMax + 10'] : [9, 10]}
                  tickFormatter={(v: any) => yFmt(v)}
                />
                <RTooltip formatter={(v: any, n: any) => [yFmt(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {visibili.map((h, idx) => (
                  <Line
                    key={h.id}
                    type="monotone"
                    dataKey={h.id}
                    name={h.nome}
                    stroke={colorFor(h, idx)}
                    strokeWidth={h.id === 'mine' ? 2.6 : 2}
                    strokeDasharray={h.id === 'mine' ? '6 4' : undefined}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <span className="cm__chart-xlab">Date</span>
          </div>
        </section>
      </div>

      {/* ── Modale: Aggiungere hotel ──────────────────────────────────── */}
      {addPending && (
        <div className="cm-modal__overlay" onMouseDown={() => setAddPending(null)}>
          <div className="cm-modal cm-modal--sm" onMouseDown={e => e.stopPropagation()}>
            <div className="cm-modal__head">
              <h3 className="cm-modal__title">Aggiungere hotel</h3>
              <button type="button" className="cm-modal__close" onClick={() => setAddPending(null)} aria-label="Chiudi"><i className="fa-light fa-xmark" /></button>
            </div>
            <div className="cm-modal__body">
              <p className="cm-modal__q">Sei sicuro di voler aggiungere hotel <strong>{addPending.nome}</strong>?</p>
            </div>
            <div className="cm-modal__foot cm-modal__foot--center">
              <button type="button" className="cm-btn cm-btn--danger-outline" onClick={confirmAdd}>Procedi</button>
              <button type="button" className="cm-btn cm-btn--outline" onClick={() => setAddPending(null)}>Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale: Mapping della struttura ───────────────────────────── */}
      {mapping && (
        <div className="cm-modal__overlay" onMouseDown={() => setMapping(null)}>
          <div className="cm-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="cm-modal__head">
              <h3 className="cm-modal__title">Mapping della struttura: <span className="cm-modal__title-hl">{mapping.nome}</span></h3>
              <button type="button" className="cm-modal__close" onClick={() => setMapping(null)} aria-label="Chiudi"><i className="fa-light fa-xmark" /></button>
            </div>
            <div className="cm-modal__body">
              <p className="cm-modal__sub">Procedi con l'associazione delle tipologie di camere per un monitoraggio attendibile.</p>
              <div className="cm-map-grid">
                <span className="cm-map-grid__h">Camere hotel</span>
                <span className="cm-map-grid__h">Tipologia camere standard</span>
                <span className="cm-map-grid__h" />
                {mapping.camere.map(cam => {
                  const std = mappings[mapping.id]?.[cam] ?? ''
                  return (
                    <React.Fragment key={cam}>
                      <span className="cm-map-grid__cam">{cam}</span>
                      <select className="sib-select" value={std} onChange={e => setMap(mapping.id, cam, e.target.value)}>
                        <option value="">Seleziona tipologia…</option>
                        {STANDARD_ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <span className={'cm-map-grid__state' + (std ? ' cm-map-grid__state--ok' : '')}>
                        {std ? <><i className="fa-solid fa-link" aria-hidden="true" /> Parametro associato</> : <span className="cm-map-grid__todo">Da associare</span>}
                      </span>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
            <div className="cm-modal__foot">
              <button type="button" className="cm-btn cm-btn--primary" onClick={() => setMapping(null)}>Fatto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
