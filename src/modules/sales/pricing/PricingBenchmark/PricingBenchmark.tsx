import React, { useState } from 'react'
import T from '../../../../core/tokens'
import BtnBack from '../../../../core/components/BtnBack'
import Modal from '../../../../core/components/Modal'
import PageHeader from '../../../../core/components/PageHeader'
import './PricingBenchmark.sass'

const MCOLS  = ['#5C9CD4','#E74C3C','#5A8A3C','#C4A820','#9B59B6','#E07B39','#204769']
const HOTELS = [
  {name:'Villa Grazioli Boutique Hotel', addr:'Via Salaria, 241, Roma',   rating:4,   mx:62, my:24},
  {name:'Hotel Panama Garden',           addr:'Via Salaria, 336, Roma',   rating:4.5, mx:74, my:18},
  {name:'Buenos Aires Hotel',            addr:'Via Clitunno, 9, Roma',    rating:4,   mx:55, my:42},
  {name:'Sinergetica S.r.l.',            addr:'Via Salaria, 292, Roma',   rating:null,mx:68, my:33},
  {name:'Terrazze Di Villa Grazioli',    addr:'Via Lovanio, 16, Roma',    rating:null,mx:46, my:55},
  {name:'Lares srls',                    addr:'sdhsdhethatj, Roma',       rating:null,mx:76, my:54},
  {name:'Kl',                            addr:'Roma',                     rating:3,   mx:38, my:68},
]

