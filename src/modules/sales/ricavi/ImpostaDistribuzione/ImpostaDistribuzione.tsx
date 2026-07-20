import React, { useEffect, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../../services/api'
import { useAccessStore } from '../../../../store/useAccessStore'
import { SelectField, InputField, SearchField } from '../../../../core/components/form'
import ImpostaDistribuzioneTO from './ImpostaDistribuzioneTO'
import './ImpostaDistribuzione.sass'

type Capacita = 1 | 2 | 3

interface OperatoreCorporate {
  id: number
  nome: string
  contratto: boolean
  libera: boolean
  capacita: Capacita
}

interface OperatoreGenerico {
  id: number
  nome: string
  contratto: boolean
  libera: boolean
  /** Codici paese ISO 3166-1 alpha-2 (es. 'it','es','de'). */
  bandiere: string[]
}

interface Struttura {
  id: number
  nome: string
  selected: boolean
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  attenzione: boolean
  corporate: OperatoreCorporate[]
  gruppi: OperatoreGenerico[]
  b2b: OperatoreGenerico[]
  b2c: OperatoreGenerico[]
  citta: string
  categoria: number  // numero stelle
  strutture: Struttura[]
  nomeCluster: string
  cluster: string[]
}

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Archimede' }],
  StrutturaId: 1,
  attenzione: true,
  corporate: [
    { id: 1, nome: 'Ferservizi',                  contratto: false, libera: false, capacita: 2 },
    { id: 2, nome: 'Italcamel',                   contratto: false, libera: false, capacita: 3 },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, capacita: 1 },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, capacita: 2 },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, capacita: 1 },
    { id: 6, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, capacita: 2 },
    { id: 7, nome: 'Malatesta',                   contratto: false, libera: false, capacita: 1 },
  ],
  gruppi: [
    { id: 1, nome: 'Ferservizi',                  contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 2, nome: 'Italcamel',                   contratto: false, libera: false, bandiere: ['pt','it'] },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['pt','it'] },
    { id: 6, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 7, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['us','kr'] },
  ],
  b2b: [
    { id: 1, nome: 'Ferservizi',                  contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 2, nome: 'Italcamel',                   contratto: false, libera: false, bandiere: ['pt','it'] },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['ch'] },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 6, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['it'] },
    { id: 7, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['us','kr'] },
  ],
  b2c: [
    { id: 1, nome: 'Ferservizi',                  contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 2, nome: 'Italcamel',                   contratto: false, libera: false, bandiere: ['pt','it'] },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['pt','it'] },
    { id: 6, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 7, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['us','kr'] },
  ],
  citta: 'Roma',
  categoria: 3,
  strutture: [
    { id: 1, nome: 'Hotel Domus Aurelia',           selected: false },
    { id: 2, nome: 'Grand Hotel Colonna Romana',    selected: false },
    { id: 3, nome: 'Palazzo Aventino Suites',       selected: false },
    { id: 4, nome: 'Hotel Fontana Imperiale',       selected: false },
    { id: 5, nome: 'Residenza Foro Antico',         selected: false },
    { id: 6, nome: 'Hotel Villa Quirinale',         selected: false },
    { id: 7, nome: 'Palazzo Trastevere Boutique Hotel', selected: false },
    { id: 8, nome: 'Hotel Pantheon Royal',          selected: false },
    { id: 9, nome: 'Residenza Foro Antico',         selected: false },
    { id: 10, nome: 'Palazzo Aventino Suites',      selected: false },
  ],
  nomeCluster: 'Centro Storico Roma',
  cluster: ['Centro Storico Roma'],
}

