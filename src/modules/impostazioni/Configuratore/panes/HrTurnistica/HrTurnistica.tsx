import React, { useCallback, useMemo, useState } from 'react'
import { InputField, ToggleSwitch, DatePickerField, TextareaField } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import Tooltip from '../../../../../core/components/Tooltip'
import { CfgToolbar, CfgTable, CfgSaveBar, CfgMultiSelect } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  useHrConfigStore, nuovoId, oreTurno, turnoNotturno, RIPOSO,
  type TurnoHr, type SchemaTurniHr,
} from '../../../../../store/useHrConfigStore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import { HrColorPicker } from '../_hr/HrColore'
import './HrTurnistica.sass'

// ─── RISORSE UMANE › TURNISTICA ──────────────────────────────────────────────
//  1) Turni di servizio: sigla, fasce (anche spezzate), pausa, colore e reparti
//     in cui si usano; notturno riconosciuto da solo (almeno un'ora 22–6).
//  2) Schemi di rotazione: la sequenza ciclica di turni e riposi assegnabile
//     al dipendente in Crea anagrafica (es. ciclo continuo M-M-P-P-N-N-R-R).

interface Turnistica { turni: TurnoHr[]; schemi: SchemaTurniHr[] }

const turnoVuoto = (): TurnoHr => ({ id: '', sigla: '', nome: '', inizio: '08:00', fine: '16:00', pausaMin: 30, colore: 1, reparti: [] })
const schemaVuoto = (): SchemaTurniHr => ({ id: '', nome: '', descrizione: '', sequenza: [] })
const countT = (a: Turnistica, b: Turnistica) => diffCount(a.turni, b.turni) + diffCount(a.schemi, b.schemi)
const completion = (v: Turnistica) => (v.turni.length && v.schemi.length ? 'configured' as const : v.turni.length ? 'partial' as const : 'empty' as const)
const fmtOre = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1).replace('.', ','))
const fasce = (t: TurnoHr) => `${t.inizio}–${t.fine}${t.inizio2 && t.fine2 ? ` / ${t.inizio2}–${t.fine2}` : ''}`

function TurnoChip({ turno, small }: { turno?: TurnoHr; small?: boolean }) {
  const cls = `cfg-hrtur__chip${small ? ' cfg-hrtur__chip--sm' : ''}`
  if (!turno) return <span className={`${cls} cfg-hrtur__chip--riposo`}>{RIPOSO}</span>
  return <span className={cls} data-col={turno.colore}>{turno.sigla || '?'}</span>
}

