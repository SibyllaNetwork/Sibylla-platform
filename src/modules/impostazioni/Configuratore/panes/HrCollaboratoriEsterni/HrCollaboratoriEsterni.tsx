import React, { useCallback, useMemo, useState } from 'react'
import { InputField, ToggleSwitch, RadioGroup, TextareaField } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar, CfgMultiSelect } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useCatalogoStore } from '../../../../../store/useCatalogoStore'
import { useCollaboratoriEsterniStore } from '../../../../../store/useCollaboratoriEsterniStore'
import { useStrutturaCorrente } from '../../../../../hooks/useStrutturaCorrente'
import BadgeAnteprima from '../../../../hr/_badge/BadgeAnteprima'
import { useHrConfigStore, nuovoId, DOCUMENTI_ESTERNI, type CategoriaEsterniHr, type BadgeConfigHr } from '../../../../../store/useHrConfigStore'
import { REPARTI_OP, nomeReparto, type RepartoOp } from '../../../../appop/opCatalogo'
import type { CfgPaneComponentProps } from '../../Configuratore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import { HrDot, HrColorPicker } from '../_hr/HrColore'
import './HrCollaboratoriEsterni.sass'

// ─── RISORSE UMANE › COLLABORATORI ESTERNI ───────────────────────────────────
//  Addetti di ditte in appalto, non dipendenti: qui si definiscono le CATEGORIE
//  (reparti App Op! consentiti, documenti richiesti, durata massima
//  dell'autorizzazione) e il BADGE di riconoscimento (campi, colore, formato di
//  stampa, retro) con l'anteprima. Le aziende sono nella voce «Aziende in
//  appalto»; gli addetti si registrano dall'Archivio › Collaboratori esterni.

interface Dati { categorie: CategoriaEsterniHr[]; badge: BadgeConfigHr }
const countDati = (a: Dati, b: Dati) => diffCount(a.categorie, b.categorie) + (JSON.stringify(a.badge) === JSON.stringify(b.badge) ? 0 : 1)

const vuota = (): CategoriaEsterniHr => ({ id: '', nome: '', repartiOp: [], documenti: ['Contratto d’appalto', 'Documento d’identità'], durataMaxMesi: 12, colore: 1, attiva: true })
const completion = (v: Dati) => (v.categorie.some(c => c.attiva) ? 'configured' as const : 'empty' as const)
const REPARTI_OPERATIVI = REPARTI_OP.filter(r => !['risorseUmane', 'businessIntelligence'].includes(r.key))

