import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
import Tooltip from '../../../core/components/Tooltip'
import Modal from '../../../core/components/Modal'
import { toast } from '../../../core/components/Toast/useToast'
import './CodiceSconti.sass'

interface Props { navigate: (p: string) => void }

interface Sconto {
  id: number; azienda: string; utente: string; dataFine: string; quantita: string
  percentuale: string; valore: string; codice: string; deleted: boolean; struttura: string
  tipo: string; classe: string; entita: string; alloggio: string; discriminatore: string
}

const COLS = ['Azienda', 'Utente', 'Data Fine', 'Quantità', 'Percentuale', 'Valore', 'Codice', 'Deleted', 'Struttura', 'Tipo', 'Classe', 'Entità', 'Alloggio', 'Discriminatore', 'Azioni']

const AZIENDE = ['Sibylla', 'GAR S.R.L.', 'Reservation Hotel Italy']
const TIPI = ['Sconto', 'Promo', 'Fidelity']
const CLASSI = ['Standard', 'Premium', 'Gold']
const ENTITA = ['Azienda', 'Struttura', 'Utente']
const DISCR = ['Prenotazione', 'Soggiorno', 'Servizio']

const EMPTY = {
  azienda: '', codice: '', dataFine: '', quantita: '', percentuale: '', valore: '',
  idUtente: '', idStruttura: '', tipo: '', classe: '', entita: '', alloggio: '', discriminatore: '', eliminato: false,
}

