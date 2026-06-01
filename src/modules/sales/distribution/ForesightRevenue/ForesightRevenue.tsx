import React, { useState } from 'react'
import T from '../../../../core/tokens'
import BtnBack from '../../../../core/components/BtnBack'
import Tooltip from '../../../../core/components/Tooltip'
import AlertBanner from '../../../../core/components/AlertBanner'
import PageHeader from '../../../../core/components/PageHeader'
import './ForesightRevenue.sass'

const STRUTTURE    = ['Hotel Noto','Grand Hotel Roma','Villa Bellini','Hotel Siracusa']
const BARS         = ['Seleziona','BAR 1','BAR 2','BAR 3','BAR 4','BAR 5']
const MONTHS_IT    = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const MONTHS_FULL  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DAYS_IT      = ['LUN','MAR','MER','GIO','VEN','SAB','DOM']
const PRICES       = [195.61,257.66,270.67,287.17,313.84,405.54,417.76,424.00]
const LEGEND_ITEMS = [
  {bg:'#a8cce0',label:'< 250 €'},{bg:'#7ab0d0',label:'250-269 €'},{bg:'#4a8ab8',label:'270-299 €'},
  {bg:'#2d6a9f',label:'300-349 €'},{bg:'#204769',label:'350-399 €'},{bg:'#1a3a56',label:'≥ 400 €'},
]

const getDIM      = (y:number,m:number) => new Date(y,m+1,0).getDate()
const getWD       = (y:number,m:number,d:number) => { const w=new Date(y,m,d).getDay(); return w===0?6:w-1 }
const isWE        = (y:number,m:number,d:number) => { const w=new Date(y,m,d).getDay(); return w===0||w===6 }
const getPrice    = (y:number,m:number,d:number) => PRICES[(d*7+(m+1)*13+y*3)%PRICES.length]
const circleColor = (price:number) => {
  if (price>=400) return {bg:'#1a3a56',text:'#fff'}
  if (price>=350) return {bg:'#204769',text:'#fff'}
  if (price>=300) return {bg:'#2d6a9f',text:'#fff'}
  if (price>=270) return {bg:'#4a8ab8',text:'#fff'}
  if (price>=250) return {bg:'#7ab0d0',text:'#fff'}
  return {bg:'#a8cce0',text:'#1a3a56'}
}

