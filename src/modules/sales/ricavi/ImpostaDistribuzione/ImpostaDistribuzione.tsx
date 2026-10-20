import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../../core/components/PageHead'
import TruncatedText from '../../../../core/components/TruncatedText'
import Tooltip from '../../../../core/components/Tooltip'
import Modal from '../../../../core/components/Modal'
import EmptyState from '../../../../core/components/EmptyState'
import FlagCircle from '../../../../core/components/FlagCircle'
import { countryName } from '../../../../core/utils/countryFlags'
import { SelectField, InputField, SearchField, ToggleSwitch } from '../../../../core/components/form'
import { apiFetchSibylla } from '../../../../services/api'
import { useAccessStore } from '../../../../store/useAccessStore'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import ImpostaDistribuzioneTO from './ImpostaDistribuzioneTO'
import './ImpostaDistribuzione.sass'
import { useStrutturaCorrente, useStruttureCliente } from '../../../../hooks/useStrutturaCorrente'
import { idStruttura } from '../../../../core/demo/struttureDemo'

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

type CanaleKey = 'corporate' | 'gruppi' | 'b2b' | 'b2c'
type Operatore = OperatoreCorporate | OperatoreGenerico

// Canali di vendita: colore = slot della palette grafici (ordine fisso, vedi
// --chart-*), icona Font Awesome e descrizione mostrata sotto il titolo.
const CANALI: { key: CanaleKey; label: string; icon: string; desc: string }[] = [
  { key: 'corporate', label: 'Corporate', icon: 'fa-briefcase',    desc: 'Aziende con accordo tariffario' },
  { key: 'gruppi',    label: 'Gruppi',    icon: 'fa-people-group', desc: 'Tour operator e agenzie per gruppi' },
  { key: 'b2b',       label: 'B2B',       icon: 'fa-handshake',    desc: 'Intermediari e reti commerciali' },
  { key: 'b2c',       label: 'B2C',       icon: 'fa-globe',        desc: 'Portali rivolti al cliente finale' },
]

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Archimede' }],
  StrutturaId: 1,
  attenzione: true,
  corporate: [
    { id: 1, nome: 'Ferservizi',                  contratto: true,  libera: false, capacita: 2 },
    { id: 2, nome: 'Italcamel',                   contratto: false, libera: true,  capacita: 3 },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, capacita: 1 },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: true,  libera: true,  capacita: 2 },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, capacita: 1 },
    { id: 6, nome: 'Rimini Business Travel',      contratto: false, libera: false, capacita: 2 },
    { id: 7, nome: 'Adriatica Congressi',         contratto: false, libera: true,  capacita: 1 },
  ],
  gruppi: [
    { id: 1, nome: 'Ferservizi',                  contratto: false, libera: true,  bandiere: ['it','es','de'] },
    { id: 2, nome: 'Italcamel',                   contratto: true,  libera: false, bandiere: ['pt','it'] },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 5, nome: 'Malatesta',                   contratto: true,  libera: true,  bandiere: ['pt','it'] },
    { id: 6, nome: 'Titano Group Tours',          contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 7, nome: 'Pacific Gateway',             contratto: false, libera: false, bandiere: ['us','kr'] },
  ],
  b2b: [
    { id: 1, nome: 'Ferservizi',                  contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 2, nome: 'Italcamel',                   contratto: false, libera: true,  bandiere: ['pt','it'] },
    { id: 3, nome: 'San Marino Events',           contratto: true,  libera: false, bandiere: ['ch','se','fi'] },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['ch'] },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 6, nome: 'Hotelbeds',                   contratto: true,  libera: true,  bandiere: ['it'] },
    { id: 7, nome: 'Pacific Gateway',             contratto: false, libera: false, bandiere: ['us','kr'] },
  ],
  b2c: [
    { id: 1, nome: 'Booking.com',                 contratto: true,  libera: true,  bandiere: ['it','es','de'] },
    { id: 2, nome: 'Expedia',                     contratto: false, libera: true,  bandiere: ['pt','it'] },
    { id: 3, nome: 'San Marino Events',           contratto: false, libera: false, bandiere: ['ch','se','fi'] },
    { id: 4, nome: 'San Marino Viaggi e Vacanze', contratto: false, libera: false, bandiere: ['it','es','de'] },
    { id: 5, nome: 'Malatesta',                   contratto: false, libera: false, bandiere: ['pt','it'] },
    { id: 6, nome: 'Airbnb',                      contratto: false, libera: true,  bandiere: ['ch','se','fi'] },
    { id: 7, nome: 'Trip.com',                    contratto: false, libera: false, bandiere: ['us','kr'] },
  ],
  citta: 'Roma',
  categoria: 3,
  strutture: [
    { id: 1, nome: 'Hotel Domus Aurelia',           selected: true },
    { id: 2, nome: 'Grand Hotel Colonna Romana',    selected: false },
    { id: 3, nome: 'Palazzo Aventino Suites',       selected: true },
    { id: 4, nome: 'Hotel Fontana Imperiale',       selected: false },
    { id: 5, nome: 'Residenza Foro Antico',         selected: false },
    { id: 6, nome: 'Hotel Villa Quirinale',         selected: false },
    { id: 7, nome: 'Palazzo Trastevere Boutique Hotel', selected: false },
    { id: 8, nome: 'Hotel Pantheon Royal',          selected: false },
    { id: 9, nome: 'Residenza Navona',              selected: false },
    { id: 10, nome: 'Hotel Celio Garden',           selected: false },
  ],
  nomeCluster: '',
  cluster: ['Centro Storico Roma'],
}

