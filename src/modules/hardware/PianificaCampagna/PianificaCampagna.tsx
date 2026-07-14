import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { InputField, SelectField } from '../../../core/components/form'
import TotemAgoraCta from '../_shared/TotemAgoraCta'
import TotemDettaglioModal from '../_shared/TotemDettaglioModal'
import './PianificaCampagna.sass'

type RowKind = 'slot' | 'sub' | 'unavailable'

interface Slot {
  id: string
  date: string
  periodo: string
  passaggi: number
  timing: number
  contenuto?: string
  ricavo?: number
  conflict?: string
  kind: RowKind
}

const PERIODI = [
  { value: 'mattina-7-12',     label: 'Mattina 7-12' },
  { value: 'pomeriggio-7-12',  label: 'Pomeriggio 7-12' },
  { value: 'pomeriggio-12-18', label: 'Pomeriggio 12-18' },
  { value: 'sera-18-24',       label: 'Sera 18-24' },
  { value: 'notte-24-7',       label: 'Notte 24 - 7' },
  { value: 'ripetizioni',      label: 'Ripetizioni' },
]

const PASSAGGI = [1, 2, 3, 5, 10, 15, 20].map(n => ({ value: String(n), label: `${n} passagg${n === 1 ? 'io' : 'i'}` }))

const TIMING = [5, 10, 15, 30].map(n => ({ value: String(n), label: `${n} secondi` }))

const INITIAL: Slot[] = [
  { id: '1',  date: '12/08/2024', periodo: 'mattina-7-12',     passaggi: 1,  timing: 10, kind: 'slot' },
  { id: '2',  date: '12/08/2024', periodo: 'pomeriggio-7-12',  passaggi: 2,  timing: 10, kind: 'sub' },
  { id: '3',  date: '13/08/2024', periodo: 'pomeriggio-12-18', passaggi: 5,  timing: 10, kind: 'slot' },
  { id: '4',  date: '14/08/2024', periodo: 'sera-18-24',       passaggi: 10, timing: 5,  kind: 'slot' },
  { id: '5',  date: '15/08/2024', periodo: 'notte-24-7',       passaggi: 15, timing: 30, kind: 'slot' },
  { id: '6',  date: '16/08/2024', periodo: '',                  passaggi: 0,  timing: 0, ricavo: 120, conflict: 'Spazio non disponibile e prenotato su richiesta di utente esterno', kind: 'unavailable' },
  { id: '7',  date: '17/08/2024', periodo: 'ripetizioni',       passaggi: 20, timing: 10, kind: 'slot' },
  { id: '8',  date: '18/08/2024', periodo: 'ripetizioni',       passaggi: 1,  timing: 10, kind: 'slot' },
  { id: '9',  date: '19/08/2024', periodo: 'ripetizioni',       passaggi: 2,  timing: 10, kind: 'slot' },
  { id: '10', date: '20/08/2024', periodo: 'ripetizioni',       passaggi: 3,  timing: 10, kind: 'slot' },
]

