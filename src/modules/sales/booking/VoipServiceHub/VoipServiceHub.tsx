import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../../services/api'
import './VoipServiceHub.sass'

type AgenteStato = 'X' | 'Available' | 'Bell'

interface Agente {
  id: number
  interno: string         // es. "20001"
  nome: string            // es. "Maximiliano Cordeschi"
  stato: AgenteStato
  membership: 'Statico' | 'Dinamico'
}

interface Coda {
  id: string              // es. "9001"
  ricevute: number
  risposte: number
  inCoda: number
  abbandonate: number
  strategia: string
  agenti: Agente[]
}

interface Interno {
  id: number
  numero: string
  nome: string
  stato: AgenteStato
}

interface Statistiche {
  chiamateInAttesa: number
  chiamateGestite: number
  chiamateAbbandonate: number
  attesaPiuLunga: string
  attesaMedia: string
  tempoMedioConversazione: string
}

interface Data {
  code: Coda[]
  interni: Interno[]
  stats: Statistiche
}

const A: Agente[] = [
  { id: 1, interno: '20001', nome: 'Maximiliano Cordeschi', stato: 'X',         membership: 'Statico' },
  { id: 2, interno: '20007', nome: 'Roberta Manili',         stato: 'Bell',      membership: 'Statico' },
  { id: 3, interno: '20009', nome: 'Francesca Poliziani',    stato: 'Available', membership: 'Statico' },
  { id: 4, interno: '20018', nome: 'Maria Falleni',          stato: 'Available', membership: 'Statico' },
  { id: 5, interno: '20010', nome: 'Claudia Carapucci',      stato: 'Available', membership: 'Statico' },
]

const FALLBACK: Data = {
  code: [
    { id: '9001', ricevute: 32, risposte: 11, inCoda: 0, abbandonate: 21, strategia: 'leastrecent', agenti: [A[0], A[1], A[2], A[3], A[4]] },
    { id: '9001', ricevute: 32, risposte: 11, inCoda: 0, abbandonate: 21, strategia: 'leastrecent', agenti: [A[0], A[3], A[4]] },
    { id: '9001', ricevute: 32, risposte: 11, inCoda: 0, abbandonate: 21, strategia: 'leastrecent', agenti: [A[2], A[4]] },
    { id: '9001', ricevute: 32, risposte: 11, inCoda: 0, abbandonate: 21, strategia: 'leastrecent', agenti: [A[2]] },
    { id: '9001', ricevute: 32, risposte: 11, inCoda: 0, abbandonate: 21, strategia: 'leastrecent', agenti: [] },
  ],
  interni: [
    { id: 1, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 2, numero: '20002', nome: 'Matteo Pieri',     stato: 'Available' },
    { id: 3, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 4, numero: '20002', nome: 'Matteo Pieri',     stato: 'Available' },
    { id: 5, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 6, numero: '20002', nome: 'Matteo Pieri',     stato: 'Available' },
    { id: 7, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 8, numero: '20002', nome: 'Matteo Pieri',     stato: 'Available' },
    { id: 9, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 10, numero: '20002', nome: 'Matteo Pieri',    stato: 'Available' },
    { id: 11, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 12, numero: '20002', nome: 'Matteo Pieri',    stato: 'Available' },
    { id: 13, numero: '20002', nome: 'Matteo Pieri',    stato: 'Available' },
    { id: 14, numero: '20001', nome: 'Maximiliano Cor…', stato: 'X' },
    { id: 15, numero: '20002', nome: 'Matteo Pieri',    stato: 'Available' },
  ],
  stats: {
    chiamateInAttesa: 0,
    chiamateGestite: 494,
    chiamateAbbandonate: 130,
    attesaPiuLunga: '00:19:30',
    attesaMedia: '00:00:24',
    tempoMedioConversazione: '00:01:55',
  },
}

