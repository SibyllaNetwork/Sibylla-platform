import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import EmptyState from '../../../core/components/EmptyState'
import { apiFetchSibylla } from '../../../services/api'
import './MovimentiSoggiorno.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MovimentoTipo = 'soggiorno' | 'tassa' | 'servizio'

interface Movimento {
  id: number
  prenotazioneNum: string
  data: string
  descrizione: string
  tipo: MovimentoTipo
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

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: "Grim's Hotel" }],
  StrutturaId: 1,
  soggiorni: [
    { id: 1, prenotazioneNum: '15008', cameraNum: '016', intestatario: '', dataIn: '12/03/2026', dataOut: '13/03/2026', azienda: 'Sibylla', movimenti: [
      { id: 101, prenotazioneNum: '15008', data: '12/03/2026', descrizione: 'Room Only',         tipo: 'soggiorno', prezzo: 322.04, aliquotaIva: 10, totale: 354.24 },
      { id: 102, prenotazioneNum: '15008', data: '12/03/2026', descrizione: 'Room Only',         tipo: 'soggiorno', prezzo: 322.04, aliquotaIva: 10, totale: 354.24 },
      { id: 103, prenotazioneNum: '15008', data: '12/03/2026', descrizione: 'Room Only',         tipo: 'soggiorno', prezzo: 322.04, aliquotaIva: 10, totale: 354.24 },
      { id: 104, prenotazioneNum: '15008', data: '12/03/2026', descrizione: 'Room Only',         tipo: 'soggiorno', prezzo: 322.04, aliquotaIva: 10, totale: 354.24 },
      { id: 105, prenotazioneNum: '15008', data: '12/03/2026', descrizione: 'Tassa di soggiorno', tipo: 'tassa',     prezzo: 0,      aliquotaIva: 0,  totale: 0      },
    ]},
    { id: 2, prenotazioneNum: '15011', cameraNum: '104', intestatario: 'Novi Ruggero', dataIn: '14/03/2026', dataOut: '16/03/2026', azienda: 'Sibylla', movimenti: [
      { id: 201, prenotazioneNum: '15011', data: '14/03/2026', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 95.45, aliquotaIva: 10, totale: 105.00 },
      { id: 202, prenotazioneNum: '15011', data: '15/03/2026', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 95.45, aliquotaIva: 10, totale: 105.00 },
      { id: 203, prenotazioneNum: '15011', data: '14/03/2026', descrizione: 'Tassa di soggiorno',    tipo: 'tassa',     prezzo: 7.50,  aliquotaIva: 0,  totale: 7.50  },
      { id: 204, prenotazioneNum: '15011', data: '14/03/2026', descrizione: 'Transfer aeroporto',    tipo: 'servizio',  prezzo: 45.45, aliquotaIva: 10, totale: 50.00 },
    ]},
    { id: 3, prenotazioneNum: '15014', cameraNum: '102', intestatario: 'Mario Rossi',  dataIn: '15/03/2026', dataOut: '17/03/2026', azienda: 'Sibylla', movimenti: [
      { id: 301, prenotazioneNum: '15014', data: '15/03/2026', descrizione: 'Room Only', tipo: 'soggiorno', prezzo: 88.31, aliquotaIva: 10, totale: 97.14 },
      { id: 302, prenotazioneNum: '15014', data: '16/03/2026', descrizione: 'Room Only', tipo: 'soggiorno', prezzo: 88.31, aliquotaIva: 10, totale: 97.14 },
    ]},
    { id: 4, prenotazioneNum: '15020', cameraNum: '108', intestatario: 'Bianchi Giulia', dataIn: '18/03/2026', dataOut: '19/03/2026', azienda: 'Sibylla', movimenti: [] },
    { id: 5, prenotazioneNum: '15022', cameraNum: '105', intestatario: 'Novi Victory',   dataIn: '18/03/2026', dataOut: '20/03/2026', azienda: 'Sibylla', movimenti: [] },
  ],
}

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

