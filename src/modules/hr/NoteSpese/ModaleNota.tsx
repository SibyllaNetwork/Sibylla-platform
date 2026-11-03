import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import TruncatedText from '../../../core/components/TruncatedText'
import Ico from '../../../core/icons/Ico'
import { SelectField, InputField, DatePickerField, TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useHrGestioneStore, DIPENDENTI_HR, TRASPORTI, VITTO_ALTRO, todayIsoHr, nomeDipendente, eurHr,
  type CategoriaSpesa,
} from '../../../store/useHrGestioneStore'
import './ModaleNota.sass'

/**
 * "Aggiungi nota" — una spesa con la sua ricevuta. Condivisa fra l'elenco di Nota
 * spese e il foglio mensile del dipendente (che passa dipendente, giorno e voce).
 */

const MAX_MB = 3

interface Props {
  open: boolean
  onClose: () => void
  /** Dipendente fissato (foglio mensile): il campo non si mostra. */
  dipendenteId?: number
  data?: string
  voce?: CategoriaSpesa
}

export default function ModaleNota({ open, onClose, dipendenteId, data, voce }: Props) {
  const aggiungi = useHrGestioneStore(s => s.aggiungiSpesa)
  const [dip, setDip] = useState('')
  const [giorno, setGiorno] = useState(todayIsoHr())
  const [causale, setCausale] = useState('')
  const [importo, setImporto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [ricevuta, setRicevuta] = useState<{ nome: string; kb: number } | null>(null)
  const [errori, setErrori] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setDip(dipendenteId ? String(dipendenteId) : '')
    setGiorno(data ?? todayIsoHr())
    setCausale(voce ?? '')
    setImporto('')
    setDescrizione('')
    setRicevuta(null)
    setErrori({})
  }, [open, dipendenteId, data, voce])

  const scegliFile = (f: File | undefined) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErrori(e => ({ ...e, ricevuta: 'La ricevuta deve essere un PDF' }))
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrori(e => ({ ...e, ricevuta: `Il file supera ${MAX_MB} MB: comprimilo o scansionalo a risoluzione più bassa` }))
      return
    }
    setErrori(e => { const { ricevuta: _, ...r } = e; return r })
    setRicevuta({ nome: f.name, kb: Math.max(1, Math.round(f.size / 1024)) })
  }

  const salva = () => {
    const e: Record<string, string> = {}
    const val = Number(importo.replace(',', '.'))
    if (!dip) e.dip = 'Scegli il dipendente'
    if (!giorno) e.giorno = 'Indica la data'
    if (!causale) e.causale = 'Scegli la voce di spesa'
    if (!(val > 0)) e.importo = 'Importo non valido'
    if (!ricevuta) e.ricevuta = 'Allega la ricevuta in PDF'
    setErrori(e)
    if (Object.keys(e).length) return
    aggiungi({
      dipendenteId: Number(dip),
      data: giorno,
      categoria: causale as CategoriaSpesa,
      importo: Math.round(val * 100) / 100,
      descrizione: descrizione.trim() || causale,
      giustificativo: ricevuta!.nome,
    })
    toast.success(`${causale} di ${eurHr(val)} per ${nomeDipendente(Number(dip))}: in attesa di approvazione.`, 'Nota aggiunta')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Aggiungi nota" size="sm">
      <div className="mnota">
        {!dipendenteId && (
          <SelectField name="mn-dip" label="Dipendente" required value={dip} error={errori.dip}
            onChange={e => setDip(e.target.value)}
            options={[{ value: '', label: 'Seleziona…' }, ...DIPENDENTI_HR.map(d => ({ value: d.id, label: `${d.nome} ${d.cognome}` }))]} />
        )}
        <DatePickerField name="mn-data" label="Data della spesa" required value={giorno} max={todayIsoHr()} error={errori.giorno}
          onChange={e => setGiorno(e.target.value)} />
        <SelectField name="mn-causale" label="Causale richiesta" required value={causale} error={errori.causale}
          onChange={e => setCausale(e.target.value)}
          options={[
            { value: '', label: 'Seleziona la voce…' },
            ...TRASPORTI.map(c => ({ value: c, label: `Trasporti · ${c}` })),
            ...VITTO_ALTRO.map(c => ({ value: c, label: `Vitto e altro · ${c}` })),
          ]} />
        <InputField name="mn-importo" label="Totale rimborso (€)" required type="number" min={0} step={0.01} placeholder="0,00"
          value={importo} error={errori.importo} onChange={e => setImporto(e.target.value)} />
        <TextareaField name="mn-descr" label="Descrizione" rows={2} value={descrizione}
          hint="Facoltativa: per esempio il motivo della trasferta"
          onChange={e => setDescrizione(e.target.value)} />

        <div className="mnota__file">
          <span className="mnota__label">Ricevuta (PDF) <span className="mnota__req">*</span></span>
          <div className="mnota__file-row">
            <label className="sib-btn sib-btn--secondary mnota__upload">
              <i className="fa-regular fa-file-pdf" aria-hidden="true" /> {ricevuta ? 'Sostituisci' : 'Scegli file'}
              <input type="file" accept="application/pdf,.pdf" hidden onChange={e => { scegliFile(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            <span className="mnota__filename">
              {ricevuta ? <TruncatedText text={`${ricevuta.nome} · ${ricevuta.kb} KB`} /> : 'Nessun file selezionato'}
            </span>
          </div>
          {errori.ricevuta
            ? <span className="mnota__err">{errori.ricevuta}</span>
            : <span className="mnota__hint">Una sola ricevuta in PDF per ogni nota, massimo {MAX_MB} MB. Per più ricevute inserisci più note.</span>}
        </div>

        <div className="mnota__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>
            <Ico n="plus" s={13} c="currentColor" /> Aggiungi nota
          </button>
        </div>
      </div>
    </Modal>
  )
}
