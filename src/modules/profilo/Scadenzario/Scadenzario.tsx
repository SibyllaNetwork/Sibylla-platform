import React, { useState } from 'react'
import T from '../../../core/tokens'
import Modal from '../../../core/components/Modal'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import './Scadenzario.sass'
import { InputField, SelectField, DatePickerField } from '../../../core/components/form'

type CalEvent = {
  day: number; month: number; year: number; title: string; color: string;
  tipo: string; tipologia?: string; reparto?: string; ora?: string; creatoDa?: string;
}

export default function Scadenzario({ navigate }: { navigate: (p:string) => void }) {
  const today = new Date()
  const [filter,        setFilter]        = useState<'personale'|'reparto'|'tutti'>('tutti')
  const [curDate,       setCurDate]       = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [showModal,     setShowModal]     = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalEvent|null>(null)
  const [newEv,         setNewEv]         = useState({ titolo:'', tipologia:'', reparto:'', dataInizio:'', oraInizio:'00:00' })
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
  const allEvents    = [...defaultEvents,...extraEvents]
  const filtered     = allEvents.filter(e => filter==='tutti'||e.tipo===filter)
  const eventsForDay = (d:number,t:string) => t!=='current'?[]:filtered.filter(e=>e.day===d&&e.month===mo&&e.year===yr)

  const handleSave = () => {
    if (!newEv.titolo||!newEv.dataInizio) return
    const dt    = new Date(newEv.dataInizio)
    const color = newEv.reparto?(repartoColors[newEv.reparto]||T.blue):(tipologiaColors[newEv.tipologia]||T.blue)
    setExtraEvents(p=>[...p,{day:dt.getDate(),month:dt.getMonth(),year:dt.getFullYear(),title:newEv.titolo,color,tipo:'personale',tipologia:newEv.tipologia||'Evento',reparto:newEv.reparto,ora:newEv.oraInizio,creatoDa:'Luca H.'}])
    setShowModal(false)
    setNewEv({titolo:'',tipologia:'',reparto:'',dataInizio:'',oraInizio:'00:00'})
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader title="Scadenzario" subtitle="Pianifica e monitora scadenze, eventi e promemoria del tuo team"/>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="scadenzario__toolbar">
        <div className="scadenzario__toolbar-left">
          <span className="scadenzario__month">{MONTHS[mo]} {yr}</span>
          <div className="scadenzario__filter-group">
            {(['personale','reparto','tutti'] as const).map(f=>(
              <label key={f} className="scadenzario__filter-label">
                <input type="radio" name="cal-filter" checked={filter===f} onChange={()=>setFilter(f)} className="sib-radio"/>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div className="scadenzario__controls">
          <button className="scadenzario__create-btn" onClick={()=>setShowModal(true)}>
            <i className="fa-duotone fa-plus scadenzario__create-ico" aria-hidden="true"/> Crea Evento
          </button>
          {[{icon:'fa-chevron-left',fn:()=>setCurDate(new Date(yr,mo-1,1))},{icon:'fa-chevron-right',fn:()=>setCurDate(new Date(yr,mo+1,1))}].map((btn,i)=>(
            <button key={i} className="scadenzario__nav-btn" onClick={btn.fn}>
              <i className={`fa-duotone ${btn.icon} scadenzario__nav-ico`} aria-hidden="true"/>
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar grid ───────────────────────────────────────────── */}
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
            return (
              <div key={idx}
                className={`scadenzario__cell ${col<6?'scadenzario__cell--border-r':''} ${!isLast?'scadenzario__cell--border-b':''} ${todayCell?'scadenzario__cell--today':outside?'scadenzario__cell--outside':past?'scadenzario__cell--past':''}`}>
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
          <InputField
            name="titolo"
            placeholder="Nome dell'evento"
            value={newEv.titolo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEv(v => ({ ...v, titolo: e.target.value }))}
          />
          <SelectField
            name="tipologia"
            placeholder="Tipologia"
            value={newEv.tipologia}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewEv(v => ({ ...v, tipologia: e.target.value }))}
            options={['Evento','Scadenza','Promemoria','Riunione','Appuntamento'].map(t => ({ value: t, label: t }))}
          />
          <SelectField
            name="reparto"
            placeholder="Reparto"
            value={newEv.reparto}
       onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewEv(v => ({ ...v, reparto: e.target.value }))}
            options={['Executive','Sales & Marketing','Operation','Purchasing','Human Resources','Finance'].map(r => ({ value: r, label: r }))}
          />
          <div className="scad-create__date-row">
            <DatePickerField
              name="dataInizio"
              label="Data"
              required
              type="date"
              value={newEv.dataInizio}
              onChange={e => setNewEv(v => ({ ...v, dataInizio: e.target.value }))}
            />
            <DatePickerField
              name="oraInizio"
              label="Ora"
              type="time"
              value={newEv.oraInizio}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEv(v => ({ ...v, oraInizio: e.target.value }))}
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
