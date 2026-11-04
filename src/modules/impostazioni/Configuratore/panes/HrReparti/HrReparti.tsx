import React, { useCallback, useState } from 'react'
import { InputField, SelectField, ToggleSwitch, TextareaField, SearchField } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useHrConfigStore, nuovoId, type RepartoHr } from '../../../../../store/useHrConfigStore'
import { REPARTI_OP, nomeReparto } from '../../../../appop/opCatalogo'
import type { RepartoOp } from '../../../../appop/opCatalogo'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import { HrDot, HrColorPicker } from '../_hr/HrColore'
import './HrReparti.sass'

// ─── RISORSE UMANE › REPARTI ─────────────────────────────────────────────────
//  I reparti in cui si inquadra il personale: codice, responsabile, centro di
//  costo e reparto dell'App Op! in cui il dipendente entra di default. Sono le
//  opzioni del campo «Reparto» di Crea anagrafica e la colonna dell'Archivio.

const vuoto = (): RepartoHr => ({ id: '', nome: '', codice: '', responsabile: '', centroCosto: '', colore: 1, attivo: true, descrizione: '' })
const completion = (v: RepartoHr[]) => (v.some(r => r.attivo) ? 'configured' as const : 'empty' as const)

export default function HrReparti() {
  const saved      = useHrConfigStore(s => s.reparti)
  const setReparti = useHrConfigStore(s => s.setReparti)
  const confirm    = useConfirmStore(s => s.confirm)
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-reparti', saved, diffCount, setReparti, completion)

  const [q, setQ] = useState('')
  const [form, setForm] = useState<RepartoHr | null>(null)
  const set = <K extends keyof RepartoHr>(k: K, v: RepartoHr[K]) => setForm(f => (f ? { ...f, [k]: v } : f))

  const elenco = draft.filter(r => !q || `${r.nome} ${r.codice} ${r.responsabile} ${r.centroCosto}`.toLowerCase().includes(q.toLowerCase()))

  const submit = () => {
    if (!form) return
    const r = { ...form, nome: form.nome.trim(), codice: form.codice.trim().toUpperCase() }
    setDraft(d => (r.id ? d.map(x => (x.id === r.id ? r : x)) : [...d, { ...r, id: nuovoId('rep') }]))
    setForm(null)
  }

  const elimina = useCallback(async (r: RepartoHr) => {
    const ok = await confirm({
      title: 'Elimina reparto',
      message: `Eliminare il reparto «${r.nome}»? I dipendenti già inquadrati lo mantengono nel contratto vigente finché non lo cambi.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (ok) setDraft(d => d.filter(x => x.id !== r.id))
  }, [confirm, setDraft])

  const duplicato = form && draft.some(x => x.id !== form.id && x.codice.trim().toUpperCase() === form.codice.trim().toUpperCase() && form.codice.trim() !== '')

  return (
    <div className="cfg-hrrep cfg-hr-pane">
      <CfgToolbar actions={
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setForm(vuoto())}>
          <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo reparto
        </button>
      }>
        <SearchField name="hrrep-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca reparto, responsabile, centro di costo" />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome', label: 'Reparto', width: '22%' },
          { key: 'codice', label: 'Codice', width: '9%' },
          { key: 'resp', label: 'Responsabile', width: '18%' },
          { key: 'cdc', label: 'Centro di costo', width: '16%' },
          { key: 'op', label: 'Reparto App Op!', width: '14%' },
          { key: 'stato', label: 'Stato', width: '9%' },
          { key: 'azioni', label: 'Azioni', width: '12%', align: 'right' },
        ]}
        empty={<span className="cfg-table__empty-text">Nessun reparto: crea il primo con «Nuovo reparto».</span>}
      >
        {elenco.map(r => (
          <tr key={r.id} className={r.attivo ? '' : 'cfg-hrrep__row--off'}>
            <td>
              <span className="cfg-hrrep__name">
                <HrDot colore={r.colore} />
                <TruncatedText text={r.nome} />
              </span>
            </td>
            <td><span className="cfg-hrrep__code">{r.codice || '—'}</span></td>
            <td><TruncatedText text={r.responsabile || '—'} /></td>
            <td><TruncatedText text={r.centroCosto || '—'} /></td>
            <td><TruncatedText text={r.repartoOp ? nomeReparto(r.repartoOp) : '—'} /></td>
            <td>
              <span className={`cfg-hrrep__badge cfg-hrrep__badge--${r.attivo ? 'on' : 'off'}`}>{r.attivo ? 'Attivo' : 'Non attivo'}</span>
            </td>
            <td className="cfg-hrrep__actions">
              <HrRowActions nome={r.nome} onEdit={() => setForm({ ...r })} onDelete={() => elimina(r)} />
            </td>
          </tr>
        ))}
      </CfgTable>

      <p className="cfg-hrrep__note">
        <i className="fa-light fa-circle-info" aria-hidden="true" /> {draft.filter(r => r.attivo).length} reparti attivi su {draft.length}.
        Solo i reparti attivi sono selezionabili in Crea anagrafica personale.
      </p>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Reparti salvati" />

      <HrFormModal
        open={form !== null}
        title={form?.id ? 'Modifica reparto' : 'Nuovo reparto'}
        onClose={() => setForm(null)}
        onSubmit={submit}
        submitLabel={form?.id ? 'Salva modifiche' : 'Crea reparto'}
        canSubmit={!!form?.nome.trim() && !duplicato}
      >
        {form && (
          <>
            <div className="hrcfg-modal__row">
              <InputField name="rep-nome" label="Nome reparto" required value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Es. Front office" />
              <InputField name="rep-codice" label="Codice" value={form.codice} maxLength={6} onChange={(e) => set('codice', e.target.value.toUpperCase())}
                placeholder="Es. FO" error={duplicato ? 'Codice già usato da un altro reparto' : undefined} />
            </div>
            <div className="hrcfg-modal__row">
              <InputField name="rep-resp" label="Responsabile" value={form.responsabile} onChange={(e) => set('responsabile', e.target.value)} placeholder="Nome e cognome" />
              <InputField name="rep-cdc" label="Centro di costo" value={form.centroCosto} onChange={(e) => set('centroCosto', e.target.value)} placeholder="Es. CDC-01 Ricevimento" />
            </div>
            <SelectField name="rep-op" label="Reparto App Op! collegato" value={form.repartoOp ?? ''}
              onChange={(e) => set('repartoOp', (e.target.value || undefined) as RepartoOp | undefined)}
              options={[{ value: '', label: 'Nessuno' }, ...REPARTI_OP.map(r => ({ value: r.key, label: r.nome }))]}
              hint="Proposto nella sezione App Op! della scheda del dipendente." />
            <TextareaField name="rep-desc" label="Descrizione (facoltativa)" value={form.descrizione ?? ''} onChange={(e) => set('descrizione', e.target.value)} rows={2} />
            <HrColorPicker value={form.colore} onChange={(c) => set('colore', c)} />
            <ToggleSwitch label="Reparto attivo" description="I reparti non attivi restano nello storico ma non si assegnano ai nuovi contratti."
              checked={form.attivo} onChange={(v) => set('attivo', v)} />
          </>
        )}
      </HrFormModal>
    </div>
  )
}
