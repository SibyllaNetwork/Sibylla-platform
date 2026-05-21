import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './BarFit.sass'

const TIPI_CAMERA = [
  'Singola Classic',
  'Doppia Classic',
  'Doppia Economy',
  'Tripla Classic',
  'Matrimoniale convertibile in Tripla',
  'Matrimoniale Economy',
  'Matrimoniale Classic',
  'Doppia convertibile in Quadrupla',
  'Doppia convertibile in Tripla',
]

const COLONNE = [
  { key: 'bar',     label: 'Best available rate (B.A.R.)' },
  { key: 'ad1',     label: 'Adulto 1'      },
  { key: 'ad2',     label: 'Adulto 2'      },
  { key: 'ad3',     label: 'Adulto 3'      },
  { key: 'ad4',     label: 'Adulto 4'      },
  { key: 'adext',   label: 'Adulto extra'  },
  { key: 'bb1',     label: 'Bambino 1'     },
  { key: 'bb2',     label: 'Bambino 2'     },
  { key: 'bb3',     label: 'Bambino 3'     },
  { key: 'inf',     label: 'Infanti'       },
] as const

type ColKey = typeof COLONNE[number]['key']
type Matrix = Record<string, Partial<Record<ColKey, number>>>

interface Item { id: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Modalita: 'BAR' | 'FIT'
  bars: Item[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Modalita: 'BAR',
  bars: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })),
}

export default function BarFit() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [open, setOpen] = useState(false)
  const [viewId, setViewId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBarFit', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const modeLabel = data.Modalita === 'BAR' ? 'B.A.R.' : 'F.I.T.'

  return (
    <div className="bar-fit">
      <div className="bar-fit__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>B.A.R / F.I.T.</strong>
      </div>

      <div className="bar-fit__filters">
        <div className="bar-fit__field">
          <label>Strutture</label>
          <select
            className="sib-select sib-select--dense bar-fit__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Hotel Tutorial</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="bar-fit__field">
          <label>Tipologia</label>
          <div className="bar-fit__radio-group">
            <label className="bar-fit__radio-item">
              <input
                type="radio"
                className="sib-radio"
                checked={data.Modalita === 'BAR'}
                onChange={() => setData({ ...data, Modalita: 'BAR' })}
              />
              <span>B.A.R.</span>
            </label>
            <label className="bar-fit__radio-item">
              <input
                type="radio"
                className="sib-radio"
                checked={data.Modalita === 'FIT'}
                onChange={() => setData({ ...data, Modalita: 'FIT' })}
              />
              <span>F.I.T.</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          className="sib-btn sib-btn--secondary bar-fit__create-btn"
          onClick={() => setOpen(true)}
        >
          <i className="fa-light fa-circle-plus" />
          <span>Crea {modeLabel}</span>
        </button>
      </div>

      <div className="bar-fit__table-wrap">
        <table className="bar-fit__table">
          <thead>
            <tr>
              <th className="bar-fit__th--id">{modeLabel}</th>
              <th className="bar-fit__th--actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {data.bars.map((b) => (
              <tr key={b.id}>
                <td className="bar-fit__td bar-fit__td--id">{b.id}</td>
                <td className="bar-fit__td bar-fit__td--actions">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    aria-label={`Visualizza ${modeLabel} ${b.id}`}
                    onClick={() => setViewId(b.id)}
                  >
                    <i className="fa-light fa-eye" />
                  </button>
                  <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina">
                    <i className="fa-light fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <CreaBarModal
          modeLabel={modeLabel}
          onClose={() => setOpen(false)}
          onSave={async (_matrix) => {
            // TODO: chiamata API SetBarFit con matrix
            setOpen(false)
          }}
        />
      )}

      {viewId != null && (
        <DettaglioBarModal
          modeLabel={modeLabel}
          id={viewId}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  )
}

interface ModalProps {
  modeLabel: string
  onClose: () => void
  onSave: (matrix: Matrix) => void | Promise<void>
}

