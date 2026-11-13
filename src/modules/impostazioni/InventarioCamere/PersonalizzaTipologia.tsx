import React, { useMemo, useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import type { PersonalizzazioneCamera, SegmentoOspite, TipologiaCamera } from '../../../store/useTipologieCamereStore'
import {
  OPZIONI_INTERVALLO, PERSONALIZZAZIONE_DEFAULT, SEGMENTI, etichettaIntervallo, giorniCambioLenzuola, personalizzazioneDi,
} from './personalizzazione'
import './PersonalizzaTipologia.sass'

// ─── Personalizza tipologia ───────────────────────────────────────────────────
//  Pannello a fisarmonica nella riga dell'inventario: regole operative della
//  tipologia. Cambio lenzuola per segmento d'ospite con anteprima viva su un
//  soggiorno simulato; il cambio alla partenza è fisso e non disattivabile.

const MAX_NOTTI_SIM = 14
const GIORNO_SETT = ['do', 'lu', 'ma', 'me', 'gi', 've', 'sa']
const fmt = (d: Date) => d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

interface Props {
  t: TipologiaCamera
  disabled: boolean
  onChange: (p: PersonalizzazioneCamera) => void
  onClose: () => void
}

export default function PersonalizzaTipologia({ t, disabled, onChange, onClose }: Props) {
  const pers = personalizzazioneDi(t)
  const [notti, setNotti] = useState(7)
  const predefinita = JSON.stringify(pers) === JSON.stringify(PERSONALIZZAZIONE_DEFAULT)

  // Soggiorno di esempio: arrivo oggi, partenza dopo `notti` notti.
  const giorni = useMemo(() => {
    const oggi = new Date()
    return Array.from({ length: notti + 1 }, (_, g) => new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + g))
  }, [notti])

  const setIntervallo = (seg: SegmentoOspite, n: number) =>
    onChange({ ...pers, cambioLenzuola: { ...pers.cambioLenzuola, [seg]: n } })

  return (
    <div className="pcam" id={`pcam-${t.id}`}>
      <div className="pcam__head">
        <span className="pcam__title"><i className="fa-light fa-sliders" /> Personalizzazione · {t.nome || 'senza nome'}</span>
        <span className="pcam__head-acts">
          {!predefinita && !disabled && (
            <button type="button" className="pcam__reset" onClick={() => onChange(PERSONALIZZAZIONE_DEFAULT)}>
              <i className="fa-light fa-arrow-rotate-left" /> Ripristina predefiniti
            </button>
          )}
          <Tooltip text="Chiudi personalizzazione">
            <button type="button" className="pcam__close" aria-label="Chiudi personalizzazione" onClick={onClose}>
              <i className="fa-solid fa-xmark" />
            </button>
          </Tooltip>
        </span>
      </div>

      <section className="pcam__block">
        <header className="pcam__block-head">
          <span className="pcam__block-ico"><i className="fa-solid fa-bed" /></span>
          <span className="pcam__block-titles">
            <h4>Cambio lenzuola</h4>
            <span>Intervallo per tipo di ospite, contato dalla data di arrivo del soggiorno</span>
          </span>
          <SelectField name={`pcam-sim-${t.id}`} label="Simula un soggiorno di" className="pcam__sim" value={notti}
            options={Array.from({ length: MAX_NOTTI_SIM }, (_, i) => ({ value: i + 1, label: i === 0 ? '1 notte' : `${i + 1} notti` }))}
            onChange={(e) => setNotti(Number(e.target.value))} />
        </header>

        <div className="pcam__table" role="table" aria-label="Cambio lenzuola per tipo di ospite">
          <div className="pcam__row pcam__row--head" role="row">
            <span role="columnheader">Tipo di ospite</span>
            <span role="columnheader">Cambio lenzuola</span>
            <div className="pcam__days" role="columnheader">
              {giorni.map((d, g) => (
                <span key={g} className={'pcam__day' + (g === 0 ? ' is-arr' : g === notti ? ' is-dep' : '')}>
                  <span className="pcam__day-tag">{g === 0 ? 'Arrivo' : g === notti ? 'Partenza' : GIORNO_SETT[d.getDay()]}</span>
                  <span className="pcam__day-num">{d.getDate()}</span>
                </span>
              ))}
            </div>
          </div>

          {SEGMENTI.map((s) => {
            const intervallo = pers.cambioLenzuola[s.id]
            const cambi = new Set(giorniCambioLenzuola(intervallo, notti))
            return (
              <div key={s.id} className="pcam__row" role="row">
                <span className="pcam__seg" role="cell">
                  <i className={`fa-solid ${s.icona}`} />
                  <span className="pcam__seg-txt">
                    <strong>{s.label}</strong>
                    <span>{cambi.size} {cambi.size === 1 ? 'cambio' : 'cambi'} in {notti === 1 ? '1 notte' : `${notti} notti`}</span>
                  </span>
                </span>
                <span role="cell">
                  <SelectField name={`pcam-${t.id}-${s.id}`} ariaLabel={`Cambio lenzuola ${s.label}`} value={intervallo} disabled={disabled}
                    options={OPZIONI_INTERVALLO} onChange={(e) => setIntervallo(s.id, Number(e.target.value))} />
                </span>
                <div className="pcam__days pcam__days--track" role="cell">
                  {giorni.map((d, g) => {
                    const dep = g === notti
                    const cambio = cambi.has(g)
                    const testo = g === 0 ? `${fmt(d)} · Arrivo: camera pronta con biancheria pulita`
                      : dep ? `${fmt(d)} · Partenza: cambio lenzuola obbligatorio`
                      : cambio ? `${fmt(d)} · Cambio lenzuola dopo ${g} ${g === 1 ? 'notte' : 'notti'}`
                      : `${fmt(d)} · Nessun cambio`
                    return (
                      <span key={g} className="pcam__cell">
                        <Tooltip text={testo}>
                          <span className={'pcam__dot' + (g === 0 ? ' is-arr' : dep ? ' is-dep' : cambio ? ' is-on' : '')}>
                            {g === 0 ? <i className="fa-solid fa-key" /> : dep ? <i className="fa-solid fa-lock" /> : cambio ? <i className="fa-solid fa-arrows-rotate" /> : null}
                          </span>
                        </Tooltip>
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <footer className="pcam__foot">
          <span className="pcam__rule">
            <i className="fa-solid fa-lock" />
            <span>Il giorno della <strong>partenza</strong> il cambio lenzuola è sempre previsto, qualunque sia l'intervallo scelto.</span>
          </span>
          <span className="pcam__legend">
            <span><span className="pcam__dot is-arr pcam__dot--sm"><i className="fa-solid fa-key" /></span> Arrivo</span>
            <span><span className="pcam__dot is-on pcam__dot--sm"><i className="fa-solid fa-arrows-rotate" /></span> Cambio</span>
            <span><span className="pcam__dot is-dep pcam__dot--sm"><i className="fa-solid fa-lock" /></span> Partenza (obbligatorio)</span>
          </span>
        </footer>
      </section>
    </div>
  )
}

/** Riassunto breve per il tooltip del pulsante Personalizza. */
export const riassuntoPersonalizzazione = (t: TipologiaCamera) => {
  const p = personalizzazioneDi(t).cambioLenzuola
  return `Cambio lenzuola: ${SEGMENTI.map((s) => `${s.label} ${etichettaIntervallo(p[s.id]).toLowerCase()}`).join(' · ')}`
}
