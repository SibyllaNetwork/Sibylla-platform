import React, { useMemo, useState } from 'react'
import T from '../../../../core/tokens'
import { bookingStore } from '../../../../core/bookingStore'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Tabs from '../../../../core/components/Tabs'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import ToggleSwitch from '../../../../core/components/ToggleSwitch'
import { Button } from '../../../../core/components'
import FormActions from '../../../../core/components/FormActions'
import Widget from '../../../../core/components/Widget/Widget'
import { InputField, SelectField, DateRangeField, DatePickerField, TextareaField } from '../../../../core/components/form'
import { useWidgetLayout } from '../../../../core/hooks/useWidgetLayout'
import './NuovaPrenotazione.sass'

const TODAY        = new Date().toISOString().split('T')[0]
const NAZIONALITA  = ['ITALIA','FRANCIA','GERMANIA','SPAGNA','REGNO UNITO','STATI UNITI']
const ARRANGIAMENTI = ['RO','BB','HB','FB','AI']
const REPARTI      = ['Manutenzione','Pulizie','Reception','Cucina','SPA']
const PAGAMENTI    = ['Contanti','Carta di credito','Bonifico','Assegno']
const HOTELS       = ['Hotel Tudorial','Hotel Azzurro Mare']
const TIPI_CAMERA  = [
  { v: '53', l: '53 | Doppia classic' },
  { v: '54', l: '54 | Doppia superior' },
  { v: '55', l: '55 | Tripla' },
  { v: '56', l: '56 | Singola' },
]
const EXTRA_SERVIZI = [
  { id: 'transfer',   label: 'Transfer' },
  { id: 'petsitting', label: 'Pet sitting' },
  { id: 'escursione', label: 'Escursione' },
  { id: 'pulizie',    label: 'Pulizie extra' },
  { id: 'deposito',   label: 'Deposito bagagli' },
  { id: 'pranzo',     label: 'Pranzo al sacco' },
  { id: 'tolettatura',label: 'Tolettatura' },
]

interface CameraRow { tipo: string; adulti: number; ragazzi: number; bambini: number; infanti: number; nCamera: string }
interface CameraGruppoRow { tipo: string; persone: number; nCamera: string }
interface OspiteRow { nome: string; cognome: string; dataNascita: string; paese: string; sesso: string; nCamera: string; dataArrivo: string }
interface ExtraAggiunto { id: string; servizio: string; quando: string; quantita: number; intestatario: string; camera: string; importo: number; descrizione: string }
interface PrezzoRow { giorno: string; camera: string; arrangiamento: string; piani: string; promozioni: string; totale: number; listino: number }

const initRow = (n=''): CameraRow      => ({ tipo: '53', adulti: 2, ragazzi: 0, bambini: 0, infanti: 0, nCamera: n })
const initGr  = (n='', p=2): CameraGruppoRow => ({ tipo: '53', persone: p, nCamera: n })
const initOsp = (): OspiteRow          => ({ nome: '', cognome: '', dataNascita: '', paese: '', sesso: '', nCamera: '', dataArrivo: '' })

// ── Layout default per i due tab ───────────────────────────────────────────────
const LAYOUT_IND = [
  ['soggiorno','stato','agenzia','prezzi'],
  ['extra'],
  ['altre','note-reparto','anticipi'],
]
const LAYOUT_GR  = [
  ['soggiorno-gr','stato-gr','dati-gr'],
  ['extra'],
  ['altre','note-reparto','anticipi'],
]

