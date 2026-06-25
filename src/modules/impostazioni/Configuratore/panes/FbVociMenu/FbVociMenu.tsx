import React, { useEffect, useState } from 'react'
import { InputField, SelectField } from '../../../../../core/components/form'
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
        <SelectField
          name="struttura" label="Struttura" className="fb-voci-menu__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => set('StrutturaId', e.target.value ? Number(e.target.value) : null)}
          options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
        />
        <SelectField
          name="outlet" label="I miei Outlet" className="fb-voci-menu__field"
          placeholder="Seleziona"
          value={data.OutletId ?? ''}
          onChange={(e) => set('OutletId', e.target.value ? Number(e.target.value) : null)}
          options={data.Outlets.map((o) => ({ value: o.Id, label: o.nome }))}
        />
      </div>

      <div className="fb-voci-menu__form">
        <SelectField
          name="lingua" label="Lingua" className="fb-voci-menu__field"
          placeholder="Seleziona"
          value={data.Lingua}
          onChange={(e) => set('Lingua', e.target.value)}
          options={[
            { value: 'it', label: 'Italiano' },
            { value: 'en', label: 'English' },
            { value: 'fr', label: 'Français' },
          ]}
        />
      </div>

      <div className="fb-voci-menu__form">
        <SelectField
          name="tipo" label="Tipi" className="fb-voci-menu__field"
          value={data.Tipo}
          onChange={(e) => set('Tipo', e.target.value)}
          options={[
            { value: 'Food', label: 'Food' },
            { value: 'Beverage', label: 'Beverage' },
          ]}
        />
        <SelectField
          name="gruppo" label="Gruppo" className="fb-voci-menu__field"
          value={data.Gruppo}
          onChange={(e) => set('Gruppo', e.target.value)}
          options={[
            { value: 'Antipasti', label: 'Antipasti' },
            { value: 'Primi', label: 'Primi' },
            { value: 'Secondi', label: 'Secondi' },
          ]}
        />
        <InputField
          name="prezzoStandard" label="Prezzo standard" type="number" step={0.01} className="fb-voci-menu__field"
          value={data.prezzoStandard}
          onChange={(e) => set('prezzoStandard', Number(e.target.value) || 0)}
        />
        <SelectField
          name="iva" label="Iva" className="fb-voci-menu__field"
          value={data.iva}
          onChange={(e) => set('iva', e.target.value)}
          options={[
            { value: 'IVA 10% - beni e servizi agevolati', label: 'IVA 10% - beni e servizi agevolati' },
            { value: 'IVA 22%', label: 'IVA 22%' },
          ]}
        />
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
