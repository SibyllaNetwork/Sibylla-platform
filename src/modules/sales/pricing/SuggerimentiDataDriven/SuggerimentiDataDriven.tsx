import React, { useState, useEffect } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import './SuggerimentiDataDriven.sass'

const SEGMENTS   = [{label:'B2B',value:0,pct:'0 %'},{label:'B2C',value:0,pct:'0 %'},{label:'Complementary',value:0,pct:'0 %'},{label:'Corporate',value:0,pct:'0 %'},{label:'Dirette',value:0,pct:'0 %'},{label:'Gruppi',value:0,pct:'0 %'}]
const BOOKING_IDS = ['Grim\'s Hotel','HOTEL LUCE GHOST 1','Hotel Miranda','Hotel Siracusa test1','test']
const PICKUP_ROWS = [{month:'January',rooms:0,amount:'0,00 €'},{month:'February',rooms:0,amount:'0,00 €'},{month:'March',rooms:0,amount:'0,00 €'},{month:'April',rooms:0,amount:'0,00 €'},{month:'May',rooms:0,amount:'0,00 €'}]
const KPIS        = [{label:'Reservations',value:'0',pct:0},{label:'Occupancy',value:'0%',pct:0},{label:'ADR',value:'0,00 €',pct:0},{label:'Revenue',value:'0,00 €',pct:0}]

