import React from 'react'
import { CheckboxField, ToggleSwitch } from '../../core/components/form'
import Tooltip from '../../core/components/Tooltip'
import { MODULI_COMUNI, MODULI_OP, MODULI_SPECIFICI, ordinaModuli, REPARTI_OP, type RepartiModuli, type RepartoOp } from './opCatalogo'
import './OpModuliEditor.sass'

interface Props {
  value: RepartiModuli
  onChange: (value: RepartiModuli) => void
  /** Cliente indipendente: le funzioni del gestionale alberghiero sono segnalate (nessun dato da cui leggerle). */
  indipendente?: boolean
  /**
   * Come sibyllaop.it/admin: le funzioni del gestionale alberghiero non si offrono e restano fuori dai predefiniti
   * (l'azienda creata in Op non ha un gestionale da cui leggerle, anche se collegata a Platform).
   */
  senzaPms?: boolean
}

// ─── REPARTI E MODULI DELL'APP OP! ────────────────────────────────────────────
//  Un riquadro per reparto: si attiva il reparto (con i moduli predefiniti) e se
//  ne scelgono i moduli. Un modulo si può assegnare a qualsiasi reparto.
export default function OpModuliEditor({ value, onChange, indipendente = false, senzaPms = false }: Props) {
  const ammesso = (key: string) => !senzaPms || !MODULI_OP.find(m => m.key === key)?.pms
  const attiva = (r: RepartoOp, on: boolean) => {
    const next = { ...value }
    if (on) next[r] = REPARTI_OP.find(x => x.key === r)!.predefiniti.filter(ammesso)
    else delete next[r]
    onChange(next)
  }

  const modulo = (r: RepartoOp, key: string, on: boolean) => {
    const attuali = value[r] ?? []
    onChange({ ...value, [r]: ordinaModuli(on ? [...attuali, key] : attuali.filter(m => m !== key)) })
  }

  return (
    <div className="op-moduli">
      {REPARTI_OP.map(r => {
        const moduli = value[r.key]
        const on = moduli !== undefined
        return (
          <section key={r.key} className="op-moduli__reparto" data-attivo={on}>
            <div className="op-moduli__head">
              <h3 className="op-moduli__nome">{r.nome}</h3>
              <ToggleSwitch checked={on} label={on ? 'Attivo' : 'Non attivo'} onChange={v => attiva(r.key, v)} />
            </div>
            {on && (
              <div className="op-moduli__gruppi">
                {[{ titolo: 'Funzioni comuni', voci: MODULI_COMUNI }, { titolo: 'Funzioni del reparto', voci: MODULI_SPECIFICI }].map(g => (
                  <div key={g.titolo} className="op-moduli__gruppo">
                    <p className="op-moduli__titolo">{g.titolo}</p>
                    <div className="op-moduli__voci">
                      {g.voci.filter(m => ammesso(m.key)).map(m => {
                        const box = (
                          <CheckboxField
                            key={m.key}
                            name={`${r.key}-${m.key}`}
                            label={m.label}
                            checked={moduli.includes(m.key)}
                            onChange={e => modulo(r.key, m.key, e.target.checked)}
                            className={indipendente && m.pms ? 'op-moduli__voce op-moduli__voce--pms' : 'op-moduli__voce'}
                          />
                        )
                        return indipendente && m.pms
                          ? <Tooltip key={m.key} text="Richiede il gestionale alberghiero di Sibylla: per un cliente indipendente non ha dati.">{box}</Tooltip>
                          : box
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
