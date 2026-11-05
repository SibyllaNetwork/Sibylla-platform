import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { DatePickerField, InputField, SelectField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { hhmmToMin, minToHHMM, timbratureAnomale, type Timbratura, type VersoTimbratura } from './presenze.model'
import './ModaleTimbrature.sass'

/**
 * Timbrature di un dipendente in una giornata: l'ufficio del personale aggiunge
 * quelle dimenticate, corregge l'ora o il verso e cancella i doppioni. Ogni
 * modifica si applica subito e ricalcola la presenza della giornata.
 */

export const POSTAZIONI = ['kiosk ingresso personale', 'App Op!', 'principale', 'inserita dall\'HR']

interface Props {
  open: boolean
  titolo: string
  sottotitolo: string
  timbrature: Timbratura[]
  onChange: (timbrature: Timbratura[]) => void
  onClose: () => void
}

const vuoto = (lista: Timbratura[]) => {
  const ultima = [...lista].sort((a, b) => a.min - b.min).pop()
  const verso: VersoTimbratura = ultima?.verso === 'entrata' ? 'uscita' : 'entrata'
  return { ora: verso === 'uscita' ? '18:00' : '09:00', verso, postazione: 'inserita dall\'HR', note: '' }
}

export default function ModaleTimbrature({ open, titolo, sottotitolo, timbrature, onChange, onClose }: Props) {
  const confirm = useConfirmStore((s) => s.confirm)
  const [form, setForm] = useState(() => vuoto(timbrature))
  const [inModifica, setInModifica] = useState<string | null>(null)

  // Ogni apertura riparte da un modulo pulito.
  useEffect(() => { if (open) { setForm(vuoto(timbrature)); setInModifica(null) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const ordinate = [...timbrature].sort((a, b) => a.min - b.min)
  const anomale = timbrature.length > 0 && timbratureAnomale(timbrature)

  function salva() {
    if (!form.ora) return
    const voce: Timbratura = {
      id: inModifica ?? `t${Date.now()}`,
      min: hhmmToMin(form.ora),
      verso: form.verso,
      postazione: form.postazione,
      note: form.note.trim() || undefined,
    }
    const lista = inModifica ? timbrature.map((t) => (t.id === inModifica ? voce : t)) : [...timbrature, voce]
    onChange(lista)
    setInModifica(null)
    setForm(vuoto(lista))
  }

  function modifica(t: Timbratura) {
    setInModifica(t.id)
    setForm({ ora: minToHHMM(t.min), verso: t.verso, postazione: t.postazione, note: t.note ?? '' })
  }

  async function elimina(t: Timbratura) {
    const ok = await confirm({
      title: 'Elimina timbratura',
      message: `Eliminare l'${t.verso} delle ${minToHHMM(t.min)}? La presenza della giornata verrà ricalcolata.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    const lista = timbrature.filter((x) => x.id !== t.id)
    onChange(lista)
    if (inModifica === t.id) setInModifica(null)
    setForm(vuoto(lista))
  }

  return (
    <Modal open={open} onClose={onClose} title={titolo} size="lg">
      <div className="rpt">
        <p className="rpt__sub">{sottotitolo}</p>

        <div className="rpt__form">
          <div className="rpt__form-title">{inModifica ? 'Modifica timbratura' : 'Aggiungi timbratura'}</div>
          <div className="rpt__form-grid">
            <DatePickerField name="ora" label="Ora" type="time" value={form.ora} onChange={(e) => setForm((f) => ({ ...f, ora: e.target.value }))} />
            <SelectField name="verso" label="Tipo" value={form.verso}
              onChange={(e) => setForm((f) => ({ ...f, verso: e.target.value as VersoTimbratura }))}
              options={[{ value: 'entrata', label: 'Entrata' }, { value: 'uscita', label: 'Uscita' }]} />
            <SelectField name="postazione" label="Postazione" value={form.postazione}
              onChange={(e) => setForm((f) => ({ ...f, postazione: e.target.value }))}
              options={POSTAZIONI.map((p) => ({ value: p, label: p }))} />
          </div>
          <InputField name="note" label="Note (opzionale)" placeholder="Es. recupero, timbratura dimenticata…" value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <div className="rpt__form-actions">
            {inModifica && (
              <button type="button" className="sib-btn sib-btn--ghost" onClick={() => { setInModifica(null); setForm(vuoto(timbrature)) }}>Annulla modifica</button>
            )}
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva} disabled={!form.ora}>
              <i className={`fa-solid ${inModifica ? 'fa-check' : 'fa-plus'}`} aria-hidden="true" />
              {inModifica ? 'Salva timbratura' : 'Aggiungi'}
            </button>
          </div>
        </div>

        {anomale && (
          <div className="rpt__alert" role="status">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            Le timbrature non sono accoppiate: manca un'entrata o un'uscita. La giornata resta segnata come anomala finché non la correggi.
          </div>
        )}

        <div className="sib-table-wrap rpt__table">
          <table className="sib-table">
            <colgroup>
              <col className="rpt__c-ora" /><col className="rpt__c-tipo" /><col className="rpt__c-post" /><col /><col className="rpt__c-az" />
            </colgroup>
            <thead>
              <tr><th>Ora</th><th>Tipo</th><th>Postazione</th><th>Note</th><th className="rpt__az">Azioni</th></tr>
            </thead>
            <tbody>
              {ordinate.map((t) => (
                <tr key={t.id} className={inModifica === t.id ? 'rpt__row--edit' : undefined}>
                  <td className="rpt__ora">{minToHHMM(t.min)}</td>
                  <td>
                    <span className={`rpt__verso rpt__verso--${t.verso}`}>
                      <i className={`fa-solid ${t.verso === 'entrata' ? 'fa-right-to-bracket' : 'fa-right-from-bracket'}`} aria-hidden="true" />
                      {t.verso === 'entrata' ? 'Entrata' : 'Uscita'}
                    </span>
                  </td>
                  <td><TruncatedText text={t.postazione} /></td>
                  <td><TruncatedText text={t.note ?? '—'} /></td>
                  <td className="rpt__az">
                    <Tooltip text="Modifica">
                      <button type="button" className="sib-btn sib-btn--icon rpt__ico" aria-label="Modifica timbratura" onClick={() => modifica(t)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina">
                      <button type="button" className="sib-btn sib-btn--icon rpt__ico" aria-label="Elimina timbratura" onClick={() => elimina(t)}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {ordinate.length === 0 && (
                <tr><td colSpan={5} className="rpt__empty">Nessuna timbratura per questa giornata.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rpt__footer">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </Modal>
  )
}