export default function ImpostaDistribuzione({ navigate }: { navigate: (p: string) => void }) {
  // Pagina condivisa: i Tour Operator vedono una versione dedicata (distribuzione
  // per destinazione/struttura/mercato); gli altri moduli la versione standard.
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist ? assist.moduli : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  const isTO = moduli?.includes('tour-operator')

  const [data, setData] = useState<Data>(FALLBACK)
  const [invitaOpen, setInvitaOpen] = useState(false)
  const [invita, setInvita] = useState({ azienda: '', email: '', referente: '' })
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Filtro ricerca sui nomi degli operatori (lente)
  const matchName = (r: { nome: string }) => !query.trim() || r.nome.toLowerCase().includes(query.trim().toLowerCase())

  const submitInvita = async () => {
    if (!invita.azienda.trim() || !invita.email.trim()) return
    try { await apiFetchSibylla('distribuzione/InvitaOperatore', { method: 'POST', body: invita }) } catch {}
    setInvita({ azienda: '', email: '', referente: '' })
    setInvitaOpen(false)
  }

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('distribuzione/GetImposta', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const dismissAlert = () => setData({ ...data, attenzione: false })

  const toggleField = (
    section: 'corporate' | 'gruppi' | 'b2b' | 'b2c',
    id: number,
    field: 'contratto' | 'libera',
  ) => {
    setData((prev) => ({
      ...prev,
      [section]: (prev[section] as any[]).map((r) => r.id === id ? { ...r, [field]: !r[field] } : r),
    }))
  }

  const toggleStruttura = (id: number) => {
    setData({
      ...data,
      strutture: data.strutture.map((s) => s.id === id ? { ...s, selected: !s.selected } : s),
    })
  }

  const creaCluster = () => {
    if (!data.nomeCluster.trim()) return
    setData({ ...data, cluster: [...data.cluster, data.nomeCluster], nomeCluster: '' })
  }

  const fCorporate = data.corporate.filter(matchName)
  const fGruppi    = data.gruppi.filter(matchName)
  const fB2b       = data.b2b.filter(matchName)
  const fB2c       = data.b2c.filter(matchName)

  // Rende una sezione (inline con icona espandi, oppure dentro la modale ingrandita)
  const renderSezione = (key: string, inModal = false) => {
    const onExpand = inModal ? undefined : () => setExpanded(key)
    switch (key) {
      case 'corporate': return <SezioneCorporate label="Corporate" rows={fCorporate} onToggle={(id, f) => toggleField('corporate', id, f)} onExpand={onExpand} />
      case 'gruppi':    return <SezioneGenerica label="Gruppi" verifica rows={fGruppi} onToggle={(id, f) => toggleField('gruppi', id, f)} onExpand={onExpand} />
      case 'b2b':       return <SezioneGenerica label="B2B" verifica rows={fB2b} onToggle={(id, f) => toggleField('b2b', id, f)} onExpand={onExpand} />
      case 'b2c':       return <SezioneGenerica label="B2C" verifica rows={fB2c} onToggle={(id, f) => toggleField('b2c', id, f)} onExpand={onExpand} />
      default:          return null
    }
  }

  if (isTO) return <ImpostaDistribuzioneTO navigate={navigate} />

  return (
    <div className="imposta-dist">
      <PageHead
        title="Imposta distribuzione"
        subtitle="Gestione della distribuzione delle camere per i diversi canali di vendita"
      />

      {data.attenzione && (
        <div className="imposta-dist__alert">
          <span>ATTENZIONE!! per un risultato ottimale è necessario configurare il budget dei ricavi</span>
          <button type="button" className="imposta-dist__alert-close" onClick={dismissAlert} aria-label="Chiudi avviso">
            <i className="fa-light fa-xmark" />
          </button>
        </div>
      )}

      <div className="imposta-dist__bar">
        <div className="imposta-dist__field">
          <SelectField
            label="Strutture"
            name="strutture"
            className="imposta-dist__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
            options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
          />
        </div>
        <div className="imposta-dist__field imposta-dist__search">
          <label htmlFor="cerca-operatore" className="text-[12px] font-semibold font-poppins text-primary">Cerca operatore</label>
          <SearchField
            name="cerca-operatore"
            value={query}
            placeholder="Cerca per nome…"
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
          />
        </div>
        <button type="button" className="sib-btn sib-btn--secondary imposta-dist__invita" onClick={() => setInvitaOpen(true)}>
          <i className="fa-regular fa-envelope" /> Invita nuovo operatore
        </button>
      </div>

      {invitaOpen && (
        <div className="imposta-dist__modal-backdrop" onClick={() => setInvitaOpen(false)}>
          <div className="imposta-dist__modal" onClick={(e) => e.stopPropagation()}>
            <div className="imposta-dist__modal-head">
              <h3>Invita utente</h3>
              <button type="button" className="imposta-dist__modal-close" onClick={() => setInvitaOpen(false)} aria-label="Chiudi">
                <i className="fa-light fa-xmark" />
              </button>
            </div>
            <p className="imposta-dist__modal-sub">
              Inserisci i dati di un referente e invita un nuovo utente.<br />
              Riceverai Sibylla Token nel momento della sua registrazione.
            </p>
            <div className="imposta-dist__modal-field">
              <InputField
                label="Nome azienda"
                name="azienda"
                required
                value={invita.azienda}
                onChange={(e) => setInvita({ ...invita, azienda: e.target.value })}
              />
            </div>
            <div className="imposta-dist__modal-field">
              <InputField
                label="Email"
                name="email"
                type="email"
                required
                value={invita.email}
                onChange={(e) => setInvita({ ...invita, email: e.target.value })}
              />
            </div>
            <div className="imposta-dist__modal-field">
              <InputField
                label="Referente"
                name="referente"
                value={invita.referente}
                onChange={(e) => setInvita({ ...invita, referente: e.target.value })}
              />
            </div>
            <div className="imposta-dist__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setInvitaOpen(false)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={submitInvita}>Invita</button>
            </div>
          </div>
        </div>
      )}

      <div className="imposta-dist__grid">
        {/* ── Colonna 1: Corporate + Gruppi ───────────────────────────────── */}
        <div className="imposta-dist__col">
          {renderSezione('corporate')}
          {renderSezione('gruppi')}
        </div>

        {/* ── Colonna 2: B2B + B2C ────────────────────────────────────────── */}
        <div className="imposta-dist__col">
          {renderSezione('b2b')}
          {renderSezione('b2c')}
        </div>

        {/* ── Colonna 3: Strutture ricettive + Cluster ────────────────────── */}
        <div className="imposta-dist__col">
          <h3 className="imposta-dist__section-title">Strutture ricettive</h3>
          <div className="imposta-dist__filtro-strutture">
            <span>Città: <strong>{data.citta}</strong></span>
            <span>Categoria: <Stars n={data.categoria} /></span>
            <span className="imposta-dist__seleziona-label">Seleziona</span>
          </div>
          <div className="imposta-dist__strutture-list">
            {data.strutture.map((s) => (
              <label className="imposta-dist__struttura-row" key={s.id}>
                <span>{s.nome}</span>
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={s.selected}
                  onChange={() => toggleStruttura(s.id)}
                />
              </label>
            ))}
          </div>

          <div className="imposta-dist__cluster-form">
            <div className="imposta-dist__cluster-row imposta-dist__field-raw">
              <span className="imposta-dist__cluster-label">Nome</span>
              <input
                type="text"
                className="sib-input"
                value={data.nomeCluster}
                onChange={(e) => setData({ ...data, nomeCluster: e.target.value })}
              />
              <button type="button" className="sib-btn sib-btn--primary" onClick={creaCluster}>Crea Cluster</button>
            </div>
          </div>

          <h3 className="imposta-dist__cluster-title">Il tuo cluster</h3>
          <div className="imposta-dist__cluster-list">
            {data.cluster.map((c, i) => (
              <div className="imposta-dist__cluster-item" key={i}>
                <i className="fa-light fa-diagram-project" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card evidenziata: apre la sezione ingrandita su sfondo grigio ───────── */}
      {expanded && (
        <div className="imposta-dist__expand-backdrop" onClick={() => setExpanded(null)}>
          <div className="imposta-dist__expand-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="imposta-dist__expand-close" onClick={() => setExpanded(null)} aria-label="Chiudi">
              <i className="fa-light fa-xmark" />
            </button>
            {renderSezione(expanded, true)}
          </div>
        </div>
      )}
    </div>
  )
}

// Potenziale cliente: valore 0-5 (mock deterministico) reso con icona + "n/5"
const potenzialeOf = (id: number) => (id * 7 + 2) % 6

function Potenziale({ value }: { value: number }) {
  return (
    <span className="imposta-dist__pot" title={`Potenziale ${value}/5`}>
      <i className="fa-solid fa-hand-fist imposta-dist__pot-ico" aria-hidden="true" />
      <span className="imposta-dist__pot-val">{value}/5</span>
    </span>
  )
}

// Testata card: titolo + icona per evidenziare/ingrandire in modale
function SezioneHead({ label, onExpand }: { label: string; onExpand?: () => void }) {
  return (
    <div className="imposta-dist__sezione-head">
      <h3 className="imposta-dist__section-title">{label}</h3>
      {onExpand && (
        <button type="button" className="imposta-dist__expand-btn" onClick={onExpand} title="Ingrandisci" aria-label="Ingrandisci">
          <i className="fa-light fa-up-right-and-down-left-from-center" />
        </button>
      )}
    </div>
  )
}

// ─── SEZIONE CORPORATE ──────────────────────────────────────────────────────
function SezioneCorporate({
  label, rows, onToggle, onExpand,
}: {
  label: string
  rows: OperatoreCorporate[]
  onToggle: (id: number, field: 'contratto' | 'libera') => void
  onExpand?: () => void
}) {
  return (
    <div className="imposta-dist__sezione">
      <SezioneHead label={label} onExpand={onExpand} />
      <table className="sib-table imposta-dist__table">
        <thead>
          <tr>
            <th />
            <th className="imposta-dist__th-c">Potenziale</th>
            <th>Disponibilità<br />a contratto</th>
            <th>Disponibilità<br />libera</th>
            <th>Capacità<br />di spesa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.nome}</td>
              <td className="imposta-dist__td-c"><Potenziale value={potenzialeOf(r.id)} /></td>
              <td className="imposta-dist__td-c"><input type="checkbox" className="sib-checkbox" checked={r.contratto} onChange={() => onToggle(r.id, 'contratto')} /></td>
              <td className="imposta-dist__td-c"><input type="checkbox" className="sib-checkbox" checked={r.libera} onChange={() => onToggle(r.id, 'libera')} /></td>
              <td className="imposta-dist__td-c">
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className={'imposta-dist__euro' + (i < r.capacita ? ' imposta-dist__euro--on' : '')}>€</span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── SEZIONE GENERICA (Gruppi / B2B / B2C) ──────────────────────────────────
function SezioneGenerica({
  label, verifica, rows, onToggle, onExpand,
}: {
  label: string
  verifica?: boolean
  rows: OperatoreGenerico[]
  onToggle: (id: number, field: 'contratto' | 'libera') => void
  onExpand?: () => void
}) {
  return (
    <div className="imposta-dist__sezione">
      <SezioneHead label={label} onExpand={onExpand} />
      {verifica && (
        <div className="imposta-dist__verifica">
          <i className="fa-solid fa-shield-check" />
          <span>Verifica aderenza Budget dei ricavi</span>
        </div>
      )}
      <table className="sib-table imposta-dist__table">
        <thead>
          <tr>
            <th />
            <th className="imposta-dist__th-c">Potenziale</th>
            <th>Disponibilità<br />a contratto</th>
            <th>Disponibilità<br />libera</th>
            <th>Mercato di<br />riferimento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.nome}</td>
              <td className="imposta-dist__td-c"><Potenziale value={potenzialeOf(r.id)} /></td>
              <td className="imposta-dist__td-c"><input type="checkbox" className="sib-checkbox" checked={r.contratto} onChange={() => onToggle(r.id, 'contratto')} /></td>
              <td className="imposta-dist__td-c"><input type="checkbox" className="sib-checkbox" checked={r.libera} onChange={() => onToggle(r.id, 'libera')} /></td>
              <td className="imposta-dist__td-c">
                <span className="imposta-dist__bandiere">
                  {r.bandiere.map((code, i) => (
                    <img
                      key={i}
                      className="imposta-dist__bandiera"
                      src={`https://flagcdn.com/w40/${code}.png`}
                      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
                      alt={code.toUpperCase()}
                      title={code.toUpperCase()}
                      loading="lazy"
                    />
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span className="imposta-dist__stars">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={`fa-solid fa-star imposta-dist__star${i < n ? ' imposta-dist__star--on' : ''}`} />
      ))}
    </span>
  )
}
