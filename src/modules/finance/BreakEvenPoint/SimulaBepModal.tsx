import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import VistaSwitch, { VistaOpzione } from '../../../core/components/VistaSwitch'
import { InputField } from '../../../core/components/form'
import { fmtEur, fmtPct } from '../../../core/bi'
import type { Bep } from '../_data/financeMock'
import { Obiettivi, Parametro, simula } from './bepScenario'
import './SimulaBepModal.sass'

/**
 * Pop-up "Simula" della Break-even point analysis: si sceglie il parametro
 * obiettivo (Ricavi o Margine, due opzioni a icona) e se ne imposta il valore.
 * L'anteprima mostra subito camere necessarie, l'altro valore e la distanza dal
 * pareggio; "Simula" porta lo scenario nel grafico.
 */
interface Props {
  open: boolean
  onClose: () => void
  bep: Bep
  ricaviAttuali: number
  margineAttuale: number
  iniziali: Obiettivi | null
  onSimula: (o: Obiettivi) => void
}

const PARAMETRI: VistaOpzione<Parametro>[] = [
  { value: 'ricavi', label: 'Ricavi', icon: 'fa-sack-dollar', hint: 'Ricavi obiettivo' },
  { value: 'margine', label: 'Margine', icon: 'fa-chart-line-up', hint: 'Margine obiettivo' },
]

const INT = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions)
const segno = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmtPct(Math.abs(v) * 100)}`

export default function SimulaBepModal({ open, onClose, bep, ricaviAttuali, margineAttuale, iniziali, onSimula }: Props) {
  const [parametro, setParametro] = useState<Parametro>('ricavi')
  const [valore, setValore] = useState('')

  const oggi = (p: Parametro) => (p === 'ricavi' ? ricaviAttuali : Math.max(margineAttuale, 0))

  // All'apertura: la simulazione in corso, o il valore di oggi +10%
  useEffect(() => {
    if (!open) return
    const p = iniziali?.parametro ?? 'ricavi'
    setParametro(p)
    setValore(String(Math.round(iniziali?.valore ?? oggi(p) * 1.1)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, iniziali])

  function cambiaParametro(p: Parametro) {
    setParametro(p)
    setValore(String(Math.round(oggi(p) * 1.1)))
  }

  const v = Number(valore.replace(/\./g, '').replace(',', '.'))
  const valido = isFinite(v) && v > 0
  const s = valido ? simula(bep, { parametro, valore: v }, ricaviAttuali, margineAttuale) : null

  return (
    <Modal open={open} onClose={onClose} title="Simula scenario sul break-even point" size="md">
      <div className="besim">
        <div className="besim__param">
          <span className="besim__lbl">Parametro da simulare</span>
          <VistaSwitch value={parametro} options={PARAMETRI} onChange={cambiaParametro} ariaLabel="Parametro da simulare" />
        </div>

        <InputField
          name="valoreObiettivo" type="number" min={0} step={1000}
          label={parametro === 'ricavi' ? 'Ricavi obiettivo (€)' : 'Margine obiettivo (€)'}
          iconLeft={`fa-solid ${parametro === 'ricavi' ? 'fa-sack-dollar' : 'fa-chart-line-up'}`}
          value={valore} onChange={e => setValore(e.target.value)}
          hint={`Oggi ${fmtEur(parametro === 'ricavi' ? ricaviAttuali : margineAttuale, 0)}`}
          error={valore && !valido ? 'Inserisci un importo maggiore di zero' : undefined}
        />

        <p className="besim__intro">
          Costi di oggi: ricavo per camera {fmtEur(bep.ricavoPerCamera, 0)}, costo variabile {fmtEur(bep.cvu, 0)} a camera,
          costi fissi {fmtEur(bep.costiFissi, 0)}. Da questi si {parametro === 'ricavi' ? 'ricava il margine corrispondente' : 'ricavano i ricavi necessari'}.
        </p>

        {s && (
          <ul className="besim__esito" aria-live="polite">
            <li>
              <span>Camere da vendere</span>
              <strong>{INT.format(Math.round(s.camere))}</strong>
            </li>
            <li>
              <span>{parametro === 'ricavi' ? 'Margine corrispondente' : 'Ricavi necessari'}</span>
              <strong>
                {fmtEur(parametro === 'ricavi' ? s.margine : s.ricavi, 0)}
                <em className={(parametro === 'ricavi' ? s.varMargine : s.varRicavi) >= 0 ? 'besim__pos' : 'besim__neg'}>
                  {' '}{segno(parametro === 'ricavi' ? s.varMargine : s.varRicavi)} vs oggi
                </em>
              </strong>
            </li>
            <li>
              <span>Distanza dal pareggio ({INT.format(Math.round(s.camereBep))} camere)</span>
              <strong className={s.sicurezza >= 0 ? 'besim__pos' : 'besim__neg'}>
                {s.sicurezza >= 0 ? 'margine di sicurezza ' : 'sotto il pareggio '}{fmtPct(Math.abs(s.sicurezza) * 100)}
              </strong>
            </li>
            {!s.fattibile && (
              <li className="besim__warn">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Con la struttura dei costi di oggi l'obiettivo non è calcolabile.
              </li>
            )}
          </ul>
        )}

        <div className="besim__footer">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!s?.fattibile}
            onClick={() => s && onSimula({ parametro, valore: v })}>
            <i className="fa-solid fa-play" aria-hidden="true" /> Simula
          </button>
        </div>
      </div>
    </Modal>
  )
}
