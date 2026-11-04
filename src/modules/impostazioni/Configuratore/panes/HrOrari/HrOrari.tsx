import React, { useState } from 'react'
import { InputField, SelectField, ToggleSwitch, CheckboxField, DatePickerField } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  useHrConfigStore, nuovoId, oreGiorno, oreSettimanaliOrario, giorniLavorativiOrario,
  GIORNI_SETTIMANA, REGIMI_ORARIO, type OrarioHr, type RegimeOrario,
} from '../../../../../store/useHrConfigStore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import './HrOrari.sass'

// ─── RISORSE UMANE › ORARI DI LAVORO ─────────────────────────────────────────
//  Gli orari contrattuali assegnabili al dipendente: griglia Lun→Dom con
//  entrata, uscita e pausa (le ore si calcolano da sole) oppure «a turni»,
//  dove conta il monte ore e la distribuzione la fa la Turnistica. Dalle ore
//  settimanali Crea anagrafica ricava la percentuale di part time rispetto al
//  CCNL e riproporziona ferie e permessi.

const vuoto = (): OrarioHr => ({
  id: '', nome: '', regime: 'full-time', aTurni: false, oreSettimanali: 40, giorniSettimana: 5, flessibilitaMin: 10,
  giorni: GIORNI_SETTIMANA.map((_, i) => ({ attivo: i < 5, entrata: '09:00', uscita: '18:00', pausaMin: 60 })),
})
const completion = (v: OrarioHr[]) => (v.length ? 'configured' as const : 'empty' as const)
const fmtOre = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(2).replace('.', ',').replace(/0$/, ''))
const labelRegime = (r: RegimeOrario) => REGIMI_ORARIO.find(x => x.value === r)?.label ?? r

function riepilogo(o: OrarioHr) {
  if (o.aTurni) return `A turni · ${o.giorniSettimana} giorni su 7`
  const attivi = o.giorni.map((f, i) => ({ f, i })).filter(x => x.f.attivo)
  if (!attivi.length) return '—'
  const stesso = attivi.every(x => x.f.entrata === attivi[0].f.entrata && x.f.uscita === attivi[0].f.uscita)
  const giorni = attivi.length > 2 && attivi.every((x, k) => k === 0 || x.i === attivi[k - 1].i + 1)
    ? `${GIORNI_SETTIMANA[attivi[0].i]}–${GIORNI_SETTIMANA[attivi[attivi.length - 1].i]}`
    : attivi.map(x => GIORNI_SETTIMANA[x.i]).join(', ')
  return stesso ? `${giorni} ${attivi[0].f.entrata}–${attivi[0].f.uscita}` : `${giorni} · orari variabili`
}

export default function HrOrari() {
  const saved    = useHrConfigStore(s => s.orari)
  const setOrari = useHrConfigStore(s => s.setOrari)
  const confirm  = useConfirmStore(s => s.confirm)
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-orari', saved, diffCount, setOrari, completion)

  const [form, setForm] = useState<OrarioHr | null>(null)
  const set = <K extends keyof OrarioHr>(k: K, v: OrarioHr[K]) => setForm(f => (f ? { ...f, [k]: v } : f))
  const setGiorno = (i: number, p: Partial<OrarioHr['giorni'][number]>) =>
    setForm(f => (f ? { ...f, giorni: f.giorni.map((g, k) => (k === i ? { ...g, ...p } : g)) } : f))
  const copiaSuTutti = (i: number) =>
    setForm(f => (f ? { ...f, giorni: f.giorni.map(g => (g.attivo ? { ...f.giorni[i], attivo: true } : g)) } : f))

  const submit = () => {
    if (!form) return
    const o = { ...form, nome: form.nome.trim() }
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
              <div className="cfg-hrora__week">
                <div className="cfg-hrora__week-head">
                  <span>Giorno</span><span>Entrata</span><span>Uscita</span><span>Pausa (min)</span><span>Ore</span><span />
                </div>
                {form.giorni.map((g, i) => (
                  <div key={GIORNI_SETTIMANA[i]} className={`cfg-hrora__week-row${g.attivo ? '' : ' is-off'}`}>
                    <CheckboxField name={`ora-g${i}`} label={GIORNI_SETTIMANA[i]} checked={g.attivo}
                      onChange={(e) => setGiorno(i, { attivo: e.target.checked, entrata: g.entrata || '09:00', uscita: g.uscita || '18:00' })} />
                    <DatePickerField name={`ora-in${i}`} type="time" value={g.entrata} disabled={!g.attivo} onChange={(e) => setGiorno(i, { entrata: e.target.value })} />
                    <DatePickerField name={`ora-out${i}`} type="time" value={g.uscita} disabled={!g.attivo} onChange={(e) => setGiorno(i, { uscita: e.target.value })} />
                    <InputField name={`ora-p${i}`} type="number" min={0} step={5} value={g.pausaMin} disabled={!g.attivo} ariaLabel={`Pausa ${GIORNI_SETTIMANA[i]}`}
                      onChange={(e) => setGiorno(i, { pausaMin: Number(e.target.value) || 0 })} />
                    <span className="cfg-hrora__week-ore">{g.attivo ? `${fmtOre(oreGiorno(g))} h` : '—'}</span>
                    <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm cfg-hrora__copy" disabled={!g.attivo} onClick={() => copiaSuTutti(i)}>
                      Copia sui giorni attivi
                    </button>
                  </div>
                ))}
                <div className="cfg-hrora__week-total">
                  Totale settimanale <strong>{fmtOre(oreSettimanaliOrario(form))} h</strong> su {giorniLavorativiOrario(form)} giorni
                </div>
              </div>
            )}
          </>
        )}
      </HrFormModal>
    </div>
  )
}
