import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, SearchField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import { useConfirmStore } from '../../../store/useConfirmStore'
import {
  useObiettiviStore, type Obiettivo,
  tuttiSotto, targetTotale, vendutoTotale, premioTotale, premioSbloccato, avanzamentoPct,
} from '../../../store/useObiettiviStore'
import './MonitoraggioPerformance.sass'

/**
 * Monitoraggio performance — vista di controllo/analisi degli obiettivi del
 * Premio performance. Legge lo stesso `useObiettiviStore` della pagina
 * "Assegna obiettivo": ogni obiettivo è una "pista" i cui traguardi sono i
 * sottoperiodi reali (premio a valore assoluto in €), con avanzamento e
 * sblocco premi aggiornati in real-time.
 */

type Stato = 'raggiunto' | 'in-linea' | 'a-rischio'
const STATO_LABEL: Record<Stato, string> = { 'raggiunto': 'Raggiunto', 'in-linea': 'In linea', 'a-rischio': 'A rischio' }
const statoOf = (o: Obiettivo): Stato => {
  if (o.stato === 'concluso') return 'raggiunto'
  const pct = avanzamentoPct(o)
  return pct >= 100 ? 'raggiunto' : pct >= 50 ? 'in-linea' : 'a-rischio'
}

const eur = (n: number) => '€ ' + Math.round(n || 0).toLocaleString('it-IT')
const eurShort = (n: number) => '€' + Math.round(n || 0).toLocaleString('it-IT')
const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const REPARTO_ICON: Record<string, string> = {
  'Commerciale': 'fa-hand-holding-dollar',
  'Front office': 'fa-bell-concierge',
  'F&B': 'fa-martini-glass',
  'Housekeeping': 'fa-broom',
  'Manutenzione': 'fa-screwdriver-wrench',
  'Amministrazione': 'fa-calculator',
  'Marketing': 'fa-bullhorn',
  'Direzione': 'fa-user-tie',
}

