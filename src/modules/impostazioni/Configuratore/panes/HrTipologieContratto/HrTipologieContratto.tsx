import React, { useState } from 'react'
import { InputField, ToggleSwitch } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useHrConfigStore, nuovoId, type TipologiaContrattoHr } from '../../../../../store/useHrConfigStore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import './HrTipologieContratto.sass'

// ─── RISORSE UMANE › TIPOLOGIE DI CONTRATTO ──────────────────────────────────
//  I tipi di rapporto applicabili (indeterminato, determinato, stagionale…):
//  se prevedono una scadenza Crea anagrafica chiede la data di fine (entro la
//  durata massima), se prevedono il periodo di prova lo propone dal livello
//  del CCNL. Il part time NON è una tipologia: deriva dall'orario di lavoro.

const vuoto = (): TipologiaContrattoHr => ({ id: '', nome: '', codice: '', conScadenza: false, periodoProva: true, attiva: true })
const completion = (v: TipologiaContrattoHr[]) => (v.some(t => t.attiva) ? 'configured' as const : 'empty' as const)

const Si = ({ on }: { on: boolean }) => (
  <i className={`fa-solid ${on ? 'fa-check cfg-hrtip__yes' : 'fa-minus cfg-hrtip__no'}`} aria-label={on ? 'Sì' : 'No'} />
)

export default function HrTipologieContratto() {
  const saved = useHrConfigStore(s => s.tipologie)
  const setTipologie = useHrConfigStore(s => s.setTipologie)
  const confirm = useConfirmStore(s => s.confirm)
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-tipologie-contratto', saved, diffCount, setTipologie, completion)
  const [form, setForm] = useState<TipologiaContrattoHr | null>(null)
  const set = <K extends keyof TipologiaContrattoHr>(k: K, v: TipologiaContrattoHr[K]) => setForm(f => (f ? { ...f, [k]: v } : f))

  const submit = () => {
    if (!form) return
    const t = { ...form, nome: form.nome.trim(), durataMaxMesi: form.durataMaxMesi || undefined }
    setDraft(d => (t.id ? d.map(x => (x.id === t.id ? t : x)) : [...d, { ...t, id: nuovoId('tip') }]))
    setForm(null)
  }
  const elimina = async (t: TipologiaContrattoHr) => {
    const ok = await confirm({ title: 'Elimina tipologia', message: `Eliminare la tipologia «${t.nome}»? I contratti già registrati la mantengono nello storico.`, confirmLabel: 'Elimina', danger: true })
    if (ok) setDraft(d => d.filter(x => x.id !== t.id))
  }

  return (
    <div className="cfg-hrtip cfg-hr-pane">
      <CfgToolbar actions={
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setForm(vuoto())}>
          <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuova tipologia
        </button>
      }>
        <p className="cfg-hrtip__lead">Il part time non è una tipologia: si ricava dall’orario di lavoro assegnato al dipendente.</p>
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome', label: 'Tipologia', width: '28%' },
          { key: 'codice', label: 'Codice UniLav', width: '13%' },
          { key: 'scad', label: 'Con scadenza', width: '12%', align: 'center' },
          { key: 'durata', label: 'Durata max', width: '12%', align: 'right' },
          { key: 'prova', label: 'Periodo di prova', width: '13%', align: 'center' },
          { key: 'stato', label: 'Stato', width: '10%' },
          { key: 'azioni', label: 'Azioni', width: '12%', align: 'right' },
        ]}
      >
        {draft.map(t => (
          <tr key={t.id}>
            <td><TruncatedText text={t.nome} className="cfg-hrtip__name" /></td>
            <td><span className="cfg-hrtip__code">{t.codice || '—'}</span></td>
            <td className="cfg-hrtip__center"><Si on={t.conScadenza} /></td>
            <td className="cfg-hrtip__num">{t.durataMaxMesi ? `${t.durataMaxMesi} mesi` : '—'}</td>
            <td className="cfg-hrtip__center"><Si on={t.periodoProva} /></td>
            <td><span className={`cfg-hrtip__badge cfg-hrtip__badge--${t.attiva ? 'on' : 'off'}`}>{t.attiva ? 'Attiva' : 'Non attiva'}</span></td>
            <td className="cfg-hrtip__actions">
              <HrRowActions nome={t.nome} onEdit={() => setForm({ ...t })} onDelete={() => elimina(t)} />
            </td>
          </tr>
        ))}
      </CfgTable>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Tipologie di contratto salvate" />

      <HrFormModal
        open={form !== null}
        title={form?.id ? 'Modifica tipologia' : 'Nuova tipologia di contratto'}
        onClose={() => setForm(null)}
        onSubmit={submit}
        submitLabel={form?.id ? 'Salva modifiche' : 'Crea tipologia'}
        canSubmit={!!form?.nome.trim()}
      >
        {form && (
          <>
            <div className="hrcfg-modal__row">
              <InputField name="tip-nome" label="Tipologia" required value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Es. Tempo determinato" />
              <InputField name="tip-cod" label="Codice UniLav" value={form.codice} onChange={(e) => set('codice', e.target.value.toUpperCase())} placeholder="Es. A.02.00" />
            </div>
            <ToggleSwitch label="Contratto con scadenza" description="In Crea anagrafica diventa obbligatoria la data di fine rapporto."
              checked={form.conScadenza} onChange={(v) => set('conScadenza', v)} />
            <InputField name="tip-durata" label="Durata massima (mesi)" type="number" min={0} value={form.durataMaxMesi ?? ''}
              onChange={(e) => set('durataMaxMesi', Number(e.target.value) || undefined)} hint="Lascia vuoto se non c'è un limite." />
            <ToggleSwitch label="Prevede il periodo di prova" description="La durata si propone dal livello del CCNL."
              checked={form.periodoProva} onChange={(v) => set('periodoProva', v)} />
            <ToggleSwitch label="Tipologia attiva" checked={form.attiva} onChange={(v) => set('attiva', v)} />
          </>
        )}
      </HrFormModal>
    </div>
  )
}
