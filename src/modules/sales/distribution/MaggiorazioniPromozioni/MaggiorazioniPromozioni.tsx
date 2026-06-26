import React, { useState, useMemo, useEffect } from 'react'
import T from '../../../../core/tokens'
import BtnBack from '../../../../core/components/BtnBack'
import Modal from '../../../../core/components/Modal'
import PageHeader from '../../../../core/components/PageHeader'
import Pagination from '../../../../core/components/Pagination'
import './MaggiorazioniPromozioni.sass'
import { InputField, SelectField, DatePickerField, DateRangeField } from '../../../../core/components/form'

type Promo = {id:number;nome:string;periodoPromo:string;periodoPrenot:string;mercato:string;segmento:string;struttura:string;partners:string;blackout:string;sconto:number}

const INIT_PROMOS: Promo[] = [
  {id:1,nome:'promozione 1',  periodoPromo:'28/11/2025 - 03/11/2025',periodoPrenot:'28/11/2025 - 30/11/2025',mercato:'Libero',segmento:'Dirette',struttura:'Hotel Catania',      partners:'',blackout:'30/11/2025',sconto:25.00},
  {id:2,nome:'San Valentino', periodoPromo:'02/01/2026 - 02/01/2026',periodoPrenot:'02/01/2026 - 30/01/2026',mercato:'Libero',segmento:'Dirette',struttura:'HOTEL LUCE GHOST 1', partners:'',blackout:'',          sconto:-10.00},
  {id:3,nome:'pina',          periodoPromo:'18/03/2026 - 31/03/2026',periodoPrenot:'18/03/2026 - 31/03/2026',mercato:'Libero',segmento:'Dirette',struttura:'Categoria 5',         partners:'',blackout:'18/03/2026',sconto:9.00},
  {id:4,nome:'promozione 1',  periodoPromo:'28/11/2025 - 03/11/2025',periodoPrenot:'28/11/2025 - 30/11/2025',mercato:'Libero',segmento:'Dirette',struttura:'Hotel Catania',      partners:'',blackout:'30/11/2025',sconto:25.00},
  {id:5,nome:'super',         periodoPromo:'18/03/2026 - 31/03/2026',periodoPrenot:'18/03/2026 - 31/03/2026',mercato:'Libero',segmento:'B2C',    struttura:'Categoria 4',         partners:'',blackout:'31/03/2026',sconto:5.00},
]
const BLANK_FORM = {nome:'',periodoPromoFrom:'',periodoPromoTo:'',periodoPrenotFrom:'',periodoPrenotTo:'',mercato:'',segmento:'Dirette',struttura:'',partners:'',blackout:'',sconto:'0'}

// I campi data dei componenti form (DateRangeField/DatePickerField) lavorano in
// ISO yyyy-MM-dd; le promo memorizzano/visualizzano in dd/MM/yyyy. Conversioni:
const itToIso = (s?:string) => {
  const m = (s||'').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}
