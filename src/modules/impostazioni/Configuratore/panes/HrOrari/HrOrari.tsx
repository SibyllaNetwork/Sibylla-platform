import React, { useCallback, useState } from 'react'
import { InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgSaveBar, CfgEmpty } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  useHrConfigStore, nuovoId, oreSettimanaliOrario, giorniLavorativiOrario, minutiGiorno,
  GIORNI_SETTIMANA, REGIMI_ORARIO, type OrarioHr, type RegimeOrario,
} from '../../../../../store/useHrConfigStore'
import { useHrDraft, diffCount } from '../_hr/useHrDraft'
import HrRowActions from '../_hr/HrRowActions'
import SettimanaOrario, { MODELLI } from './SettimanaOrario'
import './HrOrari.sass'

// ─── RISORSE UMANE › ORARI DI LAVORO ─────────────────────────────────────────
//  Master-detail: a sinistra gli orari con l'anteprima della settimana, a
//  destra l'orario selezionato SEMPRE aperto sull'editor settimanale (giorno
//  per giorno: fasce «dalle/alle» scritte a mano, giornata spezzata, pausa, e
//  la barra grafica su cui trascinare). Oppure «a turni»: conta il monte ore,
//  la distribuzione la fa la Turnistica. Dalle ore settimanali Crea anagrafica
//  ricava la percentuale di part time rispetto al CCNL.

const nuovo = (): OrarioHr => ({
  id: nuovoId('ora'), nome: 'Nuovo orario', regime: 'full-time', aTurni: false, oreSettimanali: 40, giorniSettimana: 5, flessibilitaMin: 10,
  giorni: MODELLI[0].giorni(),
})
const completion = (v: OrarioHr[]) => (v.length ? 'configured' as const : 'empty' as const)
const fmtOre = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(2).replace('.', ',').replace(/0$/, ''))

/** Prima del salvataggio: fasce non valide scartate, monte ore e giorni ricalcolati. */
const normalizza = (o: OrarioHr): OrarioHr => {
  const giorni = o.giorni.map(g => ({ ...g, fasce: g.fasce.filter(f => f.fine > f.inizio) }))
  const n = { ...o, nome: o.nome.trim() || 'Orario senza nome', giorni }
  return n.aTurni ? n : { ...n, oreSettimanali: oreSettimanaliOrario(n), giorniSettimana: giorniLavorativiOrario(n) }
}

/** Anteprima della settimana: una barretta per giorno, alta quanto le ore. */
function MiniSettimana({ o }: { o: OrarioHr }) {
  return (
    <span className="cfg-hrora__mini" aria-hidden="true">
      {GIORNI_SETTIMANA.map((g, i) => {
        const ore = o.aTurni ? (i < o.giorniSettimana ? o.oreSettimanali / Math.max(1, o.giorniSettimana) : 0) : minutiGiorno(o.giorni[i] ?? { attivo: false, fasce: [], pausaMin: 0 }) / 60
        return (
          <span key={g} className="cfg-hrora__mini-day">
            <span className={`cfg-hrora__mini-bar${o.aTurni ? ' is-turni' : ''}`} style={{ ['--h' as any]: `${Math.min(100, (ore / 10) * 100)}%` }} />
            <span className="cfg-hrora__mini-lbl">{g[0]}</span>
          </span>
        )
      })}
    </span>
  )
}

