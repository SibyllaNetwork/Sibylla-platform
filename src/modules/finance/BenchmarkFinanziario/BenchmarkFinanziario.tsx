import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { SearchField, SelectField, CheckboxField } from '../../../core/components/form'
import { Donut } from '../../sales/distribution/_charts/Donut'
import { AreaTrend, type SeriesPoint } from '../../sales/distribution/_charts/AreaTrend'
import { HBars, type HBar } from '../../sales/distribution/_charts/HBars'
import './BenchmarkFinanziario.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tipo = 'azienda' | 'persona'
type Rischio = 'basso' | 'medio' | 'alto'

interface EventoNegativo { tipo: string; data: string; importo?: number }
interface Soggetto {
  id: string
  tipo: Tipo
  ragioneSociale: string
  piva: string
  sede: string
  ateco: string
  settore: string
  formaGiuridica: string
  costituzione: string
  cessata: boolean
  // report
  rating: string
  score: number // 0-100 (score: alto = sano)
  rischio: Rischio
  fatturato: number
  fatturatoTrend: number[] // ultimi 5 anni
  ebitdaPct: number
  utile: number
  dipendenti: number
  pfnEbitda: number
  indici: { liquidita: number; redditivita: number; indebitamento: number; solvibilita: number } // 0-100
  pagamenti: string
  giorniMediPagamento: number
  eventiNegativi: EventoNegativo[]
}

const ANNI = ['2021', '2022', '2023', '2024', '2025']
const fmtEUR = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtMln = (n: number) => `${(n / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} M€`

const RISCHIO_LABEL: Record<Rischio, string> = { basso: 'Rischio basso', medio: 'Rischio medio', alto: 'Rischio alto' }
const scoreColor = (r: Rischio) => (r === 'basso' ? '#1F9D55' : r === 'medio' ? '#E0922A' : '#E2574C')

// ─── MOCK (databank imprese) ───────────────────────────────────────────────────

