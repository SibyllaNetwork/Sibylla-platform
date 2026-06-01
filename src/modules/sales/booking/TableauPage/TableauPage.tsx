import { bookingStore } from '../../../../core/bookingStore'
import React, { useState, useEffect } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import './TableauPage.sass'

const MONTHS    = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const ALLOTMENT = 25
const ROW_H     = 64
const ROWS      = ['Riga 1','Riga 2','Riga 3','Riga 4','Riga 5','Riga 6','Riga 7','Riga 8']

const LEGENDA: {color:string;label:string}[] = [
  {color:T.successMid,   label:'Confermata'},
  {color:T.error,        label:'In opzione'},
  {color:'#FF8C42',      label:'% dello stato conferma'},
  {color:'#C4A820',      label:'Extra confermata'},
  {color:T.blue,         label:'Extra in opzione'},
  {color:'#7DCEA0',      label:'Confermata con extra'},
  {color:'#E74C3C',      label:'In opzione con extra'},
  {color:'stripe-green', label:'Extra confermata da convalidare'},
  {color:'stripe-red',   label:'Extra in opzione da convalidare'},
  {color:T.textDisabled, label:'Annullata'},
  {color:'ghost',        label:'Opzione Scaduta'},
  {color:'hat',          label:'Studenti'},
]

type Booking = {id:number;nome:string;startDay:number;endDay:number;row:number;colore:string;camere:number;persone:number;importo:number}

