import React, { useMemo, useState } from 'react'
import { InputField, SelectField, ToggleSwitch, DatePickerField, RadioGroup } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import Tabs from '../../../../../core/components/Tabs'
import { CfgTable, CfgSaveBar, CfgEmpty } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  useHrConfigStore, nuovoId, spettanzeAnnue, fmtEuro, CATEGORIE_LIVELLO, MATURAZIONI,
  type CcnlHr, type LivelloCcnl, type CategoriaLivello, type MaturazioneTipo, type TipologiaContrattoHr,
} from '../../../../../store/useHrConfigStore'
import { TipologieContrattoEditor } from '../HrTipologieContratto/HrTipologieContratto'
import type { CfgPaneComponentProps } from '../../Configuratore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import './HrCcnl.sass'

// ─── RISORSE UMANE › CONTRATTI COLLETTIVI (CCNL) ─────────────────────────────
//  Master-detail: a sinistra i CCNL applicati, a destra la scheda del contratto
//  in sei schede — Generale, Tipologie di contratto (comuni a tutti i CCNL,
//  salvate con la stessa bozza), Livelli (minimi, scatti, prova, preavviso),
//  Ferie e permessi (spettanze annue e regole di maturazione con l'anteprima
//  sul part time), Retribuzione (mensilità, scatti, maggiorazioni, comporto) e
//  Enti e fondi. Crea anagrafica legge da qui livelli e spettanze proposte.

type Scheda = 'generale' | 'tipologie' | 'livelli' | 'ferie' | 'retribuzione' | 'enti'

const nuovoCcnl = (): CcnlHr => ({
  id: nuovoId('ccnl'), nome: 'Nuovo CCNL', codiceCnel: '', settore: '', validoDal: '', validoAl: '',
  oreSettimanaliPieno: 40, mensilita: 14,
  ferieGiorni: 26, ferieSettimanaGiorni: 6, ferieMinimeAnnoSettimane: 2, ferieScadenzaMesi: 18,
  rolOre: 72, exFestivitaOre: 32, permessiScadenzaMesi: 6,
  maturazione: 'mensile', frazioneMeseGiorni: 15, riproporzionaPartTime: true, maturaInAssenzeRetribuite: true,
  scattiNumero: 6, scattiCadenzaAnni: 4, maggStraordinario: 30, maggNotturno: 25, maggFestivo: 20, comportoGiorni: 180,
  fondoSanitario: '', previdenzaComplementare: '', enteBilaterale: '', livelli: [],
})
const livelloVuoto = (): LivelloCcnl => ({ id: '', codice: '', descrizione: '', categoria: 'Impiegato', minimoMensile: 0, scattoImporto: 0, provaGiorni: 60, preavvisoGiorni: 30 })
const completion = (v: CcnlHr[]) => (v.some(c => c.livelli.length) ? 'configured' as const : v.length ? 'partial' as const : 'empty' as const)
interface BozzaCcnl { ccnl: CcnlHr[]; tipologie: TipologiaContrattoHr[] }
const contaBozza = (a: BozzaCcnl, b: BozzaCcnl) => diffCount(a.ccnl, b.ccnl) + diffCount(a.tipologie, b.tipologie)
const completionBozza = (v: BozzaCcnl) => completion(v.ccnl)
/** Numeri dell'anteprima in formato italiano (virgola decimale, fino a 2 decimali). */
const fmtNum = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 2 })
const n = (v: string) => (v === '' ? 0 : Number(v.replace(',', '.')) || 0)

const SCHEDE: Scheda[] = ['generale', 'tipologie', 'livelli', 'ferie', 'retribuzione', 'enti']
const isScheda = (v?: string): v is Scheda => !!v && (SCHEDE as string[]).includes(v)

