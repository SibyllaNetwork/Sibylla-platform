import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './Contratti.sass'

interface Tipo { Id: number; Nome: string }
interface Contratto { Id: number; Nome: string; Tipo: number; Dal: string; Al: string; File: string | null; AnnunciBacheca: boolean }
interface Data { tipi: Tipo[]; contratti: Contratto[] }

const FALLBACK: Data = {
  tipi: [{ Id: 1, Nome: 'Room Fit' }, { Id: 2, Nome: 'Room Gruppi' }, { Id: 3, Nome: 'Prodotti' }, { Id: 4, Nome: 'Servizi' }],
  contratti: [
    { Id: 18, Nome: '', Tipo: 1, Dal: '', Al: '', File: 'Condizionidivendita_GRU…', AnnunciBacheca: false },
    { Id: 17, Nome: '', Tipo: 2, Dal: '', Al: '', File: 'Condizionidivendita_GRU…', AnnunciBacheca: false },
  ],
}

const display = (n: string) => n === 'Room Fit' ? 'F.I.T' : n === 'Room Gruppi' ? 'Gruppi' : n
const fmt = (s: string) => s || '-'

export default function Contratti() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetContratti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const tipiToShow = active === 0 ? data.tipi : data.tipi.filter((t) => t.Id === active)

  return (
    <div className="contratti">
      <div className="contratti__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Contratti</strong>
      </div>

      <div className="contratti__form">
        <div className="contratti__field"><label>Nome contratto</label><input type="text" className="sib-input" /></div>
        <div className="contratti__field"><label>Tipologia</label>
          <select className="sib-select">{data.tipi.map((t) => <option key={t.Id} value={t.Id}>{t.Nome}</option>)}</select>
        </div>
        <div className="contratti__field"><label>Data inizio</label><input type="date" className="sib-input" /></div>
        <div className="contratti__field"><label>Data fine</label><input type="date" className="sib-input" /></div>
        <div className="contratti__field"><label>Upload contratto</label>
          <label className="contratti__upload">
            <span>Scegli file</span>
            <i className="fa-light fa-upload" />
            <input type="file" accept=".pdf,.doc,.docx" hidden />
          </label>
        </div>
        <button type="button" className="sib-btn sib-btn--primary"><i className="fa-light fa-circle-plus" /></button>
      </div>

      <div className="contratti__tabs">
        <button type="button" className={`sib-btn ${active === 0 ? 'sib-btn--primary' : 'sib-btn--secondary'}`} onClick={() => setActive(0)}>Tutti</button>
        {data.tipi.map((t) => (
          <button key={t.Id} type="button" className={`sib-btn ${active === t.Id ? 'sib-btn--primary' : 'sib-btn--secondary'}`} onClick={() => setActive(t.Id)}>
            {display(t.Nome)}
          </button>
        ))}
      </div>

      {tipiToShow.map((t) => {
        const rows = data.contratti.filter((c) => c.Tipo === t.Id)
        return (
          <div className="contratti__group" key={t.Id}>
            <h4>{display(t.Nome)}</h4>
            <table className="contratti__table">
              <thead><tr><th>ID</th><th>Nome</th><th>Dal</th><th>al</th><th>File</th><th>Annunci Bacheca</th><th /></tr></thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={7} className="contratti__empty">Nessun contratto.</td></tr> : rows.map((r) => (
                  <tr key={r.Id}>
                    <td>{r.Id || '-'}</td><td>{fmt(r.Nome)}</td><td>{fmt(r.Dal)}</td><td>{fmt(r.Al)}</td><td>{fmt(r.File || '')}</td>
                    <td><input type="checkbox" className="sib-checkbox" defaultChecked={r.AnnunciBacheca} /></td>
                    <td className="contratti__row-actions">
                      <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-pen" /></button>
                      <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
