import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import T from '../../../core/tokens'
import Ico from '../../../core/icons/Ico'
import Modal from '../../../core/components/Modal'
import './SSPI.sass'

/* ════════════════════════════════════════════════════════════════════════
   S.S.P.I — Social Sustainable Profitable Index
   Indice sintetico (centro) circondato dai 6 KPI che lo compongono.
   ════════════════════════════════════════════════════════════════════════ */

interface Kpi {
  id    : string
  label : string
  icon  : string
  color : string
  unit  : string
  desc  : string
  // componenti di dettaglio (label della tabella nel modale)
  parts : string[]
}

const KPIS: Kpi[] = [
  { id:'goppar',  label:'GopPar',                icon:'dollar',     color:'#1d8eb8', unit:'€', desc:'Gross Operating Profit per Available Room',
    parts:['Ricavi camere','Costi operativi','Camere disponibili','GOP netto'] },
  { id:'ros',     label:'Ros',                   icon:'chart-line', color:'#e0a800', unit:'%', desc:'Return on Sales — redditività sulle vendite',
    parts:['Fatturato','Margine operativo','Costo del venduto','Risultato netto'] },
  { id:'prod',    label:'Productivity Capacity', icon:'sliders',    color:'#d9534f', unit:'%', desc:'Capacità produttiva ed efficienza del personale',
    parts:['Ore produttive','Ore disponibili','Output per FTE','Tasso saturazione'] },
  { id:'brand',   label:'Brand Reputation',      icon:'medal',      color:'#5cb85c', unit:'',  desc:'Reputazione, recensioni e percezione del brand',
    parts:['Review score medio','Volume recensioni','Sentiment positivo','Risposte gestite'] },
  { id:'social',  label:'Social',                icon:'share',      color:'#f0813f', unit:'',  desc:'Presenza ed engagement sui canali social',
    parts:['Follower netti','Engagement rate','Reach organica','Contenuti pubblicati'] },
  { id:'sustain', label:'Sustainable',           icon:'leaf',       color:'#4a7fd4', unit:'%', desc:'Indice di sostenibilità ambientale e sociale',
    parts:['Consumo energetico','Rifiuti differenziati','Forniture green','Iniziative attive'] },
]

// Posizioni (%) dei box attorno all'hub — sincronizzate con .sspi__node--N nel .sass
const NODE_POS = [
  { x: 19, y: 19 }, // 0 goppar   (alto-sx)
  { x: 14, y: 50 }, // 1 ros      (centro-sx)
  { x: 19, y: 81 }, // 2 prod     (basso-sx)
  { x: 81, y: 19 }, // 3 brand    (alto-dx)
  { x: 86, y: 50 }, // 4 social   (centro-dx)
  { x: 81, y: 81 }, // 5 sustain  (basso-dx)
]

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
type Quarter = typeof QUARTERS[number]
const CURRENT_YEAR = 2026
const YEARS = [2024, 2025, 2026]

/* ── Generatori deterministici (stessi input → stessi valori) ───────────── */
function seed(n: number): number {
  return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1
}
function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}
function kpiValue(kpiId: string, year: number, q: number): number {
  const base = seed(strHash(kpiId) + year * 11 + q * 3)
  // trend di fondo leggermente crescente negli anni
  const growth = (year - 2024) * 4
  return Math.min(99, Math.max(8, Math.round(28 + base * 58 + growth)))
}
function kpiTrend(kpiId: string, year: number, q: number): { label: string; value: number }[] {
  // ultimi 8 trimestri fino a (year, q) incluso
  const out: { label: string; value: number }[] = []
  let yy = year, qq = q
  const seq: [number, number][] = []
  for (let i = 0; i < 8; i++) { seq.unshift([yy, qq]); qq--; if (qq < 1) { qq = 4; yy-- } }
  for (const [y, k] of seq) out.push({ label: `Q${k}'${String(y).slice(2)}`, value: kpiValue(kpiId, y, k) })
  return out
}

