import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './VincoloMatriosca.sass'

interface Riga { id: number; tipo: string; equivalenti: string[] }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  rows: Riga[]
}

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  rows: [
    { id: 1, tipo: 'Doppia',    equivalenti: ['Matrimoniale Classic'] },
    { id: 2, tipo: 'Singola',   equivalenti: ['Doppia Uso Singola', 'Singola Classic'] },
    { id: 3, tipo: 'Tripla',    equivalenti: [] },
    { id: 4, tipo: 'Quadrupla', equivalenti: [] },
    { id: 5, tipo: 'Superior',  equivalenti: ['Suite Junior'] },
  ],
}

export default function VincoloMatriosca() {
  const [data, setData]       = useState<Data>(FALLBACK)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetVincoloMatriosca', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const editing = useMemo(
    () => data.rows.find(r => r.id === editingId) ?? null,
    [data.rows, editingId]
  )

  const closeModal = () => setEditingId(null)

  const saveEquivalenze = (next: string[]) => {
    if (editingId == null) return
    setData(d => ({
      ...d,
      rows: d.rows.map(r => r.id === editingId ? { ...r, equivalenti: next } : r),
    }))
    setEditingId(null)
  }

  return (
    <div className="vincolo-matriosca">
      <div className="vincolo-matriosca__field">
        <label>Struttura</label>
        <select
          className="sib-select sib-select--dense vincolo-matriosca__select"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Hotel Tutorial</option>
          {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
        </select>
      </div>

      <div className="vincolo-matriosca__table-wrap">
        <table className="vincolo-matriosca__table">
          <thead>
            <tr>
              <th className="vincolo-matriosca__th--name">Tipo camera</th>
              <th>Tipo camera equivalente</th>
              <th className="vincolo-matriosca__th--actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const configured = r.equivalenti.length > 0
              return (
                <tr key={r.id}>
                  <td className="vincolo-matriosca__td vincolo-matriosca__td--name">{r.tipo}</td>
                  <td className="vincolo-matriosca__td">
                    {configured ? (
                      <span className="vincolo-matriosca__equiv-list">{r.equivalenti.join(', ')}</span>
                    ) : (
                      <span className="vincolo-matriosca__empty">Nessuna equivalenza configurata</span>
                    )}
                  </td>
                  <td className="vincolo-matriosca__td vincolo-matriosca__td--actions">
                    <button
                      type="button"
                      className="sib-btn sib-btn--primary sib-btn--sm vincolo-matriosca__action-btn"
                      onClick={() => setEditingId(r.id)}
                    >
                      {configured ? 'Modifica' : 'Configura'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EquivalenzeModal
          key={editing.id}
          row={editing}
          allRows={data.rows}
          onClose={closeModal}
          onSave={saveEquivalenze}
        />
      )}
    </div>
  )
}

interface ModalProps {
  row: Riga
  allRows: Riga[]
  onClose: () => void
  onSave: (next: string[]) => void
}

function EquivalenzeModal({ row, allRows, onClose, onSave }: ModalProps) {
  const [configured, setConfigured] = useState<string[]>(row.equivalenti)

  const available = useMemo(
    () => allRows
      .map(r => r.tipo)
      .filter(t => t !== row.tipo && !configured.includes(t)),
    [allRows, row.tipo, configured]
  )

  const add    = (tipo: string) => setConfigured(prev => [...prev, tipo])
  const remove = (tipo: string) => setConfigured(prev => prev.filter(t => t !== tipo))

  return (
    <div className="vincolo-matriosca__backdrop" onClick={onClose} role="presentation">
      <div
        className="vincolo-matriosca__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vm-modal-title"
      >
        <header className="vincolo-matriosca__modal-head">
          <h3 className="vincolo-matriosca__modal-title" id="vm-modal-title">
            Configura equivalenze {row.tipo}
          </h3>
          <button
            type="button"
            className="vincolo-matriosca__close"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <i className="fa-light fa-xmark" />
          </button>
        </header>

        <div className="vincolo-matriosca__columns">
          <section className="vincolo-matriosca__column">
            <h4 className="vincolo-matriosca__column-title">Equivalenze configurate</h4>
            <div className="vincolo-matriosca__chips">
              {configured.length === 0 ? (
                <div className="vincolo-matriosca__chips-empty">—</div>
              ) : configured.map(tipo => (
                <span key={tipo} className="vincolo-matriosca__chip">
                  <span>{tipo}</span>
                  <button
                    type="button"
                    className="vincolo-matriosca__chip-x"
                    onClick={() => remove(tipo)}
                    aria-label={`Rimuovi ${tipo}`}
                  >
                    <i className="fa-light fa-xmark" />
                  </button>
                </span>
              ))}
            </div>
          </section>

          <section className="vincolo-matriosca__column">
            <h4 className="vincolo-matriosca__column-title">Tipologie di camera</h4>
            <ul className="vincolo-matriosca__avail">
              {available.length === 0 ? (
                <li className="vincolo-matriosca__avail-empty">Nessuna tipologia disponibile</li>
              ) : available.map(tipo => (
                <li key={tipo} className="vincolo-matriosca__avail-row">
                  <span>{tipo}</span>
                  <button
                    type="button"
                    className="vincolo-matriosca__add"
                    onClick={() => add(tipo)}
                    aria-label={`Aggiungi ${tipo}`}
                  >
                    <i className="fa-light fa-plus" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="vincolo-matriosca__modal-foot">
          <button
            type="button"
            className="sib-btn sib-btn--secondary"
            onClick={onClose}
          >
            Chiudi
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={() => onSave(configured)}
          >
            Salva
          </button>
        </footer>
      </div>
    </div>
  )
}
