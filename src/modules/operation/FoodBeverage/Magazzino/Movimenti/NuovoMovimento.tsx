// ─── Movimenti › Nuovo movimento ─────────────────────────────────────────────
//  `registra` (§ 8.6) per i tipi che non sono un carico (quello sta in Ricevi
//  merce): scarico, trasferimento, reso, scarto, vendita e rettifica (solo
//  gestore). Ogni tipo chiede i suoi campi; le righe si aggiungono scegliendo
//  l'articolo o leggendo il codice a barre. Per la vendita le righe sono voci
//  del menu e porzioni: le materie prime le scarica Op con le ricette.

import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import { toast } from '../../../../../core/components/Toast/useToast'
import { DatePickerField, InputField, RadioGroup, SelectField, TextareaField } from '../../../../../core/components/form'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Articolo, Esito, RigaGiacenza, TipoMovimento, VoceRicetta } from '../api/tipi'
import CampoCodice from '../comune/CampoCodice'
import { fmtQ, isoConFuso, nomeTipo, numero, oraLocale } from '../comune/formato'
import { MagCorpo, MagErrore, MagGriglia, MagPiede, MagSezione } from '../comune/MagModale'
import type { MagCtx } from '../comune/MagShell'
import { useInvio } from '../comune/useInvio'
import './NuovoMovimento.sass'

type Tipo = Exclude<TipoMovimento, 'carico'>

interface Riga { k: number; id: number | null; quantita: string }
let prossima = 1
const riga = (id: number | null = null, quantita = ''): Riga => ({ k: prossima++, id, quantita })

const SPIEGAZIONI: Record<Tipo, string> = {
  scarico: 'Consumo fuori dalle comande (uso interno, pasto del personale…): esce dal punto scelto.',
  trasferimento: 'La merce passa da un punto all’altro della stessa struttura, per esempio dal Magazzino alla Cucina.',
  reso: 'Merce restituita al fornitore: esce dal punto scelto.',
  scarto: 'Spreco, merce scaduta, rotta o preparata male: esce dal punto scelto con il motivo.',
  vendita: 'Piatti venduti fuori dalle comande di Op (es. una cassa esterna): Op scarica le materie prime secondo le ricette.',
  rettifica: 'Correzione puntuale fuori dall’inventario: quantità positive aggiungono, negative tolgono.',
}

interface Props {
  open: boolean
  ctx: MagCtx
  articoli: Articolo[]
  onClose: () => void
  onRegistrato: (e: Esito) => void
}

