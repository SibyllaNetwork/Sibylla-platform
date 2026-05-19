import React, { useEffect, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import AlertBanner from '../../../../core/components/AlertBanner'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import StatusBadge from '../../../../core/components/StatusBadge'
import { InputField, SelectField, DatePickerField } from '../../../../core/components/form'
import { apiFetchSibylla } from '../../../../services/api'

/**
 * I miei preventivi — replica `Views/Preventivi/IMieiPreventivi.cshtml`.
 * BE Razor: `PreventiviController.GetPreventivi` → catch-all
 * `/Sibylla/preventivi/GetPreventivi`.
 */

interface Preventivo {
  id?: number
  numero?: string
  cliente?: string
  data_emissione?: string
  data_scadenza?: string
  importo?: number
  stato?: string
  agenzia?: string
  [key: string]: unknown
}

const FALLBACK: Preventivo[] = [
  { id: 101, numero: 'PRV-2026-001', cliente: 'Tour Operator Italia',  data_emissione: '01/04/2026', data_scadenza: '15/04/2026', importo: 12500, stato: 'Inviato',  agenzia: 'TOI Travel' },
  { id: 102, numero: 'PRV-2026-002', cliente: 'Wedding Roma',           data_emissione: '03/04/2026', data_scadenza: '20/04/2026', importo: 8500,  stato: 'Bozza',    agenzia: '-' },
  { id: 103, numero: 'PRV-2026-003', cliente: 'Mario Rossi',            data_emissione: '05/04/2026', data_scadenza: '12/04/2026', importo: 1200,  stato: 'Accettato',agenzia: '-' },
  { id: 104, numero: 'PRV-2026-004', cliente: 'Convention 4Med',        data_emissione: '06/04/2026', data_scadenza: '30/04/2026', importo: 35000, stato: 'Inviato',  agenzia: 'Promo Mice' },
]

const STATI = ['Tutti', 'Bozza', 'Inviato', 'Accettato', 'Rifiutato', 'Scaduto']

const STATO_TONE: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  Bozza: 'neutral', Inviato: 'info', Accettato: 'success', Rifiutato: 'error', Scaduto: 'warning',
}

export default function IMieiPreventivi({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Preventivo[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stato, setStato] = useState('Tutti')
  const [dataDa, setDataDa] = useState('')
  const [dataA, setDataA] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Preventivo[]>('preventivi/GetPreventivi', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((p) => {
    const matchSearch = !search || `${p.numero ?? ''} ${p.cliente ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchStato = stato === 'Tutti' || p.stato === stato
    return matchSearch && matchStato
  })

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="I miei preventivi" subtitle="Storico e stato dei preventivi inviati" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <FilterToolbar>
        <InputField name="search" label="Ricerca" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Numero o cliente" />
        <SelectField name="stato" label="Stato" value={stato} onChange={(e) => setStato(e.target.value)} options={STATI.map((s) => ({ value: s, label: s }))} />
        <DatePickerField name="data_da" label="Da" value={dataDa} onChange={(e) => setDataDa(e.target.value)} />
        <DatePickerField name="data_a"  label="A"  value={dataA}  onChange={(e) => setDataA(e.target.value)} />
        <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-preventivo')}>
          <i className="fa-duotone fa-plus" /> Crea preventivo
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cliente</th>
              <th>Agenzia</th>
              <th>Emesso</th>
              <th>Scadenza</th>
              <th>Importo</th>
              <th>Stato</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.numero}</strong></td>
                <td>{p.cliente}</td>
                <td>{p.agenzia ?? '-'}</td>
                <td>{p.data_emissione}</td>
                <td>{p.data_scadenza}</td>
                <td>{p.importo?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</td>
                <td><StatusBadge variant={STATO_TONE[p.stato ?? 'Bozza'] ?? 'neutral'}>{p.stato}</StatusBadge></td>
                <td>
                  <button className="sib-btn sib-btn--ghost" onClick={() => navigate('crea-preventivo')}>Apri</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="sib-empty">Nessun preventivo trovato.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