export default function CodiceSconti({ navigate }: Props) {
  const [rows, setRows] = useState<Sconto[]>([])
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ ...EMPTY })
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF(p => ({ ...p, [k]: v }))

  const openCreate = () => { setF({ ...EMPTY }); setOpen(true) }
  const create = () => {
    if (!f.azienda || !f.codice.trim()) return
    const id = Math.max(0, ...rows.map(r => r.id)) + 1
    setRows(prev => [...prev, {
      id, azienda: f.azienda, utente: f.idUtente, dataFine: f.dataFine, quantita: f.quantita,
      percentuale: f.percentuale, valore: f.valore, codice: f.codice.trim(), deleted: f.eliminato,
      struttura: f.idStruttura, tipo: f.tipo, classe: f.classe, entita: f.entita, alloggio: f.alloggio, discriminatore: f.discriminatore,
    }])
    toast.success(`Codice sconto «${f.codice.trim()}» creato.`, 'Codice sconto')
    setOpen(false)
  }
  const remove = (s: Sconto) => {
    setRows(prev => prev.filter(r => r.id !== s.id))
    toast.success(`Codice ${s.codice} eliminato.`, 'Codice sconto')
  }

  return (
    <div className="csc">
      <button type="button" className="csc__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="csc__head">
        <h1 className="csc__title">Crea Codice Sconti</h1>
        <p className="csc__sub">Crea e gestisci i codici sconto per aziende e strutture.</p>
      </div>

      <div className="csc__toolbar">
        <button type="button" className="csc__btn" onClick={openCreate}>Crea codici sconto</button>
      </div>

      <div className="sib-table-wrap csc__wrap">
        <table className="sib-table csc__table">
          <thead>
            <tr>{COLS.map(c => <th key={c} className={c === 'Azioni' ? 'csc__th-actions' : undefined}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={COLS.length} className="csc__empty">Nessun codice sconto creato.</td></tr>
            )}
            {rows.map(s => (
              <tr key={s.id}>
                <td className="csc__strong">{s.azienda}</td>
                <td>{s.utente || '—'}</td>
                <td>{s.dataFine || '—'}</td>
                <td>{s.quantita || '—'}</td>
                <td>{s.percentuale || '—'}</td>
                <td>{s.valore || '—'}</td>
                <td>{s.codice}</td>
                <td>{s.deleted ? 'Sì' : 'No'}</td>
                <td>{s.struttura || '—'}</td>
                <td>{s.tipo || '—'}</td>
                <td>{s.classe || '—'}</td>
                <td>{s.entita || '—'}</td>
                <td>{s.alloggio || '—'}</td>
                <td>{s.discriminatore || '—'}</td>
                <td className="csc__actions">
                  <Tooltip text="Elimina">
                    <button type="button" className="csc__icon" onClick={() => remove(s)}><Ico n="trash" s={13} c="var(--color-text-inactive)" /></button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Crea Codice Sconto" size="xl">
        <div className="csc-modal">
          <h3 className="csc-modal__section">Informazioni Generali</h3>
          <div className="csc-modal__grid">
            <div className="csc-modal__f">
              <label>Nome azienda</label>
              <select className="csc-modal__sel" value={f.azienda} onChange={e => set('azienda', e.target.value)}>
                <option value="">-- Seleziona --</option>{AZIENDE.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="csc-modal__f">
              <label>Codice</label>
              <input value={f.codice} onChange={e => set('codice', e.target.value)} />
            </div>

            <div className="csc-modal__f">
              <label>Data Fine Validità</label>
              <input type="date" value={f.dataFine} onChange={e => set('dataFine', e.target.value)} />
            </div>
            <div className="csc-modal__f">
              <label>Quantità</label>
              <input type="number" min={0} value={f.quantita} onChange={e => set('quantita', e.target.value)} />
            </div>

            <div className="csc-modal__f">
              <label>Percentuale</label>
              <input type="number" min={0} max={100} value={f.percentuale} onChange={e => set('percentuale', e.target.value)} />
            </div>
            <div className="csc-modal__f">
              <label>Valore</label>
              <input type="number" min={0} value={f.valore} onChange={e => set('valore', e.target.value)} />
            </div>

            <div className="csc-modal__f">
              <label>Id Utente</label>
              <input className="csc-modal__search" value={f.idUtente} onChange={e => set('idUtente', e.target.value)} placeholder="Cerca per nome o cognome..." />
            </div>
            <div className="csc-modal__f">
              <label>Id Struttura</label>
              <input className="csc-modal__search" value={f.idStruttura} onChange={e => set('idStruttura', e.target.value)} placeholder="Cerca struttura..." />
            </div>

            <div className="csc-modal__triple">
              <div className="csc-modal__f">
                <label>Tipo</label>
                <select className="csc-modal__sel" value={f.tipo} onChange={e => set('tipo', e.target.value)}>
                  <option value="">-- Seleziona --</option>{TIPI.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="csc-modal__f">
                <label>Classe</label>
                <select className="csc-modal__sel" value={f.classe} onChange={e => set('classe', e.target.value)}>
                  <option value="">-- Seleziona Classe --</option>{CLASSI.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="csc-modal__f">
                <label>Entità</label>
                <select className="csc-modal__sel" value={f.entita} onChange={e => set('entita', e.target.value)}>
                  <option value="">-- Seleziona Entità --</option>{ENTITA.map(en => <option key={en} value={en}>{en}</option>)}
                </select>
              </div>
            </div>

            <div className="csc-modal__f">
              <label>Alloggio</label>
              <input className="csc-modal__search" value={f.alloggio} onChange={e => set('alloggio', e.target.value)} placeholder="Cerca alloggio..." />
            </div>
            <div className="csc-modal__f">
              <label>Discriminatore</label>
              <select className="csc-modal__sel" value={f.discriminatore} onChange={e => set('discriminatore', e.target.value)}>
                <option value="">-- Seleziona --</option>{DISCR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <label className="csc-modal__check">
              Eliminato
              <input type="checkbox" checked={f.eliminato} onChange={e => set('eliminato', e.target.checked)} />
            </label>
          </div>
          <button type="button" className="csc-modal__btn" disabled={!f.azienda || !f.codice.trim()} onClick={create}>Crea Codice Sconto</button>
        </div>
      </Modal>
    </div>
  )
}