function fmtPercent(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' %'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type SortKey = 'dataIn' | 'dataOut'

export default function MovimentiSoggiorno({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [dataIn, setDataIn] = useState('')
  const [dataOut, setDataOut] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]))
  const [selSoggiorni, setSelSoggiorni] = useState<Set<number>>(new Set())
  const [selMovimenti, setSelMovimenti] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetMovimentiSoggiorno', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, dataIn, dataOut },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataIn, dataOut, data.StrutturaId])

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const toggleSoggiorno = (id: number) => {
    const sogg = data.soggiorni.find((s) => s.id === id)
    const willSelect = !selSoggiorni.has(id)
    setSelSoggiorni((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    setSelMovimenti((prev) => {
      const next = new Set(prev)
      sogg?.movimenti.forEach((m) => { if (willSelect) next.add(m.id); else next.delete(m.id) })
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

  // Footer: totali calcolati sui movimenti selezionati
  const allMovimenti = data.soggiorni.flatMap((s) => s.movimenti)
  const sumByTipo = (tipo: MovimentoTipo) =>
    allMovimenti.filter((m) => selMovimenti.has(m.id) && m.tipo === tipo).reduce((s, m) => s + m.totale, 0)
  const totSoggiorni = sumByTipo('soggiorno')
  const totTasse     = sumByTipo('tassa')
  const totServizi   = sumByTipo('servizio')
  const totale       = totSoggiorni + totTasse + totServizi

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selSoggiorni.has(r.id))
  const someSelected = pageRows.some((r) => selSoggiorni.has(r.id))
  const toggleAll = () => {
    setSelSoggiorni((prev) => {
      const next = new Set(prev)
      pageRows.forEach((r) => { if (allSelected) next.delete(r.id); else next.add(r.id) })
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
    <div className="movimenti-soggiorno">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Movimenti soggiorno"
        subtitle="Gestisci facilmente gli addebiti del soggiorno: sposta le singole voci tra camere o ripartisci il valore della prenotazione"
      />

      <div className="movimenti-soggiorno__bar">
        <div className="movimenti-soggiorno__field movimenti-soggiorno__field--grow">
          <label>Cerca</label>
          <div className="movimenti-soggiorno__search">
            <input
              type="search"
              className="sib-input"
              placeholder="Prenotazione, camera (anteponendo #), intestatario o azienda"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass movimenti-soggiorno__search-ico" />
          </div>
        </div>
        <div className="movimenti-soggiorno__field">
          <label>Data in</label>
          <input type="date" className="sib-input" value={dataIn} onChange={(e) => setDataIn(e.target.value)} />
        </div>
        <div className="movimenti-soggiorno__field">
          <label>Data out</label>
          <input type="date" className="sib-input" value={dataOut} onChange={(e) => setDataOut(e.target.value)} />
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table movimenti-soggiorno__table">
          <thead>
            <tr>
              <th className="movimenti-soggiorno__th-check">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                />
              </th>
              <th className="movimenti-soggiorno__th-chev" />
              <th>N. prenotazione</th>
              <th>Camera n.</th>
              <th>Intestatario</th>
              <th className="movimenti-soggiorno__th-sortable" onClick={() => toggleSortKey('dataIn')}>
                Data in {sortIcon('dataIn')}
              </th>
              <th className="movimenti-soggiorno__th-sortable" onClick={() => toggleSortKey('dataOut')}>
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
                <tr className={selSoggiorni.has(r.id) ? 'movimenti-soggiorno__row movimenti-soggiorno__row--sel' : 'movimenti-soggiorno__row'}>
                  <td className="movimenti-soggiorno__td-center">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={selSoggiorni.has(r.id)}
                      onChange={() => toggleSoggiorno(r.id)}
                    />
                  </td>
                  <td className="movimenti-soggiorno__td-center">
                    <button
                      type="button"
                      className="movimenti-soggiorno__chev-btn"
                      aria-label={expanded.has(r.id) ? 'Comprimi' : 'Espandi'}
                      disabled={r.movimenti.length === 0}
                      onClick={() => toggleExpanded(r.id)}
                    >
                      <i className={`fa-light fa-chevron-${expanded.has(r.id) ? 'up' : 'down'}`} />
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
                  <tr className="movimenti-soggiorno__expand-row">
                    <td colSpan={8} className="movimenti-soggiorno__expand-cell">
                      <table className="movimenti-soggiorno__sub-table">
                        <thead>
                          <tr>
                            <th className="movimenti-soggiorno__th-check" />
                            <th>N. prenotazione</th>
                            <th>Data</th>
                            <th>Descrizione</th>
                            <th className="movimenti-soggiorno__th-num">Prezzo</th>
                            <th className="movimenti-soggiorno__th-num">Aliquota iva</th>
                            <th className="movimenti-soggiorno__th-num">Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.movimenti.map((m) => (
                            <tr key={m.id}>
                              <td className="movimenti-soggiorno__td-center">
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
                              <td className="movimenti-soggiorno__td-num">{fmtCurrency(m.prezzo)}</td>
                              <td className="movimenti-soggiorno__td-num">{fmtPercent(m.aliquotaIva)}</td>
                              <td className="movimenti-soggiorno__td-num">{fmtCurrency(m.totale)}</td>
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
      <div className="movimenti-soggiorno__footer">
        <div className="movimenti-soggiorno__stats">
          <span>Soggiorni: <strong>{fmtCurrency(totSoggiorni)}</strong></span>
          <span>Tasse: <strong>{fmtCurrency(totTasse)}</strong></span>
          <span>Servizi: <strong>{fmtCurrency(totServizi)}</strong></span>
          <span>Totale: <strong>{fmtCurrency(totale)}</strong></span>
        </div>
        <button type="button" className="sib-btn sib-btn--primary" disabled={selMovimenti.size === 0}>
          Emetti selezionati
        </button>
      </div>

      <div className="movimenti-soggiorno__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
