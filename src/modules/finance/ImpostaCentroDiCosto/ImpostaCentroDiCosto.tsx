import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import Tabs from '../../../core/components/Tabs'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Imposta centro di costo — replica `Views/Finance/ImpostaCentroDiCosto.cshtml`.
 * BE: `FinanceController.GetCentriDiCosto` → catch-all
 * `/Sibylla/finance/GetCentriDiCosto`, salvataggio `finance/SaveCentroCosto`.
 */

interface CentroCosto {
  id?: number
  codice?: string
  denominazione?: string
  reparto?: string
  budget_mensile?: number
  utilizzo_percentuale?: number
  attivo?: boolean
  [key: string]: unknown
}

const FALLBACK: CentroCosto[] = [
  { id: 1, codice: 'CC-0122', denominazione: 'Cucina ristorante',  reparto: 'F&B',                budget_mensile: 500,  utilizzo_percentuale: 20,  attivo: true },
  { id: 2, codice: 'CC-0123', denominazione: 'Spese amministrative',reparto: 'Amministrazione',   budget_mensile: 400,  utilizzo_percentuale: 40,  attivo: false },
  { id: 3, codice: 'CC-0124', denominazione: 'Hardware IT',        reparto: 'IT',                  budget_mensile: 1000, utilizzo_percentuale: 100, attivo: true },
]

const REPARTI = ['Tutti i reparti', 'F&B', 'Amministrazione', 'IT', 'Housekeeping', 'Front office']

export default function ImpostaCentroDiCosto({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<CentroCosto[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'centri' | 'liste'>('centri')
  const [search, setSearch] = useState('')
  const [reparto, setReparto] = useState('Tutti i reparti')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<CentroCosto[]>('finance/GetCentriDiCosto', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((c) => {
    const matchSearch = !search || `${c.codice ?? ''} ${c.denominazione ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchReparto = reparto === 'Tutti i reparti' || c.reparto === reparto
    return matchSearch && matchReparto
  })

  function utilizzoTone(perc: number): 'success' | 'warning' | 'error' {
    if (perc >= 90) return 'error'
    if (perc >= 60) return 'warning'
    return 'success'
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Imposta centro di costo" subtitle="Configura, gestisci e monitora i centri di costo della struttura" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <FilterToolbar>
        <InputField name="search" label="Ricerca" placeholder="Codice o nome" value={search} onChange={(e) => setSearch(e.target.value)} />
        <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)} options={REPARTI.map((r) => ({ value: r, label: r }))} />
        <button className="sib-btn sib-btn--primary">
          <i className="fa-duotone fa-plus" /> Nuovo centro
        </button>
      </FilterToolbar>

      <Tabs
        tabs={[
          { id: 'centri', label: 'Centri configurati' },
          { id: 'liste',  label: 'Liste precompilate' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {tab === 'centri' && (
        <div className="sib-table-wrap">
          <table className="sib-table">
            <thead>
              <tr>
                <th>Codice</th>
                <th>Denominazione</th>
                <th>Reparto</th>
                <th>Budget mensile</th>
                <th>Utilizzo</th>
                <th>Stato</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><code>{c.codice}</code></td>
                  <td><strong>{c.denominazione}</strong></td>
                  <td>{c.reparto}</td>
                  <td>€ {c.budget_mensile?.toLocaleString('it-IT')}</td>
                  <td>
                    <div className="sib-progress">
                      <div className={`sib-progress__bar sib-progress__bar--${utilizzoTone(c.utilizzo_percentuale ?? 0)}`} style={{ width: `${c.utilizzo_percentuale ?? 0}%` }} />
                    </div>
                    <span className="sib-cell--muted">{c.utilizzo_percentuale ?? 0}% utilizzato</span>
                  </td>
                  <td>{c.attivo ? <StatusBadge variant="success">Attivo</StatusBadge> : <StatusBadge variant="neutral">Disattivo</StatusBadge>}</td>
                  <td>
                    <button className="sib-btn sib-btn--ghost">Modifica</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="sib-empty">Nessun centro di costo configurato.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'liste' && (
        <div className="sib-empty-state">
          <p>Liste precompilate dei centri di costo standard per la tua struttura alberghiera.</p>
          <p className="sib-cell--muted">Selezionale e importale con un click. (UI completa in arrivo)</p>
        </div>
      )}
    </div>
  )
}
