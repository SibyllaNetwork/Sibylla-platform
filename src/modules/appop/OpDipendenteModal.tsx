import React, { useEffect, useState } from 'react'
import Modal from '../../core/components/Modal'
import Button from '../../core/components/Button/Button'
import { CheckboxField, InputField, SelectField, ToggleSwitch } from '../../core/components/form'
import { LIVELLI_OP, nomeReparto, type LivelloOp, type RepartoOp } from './opCatalogo'
import type { DipendenteOp, DipendenteRichiesta } from './opApi'
import './OpDipendenteModal.sass'

interface Props {
  open: boolean
  /** Dipendente da modificare; assente = nuovo. */
  dipendente?: DipendenteOp | null
  /** Reparti attivi per l'azienda: gli unici assegnabili. */
  reparti: RepartoOp[]
  onClose: () => void
  onSalva: (d: DipendenteRichiesta) => Promise<void>
}

const VUOTO: DipendenteRichiesta = { nome: '', cognome: '', email: '', livello: 'impiegato', reparti: [], responsabileReparti: [], hr: false, inviaInvito: true }

// ─── UTENZA DELL'APP OP! ──────────────────────────────────────────────────────
//  Nome, email aziendale, grado, reparti (tra quelli attivi), reparti di cui è
//  responsabile e HR. Alla creazione si può mandare subito l'invito via email.
export default function OpDipendenteModal({ open, dipendente, reparti, onClose, onSalva }: Props) {
  const [f, setF] = useState<DipendenteRichiesta>(VUOTO)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrore(null)
    setF(dipendente
      ? { nome: dipendente.nome, cognome: dipendente.cognome, email: dipendente.email, livello: dipendente.livello, reparti: dipendente.reparti, responsabileReparti: dipendente.responsabileReparti, hr: dipendente.hr }
      : VUOTO)
  }, [open, dipendente])

  const amministratore = f.livello === 'amministratore'
  const set = <K extends keyof DipendenteRichiesta>(k: K, v: DipendenteRichiesta[K]) => setF(p => ({ ...p, [k]: v }))
  const toggleReparto = (r: RepartoOp, on: boolean) => setF(p => ({
    ...p,
    reparti: on ? [...p.reparti, r] : p.reparti.filter(x => x !== r),
    responsabileReparti: on ? p.responsabileReparti : p.responsabileReparti.filter(x => x !== r),
  }))
  const toggleResponsabile = (r: RepartoOp, on: boolean) =>
    set('responsabileReparti', on ? [...f.responsabileReparti, r] : f.responsabileReparti.filter(x => x !== r))

  const salva = async () => {
    if (!f.nome.trim() || !f.cognome.trim() || !/^\S+@\S+\.\S+$/.test(f.email.trim())) {
      setErrore('Indica nome, cognome e un indirizzo email valido.')
      return
    }
    if (!amministratore && f.reparti.length === 0) { setErrore('Scegli almeno un reparto.'); return }
    if (f.livello === 'responsabile' && f.responsabileReparti.length === 0) { setErrore('Indica di quali reparti è responsabile.'); return }
    setSalvo(true)
    try {
      // L'amministratore ha tutti i reparti attivi dell'azienda, con tutti i loro moduli.
      const ruoli = amministratore ? { reparti, responsabileReparti: [] } : {}
      await onSalva({ ...f, ...ruoli, nome: f.nome.trim(), cognome: f.cognome.trim(), email: f.email.trim().toLowerCase() })
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSalvo(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={dipendente ? `${dipendente.nome} ${dipendente.cognome}` : 'Nuova utenza App Op!'} size="lg">
      <div className="op-dip">
        <div className="op-dip__grid">
          <InputField name="nome" label="Nome" value={f.nome} onChange={e => set('nome', e.target.value)} maxLength={80} required />
          <InputField name="cognome" label="Cognome" value={f.cognome} onChange={e => set('cognome', e.target.value)} maxLength={80} required />
          <InputField
            name="email" type="email" label="Email aziendale" value={f.email} maxLength={254} required
            disabled={dipendente?.stato === 'attivo'}
            hint={dipendente?.stato === 'attivo' ? 'L’account è attivo: l’email è il nome utente e non si cambia.' : 'Qui arriva il codice di invito.'}
            onChange={e => set('email', e.target.value)}
          />
          <SelectField
            name="livello" label="Grado" value={f.livello}
            options={LIVELLI_OP.map(l => ({ value: l.value, label: l.label }))}
            onChange={e => set('livello', e.target.value as LivelloOp)}
          />
        </div>

        <p className="op-dip__label">Reparti</p>
        {reparti.length === 0
          ? <p className="op-dip__vuoto">Attiva prima almeno un reparto.</p>
          : amministratore
            ? <p className="op-dip__vuoto">L’amministratore entra in tutti i reparti attivi dell’azienda, con tutti i moduli sottoscritti, anche quelli attivati in seguito.</p>
            : (
            <div className="op-dip__reparti">
              {reparti.map(r => (
                <div key={r} className="op-dip__reparto">
                  <CheckboxField name={`rep-${r}`} label={nomeReparto(r)} checked={f.reparti.includes(r)} onChange={e => toggleReparto(r, e.target.checked)} />
                  {f.reparti.includes(r) && (
                    <CheckboxField name={`resp-${r}`} label="Responsabile" checked={f.responsabileReparti.includes(r)} onChange={e => toggleResponsabile(r, e.target.checked)} className="op-dip__resp" />
                  )}
                </div>
              ))}
            </div>
          )}

        <div className="op-dip__opzioni">
          <ToggleSwitch checked={f.hr} label="Ufficio del personale (HR)" description="Approvazioni di secondo livello e gestione del personale di tutti i reparti." onChange={v => set('hr', v)} />
          {!dipendente && (
            <CheckboxField name="invito" label="Invia subito l’invito via email" checked={f.inviaInvito !== false} onChange={e => set('inviaInvito', e.target.checked)} />
          )}
        </div>

        {errore && <p className="op-dip__errore">{errore}</p>}
        <div className="op-dip__azioni">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={salva} loading={salvo}>{dipendente ? 'Salva' : 'Crea utenza'}</Button>
        </div>
      </div>
    </Modal>
  )
}