export default function HrOrari() {
  const saved    = useHrConfigStore(s => s.orari)
  const setOrari = useHrConfigStore(s => s.setOrari)
  const confirm  = useConfirmStore(s => s.confirm)
  const commit = useCallback((v: OrarioHr[]) => setOrari(v.map(normalizza)), [setOrari])
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-orari', saved, diffCount, commit, completion)

  const [selId, setSelId] = useState<string | null>(saved[0]?.id ?? null)
  const sel = draft.find(o => o.id === selId) ?? draft[0]
  const set = <K extends keyof OrarioHr>(k: K, v: OrarioHr[K]) =>
    sel && setDraft(d => d.map(o => (o.id === sel.id ? { ...o, [k]: v } : o)))

  const aggiungi = () => { const o = nuovo(); setDraft(d => [...d, o]); setSelId(o.id) }
  const duplica = (o: OrarioHr) => { const c = { ...structuredClone(o), id: nuovoId('ora'), nome: `${o.nome} (copia)` }; setDraft(d => [...d, c]); setSelId(c.id) }
  const elimina = async (o: OrarioHr) => {
    const ok = await confirm({ title: 'Elimina orario', message: `Eliminare l'orario «${o.nome}»?`, confirmLabel: 'Elimina', danger: true })
    if (!ok) return
    setDraft(d => d.filter(x => x.id !== o.id))
    if (selId === o.id) setSelId(draft.find(x => x.id !== o.id)?.id ?? null)
  }

  return (
    <div className="cfg-hrora cfg-hr-pane">
      <div className="cfg-hrora__layout">
        {/* ── Elenco orari ─────────────────────────────────────────────────── */}
        <aside className="cfg-hrora__list">
          {draft.map(o => (
            <button key={o.id} type="button" className={`cfg-hrora__item${sel?.id === o.id ? ' is-active' : ''}`} onClick={() => setSelId(o.id)}>
              <span className="cfg-hrora__item-text">
                <TruncatedText text={o.nome} className="cfg-hrora__item-name" />
                <span className="cfg-hrora__item-meta">
                  {fmtOre(oreSettimanaliOrario(o))} h · {giorniLavorativiOrario(o)} giorni{o.aTurni ? ' · a turni' : ''}
                </span>
              </span>
              <MiniSettimana o={o} />
            </button>
          ))}
          <button type="button" className="sib-btn sib-btn--secondary cfg-hrora__add" onClick={aggiungi}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuovo orario
          </button>
        </aside>

        {/* ── Orario selezionato ───────────────────────────────────────────── */}
        <section className="cfg-hrora__detail">
          {!sel ? (
            <CfgEmpty icon="business-time" title="Nessun orario" subtitle="Crea il primo orario di lavoro da assegnare ai dipendenti." />
          ) : (
            <>
              <header className="cfg-hrora__head">
                <div className="cfg-hrora__head-text">
                  <TruncatedText text={sel.nome || 'Orario senza nome'} className="cfg-hrora__head-name" />
                  <span className="cfg-hrora__head-meta">
                    {fmtOre(oreSettimanaliOrario(sel))} ore settimanali su {giorniLavorativiOrario(sel)} giorni
                  </span>
                </div>
                <HrRowActions nome={sel.nome} onEdit={() => (document.querySelector('[name="ora-nome"]') as HTMLInputElement | null)?.focus()} onDuplicate={() => duplica(sel)} onDelete={() => elimina(sel)} />
              </header>

              <div className="cfg-hrora__grid">
                <InputField name="ora-nome" label="Nome orario" required value={sel.nome} onChange={(e) => set('nome', e.target.value)}
                  placeholder="Es. Full time 40 h · 5 giorni" className="cfg-hrora__span2" />
                <SelectField name="ora-regime" label="Regime" value={sel.regime} onChange={(e) => set('regime', e.target.value as RegimeOrario)} options={REGIMI_ORARIO} />
                <InputField name="ora-flex" label="Flessibilità (minuti)" type="number" min={0} value={sel.flessibilitaMin}
                  onChange={(e) => set('flessibilitaMin', Number(e.target.value) || 0)} />
              </div>

              <ToggleSwitch label="Orario a turni" description="Le fasce dei singoli giorni le assegna la Turnistica: qui si fissa solo il monte ore."
                checked={sel.aTurni} onChange={(v) => set('aTurni', v)} />

              {sel.aTurni ? (
                <div className="cfg-hrora__grid">
                  <InputField name="ora-ore" label="Ore settimanali" type="number" min={1} max={48} value={sel.oreSettimanali}
                    onChange={(e) => set('oreSettimanali', Number(e.target.value) || 0)} />
                  <InputField name="ora-gg" label="Giorni di servizio a settimana" type="number" min={1} max={7} value={sel.giorniSettimana}
                    onChange={(e) => set('giorniSettimana', Math.min(7, Number(e.target.value) || 0))} />
                </div>
              ) : (
                <SettimanaOrario key={sel.id} value={sel.giorni} onChange={(giorni) => set('giorni', giorni)} />
              )}
            </>
          )}
        </section>
      </div>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Orari di lavoro salvati" />
    </div>
  )
}
