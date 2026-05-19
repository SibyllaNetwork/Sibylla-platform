import { bookingStore } from '../../../../core/bookingStore'
import React, { useState, useRef, useEffect } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import './NuovaPrenotazione.sass'
import FormActions from '../../../../core/components/FormActions'
import Tabs from '../../../../core/components/Tabs'
import FormGrid from '../../../../core/components/FormGrid'
import { InputField, SelectField, DateRangeField, DatePickerField } from '../../../../core/components/form'

const SERVIZI     = [{nome:'Breakfast',prezzo:13},{nome:'Breakfast Delivery Box',prezzo:9},{nome:'Dinner',prezzo:29},{nome:'Dinner Delivery Box',prezzo:18}]
const IND_SERVIZI = [{nome:'Breakfast',prezzo:13},{nome:'Breakfast Delivery Box',prezzo:9},{nome:'Dinner',prezzo:29},{nome:'Dinner Delivery Box',prezzo:18},{nome:'Lunch',prezzo:25},{nome:'Lunch Delivery Box',prezzo:10}]
const TARIFFA     = 48.50
const ROOM_PRICES: Record<string,number> = {singola:20,doppia:20,matrimoniale:20,tripla:30}
const TODAY       = new Date().toISOString().split('T')[0]

const Counter = ({value,onChange}:{value:number;onChange:(v:number)=>void}) => (
  <div className="prenota__counter">
    <button onClick={()=>onChange(Math.max(0,value-1))} className="prenota__counter-btn">−</button>
    <input type="number" value={value} onChange={e=>onChange(Math.max(0,parseInt(e.target.value)||0))} className="sib-input w-[60px] h-[30px] text-center"/>
    <button onClick={()=>onChange(value+1)} className="prenota__counter-btn">+</button>
  </div>
)

const ServRow = ({s,qty,onQtyChange}:{s:{nome:string;prezzo:number};qty:number;onQtyChange:(v:number)=>void}) => (
  <div className="prenota__serv-row">
    <div className="prenota__serv-name-cell">
      <button onClick={()=>onQtyChange(qty+1)} className="prenota__serv-add">+</button>
      <span className="prenota__serv-name">{s.nome}</span>
    </div>
    <div className="prenota__serv-price">{s.prezzo.toFixed(2).replace('.',',')} €</div>
    <div className="prenota__serv-qty-cell">
      <input type="number" value={qty} min={0} onChange={e=>onQtyChange(Math.max(0,parseInt(e.target.value)||0))} className="sib-input w-[52px] h-7 text-xs text-center"/>
    </div>
    <div className="prenota__serv-total">{(qty*s.prezzo).toFixed(2).replace('.',',')} €</div>
  </div>
)

const ServTable = ({servizi,qty,setQty,totale}:{servizi:typeof SERVIZI;qty:Record<string,number>;setQty:any;totale:number}) => (
  <div className="prenota__serv-table">
    <div className="prenota__serv-head">
      {['Servizi inclusi','Prezzo','Quantità','Totale'].map((h,i)=><div key={i} className={`prenota__serv-th ${i>0?'prenota__serv-th--right':''}`}>{h}</div>)}
    </div>
    {servizi.map((s,i)=><ServRow key={i} s={s} qty={qty[s.nome]||0} onQtyChange={v=>setQty((prev:any)=>({...prev,[s.nome]:v}))}/>)}
    <div className="prenota__serv-footer">
      <div/><div/>
      <div className="prenota__serv-footer-label">Totale servizi:</div>
      <div className="prenota__serv-footer-val">{totale.toFixed(2).replace('.',',')} €</div>
    </div>
  </div>
)

const NAZIONALITA = ['ITALIA','FRANCIA','GERMANIA','SPAGNA','REGNO UNITO','STATI UNITI']