/* ── Count-up animato ───────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1100): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

/* ── Caricamento pptxgenjs (bundle browser) a runtime ───────────────────── */
let pptxPromise: Promise<any> | null = null
function loadPptx(): Promise<any> {
  if ((window as any).PptxGenJS) return Promise.resolve((window as any).PptxGenJS)
  if (pptxPromise) return pptxPromise
  pptxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js'
    s.async = true
    s.onload = () => {
      const lib = (window as any).PptxGenJS
      lib ? resolve(lib) : reject(new Error('pptxgenjs non disponibile'))
    }
    s.onerror = () => { pptxPromise = null; reject(new Error('Impossibile caricare pptxgenjs')) }
    document.head.appendChild(s)
  })
  return pptxPromise
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function SSPI({ navigate }: { navigate: (p: string) => void }) {
  const [year, setYear]       = useState(CURRENT_YEAR)
  const [quarter, setQuarter] = useState<Quarter>('Q2')
  const [openKpi, setOpenKpi] = useState<Kpi | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [inView, setInView]   = useState(false)
  const [exporting, setExporting] = useState(false)

  // Geometria reale dello stage (px) per disegnare i connettori senza distorsioni
  const stageRef = useRef<HTMLDivElement>(null)
  const hubRef   = useRef<HTMLDivElement>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; hubR: number } | null>(null)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const hubW = hubRef.current?.offsetWidth ?? 280
      setGeo({ w: r.width, h: r.height, hubR: hubW / 2 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Connettori dal bordo dell'anello al bordo del box (intersezione col rettangolo)
  const connectors = useMemo(() => {
    if (!geo) return []
    const { w, h, hubR } = geo
    const cx = w / 2, cy = h / 2
    const HW = 104, HH = 40 // semi-dimensioni stimate del box KPI
    return NODE_POS.map((p, i) => {
      const nx = (p.x / 100) * w, ny = (p.y / 100) * h
      const dx = nx - cx, dy = ny - cy
      const len = Math.hypot(dx, dy) || 1
      const ux = dx / len, uy = dy / len
      const sx = cx + ux * (hubR + 6)
      const sy = cy + uy * (hubR + 6)
      // distanza per fermarsi sul bordo del rettangolo del box
      const s = Math.min(HW / (Math.abs(ux) || 1e-6), HH / (Math.abs(uy) || 1e-6))
      const ex = nx - ux * s
      const ey = ny - uy * s
      return { sx, sy, ex, ey, color: KPIS[i].color, i }
    })
  }, [geo])

  const qNum = QUARTERS.indexOf(quarter) + 1

  // Valori KPI + indice complessivo per il periodo selezionato
  const values = useMemo(
    () => KPIS.map(k => ({ kpi: k, value: kpiValue(k.id, year, qNum) })),
    [year, qNum],
  )
  const overall = useMemo(
    () => Math.round(values.reduce((s, v) => s + v.value, 0) / values.length),
    [values],
  )

  const animatedOverall = useCountUp(overall)
  const hoveredKpi = hoveredId ? values.find(v => v.kpi.id === hoveredId) ?? null : null

  // Animazione d'ingresso: linee + box dopo il mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setInView(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const isCurrent = year === CURRENT_YEAR

  /* ── Export PowerPoint ─────────────────────────────────────────────────── */
  const handleExport = async () => {
    setExporting(true)
    try {
      // pptxgenjs ha un entry Node (import `node:fs`) che il webpack di CRA non
      // sa risolvere: carichiamo il bundle browser standalone a runtime via
      // <script>, così non passa dal bundler.
      const PptxGenJS = await loadPptx()
      const pptx = new PptxGenJS()
      pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 })
      pptx.layout = 'W'

      // Slide 1 — copertina indice
      const s1 = pptx.addSlide()
      s1.background = { color: '0E2A47' }
      s1.addText('S.S.P.I', { x: 0.6, y: 0.5, w: 12, h: 0.8, fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Arial' })
      s1.addText('Social Sustainable Profitable Index', { x: 0.6, y: 1.3, w: 12, h: 0.5, fontSize: 16, color: 'A9C4DE' })
      s1.addText(`${year} · ${quarter}`, { x: 0.6, y: 1.9, w: 12, h: 0.4, fontSize: 14, color: '8FB0CC' })
      s1.addText(`${overall}%`, { x: 0.6, y: 3.0, w: 12, h: 2, fontSize: 120, bold: true, color: '3FBF6F', align: 'center' })
      s1.addText('Indice complessivo', { x: 0.6, y: 5.1, w: 12, h: 0.5, fontSize: 16, color: 'A9C4DE', align: 'center' })

      // Slide 2 — tabella KPI
      const s2 = pptx.addSlide()
      s2.addText(`KPI · ${year} ${quarter}`, { x: 0.6, y: 0.4, w: 12, h: 0.6, fontSize: 24, bold: true, color: '0E2A47' })
      const rows: any[] = [[
        { text: 'KPI', options: { bold: true, color: 'FFFFFF', fill: { color: '0E2A47' } } },
        { text: 'Descrizione', options: { bold: true, color: 'FFFFFF', fill: { color: '0E2A47' } } },
        { text: 'Valore', options: { bold: true, color: 'FFFFFF', fill: { color: '0E2A47' }, align: 'center' } },
      ]]
      values.forEach(({ kpi, value }) => {
        rows.push([
          { text: kpi.label, options: { bold: true, color: '0E2A47' } },
          { text: kpi.desc, options: { color: '444444', fontSize: 11 } },
          { text: `${value}${kpi.unit === '%' ? '%' : ''}`, options: { align: 'center', bold: true } },
        ])
      })
      s2.addTable(rows, { x: 0.6, y: 1.2, w: 12.1, colW: [3, 6.6, 2.5], border: { type: 'solid', color: 'DDDDDD', pt: 1 }, fontSize: 13, valign: 'middle', rowH: 0.55 })

      await pptx.writeFile({ fileName: `SSPI_${year}_${quarter}.pptx` })
    } catch (e) {
      console.error('[SSPI] export PowerPoint fallito', e)
      // eslint-disable-next-line no-alert
      window.alert('Export PowerPoint non riuscito. Verifica la connessione e riprova.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="sspi">

      {/* ── Onde di sfondo: al vivo, fino ai margini sinistro e destro ─────── */}
      <svg className="sspi__wave" viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true">
        <path className="sspi__wave-1" d="M-160,170 C100,90 360,90 600,160 C860,235 1100,235 1340,160 C1460,128 1540,150 1600,165 L1600,600 L-160,600 Z" />
        <path className="sspi__wave-2" d="M-160,300 C120,380 320,250 580,275 C880,305 1020,400 1280,300 C1420,250 1520,300 1600,278 L1600,600 L-160,600 Z" />
        <path className="sspi__wave-3" d="M-160,420 C60,350 340,470 600,415 C880,358 1080,475 1340,415 C1460,388 1540,420 1600,405 L1600,600 L-160,600 Z" />
      </svg>

      {/* ── Barra superiore: titolo + controlli ──────────────────────────── */}
      <div className="sspi__topbar">
        <div className="sspi__title-wrap">
          <h1 className="sspi__title">S.S.P.I</h1>
          <p className="sspi__subtitle">Social Sustainable Profitable Index</p>
        </div>

        <div className="sspi__controls">
          {/* Selettore Anno */}
          <div className="sspi__year">
            <button
              className="sspi__year-btn"
              onClick={() => setYear(y => Math.max(YEARS[0], y - 1))}
              disabled={year <= YEARS[0]}
              aria-label="Anno precedente"
            >
              <Ico n="back" s={13} c="currentColor" />
            </button>
            <span className="sspi__year-val">{year}</span>
            <button
              className="sspi__year-btn"
              onClick={() => setYear(y => Math.min(CURRENT_YEAR, y + 1))}
              disabled={year >= CURRENT_YEAR}
              aria-label="Anno successivo"
            >
              <Ico n="chevr" s={13} c="currentColor" />
            </button>
          </div>

          {/* Selettore Quarter */}
          <div className="sspi__quarters" role="tablist" aria-label="Trimestre">
            {QUARTERS.map(q => (
              <button
                key={q}
                role="tab"
                aria-selected={quarter === q}
                className={`sspi__q ${quarter === q ? 'sspi__q--active' : ''}`}
                onClick={() => setQuarter(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Torna all'anno corrente */}
          {!isCurrent && (
            <button
              className="sspi__today"
              onClick={() => { setYear(CURRENT_YEAR); setQuarter('Q2') }}
            >
              <Ico n="refresh" s={13} c="currentColor" /> Anno corrente
            </button>
          )}

          {/* Export PowerPoint */}
          <button className="sspi__export" onClick={handleExport} disabled={exporting} title="Esporta in PowerPoint">
            <Ico n={exporting ? 'hourglass' : 'download'} s={14} c="currentColor" />
            {exporting ? 'Esporto…' : 'PowerPoint'}
          </button>
        </div>
      </div>

      {/* ── Stage: hub centrale + box orbitanti + linee animate ──────────── */}
      <div ref={stageRef} className={`sspi__stage ${inView ? 'is-in' : ''}`}>

        {/* Connettori SSPI → KPI: gradiente, glow, disegno animato + scintilla viaggiante */}
        {geo && (
          <svg
            className="sspi__links"
            width={geo.w} height={geo.h}
            viewBox={`0 0 ${geo.w} ${geo.h}`}
            aria-hidden="true"
          >
            <defs>
              <filter id="sspi-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {connectors.map(c => (
                <linearGradient
                  key={c.i} id={`sspi-cl-${c.i}`} gradientUnits="userSpaceOnUse"
                  x1={c.sx} y1={c.sy} x2={c.ex} y2={c.ey}
                >
                  <stop offset="0%"  stopColor="var(--color-primary)" stopOpacity="0.12" />
                  <stop offset="55%" stopColor={c.color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={c.color} stopOpacity="0.95" />
                </linearGradient>
              ))}
            </defs>

            <g filter="url(#sspi-glow)">
              {connectors.map(c => (
                <path
                  key={c.i}
                  id={`sspi-clp-${c.i}`}
                  className={`sspi__link${hoveredId === KPIS[c.i].id ? ' is-hot' : ''}${hoveredId != null && hoveredId !== KPIS[c.i].id ? ' is-dim' : ''}`}
                  d={`M${c.sx},${c.sy} L${c.ex},${c.ey}`}
                  pathLength={1}
                  style={{ stroke: `url(#sspi-cl-${c.i})`, '--i': c.i } as React.CSSProperties}
                />
              ))}
            </g>

            {/* Scintille che viaggiano dall'indice verso ciascun KPI */}
            {inView && connectors.map(c => (
              <circle key={c.i} className="sspi__spark" r={3.2} fill={c.color} filter="url(#sspi-glow)">
                <animateMotion dur="2.6s" begin={`${1 + c.i * 0.2}s`} repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href={`#sspi-clp-${c.i}`} />
                </animateMotion>
                <animate attributeName="opacity" dur="2.6s" begin={`${1 + c.i * 0.2}s`} repeatCount="indefinite" values="0;1;1;0.9;0" keyTimes="0;0.1;0.7;0.9;1" />
              </circle>
            ))}
          </svg>
        )}

        {/* Hub centrale */}
        <div ref={hubRef} className="sspi__hub">
          <HelmGauge values={values} animate={inView} hoveredId={hoveredId} onHover={setHoveredId} onOpen={setOpenKpi} />
          <div className="sspi__hub-content">
            <div className="sspi__hub-inner" key={hoveredId || 'sspi'}>
              {hoveredKpi ? (
                <div className="sspi__hub-kpi" style={{ '--accent': hoveredKpi.kpi.color } as React.CSSProperties}>
                  <span className="sspi__hub-kpi-ico"><Ico n={hoveredKpi.kpi.icon} s={22} c={hoveredKpi.kpi.color} /></span>
                  <span className="sspi__hub-kpi-val">{hoveredKpi.value}<i>%</i></span>
                  <span className="sspi__hub-kpi-label">{hoveredKpi.kpi.label}</span>
                  <span className="sspi__hub-kpi-hint">clicca per il dettaglio</span>
                </div>
              ) : (
                <>
                  <span className="sspi__hub-label">SSPI</span>
                  <span className="sspi__hub-value">{animatedOverall.toFixed(0)}<i>%</i></span>
                  <span className="sspi__hub-period">{year} · {quarter}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Box KPI orbitanti */}
        {values.map(({ kpi, value }, i) => (
          <KpiBox
            key={kpi.id}
            kpi={kpi}
            value={value}
            pos={NODE_POS[i]}
            index={i}
            inView={inView}
            hot={hoveredId === kpi.id}
            dim={hoveredId != null && hoveredId !== kpi.id}
            onHover={setHoveredId}
            onOpen={() => setOpenKpi(kpi)}
          />
        ))}
      </div>

      {/* ── Modale dettaglio KPI ─────────────────────────────────────────── */}
      {openKpi && (
        <KpiDetail
          kpi={openKpi}
          value={kpiValue(openKpi.id, year, qNum)}
          year={year}
          quarter={quarter}
          qNum={qNum}
          onClose={() => setOpenKpi(null)}
        />
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Timone centrale — cerchione (ruota) con 8 maniglie + anelli KPI concentrici
   ════════════════════════════════════════════════════════════════════════ */
function HelmGauge({
  values, animate, hoveredId, onHover, onOpen,
}: {
  values: { kpi: Kpi; value: number }[]
  animate: boolean
  hoveredId: string | null
  onHover: (id: string | null) => void
  onOpen: (k: Kpi) => void
}) {
  const C = 240                       // centro (viewBox 480)
  const RIM = 196                     // raggio cerchione
  const HANDLE_R = 212                // centro maniglie
  const RING_R = [172, 154, 136, 118, 100, 82] // raggi anelli KPI (esterno → interno)
  const RING_W = 12
  const HANDLES = [0, 45, 90, 135, 180, 225, 270, 315]

  return (
    <svg className="sspi__helm" viewBox="0 0 480 480" aria-hidden="true">
      {/* Cerchione + maniglie del timone (blu platform) */}
      <g className="sspi__helm-wheel" style={{ color: T.primary } as React.CSSProperties}>
        {HANDLES.map(a => {
          const rad = ((a - 90) * Math.PI) / 180
          const hx = C + HANDLE_R * Math.cos(rad)
          const hy = C + HANDLE_R * Math.sin(rad)
          return (
            <rect
              key={a} className="sspi__helm-handle"
              x={hx - 8} y={hy - 19} width={16} height={38} rx={8}
              transform={`rotate(${a} ${hx} ${hy})`}
            />
          )
        })}
        <circle className="sspi__helm-rim" cx={C} cy={C} r={RIM} />
        <circle className="sspi__helm-rim-in" cx={C} cy={C} r={RIM - 14} />
      </g>

      {/* Anelli KPI concentrici — ruotati per partire dall'alto */}
      <g transform={`rotate(-90 ${C} ${C})`}>
        {values.map((v, i) => {
          const r = RING_R[i]
          const circ = 2 * Math.PI * r
          const off = animate ? circ * (1 - v.value / 100) : circ
          const hot = hoveredId === v.kpi.id
          const dim = hoveredId != null && !hot
          const cls = `sspi__helm-fill${hot ? ' is-hot' : ''}${dim ? ' is-dim' : ''}`
          return (
            <g key={v.kpi.id}>
              <circle
                className={`sspi__helm-track${dim ? ' is-dim' : ''}`} cx={C} cy={C} r={r}
                style={{ '--w': RING_W } as React.CSSProperties}
              />
              <circle
                className={cls} cx={C} cy={C} r={r}
                style={{ color: v.kpi.color, stroke: v.kpi.color, '--w': RING_W, strokeDasharray: circ, strokeDashoffset: off } as React.CSSProperties}
              />
              <circle className={`sspi__helm-dot${dim ? ' is-dim' : ''}`} cx={C + r} cy={C} r={hot ? 7 : 5.2} style={{ fill: v.kpi.color, color: v.kpi.color } as React.CSSProperties} />
              {/* hit-area trasparente per facilitare il rollover */}
              <circle
                className="sspi__helm-hit" cx={C} cy={C} r={r}
                onMouseEnter={() => onHover(v.kpi.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onOpen(v.kpi)}
              />
            </g>
          )
        })}
      </g>

      {/* Disco centrale */}
      <circle className="sspi__helm-core" cx={C} cy={C} r={64} />
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Box KPI orbitante
   ════════════════════════════════════════════════════════════════════════ */
function KpiBox({
  kpi, value, pos, index, inView, hot, dim, onHover, onOpen,
}: {
  kpi: Kpi; value: number; pos: { x: number; y: number }; index: number; inView: boolean
  hot: boolean; dim: boolean; onHover: (id: string | null) => void; onOpen: () => void
}) {
  const animatedVal = useCountUp(value, 1200)
  // mini-anello del box
  const r = 22, c = 2 * Math.PI * r
  const off = inView ? c * (1 - value / 100) : c

  return (
    <button
      type="button"
      className={`sspi__node ${inView ? 'is-in' : ''}${hot ? ' is-hot' : ''}${dim ? ' is-dim' : ''}`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--accent': kpi.color, '--i': index } as React.CSSProperties}
      onMouseEnter={() => onHover(kpi.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onOpen}
    >
      <span className="sspi__node-gauge">
        <svg viewBox="0 0 52 52">
          <circle className="sspi__node-track" cx="26" cy="26" r={r} />
          <circle
            className="sspi__node-fill" cx="26" cy="26" r={r}
            style={{ strokeDasharray: c, strokeDashoffset: off } as React.CSSProperties}
          />
        </svg>
        <Ico n={kpi.icon} s={18} c={kpi.color} />
      </span>
      <span className="sspi__node-body">
        <span className="sspi__node-val">{animatedVal.toFixed(0)}<i>{kpi.unit === '%' ? '%' : '%'}</i></span>
        <span className="sspi__node-label">{kpi.label}</span>
      </span>
      <span className="sspi__node-go"><Ico n="arrow-right" s={13} c="currentColor" /></span>
    </button>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Modale dettaglio KPI
   ════════════════════════════════════════════════════════════════════════ */
function KpiDetail({
  kpi, value, year, quarter, qNum, onClose,
}: {
  kpi: Kpi; value: number; year: number; quarter: string; qNum: number; onClose: () => void
}) {
  const trend = useMemo(() => kpiTrend(kpi.id, year, qNum), [kpi.id, year, qNum])
  const prev = trend.length >= 2 ? trend[trend.length - 2].value : value
  const delta = value - prev
  const positive = delta >= 0

  // tabella di dettaglio: i "parts" con valori derivati
  const tableRows = kpi.parts.map((p) => {
    const v = Math.round(20 + seed(strHash(kpi.id + p) + year + qNum) * 80)
    const d = Math.round((seed(strHash(p + kpi.id) + qNum) - 0.5) * 24)
    return { label: p, value: v, delta: d }
  })

  return (
    <Modal open onClose={onClose} size="xl" className="sspi-modal">
      <div className="sspi-modal__head" style={{ '--accent': kpi.color } as React.CSSProperties}>
        <span className="sspi-modal__icon"><Ico n={kpi.icon} s={22} c={kpi.color} /></span>
        <div className="sspi-modal__head-text">
          <h2 className="sspi-modal__title">{kpi.label}</h2>
          <p className="sspi-modal__desc">{kpi.desc}</p>
        </div>
        <div className="sspi-modal__score">
          <span className="sspi-modal__score-val">{value}<i>%</i></span>
          <span className={`sspi-modal__delta sspi-modal__delta--${positive ? 'pos' : 'neg'}`}>
            <Ico n={positive ? 'trend-up' : 'trend-down'} s={12} c="currentColor" />
            {positive ? '+' : ''}{delta} pt
          </span>
        </div>
        <button className="sspi-modal__close" onClick={onClose} aria-label="Chiudi"><Ico n="x" s={18} c="currentColor" /></button>
      </div>

      <div className="sspi-modal__period">{year} · {quarter}</div>

      <div className="sspi-modal__grid">
        {/* Analisi del trend */}
        <section className="sspi-modal__panel">
          <h3 className="sspi-modal__panel-title"><Ico n="chart-line" s={13} c={T.primary} /> Analisi del trend</h3>
          <div className="sspi-modal__chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={kpi.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ececf0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6e7175' }} axisLine={{ stroke: '#cfcfcf' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6e7175' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dbdbdb', fontSize: 12 }} formatter={(v) => [`${v}%`, kpi.label]} />
                <Area type="monotone" dataKey="value" name={kpi.label} stroke={kpi.color} strokeWidth={2.4} fill={`url(#grad-${kpi.id})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Tabella di dettaglio */}
        <section className="sspi-modal__panel">
          <h3 className="sspi-modal__panel-title"><Ico n="bullseye" s={13} c={T.primary} /> Composizione &amp; target</h3>
          <table className="sib-table sspi-modal__table">
            <thead>
              <tr><th>Componente</th><th>Valore</th><th>Δ trim.</th></tr>
            </thead>
            <tbody>
              {tableRows.map(r => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.value}</td>
                  <td className={r.delta >= 0 ? 'sspi-modal__td-pos' : 'sspi-modal__td-neg'}>
                    {r.delta >= 0 ? '+' : ''}{r.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Commento descrittivo */}
      <section className="sspi-modal__comment">
        <h3 className="sspi-modal__panel-title"><Ico n="file" s={13} c={T.primary} /> Commento</h3>
        <p>
          Nel periodo <strong>{quarter} {year}</strong> l'indicatore <strong>{kpi.label}</strong> si attesta
          al <strong>{value}%</strong>, {positive ? 'in crescita' : 'in calo'} di <strong>{Math.abs(delta)} punti</strong> rispetto
          al trimestre precedente. {kpi.desc}. {positive
            ? 'Il contributo all’indice SSPI complessivo è positivo: si consiglia di consolidare le azioni in corso.'
            : 'Il contributo all’indice SSPI complessivo è in flessione: valutare interventi correttivi mirati.'}
        </p>
      </section>
    </Modal>
  )
}
