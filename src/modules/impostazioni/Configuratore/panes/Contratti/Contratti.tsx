import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './Contratti.sass'

interface Tipo { Id: number; Nome: string }
interface Contratto {
  Id: number; Nome: string; Tipo: number;
  Dal: string; Al: string; File: string | null;
  AnnunciBacheca: boolean;
}
interface Data { tipi: Tipo[]; contratti: Contratto[] }

const FALLBACK: Data = {
  tipi: [
    { Id: 1, Nome: 'Room Fit'    },
    { Id: 2, Nome: 'Room Gruppi' },
    { Id: 3, Nome: 'Prodotti'    },
    { Id: 4, Nome: 'Servizi'     },
  ],
  contratti: [
    { Id: 39, Nome: '',              Tipo: 1, Dal: '',            Al: '',            File: 'Sibylla_Gestisci_prenotazioni.pdf', AnnunciBacheca: false },
    { Id: 29, Nome: 'Test20',        Tipo: 2, Dal: '01/02/2026',  Al: '31/07/2026',  File: 'test2.pdf',                          AnnunciBacheca: true  },
    { Id: 33, Nome: 'Test Gruppi 22',Tipo: 2, Dal: '01/05/2026',  Al: '30/11/2026',  File: 'Final exam-30June25.pdf',            AnnunciBacheca: true  },
  ],
}

const display = (n: string) => n === 'Room Fit' ? 'F.I.T' : n === 'Room Gruppi' ? 'Gruppi' : n
const fmt = (s: string | null | undefined) => s && s.length ? s : '-'

export default function Contratti() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [active, setActive] = useState(0)
  const [nome, setNome] = useState('')
  const [tipologia, setTipologia] = useState(1)
  const [dateRange, setDateRange] = useState('01/05/2026 - 31/05/2026')
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetContratti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const tipiToShow = useMemo(
    () => active === 0 ? data.tipi : data.tipi.filter((t) => t.Id === active),
    [data.tipi, active]
  )

  return (
    <div className="contratti">
      <div className="contratti__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Contratti</strong>
      </div>

      <div className="contratti__filters">
        <div className="contratti__field">
          <label>Nome contratto</label>
          <input
            type="text"
            className="sib-input sib-input--dense contratti__input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="contratti__field">
          <label>Tipologia</label>
          <select
            className="sib-select sib-select--dense contratti__input contratti__input--select"
            value={tipologia}
            onChange={(e) => setTipologia(Number(e.target.value))}
          >
            {data.tipi.map((t) => <option key={t.Id} value={t.Id}>{display(t.Nome)}</option>)}
          </select>
        </div>
        <div className="contratti__field">
          <label>Data</label>
          <input
            type="text"
            className="sib-input sib-input--dense contratti__input"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            placeholder="gg/mm/aaaa - gg/mm/aaaa"
          />
        </div>
        <div className="contratti__field">
          <label>Upload contratto</label>
          <label className="contratti__upload">
            <span className="contratti__upload-name">{fileName || ' '}</span>
            <i className="fa-light fa-arrow-up-from-bracket" aria-hidden="true" />
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </label>
        </div>
        <button
          type="button"
          className="contratti__add"
          aria-label="Aggiungi contratto"
          title="Aggiungi contratto"
        >
          <i className="fa-light fa-plus" />
        </button>
      </div>

      <div className="contratti__tabs" role="tablist">
        <TabBtn label="Tutti"       active={active === 0} onClick={() => setActive(0)} />
        {data.tipi.map((t) => (
          <TabBtn
            key={t.Id}
            label={display(t.Nome)}
            active={active === t.Id}
            onClick={() => setActive(t.Id)}
          />
        ))}
      </div>

      {tipiToShow.map((t) => {
        const rows = data.contratti.filter((c) => c.Tipo === t.Id)
        if (rows.length === 0 && active !== 0) return (
          <div className="contratti__group" key={t.Id}>
            <h4 className="contratti__group-title">{display(t.Nome)}</h4>
            <div className="contratti__empty">Nessun contratto.</div>
          </div>
        )
        if (rows.length === 0) return null

        return (
          <div className="contratti__group" key={t.Id}>
            <h4 className="contratti__group-title">{display(t.Nome)}</h4>
            <div className="contratti__table-wrap">
              <table className="contratti__table">
                <thead>
                  <tr>
                    <th className="contratti__th--id">ID</th>
                    <th>Nome</th>
                    <th className="contratti__th--date">Dal</th>
                    <th className="contratti__th--date">al</th>
                    <th>File</th>
                    <th className="contratti__th--center">Annuci Bacheca</th>
                    <th className="contratti__th--actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.Id}>
                      <td className="contratti__td contratti__td--id">{r.Id || '-'}</td>
                      <td className="contratti__td">{fmt(r.Nome)}</td>
                      <td className="contratti__td">{fmt(r.Dal)}</td>
                      <td className="contratti__td">{fmt(r.Al)}</td>
                      <td className="contratti__td contratti__td--file">{fmt(r.File)}</td>
                      <td className="contratti__td contratti__td--center">
                        <input
                          type="checkbox"
                          className="sib-checkbox contratti__checkbox"
                          defaultChecked={r.AnnunciBacheca}
                          aria-label={`Annunci Bacheca contratto ${r.Id}`}
                        />
                      </td>
                      <td className="contratti__td contratti__td--actions">
                        <button type="button" className="sib-btn sib-btn--icon sib-btn--sm contratti__icon-btn" title="Modifica" aria-label="Modifica">
                          <i className="fa-light fa-pen" />
                        </button>
                        <button type="button" className="sib-btn sib-btn--icon sib-btn--sm contratti__icon-btn contratti__icon-btn--del" title="Elimina" aria-label="Elimina">
                          <i className="fa-light fa-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {tipiToShow.length > 0 && tipiToShow.every(t => data.contratti.filter(c => c.Tipo === t.Id).length === 0) && active !== 0 && (
        null /* handled per-group above */
      )}
    </div>
  )
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={'contratti__tab' + (active ? ' contratti__tab--active' : '')}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