export default function TableauPage({ navigate }: { navigate: (p:string)=>void }) {
  const today = new Date()
  const [anno,            setAnno]            = useState(today.getFullYear())
  const [mese,            setMese]            = useState(today.getMonth())
  const [struttura,       setStruttura]       = useState('Hotel Archimede')
  const [categoria,       setCategoria]       = useState('')
  const [contratto,       setContratto]       = useState('RaeliHotels')
  const [azienda,         setAzienda]         = useState('Tutte')
  const [tableauType,     setTableauType]     = useState<'libero'|'vincolato'>('vincolato')
  const [hovCell,         setHovCell]         = useState<{row:number;day:number}|null>(null)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showTotali,      setShowTotali]      = useState(true)
  const [showLegenda,     setShowLegenda]     = useState(false)
  const [giacenzaMode,    setGiacenzaMode]    = useState('Giacenza per camere')
  const [bookings,        setBookings]        = useState<Booking[]>([
    {id:1,nome:'Grp Piersalvo 2', startDay:7,  endDay:11, row:0, colore:'#5A8A3C', camere:3, persone:6,  importo:1200},
    {id:2,nome:'Prova',           startDay:15, endDay:22, row:1, colore:'#C4A820', camere:5, persone:10, importo:3500},
    {id:3,nome:'test melissa',    startDay:20, endDay:26, row:1, colore:'#5A8A3C', camere:4, persone:8,  importo:2800},
  ])

  useEffect(() => {
    if (bookingStore.pending) {
      const b = bookingStore.pending
      setAnno(b.startYear ?? anno); setMese(b.startMonth ?? mese)
      setBookings(prev => {
        const usedRows = new Set(prev.map((bk:any)=>bk.row)); let freeRow=0
        while(usedRows.has(freeRow)) freeRow++
        return [...prev, {...b, row:freeRow}]
      })
      bookingStore.pending = null
    }
  }, [])

  const getDIM      = (y:number, m:number) => new Date(y,m+1,0).getDate()
  const dim         = getDIM(anno, mese)
  const days        = Array.from({length:dim}, (_,i)=>i+1)
  const getDayName  = (d:number) => ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][new Date(anno,mese,d).getDay()]
  const isWeekend   = (d:number) => { const w=new Date(anno,mese,d).getDay(); return w===0||w===6 }
  const isToday_    = (d:number) => d===today.getDate()&&mese===today.getMonth()&&anno===today.getFullYear()
  const isPast      = (d:number) => new Date(anno,mese,d)<new Date(today.getFullYear(),today.getMonth(),today.getDate())
  const todayCol    = (anno===today.getFullYear()&&mese===today.getMonth())?today.getDate():null
  const COL_W_NUM   = 100/dim
  const getGiacenza = (d:number) => { const used=bookings.filter(b=>d>=b.startDay&&d<=b.endDay).reduce((a,b)=>a+b.camere,0); return ALLOTMENT-used }

  const totPersone = bookings.reduce((a,b)=>a+b.persone,0)
  const totCamere  = bookings.reduce((a,b)=>a+b.camere,0)
  const totImporto = bookings.reduce((a,b)=>a+b.importo,0)

  const prevMonth = () => { if(mese===0){setMese(11);setAnno(a=>Math.max(2023,a-1))}else setMese(m=>m-1) }
  const nextMonth = () => { if(mese===11){setMese(0);setAnno(a=>Math.min(2028,a+1))}else setMese(m=>m+1) }

  // ── LegendaItem ─────────────────────────────────────────────────────────────
  const LegendaItem = ({item}:{item:{color:string;label:string}}) => {
    let dot: React.ReactNode
    if (item.color === 'stripe-green')
      dot = <div className="tableau__legend-dot tableau__legend-dot--stripe-green"/>
    else if (item.color === 'stripe-red')
      dot = <div className="tableau__legend-dot tableau__legend-dot--stripe-red"/>
    else if (item.color === 'ghost')
      dot = <div className="tableau__legend-dot tableau__legend-dot--ghost">
        <i className="fa-duotone fa-ban tableau__legend-ico tableau__legend-ico--ghost" aria-hidden="true"/>
      </div>
    else if (item.color === 'hat')
      dot = <div className="tableau__legend-dot tableau__legend-dot--hat">
        <i className="fa-duotone fa-graduation-cap tableau__legend-ico tableau__legend-ico--hat" aria-hidden="true"/>
      </div>
    else
      dot = <div className="tableau__legend-dot tableau__legend-dot--color" style={{ '--legend-dot-bg': item.color } as React.CSSProperties}/>

    return (
      <div className="tableau__legend-row">
        {dot}
        <span className="tableau__legend-label">{item.label}</span>
      </div>
    )
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader title="Tableau" subtitle="Inserimento e monitoraggio delle prenotazioni individuali e di gruppo"/>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-3.5 mb-3 flex-wrap">
        {/* Tableau type */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">Tableau</span>
          <div className="flex items-center gap-3 h-[34px]">
            {(['libero','vincolato'] as const).map(t=>(
              <label key={t} className={`flex items-center gap-1.5 cursor-pointer text-xs font-opensans ${tableauType===t?'text-primary font-semibold':'text-ink'}`}>
                <input type="radio" checked={tableauType===t} onChange={()=>setTableauType(t)} className="sib-radio"/>{t.charAt(0).toUpperCase()+t.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Azienda + Contratto — solo vincolato */}
        {tableauType==='vincolato' && [{lbl:'Azienda',val:azienda,set:setAzienda,opts:['Tutte','Azienda A','Azienda B'],w:'w-[90px]'},{lbl:'Contratto',val:contratto,set:setContratto,opts:['RaeliHotels','Contratto A'],w:'w-[120px]'}].map(({lbl,val,set,opts,w})=>(
          <div key={lbl} className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold font-opensans text-ink">{lbl}</span>
            <select className={`sib-select sib-select--dense ${w}`} value={val} onChange={e=>set(e.target.value)}>
              {opts.map(o=><option key={o} value={o}>{o||'Tutte'}</option>)}
            </select>
          </div>
        ))}

        {/* Categoria — sempre visibile */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">Categoria</span>
          <select className="sib-select sib-select--dense w-[90px]" value={categoria} onChange={e=>setCategoria(e.target.value)}>
            {['','Standard','Superior','Deluxe'].map(o=><option key={o} value={o}>{o||'Tutte'}</option>)}
          </select>
        </div>

        {/* Anno */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">Anno</span>
          <select className="sib-select sib-select--dense w-[82px]" value={anno} onChange={e=>setAnno(parseInt(e.target.value))}>
            {[2023,2024,2025,2026,2027,2028].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Mese */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">Mese</span>
          <div className="flex items-center gap-1">
            <button className="sib-btn sib-btn--icon" onClick={prevMonth}>
              <i className="fa-duotone fa-chevron-left text-[11px]" aria-hidden="true"/>
            </button>
            <select className="sib-select sib-select--dense w-[100px]" value={mese} onChange={e=>setMese(parseInt(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <button className="sib-btn sib-btn--icon" onClick={nextMonth}>
              <i className="fa-duotone fa-chevron-right text-[11px]" aria-hidden="true"/>
            </button>
          </div>
        </div>

        {/* Struttura */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">Struttura</span>
          <select className="sib-select sib-select--dense w-[148px]" value={struttura} onChange={e=>setStruttura(e.target.value)}>
            {['Hotel Archimede','Hotel Noto','Grand Hotel Roma'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Bottoni extra — solo libero */}
        {tableauType==='libero' && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
            <div className="flex items-center gap-1.5">
              {[
                {ico:'fa-cubes',label:'Allocazione risorse'},
                {ico:'fa-grid-2',label:'Griglia disponibilità'},
                {ico:'fa-shuffle',label:'Assegnazione'},
                {ico:'fa-chart-bar',label:'Report'},
              ].map((btn,i)=>(
                <button key={i} className="sib-btn sib-btn--toolbar" title={btn.label}>
                  <i className={`fa-duotone ${btn.ico} text-[13px]`} aria-hidden="true"/>
                  <span className="hidden 3xl:inline">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions — a destra */}
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex items-center gap-1.5">
            <div className="relative" onMouseEnter={()=>setShowLegenda(true)} onMouseLeave={()=>setShowLegenda(false)}>
              <button className={`sib-btn sib-btn--icon ${showLegenda?'border-primary bg-primary-50 text-primary':''}`}>
                <i className="fa-duotone fa-circle-info text-[14px]" aria-hidden="true"/>
              </button>
              {showLegenda && (
                <div className="tableau__legend-popup">
                  <h3 className="tableau__legend-title">Legenda colori prenotazioni</h3>
                  {LEGENDA.map((item,i) => <LegendaItem key={i} item={item}/>)}
                </div>
              )}
            </div>
            {tableauType==='vincolato' ? (
              [{ico:'fa-arrows-rotate',title:'Aggiorna'},{ico:'fa-pen',title:'Modifica'},{ico:'fa-gear',title:'Impostazioni'}].map((btn,i)=>(
                <button key={i} className="sib-btn sib-btn--icon" title={btn.title}>
                  <i className={`fa-duotone ${btn.ico} text-[14px]`} aria-hidden="true"/>
                </button>
              ))
            ) : (
              <>
                <button className="sib-btn sib-btn--icon" title="Esporta PDF">
                  <i className="fa-duotone fa-file-pdf text-[14px]" aria-hidden="true"/>
                </button>
                <button className="sib-btn sib-btn--icon" title="Esporta XLS">
                  <i className="fa-duotone fa-file-excel text-[14px]" aria-hidden="true"/>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="tableau__layout">

        {/* Left panel */}
        <div className="tableau__left-panel">
          <div className="tableau__left-header">
            <Ico n="clock" s={14} c={T.primary}/>
            <span className="tableau__allotment-label">Camere allotment</span>
            <span className="tableau__allotment-val">{ALLOTMENT}</span>
          </div>

          <div className="tableau__detail-wrap">
            {selectedBooking ? (
              <div className="tableau__detail">
                <div className="tableau__detail-scroll">
                  {[
                    {l:'ID',       v:<div className="tableau__detail-id-row"><span>2026/{String(selectedBooking.id).padStart(6,'0')}</span><button className="tableau__detail-link">Dettaglio</button></div>},
                    {l:'GRUPPO',       v:selectedBooking.nome},
                    {l:'CAPOGRUPPO',   v:'Pierciccio'},
                    {l:'NAZIONALITÀ',  v:'ITA'},
                    {l:'CHECK-IN',     v:`0${selectedBooking.startDay}/04/2026`},
                    {l:'CHECK-OUT',    v:`${selectedBooking.endDay}/04/2026`},
                    {l:'CAMERE',       v:selectedBooking.camere},
                    {l:'PERSONE',      v:selectedBooking.persone},
                    {l:'TIPOLOGIA',    v:'Studenti'},
                  ].map((row,ri)=>(
                    <div key={ri} className="tableau__detail-row">
                      <span className="tableau__detail-key">{row.l}</span>
                      <span className="tableau__detail-val">{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className="tableau__detail-actions">
                  {[
                    <i key="user" className="fa-duotone fa-user tableau__detail-user-ico" aria-hidden="true"/>,
                    <Ico key="refresh" n="refresh" s={18} c={T.primary}/>,
                    <Ico key="lock"    n="lock"    s={18} c={T.primary}/>,
                  ].map((ico,i)=>(
                    <button key={i} className="tableau__detail-action-btn">{ico}</button>
                  ))}
                </div>
                <button onClick={()=>setSelectedBooking(null)} className="tableau__detail-close">
                  <Ico n="x" s={11} c={T.textDisabled}/> Chiudi
                </button>
              </div>
            ) : (
              <div className="tableau__detail-empty">
                <Ico n="calendar" s={30} c={T.textDisabled}/>
                <p className="tableau__detail-empty-text">Clicca su una prenotazione per approfondire dettagli e note associate</p>
              </div>
            )}
          </div>

          <div className="tableau__totali-wrap">
            <div className="tableau__totali-header" onClick={()=>setShowTotali(v=>!v)}>
              <span className="tableau__totali-title">TOTALI</span>
              <div className={`tableau__totali-chevron ${showTotali?'':'tableau__totali-chevron--collapsed'}`}>
                <Ico n="chevd" s={12} c="rgba(255,255,255,0.7)"/>
              </div>
            </div>
            {showTotali && (
              <div className="tableau__totali-grid">
                {[
                  {ico:<Ico n="user"      s={18} c={T.primary}/>, val:totPersone},
                  {ico:<Ico n="briefcase" s={18} c={T.primary}/>, val:totCamere},
                  {ico:<Ico n="plus"      s={18} c={T.primary}/>, val:totImporto.toLocaleString('it-IT')},
                ].map((item,i)=>(
                  <div key={i} className="tableau__totali-item">
                    <div className="tableau__totali-ico">{item.ico}</div>
                    <div className="tableau__totali-val">{item.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tableau__giacenza-select">
            <select className="sib-select sib-select--dense w-full" value={giacenzaMode} onChange={e=>setGiacenzaMode(e.target.value)}>
              <option>Giacenza per camere</option>
              <option>Giacenza per persone</option>
            </select>
          </div>
        </div>

        {/* Nav arrow left */}
        <button className="tableau__nav-arrow tableau__nav-arrow--left" onClick={prevMonth}>
          <Ico n="back" s={16} c={T.primary}/>
        </button>

        {/* Timeline grid */}
        <div className="tableau__grid-wrap">
          {/* Sticky header */}
          <div className="tableau__grid-header">
            <div className="tableau__day-names">
              {days.map(d=>(
                <div key={d} className="tableau__day-header" style={{
                  '--day-color': isToday_(d)?'#fff':isWeekend(d)?T.blue:T.textDisabled,
                  '--day-bg':    isToday_(d)?T.primary:isWeekend(d)?'#F2F7FF':'transparent',
                } as React.CSSProperties}>
                  {getDayName(d)}
                </div>
              ))}
            </div>
            <div className="tableau__day-nums">
              {days.map(d=>(
                <div key={d} className="tableau__day-num" style={{
                  '--day-weight': isToday_(d)?700:500,
                  '--day-color':  isToday_(d)?'#fff':isWeekend(d)?T.blue:T.textActive,
                  '--day-bg':     isToday_(d)?T.primary:isWeekend(d)?'#F2F7FF':'transparent',
                } as React.CSSProperties}>
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="tableau__rows">
            {/* Today marker */}
            {todayCol && (
              <div className="tableau__today-marker" style={{
                '--marker-left': `calc(${(todayCol-1)*COL_W_NUM}% + ${COL_W_NUM/2}% - 1px)`,
              } as React.CSSProperties}/>
            )}

            {ROWS.map((row,ri)=>(
              <div key={row} className="tableau__row">
                {days.map(d=>{
                  const past=isPast(d), hov=hovCell?.row===ri&&hovCell?.day===d&&!past
                  return (
                    <div key={d} className="tableau__grid-cell"
                      style={{
                        '--cell-bg':     isToday_(d)?`${T.blue}10`:isWeekend(d)?'#FAFBFF':hov?'#D6EAFF':'transparent',
                        '--cell-cursor': past?'default':'pointer',
                      } as React.CSSProperties}
                      onMouseEnter={()=>!past&&setHovCell({row:ri,day:d})}
                      onMouseLeave={()=>setHovCell(null)}
                      onClick={()=>{if(!past)navigate('nuova-prenotazione')}}
                    />
                  )
                })}
              </div>
            ))}

            {/* Booking blocks */}
            <div className="tableau__bookings-layer">
              {bookings.map(b=>(
                <div key={b.id} className="tableau__booking-block"
                  style={{
                    '--block-top':    `${b.row*ROW_H+12}px`,
                    '--block-left':   `calc(${(b.startDay-1)*COL_W_NUM}% + 2px)`,
                    '--block-width':  `calc(${(b.endDay-b.startDay+1)*COL_W_NUM}% - 6px)`,
                    '--block-height': `${ROW_H-24}px`,
                    '--block-bg':     `repeating-linear-gradient(-45deg,${b.colore}99,${b.colore}99 4px,${b.colore}55 4px,${b.colore}55 8px)`,
                    '--block-border': `2px solid ${b.colore}`,
                    '--block-shadow': `0 2px 6px ${b.colore}33`,
                  } as React.CSSProperties}
                  onClick={()=>setSelectedBooking(b)}
                >
                  <span className="tableau__booking-name">{b.nome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Giacenza */}
          <div className="tableau__giacenza-bar">
            {[true,false].map((positive,gi)=>(
              <div key={gi} className="tableau__giacenza-row">
                {days.map(d=>{
                  const g=getGiacenza(d), val=positive?g:g-ALLOTMENT
                  return (
                    <div key={d} className="tableau__giacenza-cell" style={{
                      '--giac-color':  val<0?T.error:val===0?T.warning:T.textActive,
                      '--giac-border': gi===0?`1px solid ${T.border}`:'none',
                      '--giac-bg':     isToday_(d)?`${T.blue}08`:isWeekend(d)?'#FAFBFF':'transparent',
                    } as React.CSSProperties}>
                      {val}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Nav arrow right */}
        <button className="tableau__nav-arrow tableau__nav-arrow--right" onClick={nextMonth}>
          <Ico n="chevr" s={16} c={T.primary}/>
        </button>
      </div>
    </div>
  )
}
