import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import AlertBanner from '../../../../core/components/AlertBanner'
import Modal from '../../../../core/components/Modal'
import FormActions from '../../../../core/components/FormActions'
import { InputField, SelectField } from '../../../../core/components/form'
import { STRUTTURE, TIPI_CALENDARIO, type TipoCalendario } from '../strategieData'
import './CreaStrategia.sass'

// ── Dataset locali ────────────────────────────────────────────────────────────

type Categoria      = '3 stelle' | '4 stelle' | '5 stelle'
type TipoStrategia  = 'Individuali' | 'Gruppi'

const CATEGORIE:      Categoria[]     = ['3 stelle', '4 stelle', '5 stelle']
const TIPI_STRATEGIA: TipoStrategia[] = ['Individuali', 'Gruppi']

interface OccRange   { id: string; label: string; from: number; to: number }
const OCC_RANGES: OccRange[] = [
  { id: 'occ-200', label: '100 – 200 %', from: 100, to: 200 },
  { id: 'occ-99',  label: '96 – 99 %',   from: 96,  to: 99  },
  { id: 'occ-95',  label: '91 – 95 %',   from: 91,  to: 95  },
  { id: 'occ-90',  label: '86 – 90 %',   from: 86,  to: 90  },
  { id: 'occ-85',  label: '81 – 85 %',   from: 81,  to: 85  },
  { id: 'occ-80',  label: '71 – 80 %',   from: 71,  to: 80  },
  { id: 'occ-70',  label: '61 – 70 %',   from: 61,  to: 70  },
  { id: 'occ-60',  label: '46 – 60 %',   from: 46,  to: 60  },
  { id: 'occ-45',  label: '31 – 45 %',   from: 31,  to: 45  },
  { id: 'occ-30',  label: '0 – 30 %',    from: 0,   to: 30  },
]

interface BookingWin { id: string; label: string; from: number; to: number }
const BOOKING_WINS: BookingWin[] = [
  { id: 'win-7',   label: '0 – 7 giorni',     from: 0,  to: 7   },
  { id: 'win-21',  label: '8 – 21 giorni',    from: 8,  to: 21  },
  { id: 'win-45',  label: '22 – 45 giorni',   from: 22, to: 45  },
  { id: 'win-90',  label: '46 – 90 giorni',   from: 46, to: 90  },
  { id: 'win-365', label: '91 – 365 giorni',  from: 91, to: 365 },
]

// Mock BAR — in produzione arriveranno dal backend (service piani tariffari)
const BARS = [
  { id: 'bar-1',  rate: 353.42 }, { id: 'bar-2',  rate: 350.79 },
  { id: 'bar-3',  rate: 348.18 }, { id: 'bar-4',  rate: 345.59 },
  { id: 'bar-5',  rate: 343.01 }, { id: 'bar-6',  rate: 340.46 },
  { id: 'bar-7',  rate: 337.93 }, { id: 'bar-8',  rate: 335.41 },
  { id: 'bar-9',  rate: 332.91 }, { id: 'bar-10', rate: 330.43 },
  { id: 'bar-11', rate: 327.98 }, { id: 'bar-12', rate: 325.53 },
  { id: 'bar-13', rate: 323.11 }, { id: 'bar-14', rate: 320.70 },
  { id: 'bar-15', rate: 318.32 }, { id: 'bar-16', rate: 299.34 },
  { id: 'bar-17', rate: 296.37 }, { id: 'bar-18', rate: 293.44 },
  { id: 'bar-19', rate: 290.53 }, { id: 'bar-20', rate: 287.66 },
]
const BARS_BY_ID = Object.fromEntries(BARS.map(b => [b.id, b]))
const formatRate = (r: number) => `€ ${r.toFixed(2).replace('.', ',')}`

const COLORI = [
  '#204769', '#5C9CD4', '#E07B39', '#5A8A3C', '#C4A820',
  '#9B59B6', '#E74C3C', '#1ABC9C', '#F39C12', '#E91E63',
  '#16A085', '#D35400', '#3498DB', '#7B5EA7', '#C0392B',
]

