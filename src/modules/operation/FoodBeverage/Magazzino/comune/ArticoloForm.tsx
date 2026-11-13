// ─── Magazzino ristorazione: modale Nuovo / Modifica articolo ────────────────
//  `salva_articolo` (§ 8.5): nuovo = chiunque, con `id_operazione`; modifica =
//  solo gestore. Codici a barre con la quantità che valgono (il cartone da 10)
//  e fornitori con il loro codice: le liste sostituiscono quelle esistenti.
//  Usata anche da Ricevi merce (codice sconosciuto, righe della bolla).

import React, { useEffect, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import { CheckboxField, InputField, SelectField, TextareaField } from '../../../../../core/components/form'
import { eseguiMag } from '../api/magazzinoFbOp'
import type { Articolo, Unita } from '../api/tipi'
import { numero } from './formato'
import type { MagCtx } from './MagShell'
import { MagCorpo, MagErrore, MagGriglia, MagPiede, MagSezione } from './MagModale'
import { useInvio } from './useInvio'
import './ArticoloForm.sass'

export interface ArticoloIniziale {
  nome?: string
  unita?: Unita
  id_categoria?: number | null
  ean?: string
  id_fornitore?: number | null
  codice_fornitore?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  ctx: MagCtx
  articolo?: Articolo | null
  iniziale?: ArticoloIniziale
  onSalvato: (id: number, nome: string) => void
}

interface Bozza {
  nome: string
  id_categoria: string
  unita: Unita
  scorta_minima: string
  punto_riordino: string
  scorta_obiettivo: string
  id_punto_predefinito: string
  note: string
  attivo: boolean
  codici: { ean: string; quantita: string; descrizione: string }[]
  fornitori: { id_fornitore: string; codice_fornitore: string; confezione: string }[]
}

const testo = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

function bozzaDa(a?: Articolo | null, i?: ArticoloIniziale): Bozza {
  if (a) {
    return {
      nome: a.nome, id_categoria: a.id_categoria == null ? '' : String(a.id_categoria), unita: a.unita,
      scorta_minima: String(a.scorta_minima).replace('.', ','), punto_riordino: testo(a.punto_riordino), scorta_obiettivo: testo(a.scorta_obiettivo),
      id_punto_predefinito: a.id_punto_predefinito == null ? '' : String(a.id_punto_predefinito),
      note: a.note ?? '', attivo: a.attivo,
      codici: a.codici_a_barre.map(c => ({ ean: c.ean, quantita: String(c.quantita).replace('.', ','), descrizione: c.descrizione ?? '' })),
      fornitori: a.fornitori.map(f => ({ id_fornitore: String(f.id_fornitore), codice_fornitore: f.codice_fornitore ?? '', confezione: testo(f.confezione) })),
    }
  }
  return {
    nome: i?.nome ?? '', id_categoria: i?.id_categoria == null ? '' : String(i.id_categoria), unita: i?.unita ?? 'kg',
    scorta_minima: '0', punto_riordino: '', scorta_obiettivo: '', id_punto_predefinito: '', note: '', attivo: true,
    codici: i?.ean ? [{ ean: i.ean, quantita: '1', descrizione: '' }] : [],
    fornitori: i?.id_fornitore ? [{ id_fornitore: String(i.id_fornitore), codice_fornitore: i.codice_fornitore ?? '', confezione: '' }] : [],
  }
}

export default function ArticoloForm({ open, onClose, ctx, articolo, iniziale, onSalvato }: Props) {
  const [b, setB] = useState<Bozza>(() => bozzaDa(articolo, iniziale))
  const invio = useInvio()
  const { azzera } = invio

  useEffect(() => {
    if (open) { setB(bozzaDa(articolo, iniziale)); azzera() }
  }, [open, articolo, iniziale, azzera])

  const set = (p: Partial<Bozza>) => setB(x => ({ ...x, ...p }))
  const modifica = !!articolo

  const salva = async () => {
    const e = await invio.esegui(id => eseguiMag('salva_articolo', {
      id: articolo?.id ?? null,
      ...(modifica ? {} : { id_operazione: id }),
      nome: b.nome.trim(),
      id_categoria: b.id_categoria ? Number(b.id_categoria) : null,
      unita: b.unita,
      codici_a_barre: b.codici.filter(c => c.ean.trim()).map(c => ({ ean: c.ean.trim(), quantita: numero(c.quantita) ?? 0, descrizione: c.descrizione.trim() || null })),
      fornitori: b.fornitori.filter(f => f.id_fornitore).map(f => ({ id_fornitore: Number(f.id_fornitore), codice_fornitore: f.codice_fornitore.trim() || null, confezione: numero(f.confezione) })),
      scorta_minima: numero(b.scorta_minima) ?? -1,
      punto_riordino: numero(b.punto_riordino),
      scorta_obiettivo: numero(b.scorta_obiettivo),
      id_punto_predefinito: b.id_punto_predefinito ? Number(b.id_punto_predefinito) : null,
      attivo: b.attivo,
      note: b.note.trim() || null,
    }))
    if (e?.id != null) onSalvato(e.id, b.nome.trim())
  }

  const categorie = [{ value: '', label: 'Nessuna categoria' }, ...ctx.contesto.categorie.map(c => ({ value: c.id, label: c.nome }))]
  const fornitori = [{ value: '', label: 'Scegli il fornitore' }, ...ctx.contesto.fornitori.map(f => ({ value: f.id, label: f.nome }))]
  const punti = [{ value: '', label: 'Primo magazzino della struttura' }, ...ctx.puntiAttivi.map(p => ({ value: p.id, label: p.nome }))]

  return (
    <Modal open={open} onClose={onClose} size="lg" title={modifica ? `Articolo — ${articolo!.nome}` : 'Nuovo articolo'}>
      <MagCorpo>
        <MagGriglia colonne={2}>
          <InputField name="art-nome" label="Nome" required maxLength={120} value={b.nome} onChange={e => set({ nome: e.target.value })} />
          <SelectField name="art-cat" label="Categoria" value={b.id_categoria} options={categorie} onChange={e => set({ id_categoria: e.target.value })} />
          <SelectField
            name="art-unita" label="Unità di misura" value={b.unita}
            options={ctx.contesto.unita.map(u => ({ value: u.key, label: `${u.nome} (${u.key})` }))}
            hint={modifica ? 'Con dei movimenti registrati non si può cambiare.' : undefined}
            onChange={e => set({ unita: e.target.value as Unita })}
          />
          <InputField
            name="art-scorta" label={`Scorta minima (${b.unita})`} value={b.scorta_minima}
            onChange={e => set({ scorta_minima: e.target.value })}
          />
          <InputField
            name="art-riordino" label={`Punto di riordino (${b.unita})`} value={b.punto_riordino} placeholder="Come la scorta minima"
            hint="Quando giacenza e merce in arrivo scendono qui, l'articolo entra nel Riordino."
            onChange={e => set({ punto_riordino: e.target.value })}
          />
          <InputField
            name="art-obiettivo" label={`Scorta obiettivo (${b.unita})`} value={b.scorta_obiettivo} placeholder="Il doppio del punto di riordino"
            hint="Il livello fino a cui riempire con l'ordine."
            onChange={e => set({ scorta_obiettivo: e.target.value })}
          />
          <SelectField
            name="art-punto" label="Punto predefinito dei carichi" value={b.id_punto_predefinito} options={punti}
            onChange={e => set({ id_punto_predefinito: e.target.value })}
          />
          {modifica && (
            <div className="magart__attivo">
              <CheckboxField name="art-attivo" label="Articolo attivo" checked={b.attivo} onChange={e => set({ attivo: e.target.checked })} />
            </div>
          )}
        </MagGriglia>

        <MagSezione
          titolo="Codici a barre"
          azioni={(
            <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => set({ codici: [...b.codici, { ean: '', quantita: '1', descrizione: '' }] })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi codice
            </button>
          )}
        >
          {b.codici.length === 0 && <p className="magart__vuoto">Nessun codice: l'articolo si cerca per nome o codice interno.</p>}
          {b.codici.map((c, i) => (
            <div key={i} className="magart__riga magart__riga--codice">
              <InputField name={`art-ean-${i}`} ariaLabel="Codice a barre" placeholder="EAN" value={c.ean} onChange={e => set({ codici: b.codici.map((x, j) => (j === i ? { ...x, ean: e.target.value } : x)) })} />
              <InputField name={`art-eanq-${i}`} ariaLabel={`Quantità (${b.unita})`} placeholder={`Vale (${b.unita})`} value={c.quantita} onChange={e => set({ codici: b.codici.map((x, j) => (j === i ? { ...x, quantita: e.target.value } : x)) })} />
              <InputField name={`art-eand-${i}`} ariaLabel="Descrizione" placeholder="Es. Cartone 10 pacchi" value={c.descrizione} onChange={e => set({ codici: b.codici.map((x, j) => (j === i ? { ...x, descrizione: e.target.value } : x)) })} />
              <Tooltip text="Togli il codice">
                <button type="button" className="magart__togli" aria-label="Togli il codice" onClick={() => set({ codici: b.codici.filter((_, j) => j !== i) })}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          ))}
          {b.codici.length > 0 && <p className="magart__vuoto">"Vale" è quante unità dell'articolo carica una lettura: il cartone da 10 pacchi da 1 kg vale 10.</p>}
        </MagSezione>

        <MagSezione
          titolo="Fornitori"
          azioni={(
            <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => set({ fornitori: [...b.fornitori, { id_fornitore: '', codice_fornitore: '', confezione: '' }] })}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi fornitore
            </button>
          )}
        >
          {b.fornitori.length === 0 && <p className="magart__vuoto">Nessun fornitore collegato: si aggiunge da solo al primo carico.</p>}
          {b.fornitori.length > 0 && <p className="magart__vuoto">"Confezione" è il multiplo con cui si ordina a quel fornitore (es. cartone da 10 kg): il Riordino arrotonda le quantità per eccesso. Vuota = qualsiasi quantità.</p>}
          {b.fornitori.map((f, i) => (
            <div key={i} className="magart__riga magart__riga--fornitore">
              <SelectField name={`art-forn-${i}`} ariaLabel="Fornitore" value={f.id_fornitore} options={fornitori} onChange={e => set({ fornitori: b.fornitori.map((x, j) => (j === i ? { ...x, id_fornitore: e.target.value } : x)) })} />
              <InputField name={`art-fcod-${i}`} ariaLabel="Codice del fornitore" placeholder="Codice sul listino / DDT" value={f.codice_fornitore} onChange={e => set({ fornitori: b.fornitori.map((x, j) => (j === i ? { ...x, codice_fornitore: e.target.value } : x)) })} />
              <InputField name={`art-fconf-${i}`} ariaLabel={`Confezione (${b.unita})`} placeholder={`Confezione (${b.unita})`} value={f.confezione} onChange={e => set({ fornitori: b.fornitori.map((x, j) => (j === i ? { ...x, confezione: e.target.value } : x)) })} />
              <Tooltip text="Togli il fornitore">
                <button type="button" className="magart__togli" aria-label="Togli il fornitore" onClick={() => set({ fornitori: b.fornitori.filter((_, j) => j !== i) })}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          ))}
        </MagSezione>

        <TextareaField name="art-note" label="Note" rows={2} value={b.note} onChange={e => set({ note: e.target.value })} />

        <MagErrore testo={invio.errore} />
        <MagPiede
          onAnnulla={onClose} onConferma={salva} etichetta={modifica ? 'Salva' : 'Crea articolo'}
          inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={!b.nome.trim()}
        />
      </MagCorpo>
    </Modal>
  )
}
