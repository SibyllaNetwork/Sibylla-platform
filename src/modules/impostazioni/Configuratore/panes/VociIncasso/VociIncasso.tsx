import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
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
        <InputField name="codice" label="Codice Incasso" className="voci-incasso__field" value={voce.codice} onChange={(e) => setVoce({ ...voce, codice: e.target.value })} />
        <InputField name="descrizione" label="Descrizione" className="voci-incasso__field" value={voce.descrizione} onChange={(e) => setVoce({ ...voce, descrizione: e.target.value })} />
      </div>

      <div className="voci-incasso__form">
        <SelectField
          name="gruppo"
          label="Gruppo"
          className="voci-incasso__field"
          placeholder="-- seleziona --"
          value={voce.gruppo}
          onChange={(e) => setVoce({ ...voce, gruppo: e.target.value })}
          options={data.gruppi.map((g) => ({ value: g, label: g }))}
        />
        <InputField name="commissioni" label="Commissioni" type="number" className="voci-incasso__field voci-incasso__short" iconRight="fa-light fa-percent" value={voce.commissioni} onChange={(e) => setVoce({ ...voce, commissioni: Number(e.target.value) || 0 })} />
        <SelectField
          name="codFel"
          label="Cod. Fel"
          className="voci-incasso__field"
          placeholder="-- seleziona --"
          value={voce.codFel}
          onChange={(e) => setVoce({ ...voce, codFel: e.target.value })}
          options={data.codiciFel.map((c) => ({ value: c, label: c }))}
        />
        <InputField name="codScel" label="Cod. Scel" className="voci-incasso__field" value={voce.codScel} onChange={(e) => setVoce({ ...voce, codScel: e.target.value })} />
        <button type="button" className="sib-btn sib-btn--primary voci-incasso__add" onClick={addVoce}>
          <i className="fa-light fa-circle-plus" /> Aggiungi
        </button>
      </div>

      <div className="voci-incasso__table-wrap">
        <table className="voci-incasso__table">
          <thead><tr><th>Codice Incasso</th><th>Descrizione</th><th>Gruppo</th><th>Commissioni</th><th>Cod. Fel</th><th>Cod. Scel</th><th>Azioni</th></tr></thead>
          <tbody>
            {data.voci.length === 0
              ? <tr><td colSpan={7} className="voci-incasso__empty">Nessuna voce di incasso configurata.</td></tr>
              : data.voci.map((v) => (
                <tr key={v.id}>
                  <td>{v.codice}</td><td>{v.descrizione}</td><td>{v.gruppo}</td><td>{v.commissioni}%</td><td>{v.codFel}</td><td>{v.codScel}</td>
                  <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-trash" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <h3 className="voci-incasso__section-title"><i className="fa-light fa-clock-rotate-left" /> Scadenze Sospesi</h3>
      <div className="voci-incasso__form">
        <InputField name="scadDescrizione" label="Descrizione sospensione" className="voci-incasso__field" placeholder="Es. 30 giorni" value={scad.descrizione} onChange={(e) => setScad({ ...scad, descrizione: e.target.value })} />
        <InputField name="scadGiorni" label="Valore giorni" type="number" className="voci-incasso__field voci-incasso__short" value={scad.giorni || ''} onChange={(e) => setScad({ ...scad, giorni: Number(e.target.value) || 0 })} />
        <div className="voci-incasso__field">
          <span className="voci-incasso__field-label">Fine Mese</span>
          <ToggleSwitch checked={scad.fineMese} onChange={(checked) => setScad({ ...scad, fineMese: checked })} />
        </div>
        <button type="button" className="sib-btn sib-btn--primary voci-incasso__add" onClick={addScad}>
          <i className="fa-light fa-circle-plus" /> Aggiungi Scadenza
        </button>
      </div>

      <h3 className="voci-incasso__section-title"><i className="fa-light fa-clock-rotate-left" /> Scadenze Sospesi configurate</h3>
      <div className="voci-incasso__table-wrap">
        <table className="voci-incasso__table">
          <thead><tr><th>Descrizione</th><th>Giorni</th><th>Fine Mese</th><th>Azioni</th></tr></thead>
          <tbody>
            {data.scadenze.length === 0
              ? <tr><td colSpan={4} className="voci-incasso__empty">Nessuna scadenza configurata.</td></tr>
              : data.scadenze.map((s) => (
                <tr key={s.id}>
                  <td>{s.descrizione}</td><td>{s.giorni}</td><td>{s.fineMese ? 'Sì' : 'No'}</td>
                  <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-trash" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
