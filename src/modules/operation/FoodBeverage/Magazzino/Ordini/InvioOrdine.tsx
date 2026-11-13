// ─── Ordini ai fornitori: invio per email ────────────────────────────────────
//  Destinatari, oggetto e messaggio precompilati; il PDF lo genera la pagina
//  (ordinePdf.ts) e il Portal lo allega all'email (`invia_ordine`). Chiave
//  anti-doppioni riusata nei "Riprova": l'email non parte due volte.

import React, { useEffect, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import { toast } from '../../../../../core/components/Toast/useToast'
import { InputField, TextareaField } from '../../../../../core/components/form'
import { eseguiMag } from '../api/magazzinoFbOp'
import type { Ordine } from '../api/tipi'
import { fmtData } from '../comune/formato'
import { MagCorpo, MagErrore, MagPiede } from '../comune/MagModale'
import { creaPdfOrdine } from '../comune/ordinePdf'
import { useInvio } from '../comune/useInvio'
import './OrdineModale.sass'

const elenco = (s: string) => s.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean)

interface Props { open: boolean; ordine: Ordine; struttura: string; onClose: () => void; onInviato: () => void }

export default function InvioOrdine({ open, ordine, struttura, onClose, onInviato }: Props) {
  const [a, setA] = useState('')
  const [cc, setCc] = useState('')
  const [oggetto, setOggetto] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const invio = useInvio()
  const { azzera } = invio

  useEffect(() => {
    if (!open) return
    azzera()
    setA(ordine.inviato_a.length ? ordine.inviato_a.join(', ') : ordine.fornitore.email ?? '')
    setCc('')
    setOggetto(`Ordine ${ordine.numero} — ${struttura}`)
    setMessaggio([
      'Buongiorno,',
      '',
      `in allegato l'ordine ${ordine.numero} di ${struttura}${ordine.consegna_richiesta ? `, con consegna richiesta per il ${fmtData(ordine.consegna_richiesta)}` : ''}.`,
      'Vi chiediamo di confermare disponibilità e data di consegna rispondendo a questa email.',
      '',
      'Grazie,',
      struttura,
    ].join('\n'))
  }, [open, ordine, struttura, azzera])

  const anteprima = () => {
    const pdf = creaPdfOrdine(ordine, struttura)
    const url = URL.createObjectURL(pdf.blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const invia = async () => {
    const pdf = creaPdfOrdine(ordine, struttura)
    const e = await invio.esegui(id => eseguiMag('invia_ordine', {
      id: ordine.id, id_operazione: id, a: elenco(a), cc: elenco(cc), oggetto: oggetto.trim(), messaggio,
      pdf: { nome_file: pdf.nomeFile, dati: pdf.base64 },
    }))
    if (e) {
      toast.success(e.duplicato ? `L'ordine ${ordine.numero} era già stato inviato.` : `Ordine ${ordine.numero} inviato a ${elenco(a).join(', ')}.`)
      onInviato()
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Invia l’ordine ${ordine.numero}`}>
      <MagCorpo>
        <InputField name="inv-a" label="A" value={a} placeholder="email del fornitore" hint="Più indirizzi separati da virgola" onChange={e => setA(e.target.value)} />
        <InputField name="inv-cc" label="Copia (facoltativa)" value={cc} onChange={e => setCc(e.target.value)} />
        <InputField name="inv-ogg" label="Oggetto" value={oggetto} onChange={e => setOggetto(e.target.value)} />
        <TextareaField name="inv-msg" label="Messaggio" rows={8} value={messaggio} onChange={e => setMessaggio(e.target.value)} />
        <p className="magord__allegato">
          <i className="fa-regular fa-file-pdf" aria-hidden="true" /> Allegato: {ordine.numero}.pdf
          <button type="button" className="magord__link" onClick={anteprima}>Anteprima</button>
        </p>
        {!ordine.fornitore.email && <p className="magpag__nota">Il fornitore non ha un’email in anagrafica: scrivila qui o aggiungila in Impostazioni.</p>}
        <MagErrore testo={invio.errore} />
        <MagPiede
          onAnnulla={onClose} onConferma={invia} etichetta="Invia" icona="fa-paper-plane"
          inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={!elenco(a).length || !oggetto.trim()}
        />
      </MagCorpo>
    </Modal>
  )
}
