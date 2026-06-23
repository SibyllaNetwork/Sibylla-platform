import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { InputField, SelectField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import { useRuoliStore, type ProfiloRow } from '../../../store/useRuoliStore'
import {
  usePraticheStore,
  TIPOLOGIA_META,
  STATO_PRATICA_META,
  STATO_PRATICA_FLOW,
  type Pratica,
  type TipologiaCliente,
  type Assegnazione,
} from '../../../store/usePraticheStore'
import './CreaPratica.sass'

const TEAM_VALUE = '__team__'
const TO_VALUE   = '__to__'
const TO_LABEL   = 'TO stesso'

const fmtEur = (n: number) => `€ ${n.toLocaleString('it-IT')}`
const fmtData = (ts: number) =>
  new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

// ── Stelle (categoria) ──────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <span className="crea-prat__stars" aria-label={`${n} stelle`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={`fa-${i <= n ? 'solid' : 'light'} fa-star`} aria-hidden="true" />
      ))}
    </span>
  )
}

// ── Avatar profilo (singolo o stack team) ───────────────────────────────────
function profiloBySeed(profili: ProfiloRow[], nome: string): ProfiloRow | undefined {
  return profili.find((p) => p.nome === nome)
}

function ProfiloCell({ assegnazione, profili }: { assegnazione: Assegnazione; profili: ProfiloRow[] }) {
  if (assegnazione.tipo === 'team') {
    const shown = profili.slice(0, 4)
    const rest = profili.length - shown.length
    return (
      <div className="crea-prat__assignee crea-prat__assignee--team">
        <span className="crea-prat__avatars">
          {shown.map((p) => (
            <img key={p.nome} className="crea-prat__avatar" src={avatarUrl(p.seed || p.nome)} alt={p.nome} title={p.nome} />
          ))}
          {rest > 0 && <span className="crea-prat__avatar crea-prat__avatar--more">+{rest}</span>}
        </span>
        <span className="crea-prat__assignee-label">Tutto il team</span>
      </div>
    )
  }
  const p = profiloBySeed(profili, assegnazione.nome)
  const seed = p?.seed || assegnazione.nome
  return (
    <div className="crea-prat__assignee">
      <img className="crea-prat__avatar" src={avatarUrl(seed)} alt={assegnazione.nome} />
      <span className="crea-prat__assignee-label">{assegnazione.nome}</span>
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────
export default function CreaPratica({ navigate }: { navigate: (p: string) => void }) {
  const profili = useRuoliStore((s) => s.profili)
  const pratiche = usePraticheStore((s) => s.pratiche)
  const crea = usePraticheStore((s) => s.crea)
  const setStato = usePraticheStore((s) => s.setStato)
  const remove = usePraticheStore((s) => s.remove)

  const [destinazione, setDestinazione] = useState('')
  const [categoria, setCategoria] = useState(4)
  const [tipologia, setTipologia] = useState<TipologiaCliente>('gruppi')
  const [budget, setBudget] = useState('')
  const [markup, setMarkup] = useState('')
  const [assegna, setAssegna] = useState(TEAM_VALUE)
  const [errore, setErrore] = useState('')
  const [creata, setCreata] = useState(false)

  const assegnaOptions = [
    { value: TEAM_VALUE, label: 'Tutto il team' },
    { value: TO_VALUE, label: 'TO stesso (io)' },
    ...profili.map((p) => ({ value: p.nome, label: p.nome })),
  ]

  const buildAssegnazione = (v: string): Assegnazione =>
    v === TEAM_VALUE ? { tipo: 'team' } : { tipo: 'profilo', nome: v === TO_VALUE ? TO_LABEL : v }

  const reset = () => {
    setDestinazione('')
    setCategoria(4)
    setTipologia('gruppi')
    setBudget('')
    setMarkup('')
    setAssegna(TEAM_VALUE)
    setErrore('')
  }

  const handleCrea = () => {
    if (!destinazione.trim() || !budget) {
      setErrore('Inserisci almeno destinazione e budget di riferimento.')
      return
    }
    crea({
      destinazione: destinazione.trim(),
      categoria,
      tipologia,
      budget: Number(budget) || 0,
      markup: Number(markup) || 0,
      assegnazione: buildAssegnazione(assegna),
    })
    reset()
    setCreata(true)
  }

  return (
    <div className="crea-prat">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Crea pratica"
        subtitle="Crea e categorizza le pratiche per destinazione, categoria, tipologia cliente, budget e markup; assegnale a un profilo o all'intero team"
      />

      <div className="crea-prat__layout">
        {/* ── Form nuova pratica ─────────────────────────────────────────────── */}
        <section className="crea-prat__form">
          <header className="crea-prat__form-head">
            <span className="crea-prat__form-num"><i className="fa-light fa-folder-plus" aria-hidden="true" /></span>
            <div>
              <h2 className="crea-prat__form-title">Nuova pratica</h2>
              <p className="crea-prat__form-hint">Categorizza la pratica e assegnala.</p>
            </div>
          </header>

          <InputField
            label="Destinazione"
            name="destinazione"
            placeholder="Es. Roma"
            value={destinazione}
            onChange={(e) => { setDestinazione(e.target.value); setCreata(false) }}
            iconLeft="fa-light fa-location-dot"
          />

          {/* Categoria a stelle */}
          <div className="crea-prat__field">
            <label className="crea-prat__label">Categoria</label>
            <div className="crea-prat__starpick" role="radiogroup" aria-label="Categoria a stelle">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`crea-prat__starbtn${i <= categoria ? ' crea-prat__starbtn--on' : ''}`}
                  onClick={() => { setCategoria(i); setCreata(false) }}
                  aria-label={`${i} stelle`}
                  aria-pressed={i === categoria}
                >
                  <i className="fa-solid fa-star" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {/* Tipologia cliente */}
          <div className="crea-prat__field">
            <label className="crea-prat__label">Tipologia cliente</label>
            <div className="crea-prat__seg">
              {(Object.keys(TIPOLOGIA_META) as TipologiaCliente[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`crea-prat__seg-btn${tipologia === t ? ' crea-prat__seg-btn--active' : ''}`}
                  onClick={() => { setTipologia(t); setCreata(false) }}
                  aria-pressed={tipologia === t}
                >
                  <i className={`fa-light fa-${TIPOLOGIA_META[t].icon}`} aria-hidden="true" />
                  {TIPOLOGIA_META[t].label}
                </button>
              ))}
            </div>
          </div>

          <div className="crea-prat__row2">
            <InputField
              label="Budget di riferimento"
              name="budget"
              type="number"
              placeholder="0"
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setCreata(false) }}
              iconLeft="fa-light fa-euro-sign"
            />
            <InputField
              label="Markup"
              name="markup"
              type="number"
              placeholder="0"
              value={markup}
              onChange={(e) => { setMarkup(e.target.value); setCreata(false) }}
              iconRight="fa-light fa-percent"
            />
          </div>

          <SelectField
            label="Assegna a"
            name="assegna"
            value={assegna}
            options={assegnaOptions}
            onChange={(e) => { setAssegna(e.target.value); setCreata(false) }}
          />

          {errore && (
            <p className="crea-prat__error" role="alert">
              <i className="fa-light fa-circle-exclamation" aria-hidden="true" /> {errore}
            </p>
          )}
          {creata && (
            <p className="crea-prat__ok" role="status">
              <i className="fa-light fa-circle-check" aria-hidden="true" /> Pratica creata e aggiunta all'elenco.
            </p>
          )}

          <div className="crea-prat__actions">
            <button type="button" className="sib-btn sib-btn--ghost" onClick={reset}>
              <i className="fa-light fa-arrow-rotate-left" aria-hidden="true" /> Reset
            </button>
            <button type="button" className="sib-btn sib-btn--primary sib-btn--lg" onClick={handleCrea}>
              <i className="fa-light fa-plus" aria-hidden="true" /> Crea pratica
            </button>
          </div>
        </section>

        {/* ── Elenco pratiche ────────────────────────────────────────────────── */}
        <section className="crea-prat__list">
          <header className="crea-prat__list-head">
            <h2 className="crea-prat__list-title">Gestione delle pratiche</h2>
            <span className="crea-prat__list-count">{pratiche.length}</span>
          </header>

          <div className="sib-table-wrap">
            <table className="sib-table crea-prat__table">
              <thead>
                <tr>
                  <th>Destinazione</th>
                  <th>Categoria</th>
                  <th>Tipologia</th>
                  <th>Budget</th>
                  <th>Markup</th>
                  <th>Creata il</th>
                  <th>Stato</th>
                  <th>Profilo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pratiche.length === 0 ? (
                  <tr><td colSpan={9} className="sib-empty">Nessuna pratica. Creane una dal modulo a sinistra.</td></tr>
                ) : pratiche.map((p) => (
                  <PraticaRow
                    key={p.id}
                    p={p}
                    profili={profili}
                    onStato={(s) => setStato(p.id, s)}
                    onRemove={() => remove(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function PraticaRow({
  p,
  profili,
  onStato,
  onRemove,
}: {
  p: Pratica
  profili: ProfiloRow[]
  onStato: (s: Pratica['stato']) => void
  onRemove: () => void
}) {
  const meta = STATO_PRATICA_META[p.stato]
  return (
    <tr>
      <td>{p.destinazione}</td>
      <td><Stars n={p.categoria} /></td>
      <td>
        <span className="crea-prat__tipo">
          <i className={`fa-light fa-${TIPOLOGIA_META[p.tipologia].icon}`} aria-hidden="true" /> {TIPOLOGIA_META[p.tipologia].label}
        </span>
      </td>
      <td>{fmtEur(p.budget)}</td>
      <td>{p.markup}%</td>
      <td className="crea-prat__data">{fmtData(p.createdAt)}</td>
      <td>
        <select
          className={`sib-select crea-prat__stato-select crea-prat__stato-select--${meta.tone}`}
          value={p.stato}
          onChange={(e) => onStato(e.target.value as Pratica['stato'])}
          title="Cambia stato"
        >
          {STATO_PRATICA_FLOW.map((s) => (
            <option key={s} value={s}>{STATO_PRATICA_META[s].label}</option>
          ))}
        </select>
      </td>
      <td><ProfiloCell assegnazione={p.assegnazione} profili={profili} /></td>
      <td className="crea-prat__td-actions">
        <button type="button" className="sib-btn sib-btn--icon sib-btn--sm" title="Elimina pratica" onClick={onRemove}>
          <i className="fa-light fa-trash" aria-hidden="true" />
        </button>
      </td>
    </tr>
  )
}