// nodi della pista = sottoperiodi, posizionati per target cumulato
function pistaNodi(o: Obiettivo) {
  const subs = tuttiSotto(o)
  const total = targetTotale(o) || 1
  let cum = 0
  return subs.map((s) => {
    cum += s.target
    return {
      id: s.id,
      nome: s.nome,
      premio: s.premio,
      pos: Math.min(100, Math.round((cum / total) * 100)),
      done: s.target > 0 && s.venduto >= s.target,
    }
  })
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function MonitoraggioPerformance(_props: { navigate?: (p: string) => void } = {}) {
  const obiettivi = useObiettiviStore((s) => s.obiettivi)
  const avanza = useObiettiviStore((s) => s.avanzaProgresso)

  const [stato, setStato] = useState<'in-corso' | 'concluso' | 'tutti'>('in-corso')
  const [reparto, setReparto] = useState<'Tutti' | string>('Tutti')
  const [tipologia, setTipologia] = useState<'tutte' | 'reparto' | 'individuale'>('tutte')
  const [search, setSearch] = useState('')
  const [live, setLive] = useState(true)
  const [detail, setDetail] = useState<Obiettivo | null>(null)

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => avanza(), 1800)
    return () => clearInterval(id)
  }, [live, avanza])

  const repartoOpts = useMemo(
    () => Array.from(new Set(obiettivi.map((o) => o.reparto).filter(Boolean))).sort() as string[],
    [obiettivi],
  )

  const filtered = useMemo(() => {
    let out = obiettivi.filter((o) => (stato === 'tutti' ? true : o.stato === stato))
    if (reparto !== 'Tutti') out = out.filter((o) => o.reparto === reparto)
    if (tipologia !== 'tutte') out = out.filter((o) => o.tipologia === tipologia)
    const q = search.toLowerCase().trim()
    if (q) out = out.filter((o) => o.nome.toLowerCase().includes(q) || (o.assegnatario ?? '').toLowerCase().includes(q) || (o.reparto ?? '').toLowerCase().includes(q))
    return out.sort((a, b) => avanzamentoPct(b) - avanzamentoPct(a))
  }, [obiettivi, stato, reparto, tipologia, search])

  const mediaAvanz = filtered.length ? Math.round(filtered.reduce((s, o) => s + avanzamentoPct(o), 0) / filtered.length) : 0
  const premiMaturati = filtered.reduce((s, o) => s + premioSbloccato(o), 0)
  const premiTotali = filtered.reduce((s, o) => s + premioTotale(o), 0)

  return (
    <div className="mon-perf">
      <PageHead
        title="Monitoraggio performance"
        subtitle="Controllo e analisi dei risultati e delle performance del personale, con premi maturati in tempo reale"
        actions={
          <button type="button" className={'mon-perf__live' + (live ? ' is-live' : '')} onClick={() => setLive((v) => !v)}>
            <span className="mon-perf__live-dot" />
            {live ? 'LIVE · in aggiornamento' : 'In pausa'}
            <i className={`fa-solid ${live ? 'fa-pause' : 'fa-play'}`} />
          </button>
        }
      />

      {/* Toolbar */}
      <div className="mon-perf__bar">
        <div className="mon-perf__field">
          <SelectField name="stato" label="Stato" className="mon-perf__select" value={stato} onChange={(e) => setStato(e.target.value as any)}
            options={[{ value: 'in-corso', label: 'In corso' }, { value: 'concluso', label: 'Conclusi' }, { value: 'tutti', label: 'Tutti' }]} />
        </div>
        <div className="mon-perf__field">
          <SelectField name="tipologia" label="Tipologia" className="mon-perf__select" value={tipologia} onChange={(e) => setTipologia(e.target.value as any)}
            options={[{ value: 'tutte', label: 'Tutte' }, { value: 'reparto', label: 'Di reparto' }, { value: 'individuale', label: 'Individuale' }]} />
        </div>
        <div className="mon-perf__field">
          <SelectField name="reparto" label="Reparto" className="mon-perf__select" value={reparto} onChange={(e) => setReparto(e.target.value)}
            options={[{ value: 'Tutti', label: 'Tutti' }, ...repartoOpts.map((r) => ({ value: r, label: r }))]} />
        </div>
        <div className="mon-perf__field">
          <label>Cerca</label>
          <SearchField className="mon-perf__search" name="search" placeholder="Obiettivo, persona o reparto" value={search}
            onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
      </div>

      {/* Board */}
      <div className="mon-perf__board">
        <div className="mon-perf__board-scroll">
          <div className="mon-perf__row mon-perf__row--head">
            <div className="mon-perf__c-name">Obiettivo</div>
            <div className="mon-perf__c-rep">Reparto</div>
            <div className="mon-perf__c-track">Percorso premi</div>
            <div className="mon-perf__c-kpi">Premio maturato</div>
          </div>

          {filtered.length === 0 ? (
            <div className="mon-perf__empty">Nessun obiettivo per i filtri selezionati.</div>
          ) : filtered.map((o) => {
            const nodi = pistaNodi(o)
            const runner = avanzamentoPct(o)
            const st = statoOf(o)
            const raggiunti = nodi.filter((n) => n.done).length
            const isInd = o.tipologia === 'individuale'
            return (
              <button key={o.id} type="button" className="mon-perf__row mon-perf__row--emp" onClick={() => setDetail(o)}>
                <div className="mon-perf__c-name">
                  {isInd
                    ? <img className="mon-perf__avatar" src={avatarUrl(o.assegnatario || o.nome)} alt="" />
                    : <span className="mon-perf__icon-circle"><i className={`fa-light ${REPARTO_ICON[o.reparto ?? ''] ?? 'fa-users'}`} /></span>}
                  <span className="mon-perf__user-wrap">
                    <span className="mon-perf__user-name">{o.nome}</span>
                    <span className="mon-perf__user-chall">{isInd ? o.assegnatario : `Reparto ${o.reparto}`}</span>
                  </span>
                </div>
                <div className="mon-perf__c-rep">
                  <Tooltip text={o.reparto}><i className={`fa-light ${REPARTO_ICON[o.reparto ?? ''] ?? 'fa-user'} mon-perf__rep-ico`} /></Tooltip>
                </div>
                <div className="mon-perf__c-track">
                  {/* premi lungo il percorso */}
                  <div className="mon-perf__premi">
                    {nodi.map((nd) => (
                      <div key={nd.id} className="mon-perf__premio" style={{ '--pos': nd.pos } as React.CSSProperties}>
                        <Tooltip text={`${nd.nome} — premio ${eur(nd.premio)}`}>
                          <span className={'mon-perf__premio-eur' + (nd.done ? ' is-on' : '')}>{eurShort(nd.premio)}</span>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                  {/* pista */}
                  <div className="mon-perf__track">
                    <div className="mon-perf__track-line" />
                    <div className="mon-perf__track-prog" style={{ '--pct': runner } as React.CSSProperties} />
                    {nodi.map((nd) => (
                      <div key={nd.id} className={'mon-perf__node' + (nd.done ? ' is-on' : '')} style={{ '--pos': nd.pos } as React.CSSProperties}>
                        {nd.done ? <i className="fa-solid fa-trophy" /> : ''}
                      </div>
                    ))}
                    <div className="mon-perf__runner" style={{ '--pos': runner } as React.CSSProperties} title={`${runner}% · ${raggiunti}/${nodi.length} traguardi`}>
                      <i className="fa-solid fa-person-running" />
                    </div>
                  </div>
                </div>
                <div className="mon-perf__c-kpi">
                  <span className={`mon-perf__stato-badge mon-perf__stato-badge--${st}`}>{STATO_LABEL[st]}</span>
                  <span className="mon-perf__kpi-prize">{eur(premioSbloccato(o))} <em>/ {eur(premioTotale(o))}</em></span>
                  <span className="mon-perf__kpi-sub">{raggiunti}/{nodi.length} traguardi · {runner}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mon-perf__summary">
        <strong>{filtered.length}</strong> obiettivi monitorati · avanzamento medio <strong>{mediaAvanz}%</strong> · premi maturati <strong>{eur(premiMaturati)}</strong> su <strong>{eur(premiTotali)}</strong>
      </div>

      <DettaglioObiettivoModal obiettivo={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

// ─── MODAL: dettaglio obiettivo ───────────────────────────────────────────────
function DettaglioObiettivoModal({ obiettivo, onClose }: { obiettivo: Obiettivo | null; onClose: () => void }) {
  const removeObiettivo = useObiettiviStore((s) => s.removeObiettivo)
  const confirm = useConfirmStore((s) => s.confirm)

  // Unica via per eliminare un obiettivo: prima viveva nella vista "In corso"
  // della pagina Premio performance, rimossa perché duplicava questa.
  const elimina = async () => {
    if (!obiettivo) return
    if (await confirm({ message: `Eliminare l'obiettivo «${obiettivo.nome}»?`, danger: true })) {
      removeObiettivo(obiettivo.id)
      onClose()
    }
  }

  return (
    <Modal open={!!obiettivo} onClose={onClose} title="Dettaglio obiettivo" size="lg">
      {obiettivo && (() => {
        const o = obiettivo
        const st = statoOf(o)
        const isInd = o.tipologia === 'individuale'
        const runner = avanzamentoPct(o)
        return (
          <div className="mon-perf__detail">
            <div className="mon-perf__detail-head">
              {isInd
                ? <img className="mon-perf__avatar mon-perf__avatar--lg" src={avatarUrl(o.assegnatario || o.nome)} alt="" />
                : <span className="mon-perf__icon-circle mon-perf__icon-circle--lg"><i className={`fa-light ${REPARTO_ICON[o.reparto ?? ''] ?? 'fa-users'}`} /></span>}
              <div>
                <div className="mon-perf__detail-name">{o.nome}</div>
                <div className="mon-perf__detail-sub">{isInd ? `${o.assegnatario} · ` : ''}Reparto {o.reparto} · {o.report}</div>
                <div className="mon-perf__detail-chall"><i className="fa-solid fa-tags" /> {o.segmenti.join(' · ')}</div>
              </div>
              <span className={`mon-perf__stato mon-perf__stato--${st} mon-perf__detail-stato`}>{STATO_LABEL[st]}</span>
            </div>

            <div className="mon-perf__detail-obj">
              <div className="mon-perf__detail-objname">
                Venduto <strong>{eur(vendutoTotale(o))}</strong> su {eur(targetTotale(o))} — <strong>{runner}%</strong>
                · premio maturato <strong>{eur(premioSbloccato(o))}</strong> / {eur(premioTotale(o))}
              </div>
              <div className="mon-perf__bar-lg"><span className="mon-perf__bar-lg-fill" style={{ '--pct': runner } as React.CSSProperties} /></div>
            </div>

            <div>
              <div className="mon-perf__detail-label">Traguardi e premi</div>
              {o.periodi.map((p) => (
                <div key={p.id} className="mon-perf__det-per">
                  <div className="mon-perf__det-per-name">{p.nome}</div>
                  <ul className="mon-perf__tr-full">
                    {p.sottoperiodi.map((s) => {
                      const spct = s.target > 0 ? Math.min(100, Math.round((s.venduto / s.target) * 100)) : 0
                      const done = s.target > 0 && s.venduto >= s.target
                      return (
                        <li key={s.id} className={done ? 'is-ok' : ''}>
                          <span className="mon-perf__tr-node" style={done ? { '--node': 'var(--color-success)' } as React.CSSProperties : undefined}>
                            {done ? <i className="fa-solid fa-trophy" /> : <i className="fa-solid fa-hourglass-half" />}
                          </span>
                          <span className="mon-perf__tr-premio">
                            <strong>{s.nome}</strong>
                            <span className="mon-perf__tr-meta">{eur(s.venduto)} / {eur(s.target)} · {spct}%{s.al ? ` · scad. ${fmtDate(s.al)}` : ''}</span>
                          </span>
                          <span className="mon-perf__tr-eur">{eur(s.premio)}</span>
                          {done && <span className="mon-perf__tr-badge">Sbloccato</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mon-perf__detail-actions">
              <button type="button" className="sib-btn sib-btn--danger sib-btn--sm" onClick={elimina}>
                <i className="fa-solid fa-trash" /> Elimina obiettivo
              </button>
            </div>
          </div>
        )
      })()}
    </Modal>
  )
}
