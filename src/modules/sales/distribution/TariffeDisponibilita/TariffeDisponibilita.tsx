import React, { useState } from 'react'
import T from '../../../../core/tokens'
import BtnBack from '../../../../core/components/BtnBack'
import Tooltip from '../../../../core/components/Tooltip'
import './TariffeDisponibilita.sass'
import AlertBanner from '../../../../core/components/AlertBanner'
import PageHeader from '../../../../core/components/PageHeader'
import FormActions from '../../../../core/components/FormActions'
import { SelectField, DatePickerField } from '../../../../core/components/form'

function StopSalesModal({ struttura, onClose }: { struttura:string; onClose:()=>void }) {
  const PARTNERS = ['TRAVCO','Booking.com','Expedia','HRS','Agoda']
  const [selAll,      setSelAll]      = useState(false)
  const [selPartners, setSelPartners] = useState<Set<string>>(new Set())
  const [stopTutte,   setStopTutte]   = useState(false)
  const [periods,     setPeriods]     = useState([{from:'',to:''}])

  const toggleP    = (p:string) => setSelPartners(prev=>{const n=new Set(prev);n.has(p)?n.delete(p):n.add(p);return n})
  const toggleAll  = () => { const next=!selAll; setSelAll(next); setSelPartners(next?new Set(PARTNERS):new Set()) }
  const addPeriod  = () => setPeriods(prev=>[...prev,{from:'',to:''}])
  const updPeriod  = (i:number, f:'from'|'to', v:string) => setPeriods(prev=>prev.map((p,pi)=>pi===i?{...p,[f]:v}:p))
  const removePeriod = (i:number) => setPeriods(prev=>prev.filter((_,pi)=>pi!==i))

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-card w-[480px] max-w-[95vw] shadow-[0_16px_48px_rgba(32,71,105,0.18)]" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between">
          <div>
            <h2 className="font-poppins text-[17px] font-bold text-primary">Stop Sales</h2>
            <p className="text-xs text-ink-muted mt-0.5">Seleziona i partner e il periodo di black-out</p>
          </div>
          <button className="sib-btn sib-btn--icon w-7 h-7" onClick={onClose}>
            <i className="fa-duotone fa-xmark text-[14px]" aria-hidden="true"/>
          </button>
        </div>

        <div className="border-t border-line mx-5"/>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Struttura */}
          <div>
            <div className="text-[11px] font-semibold text-ink-subtle mb-0.5">Struttura</div>
            <div className="text-[13px] font-bold text-primary font-poppins">{struttura}</div>
          </div>

          {/* Stop tutte */}
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-canvas rounded-field border border-line">
            <input type="checkbox" checked={stopTutte} onChange={()=>setStopTutte(v=>!v)} className="sib-checkbox"/>
            <span className="text-[13px] font-semibold text-ink">Stop a tutte le strutture</span>
          </label>

          {/* Partners */}
          <div className="border border-line rounded-field overflow-hidden">
            <div className="flex items-center justify-end px-3 py-1.5 border-b border-line bg-canvas">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-ink">
                <input type="checkbox" checked={selAll} onChange={toggleAll} className="sib-checkbox sib-checkbox--sm"/> Seleziona tutti
              </label>
            </div>
            <div className="max-h-36 overflow-auto">
              {PARTNERS.map(p=>(
                <label key={p} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-line last:border-b-0 hover:bg-canvas transition-colors">
                  <input type="checkbox" checked={selPartners.has(p)} onChange={()=>toggleP(p)} className="sib-checkbox sib-checkbox--sm"/>
                  <span className="text-[13px] text-ink">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Periodi */}
          <div>
            <div className="text-[11px] font-semibold text-ink mb-2">Black-out date</div>
            {periods.map((p,i)=>(
              <div key={i} className="flex items-center gap-2 mb-2">
                <div className="flex-1 flex items-center gap-1.5 h-9 px-2.5 border-[1px] border-line rounded-field bg-white">
                  <i className="fa-duotone fa-calendar text-[12px] text-ink-subtle" aria-hidden="true"/>
                  <input type="date" value={p.from} onChange={e=>updPeriod(i,'from',e.target.value)} className="sib-date-range-inner"/>
                  <span className="text-ink-subtle text-[10px] select-none">–</span>
                  <input type="date" value={p.to} onChange={e=>updPeriod(i,'to',e.target.value)} className="sib-date-range-inner"/>
                </div>
                {periods.length>1 && (
                  <button onClick={()=>removePeriod(i)} className="sib-btn sib-btn--icon w-7 h-7">
                    <i className="fa-duotone fa-xmark text-[12px]" aria-hidden="true"/>
                  </button>
                )}
              </div>
            ))}
            <button onClick={addPeriod} className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-[12px] font-semibold text-link p-0 mt-1">
              <i className="fa-duotone fa-plus text-[13px]" aria-hidden="true"/> Aggiungi periodo
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line px-5 py-3.5">
          <FormActions onCancel={onClose} onConfirm={onClose} confirmLabel="Conferma"/>
        </div>
      </div>
    </div>
  )
}