// Guida assistita — calcolo a step occupancy × finestra
const GUIDA_OCC = ['100 %','95 %','90 %','85 %','80 %','75 %','70 %','60 %','50 %','40 %','30 %']
const GUIDA_WIN = ['0 – 7','8 – 21','22 – 45','46 – 90','91 – 365']

const STAGIONI = ['Low Season', 'Mid Season', 'High Season', 'Peak Season']

// ── Componente ────────────────────────────────────────────────────────────────

export default function CreaStrategia({ navigate }: { navigate: (p: string) => void }) {
  const [categoria,      setCategoria]      = useState<Categoria>('4 stelle')
  const [struttura,      setStruttura]      = useState(STRUTTURE[0])
  const [tipoCalendario, setTipoCalendario] = useState<TipoCalendario>('Tariffe')
  const [tipoStrategia,  setTipoStrategia]  = useState<TipoStrategia>('Individuali')
  const [nome,           setNome]           = useState('')
  const [colore,         setColore]         = useState<string>(COLORI[0])
  const [saved,          setSaved]          = useState(false)
  const [touched,        setTouched]        = useState(false)
  const [showGuida,      setShowGuida]      = useState(false)
  const [tipoStagione,   setTipoStagione]   = useState(STAGIONI[0])
  const [cifraBase,      setCifraBase]      = useState('')

  // matrice principale: 10 righe (occupazione) × 5 colonne (finestre) → barId
  const [matrix, setMatrix] = useState<string[][]>(() =>
    OCC_RANGES.map(() => BOOKING_WINS.map(() => '')),
  )

  // matrice della Guida smart: 11 righe × 5 colonne → numerica
  const [guidaVals, setGuidaVals] = useState<number[][]>(() =>
    GUIDA_OCC.map(() => GUIDA_WIN.map(() => 0)),
  )

  const setCell = (r: number, c: number, v: string) =>
    setMatrix(prev => prev.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row))

  const setGuidaCell = (r: number, c: number, v: number) =>
    setGuidaVals(prev => prev.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row))

  const filledCount = useMemo(() => matrix.flat().filter(Boolean).length, [matrix])
  const totalCells  = OCC_RANGES.length * BOOKING_WINS.length

  const isValid = nome.trim().length > 0 && !!colore

  const handleSave = () => {
    setTouched(true)
    if (!isValid) return
    setSaved(true)
    window.setTimeout(() => setSaved(false), 3000)
  }

  const handleApplyGuida = () => {
    const base = parseFloat(cifraBase) || 0
    if (!base) return
    setGuidaVals(GUIDA_OCC.map((_, ri) => GUIDA_WIN.map((_, ci) => {
      const oF = 1 - (ri * 0.06)
      const tF = 1 - (ci * 0.04)
      return Math.round(base * Math.max(oF, 0.3) * Math.max(tF, 0.7))
    })))
  }

  const handleClearMatrix = () => {
    if (filledCount === 0) return
    if (window.confirm('Vuoi azzerare tutte le BAR già assegnate alla matrice?')) {
      setMatrix(OCC_RANGES.map(() => BOOKING_WINS.map(() => '')))
    }
  }

  return (
    <div className="crea-strat">
      <BtnBack onClick={() => navigate('calendario-strategie')}/>
      <PageHeader
        title="Crea strategia"
        subtitle="Definisci la BAR per ogni combinazione di occupazione struttura e finestra di prenotazione."
      />

      {saved && <AlertBanner type="success">Strategia salvata con successo</AlertBanner>}
      {touched && !isValid && (
        <AlertBanner type="warning">
          Compila <strong>Nome strategia</strong> e <strong>Colore</strong> per poter salvare.
        </AlertBanner>
      )}

      {/* ── Parametri (riga 1) ─────────────────────────────────────── */}
      <div className="crea-strat__params">
        <SelectField
          name="categoria"
          label="Categoria"
          value={categoria}
          onChange={e => setCategoria(e.target.value as Categoria)}
          options={CATEGORIE.map(c => ({ value: c, label: c }))}
          className="crea-strat__field"
        />
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
          className="crea-strat__field crea-strat__field--wide"
        />
        <SelectField
          name="tipoCalendario"
          label="Tipo calendario"
          value={tipoCalendario}
          onChange={e => setTipoCalendario(e.target.value as TipoCalendario)}
          options={TIPI_CALENDARIO.map(t => ({ value: t, label: t }))}
          className="crea-strat__field"
        />

        <div className="crea-strat__seg-wrap">
          <span className="crea-strat__seg-label">Tipo strategia</span>
          <div className="crea-strat__seg" role="radiogroup" aria-label="Tipo strategia">
            {TIPI_STRATEGIA.map(t => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipoStrategia === t}
                className={clsx('crea-strat__seg-btn', tipoStrategia === t && 'crea-strat__seg-btn--active')}
                onClick={() => setTipoStrategia(t)}
              >
                <i className={`fa-duotone ${t === 'Individuali' ? 'fa-user' : 'fa-users'}`} aria-hidden="true"/>
                {t}
              </button>
            ))}
          </div>
        </div>

        <InputField
          name="nome"
          label="Nome strategia"
          placeholder="Es. Estate 2026"
          value={nome}
          onChange={e => setNome(e.target.value)}
          error={touched && !nome.trim() ? 'Obbligatorio' : undefined}
          className="crea-strat__field crea-strat__field--grow"
        />
      </div>

      {/* ── Parametri (riga 2: colore + azioni) ───────────────────── */}
      <div className="crea-strat__params crea-strat__params--row2">
        <div className="crea-strat__colors-wrap">
          <span className="crea-strat__colors-label">Colore strategia</span>
          <div className="crea-strat__colors" role="radiogroup" aria-label="Colore strategia">
            {COLORI.map(c => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={colore === c}
                aria-label={c}
                className={clsx('crea-strat__swatch', colore === c && 'crea-strat__swatch--active')}
                style={{ '--swatch-color': c } as React.CSSProperties}
                onClick={() => setColore(c)}
              />
            ))}
          </div>
        </div>

        <div className="crea-strat__actions">
          <button
            type="button"
            className="sib-btn sib-btn--secondary crea-strat__btn"
            onClick={() => setShowGuida(true)}
          >
            <i className="fa-duotone fa-wand-magic-sparkles" aria-hidden="true"/>
            Guida assistita smart
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--secondary crea-strat__btn"
            onClick={handleClearMatrix}
            disabled={filledCount === 0}
            title="Azzera tutte le BAR della matrice"
          >
            <i className="fa-duotone fa-eraser" aria-hidden="true"/>
            Azzera matrice
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary crea-strat__btn"
            onClick={handleSave}
          >
            <i className="fa-duotone fa-floppy-disk" aria-hidden="true"/>
            Salva
          </button>
        </div>
      </div>

      {/* ── Identity card (anteprima strategia) ───────────────────── */}
      <div
        className="crea-strat__identity"
        style={{ '--strat-color': colore } as React.CSSProperties}
      >
        <span className="crea-strat__identity-bar" aria-hidden="true"/>
        <div className="crea-strat__identity-body">
          <div className="crea-strat__identity-name">{nome || 'Nuova strategia'}</div>
          <div className="crea-strat__identity-meta">
            <span><i className="fa-duotone fa-star" aria-hidden="true"/> {categoria}</span>
            <span><i className="fa-duotone fa-hotel" aria-hidden="true"/> {struttura}</span>
            <span><i className="fa-duotone fa-tag" aria-hidden="true"/> {tipoCalendario}</span>
            <span>
              <i className={`fa-duotone ${tipoStrategia === 'Individuali' ? 'fa-user' : 'fa-users'}`} aria-hidden="true"/>
              {tipoStrategia}
            </span>
          </div>
        </div>
        <div className="crea-strat__identity-progress">
          <span className="crea-strat__identity-progress-label">BAR assegnate</span>
          <span className="crea-strat__identity-progress-val">{filledCount} / {totalCells}</span>
          <div className="crea-strat__identity-progress-bar">
            <span style={{ width: `${(filledCount / totalCells) * 100}%` } as React.CSSProperties}/>
          </div>
        </div>
      </div>

      {/* ── Matrice BAR ───────────────────────────────────────────── */}
      <div className="crea-strat__matrix-wrap">
        <div className="crea-strat__matrix-scroll">
          <table className="crea-strat__matrix" role="grid">
            <thead>
              <tr>
                <th scope="col" className="crea-strat__th crea-strat__th--corner">
                  Occupazione &nbsp;\&nbsp; Finestra
                </th>
                {BOOKING_WINS.map(w => (
                  <th key={w.id} scope="col" className="crea-strat__th">{w.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OCC_RANGES.map((occ, ri) => (
                <tr key={occ.id}>
                  <th scope="row" className="crea-strat__row-head">
                    <span className="crea-strat__row-head-label">{occ.label}</span>
                  </th>
                  {BOOKING_WINS.map((win, ci) => {
                    const barId = matrix[ri][ci]
                    const bar   = barId ? BARS_BY_ID[barId] : null
                    return (
                      <td
                        key={win.id}
                        className={clsx('crea-strat__cell', bar && 'crea-strat__cell--filled')}
                      >
                        <select
                          className="crea-strat__select"
                          value={barId}
                          aria-label={`BAR per ${occ.label} – ${win.label}`}
                          onChange={e => setCell(ri, ci, e.target.value)}
                        >
                          <option value="">Seleziona BAR</option>
                          {BARS.map(b => (
                            <option key={b.id} value={b.id}>{formatRate(b.rate)}</option>
                          ))}
                        </select>
                        {bar && <span className="crea-strat__cell-hint" aria-hidden="true">BAR</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormActions
        onCancel={() => navigate('calendario-strategie')}
        onConfirm={handleSave}
        confirmLabel="Salva strategia"
      />

      {/* ── Modal Guida assistita ─────────────────────────────────── */}
      <Modal open={showGuida} onClose={() => setShowGuida(false)} size="xl">
        <div className="crea-strat__modal-head">
          <div>
            <h2 className="crea-strat__modal-title">Guida assistita smart</h2>
            <p className="crea-strat__modal-sub">
              Compila una cifra di base e una stagione: il sistema suggerisce un set di tariffe per ogni combinazione di occupazione e finestra di prenotazione.
            </p>
          </div>
          <button
            type="button"
            className="sib-btn sib-btn--icon"
            onClick={() => setShowGuida(false)}
            aria-label="Chiudi"
          >
            <i className="fa-duotone fa-xmark" aria-hidden="true"/>
          </button>
        </div>

        <div className="crea-strat__guida-config">
          <SelectField
            name="tipoStagione"
            label="Tipo stagione"
            value={tipoStagione}
            onChange={e => setTipoStagione(e.target.value)}
            options={STAGIONI.map(s => ({ value: s, label: s }))}
            className="crea-strat__field"
          />
          <InputField
            name="cifraBase"
            label="Cifra di base (€)"
            type="number"
            placeholder="Es. 250"
            value={cifraBase}
            onChange={e => setCifraBase(e.target.value)}
            className="crea-strat__field"
          />
          <button
            type="button"
            className="sib-btn sib-btn--primary crea-strat__guida-apply"
            onClick={handleApplyGuida}
            disabled={!parseFloat(cifraBase)}
          >
            <i className="fa-duotone fa-bolt" aria-hidden="true"/>
            Calcola suggerimento
          </button>
        </div>

        <div className="crea-strat__guida-table-wrap">
          <table className="crea-strat__guida-table">
            <thead>
              <tr>
                <th className="crea-strat__guida-th crea-strat__guida-th--occ">Occupazione</th>
                {GUIDA_WIN.map(c => (
                  <th key={c} className="crea-strat__guida-th">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GUIDA_OCC.map((occ, ri) => (
                <tr key={occ}>
                  <th scope="row" className="crea-strat__guida-occ">{occ}</th>
                  {GUIDA_WIN.map((_, ci) => (
                    <td key={ci} className="crea-strat__guida-td">
                      <input
                        type="number"
                        className={clsx(
                          'sib-input sib-input--dense crea-strat__guida-input',
                          guidaVals[ri][ci] > 0 && 'crea-strat__guida-input--filled',
                        )}
                        value={guidaVals[ri][ci] || ''}
                        onChange={e => setGuidaCell(ri, ci, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <FormActions
          onCancel={() => setShowGuida(false)}
          onConfirm={() => setShowGuida(false)}
          cancelLabel="Chiudi"
          confirmLabel="Applica alla matrice"
        />
      </Modal>
    </div>
  )
}