export default function PianificaCampagna({ navigate }: { navigate: (p: string) => void }) {
  const [dataInizio, setDataInizio] = useState('2024-08-12')
  const [dataFine, setDataFine]     = useState('2024-08-23')
  const [slots, setSlots]           = useState<Slot[]>(INITIAL)
  const [dettaglioOpen, setDettaglioOpen] = useState(false)

  const totale = useMemo(
    () => slots.reduce((s, r) => s + (r.ricavo ?? 0), 0),
    [slots]
  )

  function update<K extends keyof Slot>(id: string, k: K, v: Slot[K]) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, [k]: v } : s))
  }
  function remove(id: string) {
    setSlots(prev => prev.filter(s => s.id !== id))
  }
  function addSubRow(parentId: string) {
    const parent = slots.find(s => s.id === parentId)
    if (!parent) return
    const newSlot: Slot = {
      id: `s-${Date.now()}`,
      date: parent.date,
      periodo: 'pomeriggio-12-18',
      passaggi: 1,
      timing: 10,
      kind: 'sub',
    }
    setSlots(prev => {
      const idx = prev.findIndex(s => s.id === parentId)
      const next = [...prev]
      next.splice(idx + 1, 0, newSlot)
      return next
    })
  }

  return (
    <div className="pianif">
      <PageHead title="Gestione Advertising" onBack={() => navigate('noleggia-spazi')} />

      <div className="pianif__layout">
        {/* ── Sinistra: planner ────────────────────────────── */}
        <section className="pianif__planner">
          <h3 className="pianif__title">Pianifica la tua campagna pubblicitaria</h3>

          <div className="pianif__date-range">
            <InputField
              name="data-inizio" label="Data inizio" type="text"
              iconLeft="fa-regular fa-calendar"
              value={formatDateIt(dataInizio)}
              onChange={e => setDataInizio(parseDateIt(e.target.value))}
            />
            <InputField
              name="data-fine" label="Data fine" type="text"
              iconLeft="fa-regular fa-calendar"
              value={formatDateIt(dataFine)}
              onChange={e => setDataFine(parseDateIt(e.target.value))}
            />
          </div>

          <div className="pianif__table-wrap">
            <table className="pianif__table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Periodo</th>
                  <th>Ripetizioni</th>
                  <th>Timing</th>
                  <th>Contenuti</th>
                  <th className="pianif__th-num">Ricavi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map(s => (
                  <tr key={s.id} className={'pianif__row pianif__row--' + s.kind}>
                    <td className="pianif__td-date">
                      {s.kind === 'sub' ? (
                        <span className="pianif__sub-arrow" aria-hidden="true">
                          <i className="fa-solid fa-arrow-turn-down-right" />
                        </span>
                      ) : (
                        s.date
                      )}
                    </td>
                    {s.kind === 'unavailable' ? (
                      <>
                        <td colSpan={4} className="pianif__td-conflict">
                          {s.conflict}
                        </td>
                        <td className="pianif__td-num pianif__td-conflict-amt">{s.ricavo}€</td>
                      </>
                    ) : (
                      <>
                        <td>
                          <SelectField
                            name={`per-${s.id}`}
                            value={s.periodo}
                            onChange={e => update(s.id, 'periodo', e.target.value)}
                            options={PERIODI}
                          />
                        </td>
                        <td>
                          <SelectField
                            name={`pas-${s.id}`}
                            value={String(s.passaggi)}
                            onChange={e => update(s.id, 'passaggi', Number(e.target.value))}
                            options={PASSAGGI}
                          />
                        </td>
                        <td>
                          <SelectField
                            name={`tim-${s.id}`}
                            value={String(s.timing)}
                            onChange={e => update(s.id, 'timing', Number(e.target.value))}
                            options={TIMING}
                          />
                        </td>
                        <td>
                          <button type="button" className="pianif__upload-btn">
                            Upload <i className="fa-solid fa-arrow-up-from-bracket" />
                          </button>
                        </td>
                        <td className="pianif__td-num pianif__td-muted">{s.ricavo ? `${s.ricavo}€` : '--'}</td>
                      </>
                    )}
                    <td>
                      <span className="pianif__row-actions">
                        <Tooltip text="Modifica">
                          <button type="button" className="pianif__action" aria-label="Modifica">
                            <i className="fa-solid fa-pen-to-square" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Elimina">
                          <button type="button" className="pianif__action" aria-label="Elimina" onClick={() => remove(s.id)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </Tooltip>
                        {s.kind === 'slot' && (
                          <Tooltip text="Aggiungi passaggio">
                            <button type="button" className="pianif__action" aria-label="Aggiungi passaggio" onClick={() => addSubRow(s.id)}>
                              <i className="fa-solid fa-circle-plus" />
                            </button>
                          </Tooltip>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="pianif__total-label">Ricavo totale :</td>
                  <td className="pianif__td-num pianif__total-amount">{totale}€</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pianif__procedi-row">
            <button
              type="button"
              className="sib-btn sib-btn--primary pianif__procedi"
              onClick={() => navigate('riepilogo-campagna')}
            >
              Procedi
            </button>
          </div>
        </section>

        {/* ── Centro: posizione scelta ─────────────────────── */}
        <section className="pianif__pos-section">
          <h3 className="pianif__pos-title">Posizione scelta</h3>
          <button
            type="button"
            className="pianif__pos-name-btn"
            onClick={() => setDettaglioOpen(true)}
            aria-label="Dettaglio totem Hotel Archimede"
          >
            <strong>Hotel Archimede</strong>
          </button>
          <p className="pianif__pos-addr">Via dei Mille 19 Roma</p>
          <div className="pianif__pos-photo">
            <img
              src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800"
              alt="Reception Hotel Archimede"
              loading="lazy"
            />
          </div>
        </section>

        {/* ── Destra: anteprima totem ───────────────────────── */}
        <div className="pianif__totem-col">
          <TotemAgoraCta showTitle={false} showBanner={false} />
        </div>
      </div>

      <TotemDettaglioModal
        open={dettaglioOpen}
        strutturaName="Hotel Archimede"
        onClose={() => setDettaglioOpen(false)}
      />
    </div>
  )
}

function formatDateIt(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function parseDateIt(it: string): string {
  const m = it.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return it
  return `${m[3]}-${m[2]}-${m[1]}`
}