export default function ForesightRevenue({ navigate }: { navigate: (p:string)=>void }) {
  const [dateFrom,         setDateFrom]         = useState('2026-04-01')
  const [dateTo,           setDateTo]           = useState('2028-03-31')
  const [struttura,        setStruttura]        = useState('Hotel Noto')
  const [tipoBar,          setTipoBar]          = useState<'bar'|'fit'>('bar')
  const [barSel,           setBarSel]           = useState('Seleziona')
  const [saved,            setSaved]            = useState(false)
  const [eraseMode,        setEraseMode]        = useState(false)
  const [erasedCells,      setErasedCells]      = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingTipo,      setPendingTipo]      = useState<'bar'|'fit'|null>(null)

  const months: Array<{year:number;month:number}> = []
  {
    const s=new Date(dateFrom+'T00:00:00'), e=new Date(dateTo+'T00:00:00')
    let c=new Date(s.getFullYear(),s.getMonth(),1)
    while (c<=e&&months.length<36) { months.push({year:c.getFullYear(),month:c.getMonth()}); c=new Date(c.getFullYear(),c.getMonth()+1,1) }
  }

  const years: Record<number,Array<{year:number;month:number}>> = {}
  months.forEach(m => { if (!years[m.year]) years[m.year]=[]; years[m.year].push(m) })

  const toggleCell = (y:number,m:number,d:number) => {
    if (!eraseMode) return
    const k=`${y}-${m}-${d}`
    setErasedCells(prev=>{const n=new Set(prev);n.has(k)?n.delete(k):n.add(k);return n})
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('tariffe-disp')}/>
      <PageHeader title="Foresight revenue" subtitle="Organizza in anticipo le politiche di prezzo per garantire stabilità e visione a lungo termine"/>

      {saved && <AlertBanner type="success">Modifiche salvate con successo</AlertBanner>}

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="foresight__toolbar">
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">Dal</label>
          <input type="date" className="sib-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        </div>
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">Al</label>
          <input type="date" className="sib-input" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">Struttura</label>
          <select className="sib-select" value={struttura} onChange={e=>setStruttura(e.target.value)}>
            {STRUTTURE.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">Tipo</label>
          <div className="foresight__tipo-group">
            {(['bar','fit'] as const).map(t=>(
              <label key={t} className="foresight__tipo-label foresight__tipo-label--dyn" style={{
                '--tipo-weight': tipoBar===t ? 700 : 400,
                '--tipo-color':  tipoBar===t ? T.primary : T.textActive,
              } as React.CSSProperties}>
                <input type="radio" checked={tipoBar===t}
                  onChange={()=>{
                    if (t!==tipoBar&&erasedCells.size>0) { setPendingTipo(t); setShowConfirmModal(true) }
                    else setTipoBar(t)
                  }}
                  className="sib-radio"/>
                {t==='bar'?'B.A.R.':'F.I.T.'}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold font-opensans text-ink">B.A.R.</label>
          <select className="sib-select" value={barSel} onChange={e=>setBarSel(e.target.value)}>
            {BARS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <Tooltip text="Gomma — cancella tariffe assegnate">
          <button className={`foresight__eraser-btn ${eraseMode?'foresight__eraser-btn--active':''}`} onClick={()=>setEraseMode(v=>!v)}>
            <i className="fa-duotone fa-eraser foresight__eraser-ico foresight__eraser-ico--dyn" style={{'--eraser-color': eraseMode?T.warning:T.textInactive} as React.CSSProperties} aria-hidden="true"/>
          </button>
        </Tooltip>
        <div className="foresight__toolbar-actions">
          <button className="foresight__crea-btn">
            <i className="fa-duotone fa-plus foresight__crea-ico" aria-hidden="true"/> Crea B.A.R.
          </button>
          <button className="foresight__salva-btn" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),3000)}}>
            <i className="fa-duotone fa-floppy-disk foresight__salva-ico" aria-hidden="true"/> Salva
          </button>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {Object.entries(years).map(([year,yMonths]) => (
        <div key={year} className="foresight__year-block">
          <div className="foresight__year-label">
            <div className="foresight__year-badge">{year}</div>
            <div className="foresight__year-line"/>
          </div>
          {yMonths.map(({year:y,month:m}) => {
            const dim = getDIM(y,m)
            return (
              <div key={`${y}-${m}`} className="foresight__month-wrap">
                <div className="foresight__month-scroll">
                  <table className="foresight__month-table foresight__month-table--dyn" style={{'--month-min-w':`${dim*42+100}px`} as React.CSSProperties}>
                    <colgroup>
                      <col className="foresight__col--label"/>
                      {Array.from({length:dim},(_,i)=><col key={i} className="foresight__col--day"/>)}
                    </colgroup>
                    <thead>
                      <tr className="foresight__thead-row">
                        <th className="foresight__month-label-cell">
                          <div className="foresight__month-badge">{MONTHS_IT[m]}</div>
                        </th>
                        {Array.from({length:dim},(_,i)=>{
                          const day=i+1, wd=getWD(y,m,day), we=wd>=5
                          return (
                            <th key={i} className={`foresight__day-th ${we?'foresight__day-th--weekend':''}`}>
                              <div className="foresight__day-name foresight__day-name--dyn" style={{'--day-name-color':we?T.blue:T.textDisabled} as React.CSSProperties}>{DAYS_IT[wd]}</div>
                              <div className="foresight__day-num foresight__day-num--dyn"  style={{'--day-num-color':we?T.blue:T.primary} as React.CSSProperties}>{day}</div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="foresight__month-full-cell">{MONTHS_FULL[m]} {y}</td>
                        {Array.from({length:dim},(_,i)=>{
                          const day=i+1, price=getPrice(y,m,day), {bg,text}=circleColor(price)
                          const we=isWE(y,m,day), k=`${y}-${m}-${day}`, erased=erasedCells.has(k)
                          return (
                            <td key={i} className={`foresight__price-cell ${we?'foresight__price-cell--weekend':''}`}>
                              <div className="foresight__price-dot foresight__price-dot--dyn"
                                style={{
                                  '--dot-bg':      erased?'#D1D5DB':we?`${bg}dd`:bg,
                                  '--dot-shadow':  erased?'none':`0 1px 3px ${bg}66`,
                                  '--dot-cursor':  eraseMode?'cell':'pointer',
                                  '--dot-opacity': eraseMode?0.85:1,
                                } as React.CSSProperties}
                                onClick={()=>toggleCell(y,m,day)}>
                                <span className="foresight__price-text foresight__price-text--dyn" style={{'--price-text-color':erased?'#9CA3AF':text} as React.CSSProperties}>
                                  {erased?'–':price.toFixed(2).replace('.',',')}
                                </span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="foresight__legend">
        <span className="foresight__legend-title">Legenda:</span>
        {LEGEND_ITEMS.map(l=>(
          <div key={l.label} className="foresight__legend-item">
            <div className="foresight__legend-dot foresight__legend-dot--dyn" style={{'--legend-dot-bg':l.bg} as React.CSSProperties}/>
            {l.label}
          </div>
        ))}
      </div>

      {/* ── Confirm modal ───────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="foresight__modal-overlay" onClick={()=>setShowConfirmModal(false)}>
          <div className="foresight__modal-box" onClick={e=>e.stopPropagation()}>
            <div className="foresight__modal-ico-wrap">
              <i className="fa-duotone fa-triangle-exclamation foresight__modal-ico" aria-hidden="true"/>
            </div>
            <h2 className="foresight__modal-title">Modifica calendario BAR</h2>
            <p className="foresight__modal-text">Le modifiche a questo calendario verranno perse, sei sicuro di voler continuare?</p>
            <div className="foresight__modal-actions">
              <button className="sib-btn sib-btn--secondary" onClick={()=>setShowConfirmModal(false)}>Annulla</button>
              <button className="foresight__modal-confirm-btn"
                onClick={()=>{if(pendingTipo)setTipoBar(pendingTipo);setErasedCells(new Set());setShowConfirmModal(false);setPendingTipo(null)}}>
                Procedi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
