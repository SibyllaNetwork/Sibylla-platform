import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { DateRangeField, SelectField, SearchField, TextareaField } from '../../../core/components/form'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import './GestioneDocumenti.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tipologia = 'Caparra' | 'Scontrino' | 'Fattura' | 'Nota di credito' | 'Quietanza'
type Stato = 'Pagato' | 'Da incassare' | 'Annullato' | 'Stornato'
type DrawerKind = 'nota-credito' | 'annulla' | 'quietanza'

interface Documento {
  id: number
  struttura: string
  numero: string
  tipologia: Tipologia
  data: string // dd/mm/yyyy
  emessoDa: string
  riferimento: string
  ragioneSociale: string
  importo: number
  saldo: number | null
  voceIncasso: string
  stato: Stato
  descrizioneVoce?: string
  storico?: boolean
}

// ─── COSTANTI ─────────────────────────────────────────────────────────────────

const STRUTTURE = ["Grim's Hotel", 'Hotel Tutorial', 'Hotel Archimede']
const TIPOLOGIE: Tipologia[] = ['Caparra', 'Scontrino', 'Fattura', 'Nota di credito', 'Quietanza']
const STATI: Stato[] = ['Pagato', 'Da incassare', 'Annullato', 'Stornato']
const VOCI_INCASSO = ['Contanti', 'nexy', 'nexi', 'Bonifico', 'Carta']