/** `initialTab`: scheda aperta dal deep link (es. `hr-ccnl:tipologie`, o il vecchio `hr-tipologie-contratto`). */
export default function HrCcnl({ initialTab }: CfgPaneComponentProps) {
  const saved = useHrConfigStore(s => s.ccnl)
  const setCcnl = useHrConfigStore(s => s.setCcnl)
  const confirm = useConfirmStore(s => s.confirm)
  const savedTip = useHrConfigStore(s => s.tipologie)
  const setTipologie = useHrConfigStore(s => s.setTipologie)
  const savedBozza = useMemo(() => ({ ccnl: saved, tipologie: savedTip }), [saved, savedTip])
  const commit = (v: BozzaCcnl) => { setCcnl(v.ccnl); setTipologie(v.tipologie) }
  const { draft: bozza, setDraft: setBozza, dirty, save, cancel } = useHrDraft('hr-ccnl', savedBozza, contaBozza, commit, completionBozza)
  const draft = bozza.ccnl
  const setDraft = (f: (d: CcnlHr[]) => CcnlHr[]) => setBozza(b => ({ ...b, ccnl: f(b.ccnl) }))
  const setTipologieBozza = (f: (d: TipologiaContrattoHr[]) => TipologiaContrattoHr[]) => setBozza(b => ({ ...b, tipologie: f(b.tipologie) }))

  const [selId, setSelId] = useState<string | null>(saved[0]?.id ?? null)
  const [scheda, setScheda] = useState<Scheda>(isScheda(initialTab) ? initialTab : 'generale')
  const [livello, setLivello] = useState<LivelloCcnl | null>(null)
  const [previewPerc, setPreviewPerc] = useState(75)

  const sel = draft.find(c => c.id === selId) ?? draft[0]
  const upd = (p: Partial<CcnlHr>) => sel && setDraft(d => d.map(c => (c.id === sel.id ? { ...c, ...p } : c)))
  const num = (k: keyof CcnlHr) => (e: React.ChangeEvent<HTMLInputElement>) => upd({ [k]: n(e.target.value) } as Partial<CcnlHr>)
  const txt = (k: keyof CcnlHr) => (e: React.ChangeEvent<HTMLInputElement>) => upd({ [k]: e.target.value } as Partial<CcnlHr>)

  const aggiungi = () => { const c = nuovoCcnl(); setDraft(d => [...d, c]); setSelId(c.id); setScheda('generale') }
  const duplica = (c: CcnlHr) => {
    const copia: CcnlHr = { ...structuredClone(c), id: nuovoId('ccnl'), nome: `${c.nome} (copia)` }
    copia.livelli = copia.livelli.map(l => ({ ...l, id: nuovoId('lv') }))
    setDraft(d => [...d, copia]); setSelId(copia.id)
  }
  const elimina = async (c: CcnlHr) => {
    const ok = await confirm({ title: 'Elimina CCNL', message: `Eliminare «${c.nome}» con i suoi ${c.livelli.length} livelli? I contratti già registrati mantengono i dati nello storico.`, confirmLabel: 'Elimina', danger: true })
    if (!ok) return
    setDraft(d => d.filter(x => x.id !== c.id))
    if (selId === c.id) setSelId(draft.find(x => x.id !== c.id)?.id ?? null)
  }

  const salvaLivello = () => {
    if (!livello || !sel) return
    const l = { ...livello, codice: livello.codice.trim() }
    upd({ livelli: l.id ? sel.livelli.map(x => (x.id === l.id ? l : x)) : [...sel.livelli, { ...l, id: nuovoId('lv') }] })
    setLivello(null)
  }
  const eliminaLivello = async (l: LivelloCcnl) => {
    if (!sel) return
    const ok = await confirm({ title: 'Elimina livello', message: `Eliminare il livello ${l.codice} – ${l.descrizione}?`, confirmLabel: 'Elimina', danger: true })
    if (ok) upd({ livelli: sel.livelli.filter(x => x.id !== l.id) })
  }
  const sposta = (i: number, dir: -1 | 1) => {
    if (!sel) return
    const arr = [...sel.livelli]; const j = i + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    upd({ livelli: arr })
  }

  return (
    <div className="cfg-hrccnl cfg-hr-pane">
      <div className="cfg-hrccnl__layout">
        {/* ── Elenco CCNL ─────────────────────────────────────────────────── */}
        <aside className="cfg-hrccnl__list">
          {draft.map(c => (
            <button key={c.id} type="button" className={`cfg-hrccnl__item${sel?.id === c.id ? ' is-active' : ''}`} onClick={() => setSelId(c.id)}>
              <span className="cfg-hrccnl__item-ico" aria-hidden="true"><i className="fa-light fa-file-contract" /></span>
              <span className="cfg-hrccnl__item-text">
                <TruncatedText text={c.nome} className="cfg-hrccnl__item-name" />
                <span className="cfg-hrccnl__item-meta">{c.livelli.length} livelli · {c.ferieGiorni} gg ferie · {c.rolOre + c.exFestivitaOre} h permessi</span>
              </span>
            </button>
          ))}
          <button type="button" className="sib-btn sib-btn--secondary cfg-hrccnl__add" onClick={aggiungi}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo CCNL
          </button>
        </aside>

        {/* ── Scheda del CCNL ─────────────────────────────────────────────── */}
        <section className="cfg-hrccnl__detail">
          {!sel ? (
            <CfgEmpty icon="file-contract" title="Nessun contratto collettivo" subtitle="Aggiungi il CCNL applicato in azienda per inquadrare il personale." />
          ) : (
            <>
              <header className="cfg-hrccnl__head">
                <div className="cfg-hrccnl__head-text">
                  <TruncatedText text={sel.nome} className="cfg-hrccnl__head-name" />
                  <span className="cfg-hrccnl__head-meta">{[sel.codiceCnel && `CNEL ${sel.codiceCnel}`, sel.settore].filter(Boolean).join(' · ') || 'Completa i dati generali'}</span>
                </div>
                <HrRowActions nome={sel.nome} onEdit={() => setScheda('generale')} onDuplicate={() => duplica(sel)} onDelete={() => elimina(sel)} />
              </header>

              <Tabs
                active={scheda}
                onChange={(id) => setScheda(id as Scheda)}
                tabs={[
                  { id: 'generale', label: 'Generale' },
                  { id: 'tipologie', label: `Tipologie di contratto (${bozza.tipologie.length})` },
                  { id: 'livelli', label: `Livelli (${sel.livelli.length})` },
                  { id: 'ferie', label: 'Ferie e permessi' },
                  { id: 'retribuzione', label: 'Retribuzione' },
                  { id: 'enti', label: 'Enti e fondi' },
                ]}
              />

              {scheda === 'generale' && (
                <div className="cfg-hrccnl__grid">
                  <InputField name="cc-nome" label="Denominazione" value={sel.nome} onChange={txt('nome')} className="cfg-hrccnl__span2" />
                  <InputField name="cc-cnel" label="Codice CNEL" value={sel.codiceCnel} onChange={(e) => upd({ codiceCnel: e.target.value.toUpperCase() })} placeholder="Es. H052" />
                  <InputField name="cc-sett" label="Settore" value={sel.settore} onChange={txt('settore')} placeholder="Es. Turismo e ospitalità" />
                  <DatePickerField name="cc-dal" label="In vigore dal" value={sel.validoDal} onChange={(e) => upd({ validoDal: e.target.value })} />
                  <DatePickerField name="cc-al" label="Scadenza" value={sel.validoAl} onChange={(e) => upd({ validoAl: e.target.value })} />
                  <InputField name="cc-ore" label="Orario pieno (ore/settimana)" type="number" min={1} value={sel.oreSettimanaliPieno} onChange={num('oreSettimanaliPieno')}
                    hint="Base per calcolare la percentuale di part time." />
                </div>
              )}

              {scheda === 'tipologie' && (
                <div className="cfg-hrccnl__section">
                  <TipologieContrattoEditor items={bozza.tipologie} setItems={setTipologieBozza} />
                </div>
              )}

              {scheda === 'livelli' && (
                <div className="cfg-hrccnl__section">
                  <div className="cfg-hrccnl__bar">
                    <p className="cfg-hrccnl__lead">Livelli di inquadramento dal più alto al più basso: il minimo × {sel.mensilita} mensilità dà la RAL minima proposta in anagrafica.</p>
                    <button type="button" className="sib-btn sib-btn--primary" onClick={() => setLivello(livelloVuoto())}>
                      <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo livello
                    </button>
                  </div>
                  <CfgTable
                    columns={[
                      { key: 'ord', label: <TruncatedText text="Ord." full="Ordine dei livelli" />, width: '6%' },
                      { key: 'cod', label: 'Livello', width: '8%' },
                      { key: 'desc', label: 'Profili / mansioni', width: '21%' },
                      { key: 'cat', label: 'Categoria', width: '11%' },
                      { key: 'min', label: <TruncatedText text="Min. mensile" full="Minimo tabellare mensile" />, width: '12%', align: 'right' },
                      { key: 'ral', label: 'RAL minima', width: '11%', align: 'right' },
                      { key: 'prova', label: 'Prova', width: '8%', align: 'right' },
                      { key: 'pre', label: 'Preavviso', width: '9%', align: 'right' },
                      { key: 'az', label: 'Azioni', width: '14%', align: 'right' },
                    ]}
                    empty={<span className="cfg-table__empty-text">Nessun livello: aggiungi i livelli del contratto.</span>}
                  >
                    {sel.livelli.map((l, i) => (
                      <tr key={l.id}>
                        <td className="cfg-hrccnl__ord">
                          <button type="button" className="sib-btn sib-btn--icon" aria-label="Sposta su" disabled={i === 0} onClick={() => sposta(i, -1)}><i className="fa-solid fa-chevron-up" aria-hidden="true" /></button>
                          <button type="button" className="sib-btn sib-btn--icon" aria-label="Sposta giù" disabled={i === sel.livelli.length - 1} onClick={() => sposta(i, 1)}><i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>
                        </td>
                        <td><span className="cfg-hrccnl__lv">{l.codice}</span></td>
                        <td><TruncatedText text={l.descrizione || '—'} /></td>
                        <td><TruncatedText text={l.categoria} /></td>
                        <td className="cfg-hrccnl__num">€ {fmtEuro(l.minimoMensile)}</td>
                        <td className="cfg-hrccnl__num">€ {fmtEuro(l.minimoMensile * sel.mensilita)}</td>
                        <td className="cfg-hrccnl__num">{l.provaGiorni} gg</td>
                        <td className="cfg-hrccnl__num">{l.preavvisoGiorni} gg</td>
                        <td className="cfg-hrccnl__actions">
                          <HrRowActions nome={`livello ${l.codice}`} onEdit={() => setLivello({ ...l })} onDelete={() => eliminaLivello(l)} />
                        </td>
                      </tr>
                    ))}
                  </CfgTable>
                  <p className="cfg-hrccnl__note"><i className="fa-light fa-circle-info" aria-hidden="true" /> Valori indicativi: allineali alle tabelle retributive in vigore.</p>
                </div>
              )}

              {scheda === 'ferie' && (() => {
                const full = spettanzeAnnue(sel, 100)
                const pt = spettanzeAnnue(sel, previewPerc)
                return (
                  <div className="cfg-hrccnl__ferie">
                    <div className="cfg-hrccnl__section">
                      <h4 className="cfg-hrccnl__sub">Spettanze annue (full time)</h4>
                      <div className="cfg-hrccnl__grid">
                        <InputField name="cc-ferie" label="Ferie (giorni/anno)" type="number" min={0} value={sel.ferieGiorni} onChange={num('ferieGiorni')} />
                        <SelectField name="cc-fset" label="Giorni contati su settimana di" value={sel.ferieSettimanaGiorni}
                          onChange={(e) => upd({ ferieSettimanaGiorni: Number(e.target.value) as 5 | 6 })}
                          options={[{ value: 6, label: '6 giorni lavorativi' }, { value: 5, label: '5 giorni lavorativi' }]} />
                        <InputField name="cc-rol" label="Permessi ROL (ore/anno)" type="number" min={0} value={sel.rolOre} onChange={num('rolOre')} />
                        <InputField name="cc-exf" label="Ex festività (ore/anno)" type="number" min={0} value={sel.exFestivitaOre} onChange={num('exFestivitaOre')} />
                      </div>

                      <h4 className="cfg-hrccnl__sub">Maturazione e fruizione</h4>
                      <RadioGroup name="cc-mat" label="Maturazione" value={sel.maturazione}
                        onChange={(v: string) => upd({ maturazione: v as MaturazioneTipo })}
                        options={MATURAZIONI} />
                      <div className="cfg-hrccnl__grid">
                        <InputField name="cc-fraz" label="Frazione di mese che vale un mese (giorni)" type="number" min={1} max={31} value={sel.frazioneMeseGiorni}
                          onChange={num('frazioneMeseGiorni')} hint="Es. 15: dal 15° giorno di servizio matura il rateo intero." />
                        <InputField name="cc-fmin" label="Ferie da godere nell'anno (settimane)" type="number" min={0} value={sel.ferieMinimeAnnoSettimane} onChange={num('ferieMinimeAnnoSettimane')} />
                        <InputField name="cc-fscad" label="Ferie residue: entro (mesi)" type="number" min={0} value={sel.ferieScadenzaMesi} onChange={num('ferieScadenzaMesi')}
                          hint="Dalla fine dell'anno di maturazione." />
                        <InputField name="cc-pscad" label="Permessi non goduti liquidati entro (mesi)" type="number" min={0} value={sel.permessiScadenzaMesi} onChange={num('permessiScadenzaMesi')} />
                      </div>
                      <ToggleSwitch label="Riproporziona al part time" description="Ferie e permessi in proporzione alla percentuale dell'orario."
                        checked={sel.riproporzionaPartTime} onChange={(v) => upd({ riproporzionaPartTime: v })} />
                      <ToggleSwitch label="Maturano anche nelle assenze retribuite" description="Malattia, infortunio, maternità obbligatoria."
                        checked={sel.maturaInAssenzeRetribuite} onChange={(v) => upd({ maturaInAssenzeRetribuite: v })} />
                    </div>

                    {/* Anteprima di cosa vedrà Crea anagrafica */}
                    <aside className="cfg-hrccnl__preview" aria-label="Anteprima spettanze">
                      <h4 className="cfg-hrccnl__sub">Anteprima spettanze</h4>
                      <table className="cfg-hrccnl__ptable">
                        <thead><tr><th /><th>Full time</th><th>Part time {previewPerc}%</th></tr></thead>
                        <tbody>
                          <tr><th>Ferie / anno</th><td>{fmtNum(full.ferieGiorni)} gg</td><td>{fmtNum(pt.ferieGiorni)} gg</td></tr>
                          <tr><th>Ferie / mese</th><td>{fmtNum(full.ferieMese)} gg</td><td>{fmtNum(pt.ferieMese)} gg</td></tr>
                          <tr><th>ROL / anno</th><td>{fmtNum(full.rolOre)} h</td><td>{fmtNum(pt.rolOre)} h</td></tr>
                          <tr><th>Ex festività</th><td>{fmtNum(full.exFestivitaOre)} h</td><td>{fmtNum(pt.exFestivitaOre)} h</td></tr>
                          <tr><th>Permessi / mese</th><td>{fmtNum(full.permessiMeseOre)} h</td><td>{fmtNum(pt.permessiMeseOre)} h</td></tr>
                        </tbody>
                      </table>
                      <InputField name="cc-prev" label="Percentuale di prova" type="number" min={10} max={100} step={5} value={previewPerc}
                        onChange={(e) => setPreviewPerc(Math.max(10, Math.min(100, n(e.target.value))))} />
                    </aside>
                  </div>
                )
              })()}

              {scheda === 'retribuzione' && (
                <div className="cfg-hrccnl__grid">
                  <InputField name="cc-mens" label="Mensilità" type="number" min={12} max={16} value={sel.mensilita} onChange={num('mensilita')} hint="Es. 14: tredicesima e quattordicesima." />
                  <InputField name="cc-sn" label="Scatti di anzianità (numero max)" type="number" min={0} value={sel.scattiNumero} onChange={num('scattiNumero')} />
                  <InputField name="cc-sc" label="Cadenza scatti (anni)" type="number" min={1} value={sel.scattiCadenzaAnni} onChange={num('scattiCadenzaAnni')} hint="L'importo dello scatto è per livello." />
                  <InputField name="cc-mstr" label="Maggiorazione straordinario (%)" type="number" min={0} value={sel.maggStraordinario} onChange={num('maggStraordinario')} />
                  <InputField name="cc-mnot" label="Maggiorazione notturno (%)" type="number" min={0} value={sel.maggNotturno} onChange={num('maggNotturno')} />
                  <InputField name="cc-mfes" label="Maggiorazione festivo (%)" type="number" min={0} value={sel.maggFestivo} onChange={num('maggFestivo')} />
                  <InputField name="cc-comp" label="Periodo di comporto malattia (giorni)" type="number" min={0} value={sel.comportoGiorni} onChange={num('comportoGiorni')} />
                </div>
              )}

              {scheda === 'enti' && (
                <div className="cfg-hrccnl__grid">
                  <InputField name="cc-fs" label="Fondo di assistenza sanitaria integrativa" value={sel.fondoSanitario} onChange={txt('fondoSanitario')} placeholder="Es. Fondo FAST" />
                  <InputField name="cc-pc" label="Fondo di previdenza complementare" value={sel.previdenzaComplementare} onChange={txt('previdenzaComplementare')} placeholder="Es. Fon.Te." />
                  <InputField name="cc-eb" label="Ente bilaterale" value={sel.enteBilaterale} onChange={txt('enteBilaterale')} placeholder="Es. EBNT" />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Contratti collettivi salvati" />

      <HrFormModal
        open={livello !== null}
        title={livello?.id ? `Modifica livello ${livello.codice}` : 'Nuovo livello'}
        onClose={() => setLivello(null)}
        onSubmit={salvaLivello}
        submitLabel={livello?.id ? 'Salva modifiche' : 'Aggiungi livello'}
        canSubmit={!!livello?.codice.trim()}
      >
        {livello && (
          <>
            <div className="hrcfg-modal__row">
              <InputField name="lv-cod" label="Livello" required value={livello.codice} onChange={(e) => setLivello({ ...livello, codice: e.target.value })} placeholder="Es. 4°" />
              <SelectField name="lv-cat" label="Categoria" value={livello.categoria} onChange={(e) => setLivello({ ...livello, categoria: e.target.value as CategoriaLivello })}
                options={CATEGORIE_LIVELLO.map(c => ({ value: c, label: c }))} />
            </div>
            <InputField name="lv-desc" label="Profili / mansioni" value={livello.descrizione} onChange={(e) => setLivello({ ...livello, descrizione: e.target.value })} placeholder="Es. Addetto ricevimento, cameriere" />
            <div className="hrcfg-modal__row">
              <InputField name="lv-min" label="Minimo tabellare mensile (€)" type="number" min={0} value={livello.minimoMensile} onChange={(e) => setLivello({ ...livello, minimoMensile: n(e.target.value) })} iconLeft="fa-light fa-euro-sign" />
              <InputField name="lv-scatto" label="Importo scatto di anzianità (€)" type="number" min={0} value={livello.scattoImporto} onChange={(e) => setLivello({ ...livello, scattoImporto: n(e.target.value) })} iconLeft="fa-light fa-euro-sign" />
            </div>
            <div className="hrcfg-modal__row">
              <InputField name="lv-prova" label="Periodo di prova (giorni)" type="number" min={0} value={livello.provaGiorni} onChange={(e) => setLivello({ ...livello, provaGiorni: n(e.target.value) })} />
              <InputField name="lv-pre" label="Preavviso (giorni)" type="number" min={0} value={livello.preavvisoGiorni} onChange={(e) => setLivello({ ...livello, preavvisoGiorni: n(e.target.value) })} />
            </div>
            {sel && <p className="hrcfg-modal__hint">RAL minima: <strong>€ {fmtEuro(livello.minimoMensile * sel.mensilita)}</strong> ({sel.mensilita} mensilità).</p>}
          </>
        )}
      </HrFormModal>
    </div>
  )
}
