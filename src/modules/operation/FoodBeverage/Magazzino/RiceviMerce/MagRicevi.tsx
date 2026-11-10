// ─── Magazzino ristorazione › Ricevi merce ──────────────────────────────────
//  § B3 della scheda 17, tre modi di caricare la merce arrivata dai fornitori:
//   • Manuale — fornitore, documento, data, righe articolo + quantità +
//     prezzo + lotto + scadenza;
//   • Codice a barre — ogni lettura aggiunge la riga o somma la quantità che
//     vale il codice (il cartone da 10); codice sconosciuto → Nuovo articolo
//     con l'EAN già scritto;
//   • Da bolla — foto o PDF del DDT letti da Claude in Op (BollaLettura).
//  Un solo `registra` di tipo `carico`, con la sua `id_operazione` riusata nei
//  "Riprova". Alla fine il riepilogo con gli avvisi di sotto scorta.

import React, { useEffect, useMemo, useState } from 'react'
import Tabs from '../../../../../core/components/Tabs'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { DatePickerField, InputField, SelectField } from '../../../../../core/components/form'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Esito, Unita } from '../api/tipi'
import ArticoloForm, { type ArticoloIniziale } from '../comune/ArticoloForm'
import CampoCodice from '../comune/CampoCodice'
import FornitoreForm from '../comune/FornitoreForm'
import { fmtQ, isoConFuso, numero, oraLocale } from '../comune/formato'
import { MagAvvisi, MagErrore } from '../comune/MagModale'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useArticoliTutti } from '../comune/useArticoliTutti'
import { useInvio } from '../comune/useInvio'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import BollaLettura from './BollaLettura'
import './MagRicevi.sass'

type Modo = 'manuale' | 'codice' | 'bolla'

export interface Registrato { esito: Esito; righe: number; fornitore: string; documento: string | null }

export default function MagRicevi({ navigate }: { navigate: (p: string) => void }) {
  return (
    <MagShell page="fb-mag-ricevi" title="Ricevi merce" className="magric">
      {ctx => <Contenuto ctx={ctx} navigate={navigate} />}
    </MagShell>
  )
}

function Contenuto({ ctx, navigate }: { ctx: MagCtx; navigate: (p: string) => void }) {
  const [modo, setModo] = useState<Modo>('manuale')
  const [fatto, setFatto] = useState<Registrato | null>(null)
  const [giro, setGiro] = useState(0)
  const { articoli, ricarica } = useArticoliTutti()

  const tabs = [
    { id: 'manuale', label: 'Manuale' },
    { id: 'codice', label: 'Codice a barre' },
    ...(ctx.contesto.bolla_attiva ? [{ id: 'bolla', label: 'Da bolla' }] : []),
  ]

  if (fatto) {
    return (
      <div className="magric__fatto">
        <i className="fa-solid fa-circle-check magric__fatto-ico" aria-hidden="true" />
        <h2 className="magric__fatto-tit">Carico registrato{fatto.esito.duplicato ? ' (era già stato registrato)' : ''}</h2>
        <p className="magric__fatto-sub">
          {fatto.righe === 1 ? '1 articolo' : `${fatto.righe} articoli`} da {fatto.fornitore}{fatto.documento ? ` · ${fatto.documento}` : ''}
        </p>
        <MagAvvisi avvisi={fatto.esito.avvisi} />
        <div className="magric__fatto-azioni">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('fb-mag-movimenti')}>
            <i className="fa-solid fa-right-left" aria-hidden="true" /> Vai ai movimenti
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('fb-mag-giacenze')}>
            <i className="fa-solid fa-boxes-stacked" aria-hidden="true" /> Vai alle giacenze
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => { setFatto(null); setGiro(g => g + 1); ricarica() }}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo carico
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Tabs tabs={tabs} active={modo} onChange={id => setModo(id as Modo)} className="magric__tabs" />
      {modo === 'bolla'
        ? <BollaLettura key={`b${giro}`} ctx={ctx} articoli={articoli} onArticoliCambiati={ricarica} onRegistrato={setFatto} />
        : <CaricoRighe key={`r${giro}`} ctx={ctx} modo={modo} articoli={articoli} onArticoliCambiati={ricarica} onRegistrato={setFatto} />}
    </>
  )
}

// ─── Manuale e codice a barre ─────────────────────────────────────────────────

interface Riga { k: number; id_articolo: number | null; quantita: string; prezzo: string; lotto: string; scadenza: string }
let prossimaRiga = 1
const rigaVuota = (id_articolo: number | null = null, quantita = ''): Riga => ({ k: prossimaRiga++, id_articolo, quantita, prezzo: '', lotto: '', scadenza: '' })
const fmtInput = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',')

interface CaricoProps {
  ctx: MagCtx
  modo: 'manuale' | 'codice'
  articoli: ReturnType<typeof useArticoliTutti>['articoli']
  onArticoliCambiati: () => void
  onRegistrato: (r: Registrato) => void
}

