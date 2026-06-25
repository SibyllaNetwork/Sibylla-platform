import React, { useState, useEffect } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import Modal from '../../../../core/components/Modal'
import AlertBanner from '../../../../core/components/AlertBanner'
import PageHeader from '../../../../core/components/PageHeader'
import './ModificaStrategia.sass'
import FormActions from '../../../../core/components/FormActions'
import { InputField, SelectField } from '../../../../core/components/form'

const ROWS   = [{top:'200 %',bot:'100 %'},{top:'99 %',bot:'96 %'},{top:'95 %',bot:'91 %'},{top:'90 %',bot:'86 %'},{top:'85 %',bot:'81 %'},{top:'80 %',bot:'76 %'},{top:'75 %',bot:'0 %'}]
const COLS   = ['0 – 7 Giorni','8 – 21 Giorni','22 – 45 Giorni','46 – 90 Giorni','91 – 365 Giorni']
const BARS   = ['BAR 1','BAR 2','BAR 3','BAR 4','BAR 5','BAR 6','BAR 7','BAR 8','BAR 9','BAR 10']
const COLORS = [{val:'#204769',label:'Navy'},{val:'#5C9CD4',label:'Blu'},{val:'#E07B39',label:'Arancio'},{val:'#5A8A3C',label:'Verde'},{val:'#C4A820',label:'Oro'},{val:'#9B59B6',label:'Viola'},{val:'#E74C3C',label:'Rosso'},{val:'#1ABC9C',label:'Teal'}]
const GUIDA_ROWS = ['999 %','200 %','99 %','95 %','90 %','85 %','80 %','70 %','60 %','45 %','30 %']
const GUIDA_COLS = ['0 – 7','8 – 21','22 – 45','46 – 90','91 – 365','366 – 999']

type Strat = { id:number; nome:string; tipo:string; colore:string; bars:string[][] }
const fill     = (v:string) => ROWS.map(() => COLS.map(() => v))
const gradient = (offset:number) => ROWS.map((_, ri) => COLS.map((_, ci) => BARS[Math.min(ri+ci+offset, BARS.length-1)]))

const STRATEGIES: Strat[] = [
  {id:1, nome:'Strategia Estate 2026',    tipo:'Individuali', colore:'#5C9CD4', bars:fill('BAR 3')},
  {id:2, nome:'Strategia Bassa Stagione', tipo:'Individuali', colore:'#E07B39', bars:gradient(0)},
  {id:3, nome:'Strategia Alta Stagione',  tipo:'Individuali', colore:'#9B59B6', bars:gradient(2)},
  {id:4, nome:'Strategia Gruppi Premium', tipo:'Gruppi',      colore:'#5A8A3C', bars:fill('BAR 2')},
  {id:5, nome:'Strategia Gruppi Standard',tipo:'Gruppi',      colore:'#C4A820', bars:gradient(1)},
  {id:6, nome:'Strategia Mista',          tipo:'Mista',       colore:'#E74C3C', bars:fill('BAR 5')},
]

const tipoIcon = (tipo:string) => tipo === 'Gruppi' ? 'org' : tipo === 'Mista' ? 'wheel' : 'profile'

