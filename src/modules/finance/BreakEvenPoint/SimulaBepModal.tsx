import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { InputField, RadioGroup } from '../../../core/components/form'
import { fmtEur, fmtPct } from '../../../core/bi'
import type { Bep } from '../_data/financeMock'
import { Leva, Obiettivi, simula } from './bepScenario'
import './SimulaBepModal.sass'

/**
 * Pop-up "Simula" della BEP analysis: Ricavi obiettivo e Margine obiettivo.
 * Mostra subito cosa serve per centrarli; "Simula" porta lo scenario nel
 * grafico di pareggio.
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

const LEVE = [
  { value: 'fissi', label: 'Costi fissi' },
  { value: 'variabili', label: 'Costo variabile per camera' },
]

export default function SimulaBepModal({ open, onClose, bep, ricaviAttuali, margineAttuale, iniziali, onSimula }: Props) {
  const [ricavi, setRicavi] = useState('')
  const [margine, setMargine] = useState('')
  const [leva, setLeva] = useState<Leva>('fissi')

  // All'apertura: obiettivi della simulazione in corso, o i valori di oggi +10%
  useEffect(() => {
    if (!open) return
    setRicavi(String(Math.round(iniziali?.ricavi ?? ricaviAttuali * 1.1)))
    setMargine(String(Math.round(iniziali?.margine ?? Math.max(margineAttuale, 0) * 1.1)))
    setLeva(iniziali?.leva ?? 'fissi')
  }, [open, iniziali, ricaviAttuali, margineAttuale])

  const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))
  const r = num(ricavi), m = num(margine)
  const validi = isFinite(r) && r > 0 && isFinite(m) && m < r
  const anteprima = validi ? simula(bep, { ricavi: r, margine: m, leva }) : null

  return (
    <Modal open={open} onClose={onClose} title="Simula scenario sul BEP" size="md">
      <div className="besim">
        <p className="besim__intro">
          Imposta gli obiettivi: il ricavo per camera resta quello di oggi ({fmtEur(bep.ricavoPerCamera, 0)}),
          la simulazione calcola i costi che servono e il nuovo punto di pareggio.
        </p>

        <div className="besim__campi">
          <InputField name="ricaviObiettivo" label="Ricavi obiettivo (€)" type="number" min={0} step={1000}
            value={ricavi} onChange={e => setRicavi(e.target.value)}
            hint={`Oggi ${fmtEur(ricaviAttuali, 0)}`}
            error={ricavi && !(r > 0) ? 'Inserisci un importo maggiore di zero' : undefined} />
          <InputField name="margineObiettivo" label="Margine obiettivo (€)" type="number" step={1000}
            value={margine} onChange={e => setMargine(e.target.value)}
            hint={validi ? `${fmtPct((m / r) * 100)} dei ricavi · oggi ${fmtEur(margineAttuale, 0)}` : `Oggi ${fmtEur(margineAttuale, 0)}`}
            error={margine && r > 0 && !(m < r) ? 'Il margine deve essere minore dei ricavi' : undefined} />
        </div>

        <RadioGroup name="leva" label="Per centrare il margine agisci su" options={LEVE} value={leva} onChange={v => setLeva(v as Leva)} />

        {anteprima && (
          <ul className="besim__esito" aria-live="polite">
            <li>
              <span>Camere da vendere</span>
              <strong>{Math.round(anteprima.camere).toLocaleString('it-IT')}</strong>
            </li>
            <li>
              <span>Con i costi di oggi il margine sarebbe</span>
              <strong className={anteprima.margineCostiAttuali < m ? 'besim__neg' : 'besim__pos'}>{fmtEur(anteprima.margineCostiAttuali, 0)}</strong>
            </li>
            <li>
              <span>{leva === 'fissi' ? 'Costi fissi massimi' : 'Costo variabile massimo per camera'}</span>
              <strong>
                {fmtEur(leva === 'fissi' ? anteprima.costiFissi : anteprima.cvu, 0)}
                <em className={anteprima.variazioneLeva > 0 ? 'besim__pos' : 'besim__neg'}>
                  {' '}{anteprima.variazioneLeva > 0 ? '+' : '−'}{fmtPct(Math.abs(anteprima.variazioneLeva) * 100)} vs oggi
                </em>
              </strong>
            </li>
            {!anteprima.fattibile && (
              <li className="besim__warn">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Obiettivo non raggiungibile agendo solo su questa leva: prova l'altra o rivedi gli obiettivi.
              </li>
            )}
          </ul>
        )}

        <div className="besim__footer">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!anteprima?.fattibile}
            onClick={() => anteprima && onSimula({ ricavi: r, margine: m, leva })}>
            <i className="fa-solid fa-play" aria-hidden="true" /> Simula
          </button>
        </div>
      </div>
    </Modal>
  )
}