export default function NuovaPrenotazione({ navigate }: { navigate: (p:string)=>void }) {
  const [activeTab, setActiveTab] = useState<'gruppo'|'individuale'>('individuale')

  const layoutInd = useMemo(() => LAYOUT_IND, [])
  const layoutGr  = useMemo(() => LAYOUT_GR,  [])

  const indLayout = useWidgetLayout('nuova-prenotazione.individuale', layoutInd)
  const grLayout  = useWidgetLayout('nuova-prenotazione.gruppo',      layoutGr)

  // ── State form ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    dal: TODAY, al: TODAY,
    camere: 1, persone: 1,
    confermata: true, opzione: false,
    scadenza: '', arrangiamento: 'BB',
    segmento: { b2b: true, dirette: false, b2c: false, corporate: false },
    agenzia: '', rifEsterno: '', cliente: '', email: '',
    nazionalita: 'ITALIA', notePrenotazione: '',
    reparto: 'Manutenzione', notaReparto: '',
    tipoAnticipo: 'caparra' as 'caparra' | 'acconto',
    metodoPagamento: 'Contanti', importoAnticipo: 0, ripartizioneAuto: false,
  })

  const [grForm, setGrForm] = useState({
    dal: TODAY, al: TODAY,
    camere: 4, persone: 10,
    tipologiaOspiti: 'adulti' as 'adulti' | 'studenti',
    hotel: HOTELS[0],
    confermata: true, opzione: false,
    scadenza: '', personeConf: 2, arrangiamento: 'RO',
    agenzia: '', nomeGruppo: '', nomeCapoGruppo: '', emailCapoGruppo: '',
    nazionalita: 'ITALIA', notePrenotazione: '',
    reparto: 'Manutenzione', notaReparto: '',
    tipoAnticipo: 'caparra' as 'caparra' | 'acconto',
    metodoPagamento: 'Contanti', importoAnticipo: 0, ripartizioneAuto: false,
  })

  const [camereInd, setCamereInd] = useState<CameraRow[]>([initRow('103')])
  const [camereGr,  setCamereGr]  = useState<CameraGruppoRow[]>([
    initGr('103', 2), initGr('103', 3), initGr('103', 0), initGr('103', 1),
  ])
  const [ospiti,    setOspiti]    = useState<OspiteRow[]>([initOsp(), initOsp(), initOsp(), initOsp()])

  const [extra,        setExtra]        = useState<ExtraAggiunto[]>([])
  const [extraOpenId,  setExtraOpenId]  = useState<string | null>(null)
  const [extraDraft,   setExtraDraft]   = useState<Omit<ExtraAggiunto,'id'>>({
    servizio: '', quando: TODAY, quantita: 1, intestatario: '', camera: '103', importo: 0, descrizione: '',
  })

  // ── Dettaglio prezzi (condiviso fra widget e modale "Modifica importo globale") ─
  const [prezzi, setPrezzi] = useState<PrezzoRow[]>([
    { giorno: TODAY, camera: 'Singola Classic', arrangiamento: '0,00 €', piani: '', promozioni: '', totale: 260.41, listino: 260.41 },
  ])

  // ── Stato modale "Modifica importo globale" ─────────────────────────────────
  const [importoModalOpen, setImportoModalOpen] = useState(false)
  const [modGlobalActive,  setModGlobalActive]  = useState(false)
  const [modGlobalMode,    setModGlobalMode]    = useState<'libero'|'percentuale'>('libero')
  const [modGlobalValue,   setModGlobalValue]   = useState<number>(260.41)
  const [editRowIdx,       setEditRowIdx]       = useState<number|null>(null)
  const [editRowValue,     setEditRowValue]     = useState<number>(0)

  // ── Totali ────────────────────────────────────────────────────────────────────
  const totaleSoggiorno = prezzi.reduce((a, r) => a + r.totale, 0)
  const totaleServizi   = extra.reduce((a, e) => a + e.importo * e.quantita, 0)
  const totale          = totaleSoggiorno + totaleServizi

  // ── Render helpers ───────────────────────────────────────────────────────────
  const setSegmento = (k: keyof typeof form.segmento) =>
    setForm(f => ({ ...f, segmento: { ...f.segmento, [k]: !f.segmento[k] } }))

  const updCamera = (i: number, p: Partial<CameraRow>) =>
    setCamereInd(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r))

  const updCameraGr = (i: number, p: Partial<CameraGruppoRow>) =>
    setCamereGr(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r))

  const updOspite = (i: number, p: Partial<OspiteRow>) =>
    setOspiti(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r))

  const openExtraDraft = (servizio: string) => {
    setExtraOpenId(servizio)
    setExtraDraft({ servizio, quando: form.dal, quantita: 1, intestatario: '', camera: '103', importo: 0, descrizione: '' })
  }

  const confirmExtra = () => {
    setExtra(prev => [...prev, { id: Date.now().toString(), ...extraDraft }])
    setExtraOpenId(null)
  }

  const startEditRow = (i: number) => {
    setEditRowIdx(i)
    setEditRowValue(prezzi[i].totale)
  }

  const confirmEditRow = () => {
    if (editRowIdx === null) return
    setPrezzi(prev => prev.map((r, idx) => idx === editRowIdx ? { ...r, totale: editRowValue } : r))
    setEditRowIdx(null)
  }

  const cancelEditRow = () => setEditRowIdx(null)

  const applyModGlobal = () => {
    setPrezzi(prev => prev.map(r => {
      if (modGlobalMode === 'libero')      return { ...r, totale: modGlobalValue }
      const pct = modGlobalValue / 100
      return { ...r, totale: +(r.listino * (1 + pct)).toFixed(2) }
    }))
    setModGlobalActive(false)
  }

  const resetModGlobal = () => {
    setPrezzi(prev => prev.map(r => ({ ...r, totale: r.listino })))
    setModGlobalActive(false)
  }

  // ── Widgets renderer ─────────────────────────────────────────────────────────
  const renderIndWidget = (id: string) => {
    const collapsed = indLayout.collapsed.has(id)
    const isOver    = indLayout.overId === id
    const common = {
      id, collapsed, isDragOver: isOver,
      onToggleCollapse: indLayout.toggleCollapse,
      onDragStart:      indLayout.handleDragStart,
      onDragOver:       indLayout.handleDragOver,
      onDrop:           indLayout.handleDrop,
      onDragEnd:        indLayout.handleDragEnd,
    }

    switch (id) {
      case 'soggiorno': return (
        <Widget key={id} {...common} title="Soggiorno">
          <div className="np-row">
            <DateRangeField
              nameFrom="dal" nameTo="al" label="Date"
              valueFrom={form.dal} valueTo={form.al}
              onChangeFrom={e=>setForm(f=>({...f,dal:e.target.value}))}
              onChangeTo={e=>setForm(f=>({...f,al:e.target.value}))}
            />
            <InputField name="camere" label="Camere" type="number" value={form.camere} onChange={e=>setForm(f=>({...f,camere:+e.target.value||0}))} className="np-w-num"/>
            <InputField name="persone" label="Persone" type="number" value={form.persone} onChange={e=>setForm(f=>({...f,persone:+e.target.value||0}))} className="np-w-num"/>
          </div>
          <table className="np-table">
            <thead>
              <tr>
                <th>#</th><th>Tipologia camera</th><th>Adulti</th><th>Ragazzi</th><th>Bambini</th><th>Infanti</th><th>N. Camera</th>
              </tr>
            </thead>
            <tbody>
              {camereInd.map((c, i) => (
                <tr key={i}>
                  <td>{i+1}</td>
                  <td>
                    <select className="sib-input np-cell-input" value={c.tipo} onChange={e=>updCamera(i,{tipo:e.target.value})}>
                      {TIPI_CAMERA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="sib-input np-cell-input np-cell-input--num" value={c.adulti}  onChange={e=>updCamera(i,{adulti:+e.target.value||0})}/></td>
                  <td><input type="number" className="sib-input np-cell-input np-cell-input--num" value={c.ragazzi} onChange={e=>updCamera(i,{ragazzi:+e.target.value||0})}/></td>
                  <td><input type="number" className="sib-input np-cell-input np-cell-input--num" value={c.bambini} onChange={e=>updCamera(i,{bambini:+e.target.value||0})}/></td>
                  <td><input type="number" className="sib-input np-cell-input np-cell-input--num" value={c.infanti} onChange={e=>updCamera(i,{infanti:+e.target.value||0})}/></td>
                  <td><input type="text"   className="sib-input np-cell-input np-cell-input--num" value={c.nCamera} onChange={e=>updCamera(i,{nCamera:e.target.value})}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="np-add-row" onClick={()=>setCamereInd(p=>[...p, initRow()])}>
            <i className="fa-light fa-plus" /> Aggiungi camera
          </button>
        </Widget>
      )

      case 'stato': return (
        <Widget key={id} {...common} title="Stato & classificazione">
          <span className="np-label">Stato</span>
          <div className="np-checks-row">
            <label className="np-check">
              <input type="checkbox" className="sib-checkbox" checked={form.confermata} onChange={e=>setForm(f=>({...f,confermata:e.target.checked}))}/>
              <span className="np-dot np-dot--ok" /> Confermata
            </label>
            <label className="np-check">
              <input type="checkbox" className="sib-checkbox" checked={form.opzione} onChange={e=>setForm(f=>({...f,opzione:e.target.checked}))}/>
              <span className="np-dot np-dot--ko" /> Opzione
            </label>
          </div>
          <div className="np-row">
            <DatePickerField name="scadenza" label="Scadenza" value={form.scadenza} onChange={e=>setForm(f=>({...f,scadenza:e.target.value}))}/>
            <SelectField name="arrangiamento" label="Arrangiamento" value={form.arrangiamento} onChange={e=>setForm(f=>({...f,arrangiamento:e.target.value}))} options={ARRANGIAMENTI.map(o=>({value:o,label:o}))}/>
          </div>
          <span className="np-label">Segmento di mercato</span>
          <div className="np-checks-row">
            {(Object.keys(form.segmento) as (keyof typeof form.segmento)[]).map(k=>(
              <label key={k} className="np-check">
                <input type="checkbox" className="sib-checkbox" checked={form.segmento[k]} onChange={()=>setSegmento(k)}/>
                <span className="np-cap">{k.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </Widget>
      )

      case 'agenzia': return (
        <Widget key={id} {...common} title="Agenzia & cliente">
          <div className="np-row">
            <InputField name="agenzia"    label="Agenzia"      value={form.agenzia}    onChange={e=>setForm(f=>({...f,agenzia:e.target.value}))}/>
            <InputField name="rifEsterno" label="Rif. esterno" value={form.rifEsterno} onChange={e=>setForm(f=>({...f,rifEsterno:e.target.value}))}/>
          </div>
          <div className="np-row">
            <InputField name="cliente" label="Cliente" value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))}/>
            <InputField name="email"   label="E-mail"  type="email" value={form.email}   onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
          </div>
        </Widget>
      )

      case 'prezzi': return (
        <Widget key={id} {...common} title="Dettaglio prezzi">
          <table className="np-table">
            <thead>
              <tr><th>Giorno</th><th>Camera</th><th>Arrangiamento</th><th>Piani</th><th>Promozioni</th><th>Totale</th></tr>
            </thead>
            <tbody>
              {prezzi.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.giorno).toLocaleDateString('it-IT')}</td>
                  <td>{r.camera}</td>
                  <td>{r.arrangiamento}</td>
                  <td>{r.piani}</td>
                  <td>{r.promozioni}</td>
                  <td className="np-amt">{r.totale.toFixed(2).replace('.',',')} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Widget>
      )

      case 'extra': return renderExtraInclusiWidget(common)
      case 'altre': return renderAltreInfoWidget(common, false)
      case 'note-reparto': return renderNoteRepartoWidget(common, false)
      case 'anticipi': return renderAnticipiWidget(common, false)
      default: return null
    }
  }

  const renderGrWidget = (id: string) => {
    const collapsed = grLayout.collapsed.has(id)
    const isOver    = grLayout.overId === id
    const common = {
      id, collapsed, isDragOver: isOver,
      onToggleCollapse: grLayout.toggleCollapse,
      onDragStart:      grLayout.handleDragStart,
      onDragOver:       grLayout.handleDragOver,
      onDrop:           grLayout.handleDrop,
      onDragEnd:        grLayout.handleDragEnd,
    }

    switch (id) {
      case 'soggiorno-gr': return (
        <Widget key={id} {...common} title="Soggiorno gruppo">
          <div className="np-row">
            <DateRangeField
              nameFrom="dal" nameTo="al" label="Date"
              valueFrom={grForm.dal} valueTo={grForm.al}
              onChangeFrom={e=>setGrForm(f=>({...f,dal:e.target.value}))}
              onChangeTo={e=>setGrForm(f=>({...f,al:e.target.value}))}
            />
            <InputField name="camere"  label="Camere"  type="number" value={grForm.camere}  onChange={e=>setGrForm(f=>({...f,camere:+e.target.value||0}))}  className="np-w-num"/>
            <InputField name="persone" label="Persone" type="number" value={grForm.persone} onChange={e=>setGrForm(f=>({...f,persone:+e.target.value||0}))} className="np-w-num"/>
          </div>
          <div className="np-row np-row--baseline">
            <div className="np-radio-block">
              <span className="np-label">Tipologia ospiti</span>
              <div className="np-checks-row">
                {(['adulti','studenti'] as const).map(t=>(
                  <label key={t} className="np-check">
                    <input type="radio" name="tipologiaOspiti" className="sib-radio" checked={grForm.tipologiaOspiti===t} onChange={()=>setGrForm(f=>({...f,tipologiaOspiti:t}))}/>
                    <span style={{textTransform:'capitalize'}}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-light fa-grid-2" /> Alloca</button>
            <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-light fa-user-plus" /> Assegna</button>
          </div>
          <div className="np-hotels-tabs">
            {HOTELS.map(h=>(
              <button key={h} type="button" className={`np-hotels-tab ${grForm.hotel===h?'np-hotels-tab--active':''}`} onClick={()=>setGrForm(f=>({...f,hotel:h}))}>{h}</button>
            ))}
          </div>
          <table className="np-table">
            <thead>
              <tr><th>#</th><th>Tipologia camera</th><th>Persone</th><th>N. Camera</th></tr>
            </thead>
            <tbody>
              {camereGr.map((c, i)=>(
                <tr key={i}>
                  <td><i className="fa-light fa-bed-front" /> {i+1}</td>
                  <td>
                    <select className="sib-input np-cell-input" value={c.tipo} onChange={e=>updCameraGr(i,{tipo:e.target.value})}>
                      {TIPI_CAMERA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="sib-input np-cell-input np-cell-input--num" value={c.persone} onChange={e=>updCameraGr(i,{persone:+e.target.value||0})}/></td>
                  <td><input type="text"   className="sib-input np-cell-input np-cell-input--num" value={c.nCamera} onChange={e=>updCameraGr(i,{nCamera:e.target.value})}/></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="np-add-row" onClick={()=>setCamereGr(p=>[...p, initGr()])}>
            <i className="fa-light fa-plus" /> Aggiungi camera
          </button>
        </Widget>
      )

      case 'stato-gr': return (
        <Widget key={id} {...common} title="Stato & opzioni">
          <span className="np-label">Stato</span>
          <div className="np-checks-row">
            <label className="np-check">
              <input type="checkbox" className="sib-checkbox" checked={grForm.confermata} onChange={e=>setGrForm(f=>({...f,confermata:e.target.checked}))}/>
              <span className="np-dot np-dot--ok" /> Confermata
            </label>
            <label className="np-check">
              <input type="checkbox" className="sib-checkbox" checked={grForm.opzione} onChange={e=>setGrForm(f=>({...f,opzione:e.target.checked}))}/>
              <span className="np-dot np-dot--ko" /> Opzione
            </label>
          </div>
          <div className="np-row">
            <DatePickerField name="scadenza" label="Scadenza" value={grForm.scadenza} onChange={e=>setGrForm(f=>({...f,scadenza:e.target.value}))}/>
            <InputField name="personeConf" label="Persone conf." type="number" value={grForm.personeConf} onChange={e=>setGrForm(f=>({...f,personeConf:+e.target.value||0}))} className="np-w-num"/>
            <SelectField name="arrangiamento" label="Arrangiamento" value={grForm.arrangiamento} onChange={e=>setGrForm(f=>({...f,arrangiamento:e.target.value}))} options={ARRANGIAMENTI.map(o=>({value:o,label:o}))}/>
          </div>
        </Widget>
      )

      case 'dati-gr': return (
        <Widget key={id} {...common} title="Dati gruppo">
          <InputField name="agenzia" label="Agenzia" value={grForm.agenzia} onChange={e=>setGrForm(f=>({...f,agenzia:e.target.value}))}/>
          <div className="np-row">
            <InputField name="nomeGruppo"     label="Nome gruppo"      value={grForm.nomeGruppo}     onChange={e=>setGrForm(f=>({...f,nomeGruppo:e.target.value}))}/>
            <InputField name="nomeCapoGruppo" label="Nome capo gruppo" value={grForm.nomeCapoGruppo} onChange={e=>setGrForm(f=>({...f,nomeCapoGruppo:e.target.value}))}/>
          </div>
          <InputField name="emailCapoGruppo" type="email" label="E-mail capo gruppo" value={grForm.emailCapoGruppo} onChange={e=>setGrForm(f=>({...f,emailCapoGruppo:e.target.value}))}/>
        </Widget>
      )

      case 'extra': return renderExtraInclusiWidget(common)
      case 'altre': return renderAltreInfoWidget(common, true)
      case 'note-reparto': return renderNoteRepartoWidget(common, true)
      case 'anticipi': return renderAnticipiWidget(common, true)
      default: return null
    }
  }

  function renderExtraInclusiWidget(common: any) {
    return (
      <Widget key="extra" {...common} title="Extra inclusi">
        <ul className="np-extra-list">
          {EXTRA_SERVIZI.map(s => (
            <li key={s.id}>
              <button type="button" className="np-extra-btn" onClick={()=>openExtraDraft(s.label)}>
                <i className="fa-light fa-circle-plus" /> {s.label}
              </button>
            </li>
          ))}
        </ul>

        {extraOpenId && (
          <div className="np-extra-popup">
            <div className="np-extra-popup-head">
              <span>Aggiungi: {extraDraft.servizio}</span>
              <button type="button" className="np-extra-popup-close" onClick={()=>setExtraOpenId(null)} aria-label="Chiudi"><i className="fa-light fa-xmark" /></button>
            </div>
            <div className="np-row">
              <DatePickerField name="quando" label="Quando" value={extraDraft.quando} onChange={e=>setExtraDraft(d=>({...d,quando:e.target.value}))}/>
              <InputField name="quantita" label="Quantità" type="number" value={extraDraft.quantita} onChange={e=>setExtraDraft(d=>({...d,quantita:+e.target.value||0}))} className="np-w-num"/>
            </div>
            <InputField name="intestatario" label="Intestatario" value={extraDraft.intestatario} onChange={e=>setExtraDraft(d=>({...d,intestatario:e.target.value}))}/>
            <div className="np-row">
              <SelectField name="camera" label="Camera" value={extraDraft.camera} onChange={e=>setExtraDraft(d=>({...d,camera:e.target.value}))} options={['103','104','105'].map(o=>({value:o,label:o}))}/>
              <InputField name="importo" label="Importo (€)" type="number" value={extraDraft.importo} onChange={e=>setExtraDraft(d=>({...d,importo:+e.target.value||0}))}/>
            </div>
            <TextareaField name="descrizione" label="Descrizione" value={extraDraft.descrizione} onChange={e=>setExtraDraft(d=>({...d,descrizione:e.target.value}))} rows={2} placeholder="Note opzionali"/>
            <div className="np-extra-popup-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={()=>setExtraOpenId(null)}>Indietro</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confirmExtra}><i className="fa-light fa-plus" /> Aggiungi</button>
            </div>
          </div>
        )}

        <div className="np-extra-total">
          <span>Totale servizi:</span>
          <strong>{totaleServizi.toFixed(2).replace('.',',')} €</strong>
        </div>
      </Widget>
    )
  }

  function renderAltreInfoWidget(common: any, isGr: boolean) {
    const f = isGr ? grForm : form
    const setF = isGr ? setGrForm : setForm
    return (
      <Widget key="altre" {...common} title="Altre informazioni">
        <SelectField name="nazionalita" label="Nazionalità" value={f.nazionalita} onChange={e=>setF((v:any)=>({...v,nazionalita:e.target.value}))} options={NAZIONALITA.map(o=>({value:o,label:o}))}/>
        <TextareaField name="notePrenotazione" label="Note prenotazione" value={f.notePrenotazione} onChange={e=>setF((v:any)=>({...v,notePrenotazione:e.target.value}))} rows={3}/>
      </Widget>
    )
  }

  function renderNoteRepartoWidget(common: any, isGr: boolean) {
    const f = isGr ? grForm : form
    const setF = isGr ? setGrForm : setForm
    return (
      <Widget key="note-reparto" {...common} title="Note di reparto">
        <SelectField name="reparto" label="Reparto" value={f.reparto} onChange={e=>setF((v:any)=>({...v,reparto:e.target.value}))} options={REPARTI.map(o=>({value:o,label:o}))}/>
        <TextareaField name="notaReparto" label="Nota" value={f.notaReparto} onChange={e=>setF((v:any)=>({...v,notaReparto:e.target.value}))} rows={3} placeholder="Inserisci una nota per il reparto selezionato"/>
      </Widget>
    )
  }

  function renderAnticipiWidget(common: any, isGr: boolean) {
    const f = isGr ? grForm : form
    const setF = isGr ? setGrForm : setForm
    return (
      <Widget key="anticipi" {...common} title="Anticipi">
        <span className="np-label">Tipo</span>
        <div className="np-checks-row">
          {(['caparra','acconto'] as const).map(t=>(
            <label key={t} className="np-check">
              <input type="radio" name={`tipoAnticipo-${isGr?'gr':'ind'}`} className="sib-radio" checked={f.tipoAnticipo===t} onChange={()=>setF((v:any)=>({...v,tipoAnticipo:t}))}/>
              <span style={{textTransform:'capitalize'}}>{t}</span>
            </label>
          ))}
        </div>
        <div className="np-row">
          <SelectField name="metodoPagamento" label="Metodo di pagamento" value={f.metodoPagamento} onChange={e=>setF((v:any)=>({...v,metodoPagamento:e.target.value}))} options={PAGAMENTI.map(o=>({value:o,label:o}))}/>
          <InputField name="importoAnticipo" label="Importo totale" type="number" value={f.importoAnticipo} onChange={e=>setF((v:any)=>({...v,importoAnticipo:+e.target.value||0}))}/>
        </div>
        <label className="np-check">
          <input type="checkbox" className="sib-checkbox" checked={f.ripartizioneAuto} onChange={e=>setF((v:any)=>({...v,ripartizioneAuto:e.target.checked}))}/>
          Ripartizione automatica
        </label>
      </Widget>
    )
  }

  // ── Save handler ─────────────────────────────────────────────────────────────
  const handleSalva = () => {
    if (activeTab === 'individuale') {
      const sd = new Date(form.dal), ed = new Date(form.al)
      bookingStore.pending = {
        id: Date.now(),
        nome: form.cliente || 'Nuova prenotazione',
        startDay: sd.getDate(), endDay: ed.getDate(),
        startMonth: sd.getMonth(), startYear: sd.getFullYear(),
        row: 0, colore: form.confermata ? T.successMid : T.error,
        camere: form.camere, persone: form.persone, importo: totale,
      }
    } else {
      const sd = new Date(grForm.dal), ed = new Date(grForm.al)
      bookingStore.pending = {
        id: Date.now(),
        nome: grForm.nomeGruppo || 'Gruppo',
        startDay: sd.getDate(), endDay: ed.getDate(),
        startMonth: sd.getMonth(), startYear: sd.getFullYear(),
        row: 0, colore: grForm.confermata ? T.successMid : T.blue,
        camere: grForm.camere, persone: grForm.persone, importo: totale,
      }
    }
    navigate('tableau-book')
  }

  const activeLayout = activeTab === 'individuale' ? indLayout : grLayout
  const renderWidget = activeTab === 'individuale' ? renderIndWidget : renderGrWidget

  return (
    <div className="np-page">
      <BtnBack onClick={() => navigate('tableau-book')} />
      <PageHeader title="Nuova prenotazione" subtitle="Compila i campi per inserire una nuova prenotazione nel sistema" />

      <div className="np-toolbar">
        <Tabs
          tabs={[{id:'gruppo',label:'Gruppo'},{id:'individuale',label:'Individuale'}]}
          active={activeTab}
          onChange={id=>setActiveTab(id as 'gruppo'|'individuale')}
        />
        <div className="np-toolbar-icons">
          <button type="button" className="np-icon-btn" aria-label="Modifica importo globale" onClick={()=>setImportoModalOpen(true)}><i className="fa-light fa-circle-info" /></button>
          <button type="button" className="np-icon-btn" aria-label="Foto"><i className="fa-light fa-camera" /></button>
          <button type="button" className="np-icon-btn" aria-label="Documento"><i className="fa-light fa-file-lines" /></button>
        </div>
      </div>

      <div className="np-columns">
        {activeLayout.layout.map((col, ci) => (
          <div
            key={ci}
            className="np-column"
            onDragOver={(e)=>{ e.preventDefault() }}
            onDrop={(e)=>activeLayout.handleColumnDrop(e, ci)}
          >
            {col.map(id => renderWidget(id))}
          </div>
        ))}
      </div>

      <Widget id="ospiti" title="Anagrafica ospiti" bodyClassName="widget__body--flush">
        <div className="np-ospiti-toolbar">
          <button type="button" className="np-link-add" onClick={()=>setOspiti(p=>[...p, initOsp()])}>
            <i className="fa-light fa-plus" /> Aggiungi ospite
          </button>
        </div>
        <table className="np-table np-table--full">
          <thead>
            <tr>
              <th>Nome</th><th>Cognome</th><th>Data di nascita</th><th>Paese di nascita</th><th>Sesso</th><th>N. Camera</th><th>Data di arrivo</th><th className="np-col-actions" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {ospiti.map((o, i)=>(
              <tr key={i}>
                <td><input type="text" className="sib-input np-cell-input" value={o.nome}        onChange={e=>updOspite(i,{nome:e.target.value})}/></td>
                <td><input type="text" className="sib-input np-cell-input" value={o.cognome}     onChange={e=>updOspite(i,{cognome:e.target.value})}/></td>
                <td><input type="date" className="sib-input np-cell-input" value={o.dataNascita} onChange={e=>updOspite(i,{dataNascita:e.target.value})}/></td>
                <td>
                  <select className="sib-input np-cell-input" value={o.paese} onChange={e=>updOspite(i,{paese:e.target.value})}>
                    <option value="">—</option>
                    {NAZIONALITA.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td>
                  <select className="sib-input np-cell-input" value={o.sesso} onChange={e=>updOspite(i,{sesso:e.target.value})}>
                    <option value="">—</option><option value="M">M</option><option value="F">F</option>
                  </select>
                </td>
                <td>
                  <select className="sib-input np-cell-input" value={o.nCamera} onChange={e=>updOspite(i,{nCamera:e.target.value})}>
                    <option value="">—</option><option value="103">103</option><option value="104">104</option>
                  </select>
                </td>
                <td><input type="date" className="sib-input np-cell-input" value={o.dataArrivo} onChange={e=>updOspite(i,{dataArrivo:e.target.value})}/></td>
                <td className="np-col-actions">
                  <button type="button" className="np-row-action" aria-label="Modifica" title="Modifica">
                    <i className="fa-light fa-pen-to-square" />
                  </button>
                  <button type="button" className="np-row-action np-row-action--danger" aria-label="Elimina" title="Elimina" onClick={()=>setOspiti(prev => prev.filter((_, idx) => idx !== i))}>
                    <i className="fa-light fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Widget>

      <footer className="np-footer">
        <div className="np-totals">
          <div className="np-total">
            <span className="np-total-label">Soggiorno</span>
            <span className="np-total-val">{totaleSoggiorno.toFixed(2).replace('.',',')} €</span>
          </div>
          <div className="np-total">
            <span className="np-total-label">Servizi</span>
            <span className="np-total-val">{totaleServizi.toFixed(2).replace('.',',')} €</span>
          </div>
          <div className="np-total np-total--strong">
            <span className="np-total-label">Totale</span>
            <span className="np-total-val">{totale.toFixed(2).replace('.',',')} €</span>
          </div>
        </div>
        <div className="np-footer-actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={()=>navigate('tableau-book')}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary"   onClick={handleSalva}>Salva</button>
        </div>
      </footer>

      <Modal open={importoModalOpen} onClose={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }} size="xl">
        <div className="modimp">
          <header className="modimp__head">
            <div className="modimp__head-text">
              <h2 className="modimp__title">Modifica importo globale</h2>
              <p className="modimp__subtitle">Sovrascrivi gli importi del soggiorno con un valore fisso o una variazione percentuale dal listino.</p>
            </div>
            <button className="modimp__close" onClick={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }} aria-label="Chiudi">
              <Ico n="x" s={18} c="currentColor" />
            </button>
          </header>

          <div className="modimp__body">
            <section className="modimp__section">
              <div className="modimp__toggle-row">
                <ToggleSwitch checked={modGlobalActive} onChange={setModGlobalActive} />
                <div className="modimp__toggle-label">
                  <span className="modimp__toggle-title">Applica modifica globale</span>
                  <span className="modimp__toggle-hint">Calcola in automatico tutti gli importi delle righe sottostanti.</span>
                </div>
              </div>

              {modGlobalActive && (
                <div className="modimp__panel">
                  <div className="modimp__panel-row">
                    <span className="modimp__panel-label">Modalità</span>
                    <div className="modimp__segmented">
                      <label className={`modimp__seg ${modGlobalMode==='libero'?'modimp__seg--on':''}`}>
                        <input type="radio" name="modGlobalMode" checked={modGlobalMode==='libero'} onChange={()=>setModGlobalMode('libero')} />
                        Importo libero
                      </label>
                      <label className={`modimp__seg ${modGlobalMode==='percentuale'?'modimp__seg--on':''}`}>
                        <input type="radio" name="modGlobalMode" checked={modGlobalMode==='percentuale'} onChange={()=>setModGlobalMode('percentuale')} />
                        Percentuale
                      </label>
                    </div>
                  </div>

                  <div className="modimp__panel-row">
                    <span className="modimp__panel-label">{modGlobalMode==='libero' ? 'Importo' : 'Variazione'}</span>
                    <div className="modimp__amount-wrap">
                      <input
                        type="number"
                        step="0.01"
                        className="sib-input modimp__amount"
                        value={modGlobalValue}
                        onChange={e=>setModGlobalValue(+e.target.value||0)}
                      />
                      <span className="modimp__amount-suffix">{modGlobalMode==='libero' ? '€' : '%'}</span>
                    </div>
                    <span className="modimp__listino">Listino: <strong>{prezzi[0]?.listino.toFixed(2).replace('.',',')} €</strong></span>
                  </div>

                  <div className="modimp__panel-actions">
                    <Button variant="secondary" size="sm" onClick={resetModGlobal}>Ripristina listino</Button>
                    <Button variant="primary"   size="sm" icon="check" onClick={applyModGlobal}>Applica a tutte le righe</Button>
                  </div>
                </div>
              )}
            </section>

            <section className="modimp__section">
              <header className="modimp__section-head">
                <h3 className="modimp__section-title">Dettaglio prezzi</h3>
                <span className="modimp__section-meta">{prezzi.length} righ{prezzi.length===1?'a':'e'}</span>
              </header>
              <div className="modimp__table-wrap">
                <table className="np-table">
                  <thead>
                    <tr>
                      <th>Giorno</th><th>Camera</th><th>Arrangiamento</th><th>Piani</th><th>Promozioni</th><th className="modimp__th-right">Totale</th><th className="np-col-actions" aria-label="Azioni" />
                    </tr>
                  </thead>
                  <tbody>
                    {prezzi.map((r, i) => (
                      <tr key={i} className={editRowIdx===i ? 'modimp__row--editing' : ''}>
                        <td>{new Date(r.giorno).toLocaleDateString('it-IT')}</td>
                        <td>{r.camera}</td>
                        <td>{r.arrangiamento}</td>
                        <td>{r.piani || '—'}</td>
                        <td>{r.promozioni || '—'}</td>
                        <td className="modimp__td-right">
                          {editRowIdx === i ? (
                            <div className="modimp__inline-edit">
                              <input
                                type="number"
                                step="0.01"
                                autoFocus
                                className="sib-input modimp__inline-input"
                                value={editRowValue}
                                onChange={e=>setEditRowValue(+e.target.value||0)}
                                onKeyDown={e=>{ if(e.key==='Enter') confirmEditRow(); if(e.key==='Escape') cancelEditRow() }}
                              />
                              <span className="modimp__amount-suffix">€</span>
                            </div>
                          ) : (
                            <span className="np-amt">{r.totale.toFixed(2).replace('.',',')} €</span>
                          )}
                        </td>
                        <td className="np-col-actions">
                          {editRowIdx === i ? (
                            <>
                              <button type="button" className="np-row-action np-row-action--ok" aria-label="Conferma" onClick={confirmEditRow}><i className="fa-light fa-check" /></button>
                              <button type="button" className="np-row-action" aria-label="Annulla" onClick={cancelEditRow}><i className="fa-light fa-xmark" /></button>
                            </>
                          ) : (
                            <button type="button" className="np-row-action" aria-label="Modifica" onClick={()=>startEditRow(i)}>
                              <i className="fa-light fa-pen-to-square" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modimp__totals-bar">
                <span className="modimp__totals-label">Totale soggiorno</span>
                <span className="modimp__totals-val">{totaleSoggiorno.toFixed(2).replace('.',',')} €</span>
              </div>
            </section>
          </div>

          <footer className="modimp__foot">
            <FormActions
              cancelLabel="Annulla"
              confirmLabel="Salva modifiche"
              onCancel={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }}
              onConfirm={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }}
            />
          </footer>
        </div>
      </Modal>
    </div>
  )
}