export default function ModificaStrategia({ navigate }: { navigate: (p:string) => void }) {
  const [selectedId,      setSelectedId]      = useState(1)
  const [categoria,       setCategoria]       = useState('-')
  const [struttura,       setStruttura]       = useState('Hotel Noto')
  const [tipoFilter,      setTipoFilter]      = useState('Tutti')
  const [coloreFilter,    setColoreFilter]    = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [showGuida,       setShowGuida]       = useState(false)
  const [tipoStagione,    setTipoStagione]    = useState('Low Season')
  const [cifraDiBase,     setCifraDiBase]     = useState('')
  const [guidaVals,       setGuidaVals]       = useState<number[][]>(() => GUIDA_ROWS.map(() => GUIDA_COLS.map(() => 0)))

  const current = STRATEGIES.find(s => s.id === selectedId) || STRATEGIES[0]
  const [bars,     setBars]     = useState<string[][]>(() => current.bars.map(r => [...r]))
  const [nomeEdit, setNomeEdit] = useState(current.nome)

  useEffect(() => {
    const s = STRATEGIES.find(st => st.id === selectedId)
    if (s) { setNomeEdit(s.nome); setBars(s.bars.map(r => [...r])) }
  }, [selectedId])

  const loadStrat    = (s:Strat)          => { setSelectedId(s.id); setNomeEdit(s.nome); setBars(s.bars.map(r => [...r])) }
  const setCell      = (r:number, c:number, v:string) => setBars(prev => prev.map((row,ri) => row.map((cell,ci) => ri===r&&ci===c ? v : cell)))
  const setGuidaCell = (r:number, c:number, v:number) => setGuidaVals(prev => prev.map((row,ri) => row.map((cell,ci) => ri===r&&ci===c ? v : cell)))
  const handleSave   = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  const handleInvia  = () => {
    if (!cifraDiBase) return
    const base = parseFloat(cifraDiBase) || 0
    setGuidaVals(GUIDA_ROWS.map((_, ri) => GUIDA_COLS.map((_, ci) => Math.round(base * Math.max(1-ri*0.06, 0.3) * Math.max(1-ci*0.04, 0.7)))))
  }

  const visible = STRATEGIES.filter(s => (tipoFilter === 'Tutti' || s.tipo === tipoFilter) && (!coloreFilter || s.colore === coloreFilter))

  return (
    <div>
      <BtnBack />
      <PageHeader title="Modifica strategia" subtitle="Seleziona una strategia esistente per tipo e colore, quindi modifica i parametri tariffari"/>
      {saved && <AlertBanner type="success">Strategia aggiornata con successo</AlertBanner>}

      {/* ── Selettore strategie ─────────────────────────────────────────── */}
      <div className="strat__selector-wrap">
        {/* Filter header */}
        <div className="strat__selector-filter-row">
          <span className="strat__filter-title">Filtra strategie</span>
          <div className="strat__filter-item">
            <SelectField
              name="tipoFilter"
              label="Tipo"
              value={tipoFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTipoFilter(e.target.value)}
              options={['Tutti','Individuali','Gruppi','Mista'].map(o => ({ value: o, label: o }))}
            />
          </div>
          <div className="strat__filter-item strat__filter-item--relative">
            <span className="text-[12px] font-semibold font-poppins text-primary strat__form-label--inline">Colore</span>
            <button
              className={`strategia__color-btn ${showColorPicker?'strategia__color-btn--open':''} ${coloreFilter?'strategia__color-btn--selected':''}`}
              onClick={() => setShowColorPicker(v => !v)}>
              {coloreFilter
                ? <><div className="strategia__color-swatch strategia__color-swatch--dyn" style={{ '--swatch-color': coloreFilter } as React.CSSProperties}/>{COLORS.find(c => c.val === coloreFilter)?.label}</>
                : 'Tutti i colori'}
              <Ico n="chevd" s={9} c={T.textDisabled}/>
            </button>
            {coloreFilter && (
              <button className="sib-btn sib-btn--icon strat__clear-color-btn" onClick={() => setColoreFilter('')}>
                <Ico n="x" s={12} c={T.textDisabled}/>
              </button>
            )}
            {showColorPicker && (
              <div className="strategia__color-picker strat__color-picker-grid">
                {COLORS.map(c => (
                  <button key={c.val}
                    className={`strategia__color-option strategia__color-option--dyn ${coloreFilter === c.val ? 'strategia__color-option--active' : ''}`}
                    style={{ '--option-color': c.val } as React.CSSProperties} title={c.label}
                    onClick={() => { setColoreFilter(c.val); setShowColorPicker(false) }}/>
                ))}
              </div>
            )}
          </div>
          <span className="strat__filter-count">
            {visible.length} strateg{visible.length === 1 ? 'ia' : 'ie'} trovate
          </span>
        </div>

        {/* Strategy cards */}
        <div className="strat__cards-row">
          {visible.length === 0
            ? <div className="strat__cards-empty">Nessuna strategia corrisponde ai filtri selezionati.</div>
            : visible.map(s => {
              const isSel = s.id === selectedId
              return (
                <button key={s.id} onClick={() => loadStrat(s)}
                  className={`strat__card-btn strat__card-btn--dyn ${isSel ? 'strat__card-btn--selected' : ''}`}
                  style={{
                    '--strat-color': s.colore,
                    '--strat-border': isSel ? s.colore : T.border,
                    '--strat-bg': isSel ? `${s.colore}12` : T.bg,
                    '--strat-name-color': isSel ? s.colore : T.textActive,
                  } as React.CSSProperties}>
                  <div className="strat__card-ico strat__card-ico--dyn">
                    <Ico n={tipoIcon(s.tipo)} s={16} c="#fff"/>
                  </div>
                  <div>
                    <div className="strat__card-name strat__card-name--dyn">{s.nome}</div>
                    <div className="strat__card-tipo">{s.tipo}</div>
                  </div>
                  {isSel && <div className="strat__card-check"><Ico n="check" s={14} c={s.colore}/></div>}
                </button>
              )
            })
          }
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="strategia__filters">
        <div className="strategia__filter-row">
          <div className="strategia__filter-group">
            <div>
              <SelectField
                name="categoria"
                label="Categoria"
                value={categoria}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoria(e.target.value)}
                options={['-','Standard','Premium','Economy'].map(o => ({ value: o, label: o }))}
                className="strat__select--cat"
              />
            </div>
            <div>
              <SelectField
                name="struttura"
                label="Struttura"
                value={struttura}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
                options={['Hotel Noto','Grand Hotel Roma','Villa Bellini','Terrazza sul Mare'].map(o => ({ value: o, label: o }))}
                className="strat__select--struttura"
              />
            </div>
            <div>
              <div className="strat__nome-row">
                <div className="strat__nome-dot strat__nome-dot--dyn" style={{ '--dot-color': current.colore } as React.CSSProperties}/>
                <InputField
                  name="nomeEdit"
                  value={nomeEdit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNomeEdit(e.target.value)}
                  className="strat__nome-input"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold font-poppins text-primary">Tipo strategia</label>
              <div className="strat__tipo-display">{current.tipo}</div>
            </div>
            <div>
              <label className="text-[12px] font-semibold font-poppins text-primary">Colore strategia</label>
              <div className="strat__colore-display strat__colore-display--dyn" style={{ '--display-border': `${current.colore}44`, '--display-bg': `${current.colore}10` } as React.CSSProperties}>
                <div className="strat__nome-dot strat__nome-dot--dyn" style={{ '--dot-color': current.colore } as React.CSSProperties}/>
                {COLORS.find(c => c.val === current.colore)?.label || current.colore}
              </div>
            </div>
          </div>
          <div className="strategia__filter-actions">
            <button className="sib-btn sib-btn--toolbar" onClick={() => setShowGuida(true)}>
              <Ico n="wheel" s={13} c="currentColor"/> Guida assistita smart
            </button>
            <button className="sib-btn sib-btn--toolbar">
              <Ico n="edit" s={13} c="currentColor"/> Copia strategia
            </button>
            <button className="sib-btn sib-btn--primary" onClick={handleSave}>
              <Ico n="check" s={13} c="#fff"/> Salva
            </button>
          </div>
        </div>
      </div>

      {/* ── Matrix ──────────────────────────────────────────────────────── */}
      <div className="strategia__matrix-wrap strategia__matrix-wrap--dyn" style={{ '--strat-color': current.colore } as React.CSSProperties}>
        <div className="strategia__matrix-scroll">
          <table className="strategia__matrix-table">
            <colgroup>
              <col className="strat__matrix-col--ico"/>
              <col className="strat__matrix-col--range"/>
              {COLS.map((_,i) => <col key={i}/>)}
            </colgroup>
            <thead>
              <tr>
                <th colSpan={2} className="strat__matrix-th-empty"/>
                {COLS.map((col,i) => (
                  <th key={i} className={`strategia__matrix-th ${i === COLS.length-1 ? 'strategia__matrix-th--last' : ''}`}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((range, ri) => (
                <tr key={ri}>
                  {ri === 0 && (
                    <td rowSpan={ROWS.length} className="strat__vertical-label-cell">
                      <div className="strat__vertical-label-inner">
                        <div className="strat__vertical-text">Strategia {current.tipo.toLowerCase()}</div>
                        <Ico n={tipoIcon(current.tipo)} s={18} c={`${T.primary}99`}/>
                      </div>
                    </td>
                  )}
                  <td className={`strat__range-cell strat__range-cell--dyn ${ri === ROWS.length-1 ? 'strat__range-cell--last' : ''}`} style={{ '--strat-color': current.colore } as React.CSSProperties}>
                    <div className="strat__range-top">{range.top}</div>
                    <div className="strat__range-arrow-wrap">
                      <i className="fa-duotone fa-arrows-up-down strat__range-arrow" aria-hidden="true"/>
                    </div>
                    <div className="strat__range-bot">{range.bot}</div>
                  </td>
                  {COLS.map((_,ci) => {
                    const filled = !!bars[ri]?.[ci]
                    return (
                    <td key={ci}
                      className={`strategia__bar-cell strategia__bar-cell--dyn ${filled ? 'strategia__bar-cell--filled' : ''} ${ci === COLS.length-1 ? 'strategia__bar-cell--last-col' : ''} ${ri === ROWS.length-1 ? 'strategia__bar-cell--last-row' : ''}`}
                      style={{ '--bar-bg': `${current.colore}0A` } as React.CSSProperties}>
                      <select value={bars[ri]?.[ci] || ''} onChange={e => setCell(ri, ci, e.target.value)}
                        className={`sib-select w-full strategia__bar-select ${filled ? 'strategia__bar-select--filled' : ''}`}
                        style={{ '--strat-color': current.colore, '--strat-border-soft': `${current.colore}66` } as React.CSSProperties}>
                        <option value="">Seleziona Bar</option>
                        {BARS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </td>
                  )})}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormActions onCancel={() => navigate('home')} onConfirm={handleSave} confirmLabel="Salva modifiche"/>

      {/* ── Modal Guida ─────────────────────────────────────────────────── */}
      <Modal open={showGuida} onClose={() => setShowGuida(false)} size="xl">
        <div className="strat__modal-header">
          <div>
            <h2 className="strat__modal-title">Guida assistita smart</h2>
            <p className="strat__modal-subtitle">Configurazione agile e guidata per pricing dinamico.</p>
          </div>
          <button className="sib-btn sib-btn--icon" onClick={() => setShowGuida(false)}>
            <Ico n="x" s={18} c="currentColor"/>
          </button>
        </div>
        <div className="strategia__guida-config">
          <SelectField
            name="tipoStagione"
            label="Tipo stagione"
            value={tipoStagione}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTipoStagione(e.target.value)}
            options={['Low Season','Mid Season','High Season','Peak Season'].map(s => ({ value: s, label: s }))}
            className="strat__select--stagione"
          />
          <div className="strat__guida-base-wrap">
            <InputField
              name="cifraDiBase"
              label="Cifra di base"
              type="number"
              placeholder="Inserisci cifra di base"
              value={cifraDiBase}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCifraDiBase(e.target.value)}
            />
          </div>
          <button className="sib-btn sib-btn--primary" onClick={handleInvia}>Invia</button>
        </div>
        <div className="strategia__guida-table-wrap">
          <div className="strategia__guida-table-head">Intervalli temporali</div>
          <div className="strat__guida-scroll">
            <table className="strategia__guida-table">
              <thead>
                <tr className="strat__guida-thead-row">
                  <th className="strategia__guida-th strategia__guida-th--occ">Occupazione</th>
                  {GUIDA_COLS.map((col,i) => <th key={i} className="strategia__guida-th strategia__guida-th--val">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {GUIDA_ROWS.map((occ,ri) => {
                  const lastRow = ri === GUIDA_ROWS.length-1
                  return (
                  <tr key={ri} className="strategia__guida-row">
                    <td className={`strategia__guida-td-occ ${lastRow ? 'strategia__guida-td-occ--last' : ''}`}>{occ}</td>
                    {GUIDA_COLS.map((_,ci) => (
                      <td key={ci} className={`strategia__guida-td ${lastRow ? 'strategia__guida-td--last' : ''}`}>
                        <input type="number"
                          className={`sib-input sib-input--dense strategia__guida-input ${guidaVals[ri][ci] > 0 ? 'strategia__guida-input--filled' : ''}`}
                          value={guidaVals[ri][ci]} onChange={e => setGuidaCell(ri, ci, parseFloat(e.target.value)||0)}
                          />
                      </td>
                    ))}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
        <FormActions onCancel={() => setShowGuida(false)} onConfirm={() => setShowGuida(false)} cancelLabel="Chiudi"/>
      </Modal>
    </div>
  )
}
