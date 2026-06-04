import React, { useState, useRef, useEffect } from 'react'
import T from '../../../core/tokens'
import Modal from '../../../core/components/Modal'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import './Scadenzario.sass'
import { InputField, SelectField, DatePickerField, RadioGroup } from '../../../core/components/form'

type CalEvent = {
  day: number; month: number; year: number; title: string; color: string;
  tipo: string; tipologia?: string; reparto?: string; ora?: string; creatoDa?: string;
}

// ── Timeline oraria 24h (viste Giorno / Settimana, stile Google Calendar) ──
const HOURS   = Array.from({ length: 24 }, (_, h) => h)   // 0..23
const HOUR_H  = 52                                        // altezza in px di una fascia oraria
const EVENT_H = HOUR_H - 4                                // blocco evento ≈ 1 ora
// Minuti dall'inizio giornata per un orario "HH:MM" (default 09:00 se assente)
const eventMinutes = (ora?: string): number => {
  if (!ora) return 9 * 60
  const [h, m] = ora.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export default function Scadenzario({ navigate }: { navigate: (p:string) => void }) {
  const today = new Date()
  const [filter,        setFilter]        = useState<'personale'|'reparto'|'tutti'>('tutti')
  const [view,          setView]          = useState<'giorno'|'settimana'|'mese'|'anno'>('mese')
  const [curDate,       setCurDate]       = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  const [showModal,     setShowModal]     = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalEvent|null>(null)
  const [newEv,         setNewEv]         = useState({ titolo:'', tipologia:'', reparto:'', giornate:'singola', visibilita:'pubblico', dataInizio:'', oraInizio:'00:00', promemoria:'', insiemeA:'Mario' })
  const [extraEvents,   setExtraEvents]   = useState<CalEvent[]>([])

  const yr = curDate.getFullYear(), mo = curDate.getMonth()
  const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
  const DAYS   = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica']

  const getDIM   = (y:number,m:number) => new Date(y,m+1,0).getDate()
  const getFirst = (y:number,m:number) => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1 }
  const dim=getDIM(yr,mo), first=getFirst(yr,mo), prevDim=getDIM(yr,mo-1)

  const cells: any[] = []
  for (let i=first-1; i>=0; i--) cells.push({day:prevDim-i,type:'prev'})
  for (let i=1; i<=dim; i++)     cells.push({day:i,type:'current'})
  let nd=1; while (cells.length<42) cells.push({day:nd++,type:'next'})

  const isToday = (d:number,t:string) => t==='current'&&d===today.getDate()&&mo===today.getMonth()&&yr===today.getFullYear()
  const isPast  = (d:number,t:string) => { if(t==='prev')return true; if(t==='next')return false; return new Date(yr,mo,d)<new Date(today.getFullYear(),today.getMonth(),today.getDate()) }

  const repartoColors:  Record<string,string> = { 'Executive':'#5C9CD4','Sales & Marketing':'#E07B39','Operation':'#5A8A3C','Purchasing':'#C4A820','Human Resources':'#9B59B6','Finance':'#5C9CD4' }
  const tipologiaColors:Record<string,string> = { 'Evento':T.blue,'Scadenza':T.error,'Promemoria':T.warning,'Riunione':'#9B59B6','Appuntamento':'#5A8A3C' }

  const defaultEvents: CalEvent[] = [
    {day:5, month:mo,year:yr,title:'Riunione staff',         color:T.blue,   tipo:'reparto',   tipologia:'Riunione',     reparto:'Operation',         ora:'09:00',creatoDa:'Luca H.'},
    {day:10,month:mo,year:yr,title:'Scadenza contratto OTA', color:T.error,  tipo:'personale', tipologia:'Scadenza',     reparto:'Sales & Marketing', ora:'12:00',creatoDa:'Luca H.'},
    {day:15,month:mo,year:yr,title:'Revisione budget Q2',    color:T.warning,tipo:'reparto',   tipologia:'Riunione',     reparto:'Finance',           ora:'10:00',creatoDa:'Luca H.'},
    {day:18,month:mo,year:yr,title:'Check-in VIP',           color:'#5A8A3C',tipo:'personale', tipologia:'Evento',       reparto:'Front office',      ora:'14:00',creatoDa:'Luca H.'},
    {day:23,month:mo,year:yr,title:'Manutenzione camere',    color:'#9B59B6',tipo:'reparto',   tipologia:'Appuntamento', reparto:'Operation',         ora:'08:00',creatoDa:'Luca H.'},
    {day:28,month:mo,year:yr,title:'Chiusura periodo',       color:T.accent, tipo:'personale', tipologia:'Scadenza',     reparto:'Finance',           ora:'17:00',creatoDa:'Luca H.'},
  ]
  // Eventi sparsi su tutto l'anno (oltre a quelli del mese corrente) per dare
  // senso alla vista "Anno" e alle navigazioni temporali
  const spreadEvents: CalEvent[] = [
    {day:9, month:0, year:yr, title:'Rinnovo licenze software', color:T.warning, tipo:'reparto',   tipologia:'Scadenza', reparto:'Finance',           ora:'09:00', creatoDa:'Luca H.'},
    {day:21,month:1, year:yr, title:'Audit qualità',            color:'#9B59B6', tipo:'reparto',   tipologia:'Riunione', reparto:'Operation',         ora:'11:00', creatoDa:'Luca H.'},
    {day:14,month:3, year:yr, title:'Fiera del turismo',        color:'#5A8A3C', tipo:'personale', tipologia:'Evento',   reparto:'Sales & Marketing', ora:'10:00', creatoDa:'Luca H.'},
    {day:7, month:6, year:yr, title:'Inventario semestrale',    color:T.error,   tipo:'reparto',   tipologia:'Scadenza', reparto:'Purchasing',        ora:'08:30', creatoDa:'Luca H.'},
    {day:19,month:8, year:yr, title:'Formazione staff',         color:'#9B59B6', tipo:'reparto',   tipologia:'Riunione', reparto:'Human Resources',   ora:'15:00', creatoDa:'Luca H.'},
    {day:3, month:10,year:yr, title:'Budget anno prossimo',     color:T.warning, tipo:'reparto',   tipologia:'Riunione', reparto:'Finance',           ora:'14:00', creatoDa:'Luca H.'},
    {day:27,month:11,year:yr, title:'Chiusura bilancio',        color:T.error,   tipo:'personale', tipologia:'Scadenza', reparto:'Finance',           ora:'17:00', creatoDa:'Luca H.'},
  ]
  const allEvents    = [...defaultEvents,...spreadEvents,...extraEvents]
  const filtered     = allEvents.filter(e => filter==='tutti'||e.tipo===filter)
  const eventsForDay = (d:number,t:string) => t!=='current'?[]:filtered.filter(e=>e.day===d&&e.month===mo&&e.year===yr)

  // ── Supporto viste Giorno / Settimana / Mese / Anno ──
  const curDay   = curDate.getDate()
  const dowMon   = (d:Date) => (d.getDay()+6)%7   // 0 = Lunedì
  const weekStart = (()=>{ const d=new Date(yr,mo,curDay); d.setDate(d.getDate()-dowMon(d)); return d })()
  const weekDays  = Array.from({length:7},(_,i)=>{ const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d })
  const eventsOn  = (d:Date) => filtered.filter(e=>e.day===d.getDate()&&e.month===d.getMonth()&&e.year===d.getFullYear())
  const isSameDay = (a:Date,b:Date) => a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear()

  const headerLabel =
    view==='anno'      ? `${yr}` :
    view==='mese'      ? `${MONTHS[mo]} ${yr}` :
    view==='settimana' ? `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()].slice(0,3)} – ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()].slice(0,3)} ${weekDays[6].getFullYear()}` :
                         `${DAYS[dowMon(new Date(yr,mo,curDay))]} ${curDay} ${MONTHS[mo]} ${yr}`

  const shiftDate = (dir:number) => {
    const d = new Date(yr,mo,curDay)
    if (view==='giorno')        d.setDate(d.getDate()+dir)
    else if (view==='settimana')d.setDate(d.getDate()+7*dir)
    else if (view==='mese')     d.setMonth(d.getMonth()+dir)
    else                        d.setFullYear(d.getFullYear()+dir)
    return d
  }

  // Mini-calendario di un mese per la vista Anno (stile "Calendario master")
  const WD_ABBR = ['L','M','M','G','V','S','D']
  const renderMiniMonth = (mIdx:number) => {
    const dimM = getDIM(yr,mIdx), firstM = getFirst(yr,mIdx)
    const cellsM: (number|null)[] = []
    for (let i=0;i<firstM;i++) cellsM.push(null)
    for (let d=1;d<=dimM;d++) cellsM.push(d)
    return (
      <div key={mIdx} className="scadenzario__mini">
        <div className="scadenzario__mini-head" onClick={()=>{ setCurDate(new Date(yr,mIdx,1)); setView('mese') }}>
          <span className="scadenzario__mini-name">{MONTHS[mIdx]}</span>
          <span className="scadenzario__mini-year">{yr}</span>
        </div>
        <div className="scadenzario__mini-weekdays">
          {WD_ABBR.map((w,i)=><span key={i} className="scadenzario__mini-wd">{w}</span>)}
        </div>
        <div className="scadenzario__mini-days">
          {cellsM.map((d,i)=>{
            if (d===null) return <span key={i} className="scadenzario__mini-day scadenzario__mini-day--empty" aria-hidden="true"/>
            const date = new Date(yr,mIdx,d)
            const evs  = eventsOn(date)
            const td   = isSameDay(date,today)
            return (
              <button key={i} type="button"
                className={`scadenzario__mini-day ${td?'scadenzario__mini-day--today':''}`}
                title={evs.length?`${evs.length} ${evs.length===1?'evento':'eventi'}`:undefined}
                onClick={()=>{ setCurDate(date); setView('giorno') }}>
                <span className="scadenzario__mini-num">{d}</span>
                {evs.length>0 && (
                  <span className="scadenzario__mini-dots">
                    {evs.slice(0,3).map((ev,ei)=>(
                      <span key={ei} className="scadenzario__mini-dot" style={{'--ev-color':ev.color} as React.CSSProperties}/>
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const fmtISO = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  // Apre la modale "Aggiungi Evento"; precompila data ed (eventuale) ora di inizio
  const openCreate = (d?:Date, hour?:number) => {
    setNewEv(v=>({ ...v, dataInizio: d?fmtISO(d):'', oraInizio: hour!=null?`${String(hour).padStart(2,'0')}:00`:v.oraInizio }))
    setShowModal(true)
  }

  // ── Timeline oraria (Giorno/Settimana) ──
  const tlBodyRef = useRef<HTMLDivElement>(null)
  // All'ingresso nelle viste a timeline porta lo scroll sulla mattina (07:00)
  useEffect(() => {
    if ((view==='giorno'||view==='settimana') && tlBodyRef.current) tlBodyRef.current.scrollTop = 7*HOUR_H
  }, [view, curDate])
  const nowMin = today.getHours()*60 + today.getMinutes()

  // Click su una colonna giorno → crea evento all'ora cliccata
  const handleColClick = (e:React.MouseEvent<HTMLDivElement>, d:Date) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const hour = Math.max(0, Math.min(23, Math.floor((e.clientY-rect.top)/HOUR_H)))
    openCreate(d, hour)
  }

  // Griglia oraria 24h con eventi posizionati per orario; `days` = 1 (Giorno) o 7 (Settimana)
  const renderTimeline = (days:Date[]) => {
    const isWeek = days.length>1   // evidenziazione "oggi" solo in Settimana
    return (
    <div className="scad-tl" style={{ '--hour-h': `${HOUR_H}px`, '--cols': days.length } as React.CSSProperties}>
      <div className="scad-tl__head">
        <div className="scad-tl__gutter-head"/>
        {days.map((d,i)=>(
          <div key={i} className={`scad-tl__day-head ${isWeek&&isSameDay(d,today)?'scad-tl__day-head--today':''}`}>
            <span className="scad-tl__day-dow">{DAYS[dowMon(d)]}</span>
            <span className="scad-tl__day-num">{d.getDate()}</span>
          </div>
        ))}
      </div>
      <div className="scad-tl__body" ref={tlBodyRef}>
        <div className="scad-tl__gutter">
          {HOURS.map(h=>(
            <div key={h} className="scad-tl__hour">
              <span className="scad-tl__hour-label">{String(h).padStart(2,'0')}:00</span>
            </div>
          ))}
        </div>
        <div className="scad-tl__cols">
          {days.map((d,di)=>{
            const evs = eventsOn(d).sort((a,b)=>(a.ora||'').localeCompare(b.ora||''))
            const td  = isSameDay(d,today)
            return (
              <div key={di} className={`scad-tl__col ${isWeek&&td?'scad-tl__col--today':''}`}
                onClick={e=>handleColClick(e,d)} title="Clicca per creare un evento">
                {HOURS.map(h=><div key={h} className="scad-tl__slot"/>)}
                {td && <div className="scad-tl__now" style={{ '--now-top': `${nowMin/60*HOUR_H}px` } as React.CSSProperties}/>}
                {evs.map((ev,ei)=>(
                  <div key={ei} className="scad-tl__event"
                    style={{ '--ev-color':ev.color, '--ev-top':`${eventMinutes(ev.ora)/60*HOUR_H}px`, '--ev-h':`${EVENT_H}px` } as React.CSSProperties}
                    onClick={e=>{ e.stopPropagation(); setSelectedEvent(ev) }}>
                    <span className="scad-tl__event-time">{ev.ora||'—'}</span>
                    <span className="scad-tl__event-title">{ev.title}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )}

  const handleSave = () => {
    if (!newEv.titolo||!newEv.dataInizio) return
    const dt    = new Date(newEv.dataInizio)
    const color = newEv.reparto?(repartoColors[newEv.reparto]||T.blue):(tipologiaColors[newEv.tipologia]||T.blue)
    setExtraEvents(p=>[...p,{day:dt.getDate(),month:dt.getMonth(),year:dt.getFullYear(),title:newEv.titolo,color,tipo:'personale',tipologia:newEv.tipologia||'Evento',reparto:newEv.reparto,ora:newEv.oraInizio,creatoDa:'Luca H.'}])
    setShowModal(false)
    setNewEv({titolo:'',tipologia:'',reparto:'',giornate:'singola',visibilita:'pubblico',dataInizio:'',oraInizio:'00:00',promemoria:'',insiemeA:'Mario'})
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader title="Scadenzario" subtitle="Pianifica e monitora scadenze, eventi e promemoria del tuo team"/>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="scadenzario__toolbar">
        <div className="scadenzario__toolbar-left">
          <span className="scadenzario__month">{headerLabel}</span>
          <div className="scadenzario__filter-group">
            {(['personale','reparto','tutti'] as const).map(f=>(
              <label key={f} className="scadenzario__filter-label">
                <input type="radio" name="cal-filter" checked={filter===f} onChange={()=>setFilter(f)} className="sib-radio"/>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div className="scadenzario__view-switch">
          {([['giorno','Giorno'],['settimana','Settimana'],['mese','Mese'],['anno','Anno']] as const).map(([v,lab])=>(
            <button key={v} className={`scadenzario__view-btn ${view===v?'scadenzario__view-btn--active':''}`} onClick={()=>setView(v)}>{lab}</button>
          ))}
        </div>
        <div className="scadenzario__controls">
          <button className="sib-btn sib-btn--primary" onClick={()=>openCreate()}>
            <i className="fa-light fa-circle-plus" aria-hidden="true"/> Crea Evento
          </button>
          <button className="scadenzario__nav-btn" onClick={()=>setCurDate(shiftDate(-1))} aria-label="Precedente">
            <i className="fa-duotone fa-angles-left scadenzario__nav-ico" aria-hidden="true"/>
          </button>
          <button className="scadenzario__nav-btn scadenzario__nav-btn--today" onClick={()=>setCurDate(new Date(today.getFullYear(),today.getMonth(),today.getDate()))}>Oggi</button>
          <button className="scadenzario__nav-btn" onClick={()=>setCurDate(shiftDate(1))} aria-label="Successivo">
            <i className="fa-duotone fa-angles-right scadenzario__nav-ico" aria-hidden="true"/>
          </button>
        </div>
      </div>

      {/* ── Vista MESE ──────────────────────────────────────────────── */}
      {view==='mese' && (
      <div className="scadenzario__grid">
        <div className="scadenzario__weekdays">
          {DAYS.map((d,i)=>(
            <div key={d} className={`scadenzario__weekday ${i<6?'scadenzario__weekday--border':''}`}>{d}</div>
          ))}
        </div>
        <div className="scadenzario__cells">
          {cells.map((cell,idx)=>{
            const todayCell = isToday(cell.day,cell.type)
            const past      = isPast(cell.day,cell.type)
            const outside   = cell.type!=='current'
            const dayEvs    = eventsForDay(cell.day,cell.type)
            const col       = idx%7
            const isLast    = idx>=35
            const canCreate = cell.type==='current' && dayEvs.length===0
            return (
              <div key={idx}
                className={`scadenzario__cell ${col<6?'scadenzario__cell--border-r':''} ${!isLast?'scadenzario__cell--border-b':''} ${todayCell?'scadenzario__cell--today':outside?'scadenzario__cell--outside':past?'scadenzario__cell--past':''} ${canCreate?'scadenzario__cell--clickable':''}`}
                onClick={()=>{ if(canCreate) openCreate(new Date(yr,mo,cell.day)) }}>
                <div className="scadenzario__cell-top">
                  <span className={`scadenzario__cell-num ${todayCell?'scadenzario__cell-num--today':outside?'scadenzario__cell-num--outside':''}`}>
                    {cell.day}
                  </span>
                  {todayCell && <span className="scadenzario__today-badge">OGGI</span>}
                </div>
                {dayEvs.slice(0,3).map((ev,ei)=>(
                  <div key={ei}
                    className="scadenzario__event"
                    style={{'--ev-color':ev.color} as React.CSSProperties}
                    onClick={e=>{e.stopPropagation();setSelectedEvent(ev)}}>
                    {ev.title}
                  </div>
                ))}
                {dayEvs.length>3 && <div className="scadenzario__more">+{dayEvs.length-3} altri</div>}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* ── Vista SETTIMANA (timeline 24h) ──────────────────────────── */}
      {view==='settimana' && renderTimeline(weekDays)}

      {/* ── Vista GIORNO (timeline 24h) ─────────────────────────────── */}
      {view==='giorno' && renderTimeline([new Date(yr,mo,curDay)])}

      {/* ── Vista ANNO (mini-calendari, stile Calendario master) ────── */}
      {view==='anno' && (
        <div className="scadenzario__year">
          {MONTHS.map((_,mIdx)=>renderMiniMonth(mIdx))}
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="scadenzario__legend">
        {[{color:T.blue,label:'Personale'},{color:'#9B59B6',label:'Reparto'},{color:T.error,label:'Scadenza'},{color:T.warning,label:'Revisione'},{color:'#5A8A3C',label:'Operativo'}].map(l=>(
          <div key={l.label} className="scadenzario__legend-item">
            <div className="scadenzario__legend-dot" style={{'--dot-color':l.color} as React.CSSProperties}/>
            <span className="scadenzario__legend-label">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Event detail modal ──────────────────────────────────────── */}
      <Modal open={!!selectedEvent} onClose={()=>setSelectedEvent(null)} title="">
        {selectedEvent && (
          <div>
            <div className="scad-det__header">
              <h2 className="scad-det__title">Dettaglio evento</h2>
              <div className="scad-det__header-actions">
                <button className="sib-btn sib-btn--icon" onClick={()=>{setExtraEvents(p=>p.filter(e=>e!==selectedEvent));setSelectedEvent(null)}}>
                  <i className="fa-duotone fa-trash scad-det__icon-del" aria-hidden="true"/>
                </button>
                <button className="sib-btn sib-btn--icon" onClick={()=>setSelectedEvent(null)}>
                  <i className="fa-duotone fa-xmark scad-det__icon-close" aria-hidden="true"/>
                </button>
              </div>
            </div>
            <div className="scad-det__body">
              <div className="scad-det__section scad-det__section--border">
                <div className="scad-det__field-label">Nome evento</div>
                <div className="scad-det__field-val scad-det__field-val--primary">{selectedEvent.title}</div>
              </div>
              <div className="scad-det__section scad-det__section--border scad-det__section--grid2">
                <div>
                  <div className="scad-det__field-label">Data</div>
                  <div className="scad-det__field-val">{String(selectedEvent.day).padStart(2,'0')}/{String(selectedEvent.month+1).padStart(2,'0')}/{selectedEvent.year}</div>
                </div>
                <div>
                  <div className="scad-det__field-label">Ora</div>
                  <div className="scad-det__field-val">{selectedEvent.ora||'00:00'}</div>
                </div>
              </div>
              {selectedEvent.creatoDa && (
                <div>
                  <div className="scad-det__field-label">Creato da</div>
                  <div className="scad-det__field-val scad-det__field-val--blue">{selectedEvent.creatoDa}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create event modal ──────────────────────────────────────── */}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Aggiungi Evento" size="md">
        <div className="scad-create__form">
          <input
            className="scad-create__name"
            placeholder="Inserisci il nome dell'evento"
            value={newEv.titolo}
            onChange={e => setNewEv(v => ({ ...v, titolo: e.target.value }))}
          />
          <SelectField
            name="tipologia"
            label="Tipologia di evento"
            placeholder="Seleziona evento"
            value={newEv.tipologia}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewEv(v => ({ ...v, tipologia: e.target.value }))}
            options={['Evento','Scadenza','Promemoria','Riunione','Appuntamento'].map(t => ({ value: t, label: t }))}
          />
          <SelectField
            name="reparto"
            label="Reparto"
            placeholder="Seleziona reparto"
            value={newEv.reparto}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewEv(v => ({ ...v, reparto: e.target.value }))}
            options={['Executive','Sales & Marketing','Operation','Purchasing','Human Resources','Finance'].map(r => ({ value: r, label: r }))}
          />

          <div>
            <div className="scad-create__sublabel">Giornate</div>
            <div className="scad-create__radio-row">
              <RadioGroup
                name="giornate"
                value={newEv.giornate}
                onChange={v => setNewEv(s => ({ ...s, giornate: v }))}
                options={[{ value:'singola', label:'Singola' }, { value:'multiple', label:'Multiple' }]}
              />
              <RadioGroup
                name="visibilita"
                value={newEv.visibilita}
                onChange={v => setNewEv(s => ({ ...s, visibilita: v }))}
                options={[{ value:'pubblico', label:'Pubblico' }, { value:'solocon', label:'Solo con' }, { value:'privato', label:'Privato' }]}
              />
            </div>
          </div>

          <div className="scad-create__date-row">
            <DatePickerField
              name="dataInizio"
              label="Data inizio"
              required
              type="date"
              value={newEv.dataInizio}
              onChange={e => setNewEv(v => ({ ...v, dataInizio: e.target.value }))}
            />
            <DatePickerField
              name="oraInizio"
              label="Ora inizio"
              type="time"
              value={newEv.oraInizio}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEv(v => ({ ...v, oraInizio: e.target.value }))}
            />
          </div>

          <InputField
            name="promemoria"
            placeholder="Inserisci promemoria"
            value={newEv.promemoria}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEv(v => ({ ...v, promemoria: e.target.value }))}
          />

          <div className="scad-create__inline">
            <span className="scad-create__inline-label">Evento insieme a:</span>
            <input
              className="sib-input"
              value={newEv.insiemeA}
              onChange={e => setNewEv(v => ({ ...v, insiemeA: e.target.value }))}
            />
          </div>

          <div className="scad-create__actions">
            <button className="sib-btn sib-btn--secondary" onClick={() => setShowModal(false)}>Annulla</button>
            <button className="sib-btn sib-btn--primary" onClick={handleSave} disabled={!newEv.titolo || !newEv.dataInizio}>Salva</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
