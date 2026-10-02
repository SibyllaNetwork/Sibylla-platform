import React, { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../../core/components/EmptyState'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import { apiFetchSibylla } from '../../../services/api'
import './ContiAperti.sass'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { idStruttura } from '../../../core/demo/struttureDemo'
import { usePmsStore } from '../_data/pmsDemo'
import { pmsDi } from '../_data/pmsDi'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type DescrizioneTipo = 'soggiorno' | 'tassa' | 'servizio'

interface Movimento {
  id: number
  prenotazioneNum: string
  data: string
  descrizione: string
  tipo: DescrizioneTipo
  prezzo: number
  aliquotaIva: number
  totale: number
}

interface Soggiorno {
  id: number
  prenotazioneNum: string
  cameraNum: string
  intestatario: string
  dataIn: string
  dataOut: string
  azienda: string
  movimenti: Movimento[]
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  soggiorni: Soggiorno[]
}

// ── Dati demo (senza backend) ──────────────────────────────────────────────────
//  Strutture del cliente; soggiorni = ospiti in casa nel gestionale demo della
//  struttura scelta, con i movimenti maturati notte per notte fino a oggi.
const SERVIZI_EXTRA = [['Minibar', 18], ['Transfer aeroporto', 45], ['Lavanderia', 22], ['Spa — percorso benessere', 35]] as const
function datiDemo(strutture: string[], strutturaId: number | null): Data {
  const nome = strutture.find((n) => idStruttura(n) === strutturaId) ?? strutture[0] ?? ''
  const d = new Date()
  const oggi = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const it = (iso: string) => iso.split('-').reverse().join('/')
  const giorno = (iso: string, n: number) => { const t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` }
  const soggiorni = pmsDi(nome).prenotazioni
    .filter((x) => x.stato !== 'noshow' && x.checkin !== 'da-fare' && x.checkIn <= oggi && oggi < x.checkOut)
    .map((x, i) => {
      const id = i + 1
      const notti = Math.max(1, Math.round((new Date(x.checkOut).getTime() - new Date(x.checkIn).getTime()) / 86400000))
      const lordo = Math.round((x.importo / notti) * 100) / 100
      const movimenti: Movimento[] = []
      for (let n = 0; n < notti && giorno(x.checkIn, n) <= oggi; n++) {
        const data = it(giorno(x.checkIn, n))
        movimenti.push({ id: id * 100 + movimenti.length + 1, prenotazioneNum: x.booking, data, descrizione: x.arrangiamento === 'RO' ? 'Soggiorno' : 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: Math.round((lordo / 1.1) * 100) / 100, aliquotaIva: 10, totale: lordo })
        if (n < 7) movimenti.push({ id: id * 100 + movimenti.length + 1, prenotazioneNum: x.booking, data, descrizione: 'Tassa di soggiorno', tipo: 'tassa', prezzo: 3.5 * x.adulti, aliquotaIva: 0, totale: 3.5 * x.adulti })
      }
      if (Number(x.booking) % 3 === 0) {
        const [desc, prezzo] = SERVIZI_EXTRA[Number(x.booking) % SERVIZI_EXTRA.length]
        movimenti.push({ id: id * 100 + movimenti.length + 1, prenotazioneNum: x.booking, data: it(oggi), descrizione: desc, tipo: 'servizio', prezzo: Math.round((prezzo / 1.22) * 100) / 100, aliquotaIva: 22, totale: prezzo })
      }
      return { id, prenotazioneNum: x.booking, cameraNum: x.camera, intestatario: x.nominativo, dataIn: it(x.checkIn), dataOut: it(x.checkOut), azienda: x.canale, movimenti }
    })
  return { Strutture: strutture.map((n) => ({ Id: idStruttura(n), nome: n })), StrutturaId: idStruttura(nome), soggiorni }
}

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type SortKey = 'dataIn' | 'dataOut'

export default function ContiAperti({ navigate }: { navigate: (p: string) => void }) {
  // Struttura selezionata in alto (strutture del cliente).
  const { struttura: strutturaCorrente, elenco } = useStrutturaCorrente()
  const versionePms = usePmsStore((st) => st.versione)
  const [data, setData] = useState<Data>(() => datiDemo(elenco, idStruttura(strutturaCorrente)))
  useEffect(() => { setData(datiDemo(elenco, idStruttura(strutturaCorrente))) }, [elenco, strutturaCorrente, versionePms])
  const [search, setSearch] = useState('')
  const [dataIn, setDataIn] = useState('')
  const [dataOut, setDataOut] = useState('')
  const [page, setPage] = useState(1)
  // Primo soggiorno aperto e selezionato, come esempio di addebito.
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]))
  const [selSoggiorni, setSelSoggiorni] = useState<Set<number>>(new Set([1]))
  const [selMovimenti, setSelMovimenti] = useState<Set<number>>(() => new Set(data.soggiorni[0]?.movimenti.map((m) => m.id) ?? []))
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetMovimentiSoggiorno', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, dataIn, dataOut },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(datiDemo(elenco, data.StrutturaId)) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataIn, dataOut, data.StrutturaId, elenco, versionePms])

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const toggleSoggiorno = (id: number) => {
    const sogg = data.soggiorni.find((s) => s.id === id)
    setSelSoggiorni((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    setSelMovimenti((prev) => {
      const next = new Set(prev)
      if (sogg) {
        const isSelected = !selSoggiorni.has(id)
        sogg.movimenti.forEach((m) => {
          if (isSelected) next.add(m.id); else next.delete(m.id)
        })
      }
      return next
    })
  }

  const toggleMovimento = (id: number) =>
    setSelMovimenti((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const toggleSortKey = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('asc'); return }
    if (sortDir === 'asc') setSortDir('desc'); else { setSortKey(null); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = data.soggiorni
    const q = search.toLowerCase().trim()
    if (q) {
      const isCamera = q.startsWith('#')
      const term = isCamera ? q.slice(1) : q
      rows = rows.filter((r) =>
        isCamera
          ? r.cameraNum.toLowerCase().includes(term)
          : r.prenotazioneNum.includes(term) ||
            r.cameraNum.toLowerCase().includes(term) ||
            r.intestatario.toLowerCase().includes(term) ||
            r.azienda.toLowerCase().includes(term),
      )
    }
    if (sortKey) {
      const dir = sortDir === 'asc' ? 1 : -1
      const parse = (d: string) => {
        const [dd, mm, yy] = d.split('/').map(Number)
        return new Date(yy, mm - 1, dd).getTime()
      }
      rows = [...rows].sort((a, b) => (parse(a[sortKey]) - parse(b[sortKey])) * dir)
    }
    return rows
  }, [data.soggiorni, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, dataIn, dataOut])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // Stats footer (calcolate sui movimenti selezionati)
  const allMovimenti = data.soggiorni.flatMap((s) => s.movimenti)
  const totSoggiorni = allMovimenti.filter((m) => selMovimenti.has(m.id) && m.tipo === 'soggiorno').reduce((s, m) => s + m.totale, 0)
  const totTasse     = allMovimenti.filter((m) => selMovimenti.has(m.id) && m.tipo === 'tassa').reduce((s, m) => s + m.totale, 0)
  const totServizi   = allMovimenti.filter((m) => selMovimenti.has(m.id) && m.tipo === 'servizio').reduce((s, m) => s + m.totale, 0)
  const totale       = totSoggiorni + totTasse + totServizi

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selSoggiorni.has(r.id))
  const someSelected = pageRows.some((r) => selSoggiorni.has(r.id))
  const toggleAll = () => {
    setSelSoggiorni((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        pageRows.forEach((r) => next.delete(r.id))
      } else {
        pageRows.forEach((r) => next.add(r.id))
      }
      return next
    })
    setSelMovimenti((prev) => {
      const next = new Set(prev)
      pageRows.forEach((r) => r.movimenti.forEach((m) => {
        if (allSelected) next.delete(m.id); else next.add(m.id)
      }))
      return next
    })
  }

  const sortIcon = (k: SortKey) => {
    if (sortKey !== k) return <i className="fa-light fa-arrow-down-arrow-up" />
    return sortDir === 'asc'
      ? <i className="fa-solid fa-arrow-up" />
      : <i className="fa-solid fa-arrow-down" />
  }

  return (
    <div className="mov-sog">
      <PageHead
        back
        title="Conti aperti"
        subtitle="Gestisci facilmente gli addebiti del soggiorno: sposta le singole voci tra camere o ripartisci il valore della prenotazione"
      />

      <div className="mov-sog__bar">
        <div className="mov-sog__field mov-sog__field--grow">
          <label>Cerca</label>
          <div className="mov-sog__search">
            <input
              type="search"
              className="sib-input"
              placeholder="Prenotazione, camera (anteponendo #), intestatario o azienda"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass mov-sog__search-ico" />
          </div>
        </div>
        <div className="mov-sog__field">
          <label>Data in</label>
          <input type="date" className="sib-input" value={dataIn} onChange={(e) => setDataIn(e.target.value)} />
        </div>
        <div className="mov-sog__field">
          <label>Data out</label>
          <input type="date" className="sib-input" value={dataOut} onChange={(e) => setDataOut(e.target.value)} />
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table mov-sog__table">
          <thead>
            <tr>
              <th className="mov-sog__th-check">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                />
              </th>
              <th className="mov-sog__th-chev" />
              <th>N. prenotazione</th>
              <th>Camera n.</th>
              <th>Intestatario</th>
              <th className="mov-sog__th-sortable" onClick={() => toggleSortKey('dataIn')}>
                Data in {sortIcon('dataIn')}
              </th>
              <th className="mov-sog__th-sortable" onClick={() => toggleSortKey('dataOut')}>
                Data out {sortIcon('dataOut')}
              </th>
              <th>Azienda</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState
                  icon="bed-front"
                  title="Nessun soggiorno trovato"
                  subtitle="Non ci sono soggiorni per i criteri selezionati. Prova a modificare la ricerca o l'intervallo di date."
                />
              </td></tr>
            ) : pageRows.map((r) => (
              <React.Fragment key={r.id}>
                <tr className={selSoggiorni.has(r.id) ? 'mov-sog__row mov-sog__row--sel' : 'mov-sog__row'}>
                  <td className="mov-sog__td-center">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={selSoggiorni.has(r.id)}
                      onChange={() => toggleSoggiorno(r.id)}
                    />
                  </td>
                  <td className="mov-sog__td-center">
                    <button type="button" className="mov-sog__chev-btn" aria-label={expanded.has(r.id) ? 'Comprimi' : 'Espandi'} onClick={() => toggleExpanded(r.id)}>
                      <i className={`fa-solid fa-chevron-${expanded.has(r.id) ? 'up' : 'down'}`} />
                    </button>
                  </td>
                  <td>{r.prenotazioneNum}</td>
                  <td>{r.cameraNum}</td>
                  <td>{r.intestatario}</td>
                  <td>{r.dataIn}</td>
                  <td>{r.dataOut}</td>
                  <td>{r.azienda}</td>
                </tr>
                {expanded.has(r.id) && r.movimenti.length > 0 && (
                  <tr className="mov-sog__expand-row">
                    <td colSpan={8} className="mov-sog__expand-cell">
                      <table className="mov-sog__sub-table">
                        <thead>
                          <tr>
                            <th className="mov-sog__th-check" />
                            <th>N. prenotazione</th>
                            <th>Data</th>
                            <th>Descrizione</th>
                            <th className="mov-sog__th-num">Prezzo</th>
                            <th className="mov-sog__th-num">Aliquota iva</th>
                            <th className="mov-sog__th-num">Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.movimenti.map((m) => (
                            <tr key={m.id}>
                              <td className="mov-sog__td-center">
                                <input
                                  type="checkbox"
                                  className="sib-checkbox"
                                  checked={selMovimenti.has(m.id)}
                                  onChange={() => toggleMovimento(m.id)}
                                />
                              </td>
                              <td>{m.prenotazioneNum}</td>
                              <td>{m.data}</td>
                              <td>{m.descrizione}</td>
                              <td className="mov-sog__td-num">{fmtCurrency(m.prezzo)}</td>
                              <td className="mov-sog__td-num">{m.aliquotaIva.toFixed(2).replace('.', ',')} %</td>
                              <td className="mov-sog__td-num">{fmtCurrency(m.totale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Footer stats + Emetti ─────────────────────────────────────────── */}
      <div className="mov-sog__footer">
        <div className="mov-sog__stats">
          <span>Soggiorni: <strong>{fmtCurrency(totSoggiorni)}</strong></span>
          <span>Tasse: <strong>{fmtCurrency(totTasse)}</strong></span>
          <span>Servizi: <strong>{fmtCurrency(totServizi)}</strong></span>
          <span>Totale: <strong>{fmtCurrency(totale)}</strong></span>
        </div>
        <button type="button" className="sib-btn sib-btn--primary" disabled={selMovimenti.size === 0}>
          Emetti selezionati
        </button>
      </div>

      <div className="mov-sog__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
