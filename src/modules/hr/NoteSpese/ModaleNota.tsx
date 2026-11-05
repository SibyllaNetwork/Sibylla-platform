import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField, InputField, DatePickerField, TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useHrGestioneStore, DIPENDENTI_HR, TRASPORTI, VITTO_ALTRO, STATI_SPESA, todayIsoHr, nomeDipendente, eurHr, fmtDataHr,
  type CategoriaSpesa, type NotaSpesa, type StatoSpesa,
} from '../../../store/useHrGestioneStore'
import StoricoHr from '../_storico/StoricoHr'
import './ModaleNota.sass'

/**
 * "Modifica nota": le spese le inserisce il dipendente dall'App Op! con la sua
 * ricevuta; l'ufficio del personale qui corregge ogni valore (dipendente, data,
 * voce, importo, descrizione, ricevuta, stato) e può scrivere un messaggio al
 * dipendente. Ogni correzione finisce nello storico della nota.
 * Condivisa fra l'elenco di Nota spese e il foglio mensile del dipendente.
 */

const MAX_MB = 3

interface Props {
  /** La nota da correggere; null = modale chiusa. */
  nota: NotaSpesa | null
  onClose: () => void
}

function differenze(a: NotaSpesa, b: Pick<NotaSpesa, 'dipendenteId' | 'data' | 'categoria' | 'importo' | 'descrizione' | 'giustificativo' | 'stato' | 'motivo'>) {
  const out: string[] = []
  if (a.dipendenteId !== b.dipendenteId) out.push(`Dipendente: ${nomeDipendente(a.dipendenteId)} → ${nomeDipendente(b.dipendenteId)}`)
  if (a.data !== b.data) out.push(`Data: ${fmtDataHr(a.data)} → ${fmtDataHr(b.data)}`)
  if (a.categoria !== b.categoria) out.push(`Voce: ${a.categoria} → ${b.categoria}`)
  if (a.importo !== b.importo) out.push(`Importo: ${eurHr(a.importo)} → ${eurHr(b.importo)}`)
  if (a.descrizione !== b.descrizione) out.push(`Descrizione: «${b.descrizione}»`)
  if ((a.giustificativo ?? '') !== (b.giustificativo ?? '')) out.push(b.giustificativo ? `Ricevuta sostituita: ${b.giustificativo}` : 'Ricevuta rimossa')
  if (a.stato !== b.stato) out.push(`Stato: ${a.stato} → ${b.stato}`)
  else if (b.stato === 'Rifiutata' && (a.motivo ?? '') !== (b.motivo ?? '')) out.push('Motivo del rifiuto aggiornato')
  return out
}

