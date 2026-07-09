import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import { InputField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Totem hardware — replica `Views/Hardware/Totem.cshtml`.
 * BE Razor: `HardwareController.GetTotems` → catch-all
 * `/Sibylla/hardware/GetTotems`.
 */

interface Totem {
  id?: number
  serial?: string
  posizione?: string
  modello?: string
  versione_firmware?: string
  online?: boolean
  ultimo_check?: string
  uptime?: string
  [key: string]: unknown
}

const FALLBACK: Totem[] = [
  { id: 1, serial: 'TM-001', posizione: 'Ingresso hall',     modello: 'TouchPro 21"', versione_firmware: '2.4.1', online: true,  ultimo_check: '29/04 09:30', uptime: '14 gg' },
  { id: 2, serial: 'TM-002', posizione: 'Reception piano 0', modello: 'TouchPro 21"', versione_firmware: '2.4.1', online: true,  ultimo_check: '29/04 09:31', uptime: '14 gg' },
  { id: 3, serial: 'TM-003', posizione: 'Sala colazione',    modello: 'TouchLite 17"', versione_firmware: '2.3.0', online: false, ultimo_check: '28/04 18:42', uptime: '0 gg' },
]

export default function Totem({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Totem[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Totem[]>('hardware/GetTotems', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((t) =>
    !search || `${t.serial ?? ''} ${t.posizione ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const online  = items.filter((t) => t.online).length
  const offline = items.length - online

  return (
    <div>
      <PageHead title="Totem" subtitle="Hardware self-service in struttura: stato, firmware, posizione" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <div className="sib-stats-row">
        <div className="sib-stat-card">
          <div className="sib-stat-card__label">Totem totali</div>
          <div className="sib-stat-card__value">{items.length}</div>
        </div>
        <div className="sib-stat-card">
          <div className="sib-stat-card__label">Online</div>
          <div className="sib-stat-card__value sib-stat-card__value--success">{online}</div>
        </div>
        <div className="sib-stat-card">
          <div className="sib-stat-card__label">Offline</div>
          <div className="sib-stat-card__value sib-stat-card__value--error">{offline}</div>
        </div>
      </div>

      <FilterToolbar>
        <InputField name="search" label="Ricerca" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Serial, posizione…" />
        <button className="sib-btn sib-btn--primary">
          <i className="fa-duotone fa-plus" /> Registra totem
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Posizione</th>
              <th>Modello</th>
              <th>Firmware</th>
              <th>Stato</th>
              <th>Ultimo check</th>
              <th>Uptime</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td><code>{t.serial}</code></td>
                <td>{t.posizione}</td>
                <td>{t.modello}</td>
                <td className="sib-cell--muted">{t.versione_firmware}</td>
                <td>{t.online ? <StatusBadge variant="success">Online</StatusBadge> : <StatusBadge variant="error">Offline</StatusBadge>}</td>
                <td className="sib-cell--muted">{t.ultimo_check}</td>
                <td>{t.uptime}</td>
                <td>
                  <button className="sib-btn sib-btn--ghost">Dettagli</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="sib-empty">Nessun totem registrato.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
