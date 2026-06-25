import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Inventario camere — replica `Views/Stanze/Index.cshtml` + `Camere/Index.cshtml`.
 * BE Razor: `CamereController.GetCamere` → catch-all proxy
 * `/Sibylla/camere/GetCamere`.
 */

interface Camera {
  id_camera?: string
  numero?: string
  piano?: number
  tipo_camera?: string
  capacita?: number
  letti_singoli?: number
  letti_doppi?: number
  metratura?: number
  bagno_privato?: boolean
  attiva?: boolean
  note?: string
  [key: string]: unknown
}

const FALLBACK: Camera[] = [
  { id_camera: '101', numero: '101', piano: 1, tipo_camera: 'Standard',  capacita: 2, letti_singoli: 0, letti_doppi: 1, metratura: 22, bagno_privato: true, attiva: true },
  { id_camera: '102', numero: '102', piano: 1, tipo_camera: 'Standard',  capacita: 2, letti_singoli: 2, letti_doppi: 0, metratura: 24, bagno_privato: true, attiva: true },
  { id_camera: '203', numero: '203', piano: 2, tipo_camera: 'Superior',  capacita: 3, letti_singoli: 1, letti_doppi: 1, metratura: 30, bagno_privato: true, attiva: true },
  { id_camera: '305', numero: '305', piano: 3, tipo_camera: 'Suite',     capacita: 4, letti_singoli: 0, letti_doppi: 2, metratura: 55, bagno_privato: true, attiva: true },
  { id_camera: '410', numero: '410', piano: 4, tipo_camera: 'Standard',  capacita: 2, letti_singoli: 0, letti_doppi: 1, metratura: 20, bagno_privato: true, attiva: false, note: 'Ristrutturazione' },
]

export default function Inventario({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Camera[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Tutte')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Camera[]>('camere/GetCamere', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const tipologie = Array.from(new Set(items.map((c) => c.tipo_camera).filter(Boolean) as string[]))
  const filtered = items.filter((c) => {
    const matchSearch = !search || (c.numero ?? '').includes(search)
    const matchTipo = tipo === 'Tutte' || c.tipo_camera === tipo
    return matchSearch && matchTipo
  })

  return (
    <div>
      <BtnBack />
      <PageHeader title="Inventario camere" subtitle="Anagrafica delle camere disponibili in struttura" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <FilterToolbar>
        <InputField  name="search" label="Numero" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="101, 203…" />
        <SelectField name="tipo"   label="Tipologia" value={tipo} onChange={(e) => setTipo(e.target.value)}
          options={[{ value: 'Tutte', label: 'Tutte' }, ...tipologie.map((t) => ({ value: t, label: t }))]}
        />
        <button className="sib-btn sib-btn--primary">
          <i className="fa-duotone fa-plus" /> Nuova camera
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Piano</th>
              <th>Tipologia</th>
              <th>Capacità</th>
              <th>Letti</th>
              <th>m²</th>
              <th>Bagno</th>
              <th>Stato</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id_camera}>
                <td><strong>{c.numero}</strong></td>
                <td>{c.piano}</td>
                <td>{c.tipo_camera}</td>
                <td>{c.capacita}</td>
                <td className="sib-cell--muted">
                  {c.letti_singoli ? `${c.letti_singoli} singoli` : ''}
                  {c.letti_singoli && c.letti_doppi ? ' + ' : ''}
                  {c.letti_doppi ? `${c.letti_doppi} matrim.` : ''}
                </td>
                <td>{c.metratura}</td>
                <td>{c.bagno_privato ? 'Privato' : 'Condiviso'}</td>
                <td>{c.attiva ? <StatusBadge variant="success">Attiva</StatusBadge> : <StatusBadge variant="warning">Disattiva</StatusBadge>}</td>
                <td className="sib-cell--muted">{c.note ?? '-'}</td>
                <td>
                  <button className="sib-btn sib-btn--ghost">Modifica</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="sib-empty">Nessuna camera trovata.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
