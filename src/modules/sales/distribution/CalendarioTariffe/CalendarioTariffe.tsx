import React, { useState, useMemo } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import AlertBanner from '../../../../core/components/AlertBanner'
import PageHeader from '../../../../core/components/PageHeader'
import './CalendarioTariffe.sass'
import { SelectField, DateRangeField } from '../../../../core/components/form'

const STRUTTURE  = ['Hotel Noto','Grand Hotel Roma','Villa Bellini','Hotel Siracusa']
const MONTHS_IT  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const DAYS_IT    = ['lun','mar','mer','gio','ven','sab','dom']
const CAMERAS    = [
  {id:'doppia',   label:'Doppia Classic',           colore:'#5C9CD4'},
  {id:'singola',  label:'Singola Classic',           colore:'#E07B39'},
  {id:'tripla',   label:'Tripla Classic',            colore:'#5A8A3C'},
  {id:'matsuper', label:'Matrimoniale Superior',     colore:'#9B59B6'},
  {id:'matconv',  label:'Matr. Convertibile Quad.',  colore:'#C4A820'},
]
const LEGEND_OCC = [
  {c:'#16A34A', bg:'#F0FFF4', label:'Bassa occupazione (< 50%)'},
  {c:'#E07B39', bg:'#FFF7ED', label:'Media occupazione (50-79%)'},
  {c:'#DC2626', bg:'#FEF2F2', label:'Alta occupazione (≥ 80%)'},
]

const getDIM   = (y:number,m:number) => new Date(y,m+1,0).getDate()
const getWD    = (y:number,m:number,d:number) => { const w=new Date(y,m,d).getDay(); return w===0?6:w-1 }
const occColor = (occ:number) => occ>=80?'#DC2626':occ>=50?'#E07B39':'#16A34A'
const occBg    = (occ:number) => occ>=80?'#FEF2F2':occ>=50?'#FFF7ED':'#F0FFF4'
const fmt      = (d:Date) => d.toISOString().split('T')[0]

