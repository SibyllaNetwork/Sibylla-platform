import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Gestione utenti — replica `Views/Utente/GestioneUtenti.cshtml`.
 * BE Razor: `UserController.GetUtenti` (`utente/GetUtentiList`) → catch-all
 * `/Sibylla/utente/GetUtenti`.
 */

interface UtenteItem {
  id?: number
  nome?: string
  cognome?: string
  email?: string
  ruolo?: string
  reparto?: string
  ultimo_accesso?: string
  attivo?: boolean
  verified?: boolean
  [key: string]: unknown
}

const FALLBACK: UtenteItem[] = [
  { id: 1, nome: 'Luca',   cognome: 'H.',     email: 'luca.h@sibyllanetwork.com', ruolo: 'Direttore',     reparto: 'Direzione',   ultimo_accesso: '29/04 09:42', attivo: true, verified: true },
  { id: 2, nome: 'Giulia', cognome: 'Conti',  email: 'g.conti@hotel.it',          ruolo: 'Receptionist',  reparto: 'Front office',ultimo_accesso: '29/04 08:10', attivo: true, verified: true },
  { id: 3, nome: 'Marco',  cognome: 'Esposito', email: 'm.esposito@hotel.it',     ruolo: 'Chef',          reparto: 'F&B',         ultimo_accesso: '28/04 22:05', attivo: true, verified: true },
  { id: 4, nome: 'Sara',   cognome: 'Romano', email: 's.romano@hotel.it',         ruolo: 'Governante',    reparto: 'Housekeeping',ultimo_accesso: '29/04 06:30', attivo: true, verified: false },
]

const RUOLI = ['Tutti', 'Direttore', 'Manager', 'Receptionist', 'Concierge', 'Chef', 'Governante', 'Manutentore']

export default function GestioneUtenti({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<UtenteItem[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [ruolo, setRuolo] = useState('Tutti')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<UtenteItem[]>('utente/GetUtenti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((u) => {
    const matchSearch = !search || `${u.nome ?? ''} ${u.cognome ?? ''} ${u.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchRuolo = ruolo === 'Tutti' || u.ruolo === ruolo
    return matchSearch && matchRuolo
  })

  return (
    <div>
      <PageHead title="Gestione utenti" subtitle="Utenti e permessi della tua organizzazione" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <FilterToolbar>
        <InputField  name="search" label="Ricerca" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, cognome, email" />
        <SelectField name="ruolo"  label="Ruolo"   value={ruolo}  onChange={(e) => setRuolo(e.target.value)}
          options={RUOLI.map((r) => ({ value: r, label: r }))}
        />
        <button className="sib-btn sib-btn--primary">
          <i className="fa-duotone fa-user-plus" /> Nuovo invito
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Nominativo</th>
              <th>Email</th>
              <th>Ruolo</th>
              <th>Reparto</th>
              <th>Ultimo accesso</th>
              <th>Stato</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.cognome} {u.nome}</strong></td>
                <td className="sib-cell--muted">{u.email}</td>
                <td>{u.ruolo}</td>
                <td>{u.reparto}</td>
                <td className="sib-cell--muted">{u.ultimo_accesso}</td>
                <td>
                  {!u.attivo
                    ? <StatusBadge variant="neutral">Disabilitato</StatusBadge>
                    : !u.verified
                      ? <StatusBadge variant="warning">Da verificare</StatusBadge>
                      : <StatusBadge variant="success">Attivo</StatusBadge>}
                </td>
                <td>
                  <button className="sib-btn sib-btn--ghost">Modifica</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="sib-empty">Nessun utente trovato.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