const fmtEUR = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
const parseData = (d: string) => { const [dd, mm, yy] = d.split('/').map(Number); return new Date(yy, mm - 1, dd).getTime() }
const parseIso = (d: string) => { const [yy, mm, dd] = d.split('-').map(Number); return new Date(yy, mm - 1, dd).getTime() }
const oggiStr = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` }

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK: Documento[] = [
  // Grim's Hotel
  { id: 1, struttura: "Grim's Hotel", numero: 'C-0001/MU 2026', tipologia: 'Caparra', data: '26/06/2026', emessoDa: 'Mario Rossi', riferimento: '',              ragioneSociale: '', importo: 88.44,  saldo: 0, voceIncasso: 'nexy', stato: 'Pagato', descrizioneVoce: 'Anticipo per servizi' },
  { id: 2, struttura: "Grim's Hotel", numero: 'C-0002/MU 2026', tipologia: 'Caparra', data: '26/06/2026', emessoDa: 'Mario Rossi', riferimento: 'melissa barnat', ragioneSociale: '', importo: 144.45, saldo: 0, voceIncasso: 'nexy', stato: 'Pagato', descrizioneVoce: 'Anticipo per servizi' },
  // Hotel Tutorial
  { id: 3, struttura: 'Hotel Tutorial', numero: 'C-0040/FG 2026', tipologia: 'Caparra',   data: '23/06/2026', emessoDa: 'Mario Rossi', riferimento: 'carla leone',          ragioneSociale: '', importo: 50.00,  saldo: 0, voceIncasso: 'Contanti', stato: 'Pagato', descrizioneVoce: 'Anticipo per servizi' },
  { id: 4, struttura: 'Hotel Tutorial', numero: 'S-0078/FG 2026', tipologia: 'Scontrino', data: '23/06/2026', emessoDa: 'Mario Rossi', riferimento: 'Carla leone',          ragioneSociale: '', importo: 20.00,  saldo: null, voceIncasso: 'Contanti', stato: 'Pagato' },
  { id: 5, struttura: 'Hotel Tutorial', numero: 'C-0041/FG 2026', tipologia: 'Caparra',   data: '23/06/2026', emessoDa: 'Mario Rossi', riferimento: '',                     ragioneSociale: '', importo: 5.00,   saldo: 0, voceIncasso: 'Contanti', stato: 'Pagato', descrizioneVoce: 'Anticipo per servizi' },
  { id: 6, struttura: 'Hotel Tutorial', numero: 'C-0042/FG 2026', tipologia: 'Caparra',   data: '23/06/2026', emessoDa: 'Mario Rossi', riferimento: 'Test Ale checkin 234 new', ragioneSociale: '', importo: 462.29, saldo: 0, voceIncasso: 'nexi', stato: 'Pagato', descrizioneVoce: 'Anticipo per servizi', storico: true },
  // Hotel Archimede
  { id: 7, struttura: 'Hotel Archimede', numero: 'F-0123/AR 2026', tipologia: 'Fattura', data: '24/06/2026', emessoDa: 'Anna Verdi', riferimento: 'Hotel Group',    ragioneSociale: 'Hotel Group Srl', importo: 1200.00, saldo: 1200.00, voceIncasso: 'Bonifico', stato: 'Da incassare', descrizioneVoce: 'Prestazione di servizi' },
  { id: 8, struttura: 'Hotel Archimede', numero: 'F-0124/AR 2026', tipologia: 'Fattura', data: '24/06/2026', emessoDa: 'Anna Verdi', riferimento: 'Barnat & Co',     ragioneSociale: 'Barnat & Co',     importo: 430.00,  saldo: 0,       voceIncasso: 'Carta',    stato: 'Pagato',       descrizioneVoce: 'Prestazione di servizi' },
]

const STATO_CLASS = (s: Stato) => s.toLowerCase().replace(/\s+/g, '-')

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'tipologia' | 'emessoDa' | 'riferimento' | 'stato'

export default function GestioneDocumenti(_props: { navigate?: (p: string) => void } = {}) {
  const [rows, setRows] = useState<Documento[]>(MOCK)
  const [page, setPage] = useState(1)
  const [dataDa, setDataDa] = useState('2026-06-23')
  const [dataA, setDataA] = useState('2026-06-30')
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [searchDraft, setSearchDraft] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [detail, setDetail] = useState<Documento | null>(null)
  const [storico, setStorico] = useState<Documento | null>(null)
  const [drawer, setDrawer] = useState<DrawerKind | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({ tipologia: [], emessoDa: [], riferimento: [], stato: [] })
  const toggleColFilter = (key: ColFilterKey, value: string) => setColFilters((p) => {
    const cur = p[key]; const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]; return { ...p, [key]: next }
  })
  const setAllColFilter = (key: ColFilterKey, all: string[], select: boolean) => setColFilters((p) => ({ ...p, [key]: select ? [...all] : [] }))

  const struttRows = useMemo(() => rows.filter((r) => r.struttura === struttura), [rows, struttura])
  const emessoDaDistinct = useMemo(() => Array.from(new Set(struttRows.map((r) => r.emessoDa).filter(Boolean))).sort(), [struttRows])
  const riferimentoDistinct = useMemo(() => Array.from(new Set(struttRows.map((r) => r.riferimento).filter(Boolean))).sort(), [struttRows])

  const filtered = useMemo(() => {
    const da = parseIso(dataDa), a = parseIso(dataA)
    let out = struttRows.filter((r) => { const t = parseData(r.data); return t >= da && t <= a })
    const q = query.toLowerCase().trim()
    if (q) out = out.filter((r) => [r.numero, r.emessoDa, r.riferimento, r.ragioneSociale].some((f) => f.toLowerCase().includes(q)))
    if (colFilters.tipologia.length)   out = out.filter((r) => colFilters.tipologia.includes(r.tipologia))
    if (colFilters.emessoDa.length)    out = out.filter((r) => colFilters.emessoDa.includes(r.emessoDa))
    if (colFilters.riferimento.length) out = out.filter((r) => colFilters.riferimento.includes(r.riferimento))
    if (colFilters.stato.length)       out = out.filter((r) => colFilters.stato.includes(r.stato))
    return out
  }, [struttRows, dataDa, dataA, query, colFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [dataDa, dataA, query, colFilters, struttura])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  useEffect(() => { setSelected(new Set()); setDrawer(null) }, [struttura])
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  const toggleRow = (id: number) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))
  const toggleAllPage = () => setSelected((p) => { const n = new Set(p); pageAllSelected ? pageRows.forEach((r) => n.delete(r.id)) : pageRows.forEach((r) => n.add(r.id)); return n })
  const selectedDocs = rows.filter((r) => selected.has(r.id))
  const selectedTotale = selectedDocs.reduce((s, d) => s + d.importo, 0)

  const canAnnulla   = selectedDocs.some((d) => d.tipologia === 'Scontrino' && d.stato !== 'Annullato')
  const canNotaCred  = selectedDocs.some((d) => d.stato === 'Pagato' && (d.tipologia === 'Caparra' || d.tipologia === 'Fattura' || d.tipologia === 'Scontrino'))
  const canQuietanza = selectedDocs.some((d) => d.tipologia === 'Fattura')

  const esportaXls = () => {
    const header = ['Numero documento', 'Tipologia', 'Data documento', 'Emesso da', 'Riferimento', 'Ragione sociale', 'Importo', 'Saldo', 'Voce incasso', 'Stato']
    const data = filtered.map((r) => [r.numero, r.tipologia, r.data, r.emessoDa, r.riferimento, r.ragioneSociale, fmtEUR(r.importo), r.saldo == null ? '' : fmtEUR(r.saldo), r.voceIncasso, r.stato])
    exportTableToXls('documenti.xls', header, data, 'Documenti')
  }

  // ── conferme drawer ──
  const confermaNotaCredito = (importi: Record<number, number>, voce: string, _causale: string) => {
    const targets = selectedDocs.filter((d) => (importi[d.id] ?? 0) > 0)
    setRows((prev) => {
      let maxId = prev.reduce((m, r) => Math.max(m, r.id), 0)
      const ncCount = prev.filter((r) => r.tipologia === 'Nota di credito').length
      const nc: Documento[] = targets.map((t, i) => ({
        id: ++maxId, struttura: t.struttura, numero: `NC-${String(ncCount + i + 1).padStart(4, '0')}/MU 2026`,
        tipologia: 'Nota di credito', data: oggiStr(), emessoDa: t.emessoDa, riferimento: t.numero, ragioneSociale: t.ragioneSociale,
        importo: -Math.abs(importi[t.id]), saldo: null, voceIncasso: voce || t.voceIncasso, stato: 'Stornato',
      }))
      return [...nc, ...prev]
    })
    setSelected(new Set()); setDrawer(null)
  }
  const confermaAnnulla = (_causale: string) => {
    setRows((prev) => prev.map((r) => (selected.has(r.id) && r.tipologia === 'Scontrino' && r.data === oggiStr() ? { ...r, stato: 'Annullato' } : r)))
    setSelected(new Set()); setDrawer(null)
  }
  const confermaQuietanza = (_voce: string, _causale: string) => {
    setRows((prev) => prev.map((r) => (selected.has(r.id) && r.tipologia === 'Fattura' ? { ...r, stato: 'Pagato', saldo: 0 } : r)))
    setSelected(new Set()); setDrawer(null)
  }

  return (
    <div className="gest-doc">
      <PageHead title="Gestione documenti" subtitle="Visualizza, filtra e gestisci documenti" />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="gest-doc__bar">
        <div className="gest-doc__bar-left">
          <div className="gest-doc__field">
            <DateRangeField nameFrom="dataDa" nameTo="dataA" label="Periodo" valueFrom={dataDa} valueTo={dataA}
              onChangeFrom={(e) => setDataDa(e.target.value)} onChangeTo={(e) => setDataA(e.target.value)} />
          </div>
          <div className="gest-doc__field">
            <SelectField name="struttura" label="Struttura" className="gest-doc__select" value={struttura}
              onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
          </div>
          <button type="button" className="sib-btn sib-btn--primary gest-doc__search-btn" onClick={() => setQuery(searchDraft)}>
            <i className="fa-light fa-magnifying-glass" /> Avvia ricerca
          </button>
          <div className="gest-doc__field">
            <label>Cerca</label>
            <SearchField className="gest-doc__search" name="search" placeholder="Cerca" value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)} onSearch={(v) => setQuery(v)} onClear={() => { setSearchDraft(''); setQuery('') }} />
          </div>
          <div className="gest-doc__ctx">
            <button type="button" className={'sib-btn ' + (canAnnulla ? 'sib-btn--primary' : 'sib-btn--secondary')} disabled={!canAnnulla} onClick={() => setDrawer('annulla')}>
              <i className="fa-light fa-receipt" /> Annulla scontrino
            </button>
            <button type="button" className={'sib-btn ' + (canNotaCred ? 'sib-btn--primary' : 'sib-btn--secondary')} disabled={!canNotaCred} onClick={() => setDrawer('nota-credito')}>
              <i className="fa-light fa-credit-card" /> Nota di credito
            </button>
            <button type="button" className={'sib-btn ' + (canQuietanza ? 'sib-btn--primary' : 'sib-btn--secondary')} disabled={!canQuietanza} onClick={() => setDrawer('quietanza')}>
              <i className="fa-light fa-file-invoice-dollar" /> Quietanza fattura
            </button>
          </div>
        </div>
        <div className="gest-doc__bar-right">
          <Tooltip text="Esporta in Excel">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta XLS" onClick={esportaXls}><i className="fa-regular fa-file-excel" /></button>
          </Tooltip>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="gest-doc__selbar">
          {selected.size} document{selected.size === 1 ? 'o' : 'i'} selezionat{selected.size === 1 ? 'o' : 'i'} · totale <strong>{fmtEUR(selectedTotale)}</strong>
        </div>
      )}

      <div className={'gest-doc__main' + (drawer ? ' gest-doc__main--drawer' : '')}>
        <div className="gest-doc__table-area">
          <div className="sib-table-wrap">
            <table className="sib-table gest-doc__table" ref={tableRef}>
              <thead>
                <tr>
                  <th className="gest-doc__th-check"><input type="checkbox" className="sib-checkbox" checked={pageAllSelected} onChange={toggleAllPage} aria-label="Seleziona tutti" /></th>
                  <th>Numero documento</th>
                  <th><ColFilterHeader label="Tipologia" options={TIPOLOGIE} selected={colFilters.tipologia} open={openFilter === 'tipologia'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'tipologia' ? null : 'tipologia')} onToggle={(v) => toggleColFilter('tipologia', v)} onSelectAll={(s) => setAllColFilter('tipologia', TIPOLOGIE, s)} /></th>
                  <th>Data documento</th>
                  <th><ColFilterHeader label="Emesso da" options={emessoDaDistinct} selected={colFilters.emessoDa} open={openFilter === 'emessoDa'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'emessoDa' ? null : 'emessoDa')} onToggle={(v) => toggleColFilter('emessoDa', v)} onSelectAll={(s) => setAllColFilter('emessoDa', emessoDaDistinct, s)} /></th>
                  <th><ColFilterHeader label="Riferimento" options={riferimentoDistinct} selected={colFilters.riferimento} open={openFilter === 'riferimento'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'riferimento' ? null : 'riferimento')} onToggle={(v) => toggleColFilter('riferimento', v)} onSelectAll={(s) => setAllColFilter('riferimento', riferimentoDistinct, s)} /></th>
                  <th>Ragione sociale</th>
                  <th className="gest-doc__th-num">Importo</th>
                  <th className="gest-doc__th-num">Saldo</th>
                  <th>Voce incasso</th>
                  <th><ColFilterHeader label="Stato" options={STATI} selected={colFilters.stato} open={openFilter === 'stato'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'stato' ? null : 'stato')} onToggle={(v) => toggleColFilter('stato', v)} onSelectAll={(s) => setAllColFilter('stato', STATI, s)} /></th>
                  <th className="gest-doc__th-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={12} className="sib-empty">Nessun documento trovato.</td></tr>
                ) : pageRows.map((r) => (
                  <tr key={r.id} className={selected.has(r.id) ? 'gest-doc__row--sel' : undefined}>
                    <td className="gest-doc__td-check"><input type="checkbox" className="sib-checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} aria-label={`Seleziona ${r.numero}`} /></td>
                    <td className="gest-doc__nowrap">{r.numero}</td>
                    <td>{r.tipologia}</td>
                    <td className="gest-doc__nowrap">{r.data}</td>
                    <td>{r.emessoDa}</td>
                    <td>{r.riferimento || <span className="sib-cell--muted">-</span>}</td>
                    <td>{r.ragioneSociale || <span className="sib-cell--muted">-</span>}</td>
                    <td className="gest-doc__td-num">{fmtEUR(r.importo)}</td>
                    <td className="gest-doc__td-num">{r.saldo == null ? <span className="sib-cell--muted">-</span> : fmtEUR(r.saldo)}</td>
                    <td>{r.voceIncasso || <span className="sib-cell--muted">-</span>}</td>
                    <td><span className={`gest-doc__stato gest-doc__stato--${STATO_CLASS(r.stato)}`}>{r.stato}</span></td>
                    <td className="gest-doc__td-center">
                      <div className="gest-doc__actions">
                        <Tooltip text="Visualizza documento"><button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza" onClick={() => setDetail(r)}><i className="fa-solid fa-eye" /></button></Tooltip>
                        <Tooltip text="Scarica PDF"><button type="button" className="sib-btn sib-btn--icon" aria-label="PDF"><i className="fa-solid fa-file-pdf" /></button></Tooltip>
                        {r.storico && <Tooltip text="Storico documento"><button type="button" className="sib-btn sib-btn--icon" aria-label="Storico" onClick={() => setStorico(r)}><i className="fa-solid fa-clock-rotate-left" /></button></Tooltip>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gest-doc__pagination">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>

        {drawer === 'nota-credito' && <NotaCreditoDrawer docs={selectedDocs.filter((d) => d.stato === 'Pagato' && (d.tipologia === 'Caparra' || d.tipologia === 'Fattura' || d.tipologia === 'Scontrino'))} onClose={() => setDrawer(null)} onConferma={confermaNotaCredito} />}
        {drawer === 'annulla' && <AnnullaScontrinoDrawer docs={selectedDocs.filter((d) => d.tipologia === 'Scontrino')} onClose={() => setDrawer(null)} onConferma={confermaAnnulla} />}
        {drawer === 'quietanza' && <QuietanzaDrawer docs={selectedDocs.filter((d) => d.tipologia === 'Fattura')} onClose={() => setDrawer(null)} onConferma={confermaQuietanza} />}
      </div>

      <DettaglioDocumentoModal doc={detail} onClose={() => setDetail(null)} />
      <StoricoModal doc={storico} onClose={() => setStorico(null)} />
    </div>
  )
}

// ─── COL FILTER HEADER ────────────────────────────────────────────────────────

function ColFilterHeader({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll }: {
  label: string; options: string[]; selected: string[]; open: boolean
  onToggleOpen: () => void; onToggle: (v: string) => void; onSelectAll: (s: boolean) => void
}) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="gd-colfilter">
      <span>{label}</span>
      <button type="button" className={'gd-colfilter__btn' + (hasFilter ? ' gd-colfilter__btn--active' : '')} onClick={onToggleOpen} aria-label={`Filtra per ${label}`}><i className="fa-solid fa-filter" /></button>
      {open && (
        <>
          <div className="gd-colfilter__overlay" onClick={onToggleOpen} />
          <div className="gd-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="gd-colfilter__title">scelte multiple</div>
            <label className="gd-colfilter__option"><input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} /><span>Tutti</span></label>
            {options.map((opt) => (
              <label key={opt} className="gd-colfilter__option"><input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} /><span>{opt}</span></label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── DRAWER: Nota di credito ─────────────────────────────────────────────────

function NotaCreditoDrawer({ docs, onClose, onConferma }: { docs: Documento[]; onClose: () => void; onConferma: (importi: Record<number, number>, voce: string, causale: string) => void }) {
  const [importi, setImporti] = useState<Record<number, number>>({})
  const [voce, setVoce] = useState('')
  const [causale, setCausale] = useState('')
  const totaleSel = docs.reduce((s, d) => s + Math.abs(d.importo), 0)
  const totaleNc = docs.reduce((s, d) => s + (importi[d.id] ?? 0), 0)

  const setImporto = (id: number, max: number, raw: string) => {
    const v = Math.min(Math.max(0, Number(raw.replace(',', '.')) || 0), max)
    setImporti((p) => ({ ...p, [id]: v }))
  }

  return (
    <aside className="gest-doc__drawer">
      <header className="gest-doc__drawer-head">
        <h3>Nota di credito</h3>
        <button type="button" className="gest-doc__drawer-close" aria-label="Chiudi" onClick={onClose}><i className="fa-light fa-xmark" /></button>
      </header>
      <div className="gest-doc__drawer-body">
        <div className="gest-doc__drawer-tot"><span>Totale documenti selezionati:</span><strong>{fmtEUR(totaleSel)}</strong></div>
        {docs.map((d) => (
          <div key={d.id} className="gest-doc__nc-card">
            <div className="gest-doc__nc-card-head">
              <span className="gest-doc__nc-num">{d.numero}</span>
              <span className="gest-doc__nc-meta">{d.data}</span>
              <span className="gest-doc__nc-meta">Importo documento {fmtEUR(Math.abs(d.importo))}</span>
              <span className="gest-doc__nc-meta">Residuo {fmtEUR(d.saldo ?? 0)}</span>
            </div>
            <table className="gest-doc__nc-lines">
              <thead><tr><th>Descrizione</th><th>Data</th><th>Disponibile</th><th>Da stornare</th></tr></thead>
              <tbody>
                <tr>
                  <td>{d.descrizioneVoce || 'Prestazione di servizi'}<span className="gest-doc__nc-line-sub">{d.tipologia}</span></td>
                  <td>{d.data}</td>
                  <td>{fmtEUR(Math.abs(d.importo))}</td>
                  <td><input type="text" inputMode="decimal" className="sib-input gest-doc__nc-input" value={importi[d.id] != null ? String(importi[d.id]).replace('.', ',') : '0,00'} onChange={(e) => setImporto(d.id, Math.abs(d.importo), e.target.value)} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
        <div className="gest-doc__drawer-tot"><span>Totale nota di credito:</span><strong>{fmtEUR(totaleNc)}</strong></div>
        <SelectField name="voce" label="Voce incasso" value={voce} onChange={(e) => setVoce(e.target.value)} options={[{ value: '', label: 'Seleziona' }, ...VOCI_INCASSO.map((v) => ({ value: v, label: v }))]} />
        <TextareaField name="causale" label="Causale" rows={3} value={causale} onChange={(e) => setCausale(e.target.value)} placeholder="Indica il motivo dello storno. Il riferimento al documento originale verrà aggiunto automaticamente." />
      </div>
      <footer className="gest-doc__drawer-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={totaleNc <= 0} onClick={() => onConferma(importi, voce, causale)}>Conferma</button>
      </footer>
    </aside>
  )
}

// ─── DRAWER: Annullamento scontrino ──────────────────────────────────────────

function AnnullaScontrinoDrawer({ docs, onClose, onConferma }: { docs: Documento[]; onClose: () => void; onConferma: (causale: string) => void }) {
  const [causale, setCausale] = useState('')
  const oggi = oggiStr()
  const totaleAnnullabile = docs.reduce((s, d) => s + (d.data === oggi ? d.importo : 0), 0)
  const fuoriGiornata = docs.some((d) => d.data !== oggi)

  return (
    <aside className="gest-doc__drawer">
      <header className="gest-doc__drawer-head">
        <h3>Annullamento scontrino</h3>
        <button type="button" className="gest-doc__drawer-close" aria-label="Chiudi" onClick={onClose}><i className="fa-light fa-xmark" /></button>
      </header>
      <div className="gest-doc__drawer-body">
        <div className="gest-doc__drawer-tot"><span>Totale da annullare:</span><strong>{fmtEUR(totaleAnnullabile)}</strong></div>
        {docs.map((d) => (
          <div key={d.id} className="gest-doc__nc-card">
            <div className="gest-doc__nc-card-head">
              <span className="gest-doc__nc-num">{d.numero.split('/')[0].replace(/^S-0*/, 'S-')}</span>
              <span className="gest-doc__nc-meta">{d.data}</span>
              <span className="gest-doc__nc-meta">{d.riferimento || '—'}</span>
              <span className="gest-doc__nc-meta">Importo {fmtEUR(d.importo)}</span>
              <span className="gest-doc__nc-meta">Disponibile {fmtEUR(d.importo)}</span>
            </div>
          </div>
        ))}
        {fuoriGiornata && (
          <div className="gest-doc__warn"><i className="fa-solid fa-triangle-exclamation" /> Lo scontrino può essere annullato solo nella giornata di emissione.</div>
        )}
        <TextareaField name="causale" label="Causale" rows={3} value={causale} onChange={(e) => setCausale(e.target.value)} placeholder="Causale facoltativa" />
      </div>
      <footer className="gest-doc__drawer-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => onConferma(causale)}>Conferma</button>
      </footer>
    </aside>
  )
}

// ─── DRAWER: Quietanza fattura ───────────────────────────────────────────────

function QuietanzaDrawer({ docs, onClose, onConferma }: { docs: Documento[]; onClose: () => void; onConferma: (voce: string, causale: string) => void }) {
  const [voce, setVoce] = useState('')
  const [causale, setCausale] = useState('')
  const totale = docs.reduce((s, d) => s + (d.saldo ?? d.importo), 0)

  return (
    <aside className="gest-doc__drawer">
      <header className="gest-doc__drawer-head">
        <h3>Quietanza fattura</h3>
        <button type="button" className="gest-doc__drawer-close" aria-label="Chiudi" onClick={onClose}><i className="fa-light fa-xmark" /></button>
      </header>
      <div className="gest-doc__drawer-body">
        <div className="gest-doc__drawer-tot"><span>Totale da quietanzare:</span><strong>{fmtEUR(totale)}</strong></div>
        {docs.map((d) => (
          <div key={d.id} className="gest-doc__nc-card">
            <div className="gest-doc__nc-card-head">
              <span className="gest-doc__nc-num">{d.numero}</span>
              <span className="gest-doc__nc-meta">{d.data}</span>
              <span className="gest-doc__nc-meta">{d.ragioneSociale || d.riferimento || '—'}</span>
              <span className="gest-doc__nc-meta">Importo {fmtEUR(d.importo)}</span>
              <span className="gest-doc__nc-meta">Residuo {fmtEUR(d.saldo ?? 0)}</span>
            </div>
          </div>
        ))}
        <SelectField name="voce" label="Voce incasso" value={voce} onChange={(e) => setVoce(e.target.value)} options={[{ value: '', label: 'Seleziona' }, ...VOCI_INCASSO.map((v) => ({ value: v, label: v }))]} />
        <TextareaField name="causale" label="Causale" rows={3} value={causale} onChange={(e) => setCausale(e.target.value)} placeholder="Causale facoltativa" />
      </div>
      <footer className="gest-doc__drawer-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!voce} onClick={() => onConferma(voce, causale)}>Conferma</button>
      </footer>
    </aside>
  )
}

// ─── MODAL: Dettaglio documento ──────────────────────────────────────────────

function DettaglioDocumentoModal({ doc, onClose }: { doc: Documento | null; onClose: () => void }) {
  return (
    <Modal open={!!doc} onClose={onClose} title={`Documento ${doc?.numero ?? ''}`} size="md">
      {doc && (
        <>
          <dl className="gest-doc__detail">
            <div className="gest-doc__detail-row"><dt>Tipologia</dt><dd>{doc.tipologia}</dd></div>
            <div className="gest-doc__detail-row"><dt>Data documento</dt><dd>{doc.data}</dd></div>
            <div className="gest-doc__detail-row"><dt>Emesso da</dt><dd>{doc.emessoDa}</dd></div>
            <div className="gest-doc__detail-row"><dt>Riferimento</dt><dd>{doc.riferimento || '-'}</dd></div>
            <div className="gest-doc__detail-row"><dt>Ragione sociale</dt><dd>{doc.ragioneSociale || '-'}</dd></div>
            <div className="gest-doc__detail-row"><dt>Voce incasso</dt><dd>{doc.voceIncasso || '-'}</dd></div>
            <div className="gest-doc__detail-row"><dt>Importo</dt><dd>{fmtEUR(doc.importo)}</dd></div>
            <div className="gest-doc__detail-row"><dt>Saldo</dt><dd>{doc.saldo == null ? '-' : fmtEUR(doc.saldo)}</dd></div>
            <div className="gest-doc__detail-row"><dt>Stato</dt><dd><span className={`gest-doc__stato gest-doc__stato--${STATO_CLASS(doc.stato)}`}>{doc.stato}</span></dd></div>
          </dl>
          <div className="gest-doc__detail-foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--primary"><i className="fa-light fa-file-pdf" /> Scarica PDF</button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── MODAL: Storico documento ────────────────────────────────────────────────

function StoricoModal({ doc, onClose }: { doc: Documento | null; onClose: () => void }) {
  const eventi = doc ? [
    { data: doc.data, testo: `Documento ${doc.numero} emesso da ${doc.emessoDa}` },
    { data: doc.data, testo: `Incasso registrato (${doc.voceIncasso || 'n/d'}) — ${fmtEUR(doc.importo)}` },
    { data: doc.data, testo: 'Riferimento prenotazione aggiornato' },
  ] : []
  return (
    <Modal open={!!doc} onClose={onClose} title={`Storico ${doc?.numero ?? ''}`} size="md">
      <ul className="gest-doc__storico">
        {eventi.map((e, i) => (
          <li key={i} className="gest-doc__storico-item">
            <i className="fa-solid fa-circle gest-doc__storico-dot" />
            <div><div className="gest-doc__storico-data">{e.data}</div><div>{e.testo}</div></div>
          </li>
        ))}
      </ul>
      <div className="gest-doc__detail-foot"><button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Chiudi</button></div>
    </Modal>
  )
}
