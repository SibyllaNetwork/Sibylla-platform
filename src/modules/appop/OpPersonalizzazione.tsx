import React from 'react'
import { CheckboxField } from '../../core/components/form'
import { labelModulo, nomeReparto, PAGINE_OP, REPARTI_OP, type RepartiModuli, type RepartoOp } from './opCatalogo'
import './OpPersonalizzazione.sass'

interface Props {
  /** Reparti del dipendente. */
  reparti: RepartoOp[]
  /** Moduli attivi per reparto dell'azienda: gli unici che si possono spegnere. */
  moduli: RepartiModuli
  esclusi: string[]
  onChange: (esclusi: string[]) => void
}

// ─── MODULI E PAGINE DEL DIPENDENTE ───────────────────────────────────────────
//  Per ogni reparto del dipendente, i moduli attivi dell'azienda con le loro
//  pagine: si spengono quelli che il dipendente non deve vedere (si può solo
//  togliere). Le voci sono "reparto:modulo" e "reparto:modulo.pagina".
export default function OpPersonalizzazione({ reparti, moduli, esclusi, onChange }: Props) {
  const spento = (voce: string) => esclusi.includes(voce)
  const imposta = (voce: string, acceso: boolean) =>
    onChange(acceso ? esclusi.filter(x => x !== voce) : [...esclusi, voce])

  if (reparti.length === 0) return <p className="op-pers__vuoto">Scegli prima i reparti del dipendente.</p>

  return (
    <div className="op-pers">
      {reparti.map(r => {
        const attivi = moduli[r] ?? REPARTI_OP.find(x => x.key === r)?.predefiniti ?? []
        return (
          <div key={r} className="op-pers__reparto">
            <p className="op-pers__titolo">{nomeReparto(r)}</p>
            <div className="op-pers__moduli">
              {attivi.map(m => {
                const voce = `${r}:${m}`
                const pagine = PAGINE_OP[m] ?? []
                return (
                  <div key={m} className="op-pers__modulo">
                    <CheckboxField name={voce} label={labelModulo(m)} checked={!spento(voce)} onChange={e => imposta(voce, e.target.checked)} />
                    {!spento(voce) && pagine.length > 0 && (
                      <div className="op-pers__pagine">
                        {pagine.map(p => (
                          <CheckboxField key={p.key} name={`${r}:${p.key}`} label={p.label} checked={!spento(`${r}:${p.key}`)} onChange={e => imposta(`${r}:${p.key}`, e.target.checked)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
