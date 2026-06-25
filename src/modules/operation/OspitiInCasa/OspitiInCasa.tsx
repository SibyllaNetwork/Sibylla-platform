import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import { apiFetchSibylla } from '../../../services/api'
import { DateRangeField, SelectField } from '../../../core/components/form'
import { withFlag } from '../../../core/utils/countryFlags'
import './OspitiInCasa.sass'

const PAGE_SIZE = 10

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Ospite {
  id: number
  prenotazioneNum: string
  camera: string
  ospite: string
  fasciaEta: string
  arrivo: string
  partenza: string
  arrangiamento: string
  arrangiamentoIcon: string
  canale: string
  canaleIcon: string
  tipoPren: string
  vip: boolean
  hasNotes: boolean
}

interface OspiteScaduto {
  id: number
  prenotazioneNum: string
  camera: string
  ospite: string
  arrivo: string
  partenza: string
  selected: boolean
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  ospiti: Ospite[]
  ospitiScaduti: OspiteScaduto[]
}

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  ospiti: [
    { id: 1,  prenotazioneNum: '14881', camera: '101', ospite: 'Calabretti Vladimir',     fasciaEta: 'Adulto', arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: true },
    { id: 2,  prenotazioneNum: '14881', camera: '101', ospite: 'Calabretti Sofia',         fasciaEta: 'Bambino', arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: true },
    { id: 3,  prenotazioneNum: '14903', camera: '102', ospite: 'Bianchi Marco',            fasciaEta: 'Adulto',  arrivo: '23/04/2026', partenza: '02/05/2026', arrangiamento: 'Senza colazione', arrangiamentoIcon: 'ban',              canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: true,  hasNotes: false },
    { id: 4,  prenotazioneNum: '14903', camera: '102', ospite: 'Bianchi Anna',             fasciaEta: 'Adulto',  arrivo: '23/04/2026', partenza: '02/05/2026', arrangiamento: 'Senza colazione', arrangiamentoIcon: 'ban',              canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: true,  hasNotes: false },
    { id: 5,  prenotazioneNum: '14915', camera: '103', ospite: 'Rossi Giulia',             fasciaEta: 'Adulto',  arrivo: '25/04/2026', partenza: '03/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 6,  prenotazioneNum: '14922', camera: '105', ospite: 'Verdi Paolo',              fasciaEta: 'Adulto',  arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 7,  prenotazioneNum: '14922', camera: '105', ospite: 'Verdi Laura',              fasciaEta: 'Infante', arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 8,  prenotazioneNum: '14931', camera: '201', ospite: 'Romano Federico',          fasciaEta: 'Adulto',  arrivo: '23/04/2026', partenza: '30/04/2026', arrangiamento: 'Senza colazione', arrangiamentoIcon: 'ban',              canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 9,  prenotazioneNum: '14938', camera: '202', ospite: 'De Luca Sara',             fasciaEta: 'Adulto',  arrivo: '26/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: true },
    { id: 10, prenotazioneNum: '14942', camera: '203', ospite: 'Greco Alessandro',         fasciaEta: 'Adulto',  arrivo: '25/04/2026', partenza: '02/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 11, prenotazioneNum: '14951', camera: '205', ospite: 'Conti Martina',            fasciaEta: 'Adulto',  arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 12, prenotazioneNum: '14951', camera: '205', ospite: 'Conti Davide',             fasciaEta: 'Bambino', arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 13, prenotazioneNum: '14958', camera: '301', ospite: 'Marini Lorenzo',           fasciaEta: 'Adulto',  arrivo: '23/04/2026', partenza: '01/05/2026', arrangiamento: 'Senza colazione', arrangiamentoIcon: 'ban',              canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 14, prenotazioneNum: '14958', camera: '301', ospite: 'Marini Elena',             fasciaEta: 'Adulto',  arrivo: '23/04/2026', partenza: '01/05/2026', arrangiamento: 'Senza colazione', arrangiamentoIcon: 'ban',              canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 15, prenotazioneNum: '14965', camera: '302', ospite: 'Esposito Luca',            fasciaEta: 'Adulto',  arrivo: '27/04/2026', partenza: '02/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 16, prenotazioneNum: '14971', camera: '303', ospite: 'Galli Chiara',             fasciaEta: 'Adulto',  arrivo: '26/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 17, prenotazioneNum: '14982', camera: '305', ospite: 'Ferri Stefano',            fasciaEta: 'Adulto',  arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 18, prenotazioneNum: '14982', camera: '305', ospite: 'Ferri Roberta',            fasciaEta: 'Adulto',  arrivo: '24/04/2026', partenza: '01/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 19, prenotazioneNum: '14990', camera: '306', ospite: 'Costa Marta',              fasciaEta: 'Adulto',  arrivo: '25/04/2026', partenza: '02/05/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'GAR S.R.L', canaleIcon: 'building',  tipoPren: 'Individuale', vip: false, hasNotes: false },
    { id: 20, prenotazioneNum: '14997', camera: '307', ospite: 'Novi Ruggero',             fasciaEta: 'Adulto',  arrivo: '23/04/2026', partenza: '30/04/2026', arrangiamento: 'Con colazione',  arrangiamentoIcon: 'mug-saucer',       canale: 'Sibylla',   canaleIcon: 'globe',     tipoPren: 'Individuale', vip: false, hasNotes: false },
  ],
  ospitiScaduti: [
    { id: 1, prenotazioneNum: '14881', camera: '101', ospite: 'Calabretti Vladimir', arrivo: '24/04/2026', partenza: '29/04/2026', selected: true  },
    { id: 2, prenotazioneNum: '14903', camera: '102', ospite: 'Bianchi Marco',       arrivo: '23/04/2026', partenza: '29/04/2026', selected: false },
    { id: 3, prenotazioneNum: '14931', camera: '201', ospite: 'Romano Federico',     arrivo: '23/04/2026', partenza: '29/04/2026', selected: true  },
  ],
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'fasciaEta' | 'arrangiamento' | 'canale'
type ColSearchKey = 'prenotazioneNum' | 'camera' | 'ospite'

const FASCIA_ETA_ICONS: Record<string, string> = {
  'Infante': 'baby',
  'Bambino': 'child',
  'Adulto':  'people-simple',
}
const ARRANGIAMENTO_ICONS: Record<string, string> = {
  'Con colazione':  'mug-saucer',
  'Senza colazione': 'ban',
}

export default function OspitiInCasa({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [dataDa, setDataDa] = useState('2026-04-23')
  const [dataA, setDataA] = useState('2026-04-30')
  const [showAvviso, setShowAvviso] = useState(true)
  const [scaduti, setScaduti] = useState<OspiteScaduto[]>(FALLBACK.ospitiScaduti)
  const [anagrafica, setAnagrafica] = useState<Ospite | null>(null)
  const [page, setPage] = useState(1)

  // Column filters
  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    fasciaEta: [],
    arrangiamento: [],
    canale: [],
  })

  // Column searches
  const [openSearch, setOpenSearch] = useState<ColSearchKey | null>(null)
  const [colSearches, setColSearches] = useState<Record<ColSearchKey, string>>({
    prenotazioneNum: '',
    camera: '',
    ospite: '',
  })
  const setColSearch = (k: ColSearchKey, v: string) =>
    setColSearches((p) => ({ ...p, [k]: v }))

  const toggleColFilter = (key: ColFilterKey, value: string) => {
    setColFilters((p) => {
      const cur = p[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...p, [key]: next }
    })
  }
  const setAllColFilter = (key: ColFilterKey, allValues: string[], select: boolean) => {
    setColFilters((p) => ({ ...p, [key]: select ? [...allValues] : [] }))
  }

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetOspitiInCasa', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: dataDa, a: dataA },
    })
      .then((d) => {
        if (cancelled) return
        setData(d)
        setScaduti(d.ospitiScaduti || [])
      })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDa, dataA, data.StrutturaId])

  const fasceEtaDistinct     = useMemo(() => Array.from(new Set(data.ospiti.map((r) => r.fasciaEta))).sort(),     [data.ospiti])
  const arrangiamentiDistinct = useMemo(() => Array.from(new Set(data.ospiti.map((r) => r.arrangiamento))).sort(), [data.ospiti])
  const canaliDistinct       = useMemo(() => Array.from(new Set(data.ospiti.map((r) => r.canale))).sort(),       [data.ospiti])

  const ospiti = useMemo(() => {
    let rows = data.ospiti
    const q = search.toLowerCase().trim()
    if (q) {
      const isCamera = q.startsWith('#')
      const term = isCamera ? q.slice(1) : q
      rows = rows.filter((r) =>
        isCamera
          ? r.camera.toLowerCase().includes(term)
          : r.prenotazioneNum.includes(term) ||
            r.camera.toLowerCase().includes(term) ||
            r.ospite.toLowerCase().includes(term),
      )
    }
    if (colSearches.prenotazioneNum.trim())
      rows = rows.filter((r) => r.prenotazioneNum.includes(colSearches.prenotazioneNum.trim()))
    if (colSearches.camera.trim())
      rows = rows.filter((r) => r.camera.toLowerCase().includes(colSearches.camera.toLowerCase().trim()))
    if (colSearches.ospite.trim())
      rows = rows.filter((r) => r.ospite.toLowerCase().includes(colSearches.ospite.toLowerCase().trim()))
    if (colFilters.fasciaEta.length)     rows = rows.filter((r) => colFilters.fasciaEta.includes(r.fasciaEta))
    if (colFilters.arrangiamento.length) rows = rows.filter((r) => colFilters.arrangiamento.includes(r.arrangiamento))
    if (colFilters.canale.length)        rows = rows.filter((r) => colFilters.canale.includes(r.canale))
    return rows
  }, [data.ospiti, search, colFilters, colSearches])

  // Stats
  const totPresenze = ospiti.length
  const totCamere = new Set(ospiti.map((o) => o.camera)).size
  const totGruppi = ospiti.filter((o) => o.tipoPren?.toLowerCase().includes('gruppo')).length
  const pctGruppi = ospiti.length ? Math.round((totGruppi / ospiti.length) * 100) : 0
  const pctIndividuali = ospiti.length ? 100 - pctGruppi : 100

  // Pagination
  const totalPages = Math.max(1, Math.ceil(ospiti.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, colSearches, colFilters, dataDa, dataA, data.StrutturaId])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const ospitiPage = ospiti.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleScaduto = (id: number) =>
    setScaduti((p) => p.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)))

  const checkoutMassa = () => {
    setShowAvviso(false)
  }

  return (
    <div className="ospiti-casa">
      <BtnBack />
      <PageHeader
        title="Ospiti in casa"
        subtitle="Elenco degli ospiti attualmente presenti in struttura"
      />

      {/* ─── Toolbar filtri ──────────────────────────────────────────────── */}
      <div className="ospiti-casa__bar">
        <div className="ospiti-casa__bar-left">
          <SelectField
            className="ospiti-casa__field ospiti-casa__select-field"
            name="struttura"
            label="Struttura"
            value={data.StrutturaId ?? ''}
            options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          />

          <DateRangeField
            className="ospiti-casa__field"
            nameFrom="dataDa"
            nameTo="dataA"
            label="Periodo"
            valueFrom={dataDa}
            valueTo={dataA}
            onChangeFrom={(e) => setDataDa(e.target.value)}
            onChangeTo={(e) => setDataA(e.target.value)}
          />

          <div className="ospiti-casa__field ospiti-casa__field--grow">
            <label>Cerca</label>
            <div className="ospiti-casa__search-field">
              <input
                type="search"
                className="sib-input"
                placeholder="Prenotazione, camera (anteponendo #) o ospite"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fa-light fa-magnifying-glass ospiti-casa__search-icon" />
            </div>
          </div>
        </div>

        <div className="ospiti-casa__bar-right">
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta PDF" aria-label="Esporta PDF"><i className="fa-light fa-file-pdf" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta XLS" aria-label="Esporta XLS"><i className="fa-light fa-file-excel" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Avvisi" aria-label="Avvisi" onClick={() => setShowAvviso(true)}>
            <i className="fa-light fa-bell" />
          </button>
        </div>
      </div>

      {/* ─── Stats ───────────────────────────────────────────────────────── */}
      <div className="ospiti-casa__bar ospiti-casa__bar--info">
        <div className="ospiti-casa__stats">
          <span className="ospiti-casa__stat"><i className="fa-light fa-user" /> Presenze: <strong>{totPresenze}</strong></span>
          <span className="ospiti-casa__stat"><i className="fa-light fa-bed-front" /> Camere: <strong>{totCamere}</strong></span>
          <span className="ospiti-casa__stat"><i className="fa-light fa-users" /> Gruppi: <strong>{pctGruppi}%</strong></span>
          <span className="ospiti-casa__stat"><i className="fa-light fa-user-check" /> Individuali: <strong>{pctIndividuali}%</strong></span>
        </div>
      </div>

      {/* ─── Tabella ─────────────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table ospiti-casa__table">
          <thead>
            <tr>
              <th>
                <ColSearchHeader
                  label="Prenotazione"
                  value={colSearches.prenotazioneNum}
                  open={openSearch === 'prenotazioneNum'}
                  onToggleOpen={() => setOpenSearch(openSearch === 'prenotazioneNum' ? null : 'prenotazioneNum')}
                  onChange={(v) => setColSearch('prenotazioneNum', v)}
                />
              </th>
              <th>
                <ColSearchHeader
                  label="Camera N°"
                  value={colSearches.camera}
                  open={openSearch === 'camera'}
                  onToggleOpen={() => setOpenSearch(openSearch === 'camera' ? null : 'camera')}
                  onChange={(v) => setColSearch('camera', v)}
                />
              </th>
              <th>
                <ColSearchHeader
                  label="Ospite"
                  value={colSearches.ospite}
                  open={openSearch === 'ospite'}
                  onToggleOpen={() => setOpenSearch(openSearch === 'ospite' ? null : 'ospite')}
                  onChange={(v) => setColSearch('ospite', v)}
                  extraIcon={<i className="fa-light fa-star ospiti-casa__col-ico" title="VIP" />}
                />
              </th>
              <th className="ospiti-casa__th-center" />
              <th>
                <ColFilterHeader
                  label="Fascia età"
                  popupTitle="scelte multiple"
                  options={fasceEtaDistinct}
                  iconMap={FASCIA_ETA_ICONS}
                  selected={colFilters.fasciaEta}
                  open={openFilter === 'fasciaEta'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'fasciaEta' ? null : 'fasciaEta')}
                  onToggle={(v) => toggleColFilter('fasciaEta', v)}
                  onSelectAll={(s) => setAllColFilter('fasciaEta', fasceEtaDistinct, s)}
                />
              </th>
              <th>Arrivo</th>
              <th>Partenza</th>
              <th>
                <ColFilterHeader
                  label="Arrangiamento"
                  popupTitle="scelte multiple"
                  options={arrangiamentiDistinct}
                  iconMap={ARRANGIAMENTO_ICONS}
                  selected={colFilters.arrangiamento}
                  open={openFilter === 'arrangiamento'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'arrangiamento' ? null : 'arrangiamento')}
                  onToggle={(v) => toggleColFilter('arrangiamento', v)}
                  onSelectAll={(s) => setAllColFilter('arrangiamento', arrangiamentiDistinct, s)}
                />
              </th>
              <th>
                <ColFilterHeader
                  label="Canale"
                  popupTitle="scelte multiple"
                  options={canaliDistinct}
                  selected={colFilters.canale}
                  open={openFilter === 'canale'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'canale' ? null : 'canale')}
                  onToggle={(v) => toggleColFilter('canale', v)}
                  onSelectAll={(s) => setAllColFilter('canale', canaliDistinct, s)}
                />
              </th>
              <th>Tipo prenotazione</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {ospiti.length === 0 ? (
              <tr><td colSpan={11} className="sib-empty">Nessun ospite presente per i criteri selezionati.</td></tr>
            ) : ospitiPage.map((r) => (
              <tr key={r.id}>
                <td><span className="ospiti-casa__pren-badge"><i className="fa-light fa-id-card" /> {r.prenotazioneNum}</span></td>
                <td>{r.camera}</td>
                <td>
                  <span className="ospiti-casa__ospite-cell">
                    {r.ospite}
                    {r.vip && <i className="fa-solid fa-star ospiti-casa__vip" title="VIP" />}
                  </span>
                </td>
                <td className="ospiti-casa__td-center">
                  <div className="ospiti-casa__row-icons">
                    <button type="button" className="sib-btn sib-btn--icon" title="Check-Out prenotazione" aria-label="Check-Out prenotazione"><i className="fa-light fa-arrow-right-from-bracket" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Check-Out camera" aria-label="Check-Out camera"><i className="fa-light fa-bed" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Modifica soggiorno" aria-label="Modifica soggiorno"><i className="fa-light fa-calendar-pen" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Cambio camera" aria-label="Cambio camera"><i className="fa-light fa-person-walking-arrow-right" /></button>
                  </div>
                </td>
                <td>{r.fasciaEta}</td>
                <td>{r.arrivo}</td>
                <td>{r.partenza}</td>
                <td className="ospiti-casa__td-center">
                  <i className={`fa-light fa-${r.arrangiamentoIcon}`} title={r.arrangiamento} />
                </td>
                <td className="ospiti-casa__td-center">
                  <i className={`fa-light fa-${r.canaleIcon}`} title={r.canale} />
                </td>
                <td className="ospiti-casa__td-center">
                  <i className={`fa-light fa-${r.tipoPren?.toLowerCase().includes('gruppo') ? 'users' : 'user'}`} title={r.tipoPren} />
                </td>
                <td>
                  <div className="ospiti-casa__actions">
                    <button type="button" className="sib-btn sib-btn--icon" title="Modifica" aria-label="Modifica" onClick={() => setAnagrafica(r)}><i className="fa-light fa-pen" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Conto camera" aria-label="Conto camera" onClick={() => navigate('conti-camera')}><i className="fa-light fa-receipt" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Chiudi conto" aria-label="Chiudi conto" onClick={() => navigate('emissione-documenti')}><i className="fa-light fa-circle-check" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Check-out ospite" aria-label="Check-out ospite"><i className="fa-light fa-right-from-bracket" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ospiti-casa__pagination">
        <span className="ospiti-casa__pagination-info">
          {ospiti.length > 0
            ? `Risultati ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, ospiti.length)} di ${ospiti.length}`
            : '0 risultati'}
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* ─── Modal Anagrafica Ospite ────────────────────────────────────── */}
      {anagrafica && <AnagraficaModal ospite={anagrafica} onClose={() => setAnagrafica(null)} />}

      {/* ─── Modal Avviso ────────────────────────────────────────────────── */}
      {showAvviso && scaduti.length > 0 && (
        <div className="ospiti-casa__modal-overlay" onClick={() => setShowAvviso(false)}>
          <div className="ospiti-casa__modal" onClick={(e) => e.stopPropagation()}>
            <div className="ospiti-casa__modal-head">
              <h3>
                <i className="fa-light fa-triangle-exclamation" /> Avviso
              </h3>
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Chiudi" onClick={() => setShowAvviso(false)}>
                <i className="fa-light fa-xmark" />
              </button>
            </div>

            <div className="ospiti-casa__modal-body">
              <p className="ospiti-casa__modal-msg">
                Ospiti con data di partenza superata e checkout non effettuato
              </p>

              <table className="sib-table ospiti-casa__modal-table">
                <thead>
                  <tr>
                    <th>Prenotazione</th>
                    <th>Camera</th>
                    <th>Ospite</th>
                    <th>Arrivo</th>
                    <th>Partenza</th>
                    <th className="ospiti-casa__th-center">Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {scaduti.map((s) => (
                    <tr key={s.id}>
                      <td><span className="ospiti-casa__pren-badge"><i className="fa-light fa-id-card" /> {s.prenotazioneNum}</span></td>
                      <td>{s.camera}</td>
                      <td>{s.ospite}</td>
                      <td>{s.arrivo}</td>
                      <td className="sib-cell--error">{s.partenza}</td>
                      <td className="ospiti-casa__td-center">
                        <input
                          type="checkbox"
                          className="sib-checkbox"
                          checked={s.selected}
                          onChange={() => toggleScaduto(s.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ospiti-casa__modal-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setShowAvviso(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={checkoutMassa}>
                <i className="fa-light fa-right-from-bracket" /> Check-Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ANAGRAFICA MODAL ─────────────────────────────────────────────────────────

const PAESI = [
  'ITALIA', 'ANDORRA', 'AUSTRIA', 'BELGIO', 'CROAZIA', 'DANIMARCA', 'FINLANDIA',
  'FRANCIA', 'GERMANIA', 'GRECIA', 'IRLANDA', 'LUSSEMBURGO', 'NORVEGIA',
  'PAESI BASSI', 'POLONIA', 'PORTOGALLO', 'REGNO UNITO', 'REPUBBLICA CECA',
  'ROMANIA', 'SLOVACCHIA', 'SLOVENIA', 'SPAGNA', 'SVEZIA', 'SVIZZERA', 'UNGHERIA',
]
const TIPOLOGIE_OSPITE = ['Ospite singolo', 'Capo gruppo', 'Familiare', 'Bambino', 'Infante']
const TIPI_DOCUMENTO = ['Carta identità', 'Passaporto', 'Patente di guida', 'Permesso di soggiorno']

function AnagraficaModal({ ospite, onClose }: { ospite: Ospite; onClose: () => void }) {
  const parts = ospite.ospite.split(' ')
  const cognome = parts[0] || ''
  const nome    = parts.slice(1).join(' ') || ''

  const [form, setForm] = useState({
    nome,
    cognome,
    sesso: 'Maschio',
    dataNascita: '1958-08-15',
    paeseNascita: 'ANDORRA',
    tipologia: 'Ospite singolo',
    paeseResidenza: 'FINLANDIA',
    tipoDocumento: 'Patente di guida',
    numeroDocumento: 'AG3344234',
    scadenza: '2030-09-15',
    emessoDa: 'Comune',
    vip: ospite.vip,
    note: '',
    esenzioneTassa: false,
  })

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }))

  const fieldClass = (filled: boolean) =>
    'oc-anag__field' + (filled ? ' oc-anag__field--ok' : '')

  return (
    <div className="ospiti-casa__modal-overlay" onClick={onClose}>
      <div className="ospiti-casa__modal oc-anag" onClick={(e) => e.stopPropagation()}>
        <div className="ospiti-casa__modal-head">
          <h3>Anagrafica ospite</h3>
          <button type="button" className="sib-btn sib-btn--icon" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>

        <div className="ospiti-casa__modal-body oc-anag__body">
          <div className="oc-anag__grid oc-anag__grid--4">
            <div className={fieldClass(!!form.nome)}>
              <label>Nome*</label>
              <input className="sib-input" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
              {form.nome && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className={fieldClass(!!form.cognome)}>
              <label>Cognome*</label>
              <input className="sib-input" value={form.cognome} onChange={(e) => set('cognome', e.target.value)} />
              {form.cognome && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className={fieldClass(!!form.sesso)}>
              <label>Sesso*</label>
              <select className="sib-select" value={form.sesso} onChange={(e) => set('sesso', e.target.value)}>
                <option value="Maschio">Maschio</option>
                <option value="Femmina">Femmina</option>
              </select>
              {form.sesso && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className={fieldClass(!!form.dataNascita)}>
              <label>Data di Nascita*</label>
              <input type="date" className="sib-input" value={form.dataNascita} onChange={(e) => set('dataNascita', e.target.value)} />
              {form.dataNascita && <i className="fa-light fa-check oc-anag__check" />}
            </div>
          </div>

          <div className="oc-anag__grid oc-anag__grid--2">
            <div className={fieldClass(!!form.paeseNascita)}>
              <label>Paese di nascita*</label>
              <select className="sib-select" value={form.paeseNascita} onChange={(e) => set('paeseNascita', e.target.value)}>
                {PAESI.map((p) => <option key={p} value={p}>{withFlag(p)}</option>)}
              </select>
              {form.paeseNascita && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className="oc-anag__field">
              <label>Tipologia ospite*</label>
              <select className="sib-select" value={form.tipologia} onChange={(e) => set('tipologia', e.target.value)}>
                {TIPOLOGIE_OSPITE.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="oc-anag__grid oc-anag__grid--2">
            <div className={fieldClass(!!form.paeseResidenza)}>
              <label>Paese di residenza*</label>
              <select className="sib-select" value={form.paeseResidenza} onChange={(e) => set('paeseResidenza', e.target.value)}>
                {PAESI.map((p) => <option key={p} value={p}>{withFlag(p)}</option>)}
              </select>
              {form.paeseResidenza && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div /> {/* spacer */}
          </div>

          <div className="oc-anag__grid oc-anag__grid--4">
            <div className={fieldClass(!!form.tipoDocumento)}>
              <label>Documento identità*</label>
              <select className="sib-select" value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)}>
                {TIPI_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {form.tipoDocumento && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className={fieldClass(!!form.numeroDocumento)}>
              <label>Numero di documento*</label>
              <input className="sib-input" value={form.numeroDocumento} onChange={(e) => set('numeroDocumento', e.target.value)} />
              {form.numeroDocumento && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className={fieldClass(!!form.scadenza)}>
              <label>Scade il*</label>
              <input type="date" className="sib-input" value={form.scadenza} onChange={(e) => set('scadenza', e.target.value)} />
              {form.scadenza && <i className="fa-light fa-check oc-anag__check" />}
            </div>
            <div className={fieldClass(!!form.emessoDa)}>
              <label>Emesso da*</label>
              <input className="sib-input" value={form.emessoDa} onChange={(e) => set('emessoDa', e.target.value)} />
              {form.emessoDa && <i className="fa-light fa-check oc-anag__check" />}
            </div>
          </div>

          <div className="oc-anag__grid oc-anag__grid--3">
            <div className="oc-anag__field">
              <label>Carica documento</label>
              <label className="oc-anag__file">
                <input type="file" hidden />
                <span>Scegli file</span>
              </label>
            </div>
            <div className="oc-anag__field">
              <label>Acquisisci documento</label>
              <button type="button" className="sib-btn sib-btn--secondary oc-anag__acquisisci">
                <i className="fa-light fa-camera" /> Acquisisci
              </button>
            </div>
            <label className="oc-anag__check-row">
              <input type="checkbox" className="sib-checkbox" checked={form.vip} onChange={(e) => set('vip', e.target.checked)} />
              <span>VIP</span>
            </label>
          </div>

          <div className={fieldClass(!!form.note)}>
            <label>Note</label>
            <textarea
              className="sib-input oc-anag__textarea"
              rows={2}
              placeholder="Inserire note aggiuntive"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
            {form.note && <i className="fa-light fa-check oc-anag__check oc-anag__check--textarea" />}
          </div>

          <label className="oc-anag__check-row">
            <input
              type="checkbox"
              className="sib-checkbox"
              checked={form.esenzioneTassa}
              onChange={(e) => set('esenzioneTassa', e.target.checked)}
            />
            <span>Esenzione tassa di sogg.</span>
          </label>
        </div>

        <div className="ospiti-casa__modal-foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Salva</button>
        </div>
      </div>
    </div>
  )
}

// ─── COL FILTER HEADER ────────────────────────────────────────────────────────

interface ColFilterHeaderProps {
  label: string
  popupTitle: string
  options: string[]
  iconMap?: Record<string, string>
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader(props: ColFilterHeaderProps) {
  const { label, popupTitle, options, iconMap, selected, open, onToggleOpen, onToggle, onSelectAll } = props
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0

  return (
    <div className="oc-colfilter">
      <span>{label}</span>
      <button
        type="button"
        className={'oc-colfilter__btn' + (hasFilter ? ' oc-colfilter__btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="oc-colfilter__overlay" onClick={onToggleOpen} />
          <div className="oc-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="oc-colfilter__title">{popupTitle}</div>
            <label className="oc-colfilter__option">
              <input
                type="checkbox"
                className="sib-checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="oc-colfilter__option">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                />
                {iconMap?.[opt] && <i className={`fa-light fa-${iconMap[opt]} oc-colfilter__opt-ico`} />}
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── COL SEARCH HEADER ────────────────────────────────────────────────────────

interface ColSearchHeaderProps {
  label: string
  value: string
  open: boolean
  onToggleOpen: () => void
  onChange: (v: string) => void
  extraIcon?: React.ReactNode
}

function ColSearchHeader(props: ColSearchHeaderProps) {
  const { label, value, open, onToggleOpen, onChange, extraIcon } = props
  const hasValue = value.trim().length > 0

  return (
    <div className="oc-colsearch">
      <span>{label}</span>
      <button
        type="button"
        className={'oc-colsearch__btn' + (hasValue ? ' oc-colsearch__btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Cerca in ${label}`}
      >
        <i className="fa-light fa-magnifying-glass" />
      </button>
      {extraIcon}
      {open && (
        <>
          <div className="oc-colsearch__overlay" onClick={onToggleOpen} />
          <div className="oc-colsearch__popup" onClick={(e) => e.stopPropagation()}>
            <div className="oc-colsearch__title">Cerca</div>
            <input
              type="search"
              className="sib-input oc-colsearch__input"
              placeholder="Cerca..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
        </>
      )}
    </div>
  )
}