export default function HrTurnistica() {
  const turni = useHrConfigStore(s => s.turni)
  const schemi = useHrConfigStore(s => s.schemi)
  const reparti = useHrConfigStore(s => s.reparti)
  const setTurnistica = useHrConfigStore(s => s.setTurnistica)
  const confirm = useConfirmStore(s => s.confirm)

  const saved = useMemo(() => ({ turni, schemi }), [turni, schemi])
  const commit = useCallback((v: Turnistica) => setTurnistica(v.turni, v.schemi), [setTurnistica])
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-turnistica', saved, countT, commit, completion)

  const [turno, setTurno] = useState<(TurnoHr & { spezzato: boolean }) | null>(null)
  const [schema, setSchema] = useState<SchemaTurniHr | null>(null)
  const setT = <K extends keyof TurnoHr | 'spezzato'>(k: K, v: any) => setTurno(f => (f ? { ...f, [k]: v } : f))
  const turnoById = (id: string) => draft.turni.find(t => t.id === id)
  const nomeReparto = (id: string) => reparti.find(r => r.id === id)?.nome ?? id

  const salvaTurno = () => {
    if (!turno) return
    const { spezzato, ...t } = turno
    const pulito: TurnoHr = { ...t, sigla: t.sigla.trim().toUpperCase(), nome: t.nome.trim(), ...(spezzato ? {} : { inizio2: undefined, fine2: undefined }) }
    setDraft(d => ({ ...d, turni: pulito.id ? d.turni.map(x => (x.id === pulito.id ? pulito : x)) : [...d.turni, { ...pulito, id: nuovoId('tur') }] }))
    setTurno(null)
  }
  const salvaSchema = () => {
    if (!schema) return
    const s = { ...schema, nome: schema.nome.trim() }
    setDraft(d => ({ ...d, schemi: s.id ? d.schemi.map(x => (x.id === s.id ? s : x)) : [...d.schemi, { ...s, id: nuovoId('sch') }] }))
    setSchema(null)
  }

  const eliminaTurno = async (t: TurnoHr) => {
    const usato = draft.schemi.filter(s => s.sequenza.includes(t.id))
    const ok = await confirm({
      title: 'Elimina turno',
      message: usato.length
        ? `Il turno «${t.nome}» è usato in ${usato.length} schemi di rotazione (${usato.map(s => s.nome).join(', ')}): eliminandolo verrà tolto anche dalle loro sequenze.`
        : `Eliminare il turno «${t.nome}»?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (ok) setDraft(d => ({
      turni: d.turni.filter(x => x.id !== t.id),
      schemi: d.schemi.map(s => (s.sequenza.includes(t.id) ? { ...s, sequenza: s.sequenza.filter(x => x !== t.id) } : s)),
    }))
  }
  const eliminaSchema = async (s: SchemaTurniHr) => {
    const ok = await confirm({ title: 'Elimina schema', message: `Eliminare lo schema di rotazione «${s.nome}»?`, confirmLabel: 'Elimina', danger: true })
    if (ok) setDraft(d => ({ ...d, schemi: d.schemi.filter(x => x.id !== s.id) }))
  }

  const siglaDoppia = turno && turno.sigla.trim() !== '' && draft.turni.some(x => x.id !== turno.id && x.sigla.toUpperCase() === turno.sigla.trim().toUpperCase())

  return (
    <div className="cfg-hrtur cfg-hr-pane">
      {/* ── Turni ─────────────────────────────────────────────────────────── */}
      <section className="cfg-hrtur__section">
        <CfgToolbar actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setTurno({ ...turnoVuoto(), spezzato: false })}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo turno
          </button>
        }>
          <div>
            <h3 className="cfg-hrtur__title">Turni di servizio</h3>
            <p className="cfg-hrtur__desc">Le fasce orarie con cui si compongono gli schemi e i turni settimanali del personale.</p>
          </div>
        </CfgToolbar>
        <CfgTable
          columns={[
            { key: 'sigla', label: 'Sigla', width: '8%' },
            { key: 'nome', label: 'Turno', width: '18%' },
            { key: 'fasce', label: 'Fasce orarie', width: '22%' },
            { key: 'ore', label: 'Ore nette', width: '10%', align: 'right' },
            { key: 'tipo', label: 'Tipo', width: '11%' },
            { key: 'reparti', label: 'Reparti', width: '19%' },
            { key: 'azioni', label: 'Azioni', width: '12%', align: 'right' },
          ]}
        >
          {draft.turni.map(t => (
            <tr key={t.id}>
              <td><TurnoChip turno={t} /></td>
              <td><TruncatedText text={t.nome} className="cfg-hrtur__name" /></td>
              <td><TruncatedText text={fasce(t)} /></td>
              <td className="cfg-hrtur__num">{fmtOre(oreTurno(t))} h</td>
              <td>
                {turnoNotturno(t)
                  ? <span className="cfg-hrtur__badge cfg-hrtur__badge--notte"><i className="fa-solid fa-moon" aria-hidden="true" /> Notturno</span>
                  : t.inizio2 ? <span className="cfg-hrtur__badge">Spezzato</span> : <span className="cfg-hrtur__badge">Diurno</span>}
              </td>
              <td><TruncatedText text={t.reparti.length ? t.reparti.map(nomeReparto).join(', ') : 'Tutti i reparti'} /></td>
              <td className="cfg-hrtur__actions">
                <HrRowActions nome={t.nome} onEdit={() => setTurno({ ...t, reparti: [...t.reparti], spezzato: !!t.inizio2 })} onDelete={() => eliminaTurno(t)} />
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      {/* ── Schemi di rotazione ───────────────────────────────────────────── */}
      <section className="cfg-hrtur__section">
        <CfgToolbar actions={
          <button type="button" className="sib-btn sib-btn--secondary" disabled={!draft.turni.length} onClick={() => setSchema(schemaVuoto())}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo schema
          </button>
        }>
          <div>
            <h3 className="cfg-hrtur__title">Schemi di rotazione</h3>
            <p className="cfg-hrtur__desc">Cicli di turni e riposi che si ripetono: si assegnano al dipendente nella sua scheda.</p>
          </div>
        </CfgToolbar>
        {draft.schemi.length === 0 ? (
          <p className="cfg-hrtur__empty">Nessuno schema di rotazione.</p>
        ) : (
          <div className="cfg-hrtur__schemi">
            {draft.schemi.map(s => {
              const lavoro = s.sequenza.filter(x => x !== RIPOSO).length
              const ore = s.sequenza.reduce((a, id) => a + (id === RIPOSO ? 0 : oreTurno(turnoById(id) ?? turnoVuoto())), 0)
              const oreSett = s.sequenza.length ? (ore / s.sequenza.length) * 7 : 0
              return (
                <article key={s.id} className="cfg-hrtur__schema">
                  <header className="cfg-hrtur__schema-head">
                    <TruncatedText text={s.nome} className="cfg-hrtur__name" />
                    <HrRowActions nome={s.nome} onEdit={() => setSchema({ ...s, sequenza: [...s.sequenza] })} onDelete={() => eliminaSchema(s)} />
                  </header>
                  {s.descrizione && <p className="cfg-hrtur__desc">{s.descrizione}</p>}
                  <div className="cfg-hrtur__seq">
                    {s.sequenza.map((id, i) => <TurnoChip key={i} turno={id === RIPOSO ? undefined : turnoById(id)} small />)}
                  </div>
                  <footer className="cfg-hrtur__schema-foot">
                    Ciclo di {s.sequenza.length} giorni · {lavoro} lavorati, {s.sequenza.length - lavoro} di riposo · ≈ {fmtOre(oreSett)} h/sett.
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Turnistica salvata" />

      {/* ── Modale turno ──────────────────────────────────────────────────── */}
      <HrFormModal
        open={turno !== null}
        title={turno?.id ? 'Modifica turno' : 'Nuovo turno'}
        onClose={() => setTurno(null)}
        onSubmit={salvaTurno}
        submitLabel={turno?.id ? 'Salva modifiche' : 'Crea turno'}
        canSubmit={!!turno?.nome.trim() && !!turno.sigla.trim() && !siglaDoppia}
      >
        {turno && (
          <>
            <div className="hrcfg-modal__row">
              <InputField name="tur-sigla" label="Sigla" required maxLength={3} value={turno.sigla} onChange={(e) => setT('sigla', e.target.value.toUpperCase())}
                placeholder="Es. M" error={siglaDoppia ? 'Sigla già usata' : undefined} />
              <InputField name="tur-nome" label="Nome turno" required value={turno.nome} onChange={(e) => setT('nome', e.target.value)} placeholder="Es. Mattina" />
            </div>
            <div className="hrcfg-modal__row hrcfg-modal__row--3">
              <DatePickerField name="tur-in" label="Inizio" type="time" value={turno.inizio} onChange={(e) => setT('inizio', e.target.value)} />
              <DatePickerField name="tur-out" label="Fine" type="time" value={turno.fine} onChange={(e) => setT('fine', e.target.value)} />
              <InputField name="tur-pausa" label="Pausa (minuti)" type="number" min={0} step={5} value={turno.pausaMin} onChange={(e) => setT('pausaMin', Number(e.target.value) || 0)} />
            </div>
            <ToggleSwitch label="Turno spezzato" description="Aggiunge una seconda fascia nella stessa giornata."
              checked={turno.spezzato} onChange={(v) => setTurno(f => (f ? { ...f, spezzato: v, inizio2: f.inizio2 ?? '18:00', fine2: f.fine2 ?? '22:00' } : f))} />
            {turno.spezzato && (
              <div className="hrcfg-modal__row">
                <DatePickerField name="tur-in2" label="Inizio seconda fascia" type="time" value={turno.inizio2 ?? ''} onChange={(e) => setT('inizio2', e.target.value)} />
                <DatePickerField name="tur-out2" label="Fine seconda fascia" type="time" value={turno.fine2 ?? ''} onChange={(e) => setT('fine2', e.target.value)} />
              </div>
            )}
            <CfgMultiSelect
              label="Reparti in cui si usa"
              placeholder="Tutti i reparti"
              nomePlurale="reparti"
              options={reparti.filter(r => r.attivo).map(r => r.nome)}
              value={turno.reparti.map(nomeReparto)}
              onChange={(nomi) => setT('reparti', nomi.map(n => reparti.find(r => r.nome === n)?.id).filter(Boolean))}
            />
            <HrColorPicker value={turno.colore} onChange={(c) => setT('colore', c)} />
            <p className="hrcfg-modal__hint">
              Ore nette: <strong>{fmtOre(oreTurno({ ...turno, ...(turno.spezzato ? {} : { inizio2: undefined, fine2: undefined }) }))} h</strong>
              {turnoNotturno(turno) && ' · turno notturno (almeno 3 ore tra le 22 e le 6): si applica la maggiorazione del CCNL'}
            </p>
          </>
        )}
      </HrFormModal>

      {/* ── Modale schema ─────────────────────────────────────────────────── */}
      <HrFormModal
        open={schema !== null}
        size="lg"
        title={schema?.id ? 'Modifica schema di rotazione' : 'Nuovo schema di rotazione'}
        onClose={() => setSchema(null)}
        onSubmit={salvaSchema}
        submitLabel={schema?.id ? 'Salva modifiche' : 'Crea schema'}
        canSubmit={!!schema?.nome.trim() && (schema?.sequenza.length ?? 0) > 0}
      >
        {schema && (
          <>
            <InputField name="sch-nome" label="Nome schema" required value={schema.nome} onChange={(e) => setSchema({ ...schema, nome: e.target.value })} placeholder="Es. Ciclo continuo 3 turni" />
            <TextareaField name="sch-desc" label="Descrizione" rows={2} value={schema.descrizione} onChange={(e) => setSchema({ ...schema, descrizione: e.target.value })} />
            <div className="cfg-hrtur__builder">
              <span className="hrcfg-modal__label">Componi il ciclo</span>
              <div className="cfg-hrtur__palette">
                {draft.turni.map(t => (
                  <button key={t.id} type="button" className="cfg-hrtur__add" onClick={() => setSchema({ ...schema, sequenza: [...schema.sequenza, t.id] })}>
                    <TurnoChip turno={t} small /> {t.nome}
                  </button>
                ))}
                <button type="button" className="cfg-hrtur__add" onClick={() => setSchema({ ...schema, sequenza: [...schema.sequenza, RIPOSO] })}>
                  <TurnoChip small /> Riposo
                </button>
              </div>
              <div className="cfg-hrtur__seq cfg-hrtur__seq--edit">
                {schema.sequenza.length === 0 && <span className="cfg-hrtur__desc">Aggiungi turni e riposi nell’ordine del ciclo.</span>}
                {schema.sequenza.map((id, i) => (
                  <Tooltip key={i} text={`Giorno ${i + 1} — clic per togliere`}>
                    <button type="button" className="cfg-hrtur__seq-btn" onClick={() => setSchema({ ...schema, sequenza: schema.sequenza.filter((_, k) => k !== i) })}>
                      <TurnoChip turno={id === RIPOSO ? undefined : turnoById(id)} />
                    </button>
                  </Tooltip>
                ))}
              </div>
              {schema.sequenza.length > 0 && (
                <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm cfg-hrtur__clear" onClick={() => setSchema({ ...schema, sequenza: [] })}>
                  <i className="fa-light fa-eraser" aria-hidden="true" /> Svuota ciclo
                </button>
              )}
            </div>
          </>
        )}
      </HrFormModal>
    </div>
  )
}
