import React, { useCallback, useMemo, useState } from 'react'
import { InputField, ToggleSwitch, DatePickerField, TextareaField, SelectField, RadioGroup } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import Tooltip from '../../../../../core/components/Tooltip'
import { CfgToolbar, CfgTable, CfgSaveBar, CfgMultiSelect } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  useHrConfigStore, nuovoId, oreTurno, turnoNotturno, RIPOSO, FASCE_ID, GIORNI_SETTIMANA, fabbisognoVuoto,
  oreMedieGiorno, turniCompatibili, schemiCompatibili, oreSettimanaliOrario, giorniLavorativiOrario,
  type TurnoHr, type SchemaTurniHr, type PianificazioneTurniHr, type FabbisognoRepartoHr, type FasciaId, type RepartoHr,
} from '../../../../../store/useHrConfigStore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrFormModal from '../_hr/HrFormModal'
import HrRowActions from '../_hr/HrRowActions'
import { HrColorPicker } from '../_hr/HrColore'
import { DIPENDENTI_HR } from '../../../../../store/useHrGestioneStore'
import { orarioDi } from '../../../../../store/useTurniPersonaleStore'
import './HrTurnistica.sass'

// ─── RISORSE UMANE › TURNISTICA ──────────────────────────────────────────────
//  1) Turni di servizio: sigla, fasce (anche spezzate), pausa, colore e reparti
//     in cui si usano; notturno riconosciuto da solo (almeno 3 ore tra le 22 e le 6,
//     sommando le due fasce del turno spezzato).
//  2) Regole di pianificazione, lette da HR › Turni del personale:
//     - fasce di copertura (Mattina/Pomeriggio/Notte) su cui si misura la
//       copertura del giorno, e ore minime in fascia perché un turno la copra;
//     - riposo minimo fra due turni (11 h) e tolleranza sul monte ore;
//     - fabbisogno per reparto: persone per fascia, minimo fisso o che segue
//       l'occupazione (rinforzo oltre una soglia), giorni senza fabbisogno e
//       turno proposto quando si trascina un dipendente del reparto.
//  3) Schemi di rotazione: la sequenza ciclica di turni e riposi assegnabile
//     al dipendente in Crea anagrafica (es. ciclo continuo M-M-P-P-N-N-R-R).

interface Turnistica { turni: TurnoHr[]; schemi: SchemaTurniHr[]; pianificazione: PianificazioneTurniHr }

const turnoVuoto = (): TurnoHr => ({ id: '', sigla: '', nome: '', inizio: '08:00', fine: '16:00', pausaMin: 30, colore: 1, reparti: [] })
const schemaVuoto = (): SchemaTurniHr => ({ id: '', nome: '', descrizione: '', sequenza: [] })
const countP = (a: PianificazioneTurniHr, b: PianificazioneTurniHr) => {
  const { fabbisogni: fa, ...ra } = a
  const { fabbisogni: fb, ...rb } = b
  return diffCount(fa, fb) + (JSON.stringify(ra) === JSON.stringify(rb) ? 0 : 1)
}
const countT = (a: Turnistica, b: Turnistica) => diffCount(a.turni, b.turni) + diffCount(a.schemi, b.schemi) + countP(a.pianificazione, b.pianificazione)
const completion = (v: Turnistica) => (v.turni.length && v.schemi.length ? 'configured' as const : v.turni.length ? 'partial' as const : 'empty' as const)
const fmtOre = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1).replace('.', ','))
const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
const perFascia = (p: Record<FasciaId, number>, attive: FasciaId[]) =>
  attive.map(f => `${f} ${p[f] ?? 0}`).join(' · ')
const turnoValido = (t: TurnoHr, repId: string) => !t.reparti.length || t.reparti.includes(repId)
const fasce = (t: TurnoHr) => `${t.inizio}–${t.fine}${t.inizio2 && t.fine2 ? ` / ${t.inizio2}–${t.fine2}` : ''}`

const hhmm = (x: string) => { const m = x.match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : 0 }
/** Il turno lavora almeno `minOre` dentro la fascia (fasce e turni possono passare la mezzanotte). */
function coperta(t: TurnoHr, f: { inizio: string; fine: string }, minOre: number) {
  const iv = (a: string, b: string): [number, number] => { const x = hhmm(a), y = hhmm(b); return [x, y <= x ? y + 1440 : y] }
  const turno = [iv(t.inizio, t.fine), ...(t.inizio2 && t.fine2 ? [iv(t.inizio2, t.fine2)] : [])]
  const fa = iv(f.inizio, f.fine)
  const ov = (a: [number, number], b: [number, number]) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]))
  const tot = turno.reduce((s, x) => s + ov(x, fa) + ov(x, [fa[0] - 1440, fa[1] - 1440]) + ov(x, [fa[0] + 1440, fa[1] + 1440]), 0)
  return tot >= minOre * 60
}

