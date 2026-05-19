import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './VociIncasso.sass'

interface Voce { id: number; codice: string; descrizione: string; gruppo: string; commissioni: number; codFel: string; codScel: string }
interface Scadenza { id: number; descrizione: string; giorni: number; fineMese: boolean }
interface Data {
  voci: Voce[]
  scadenze: Scadenza[]
  gruppi: string[]
  codiciFel: string[]
}

const FALLBACK: Data = { voci: [], scadenze: [], gruppi: [], codiciFel: [] }
const EMPTY_VOCE = { codice: '', descrizione: '', gruppo: '', commissioni: 0, codFel: '', codScel: '' }
const EMPTY_SCAD = { descrizione: '', giorni: 0, fineMese: false }

export default function VociIncasso() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [voce, setVoce] = useState(EMPTY_VOCE)
  const [scad, setScad] = useState(EMPTY_SCAD)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetVociIncasso', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const addVoce = () => {
    if (!voce.codice.trim()) return
    setData({ ...data, voci: [...data.voci, { ...voce, id: Date.now() }] })
    setVoce(EMPTY_VOCE)
  }
  const addScad = () => {
    if (!scad.descrizione.trim()) return
    setData({ ...data, scadenze: [...data.scadenze, { ...scad, id: Date.now() }] })
    setScad(EMPTY_SCAD)
  }

  return (
    <div className="voci-incasso">
      <div className="voci-incasso__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Voci Incasso</strong>
      </div>

      <div className="voci-incasso__form">
        <div className="voci-incasso__field"><label>Codice Incasso</label>
          <input type="text" className="sib-input" value={voce.codice} onChange={(e) => setVoce({ ...voce, codice: e.target.value })} />
        </div>
        <div className="voci-incasso__field"><label>Descrizione</label>
          <input type="text" className="sib-input" value={voce.descrizione} onChange={(e) => setVoce({ ...voce, descrizione: e.target.value })} />
        </div>
      </div>

      <div className="voci-incasso__form">
        <div className="voci-incasso__field"><label>Gruppo</label>
          <select className="sib-select" value={voce.gruppo} onChange={(e) => setVoce({ ...voce, gruppo: e.target.value })}>
            <option value="">-- seleziona --</option>
            {data.gruppi.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="voci-incasso__field"><label>Commissioni</label>
          <div className="voci-incasso__cell">
            <input type="number" className="sib-input voci-incasso__short" value={voce.commissioni} onChange={(e) => setVoce({ ...voce, commissioni: Number(e.target.value) || 0 })} />
            <span>%</span>
          </div>
        </div>
        <div className="voci-incasso__field"><label>Cod. Fel</label>
          <select className="sib-select" value={voce.codFel} onChange={(e) => setVoce({ ...voce, codFel: e.target.value })}>
            <option value="">-- seleziona --</option>
            {data.codiciFel.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="voci-incasso__field"><label>Cod. Scel</label>
          <input type="text" className="sib-input" value={voce.codScel} onChange={(e) => setVoce({ ...voce, codScel: e.target.value })} />
        </div>
        <button type="button" className="sib-btn sib-btn--primary voci-incasso__add" onClick={addVoce}>
          <i className="fa-light fa-circle-plus" /> Aggiungi
        </button>
      </div>

      <table className="voci-incasso__table">
        <thead><tr><th>Codice Incasso</th><th>Descrizione</th><th>Gruppo</th><th>Commissioni</th><th>Cod. Fel</th><th>Cod. Scel</th><th>Azioni</th></tr></thead>
        <tbody>
          {data.voci.length === 0
            ? <tr><td colSpan={7} className="voci-incasso__empty">Nessuna voce di incasso configurata.</td></tr>
            : data.voci.map((v) => (
              <tr key={v.id}>
                <td>{v.codice}</td><td>{v.descrizione}</td><td>{v.gruppo}</td><td>{v.commissioni}%</td><td>{v.codFel}</td><td>{v.codScel}</td>
                <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button></td>
              </tr>
            ))}
        </tbody>
      </table>

      <h3 className="voci-incasso__section-title"><i className="fa-light fa-clock-rotate-left" /> Scadenze Sospesi</h3>
      <div className="voci-incasso__form">
        <div className="voci-incasso__field"><label>Descrizione sospensione</label>
          <input type="text" className="sib-input" placeholder="Es. 30 giorni" value={scad.descrizione} onChange={(e) => setScad({ ...scad, descrizione: e.target.value })} />
        </div>
        <div className="voci-incasso__field"><label>Valore giorni</label>
          <input type="number" className="sib-input voci-incasso__short" value={scad.giorni || ''} onChange={(e) => setScad({ ...scad, giorni: Number(e.target.value) || 0 })} />
        </div>
        <div className="voci-incasso__field"><label>Fine Mese</label>
          <label className="voci-incasso__toggle">
            <input type="checkbox" checked={scad.fineMese} onChange={(e) => setScad({ ...scad, fineMese: e.target.checked })} />
            <span className="voci-incasso__slider" />
          </label>
        </div>
        <button type="button" className="sib-btn sib-btn--primary voci-incasso__add" onClick={addScad}>
          <i className="fa-light fa-circle-plus" /> Aggiungi Scadenza
        </button>
      </div>

      <h3 className="voci-incasso__section-title"><i className="fa-light fa-clock-rotate-left" /> Scadenze Sospesi configurate</h3>
      <table className="voci-incasso__table">
        <thead><tr><th>Descrizione</th><th>Giorni</th><th>Fine Mese</th><th>Azioni</th></tr></thead>
        <tbody>
          {data.scadenze.length === 0
            ? <tr><td colSpan={4} className="voci-incasso__empty">Nessuna scadenza configurata.</td></tr>
            : data.scadenze.map((s) => (
              <tr key={s.id}>
                <td>{s.descrizione}</td><td>{s.giorni}</td><td>{s.fineMese ? 'Sì' : 'No'}</td>
                <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
