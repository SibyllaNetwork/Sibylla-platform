import React, { useEffect, useState } from 'react'
import { InputField, SelectField } from '../../../../../core/components/form'
import { apiFetchSibylla } from '../../../../../services/api'
import './FbGestioneCosti.sass'

type Frequenza = 'Mensile' | 'Bimestrale' | 'Trimestrale' | 'Semestrale' | 'Annuale'
const FREQ: Frequenza[] = ['Mensile','Bimestrale','Trimestrale','Semestrale','Annuale']
const DIV: Record<Frequenza, number> = { Mensile: 1, Bimestrale: 2, Trimestrale: 3, Semestrale: 6, Annuale: 12 }

interface Costo { id: number; descrizione: string; importo: number; frequenza: Frequenza }
interface Data { costi: Costo[] }
const FALLBACK: Data = { costi: [] }

export default function FbGestioneCosti() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [draft, setDraft] = useState<Omit<Costo, 'id'>>({ descrizione: '', importo: 0, frequenza: 'Mensile' })

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFbGestioneCosti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const add = () => {
    if (!draft.descrizione.trim() || draft.importo <= 0) return
    setData({ costi: [...data.costi, { ...draft, id: Date.now() }] })
    setDraft({ descrizione: '', importo: 0, frequenza: 'Mensile' })
  }

  return (
    <div className="fb-gestione-costi">
      <div className="fb-gestione-costi__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> Food &amp; Beverage <i className="fa-light fa-chevron-right" /> <strong>Gestione costi</strong>
      </div>

      <div className="fb-gestione-costi__form">
        <InputField
          name="descrizione" label="Descrizione" className="fb-gestione-costi__field"
          value={draft.descrizione}
          onChange={(e) => setDraft({ ...draft, descrizione: e.target.value })}
        />
        <InputField
          name="importo" label="Importo" type="number" step={0.01} iconLeft="fa-light fa-euro-sign" className="fb-gestione-costi__field"
          value={draft.importo || ''}
          onChange={(e) => setDraft({ ...draft, importo: Number(e.target.value) || 0 })}
        />
        <SelectField
          name="frequenza" label="Frequenza" className="fb-gestione-costi__field"
          value={draft.frequenza}
          onChange={(e) => setDraft({ ...draft, frequenza: e.target.value as Frequenza })}
          options={FREQ.map((f) => ({ value: f, label: f }))}
        />
        <button type="button" className="sib-btn sib-btn--primary" onClick={add}><i className="fa-light fa-plus" /> Aggiungi</button>
      </div>

      <div className="fb-gestione-costi__table-wrap">
        <table className="fb-gestione-costi__table">
          <thead><tr><th /><th>Descrizione</th><th>Importo</th><th>Frequenza</th><th>Costo Mensile Stimato (€)</th><th>Azioni</th></tr></thead>
          <tbody>
            {data.costi.length === 0
              ? <tr><td colSpan={6} className="fb-gestione-costi__empty">Nessun costo configurato.</td></tr>
              : data.costi.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td><td>{c.descrizione}</td>
                  <td>{c.importo.toFixed(2).replace('.', ',')} €</td>
                  <td>{c.frequenza}</td>
                  <td>{(c.importo / DIV[c.frequenza]).toFixed(2).replace('.', ',')}</td>
                  <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-solid fa-trash" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
