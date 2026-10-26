import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { SearchField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import { avatarUrl } from '../../../core/avatar'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  CATEGORIE, EVENTI_INIZIALI, LIVELLI, UTENTI, dataOra, etichettaGiorno, eventoLive, giorno, ora, relativo, utente,
  type EventoLog, type Livello, type UtenteLog,
} from './logData'
import './LogDiSistema.sass'

// ─── Periodi e fasce del grafico ─────────────────────────────────────────────
type Periodo = 'ora' | 'oggi' | '24h' | '7g' | '30g'

const PERIODI: { id: Periodo; label: string }[] = [
  { id: 'ora', label: 'Ultima ora' },
  { id: 'oggi', label: 'Oggi' },
  { id: '24h', label: '24 ore' },
  { id: '7g', label: '7 giorni' },
  { id: '30g', label: '30 giorni' },
]

interface Fascia { da: number; a: number; label: string; asse: string }

const MIN = 60_000, ORA = 3600_000

/** Fasce del grafico per il periodo: 5 minuti, ore o giorni (giorni calcolati
 *  col calendario, così il cambio dell'ora legale non sposta i confini). */
function fasce(p: Periodo, adesso: number): Fascia[] {
  const hhmm = (t: number) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (p === 'ora') {
    const fine = Math.ceil(adesso / (5 * MIN)) * 5 * MIN
    return Array.from({ length: 12 }, (_, i) => {
      const da = fine - (12 - i) * 5 * MIN
      return { da, a: da + 5 * MIN, label: `${hhmm(da)}–${hhmm(da + 5 * MIN)}`, asse: hhmm(da) }
    })
  }
  if (p === 'oggi' || p === '24h') {
    const inizio = p === 'oggi' ? giorno(new Date(adesso)) : Math.ceil(adesso / ORA) * ORA - 24 * ORA
    return Array.from({ length: 24 }, (_, i) => {
      const da = inizio + i * ORA
      const giornoLbl = p === '24h' ? `${etichettaGiorno(giorno(new Date(da)))}, ` : ''
      return { da, a: da + ORA, label: `${giornoLbl}${hhmm(da)}–${hhmm(da + ORA)}`, asse: hhmm(da).slice(0, 2) }
    })
  }
  const n = p === '7g' ? 7 : 30
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(adesso); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (n - 1 - i))
    const e = new Date(d); e.setDate(e.getDate() + 1)
    return {
      da: d.getTime(), a: e.getTime(), label: etichettaGiorno(d.getTime()),
      asse: d.toLocaleDateString('it-IT', p === '7g' ? { weekday: 'short', day: 'numeric' } : { day: 'numeric' }),
    }
  })
}

// ─── Righe ───────────────────────────────────────────────────────────────────
interface Riga extends EventoLog {
  quando: number
  utente: string
  origine: string
}

const riga = (e: EventoLog): Riga => ({
  ...e, quando: e.ts.getTime(), utente: utente(e.utenteId).nome, origine: `${e.luogo} · ${e.ip} · ${e.dispositivo}`,
})

const LIVELLO_ICO: Record<Livello, string> = {
  Info: 'fa-circle-info', Avviso: 'fa-triangle-exclamation', Errore: 'fa-circle-xmark',
}

const COL_LABEL: Record<string, string> = {
  livello: 'Livello', utente: 'Utente', categoria: 'Categoria', evento: 'Evento', descrizione: 'Dettaglio',
  modulo: 'Modulo', origine: 'Origine', ruolo: 'Ruolo', stato: 'Stato', nome: 'Utente',
}

const PAGE_SIZES = [25, 50, 100]
const uniq = (xs: string[]) => Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b))

