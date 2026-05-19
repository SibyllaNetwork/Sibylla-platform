import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './FbAllergeni.sass'

interface Allergene { id: number; nome: string; descrizione: string }
interface Data { allergeni: Allergene[] }

const FALLBACK: Data = {
  allergeni: [
    { id: 1, nome: 'Cereali',         descrizione: 'contenenti glutine e prodotti derivati (grano, segale, orzo, avena, farro, kamut)' },
    { id: 2, nome: 'Crostacei',       descrizione: 'e prodotti a base di crostacei' },
    { id: 3, nome: 'Uova',            descrizione: 'e prodotti a base di uova' },
    { id: 4, nome: 'Pesce',           descrizione: 'e prodotti a base di pesce' },
    { id: 5, nome: 'Arachidi',        descrizione: 'e prodotti a base di arachidi' },
    { id: 6, nome: 'Soia',            descrizione: 'e prodotti a base di soia' },
    { id: 7, nome: 'Latte',           descrizione: 'e prodotti a base di latte' },
    { id: 8, nome: 'Frutta a guscio', descrizione: 'e loro prodotti (mandorle, nocciole, noci, noci di acagiù, di pecan, del Brasile, pistacchi, noci macadamia)' },
    { id: 9, nome: 'Sedano',          descrizione: 'e prodotti a base di sedano' },
    { id: 10, nome: 'Senape',         descrizione: 'e prodotti a base di senape' },
    { id: 11, nome: 'Semi di sesamo', descrizione: 'e prodotti a base di sesamo' },
    { id: 12, nome: 'Solfiti',        descrizione: 'in concentrazione superiore a 10 mg/kg' },
    { id: 13, nome: 'Lupini',         descrizione: 'e prodotti a base di lupini' },
    { id: 14, nome: 'Molluschi',      descrizione: 'e prodotti a base di molluschi' },
  ],
}

export default function FbAllergeni() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [nome, setNome] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFbAllergeni', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const add = () => {
    if (!nome.trim()) return
    setData({ allergeni: [...data.allergeni, { id: Date.now(), nome, descrizione: desc }] })
    setNome(''); setDesc('')
  }

  return (
    <div className="fb-allergeni">
      <div className="fb-allergeni__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> Food &amp; Beverage <i className="fa-light fa-chevron-right" /> <strong>Allergeni</strong>
      </div>

      <div className="fb-allergeni__form">
        <div className="fb-allergeni__field"><label>Nome allergene</label>
          <input type="text" className="sib-input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="fb-allergeni__field fb-allergeni__field--lg"><label>Descrizione allergene</label>
          <input type="text" className="sib-input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <button type="button" className="sib-btn sib-btn--primary" onClick={add}><i className="fa-light fa-circle-plus" /> Aggiungi</button>
      </div>

      <ul className="fb-allergeni__list">
        {data.allergeni.map((a) => (
          <li key={a.id}>
            <strong>{a.nome}</strong> <span>{a.descrizione}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