export default function VoipServiceHub({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('voip/GetServiceHub', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  const interniFiltered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return data.interni
    return data.interni.filter((i) => i.numero.includes(q) || i.nome.toLowerCase().includes(q))
  }, [data.interni, search])

  return (
    <div className="voip-hub">
      <PageHead title="VoIP Service HUB" subtitle="Gestione unificata delle prenotazioni dirette" />

      <div className="voip-hub__top-actions">
        <button type="button" className="sib-btn sib-btn--secondary">
          <i className="fa-light fa-wave-pulse" /> Dati statistici
        </button>
        <button type="button" className="sib-btn sib-btn--icon" title="Chiamata" aria-label="Chiamata">
          <i className="fa-light fa-phone" />
        </button>
        <button type="button" className="sib-btn sib-btn--icon" title="Profilo agente" aria-label="Profilo agente">
          <i className="fa-light fa-headset" />
        </button>
      </div>

      <h2 className="voip-hub__section-title">Code</h2>
      <div className="voip-hub__queues">
        {data.code.map((c, idx) => (
          <div className="voip-hub__queue" key={idx}>
            <div className="voip-hub__queue-title">Coda {c.id}</div>
            <div className="voip-hub__queue-stats">
              <span className="voip-hub__pill"><strong>Ricevute:</strong> {c.ricevute}</span>
              <span className="voip-hub__pill"><strong>Risposte:</strong> {c.risposte}</span>
              <span className="voip-hub__pill"><strong>In coda:</strong> {c.inCoda}</span>
            </div>
            <div className="voip-hub__queue-stats">
              <span className="voip-hub__pill"><strong>Abbandonate:</strong> {c.abbandonate}</span>
              <span className="voip-hub__pill"><strong>Strategia:</strong> {c.strategia}</span>
            </div>

            <div className="voip-hub__agente-label">Agente</div>
            <div className="voip-hub__agenti">
              {c.agenti.map((a) => (
                <div className="voip-hub__agente-row" key={`${idx}-${a.id}`}>
                  <StatoIcon stato={a.stato} />
                  <span className="voip-hub__agente-name">{a.nome} ({a.interno})</span>
                  <span className="voip-hub__membership">{a.membership}</span>
                </div>
              ))}
            </div>

            <button type="button" className="sib-btn sib-btn--secondary voip-hub__add-agent">
              <i className="fa-light fa-circle-plus" /> Aggiungi agente
            </button>
          </div>
        ))}
      </div>

      <div className="voip-hub__interni-header">
        <h2 className="voip-hub__section-title">Interni</h2>
        <div className="voip-hub__search-field">
          <label className="voip-hub__search-label" htmlFor="voip-search">Cerca</label>
          <div className="voip-hub__search">
            <input
              id="voip-search"
              type="search"
              className="sib-input"
              placeholder="Cerca"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass voip-hub__search-icon" />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--icon voip-hub__interni-toggle" title="Mostra/nascondi" aria-label="Mostra/nascondi">
          <i className="fa-light fa-eye" />
        </button>
      </div>

      <div className="voip-hub__interni-grid">
        {interniFiltered.map((i) => (
          <div className="voip-hub__interno" key={i.id}>
            <StatoIcon stato={i.stato} />
            <div className="voip-hub__interno-text">
              <div className="voip-hub__interno-num">{i.numero}</div>
              <div className="voip-hub__interno-nome">{i.nome}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="voip-hub__stats-row">
        <div className="voip-hub__stat">
          <div className="voip-hub__stat-label">Chiamate in attesa</div>
          <div className="voip-hub__stat-value">{data.stats.chiamateInAttesa}</div>
        </div>
        <div className="voip-hub__stat">
          <div className="voip-hub__stat-label">Chiamate gestite</div>
          <div className="voip-hub__stat-value">{data.stats.chiamateGestite}</div>
        </div>
        <div className="voip-hub__stat">
          <div className="voip-hub__stat-label">Chiamate abbandonate</div>
          <div className="voip-hub__stat-value">{data.stats.chiamateAbbandonate}</div>
        </div>
        <div className="voip-hub__stat">
          <div className="voip-hub__stat-label">Attesa più lunga</div>
          <div className="voip-hub__stat-value">{data.stats.attesaPiuLunga}</div>
        </div>
        <div className="voip-hub__stat">
          <div className="voip-hub__stat-label">Attesa media</div>
          <div className="voip-hub__stat-value">{data.stats.attesaMedia}</div>
        </div>
        <div className="voip-hub__stat">
          <div className="voip-hub__stat-label">Tempo medio di conversazione</div>
          <div className="voip-hub__stat-value">{data.stats.tempoMedioConversazione}</div>
        </div>
      </div>
    </div>
  )
}

// ─── STATO ICON ──────────────────────────────────────────────────────────────
function StatoIcon({ stato }: { stato: AgenteStato }) {
  if (stato === 'Available') {
    return (
      <span className="voip-hub__stato voip-hub__stato--ok" aria-label="Disponibile">
        <i className="fa-solid fa-check" />
      </span>
    )
  }
  if (stato === 'Bell') {
    return (
      <span className="voip-hub__stato voip-hub__stato--ringing" aria-label="In chiamata">
        <i className="fa-solid fa-bell" />
      </span>
    )
  }
  return (
    <span className="voip-hub__stato voip-hub__stato--off" aria-label="Non disponibile">
      <i className="fa-solid fa-xmark" />
    </span>
  )
}
