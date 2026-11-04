import React, { useState } from 'react'
import { InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  useHrConfigStore, nuovoId, oreSettimanaliOrario, giorniLavorativiOrario, minutiGiorno,
  GIORNI_SETTIMANA, REGIMI_ORARIO, type OrarioHr, type RegimeOrario,
} from '../../../../../store/useHrConfigStore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import SettimanaOrario, { MODELLI } from './SettimanaOrario'
import './HrOrari.sass'

// ─── RISORSE UMANE › ORARI DI LAVORO ─────────────────────────────────────────
//  Gli orari contrattuali assegnabili al dipendente: griglia Lun→Dom con
//  entrata, uscita e pausa (le ore si calcolano da sole) oppure «a turni»,
//  dove conta il monte ore e la distribuzione la fa la Turnistica. Dalle ore
//  settimanali Crea anagrafica ricava la percentuale di part time rispetto al
//  CCNL e riproporziona ferie e permessi.

const vuoto = (): OrarioHr => ({
  id: '', nome: '', regime: 'full-time', aTurni: false, oreSettimanali: 40, giorniSettimana: 5, flessibilitaMin: 10,
  giorni: MODELLI[0].giorni(),
})
const completion = (v: OrarioHr[]) => (v.length ? 'configured' as const : 'empty' as const)
const fmtOre = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(2).replace('.', ',').replace(/0$/, ''))
const labelRegime = (r: RegimeOrario) => REGIMI_ORARIO.find(x => x.value === r)?.label ?? r

/** Descrizione compatta: giorni consecutivi con le stesse fasce raggruppati (es. «Lun–Ven 09:00–13:00 · 14:00–18:00, Sab 08:30–11:00»). */
function riepilogo(o: OrarioHr) {
  if (o.aTurni) return `A turni · ${o.giorniSettimana} giorni su 7`
  const firma = (i: number) => {
    const g = o.giorni[i]
    return g?.attivo && minutiGiorno(g) > 0 ? g.fasce.map(f => `${f.inizio}–${f.fine}`).join(' · ') : ''
  }
  const gruppi: { da: number; a: number; f: string }[] = []
  GIORNI_SETTIMANA.forEach((_, i) => {
    const f = firma(i)
    if (!f) return
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.f === f && ultimo.a === i - 1) ultimo.a = i
    else gruppi.push({ da: i, a: i, f })
  })
  if (!gruppi.length) return '—'
  return gruppi.map(g => `${GIORNI_SETTIMANA[g.da]}${g.a > g.da ? `–${GIORNI_SETTIMANA[g.a]}` : ''} ${g.f}`).join(', ')
}

