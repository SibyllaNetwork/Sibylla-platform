import React, { useMemo, useState } from 'react'
import Modal from '../../core/components/Modal'
import AlertBanner from '../../core/components/AlertBanner'
import { SelectField } from '../../core/components/form'
import { useCatalogoStore } from '../../store/useCatalogoStore'
import { useHrConfigStore, findById } from '../../store/useHrConfigStore'
import {
  useCollaboratoriEsterniStore, chiaveOpEsterno, statoAutorizzazione, STATO_AUT_LABEL,
} from '../../store/useCollaboratoriEsterniStore'
import { useAnagraficaOpStore, abilitazioneVuota } from '../../store/useAnagraficaOpStore'
import { nomeReparto } from './opCatalogo'
import type { DipendenteOp, InvitoOp, StrutturaOp } from './opApi'
import { invitaDipendenteOp } from './invitoAnagrafica'
import './OpInvitaEsternoModal.sass'

// ─── INVITA UN COLLABORATORE ESTERNO ALL'APP OP! ─────────────────────────────
//  Dal Configuratore › App Op! › Utenze: si sceglie un addetto di una ditta in
//  appalto già registrato in HR (Archivio › Collaboratori esterni) con
//  autorizzazione in corso e non ancora presente tra le utenze; entra nell'app
//  con grado Impiegato nei soli reparti consentiti dalla sua categoria.

export default function OpInvitaEsternoModal({ open, onClose, dipendenti, struttura, onInvitato, onNuovo }: {
  open: boolean
  onClose: () => void
  dipendenti: DipendenteOp[]
  struttura: StrutturaOp | null
  onInvitato: (invito: InvitoOp, nome: string) => void
  /** Apre la scheda per registrare un nuovo collaboratore esterno. */
  onNuovo?: () => void
}) {
  const collaboratori = useCollaboratoriEsterniStore((s) => s.collaboratori)
  const categorie = useHrConfigStore((s) => s.categorieEsterni)
  const fornitori = useCatalogoStore((s) => s.fornitori)
  const abilitazioni = useAnagraficaOpStore((s) => s.abilitazioni)
  const [scelto, setScelto] = useState('')
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const emailUtenze = useMemo(() => new Set(dipendenti.map((d) => d.email.toLowerCase())), [dipendenti])
  const invitabili = collaboratori.filter((c) =>
    ['attiva', 'in-scadenza'].includes(statoAutorizzazione(c)) && c.email && !emailUtenze.has(c.email.toLowerCase()))
  const esclusi = collaboratori.length - invitabili.length
  const c = invitabili.find((x) => x.id === scelto)
  const cat = c ? findById(categorie, c.categoriaId) : undefined
  const azienda = c ? fornitori.find((f) => f.id === c.fornitoreId)?.nome : undefined

  const chiudi = () => { setScelto(''); setErrore(null); onClose() }

  const invia = async () => {
    if (!c || !cat) return
    setInvio(true); setErrore(null)
    try {
      const abil = abilitazioni[chiaveOpEsterno(c.id)] ?? abilitazioneVuota()
      const reparti = abil.reparti.filter((r) => cat.repartiOp.includes(r))
      const inv = await invitaDipendenteOp(chiaveOpEsterno(c.id), c, {
        ...abil, abilitato: true, emailAziendale: c.email, livello: 'impiegato', hr: false, responsabile: false,
        reparti: reparti.length ? reparti : cat.repartiOp,
      }, struttura)
      onInvitato(inv, `${c.nome} ${c.cognome}`)
      chiudi()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Invito non inviato.')
    } finally {
      setInvio(false)
    }
  }

  return (
    <Modal open={open} onClose={chiudi} title="Invita un collaboratore esterno" size="md" className="op-inv-est">
      <div className="op-inv-est__body">
        <p className="op-inv-est__nota">
          Addetti delle ditte in appalto registrati in Human Resources, con autorizzazione in corso. Entrano nell’app con grado
          Impiegato e solo nei reparti consentiti dalla loro categoria.
        </p>
        {errore && <AlertBanner type="error">{errore}</AlertBanner>}
        <SelectField name="op-est" label="Collaboratore esterno" value={scelto} onChange={(e) => setScelto(e.target.value)}
          options={[{ value: '', label: invitabili.length ? 'Seleziona' : 'Nessun collaboratore invitabile' },
            ...invitabili.map((x) => ({ value: x.id, label: `${x.cognome} ${x.nome} — ${fornitori.find((f) => f.id === x.fornitoreId)?.nome ?? ''}` }))]} />
        {c && (
          <dl className="op-inv-est__info">
            <div><dt>Azienda</dt><dd>{azienda ?? '—'}</dd></div>
            <div><dt>Categoria</dt><dd>{cat?.nome ?? '—'}</dd></div>
            <div><dt>Reparti nell’app</dt><dd>{cat ? cat.repartiOp.map(nomeReparto).join(', ') : '—'}</dd></div>
            <div><dt>Autorizzazione</dt><dd>{STATO_AUT_LABEL[statoAutorizzazione(c)]} fino al {c.autorizzatoAl.split('-').reverse().join('/')}</dd></div>
            <div><dt>Email</dt><dd>{c.email}</dd></div>
          </dl>
        )}
        {esclusi > 0 && (
          <p className="op-inv-est__muted">{esclusi} collaboratori non compaiono: hanno già un’utenza, non hanno email o non sono autorizzati oggi.</p>
        )}
      </div>
      <div className="op-inv-est__footer">
        {onNuovo && (
          <button type="button" className="sib-btn sib-btn--ghost op-inv-est__new" onClick={() => { chiudi(); onNuovo() }}>
            <i className="fa-light fa-user-plus" /> Nuovo collaboratore
          </button>
        )}
        <button type="button" className="sib-btn sib-btn--ghost" onClick={chiudi}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!c || !cat || invio} onClick={invia}>
          <i className="fa-light fa-paper-plane" /> {invio ? 'Invio in corso…' : 'Invia token di invito'}
        </button>
      </div>
    </Modal>
  )
}