function TurnoChip({ turno, small }: { turno?: TurnoHr; small?: boolean }) {
  const cls = `cfg-hrtur__chip${small ? ' cfg-hrtur__chip--sm' : ''}`
  if (!turno) return <span className={`${cls} cfg-hrtur__chip--riposo`}>{RIPOSO}</span>
  return <span className={cls} data-col={turno.colore}>{turno.sigla || '?'}</span>
}

export default function HrTurnistica() {
  const turni = useHrConfigStore(s => s.turni)
  const schemi = useHrConfigStore(s => s.schemi)
  const pianificazione = useHrConfigStore(s => s.pianificazione)
  const orari = useHrConfigStore(s => s.orari)
  const orariATurni = orari.filter(o => o.aTurni)
  const dipendentiCon = (orarioId: string) => DIPENDENTI_HR.filter(d => orarioDi(d.id)?.id === orarioId)
  const reparti = useHrConfigStore(s => s.reparti)
  const setTurnistica = useHrConfigStore(s => s.setTurnistica)
  const confirm = useConfirmStore(s => s.confirm)

  const saved = useMemo(() => ({ turni, schemi, pianificazione }), [turni, schemi, pianificazione])
  const commit = useCallback((v: Turnistica) => setTurnistica(v.turni, v.schemi, v.pianificazione), [setTurnistica])
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-turnistica', saved, countT, commit, completion)

  const [turno, setTurno] = useState<(TurnoHr & { spezzato: boolean }) | null>(null)
  const [schema, setSchema] = useState<SchemaTurniHr | null>(null)
  const [regola, setRegola] = useState<FabbisognoRepartoHr | null>(null)
  const pian = draft.pianificazione
  const setPian = (p: Partial<PianificazioneTurniHr>) => setDraft(d => ({ ...d, pianificazione: { ...d.pianificazione, ...p } }))
  const fasceAttive = pian.fasce.filter(f => f.attiva).map(f => f.id)
  const regolaDi = (r: RepartoHr) => pian.fabbisogni.find(f => f.id === r.id) ?? fabbisognoVuoto(r.id)
  const setFascia = (id: FasciaId, patch: Partial<PianificazioneTurniHr['fasce'][number]>) =>
    setPian({ fasce: pian.fasce.map(f => (f.id === id ? { ...f, ...patch } : f)) })
  const salvaRegola = () => {
    if (!regola) return
    const r = { ...regola, giorniChiusura: [...regola.giorniChiusura].sort((a, b) => a - b) }
    setPian({ fabbisogni: pian.fabbisogni.some(f => f.id === r.id) ? pian.fabbisogni.map(f => (f.id === r.id ? r : f)) : [...pian.fabbisogni, r] })
    setRegola(null)
  }
  const setReg = <K extends keyof FabbisognoRepartoHr>(k: K, v: FabbisognoRepartoHr[K]) => setRegola(f => (f ? { ...f, [k]: v } : f))
  const setPers = (k: 'base' | 'rinforzo', f: FasciaId, n: number) => setRegola(r => (r ? { ...r, [k]: { ...r[k], [f]: Math.max(0, Math.min(20, n || 0)) } } : r))
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
      // Il turno non è più proposto come predefinito: Turni del personale userà il primo valido.
      pianificazione: { ...d.pianificazione, fabbisogni: d.pianificazione.fabbisogni.map(f => (f.turnoPredefinito === t.id ? { ...f, turnoPredefinito: undefined } : f)) },
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

      {/* ── Regole di pianificazione (Turni del personale) ────────────────── */}
      <section className="cfg-hrtur__section">
        <CfgToolbar>
          <div>
            <h3 className="cfg-hrtur__title">Regole di pianificazione</h3>
            <p className="cfg-hrtur__desc">Le usa Turni del personale per misurare la copertura per fascia, controllare ore e riposi e proporre il turno con Sibylla.</p>
          </div>
        </CfgToolbar>
        <div className="cfg-hrtur__params">
          <InputField name="pian-riposo" label="Riposo minimo fra due turni (ore)" type="number" min={0} max={24} step={0.5}
            value={pian.riposoMinOre} onChange={(e) => setPian({ riposoMinOre: Math.max(0, Number(e.target.value) || 0) })}
            hint="11 h per legge (D.Lgs. 66/2003): sotto la soglia il turno viene segnalato." />
          <InputField name="pian-copertura" label="Ore minime per coprire una fascia" type="number" min={1} max={8} step={0.5}
            value={pian.coperturaMinOre} onChange={(e) => setPian({ coperturaMinOre: Math.max(0.5, Number(e.target.value) || 0) })}
            hint="Un turno conta nella fascia se ci lavora almeno queste ore (lo spezzato può coprirne due)." />
          <InputField name="pian-tolleranza" label="Tolleranza sul monte ore (ore)" type="number" min={0} max={20} step={0.5}
            value={pian.tolleranzaSottoOre} onChange={(e) => setPian({ tolleranzaSottoOre: Math.max(0, Number(e.target.value) || 0) })}
            hint="Sotto le ore da contratto meno la tolleranza, il dipendente risulta da completare." />
        </div>

        <span className="hrcfg-modal__label">Fasce di copertura</span>
        <CfgTable
          columns={[
            { key: 'sigla', label: 'Sigla', width: '8%' },
            { key: 'nome', label: 'Fascia', width: '22%' },
            { key: 'inizio', label: 'Inizio', width: '17%' },
            { key: 'fine', label: 'Fine', width: '17%' },
            { key: 'turni', label: 'Turni che la coprono', width: '24%' },
            { key: 'attiva', label: 'Attiva', width: '12%', align: 'right' },
          ]}
        >
          {pian.fasce.map(f => {
            const copre = draft.turni.filter(t => coperta(t, f, pian.coperturaMinOre))
            return (
              <tr key={f.id} className={f.attiva ? undefined : 'cfg-hrtur__row--off'}>
                <td><span className="cfg-hrtur__fascia">{f.id}</span></td>
                <td><InputField name={`fascia-nome-${f.id}`} ariaLabel={`Nome fascia ${f.id}`} value={f.nome} onChange={(e) => setFascia(f.id, { nome: e.target.value })} /></td>
                <td><DatePickerField name={`fascia-in-${f.id}`} type="time" value={f.inizio} onChange={(e) => setFascia(f.id, { inizio: e.target.value })} /></td>
                <td><DatePickerField name={`fascia-out-${f.id}`} type="time" value={f.fine} onChange={(e) => setFascia(f.id, { fine: e.target.value })} /></td>
                <td>
                  <span className="cfg-hrtur__seq">
                    {copre.length ? copre.map(t => <Tooltip key={t.id} text={`${t.nome} ${fasce(t)}`}><span><TurnoChip turno={t} small /></span></Tooltip>) : <span className="cfg-hrtur__desc">Nessun turno</span>}
                  </span>
                </td>
                <td className="cfg-hrtur__actions">
                  <ToggleSwitch checked={f.attiva} onChange={(v) => setFascia(f.id, { attiva: v })} />
                </td>
              </tr>
            )
          })}
        </CfgTable>

        <span className="hrcfg-modal__label">Fabbisogno per reparto</span>
        <CfgTable
          columns={[
            { key: 'reparto', label: 'Reparto', width: '17%' },
            { key: 'calcolo', label: 'Calcolo', width: '15%' },
            { key: 'predef', label: 'Turno proposto', width: '13%' },
            { key: 'base', label: 'Persone per fascia', width: '16%' },
            { key: 'rinforzo', label: 'Rinforzo', width: '18%' },
            { key: 'chiuso', label: 'Senza fabbisogno', width: '13%' },
            { key: 'azioni', label: 'Azioni', width: '8%', align: 'right' },
          ]}
        >
          {reparti.filter(r => r.attivo).map(r => {
            const reg = regolaDi(r)
            const pred = turnoById(reg.turnoPredefinito ?? '')
            const predValido = pred && turnoValido(pred, r.id)
            return (
              <tr key={r.id}>
                <td><TruncatedText text={r.nome} className="cfg-hrtur__name" /></td>
                <td>
                  {reg.modalita === 'occupazione'
                    ? <span className="cfg-hrtur__tag"><i className="fa-solid fa-chart-line" aria-hidden="true" /> Segue l'occupazione</span>
                    : <span className="cfg-hrtur__tag cfg-hrtur__tag--fisso"><i className="fa-solid fa-equals" aria-hidden="true" /> Minimo fisso</span>}
                </td>
                <td>
                  {predValido
                    ? <Tooltip text={`${pred!.nome} ${fasce(pred!)}`}><span className="cfg-hrtur__pred"><TurnoChip turno={pred} small /><TruncatedText text={pred!.nome} /></span></Tooltip>
                    : <span className="cfg-hrtur__desc">Primo turno valido</span>}
                </td>
                <td><TruncatedText text={perFascia(reg.base, fasceAttive)} /></td>
                <td>
                  <TruncatedText text={reg.modalita === 'occupazione' && FASCE_ID.some(f => reg.rinforzo[f])
                    ? `da ${reg.sogliaOccupazione}%: ${fasceAttive.filter(f => reg.rinforzo[f]).map(f => `+${reg.rinforzo[f]} ${f}`).join(', ')}`
                    : '—'} />
                </td>
                <td><TruncatedText text={reg.giorniChiusura.length ? reg.giorniChiusura.map(g => GIORNI_SETTIMANA[g]).join(', ') : 'Nessuno'} /></td>
                <td className="cfg-hrtur__actions">
                  <Tooltip text="Modifica il fabbisogno">
                    <button type="button" className="sib-btn sib-btn--icon cfg-hrtur__edit" aria-label={`Modifica il fabbisogno di ${r.nome}`}
                      onClick={() => setRegola({ ...reg, base: { ...reg.base }, rinforzo: { ...reg.rinforzo }, giorniChiusura: [...reg.giorniChiusura] })}>
                      <i className="fa-solid fa-pen" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </td>
              </tr>
            )
          })}
        </CfgTable>

        <span className="hrcfg-modal__label">Coerenza con gli orari di lavoro</span>
        <p className="cfg-hrtur__desc">Gli orari «a turni» (Configurazione HR › Orari di lavoro) fissano ore e giorni: qui si vede se turni e schemi bastano a comporli. Calcolato sulla bozza di questa scheda.</p>
        <CfgTable
          columns={[
            { key: 'orario', label: 'Orario a turni', width: '24%' },
            { key: 'media', label: 'Ore al giorno', width: '11%', align: 'right' },
            { key: 'turni', label: 'Turni compatibili', width: '20%' },
            { key: 'schemi', label: 'Schemi compatibili', width: '25%' },
            { key: 'dip', label: 'Dipendenti', width: '20%' },
          ]}
        >
          {orariATurni.map(o => {
            const tc = turniCompatibili(o, draft.turni)
            const sc = schemiCompatibili(o, draft.schemi, draft.turni)
            const dd = dipendentiCon(o.id)
            return (
              <tr key={o.id}>
                <td>
                  <TruncatedText text={o.nome} className="cfg-hrtur__name" />
                </td>
                <td className="cfg-hrtur__num">{fmtOre(Math.round(oreMedieGiorno(o) * 10) / 10)} h</td>
                <td>
                  {tc.length
                    ? <span className="cfg-hrtur__seq">{tc.map(t => <Tooltip key={t.id} text={`${t.nome} · ${fmtOre(oreTurno(t))} h`}><span><TurnoChip turno={t} small /></span></Tooltip>)}</span>
                    : (
                      <Tooltip text={`Nessun turno da circa ${fmtOre(Math.round(oreMedieGiorno(o) * 10) / 10)} h: con ${giorniLavorativiOrario(o)} giorni il monte di ${fmtOre(oreSettimanaliOrario(o))} h non si raggiunge con i turni esistenti. Crea un turno di questa durata o cambia l'orario.`}>
                        <span className="cfg-hrtur__warn"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Nessuno</span>
                      </Tooltip>
                    )}
                </td>
                <td className="cfg-hrtur__cell-trunc"><TruncatedText text={sc.length ? sc.map(x => x.nome).join(', ') : '—'} className="cfg-hrtur__trunc" /></td>
                <td className="cfg-hrtur__cell-trunc"><TruncatedText text={dd.length ? dd.map(d => `${d.nome.charAt(0)}. ${d.cognome}`).join(', ') : 'Nessuno'} full={dd.map(d => `${d.nome} ${d.cognome}`).join(', ') || 'Nessun dipendente'} className="cfg-hrtur__trunc" /></td>
              </tr>
            )
          })}
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
                    {(() => {
                      const adatti = orariATurni.filter(o => schemiCompatibili(o, [s], draft.turni).length)
                      return <span className="cfg-hrtur__adatto">{adatti.length ? <>Adatto a: {adatti.map(o => o.nome).join(', ')}</> : 'Nessun orario a turni con questo monte ore'}</span>
                    })()}
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
              genere="m"
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
      {/* ── Modale fabbisogno del reparto ─────────────────────────────────── */}
      <HrFormModal
        open={regola !== null}
        size="lg"
        title={`Fabbisogno · ${reparti.find(r => r.id === regola?.id)?.nome ?? ''}`}
        onClose={() => setRegola(null)}
        onSubmit={salvaRegola}
        submitLabel="Applica"
        canSubmit
      >
        {regola && (() => {
          const validi = draft.turni.filter(t => turnoValido(t, regola.id))
          const esempio = (occ: number) => fasceAttive.map(f => `${f} ${(regola.base[f] ?? 0) + (regola.modalita === 'occupazione' && occ >= regola.sogliaOccupazione ? regola.rinforzo[f] ?? 0 : 0)}`).join(' · ')
          return (
            <>
              <RadioGroup name="reg-modalita" label="Come si calcola" value={regola.modalita}
                onChange={(v) => setReg('modalita', v as FabbisognoRepartoHr['modalita'])}
                options={[
                  { value: 'occupazione', label: 'Segue l’occupazione (housekeeping, ricevimento, ristorazione)' },
                  { value: 'fisso', label: 'Minimo fisso (manutenzione, amministrazione, magazzino)' },
                ]} />
              <SelectField name="reg-predef" label="Turno proposto quando si trascina un dipendente del reparto"
                value={regola.turnoPredefinito && validi.some(t => t.id === regola.turnoPredefinito) ? regola.turnoPredefinito : ''}
                onChange={(e) => setReg('turnoPredefinito', e.target.value || undefined)}
                options={[{ value: '', label: validi.length ? `Primo valido (${validi[0].nome})` : 'Nessun turno valido per il reparto' }, ...validi.map(t => ({ value: t.id, label: `${t.sigla} · ${t.nome} ${fasce(t)}` }))]} />
              <div>
                <span className="hrcfg-modal__label">Persone sempre necessarie per fascia</span>
                <div className="cfg-hrtur__pers">
                  {pian.fasce.filter(f => f.attiva).map(f => (
                    <InputField key={f.id} name={`reg-base-${f.id}`} label={`${f.id} · ${f.nome}`} type="number" min={0} max={20}
                      value={regola.base[f.id] ?? 0} onChange={(e) => setPers('base', f.id, Number(e.target.value))} />
                  ))}
                </div>
              </div>
              {regola.modalita === 'occupazione' && (
                <div>
                  <span className="hrcfg-modal__label">Rinforzo quando l'occupazione è alta</span>
                  <div className="cfg-hrtur__pers">
                    <InputField name="reg-soglia" label="Da occupazione (%)" type="number" min={0} max={100} step={5}
                      value={regola.sogliaOccupazione} onChange={(e) => setReg('sogliaOccupazione', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                    {pian.fasce.filter(f => f.attiva).map(f => (
                      <InputField key={f.id} name={`reg-rinf-${f.id}`} label={`+ persone ${f.id}`} type="number" min={0} max={20}
                        value={regola.rinforzo[f.id] ?? 0} onChange={(e) => setPers('rinforzo', f.id, Number(e.target.value))} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="hrcfg-modal__label">Giorni senza fabbisogno (reparto chiuso)</span>
                <div className="cfg-hrtur__giorni">
                  {GIORNI_SETTIMANA.map((g, i) => {
                    const on = regola.giorniChiusura.includes(i)
                    return (
                      <Tooltip key={g} text={`${GIORNI_LUNGHI[i]}: ${on ? 'chiuso, nessuna copertura richiesta' : 'aperto'}`}>
                        <button type="button" aria-pressed={on} className={`cfg-hrtur__giorno${on ? ' cfg-hrtur__giorno--on' : ''}`}
                          onClick={() => setReg('giorniChiusura', on ? regola.giorniChiusura.filter(x => x !== i) : [...regola.giorniChiusura, i])}>
                          {g}
                        </button>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
              <p className="hrcfg-modal__hint">
                Copertura richiesta nei giorni aperti: <strong>{esempio(0)}</strong>
                {regola.modalita === 'occupazione' && <> · con occupazione da {regola.sogliaOccupazione}%: <strong>{esempio(100)}</strong></>}
              </p>
            </>
          )
        })()}
      </HrFormModal>
    </div>
  )
}
