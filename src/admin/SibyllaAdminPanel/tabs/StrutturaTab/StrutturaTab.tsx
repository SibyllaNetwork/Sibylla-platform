import React from 'react'
import type { Cliente, TipologiaCategoria } from '../../types'
import { CATEGORIE_STRUTTURA, LINGUA_OPTIONS, VALUTA_OPTIONS } from '../../constants'
import './StrutturaTab.sass'

interface Props {
  form: Cliente
  setForm: (k: keyof Cliente, v: any) => void
  onSave: () => void
}

export default function StrutturaTab({ form, setForm, onSave }: Props) {
  const cat = CATEGORIE_STRUTTURA.find(c => c.id === form.categoria) || CATEGORIE_STRUTTURA[0]
  const showClassificazione = cat.classificazioni.length > 0
  const showCamere = cat.hasCamere

  const handleCategoria = (v: TipologiaCategoria) => {
    const next = CATEGORIE_STRUTTURA.find(c => c.id === v)
    setForm('categoria', v)
    // se la classificazione attuale non è valida per la nuova categoria, la resetto
    if (next && next.classificazioni.length > 0 && !next.classificazioni.includes(form.classificazione)) {
      setForm('classificazione', '')
    }
    if (next && next.classificazioni.length === 0) setForm('classificazione', '')
    if (next && !next.hasCamere) setForm('camere', 0)
  }

  return (
    <div className="strutt-tab">
      <div className="strutt-tab__grid">
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Nome struttura *</label>
          <input value={form.nome || ''} onChange={e => setForm('nome', e.target.value)} className="sib-input" />
        </div>
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Tipologia *</label>
          <select
            value={form.categoria}
            onChange={e => handleCategoria(e.target.value as TipologiaCategoria)}
            className="sib-select"
          >
            {CATEGORIE_STRUTTURA.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {showClassificazione && (
        <div className="strutt-tab__grid">
          <div className="strutt-tab__field">
            <label className="strutt-tab__label">Classificazione</label>
            <select
              value={form.classificazione}
              onChange={e => setForm('classificazione', e.target.value)}
              className="sib-select"
            >
              <option value="">Nessuna / non applicabile</option>
              {cat.classificazioni.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="strutt-tab__field" />
        </div>
      )}

      <div className="strutt-tab__grid">
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Città</label>
          <input value={form.citta || ''} onChange={e => setForm('citta', e.target.value)} className="sib-input" />
        </div>
        {showCamere ? (
          <div className="strutt-tab__field">
            <label className="strutt-tab__label">N° camere / unità</label>
            <input
              type="number"
              value={form.camere || ''}
              onChange={e => setForm('camere', parseInt(e.target.value) || 0)}
              className="sib-input"
            />
          </div>
        ) : <div className="strutt-tab__field" />}
      </div>

      <div className="strutt-tab__grid">
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Email</label>
          <input value={form.email || ''} onChange={e => setForm('email', e.target.value)} className="sib-input" />
        </div>
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Telefono</label>
          <input value={form.tel || ''} onChange={e => setForm('tel', e.target.value)} className="sib-input" />
        </div>
      </div>
      <div className="strutt-tab__grid">
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Lingua</label>
          <select value={form.lingua || 'Italiano'} onChange={e => setForm('lingua', e.target.value)} className="sib-select">
            {LINGUA_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="strutt-tab__field">
          <label className="strutt-tab__label">Valuta</label>
          <select value={form.valuta || 'EUR'} onChange={e => setForm('valuta', e.target.value)} className="sib-select">
            {VALUTA_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="strutt-tab__radio-group">
        <label className="strutt-tab__label">Stato account</label>
        <div className="strutt-tab__radios">
          {(['attivo', 'sospeso'] as const).map(s => {
            const cls = `strutt-tab__radio${form.stato === s ? ' strutt-tab__radio--active' : ''}`
            return (
              <label key={s} className={cls}>
                <input
                  type="radio"
                  checked={form.stato === s}
                  onChange={() => setForm('stato', s)}
                  className="sib-radio"
                />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            )
          })}
        </div>
      </div>

      <button className="sib-btn sib-btn--primary strutt-tab__save" onClick={onSave}>
        Salva struttura
      </button>
    </div>
  )
}