/** Puntatore di default dei carichi: il primo punto attivo di tipo magazzino. */
export const puntoCarichi = (ctx: MagCtx) => (ctx.puntiAttivi.find(p => p.tipo === 'magazzino') ?? ctx.puntiAttivi[0])?.id ?? null

function CaricoRighe({ ctx, modo, articoli, onArticoliCambiati, onRegistrato }: CaricoProps) {
  const aggiornaContesto = useMagazzinoFb(s => s.aggiorna)
  const [idFornitore, setIdFornitore] = useState('')
  const [documento, setDocumento] = useState('')
  const [data, setData] = useState(oraLocale())
  const [idPunto, setIdPunto] = useState(String(puntoCarichi(ctx) ?? ''))
  const [righe, setRighe] = useState<Riga[]>(() => (modo === 'manuale' ? [rigaVuota()] : []))
  const [nuovoForn, setNuovoForn] = useState(false)
  const [nuovoArt, setNuovoArt] = useState<{ iniziale: ArticoloIniziale; codice: string } | null>(null)
  const [ultima, setUltima] = useState<string | null>(null)
  const invio = useInvio()

  // Il modo vale per tutto il carico: le righe restano, cambia solo l'origine registrata.
  useEffect(() => { if (modo === 'manuale' && righe.length === 0) setRighe([rigaVuota()]) }, [modo, righe.length])

  const perId = useMemo(() => new Map(articoli.map(a => [a.id, a])), [articoli])
  const opzioniArt = useMemo(() => [{ value: '', label: 'Scegli l’articolo' }, ...articoli.map(a => ({ value: a.id, label: `${a.nome} (${a.unita})` }))], [articoli])
  const set = (k: number, p: Partial<Riga>) => setRighe(rs => rs.map(r => (r.k === k ? { ...r, ...p } : r)))

  const leggiCodice = async (codice: string) => {
    try {
      const r = await eseguiMag('cerca_codice', { codice })
      if (!r.trovato || !r.articolo) {
        setUltima(null)
        setNuovoArt({ codice, iniziale: { ean: codice, id_fornitore: idFornitore ? Number(idFornitore) : null } })
        return
      }
      const a = r.articolo
      setRighe(rs => {
        const c = rs.find(x => x.id_articolo === a.id)
        if (c) return rs.map(x => (x === c ? { ...x, quantita: fmtInput((numero(x.quantita) ?? 0) + r.quantita) } : x))
        return [...rs.filter(x => x.id_articolo != null), rigaVuota(a.id, fmtInput(r.quantita))]
      })
      setUltima(`+${fmtQ(r.quantita, a.unita)} ${a.nome}${r.descrizione ? ` · ${r.descrizione}` : ''}`)
      if (!perId.has(a.id)) onArticoliCambiati()
    } catch (e) {
      toast.error(messaggioErrore(e))
    }
  }

  const fornitore = ctx.contesto.fornitori.find(f => f.id === Number(idFornitore))
  const righeValide = righe.filter(r => r.id_articolo != null)

  const conferma = async () => {
    const e = await invio.esegui(id => eseguiMag('registra', {
      id_operazione: id,
      tipo: 'carico',
      id_struttura: ctx.idStruttura,
      id_punto: idPunto ? Number(idPunto) : null,
      data: data ? isoConFuso(data) : null,
      id_fornitore: idFornitore ? Number(idFornitore) : null,
      documento: documento.trim() || null,
      origine: modo === 'codice' ? 'codice_a_barre' : 'manuale',
      righe: righeValide.map(r => ({
        id_articolo: r.id_articolo,
        quantita: numero(r.quantita),
        prezzo_unitario: numero(r.prezzo),
        lotto: r.lotto.trim() || null,
        scadenza: r.scadenza || null,
      })),
    }))
    if (e) onRegistrato({ esito: e, righe: righeValide.length, fornitore: fornitore?.nome ?? '', documento: documento.trim() || null })
  }

  return (
    <div className="magric__carico">
      <div className="magric__testa">
        <div className="magric__forn">
          <SelectField
            name="ric-forn" label="Fornitore" required value={idFornitore}
            options={[{ value: '', label: 'Scegli il fornitore' }, ...ctx.contesto.fornitori.map(f => ({ value: f.id, label: f.nome }))]}
            onChange={e => setIdFornitore(e.target.value)}
          />
          <Tooltip text="Nuovo fornitore">
            <button type="button" className="sib-btn sib-btn--icon magric__icon-btn" aria-label="Nuovo fornitore" onClick={() => setNuovoForn(true)}>
              <i className="fa-regular fa-user-plus" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
        <InputField name="ric-doc" label="Documento" placeholder="Es. DDT 1234 del 10/11/2026" value={documento} onChange={e => setDocumento(e.target.value)} />
        <DatePickerField name="ric-data" label="Arrivata il" type="datetime-local" value={data} max={oraLocale()} onChange={e => setData(e.target.value)} />
        <SelectField
          name="ric-punto" label="Carica in" value={idPunto}
          options={ctx.puntiAttivi.map(p => ({ value: p.id, label: p.nome }))}
          onChange={e => setIdPunto(e.target.value)}
        />
      </div>

      {modo === 'codice' && (
        <div className="magric__lettore">
          <CampoCodice autoFocus onCodice={leggiCodice} />
          {ultima && <span className="magric__ultima"><i className="fa-solid fa-check" aria-hidden="true" /> {ultima}</span>}
        </div>
      )}

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table magric__table">
            <colgroup>
              <col className="magric__c-art" /><col className="magric__c-q" /><col className="magric__c-pr" />
              <col className="magric__c-lot" /><col className="magric__c-sca" /><col className="magric__c-act" />
            </colgroup>
            <thead>
              <tr><th>Articolo</th><th>Quantità</th><th><TruncatedText text="Prezzo unitario" /></th><th>Lotto</th><th>Scadenza</th><th aria-label="Azioni" /></tr>
            </thead>
            <tbody>
              {righe.map(r => {
                const a = r.id_articolo != null ? perId.get(r.id_articolo) : undefined
                const u: Unita | undefined = a?.unita
                return (
                  <tr key={r.k}>
                    <td>
                      {modo === 'manuale'
                        ? <SelectField name={`ric-art-${r.k}`} ariaLabel="Articolo" value={r.id_articolo ?? ''} options={opzioniArt} onChange={e => set(r.k, { id_articolo: e.target.value ? Number(e.target.value) : null })} />
                        : <TruncatedText text={a?.nome ?? '…'} />}
                    </td>
                    <td>
                      <span className="magric__q">
                        <InputField name={`ric-q-${r.k}`} ariaLabel="Quantità" dense value={r.quantita} placeholder="0" onChange={e => set(r.k, { quantita: e.target.value })} />
                        <span className="magric__u">{u ?? ''}</span>
                      </span>
                    </td>
                    <td>
                      <span className="magric__q">
                        <InputField name={`ric-p-${r.k}`} ariaLabel="Prezzo unitario" dense value={r.prezzo} placeholder="€" onChange={e => set(r.k, { prezzo: e.target.value })} />
                        <span className="magric__u">{u ? `€/${u}` : ''}</span>
                      </span>
                    </td>
                    <td><InputField name={`ric-l-${r.k}`} ariaLabel="Lotto" dense value={r.lotto} onChange={e => set(r.k, { lotto: e.target.value })} /></td>
                    <td><DatePickerField name={`ric-s-${r.k}`} type="date" value={r.scadenza} onChange={e => set(r.k, { scadenza: e.target.value })} /></td>
                    <td className="magric__acts">
                      <Tooltip text="Togli la riga">
                        <button type="button" className="magpag__act" aria-label="Togli la riga" onClick={() => setRighe(rs => rs.filter(x => x.k !== r.k))}>
                          <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })}
              {righe.length === 0 && (
                <tr><td colSpan={6} className="magpag__vuoto">Leggi il primo codice a barre: ogni lettura aggiunge l’articolo o ne somma la quantità.</td></tr>
              )}
            </tbody>
          </table>
          {modo === 'manuale' && (
            <button type="button" className="magric__aggiungi" onClick={() => setRighe(rs => [...rs, rigaVuota()])}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi riga
            </button>
          )}
        </div>
      </div>

      <MagErrore testo={invio.errore} />
      <footer className="magric__piede">
        <span className="magpag__nota">
          {righeValide.length === 1 ? '1 articolo' : `${righeValide.length} articoli`}
          {modo === 'manuale' && ' · Se un articolo non c’è, crealo da Articoli o leggine il codice a barre'}
        </span>
        <button
          type="button" className={`sib-btn sib-btn--primary ${invio.inCorso ? 'sib-btn--loading' : ''}`}
          disabled={invio.inCorso || !idFornitore || righeValide.length === 0} onClick={conferma}
        >
          <i className={`fa-solid ${invio.daRiprovare ? 'fa-rotate-right' : 'fa-check'}`} aria-hidden="true" /> {invio.daRiprovare ? 'Riprova' : 'Registra il carico'}
        </button>
      </footer>

      <FornitoreForm
        open={nuovoForn} onClose={() => setNuovoForn(false)}
        onSalvato={async (id, nome) => { setNuovoForn(false); await aggiornaContesto(); setIdFornitore(String(id)); toast.success(`Fornitore «${nome}» pronto.`) }}
      />
      <ArticoloForm
        open={!!nuovoArt} ctx={ctx} iniziale={nuovoArt?.iniziale} onClose={() => setNuovoArt(null)}
        onSalvato={(_id, nome) => {
          const codice = nuovoArt?.codice
          setNuovoArt(null)
          toast.success(`«${nome}» aggiunto agli articoli.`)
          onArticoliCambiati()
          if (codice) leggiCodice(codice)
        }}
      />
    </div>
  )
}