const isoToIt = (s?:string) => {
  const m = (s||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export default function MaggiorazioniPromozioni({ navigate }: { navigate: (p:string)=>void }) {
  const [editRow,     setEditRow]     = useState<any>(null)
  const [deleteId,    setDeleteId]    = useState<number|null>(null)
  const [promos,      setPromos]      = useState<Promo[]>(INIT_PROMOS)
  const [form,        setForm]        = useState(BLANK_FORM)

  // La form vive in testa alla pagina (create + edit inline, niente modale).
  const cancelEdit = () => { setEditRow(null); setForm(BLANK_FORM) }
  const openEdit = (p:Promo) => {
    setEditRow(p)
    const [ppf,ppt]=(p.periodoPrenot+'').split(' - '), [prf,prt]=(p.periodoPromo+'').split(' - ')
    setForm({nome:p.nome,periodoPromoFrom:itToIso(prf),periodoPromoTo:itToIso(prt),periodoPrenotFrom:itToIso(ppf),periodoPrenotTo:itToIso(ppt),mercato:p.mercato,segmento:p.segmento,struttura:p.struttura,partners:p.partners,blackout:itToIso(p.blackout),sconto:String(p.sconto)})
    if (typeof window!=='undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleSave = () => {
    if (!form.nome.trim()) return
    const pp=`${isoToIt(form.periodoPrenotFrom)} - ${isoToIt(form.periodoPrenotTo)}`, pr=`${isoToIt(form.periodoPromoFrom)} - ${isoToIt(form.periodoPromoTo)}`
    const bo=isoToIt(form.blackout)
    if (editRow) setPromos(prev=>prev.map(p=>p.id===editRow.id?{...p,nome:form.nome,periodoPromo:pr,periodoPrenot:pp,mercato:form.mercato,segmento:form.segmento,struttura:form.struttura,partners:form.partners,blackout:bo,sconto:parseFloat(form.sconto)||0}:p))
    else setPromos(prev=>[...prev,{id:Date.now(),nome:form.nome,periodoPromo:pr,periodoPrenot:pp,mercato:form.mercato,segmento:form.segmento,struttura:form.struttura,partners:form.partners,blackout:bo,sconto:parseFloat(form.sconto)||0}])
    setForm(BLANK_FORM); setEditRow(null)
  }
  const handleDelete    = (id:number) => setPromos(prev=>prev.filter(p=>p.id!==id))
  const handleDuplicate = (p:Promo)   => setPromos(prev=>[...prev,{...p,id:Date.now(),nome:p.nome+' (copia)'}])

  // ── Column filters (standard: funnel + popover multi-scelta) ────────────────
  type ColKey = keyof Promo | 'idx'
  const [colFilters, setColFilters] = useState<Record<string,string[]>>({})
  const [openFilter, setOpenFilter] = useState<string|null>(null)
  const toggleColFilter = (col:string, val:string) => setColFilters(prev=>{
    const cur = prev[col]||[]
    const next = cur.includes(val) ? cur.filter(v=>v!==val) : [...cur,val]
    return {...prev,[col]:next}
  })
  const setAllColFilter = (col:string, all:string[], select:boolean) =>
    setColFilters(prev=>({...prev,[col]:select?[...all]:[]}))
  const distinctVals = (key:string) =>
    Array.from(new Set(promos.map(p=>String((p as any)[key]||'')).filter(Boolean))).sort()

  // ── Paginazione (standard) ──────────────────────────────────────────────────
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)

  // ── Filtering pipeline (solo filtri colonna a imbuto) ───────────────────────
  const filtered = useMemo(()=>{
    let rows = [...promos]
    // Column filters (multi-scelta)
    Object.entries(colFilters).forEach(([col,vals])=>{
      if (!vals || !vals.length) return
      rows = rows.filter(p=>vals.includes(String((p as any)[col]||'')))
    })
    return rows
  },[promos,colFilters])

  const hasFilters = Object.values(colFilters).some(v=>v&&v.length)
  const resetFilters = () => { setColFilters({}) }

  // ── Pagina corrente sulle righe filtrate ────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(()=>{ setPage(1) }, [colFilters])
  useEffect(()=>{ if (page>totalPages) setPage(totalPages) }, [page,totalPages])
  const pageStart = (page-1)*PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart+PAGE_SIZE)

  return (
    <div>
      <BtnBack />
      <PageHeader title="Maggiorazioni e promozioni" subtitle="Aumenta la tua marginalità applicando maggiorazioni o promozioni mirate in tempo reale"/>

      {/* ── Form in testa: crea / modifica promozione (Image #36) ───────────── */}
      <div className="promo__top-form">
        <div className="promo__form-row">
          <InputField
            className="promo__f-nome"
            name="nome" label="Nome promozione" required
            placeholder="Nome della promozione"
            value={form.nome}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,nome:e.target.value}))}
          />
          <DateRangeField
            className="promo__f-periodo"
            nameFrom="periodoPrenotFrom" nameTo="periodoPrenotTo" label="Periodo di prenotabilità"
            valueFrom={form.periodoPrenotFrom} valueTo={form.periodoPrenotTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,periodoPrenotFrom:e.target.value}))}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,periodoPrenotTo:e.target.value}))}
          />
          <DateRangeField
            className="promo__f-periodo"
            nameFrom="periodoPromoFrom" nameTo="periodoPromoTo" label="Periodo di promozione"
            valueFrom={form.periodoPromoFrom} valueTo={form.periodoPromoTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,periodoPromoFrom:e.target.value}))}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,periodoPromoTo:e.target.value}))}
          />
          <SelectField
            className="promo__f-mercato"
            name="mercato" label="Mercato"
            value={form.mercato}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(v=>({...v,mercato:e.target.value}))}
            options={[{value:'',label:'Seleziona'}, ...['Libero','B2C','B2B','Corporate'].map(o => ({ value: o, label: o }))]}
          />
          <DatePickerField
            className="promo__f-blackout"
            name="blackout" label="Black-out Date"
            value={form.blackout}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,blackout:e.target.value}))}
          />
          <InputField
            className="promo__f-var"
            name="sconto" label="Variazioni" type="number" placeholder="%"
            value={form.sconto}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(v=>({...v,sconto:e.target.value}))}
          />
        </div>
        <div className="promo__top-form-actions">
          {editRow && (
            <button className="sib-btn sib-btn--secondary" onClick={cancelEdit}>Annulla</button>
          )}
          <button className="sib-btn sib-btn--primary" onClick={handleSave} disabled={!form.nome.trim()}>
            <i className={`fa-duotone ${editRow?'fa-floppy-disk':'fa-plus'} text-sm`} aria-hidden="true"/>
            {editRow ? 'Salva modifiche' : 'Aggiungi promozione'}
          </button>
        </div>
      </div>

      {/* Barra azioni tabella */}
      <div className="promo__table-actions">
        {hasFilters && (
          <button className="sib-btn sib-btn--toolbar" onClick={resetFilters}>
            <i className="fa-duotone fa-xmark text-[10px]" aria-hidden="true"/> Reset filtri
          </button>
        )}
        <span className="text-xs text-ink-muted whitespace-nowrap">{filtered.length} risultat{filtered.length===1?'o':'i'}</span>
      </div>

      {/* ── Table con filtri colonna a imbuto ─────────────────────── */}
      {(()=>{
        const cols:{label:string;key:ColKey;align?:'right'|'center';filterable?:boolean;w?:string}[] = [
          {label:'#',                       key:'idx',           w:'w-10'},
          {label:'Nome promozione',         key:'nome',          filterable:true},
          {label:'Periodo promozione',      key:'periodoPromo',  filterable:true},
          {label:'Periodo prenotabilità',   key:'periodoPrenot', filterable:true},
          {label:'Mercato',                 key:'mercato',       filterable:true},
          {label:'Segmento',                key:'segmento',      filterable:true},
          {label:'Struttura/Categoria',     key:'struttura',     filterable:true},
          {label:'Partners',                key:'partners',      filterable:true},
          {label:'Black-out Date',          key:'blackout',      filterable:true},
          {label:'Sconto %',                key:'sconto',        align:'right'},
          {label:'Azioni',                  key:'idx',           align:'center'},
        ]
        return (
          <div className="promo__table-wrap sib-table-wrap">
            <div className="promo__table-scroll">
              <table className="sib-table promo__table">
                <thead>
                  {/* Header: label + filtro colonna a imbuto */}
                  <tr className="promo__thead-row">
                    {cols.map((c,i)=>(
                      <th key={i}
                        className={`promo__th ${c.align==='right'?'promo__th--right':c.align==='center'?'promo__th--center':''} ${c.w||''}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span>{c.label}</span>
                          {c.filterable && (
                            <ColFilterHeader
                              options={distinctVals(c.key as string)}
                              selected={colFilters[c.key as string]||[]}
                              open={openFilter===c.key}
                              onToggleOpen={()=>setOpenFilter(openFilter===c.key?null:c.key as string)}
                              onToggle={(v)=>toggleColFilter(c.key as string, v)}
                              onSelectAll={(s)=>setAllColFilter(c.key as string, distinctVals(c.key as string), s)}
                            />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0 && (
                    <tr><td colSpan={cols.length} className="promo__td promo__td--empty">
                      <div className="flex flex-col items-center gap-2 py-6">
                        <i className="fa-duotone fa-filter-slash text-2xl text-ink-subtle" aria-hidden="true"/>
                        <span>Nessuna promozione trovata</span>
                      </div>
                    </td></tr>
                  )}
                  {pageRows.map((p,i) => (
                    <tr key={p.id} className="promo__row">
                      <td className="promo__td promo__td--num">{pageStart+i+1}</td>
                      <td className="promo__td promo__td--nome" title={p.nome}>{p.nome}</td>
                      <td className="promo__td" title={p.periodoPromo}>{p.periodoPromo}</td>
                      <td className="promo__td" title={p.periodoPrenot}>{p.periodoPrenot}</td>
                      <td className="promo__td">{p.mercato}</td>
                      <td className="promo__td">{p.segmento}</td>
                      <td className="promo__td" title={p.struttura}>{p.struttura}</td>
                      <td className="promo__td promo__td--muted" title={p.partners}>{p.partners||'—'}</td>
                      <td className="promo__td">{p.blackout||<span className="promo__td--muted">—</span>}</td>
                      <td className="promo__td promo__td--right">
                        <span className={`promo__sconto-badge ${p.sconto<0?'promo__sconto-badge--negative':p.sconto>0?'promo__sconto-badge--positive':''}`}>
                          {p.sconto>0?'+':''}{p.sconto.toFixed(2).replace('.',',')}
                        </span>
                      </td>
                      <td className="promo__td">
                        <div className="flex items-center justify-center gap-1">
                          <button className="sib-btn sib-btn--icon w-7 h-7" title="Duplica" onClick={()=>handleDuplicate(p)}>
                            <i className="fa-duotone fa-copy text-[13px]" aria-hidden="true"/>
                          </button>
                          <button className="sib-btn sib-btn--icon w-7 h-7" title="Modifica" onClick={()=>openEdit(p)}>
                            <i className="fa-duotone fa-pen text-[13px]" aria-hidden="true"/>
                          </button>
                          <button className="sib-btn sib-btn--icon w-7 h-7" title="Elimina" onClick={()=>setDeleteId(p.id)}>
                            <i className="fa-duotone fa-trash text-[13px]" aria-hidden="true"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="promo__pagination">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        )
      })()}

      {/* ── Delete modal ────────────────────────────────────────────── */}
      <Modal open={deleteId!==null} onClose={()=>setDeleteId(null)} size="sm">
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <i className="fa-duotone fa-trash text-xl text-primary" aria-hidden="true"/>
          </div>
          <h2 className="font-poppins text-[17px] font-bold text-primary mb-2">Elimina promozione</h2>
          <p className="text-[13px] text-ink mb-1">
            Sei sicuro di voler eliminare<br/>
            <strong className="text-primary">{promos.find(p=>p.id===deleteId)?.nome}</strong>?
          </p>
          <p className="text-[11px] text-ink-subtle mb-5">Questa azione non può essere annullata.</p>
          <div className="flex justify-center gap-2">
            <button className="sib-btn sib-btn--secondary" onClick={()=>setDeleteId(null)}>Annulla</button>
            <button className="sib-btn sib-btn--primary" onClick={()=>{if(deleteId!==null){handleDelete(deleteId);setDeleteId(null)}}}>
              <i className="fa-duotone fa-trash text-[13px]" aria-hidden="true"/> Elimina
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── COL FILTER HEADER (funnel + popover multi-scelta, standard piattaforma) ────
interface ColFilterHeaderProps {
  options: string[]
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader({ options, selected, open, onToggleOpen, onToggle, onSelectAll }: ColFilterHeaderProps) {
  const allSelected = options.length>0 && options.every(o=>selected.includes(o))
  const hasFilter = selected.length>0
  return (
    <div className="promo-colfilter">
      <button type="button" className={'promo-colfilter__btn'+(hasFilter?' promo-colfilter__btn--active':'')}
        onClick={(e)=>{ e.stopPropagation(); onToggleOpen() }} aria-label="Filtra colonna">
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="promo-colfilter__overlay" onClick={(e)=>{ e.stopPropagation(); onToggleOpen() }} />
          <div className="promo-colfilter__popup" onClick={(e)=>e.stopPropagation()}>
            <div className="promo-colfilter__title">scelte multiple</div>
            <label className="promo-colfilter__option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e)=>onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.length===0 && <div className="promo-colfilter__empty">Nessun valore</div>}
            {options.map(opt=>(
              <label key={opt} className="promo-colfilter__option">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={()=>onToggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