export default function HrOrari() {
  const saved    = useHrConfigStore(s => s.orari)
  const setOrari = useHrConfigStore(s => s.setOrari)
  const confirm  = useConfirmStore(s => s.confirm)
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-orari', saved, diffCount, setOrari, completion)

  const [form, setForm] = useState<OrarioHr | null>(null)
  const set = <K extends keyof OrarioHr>(k: K, v: OrarioHr[K]) => setForm(f => (f ? { ...f, [k]: v } : f))

  const submit = () => {
    if (!form) return
    // fasce non valide (fine non successiva all'inizio) scartate; formato hh:mm → confronto lessicografico
    const o = { ...form, nome: form.nome.trim(), giorni: form.giorni.map(g => ({ ...g, fasce: g.fasce.filter(f => f.fine > f.inizio) })) }
    if (!o.aTurni) { o.oreSettimanali = oreSettimanaliOrario(o); o.giorniSettimana = giorniLavorativiOrario(o) }
    setDraft(d => (o.id ? d.map(x => (x.id === o.id ? o : x)) : [...d, { ...o, id: nuovoId('ora') }]))
    setForm(null)
  }

  const elimina = async (o: OrarioHr) => {
    const ok = await confirm({ title: 'Elimina orario', message: `Eliminare l'orario «${o.nome}»?`, confirmLabel: 'Elimina', danger: true })
    if (ok) setDraft(d => d.filter(x => x.id !== o.id))
  }

  return (
    <div className="cfg-hrora cfg-hr-pane">
      <CfgToolbar actions={
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setForm(vuoto())}>
          <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo orario
        </button>
      }>
        <p className="cfg-hrora__lead">Orari contrattuali da assegnare al dipendente: le ore settimanali determinano l’eventuale part time.</p>
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome', label: 'Orario', width: '25%' },
          { key: 'regime', label: 'Regime', width: '16%' },
          { key: 'ore', label: 'Ore/sett.', width: '9%', align: 'right' },
          { key: 'gg', label: 'Giorni', width: '8%', align: 'right' },
          { key: 'fasce', label: 'Distribuzione', width: '25%' },
          { key: 'azioni', label: 'Azioni', width: '18%', align: 'right' },
        ]}
      >
        {draft.map(o => (
          <tr key={o.id}>
            <td><TruncatedText text={o.nome} className="cfg-hrora__name" /></td>
            <td><TruncatedText text={labelRegime(o.regime)} /></td>
            <td className="cfg-hrora__num">{fmtOre(oreSettimanaliOrario(o))} h</td>
            <td className="cfg-hrora__num">{giorniLavorativiOrario(o)}</td>
            <td><TruncatedText text={riepilogo(o)} /></td>
            <td className="cfg-hrora__actions">
              <HrRowActions nome={o.nome} onEdit={() => setForm(structuredClone(o))}
                onDuplicate={() => setForm({ ...structuredClone(o), id: '', nome: `${o.nome} (copia)` })}
                onDelete={() => elimina(o)} />
            </td>
          </tr>
        ))}
      </CfgTable>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Orari di lavoro salvati" />

      <HrFormModal
        open={form !== null}
        size="lg"
        title={form?.id ? 'Modifica orario di lavoro' : 'Nuovo orario di lavoro'}
        onClose={() => setForm(null)}
        onSubmit={submit}
        submitLabel={form?.id ? 'Salva modifiche' : 'Crea orario'}
        canSubmit={!!form?.nome.trim() && (form.aTurni ? form.oreSettimanali > 0 : oreSettimanaliOrario(form) > 0)}
      >
        {form && (
          <>
            <div className="hrcfg-modal__row hrcfg-modal__row--3">
              <InputField name="ora-nome" label="Nome orario" required value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Es. Full time 40 h · 5 giorni" />
              <SelectField name="ora-regime" label="Regime" value={form.regime} onChange={(e) => set('regime', e.target.value as RegimeOrario)} options={REGIMI_ORARIO} />
              <InputField name="ora-flex" label="Flessibilità (minuti)" type="number" min={0} value={form.flessibilitaMin}
                onChange={(e) => set('flessibilitaMin', Number(e.target.value) || 0)} />
            </div>

            <ToggleSwitch label="Orario a turni" description="Le fasce giornaliere le assegna la Turnistica: qui si fissa solo il monte ore."
              checked={form.aTurni} onChange={(v) => set('aTurni', v)} />

            {form.aTurni ? (
              <div className="hrcfg-modal__row">
                <InputField name="ora-ore" label="Ore settimanali" type="number" min={1} max={48} value={form.oreSettimanali}
                  onChange={(e) => set('oreSettimanali', Number(e.target.value) || 0)} />
                <InputField name="ora-gg" label="Giorni di servizio a settimana" type="number" min={1} max={7} value={form.giorniSettimana}
                  onChange={(e) => set('giorniSettimana', Math.min(7, Number(e.target.value) || 0))} />
              </div>
            ) : (
              <SettimanaOrario value={form.giorni} onChange={(giorni) => set('giorni', giorni)} />
            )}
          </>
        )}
      </HrFormModal>
    </div>
  )
}
