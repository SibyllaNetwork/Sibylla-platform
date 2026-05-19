import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './BarFit.sass'

const TIPI_CAMERA = [
  'Singola Classic','Doppia Classic','Doppia Economy','Tripla Classic',
  'Matrimoniale convertibile in Tripla','Matrimoniale Economy','Matrimoniale Classic',
  'Doppia convertibile in Quadrupla','Doppia convertibile in Tripla',
]
const COLONNE = ['Best available rate (B.A.R.)','Adulto 1','Adulto 2','Adulto 3','Adulto 4','Adulto extra','Bambino 1','Bambino 2','Bambino 3','Infanti']

interface Item { id: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Modalita: 'BAR' | 'FIT'
  bars: Item[]
}

const FALLBACK: Data = { Strutture: [], StrutturaId: null, Modalita: 'BAR', bars: Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })) }

export default function BarFit() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBarFit', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="bar-fit">
      <div className="bar-fit__breadcrumb">
        <span>Configuratore <i className="fa-light fa-chevron-right" /> <strong>B.A.R / F.I.T.</strong></span>
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setOpen(true)}>
          <i className="fa-light fa-circle-plus" /> Crea {data.Modalita === 'BAR' ? 'B.A.R.' : 'F.I.T.'}
        </button>
      </div>

      <div className="bar-fit__bar">
        <div className="bar-fit__field">
          <label>Strutture</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Siracusa</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="bar-fit__radio-group">
          <label className="bar-fit__radio-item">
            <input type="radio" className="sib-radio" checked={data.Modalita === 'BAR'} onChange={() => setData({ ...data, Modalita: 'BAR' })} />
            <span>B.A.R.</span>
          </label>
          <label className="bar-fit__radio-item">
            <input type="radio" className="sib-radio" checked={data.Modalita === 'FIT'} onChange={() => setData({ ...data, Modalita: 'FIT' })} />
            <span>F.I.T.</span>
          </label>
        </div>
      </div>

      <table className="bar-fit__table">
        <thead><tr><th>{data.Modalita === 'BAR' ? 'B.A.R.' : 'F.I.T.'}</th><th>Azioni</th></tr></thead>
        <tbody>
          {data.bars.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td className="bar-fit__row-actions">
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-eye" /></button>
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <div className="bar-fit__modal-backdrop" onClick={() => setOpen(false)}>
          <div className="bar-fit__modal" onClick={(e) => e.stopPropagation()}>
            <div className="bar-fit__modal-header">
              <h3>Crea {data.Modalita === 'BAR' ? 'B.A.R.' : 'F.I.T.'}</h3>
              <button type="button" className="bar-fit__close" onClick={() => setOpen(false)}><i className="fa-light fa-xmark" /></button>
            </div>
            <p className="bar-fit__hint">Imposta una nuova best available rate che garantisce coerenza e competitività</p>
            <div className="bar-fit__matrix-wrap">
              <table className="bar-fit__matrix">
                <thead>
                  <tr>{COLONNE.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {TIPI_CAMERA.map((tc) => (
                    <tr key={tc}>
                      <td className="bar-fit__row-label">{tc}</td>
                      {COLONNE.slice(1).map((c) => (
                        <td key={c}>
                          <div className="bar-fit__cell">
                            <input type="number" className="sib-input bar-fit__input" />
                            <span>€</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bar-fit__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setOpen(false)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary">Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
