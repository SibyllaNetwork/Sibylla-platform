import React, { useCallback, useState } from 'react'
import { InputField, ToggleSwitch, DatePickerField } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import Tooltip from '../../../../../core/components/Tooltip'
import { toast } from '../../../../../core/components/Toast/useToast'
import { CfgTable, CfgSaveBar, CfgEmpty } from '../../../../../core/cfg'
import { useCatalogoStore } from '../../../../../store/useCatalogoStore'
import { useHrConfigStore, findById } from '../../../../../store/useHrConfigStore'
import {
  useCollaboratoriEsterniStore, statoAutorizzazione, documentiMancanti, STATO_AUT_LABEL,
} from '../../../../../store/useCollaboratoriEsterniStore'
import { useStrutturaCorrente } from '../../../../../hooks/useStrutturaCorrente'
import type { DatiAppalto, Fornitore } from '../../../../../admin/SibyllaAdminPanel/catalogo/types'
import { stampaBadge } from '../../../../hr/_badge/badgeEsterno'
import type { CfgPaneComponentProps } from '../../Configuratore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import './HrAziendeAppalto.sass'

// ─── RISORSE UMANE › AZIENDE IN APPALTO ──────────────────────────────────────
//  Le imprese esterne i cui addetti lavorano in struttura. Anagrafica unica con
//  Purchasing: sono i fornitori marcati «servizi in appalto» (Lista fornitori),
//  qui completati con i dati che servono a identificarli — ragione sociale,
//  P. IVA, sede, oggetto e estremi del contratto d'appalto, DURC, posizioni
//  INPS/INAIL, referente, eventuale subappalto autorizzato — e con l'elenco dei
//  collaboratori che lavorano per ciascuna, da cui si stampano i badge.

const oggi = () => new Date().toISOString().slice(0, 10)
const tra30 = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
const fmt = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '—')

const datiVuoti = (f: Fornitore): DatiAppalto => ({
  ragioneSociale: f.nome, partitaIva: '', codiceFiscale: '', sedeLegale: [f.indirizzo, f.citta].filter(Boolean).join(', '), oggetto: f.descrizione,
  referente: '', referenteTelefono: '', referenteEmail: f.email, contrattoNumero: '', contrattoData: '', contrattoScadenza: '',
  durcScadenza: '', posizioneInps: '', posizioneInail: '', subappalto: false, subappaltoAutorizzazione: '',
})

/** Avvisi sui dati identificativi: P. IVA, contratto e DURC. */
function avvisi(d?: DatiAppalto): { livello: 'ko' | 'warn'; testo: string }[] {
  if (!d) return [{ livello: 'ko', testo: 'Dati identificativi da compilare' }]
  const out: { livello: 'ko' | 'warn'; testo: string }[] = []
  if (!d.partitaIva) out.push({ livello: 'ko', testo: 'P. IVA mancante' })
  if (!d.contrattoNumero) out.push({ livello: 'warn', testo: 'Contratto d’appalto non indicato' })
  if (d.contrattoScadenza && d.contrattoScadenza < oggi()) out.push({ livello: 'ko', testo: `Contratto scaduto il ${fmt(d.contrattoScadenza)}` })
  if (!d.durcScadenza) out.push({ livello: 'warn', testo: 'Scadenza DURC non indicata' })
  else if (d.durcScadenza < oggi()) out.push({ livello: 'ko', testo: `DURC scaduto il ${fmt(d.durcScadenza)}` })
  else if (d.durcScadenza <= tra30()) out.push({ livello: 'warn', testo: `DURC in scadenza il ${fmt(d.durcScadenza)}` })
  if (d.subappalto && !d.subappaltoAutorizzazione) out.push({ livello: 'ko', testo: 'Subappalto senza autorizzazione' })
  return out
}

const nuovaAzienda = (): Fornitore => {
  const id = `forn-app-${Date.now().toString(36)}`
  const f: Fornitore = {
    id, nome: 'Nuova azienda', descrizione: 'Ditta di servizi in appalto.', storia: '', indirizzo: '', citta: '', regione: '', cap: '',
    telefono: '', email: '', sito: '', annoFondazione: new Date().getFullYear(), certificazioni: [], caratteristiche: [],
    categoriaId: '', macroArea: 'servizi', immagineUrl: '', pubblicato: true, appalto: true,
  }
  return { ...f, datiAppalto: datiVuoti(f) }
}

