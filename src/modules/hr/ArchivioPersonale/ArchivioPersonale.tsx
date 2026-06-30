import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Modal from '../../../core/components/Modal'
import { apiFetchSibylla } from '../../../services/api'
import { avatarUrl } from '../../../core/avatar'
import { setEditingAnagrafica } from '../CreaAnagrafica/_state'

// dd/mm/yyyy → yyyy-mm-dd (per il date input della scheda)
const toIsoDate = (d?: string) => {
  if (!d) return ''
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d
}

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
  telefono?: string
  nato_il?: string
  codice_fiscale?: string
  indirizzo?: string
  cap?: string
  provincia?: string
  nazione?: string
  [key: string]: unknown
}

const FALLBACK: PersonaleItem[] = [
  { id: 66, matricola: 66, nome: 'Piero',     cognome: 'Aragona',  telefono: '+39 339 1234567', nato_il: '12/03/1959', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30',  cap: '00199', provincia: 'to',   nazione: 'ITA' },
  { id: 67, matricola: 67, nome: 'Ruggero',   cognome: 'Novi',     telefono: '+39 340 7654321', nato_il: '17/04/2025', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30',  cap: '00185', provincia: 'rm',   nazione: 'ITA' },
  { id: 69, matricola: 69, nome: 'Andrea',    cognome: 'Grimaudo', telefono: '+39 333 9988776', nato_il: '10/10/1996', codice_fiscale: 'QSSFC90L23F205X', indirizzo: 'VIA DEI MILLE, 30',  cap: '00185', provincia: 'ROMA', nazione: 'ITA' },
  { id: 82, matricola: 82, nome: 'mario',     cognome: 'idraulico',telefono: '+39 366 1472583', nato_il: '01/01/2025', codice_fiscale: 'token',           indirizzo: 'via nicola da bari', cap: '000000',provincia: 'BA',   nazione: 'ITA' },
  { id: 83, matricola: 83, nome: 'Ali',       cognome: 'Aslan',    telefono: '+39 351 2589631', nato_il: '13/05/2020', codice_fiscale: 'MRSFSDJFKS545ASE',indirizzo: 'Casal Bertone',     cap: '00159', provincia: 'Rome', nazione: 'ITA' },
  { id: 84, matricola: 84, nome: 'dino 2',    cognome: 'tacchini', telefono: '+39 338 7531594', nato_il: '22/08/1985', codice_fiscale: 'safihiqwruajksfbafj', indirizzo: 'via dei mille, 30', cap: '00123', provincia: 'RM',   nazione: 'ITA' },
  { id: 85, matricola: 85, nome: 'Scontrino', cognome: 'test',     telefono: '+39 320 1112233', nato_il: '01/01/2001', codice_fiscale: 'BNCMRC90L15F205X',indirizzo: 'Via delle Magnolie 27', cap: '90146', provincia: 'Palermo', nazione: 'ITA' },
  { id: 86, matricola: 86, nome: 'Scontrino', cognome: 'test',     telefono: '',                nato_il: '01/01/0001', codice_fiscale: 'Vwertyuioi',      indirizzo: 'HR Managment & Innovation', cap: '90146', provincia: 'Palermo', nazione: 'ITA' },
  { id: 88, matricola: 88, nome: 'Andrea G',  cognome: 'Test',     telefono: '+39 347 4455667', nato_il: '08/07/1994', codice_fiscale: 'qwertyuiop',      indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
  { id: 89, matricola: 89, nome: 'Marco',     cognome: 'Campo',    telefono: '+39 342 8899001', nato_il: '30/06/1989', codice_fiscale: 'VRDLNZ02A22H501Y',indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
  { id: 90, matricola: 90, nome: 'Sicilia',   cognome: 'Andrea',   telefono: '+39 331 5566778', nato_il: '01/01/2001', codice_fiscale: 'qwertyuiop',      indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
]

type Col = { key: string; label: string; filter?: boolean }
const COLS: Col[] = [
  { key: 'matricola',     label: 'Matricola N°' },
  { key: 'nome',          label: 'Nome',           filter: true },
  { key: 'cognome',       label: 'Cognome',        filter: true },
  { key: 'telefono',      label: 'Contatto telefonico', filter: true },
  { key: 'nato_il',       label: 'Nato il' },
  { key: 'codice_fiscale',label: 'Codice Fiscale', filter: true },
  { key: 'indirizzo',     label: 'Indirizzo' },
  { key: 'cap',           label: 'Cap',            filter: true },
  { key: 'provincia',     label: 'Provincia',      filter: true },
  { key: 'nazione',       label: 'Nazione',        filter: true },
]

export default function ArchivioPersonale({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<PersonaleItem[]>(FALLBACK)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [docPerson, setDocPerson] = useState<PersonaleItem | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<PersonaleItem[]>('anagrafica-personale/GetAll', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setItems(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const modificaPersona = (p: PersonaleItem) => {
    setEditingAnagrafica({
      id: p.id,
      nome: p.nome, cognome: p.cognome,
      data_nascita: toIsoDate(p.nato_il),
      codice_fiscale: p.codice_fiscale,
      indirizzo: p.indirizzo, cap: p.cap, provincia: p.provincia,
      nazionalita: p.nazione && /^IT/i.test(p.nazione) ? 'ITALIA' : 'ITALIA',
    })
    navigate('modifica-anagrafica')
  }

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
      <BtnBack />
      <PageHeader
        title="Archivio del personale"
        subtitle="Gestione dei dati anagrafici e contrattuali di tutto il personale, con accesso rapido agli archivi contrattuali e possibilità di creare nuovi profili"
      />

      <div className="flex justify-end mb-4">
        <button className="sib-btn sib-btn--primary" onClick={() => navigate('crea-anagrafica')}>
          <i className="fa-light fa-id-card" /> Crea anagrafica profilo
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
                <td>{p.telefono || <span className="text-text-muted">-</span>}</td>
                <td>{p.nato_il}</td>
                <td>{p.codice_fiscale}</td>
                <td>{p.indirizzo}</td>
                <td>{p.cap}</td>
                <td>{p.provincia}</td>
                <td>{p.nazione}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <button className="sib-btn sib-btn--icon" title="Dettaglio dipendente" onClick={() => setDocPerson(p)}>
                      <i className="fa-light fa-eye" />
                    </button>
                    <button className="sib-btn sib-btn--icon" title="Modifica" onClick={() => modificaPersona(p)}>
                      <i className="fa-light fa-pen" />
                    </button>
                    <button className="sib-btn sib-btn--icon" title="Documento contratto">
                      <i className="fa-light fa-file-pdf" />
                    </button>
                    <button className="sib-btn sib-btn--icon" title="Elimina">
                      <i className="fa-light fa-trash-can" />
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

      <DocIdentitaModal persona={docPerson} onClose={() => setDocPerson(null)} />
    </div>
  )
}

// ─── MODAL: Documento di identità ─────────────────────────────────────────────

function DocIdentitaModal({ persona, onClose }: { persona: PersonaleItem | null; onClose: () => void }) {
  const fullName = persona ? `${persona.nome ?? ''} ${persona.cognome ?? ''}`.trim() : ''
  const fields: [string, unknown][] = persona ? [
    ['Matricola N°', persona.matricola],
    ['Nome', persona.nome],
    ['Cognome', persona.cognome],
    ['Contatto telefonico', persona.telefono],
    ['Nato il', persona.nato_il],
    ['Codice fiscale', persona.codice_fiscale],
    ['Indirizzo', persona.indirizzo],
    ['CAP', persona.cap],
    ['Provincia', persona.provincia],
    ['Nazione', persona.nazione],
  ] : []
  return (
    <Modal open={!!persona} onClose={onClose} title="Dettaglio dipendente" size="md">
      {persona && (
        <div className="flex gap-5">
          <div className="flex-none">
            <img src={avatarUrl(fullName || String(persona.id ?? ''))} alt={fullName}
              className="w-28 h-36 rounded-lg object-cover border border-line bg-canvas" />
          </div>
          <dl className="flex-1 grid grid-cols-2 gap-x-5 gap-y-3 text-[13px] m-0">
            {fields.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-text-muted text-[11px]">{label}</dt>
                <dd className="m-0 font-semibold text-text break-words">{value ? String(value) : '-'}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  )
}
