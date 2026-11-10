// ─── Magazzino ristorazione: modale Nuovo / Modifica fornitore ───────────────
//  `salva_fornitore` (§ 8.9): nuovo = chiunque (con `id_operazione`; se esiste
//  già per partita IVA o nome Op restituisce quello, niente doppioni);
//  modifica = gestore.

import React, { useEffect, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import { InputField } from '../../../../../core/components/form'
import { eseguiMag } from '../api/magazzinoFbOp'
import type { FornitoreRichiesta } from '../api/tipi'
import { MagCorpo, MagErrore, MagGriglia, MagPiede } from './MagModale'
import { useInvio } from './useInvio'

type Campi = Omit<FornitoreRichiesta, 'id' | 'id_operazione'>
const VUOTO: Campi = { nome: '', partita_iva: null, codice_fiscale: null, indirizzo: null, cap: null, comune: null, provincia: null, telefono: null, email: null, pec: null }

interface Props {
  open: boolean
  onClose: () => void
  /** In modifica: id e dati del fornitore. */
  fornitore?: (Campi & { id: number }) | null
  onSalvato: (id: number, nome: string) => void
}

export default function FornitoreForm({ open, onClose, fornitore, onSalvato }: Props) {
  const [c, setC] = useState<Campi>(VUOTO)
  const invio = useInvio()
  const { azzera } = invio

  useEffect(() => {
    if (!open) return
    if (fornitore) { const { id: _id, ...campi } = fornitore; setC({ ...VUOTO, ...campi }) } else setC(VUOTO)
    azzera()
  }, [open, fornitore, azzera])

  const campo = (k: keyof Campi, label: string, extra?: { maxLength?: number; placeholder?: string }) => (
    <InputField
      name={`forn-${k}`} label={label} value={c[k] ?? ''} {...extra}
      onChange={e => setC({ ...c, [k]: k === 'nome' ? e.target.value : e.target.value || null })}
    />
  )

  const salva = async () => {
    const pulito = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || (k === 'nome' ? '' : null)) : v])) as Campi
    const e = await invio.esegui(id => eseguiMag('salva_fornitore', { id: fornitore?.id ?? null, ...(fornitore ? {} : { id_operazione: id }), ...pulito }))
    if (e?.id != null) onSalvato(e.id, pulito.nome)
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={fornitore ? `Fornitore — ${fornitore.nome}` : 'Nuovo fornitore'}>
      <MagCorpo>
        <MagGriglia colonne={2}>
          {campo('nome', 'Ragione sociale')}
          {campo('partita_iva', 'Partita IVA', { maxLength: 11 })}
          {campo('codice_fiscale', 'Codice fiscale', { maxLength: 16 })}
          {campo('indirizzo', 'Indirizzo')}
        </MagGriglia>
        <MagGriglia colonne={3}>
          {campo('cap', 'CAP', { maxLength: 5 })}
          {campo('comune', 'Comune')}
          {campo('provincia', 'Provincia', { maxLength: 2 })}
          {campo('telefono', 'Telefono')}
          {campo('email', 'Email')}
          {campo('pec', 'PEC')}
        </MagGriglia>
        <MagErrore testo={invio.errore} />
        <MagPiede
          onAnnulla={onClose} onConferma={salva} etichetta={fornitore ? 'Salva' : 'Crea fornitore'}
          inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={!c.nome.trim()}
        />
      </MagCorpo>
    </Modal>
  )
}