export default function NuovaPrenotazione({ navigate }: { navigate: (p:string)=>void }) {
  const [activeTab,        setActiveTab]        = useState<'gruppo'|'individuale'>('gruppo')
  const [indStep,          setIndStep]          = useState<1|2>(1)
  const [showPersonalizza, setShowPersonalizza] = useState(false)
  const [roomCounts,       setRoomCounts]       = useState<Record<string,number>>({singola:0,doppia:0,matrimoniale:0,tripla:0})
  const [servQty,          setServQty]          = useState<Record<string,number>>({})
  const [indServQty,       setIndServQty]       = useState<Record<string,number>>({})
  const persRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({dataInizio:TODAY,dataFine:TODAY,camere:6,persone:12,confermata:false,extra:false,arrangiamento:'BB',tipoGruppo:'Studenti' as 'Adulti'|'Studenti',nomeGruppo:'',nomeCapoGruppo:'',emailCapoGruppo:'',nazionalita:'ITALIA',note:''})
  const [indForm, setIndForm] = useState({dal:TODAY,al:TODAY,camere:0,adulti:2,ragazzi:0,bambini:0,arrangiamento:'RO',citta:'Roma',opzione:true,confermata:false,scadenza:'',personeConf:'',b2b:true,dirette:false,agenzia:'',nome:'',cognome:'',email:'',nazionalita:'ITALIA',note:''})

  useEffect(() => {
    const h=(e:MouseEvent)=>{if(persRef.current&&!persRef.current.contains(e.target as Node))setShowPersonalizza(false)}
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h)
  }, [])

  const totaleServizi    = SERVIZI.reduce((a,s)=>a+(servQty[s.nome]||0)*s.prezzo, 0)
  const indTotaleServizi = IND_SERVIZI.reduce((a,s)=>a+(indServQty[s.nome]||0)*s.prezzo, 0)
  const totaleSuppl      = Object.entries(roomCounts).reduce((a,[t,q])=>a+(ROOM_PRICES[t]||0)*q, 0)
  const importo          = TARIFFA*form.persone+totaleServizi
  const adjustRoom       = (t:string, d:number) => setRoomCounts(prev=>({...prev,[t]:Math.max(0,(prev[t]||0)+d)}))

  return (
    <div>
      <BtnBack onClick={() => navigate('tableau-book')} />
      <PageHeader title="Nuova prenotazione" subtitle="Inserisci i dati per creare una nuova prenotazione nel tableau"/>

      <div className="prenota__card">
        <Tabs
          tabs={[{id:'gruppo',label:'Gruppo'},{id:'individuale',label:'Individuale'}]}
          active={activeTab}
          onChange={id=>setActiveTab(id as 'gruppo'|'individuale')}
          className="px-5"
        />

        <div className="prenota__body">
          {/* ── TAB GRUPPO ── */}
          {activeTab==='gruppo' && (
            <div className="prenota__tab-content">
              <div className="prenota__grid-2">
                {/* Dates + rooms */}
                <div className="prenota__section prenota__section--col">
                  <DateRangeField
                    nameFrom="dataInizio"
                    nameTo="dataFine"
                    label="Date"
                    valueFrom={form.dataInizio}
                    valueTo={form.dataFine}
                    onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,dataInizio:e.target.value}))}
                    onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,dataFine:e.target.value}))}
                  />
                  <div className="prenota__counters-row">
                    <div className="prenota__counter-item">
                      <span className="prenota__field-label">Camere <span className="prenota__counter-sublabel">(Totali)</span>:</span>
                      <Counter value={form.camere} onChange={v=>setForm(f=>({...f,camere:v}))}/>
                    </div>
                    <div className="prenota__counter-item">
                      <span className="prenota__field-label">Persone:</span>
                      <Counter value={form.persone} onChange={v=>setForm(f=>({...f,persone:v}))}/>
                    </div>
                  </div>
                  <div className="prenota__suppl-wrap" ref={persRef}>
                    <div className="prenota__suppl-row">
                      <span className="prenota__suppl-label">In suppl:</span>
                      <span className="prenota__suppl-sublabel">(Capo gruppo)</span>
                      <span className="prenota__suppl-count">{Object.values(roomCounts).reduce((a,b)=>a+b,0)}</span>
                      <button className={`prenota__personalizza-btn ${showPersonalizza?'prenota__personalizza-btn--open':''}`} onClick={()=>setShowPersonalizza(v=>!v)}>Personalizza</button>
                    </div>
                    {showPersonalizza && (
                      <div className="prenota__personalizza-popup">
                        {Object.keys(roomCounts).map(type=>(
                          <div key={type} className="prenota__room-row">
                            <div className="prenota__room-info">
                              <span className="prenota__room-type">{type}</span>
                              <span className="prenota__room-price">{ROOM_PRICES[type]},00 €</span>
                            </div>
                            <div className="prenota__room-controls">
                              <button onClick={()=>adjustRoom(type,-1)} className="prenota__room-btn">−</button>
                              <span className="prenota__room-qty">{roomCounts[type]}</span>
                              <button onClick={()=>adjustRoom(type,1)} className="prenota__room-btn">+</button>
                              <span className="prenota__room-subtotal">{((roomCounts[type]||0)*ROOM_PRICES[type]).toFixed(2).replace('.',',')} €</span>
                            </div>
                          </div>
                        ))}
                        {totaleSuppl>0 && (
                          <div className="prenota__suppl-total">
                            <span className="prenota__suppl-total-label">Totale:</span>
                            <span className="prenota__suppl-total-val">{totaleSuppl.toFixed(2).replace('.',',')} € Suppl: {totaleSuppl.toFixed(2).replace('.',',')} €</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold font-opensans text-ink">Stato</span>
                    <div className="flex items-center gap-4 h-9">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans text-ink">
                        <input type="checkbox" checked={form.confermata} onChange={e=>setForm(v=>({...v,confermata:e.target.checked}))} className="sib-checkbox"/>
                        <div className="w-2 h-2 rounded-full bg-success shrink-0"/> Confermata
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans text-ink">
                        <input type="checkbox" checked={form.extra} onChange={e=>setForm(v=>({...v,extra:e.target.checked}))} className="sib-checkbox"/>
                        Extra
                      </label>
                    </div>
                  </div>
                  <SelectField
                    name="arrangiamento"
                    label="Arrangiamento"
                    value={form.arrangiamento}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(v=>({...v,arrangiamento:e.target.value}))}
                    options={['RO','BB','HB','FB','AI'].map(o => ({ value: o, label: o }))}
                    className="w-36"
                  />
                </div>
              </div>

              {/* Group data */}
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold font-opensans text-ink">Tipo Gruppo</span>
                  <div className="flex items-center gap-4 h-9">
                    {(['Adulti','Studenti'] as const).map(t=>(
                      <label key={t} className={`flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans ${form.tipoGruppo===t?'text-primary font-semibold':'text-ink'}`}>
                        <input type="radio" checked={form.tipoGruppo===t} onChange={()=>setForm(v=>({...v,tipoGruppo:t}))} className="sib-radio"/>{t}
                      </label>
                    ))}
                  </div>
                </div>
                <InputField
                  name="nomeGruppo"
                  label="Nome Gruppo"
                  value={form.nomeGruppo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,nomeGruppo:e.target.value}))}
                />
                <FormGrid>
                  <InputField
                    name="nomeCapoGruppo"
                    label="Nome Capo Gruppo"
                    value={form.nomeCapoGruppo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,nomeCapoGruppo:e.target.value}))}
                  />
                  <InputField
                    name="emailCapoGruppo"
                    label="Email Capo Gruppo"
                    type="email"
                    value={form.emailCapoGruppo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,emailCapoGruppo:e.target.value}))}
                  />
                </FormGrid>
                <FormGrid>
                  <SelectField
                    name="nazionalita"
                    label="Nazionalità"
                    value={form.nazionalita}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(v=>({...v,nazionalita:e.target.value}))}
                    options={NAZIONALITA.map(o => ({ value: o, label: o }))}
                  />
                  <InputField
                    name="note"
                    label="Note"
                    value={form.note}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,note:e.target.value}))}
                  />
                </FormGrid>
              </div>

              <ServTable servizi={SERVIZI} qty={servQty} setQty={setServQty} totale={totaleServizi}/>

              <div className="prenota__importo-bar">
                <span className="prenota__importo-text">Tariffa: <strong>{TARIFFA.toFixed(2).replace('.',',')} € a persona</strong></span>
                <span className="prenota__importo-text">Servizi: <strong>{totaleServizi.toFixed(2).replace('.',',')} €</strong></span>
                <div className="prenota__importo-total">
                  <span className="prenota__importo-text">Importo:</span>
                  <span className="prenota__importo-amount">{importo.toFixed(2).replace('.',',')} €</span>
                </div>
              </div>

              <FormActions onCancel={()=>navigate('tableau-book')} onConfirm={()=>{
                  const startD=new Date(form.dataInizio), endD=new Date(form.dataFine)
                  bookingStore.pending={id:Date.now(),nome:form.nomeGruppo||'Nuova prenotazione',startDay:startD.getDate(),endDay:endD.getDate(),startMonth:startD.getMonth(),startYear:startD.getFullYear(),row:0,colore:form.confermata?T.successMid:T.blue,camere:form.camere,persone:form.persone,importo}
                  navigate('tableau-book')
                }} confirmLabel="Carica"/>
            </div>
          )}

          {/* ── TAB INDIVIDUALE ── */}
          {activeTab==='individuale' && (
            <div>
              {indStep===1 && (
                <div className="prenota__tab-content">
                  {/* Date + Counters — tutti con label + h-9 allineati */}
                  <div className="flex items-end gap-3 flex-wrap">
                    <DateRangeField
                      nameFrom="dal"
                      nameTo="al"
                      label="Date"
                      valueFrom={indForm.dal}
                      valueTo={indForm.al}
                      onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,dal:e.target.value}))}
                      onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,al:e.target.value}))}
                    />
                    {[{l:'Camere',k:'camere'},{l:'Adulti',k:'adulti'},{l:'Ragazzi',k:'ragazzi'},{l:'Bambini',k:'bambini'}].map(({l,k})=>(
                      <div key={k} className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold font-opensans text-ink">{l}</span>
                        <input type="number" className="sib-input w-[60px] text-center" value={(indForm as any)[k]} onChange={e=>setIndForm(v=>({...v,[k]:Math.max(0,parseInt(e.target.value)||0)}))}/>
                      </div>
                    ))}
                    <SelectField
                      name="arrangiamento"
                      label="Arrangiamento"
                      value={indForm.arrangiamento}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIndForm(v=>({...v,arrangiamento:e.target.value}))}
                      options={['RO','BB','HB','FB','AI'].map(o => ({ value: o, label: o }))}
                      className="w-[100px]"
                    />
                    <SelectField
                      name="citta"
                      label="Città"
                      value={indForm.citta}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIndForm(v=>({...v,citta:e.target.value}))}
                      options={['Roma','Milano','Napoli','Firenze','Torino','Bologna','Venezia'].map(o => ({ value: o, label: o }))}
                      className="w-[110px]"
                    />
                  </div>

                  {/* Stato + Provenienza */}
                  <FormGrid>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold font-opensans text-ink">Stato</span>
                        <div className="flex items-center gap-4 h-9">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans text-ink">
                            <input type="checkbox" checked={indForm.opzione} onChange={e=>setIndForm(v=>({...v,opzione:e.target.checked}))} className="sib-checkbox"/>
                            <div className="w-2 h-2 rounded-full bg-error shrink-0"/> Opzione
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans text-ink">
                            <input type="checkbox" checked={indForm.confermata} onChange={e=>setIndForm(v=>({...v,confermata:e.target.checked}))} className="sib-checkbox"/>
                            <div className="w-2 h-2 rounded-full bg-success shrink-0"/> Confermata
                          </label>
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <DatePickerField
                          name="scadenza"
                          label="Scadenza"
                          value={indForm.scadenza}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,scadenza:e.target.value}))}
                          className="w-[138px]"
                        />
                        <InputField
                          name="personeConf"
                          label="Persone conf."
                          type="number"
                          value={indForm.personeConf}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,personeConf:e.target.value}))}
                          className="w-[70px]"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold font-opensans text-ink">Provenienza</span>
                        <div className="flex items-center gap-4 h-9">
                          {[{k:'b2b',l:'B2B'},{k:'dirette',l:'Dirette'}].map(({k,l})=>(
                            <label key={k} className="flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans text-ink">
                              <input type="checkbox" checked={(indForm as any)[k]} onChange={e=>setIndForm(v=>({...v,[k]:e.target.checked}))} className="sib-checkbox"/>
                              {l}
                            </label>
                          ))}
                        </div>
                      </div>
                      <InputField
                        name="agenzia"
                        label="Agenzia"
                        value={indForm.agenzia}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,agenzia:e.target.value}))}
                      />
                    </div>
                  </FormGrid>

                  {/* Anagrafica */}
                  <div className="flex flex-col gap-3.5">
                    <FormGrid>
                      <InputField name="nome" label="Nome" value={indForm.nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,nome:e.target.value}))}/>
                      <InputField name="email" label="Email" type="email" value={indForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,email:e.target.value}))}/>
                    </FormGrid>
                    <InputField name="cognome" label="Cognome" value={indForm.cognome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,cognome:e.target.value}))} className="max-w-[300px]"/>
                    <FormGrid>
                      <SelectField name="nazionalita" label="Nazionalità" value={indForm.nazionalita} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIndForm(v=>({...v,nazionalita:e.target.value}))} options={NAZIONALITA.map(o => ({ value: o, label: o }))}/>
                      <InputField name="note" label="Note" value={indForm.note} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndForm(v=>({...v,note:e.target.value}))}/>
                    </FormGrid>
                  </div>

                  <ServTable servizi={IND_SERVIZI} qty={indServQty} setQty={setIndServQty} totale={indTotaleServizi}/>

                  <div className="flex justify-end gap-2">
                    <button className="sib-btn sib-btn--secondary" onClick={()=>navigate('tableau-book')}>Annulla</button>
                    <button className="sib-btn sib-btn--primary" onClick={()=>setIndStep(2)}>Prossimo <Ico n="chevr" s={13} c="#fff"/></button>
                  </div>
                </div>
              )}

              {indStep===2 && (
                <div className="prenota__tab-content">
                  <div className="flex gap-6 flex-wrap">
                    {[{l:'Dal',v:indForm.dal},{l:'Al',v:indForm.al},{l:'N° persone',v:indForm.adulti},{l:'Arrangiamento',v:indForm.arrangiamento==='RO'?'Room Only':indForm.arrangiamento==='BB'?'Bed & Breakfast':indForm.arrangiamento==='HB'?'Half Board':indForm.arrangiamento==='FB'?'Full Board':'All Inclusive'}].map((item,i)=>(
                      <div key={i}>
                        <div className="text-[11px] font-semibold text-ink-subtle mb-0.5">{item.l}</div>
                        <div className="text-[13px] font-bold text-primary font-poppins">{item.v}</div>
                      </div>
                    ))}
                  </div>
                  {['Listini Dinamici','Listini Statici'].map(title=>(
                    <div key={title} className="prenota__listini-box">
                      <div className="prenota__listini-hdr"><span className="prenota__listini-title">{title}</span></div>
                      <div className="prenota__listini-empty"><p className="prenota__listini-empty-text">Nessuna Offerta dai {title} per questa prenotazione</p></div>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2">
                    <button className="sib-btn sib-btn--toolbar" onClick={()=>setIndStep(1)}><Ico n="back" s={13} c="currentColor"/> Indietro</button>
                    <button className="sib-btn sib-btn--primary" onClick={()=>{
                      bookingStore.pending={id:Date.now(),nome:`${indForm.cognome} ${indForm.nome}`.trim()||'Individuale',startDay:new Date(indForm.dal).getDate(),endDay:new Date(indForm.al).getDate(),startMonth:new Date(indForm.dal).getMonth(),startYear:new Date(indForm.dal).getFullYear(),row:0,colore:indForm.confermata?T.successMid:T.error,camere:indForm.camere,persone:indForm.adulti,importo:indTotaleServizi}
                      navigate('tableau-book')
                    }}>Salva come bozza</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