const ChartSVG = () => {
  const hours = Array.from({length:24}, (_, i) => ({h:i, v:0}))
  const W=640, H=180, pL=30, pR=14, pT=14, pB=28
  const cW=W-pL-pR, cH=H-pT-pB, maxV=9
  const pts = hours.map((d, i) => ({ x:+(pL+(i/23)*cW).toFixed(1), y:+(pT+cH-(d.v/maxV)*cH).toFixed(1) }))
  const pPath = pts.map((p, i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ')
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0,1,2,3,4,5,6,7,8,9].map(v => { const y=+(pT+cH-(v/maxV)*cH).toFixed(1); return <g key={v}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#E5E7EB" strokeWidth="0.5"/><text x={pL-4} y={y+3} fontSize={8} fill="#9CA3AF" textAnchor="end">{v}</text></g> })}
      {hours.filter((_, i) => i%3===0 || i===23).map(d => { const x=+(pL+(d.h/23)*cW).toFixed(1); return <g key={d.h}><line x1={x} y1={pT} x2={x} y2={pT+cH} stroke="#F3F4F6" strokeWidth="0.5"/><text x={x} y={H-4} fontSize={7} fill="#9CA3AF" textAnchor="middle">{String(d.h).padStart(2,'00')}:00</text></g> })}
      <text x={10} y={H/2} fontSize={8} fill="#9CA3AF" textAnchor="middle" transform={`rotate(-90,10,${H/2})`}>in Euro</text>
      <path d={pPath} fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinejoin="round"/>
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#F59E0B" />)}
    </svg>
  )
}

const Donut = ({ label, value, pct=0 }: { label:string; value:string; pct?:number }) => {
  const cx=56, cy=56, r=44, sw=10, circ=+(2*Math.PI*r).toFixed(2), dash=+((pct/100)*circ).toFixed(2)
  return (
    <div className="ddg__donut-wrap">
      <div className="ddg__donut-svg-wrap">
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth={sw}/>
          {pct>0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#9CA3AF" strokeWidth={sw} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90,${cx},${cy})`}/>}
        </svg>
        <div className="ddg__donut-center">
          <span className={`ddg__donut-value ${pct===0?'ddg__donut-value--lg':''}`}>{value}</span>
        </div>
      </div>
      <span className="ddg__donut-label">{label}</span>
    </div>
  )
}

export default function SuggerimentiDataDriven({ navigate }: { navigate: (p: string) => void }) {
  const [nowTime,   setNowTime]   = useState(new Date())
  const [activeTab, setActiveTab] = useState<'sibylla'|'today'>('sibylla')

  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const DAYS_IT   = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato']
  const MONTHS_IT = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
  const dateStr   = `${DAYS_IT[nowTime.getDay()]} ${nowTime.getDate()} ${MONTHS_IT[nowTime.getMonth()]} ${nowTime.getFullYear()}`

  return (
    <div className="ddg">
      <div className="ddg__inner">

        {/* Header */}
        <div className="ddg__header">
          <h1 className="ddg__title">Data Driven Governance</h1>
          <div className="ddg__header-actions">
            <button className="ddg__home-btn" onClick={() => navigate('home')} title="Torna alla piattaforma">
              <Ico n="home" s={20} c={T.primary} />
            </button>
            <div className="ddg__live-badge">
              <div className="ddg__live-dot" />
              <span className="ddg__live-text">LIVE</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ddg__tabs">
          {['Sibylla','Today'].map(tab => {
            const k = tab.toLowerCase() as 'sibylla'|'today'
            return (
              <button key={tab} className={`ddg__tab ${activeTab === k ? 'ddg__tab--active' : ''}`} onClick={() => setActiveTab(k)}>
                {tab}
              </button>
            )
          })}
          <div className="ddg__tabs-divider" />
        </div>

        {/* Date */}
        <div className="ddg__date">
          <b>Sibylla </b>{dateStr}
        </div>

        {/* 2×2 Grid */}
        <div className="ddg__grid">

          {/* ① Sales Overview */}
          <div className="ddg__panel">
            <div className="ddg__panel-title">Sales Overview</div>
            <div className="ddg__sales-body">
              <div className="ddg__seg-table">
                <div className="ddg__seg-title">Vendite per segmenti</div>
                <table className="ddg__seg-tbl">
                  <tbody>
                    {SEGMENTS.map(s => (
                      <tr key={s.label} className="ddg__seg-row">
                        <td className="ddg__seg-cell">{s.label}</td>
                        <td className="ddg__seg-cell ddg__seg-cell--val">{s.value}</td>
                        <td className="ddg__seg-cell ddg__seg-cell--pct">{s.pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ddg__chart-area">
                <div className="ddg__chart-total">in EURO <span className="ddg__chart-big">0,00 €</span></div>
                <div className="ddg__chart-wrap"><ChartSVG /></div>
              </div>
            </div>
          </div>

          {/* ② Booking IDS */}
          <div className="ddg__panel">
            <div className="ddg__bids-header">
              <div className="ddg__panel-title">Booking IDS</div>
              <div className="ddg__bids-cols">
                <span className="ddg__bids-col-label">CURRENT</span>
                <span className="ddg__bids-col-label">S.D.L.Y.</span>
              </div>
            </div>
            <div className="ddg__bids-list">
              {BOOKING_IDS.map((hotel, i) => (
                <div key={i} className="ddg__bids-row">
                  <span className="ddg__bids-hotel">{hotel}</span>
                  <div className="ddg__bids-vals">
                    <span className="ddg__bids-dash">–</span>
                    <span className="ddg__bids-dash">–</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ③ KPI */}
          <div className="ddg__panel">
            <div className="ddg__panel-title">Key Performance Indicator</div>
            <div className="ddg__kpi-body">
              {KPIS.map(k => <Donut key={k.label} label={k.label} value={k.value} pct={k.pct} />)}
            </div>
          </div>

          {/* ④ Pickup */}
          <div className="ddg__panel">
            <div className="ddg__panel-title">Pick Up on the Book</div>
            <div className="ddg__pickup-body">
              <table className="ddg__pickup-table">
                <thead>
                  <tr>
                    {['Month','Room night','Amount'].map((h, i) => (
                      <th key={h} className={`ddg__pickup-th ${i > 0 ? 'ddg__pickup-th--right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PICKUP_ROWS.map((r, i) => (
                    <tr key={i}>
                      <td className="ddg__pickup-td">{r.month}</td>
                      <td className="ddg__pickup-td ddg__pickup-td--right">{r.rooms}</td>
                      <td className="ddg__pickup-td ddg__pickup-td--right">{r.amount}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="ddg__pickup-td ddg__pickup-td--muted">–</td>
                    <td className="ddg__pickup-td" />
                    <td className="ddg__pickup-td ddg__pickup-td--right ddg__pickup-td--muted">–– –</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="ddg__pickup-footer-td">Totale</td>
                    <td className="ddg__pickup-footer-td ddg__pickup-footer-td--right">0,00 €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
