import React, { useEffect, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import './ConfigurazioneSuggerimentiModal.sass'

interface StrutturaConfig {
  id: string
  nome: string
  giorni: number
}

interface Props {
  open: boolean
  onClose: () => void
  strutture: StrutturaConfig[]
  onNext?: () => void
  nextLabel?: string
}

const DEFAULT_GIORNI = 5

export default function ConfigurazioneSuggerimentiModal({ open, onClose, strutture, onNext, nextLabel }: Props) {
  const [values, setValues] = useState<Record<string, number>>({})
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      const next: Record<string, number> = {}
      strutture.forEach(s => { next[s.id] = s.giorni })
      setValues(next)
      setSavedFlash({})
    }
  }, [open, strutture])

  function update(id: string, v: number) {
    setValues(prev => ({ ...prev, [id]: v }))
  }

  function save(id: string) {
    setSavedFlash(prev => ({ ...prev, [id]: true }))
    window.setTimeout(() => {
      setSavedFlash(prev => ({ ...prev, [id]: false }))
    }, 1400)
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Configurazione suggerimenti">
      <div className="cfg-sugg">
        <p className="cfg-sugg__subtitle">
          Imposta per ogni struttura il numero di giorni a partire da oggi entro cui mostrare i suggerimenti in griglia.
        </p>

        <span className="cfg-sugg__chip">Default {DEFAULT_GIORNI} giorni</span>

        <div className="cfg-sugg__warning">
          <i className="fa-light fa-triangle-exclamation" aria-hidden="true" />
          <span>
            Ogni giorno oltre il quinto rende i suggerimenti meno precisi. Fai attenzione a non lavorare su intervalli di tempo troppo ampi.
          </span>
        </div>

        <div className="cfg-sugg__list">
          {strutture.map(s => {
            const isCustom = values[s.id] !== DEFAULT_GIORNI
            return (
              <div className="cfg-sugg__row" key={s.id}>
                <div className="cfg-sugg__hotel">
                  <div className="cfg-sugg__hotel-nome">{s.nome}</div>
                  <div className={`cfg-sugg__hotel-meta ${isCustom ? 'is-custom' : ''}`}>
                    {isCustom ? 'Valore personalizzato salvato' : 'Valore predefinito'}
                  </div>
                </div>

                <div className="cfg-sugg__actions">
                  <label className="cfg-sugg__field-label" htmlFor={`cfg-sugg-${s.id}`}>Giorni</label>
                  <input
                    id={`cfg-sugg-${s.id}`}
                    type="number"
                    min={1}
                    max={60}
                    className="cfg-sugg__input"
                    value={values[s.id] ?? DEFAULT_GIORNI}
                    onChange={e => update(s.id, Number(e.target.value) || 1)}
                  />
                  <button
                    type="button"
                    className={`cfg-sugg__save ${savedFlash[s.id] ? 'is-saved' : ''}`}
                    onClick={() => save(s.id)}
                    title="Salva"
                  >
                    <i className={`fa-light ${savedFlash[s.id] ? 'fa-check' : 'fa-floppy-disk'}`} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="cfg-sugg__footer">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
          {onNext && (
            <button type="button" className="sib-btn sib-btn--primary" onClick={onNext}>
              {nextLabel ?? 'Avanti'} <i className="fa-light fa-arrow-right" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
