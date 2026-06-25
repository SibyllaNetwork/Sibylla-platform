import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Gestione aziende (sysadmin) — replica `Views/SYSADMIN/GestioneAziende.cshtml`.
 * BE Razor: `AziendeController.GetAziende` → catch-all
 * `/Sibylla/aziende/GetAziende`.
 */

interface Azienda {
  id?: number
  nome?: string
  partita_iva?: string
  tipo_azienda?: string
  email?: string
  telefono?: string
  numero_strutture?: number
  attiva?: boolean
  data_creazione?: string
  [key: string]: unknown
}

const FALLBACK: Azienda[] = [
  { id: 1,  nome: 'Hotel Noto SRL',         partita_iva: 'IT00000000123', tipo_azienda: 'Hotel',         email: 'admin@noto.it',     telefono: '+39 0931 …', numero_strutture: 1, attiva: true,  data_creazione: '01/03/2024' },
  { id: 2,  nome: 'Catania Group SRL',      partita_iva: 'IT00000000456', tipo_azienda: 'Hotel',         email: 'info@catania.it',   telefono: '+39 095 …',  numero_strutture: 4, attiva: true,  data_creazione: '12/06/2023' },
  { id: 3,  nome: 'Tour Operator Italia',   partita_iva: 'IT00000000789', tipo_azienda: 'Tour Operator', email: 'rev@toi.it',        telefono: '+39 06 …',   numero_strutture: 0, attiva: true,  data_creazione: '05/01/2025' },
  { id: 4,  nome: 'Demo SRL',               partita_iva: 'IT00000000111', tipo_azienda: 'Hotel',         email: 'demo@demo.it',      telefono: '-',          numero_strutture: 0, attiva: false, data_creazione: '20/02/2026' },
]

const TIPI = ['Tutte', 'Hotel', 'Tour Operator', 'Fornitore']

export default function GestioneAziende({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Azienda[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Tutte')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Azienda[]>('aziende/GetAziende', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((a) => {
    const matchSearch = !search ||
      `${a.nome ?? ''} ${a.partita_iva ?? ''} ${a.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchTipo = tipo === 'Tutte' || a.tipo_azienda === tipo
    return matchSearch && matchTipo
  })

  return (
    <div>
      <BtnBack />
      <PageHeader title="Gestione aziende" subtitle="Pannello sysadmin: aziende clienti registrate sulla piattaforma" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <FilterToolbar>
        <InputField  name="search" label="Ricerca" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, P.IVA, email" />
        <SelectField name="tipo"   label="Tipologia" value={tipo} onChange={(e) => setTipo(e.target.value)} options={TIPI.map((t) => ({ value: t, label: t }))} />
        <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-azienda-a')}>
          <i className="fa-duotone fa-plus" /> Nuova azienda
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>P.IVA</th>
              <th>Tipo</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>N° strutture</th>
              <th>Stato</th>
              <th>Creata il</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong></td>
                <td className="sib-cell--muted">{a.partita_iva}</td>
                <td>{a.tipo_azienda}</td>
                <td>{a.email}</td>
                <td>{a.telefono}</td>
                <td>{a.numero_strutture}</td>
                <td>{a.attiva ? <StatusBadge variant="success">Attiva</StatusBadge> : <StatusBadge variant="neutral">Sospesa</StatusBadge>}</td>
                <td className="sib-cell--muted">{a.data_creazione}</td>
                <td>
                  <button className="sib-btn sib-btn--ghost">Apri</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="sib-empty">Nessuna azienda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