// ─── Stars (star SVG è data-driven per fill parziale — manteniamo SVG) ────────
const Stars = ({rating}:{rating:number|null}) => {
  if (rating===null) return <span className="benchmark__no-rating">Rating not available</span>
  return (
    <div className="benchmark__stars">
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width={11} height={11} viewBox="0 0 24 24" fill={i<=Math.floor(rating)?'#F59E0B':'none'} stroke="#F59E0B" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

export default function PricingBenchmark({ navigate }: { navigate: (p:string)=>void }) {
  const [capSearch,    setCapSearch]    = useState('00100 Roma, RM, Ital')
  const [paese,        setPaese]        = useState('Italia')
  const [struttura,    setStruttura]    = useState('ciao')
  const [activeView,   setActiveView]   = useState<'brand'|'pricing'>('pricing')
  const [activePeriod, setActivePeriod] = useState<30|60|90>(30)
  const [monitoring,   setMonitoring]   = useState(['Hotel Elyse','Hotel Felice','Ritmo Blues B&B','Città Eterna guesthouse','Hotel Viennese'])
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [pendingHotel, setPendingHotel] = useState<{name:string}|null>(null)

  const handleAdd    = (h:{name:string}) => { if (!monitoring.includes(h.name)) { setPendingHotel(h); setShowConfirm(true) } }
  const confirmAdd   = () => { if (pendingHotel) setMonitoring(p=>[...p,pendingHotel.name]); setShowConfirm(false); setPendingHotel(null) }
  const handleRemove = (name:string) => setMonitoring(p=>p.filter(h=>h!==name))

  const cd = Array.from({length:Math.min(activePeriod,20)},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-Math.min(activePeriod,20)+i)
    return { lbl:`${d.getDate()}/${d.getMonth()+1}`, vals:monitoring.map((_,hi)=>{ const s=(i*7+hi*13)%100; return activeView==='brand'?9.5+(s%50)/100:80+(s%200) }) }
  })

  // ─── ChartSVG (data-driven — manteniamo SVG) ────────────────────────────────
  const ChartSVG = () => {
    if (!cd.length||!monitoring.length) return null
    const W=460,H=170,pL=44,pR=12,pT=14,pB=28,cW=W-pL-pR,cH=H-pT-pB
    const isB=activeView==='brand', yMin=isB?9.4:0, yMax=isB?10.1:300, yR=yMax-yMin
    const tx=(i:number)=>+(cd.length>1?pL+i/(cd.length-1)*cW:pL+cW/2).toFixed(1)
    const ty=(v:number)=>+(pT+cH-((v-yMin)/yR)*cH).toFixed(1)
    const yTks=isB?[9.5,9.6,9.7,9.8,9.9,10.0]:[0,50,100,150,200,250]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {yTks.map(v=>{const y=ty(v);return<g key={v}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#F0F0F0" strokeWidth=".5"/><text x={pL-4} y={y+3} fontSize={7} fill="#9CA3AF" textAnchor="end">{isB?v.toFixed(1):v}</text></g>})}
        {cd.map((d,i)=>i%Math.max(1,Math.floor(cd.length/5))===0?<text key={i} x={tx(i)} y={H-6} fontSize={7} fill="#9CA3AF" textAnchor="middle">{d.lbl}</text>:null)}
        {monitoring.map((_,hi)=>{const pts=cd.map((d,i)=>`${i===0?'M':'L'}${tx(i)},${ty(d.vals[hi]??yMin)}`).join(' ');return<path key={hi} d={pts} fill="none" stroke={MCOLS[hi%MCOLS.length]} strokeWidth="1.5" strokeLinejoin="round"/>})}
      </svg>
    )
  }

  // ─── View toggle buttons ─────────────────────────────────────────────────────
  const ViewBtn = ({view,label,icon}:{view:'brand'|'pricing';label:string;icon:string}) => (
    <button
      className={`sib-btn ${activeView===view ? 'sib-btn--primary' : 'sib-btn--toolbar'}`}
      onClick={()=>setActiveView(view)}
    >
      <i className={`fa-duotone ${icon} benchmark__view-ico`} aria-hidden="true"/>
      {label}
    </button>
  )

  return (
    <div>
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader title="Pricing Benchmark" subtitle="Raffronto con i competitor su pricing e brand reputation"/>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="benchmark__filters">
        <div className="benchmark__filters-left">
          <div><label className="text-[11px] font-semibold font-opensans text-ink">Trova hotel:</label><input className="sib-input" value={capSearch} onChange={e=>setCapSearch(e.target.value)} placeholder="CAP o indirizzo..."/></div>
          <div><label className="text-[11px] font-semibold font-opensans text-ink">Paese</label><select className="sib-select" value={paese} onChange={e=>setPaese(e.target.value)}>{['Italia','Francia','Spagna','Germania'].map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label className="text-[11px] font-semibold font-opensans text-ink">Strutture</label><select className="sib-select" value={struttura} onChange={e=>setStruttura(e.target.value)}>{['ciao','Hotel Noto','Grand Hotel Roma'].map(s=><option key={s}>{s}</option>)}</select></div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex gap-2 h-9">
            <ViewBtn view="brand"   label="Brand reputation" icon="fa-star"/>
            <ViewBtn view="pricing" label="Pricing"           icon="fa-chart-line"/>
          </div>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div className="benchmark__layout">

        {/* Map + hotel list */}
        <div className="benchmark__map-panel">
          {/* Map */}
          <div className="benchmark__map">
            <svg className="benchmark__map-svg" viewBox="0 0 420 500" preserveAspectRatio="xMidYMid slice">
              <rect width="420" height="500" fill="#EDE8E1"/>
              <ellipse cx="170" cy="110" rx="90" ry="70" fill="#C8D8A0"/>
              <rect x="330" y="40" width="80" height="60" rx="6" fill="#D0DC9E"/>
              <path d="M -10 310 Q 60 290 130 320 Q 190 340 250 325 Q 310 310 370 330 Q 400 338 430 328" fill="none" stroke="#A8C4D4" strokeWidth="28"/>
              <line x1="0" y1="200" x2="420" y2="200" stroke="#FFF" strokeWidth="7" opacity=".7"/>
              <line x1="200" y1="0" x2="200" y2="500" stroke="#FFF" strokeWidth="7" opacity=".7"/>
              {[[110,170,80,28],[220,175,70,22],[245,210,60,28],[115,210,58,22],[302,170,48,22]].map(([x,y,w,h],i)=>(
                <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill="#D8D0C4" opacity=".55"/>
              ))}
            </svg>
            {HOTELS.map((h,i)=>(
              <div key={i} title={h.name} className="benchmark__map-marker" style={{ '--marker-left': `${h.mx}%`, '--marker-top': `${h.my}%` } as React.CSSProperties}>
                <div className="benchmark__map-pin"
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1.2)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}>
                  {i+1}
                </div>
              </div>
            ))}
          </div>

          {/* Hotel list */}
          <div className="benchmark__hotel-list">
            {HOTELS.map((h,i)=>{
              const alreadyAdded = monitoring.includes(h.name)
              return (
                <div key={i} className="benchmark__hotel-item">
                  <div className="benchmark__hotel-item-inner">
                    <div className="benchmark__hotel-info">
                      <Stars rating={h.rating}/>
                      <div className="benchmark__hotel-name">{h.name}</div>
                      <div className="benchmark__hotel-addr">{h.addr}</div>
                    </div>
                    <button className="benchmark__hotel-add-btn" onClick={()=>handleAdd(h)} disabled={alreadyAdded}>
                      <i className="fa-duotone fa-plus benchmark__hotel-add-ico" style={{ '--add-ico-color': alreadyAdded?T.textDisabled:T.primary } as React.CSSProperties} aria-hidden="true"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monitor panel */}
        <div className="benchmark__monitor-panel">
          <div className="benchmark__monitor-header">
            <div className="benchmark__monitor-title">Lista di monitoraggio</div>
            <div className="benchmark__monitor-your-hotel">
              <span className="benchmark__your-hotel-name">{struttura}</span>
              <div className="benchmark__your-hotel-label">
                <i className="fa-duotone fa-building benchmark__your-hotel-ico" aria-hidden="true"/>
                <span className="benchmark__your-hotel-text">Il tuo hotel</span>
              </div>
            </div>
          </div>

          <div className="benchmark__monitor-list">
            {monitoring.length===0 && (
              <div className="benchmark__monitor-empty">Nessun hotel nella lista</div>
            )}
            {monitoring.map((hotel,i)=>(
              <div key={i} className="benchmark__monitor-item">
                <span className="benchmark__monitor-item-name">{hotel}</span>
                <div className="benchmark__monitor-item-actions">
                  <button className="benchmark__monitor-delete" onClick={()=>handleRemove(hotel)}>
                    <i className="fa-duotone fa-trash benchmark__monitor-delete-ico" aria-hidden="true"/>
                  </button>
                  <button className="benchmark__monitor-link-btn">
                    <i className="fa-duotone fa-link benchmark__monitor-link-ico" aria-hidden="true"/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="benchmark__chart-controls">
            <button className="benchmark__chart-close-btn">
              <i className="fa-duotone fa-xmark benchmark__chart-close-ico" aria-hidden="true"/>
            </button>
            {([30,60,90] as const).map(p=>(
              <button key={p} className={`benchmark__period-btn ${activePeriod===p?'benchmark__period-btn--active':''}`} onClick={()=>setActivePeriod(p)}>
                <i className="fa-duotone fa-calendar benchmark__period-ico" aria-hidden="true"/>
                {p}
              </button>
            ))}
            <span className="benchmark__chart-label">
              {activeView==='brand'?'Brand reputation (Booking)':'Pricing'}
            </span>
            <div className="benchmark__info-btn">
              <i className="fa-duotone fa-circle-info benchmark__info-ico" aria-hidden="true"/>
            </div>
          </div>

          <div className="benchmark__chart-wrap">
            <ChartSVG/>
            {monitoring.length>0 && (
              <div className="benchmark__legend">
                {monitoring.map((h,i)=>(
                  <div key={h} className="benchmark__legend-item">
                    <div className="benchmark__legend-line" style={{ '--legend-line-bg': MCOLS[i%MCOLS.length] } as React.CSSProperties}/>
                    <span className="benchmark__legend-label">{h.length>16?h.slice(0,15)+'…':h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal conferma ──────────────────────────────────────────── */}
      <Modal open={showConfirm} onClose={()=>{setShowConfirm(false);setPendingHotel(null)}} size="sm">
        <div>
          <h2 className="benchmark__modal-title">Aggiungere hotel</h2>
          <p className="benchmark__modal-text">
            Sei sicuro di voler aggiungere hotel<br/>
            <strong>{pendingHotel?.name}</strong>?
          </p>
          <div className="benchmark__modal-actions">
            <button className="benchmark__modal-confirm"
              onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background='#FFF0F0'}
              onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='transparent'}
              onClick={confirmAdd}>
              Procedi
            </button>
            <button className="sib-btn sib-btn--secondary" onClick={()=>{setShowConfirm(false);setPendingHotel(null)}}>Annulla</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
