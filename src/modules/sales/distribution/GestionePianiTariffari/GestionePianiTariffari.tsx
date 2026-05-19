import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import PageHeader from '../../../../core/components/PageHeader'
import './GestionePianiTariffari.sass'
import FormActions from '../../../../core/components/FormActions'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import FormGrid from '../../../../core/components/FormGrid'
import { InputField, SelectField, DatePickerField } from '../../../../core/components/form'

const CATEGORIE = [
  {id:'BAR',    label:'BAR',    tipo:'B', color:T.blue,    hasPct:false},
  {id:'FIT',    label:'FIT',    tipo:'R', color:'#5A8A3C', hasPct:true, defaultPct:'6,00'},
  {id:'Gruppi', label:'Gruppi', tipo:'B', color:'#C4A820', hasPct:true, defaultPct:'0,00'},
]
const CAMERE = ['Nessuna selezione','Singola Classic','Doppia Classic','Tripla Classic','Matrimoniale Superior','Matrimoniale Convertibile']

const CatIco = ({color='#5C9CD4'}:{color?:string}) => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)

type Piano = {id:number;nome:string;valore:string;scadenza:string;arrangiamento:string}

export default function GestionePianiTariffari({ navigate }: { navigate: (p:string)=>void }) {
  const [struttura,       setStruttura]       = useState('HOTEL LUCE GH')
  const [showModal,       setShowModal]       = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraRef,       setCameraRef]       = useState<Record<string,string>>({BAR:'Doppia Classic',FIT:'Nessuna selezione',Gruppi:'Nessuna selezione'})
  const [modalCategoria,  setModalCategoria]  = useState<'BAR'|'FIT'|'Gruppi'>('BAR')
  const [expanded,        setExpanded]        = useState<Set<string>>(new Set(['BAR']))
  const [editId,          setEditId]          = useState<number|null>(null)
  const [pctVals,         setPctVals]         = useState<Record<string,string>>({FIT:'6,00',Gruppi:'0,00'})
  const [form, setForm] = useState({nome:'',scontoPercentuale:'0',arrangiamento:'RO',dataInizio:new Date().toISOString().split('T')[0],dataFine:new Date().toISOString().split('T')[0],giorni:'0',politica:'Flessibile',adv:false,scontoCheck:true,dirette:false,b2c:false})
  const [piani, setPiani] = useState<Record<string,Piano[]>>({ BAR:[{id:1,nome:'BAr 10%',valore:'10,00 %',scadenza:'13/12/2025',arrangiamento:'RO'}], FIT:[], Gruppi:[] })

  const toggleExpand = (id:string) => setExpanded(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  const openModal = (cat:'BAR'|'FIT'|'Gruppi', piano?:Piano) => {
    setModalCategoria(cat)
    if (piano) { setEditId(piano.id); const pct=parseFloat(piano.valore.replace(',','.').replace(' %',''))||0; setForm(f=>({...f,nome:piano.nome,scontoPercentuale:String(pct),arrangiamento:piano.arrangiamento||'RO'}))
    } else { setEditId(null); setForm({nome:'',scontoPercentuale:'0',arrangiamento:'RO',dataInizio:new Date().toISOString().split('T')[0],dataFine:new Date().toISOString().split('T')[0],giorni:'0',politica:'Flessibile',adv:false,scontoCheck:true,dirette:false,b2c:false}) }
    setShowModal(true)
  }
  const handleSave = () => {
    if (!form.nome.trim()) return
    const scad=form.dataFine?new Date(form.dataFine).toLocaleDateString('it-IT'):'--'
    const val=`${parseFloat(form.scontoPercentuale||'0').toFixed(2).replace('.',',')} %`
    if (editId!==null) { setPiani(prev=>({...prev,[modalCategoria]:prev[modalCategoria].map(p=>p.id===editId?{...p,nome:form.nome,valore:val,scadenza:scad,arrangiamento:form.arrangiamento}:p)}))
    } else { setPiani(prev=>({...prev,[modalCategoria]:[...prev[modalCategoria],{id:Date.now(),nome:form.nome,valore:val,scadenza:scad,arrangiamento:form.arrangiamento}]})); setExpanded(prev=>new Set(Array.from(prev).concat(modalCategoria))) }
    setShowModal(false)
  }
  const handleDelete = (cat:string, id:number) => setPiani(prev=>({...prev,[cat]:prev[cat].filter(p=>p.id!==id)}))

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Gestione dei piani tariffari" subtitle="Gestisci i piani tariffari in modo smart per offrire prezzi dinamici ottimizzati per ogni segmento di mercato"/>

      <FilterToolbar actions={
        <>
          <button className="sib-btn sib-btn--toolbar" onClick={()=>setShowCameraModal(true)}>
            <i className="fa-duotone fa-bed text-[14px] text-primary" aria-hidden="true"/> Associa camera
          </button>
          <button className="sib-btn sib-btn--primary" onClick={()=>openModal('BAR')}>
            <i className="fa-duotone fa-plus text-[14px]" aria-hidden="true"/> Aggiungi piano
          </button>
        </>
      }>
        <SelectField
          name="struttura"
          label="Strutture"
          value={struttura}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
          options={['HOTEL LUCE GH','Hotel Noto','Grand Hotel Roma','Villa Bellini'].map(s => ({ value: s, label: s }))}
          className="w-44"
        />
      </FilterToolbar>

      {/* Accordion categorie */}
      <div style={{background:T.white,borderRadius:12,border:`0.5px solid ${T.border}`,overflow:'hidden'}}>
        {CATEGORIE.map((cat,ci) => {
          const isExp = expanded.has(cat.id)
          const items = piani[cat.id] || []
          return (
            <div key={cat.id} style={{borderBottom:ci<CATEGORIE.length-1?`1px solid ${T.border}`:'none'}}>
              <div className="piani__cat-header" onClick={()=>toggleExpand(cat.id)}>
                <div className="piani__cat-left">
                  <CatIco color={cat.color}/>
                  <span style={{fontSize:13,fontWeight:700,color:cat.color,fontFamily:'Poppins,sans-serif'}}>{cat.label}</span>
                  <select defaultValue={cat.tipo} onClick={e=>e.stopPropagation()} className="sib-select sib-select--dense w-[54px]">
                    <option>B</option><option>R</option><option>N</option>
                  </select>
                  {cat.hasPct && (
                    <div style={{display:'flex',alignItems:'center',gap:4}} onClick={e=>e.stopPropagation()}>
                      <input type="number" value={pctVals[cat.id]||'0'} onChange={e=>setPctVals(p=>({...p,[cat.id]:e.target.value}))}
                        className="sib-input sib-input--dense w-[64px] text-center"/>
                      <span style={{fontSize:11,fontWeight:600,color:T.textInactive}}>%</span>
                    </div>
                  )}
                </div>
                <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
                  <span className="piani__cat-count">{items.length} pian{items.length===1?'o':'i'}</span>
                  <div className={`piani__chevron ${isExp?'piani__chevron--open':'piani__chevron--closed'}`}><i className="fa-duotone fa-chevron-down text-[13px] text-ink-subtle" aria-hidden="true"/></div>
                </div>
              </div>
              {isExp && (
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderBottom:`0.5px solid ${T.border}`,background:'#FAFCFF'}}>
                    <Tooltip text="Aggiungi piano">
                      <button onClick={()=>openModal(cat.id as 'BAR'|'FIT'|'Gruppi')}
                        style={{width:26,height:26,borderRadius:6,border:`1.5px solid ${cat.color}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                        onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background=`${cat.color}18`} onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='transparent'}>
                        <i className="fa-duotone fa-plus text-[12px] text-primary" aria-hidden="true"/>
                      </button>
                    </Tooltip>
                  </div>
                  {items.length > 0 && (
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 1.2fr 100px',padding:'8px 16px',background:'#F8FAFC',borderBottom:`0.5px solid ${T.border}`}}>
                      {['Nome','Valore','Scadenza','Azioni'].map((h,i)=><div key={i} style={{fontSize:10,fontWeight:700,color:T.textDisabled,textTransform:'uppercase',letterSpacing:'0.4px',textAlign:i===3?'center':'left'}}>{h}</div>)}
                    </div>
                  )}
                  {items.map((piano) => (
                    <div key={piano.id} className="piani__piano-row" style={{gridTemplateColumns:'2fr 1.2fr 1.2fr 100px'}}>
                      <div className="piani__piano-name">{piano.nome}</div>
                      <div className="piani__piano-value">{piano.valore}</div>
                      <div className="piani__piano-date">{piano.scadenza}</div>
                      <div className="piani__piano-actions">
                        <button className="piani__action-btn piani__action-btn--edit" onClick={()=>openModal(cat.id as 'BAR'|'FIT'|'Gruppi',piano)}><i className="fa-duotone fa-pen text-[14px] text-primary" aria-hidden="true"/></button>
                        <button className="piani__action-btn piani__action-btn--delete" onClick={()=>handleDelete(cat.id,piano.id)}><i className="fa-duotone fa-trash text-[14px] text-primary" aria-hidden="true"/></button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="piani__empty">
                      <p style={{margin:'0 0 12px'}}>Nessun piano tariffario per questa categoria</p>
                      <button onClick={()=>openModal(cat.id as 'BAR'|'FIT'|'Gruppi')}
                        style={{display:'inline-flex',alignItems:'center',gap:6,background:'transparent',border:`1.5px solid ${cat.color}`,borderRadius:7,padding:'7px 18px',cursor:'pointer',fontSize:12,fontWeight:600,color:cat.color}}
                        onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background=`${cat.color}12`} onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='transparent'}>
                        Aggiungi piano {cat.label}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal camera */}
      <Modal open={showCameraModal} onClose={()=>setShowCameraModal(false)} size="md">
        <div className="mb-5">
          <h2 className="font-poppins text-[17px] font-bold text-primary mb-1">Seleziona la camera di riferimento</h2>
          <p className="text-xs text-link font-medium">Configurazione necessaria per la gestione del pricing</p>
        </div>
        <div className="border border-line rounded-card overflow-hidden">
          {([{id:'BAR',label:'BAR',color:T.blue},{id:'FIT',label:'FIT',color:'#5A8A3C'},{id:'Gruppi',label:'Gruppi',color:'#C4A820'}] as any[]).map((cat,i,arr)=>(
            <div key={cat.id} className={`grid grid-cols-[1fr_48px_120px] items-center gap-3 px-4 py-3.5 ${i<arr.length-1?'border-b border-line':''} ${i%2===0?'bg-white':'bg-canvas'}`}>
              <select value={cameraRef[cat.id]} onChange={e=>setCameraRef(prev=>({...prev,[cat.id]:e.target.value}))} className="sib-select w-full" style={{color:cameraRef[cat.id]==='Nessuna selezione'?T.textDisabled:T.primary}}>
                {CAMERE.map(c=><option key={c}>{c}</option>)}
              </select>
              <div className="flex items-center justify-center">
                {cameraRef[cat.id]==='Nessuna selezione'
                  ?<i className="fa-duotone fa-link-slash text-ink-subtle text-lg" aria-hidden="true"/>
                  :<i className="fa-duotone fa-link text-primary text-lg" aria-hidden="true"/>
                }
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-field border border-line" style={{background:i%2===0?'#F8FAFC':T.white}}>
                <CatIco color={cat.color}/>
                <span className="text-[13px] font-bold font-poppins" style={{color:cat.color}}>{cat.label}</span>
              </div>
            </div>
          ))}
        </div>
        <FormActions onCancel={()=>setShowCameraModal(false)} onConfirm={()=>setShowCameraModal(false)}/>
      </Modal>

      {/* Modal piano */}
      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Aggiungi piano tariffario" size="md">
        <div className="mb-4 pb-3 border-b border-line">
          <span className="text-sm font-bold text-primary font-poppins">{modalCategoria} {form.scontoPercentuale||'0'}%</span>
        </div>
        <div className="flex flex-col gap-3.5">
          <FormGrid>
            <InputField name="nome" label="Nome" required value={form.nome} placeholder="Name" error={!form.nome && showModal ? 'Campo obbligatorio' : undefined} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,nome:e.target.value}))}/>
            <InputField name="scontoPercentuale" label="Sconto Percentuale" type="number" value={form.scontoPercentuale} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,scontoPercentuale:e.target.value}))}/>
          </FormGrid>
          <FormGrid cols={3}>
            <InputField name="arrangiamento" label="Arrangiamento" value={form.arrangiamento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,arrangiamento:e.target.value}))}/>
            <DatePickerField name="dataInizio" label="Data inizio" value={form.dataInizio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,dataInizio:e.target.value}))}/>
            <DatePickerField name="dataFine" label="Data fine" value={form.dataFine} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,dataFine:e.target.value}))}/>
          </FormGrid>
          <FormGrid>
            <InputField name="giorni" label="Giorni" type="number" value={form.giorni} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,giorni:e.target.value}))}/>
            <SelectField name="politica" label="Politica prenotazioni" value={form.politica} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(v=>({...v,politica:e.target.value}))} options={['Flessibile','Non rimborsabile','Moderate','Strict','cicici'].map(o => ({ value: o, label: o }))}/>
          </FormGrid>
          <div className="flex items-center gap-5 py-2.5 border-t border-line flex-wrap">
            {[{k:'adv',l:'ADV'},{k:'scontoCheck',l:'Sconto percentuale'},{k:'dirette',l:'Dirette'},{k:'b2c',l:'B2C'}].map(ch=>(
              <label key={ch.k} className={`flex items-center gap-1.5 cursor-pointer text-xs font-opensans ${(form as any)[ch.k]?'text-primary font-semibold':'text-ink'}`}>
                <input type="checkbox" checked={(form as any)[ch.k]} onChange={e=>setForm(v=>({...v,[ch.k]:e.target.checked}))} className="sib-checkbox"/>{ch.l}
              </label>
            ))}
          </div>
          <FormActions onCancel={()=>setShowModal(false)} onConfirm={handleSave} confirmDisabled={!form.nome.trim()}/>
        </div>
      </Modal>
    </div>
  )
}