export default function LogDiSistema(_: { navigate: (p: string) => void }) {
  const [eventi, setEventi] = useState<EventoLog[]>(EVENTI_INIZIALI)
  const [attesa, setAttesa] = useState<EventoLog[]>([])
  const [nuovi, setNuovi] = useState<Set<string>>(new Set())
  const [live, setLive] = useState(true)
  const [adesso, setAdesso] = useState(Date.now())
  const [vista, setVista] = useState<'eventi' | 'utenti'>('eventi')
  const [periodo, setPeriodo] = useState<Periodo>('7g')
  const [fascia, setFascia] = useState<Fascia | null>(null)
  const [cerca, setCerca] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [apertoId, setApertoId] = useState<string | null>(null)
  const cf = useColFilters()

  // Tempi relativi ("3 min fa") sempre aggiornati
  useEffect(() => {
    const t = window.setInterval(() => setAdesso(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [])

  // ── Diretta: un nuovo evento ogni pochi secondi ────────────────────────────
  // In prima pagina e senza dettaglio aperto entra subito (lampeggia); altrimenti
  // resta in attesa dietro il pulsante "N nuovi eventi" per non spostare le righe.
  const inPrimaPagina = page === 1 && !apertoId
  const primaRef = useRef(inPrimaPagina)
  primaRef.current = inPrimaPagina
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => {
      const ev = eventoLive(EVENTI_INIZIALI)
      setAdesso(Date.now())
      if (primaRef.current) {
        setEventi(p => [ev, ...p])
        setNuovi(s => new Set(s).add(ev.id))
        window.setTimeout(() => setNuovi(s => { const n = new Set(s); n.delete(ev.id); return n }), 2600)
      } else {
        setAttesa(p => [ev, ...p])
      }
    }, 4200)
    return () => window.clearInterval(t)
  }, [live])

  const mostraNuovi = () => {
    setNuovi(new Set(attesa.map(e => e.id)))
    window.setTimeout(() => setNuovi(new Set()), 2600)
    setEventi(p => [...attesa, ...p])
    setAttesa([])
    setApertoId(null)
    setPage(1)
  }

  // ── Filtri ─────────────────────────────────────────────────────────────────
  const finestra = useMemo(() => fasce(periodo, adesso), [periodo, adesso])
  const da = finestra[0].da, a = Math.max(finestra[finestra.length - 1].a, adesso + 1)

  const righePeriodo = useMemo(
    () => eventi.filter(e => e.ts.getTime() >= da && e.ts.getTime() < a).map(riga),
    [eventi, da, a],
  )

  const matchCerca = (r: Riga) => {
    const q = cerca.trim().toLowerCase()
    return !q || [r.utente, r.evento, r.codice, r.descrizione, r.ip, r.id, r.modulo, r.luogo]
      .some(s => s.toLowerCase().includes(q))
  }

  const matchColonne = (r: Riga, salta?: string) =>
    (salta === 'livello' || cf.matchMulti(r.livello, 'livello')) &&
    cf.matchMulti(r.utente, 'utente') && cf.matchText(r.utente, 'utente') &&
    cf.matchMulti(r.categoria, 'categoria') &&
    cf.matchMulti(r.evento, 'evento') && cf.matchText(`${r.evento} ${r.codice}`, 'evento') &&
    cf.matchText(r.descrizione, 'descrizione') &&
    cf.matchMulti(r.modulo, 'modulo') &&
    cf.matchText(r.origine, 'origine')

  // Il grafico ignora la fascia selezionata (la evidenzia) e il filtro livello
  // (la legenda lo mostra acceso/spento): così resta leggibile mentre si filtra.
  const perGrafico = useMemo(
    () => righePeriodo.filter(r => matchCerca(r) && matchColonne(r, 'livello')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [righePeriodo, cerca, cf.text, cf.multi],
  )

  const righe = useMemo(() => {
    const f = perGrafico.filter(r =>
      cf.matchMulti(r.livello, 'livello') && (!fascia || (r.quando >= fascia.da && r.quando < fascia.a)))
    return cf.sortRows(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perGrafico, fascia, cf.multi, cf.sort])

  useEffect(() => { setPage(1) }, [cerca, periodo, fascia, cf.text, cf.multi, cf.sort, pageSize])
  useEffect(() => { setFascia(null) }, [periodo])

  const totalPages = Math.max(1, Math.ceil(righe.length / pageSize))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * pageSize
  const pageItems = righe.slice(pageStart, pageStart + pageSize)

  const perGiorno = useMemo(() => {
    const m = new Map<number, number>()
    righe.forEach(r => { const k = giorno(r.ts); m.set(k, (m.get(k) ?? 0) + 1) })
    return m
  }, [righe])

  // ── Dettaglio (pannello laterale) ──────────────────────────────────────────
  const aperto = apertoId ? righe.find(r => r.id === apertoId) ?? null : null
  const indice = aperto ? righe.indexOf(aperto) : -1
  const vai = (delta: number) => {
    const n = righe[indice + delta]
    if (!n) return
    setApertoId(n.id)
    const p = Math.floor((indice + delta) / pageSize) + 1
    if (p !== page) setPage(p)
  }

  useEffect(() => {
    if (!aperto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setApertoId(null)
      if (e.key === 'ArrowDown') { e.preventDefault(); vai(1) }
      if (e.key === 'ArrowUp') { e.preventDefault(); vai(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const soloUtente = (nome: string) => {
    cf.setMultiFor('utente', [nome])
    setVista('eventi')
    setApertoId(null)
  }

  // ── Chip dei filtri attivi ─────────────────────────────────────────────────
  const chip: { key: string; label: string; via: () => void }[] = []
  if (fascia) chip.push({ key: 'fascia', label: `Fascia: ${fascia.label}`, via: () => setFascia(null) })
  if (cerca.trim()) chip.push({ key: 'cerca', label: `Cerca: “${cerca.trim()}”`, via: () => setCerca('') })
  Object.entries(cf.multi).forEach(([k, vs]) => vs.forEach(v =>
    chip.push({ key: `${k}:${v}`, label: `${COL_LABEL[k] ?? k}: ${v}`, via: () => cf.toggleMulti(k, v) })))
  Object.entries(cf.text).forEach(([k, v]) => v && chip.push({
    key: `${k}:t`, label: `${COL_LABEL[k] ?? k} contiene “${v}”`, via: () => cf.setText(k, ''),
  }))
  const azzera = () => { cf.reset(); setFascia(null); setCerca('') }

  // ── Export ─────────────────────────────────────────────────────────────────
  const esporta = () => {
    exportTableToXls(
      'log-di-sistema.xlsx',
      ['ID', 'Data e ora', 'Livello', 'Utente', 'Email', 'Categoria', 'Evento', 'Codice', 'Dettaglio', 'Modulo', 'IP', 'Dispositivo', 'Luogo', 'Sessione', 'Modifiche'],
      righe.map(r => [
        r.id, dataOra(r.ts), r.livello, r.utente, utente(r.utenteId).email, r.categoria, r.evento, r.codice,
        r.descrizione, r.modulo, r.ip, r.dispositivo, r.luogo, r.sessione,
        r.modifiche.map(m => `${m.campo}: ${m.prima} → ${m.dopo}`).join('; '),
      ]),
      'Log di sistema',
    )
    toast.success(`Esportati ${righe.length} eventi in Excel`)
  }

  const ordinatoPerAltro = !!cf.sort && cf.sort.k !== 'quando'

  return (
    <div className="logs">
      <PageHead
        title="Log di sistema"
        subtitle="Chi ha fatto cosa, quando e da dove: accessi, operazioni e anomalie della piattaforma"
        actions={
          <>
            <Tooltip text={live ? 'Metti in pausa la diretta' : 'Riprendi la diretta: i nuovi eventi compaiono da soli'}>
              <button
                type="button"
                className={'logs__live' + (live ? ' is-on' : '')}
                aria-pressed={live}
                onClick={() => setLive(v => !v)}
              >
                <span className="logs__live-dot" aria-hidden="true" />
                {live ? 'In diretta' : 'In pausa'}
                <i className={`fa-solid ${live ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta in Excel gli eventi filtrati">
              <button type="button" className="sib-btn sib-btn--icon logs__xls" aria-label="Esporta in Excel" onClick={esporta}>
                <i className="fa-regular fa-file-xls" aria-hidden="true" />
              </button>
            </Tooltip>
          </>
        }
      />

      {/* ── Barra comandi: vista, periodo, ricerca ─────────────────────────── */}
      <div className="logs__bar">
        <div className="logs__seg" role="tablist" aria-label="Vista">
          {([['eventi', 'Eventi', 'fa-list-timeline'], ['utenti', 'Utenti', 'fa-users']] as const).map(([id, label, ico]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vista === id}
              className={vista === id ? 'is-on' : ''}
              onClick={() => { setVista(id); setApertoId(null) }}
            >
              <i className={`fa-solid ${ico}`} aria-hidden="true" />{label}
            </button>
          ))}
        </div>

        <div className="logs__seg logs__seg--light" role="radiogroup" aria-label="Periodo">
          {PERIODI.map(p => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={periodo === p.id}
              className={periodo === p.id ? 'is-on' : ''}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="logs__search">
          <SearchField
            placeholder="Cerca utente, evento, prenotazione, IP…"
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            onClear={() => setCerca('')}
          />
        </div>
      </div>

      <Attivita
        fasce={finestra}
        righe={perGrafico}
        periodo={periodo}
        fascia={fascia}
        onFascia={f => setFascia(cur => (cur && f && cur.da === f.da ? null : f))}
        livelli={cf.multi.livello ?? []}
        onLivello={l => cf.toggleMulti('livello', l)}
        adesso={adesso}
      />

      {chip.length > 0 && (
        <div className="logs__chips">
          <span className="logs__chips-lbl">Filtri attivi</span>
          {chip.map(c => (
            <button key={c.key} type="button" className="logs__chip" onClick={c.via} aria-label={`Rimuovi filtro ${c.label}`}>
              <TruncatedText text={c.label} />
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="logs__reset" onClick={azzera}>Azzera filtri</button>
        </div>
      )}

      {vista === 'eventi' ? (
        <>
          {attesa.length > 0 && (
            <button type="button" className="logs__nuovi" onClick={mostraNuovi}>
              <i className="fa-solid fa-arrow-up" aria-hidden="true" />
              {attesa.length === 1 ? '1 nuovo evento' : `${attesa.length} nuovi eventi`} — mostra
            </button>
          )}

          <div className="logs__wrap">
            <table className="sib-table logs__table">
              <colgroup>
                <col className="logs__w-liv" /><col className="logs__w-quando" /><col className="logs__w-utente" />
                <col className="logs__w-cat" /><col className="logs__w-evento" /><col className="logs__w-desc" />
                <col className="logs__w-mod" /><col className="logs__w-orig" /><col className="logs__w-chev" />
              </colgroup>
              <thead>
                <tr>
                  <th><span className="sib-colf-head"><ThLabel full="Livello" short="Liv." />{cf.th('livello', 'Livello', { options: LIVELLI })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Quando" />{cf.th('quando', 'Quando', { sort: true })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Utente" />{cf.th('utente', 'Utente', { options: UTENTI.map(u => u.nome), search: true })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Categoria" short="Cat." />{cf.th('categoria', 'Categoria', { options: Object.keys(CATEGORIE) })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Evento" />{cf.th('evento', 'Evento', { options: uniq(righePeriodo.map(r => r.evento)), search: true })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Dettaglio" />{cf.th('descrizione', 'Dettaglio', { search: true })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Modulo" short="Mod." />{cf.th('modulo', 'Modulo', { options: uniq(righePeriodo.map(r => r.modulo)) })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Origine" short="Orig." />{cf.th('origine', 'Origine', { search: true })}</span></th>
                  <th aria-label="Dettaglio evento" />
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="logs__vuoto">
                      <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                      <strong>Nessun evento con questi filtri</strong>
                      <span>Allarga il periodo o togli qualche filtro.</span>
                      {chip.length > 0 && <button type="button" className="logs__reset" onClick={azzera}>Azzera filtri</button>}
                    </td>
                  </tr>
                )}
                {pageItems.map((r, i) => {
                  const g = giorno(r.ts)
                  const sep = !ordinatoPerAltro && (i === 0 || giorno(pageItems[i - 1].ts) !== g)
                  return (
                    <React.Fragment key={r.id}>
                      {sep && (
                        <tr className="logs__day">
                          <td colSpan={9}>
                            <span>{etichettaGiorno(g)}</span>
                            <small>{perGiorno.get(g)} {perGiorno.get(g) === 1 ? 'evento' : 'eventi'}</small>
                          </td>
                        </tr>
                      )}
                      <RigaEvento
                        r={r}
                        adesso={adesso}
                        nuovo={nuovi.has(r.id)}
                        aperto={apertoId === r.id}
                        onApri={() => setApertoId(apertoId === r.id ? null : r.id)}
                      />
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            className="logs__pager"
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={righe.length}
            pageStart={pageStart}
            pageEnd={Math.min(pageStart + pageSize, righe.length)}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <VistaUtenti righe={perGrafico} tutti={eventi} adesso={adesso} periodo={periodo} onEventi={soloUtente} />
      )}

      {aperto && (
        <Dettaglio
          r={aperto}
          adesso={adesso}
          eventi={eventi}
          pos={indice + 1}
          tot={righe.length}
          onPrev={indice > 0 ? () => vai(-1) : undefined}
          onNext={indice < righe.length - 1 ? () => vai(1) : undefined}
          onClose={() => setApertoId(null)}
          onApri={id => {
            const k = righe.findIndex(x => x.id === id)
            if (k >= 0) { setApertoId(id); setPage(Math.floor(k / pageSize) + 1) }
            else toast.info('L’evento è fuori dai filtri attivi')
          }}
          onSoloUtente={soloUtente}
        />
      )}
    </div>
  )
}

// ─── Riga evento ─────────────────────────────────────────────────────────────
function Avatar({ u, size = 'sm' }: { u: UtenteLog; size?: 'sm' | 'lg' }) {
  return u.sistema
    ? <span className={`logs__av logs__av--sys logs__av--${size}`}><i className="fa-solid fa-plug" aria-hidden="true" /></span>
    : <img className={`logs__av logs__av--${size}`} src={avatarUrl(u.avatar)} alt="" />
}

function LivelloTag({ l }: { l: Livello }) {
  return (
    <span className={`logs__liv logs__liv--${l.toLowerCase()}`}>
      <i className={`fa-solid ${LIVELLO_ICO[l]}`} aria-hidden="true" />
      <span>{l}</span>
    </span>
  )
}

function RigaEvento({ r, adesso, nuovo, aperto, onApri }: {
  r: Riga; adesso: number; nuovo: boolean; aperto: boolean; onApri: () => void
}) {
  const u = utente(r.utenteId)
  const cls = ['logs__row', `logs__row--${r.livello.toLowerCase()}`, nuovo && 'is-new', aperto && 'is-open'].filter(Boolean).join(' ')
  return (
    <tr className={cls} onClick={onApri} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onApri() }}>
      <td><LivelloTag l={r.livello} /></td>
      <td>
        <Tooltip text={dataOra(r.ts)}>
          <span className="logs__quando">
            <strong>{ora(r.ts).slice(0, 5)}</strong>
            <small>{relativo(r.ts, adesso)}</small>
          </span>
        </Tooltip>
      </td>
      <td>
        <span className="logs__user">
          <Avatar u={u} />
          <TruncatedText text={u.nome} full={`${u.nome} · ${u.ruolo}`} />
        </span>
      </td>
      <td>
        <span className="logs__cat">
          <i className={`fa-solid ${CATEGORIE[r.categoria]}`} aria-hidden="true" />
          <TruncatedText text={r.categoria} />
        </span>
      </td>
      <td className="logs__evento"><TruncatedText text={r.evento} full={`${r.evento} (${r.codice})`} /></td>
      <td className="logs__muted"><TruncatedText text={r.descrizione} /></td>
      <td className="logs__muted"><TruncatedText text={r.modulo} /></td>
      <td className="logs__muted"><TruncatedText text={r.luogo} full={r.origine} /></td>
      <td className="logs__chev"><i className="fa-solid fa-chevron-right" aria-hidden="true" /></td>
    </tr>
  )
}

// ─── Grafico attività ────────────────────────────────────────────────────────
function Attivita({ fasce, righe, periodo, fascia, onFascia, livelli, onLivello, adesso }: {
  fasce: Fascia[]; righe: Riga[]; periodo: Periodo; fascia: Fascia | null
  onFascia: (f: Fascia | null) => void; livelli: string[]; onLivello: (l: Livello) => void; adesso: number
}) {
  const conteggi = useMemo(() => fasce.map(f => {
    const c: Record<Livello, number> = { Info: 0, Avviso: 0, Errore: 0 }
    righe.forEach(r => { if (r.quando >= f.da && r.quando < f.a) c[r.livello]++ })
    return c
  }), [fasce, righe])

  const totali = useMemo(() => {
    const c: Record<Livello, number> = { Info: 0, Avviso: 0, Errore: 0 }
    righe.forEach(r => { c[r.livello]++ })
    return c
  }, [righe])

  const visibili = (l: Livello) => livelli.length === 0 || livelli.includes(l)
  const max = Math.max(1, ...conteggi.map(c => LIVELLI.reduce((s, l) => s + (visibili(l) ? c[l] : 0), 0)))
  const passo = fasce.length > 24 ? 3 : fasce.length > 12 ? 2 : 1
  const titolo = PERIODI.find(p => p.id === periodo)!.label.toLowerCase()
  const utentiAttivi = new Set(righe.filter(r => !utente(r.utenteId).sistema).map(r => r.utenteId)).size

  return (
    <section className="logs__chart" aria-label="Attività nel periodo">
      <header className="logs__chart-head">
        <div>
          <h2>Attività · {periodo === 'oggi' ? 'oggi' : periodo === 'ora' ? 'ultima ora' : `ultimi ${titolo}`}</h2>
          <p>
            {righe.length.toLocaleString('it-IT')} eventi da {utentiAttivi} {utentiAttivi === 1 ? 'utente' : 'utenti'}
            {fascia ? <> · filtro sulla fascia <strong>{fascia.label}</strong></> : ' · clicca una barra per vedere solo quella fascia'}
          </p>
        </div>
        <div className="logs__legend" role="group" aria-label="Filtra per livello">
          {LIVELLI.map(l => (
            <Tooltip key={l} text={livelli.includes(l) ? `Togli il filtro ${l}` : `Mostra solo ${l}`}>
              <button
                type="button"
                className={`logs__leg logs__leg--${l.toLowerCase()}` + (livelli.includes(l) ? ' is-on' : '') + (!visibili(l) ? ' is-off' : '')}
                aria-pressed={livelli.includes(l)}
                onClick={() => onLivello(l)}
              >
                <i className={`fa-solid ${LIVELLO_ICO[l]}`} aria-hidden="true" />
                {l}
                <strong>{totali[l].toLocaleString('it-IT')}</strong>
              </button>
            </Tooltip>
          ))}
        </div>
      </header>

      <div className={'logs__bars' + (fascia ? ' has-sel' : '')}>
        {fasce.map((f, i) => {
          const c = conteggi[i]
          const futuro = f.da > adesso
          let y = 100
          const pezzi = LIVELLI.filter(visibili).map(l => {
            const h = (c[l] / max) * 100
            y -= h
            return { l, y, h }
          })
          const tot = LIVELLI.reduce((s, l) => s + c[l], 0)
          const sel = fascia?.da === f.da
          return (
            <Tooltip
              key={f.da}
              content={
                <span className="logs__tip">
                  <strong>{f.label}</strong>
                  {tot === 0 ? <span>Nessun evento</span> : LIVELLI.filter(l => c[l]).map(l => <span key={l}>{l}: {c[l]}</span>)}
                </span>
              }
            >
              <button
                type="button"
                className={'logs__col' + (sel ? ' is-sel' : '') + (futuro ? ' is-future' : '')}
                disabled={futuro}
                aria-label={`${f.label}: ${tot} eventi`}
                aria-pressed={sel}
                onClick={() => onFascia(f)}
              >
                <svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">
                  {pezzi.map(p => p.h > 0 && (
                    <rect key={p.l} className={`logs__seg-${p.l.toLowerCase()}`} x="0" y={p.y} width="10" height={p.h} />
                  ))}
                </svg>
                <span className={'logs__axis' + (i % passo ? ' is-hidden' : '')}>{f.asse}</span>
              </button>
            </Tooltip>
          )
        })}
      </div>
    </section>
  )
}

// ─── Pannello di dettaglio ───────────────────────────────────────────────────
function Dettaglio({ r, adesso, eventi, pos, tot, onPrev, onNext, onClose, onApri, onSoloUtente }: {
  r: Riga; adesso: number; eventi: EventoLog[]; pos: number; tot: number
  onPrev?: () => void; onNext?: () => void; onClose: () => void
  onApri: (id: string) => void; onSoloUtente: (nome: string) => void
}) {
  const u = utente(r.utenteId)
  const sessione = useMemo(() => {
    if (r.sessione === '—' || r.sessione === 'API') return []
    return eventi.filter(e => e.sessione === r.sessione).sort((x, y) => x.ts.getTime() - y.ts.getTime())
  }, [eventi, r.sessione])

  const copia = () => {
    navigator.clipboard?.writeText(r.id).catch(() => undefined)
    toast.success(`ID ${r.id} copiato`)
  }

  return (
    <>
      <div className="logs__scrim" onClick={onClose} />
      <aside className={`logs__drawer logs__drawer--${r.livello.toLowerCase()}`} role="dialog" aria-label={`Dettaglio evento ${r.id}`}>
        <header className="logs__dr-head">
          <div className="logs__dr-nav">
            <span className="logs__dr-pos">Evento {pos} di {tot.toLocaleString('it-IT')}</span>
            <Tooltip text="Evento precedente (↑)">
              <button type="button" aria-label="Evento precedente" disabled={!onPrev} onClick={onPrev}>
                <i className="fa-solid fa-chevron-up" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Evento successivo (↓)">
              <button type="button" aria-label="Evento successivo" disabled={!onNext} onClick={onNext}>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Chiudi (Esc)">
              <button type="button" aria-label="Chiudi" onClick={onClose}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          <div className="logs__dr-title">
            <span className="logs__dr-ico"><i className={`fa-solid ${CATEGORIE[r.categoria]}`} aria-hidden="true" /></span>
            <div>
              <LivelloTag l={r.livello} />
              <h3>{r.evento}</h3>
              <p>{r.descrizione}</p>
            </div>
          </div>
        </header>

        <div className="logs__dr-body">
          <div className="logs__dr-who">
            <Avatar u={u} size="lg" />
            <div>
              <strong>{u.nome}</strong>
              <span>{u.ruolo} · {u.email}</span>
            </div>
            {!u.sistema && (
              <button type="button" className="logs__link" onClick={() => onSoloUtente(u.nome)}>
                Solo i suoi eventi
              </button>
            )}
          </div>

          <dl className="logs__dr-meta">
            <div><dt>Quando</dt><dd>{dataOra(r.ts)}<small>{relativo(r.ts, adesso)}</small></dd></div>
            <div><dt>Categoria</dt><dd>{r.categoria}</dd></div>
            <div><dt>Modulo</dt><dd>{r.modulo}</dd></div>
            <div><dt>Codice evento</dt><dd className="logs__mono">{r.codice}</dd></div>
            <div><dt>Indirizzo IP</dt><dd className="logs__mono">{r.ip}</dd></div>
            <div><dt>Luogo</dt><dd>{r.luogo}</dd></div>
            <div><dt>Dispositivo</dt><dd>{r.dispositivo}</dd></div>
            <div><dt>Sessione</dt><dd className="logs__mono">{r.sessione}</dd></div>
          </dl>

          {r.modifiche.length > 0 && (
            <section className="logs__dr-sec">
              <h4>Cosa è cambiato</h4>
              <ul className="logs__diff">
                {r.modifiche.map(m => (
                  <li key={m.campo}>
                    <span className="logs__diff-campo">{m.campo}</span>
                    <span className="logs__diff-prima">{m.prima}</span>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    <span className="logs__diff-dopo">{m.dopo}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sessione.length > 1 && (
            <section className="logs__dr-sec">
              <h4>La stessa sessione <small>{sessione.length} eventi</small></h4>
              <ol className="logs__tl">
                {sessione.map(e => (
                  <li key={e.id} className={`logs__tl-item logs__tl-item--${e.livello.toLowerCase()}` + (e.id === r.id ? ' is-cur' : '')}>
                    <button type="button" onClick={() => onApri(e.id)} disabled={e.id === r.id}>
                      <span className="logs__tl-ora">{ora(e.ts).slice(0, 5)}</span>
                      <span className="logs__tl-txt">
                        <strong>{e.evento}</strong>
                        <small>{e.descrizione}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <footer className="logs__dr-foot">
          <span className="logs__mono">{r.id}</span>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={copia}>
            <i className="fa-regular fa-copy" aria-hidden="true" /> Copia ID
          </button>
        </footer>
      </aside>
    </>
  )
}

// ─── Vista utenti ────────────────────────────────────────────────────────────
interface RigaUtente {
  id: string
  nome: string
  ruolo: string
  stato: string
  ultima: number
  eventi: number
  anomalie: number
  trend: number[]
}

function VistaUtenti({ righe, tutti, adesso, periodo, onEventi }: {
  righe: Riga[]; tutti: EventoLog[]; adesso: number; periodo: Periodo; onEventi: (nome: string) => void
}) {
  const cf = useColFilters()
  const [aperto, setAperto] = useState<string | null>(null)

  const dati = useMemo<RigaUtente[]>(() => UTENTI.map(u => {
    const suoi = tutti.filter(e => e.utenteId === u.id)
    const ultimo = suoi[0]
    const online = !!ultimo && !u.sistema && adesso - ultimo.ts.getTime() < 30 * MIN && ultimo.codice !== 'LogOut'
    const nelPeriodo = righe.filter(r => r.utenteId === u.id)
    const oggi = giorno(new Date(adesso))
    const trend = Array.from({ length: 14 }, (_, i) => {
      const g0 = oggi - (13 - i) * 86400_000
      return suoi.filter(e => Math.abs(giorno(e.ts) - g0) < ORA * 2).length
    })
    return {
      id: u.id, nome: u.nome, ruolo: u.ruolo,
      stato: !u.attivo ? 'Disattivato' : u.sistema ? 'Integrazione' : online ? 'Online' : 'Non connesso',
      ultima: ultimo?.ts.getTime() ?? 0,
      eventi: nelPeriodo.length,
      anomalie: nelPeriodo.filter(r => r.livello !== 'Info').length,
      trend,
    }
  }), [righe, tutti, adesso])

  const lista = cf.sortRows(dati.filter(d =>
    cf.matchText(d.nome, 'nome') && cf.matchMulti(d.ruolo, 'ruolo') && cf.matchMulti(d.stato, 'stato')))
  const periodoLbl = PERIODI.find(p => p.id === periodo)!.label.toLowerCase()

  return (
    <div className="logs__wrap">
      <table className="sib-table logs__table logs__table--utenti">
        <colgroup>
          <col className="logs__wu-nome" /><col className="logs__wu-ruolo" /><col className="logs__wu-stato" />
          <col className="logs__wu-ultima" /><col className="logs__wu-num" /><col className="logs__wu-num" />
          <col className="logs__wu-trend" /><col className="logs__wu-az" />
        </colgroup>
        <thead>
          <tr>
            <th><span className="sib-colf-head"><ThLabel full="Utente" />{cf.th('nome', 'Utente', { search: true, sort: true })}</span></th>
            <th><span className="sib-colf-head"><ThLabel full="Ruolo" />{cf.th('ruolo', 'Ruolo', { options: uniq(UTENTI.map(u => u.ruolo)) })}</span></th>
            <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'Stato', { options: ['Online', 'Non connesso', 'Integrazione', 'Disattivato'] })}</span></th>
            <th><span className="sib-colf-head"><ThLabel full="Ultima attività" short="Ult. attività" />{cf.th('ultima', 'Ultima attività', { sort: true })}</span></th>
            <th className="logs__num"><span className="sib-colf-head"><ThLabel full={`Eventi (${periodoLbl})`} short="Eventi" />{cf.th('eventi', 'Eventi', { sort: true })}</span></th>
            <th className="logs__num"><span className="sib-colf-head"><ThLabel full="Anomalie" short="Anom." />{cf.th('anomalie', 'Anomalie', { sort: true })}</span></th>
            <th><ThLabel full="Ultimi 14 giorni" short="14 gg" /></th>
            <th aria-label="Azioni" />
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 && (
            <tr><td colSpan={8} className="logs__vuoto"><strong>Nessun utente con questi filtri</strong></td></tr>
          )}
          {lista.map(d => {
            const u = utente(d.id)
            const open = aperto === d.id
            const ultimi = tutti.filter(e => e.utenteId === d.id).slice(0, 6)
            const max = Math.max(1, ...d.trend)
            const punti = d.trend.map((v, i) => `${(i / 13) * 100},${28 - (v / max) * 24}`).join(' ')
            return (
              <React.Fragment key={d.id}>
                <tr className={'logs__row' + (open ? ' is-open' : '')} onClick={() => setAperto(open ? null : d.id)}>
                  <td>
                    <span className="logs__user">
                      <Avatar u={u} />
                      <TruncatedText text={d.nome} full={`${d.nome} · ${u.email}`} />
                    </span>
                  </td>
                  <td className="logs__muted"><TruncatedText text={d.ruolo} /></td>
                  <td>
                    <span className={`logs__stato logs__stato--${d.stato.toLowerCase().replace(' ', '-')}`}>
                      <span aria-hidden="true" />{d.stato}
                    </span>
                  </td>
                  <td>
                    {d.ultima
                      ? <Tooltip text={dataOra(new Date(d.ultima))}><span>{relativo(new Date(d.ultima), adesso)}</span></Tooltip>
                      : <span className="logs__muted">—</span>}
                  </td>
                  <td className="logs__num"><strong>{d.eventi}</strong></td>
                  <td className="logs__num">
                    {d.anomalie > 0
                      ? <span className="logs__anom">{d.anomalie}</span>
                      : <span className="logs__muted">0</span>}
                  </td>
                  <td>
                    <svg className="logs__spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-label={`Attività degli ultimi 14 giorni: ${d.trend.join(', ')}`}>
                      <polyline points={`0,30 ${punti} 100,30`} className="logs__spark-area" />
                      <polyline points={punti} className="logs__spark-line" />
                    </svg>
                  </td>
                  <td className="logs__az">
                    <Tooltip text={`Vedi gli eventi di ${d.nome}`}>
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        aria-label={`Vedi gli eventi di ${d.nome}`}
                        onClick={e => { e.stopPropagation(); onEventi(d.nome) }}
                      >
                        <i className="fa-solid fa-list-timeline" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <i className={'fa-solid fa-chevron-down logs__exp' + (open ? ' is-open' : '')} aria-hidden="true" />
                  </td>
                </tr>
                {open && (
                  <tr className="logs__detail-row">
                    <td colSpan={8}>
                      {ultimi.length === 0 ? (
                        <p className="logs__muted">Nessuna attività registrata.</p>
                      ) : (
                        <ol className="logs__tl logs__tl--h">
                          {ultimi.map(e => (
                            <li key={e.id} className={`logs__tl-item logs__tl-item--${e.livello.toLowerCase()}`}>
                              <span className="logs__tl-ora">{relativo(e.ts, adesso)}</span>
                              <span className="logs__tl-txt">
                                <strong>{e.evento}</strong>
                                <small><TruncatedText text={e.descrizione} /></small>
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
