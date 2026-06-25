import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField } from '../../../../../core/components/form'
import './ConfiguraOutlet.sass'

interface Sala { id: number; nome: string; tavoli: number; pax: number; attivo: boolean }
interface Turno { id: number; nome: string; servizio: string; dalle: string; alle: string; sale: string[]; attivo: boolean }
interface Data {
  Outlet: { Id: number; nome: string }[]
  OutletId: number | null
  sale: Sala[]
  turniEnabled: boolean
  turni: Turno[]
}

const FALLBACK: Data = {
  Outlet: [{ Id: 1, nome: 'Ristorante Hotel Cristallo' }],
  OutletId: 1,
  sale: [{ id: 1, nome: 'Melissa', tavoli: 50, pax: 200, attivo: false }],
  turniEnabled: false,
  turni: [{ id: 1, nome: '1 Feriali Estivo', servizio: 'Pranzo', dalle: '13:00', alle: '14:00', sale: ['Melissa','Marcella','Eleonora'], attivo: false }],
}

const SERVIZI = ['Colazione', 'Pranzo', 'Cena']

export default function ConfiguraOutlet() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [showAddSala, setShowAddSala] = useState(false)
  const [newSala, setNewSala] = useState({ nome: '', tavoli: '', pax: '' })

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetConfiguraOutlet', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const confirmSala = () => {
    if (!newSala.nome.trim()) return
    const nextId = (data.sale.reduce((max, s) => Math.max(max, s.id), 0) || 0) + 1
    setData({
      ...data,
      sale: [
        ...data.sale,
        {
          id: nextId,
          nome: newSala.nome.trim(),
          tavoli: Number(newSala.tavoli) || 0,
          pax: Number(newSala.pax) || 0,
          attivo: true,
        },
      ],
    })
    setNewSala({ nome: '', tavoli: '', pax: '' })
    setShowAddSala(false)
  }

  return (
    <div className="configura-outlet">
      <div className="configura-outlet__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Configura Outlet</strong>
      </div>

      <SelectField
        name="miei-outlet"
        label="I miei outlet"
        className="configura-outlet__field"
        value={data.OutletId ?? ''}
        onChange={(e) => setData({ ...data, OutletId: e.target.value ? Number(e.target.value) : null })}
        options={data.Outlet.map((o) => ({ value: o.Id, label: o.nome }))}
      />

      <h3 className="configura-outlet__section-title">Configura Sale</h3>
      <button
        type="button"
        className="sib-btn sib-btn--secondary configura-outlet__add"
        onClick={() => setShowAddSala((v) => !v)}
      >
        <i className="fa-light fa-circle-plus" /> Aggiungi Sala
      </button>

      {showAddSala && (
        <div className="configura-outlet__add-form">
          <div className="configura-outlet__field">
            <label>Nome Sala</label>
            <input
              type="text"
              className="sib-input sib-input--dense"
              value={newSala.nome}
              onChange={(e) => setNewSala({ ...newSala, nome: e.target.value })}
              autoFocus
            />
          </div>
          <div className="configura-outlet__field">
            <label>Tavoli Sala</label>
            <input
              type="number"
              className="sib-input sib-input--dense configura-outlet__add-num"
              value={newSala.tavoli}
              onChange={(e) => setNewSala({ ...newSala, tavoli: e.target.value })}
            />
          </div>
          <div className="configura-outlet__field">
            <label>Pax Sala</label>
            <input
              type="number"
              className="sib-input sib-input--dense configura-outlet__add-num"
              value={newSala.pax}
              onChange={(e) => setNewSala({ ...newSala, pax: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={confirmSala}
            disabled={!newSala.nome.trim()}
          >
            Conferma
          </button>
        </div>
      )}
      <div className="configura-outlet__table-wrap"><table className="configura-outlet__table">
        <thead><tr><th /><th>Nome</th><th>Tavoli</th><th>Pax</th><th>Azioni</th></tr></thead>
        <tbody>
          {data.sale.map((s) => (
            <tr key={s.id}>
              <td>
                <label className="configura-outlet__toggle">
                  <input type="checkbox" checked={s.attivo} onChange={(e) => setData({ ...data, sale: data.sale.map((x) => x.id === s.id ? { ...x, attivo: e.target.checked } : x) })} />
                  <span className="configura-outlet__slider" />
                </label>
              </td>
              <td>{s.nome}</td><td>{s.tavoli}</td><td>{s.pax}</td>
              <td className="configura-outlet__actions-cell">
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-pen" /></button>
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h3 className="configura-outlet__section-title configura-outlet__section-title--toggle">
        Turni
        <label className="configura-outlet__toggle">
          <input type="checkbox" checked={data.turniEnabled} onChange={(e) => setData({ ...data, turniEnabled: e.target.checked })} />
          <span className="configura-outlet__slider" />
        </label>
      </h3>

      {data.turniEnabled && (
        <>
          <div className="configura-outlet__form">
            <InputField name="nome-turno" label="Nome Turno" className="configura-outlet__field" />
            <SelectField
              name="servizio"
              label="Servizio"
              className="configura-outlet__field"
              options={SERVIZI.map((s) => ({ value: s, label: s }))}
            />
            <div className="configura-outlet__field"><label>Dalle ore</label><input type="time" className="sib-input" /></div>
            <div className="configura-outlet__field"><label>Alle ore</label><input type="time" className="sib-input" /></div>
            <SelectField
              name="sale"
              label="Sale"
              className="configura-outlet__field"
              options={data.sale.map((s) => ({ value: s.id, label: s.nome }))}
            />
            <button type="button" className="sib-btn sib-btn--secondary configura-outlet__add"><i className="fa-light fa-circle-plus" /> Aggiungi Turno</button>
          </div>

          <div className="configura-outlet__table-wrap"><table className="configura-outlet__table">
            <thead><tr><th /><th>Nome</th><th>Dalle</th><th>Alle</th><th>Servizio</th><th>Sale</th><th>Azioni</th></tr></thead>
            <tbody>
              {data.turni.map((t) => (
                <tr key={t.id}>
                  <td>
                    <label className="configura-outlet__toggle">
                      <input type="checkbox" checked={t.attivo} onChange={(e) => setData({ ...data, turni: data.turni.map((x) => x.id === t.id ? { ...x, attivo: e.target.checked } : x) })} />
                      <span className="configura-outlet__slider" />
                    </label>
                  </td>
                  <td>{t.nome}</td><td>{t.dalle}</td><td>{t.alle}</td><td>{t.servizio}</td><td>{t.sale.join(', ')}</td>
                  <td className="configura-outlet__actions-cell">
                    <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-pen" /></button>
                    <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-copy" /></button>
                    <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </div>
  )
}
