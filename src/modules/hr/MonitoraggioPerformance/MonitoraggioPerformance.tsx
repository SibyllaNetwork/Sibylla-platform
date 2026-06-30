import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip as RTooltip,
} from 'recharts'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, SearchField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import './MonitoraggioPerformance.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Stato = 'raggiunto' | 'in-linea' | 'a-rischio'

interface PerfRow {
  id: number
  nome: string
  reparto: string
  struttura: string
  challenge: string   // la challenge/obiettivo a cui partecipa
  obiettivo: string   // KPI specifico del dipendente
  anno: number
  avanzamento: number // 0-100 → posizione del runner sulla pista
}

// ─── COSTANTI ─────────────────────────────────────────────────────────────────

const REPARTI = ['Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Amministrazione', 'Marketing', 'Direzione']
const STRUTTURE = ['Hotel Tutorial', "Grim's Hotel", 'Hotel Archimede']
const ANNI = [2026, 2025, 2024]
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const REPARTO_ICON: Record<string, string> = {
  'Front office': 'fa-bell-concierge',
  'F&B': 'fa-martini-glass',
  'Housekeeping': 'fa-broom',
  'Manutenzione': 'fa-screwdriver-wrench',
  'Amministrazione': 'fa-calculator',
  'Marketing': 'fa-bullhorn',
  'Direzione': 'fa-user-tie',
}

// le 5 tappe della pista; node 1 = avvio, 2-4 premi crescenti, 5 = traguardo finale
const NODES = [
  { n: 1, soglia: 0,   premio: 'Avvio obiettivo',    trofei: 0, finale: false, color: '#E2574C' },
  { n: 2, soglia: 25,  premio: 'Buono Amazon 50€',   trofei: 1, finale: false, color: '#E0922A' },
  { n: 3, soglia: 50,  premio: 'Bonus 2 giorni ferie', trofei: 2, finale: false, color: '#2BB0A6' },
  { n: 4, soglia: 75,  premio: 'Cena per 2 · Weekend SPA', trofei: 3, finale: false, color: '#5C9CD4' },
  { n: 5, soglia: 100, premio: 'Premio finale performance', trofei: 0, finale: true, color: '#204769' },
]