export default function HrCollaboratoriEsterni(_: CfgPaneComponentProps) {
  const categorie = useHrConfigStore(s => s.categorieEsterni)
  const badge = useHrConfigStore(s => s.badge)
  const setCategorie = useHrConfigStore(s => s.setCategorieEsterni)
  const setBadge = useHrConfigStore(s => s.setBadge)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const collaboratori = useCollaboratoriEsterniStore(s => s.collaboratori)
  const confirm = useConfirmStore(s => s.confirm)
  const { struttura } = useStrutturaCorrente()
  const saved = useMemo(() => ({ categorie, badge }), [categorie, badge])
  const commit = useCallback((v: Dati) => { setCategorie(v.categorie); setBadge(v.badge) }, [setCategorie, setBadge])
  const { draft: dati, setDraft: setDati, dirty, save, cancel } = useHrDraft('hr-collaboratori-esterni', saved, countDati, commit, completion)
  const draft = dati.categorie
  const setDraft = (fn: (d: CategoriaEsterniHr[]) => CategoriaEsterniHr[]) => setDati(v => ({ ...v, categorie: fn(v.categorie) }))
  const b = dati.badge
  const setB = <K extends keyof BadgeConfigHr>(k: K, v: BadgeConfigHr[K]) => setDati(d => ({ ...d, badge: { ...d.badge, [k]: v } }))
  // Collaboratore di esempio per l'anteprima (il primo registrato)
  const esempio = collaboratori[0]

  const [form, setForm] = useState<CategoriaEsterniHr | null>(null)
  const set = <K extends keyof CategoriaEsterniHr>(k: K, v: CategoriaEsterniHr[K]) => setForm(f => (f ? { ...f, [k]: v } : f))

  const submit = () => {
    if (!form) return
    const c = { ...form, nome: form.nome.trim() }
    setDraft(d => (c.id ? d.map(x => (x.id === c.id ? c : x)) : [...d, { ...c, id: nuovoId('cest') }]))
    setForm(null)
  }
  const elimina = async (c: CategoriaEsterniHr) => {
    const n = collaboratori.filter(x => x.categoriaId === c.id).length
    const ok = await confirm({
      title: 'Elimina categoria',
      message: n ? `La categoria «${c.nome}» è assegnata a ${n} collaboratori: resteranno senza categoria finché non ne scegli un'altra.` : `Eliminare la categoria «${c.nome}»?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (ok) setDraft(d => d.filter(x => x.id !== c.id))
  }

  return (
    <div className="cfg-hrest cfg-hr-pane">
      {/* ── Categorie ─────────────────────────────────────────────────────── */}
      <section className="cfg-hrest__section">
        <CfgToolbar actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setForm(vuota())}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuova categoria
          </button>
        }>
          <div>
            <h3 className="cfg-hrest__title">Categorie di collaboratori</h3>
            <p className="cfg-hrest__desc">Per ogni categoria: reparti dell’App Op! a cui l’addetto può accedere, documenti da raccogliere e durata massima dell’autorizzazione.</p>
          </div>
        </CfgToolbar>
        <CfgTable
          columns={[
            { key: 'nome', label: 'Categoria', width: '20%' },
            { key: 'rep', label: 'Reparti App Op!', width: '20%' },
            { key: 'doc', label: 'Documenti richiesti', width: '28%' },
            { key: 'dur', label: 'Durata max', width: '10%', align: 'right' },
            { key: 'n', label: 'Addetti', width: '9%', align: 'right' },
            { key: 'az', label: 'Azioni', width: '13%', align: 'right' },
          ]}
        >
          {draft.map(c => (
            <tr key={c.id} className={c.attiva ? '' : 'cfg-hrest__row--off'}>
              <td><span className="cfg-hrest__name"><HrDot colore={c.colore} /><TruncatedText text={c.nome} /></span></td>
              <td><TruncatedText text={c.repartiOp.map(nomeReparto).join(', ') || '—'} /></td>
              <td><TruncatedText text={c.documenti.join(', ') || '—'} /></td>
              <td className="cfg-hrest__num">{c.durataMaxMesi} mesi</td>
              <td className="cfg-hrest__num">{collaboratori.filter(x => x.categoriaId === c.id).length}</td>
              <td className="cfg-hrest__actions">
                <HrRowActions nome={c.nome} onEdit={() => setForm({ ...c, repartiOp: [...c.repartiOp], documenti: [...c.documenti] })} onDelete={() => elimina(c)} />
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      {/* ── Badge di riconoscimento ─────────────────────────────────────── */}
      <section className="cfg-hrest__section">
        <div>
          <h3 className="cfg-hrest__title">Badge di riconoscimento</h3>
          <p className="cfg-hrest__desc">Tessera degli addetti delle imprese in appalto: foto, generalità, impresa, data di assunzione e, in subappalto, l’autorizzazione. Si stampa dalla scheda del collaboratore, dall’Archivio e da Aziende in appalto.</p>
        </div>
        <div className="cfg-hrest__badge">
          <div className="cfg-hrest__badge-form">
            <InputField name="bdg-int" label="Intestazione (committente)" value={b.intestazione} placeholder={struttura || 'Nome della struttura'}
              onChange={(e) => setB('intestazione', e.target.value)} hint="Vuoto = nome della struttura corrente." />
            <div className="hrcfg-modal__row">
              <RadioGroup name="bdg-or" label="Orientamento" value={b.orientamento} onChange={(v) => setB('orientamento', v as BadgeConfigHr['orientamento'])}
                options={[{ value: 'orizzontale', label: 'Orizzontale' }, { value: 'verticale', label: 'Verticale' }]} />
              <RadioGroup name="bdg-fmt" label="Formato di stampa" value={b.formatoStampa} onChange={(v) => setB('formatoStampa', v as BadgeConfigHr['formatoStampa'])}
                options={[{ value: 'a4', label: 'Foglio A4 da ritagliare' }, { value: 'cr80', label: 'Tessera CR80 (stampante di card)' }]} />
            </div>
            <HrColorPicker label="Colore della banda" value={b.colore} onChange={(c) => setB('colore', c)} />
            <div className="cfg-hrest__toggles">
              <ToggleSwitch label="Data di nascita" checked={b.mostraNascita} onChange={(v) => setB('mostraNascita', v)} />
              <ToggleSwitch label="Mansione (categoria)" checked={b.mostraCategoria} onChange={(v) => setB('mostraCategoria', v)} />
              <ToggleSwitch label="Periodo di validità" checked={b.mostraValidita} onChange={(v) => setB('mostraValidita', v)} />
              <ToggleSwitch label="Partita IVA dell’impresa" checked={b.mostraPartitaIva} onChange={(v) => setB('mostraPartitaIva', v)} />
              <ToggleSwitch label="QR code di verifica" checked={b.mostraQr} onChange={(v) => setB('mostraQr', v)} />
              <ToggleSwitch label="Stampa anche il retro" checked={b.retro} onChange={(v) => setB('retro', v)} />
            </div>
            <InputField name="bdg-dic" label="Dicitura in calce" value={b.dicitura} onChange={(e) => setB('dicitura', e.target.value)} />
            {b.retro && <TextareaField name="bdg-retro" label="Testo del retro" rows={3} value={b.testoRetro} onChange={(e) => setB('testoRetro', e.target.value)} />}
            <p className="hrcfg-modal__hint">Foto, nome e cognome, impresa e data di assunzione compaiono sempre: sono obbligatori per legge.</p>
          </div>
          <div className="cfg-hrest__badge-prev">
            <span className="hrcfg-modal__label">Anteprima</span>
            {esempio
              ? <BadgeAnteprima config={b} dati={{
                  collaboratore: esempio, struttura: struttura || 'Struttura',
                  azienda: fornitori.find(f => f.id === esempio.fornitoreId),
                  categoria: draft.find(c => c.id === esempio.categoriaId),
                }} />
              : <p className="cfg-hrest__desc">Registra un collaboratore esterno per vedere l’anteprima.</p>}
          </div>
        </div>
      </section>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Collaboratori esterni salvati" />

      <HrFormModal
        open={form !== null}
        title={form?.id ? 'Modifica categoria' : 'Nuova categoria di collaboratori'}
        onClose={() => setForm(null)}
        onSubmit={submit}
        submitLabel={form?.id ? 'Salva modifiche' : 'Crea categoria'}
        canSubmit={!!form?.nome.trim() && (form?.repartiOp.length ?? 0) > 0}
      >
        {form && (
          <>
            <div className="hrcfg-modal__row">
              <InputField name="cest-nome" label="Categoria" required value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Es. Manutentore" />
              <InputField name="cest-dur" label="Durata massima autorizzazione (mesi)" type="number" min={1} max={36} value={form.durataMaxMesi}
                onChange={(e) => set('durataMaxMesi', Number(e.target.value) || 1)} />
            </div>
            <CfgMultiSelect
              label="Reparti App Op! consentiti"
              placeholder="Scegli i reparti"
              nomePlurale="reparti"
              genere="m"
              options={REPARTI_OPERATIVI.map(r => r.nome)}
              value={form.repartiOp.map(nomeReparto)}
              onChange={(nomi) => set('repartiOp', nomi.map(n => REPARTI_OP.find(r => r.nome === n)?.key).filter(Boolean) as RepartoOp[])}
            />
            <CfgMultiSelect
              label="Documenti richiesti"
              placeholder="Nessun documento"
              nomePlurale="documenti"
              genere="m"
              options={DOCUMENTI_ESTERNI}
              value={form.documenti}
              onChange={(v) => set('documenti', v)}
            />
            <p className="hrcfg-modal__hint">Gli addetti esterni entrano nell’app sempre con grado Impiegato e senza funzioni HR.</p>
            <HrColorPicker value={form.colore} onChange={(c) => set('colore', c)} />
            <ToggleSwitch label="Categoria attiva" checked={form.attiva} onChange={(v) => set('attiva', v)} />
          </>
        )}
      </HrFormModal>
    </div>
  )
}