const completion = (v: Fornitore[]) => (v.length === 0 ? 'empty' as const : v.every(f => avvisi(f.datiAppalto).every(a => a.livello !== 'ko')) ? 'configured' as const : 'partial' as const)

export default function HrAziendeAppalto({ navigate }: CfgPaneComponentProps) {
  const tutti = useCatalogoStore(s => s.fornitori)
  const saved = React.useMemo(() => tutti.filter(f => f.appalto), [tutti])
  const commit = useCallback((v: Fornitore[]) => {
    // Le ditte in appalto si riscrivono nel registro fornitori di Purchasing (le altre restano com'erano)
    useCatalogoStore.setState(s => ({ fornitori: [...s.fornitori.filter(f => !f.appalto), ...v] }))
  }, [])
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-aziende-appalto', saved, diffCount, commit, completion)

  const collaboratori = useCollaboratoriEsterniStore(s => s.collaboratori)
  const categorie = useHrConfigStore(s => s.categorieEsterni)
  const badge = useHrConfigStore(s => s.badge)
  const { struttura } = useStrutturaCorrente()

  const [selId, setSelId] = useState<string | null>(saved[0]?.id ?? null)
  const sel = draft.find(f => f.id === selId) ?? draft[0]
  const d = sel?.datiAppalto ?? (sel ? datiVuoti(sel) : undefined)
  const upd = (p: Partial<DatiAppalto>) => sel && setDraft(list => list.map(f => (f.id === sel.id
    ? { ...f, nome: p.ragioneSociale ?? f.nome, datiAppalto: { ...(f.datiAppalto ?? datiVuoti(f)), ...p } }
    : f)))
  const txt = (k: keyof DatiAppalto) => (e: React.ChangeEvent<HTMLInputElement>) => upd({ [k]: e.target.value } as Partial<DatiAppalto>)

  const aggiungi = () => { const f = nuovaAzienda(); setDraft(l => [...l, f]); setSelId(f.id) }
  const addetti = sel ? collaboratori.filter(c => c.fornitoreId === sel.id).sort((a, b) => a.cognome.localeCompare(b.cognome)) : []

  const stampa = async (lista: typeof addetti) => {
    if (!sel) return
    try {
      await stampaBadge(lista.map(c => ({ collaboratore: c, azienda: sel, categoria: findById(categorie, c.categoriaId), struttura: struttura || 'Struttura' })), badge)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Stampa non riuscita.', 'Badge')
    }
  }
  const autorizzati = addetti.filter(c => ['attiva', 'in-scadenza'].includes(statoAutorizzazione(c)))

  return (
    <div className="cfg-hrapp cfg-hr-pane">
      <div className="cfg-hrapp__layout">
        {/* ── Elenco aziende ─────────────────────────────────────────────── */}
        <aside className="cfg-hrapp__list">
          {draft.map(f => {
            const av = avvisi(f.datiAppalto)
            const n = collaboratori.filter(c => c.fornitoreId === f.id).length
            const ko = av.some(a => a.livello === 'ko')
            return (
              <button key={f.id} type="button" className={`cfg-hrapp__item${sel?.id === f.id ? ' is-active' : ''}`} onClick={() => setSelId(f.id)}>
                <span className="cfg-hrapp__item-ico" aria-hidden="true"><i className="fa-light fa-building" /></span>
                <span className="cfg-hrapp__item-text">
                  <TruncatedText text={f.datiAppalto?.ragioneSociale || f.nome} className="cfg-hrapp__item-name" />
                  <span className="cfg-hrapp__item-meta">{n} collaboratori{f.datiAppalto?.partitaIva ? ` · P. IVA ${f.datiAppalto.partitaIva}` : ''}</span>
                </span>
                {av.length > 0 && (
                  <i className={`fa-solid fa-triangle-exclamation cfg-hrapp__item-warn cfg-hrapp__item-warn--${ko ? 'ko' : 'warn'}`} aria-label={av.map(a => a.testo).join(', ')} />
                )}
              </button>
            )
          })}
          <button type="button" className="sib-btn sib-btn--secondary cfg-hrapp__add" onClick={aggiungi}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuova azienda
          </button>
          <button type="button" className="sib-btn sib-btn--ghost cfg-hrapp__add" onClick={() => navigate?.('lista-fornitori')}>
            <i className="fa-light fa-arrow-up-right-from-square" aria-hidden="true" /> Lista fornitori (Purchasing)
          </button>
        </aside>

        {/* ── Scheda dell'azienda ────────────────────────────────────────── */}
        <section className="cfg-hrapp__detail">
          {!sel || !d ? (
            <CfgEmpty icon="building" title="Nessuna azienda in appalto" subtitle="Aggiungi la prima ditta di servizi: comparirà anche tra i fornitori di Purchasing." />
          ) : (
            <>
              <header className="cfg-hrapp__head">
                <div className="cfg-hrapp__head-text">
                  <TruncatedText text={d.ragioneSociale || sel.nome} className="cfg-hrapp__head-name" />
                  <span className="cfg-hrapp__head-meta">{d.oggetto || 'Fornitore di servizi in appalto'}</span>
                </div>
              </header>
              {avvisi(d).length > 0 && (
                <ul className="cfg-hrapp__avvisi">
                  {avvisi(d).map(a => (
                    <li key={a.testo} className={`cfg-hrapp__avviso cfg-hrapp__avviso--${a.livello}`}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {a.testo}</li>
                  ))}
                </ul>
              )}

              <h4 className="cfg-hrapp__sub">Dati identificativi dell’impresa</h4>
              <div className="cfg-hrapp__grid">
                <InputField name="app-rs" label="Ragione sociale" required value={d.ragioneSociale} onChange={txt('ragioneSociale')} className="cfg-hrapp__span2" />
                <InputField name="app-piva" label="Partita IVA" required value={d.partitaIva} maxLength={11} onChange={(e) => upd({ partitaIva: e.target.value.replace(/\D/g, '') })} />
                <InputField name="app-cf" label="Codice fiscale" value={d.codiceFiscale} onChange={(e) => upd({ codiceFiscale: e.target.value.toUpperCase() })} />
                <InputField name="app-sede" label="Sede legale" value={d.sedeLegale} onChange={txt('sedeLegale')} className="cfg-hrapp__span2" />
                <InputField name="app-ogg" label="Oggetto dell’appalto" value={d.oggetto} onChange={txt('oggetto')} className="cfg-hrapp__span2" placeholder="Es. pulizia camere e aree comuni" />
              </div>

              <h4 className="cfg-hrapp__sub">Contratto e regolarità</h4>
              <div className="cfg-hrapp__grid">
                <InputField name="app-cn" label="N. contratto d’appalto" value={d.contrattoNumero} onChange={txt('contrattoNumero')} />
                <DatePickerField name="app-cd" label="Data contratto" value={d.contrattoData} onChange={(e) => upd({ contrattoData: e.target.value })} />
                <DatePickerField name="app-cs" label="Scadenza contratto" value={d.contrattoScadenza} onChange={(e) => upd({ contrattoScadenza: e.target.value })} />
                <DatePickerField name="app-durc" label="Scadenza DURC" value={d.durcScadenza} onChange={(e) => upd({ durcScadenza: e.target.value })} />
                <InputField name="app-inps" label="Matricola INPS" value={d.posizioneInps} onChange={txt('posizioneInps')} />
                <InputField name="app-inail" label="Codice ditta INAIL" value={d.posizioneInail} onChange={txt('posizioneInail')} />
              </div>
              <ToggleSwitch label="L’impresa lavora in subappalto" description="Sul badge dei suoi addetti compare l’autorizzazione al subappalto (L. 136/2010)."
                checked={d.subappalto} onChange={(v) => upd({ subappalto: v })} />
              {d.subappalto && (
                <InputField name="app-sub" label="Estremi dell’autorizzazione al subappalto" required value={d.subappaltoAutorizzazione} onChange={txt('subappaltoAutorizzazione')}
                  placeholder="Es. Autorizzazione n. 7/2026 del 22/04/2026" />
              )}

              <h4 className="cfg-hrapp__sub">Referente</h4>
              <div className="cfg-hrapp__grid">
                <InputField name="app-ref" label="Nome e cognome" value={d.referente} onChange={txt('referente')} />
                <InputField name="app-reft" label="Telefono" type="tel" value={d.referenteTelefono} onChange={txt('referenteTelefono')} />
                <InputField name="app-refe" label="E-mail" type="email" value={d.referenteEmail} onChange={txt('referenteEmail')} className="cfg-hrapp__span2" />
              </div>

              {/* ── Collaboratori dell'azienda ─────────────────────────────── */}
              <div className="cfg-hrapp__coll-bar">
                <h4 className="cfg-hrapp__sub">Collaboratori ({addetti.length})</h4>
                <div className="cfg-hrapp__coll-acts">
                  <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" disabled={autorizzati.length === 0} onClick={() => stampa(autorizzati)}>
                    <i className="fa-light fa-print" aria-hidden="true" /> Stampa badge degli autorizzati ({autorizzati.length})
                  </button>
                  <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" disabled={!saved.some(f => f.id === sel.id)}
                    title={saved.some(f => f.id === sel.id) ? undefined : 'Salva prima la nuova azienda'}
                    onClick={() => navigate?.(`nuovo-collaboratore-esterno:${sel.id}`)}>
                    <i className="fa-light fa-user-plus" aria-hidden="true" /> Nuovo collaboratore
                  </button>
                </div>
              </div>
              <CfgTable
                columns={[
                  { key: 'nome', label: 'Nominativo', width: '24%' },
                  { key: 'cat', label: 'Categoria', width: '17%' },
                  { key: 'badge', label: 'N. badge', width: '12%' },
                  { key: 'aut', label: 'Autorizzazione', width: '19%' },
                  { key: 'stato', label: 'Stato', width: '13%' },
                  { key: 'az', label: 'Azioni', width: '15%', align: 'right' },
                ]}
                empty={<span className="cfg-table__empty-text">Nessun collaboratore registrato per questa azienda.</span>}
              >
                {addetti.map(c => {
                  const st = statoAutorizzazione(c)
                  const manc = documentiMancanti(c, findById(categorie, c.categoriaId))
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="cfg-hrapp__nome">
                          {manc.length > 0 && (
                            <Tooltip text={`Documenti mancanti: ${manc.join(', ')}`}>
                              <i className="fa-solid fa-triangle-exclamation cfg-hrapp__item-warn--warn" aria-label="Documenti mancanti" />
                            </Tooltip>
                          )}
                          <TruncatedText text={`${c.cognome} ${c.nome}`} />
                        </span>
                      </td>
                      <td><TruncatedText text={findById(categorie, c.categoriaId)?.nome ?? '—'} /></td>
                      <td><span className="cfg-hrapp__code">{c.numeroBadge ?? '—'}</span></td>
                      <td><TruncatedText text={`${fmt(c.autorizzatoDal).slice(0, 6)}${c.autorizzatoDal.slice(2, 4)} – ${fmt(c.autorizzatoAl).slice(0, 6)}${c.autorizzatoAl.slice(2, 4)}`} full={`Dal ${fmt(c.autorizzatoDal)} al ${fmt(c.autorizzatoAl)}`} /></td>
                      <td><span className={`cfg-hrapp__badge cfg-hrapp__badge--${st}`}>{STATO_AUT_LABEL[st]}</span></td>
                      <td className="cfg-hrapp__actions">
                        <span className="cfg-hr-actions">
                          <Tooltip text="Apri la scheda">
                            <button type="button" className="sib-btn sib-btn--icon" aria-label={`Apri ${c.nome} ${c.cognome}`} onClick={() => navigate?.(`modifica-collaboratore-esterno:${c.id}`)}>
                              <i className="fa-solid fa-pen" aria-hidden="true" />
                            </button>
                          </Tooltip>
                          <Tooltip text="Stampa badge">
                            <button type="button" className="sib-btn sib-btn--icon" aria-label={`Stampa badge di ${c.nome} ${c.cognome}`} onClick={() => stampa([c])}>
                              <i className="fa-solid fa-id-badge" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </CfgTable>
            </>
          )}
        </section>
      </div>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Aziende in appalto salvate (anche in Purchasing)" />
    </div>
  )
}