const DB: Soggetto[] = [
  {
    id: 'c1', tipo: 'azienda', ragioneSociale: 'Sibylla Network S.r.l.', piva: '01234567890', sede: 'Roma (RM)', ateco: '55.10.00', settore: 'Alberghi e strutture ricettive', formaGiuridica: 'S.r.l.', costituzione: '14/03/2016', cessata: false,
    rating: 'A2', score: 84, rischio: 'basso', fatturato: 4_200_000, fatturatoTrend: [2.9, 3.3, 3.6, 3.9, 4.2], ebitdaPct: 22, utile: 410_000, dipendenti: 142, pfnEbitda: 1.4,
    indici: { liquidita: 78, redditivita: 71, indebitamento: 32, solvibilita: 80 }, pagamenti: 'Puntuale', giorniMediPagamento: 38, eventiNegativi: [],
  },
  {
    id: 'c2', tipo: 'azienda', ragioneSociale: 'Hotel Group S.p.A.', piva: '09876543210', sede: 'Milano (MI)', ateco: '55.10.00', settore: 'Alberghi', formaGiuridica: 'S.p.A.', costituzione: '02/07/2008', cessata: false,
    rating: 'B1', score: 66, rischio: 'medio', fatturato: 12_400_000, fatturatoTrend: [11.0, 10.2, 11.6, 12.0, 12.4], ebitdaPct: 15, utile: 540_000, dipendenti: 320, pfnEbitda: 3.2,
    indici: { liquidita: 54, redditivita: 49, indebitamento: 61, solvibilita: 55 }, pagamenti: 'Ritardi lievi', giorniMediPagamento: 64, eventiNegativi: [{ tipo: 'Pregiudizievole — ipoteca giudiziale', data: '11/2024', importo: 120_000 }],
  },
  {
    id: 'c3', tipo: 'azienda', ragioneSociale: 'Barnat & Co S.r.l.', piva: '05566778899', sede: 'Firenze (FI)', ateco: '56.10.11', settore: 'Ristorazione', formaGiuridica: 'S.r.l.', costituzione: '20/09/2019', cessata: false,
    rating: 'C1', score: 41, rischio: 'alto', fatturato: 1_100_000, fatturatoTrend: [1.6, 1.4, 1.3, 1.2, 1.1], ebitdaPct: 6, utile: -85_000, dipendenti: 24, pfnEbitda: 6.1,
    indici: { liquidita: 31, redditivita: 22, indebitamento: 82, solvibilita: 28 }, pagamenti: 'Ritardi gravi', giorniMediPagamento: 112, eventiNegativi: [{ tipo: 'Protesto — cambiale', data: '03/2025', importo: 18_500 }, { tipo: 'Pregiudizievole — pignoramento', data: '01/2025', importo: 40_000 }],
  },
  {
    id: 'c4', tipo: 'azienda', ragioneSociale: 'Ristorazione Sud S.r.l.', piva: '03344556677', sede: 'Palermo (PA)', ateco: '56.10.11', settore: 'Ristorazione', formaGiuridica: 'S.r.l.', costituzione: '05/05/2012', cessata: true,
    rating: 'D', score: 12, rischio: 'alto', fatturato: 0, fatturatoTrend: [2.1, 1.5, 0.8, 0.3, 0], ebitdaPct: -4, utile: -210_000, dipendenti: 0, pfnEbitda: 0,
    indici: { liquidita: 8, redditivita: 5, indebitamento: 95, solvibilita: 6 }, pagamenti: 'Insolvente', giorniMediPagamento: 0, eventiNegativi: [{ tipo: 'Procedura concorsuale — liquidazione', data: '06/2024' }],
  },
  {
    id: 'c5', tipo: 'azienda', ragioneSociale: 'Grim Hospitality S.r.l.', piva: '07788990011', sede: 'Noto (SR)', ateco: '55.10.00', settore: 'Alberghi', formaGiuridica: 'S.r.l.', costituzione: '18/11/2021', cessata: false,
    rating: 'B2', score: 59, rischio: 'medio', fatturato: 2_300_000, fatturatoTrend: [1.2, 1.6, 1.9, 2.1, 2.3], ebitdaPct: 18, utile: 160_000, dipendenti: 58, pfnEbitda: 2.6,
    indici: { liquidita: 60, redditivita: 58, indebitamento: 48, solvibilita: 62 }, pagamenti: 'Puntuale', giorniMediPagamento: 45, eventiNegativi: [],
  },
  {
    id: 'p1', tipo: 'persona', ragioneSociale: 'Mario Rossi', piva: 'RSSMRA80A01H501U', sede: 'Roma (RM)', ateco: '—', settore: 'Titolare / Amministratore', formaGiuridica: 'Persona fisica', costituzione: '—', cessata: false,
    rating: 'A3', score: 76, rischio: 'basso', fatturato: 0, fatturatoTrend: [0, 0, 0, 0, 0], ebitdaPct: 0, utile: 0, dipendenti: 0, pfnEbitda: 0,
    indici: { liquidita: 70, redditivita: 0, indebitamento: 30, solvibilita: 74 }, pagamenti: 'Regolare', giorniMediPagamento: 0, eventiNegativi: [],
  },
]

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function BenchmarkFinanziario(_props: { navigate?: (p: string) => void } = {}) {
  const [query, setQuery] = useState('')
  const [tipo, setTipo] = useState<'entrambe' | Tipo>('azienda')
  const [includiCessate, setIncludiCessate] = useState(false)
  const [selected, setSelected] = useState<Soggetto | null>(null)

  const risultati = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return DB.filter((s) => {
      if (tipo !== 'entrambe' && s.tipo !== tipo) return false
      if (!includiCessate && s.cessata) return false
      return s.ragioneSociale.toLowerCase().includes(q) || s.piva.toLowerCase().includes(q)
    })
  }, [query, tipo, includiCessate])

  return (
    <div className="bench-fin">
      <PageHead title="Benchmark finanziario" subtitle="Controlla le prestazioni delle imprese sul mercato per prevenire rischi finanziari e operativi" />

      {/* ─── Ricerca (databank imprese) ──────────────────────────────────────── */}
      <div className="bench-fin__search">
        <div className="bench-fin__field bench-fin__field--grow">
          <label>Ricerca</label>
          <SearchField className="bench-fin__search-input" name="q" placeholder="Nome azienda, iniziali o P.IVA / Codice fiscale" value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }} onClear={() => { setQuery(''); setSelected(null) }} />
        </div>
        <div className="bench-fin__field">
          <SelectField name="tipo" label="Tipologia" className="bench-fin__select" value={tipo} onChange={(e) => setTipo(e.target.value as 'entrambe' | Tipo)}
            options={[{ value: 'azienda', label: 'Aziende' }, { value: 'persona', label: 'Persona' }, { value: 'entrambe', label: 'Entrambe' }]} />
        </div>
        <div className="bench-fin__field bench-fin__check">
          <CheckboxField name="cessate" label="Includi attività cessate" checked={includiCessate} onChange={(e) => setIncludiCessate(e.target.checked)} />
        </div>
        <div className="bench-fin__powered"><i className="fa-light fa-database" /> Fonte: databank imprese</div>
      </div>

      {/* ─── Risultati / Report ─────────────────────────────────────────────── */}
      {selected ? (
        <Report soggetto={selected} onBack={() => setSelected(null)} />
      ) : query.trim() === '' ? (
        <div className="bench-fin__hint">
          <i className="fa-light fa-magnifying-glass-chart" />
          <p>Inserisci il nome di un'azienda (o le iniziali) per interrogare il databank imprese e generare il report finanziario.</p>
        </div>
      ) : (
        <div className="bench-fin__results">
          <div className="bench-fin__results-head">{risultati.length} risultat{risultati.length === 1 ? 'o' : 'i'} per “{query}”</div>
          {risultati.length === 0 ? (
            <div className="sib-empty">Nessun soggetto trovato. Prova con un altro nome o abilita le attività cessate.</div>
          ) : risultati.map((s) => (
            <button key={s.id} type="button" className="bench-fin__res" onClick={() => setSelected(s)}>
              <i className={`fa-light ${s.tipo === 'persona' ? 'fa-user' : 'fa-building'} bench-fin__res-ico`} />
              <div className="bench-fin__res-body">
                <div className="bench-fin__res-name">
                  {s.ragioneSociale}
                  {s.cessata && <span className="bench-fin__tag bench-fin__tag--cessata">Cessata</span>}
                </div>
                <div className="bench-fin__res-meta">{s.formaGiuridica} · {s.sede} · {s.settore} · P.IVA {s.piva}</div>
              </div>
              <span className={`bench-fin__rating bench-fin__rating--${s.rischio}`}>{s.rating}</span>
              <i className="fa-light fa-chevron-right bench-fin__res-go" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── REPORT ───────────────────────────────────────────────────────────────────

function Report({ soggetto: s, onBack }: { soggetto: Soggetto; onBack: () => void }) {
  const trend: SeriesPoint[] = ANNI.map((a, i) => ({ x: a, y: s.fatturatoTrend[i] }))
  const indiciBars: HBar[] = [
    { label: 'Liquidità',     value: s.indici.liquidita,    color: '#5C9CD4', format: (v) => `${v}/100` },
    { label: 'Redditività',   value: s.indici.redditivita,  color: '#2BB0A6', format: (v) => `${v}/100` },
    { label: 'Solvibilità',   value: s.indici.solvibilita,  color: '#204769', format: (v) => `${v}/100` },
    { label: 'Indebitamento', value: s.indici.indebitamento,color: '#E0922A', format: (v) => `${v}/100` },
  ]
  const insight = s.rischio === 'basso'
    ? 'Profilo solido: indici di liquidità e solvibilità sopra la media di settore, nessun evento negativo rilevato. Affidabile come partner/fornitore.'
    : s.rischio === 'medio'
      ? 'Profilo da monitorare: indebitamento e tempi di pagamento sopra la media. Valutare fidi e condizioni con cautela.'
      : 'Profilo a rischio elevato: redditività negativa o eventi pregiudizievoli rilevati. Sconsigliata l\'esposizione creditizia senza garanzie.'

  return (
    <div className="bench-fin__report">
      <button type="button" className="bench-fin__back" onClick={onBack}><i className="fa-light fa-arrow-left" /> Risultati</button>

      {/* Intestazione + rating */}
      <div className="bench-fin__rep-grid">
        <div className="bench-fin__card bench-fin__rep-anag">
          <div className="bench-fin__rep-title">
            <i className={`fa-light ${s.tipo === 'persona' ? 'fa-user' : 'fa-building'}`} /> {s.ragioneSociale}
            {s.cessata && <span className="bench-fin__tag bench-fin__tag--cessata">Cessata</span>}
          </div>
          <dl className="bench-fin__anag">
            <div><dt>P.IVA / C.F.</dt><dd>{s.piva}</dd></div>
            <div><dt>Forma giuridica</dt><dd>{s.formaGiuridica}</dd></div>
            <div><dt>Sede</dt><dd>{s.sede}</dd></div>
            <div><dt>Settore (ATECO {s.ateco})</dt><dd>{s.settore}</dd></div>
            <div><dt>Costituzione</dt><dd>{s.costituzione}</dd></div>
            <div><dt>Stato attività</dt><dd>{s.cessata ? 'Cessata' : 'Attiva'}</dd></div>
          </dl>
        </div>
        <div className="bench-fin__card bench-fin__rep-score">
          <div className="bench-fin__card-title">Score finanziario</div>
          <Donut slices={[{ label: 'Score', value: s.score, color: scoreColor(s.rischio) }, { label: 'resto', value: 100 - s.score, color: '#EAEef2' }]}
            centerValue={s.rating} centerSubLabel={`${s.score}/100`} size={170} thickness={26} />
          <span className={`bench-fin__rischio bench-fin__rischio--${s.rischio}`}>{RISCHIO_LABEL[s.rischio]}</span>
        </div>
      </div>

      {/* KPI */}
      <div className="bench-fin__kpis">
        <Kpi icon="fa-coins" label="Fatturato" value={s.fatturato ? fmtMln(s.fatturato) : 'n.d.'} />
        <Kpi icon="fa-percent" label="EBITDA margin" value={`${s.ebitdaPct}%`} />
        <Kpi icon="fa-sack-dollar" label="Utile netto" value={s.utile ? fmtEUR(s.utile) : 'n.d.'} neg={s.utile < 0} />
        <Kpi icon="fa-users" label="Dipendenti" value={String(s.dipendenti)} />
        <Kpi icon="fa-scale-unbalanced" label="PFN / EBITDA" value={s.pfnEbitda ? `${s.pfnEbitda.toLocaleString('it-IT', { maximumFractionDigits: 1 })}x` : 'n.d.'} neg={s.pfnEbitda >= 4} />
        <Kpi icon="fa-clock" label="Giorni medi pag." value={s.giorniMediPagamento ? `${s.giorniMediPagamento} gg` : 'n.d.'} neg={s.giorniMediPagamento >= 75} />
      </div>

      {/* Charts */}
      <div className="bench-fin__rep-grid bench-fin__rep-grid--2-1">
        <div className="bench-fin__card">
          <div className="bench-fin__card-title">Andamento fatturato (M€)</div>
          <AreaTrend primary={trend} primaryLabel="Fatturato" primaryColor="#5C9CD4" height={220} />
        </div>
        <div className="bench-fin__card">
          <div className="bench-fin__card-title">Indici di bilancio</div>
          <HBars bars={indiciBars} showAxis ticks={4} labelWidth={110} />
        </div>
      </div>

      {/* Pagamenti + eventi negativi */}
      <div className="bench-fin__rep-grid bench-fin__rep-grid--2">
        <div className="bench-fin__card">
          <div className="bench-fin__card-title">Comportamento pagamenti</div>
          <div className="bench-fin__pay">
            <span className={'bench-fin__pay-badge bench-fin__pay-badge--' + s.rischio}>{s.pagamenti}</span>
            {s.giorniMediPagamento > 0 && <span className="bench-fin__pay-days">{s.giorniMediPagamento} giorni medi di pagamento</span>}
          </div>
        </div>
        <div className="bench-fin__card">
          <div className="bench-fin__card-title">Eventi negativi (protesti / pregiudizievoli)</div>
          {s.eventiNegativi.length === 0 ? (
            <div className="bench-fin__none"><i className="fa-solid fa-circle-check" /> Nessun evento negativo rilevato</div>
          ) : (
            <ul className="bench-fin__eventi">
              {s.eventiNegativi.map((e, i) => (
                <li key={i}><i className="fa-solid fa-triangle-exclamation" /><span>{e.tipo}</span><span className="bench-fin__ev-meta">{e.data}{e.importo ? ` · ${fmtEUR(e.importo)}` : ''}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={'bench-fin__insight bench-fin__insight--' + s.rischio}>
        <i className="fa-solid fa-lightbulb" /> {insight}
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, neg }: { icon: string; label: string; value: string; neg?: boolean }) {
  return (
    <div className="bench-fin__kpi">
      <div className="bench-fin__kpi-ico"><i className={`fa-light ${icon}`} /></div>
      <div>
        <div className={'bench-fin__kpi-value' + (neg ? ' is-neg' : '')}>{value}</div>
        <div className="bench-fin__kpi-label">{label}</div>
      </div>
    </div>
  )
}