const attivo = (r: Operatore) => r.contratto || r.libera

const filtraNome = <T extends { nome: string }>(rows: T[], q: string) =>
  !q.trim() ? rows : rows.filter((r) => r.nome.toLowerCase().includes(q.trim().toLowerCase()))

const iniziali = (nome: string) =>
  nome.split(/\s+/).filter((w) => /^[A-Za-zÀ-ú]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function ImpostaDistribuzione({ navigate }: { navigate: (p: string) => void }) {
  // Pagina condivisa: i Tour Operator vedono una versione dedicata (distribuzione
  // per destinazione/struttura/mercato); gli altri moduli la versione standard.
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist ? assist.moduli : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  const isTO = moduli?.includes('tour-operator')
  const confirm = useConfirmStore(s => s.confirm)

  // Strutture (con camere) del cliente, a partire da quella selezionata in alto.
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const schede = useStruttureCliente()
  const struttureCliente = schede.filter((x) => x.camere > 0).map((x) => ({ Id: idStruttura(x.nome), nome: x.nome }))
  const [data, setData] = useState<Data>(() => ({ ...FALLBACK, Strutture: struttureCliente, StrutturaId: idStruttura(strutturaCorrente) }))
  useEffect(() => {
    setData((d) => ({ ...d, Strutture: struttureCliente, StrutturaId: idStruttura(strutturaCorrente) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schede, strutturaCorrente])

  const [q, setQ] = useState('')
  const [invitaOpen, setInvitaOpen] = useState(false)
  const [invita, setInvita] = useState({ azienda: '', email: '', referente: '' })
  const [expanded, setExpanded] = useState<CanaleKey | null>(null)
  // Numero di strutture di ciascun cluster (il BE restituisce solo i nomi)
  const [clusterSize, setClusterSize] = useState<Record<string, number>>({ 'Centro Storico Roma': 4 })
  const [ultimoCluster, setUltimoCluster] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('distribuzione/GetImposta', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const submitInvita = async () => {
    if (!invita.azienda.trim() || !invita.email.trim()) return
    try { await apiFetchSibylla('distribuzione/InvitaOperatore', { method: 'POST', body: invita }) } catch {}
    setInvita({ azienda: '', email: '', referente: '' })
    setInvitaOpen(false)
  }

  const toggleField = (section: CanaleKey, id: number, field: 'contratto' | 'libera') => {
    setData((prev) => ({
      ...prev,
      [section]: (prev[section] as Operatore[]).map((r) => r.id === id ? { ...r, [field]: !r[field] } : r),
    }))
  }

  const setTuttiCanale = (section: CanaleKey, field: 'contratto' | 'libera', value: boolean) => {
    setData((prev) => ({ ...prev, [section]: (prev[section] as Operatore[]).map((r) => ({ ...r, [field]: value })) }))
  }

  const toggleStruttura = (id: number) =>
    setData((d) => ({ ...d, strutture: d.strutture.map((s) => s.id === id ? { ...s, selected: !s.selected } : s) }))

  const selezionate = data.strutture.filter((s) => s.selected).length
  const toggleTutteStrutture = () => {
    const all = selezionate < data.strutture.length
    setData((d) => ({ ...d, strutture: d.strutture.map((s) => ({ ...s, selected: all })) }))
  }

  const creaCluster = () => {
    const nome = data.nomeCluster.trim()
    if (!nome || !selezionate) return
    setData((d) => ({ ...d, cluster: [nome, ...d.cluster.filter((c) => c !== nome)], nomeCluster: '' }))
    setClusterSize((m) => ({ ...m, [nome]: selezionate }))
    setUltimoCluster(nome)
  }

  const eliminaCluster = async (nome: string) => {
    const ok = await confirm({ title: 'Elimina cluster', message: <>Eliminare il cluster <strong>{nome}</strong>?</>, confirmLabel: 'Elimina' })
    if (ok) setData((d) => ({ ...d, cluster: d.cluster.filter((c) => c !== nome) }))
  }

  const rowsOf = (key: CanaleKey) => data[key] as Operatore[]

  if (isTO) return <ImpostaDistribuzioneTO navigate={navigate} />

  return (
    <div className="imposta-dist">
      <PageHead
        title="Imposta distribuzione"
        subtitle="Gestione della distribuzione delle camere per i diversi canali di vendita"
        actions={
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setInvitaOpen(true)}>
            <i className="fa-regular fa-envelope" /> Invita nuovo operatore
          </button>
        }
      />

      {data.attenzione && (
        <div className="imposta-dist__alert" role="status">
          <span className="imposta-dist__alert-icon"><i className="fa-solid fa-triangle-exclamation" /></span>
          <div className="imposta-dist__alert-text">
            <strong>Budget dei ricavi da configurare</strong>
            <span>Per una distribuzione ottimale delle camere configura prima il budget dei ricavi.</span>
          </div>
          <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => navigate('budget-ricavi')}>
            Configura budget <i className="fa-solid fa-arrow-right" />
          </button>
          <button type="button" className="imposta-dist__alert-close" onClick={() => setData({ ...data, attenzione: false })} aria-label="Chiudi avviso">
            <i className="fa-light fa-xmark" />
          </button>
        </div>
      )}

      <div className="imposta-dist__toolbar">
        <SelectField
          label="Struttura"
          name="strutture"
          className="imposta-dist__select"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
        />
        <SearchField
          className="imposta-dist__search"
          placeholder="Cerca operatore…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ('')}
        />
      </div>

      <div className="imposta-dist__layout">
        <div className="imposta-dist__workspace">
          {CANALI.map((c) => (
            <CanaleCard
              key={c.key}
              canale={c}
              rows={rowsOf(c.key)}
              q={q}
              verifica={c.key !== 'corporate'}
              onToggle={(id, f) => toggleField(c.key, id, f)}
              onTutti={(f, v) => setTuttiCanale(c.key, f, v)}
              onExpand={() => setExpanded(c.key)}
            />
          ))}
        </div>

        <aside className="imposta-dist__cluster">
          <div className="imposta-dist__panel">
            <div className="imposta-dist__panel-head">
              <span className="imposta-dist__panel-icon"><i className="fa-solid fa-diagram-project" /></span>
              <div>
                <h3 className="imposta-dist__panel-title">Cluster competitivo</h3>
                <p className="imposta-dist__panel-sub">Strutture ricettive con cui confrontare la distribuzione</p>
              </div>
            </div>

            <div className="imposta-dist__filtro">
              <span><i className="fa-solid fa-location-dot" /> {data.citta}</span>
              <Stars n={data.categoria} />
              <button type="button" className="imposta-dist__link" onClick={toggleTutteStrutture}>
                {selezionate < data.strutture.length ? 'Seleziona tutte' : 'Deseleziona'}
              </button>
            </div>

            <ul className="imposta-dist__strutture">
              {data.strutture.map((s) => (
                <li key={s.id}>
                  <label className={clsx('imposta-dist__struttura', s.selected && 'is-selected')}>
                    <input type="checkbox" className="sib-checkbox" checked={s.selected} onChange={() => toggleStruttura(s.id)} />
                    <TruncatedText text={s.nome} className="sib-truncate imposta-dist__struttura-nome" />
                  </label>
                </li>
              ))}
            </ul>

            <div className="imposta-dist__crea">
              <InputField
                label="Nome cluster"
                name="nomeCluster"
                placeholder="Es. Centro Storico Roma"
                value={data.nomeCluster}
                onChange={(e) => setData({ ...data, nomeCluster: e.target.value })}
                hint={`${selezionate} ${selezionate === 1 ? 'struttura selezionata' : 'strutture selezionate'}`}
              />
              <button type="button" className="sib-btn sib-btn--primary" onClick={creaCluster} disabled={!data.nomeCluster.trim() || !selezionate}>
                <i className="fa-solid fa-plus" /> Crea cluster
              </button>
            </div>

            <h4 className="imposta-dist__cluster-title">I tuoi cluster</h4>
            {data.cluster.length === 0 ? (
              <p className="imposta-dist__cluster-vuoto">Nessun cluster creato.</p>
            ) : (
              <ul className="imposta-dist__cluster-list">
                {data.cluster.map((c) => (
                  <li key={c} className={clsx('imposta-dist__cluster-item', c === ultimoCluster && 'is-new')}>
                    <i className="fa-solid fa-diagram-project" />
                    <TruncatedText text={c} className="sib-truncate imposta-dist__cluster-nome" />
                    {clusterSize[c] != null && <span className="imposta-dist__cluster-n">{clusterSize[c]} strutture</span>}
                    <Tooltip text="Elimina cluster">
                      <button type="button" className="imposta-dist__cluster-del" onClick={() => eliminaCluster(c)} aria-label={`Elimina ${c}`}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <Modal open={invitaOpen} onClose={() => setInvitaOpen(false)} title="Invita nuovo operatore">
        <p className="imposta-dist__modal-sub">
          Inserisci i dati di un referente e invita un nuovo operatore.
          Riceverai Sibylla Token nel momento della sua registrazione.
        </p>
        <div className="imposta-dist__modal-fields">
          <InputField label="Nome azienda" name="azienda" required value={invita.azienda} onChange={(e) => setInvita({ ...invita, azienda: e.target.value })} />
          <InputField label="Email" name="email" type="email" required value={invita.email} onChange={(e) => setInvita({ ...invita, email: e.target.value })} />
          <InputField label="Referente" name="referente" value={invita.referente} onChange={(e) => setInvita({ ...invita, referente: e.target.value })} />
        </div>
        <div className="imposta-dist__modal-actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setInvitaOpen(false)}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={submitInvita} disabled={!invita.azienda.trim() || !invita.email.trim()}>
            <i className="fa-solid fa-paper-plane" /> Invita
          </button>
        </div>
      </Modal>

      <Modal open={!!expanded} onClose={() => setExpanded(null)} size="xl" className="imposta-dist__expand">
        {expanded && (
          <CanaleCard
            canale={CANALI.find((c) => c.key === expanded)!}
            rows={rowsOf(expanded)}
            q={q}
            verifica={expanded !== 'corporate'}
            onToggle={(id, f) => toggleField(expanded, id, f)}
            onTutti={(f, v) => setTuttiCanale(expanded, f, v)}
            onClose={() => setExpanded(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// ─── CARD CANALE ──────────────────────────────────────────────────────────────
function CanaleCard({
  canale, rows, q, verifica, onToggle, onTutti, onExpand, onClose,
}: {
  canale: (typeof CANALI)[number]
  rows: Operatore[]
  q: string
  verifica?: boolean
  onToggle: (id: number, field: 'contratto' | 'libera') => void
  onTutti: (field: 'contratto' | 'libera', value: boolean) => void
  onExpand?: () => void
  onClose?: () => void
}) {
  const fRows = filtraNome(rows, q)
  const isCorporate = canale.key === 'corporate'
  const tuttiContratto = rows.length > 0 && rows.every((r) => r.contratto)

  return (
    <section className={clsx('imposta-dist__card', `imposta-dist__card--${canale.key}`)}>
      <header className="imposta-dist__card-head">
        <span className="imposta-dist__card-icon"><i className={`fa-solid ${canale.icon}`} /></span>
        <div className="imposta-dist__card-titles">
          <h3 className="imposta-dist__card-title">{canale.label}</h3>
          <span className="imposta-dist__card-desc">{canale.desc}</span>
        </div>
        {verifica && (
          <span className="imposta-dist__verifica"><i className="fa-solid fa-shield-check" /> Verifica aderenza Budget dei ricavi</span>
        )}
        <div className="imposta-dist__card-tools">
          <Tooltip text={tuttiContratto ? 'Togli tutti dal contratto' : 'Metti tutti a contratto'}>
            <button type="button" className="imposta-dist__tool" onClick={() => onTutti('contratto', !tuttiContratto)} aria-label="Tutti a contratto">
              <i className={tuttiContratto ? 'fa-solid fa-square-minus' : 'fa-solid fa-square-check'} />
            </button>
          </Tooltip>
          {onExpand && (
            <Tooltip text="Ingrandisci">
              <button type="button" className="imposta-dist__tool" onClick={onExpand} aria-label="Ingrandisci">
                <i className="fa-solid fa-up-right-and-down-left-from-center" />
              </button>
            </Tooltip>
          )}
          {onClose && (
            <button type="button" className="imposta-dist__tool" onClick={onClose} aria-label="Chiudi">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </header>

      {fRows.length === 0 ? (
        <EmptyState icon="magnifying-glass" title="Nessun operatore" subtitle={`Nessun risultato per "${q}" in ${canale.label}.`} />
      ) : (
        <table className="sib-table imposta-dist__table">
          <colgroup>
            <col className="imposta-dist__col-nome" />
            <col className="imposta-dist__col-sw" />
            <col className="imposta-dist__col-sw" />
            <col className="imposta-dist__col-extra" />
          </colgroup>
          <thead>
            <tr>
              <th>Operatore</th>
              <th className="imposta-dist__th-c"><TruncatedText text="Contratto" full="Disponibilità a contratto" className="sib-truncate" /></th>
              <th className="imposta-dist__th-c"><TruncatedText text="Libera" full="Disponibilità libera" className="sib-truncate" /></th>
              <th className="imposta-dist__th-c">
                {isCorporate
                  ? <TruncatedText text="Capacità" full="Capacità di spesa" className="sib-truncate" />
                  : <TruncatedText text="Mercato" full="Mercato di riferimento" className="sib-truncate" />}
              </th>
            </tr>
          </thead>
          <tbody>
            {fRows.map((r) => (
              <tr key={r.id} className={clsx(attivo(r) && 'is-active')}>
                <td>
                  <span className="imposta-dist__op">
                    <span className="imposta-dist__op-avatar">{iniziali(r.nome)}</span>
                    <TruncatedText text={r.nome} className="sib-truncate imposta-dist__op-nome" />
                  </span>
                </td>
                <td className="imposta-dist__td-c">
                  <ToggleSwitch checked={r.contratto} onChange={() => onToggle(r.id, 'contratto')} className="imposta-dist__switch" />
                </td>
                <td className="imposta-dist__td-c">
                  <ToggleSwitch checked={r.libera} onChange={() => onToggle(r.id, 'libera')} className="imposta-dist__switch" />
                </td>
                <td className="imposta-dist__td-c">
                  {'capacita' in r ? <CapacitaSpesa value={r.capacita} /> : <Mercato codes={r.bandiere} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function CapacitaSpesa({ value }: { value: Capacita }) {
  const label = ['', 'Bassa', 'Media', 'Alta'][value]
  return (
    <Tooltip text={`Capacità di spesa: ${label}`}>
      <span className="imposta-dist__euro-wrap">
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} className={clsx('imposta-dist__euro', i < value && 'is-on')}>€</span>
        ))}
      </span>
    </Tooltip>
  )
}

// Mercati di riferimento: ogni bandiera ha il suo tooltip col nome del paese;
// oltre la terza, il "+N" elenca i mercati nascosti.
function Mercato({ codes }: { codes: string[] }) {
  const vis = codes.slice(0, 3)
  const altri = codes.slice(3)
  return (
    <span className="imposta-dist__flags">
      {vis.map((c) => (
        <Tooltip key={c} text={countryName(c)}>
          <span className="imposta-dist__flag-wrap">
            <FlagCircle code={c} size={18} className="imposta-dist__flag" />
          </span>
        </Tooltip>
      ))}
      {altri.length > 0 && (
        <Tooltip text={altri.map(countryName).join(', ')}>
          <span className="imposta-dist__flag-more">+{altri.length}</span>
        </Tooltip>
      )}
    </span>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span className="imposta-dist__stars" aria-label={`${n} stelle`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={clsx('fa-solid fa-star imposta-dist__star', i < n && 'is-on')} />
      ))}
    </span>
  )
}
