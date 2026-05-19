import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Anagrafiche ospiti — replica `Views/Anagrafiche/Anagrafiche.cshtml`.
 *
 * BE: il monolite Razor usa `BackOfficeController.GetAnagrafiche` /
 * `operation/GetAnagrafichePerStruttura`. Qui passiamo dal catch-all proxy
 * `/Sibylla/operation/GetAnagrafichePerStruttura`.
 */

interface AnagraficaOspite {
  id?: number
  nome?: string
  cognome?: string
  email?: string
  telefono?: string
  data_nascita?: string
  nazionalita?: string
  paese?: string
  numero_soggiorni?: number
  ultima_visita?: string
  vip?: boolean
  [key: string]: unknown
}

const FALLBACK: AnagraficaOspite[] = [
  { id: 1, nome: 'Mario',   cognome: 'Rossi',   email: 'mario.rossi@email.it',   telefono: '+39 333 1234567', nazionalita: 'Italiana',  numero_soggiorni: 12, ultima_visita: '12/03/2026', vip: true },
  { id: 2, nome: 'Anna',    cognome: 'Bianchi', email: 'anna.b@email.it',        telefono: '+39 340 7654321', nazionalita: 'Italiana',  numero_soggiorni: 4,  ultima_visita: '28/02/2026', vip: false },
  { id: 3, nome: 'John',    cognome: 'Smith',   email: 'jsmith@example.com',     telefono: '+1 415 555 0102', nazionalita: 'USA',       numero_soggiorni: 7,  ultima_visita: '02/01/2026', vip: true  },
  { id: 4, nome: 'Lukas',   cognome: 'Weber',   email: 'l.weber@mail.de',        telefono: '+49 30 1234567',  nazionalita: 'Germania',  numero_soggiorni: 2,  ultima_visita: '14/04/2026', vip: false },
]

export default function Anagrafiche({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<AnagraficaOspite[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [paese, setPaese] = useState('Tutti')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<AnagraficaOspite[]>('operation/GetAnagrafichePerStruttura', {
      method: 'POST',
      body: {},
    })
      .then((data) => { if (!cancelled) { setItems(data); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = items.filter((a) => {
    const matchSearch = !search ||
      `${a.nome ?? ''} ${a.cognome ?? ''} ${a.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchPaese = paese === 'Tutti' || (a.nazionalita ?? a.paese) === paese
    return matchSearch && matchPaese
  })

  const paesi = Array.from(new Set(items.map((a) => a.nazionalita ?? a.paese).filter(Boolean) as string[]))

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Anagrafiche" subtitle="Gestisci l'anagrafica completa dei tuoi ospiti" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <FilterToolbar>
        <InputField
          name="search"
          label="Ricerca"
          placeholder="Nome, cognome o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          name="paese"
          label="Nazionalità"
          value={paese}
          onChange={(e) => setPaese(e.target.value)}
          options={[{ value: 'Tutti', label: 'Tutti' }, ...paesi.map((p) => ({ value: p, label: p }))]}
        />
        <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-anagrafica')}>
          <i className="fa-duotone fa-plus" /> Nuova anagrafica
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Nominativo</th>
              <th>Email</th>
              <th>Telefono</th>
              <th>Nazionalità</th>
              <th>Soggiorni</th>
              <th>Ultima visita</th>
              <th>VIP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.cognome} {a.nome}</td>
                <td>{a.email}</td>
                <td>{a.telefono}</td>
                <td>{a.nazionalita ?? a.paese ?? '-'}</td>
                <td>{a.numero_soggiorni ?? 0}</td>
                <td>{a.ultima_visita ?? '-'}</td>
                <td>{a.vip ? <StatusBadge variant="success">VIP</StatusBadge> : '-'}</td>
                <td>
                  <button className="sib-btn sib-btn--ghost" onClick={() => navigate('crea-anagrafica')}>
                    Modifica
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="sib-empty">Nessuna anagrafica trovata.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
