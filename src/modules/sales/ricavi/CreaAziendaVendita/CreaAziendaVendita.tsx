import React, { useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import { InputField } from '../../../../core/components/form'

// Crea nuova azienda (Ditta/Agenzia) — pagina full: in alto il form di
// creazione/modifica, sotto la tabella delle aziende create (modifica/elimina).
// Collegata ai sottomenu Contratti di vendita / acquisto (page `crea-azienda-v`).

interface Azienda {
  id: number
  ragioneSociale: string
  indirizzo: string
  email: string
  telefono: string
  pIva: string
  codFiscale: string
  codiceDestinatario: string
  pec: string
  nomeDitta: string
}

const EMPTY: Omit<Azienda, 'id'> = {
  ragioneSociale: '', indirizzo: '', email: '', telefono: '', pIva: '',
  codFiscale: '', codiceDestinatario: '', pec: '', nomeDitta: '',
}

const SEED: Azienda[] = [
  { id: 1, ragioneSociale: 'ITALCAMEL', indirizzo: 'Via Roma, 31, 20098 San Giuliano Milanese MI', email: 'ditta@ditta.ditta', telefono: '32433233443', pIva: '86334519757', codFiscale: '12345678901', codiceDestinatario: 'ABCDEF1', pec: 'italcamel@pec.it', nomeDitta: 'Italcamel Srl' },
  { id: 2, ragioneSociale: 'Ovest Destination Italy', indirizzo: 'Via dei Mille 30, 00185 Roma RM', email: 'ovest@destiny.com', telefono: '024685', pIva: '46450380624', codFiscale: '123456789456', codiceDestinatario: 'XYZ1234', pec: 'ovest@pec.it', nomeDitta: 'Ovest Destination' },
]

export default function CreaAziendaVendita({ navigate }: { navigate: (p: string) => void }) {
  const [aziende, setAziende] = useState<Azienda[]>(SEED)
  const [form, setForm] = useState<Omit<Azienda, 'id'>>(EMPTY)
  const [editingId, setEditingId] = useState<number | null>(null)

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const reset = () => { setForm(EMPTY); setEditingId(null) }

  const salva = () => {
    if (!form.ragioneSociale.trim()) return
    if (editingId != null) {
      setAziende((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...form } : a)))
    } else {
      setAziende((prev) => [{ ...form, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }, ...prev])
    }
    reset()
  }
  const modifica = (a: Azienda) => {
    const { id, ...rest } = a
    setForm(rest); setEditingId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const elimina = (id: number) => {
    setAziende((prev) => prev.filter((a) => a.id !== id))
    if (editingId === id) reset()
  }

  return (
    <div>
      <PageHead title="Crea nuova azienda" subtitle="Crea e gestisci le anagrafiche delle aziende" onBack={() => navigate('miei-contratti-v')} />

      {/* ── Form creazione / modifica ─────────────────────────────────────── */}
      <h2 className="text-[15px] font-bold text-primary font-poppins mb-3">
        {editingId != null ? 'Modifica azienda' : 'Crea anagrafica azienda'}
      </h2>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
          <InputField name="ragioneSociale" label="Ragione sociale" required placeholder="Inserisci nome azienda"
            value={form.ragioneSociale} onChange={(e) => set('ragioneSociale', e.target.value)} />
          <InputField name="indirizzo" label="Indirizzo" placeholder="Clicca per cercare indirizzo"
            value={form.indirizzo} onChange={(e) => set('indirizzo', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField name="email" label="E-mail" type="email" placeholder="Inserisci email"
            value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField name="telefono" label="Telefono" placeholder="Inserisci telefono"
            value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          <InputField name="pIva" label="P. Iva" placeholder="Inserisci Partita iva"
            value={form.pIva} onChange={(e) => set('pIva', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField name="codFiscale" label="Cod. Fiscale" placeholder="Inserisci codice fiscale"
            value={form.codFiscale} onChange={(e) => set('codFiscale', e.target.value)} />
          <InputField name="codiceDestinatario" label="Codice Destinatario (ISD)" placeholder="Inserisci il codice destinatario"
            value={form.codiceDestinatario} onChange={(e) => set('codiceDestinatario', e.target.value)} />
          <InputField name="pec" label="PEC" placeholder="Inserisci Pec"
            value={form.pec} onChange={(e) => set('pec', e.target.value)} />
        </div>
        <div className="md:w-1/3">
          <InputField name="nomeDitta" label="Nome ditta" placeholder="Inserisci nome ditta"
            value={form.nomeDitta} onChange={(e) => set('nomeDitta', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        {editingId != null && (
          <button type="button" className="sib-btn sib-btn--secondary" onClick={reset}>Annulla</button>
        )}
        <button type="button" className="sib-btn sib-btn--primary" disabled={!form.ragioneSociale.trim()} onClick={salva}>
          <i className={`fa-light ${editingId != null ? 'fa-floppy-disk' : 'fa-circle-plus'}`} />
          {editingId != null ? 'Aggiorna azienda' : 'Aggiungi azienda'}
        </button>
      </div>

      {/* ── Tabella aziende create ────────────────────────────────────────── */}
      <h2 className="text-[15px] font-bold text-primary font-poppins mt-8 mb-3">Aziende create</h2>
      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Ragione sociale</th>
              <th>Nome ditta</th>
              <th>Indirizzo</th>
              <th>E-mail</th>
              <th>Telefono</th>
              <th>P. IVA</th>
              <th>Cod. Fiscale</th>
              <th>PEC</th>
              <th className="text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {aziende.length === 0 ? (
              <tr><td colSpan={9} className="sib-empty">Nessuna azienda creata.</td></tr>
            ) : aziende.map((a) => (
              <tr key={a.id} className={editingId === a.id ? 'bg-primary-50' : ''}>
                <td>{a.ragioneSociale}</td>
                <td className={a.nomeDitta ? '' : 'sib-cell--muted'}>{a.nomeDitta || '-'}</td>
                <td className={a.indirizzo ? '' : 'sib-cell--muted'}>{a.indirizzo || '-'}</td>
                <td>{a.email || '-'}</td>
                <td>{a.telefono || '-'}</td>
                <td>{a.pIva || '-'}</td>
                <td>{a.codFiscale || '-'}</td>
                <td>{a.pec || '-'}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Tooltip text="Modifica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => modifica(a)}>
                        <i className="fa-light fa-pen-to-square" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => elimina(a.id)}>
                        <i className="fa-light fa-trash" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
