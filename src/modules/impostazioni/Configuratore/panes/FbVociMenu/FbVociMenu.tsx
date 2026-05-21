import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './FbVociMenu.sass'

interface Voce { id: number; nome: string; gruppo: string }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Outlets: { Id: number; nome: string }[]
  OutletId: number | null
  Lingua: string
  Tipo: string
  Gruppo: string
  prezzoStandard: number
  iva: string
  voci: Voce[]
}

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Siracusa' }], StrutturaId: 1,
  Outlets: [], OutletId: null, Lingua: '', Tipo: 'Food', Gruppo: 'Antipasti',
  prezzoStandard: 0, iva: 'IVA 10% - beni e servizi agevolati', voci: [],
}

export default function FbVociMenu() {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFbVociMenu', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setData({ ...data, [k]: v })

  return (
    <div className="fb-voci-menu">
      <div className="fb-voci-menu__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> Food &amp; Beverage <i className="fa-light fa-chevron-right" /> <strong>Voci Menu</strong>
      </div>

      <div className="fb-voci-menu__form">
        <div className="fb-voci-menu__field"><label>Struttura</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => set('StrutturaId', e.target.value ? Number(e.target.value) : null)}>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="fb-voci-menu__field"><label>I miei Outlet</label>
          <select className="sib-select" value={data.OutletId ?? ''} onChange={(e) => set('OutletId', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Seleziona</option>
            {data.Outlets.map((o) => <option key={o.Id} value={o.Id}>{o.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="fb-voci-menu__form">
        <div className="fb-voci-menu__field"><label>Lingua</label>
          <select className="sib-select" value={data.Lingua} onChange={(e) => set('Lingua', e.target.value)}>
            <option value="">Seleziona</option>
            <option value="it">Italiano</option><option value="en">English</option><option value="fr">Français</option>
          </select>
        </div>
      </div>

      <div className="fb-voci-menu__form">
        <div className="fb-voci-menu__field"><label>Tipi</label>
          <select className="sib-select" value={data.Tipo} onChange={(e) => set('Tipo', e.target.value)}>
            <option value="Food">Food</option><option value="Beverage">Beverage</option>
          </select>
        </div>
        <div className="fb-voci-menu__field"><label>Gruppo</label>
          <select className="sib-select" value={data.Gruppo} onChange={(e) => set('Gruppo', e.target.value)}>
            <option value="Antipasti">Antipasti</option><option value="Primi">Primi</option><option value="Secondi">Secondi</option>
          </select>
        </div>
        <div className="fb-voci-menu__field"><label>Prezzo standard</label>
          <input type="number" step="0.01" className="sib-input" value={data.prezzoStandard} onChange={(e) => set('prezzoStandard', Number(e.target.value) || 0)} />
        </div>
        <div className="fb-voci-menu__field"><label>Iva</label>
          <select className="sib-select" value={data.iva} onChange={(e) => set('iva', e.target.value)}>
            <option value="IVA 10% - beni e servizi agevolati">IVA 10% - beni e servizi agevolati</option>
            <option value="IVA 22%">IVA 22%</option>
          </select>
        </div>
      </div>

      <h3 className="fb-voci-menu__section-title">Reparti di vendita</h3>
      <div className="fb-voci-menu__row-header"><span>Prezzo Standard</span></div>
      <div className="fb-voci-menu__add-row">
        <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-light fa-circle-plus" /> Aggiungi</button>
      </div>

      <div className="fb-voci-menu__table-wrap">
        <table className="fb-voci-menu__table">
          <thead><tr><th>Nome</th><th>Gruppo</th><th>Azioni</th></tr></thead>
          <tbody>
            {data.voci.length === 0
              ? <tr><td colSpan={3} className="fb-voci-menu__empty">Nessuna voce di menu configurata.</td></tr>
              : data.voci.map((v) => (
                <tr key={v.id}>
                  <td>{v.nome}</td><td>{v.gruppo}</td>
                  <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
