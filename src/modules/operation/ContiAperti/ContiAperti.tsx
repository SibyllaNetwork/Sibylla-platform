import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import EmptyState from '../../../core/components/EmptyState'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import { apiFetchSibylla } from '../../../services/api'
import './ContiAperti.sass'

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

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  soggiorni: [
    { id: 1,  prenotazioneNum: '14484', cameraNum: '101', intestatario: 'Novi Ruggero',          dataIn: '11/11/2025', dataOut: '12/11/2025', azienda: 'Sibylla', movimenti: [
      { id: 11, prenotazioneNum: '14484', data: '11/11/2025', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 88.31, aliquotaIva: 10, totale: 97.14 },
      { id: 12, prenotazioneNum: '14484', data: '11/11/2025', descrizione: 'Tassa di soggiorno',    tipo: 'tassa',     prezzo: 7.50,  aliquotaIva: 0,  totale: 7.50  },
    ]},
    { id: 2,  prenotazioneNum: '14493', cameraNum: '104', intestatario: 'Ciro cirelli',          dataIn: '14/11/2025', dataOut: '15/11/2025', azienda: 'Sibylla', movimenti: [
      { id: 21, prenotazioneNum: '14493', data: '14/11/2025', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 95.45, aliquotaIva: 10, totale: 105.00 },
    ]},
    { id: 3,  prenotazioneNum: '14495', cameraNum: '102', intestatario: 'Novi Ruggero',          dataIn: '18/11/2025', dataOut: '20/11/2025', azienda: 'Sibylla', movimenti: [
      { id: 31, prenotazioneNum: '14495', data: '18/11/2025', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 88.31, aliquotaIva: 10, totale: 97.14 },
      { id: 32, prenotazioneNum: '14495', data: '19/11/2025', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 76.43, aliquotaIva: 10, totale: 84.07 },
      { id: 33, prenotazioneNum: '14495', data: '18/11/2025', descrizione: 'Tassa di soggiorno',    tipo: 'tassa',     prezzo: 7.50,  aliquotaIva: 0,  totale: 7.50  },
      { id: 34, prenotazioneNum: '14495', data: '19/11/2025', descrizione: 'Tassa di soggiorno',    tipo: 'tassa',     prezzo: 7.50,  aliquotaIva: 0,  totale: 7.50  },
      { id: 35, prenotazioneNum: '14495', data: '07/11/2025', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 88.02, aliquotaIva: 10, totale: 96.82 },
    ]},
    { id: 4,  prenotazioneNum: '14504', cameraNum: '101', intestatario: 'Mario Rossi',           dataIn: '18/11/2025', dataOut: '19/11/2025', azienda: 'Sibylla', movimenti: [
      { id: 41, prenotazioneNum: '14504', data: '18/11/2025', descrizione: 'Soggiorno + colazione', tipo: 'soggiorno', prezzo: 90,    aliquotaIva: 10, totale: 99    },
    ]},
    { id: 5,  prenotazioneNum: '14506', cameraNum: '102', intestatario: 'Test',                  dataIn: '18/11/2025', dataOut: '19/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 6,  prenotazioneNum: '14509', cameraNum: '101', intestatario: 'Mario Rossi',           dataIn: '18/11/2025', dataOut: '19/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 7,  prenotazioneNum: '14531', cameraNum: '107', intestatario: 'Novi Victory',          dataIn: '18/11/2025', dataOut: '19/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 8,  prenotazioneNum: '14532', cameraNum: '105', intestatario: 'Novi Ruggero',          dataIn: '18/11/2025', dataOut: '19/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 9,  prenotazioneNum: '14541', cameraNum: '106', intestatario: 'Novi Ruggero',          dataIn: '21/11/2025', dataOut: '23/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 10, prenotazioneNum: '14544', cameraNum: '108', intestatario: 'test servizi 50€ transfer', dataIn: '25/11/2025', dataOut: '26/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 11, prenotazioneNum: '14545', cameraNum: '105', intestatario: '',                       dataIn: '25/11/2025', dataOut: '26/11/2025', azienda: 'Sibylla', movimenti: [] },
    { id: 12, prenotazioneNum: '14559', cameraNum: '106', intestatario: 'Novi Ruggero',          dataIn: '28/11/2025', dataOut: '29/11/2025', azienda: 'Sibylla', movimenti: [] },
  ],
}

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type SortKey = 'dataIn' | 'dataOut'

export default function ContiAperti({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [dataIn, setDataIn] = useState('')
  const [dataOut, setDataOut] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set([3]))
  const [selSoggiorni, setSelSoggiorni] = useState<Set<number>>(new Set([3]))
  const [selMovimenti, setSelMovimenti] = useState<Set<number>>(new Set([31, 32, 33, 34, 35]))
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
      <BtnBack />
      <PageHeader
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
