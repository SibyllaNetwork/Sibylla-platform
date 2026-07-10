import React, { useEffect, useState, useRef, useMemo } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../../services/api'
import { SelectField, RadioGroup, InputField, DateRangeField, NazionalitaSelect, NazionalitaMultiSelect, FlagBadge } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import {
  buildContratto, nextRowId, SEGMENTI, STAGIONI_DEF, segParts,
  type Contratto, type Segmento, type ContrattoInput,
} from './contratto'
import { scaricaContrattoPdf } from './contrattoPdf'
import { useAnnunciStore, type AnnuncioPubblicato } from '../../../../store/useAnnunciStore'
import './ComponiAnnunci.sass'

type ConfirmFn = (o: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>

// ─── TIPI ─────────────────────────────────────────────────────────────────────
type Tipo = 'Vendita' | 'Acquisto'
type Tipologia = 'Struttura' | 'Categoria'
type StatoBacheca = 'In bozza' | 'Pubblicato'

interface Params {
  tipo: Tipo
  tipologia: Tipologia
  strutturaId: number | null
  categoria: string
  tipoOspiti: string
  segmento: Segmento
  marketSpecific: string[]
  tipologiaBase: string
  tipoLotti: string
  dataDa: string
  dataA: string
  tourOperator: string
  quantita: number
  quantitaMax: number
  tipologiaPagamento: string
  // Solo per Tipo = Acquisto
  citta: string
  categoriaLivello: string
  tipologiaCamere: string
}

interface RigaBacheca {
  id: number
  periodo: string
  tipologia: Tipo
  segmento: Segmento
  preferito: boolean
  quantita: string
  stato: StatoBacheca
  contratto?: Contratto
  categoria?: string   // stelle (3/4/5) per la pubblicazione in Agorà
}

// ─── OPZIONI ────────────────────────────────────────────────────────────────
const STRUTTURE = [{ Id: 1, nome: "Grim's Hotel" }, { Id: 2, nome: 'Hotel Azzurro Mare' }]
// Categoria struttura = classificazione a stelle (3 / 4 / 5).
const CATEGORIE_STELLE = [
  { value: '3', label: '★★★ · 3 stelle' },
  { value: '4', label: '★★★★ · 4 stelle' },
  { value: '5', label: '★★★★★ · 5 stelle' },
]
const CITTA = ['Roma', 'Milano', 'Catania', 'Firenze', 'Napoli', 'Torino', 'Bologna', 'Venezia']
const TIPOLOGIA_CAMERE = ['Singola Classic', 'Doppia Classic', 'Doppia Superior', 'Tripla Classic', 'Matrimoniale', 'Suite']
const TIPO_OSPITI = ['Individuali', 'Gruppi']
const TIPOLOGIA_BASE = ['Base doppia', 'Base singola', 'Base tripla']
const TIPO_LOTTI = ['Lotto', '1/2 Lotto']
const TOUR_OPERATOR = ['Tutti', 'TUI', 'Alpitour', 'Eden Viaggi', 'Veratour', 'Bluvacanze']
const PAGAMENTO = ['VCC', 'Bonifico']

const periodLabel = (da: string, a: string) => {
  const f = (iso: string) => { const [y, m] = iso.split('-'); return `${Number(m)}/${y}` }
  return da && a ? `${f(da)} - ${f(a)}` : ''
}

// ─── BACHECA seed ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

const BACHECA_INIT: RigaBacheca[] = [
  { id: 1,  periodo: '3/2026 - 6/2026',   tipologia: 'Vendita',  segmento: 'Adulti',            preferito: true,  quantita: '1 Lotto',  stato: 'Pubblicato' },
  { id: 2,  periodo: '2/2026 - 5/2026',   tipologia: 'Vendita',  segmento: 'Studenti',          preferito: false, quantita: '1 Lotto',  stato: 'Pubblicato' },
  { id: 3,  periodo: '11/2025 - 4/2026',  tipologia: 'Acquisto', segmento: 'Adulti e studenti', preferito: false, quantita: '6 Lotti',  stato: 'In bozza'   },
  { id: 4,  periodo: '12/2025 - 4/2026',  tipologia: 'Vendita',  segmento: 'Adulti',            preferito: false, quantita: '1 Lotto',  stato: 'In bozza'   },
  { id: 5,  periodo: '11/2025 - 4/2026',  tipologia: 'Vendita',  segmento: 'Studenti',          preferito: false, quantita: '4 Lotti',  stato: 'Pubblicato' },
  { id: 6,  periodo: '1/2026 - 4/2026',   tipologia: 'Acquisto', segmento: 'Adulti',            preferito: true,  quantita: '2 Lotti',  stato: 'Pubblicato' },
  { id: 7,  periodo: '4/2026 - 9/2026',   tipologia: 'Vendita',  segmento: 'Adulti e studenti', preferito: false, quantita: '3 Lotti',  stato: 'In bozza'   },
  { id: 8,  periodo: '5/2026 - 10/2026',  tipologia: 'Vendita',  segmento: 'Studenti',          preferito: false, quantita: '1 Lotto',  stato: 'Pubblicato' },
  { id: 9,  periodo: '7/2026 - 10/2026',  tipologia: 'Acquisto', segmento: 'Adulti',            preferito: false, quantita: '5 Lotti',  stato: 'In bozza'   },
  { id: 10, periodo: '9/2026 - 12/2026',  tipologia: 'Vendita',  segmento: 'Adulti e studenti', preferito: true,  quantita: '2 Lotti',  stato: 'Pubblicato' },
]

export default function ComponiAnnunci({ navigate }: { navigate: (p: string) => void }) {
  const confirm = useConfirmStore((s) => s.confirm)
  const pubblicaAnnuncio = useAnnunciStore((s) => s.pubblica)

  const [params, setParams] = useState<Params>({
    tipo: 'Vendita', tipologia: 'Struttura', strutturaId: 1, categoria: '4',
    tipoOspiti: 'Gruppi', segmento: 'Adulti', marketSpecific: [], tipologiaBase: 'Base doppia', tipoLotti: 'Lotto',
    dataDa: '2026-07-01', dataA: '2026-10-31', tourOperator: 'Tutti',
    quantita: 1, quantitaMax: 1, tipologiaPagamento: 'VCC',
    citta: 'Roma', categoriaLivello: '5', tipologiaCamere: 'Singola Classic',
  })
  const set = <K extends keyof Params>(k: K, v: Params[K]) => setParams((p) => ({ ...p, [k]: v }))

  const [bacheca, setBacheca] = useState<RigaBacheca[]>(BACHECA_INIT)
  const [contratto, setContratto] = useState<Contratto | null>(null)
  const [anteprima, setAnteprima] = useState<Contratto | null>(null)
  const [editingBachecaId, setEditingBachecaId] = useState<number | null>(null)
  const [boardPage, setBoardPage] = useState(1)

  // Completamento della form: frazione di campi rilevanti valorizzati per la
  // combinazione corrente (Vendita/Acquisto · Gruppi/Individuali).
  const progresso = useMemo(() => {
    const acquisto = params.tipo === 'Acquisto'
    const gruppi = params.tipoOspiti === 'Gruppi'
    const checks: boolean[] = [
      !!params.tipo,
      !!params.tipologia,
      acquisto
        ? (!!params.citta && !!params.categoriaLivello)
        : params.tipologia === 'Categoria' ? !!params.categoria : params.strutturaId != null,
      !!params.tipoOspiti,
      params.marketSpecific.length > 0,
      ...(gruppi
        ? [!!params.segmento, !!params.tipologiaBase]
        : [!!params.tipologiaCamere]),
      ...(acquisto ? [] : [!!params.tipoLotti]),
      !!params.dataDa && !!params.dataA,
      params.quantita > 0 && (acquisto || params.quantita <= params.quantitaMax),
      ...(acquisto ? [] : [params.quantitaMax > 0, !!params.tourOperator, !!params.tipologiaPagamento]),
    ]
    const done = checks.filter(Boolean).length
    const pct = Math.round((done / checks.length) * 100)
    // Livello semaforico: il colore comunica quanto manca al completamento.
    const level = pct === 100 ? 'complete' : pct >= 67 ? 'high' : pct >= 34 ? 'mid' : 'low'
    return { done, total: checks.length, pct, level }
  }, [params])

  const boardTotalPages = Math.max(1, Math.ceil(bacheca.length / PAGE_SIZE))
  useEffect(() => { if (boardPage > boardTotalPages) setBoardPage(boardTotalPages) }, [boardPage, boardTotalPages])
  const bachecaPage = bacheca.slice((boardPage - 1) * PAGE_SIZE, boardPage * PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ bacheca: RigaBacheca[] }>('annunci/GetBacheca', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled && Array.isArray(d?.bacheca)) setBacheca(d.bacheca) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Nome struttura/controparte in base ai parametri.
  const strutturaLabel = (): string => {
    if (params.tipo === 'Acquisto') return `${params.citta} · Categoria ${params.categoriaLivello} stelle`
    if (params.tipologia === 'Categoria') return `Categoria ${params.categoria} stelle`
    return STRUTTURE.find((s) => s.Id === params.strutturaId)?.nome ?? "Grim's Hotel"
  }

  // Input condiviso per il builder del contratto (partendo dai parametri correnti).
  const contrattoInput = (over: Partial<ContrattoInput> = {}): ContrattoInput => ({
    tipo: params.tipo,
    segmento: params.segmento,
    struttura: strutturaLabel(),
    tourOperator: params.tipo === 'Acquisto' ? '—' : params.tourOperator,
    periodo: periodLabel(params.dataDa, params.dataA),
    pagamento: params.tipo === 'Acquisto' ? '—' : params.tipologiaPagamento,
    quantita: params.quantita,
    tipologiaBase: params.tipoOspiti === 'Individuali' ? params.tipologiaCamere : params.tipologiaBase,
    dataDa: params.dataDa,
    dataA: params.dataA,
    ...over,
  })

  const genera = () => { setEditingBachecaId(null); setContratto(buildContratto(contrattoInput())) }
  const chiudiContratto = () => { setContratto(null); setEditingBachecaId(null) }

  // Modifica in-place del contratto in editing (campi scalari o intere liste).
  const patch = (p: Partial<Contratto>) => setContratto((c) => (c ? { ...c, ...p } : c))

  const salvaInBacheca = () => {
    if (!contratto) return
    const riga: Omit<RigaBacheca, 'id'> = {
      periodo: contratto.periodo || periodLabel(params.dataDa, params.dataA),
      tipologia: contratto.tipo,
      segmento: contratto.segmento,
      preferito: false,
      quantita: `${params.quantita} ${params.quantita === 1 ? 'Lotto' : 'Lotti'}`,
      stato: 'In bozza',
      contratto,
      categoria: params.tipo === 'Acquisto' ? params.categoriaLivello : params.categoria,
    }
    setBacheca((prev) => {
      if (editingBachecaId != null) return prev.map((b) => b.id === editingBachecaId ? { ...b, ...riga, id: b.id, stato: b.stato } : b)
      const id = Math.max(0, ...prev.map((b) => b.id)) + 1
      return [{ id, ...riga }, ...prev]
    })
    setContratto(null)
    setEditingBachecaId(null)
    // Dopo il salvataggio: mostra l'anteprima pronta da stampare del documento.
    setAnteprima(contratto)
  }

  // Contratto associato a un annuncio: quello salvato o il template rigenerato
  // (per i seed senza documento). Usato da anteprima e download PDF, così il
  // PDF riflette SEMPRE lo stato corrente del contratto.
  const contrattoDi = (b: RigaBacheca): Contratto =>
    b.contratto ?? buildContratto(contrattoInput({
      segmento: b.segmento,
      periodo: b.periodo,
      numero: `CTR/${b.periodo.replace(/\s/g, '')}`,
      quantita: parseInt(b.quantita, 10) || params.quantita,
    }))

  // Anteprima stampabile (sola lettura) di un annuncio già in bacheca.
  const apriAnteprima = (b: RigaBacheca) => setAnteprima(contrattoDi(b))

  // Scarica il PDF pronto del contratto (generato al momento → sempre aggiornato).
  const scaricaPdf = (b: RigaBacheca) => { scaricaContrattoPdf(contrattoDi(b)) }

  const apriContratto = (b: RigaBacheca) => {
    setEditingBachecaId(b.id)
    // Annunci già salvati: riapri il loro documento. Annunci "seed" (senza
    // documento): genera al volo il template coerente col loro segmento.
    setContratto(b.contratto ?? buildContratto(contrattoInput({
      segmento: b.segmento,
      periodo: b.periodo,
      numero: `CTR/${b.periodo.replace(/\s/g, '')}`,
      quantita: parseInt(b.quantita, 10) || params.quantita,
    })))
  }

  const toggleStar = (id: number) =>
    setBacheca((prev) => prev.map((b) => b.id === id ? { ...b, preferito: !b.preferito } : b))

  // Costruisce il record da pubblicare nella pagina Annunci (Agorà).
  const annuncioDaRiga = (b: RigaBacheca): AnnuncioPubblicato => {
    const c = b.contratto
    const lotti = parseInt(b.quantita, 10) || 1
    const d = new Date()
    const p2 = (n: number) => String(n).padStart(2, '0')
    const dest = c?.tourOperator?.trim()
    return {
      id: `ca-${b.id}`,
      logo: c?.logo || undefined,
      ragioneSociale: c?.cliente?.trim() || 'G.A.R-SRL',
      periodo: b.periodo,
      tipologia: c?.tariffe?.[0]?.base || 'Base doppia',
      lotti,
      struttura: c?.struttura || '—',
      categoria: Number(b.categoria) || 4,
      camere: lotti * 25,
      pubblicazione: `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`,
      genere: b.tipologia,
      destinatario: !dest || dest === '—' ? 'Tutti' : dest,
      ospiti: params.tipoOspiti,
      quantitaMax: params.tipo === 'Acquisto' ? undefined : params.quantitaMax,
      garanzie: 'Nessuna',
      pagamento: c?.pagamento && c.pagamento !== '—' ? c.pagamento : params.tipologiaPagamento,
    }
  }

  const pubblica = (id: number) => {
    setBacheca((prev) => prev.map((b) => b.id === id ? { ...b, stato: 'Pubblicato' } : b))
    const b = bacheca.find((x) => x.id === id)
    if (b) pubblicaAnnuncio(annuncioDaRiga(b))
  }

  const eliminaBacheca = async (id: number) => {
    if (await confirm({ title: 'Elimina annuncio', message: 'Eliminare questo annuncio dalla bacheca?', confirmLabel: 'Elimina', danger: true })) {
      setBacheca((prev) => prev.filter((b) => b.id !== id))
      if (editingBachecaId === id) chiudiContratto()
    }
  }

  return (
    <div className="compann">
      <PageHead title="Componi annunci" subtitle="Configura i parametri, genera il contratto, modificalo e pubblicalo in Agorà." />

      {/* ── Riga superiore: parametri (40%) + bacheca (60%) ───────────────── */}
      <div className="ca-top">
        <div className="ca-left">
        <section className="ca-setup">
          <div className="ca-setup__head"><i className="fa-light fa-sliders" /> Parametri annuncio</div>

          <div className="ca-setup__grid">
            <RadioGroup label="Tipo" name="tipo" value={params.tipo} onChange={(v) => set('tipo', v as Tipo)}
              options={[{ value: 'Vendita', label: 'Vendita' }, { value: 'Acquisto', label: 'Acquisto', disabled: true, tooltip: 'Al momento non disponibile' }]} />
            <RadioGroup label="Tipologia" name="tipologia" value={params.tipologia} onChange={(v) => set('tipologia', v as Tipologia)}
              options={[{ value: 'Struttura', label: 'Struttura' }, { value: 'Categoria', label: 'Categoria' }]} />
            {params.tipo === 'Acquisto' ? (
              <>
                <SelectField label="Città" name="citta" value={params.citta} onChange={(e) => set('citta', e.target.value)}
                  options={CITTA.map((c) => ({ value: c, label: c }))} />
                <SelectField label="Categoria" name="categoriaLivello" value={params.categoriaLivello} onChange={(e) => set('categoriaLivello', e.target.value)}
                  options={CATEGORIE_STELLE} />
              </>
            ) : params.tipologia === 'Categoria' ? (
              <SelectField label="Categoria" name="categoria" value={params.categoria} onChange={(e) => set('categoria', e.target.value)}
                options={CATEGORIE_STELLE} />
            ) : (
              <SelectField label="Struttura" name="struttura" value={params.strutturaId ?? ''}
                onChange={(e) => set('strutturaId', e.target.value ? Number(e.target.value) : null)}
                options={STRUTTURE.map((s) => ({ value: s.Id, label: s.nome }))} />
            )}

            <SelectField label={params.tipo === 'Acquisto' ? 'Tipologia' : 'Tipo ospiti'} name="tipoOspiti"
              value={params.tipoOspiti} onChange={(e) => set('tipoOspiti', e.target.value)}
              options={TIPO_OSPITI.map((o) => ({ value: o, label: o }))} />
            <NazionalitaMultiSelect label="Market specific" className="ca-field--market"
              value={params.marketSpecific} onChange={(v) => set('marketSpecific', v)}
              placeholder="Seleziona paesi" />
            {params.tipoOspiti === 'Gruppi' ? (
              <>
                <SelectField label="Segmento" name="segmento" value={params.segmento} onChange={(e) => set('segmento', e.target.value as Segmento)}
                  options={SEGMENTI.map((o) => ({ value: o, label: o }))} />
                <SelectField label="Tipologia base" name="tipologiaBase" value={params.tipologiaBase} onChange={(e) => set('tipologiaBase', e.target.value)}
                  options={TIPOLOGIA_BASE.map((o) => ({ value: o, label: o }))} />
              </>
            ) : (
              <SelectField label="Tipologia Camere" name="tipologiaCamere" value={params.tipologiaCamere} onChange={(e) => set('tipologiaCamere', e.target.value)}
                options={TIPOLOGIA_CAMERE.map((o) => ({ value: o, label: o }))} />
            )}
            {params.tipo !== 'Acquisto' && (
              <SelectField label="Tipo lotti" name="tipoLotti" value={params.tipoLotti} onChange={(e) => set('tipoLotti', e.target.value)}
                options={TIPO_LOTTI.map((o) => ({ value: o, label: o }))} />
            )}

            <DateRangeField label="Data" nameFrom="dataDa" nameTo="dataA" className="ca-field--wide"
              valueFrom={params.dataDa} valueTo={params.dataA}
              onChangeFrom={(e) => set('dataDa', e.target.value)} onChangeTo={(e) => set('dataA', e.target.value)} />
            <div className="ca-qta ca-field--num">
              <InputField label="Quantità" name="quantita" type="number"
                min={1} max={params.tipo !== 'Acquisto' ? params.quantitaMax : undefined}
                value={params.quantita}
                onChange={(e) => set('quantita', Number(e.target.value) || 0)} />
              {params.tipo !== 'Acquisto' && params.quantita > params.quantitaMax && (
                <span className="ca-qta__warn">
                  <Tooltip text={`La quantità (${params.quantita}) non può superare la quantità massima (${params.quantitaMax}).`}>
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  </Tooltip>
                </span>
              )}
            </div>
            {params.tipo !== 'Acquisto' && (
              <>
                <InputField label="Quantità Massima" name="quantitaMax" type="number" className="ca-field--nummax" min={1} value={params.quantitaMax}
                  onChange={(e) => set('quantitaMax', Number(e.target.value) || 0)} />
                <SelectField label="Tour operator" name="tourOperator" value={params.tourOperator} onChange={(e) => set('tourOperator', e.target.value)}
                  options={TOUR_OPERATOR.map((o) => ({ value: o, label: o }))} />
                <SelectField label="Tipologia Pagamento" name="tipologiaPagamento" className="ca-field--sm" value={params.tipologiaPagamento} onChange={(e) => set('tipologiaPagamento', e.target.value)}
                  options={PAGAMENTO.map((o) => ({ value: o, label: o }))} />
              </>
            )}
            {params.tipo !== 'Acquisto' && params.quantita > params.quantitaMax && (
              <div className="ca-qta-alert" role="alert">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <span>Stai selezionando una quantità (<strong>{params.quantita}</strong>) superiore alla quantità massima impostata (<strong>{params.quantitaMax}</strong>).</span>
              </div>
            )}
          </div>

          <div className={`ca-progress ca-progress--${progresso.level}`}
            role="progressbar" aria-valuenow={progresso.pct} aria-valuemin={0} aria-valuemax={100}
            aria-label="Completamento parametri annuncio">
            <div className="ca-progress__info">
              <span className="ca-progress__label">
                <i className={`fa-light ${progresso.pct === 100 ? 'fa-circle-check' : 'fa-list-check'}`} aria-hidden="true" />
                {progresso.pct === 100 ? 'Parametri completi' : 'Completamento parametri'}
                <span className="ca-progress__frac">{progresso.done}/{progresso.total}</span>
              </span>
              <span className="ca-progress__pct">{progresso.pct}%</span>
            </div>
            <div className="ca-progress__track">
              <div className="ca-progress__fill" style={{ width: `${progresso.pct}%` }}>
                <span className="ca-progress__shine" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="ca-setup__foot">
            <button type="button" className="sib-btn sib-btn--primary ca-setup__next" onClick={genera}>
              <i className="fa-light fa-file-contract" /> Genera contratto
            </button>
          </div>
        </section>

        {/* Box editor documento (PDF/DOC) — stessa larghezza dei parametri, alto come la bacheca */}
        <div className="ca-panel">
          {contratto ? (
            <ContrattoPreview
              contratto={contratto}
              onPatch={patch}
              onSalva={salvaInBacheca}
              onChiudi={chiudiContratto}
              onAnteprima={() => setAnteprima(contratto)}
              isEditing={editingBachecaId != null}
              confirm={confirm}
            />
          ) : (
            <div className="ca-hint">
              <i className="fa-light fa-file-pen" />
              <span>Genera un contratto dai parametri qui sopra, oppure aprine uno dalla bacheca: qui puoi modificare il documento (PDF/DOC).</span>
            </div>
          )}
        </div>
        </div>

        <aside className="ca-board">
          <div className="ca-board__head">
            <span className="ca-board__title"><i className="fa-light fa-clipboard-list" /> La mia bacheca</span>
            <span className="ca-board__count">{bacheca.length}</span>
          </div>
          <div className="ca-board__list">
            {bacheca.length === 0 ? (
              <div className="ca-board__empty">Nessun annuncio in bacheca.</div>
            ) : bachecaPage.map((b) => (
              <article key={b.id} className={`ca-item ${editingBachecaId === b.id ? 'ca-item--active' : ''}`}>
                <span className={`ca-item__pin ca-item__pin--${b.tipologia.toLowerCase()}`} aria-hidden="true" />
                <button type="button" className="ca-item__open" onClick={() => apriContratto(b)} title="Apri e modifica il contratto">
                  <span className={`ca-chip ca-chip--${b.tipologia.toLowerCase()}`}>{b.tipologia}</span>
                  <span className="ca-item__period"><i className="fa-light fa-calendar-range" /> {b.periodo}</span>
                  <span className="ca-item__seg"><i className="fa-light fa-users" /> {b.segmento}</span>
                  <span className="ca-item__qty"><i className="fa-light fa-cubes" /> {b.quantita}</span>
                </button>
                <span className={`ca-badge ca-badge--${b.stato === 'Pubblicato' ? 'pub' : 'draft'}`}>
                  <i className={`fa-solid ${b.stato === 'Pubblicato' ? 'fa-circle-check' : 'fa-pen-ruler'}`} /> {b.stato}
                </span>
                <span className="ca-item__actions">
                  <button type="button" className="ca-item__act" title="Preferito" onClick={() => toggleStar(b.id)}>
                    <i className={`${b.preferito ? 'fa-solid ca-item__star--on' : 'fa-light'} fa-star`} />
                  </button>
                  <button type="button" className="ca-item__act" title="Anteprima da stampare" onClick={() => apriAnteprima(b)}>
                    <i className="fa-light fa-eye" />
                  </button>
                  <button type="button" className="ca-item__act" title="Modifica contratto" onClick={() => apriContratto(b)}>
                    <i className="fa-light fa-file-pen" />
                  </button>
                  <button type="button" className="ca-item__act" title="Scarica PDF del contratto" onClick={() => scaricaPdf(b)}>
                    <i className="fa-light fa-file-pdf" />
                  </button>
                  <button type="button" className="ca-item__act ca-item__act--danger" title="Elimina" onClick={() => eliminaBacheca(b.id)}>
                    <i className="fa-light fa-trash" />
                  </button>
                  {b.stato !== 'Pubblicato' && (
                    <button type="button" className="ca-item__act ca-item__act--publish" title="Pubblica in Agorà" onClick={() => pubblica(b.id)}>
                      <i className="fa-solid fa-paper-plane" />
                    </button>
                  )}
                </span>
              </article>
            ))}
          </div>
          {boardTotalPages > 1 && (
            <div className="ca-board__pager">
              <Pagination page={boardPage} totalPages={boardTotalPages} onPageChange={setBoardPage} />
            </div>
          )}
        </aside>
      </div>

      {anteprima && (
        <ContrattoStampa contratto={anteprima} onChiudi={() => setAnteprima(null)} />
      )}
    </div>
  )
}

// ─── CAMPI EDITABILI DEL DOCUMENTO ──────────────────────────────────────────────
// Input inline sempre modificabile (nessun click-per-attivare): sottile,
// sottolineato al focus. Rende i campi "facilmente accessibili".
function DocInput({ value, onChange, placeholder, align, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  align?: 'right' | 'center'; className?: string
}) {
  return (
    <input
      type="text"
      className={`ca-doc-input${align ? ` ca-doc-input--${align}` : ''}${className ? ` ${className}` : ''}`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function DocArea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <textarea
      className="ca-doc-area"
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// Select inline "guidata": stesso aspetto sottile del DocInput (nessun bordo/
// sfondo, chevron discreto), per orientare la compilazione dove è richiesta una
// scelta (es. Alta/Media/Bassa stagione).
function DocSelect({ value, onChange, options, placeholder, className }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string; className?: string
}) {
  return (
    <span className={`ca-doc-select${className ? ` ${className}` : ''}`}>
      <select
        className={`ca-doc-select__el${value ? '' : ' is-empty'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <i className="fa-solid fa-chevron-down ca-doc-select__chev" aria-hidden="true" />
    </span>
  )
}

// Date picker inline "guidato": input date nativo reso senza bordo/sfondo.
function DocDate({ value, onChange, className }: {
  value: string; onChange: (v: string) => void; className?: string
}) {
  return (
    <input
      type="date"
      className={`ca-doc-input ca-doc-date${value ? '' : ' is-empty'}${className ? ` ${className}` : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// Upload del logo struttura (data URL): click sul riquadro per caricare
// un'immagine; una volta caricata è sostituibile o rimovibile.
function LogoUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = () => inputRef.current?.click()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : '')
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }
  return (
    <div className={`ca-sheet__logo${value ? ' ca-sheet__logo--set' : ''}`}>
      {value ? (
        <>
          <img src={value} alt="Logo struttura" className="ca-sheet__logo-img" />
          <div className="ca-sheet__logo-actions">
            <button type="button" title="Cambia logo" onClick={pick}><i className="fa-light fa-arrows-rotate" /></button>
            <button type="button" title="Rimuovi logo" onClick={() => onChange('')}><i className="fa-light fa-trash" /></button>
          </div>
        </>
      ) : (
        <button type="button" className="ca-sheet__logo-add" onClick={pick}>
          <i className="fa-light fa-image" />
          <span>Carica logo</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="ca-sheet__logo-input" onChange={onFile} />
    </div>
  )
}

// Opzioni riusabili per le select guidate del documento.
const OPT = (arr: string[]) => arr.map((v) => ({ value: v, label: v }))
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const BASE_OPTS = ['Base doppia', 'Base singola', 'Base tripla']
const CAT_STELLE_OPTS = ['3*', '4*', '5*']

// ISO (yyyy-mm-dd) → gg/mm/aaaa (per anteprima sola lettura).
const fmtDateIt = (iso?: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}
const rangeLabelIt = (da?: string, a?: string) => {
  const f = fmtDateIt(da), t = fmtDateIt(a)
  return f || t ? `${f || '…'} — ${t || '…'}` : ''
}

// ─── ANTEPRIMA CONTRATTO (documento editabile) ──────────────────────────────────
// Documento professionale "CONDIZIONI DI VENDITA — MERCATO GRUPPI" derivato dai
// template .docx; la variante (Adulti / Studenti / Adulti e studenti) dipende dai
// parametri dell'annuncio. Ogni campo/tabella è modificabile e viene salvato
// nell'annuncio in bacheca.
function ContrattoPreview({ contratto, onPatch, onSalva, onChiudi, onAnteprima, isEditing, confirm }: {
  contratto: Contratto
  onPatch: (p: Partial<Contratto>) => void
  onSalva: () => void
  onChiudi: () => void
  onAnteprima: () => void
  isEditing: boolean
  confirm: ConfirmFn
}) {
  // Opzioni per le select guidate, coerenti con il segmento e l'anno del contratto.
  const segOpts = OPT(segParts(contratto.segmento))
  const seasonOpts = OPT(STAGIONI_DEF)
  const yearOpts = OPT(Array.from(new Set(contratto.annoStagione.split('/').filter(Boolean))))

  // Updater generici sulle tabelle del contratto.
  const updRow = (key: keyof Contratto, id: number, field: string, v: string) => {
    const list = contratto[key] as unknown as { id: number }[]
    onPatch({ [key]: list.map((r) => (r.id === id ? { ...r, [field]: v } : r)) } as Partial<Contratto>)
  }
  const addRow = (key: keyof Contratto, blank: Record<string, unknown>) => {
    const list = contratto[key] as unknown as { id: number }[]
    onPatch({ [key]: [...list, { ...blank, id: nextRowId(list) }] } as Partial<Contratto>)
  }
  const delRow = async (key: keyof Contratto, id: number, sezione: string) => {
    const ok = await confirm({ title: 'Elimina riga', message: `Rimuovere questa riga dalla sezione «${sezione}»?`, confirmLabel: 'Elimina', danger: true })
    if (!ok) return
    const list = contratto[key] as unknown as { id: number }[]
    onPatch({ [key]: list.filter((r) => r.id !== id) } as Partial<Contratto>)
  }

  const AddRow = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="ca-doc-addrow" onClick={onClick}>
      <i className="fa-light fa-plus" /> Aggiungi riga
    </button>
  )
  const DelRow = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="ca-doc-delrow" title="Elimina riga" onClick={onClick}>
      <i className="fa-light fa-trash" />
    </button>
  )

  return (
    <div className="ca-contract">
      <div className="ca-contract__toolbar">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onChiudi}><i className="fa-light fa-xmark" /> Chiudi</button>
        <div className="ca-contract__toolbar-right">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onAnteprima}><i className="fa-light fa-print" /> Anteprima stampa</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onSalva}>
            <i className="fa-light fa-floppy-disk" /> {isEditing ? 'Salva modifiche' : 'Salva nella bacheca'}
          </button>
        </div>
      </div>

      <div className="ca-sheet">
        {/* Intestazione: logo struttura, titolo, segmento, numero/data */}
        <header className="ca-sheet__head">
          <div className="ca-sheet__head-left">
            <LogoUpload value={contratto.logo ?? ''} onChange={(v) => onPatch({ logo: v })} />
            <div>
              <div className="ca-sheet__kicker">Condizioni di vendita — Mercato gruppi</div>
              <input className="ca-doc-input ca-sheet__struttura-input" value={contratto.struttura}
                placeholder="Nome struttura" onChange={(e) => onPatch({ struttura: e.target.value })} />
              <span className="ca-sheet__seg-badge"><i className="fa-light fa-users" /> {contratto.segmento}</span>
            </div>
          </div>
          <div className="ca-sheet__meta">
            <div><span>Numero</span><strong>{contratto.numero}</strong></div>
            <div><span>Data</span><strong>{contratto.data}</strong></div>
          </div>
        </header>

        {/* Parti / condizioni generali */}
        <section className="ca-sheet__parties">
          <label className="ca-sheet__party"><span>Cliente</span>
            <DocInput value={contratto.cliente} onChange={(v) => onPatch({ cliente: v })} placeholder="Ragione sociale cliente" /></label>
          <label className="ca-sheet__party"><span>Tour operator</span>
            <DocSelect value={contratto.tourOperator} onChange={(v) => onPatch({ tourOperator: v })} options={OPT(TOUR_OPERATOR)} placeholder="Seleziona tour operator" /></label>
          <label className="ca-sheet__party"><span>Periodo</span>
            <DocInput value={contratto.periodo} onChange={(v) => onPatch({ periodo: v })} placeholder="mm/aaaa - mm/aaaa" /></label>
          <label className="ca-sheet__party"><span>Pagamento</span>
            <DocSelect value={contratto.pagamento} onChange={(v) => onPatch({ pagamento: v })} options={OPT(PAGAMENTO)} placeholder="Seleziona pagamento" /></label>
        </section>

        {/* DISTRIBUZIONE */}
        <div className="ca-sheet__section-head"><h4>Distribuzione ({contratto.segmento})</h4></div>
        <div className="ca-sheet__block">
          <DocArea value={contratto.distribuzione} onChange={(v) => onPatch({ distribuzione: v })}
            placeholder="Descrizione della distribuzione del segmento gruppi…" />
        </div>

        {/* STAGIONALITÀ */}
        <div className="ca-sheet__section-head">
          <h4>Stagionalità</h4>
          <label className="ca-sheet__year">anno&nbsp;
            <DocInput value={contratto.annoStagione} align="center" onChange={(v) => onPatch({ annoStagione: v })} placeholder="aaaa/aaaa" className="ca-doc-input--year" />
          </label>
        </div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead><tr><th>Stagionalità</th><th>Dal</th><th>Al</th><th className="ca-doc-actcol" /></tr></thead>
            <tbody>
              {contratto.stagioni.map((r) => (
                <tr key={r.id}>
                  <td><DocSelect value={r.nome} onChange={(v) => updRow('stagioni', r.id, 'nome', v)} options={seasonOpts} placeholder="Stagione" /></td>
                  <td><DocDate value={r.da ?? ''} onChange={(v) => updRow('stagioni', r.id, 'da', v)} /></td>
                  <td><DocDate value={r.a ?? ''} onChange={(v) => updRow('stagioni', r.id, 'a', v)} /></td>
                  <td className="ca-doc-actcol"><DelRow onClick={() => delRow('stagioni', r.id, 'Stagionalità')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddRow onClick={() => addRow('stagioni', { nome: '', da: '', a: '' })} />

        {/* TARIFFE */}
        <div className="ca-sheet__section-head"><h4>Tariffe {contratto.annoStagione}</h4></div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead><tr><th>Stagione</th><th>Segmento</th><th>Base</th><th>Prezzo (€)</th><th>Suppl. (€)</th><th className="ca-doc-actcol" /></tr></thead>
            <tbody>
              {contratto.tariffe.map((r) => (
                <tr key={r.id}>
                  <td><DocSelect value={r.stagione} onChange={(v) => updRow('tariffe', r.id, 'stagione', v)} options={seasonOpts} placeholder="Stagione" /></td>
                  <td><DocSelect value={r.segmento} onChange={(v) => updRow('tariffe', r.id, 'segmento', v)} options={segOpts} placeholder="Segmento" /></td>
                  <td><DocSelect value={r.base} onChange={(v) => updRow('tariffe', r.id, 'base', v)} options={OPT(BASE_OPTS)} placeholder="Base" /></td>
                  <td><DocInput value={r.prezzo} align="right" onChange={(v) => updRow('tariffe', r.id, 'prezzo', v)} placeholder="0,00" /></td>
                  <td><DocInput value={r.suppl} align="right" onChange={(v) => updRow('tariffe', r.id, 'suppl', v)} placeholder="0,00" /></td>
                  <td className="ca-doc-actcol"><DelRow onClick={() => delRow('tariffe', r.id, 'Tariffe')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddRow onClick={() => addRow('tariffe', { stagione: '', segmento: contratto.segmento === 'Studenti' ? 'Studenti' : 'Adulti', base: contratto.tariffe[0]?.base ?? 'Base doppia', prezzo: '', suppl: '' })} />

        {/* MERCATO SPECIFICO */}
        <div className="ca-sheet__section-head"><h4>Mercato specifico</h4></div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead><tr><th>Nazionalità</th><th>Segmento</th><th>Scontistica (%)</th><th>Note</th><th className="ca-doc-actcol" /></tr></thead>
            <tbody>
              {contratto.mercato.map((r) => (
                <tr key={r.id}>
                  <td><NazionalitaSelect value={r.nazionalita} onChange={(v) => updRow('mercato', r.id, 'nazionalita', v)} placeholder="Nazionalità" /></td>
                  <td><DocSelect value={r.segmento} onChange={(v) => updRow('mercato', r.id, 'segmento', v)} options={segOpts} placeholder="Segmento" /></td>
                  <td><DocInput value={r.scontistica ?? ''} align="right" onChange={(v) => updRow('mercato', r.id, 'scontistica', v)} placeholder="0" /></td>
                  <td><DocInput value={r.note} onChange={(v) => updRow('mercato', r.id, 'note', v)} placeholder="Dettagli assegnazione market specific" /></td>
                  <td className="ca-doc-actcol"><DelRow onClick={() => delRow('mercato', r.id, 'Mercato specifico')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddRow onClick={() => addRow('mercato', { nazionalita: '', segmento: contratto.segmento === 'Studenti' ? 'Studenti' : 'Adulti', scontistica: '', note: '' })} />

        {/* SUPPLEMENTI */}
        <div className="ca-sheet__section-head"><h4>Supplementi</h4></div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead><tr><th>Segmento</th><th>Categoria</th><th>Voce</th><th>Importo (€)</th><th className="ca-doc-actcol" /></tr></thead>
            <tbody>
              {contratto.supplementi.map((r) => (
                <tr key={r.id}>
                  <td><DocSelect value={r.segmento} onChange={(v) => updRow('supplementi', r.id, 'segmento', v)} options={segOpts} placeholder="Segmento" /></td>
                  <td><DocSelect value={r.categoria} onChange={(v) => updRow('supplementi', r.id, 'categoria', v)} options={OPT(CAT_STELLE_OPTS)} placeholder="Categoria" /></td>
                  <td><DocInput value={r.voce} onChange={(v) => updRow('supplementi', r.id, 'voce', v)} placeholder="Camere singole" /></td>
                  <td><DocInput value={r.importo} align="right" onChange={(v) => updRow('supplementi', r.id, 'importo', v)} placeholder="0,00" /></td>
                  <td className="ca-doc-actcol"><DelRow onClick={() => delRow('supplementi', r.id, 'Supplementi')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddRow onClick={() => addRow('supplementi', { segmento: contratto.segmento === 'Studenti' ? 'Studenti' : 'Adulti', categoria: '3*', voce: '', importo: '' })} />

        <div className="ca-sheet__block">
          <span className="ca-sheet__note-label">Gratuità, tassa di soggiorno e IVA</span>
          <DocArea value={contratto.gratuita} onChange={(v) => onPatch({ gratuita: v })}
            placeholder="Gratuità ogni tot. paganti; tassa di soggiorno; prima colazione e IVA…" />
        </div>

        {/* CONTINGENTE CAMERE / LOTTI */}
        <div className="ca-sheet__section-head"><h4>Contingente camere — Lotti</h4></div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead><tr><th>Mese</th><th>Anno</th><th>Lotti</th><th>Camere/giorno</th><th className="ca-doc-actcol" /></tr></thead>
            <tbody>
              {contratto.lotti.map((r) => (
                <tr key={r.id}>
                  <td><DocSelect value={r.mese} onChange={(v) => updRow('lotti', r.id, 'mese', v)} options={OPT(MESI)} placeholder="Mese" /></td>
                  <td><DocSelect value={r.anno} onChange={(v) => updRow('lotti', r.id, 'anno', v)} options={yearOpts} placeholder="Anno" /></td>
                  <td><DocInput value={r.lotti} align="right" onChange={(v) => updRow('lotti', r.id, 'lotti', v)} placeholder="0" /></td>
                  <td><DocInput value={r.camereGiorno} align="right" onChange={(v) => updRow('lotti', r.id, 'camereGiorno', v)} placeholder="0" /></td>
                  <td className="ca-doc-actcol"><DelRow onClick={() => delRow('lotti', r.id, 'Contingente camere')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddRow onClick={() => addRow('lotti', { mese: '', anno: contratto.annoStagione.split('/')[0] ?? '', lotti: '', camereGiorno: '' })} />

        {/* PENALI */}
        <div className="ca-sheet__section-head"><h4>Penali</h4></div>
        <div className="ca-sheet__block">
          <DocArea value={contratto.penali} onChange={(v) => onPatch({ penali: v })}
            placeholder="Dettagli su penali per cancellazioni, no-show, ecc." />
        </div>

        {/* FIRME */}
        <section className="ca-sheet__sign">
          <label className="ca-sheet__sign-field ca-sheet__sign-field--full"><span>Luogo e data</span>
            <DocInput value={contratto.luogo} onChange={(v) => onPatch({ luogo: v })} placeholder="Luogo, gg/mm/aaaa" /></label>
          <div className="ca-sheet__sign-field"><span>Amministratore struttura</span>
            <div className="ca-sheet__sign-line">{contratto.struttura || '—'}</div></div>
          <div className="ca-sheet__sign-field"><span>Amministratore cliente</span>
            <div className="ca-sheet__sign-line">{contratto.cliente || '—'}</div></div>
        </section>
      </div>
    </div>
  )
}

// ─── ANTEPRIMA STAMPABILE (sola lettura) ────────────────────────────────────────
// Overlay a tutta pagina che mostra il contratto salvato come documento pulito,
// pronto per la stampa o per il download in PDF. In stampa (@media print) resta
// visibile solo il foglio.
function ContrattoStampa({ contratto, onChiudi }: {
  contratto: Contratto
  onChiudi: () => void
}) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const c = contratto

  const scaricaPdf = async () => {
    setPdfLoading(true)
    try { await scaricaContrattoPdf(c) } finally { setPdfLoading(false) }
  }

  // Valore in sola lettura (con fallback trattino per i campi vuoti).
  const RO = ({ value, align }: { value: string; align?: 'right' }) => (
    <span className={`ca-ro${value && value.trim() ? '' : ' ca-ro--empty'}${align ? ` ca-ro--${align}` : ''}`}>
      {value && value.trim() ? value : '—'}
    </span>
  )

  return (
    <div className="ca-stampa" role="dialog" aria-modal="true" aria-label="Anteprima contratto da stampare">
      <div className="ca-stampa__bar">
        <span className="ca-stampa__bar-title"><i className="fa-light fa-file-contract" /> Anteprima da stampare</span>
        <div className="ca-stampa__bar-actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onChiudi}><i className="fa-light fa-xmark" /> Chiudi</button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={scaricaPdf} disabled={pdfLoading}>
            <i className={`fa-light ${pdfLoading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} /> Scarica PDF
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => window.print()}><i className="fa-light fa-print" /> Stampa</button>
        </div>
      </div>

      <div className="ca-stampa__scroll">
        <div className="ca-stampa__sheet ca-sheet ca-sheet--ro">
          <header className="ca-sheet__head">
            <div className="ca-sheet__head-left">
              <div className={`ca-sheet__logo${c.logo ? ' ca-sheet__logo--set' : ''}`}>
                {c.logo ? <img src={c.logo} alt="Logo struttura" className="ca-sheet__logo-img" /> : 'Logo struttura'}
              </div>
              <div>
                <div className="ca-sheet__kicker">Condizioni di vendita — Mercato gruppi</div>
                <div className="ca-sheet__struttura">{c.struttura || '—'}</div>
                <span className="ca-sheet__seg-badge"><i className="fa-light fa-users" /> {c.segmento}</span>
              </div>
            </div>
            <div className="ca-sheet__meta">
              <div><span>Numero</span><strong>{c.numero}</strong></div>
              <div><span>Data</span><strong>{c.data}</strong></div>
            </div>
          </header>

          <section className="ca-sheet__parties">
            <div className="ca-sheet__party"><span>Cliente</span><RO value={c.cliente} /></div>
            <div className="ca-sheet__party"><span>Tour operator</span><RO value={c.tourOperator} /></div>
            <div className="ca-sheet__party"><span>Periodo</span><RO value={c.periodo} /></div>
            <div className="ca-sheet__party"><span>Pagamento</span><RO value={c.pagamento} /></div>
          </section>

          <div className="ca-sheet__section-head"><h4>Distribuzione ({c.segmento})</h4></div>
          <div className="ca-sheet__block"><p className="ca-ro-para">{c.distribuzione || '—'}</p></div>

          <div className="ca-sheet__section-head"><h4>Stagionalità</h4><span className="ca-sheet__year">anno {c.annoStagione}</span></div>
          <div className="sib-table-wrap">
            <table className="sib-table ca-sheet__table">
              <thead><tr><th>Stagionalità</th><th>Periodo</th></tr></thead>
              <tbody>
                {c.stagioni.map((r) => (<tr key={r.id}><td><RO value={r.nome} /></td><td><RO value={rangeLabelIt(r.da, r.a)} /></td></tr>))}
              </tbody>
            </table>
          </div>

          <div className="ca-sheet__section-head"><h4>Tariffe {c.annoStagione}</h4></div>
          <div className="sib-table-wrap">
            <table className="sib-table ca-sheet__table">
              <thead><tr><th>Stagione</th><th>Segmento</th><th>Base</th><th>Prezzo (€)</th><th>Suppl. (€)</th></tr></thead>
              <tbody>
                {c.tariffe.map((r) => (
                  <tr key={r.id}>
                    <td><RO value={r.stagione} /></td><td><RO value={r.segmento} /></td><td><RO value={r.base} /></td>
                    <td><RO value={r.prezzo} align="right" /></td><td><RO value={r.suppl} align="right" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ca-sheet__section-head"><h4>Mercato specifico</h4></div>
          <div className="sib-table-wrap">
            <table className="sib-table ca-sheet__table">
              <thead><tr><th>Nazionalità</th><th>Segmento</th><th>Scontistica (%)</th><th>Note</th></tr></thead>
              <tbody>
                {c.mercato.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nazionalita ? <span className="ca-ro-naz"><FlagBadge name={r.nazionalita} /> {r.nazionalita}</span> : <RO value="" />}</td>
                    <td><RO value={r.segmento} /></td>
                    <td><RO value={r.scontistica ? `${r.scontistica}%` : ''} align="right" /></td>
                    <td><RO value={r.note} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ca-sheet__section-head"><h4>Supplementi</h4></div>
          <div className="sib-table-wrap">
            <table className="sib-table ca-sheet__table">
              <thead><tr><th>Segmento</th><th>Categoria</th><th>Voce</th><th>Importo (€)</th></tr></thead>
              <tbody>
                {c.supplementi.map((r) => (
                  <tr key={r.id}><td><RO value={r.segmento} /></td><td><RO value={r.categoria} /></td><td><RO value={r.voce} /></td><td><RO value={r.importo} align="right" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ca-sheet__block">
            <span className="ca-sheet__note-label">Gratuità, tassa di soggiorno e IVA</span>
            <p className="ca-ro-para">{c.gratuita || '—'}</p>
          </div>

          <div className="ca-sheet__section-head"><h4>Contingente camere — Lotti</h4></div>
          <div className="sib-table-wrap">
            <table className="sib-table ca-sheet__table">
              <thead><tr><th>Mese</th><th>Anno</th><th>Lotti</th><th>Camere/giorno</th></tr></thead>
              <tbody>
                {c.lotti.map((r) => (
                  <tr key={r.id}><td><RO value={r.mese} /></td><td><RO value={r.anno} /></td><td><RO value={r.lotti} align="right" /></td><td><RO value={r.camereGiorno} align="right" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ca-sheet__section-head"><h4>Penali</h4></div>
          <div className="ca-sheet__block"><p className="ca-ro-para">{c.penali || '—'}</p></div>

          <section className="ca-sheet__sign">
            <div className="ca-sheet__sign-field ca-sheet__sign-field--full"><span>Luogo e data</span><RO value={c.luogo} /></div>
            <div className="ca-sheet__sign-field"><span>Amministratore struttura</span><div className="ca-sheet__sign-line">{c.struttura || '—'}</div></div>
            <div className="ca-sheet__sign-field"><span>Amministratore cliente</span><div className="ca-sheet__sign-line">{c.cliente || '—'}</div></div>
          </section>
        </div>
      </div>
    </div>
  )
}