export default function CalendarioTariffe({ navigate }: { navigate: (p:string) => void }) {
  const today = new Date()
  const [struttura, setStruttura] = useState('Hotel Noto')
  const [dateFrom,  setDateFrom]  = useState(fmt(today))
  const [dateTo,    setDateTo]    = useState(() => { const d=new Date(); d.setMonth(d.getMonth()+3); return fmt(d) })
  const [selCam,    setSelCam]    = useState('doppia')
  const [saved,     setSaved]     = useState(false)

  const cam = CAMERAS.find(c=>c.id===selCam)||CAMERAS[0]

  const [priceMap] = useState(() => {
    const base: Record<string,number> = {singola:268.3,doppia:323.27,tripla:378.82,matsuper:373.16,matconv:250}
    const m: Record<string,number> = {}
    Object.entries(base).forEach(([id,b]) => {
      for (let mo=0; mo<12; mo++) for (let d=1; d<=31; d++) {
        const seed=(d*17+(mo+1)*11)%100
        const we=new Date(2026,mo,d).getDay()===0||new Date(2026,mo,d).getDay()===6
        m[`${id}-2026-${mo}-${d}`]=Math.round(b*(we?1.15:1)*(seed>30?1:0.43)*100)/100
      }
    })
    return m
  })
  const [occMap] = useState(() => {
    const m: Record<string,number> = {}
    for (let mo=0; mo<12; mo++) for (let d=1; d<=31; d++) m[`2026-${mo}-${d}`]=(d*13+(mo+1)*7)%100
    return m
  })

  // Prezzi BAR di riferimento (camera "tripla") → select su ogni prezzo esposto
  const REF_CAM = 'tripla'
  const barPrices = useMemo(() => {
    const set = new Set<number>()
    Object.entries(priceMap).forEach(([k,v]) => { if (k.startsWith(`${REF_CAM}-`)) set.add(v) })
    return Array.from(set).sort((a,b)=>a-b)
  }, [priceMap])
  const [priceOverride, setPriceOverride] = useState<Record<string,number>>({})
  const priceVal = (key:string) => priceOverride[key] ?? (priceMap[key]??0)

  const months: Array<{year:number;month:number}> = []
  {
    const s=new Date(dateFrom+'T00:00:00'), e=new Date(dateTo+'T00:00:00')
    let c=new Date(s.getFullYear(),s.getMonth(),1)
    while (c<=e&&months.length<24) { months.push({year:c.getFullYear(),month:c.getMonth()}); c=new Date(c.getFullYear(),c.getMonth()+1,1) }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('tariffe-disp')}/>
      <PageHeader title={`Calendario tariffe — Anno ${new Date(dateFrom).getFullYear()}`} subtitle="Visualizzazione mensile delle tariffe e occupazione per tipo camera"/>

      {saved && <AlertBanner type="success">Modifiche salvate e inviate con successo</AlertBanner>}

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="cal-tariffe__toolbar">
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
          className="cal-tariffe__select--struttura"
        />
        <DateRangeField
          nameFrom="dateFrom"
          nameTo="dateTo"
          label="Seleziona intervallo date"
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
          onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
        />
        <SelectField
          name="selCam"
          label="Tipo camera"
          value={selCam}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelCam(e.target.value)}
          options={CAMERAS.map(c => ({ value: c.id, label: c.label }))}
          className="cal-tariffe__select--camera"
        />
        <button className="sib-btn sib-btn--toolbar cal-tariffe__vista-btn" onClick={()=>navigate('tariffe-disp')}>
          <i className="fa-duotone fa-calendar cal-tariffe__btn-cal-ico" aria-hidden="true"/>
          Vista griglia
        </button>
        <button className="sib-btn sib-btn--primary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),3000)}}>
          <i className="fa-duotone fa-check cal-tariffe__btn-check-ico" aria-hidden="true"/> Salva e invia
        </button>
      </div>

      {/* ── Camera indicator ────────────────────────────────────────── */}
      <div className="cal-tariffe__cam-indicator">
        <div className="cal-tariffe__cam-dot cal-tariffe__cam-dot--dyn" style={{ '--cam-color': cam.colore } as React.CSSProperties}/>
        <span className="cal-tariffe__cam-label cal-tariffe__cam-label--dyn" style={{ '--cam-color': cam.colore } as React.CSSProperties}>{cam.label}</span>
        <div className="cal-tariffe__cam-line cal-tariffe__cam-line--dyn" style={{ '--cam-line-bg': `${cam.colore}33` } as React.CSSProperties}/>
      </div>

      {/* ── Month grid ──────────────────────────────────────────────── */}
      <div className="cal-tariffe__month-grid" style={{ '--cam-color': cam.colore } as React.CSSProperties}>
        {months.map(({year,month}) => {
          const dim     = getDIM(year,month)
          const firstWD = getWD(year,month,1)
          const weeks: Array<Array<number|null>> = []
          let week: Array<number|null> = Array(firstWD).fill(null)
          for (let d=1; d<=dim; d++) {
            week.push(d)
            if (week.length===7) { weeks.push(week); week=[] }
          }
          if (week.length>0) { while (week.length<7) week.push(null); weeks.push(week) }

          return (
            <div key={`${year}-${month}`} className="cal-tariffe__month-card">
              <div className="cal-tariffe__month-header">
                <h2 className="cal-tariffe__month-title">{MONTHS_IT[month]}</h2>
                <span className="cal-tariffe__month-year">{year}</span>
              </div>
              <div className="cal-tariffe__month-scroll">
                <table className="cal-tariffe__month-table">
                  <colgroup>{Array.from({length:7},(_,i)=><col key={i} className="cal-tariffe__month-col"/>)}</colgroup>
                  <thead>
                    <tr className="cal-tariffe__thead-row">
                      {DAYS_IT.map((d,i)=>(
                        <th key={d} className={`cal-tariffe__day-th ${i>=5?'cal-tariffe__day-th--weekend':'cal-tariffe__day-th--weekday'}`}>
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week,wi) => {
                      const lastRow = wi === weeks.length-1
                      return (
                      <tr key={wi}>
                        {week.map((day,di) => {
                          if (!day) return <td key={di} className={`cal-tariffe__day-cell cal-tariffe__day-cell--empty ${lastRow?'cal-tariffe__day-cell--last-row':''}`}/>
                          const isWE  = di>=5
                          const pkey  = `${cam.id}-${year}-${month}-${day}`
                          const price = priceVal(pkey)
                          const opts  = barPrices.includes(price) ? barPrices : [price, ...barPrices].sort((a,b)=>a-b)
                          const occ   = occMap[`${year}-${month}-${day}`]??0
                          return (
                            <td key={di}
                              className={`cal-tariffe__day-cell ${isWE?'cal-tariffe__day-cell--weekend':'cal-tariffe__day-cell--weekday'} ${lastRow?'cal-tariffe__day-cell--last-row':''}`}>
                              <div className={`cal-tariffe__day-num ${isWE?'cal-tariffe__day-num--weekend':'cal-tariffe__day-num--weekday'}`}>{day}</div>
                              <div className="cal-tariffe__day-price">
                                <select
                                  className="cal-tariffe__price-select cal-tariffe__day-price-val--dyn"
                                  value={price}
                                  onChange={e=>setPriceOverride(p=>({...p,[pkey]:Number(e.target.value)}))}
                                  aria-label="Prezzo (BAR di riferimento)"
                                >
                                  {opts.map(p=><option key={p} value={p}>{p.toFixed(2).replace('.',',')} €</option>)}
                                </select>
                              </div>
                              <div className="cal-tariffe__day-occ cal-tariffe__day-occ--dyn" style={{ '--occ-bg': occBg(occ), '--occ-color': occColor(occ) } as React.CSSProperties}>
                                <span className="cal-tariffe__day-occ-val cal-tariffe__day-occ-val--dyn">{occ},0%</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="cal-tariffe__legend">
        {LEGEND_OCC.map(l=>(
          <div key={l.label} className="cal-tariffe__legend-item">
            <div className="cal-tariffe__legend-swatch cal-tariffe__legend-swatch--dyn" style={{ '--leg-bg': l.bg, '--leg-border': l.c } as React.CSSProperties}/>
            <span className="cal-tariffe__legend-label">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