function FiltroModal({ cameras, dateFrom, onClose }: { cameras:any[]; dateFrom:string; onClose:()=>void }) {
  const [tab,       setTab]       = useState<'disp'|'tariffe'>('disp')
  const [filtFrom,  setFiltFrom]  = useState(dateFrom)
  const [filtTo,    setFiltTo]    = useState(dateFrom)
  const [selTutte,  setSelTutte]  = useState(false)
  const [selCamere, setSelCamere] = useState<Set<string>>(new Set())
  const [impDisp,   setImpDisp]   = useState(false)
  const [azioneDisp,setAzioneDisp]= useState<'apri'|'chiudi'>('apri')
  const [selCanali, setSelCanali] = useState<Set<string>>(new Set())
  const CANALI = ['Booking.com','Expedia','HRS','Agoda','Diretta']
  const toggleCam    = (id:string) => setSelCamere(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  const toggleCanale = (c:string)  => setSelCanali(prev=>{const n=new Set(prev);n.has(c)?n.delete(c):n.add(c);return n})

  return (
    <div className="fm-modal__overlay" onClick={onClose}>
      <div className="fm-modal__box" onClick={e=>e.stopPropagation()}>
        <div className="fm-modal__header">
          <h2 className="fm-modal__title">Filtri & Impostazioni</h2>
          <button onClick={onClose} className="fm-modal__close"><i className="fa-duotone fa-xmark fm-modal__close-ico" aria-hidden="true"/></button>
        </div>
        <div className="fm-modal__tabs">
          {([['disp','Disponibilità'],['tariffe','Tariffe']] as const).map(([k,label])=>(
            <button key={k} onClick={()=>setTab(k)} className={`fm-modal__tab ${tab===k?'fm-modal__tab--active':''}`}>{label}</button>
          ))}
        </div>
        <div className="fm-modal__body">
          <div className="fm-modal__dates">
            <div className="fm-modal__date-field">
              <DatePickerField name="filtFrom" label="Da" value={filtFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltFrom(e.target.value)}/>
            </div>
            <div className="fm-modal__date-field">
              <DatePickerField name="filtTo" label="A" value={filtTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltTo(e.target.value)}/>
            </div>
          </div>
          {tab==='disp' && (
            <>
              <div className="fm-modal__section">
                <div className="fm-modal__section-hdr">
                  <span className="fm-modal__section-title">Tipo camera</span>
                  <label className="fm-modal__sel-all">
                    <input type="checkbox" checked={selTutte} onChange={()=>{const next=!selTutte;setSelTutte(next);setSelCamere(next?new Set(cameras.map((c:any)=>c.id)):new Set())}} className="sib-checkbox sib-checkbox--sm"/>
                    Seleziona tutte
                  </label>
                </div>
                <div className="fm-modal__check-grid">
                  {cameras.map((c:any)=>(
                    <label key={c.id} className={`fm-modal__check-label ${selCamere.has(c.id)?'fm-modal__check-label--sel':''}`}>
                      <input type="checkbox" checked={selCamere.has(c.id)} onChange={()=>toggleCam(c.id)} className="sib-checkbox sib-checkbox--sm"/>{c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="fm-modal__section">
                <div className="fm-modal__section-title">Azione disponibilità</div>
                <div className="fm-modal__radio-row">
                  {(['apri','chiudi'] as const).map(a=>(
                    <label key={a} className={`fm-modal__radio-label ${azioneDisp===a?'fm-modal__radio-label--sel':''}`}>
                      <input type="radio" checked={azioneDisp===a} onChange={()=>setAzioneDisp(a)} className="sib-radio"/>{a.charAt(0).toUpperCase()+a.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <label className="fm-modal__check-inline">
                <input type="checkbox" checked={impDisp} onChange={()=>setImpDisp(v=>!v)} className="sib-checkbox sib-checkbox--sm"/>
                <span className={impDisp?'fm-modal__inline-text--bold':'fm-modal__inline-text'}>Imposta disponibilità</span>
              </label>
            </>
          )}
          {tab==='tariffe' && (
            <>
              <div className="fm-modal__section">
                <div className="fm-modal__section-hdr">
                  <span className="fm-modal__section-title">Tipo camera</span>
                  <label className="fm-modal__sel-all">
                    <input type="checkbox" checked={selTutte} onChange={()=>{const next=!selTutte;setSelTutte(next);setSelCamere(next?new Set(cameras.map((c:any)=>c.id)):new Set())}} className="sib-checkbox sib-checkbox--sm"/> Seleziona tutte
                  </label>
                </div>
                <div className="fm-modal__check-grid">
                  {cameras.map((c:any)=>(
                    <label key={c.id} className={`fm-modal__check-label ${selCamere.has(c.id)?'fm-modal__check-label--sel':''}`}>
                      <input type="checkbox" checked={selCamere.has(c.id)} onChange={()=>toggleCam(c.id)} className="sib-checkbox sib-checkbox--sm"/>{c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="fm-modal__section">
                <div className="fm-modal__section-title">Seleziona Canali</div>
                <div className="fm-modal__check-grid">
                  {CANALI.map(c=>(
                    <label key={c} className={`fm-modal__check-label ${selCanali.has(c)?'fm-modal__check-label--sel':''}`}>
                      <input type="checkbox" checked={selCanali.has(c)} onChange={()=>toggleCanale(c)} className="sib-checkbox sib-checkbox--sm"/>{c}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <FormActions onCancel={onClose} onConfirm={onClose} className="fm-modal__footer"/>
      </div>
    </div>
  )
}

export default function TariffeDisponibilita({ navigate }: { navigate: (p:string)=>void }) {
  const today = new Date()
  const fmt   = (d:Date) => d.toISOString().split('T')[0]
  const [struttura,       setStruttura]       = useState('Hotel Noto')
  const [dateFrom,        setDateFrom]        = useState(fmt(today))
  const [intervallo,      setIntervallo]      = useState<1|2|3>(2)
  const [saved,           setSaved]           = useState(false)
  const [stopSales,       setStopSales]       = useState<Set<string>>(new Set())
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set())
  const [mode,            setMode]            = useState<null|'apri'|'chiudi'>(null)
  const [cellStatus,      setCellStatus]      = useState<Record<string,'aperta'|'chiusa'>>({}
  )
  const [tooltip,         setTooltip]         = useState<{camId:string;dk:string;x:number;y:number}|null>(null)
  const [showStopModal,   setShowStopModal]   = useState(false)
  const [showFiltroModal, setShowFiltroModal] = useState(false)

  const STRUTTURE  = ['Hotel Noto','Grand Hotel Roma','Villa Bellini','Hotel Siracusa']
  const DAYS_IT    = ['dom','lun','mar','mer','gio','ven','sab']
  const MONTHS_IT  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  const numDays    = intervallo===1?7:intervallo===2?14:21
  const dates      = Array.from({length:numDays},(_,i)=>{const d=new Date(dateFrom+'T00:00:00');d.setDate(d.getDate()+i);return d})
  const fmtCol     = (d:Date) => `${d.getDate()} ${MONTHS_IT[d.getMonth()]}`
  const fmtDay     = (d:Date) => DAYS_IT[d.getDay()]
  const isWE       = (d:Date) => d.getDay()===0||d.getDay()===6

  type Camera = {id:string;label:string;enabled:boolean;inventario:number;unitLabel:string;colore:string}
  const [cameras, setCameras] = useState<Camera[]>([
    {id:'singola',  label:'SINGOLA CLASSIC',                        enabled:true, inventario:4,  unitLabel:'12 Unità', colore:'#E07B39'},
    {id:'doppia',   label:'DOPPIA CLASSIC',                         enabled:true, inventario:53, unitLabel:'53 Unità', colore:'#5C9CD4'},
    {id:'tripla',   label:'TRIPLA CLASSIC',                         enabled:true, inventario:1,  unitLabel:'1 Unità',  colore:'#5A8A3C'},
    {id:'matsuper', label:'MATRIMONIALE SUPERIOR',                  enabled:true, inventario:0,  unitLabel:'0 Unità',  colore:'#9B59B6'},
    {id:'matconv',  label:'MATRIMONIALE CONVERTIBILE IN QUADRUPLA', enabled:true, inventario:0,  unitLabel:'0 Unità',  colore:'#C4A820'},
  ])
  const toggleCamera = (id:string) => setCameras(prev=>prev.map(c=>c.id===id?{...c,enabled:!c.enabled}:c))
  const toggleExpand = (id:string) => setExpanded(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  const toggleMode   = (m:'apri'|'chiudi') => setMode(prev=>prev===m?null:m)
  const handleCellClick = (camId:string,dk:string) => { if (!mode) return; setCellStatus(prev=>({...prev,[`${camId}-${dk}`]:mode==='apri'?'aperta':'chiusa'})) }

  const base:Record<string,number> = {singola:268.3,doppia:323.27,tripla:378.82,matsuper:373.16,matconv:250}
  const [priceMap] = useState(()=>{const m:Record<string,number>={};cameras.forEach(cam=>{dates.forEach(d=>{const seed=(d.getDate()*17+(d.getMonth()+1)*11)%100;const we=isWE(d)?1.15:1;const occ=seed>30?1:0.43;m[`${cam.id}-${fmt(d)}`]=Math.round(base[cam.id]*we*occ*100)/100;});});return m;})
  const [occMap]   = useState(()=>{const m:Record<string,number>={};dates.forEach(d=>{const seed=(d.getDate()*13+(d.getMonth()+1)*7)%100;m[fmt(d)]=20+seed;});return m;})
  const [dispMap]  = useState(()=>{const m:Record<string,number>={};cameras.forEach(cam=>{dates.forEach(d=>{const seed=(d.getDate()*cam.inventario+7)%Math.max(cam.inventario,1);m[`${cam.id}-${fmt(d)}`]=Math.max(0,cam.inventario-seed);});});return m;})
  const [barMap]   = useState(()=>{const m:Record<string,number>={};cameras.forEach(cam=>{dates.forEach(d=>{m[`${cam.id}-${fmt(d)}`]=(d.getDate()%3)+1;});});return m;})

  const getSectorDisp = (camId:string,dk:string) => {
    const tot=dispMap[`${camId}-${dk}`]??0,sib=Math.min(tot,Math.floor(tot*0.4)),net=Math.min(tot-sib,Math.floor(tot*0.3)),ago=tot-sib-net
    return [{label:'Sibylla',icon:'S',color:T.primary,value:sib},{label:'Network (B2C)',icon:'N',color:'#5A8A3C',value:net},{label:'Agora (B2B)',icon:'A',color:'#9B59B6',value:ago}]
  }
  const getOccupate = (camId:string,dk:string) => {
    const inv=cameras.find(c=>c.id===camId)?.inventario??0,disp=dispMap[`${camId}-${dk}`]??0,occ=Math.max(0,inv-disp),pct=inv>0?Math.round(occ/inv*100):0
    return {occ,inv,pct}
  }

  const colW   = numDays<=7?100:numDays<=14?84:68
  const labelW = 220

  const Toggle = ({on,onChange}:{on:boolean;onChange:()=>void}) => (
    <div onClick={e=>{e.stopPropagation();onChange()}} className={`tariffe__toggle ${on?'tariffe__toggle--on':''}`}>
      <div className="tariffe__toggle-knob"/>
    </div>
  )
  const LockIco = ({open=false}:{open?:boolean}) => (
    <i className={`fa-duotone ${open?'fa-lock-open':'fa-lock'} tariffe__lock-ico`} aria-hidden="true"/>
  )

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Gestione disponibilità e tariffe" subtitle="Controllo di tariffe e disponibilità in base alle strutture, giorni e intervalli settimanali"/>

      {saved && <AlertBanner type="success">Modifiche salvate e inviate con successo</AlertBanner>}

      {/* Toolbar */}
      <div className={`flex items-end gap-3 mb-4 flex-wrap ${mode?'mb-0':''}`}>
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
          className="tariffe__toolbar-select"
        />
        <DatePickerField
          name="dateFrom"
          label="Da"
          value={dateFrom}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
          className="tariffe__toolbar-date"
        />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink whitespace-nowrap">Seleziona intervallo</span>
          <div className="flex items-center gap-4 h-9">
            {([1,2,3] as const).map(n=>(
              <label key={n} className="flex items-center gap-1.5 cursor-pointer text-xs font-opensans text-ink">
                <input type="radio" checked={intervallo===n} onChange={()=>setIntervallo(n)} className="sib-radio"/>{n} settiman{n===1?'a':'e'}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex items-center gap-2 h-9">
            <Tooltip text="Prevede l'apertura di tutti i canali">
              <button className={`sib-btn ${mode==='apri'?'tariffe__toolbar-btn--apri':'sib-btn--toolbar'}`} onClick={()=>toggleMode('apri')}>
                <LockIco open/> Apri
              </button>
            </Tooltip>
            <Tooltip text="Prevede la chiusura di tutti i canali">
              <button className={`sib-btn ${mode==='chiudi'?'tariffe__toolbar-btn--chiudi':'sib-btn--toolbar'}`} onClick={()=>toggleMode('chiudi')}>
                <LockIco/> Chiudi
              </button>
            </Tooltip>
            <Tooltip text="Modifiche rapide">
              <button className="sib-btn sib-btn--icon" onClick={()=>setShowFiltroModal(true)}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              </button>
            </Tooltip>
            <Tooltip text="Pianificazione tariffaria di lungo periodo">
              <button className="sib-btn sib-btn--icon" onClick={()=>navigate('foresight-revenue')}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
            </Tooltip>
            <button className="sib-btn sib-btn--toolbar" onClick={()=>navigate('calendario-tariffe')}>
              <i className="fa-duotone fa-calendar tariffe__toolbar-ico" aria-hidden="true"/> Calendario
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex items-center gap-2 h-9">
            <button className="sib-btn sib-btn--toolbar" onClick={()=>setShowStopModal(true)}>
              <i className="fa-duotone fa-ban text-[13px]" aria-hidden="true"/> Stop sales
            </button>
            <button className="sib-btn sib-btn--primary" onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),3000)}}>
              <i className="fa-duotone fa-check tariffe__btn-check-ico" aria-hidden="true"/> Salva e invia
            </button>
          </div>
        </div>
      </div>

      {mode && (
        <div className={`tariffe__mode-bar tariffe__mode-bar--${mode}`}>
          <LockIco open={mode==='apri'}/>
          <span className="tariffe__mode-text">
            Modalità <strong>{mode==='apri'?'APERTURA':'CHIUSURA'}</strong> attiva — clicca sulle celle per {mode==='apri'?'aprire':'chiudere'} la disponibilità
          </span>
          <button onClick={()=>setMode(null)} className="tariffe__mode-exit">Esci</button>
        </div>
      )}

      {/* Grid */}
      <div className="tariffe__grid-wrap">
        <div className="tariffe__grid-scroll">
          <table className="tariffe__table tariffe__table-sized" style={{ '--table-min-w': `${labelW+numDays*colW}px` } as React.CSSProperties}>
            <colgroup>
              <col className="tariffe__col--label"/>
              {dates.map((_,i)=><col key={i} className="tariffe__col--day" style={{ '--col-w': `${colW}px` } as React.CSSProperties}/>)}
              <col className="tariffe__col--expand"/>
            </colgroup>
            <thead>
              <tr className="tariffe__thead-row">
                <th className="tariffe__th-label">Tipo camera</th>
                {dates.map((d,i)=>{
                  const we=isWE(d), occ=occMap[fmt(d)]??0
                  return (
                    <th key={i} className={`tariffe__th-date ${we?'tariffe__th-date--we':''} ${i<dates.length-1?'tariffe__th-date--border':''}`}>
                      <div className={`tariffe__th-day ${we?'tariffe__th-day--we':''}`}>{fmtCol(d)}</div>
                      <div className="tariffe__th-name">{fmtDay(d)}</div>
                      <div className={`tariffe__th-occ ${occ>=80?'tariffe__th-occ--high':occ>=50?'tariffe__th-occ--mid':''}`}>{occ}%</div>
                    </th>
                  )
                })}
                <th className="tariffe__th-expand">Espandi</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((cam,ci) => {
                const isExp=expanded.has(cam.id)
                return (
                  <React.Fragment key={cam.id}>
                    <tr className={`tariffe__tr-cam ${ci%2===0?'tariffe__tr--even':''}`}>
                      <td className="tariffe__td-label">
                        <div className="tariffe__cam-info">
                          <div className="tariffe__cam-dot tariffe__cam-dot--dyn" style={{ '--cam-color': cam.colore } as React.CSSProperties}/>
                          <Toggle on={cam.enabled} onChange={()=>toggleCamera(cam.id)}/>
                          <span className="tariffe__cam-name">{cam.label}</span>
                        </div>
                      </td>
                      {dates.map((d,di) => {
                        const dk=fmt(d), k=`${cam.id}-${dk}`, price=priceMap[k]??0, bar=barMap[k]??1
                        const stopped=stopSales.has(k), status=cellStatus[k], we=isWE(d)
                        let cellMod=''
                        if(stopped) cellMod='tariffe__td-cell--stopped'
                        else if(status==='aperta') cellMod='tariffe__td-cell--aperta'
                        else if(status==='chiusa') cellMod='tariffe__td-cell--chiusa'
                        else if(we) cellMod='tariffe__td-cell--we'
                        else if(ci%2===0) cellMod='tariffe__td-cell--even'
                        return (
                          <td key={di} onClick={()=>handleCellClick(cam.id,dk)}
                            className={`tariffe__td-cell ${cellMod} ${di<dates.length-1?'tariffe__td-cell--border':''} ${mode?'tariffe__td-cell--clickable':''}`}>
                            <div className="tariffe__cell-top">
                              <span className="tariffe__bar-badge">BAR{bar}</span>
                              <div className="tariffe__info-wrap"
                                onMouseEnter={e=>{const r=(e.currentTarget as HTMLElement).getBoundingClientRect();setTooltip({camId:cam.id,dk,x:r.left+r.width/2,y:r.top})}}
                                onMouseLeave={()=>setTooltip(null)}>
                                <button onClick={e=>e.stopPropagation()} className="tariffe__info-btn">
                                  <i className="fa-duotone fa-circle-info tariffe__info-ico" aria-hidden="true"/>
                                </button>
                                {tooltip?.camId===cam.id&&tooltip?.dk===dk&&(
                                  <div className="tariffe__tooltip tariffe__tooltip--positioned" style={{ '--tt-x': `${tooltip.x}px`, '--tt-y': `${tooltip.y ?? 0}px` } as React.CSSProperties}>
                                    <div className="tariffe__tooltip-title">Disponibilità per settore</div>
                                    {getSectorDisp(cam.id,dk).map(s=>(
                                      <div key={s.label} className="tariffe__tooltip-row" style={{ '--sector-color': s.color } as React.CSSProperties}>
                                        <div className="tariffe__tooltip-left">
                                          <div className="tariffe__tooltip-icon tariffe__tooltip-icon--dyn">{s.icon}</div>
                                          <span className="tariffe__tooltip-label">{s.label}</span>
                                        </div>
                                        <div className="tariffe__tooltip-right">
                                          <div className="tariffe__tooltip-bar-wrap">
                                            <div className="tariffe__tooltip-bar tariffe__tooltip-bar--dyn" style={{ '--bar-w': `${Math.min(100,s.value*20)}%` } as React.CSSProperties}/>
                                          </div>
                                          <span className="tariffe__tooltip-val tariffe__tooltip-val--dyn">{s.value}</span>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="tariffe__tooltip-arrow"/>
                                  </div>
                                )}
                              </div>
                              <button onClick={e=>{e.stopPropagation();setStopSales(prev=>{const n=new Set(prev);n.has(k)?n.delete(k):n.add(k);return n})}} className="tariffe__stop-btn" title={stopped?'Rimuovi stop':'Stop sales'}>
                                <i className={`fa-duotone fa-hourglass tariffe__stop-ico ${stopped?'tariffe__stop-ico--active':''}`} aria-hidden="true"/>
                              </button>
                              {status && <i className={`fa-duotone ${status==='aperta'?'fa-lock-open':'fa-lock'} tariffe__status-ico tariffe__status-ico--${status}`} aria-hidden="true"/>}
                            </div>
                            {stopped
                              ? <div className="tariffe__cell-stop">STOP</div>
                              : <select onClick={e=>e.stopPropagation()} defaultValue={price.toFixed(2)} className={`sib-select bg-transparent border-none text-center font-bold text-[11px] tariffe__price-select-ext tariffe__price-select-ext--${status==='chiusa'?'chiusa':status==='aperta'?'aperta':'default'}`} style={{ '--cam-color': cam.colore } as React.CSSProperties}>
                                  {[price*0.85,price*0.90,price*0.95,price,price*1.05,price*1.10,price*1.15].map(p=><option key={p} value={p.toFixed(2)}>{p.toFixed(2).replace('.',',')} €</option>)}
                                </select>
                            }
                          </td>
                        )
                      })}
                      <td className="tariffe__td-expand">
                        <button onClick={()=>toggleExpand(cam.id)} className={`tariffe__expand-btn ${isExp?'tariffe__expand-btn--active':''}`}>
                          <i className="fa-duotone fa-plus tariffe__expand-ico" aria-hidden="true"/>
                        </button>
                      </td>
                    </tr>
                    <tr className={`tariffe__tr-inv ${ci%2===0?'tariffe__tr-inv--even':''}`}>
                      <td className="tariffe__td-sublabel">
                        <div className="tariffe__inv-info">
                          <span className="tariffe__inv-text">Inventario</span>
                          <span className="tariffe__inv-badge tariffe__inv-badge--dyn" style={{ '--cam-color': cam.colore, '--cam-badge-bg': `${cam.colore}18` } as React.CSSProperties}>{cam.unitLabel}</span>
                        </div>
                      </td>
                      {dates.map((_,di)=><td key={di} className={`tariffe__td-inv-val ${di<dates.length-1?'tariffe__td-inv-val--border':''}`}>{cam.inventario}</td>)}
                      <td/>
                    </tr>
                    <tr className={`tariffe__tr-avail ${isExp?'tariffe__tr-avail--exp':''} ${ci%2===0?'tariffe__tr-avail--even':''}`}>
                      <td className="tariffe__td-sublabel"><span className="tariffe__inv-text">Disponibili alla vendita</span></td>
                      {dates.map((d,di)=>{
                        const disp=dispMap[`${cam.id}-${fmt(d)}`]??0
                        const dispMod=disp===0?'zero':disp<=2?'low':'ok'
                        return <td key={di} className={`tariffe__td-avail ${di<dates.length-1?'tariffe__td-inv-val--border':''}`}>
                          <span className={`tariffe__avail-num tariffe__avail-num--${dispMod}`}>{disp}</span>
                        </td>
                      })}
                      <td/>
                    </tr>
                    {isExp && (
                      <>
                        <tr className="tariffe__tr-exp">
                          <td className="tariffe__td-sublabel"><span className="tariffe__exp-label">Occupate</span></td>
                          {dates.map((d,di)=>{
                            const {occ,inv,pct}=getOccupate(cam.id,fmt(d))
                            const color=pct>=90?T.error:pct>=50?'#E07B39':T.success
                            return <td key={di} className={`tariffe__td-occ ${di<dates.length-1?'tariffe__td-inv-val--border':''}`} style={{ '--occ-color': color } as React.CSSProperties}>
                              <div className="tariffe__occ-cell">
                                <i className="fa-duotone fa-bed tariffe__bed-ico" aria-hidden="true"/>
                                <div>
                                  <div className="tariffe__occ-num tariffe__occ-num--dyn">{occ} / {inv}</div>
                                  <div className="tariffe__occ-pct">{pct}%</div>
                                </div>
                              </div>
                            </td>
                          })}
                          <td/>
                        </tr>
                        <tr className="tariffe__tr-exp tariffe__tr-exp--last">
                          <td className="tariffe__td-sublabel"><span className="tariffe__exp-label">Residuo sui canali</span></td>
                          {dates.map((d,di)=>{
                            const disp=dispMap[`${cam.id}-${fmt(d)}`]??0,residuo=Math.min(99,Math.max(0,disp))
                            const resMod=residuo===0?'res-zero':residuo<=10?'res-low':'res-ok'
                            return <td key={di} className={`tariffe__td-avail ${di<dates.length-1?'tariffe__td-inv-val--border':''}`}>
                              <span className={`tariffe__avail-num tariffe__avail-num--${resMod}`}>{residuo}</span>
                            </td>
                          })}
                          <td/>
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tariffe__legend">
        {cameras.map(c=><div key={c.id} className="tariffe__legend-item"><div className="tariffe__legend-dot tariffe__legend-dot--dyn" style={{ '--legend-dot-bg': c.colore } as React.CSSProperties}/><span>{c.label}</span></div>)}
        <div className="tariffe__legend-item tariffe__legend-item--ml">
          <div className="tariffe__legend-dot tariffe__legend-dot--aperta"/><span>Aperta</span>
        </div>
        <div className="tariffe__legend-item">
          <div className="tariffe__legend-dot tariffe__legend-dot--chiusa"/><span>Chiusa</span>
        </div>
      </div>

      {showStopModal   && <StopSalesModal struttura={struttura} onClose={()=>setShowStopModal(false)}/>}
      {showFiltroModal && <FiltroModal cameras={cameras} dateFrom={dateFrom} onClose={()=>setShowFiltroModal(false)}/>}
    </div>
  )
}