export default function NuovoMovimento({ open, ctx, articoli, onClose, onRegistrato }: Props) {
  const [tipo, setTipo] = useState<Tipo>('scarico')
  const [idPunto, setIdPunto] = useState('')
  const [idDest, setIdDest] = useState('')
  const [idFornitore, setIdFornitore] = useState('')
  const [documento, setDocumento] = useState('')
  const [motivo, setMotivo] = useState('')
  const [note, setNote] = useState('')
  const [data, setData] = useState(oraLocale())
  const [righe, setRighe] = useState<Riga[]>([riga()])
  const [daCodice, setDaCodice] = useState(false)
  const [giacenze, setGiacenze] = useState<RigaGiacenza[]>([])
  const [voci, setVoci] = useState<VoceRicetta[]>([])
  const invio = useInvio()
  const { azzera } = invio

  // Ogni apertura è un movimento nuovo: chiave e campi da capo; giacenze per mostrare quanto c'è nel punto.
  useEffect(() => {
    if (!open) return
    azzera()
    setTipo('scarico'); setIdDest(''); setIdFornitore(''); setDocumento(''); setMotivo(''); setNote('')
    setData(oraLocale()); setRighe([riga()]); setDaCodice(false)
    const cucina = ctx.puntiAttivi.find(p => p.tipo === 'cucina') ?? ctx.puntiAttivi[0]
    setIdPunto(cucina ? String(cucina.id) : '')
    eseguiMag('giacenze', { id_struttura: ctx.idStruttura }).then(g => setGiacenze(g.righe)).catch(() => setGiacenze([]))
  }, [open, ctx.idStruttura, ctx.puntiAttivi, azzera])

  useEffect(() => {
    if (!open || tipo !== 'vendita' || voci.length) return
    eseguiMag('ricette', { id_struttura: ctx.idStruttura }).then(cs => setVoci(cs.flatMap(c => c.voci))).catch(e => toast.error(messaggioErrore(e)))
  }, [open, tipo, voci.length, ctx.idStruttura])

  // Cambiando tipo le righe tornano vuote: articoli e voci del menu non si mescolano.
  const cambiaTipo = (t: Tipo) => { setTipo(t); setRighe([riga()]); setMotivo(''); azzera() }

  const perId = useMemo(() => new Map(articoli.map(a => [a.id, a])), [articoli])
  const disponibile = (idArt: number) => giacenze.find(g => g.id_articolo === idArt)?.per_punto.find(p => p.id_punto === Number(idPunto))?.quantita ?? 0
  const set = (k: number, p: Partial<Riga>) => setRighe(rs => rs.map(r => (r.k === k ? { ...r, ...p } : r)))

  const leggiCodice = async (codice: string) => {
    try {
      const r = await eseguiMag('cerca_codice', { codice })
      if (!r.trovato || !r.articolo) { toast.warning(`Nessun articolo con il codice ${codice}: crealo da Articoli o da Ricevi merce.`); return }
      const a = r.articolo
      setDaCodice(true)
      setRighe(rs => {
        const c = rs.find(x => x.id === a.id)
        const q = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',')
        if (c) return rs.map(x => (x === c ? { ...x, quantita: q((numero(x.quantita) ?? 0) + r.quantita) } : x))
        return [...rs.filter(x => x.id != null), riga(a.id, q(r.quantita))]
      })
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  const tipi: Tipo[] = ['scarico', 'trasferimento', 'reso', 'scarto', 'vendita', ...(ctx.gestore ? ['rettifica' as const] : [])]
  const valide = righe.filter(r => r.id != null && r.quantita.trim())

  const registra = async () => {
    const e = await invio.esegui(id => eseguiMag('registra', {
      id_operazione: id,
      tipo,
      id_struttura: ctx.idStruttura,
      id_punto: tipo === 'vendita' ? undefined : idPunto ? Number(idPunto) : null,
      id_punto_destinazione: tipo === 'trasferimento' && idDest ? Number(idDest) : null,
      data: data ? isoConFuso(data) : null,
      id_fornitore: tipo === 'reso' && idFornitore ? Number(idFornitore) : null,
      documento: tipo === 'reso' ? documento.trim() || null : null,
      motivo: ['scarico', 'scarto', 'rettifica'].includes(tipo) ? motivo.trim() || null : null,
      note: note.trim() || null,
      origine: daCodice ? 'codice_a_barre' : 'manuale',
      righe: tipo === 'vendita'
        ? valide.map(r => ({ id_voce: r.id, porzioni: numero(r.quantita) }))
        : valide.map(r => ({ id_articolo: r.id, quantita: numero(r.quantita) })),
    }))
    if (e) onRegistrato(e)
  }

  const punti = ctx.puntiAttivi.map(p => ({ value: p.id, label: p.nome }))

  return (
    <Modal open={open} onClose={onClose} title="Nuovo movimento" size="xl">
      <MagCorpo className="magnmov">
        <RadioGroup
          name="mov-tipo" label="Tipo di movimento" value={tipo}
          options={tipi.map(t => ({ value: t, label: nomeTipo(t) }))}
          onChange={v => cambiaTipo(v as Tipo)}
        />
        <p className="magpag__nota">{SPIEGAZIONI[tipo]}</p>

        <MagGriglia colonne={4}>
          {tipo !== 'vendita' && (
            <SelectField name="mov-punto" label={tipo === 'trasferimento' ? 'Da' : 'Punto di stoccaggio'} value={idPunto} options={punti} onChange={e => setIdPunto(e.target.value)} />
          )}
          {tipo === 'trasferimento' && (
            <SelectField
              name="mov-dest" label="A" value={idDest}
              options={[{ value: '', label: 'Scegli il punto' }, ...punti.filter(p => String(p.value) !== idPunto)]}
              onChange={e => setIdDest(e.target.value)}
            />
          )}
          {tipo === 'reso' && (
            <>
              <SelectField
                name="mov-forn" label="Fornitore" value={idFornitore}
                options={[{ value: '', label: 'Scegli il fornitore' }, ...ctx.contesto.fornitori.map(f => ({ value: f.id, label: f.nome }))]}
                onChange={e => setIdFornitore(e.target.value)}
              />
              <InputField name="mov-doc" label="Documento" placeholder="Es. DDT di reso 12" value={documento} onChange={e => setDocumento(e.target.value)} />
            </>
          )}
          {tipo === 'scarto' && (
            <SelectField
              name="mov-motivo-s" label="Motivo" value={motivo}
              options={[{ value: '', label: 'Scegli il motivo' }, ...ctx.contesto.motivi_scarto.map(m => ({ value: m.key, label: m.nome }))]}
              onChange={e => setMotivo(e.target.value)}
            />
          )}
          {(tipo === 'scarico' || tipo === 'rettifica') && (
            <InputField
              name="mov-motivo" label="Motivo" placeholder={tipo === 'scarico' ? 'Es. Uso interno, Pasto personale' : 'Es. Errore di carico'}
              value={motivo} onChange={e => setMotivo(e.target.value)}
            />
          )}
          <DatePickerField name="mov-data" label="Quando" type="datetime-local" value={data} max={oraLocale()} hint="Fino a 7 giorni indietro" onChange={e => setData(e.target.value)} />
        </MagGriglia>

        <MagSezione titolo={tipo === 'vendita' ? 'Piatti venduti' : 'Articoli'}>
          {tipo !== 'vendita' && <div className="magnmov__codice"><CampoCodice onCodice={leggiCodice} /></div>}
          <div className="sib-table-wrap">
            <table className="sib-table magpag__table magnmov__table">
              <colgroup><col className="magnmov__c-art" /><col className="magnmov__c-q" /><col className="magnmov__c-disp" /><col className="magnmov__c-act" /></colgroup>
              <thead>
                <tr>
                  <th>{tipo === 'vendita' ? 'Voce del menu' : 'Articolo'}</th>
                  <th>{tipo === 'vendita' ? 'Porzioni' : tipo === 'rettifica' ? 'Quantità (±)' : 'Quantità'}</th>
                  <th className="magpag__num">{tipo === 'vendita' ? 'Ricetta' : 'Nel punto'}</th>
                  <th aria-label="Azioni" />
                </tr>
              </thead>
              <tbody>
                {righe.map(r => {
                  const a = tipo !== 'vendita' && r.id != null ? perId.get(r.id) : undefined
                  const v = tipo === 'vendita' && r.id != null ? voci.find(x => x.id_voce === r.id) : undefined
                  return (
                    <tr key={r.k}>
                      <td>
                        <SelectField
                          name={`mov-r-${r.k}`} ariaLabel={tipo === 'vendita' ? 'Voce del menu' : 'Articolo'} value={r.id ?? ''}
                          options={tipo === 'vendita'
                            ? [{ value: '', label: 'Scegli il piatto' }, ...voci.map(x => ({ value: x.id_voce, label: x.ricetta ? x.nome : `${x.nome} (senza ricetta)` }))]
                            : [{ value: '', label: 'Scegli l’articolo' }, ...articoli.map(x => ({ value: x.id, label: `${x.nome} (${x.unita})` }))]}
                          onChange={e => set(r.k, { id: e.target.value ? Number(e.target.value) : null })}
                        />
                      </td>
                      <td>
                        <span className="magnmov__q">
                          <InputField name={`mov-q-${r.k}`} ariaLabel="Quantità" dense value={r.quantita} placeholder="0" onChange={e => set(r.k, { quantita: e.target.value })} />
                          <span className="magnmov__u">{tipo === 'vendita' ? 'porz.' : a?.unita ?? ''}</span>
                        </span>
                      </td>
                      <td className="magpag__num">
                        {tipo === 'vendita'
                          ? (v ? (v.ricetta ? `${v.ingredienti} ingredienti` : <span className="magnmov__manca">Senza ricetta</span>) : '—')
                          : a ? <span className={disponibile(a.id) <= 0 ? 'magnmov__manca' : ''}>{fmtQ(disponibile(a.id), a.unita)}</span> : '—'}
                      </td>
                      <td className="magnmov__acts">
                        <Tooltip text="Togli la riga">
                          <button type="button" className="magpag__act" aria-label="Togli la riga" onClick={() => setRighe(rs => (rs.length > 1 ? rs.filter(x => x.k !== r.k) : [riga()]))}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button type="button" className="magnmov__aggiungi" onClick={() => setRighe(rs => [...rs, riga()])}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi riga
            </button>
          </div>
        </MagSezione>

        <TextareaField name="mov-note" label="Note" rows={2} value={note} onChange={e => setNote(e.target.value)} />

        <MagErrore testo={invio.errore} />
        <MagPiede
          onAnnulla={onClose} onConferma={registra} etichetta={`Registra ${nomeTipo(tipo).toLowerCase()}`}
          inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={valide.length === 0}
        />
      </MagCorpo>
    </Modal>
  )
}