function CreaBarModal({ modeLabel, onClose, onSave }: ModalProps) {
  const [matrix, setMatrix] = useState<Matrix>({})

  const set = (tipo: string, key: ColKey, v: number) => {
    setMatrix(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], [key]: v },
    }))
  }

  const headers = useMemo(() => COLONNE, [])

  return (
    <div className="bar-fit__backdrop" onClick={onClose} role="presentation">
      <div
        className="bar-fit__modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bar-fit-modal-title"
      >
        <header className="bar-fit__modal-head">
          <h3 className="bar-fit__modal-title" id="bar-fit-modal-title">Crea {modeLabel}</h3>
          <button type="button" className="bar-fit__close" onClick={onClose} aria-label="Chiudi">
            <i className="fa-light fa-xmark" />
          </button>
        </header>

        <div className="bar-fit__modal-body">
          <p className="bar-fit__hint">
            Imposta una nuova best available rate che garantisce coerenza e competitività
          </p>

          <div className="bar-fit__matrix-wrap">
            <table className="bar-fit__matrix">
              <thead>
                <tr>
                  <th className="bar-fit__matrix-th--row" />
                  {headers.map(c => (
                    <th key={c.key} className="bar-fit__matrix-th">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIPI_CAMERA.map(tipo => (
                  <tr key={tipo}>
                    <td className="bar-fit__matrix-row-label">{tipo}</td>
                    {headers.map(c => (
                      <td key={c.key} className="bar-fit__matrix-cell">
                        <span className="bar-fit__cell">
                          <input
                            type="number"
                            step="0.01"
                            className="sib-input sib-input--dense bar-fit__matrix-input"
                            value={matrix[tipo]?.[c.key] ?? ''}
                            onChange={(e) => set(tipo, c.key, Number(e.target.value) || 0)}
                            aria-label={`${tipo} ${c.label}`}
                          />
                          <span className="bar-fit__unit">€</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bar-fit__modal-bar" aria-hidden="true" />

        <footer className="bar-fit__modal-foot">
          <button
            type="button"
            className="sib-btn sib-btn--secondary"
            onClick={onClose}
          >
            Annulla
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={() => onSave(matrix)}
          >
            Salva
          </button>
        </footer>
      </div>
    </div>
  )
}

// ─── Dettaglio (sola lettura) ───────────────────────────────────────────────
interface DettaglioRow {
  tipo: string
  individuale: number | null
  gruppo: number | null
  bambini: number | null
}

const DETTAGLIO_DEMO: DettaglioRow[] = [
  { tipo: 'Tripla Classic',                     individuale: null,   gruppo: null,   bambini: null },
  { tipo: 'DUS',                                individuale: 143.00, gruppo: null,   bambini: null },
  { tipo: 'Singola Classic',                    individuale: 110.00, gruppo: 110.00, bambini: null },
  { tipo: 'Doppia Classic',                     individuale: 172.00, gruppo: 172.00, bambini: null },
  { tipo: 'Matrimoniale convertibile in Tripla',individuale: 80.00,  gruppo: 90.00,  bambini: 0.00 },
  { tipo: 'Matrimoniale Superior',              individuale: 100.00, gruppo: 150.00, bambini: 0.00 },
]

interface DettaglioProps {
  modeLabel: string
  id: number
  onClose: () => void
}

function DettaglioBarModal({ modeLabel, id, onClose }: DettaglioProps) {
  const fmt = (v: number | null) => v == null ? '' : v.toFixed(2).replace('.', ',')

  return (
    <div className="bar-fit__backdrop" onClick={onClose} role="presentation">
      <div
        className="bar-fit__modal bar-fit__modal--view"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bar-fit-view-title"
      >
        <header className="bar-fit__modal-head">
          <h3 className="bar-fit__modal-title" id="bar-fit-view-title">
            Dettaglio {modeLabel} n: {id}
          </h3>
          <button type="button" className="bar-fit__close" onClick={onClose} aria-label="Chiudi">
            <i className="fa-light fa-xmark" />
          </button>
        </header>

        <div className="bar-fit__view-body">
          <table className="bar-fit__view-table">
            <thead>
              <tr>
                <th className="bar-fit__view-th--name">{modeLabel}</th>
                <th className="bar-fit__view-th--icon" aria-label="Individuale">
                  <i className="fa-light fa-user" />
                </th>
                <th className="bar-fit__view-th--icon" aria-label="Gruppo">
                  <i className="fa-light fa-user-group" />
                </th>
                <th className="bar-fit__view-th--icon" aria-label="Bambini">
                  <i className="fa-light fa-baby-carriage" />
                </th>
              </tr>
            </thead>
            <tbody>
              {DETTAGLIO_DEMO.map((r) => (
                <tr key={r.tipo}>
                  <td className="bar-fit__view-td bar-fit__view-td--name">{r.tipo}</td>
                  <td className="bar-fit__view-td bar-fit__view-td--num">{fmt(r.individuale)}</td>
                  <td className="bar-fit__view-td bar-fit__view-td--num">{fmt(r.gruppo)}</td>
                  <td className="bar-fit__view-td bar-fit__view-td--num">{fmt(r.bambini)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
