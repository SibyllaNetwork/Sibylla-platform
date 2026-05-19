import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Archivio del personale — replica `Views/HumanResource/AnagraficaPersonale.cshtml`.
 * BE Razor: `AnagraficaPersonaleController.GetPersonale` → catch-all
 * `/Sibylla/anagrafica-personale/GetAll`.
 */

interface PersonaleItem {
  id?: number
  matricola?: number | string
  nome?: string
  cognome?: string
  nato_il?: string
  codice_fiscale?: string
  indirizzo?: string
  cap?: string
  provincia?: string
  nazione?: string
  [key: string]: unknown
}

const FALLBACK: PersonaleItem[] = [
  { id: 66, matricola: 66, nome: 'Piero',     cognome: 'Aragona',  nato_il: '12/03/1959', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30',  cap: '00199', provincia: 'to',   nazione: 'ITA' },
  { id: 67, matricola: 67, nome: 'Ruggero',   cognome: 'Novi',     nato_il: '17/04/2025', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30',  cap: '00185', provincia: 'rm',   nazione: 'ITA' },
  { id: 69, matricola: 69, nome: 'Andrea',    cognome: 'Grimaudo', nato_il: '10/10/1996', codice_fiscale: 'QSSFC90L23F205X', indirizzo: 'VIA DEI MILLE, 30',  cap: '00185', provincia: 'ROMA', nazione: 'ITA' },
  { id: 82, matricola: 82, nome: 'mario',     cognome: 'idraulico',nato_il: '01/01/2025', codice_fiscale: 'token',           indirizzo: 'via nicola da bari', cap: '000000',provincia: 'BA',   nazione: 'ITA' },
  { id: 83, matricola: 83, nome: 'Ali',       cognome: 'Aslan',    nato_il: '13/05/2020', codice_fiscale: 'MRSFSDJFKS545ASE',indirizzo: 'Casal Bertone',     cap: '00159', provincia: 'Rome', nazione: 'ITA' },
  { id: 84, matricola: 84, nome: 'dino 2',    cognome: 'tacchini', nato_il: '22/08/1985', codice_fiscale: 'safihiqwruajksfbafj', indirizzo: 'via dei mille, 30', cap: '00123', provincia: 'RM',   nazione: 'ITA' },
  { id: 85, matricola: 85, nome: 'Scontrino', cognome: 'test',     nato_il: '01/01/2001', codice_fiscale: 'BNCMRC90L15F205X',indirizzo: 'Via delle Magnolie 27', cap: '90146', provincia: 'Palermo', nazione: 'ITA' },
  { id: 86, matricola: 86, nome: 'Scontrino', cognome: 'test',     nato_il: '01/01/0001', codice_fiscale: 'Vwertyuioi',      indirizzo: 'HR Managment & Innovation', cap: '90146', provincia: 'Palermo', nazione: 'ITA' },
  { id: 88, matricola: 88, nome: 'Andrea G',  cognome: 'Test',     nato_il: '08/07/1994', codice_fiscale: 'qwertyuiop',      indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
  { id: 89, matricola: 89, nome: 'Marco',     cognome: 'Campo',    nato_il: '30/06/1989', codice_fiscale: 'VRDLNZ02A22H501Y',indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
  { id: 90, matricola: 90, nome: 'Sicilia',   cognome: 'Andrea',   nato_il: '01/01/2001', codice_fiscale: 'qwertyuiop',      indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
]

type Col = { key: string; label: string; filter?: boolean }
const COLS: Col[] = [
  { key: 'matricola',     label: 'Matricola N°' },
  { key: 'nome',          label: 'Nome',           filter: true },
  { key: 'cognome',       label: 'Cognome',        filter: true },
  { key: 'nato_il',       label: 'Nato il' },
  { key: 'codice_fiscale',label: 'Codice Fiscale', filter: true },
  { key: 'indirizzo',     label: 'Indirizzo' },
  { key: 'cap',           label: 'Cap',            filter: true },
  { key: 'provincia',     label: 'Provincia',      filter: true },
  { key: 'nazione',       label: 'Nazione',        filter: true },
]

export default function ArchivioPersonale({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<PersonaleItem[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<PersonaleItem[]>('anagrafica-personale/GetAll', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => items.filter((p) => {
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue
      const cell = String((p as any)[k] ?? '').toLowerCase()
      if (!cell.includes(v.toLowerCase())) return false
    }
    return true
  }), [items, filters])

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Archivio del personale"
        subtitle="Gestione dei dati anagrafici e contrattuali di tutto il personale, con accesso rapido agli archivi contrattuali e possibilità di creare nuovi profili"
      />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <div className="flex justify-end mb-4">
        <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-anagrafica')}>
          <i className="fa-duotone fa-id-card" /> Crea anagrafica profilo
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="relative">
                  <span className="inline-flex items-center gap-2">
                    {c.label}
                    {c.filter && (
                      <button
                        type="button"
                        className="text-text-muted hover:text-text"
                        onClick={() => setOpenFilter(openFilter === c.key ? null : c.key)}
                        title="Filtra"
                      >
                        <i className={`fa-solid fa-filter${filters[c.key] ? '' : ''}`} />
                      </button>
                    )}
                  </span>
                  {openFilter === c.key && (
                    <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-line rounded shadow-md p-2 w-48">
                      <input
                        autoFocus
                        className="sib-input"
                        placeholder={`Filtra ${c.label.toLowerCase()}`}
                        value={filters[c.key] ?? ''}
                        onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                      />
                      <div className="flex justify-between mt-2">
                        <button
                          type="button"
                          className="sib-btn sib-btn--ghost text-xs"
                          onClick={() => { setFilters((f) => { const n = { ...f }; delete n[c.key]; return n }); setOpenFilter(null) }}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="sib-btn sib-btn--primary text-xs"
                          onClick={() => setOpenFilter(null)}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              ))}
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.matricola}</td>
                <td>{p.nome}</td>
                <td>{p.cognome}</td>
                <td>{p.nato_il}</td>
                <td>{p.codice_fiscale}</td>
                <td>{p.indirizzo}</td>
                <td>{p.cap}</td>
                <td>{p.provincia}</td>
                <td>{p.nazione}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <button className="sib-btn sib-btn--icon" title="Modifica" onClick={() => navigate('crea-anagrafica')}>
                      <i className="fa-duotone fa-pen" />
                    </button>
                    <button className="sib-btn sib-btn--icon" title="Documento contratto">
                      <i className="fa-duotone fa-file-pdf" />
                    </button>
                    <button className="sib-btn sib-btn--icon" title="Elimina">
                      <i className="fa-duotone fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={COLS.length + 1} className="sib-empty">Nessun collaboratore trovato.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