export default function ModaleNota({ nota, onClose }: Props) {
  const modifica = useHrGestioneStore(s => s.modificaSpesa)
  const [dip, setDip] = useState('')
  const [giorno, setGiorno] = useState(todayIsoHr())
  const [causale, setCausale] = useState('')
  const [importo, setImporto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [ricevuta, setRicevuta] = useState<string | null>(null)
  const [stato, setStato] = useState<StatoSpesa>('Da approvare')
  const [motivo, setMotivo] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [errori, setErrori] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!nota) return
    setDip(String(nota.dipendenteId))
    setGiorno(nota.data)
    setCausale(nota.categoria)
    setImporto(String(nota.importo))
    setDescrizione(nota.descrizione)
    setRicevuta(nota.giustificativo ?? null)
    setStato(nota.stato)
    setMotivo(nota.motivo ?? '')
    setMessaggio('')
    setErrori({})
  }, [nota])

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
    setRicevuta(f.name)
  }

  const salva = () => {
    if (!nota) return
    const e: Record<string, string> = {}
    const val = Number(importo.replace(',', '.'))
    if (!dip) e.dip = 'Scegli il dipendente'
    if (!giorno) e.giorno = 'Indica la data'
    if (!causale) e.causale = 'Scegli la voce di spesa'
    if (!(val > 0)) e.importo = 'Importo non valido'
    if (stato === 'Rifiutata' && !motivo.trim()) e.motivo = 'Indica il motivo del rifiuto'
    if ((stato === 'Approvata' || stato === 'Rimborsata') && !ricevuta) e.ricevuta = 'Senza ricevuta la spesa non si può approvare né rimborsare'
    setErrori(e)
    if (Object.keys(e).length) return
    const dopo = {
      dipendenteId: Number(dip),
      data: giorno,
      categoria: causale as CategoriaSpesa,
      importo: Math.round(val * 100) / 100,
      descrizione: descrizione.trim() || causale,
      giustificativo: ricevuta ?? undefined,
      stato,
      motivo: stato === 'Rifiutata' ? motivo.trim() : undefined,
    }
    const modifiche = differenze(nota, dopo)
    if (!modifiche.length) { toast.info('Non hai cambiato nessun valore.', 'Nessuna modifica'); return }
    modifica(nota.id, dopo, modifiche, messaggio.trim() || dopo.motivo)
    toast.success(`Nota di ${nomeDipendente(dopo.dipendenteId)} aggiornata.`, 'Nota modificata')
    onClose()
  }

  return (
    <Modal open={!!nota} onClose={onClose} title="Modifica nota" size="sm">
      {nota && (
        <div className="mnota">
          <SelectField name="mn-dip" label="Dipendente" required value={dip} error={errori.dip}
            onChange={e => setDip(e.target.value)}
            options={[{ value: '', label: 'Seleziona…' }, ...DIPENDENTI_HR.map(d => ({ value: String(d.id), label: `${d.nome} ${d.cognome}` }))]} />
          <DatePickerField name="mn-data" label="Data della spesa" required value={giorno} max={todayIsoHr()} error={errori.giorno}
            onChange={e => setGiorno(e.target.value)} />
          <SelectField name="mn-causale" label="Voce di spesa" required value={causale} error={errori.causale}
            onChange={e => setCausale(e.target.value)}
            options={[
              { value: '', label: 'Seleziona la voce…' },
              ...TRASPORTI.map(c => ({ value: c, label: `Trasporti · ${c}` })),
              ...VITTO_ALTRO.map(c => ({ value: c, label: `Vitto e altro · ${c}` })),
            ]} />
          <InputField name="mn-importo" label="Totale rimborso (€)" required type="number" min={0} step={0.01} placeholder="0,00"
            value={importo} error={errori.importo} onChange={e => setImporto(e.target.value)} />
          <TextareaField name="mn-descr" label="Descrizione" rows={2} value={descrizione}
            onChange={e => setDescrizione(e.target.value)} />

          <div className="mnota__file">
            <span className="mnota__label">Ricevuta (PDF)</span>
            <div className="mnota__file-row">
              <label className="sib-btn sib-btn--secondary mnota__upload">
                <i className="fa-regular fa-file-pdf" aria-hidden="true" /> {ricevuta ? 'Sostituisci' : 'Carica ricevuta'}
                <input type="file" accept="application/pdf,.pdf" hidden onChange={e => { scegliFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              {ricevuta && (
                <button type="button" className="sib-btn sib-btn--secondary mnota__upload" onClick={() => setRicevuta(null)}>Rimuovi</button>
              )}
              <span className="mnota__filename">
                {ricevuta ? <TruncatedText text={ricevuta} /> : 'Nessuna ricevuta allegata'}
              </span>
            </div>
            {errori.ricevuta
              ? <span className="mnota__err">{errori.ricevuta}</span>
              : <span className="mnota__hint">La carica il dipendente dall'App Op!: sostituiscila solo se ti ha consegnato quella giusta. PDF, massimo {MAX_MB} MB.</span>}
          </div>

          <SelectField name="mn-stato" label="Stato" value={stato}
            onChange={e => setStato(e.target.value as StatoSpesa)}
            options={STATI_SPESA.map(s => ({ value: s, label: s }))} />
          {stato === 'Rifiutata' && (
            <TextareaField name="mn-motivo" label="Motivo del rifiuto" required rows={2} value={motivo} error={errori.motivo}
              hint="Il dipendente lo vedrà accanto alla spesa"
              onChange={e => setMotivo(e.target.value)} />
          )}
          <TextareaField name="mn-messaggio" label="Messaggio al dipendente" rows={2} value={messaggio}
            hint="Facoltativo: spiega la correzione. Il dipendente riceve la notifica nell'App Op! con le modifiche"
            onChange={e => setMessaggio(e.target.value)} />

          <StoricoHr origine={{ autore: nomeDipendente(nota.dipendenteId) }} storico={nota.storico} />

          <div className="mnota__actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>Salva modifiche</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