const STATO_LABEL: Record<Stato, string> = { 'raggiunto': 'Raggiunto', 'in-linea': 'In linea', 'a-rischio': 'A rischio' }
const statoOf = (av: number): Stato => (av >= 100 ? 'raggiunto' : av >= 50 ? 'in-linea' : 'a-rischio')
const reachedCount = (av: number) => NODES.filter((n) => n.soglia <= av).length
const premioMaturato = (av: number) => { const g = NODES.filter((n) => n.soglia <= av && n.n >= 2); return g.length ? g[g.length - 1].premio : null }
const trend = (av: number) => MESI.map((m, i) => ({ mese: m, valore: Math.round(Math.min(av, (av * (i + 1)) / 9)) }))

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK: PerfRow[] = [
  { id: 1, nome: 'Piero Aragona',   reparto: 'Manutenzione',    struttura: 'Hotel Tutorial',  challenge: 'Efficienza operativa 2026', obiettivo: 'Interventi risolti entro SLA',        anno: 2026, avanzamento: 105 },
  { id: 2, nome: 'Anna Verdi',      reparto: 'Amministrazione', struttura: "Grim's Hotel",    challenge: 'Premio produzione 2026',    obiettivo: 'Chiusura contabile mensile',          anno: 2026, avanzamento: 96 },
  { id: 3, nome: 'Andrea Grimaudo', reparto: 'Front office',    struttura: 'Hotel Tutorial',  challenge: 'Eccellenza ospitalità 2026',obiettivo: 'Punteggio recensioni reception',      anno: 2026, avanzamento: 88 },
  { id: 4, nome: 'Marco Campo',     reparto: 'Housekeeping',    struttura: "Grim's Hotel",    challenge: 'Efficienza operativa 2026', obiettivo: 'Camere pronte entro le 14:00',        anno: 2026, avanzamento: 72 },
  { id: 5, nome: 'Paolo Greco',     reparto: 'Manutenzione',    struttura: 'Hotel Archimede', challenge: 'Efficienza operativa 2026', obiettivo: 'Manutenzioni preventive completate',   anno: 2026, avanzamento: 63 },
  { id: 6, nome: 'Sara Conti',      reparto: 'F&B',             struttura: 'Hotel Tutorial',  challenge: 'Eccellenza ospitalità 2026',obiettivo: 'Upselling servizi ristorante',        anno: 2026, avanzamento: 54 },
  { id: 7, nome: 'Luca Ferri',      reparto: 'Front office',    struttura: 'Hotel Archimede', challenge: 'Eccellenza ospitalità 2026',obiettivo: 'Check-in time medio',                  anno: 2026, avanzamento: 41 },
  { id: 8, nome: 'Giulia Neri',     reparto: 'Marketing',       struttura: 'Hotel Tutorial',  challenge: 'Premio produzione 2026',    obiettivo: 'Engagement campagne social',          anno: 2026, avanzamento: 28 },
  { id: 9, nome: 'Dino Tacchini',   reparto: 'Housekeeping',    struttura: 'Hotel Tutorial',  challenge: 'Premio produzione 2025',    obiettivo: 'Controllo qualità pulizie',           anno: 2025, avanzamento: 100 },
]

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function MonitoraggioPerformance(_props: { navigate?: (p: string) => void } = {}) {
  const [rows] = useState<PerfRow[]>(MOCK)
  const [anno, setAnno] = useState(2026)
  const [challenge, setChallenge] = useState<'Tutte' | string>('Tutte')
  const [reparto, setReparto] = useState<'Tutti' | string>('Tutti')
  const [struttura, setStruttura] = useState<'Tutte' | string>('Tutte')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<PerfRow | null>(null)

  // challenge in corso = obiettivi attivi per l'anno selezionato
  const challengeOpts = useMemo(
    () => Array.from(new Set(rows.filter((r) => r.anno === anno).map((r) => r.challenge))).sort(),
    [rows, anno],
  )

  const filtered = useMemo(() => {
    let out = rows.filter((r) => r.anno === anno)
    if (challenge !== 'Tutte') out = out.filter((r) => r.challenge === challenge)
    if (reparto !== 'Tutti') out = out.filter((r) => r.reparto === reparto)
    if (struttura !== 'Tutte') out = out.filter((r) => r.struttura === struttura)
    const q = search.toLowerCase().trim()
    if (q) out = out.filter((r) => r.nome.toLowerCase().includes(q) || r.obiettivo.toLowerCase().includes(q) || r.challenge.toLowerCase().includes(q))
    return out.sort((a, b) => b.avanzamento - a.avanzamento)
  }, [rows, anno, challenge, reparto, struttura, search])

  const mediaAvanz = filtered.length ? Math.round(filtered.reduce((s, r) => s + r.avanzamento, 0) / filtered.length) : 0
  const nRaggiunti = filtered.filter((r) => r.avanzamento >= 100).length

  return (
    <div className="mon-perf">
      <BtnBack />
      <PageHeader title="Monitoraggio performance" subtitle="Controllo e analisi dei risultati e delle performance del personale" />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="mon-perf__bar">
        <div className="mon-perf__field">
          <SelectField name="anno" label="Anno" className="mon-perf__select-sm" value={String(anno)} onChange={(e) => { setAnno(Number(e.target.value)); setChallenge('Tutte') }}
            options={ANNI.map((a) => ({ value: String(a), label: String(a) }))} />
        </div>
        <div className="mon-perf__field">
          <SelectField name="challenge" label="Challenge in corso" className="mon-perf__select-lg" value={challenge} onChange={(e) => setChallenge(e.target.value)}
            options={[{ value: 'Tutte', label: 'Tutte le challenge' }, ...challengeOpts.map((c) => ({ value: c, label: c }))]} />
        </div>
        <div className="mon-perf__field">
          <SelectField name="reparto" label="Reparto" className="mon-perf__select" value={reparto} onChange={(e) => setReparto(e.target.value)}
            options={[{ value: 'Tutti', label: 'Tutti' }, ...REPARTI.map((r) => ({ value: r, label: r }))]} />
        </div>
        <div className="mon-perf__field">
          <SelectField name="struttura" label="Struttura" className="mon-perf__select" value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={[{ value: 'Tutte', label: 'Tutte' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]} />
        </div>
        <div className="mon-perf__field">
          <label>Cerca</label>
          <SearchField className="mon-perf__search" name="search" placeholder="Dipendente o obiettivo" value={search}
            onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
      </div>

      {/* ─── Board "pista a obiettivi" ─────────────────────────────────────── */}
      <div className="mon-perf__board">
        <div className="mon-perf__board-scroll">
          {/* header con i premi (trofei) sopra le tappe */}
          <div className="mon-perf__row mon-perf__row--head">
            <div className="mon-perf__c-name">Nome</div>
            <div className="mon-perf__c-rep">Reparto</div>
            <div className="mon-perf__c-track">
              <span className="mon-perf__track-title">Obiettivi</span>
              <div className="mon-perf__premi">
                {NODES.map((nd, i) => (
                  <div key={nd.n} className="mon-perf__premio" style={{ left: `${(i / (NODES.length - 1)) * 100}%` }}>
                    {nd.finale ? (
                      <Tooltip text={nd.premio}><i className="fa-solid fa-party-horn mon-perf__premio-final" /></Tooltip>
                    ) : nd.trofei > 0 ? (
                      <Tooltip text={`Tappa ${nd.n} — ${nd.premio}`}>
                        <span className="mon-perf__trofei">
                          {Array.from({ length: nd.trofei }).map((_, t) => <i key={t} className="fa-solid fa-trophy" />)}
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mon-perf__empty">Nessun dipendente con obiettivo assegnato.</div>
          ) : filtered.map((r) => {
            const reached = reachedCount(r.avanzamento)
            const runner = Math.max(0, Math.min(100, r.avanzamento))
            return (
              <button key={r.id} type="button" className="mon-perf__row mon-perf__row--emp" onClick={() => setDetail(r)}>
                <div className="mon-perf__c-name">
                  <img className="mon-perf__avatar" src={avatarUrl(r.nome)} alt="" />
                  <span className="mon-perf__user-wrap">
                    <span className="mon-perf__user-name">{r.nome}</span>
                    <span className="mon-perf__user-chall">{r.challenge}</span>
                  </span>
                </div>
                <div className="mon-perf__c-rep">
                  <Tooltip text={r.reparto}><i className={`fa-light ${REPARTO_ICON[r.reparto] ?? 'fa-user'} mon-perf__rep-ico`} /></Tooltip>
                </div>
                <div className="mon-perf__c-track">
                  <div className="mon-perf__track">
                    <div className="mon-perf__track-line" />
                    <div className="mon-perf__track-prog" style={{ width: `${runner}%` }} />
                    {NODES.map((nd, i) => {
                      const ok = nd.soglia <= r.avanzamento
                      return (
                        <div key={nd.n} className={'mon-perf__node' + (ok ? ' is-on' : '')}
                          style={{ left: `${(i / (NODES.length - 1)) * 100}%`, ['--node' as any]: nd.color }}>
                          {nd.n}
                        </div>
                      )
                    })}
                    <div className="mon-perf__runner" style={{ left: `${runner}%` }} title={`${r.avanzamento}% · tappa ${reached}/5`}>
                      <i className="fa-solid fa-person-running" />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mon-perf__summary">
        <strong>{filtered.length}</strong> dipendenti monitorati · avanzamento medio <strong>{mediaAvanz}%</strong> · <strong>{nRaggiunti}</strong> obiettivi raggiunti
      </div>

      <DettaglioPerfModal row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

// ─── MODAL: dettaglio performance ─────────────────────────────────────────────

function DettaglioPerfModal({ row, onClose }: { row: PerfRow | null; onClose: () => void }) {
  return (
    <Modal open={!!row} onClose={onClose} title="Dettaglio performance" size="lg">
      {row && (() => {
        const stato = statoOf(row.avanzamento)
        return (
          <div className="mon-perf__detail">
            <div className="mon-perf__detail-head">
              <img className="mon-perf__avatar mon-perf__avatar--lg" src={avatarUrl(row.nome)} alt="" />
              <div>
                <div className="mon-perf__detail-name">{row.nome}</div>
                <div className="mon-perf__detail-sub">{row.reparto} · {row.struttura} · {row.anno}</div>
                <div className="mon-perf__detail-chall"><i className="fa-solid fa-flag-checkered" /> {row.challenge}</div>
              </div>
              <span className={`mon-perf__stato mon-perf__stato--${stato} mon-perf__detail-stato`}>{STATO_LABEL[stato]}</span>
            </div>

            <div className="mon-perf__detail-obj">
              <span className="mon-perf__detail-label">Obiettivo</span>
              <span className="mon-perf__detail-objname">{row.obiettivo} — <strong>{row.avanzamento}%</strong></span>
            </div>

            <div className="mon-perf__detail-grid">
              <div className="mon-perf__chart">
                <div className="mon-perf__detail-label">Andamento mensile</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend(row.avanzamento)} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid stroke="#E0E7EE" vertical={false} />
                    <XAxis dataKey="mese" tick={{ fontSize: 10, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} interval={0} />
                    <YAxis domain={[0, 120]} tick={{ fontSize: 10, fill: '#6E7175' }} tickLine={false} axisLine={false} width={30} />
                    <ReferenceLine y={100} stroke="#1F9D55" strokeDasharray="4 4" />
                    <RTooltip formatter={(v) => [`${v}%`, 'Avanzamento']} />
                    <Line type="monotone" dataKey="valore" stroke="#204769" strokeWidth={2} dot={{ r: 2.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mon-perf__traguardi">
                <div className="mon-perf__detail-label">Tappe e premi</div>
                <ul className="mon-perf__tr-full">
                  {NODES.map((nd) => {
                    const ok = nd.soglia <= row.avanzamento
                    return (
                      <li key={nd.n} className={ok ? 'is-ok' : ''}>
                        <span className="mon-perf__tr-node" style={{ background: ok ? nd.color : undefined }}>{nd.n}</span>
                        <span className="mon-perf__tr-premio">{nd.premio}</span>
                        {ok && <span className="mon-perf__tr-badge">{nd.finale || nd.trofei === 0 ? 'Raggiunto' : 'Maturato'}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        )
      })()}
    </Modal>
  )
}
