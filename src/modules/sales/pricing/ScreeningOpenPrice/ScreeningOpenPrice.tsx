import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import Modal from '../../../../core/components/Modal'
import PageHead from '../../../../core/components/PageHead'
import Pagination from '../../../../core/components/Pagination'
import './ScreeningOpenPrice.sass'
import { SelectField, DateRangeField } from '../../../../core/components/form'

const ROOMS = [
  {label:'Singola Classic',  base:153.68},{label:'Doppia Classic',   base:186.24},
  {label:'Doppia Economy',   base:140.00},{label:'Tripla Classic',   base:195.00},
  {label:'Matrimoniale Cls', base:172.00},{label:'Matrimoniale DLX', base:233.83},
  {label:'Matrimoniale Ste', base:220.00},{label:'Doppia Conv Std',  base:247.98},
  {label:'Doppia Conv DLX',  base:220.30},
]
const MFULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

const AreaChart = ({cd}:{cd:any[]}) => {
  const W=540, H=220, pL=50, pR=16, pT=16, pB=48
  const cW=W-pL-pR, cH=H-pT-pB, maxV=200
  const tx = (i:number) => +(pL+i/(cd.length-1)*cW).toFixed(1)
  const ty = (v:number) => +(pT+cH-Math.min(v,maxV)/maxV*cH).toFixed(1)
  const line = (k:string) => cd.map((d,i) => `${i===0?'M':'L'}${tx(i)},${ty(d[k])}`).join(' ')
  const area = (k:string) => `${line(k)} L${tx(cd.length-1)},${pT+cH} L${pL},${pT+cH} Z`
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5C9CD4" stopOpacity=".65"/><stop offset="100%" stopColor="#5C9CD4" stopOpacity=".05"/></linearGradient>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E91E63" stopOpacity=".55"/><stop offset="100%" stopColor="#E91E63" stopOpacity=".05"/></linearGradient>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#CE93D8" stopOpacity=".5"/><stop offset="100%" stopColor="#CE93D8" stopOpacity=".05"/></linearGradient>
      </defs>
      {[0,20,40,60,80,100,120,140,160,180,200].map(v => { const y=ty(v); return <g key={v}><line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#F0F0F0" strokeWidth=".5"/><text x={pL-4} y={y+3} fontSize={8} fill="#9CA3AF" textAnchor="end">{v} €</text></g> })}
      <path d={area('str')} fill="url(#sg)"/><path d={area('ai')} fill="url(#ag)"/><path d={area('ly')} fill="url(#lg)"/>
      <path d={line('str')} fill="none" stroke="#5C9CD4" strokeWidth={2}/><path d={line('ai')} fill="none" stroke="#E91E63" strokeWidth={2}/><path d={line('ly')} fill="none" stroke="#CE93D8" strokeWidth={1.5}/>
      {cd.map((d,i) => <g key={i}><circle cx={tx(i)} cy={ty(d.str)} r={3} fill="#5C9CD4"/><circle cx={tx(i)} cy={ty(d.ai)} r={3} fill="#E91E63"/>{i%3===0&&<text x={tx(i)} y={H-8} fontSize={7} fill="#9CA3AF" textAnchor="end" transform={`rotate(-40,${tx(i)},${H-8})`}>{d.lbl}</text>}</g>)}
    </svg>
  )
}

const genData = (struttura:string, from:string, to:string) => {
  const arr:any[] = []
  const s = new Date(from+'T00:00:00'), e = new Date(to+'T00:00:00')
  let c = new Date(s), id = 0
  while (c <= e) {
    const dd=c.getDate(), mm=c.getMonth(), yy=c.getFullYear()
    const ds = `${String(dd).padStart(2,'0')}/${String(mm+1).padStart(2,'0')}/${yy}`
    ROOMS.forEach((rm,ri) => {
      const seed=(dd*17+ri*29+(mm+1)*11)%100, hasP=seed>30
      const att=hasP?Math.round((rm.base+(seed%30)-15)*100)/100:0
      const ai=Math.round(rm.base*(0.52+(seed%40)/100)*100)/100
      const del=Math.round((ai-att)*100)/100
      arr.push({ id:id++, day:dd, month:mm, year:yy, date:ds, struttura, tipologia:rm.label, att, ai, del, hasP,
        attS:att>0?`${att.toFixed(2).replace('.',',')} €`:'0,00 €', aiS:`${ai.toFixed(2).replace('.',',')} €`, delS:`${del.toFixed(2).replace('.',',')} €` })
    })
    c = new Date(c.getFullYear(), c.getMonth(), c.getDate()+1)
  }
  return arr
}

export default function ScreeningOpenPrice({ navigate }: { navigate: (p:string)=>void }) {
  const [struttura,  setStruttura]  = useState('Hotel Siracusa')
  const [inputFrom,  setInputFrom]  = useState('2026-04-07')
  const [inputTo,    setInputTo]    = useState('2026-05-07')
  const [loading,    setLoading]    = useState(false)
  const [pg,         setPg]         = useState(1)
  const [showModal,  setShowModal]  = useState(false)
  const [modalRow,   setModalRow]   = useState<any>(null)
  const [modalOff,   setModalOff]   = useState(0)
  const [selected,   setSelected]   = useState<Set<number>>(new Set())
  const [selectAll,  setSelectAll]  = useState(false)
  const [data,       setData]       = useState<any[]>(() => genData('Hotel Siracusa', '2026-04-07', '2026-05-07'))
  const [activeFrom, setActiveFrom] = useState('2026-04-07')
  const [activeTo,   setActiveTo]   = useState('2026-05-07')

  const getDIM = (y:number,m:number) => new Date(y,m+1,0).getDate()
  const calMonths:Array<{year:number;month:number}> = []
  { const s=new Date(activeFrom+'T00:00:00'), e=new Date(activeTo+'T00:00:00'); let c=new Date(s.getFullYear(),s.getMonth(),1); while(c<=e&&calMonths.length<13){calMonths.push({year:c.getFullYear(),month:c.getMonth()});c=new Date(c.getFullYear(),c.getMonth()+1,1);} }
  const dayHasP = (y:number,m:number,d:number) => data.some(r=>r.year===y&&r.month===m&&r.day===d&&r.hasP)

  const triggerLoad = () => {
    if (!inputFrom||!inputTo||inputFrom>inputTo) return
    setLoading(true); setPg(1); setSelected(new Set()); setSelectAll(false)
    setTimeout(() => { setData(genData(struttura,inputFrom,inputTo)); setActiveFrom(inputFrom); setActiveTo(inputTo); setLoading(false) }, 2800)
  }

  const PER=10, total=Math.ceil(data.length/PER), pageData=data.slice((pg-1)*PER,pg*PER)
  const getChart = (row:any) => Array.from({length:15},(_,i)=>{ const s=(row.id*7+i*13)%100; return{lbl:`2026-04-${String(7+i).padStart(2,'0')}`,str:Math.max(0,20+(s%160)),ai:Math.max(0,40+(s%50)),ly:Math.max(0,s%15)} })

  return (
    <div className="screening__root">
      {loading && (
        <div className="screening__loading-overlay">
          {([{top:30,left:30,size:80,dur:8,rev:false},{top:50,right:50,size:60,dur:12,rev:true},{bottom:40,left:80,size:70,dur:10,rev:false},{bottom:50,right:30,size:90,dur:7,rev:true}] as any[]).map((g,i)=>(
            <div key={i} className="screening__loading-gear" style={{
              '--gear-top':    g.top    != null ? `${g.top}px`    : 'auto',
              '--gear-bottom': g.bottom != null ? `${g.bottom}px` : 'auto',
              '--gear-left':   g.left   != null ? `${g.left}px`   : 'auto',
              '--gear-right':  g.right  != null ? `${g.right}px`  : 'auto',
              '--gear-dur':    `${g.dur}s`,
              '--gear-dir':    g.rev ? 'reverse' : 'normal',
            } as React.CSSProperties}>
              <Ico n="gear" s={g.size} c="#5C9CD4"/>
            </div>
          ))}
          <div className="screening__loading-card">
            <div className="screening__loading-dots">
              {[0,1,2].map(i=>(
                <div key={i} className="screening__loading-dot" style={{ '--dot-delay': `${i*0.2}s` } as React.CSSProperties}/>
              ))}
            </div>
            <p className="screening__loading-text">
              Stiamo sincronizzando e analizzando<br/>dati provenienti da fonti dati esterne
            </p>
          </div>
        </div>
      )}

      <PageHead title="Screening open price" subtitle="Aumenta l'accuratezza dei suggerimenti attraverso uno screening dedicato per ogni tipologia di camera assegnata a ciascun canale di vendita"/>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="screening__filters-row">
        <div className="screening__filters-left">
          <SelectField
            name="struttura"
            label="Struttura"
            value={struttura}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
            options={['Hotel Siracusa','Hotel Noto','Grand Hotel Roma'].map(s => ({ value: s, label: s }))}
            className="screening__select--struttura"
          />
          <DateRangeField
            label="Date"
            nameFrom="inputFrom"
            nameTo="inputTo"
            valueFrom={inputFrom}
            valueTo={inputTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => { setInputFrom(e.target.value); }}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => { setInputTo(e.target.value); triggerLoad() }}
            className="screening__date-range"
          />
        </div>
        <button className="sib-btn sib-btn--toolbar">Salva</button>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="screening__layout">

        {/* Calendar */}
        <div className="screening__cal-wrap">
          <div className="screening__cal-scroll">
            <table className="screening__cal-table">
              <thead>
                <tr>
                  <th className="screening__cal-th-giorni">Giorni</th>
                  {Array.from({length:31},(_,i)=>(
                    <th key={i} className={`screening__cal-th-day ${i<30?'screening__cal-th-day--border':''}`}>{i+1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calMonths.map(({year,month},mi) => {
                  const dim = getDIM(year,month)
                  return (
                    <tr key={`${year}-${month}`} className={mi<calMonths.length-1?'screening__cal-row--border':''}>
                      <td className="screening__cal-td-month">{MFULL[month]}</td>
                      {Array.from({length:31},(_,di)=>{
                        const day=di+1
                        if(day>dim) return <td key={di} className={`screening__cal-td-empty ${di<30?'screening__cal-td-empty--border':''}`}/>
                        const hp = dayHasP(year,month,day)
                        return (
                          <td key={di} className="screening__cal-dot-cell">
                            <div className={`screening__cal-dot ${hp?'screening__cal-dot--active':'screening__cal-dot--inactive'}`}/>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table */}
        <div className="screening__table-wrap">
          <div className="screening__table-scroll">
            <table className="screening__table">
              <thead className="screening__thead">
                <tr>
                  <th className="screening__th">Data</th>
                  <th className="screening__th">
                    <div className="screening__th-with-filter">
                      Struttura
                      <i className="fa-duotone fa-filter screening__filter-ico" aria-hidden="true"/>
                    </div>
                  </th>
                  <th className="screening__th">
                    <div className="screening__th-with-filter">
                      Tipologia
                      <i className="fa-duotone fa-filter screening__filter-ico" aria-hidden="true"/>
                    </div>
                  </th>
                  <th className="screening__th screening__th--right">Attuale</th>
                  <th className="screening__th screening__th--right screening__th--ai">Suggerita Ai</th>
                  <th className="screening__th">
                    <div className="screening__th-with-filter">
                      Delta
                      <i className="fa-duotone fa-filter screening__filter-ico" aria-hidden="true"/>
                    </div>
                  </th>
                  <th className="screening__th screening__th--checkbox">
                    <input type="checkbox" checked={selectAll} onChange={e=>{setSelectAll(e.target.checked);setSelected(e.target.checked?new Set(pageData.map(r=>r.id)):new Set())}} className="sib-checkbox sib-checkbox--sm"/>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => (
                  <tr key={row.id} className="screening__row">
                    <td className="screening__td screening__td--nowrap">{row.date}</td>
                    <td className="screening__td screening__td--nowrap">Hotel Siracu...</td>
                    <td className="screening__td screening__td--nowrap">{row.tipologia.length>13?row.tipologia.slice(0,12)+'...':row.tipologia}</td>
                    <td className="screening__td screening__td--right screening__td--nowrap">{row.attS}</td>
                    <td className="screening__td screening__td--right">
                      <button className="screening__ai-btn" onClick={()=>{setModalRow(row);setModalOff(0);setShowModal(true)}}>
                        <i className="fa-duotone fa-robot screening__ai-ico" aria-hidden="true"/>
                        <span className="screening__ai-value">{row.aiS}</span>
                      </button>
                    </td>
                    <td className="screening__td screening__td--nowrap screening__td--delta" style={{ '--delta-color': row.del<0?T.error:T.success } as React.CSSProperties}>{row.delS}</td>
                    <td className="screening__td screening__td--center">
                      <input type="checkbox" checked={selected.has(row.id)} onChange={e=>{const s=new Set(selected);e.target.checked?s.add(row.id):s.delete(row.id);setSelected(s)}} className="sib-checkbox sib-checkbox--sm"/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="screening__pagination">
            <Pagination page={pg} totalPages={total} onPageChange={setPg} />
          </div>
        </div>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <Modal open={showModal} onClose={()=>setShowModal(false)} size="lg">
        {modalRow&&(()=>{
          const cd=getChart(modalRow), cur=cd[Math.max(0,Math.min(cd.length-1,modalOff))]
          return (
            <div>
              <h2 className="screening__modal-title">Analisi suggerimenti AI</h2>
              <p className="screening__modal-subtitle">Ottimizza la precisione con uno screening specifico per ogni combinazione di camera</p>
              <div className="screening__modal-nav">
                <button className="sib-btn sib-btn--icon" onClick={()=>setModalOff(o=>Math.max(0,o-1))} disabled={modalOff===0}>
                  <Ico n="back" s={13} c={T.primary}/>
                </button>
                <span className="screening__modal-nav-label">Scorri Giorno</span>
                <button className="sib-btn sib-btn--icon" onClick={()=>setModalOff(o=>Math.min(cd.length-1,o+1))} disabled={modalOff===cd.length-1}>
                  <Ico n="chevr" s={13} c={T.primary}/>
                </button>
              </div>
              <div className="screening__modal-legend">
                {[{c:'#5C9CD4',bg:'#5C9CD422',l:'Strategie Pricing'},{c:'#E91E63',bg:'#E91E6322',l:'AI'},{c:'#CE93D8',bg:'#CE93D822',l:'LY'}].map(leg=>(
                  <div key={leg.l} className="screening__legend-item">
                    <div className="screening__legend-dot" style={{ '--legend-dot-bg': leg.bg, '--legend-dot-border': leg.c } as React.CSSProperties}/>
                    <span className="screening__legend-label">{leg.l}</span>
                  </div>
                ))}
              </div>
              <AreaChart cd={cd}/>
              <div className="screening__modal-bar">
                <span className="screening__modal-bar-date">
                  <Ico n="calendar" s={11} c={T.textDisabled}/> <span className="screening__modal-bar-date-val">{cur?.lbl}</span>
                </span>
                <span className="screening__modal-bar-str">Strategie: <strong>{cur?.str.toFixed(0)} €</strong></span>
                <span className="screening__modal-bar-ai">AI: <strong>{cur?.ai.toFixed(0)} €</strong></span>
                <span className="screening__modal-bar-ly">LY: <strong>{cur?.ly.toFixed(0)} €</strong></span>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
