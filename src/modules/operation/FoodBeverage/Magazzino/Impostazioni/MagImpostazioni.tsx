// ─── Magazzino ristorazione › Impostazioni ──────────────────────────────────
//  § B3 della scheda 17 (gestore): punti di stoccaggio della struttura (nome,
//  tipo, attivo) e fornitori del magazzino. Il tipo del punto dice da dove
//  scaricano le ricette (cucina o bar). Gli altri utenti vedono gli elenchi.

import React, { useEffect, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { CheckboxField, InputField, SelectField } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Punto, TipoPunto } from '../api/tipi'
import FornitoreForm from '../comune/FornitoreForm'
import { TIPI_PUNTO } from '../comune/formato'
import { MagCorpo, MagErrore, MagPiede, MagSezione } from '../comune/MagModale'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useInvio } from '../comune/useInvio'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import './MagImpostazioni.sass'

export default function MagImpostazioni({ navigate: _navigate }: { navigate: (p: string) => void }) {
  return (
    <MagShell page="fb-mag-impostazioni" title="Impostazioni del magazzino" className="magimp">
      {ctx => <Contenuto ctx={ctx} />}
    </MagShell>
  )
}

function Contenuto({ ctx }: { ctx: MagCtx }) {
  const aggiorna = useMagazzinoFb(s => s.aggiorna)
  const confirm = useConfirmStore(s => s.confirm)
  const [punto, setPunto] = useState<Punto | 'nuovo' | null>(null)
  const [nuovoForn, setNuovoForn] = useState(false)
  const nomeTipoPunto = (t: TipoPunto) => TIPI_PUNTO.find(x => x.key === t)?.nome ?? t

  const eliminaPunto = async (p: Punto) => {
    if (!(await confirm({ title: 'Eliminare il punto?', message: `«${p.nome}» sarà eliminato. Si può solo se è vuoto e non ha movimenti; altrimenti disattivalo.`, confirmLabel: 'Elimina', danger: true }))) return
    try {
      const e = await eseguiMag('elimina_punto', { id: p.id })
      if (!e.success) { toast.error(e.error_message || 'Operazione non riuscita.'); return }
      toast.success(`Punto «${p.nome}» eliminato.`)
      aggiorna()
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="magimp__colonne">
      <MagSezione
        titolo="Punti di stoccaggio"
        azioni={ctx.gestore && (
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => setPunto('nuovo')}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo punto
          </button>
        )}
      >
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table">
            <colgroup><col className="magimp__c-nome" /><col className="magimp__c-tipo" /><col className="magimp__c-stato" /><col className="magimp__c-act" /></colgroup>
            <thead><tr><th>Nome</th><th>Tipo</th><th>Stato</th><th aria-label="Azioni" /></tr></thead>
            <tbody>
              {ctx.punti.map(p => (
                <tr key={p.id}>
                  <td><TruncatedText text={p.nome} /></td>
                  <td>{nomeTipoPunto(p.tipo)}</td>
                  <td><span className={`magimp__stato ${p.attivo ? 'magimp__stato--on' : ''}`}><span className="magimp__dot" aria-hidden="true" />{p.attivo ? 'Attivo' : 'Disattivato'}</span></td>
                  <td className="magimp__acts">
                    {ctx.gestore && (
                      <>
                        <Tooltip text="Modifica"><button type="button" className="magpag__act" aria-label="Modifica" onClick={() => setPunto(p)}><i className="fa-solid fa-pen" aria-hidden="true" /></button></Tooltip>
                        <Tooltip text="Elimina"><button type="button" className="magpag__act" aria-label="Elimina" onClick={() => eliminaPunto(p)}><i className="fa-solid fa-trash" aria-hidden="true" /></button></Tooltip>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="magpag__nota">Le ricette scaricano dal primo punto attivo del loro reparto: Cucina per i piatti, Bar per le bevande. I carichi vanno nel primo punto di tipo Magazzino, se l’articolo non ne indica un altro.</p>
      </MagSezione>

      <MagSezione
        titolo="Fornitori"
        azioni={(
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => setNuovoForn(true)}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo fornitore
          </button>
        )}
      >
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table">
            <colgroup><col className="magimp__c-forn" /><col className="magimp__c-piva" /></colgroup>
            <thead><tr><th>Ragione sociale</th><th>Partita IVA</th></tr></thead>
            <tbody>
              {ctx.contesto.fornitori.map(f => (
                <tr key={f.id}><td><TruncatedText text={f.nome} /></td><td>{f.partita_iva ?? '—'}</td></tr>
              ))}
              {ctx.contesto.fornitori.length === 0 && <tr><td colSpan={2} className="magpag__vuoto">Nessun fornitore: si aggiungono anche dal carico della merce.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="magpag__nota">Sono i fornitori del magazzino in Op, gli stessi dell’app. Un fornitore con la stessa partita IVA o lo stesso nome non si duplica.</p>
      </MagSezione>

      <PuntoForm valore={punto} ctx={ctx} onClose={() => setPunto(null)} onSalvato={() => { setPunto(null); aggiorna() }} />
      <FornitoreForm
        open={nuovoForn} onClose={() => setNuovoForn(false)}
        onSalvato={(_id, nome) => { setNuovoForn(false); toast.success(`Fornitore «${nome}» pronto.`); aggiorna() }}
      />
    </div>
  )
}

function PuntoForm({ valore, ctx, onClose, onSalvato }: { valore: Punto | 'nuovo' | null; ctx: MagCtx; onClose: () => void; onSalvato: () => void }) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoPunto>('magazzino')
  const [attivo, setAttivo] = useState(true)
  const invio = useInvio()
  const { azzera } = invio
  const modifica = valore && valore !== 'nuovo' ? valore : null

  useEffect(() => {
    if (!valore) return
    setNome(modifica?.nome ?? ''); setTipo(modifica?.tipo ?? 'magazzino'); setAttivo(modifica?.attivo ?? true); azzera()
  }, [valore, modifica, azzera])

  const salva = async () => {
    const e = await invio.esegui(id => eseguiMag('salva_punto', {
      id: modifica?.id ?? null, ...(modifica ? {} : { id_operazione: id }), id_struttura: ctx.idStruttura, nome: nome.trim(), tipo, attivo,
    }))
    if (e) { toast.success(`Punto «${nome.trim()}» salvato.`); onSalvato() }
  }

  return (
    <Modal open={!!valore} onClose={onClose} title={modifica ? `Punto — ${modifica.nome}` : 'Nuovo punto di stoccaggio'} size="sm">
      <MagCorpo>
        <InputField name="pt-nome" label="Nome" placeholder="Es. Cella frigo" value={nome} onChange={e => setNome(e.target.value)} />
        <SelectField name="pt-tipo" label="Tipo" value={tipo} options={TIPI_PUNTO.map(t => ({ value: t.key, label: t.nome }))} onChange={e => setTipo(e.target.value as TipoPunto)} />
        {modifica && <CheckboxField name="pt-attivo" label="Punto attivo" checked={attivo} onChange={e => setAttivo(e.target.checked)} />}
        <MagErrore testo={invio.errore} />
        <MagPiede onAnnulla={onClose} onConferma={salva} etichetta={modifica ? 'Salva' : 'Crea punto'} inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={!nome.trim()} />
      </MagCorpo>
    </Modal>
  )
}
