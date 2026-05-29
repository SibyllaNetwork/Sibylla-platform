import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { Icon } from '../_shared/Icon'
import { useCartStore } from '../../../store/useCartStore'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import {
  MERCATI_SERVIZI,
  type Servizio,
  type MercatoServizio,
  type FormFieldSpec,
} from './servizi-types'
import './PrenotaServizioModal.sass'

interface Props {
  open: boolean
  servizio: Servizio | null
  listino: MercatoServizio
  adultiPref: number
  bambiniPref: number
  onClose: () => void
}

const prezzoPerListino = (s: Servizio, m: MercatoServizio): number => {
  switch (m) {
    case 'agora': return s.prezzoAgora
    case 'b2b':   return s.prezzoB2B
    case 'b2c':   return s.prezzoB2C
  }
}

const moltiplicatoreLabel = (mode: Servizio['pricingMode']): string => {
  switch (mode) {
    case 'per-persona': return 'persone'
    case 'per-gruppo':  return 'gruppi'
    case 'per-giorno':  return 'giorni'
    case 'per-ora':     return 'ore'
  }
}

export default function PrenotaServizioModal({
  open, servizio, listino, adultiPref, bambiniPref, onClose,
}: Props) {
  const addService = useCartStore(s => s.addService)
  const tipoMeta   = useTipiServizioStore(s => s.meta)

  const [values, setValues] = useState<Record<string, string>>({})
  const [moltiplicatore, setMoltiplicatore] = useState<number>(1)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (servizio && open) {
      const init: Record<string, string> = {}
      const meta = tipoMeta(servizio.tipo)
      meta.formFields.forEach(f => {
        if (f.name === 'adulti')       init.adulti  = String(Math.max(1, adultiPref))
        else if (f.name === 'bambini') init.bambini = String(bambiniPref)
        else if (f.kind === 'select')  init[f.name] = (f.options && f.options[0]) || ''
        else                            init[f.name] = ''
      })
      setValues(init)
      // Default del moltiplicatore in base alla pricing mode
      switch (servizio.pricingMode) {
        case 'per-persona': setMoltiplicatore(Math.max(1, adultiPref + bambiniPref)); break
        case 'per-gruppo':  setMoltiplicatore(1); break
        case 'per-giorno':  setMoltiplicatore(1); break
        case 'per-ora':     setMoltiplicatore(2); break
      }
      setError('')
    }
  }, [servizio, open, adultiPref, bambiniPref])

  const meta = useMemo(() => servizio ? tipoMeta(servizio.tipo) : null, [servizio])

  if (!servizio || !meta) return null

  const prezzoUnit = prezzoPerListino(servizio, listino)
  const totale     = prezzoUnit * moltiplicatore

  const setVal = (name: string, v: string) => setValues(curr => ({ ...curr, [name]: v }))

  // Aggiorna automaticamente il moltiplicatore se cambia adulti/bambini in modalità per-persona
  const onPartecipantiChange = (name: 'adulti' | 'bambini', v: string) => {
    setVal(name, v)
    if (servizio.pricingMode === 'per-persona') {
      const a = parseInt(name === 'adulti' ? v : (values.adulti  || '0'), 10) || 0
      const b = parseInt(name === 'bambini' ? v : (values.bambini || '0'), 10) || 0
      setMoltiplicatore(Math.max(1, a + b))
    }
  }

  const validate = (): string => {
    for (const f of meta.formFields) {
      if (f.required && !(values[f.name] || '').trim()) {
        return `Compila il campo "${f.label}"`
      }
    }
    if (servizio.pricingMode === 'per-persona') {
      const a = parseInt(values.adulti  || '0', 10) || 0
      const b = parseInt(values.bambini || '0', 10) || 0
      if (a > servizio.adultiMax)  return `Massimo ${servizio.adultiMax} adulti per questo servizio`
      if (b > servizio.bambiniMax) return `Massimo ${servizio.bambiniMax} bambini per questo servizio`
    }
    if (moltiplicatore <= 0) return 'Quantità non valida'
    return ''
  }

  const handleConfirm = () => {
    const err = validate()
    if (err) { setError(err); return }
    // Cart line id include i parametri di prenotazione: due prenotazioni con
    // date diverse generano due righe separate; identiche si sommano.
    const signature = Object.entries(values).map(([k, v]) => `${k}=${v}`).join('|')
    const lineId = `${servizio.id}::${listino}::${signature}`
    addService({
      id: lineId,
      servizioId: servizio.id,
      tipo: servizio.tipo,
      nome: servizio.nome,
      citta: servizio.citta,
      immagineUrl: servizio.immagineUrl,
      prezzoUnitario: prezzoUnit,
      mercato: listino,
      durata: servizio.durata,
      quantita: moltiplicatore,
      unitaPrezzo: moltiplicatoreLabel(servizio.pricingMode),
      prenotazione: values,
    })
    onClose()
  }

  const renderField = (f: FormFieldSpec) => {
    const v = values[f.name] || ''
    const common = {
      id: `prn-field-${f.name}`,
      className: 'sib-input prn-modal__input',
    }
    if (f.kind === 'date') {
      return (
        <input
          {...common}
          type="date"
          value={v}
          min={servizio.disponibileDal}
          max={servizio.disponibileAl}
          onChange={(e) => setVal(f.name, e.target.value)}
        />
      )
    }
    if (f.kind === 'time') {
      return (
        <input
          {...common}
          type="time"
          value={v}
          onChange={(e) => setVal(f.name, e.target.value)}
        />
      )
    }
    if (f.kind === 'number') {
      const isPartecipante = f.name === 'adulti' || f.name === 'bambini'
      return (
        <input
          {...common}
          type="number"
          value={v}
          min={f.min ?? 0}
          max={f.max ?? 999}
          onChange={(e) => isPartecipante
            ? onPartecipantiChange(f.name as 'adulti' | 'bambini', e.target.value)
            : setVal(f.name, e.target.value)
          }
        />
      )
    }
    if (f.kind === 'select') {
      return (
        <select
          {...common}
          className="sib-select prn-modal__input"
          value={v}
          onChange={(e) => setVal(f.name, e.target.value)}
        >
          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    return (
      <input
        {...common}
        type="text"
        value={v}
        placeholder={f.placeholder || ''}
        onChange={(e) => setVal(f.name, e.target.value)}
      />
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={`Prenota — ${servizio.nome}`} size="lg">
      <div className="prn-modal">
        <div className="prn-modal__head">
          <img src={servizio.immagineUrl} alt={servizio.nome} className="prn-modal__img" />
          <div className="prn-modal__head-info">
            <span
              className="prn-modal__type-badge"
              style={{ '--type-color': meta.color } as React.CSSProperties}
            >
              <Icon family="light" name={meta.icon} />
              {meta.label}
            </span>
            <p className="prn-modal__head-city">{servizio.citta}, {servizio.paese}</p>
            <p className="prn-modal__head-desc">{servizio.descrizione}</p>
          </div>
        </div>

        <div className="prn-modal__form-grid">
          {meta.formFields.map(f => (
            <div key={f.name} className="prn-modal__field">
              <label htmlFor={`prn-field-${f.name}`} className="prn-modal__label">
                {f.label}
                {f.required && <span className="prn-modal__req"> *</span>}
              </label>
              {renderField(f)}
            </div>
          ))}
        </div>

        {servizio.pricingMode !== 'per-persona' && (
          <div className="prn-modal__qty-row">
            <label htmlFor="prn-qty" className="prn-modal__label">
              {servizio.pricingMode === 'per-giorno' && 'Numero giorni'}
              {servizio.pricingMode === 'per-ora'    && 'Numero ore'}
              {servizio.pricingMode === 'per-gruppo' && 'Numero gruppi'}
            </label>
            <input
              id="prn-qty"
              type="number"
              className="sib-input prn-modal__input prn-modal__input--qty"
              min={1}
              max={365}
              value={moltiplicatore}
              onChange={(e) => setMoltiplicatore(Math.max(1, parseInt(e.target.value || '1', 10)))}
            />
          </div>
        )}

        {error && <div className="prn-modal__error">{error}</div>}

        <div className="prn-modal__footer">
          <div className="prn-modal__total">
            <span className="prn-modal__total-label">
              Totale {MERCATI_SERVIZI.find(m => m.id === listino)?.label}
            </span>
            <span className="prn-modal__total-amount">€ {totale.toFixed(2)}</span>
            <span className="prn-modal__total-detail">
              {moltiplicatore} × € {prezzoUnit.toFixed(2)} ({moltiplicatoreLabel(servizio.pricingMode)})
            </span>
          </div>
          <div className="prn-modal__actions">
            <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
              Annulla
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={handleConfirm}>
              <Icon family="regular" name="cart-plus" />
              Aggiungi al carrello
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
