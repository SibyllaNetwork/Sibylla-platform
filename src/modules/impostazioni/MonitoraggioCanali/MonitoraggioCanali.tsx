import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { SearchField, SelectField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import { apiFetchSibylla } from '../../../services/api'
import { useStruttureCliente, useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  PERIODI, dataOra, etichettaGiorno, fasce, giorno, ora, relativo, type Fascia, type Periodo,
} from '../LogDiSistema/logData'
import {
  CAMERE, CANALI, ESITI, OPERAZIONE_ICO, OPERAZIONI, ORIGINI, SIGLA,
  generaInvii, lottoLive, risolvi, ritrasmesso, type Esito, type Invio, type Operazione,
} from './canaliData'
// Barra comandi, diretta, chip dei filtri e pannello di dettaglio sono quelli
// del Log di sistema: stesso linguaggio visivo per tutto il Registro di sistema.
import '../LogDiSistema/LogDiSistema.sass'
import './MonitoraggioCanali.sass'

const MIN = 60_000

const ESITO_ICO: Record<Esito, string> = {
  'Consegnato': 'fa-circle-check', 'Ritrasmesso': 'fa-rotate', 'Errore': 'fa-circle-xmark', 'In coda': 'fa-hourglass-half',
}
const esitoCls = (e: Esito) => e.toLowerCase().replace(' ', '-')

const COL_LABEL: Record<string, string> = {
  esito: 'Esito', canale: 'Canale', operazione: 'Operazione', camera: 'Camera', periodo: 'Periodo', origine: 'Origine',
}

/** Righe del vecchio endpoint (Movimenti) → invii, se il BE risponde. */
interface MovimentoBE { id: number; tipoOperazione: string; valore: number; canale: string; utente: string; tipoCamera: string; dataModifica: string; errore: string }
const daBackend = (m: MovimentoBE): Invio => {
  const ts = new Date(m.dataModifica)
  const op = (OPERAZIONI as string[]).includes(m.tipoOperazione) ? m.tipoOperazione as Operazione : 'Tariffa'
  const ok = !m.errore
  return {
    id: `BE-${m.id}`, lotto: `BE-${m.id}`, ts, canale: m.canale || 'Tutti i canali', operazione: op, camera: m.tipoCamera || 'Tutte',
    periodo: '—', prima: '—', dopo: op === 'Tariffa' ? `${m.valore} €` : String(m.valore), origine: m.utente,
    esito: ok ? 'Consegnato' : 'Errore', ms: 0, codice: ok ? '200' : '—', messaggio: m.errore || 'Accettato dal canale',
    tentativi: [{ ts, ok, nota: m.errore || 'Accettato dal canale' }],
  }
}

interface Riga extends Invio { quando: number }
const riga = (i: Invio): Riga => ({ ...i, quando: i.ts.getTime() })

const PAGE_SIZES = [25, 50, 100]

export default function MonitoraggioCanali(_: { navigate: (p: string) => void }) {
  const schede = useStruttureCliente()
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const [struttura, setStruttura] = useState<string>(strutturaCorrente || schede[0]?.nome || '')
  useEffect(() => { if (strutturaCorrente) setStruttura(strutturaCorrente) }, [strutturaCorrente])
  const scheda = schede.find(s => s.nome === struttura) ?? schede[0]
  const livello = !scheda ? 1 : scheda.stelle >= 5 ? 1.6 : scheda.stelle === 4 ? 1.1 : 0.85

  const [invii, setInvii] = useState<Invio[]>(() => generaInvii(scheda?.seme ?? 1, livello))
  const [guasti, setGuasti] = useState<Set<string>>(new Set(['Expedia']))
  const [nuovi, setNuovi] = useState<Set<string>>(new Set())
  const [live, setLive] = useState(true)
  const [adesso, setAdesso] = useState(Date.now())
  const [periodo, setPeriodo] = useState<Periodo>('24h')
  const [fascia, setFascia] = useState<(Fascia & { canale: string }) | null>(null)
  const [cerca, setCerca] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [apertoId, setApertoId] = useState<string | null>(null)
  const cf = useColFilters()

  // Cambio struttura: invii della struttura (dal BE se risponde, altrimenti demo)
  useEffect(() => {
    let annullato = false
    setInvii(generaInvii(scheda?.seme ?? 1, livello))
    setGuasti(new Set(['Expedia']))
    setApertoId(null)
    apiFetchSibylla<{ Movimenti: MovimentoBE[] }>('configura/GetMonitoraggioCanali', {
      method: 'POST', body: { strutturaId: scheda?.id ?? null, allaData: new Date().toISOString().slice(0, 10) },
    })
      .then(d => { if (!annullato && d?.Movimenti?.length) setInvii(d.Movimenti.map(daBackend).sort((a, b) => +b.ts - +a.ts)) })
      .catch(() => undefined)
    return () => { annullato = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [struttura])

  useEffect(() => {
    const t = window.setInterval(() => setAdesso(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [])

  // ── Diretta: una modifica ogni pochi secondi parte verso tutti i canali ─────
  const guastiRef = useRef(guasti)
  guastiRef.current = guasti
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => {
      const lotto = lottoLive(livello)
      setAdesso(Date.now())
      setInvii(p => [...lotto.slice().reverse(), ...p])
      setNuovi(s => { const n = new Set(s); lotto.forEach(i => n.add(i.id)); return n })
      lotto.forEach((i, k) => window.setTimeout(() => {
        setInvii(p => p.map(x => (x.id === i.id ? risolvi(x, guastiRef.current.has(x.canale)) : x)))
      }, 900 + k * 450 + Math.random() * 600))
      window.setTimeout(() => setNuovi(s => { const n = new Set(s); lotto.forEach(i => n.delete(i.id)); return n }), 3200)
    }, 6000)
    return () => window.clearInterval(t)
  }, [live, livello])

  // ── Ritrasmissione ─────────────────────────────────────────────────────────
  const ritrasmetti = (ids: string[], canale?: string) => {
    setInvii(p => p.map(x => (ids.includes(x.id) ? ritrasmesso(x) : x)))
    if (canale) setGuasti(g => { const n = new Set(g); n.delete(canale); return n })
    toast.success(ids.length === 1 ? 'Aggiornamento ritrasmesso e consegnato' : `${ids.length} aggiornamenti ritrasmessi e consegnati`)
  }

  // ── Filtri ─────────────────────────────────────────────────────────────────
  const finestra = useMemo(() => fasce(periodo, adesso, true), [periodo, adesso])
  const da = finestra[0].da, a = Math.max(finestra[finestra.length - 1].a, adesso + 60_000)

  const righePeriodo = useMemo(
    () => invii.filter(i => i.ts.getTime() >= da && i.ts.getTime() < a).map(riga),
    [invii, da, a],
  )

  const perCorsie = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return righePeriodo.filter(r =>
      (!q || [r.canale, r.operazione, r.camera, r.origine, r.prima, r.dopo, r.messaggio, r.lotto].some(s => s.toLowerCase().includes(q))) &&
      cf.matchMulti(r.esito, 'esito') && cf.matchMulti(r.operazione, 'operazione') &&
      cf.matchMulti(r.camera, 'camera') && cf.matchText(r.periodo, 'periodo') &&
      cf.matchMulti(r.origine, 'origine') && cf.matchText(`${r.prima} ${r.dopo}`, 'valore'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [righePeriodo, cerca, cf.text, cf.multi])

  const righe = useMemo(() => cf.sortRows(perCorsie.filter(r =>
    cf.matchMulti(r.canale, 'canale') &&
    (!fascia || (r.canale === fascia.canale && r.quando >= fascia.da && r.quando < fascia.a)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [perCorsie, fascia, cf.multi, cf.sort])

  useEffect(() => { setPage(1) }, [cerca, periodo, fascia, cf.text, cf.multi, cf.sort, pageSize, struttura])
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

  // Invii non consegnati per canale guasto (banner in cima al registro)
  const nonConsegnati = useMemo(() => CANALI.filter(c => guasti.has(c)).map(c => {
    const err = invii.filter(i => i.canale === c && i.esito === 'Errore' && i.codice === '503')
    return { canale: c, ids: err.map(i => i.id), dal: err.length ? err[err.length - 1].ts : null }
  }).filter(x => x.ids.length), [invii, guasti])

  // ── Dettaglio ──────────────────────────────────────────────────────────────
  const aperto = apertoId ? righe.find(r => r.id === apertoId) ?? invii.map(riga).find(r => r.id === apertoId) ?? null : null
  const indice = aperto ? righe.findIndex(r => r.id === aperto.id) : -1
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

  // ── Chip ───────────────────────────────────────────────────────────────────
  const chip: { key: string; label: string; via: () => void }[] = []
  if (fascia) chip.push({ key: 'fascia', label: `${fascia.canale}: ${fascia.label}`, via: () => setFascia(null) })
  if (cerca.trim()) chip.push({ key: 'cerca', label: `Cerca: “${cerca.trim()}”`, via: () => setCerca('') })
  Object.entries(cf.multi).forEach(([k, vs]) => vs.forEach(v =>
    chip.push({ key: `${k}:${v}`, label: `${COL_LABEL[k] ?? k}: ${v}`, via: () => cf.toggleMulti(k, v) })))
  Object.entries(cf.text).forEach(([k, v]) => v && chip.push({
    key: `${k}:t`, label: `${k === 'valore' ? 'Valore' : COL_LABEL[k] ?? k} contiene “${v}”`, via: () => cf.setText(k, ''),
  }))
  const azzera = () => { cf.reset(); setFascia(null); setCerca('') }

  const esporta = () => {
    exportTableToXls(
      'monitoraggio-canali.xlsx',
      ['ID invio', 'Aggiornamento', 'Data e ora', 'Esito', 'Canale', 'Operazione', 'Camera', 'Periodo', 'Prima', 'Dopo', 'Origine', 'Tempo di risposta (ms)', 'Codice', 'Messaggio'],
      righe.map(r => [r.id, r.lotto, dataOra(r.ts), r.esito, r.canale, r.operazione, r.camera, r.periodo, r.prima, r.dopo, r.origine, r.ms, r.codice, r.messaggio]),
      'Monitoraggio canali',
    )
    toast.success(`Esportati ${righe.length} invii in Excel`)
  }

  const ordinatoPerAltro = !!cf.sort && cf.sort.k !== 'quando'

  return (
    <div className="logs mcan">
      <PageHead
        title="Monitoraggio canali"
        subtitle="Tariffe, disponibilità e restrizioni inviate ai canali di vendita: cosa è arrivato, cosa no e perché"
        actions={
          <>
            <Tooltip text={live ? 'Metti in pausa la diretta' : 'Riprendi la diretta: i nuovi invii compaiono da soli'}>
              <button type="button" className={'logs__live' + (live ? ' is-on' : '')} aria-pressed={live} onClick={() => setLive(v => !v)}>
                <span className="logs__live-dot" aria-hidden="true" />
                {live ? 'In diretta' : 'In pausa'}
                <i className={`fa-solid ${live ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta in Excel gli invii filtrati">
              <button type="button" className="sib-btn sib-btn--icon logs__xls" aria-label="Esporta in Excel" onClick={esporta}>
                <i className="fa-regular fa-file-xls" aria-hidden="true" />
              </button>
            </Tooltip>
          </>
        }
      />

      <div className="logs__bar">
        {schede.length > 1 && (
          <SelectField
            name="struttura"
            className="mcan__struttura"
            value={struttura}
            onChange={e => setStruttura(e.target.value)}
            options={schede.map(s => ({ value: s.nome, label: s.nome }))}
          />
        )}
        <div className="logs__seg logs__seg--light" role="radiogroup" aria-label="Periodo">
          {PERIODI.map(p => (
            <button key={p.id} type="button" role="radio" aria-checked={periodo === p.id}
              className={periodo === p.id ? 'is-on' : ''} onClick={() => setPeriodo(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="logs__search">
          <SearchField
            placeholder="Cerca canale, camera, valore, aggiornamento…"
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            onClear={() => setCerca('')}
          />
        </div>
      </div>

      {nonConsegnati.map(n => (
        <div key={n.canale} className="mcan__alert" role="alert">
          <span className="mcan__alert-ico"><i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" /></span>
          <div>
            <strong>{n.canale} non risponde{n.dal ? ` dalle ${ora(n.dal).slice(0, 5)}` : ''}</strong>
            <span>
              {n.ids.length === 1 ? '1 aggiornamento non è stato consegnato' : `${n.ids.length} aggiornamenti non sono stati consegnati`}:
              {' '}finché non li ritrasmetti, su {n.canale} restano prezzi e disponibilità vecchi.
            </span>
          </div>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => ritrasmetti(n.ids, n.canale)}>
            <i className="fa-solid fa-rotate" aria-hidden="true" /> Ritrasmetti {n.ids.length === 1 ? '' : 'tutti'}
          </button>
        </div>
      ))}

      <Corsie
        fasce={finestra}
        righe={perCorsie}
        tutti={invii}
        guasti={guasti}
        periodo={periodo}
        fascia={fascia}
        canaliSel={cf.multi.canale ?? []}
        adesso={adesso}
        onFascia={(c, f) => setFascia(cur => (cur && cur.canale === c && cur.da === f.da ? null : { ...f, canale: c }))}
        onCanale={c => cf.toggleMulti('canale', c)}
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

      <div className="logs__wrap">
        <table className="sib-table logs__table">
          <colgroup>
            <col className="mcan__w-esito" /><col className="mcan__w-quando" /><col className="mcan__w-canale" />
            <col className="mcan__w-op" /><col className="mcan__w-camera" /><col className="mcan__w-periodo" />
            <col className="mcan__w-valore" /><col className="mcan__w-origine" /><col className="mcan__w-chev" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Esito" />{cf.th('esito', 'Esito', { options: ESITI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Quando" />{cf.th('quando', 'Quando', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Canale" />{cf.th('canale', 'Canale', { options: CANALI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Operazione" short="Op." />{cf.th('operazione', 'Operazione', { options: OPERAZIONI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Camera" />{cf.th('camera', 'Camera', { options: CAMERE })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Periodo" />{cf.th('periodo', 'Periodo', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Prima → dopo" short="Valore" />{cf.th('valore', 'Valore', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Origine" short="Orig." />{cf.th('origine', 'Origine', { options: ORIGINI })}</span></th>
              <th aria-label="Dettaglio invio" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={9} className="logs__vuoto">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <strong>Nessun invio con questi filtri</strong>
                  <span>Allarga il periodo o togli qualche filtro.</span>
                  {chip.length > 0 && <button type="button" className="logs__reset" onClick={azzera}>Azzera filtri</button>}
                </td>
              </tr>
            )}
            {pageItems.map((r, i) => {
              const g = giorno(r.ts)
              const sep = !ordinatoPerAltro && (i === 0 || giorno(pageItems[i - 1].ts) !== g)
              const cls = ['logs__row', `mcan__row--${esitoCls(r.esito)}`, nuovi.has(r.id) && 'is-new', apertoId === r.id && 'is-open'].filter(Boolean).join(' ')
              return (
                <React.Fragment key={r.id}>
                  {sep && (
                    <tr className="logs__day">
                      <td colSpan={9}>
                        <span>{etichettaGiorno(g)}</span>
                        <small>{perGiorno.get(g)} {perGiorno.get(g) === 1 ? 'invio' : 'invii'}</small>
                      </td>
                    </tr>
                  )}
                  <tr className={cls} tabIndex={0}
                    onClick={() => setApertoId(apertoId === r.id ? null : r.id)}
                    onKeyDown={e => { if (e.key === 'Enter') setApertoId(r.id) }}>
                    <td><EsitoTag e={r.esito} /></td>
                    <td>
                      <Tooltip text={dataOra(r.ts)}>
                        <span className="logs__quando">
                          <strong>{ora(r.ts).slice(0, 5)}</strong>
                          <small>{relativo(r.ts, adesso)}</small>
                        </span>
                      </Tooltip>
                    </td>
                    <td><span className="mcan__canale"><Sigla c={r.canale} /><TruncatedText text={r.canale} /></span></td>
                    <td>
                      <span className="logs__cat">
                        <i className={`fa-solid ${OPERAZIONE_ICO[r.operazione]}`} aria-hidden="true" />
                        <TruncatedText text={r.operazione} />
                      </span>
                    </td>
                    <td><TruncatedText text={r.camera} /></td>
                    <td className="logs__muted"><TruncatedText text={r.periodo} /></td>
                    <td>
                      <span className="mcan__val">
                        <span className="mcan__val-prima">{r.prima}</span>
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        <strong>{r.dopo}</strong>
                      </span>
                    </td>
                    <td className="logs__muted"><TruncatedText text={r.origine} /></td>
                    <td className="logs__chev"><i className="fa-solid fa-chevron-right" aria-hidden="true" /></td>
                  </tr>
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

      {aperto && (
        <Dettaglio
          r={aperto}
          adesso={adesso}
          invii={invii}
          struttura={struttura}
          pos={indice + 1}
          tot={righe.length}
          onPrev={indice > 0 ? () => vai(-1) : undefined}
          onNext={indice >= 0 && indice < righe.length - 1 ? () => vai(1) : undefined}
          onClose={() => setApertoId(null)}
          onApri={setApertoId}
          onRitrasmetti={() => ritrasmetti([aperto.id], guasti.has(aperto.canale) ? aperto.canale : undefined)}
        />
      )}
    </div>
  )
}

// ─── Pezzi ───────────────────────────────────────────────────────────────────
function Sigla({ c, size = 'sm' }: { c: string; size?: 'sm' | 'lg' }) {
  return <span className={`mcan__sigla mcan__sigla--${size}`} aria-hidden="true">{SIGLA[c] ?? c.charAt(0)}</span>
}

function EsitoTag({ e }: { e: Esito }) {
  return (
    <span className={`mcan__esito mcan__esito--${esitoCls(e)}`}>
      <i className={`fa-solid ${ESITO_ICO[e]}`} aria-hidden="true" />
      <span>{e}</span>
    </span>
  )
}

// ─── Corsie per canale ───────────────────────────────────────────────────────
function Corsie({ fasce, righe, tutti, guasti, periodo, fascia, canaliSel, adesso, onFascia, onCanale }: {
  fasce: Fascia[]; righe: Riga[]; tutti: Invio[]; guasti: Set<string>; periodo: Periodo
  fascia: (Fascia & { canale: string }) | null; canaliSel: string[]; adesso: number
  onFascia: (canale: string, f: Fascia) => void; onCanale: (c: string) => void
}) {
  const dati = useMemo(() => CANALI.map(c => {
    const suoi = righe.filter(r => r.canale === c)
    const celle = fasce.map(f => {
      const dentro = suoi.filter(r => r.quando >= f.da && r.quando < f.a)
      return {
        n: dentro.length,
        errori: dentro.filter(r => r.esito === 'Errore').length,
        ritrasmessi: dentro.filter(r => r.esito === 'Ritrasmesso').length,
      }
    })
    const ok = suoi.filter(r => r.esito === 'Consegnato' || r.esito === 'Ritrasmesso').length
    const conclusi = suoi.filter(r => r.esito !== 'In coda')
    const ultimo = tutti.find(i => i.canale === c && i.esito !== 'In coda')
    return {
      c, celle, n: suoi.length,
      successo: conclusi.length ? Math.round((ok / conclusi.length) * 1000) / 10 : null,
      latenza: conclusi.length ? Math.round(conclusi.reduce((s, r) => s + Math.min(r.ms, 30_000), 0) / conclusi.length) : null,
      ultimo,
    }
  }), [fasce, righe, tutti])

  const max = Math.max(1, ...dati.flatMap(d => d.celle.map(x => x.n)))
  const livello = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const tot = dati.reduce((s, d) => s + d.n, 0)
  const errori = righe.filter(r => r.esito === 'Errore').length
  const titolo = periodo === 'oggi' ? 'oggi' : periodo === 'ora' ? 'ultima ora' : `ultimi ${PERIODI.find(p => p.id === periodo)!.label.toLowerCase()}`

  return (
    <section className="logs__chart mcan__corsie" aria-label="Stato dei canali">
      <header className="logs__chart-head">
        <div>
          <h2>Stato dei canali · {titolo}</h2>
          <p>
            {tot.toLocaleString('it-IT')} invii, {errori === 0 ? 'nessuno in errore' : `${errori} in errore`}
            {fascia ? <> · filtro su <strong>{fascia.canale}, {fascia.label}</strong></> : ' · clicca una cella per vedere quegli invii, un canale per filtrarlo'}
          </p>
        </div>
        <div className="mcan__legend" aria-hidden="true">
          <span><i className="mcan__cell mcan__cell--l1" />pochi</span>
          <span><i className="mcan__cell mcan__cell--l4" />molti invii</span>
          <span><i className="mcan__cell mcan__cell--rit" />ritrasmessi</span>
          <span><i className="mcan__cell mcan__cell--err" />errori</span>
        </div>
      </header>

      <div className="mcan__lanes">
        {dati.map(d => {
          const giu = guasti.has(d.c)
          const lenta = !giu && (d.latenza ?? 0) > 1200
          const stato = giu ? 'Non raggiungibile' : lenta ? 'Lento' : 'Operativo'
          const sel = canaliSel.includes(d.c)
          return (
            <div key={d.c} className={'mcan__lane' + (sel ? ' is-sel' : '') + (canaliSel.length && !sel ? ' is-dim' : '')}>
              <Tooltip text={sel ? `Togli il filtro su ${d.c}` : `Mostra solo ${d.c}`}>
                <button type="button" className="mcan__lane-head" aria-pressed={sel} onClick={() => onCanale(d.c)}>
                  <Sigla c={d.c} />
                  <span className="mcan__lane-txt">
                    <strong>{d.c}</strong>
                    <small className={`mcan__stato mcan__stato--${giu ? 'giu' : lenta ? 'lento' : 'ok'}`}>
                      <span aria-hidden="true" />{stato}
                    </small>
                  </span>
                </button>
              </Tooltip>

              <div className="mcan__cells">
                {d.celle.map((x, i) => {
                  const f = fasce[i]
                  const futuro = f.da > adesso
                  const on = fascia?.canale === d.c && fascia.da === f.da
                  const tipo = x.errori ? 'err' : x.ritrasmessi ? 'rit' : `l${livello(x.n)}`
                  return (
                    <Tooltip key={f.da} content={
                      <span className="logs__tip">
                        <strong>{d.c} · {f.label}</strong>
                        <span>{x.n === 0 ? 'Nessun invio' : `${x.n} invii`}</span>
                        {x.ritrasmessi > 0 && <span>Ritrasmessi: {x.ritrasmessi}</span>}
                        {x.errori > 0 && <span>In errore: {x.errori}</span>}
                      </span>
                    }>
                      <button
                        type="button"
                        className={`mcan__cell mcan__cell--${tipo}` + (on ? ' is-sel' : '') + (futuro ? ' is-future' : '')}
                        disabled={futuro || x.n === 0}
                        aria-label={`${d.c}, ${f.label}: ${x.n} invii`}
                        aria-pressed={on}
                        onClick={() => onFascia(d.c, f)}
                      />
                    </Tooltip>
                  )
                })}
              </div>

              <div className="mcan__lane-kpi">
                <span className={d.successo !== null && d.successo < 95 ? 'is-bad' : ''}>
                  <strong>{d.successo === null ? '—' : `${d.successo.toLocaleString('it-IT')}%`}</strong>consegnati
                </span>
                <span><strong>{d.latenza === null ? '—' : d.latenza >= 1000 ? `${(d.latenza / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} s` : `${d.latenza} ms`}</strong>risposta</span>
                <span><strong>{d.ultimo ? relativo(d.ultimo.ts, adesso) : '—'}</strong>ultimo invio</span>
              </div>
            </div>
          )
        })}

        <div className="mcan__axis">
          <span />
          <div className="mcan__cells">
            {fasce.map((f, i) => (
              <span key={f.da} className={'logs__axis' + (fasce.length > 12 && i % (fasce.length > 24 ? 4 : 3) ? ' is-hidden' : '')}>{f.asse}</span>
            ))}
          </div>
          <span />
        </div>
      </div>
    </section>
  )
}

// ─── Dettaglio invio ─────────────────────────────────────────────────────────
function Dettaglio({ r, adesso, invii, struttura, pos, tot, onPrev, onNext, onClose, onApri, onRitrasmetti }: {
  r: Riga; adesso: number; invii: Invio[]; struttura: string; pos: number; tot: number
  onPrev?: () => void; onNext?: () => void; onClose: () => void; onApri: (id: string) => void; onRitrasmetti: () => void
}) {
  const stesso = useMemo(
    () => invii.filter(i => i.lotto === r.lotto).sort((a, b) => CANALI.indexOf(a.canale) - CANALI.indexOf(b.canale)),
    [invii, r.lotto],
  )
  const tono = r.esito === 'Consegnato' ? 'ok' : r.esito === 'Ritrasmesso' ? 'avviso' : r.esito === 'Errore' ? 'errore' : 'info'

  return (
    <>
      <div className="logs__scrim" onClick={onClose} />
      <aside className={`logs__drawer logs__drawer--${tono}`} role="dialog" aria-label={`Dettaglio invio ${r.id}`}>
        <header className="logs__dr-head">
          <div className="logs__dr-nav">
            <span className="logs__dr-pos">{pos > 0 ? `Invio ${pos} di ${tot.toLocaleString('it-IT')}` : 'Invio fuori dai filtri'}</span>
            <Tooltip text="Invio precedente (↑)">
              <button type="button" aria-label="Invio precedente" disabled={!onPrev} onClick={onPrev}><i className="fa-solid fa-chevron-up" aria-hidden="true" /></button>
            </Tooltip>
            <Tooltip text="Invio successivo (↓)">
              <button type="button" aria-label="Invio successivo" disabled={!onNext} onClick={onNext}><i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>
            </Tooltip>
            <Tooltip text="Chiudi (Esc)">
              <button type="button" aria-label="Chiudi" onClick={onClose}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </Tooltip>
          </div>
          <div className="logs__dr-title">
            <span className="logs__dr-ico"><i className={`fa-solid ${OPERAZIONE_ICO[r.operazione]}`} aria-hidden="true" /></span>
            <div>
              <EsitoTag e={r.esito} />
              <h3>{r.operazione} · {r.canale}</h3>
              <p>{r.messaggio}</p>
            </div>
          </div>
        </header>

        <div className="logs__dr-body">
          {r.esito === 'Errore' && (
            <div className="mcan__retry">
              <span>Su {r.canale} è rimasto il valore precedente ({r.prima}).</span>
              <button type="button" className="sib-btn sib-btn--primary" onClick={onRitrasmetti}>
                <i className="fa-solid fa-rotate" aria-hidden="true" /> Ritrasmetti
              </button>
            </div>
          )}

          <section className="logs__dr-sec">
            <h4>Cosa è stato inviato</h4>
            <ul className="logs__diff">
              <li>
                <span className="logs__diff-campo">{r.camera}</span>
                <span className="logs__diff-prima">{r.prima}</span>
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                <span className="logs__diff-dopo">{r.dopo}</span>
              </li>
            </ul>
          </section>

          <dl className="logs__dr-meta">
            <div><dt>Quando</dt><dd>{dataOra(r.ts)}<small>{relativo(r.ts, adesso)}</small></dd></div>
            <div><dt>Periodo interessato</dt><dd>{r.periodo}</dd></div>
            <div><dt>Origine</dt><dd>{r.origine}</dd></div>
            <div><dt>Struttura</dt><dd>{struttura || '—'}</dd></div>
            <div><dt>Tempo di risposta</dt><dd>{r.esito === 'In coda' ? 'in attesa…' : r.ms >= 1000 ? `${(r.ms / 1000).toLocaleString('it-IT')} s` : `${r.ms} ms`}</dd></div>
            <div><dt>Codice risposta</dt><dd className="logs__mono">{r.codice}</dd></div>
            <div><dt>Aggiornamento</dt><dd className="logs__mono">{r.lotto}</dd></div>
            <div><dt>ID invio</dt><dd className="logs__mono">{r.id}</dd></div>
          </dl>

          <section className="logs__dr-sec">
            <h4>Tentativi di consegna <small>{r.tentativi.length}</small></h4>
            <ol className="logs__tl">
              {r.tentativi.map((t, k) => (
                <li key={k} className={`logs__tl-item logs__tl-item--${t.ok === false ? 'errore' : 'info'}` + (t.ok ? ' mcan__tl-ok' : '')}>
                  <button type="button" disabled>
                    <span className="logs__tl-ora">{ora(t.ts).slice(0, 5)}</span>
                    <span className="logs__tl-txt">
                      <strong>{t.nota}</strong>
                      {t.ms !== undefined && <small>{t.ms >= 1000 ? `${t.ms / 1000} s` : `${t.ms} ms`}</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          {stesso.length > 1 && (
            <section className="logs__dr-sec">
              <h4>Lo stesso aggiornamento sugli altri canali</h4>
              <ul className="mcan__fanout">
                {stesso.map(i => (
                  <li key={i.id}>
                    <button type="button" disabled={i.id === r.id} className={i.id === r.id ? 'is-cur' : ''} onClick={() => onApri(i.id)}>
                      <Sigla c={i.canale} />
                      <span>{i.canale}</span>
                      <EsitoTag e={i.esito} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </>
  )
}
