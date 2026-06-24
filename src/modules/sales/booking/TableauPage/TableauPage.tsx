import { bookingStore } from '../../../../core/bookingStore'
import React, { useState, useEffect, useRef } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Modal from '../../../../core/components/Modal'
import './TableauPage.sass'

const MONTHS    = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const ALLOTMENT = 25
const ROW_H     = 64
const DAY_W     = 46   // larghezza fissa colonna giorno (timeline scrollabile)
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

type Booking = {id:number;nome:string;startDay:number;endDay:number;row:number;colore:string;camere:number;persone:number;importo:number;mese:number;anno:number}

interface TableauPageProps {
  navigate: (p:string)=>void
  /** Titolo/sottotitolo personalizzabili: la pagina "Open board" riusa questa
      stessa UI/UX cambiando solo l'intestazione. */
  title?: string
  subtitle?: string
}

export default function TableauPage({
  navigate,
  title = 'Tableau',
  subtitle = 'Inserimento e monitoraggio delle prenotazioni individuali e di gruppo',
}: TableauPageProps) {
  const today = new Date()
  const [anno,            setAnno]            = useState(today.getFullYear())
  const [mese,            setMese]            = useState(today.getMonth())
  const [struttura,       setStruttura]       = useState('Hotel Archimede')
  const [categoria,       setCategoria]       = useState('')
  const [contratto,       setContratto]       = useState('RaeliHotels')
  const [azienda,         setAzienda]         = useState('Tutte')
  const [hovCell,         setHovCell]         = useState<{row:number;day:number}|null>(null)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showTotali,      setShowTotali]      = useState(true)
  const [showLegenda,     setShowLegenda]     = useState(false)
  const [showDettaglio,   setShowDettaglio]   = useState(false)
  const [giacenzaMode,    setGiacenzaMode]    = useState('Giacenza per camere')
  const [bookings,        setBookings]        = useState<Booking[]>([
    {id:1,nome:'Grp Piersalvo 2', startDay:7,  endDay:11, row:0, colore:'#5A8A3C', camere:3, persone:6,  importo:1200, mese:today.getMonth(), anno:today.getFullYear()},
    {id:2,nome:'Prova',           startDay:15, endDay:20, row:1, colore:'#C4A820', camere:5, persone:10, importo:3500, mese:today.getMonth(), anno:today.getFullYear()},
    {id:3,nome:'test melissa',    startDay:20, endDay:26, row:1, colore:'#5A8A3C', camere:4, persone:8,  importo:2800, mese:today.getMonth(), anno:today.getFullYear()},
  ])

  useEffect(() => {
    if (bookingStore.pending) {
      const b = bookingStore.pending
      setAnno(b.startYear ?? anno); setMese(b.startMonth ?? mese)
      setBookings(prev => {
        const usedRows = new Set(prev.map((bk:any)=>bk.row)); let freeRow=0
        while(usedRows.has(freeRow)) freeRow++
        return [...prev, {...b, row:freeRow, mese: b.startMonth ?? mese, anno: b.startYear ?? anno}]
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
  const todayCol    = (anno===today.getFullYear()&&mese===today.getMonth())?today.getDate():null
  const COL_W_NUM   = 100/dim
  // Prenotazioni del periodo visualizzato: legate alla data reale (mese/anno),
  // così scorrendo i mesi compaiono solo nelle loro giornate.
  const visibleBookings = bookings.filter(b => b.mese===mese && b.anno===anno)
  const getGiacenza = (d:number) => { const used=visibleBookings.filter(b=>d>=b.startDay&&d<=b.endDay).reduce((a,b)=>a+b.camere,0); return ALLOTMENT-used }

  const totPersone = visibleBookings.reduce((a,b)=>a+b.persone,0)
  const totCamere  = visibleBookings.reduce((a,b)=>a+b.camere,0)
  const totImporto = visibleBookings.reduce((a,b)=>a+b.importo,0)

  // ── Dettaglio prenotazione (modale): ripartizione per notte ─────────────────
  const fmtEur = (n:number) => n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'
  const fmtDay = (d:number) => `${String(d).padStart(2,'0')}/${String(mese+1).padStart(2,'0')}/${anno}`
  const dettaglioRows = selectedBooking
    ? Array.from({length: Math.max(1, selectedBooking.endDay - selectedBooking.startDay)}, (_,i) => {
        const nights   = Math.max(1, selectedBooking.endDay - selectedBooking.startDay)
        const perNight = selectedBooking.importo / nights
        return { data: fmtDay(selectedBooking.startDay + i), pernotto: perNight, extra: 0, servizi: 0, totale: perNight }
      })
    : []
  const importoComplessivo = dettaglioRows.reduce((a,r)=>a+r.totale, 0)

  const prevMonth = () => { if(mese===0){setMese(11);setAnno(a=>Math.max(2023,a-1))}else setMese(m=>m-1) }
  const nextMonth = () => { if(mese===11){setMese(0);setAnno(a=>Math.min(2028,a+1))}else setMese(m=>m+1) }

  // ── Scroll orizzontale timeline (overlay nav, come nel planner) ─────────────
  const gridRef = useRef<HTMLDivElement>(null)
  const [tlNav, setTlNav] = useState({prev:false, next:false})
  const updateTlNav = () => {
    const el = gridRef.current; if(!el) return
    setTlNav({ prev: el.scrollLeft > 4, next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }
  const scrollTl = (dir:number) => {
    const el = gridRef.current; if(!el) return
    el.scrollBy({ left: dir * Math.max(DAY_W*5, el.clientWidth - 80), behavior:'smooth' })
  }
  useEffect(() => { updateTlNav() }, [anno, mese, dim]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selezione a trascinamento → prenotazione di periodo ─────────────────────
  // Trascini su più celle di una riga: al rilascio crei la strisciata per quel
  // periodo. Click singolo (nessun trascinamento) = apri "Nuova prenotazione".
  const dragRef = useRef<{row:number;startDay:number;endDay:number}|null>(null)
  const [dragSel, setDragSel] = useState<{row:number;startDay:number;endDay:number}|null>(null)
  const startDrag  = (row:number, d:number) => { const s={row,startDay:d,endDay:d}; dragRef.current=s; setDragSel(s) }
  const extendDrag = (row:number, d:number) => { const c=dragRef.current; if(c && c.row===row && d!==c.endDay){ const s={...c,endDay:d}; dragRef.current=s; setDragSel(s) } }
  useEffect(() => {
    const onUp = () => {
      const s = dragRef.current; dragRef.current=null; setDragSel(null)
      if(!s) return
      const start=Math.min(s.startDay,s.endDay), end=Math.max(s.startDay,s.endDay)
      // apre "Nuova prenotazione" col periodo selezionato già precompilato
      const iso=(day:number)=>`${anno}-${String(mese+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      bookingStore.prefill = { dal: iso(start), al: iso(end) }
      navigate('nuova-prenotazione')
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [mese, anno]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <PageHeader title={title} subtitle={subtitle}/>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-end gap-3.5 mb-3 flex-wrap">
        {/* Azienda + Contratto */}
        {[{lbl:'Azienda',val:azienda,set:setAzienda,opts:['Tutte','Azienda A','Azienda B'],w:'w-[90px]'},{lbl:'Contratto',val:contratto,set:setContratto,opts:['RaeliHotels','Contratto A'],w:'w-[120px]'}].map(({lbl,val,set,opts,w})=>(
          <div key={lbl} className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold font-poppins text-primary">{lbl}</span>
            <select className={`sib-select sib-select--dense ${w}`} value={val} onChange={e=>set(e.target.value)}>
              {opts.map(o=><option key={o} value={o}>{o||'Tutte'}</option>)}
            </select>
          </div>
        ))}

        {/* Categoria — sempre visibile */}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold font-poppins text-primary">Categoria</span>
          <select className="sib-select sib-select--dense w-[90px]" value={categoria} onChange={e=>setCategoria(e.target.value)}>
            {['','Standard','Superior','Deluxe'].map(o=><option key={o} value={o}>{o||'Tutte'}</option>)}
          </select>
        </div>

        {/* Anno */}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold font-poppins text-primary">Anno</span>
          <select className="sib-select sib-select--dense w-[82px]" value={anno} onChange={e=>setAnno(parseInt(e.target.value))}>
            {[2023,2024,2025,2026,2027,2028].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Mese */}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold font-poppins text-primary">Mese</span>
          <div className="flex items-center gap-1">
            <button className="sib-btn sib-btn--icon h-[34px] w-[34px]" onClick={prevMonth}>
              <i className="fa-duotone fa-chevron-left text-[11px]" aria-hidden="true"/>
            </button>
            <select className="sib-select sib-select--dense w-[100px]" value={mese} onChange={e=>setMese(parseInt(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <button className="sib-btn sib-btn--icon h-[34px] w-[34px]" onClick={nextMonth}>
              <i className="fa-duotone fa-chevron-right text-[11px]" aria-hidden="true"/>
            </button>
          </div>
        </div>

        {/* Struttura */}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold font-poppins text-primary">Struttura</span>
          <select className="sib-select sib-select--dense w-[148px]" value={struttura} onChange={e=>setStruttura(e.target.value)}>
            {['Hotel Archimede','Hotel Noto','Grand Hotel Roma'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Actions — a destra */}
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[12px] font-semibold font-poppins text-primary">&nbsp;</span>
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
            {[{ico:'fa-arrows-rotate',title:'Aggiorna'},{ico:'fa-pen',title:'Modifica'},{ico:'fa-gear',title:'Impostazioni'}].map((btn,i)=>(
              <button key={i} className="sib-btn sib-btn--icon" title={btn.title}>
                <i className={`fa-duotone ${btn.ico} text-[14px]`} aria-hidden="true"/>
              </button>
            ))}
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
                    {l:'ID',       v:<div className="tableau__detail-id-row"><span>2026/{String(selectedBooking.id).padStart(6,'0')}</span><button className="tableau__detail-link" onClick={()=>setShowDettaglio(true)}>Dettaglio</button></div>},
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

        {/* Timeline scrollabile con overlay nav (come planner) */}
        <div className="tableau__timeline-wrap">
          {tlNav.prev && (
            <button type="button" className="tableau__tl-nav tableau__tl-nav--prev" onClick={()=>scrollTl(-1)} aria-label="Giorni precedenti">
              <Ico n="back" s={16} c="currentColor"/>
            </button>
          )}
          {tlNav.next && (
            <button type="button" className="tableau__tl-nav tableau__tl-nav--next" onClick={()=>scrollTl(1)} aria-label="Giorni successivi">
              <Ico n="chevr" s={16} c="currentColor"/>
            </button>
          )}

          {/* Timeline grid */}
          <div className="tableau__grid-wrap" ref={gridRef} onScroll={updateTlNav}
            style={{ '--content-w': `${dim*DAY_W}px`, '--col-w': `${DAY_W}px` } as React.CSSProperties}>
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
                  const hov=hovCell?.row===ri&&hovCell?.day===d
                  const inSel = !!dragSel && dragSel.row===ri && d>=Math.min(dragSel.startDay,dragSel.endDay) && d<=Math.max(dragSel.startDay,dragSel.endDay)
                  return (
                    <div key={d} className="tableau__grid-cell"
                      style={{
                        '--cell-bg':     isToday_(d)?`${T.blue}10`:inSel?'#C7E2FF':isWeekend(d)?'#FAFBFF':hov?'#D6EAFF':'transparent',
                        '--cell-cursor': 'pointer',
                      } as React.CSSProperties}
                      onMouseDown={e=>{e.preventDefault(); startDrag(ri,d)}}
                      onMouseEnter={()=>{ extendDrag(ri,d); setHovCell({row:ri,day:d}) }}
                      onMouseLeave={()=>setHovCell(null)}
                    />
                  )
                })}
              </div>
            ))}

            {/* Booking blocks — forma a strisciata (punta + chevron) come nel planner */}
            <div className={`tableau__bookings-layer ${dragSel?'is-selecting':''}`}>
              {visibleBookings.map(b=>{
                const ARROW = 14, NOTCH = 14
                // Regola degli ingombri: il giorno di check-in e di check-out sono
                // occupati solo a metà (offset F di cella), come nel planner, così
                // sulla stessa giornata convivono partenza e arrivo.
                const F = 0.3
                const leftPct  = (b.startDay - 1 + F) * COL_W_NUM
                const widthPct = (b.endDay - b.startDay) * COL_W_NUM
                const rightPct = (b.endDay - 1 + F) * COL_W_NUM
                // Consecutiva: un'altra prenotazione sulla stessa riga fa check-out
                // il giorno del check-in di questa → incavo a sinistra.
                const hasPred = visibleBookings.some(o => o.id!==b.id && o.row===b.row && o.endDay===b.startDay)
                const clip = hasPred
                  ? `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%, ${NOTCH}px 50%)`
                  : `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%)`
                return (
                  <React.Fragment key={b.id}>
                    <div className="tableau__booking-block"
                      style={{
                        '--block-top':      `${b.row*ROW_H+12}px`,
                        '--block-left':     `${leftPct}%`,
                        '--block-width':    `${widthPct}%`,
                        '--block-height':   `${ROW_H-24}px`,
                        '--block-bg':       `repeating-linear-gradient(-45deg,${b.colore}99,${b.colore}99 4px,${b.colore}55 4px,${b.colore}55 8px)`,
                        '--block-clip':     clip,
                        '--block-pad-left': hasPred ? `${NOTCH+6}px` : '10px',
                      } as React.CSSProperties}
                      onClick={()=>setSelectedBooking(b)}
                    >
                      <span className="tableau__booking-name">{b.nome}</span>
                    </div>
                    {/* Chevron staccati oltre la punta */}
                    <div className="tableau__booking-chevrons"
                      style={{
                        '--chev-left': `calc(${rightPct}% - ${ARROW}px)`,
                        '--chev-top':  `${b.row*ROW_H+12}px`,
                        '--chev-h':    `${ROW_H-24}px`,
                        '--chev-bg':   b.colore,
                      } as React.CSSProperties}
                    />
                  </React.Fragment>
                )
              })}
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
        </div>
      </div>

      {/* ── Modale Dettaglio prenotazione ──────────────────────────────────── */}
      <Modal open={showDettaglio} onClose={()=>setShowDettaglio(false)} title="Dettaglio Prenotazione" size="xl">
        <div className="tableau__detpren">
          <div className="tableau__detpren-total">
            Importo complessivo: <strong>{fmtEur(importoComplessivo)}</strong>
          </div>
          <div className="tableau__detpren-subhead">
            <span className="tableau__detpren-subtitle">Così suddiviso:</span>
            <button className="tableau__detpren-pdf" title="Esporta in PDF">
              <i className="fa-duotone fa-file-pdf" aria-hidden="true"/> Esporta Pdf
            </button>
          </div>
          <div className="sib-table-wrap tableau__detpren-tablewrap">
            <table className="sib-table">
              <thead>
                <tr>
                  <th>Data soggiorno</th>
                  <th><i className="fa-duotone fa-bed" aria-hidden="true"/> Camere</th>
                  <th>Numero</th>
                  <th>Occupanti</th>
                  <th>Pernotto</th>
                  <th>Extra</th>
                  <th>Servizi</th>
                  <th>Totale pernotto</th>
                </tr>
              </thead>
              <tbody>
                {dettaglioRows.map((r,i)=>(
                  <tr key={i}>
                    <td>{r.data}</td>
                    <td/><td/><td/>
                    <td>{fmtEur(r.pernotto)}</td>
                    <td>{fmtEur(r.extra)}</td>
                    <td>{fmtEur(r.servizi)}</td>
                    <td>{fmtEur(r.totale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  )
}
