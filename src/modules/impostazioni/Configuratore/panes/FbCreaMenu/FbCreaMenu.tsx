import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './FbCreaMenu.sass'

interface Piatto { id: number; nome: string; descrizione: string; foodCost: number; prezzo: number; margine: number; gruppo: string; selected?: boolean }
interface Data {
  Outlets: { Id: number; nome: string }[]
  OutletId: number | null
  piatti: Piatto[]
}

const FALLBACK: Data = {
  Outlets: [{ Id: 1, nome: 'Ristorante' }], OutletId: 1,
  piatti: [
    { id: 1, nome: 'Carbonara', descrizione: 'Mezze maniche 80gr, Guanciale 15gr, 1 tuorlo, 10gr Pecorino', foodCost: 3.0, prezzo: 16.50, margine: 30, gruppo: 'Primo Piatto' },
  ],
}

export default function FbCreaMenu() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [nomeMenu, setNomeMenu] = useState('')
  const [menuFisso, setMenuFisso] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFbCreaMenu', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const toggle = (id: number) => setData({ ...data, piatti: data.piatti.map((p) => p.id === id ? { ...p, selected: !p.selected } : p) })
  const totale = data.piatti.filter((p) => p.selected).reduce((s, p) => s + p.prezzo, 0)

  return (
    <div className="fb-crea-menu">
      <div className="fb-crea-menu__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> Food &amp; Beverage <i className="fa-light fa-chevron-right" /> <strong>Crea Menu</strong>
      </div>

      <div className="fb-crea-menu__form">
        <div className="fb-crea-menu__field"><label>I miei outlet</label>
          <select className="sib-select" value={data.OutletId ?? ''} onChange={(e) => setData({ ...data, OutletId: e.target.value ? Number(e.target.value) : null })}>
            {data.Outlets.map((o) => <option key={o.Id} value={o.Id}>{o.nome}</option>)}
          </select>
        </div>
        <div className="fb-crea-menu__field"><label>Nome menu</label>
          <input type="text" className="sib-input" value={nomeMenu} onChange={(e) => setNomeMenu(e.target.value)} />
        </div>
        <label className="fb-crea-menu__check">
          <input type="checkbox" className="sib-checkbox" checked={menuFisso} onChange={(e) => setMenuFisso(e.target.checked)} />
          <span>Menu Fisso</span>
        </label>
        <div className="fb-crea-menu__field"><label>Prezzo vendita</label>
          <div className="fb-crea-menu__price-cell">
            <input type="text" className="sib-input" value={`${totale.toFixed(2).replace('.', ',')} €`} disabled />
            <button type="button" className="sib-btn sib-btn--primary">Crea</button>
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-light fa-calendar-lines-pen" /> Lista Menu</button>
      </div>

      <div className="fb-crea-menu__form">
        <div className="fb-crea-menu__field"><label>Piatto</label>
          <select className="sib-select"><option>Seleziona piatto</option></select>
        </div>
        <div className="fb-crea-menu__field"><label>Descrizione</label>
          <input type="text" className="sib-input" />
        </div>
        <button type="button" className="sib-btn sib-btn--primary"><i className="fa-light fa-plus" /> Aggiungi</button>
      </div>

      <div className="fb-crea-menu__table-wrap">
        <table className="fb-crea-menu__table">
          <thead><tr><th /><th>Nome</th><th>Descrizione</th><th>Food cost</th><th>Prezzo</th><th>Margine</th><th>Gruppo</th><th /></tr></thead>
          <tbody>
            {data.piatti.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" className="sib-checkbox" checked={p.selected ?? false} onChange={() => toggle(p.id)} /></td>
                <td>{p.nome}</td><td>{p.descrizione}</td>
                <td>{p.foodCost.toFixed(2).replace('.', ',')} €</td>
                <td>{p.prezzo.toFixed(2).replace('.', ',')} €</td>
                <td>{p.margine}%</td><td>{p.gruppo}</td>
                <td className="fb-crea-menu__row-actions">
                  <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-pen" /></button>
                  <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fb-crea-menu__actions">
        <button type="button" className="sib-btn sib-btn--primary">Salva</button>
      </div>
    </div>
  )
}
