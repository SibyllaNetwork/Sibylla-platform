import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TotemAgoraCta from '../_shared/TotemAgoraCta'
import TotemDettaglioModal from '../_shared/TotemDettaglioModal'
import './IMieiTotem.sass'

interface Totem {
  id: string
  struttura: string
  indirizzo: string
  noleggiaSpazi: boolean
  acceso: boolean
}

const INITIAL: Totem[] = [
  { id: 't1', struttura: 'Hotel Archimede',          indirizzo: 'Via dei Mille 19 - Roma',         noleggiaSpazi: false, acceso: true  },
  { id: 't2', struttura: 'B&B Solare',                indirizzo: 'Via Remo Remotti 2 - Roma',       noleggiaSpazi: true,  acceso: false },
  { id: 't3', struttura: 'Centro Estetico - Saches', indirizzo: 'Via delle Zattere 25 - Roma',     noleggiaSpazi: true,  acceso: true  },
  { id: 't4', struttura: 'Hotel Centro',              indirizzo: 'Via delle Zattere 25 - Roma',     noleggiaSpazi: true,  acceso: false },
  { id: 't5', struttura: 'B&B Solare',                indirizzo: 'Via Remo Remotti 2 - Roma',       noleggiaSpazi: true,  acceso: true  },
  { id: 't6', struttura: 'Centro Estetico - Saches', indirizzo: 'Via delle Zattere 25 - Roma',     noleggiaSpazi: true,  acceso: true  },
]

export default function IMieiTotem({ navigate }: { navigate: (p: string) => void }) {
  const [totems, setTotems] = useState<Totem[]>(INITIAL)
  const [allRent, setAllRent] = useState(true)
  const [dettaglio, setDettaglio] = useState<Totem | null>(null)

  function toggleNoleggia(id: string) {
    setTotems(prev => prev.map(t => t.id === id ? { ...t, noleggiaSpazi: !t.noleggiaSpazi } : t))
  }

  function toggleAllRent() {
    const next = !allRent
    setAllRent(next)
    setTotems(prev => prev.map(t => ({ ...t, noleggiaSpazi: next })))
  }

  return (
    <div className="totem">
      <PageHead title="Totem interattivo" />

      <div className="totem__layout">
        <section className="totem__list-section">
          <h3 className="totem__list-title">I miei Totem</h3>
          <div className="sib-table-wrap">
          <table className="sib-table totem__table">
            <thead>
              <tr>
                <th>Posizione</th>
                <th className="totem__th-center">
                  <span className="totem__th-stack">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={allRent}
                      onChange={toggleAllRent}
                      aria-label="Seleziona tutti"
                    />
                    Noleggia spazi
                  </span>
                </th>
                <th className="totem__th-center">Status</th>
                <th className="totem__th-center">Gestisci totem</th>
              </tr>
            </thead>
            <tbody>
              {totems.map(t => (
                <tr key={t.id}>
                  <td>
                    <button
                      type="button"
                      className="totem__pos totem__pos--btn"
                      onClick={() => setDettaglio(t)}
                      aria-label={`Dettaglio totem ${t.struttura}`}
                    >
                      <span className="totem__pos-icon" aria-hidden="true">
                        <i className="fa-solid fa-mobile-screen" />
                      </span>
                      <span className="totem__pos-text">
                        <strong>{t.struttura}</strong>
                        <span>{t.indirizzo}</span>
                      </span>
                    </button>
                  </td>
                  <td className="totem__td-center">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={t.noleggiaSpazi}
                      onChange={() => toggleNoleggia(t.id)}
                      aria-label={`Noleggia spazi ${t.struttura}`}
                    />
                  </td>
                  <td className="totem__td-center">
                    <Tooltip text={t.acceso ? 'Acceso' : 'Spento'}>
                      <span className={'totem__status' + (t.acceso ? ' totem__status--on' : ' totem__status--off')}>
                        <i className={'fa-light ' + (t.acceso ? 'fa-lightbulb-on' : 'fa-lightbulb-slash')} aria-hidden="true" />
                      </span>
                    </Tooltip>
                  </td>
                  <td className="totem__td-center">
                    <Tooltip text="Gestisci totem">
                      <button
                        type="button"
                        className="totem__manage-btn"
                        aria-label="Gestisci totem"
                        onClick={() => navigate('gest-advertising')}
                      >
                        <i className="fa-solid fa-folder-gear" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        <TotemAgoraCta />
      </div>

      <TotemDettaglioModal
        open={!!dettaglio}
        strutturaName={dettaglio?.struttura}
        onClose={() => setDettaglio(null)}
      />
    </div>
  )
}
