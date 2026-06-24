import React, { useMemo, useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import AlertBanner from '../../../../core/components/AlertBanner'
import Modal from '../../../../core/components/Modal'
import FormActions from '../../../../core/components/FormActions'
import { InputField, SelectField } from '../../../../core/components/form'
import { STRUTTURE, TIPI_CALENDARIO, type TipoCalendario } from '../strategieData'
import './CreaStrategia.sass'

// ── Dataset locali ────────────────────────────────────────────────────────────

type TipoStrategia = 'Individuali' | 'Gruppi'

const CATEGORIE = ['-', '3 stelle', '4 stelle', '5 stelle']

interface OccRange { id: string; from: number; to: number }
// Fasce di occupazione struttura — la cella mostra il valore alto (to) sopra
// e quello basso (from) sotto, separati dalla freccia di intervallo.
const OCC_RANGES: OccRange[] = [
  { id: 'occ-99', from: 96, to: 99 },
  { id: 'occ-95', from: 91, to: 95 },
  { id: 'occ-90', from: 86, to: 90 },
  { id: 'occ-85', from: 81, to: 85 },
  { id: 'occ-80', from: 71, to: 80 },
  { id: 'occ-70', from: 61, to: 70 },
  { id: 'occ-60', from: 46, to: 60 },
  { id: 'occ-45', from: 31, to: 45 },
  { id: 'occ-30', from: 0,  to: 30 },
]

interface BookingWin { id: string; label: string; from: number; to: number }
const BOOKING_WINS: BookingWin[] = [
  { id: 'win-8',   label: '0 – 8 Giorni',    from: 0,  to: 8   },
  { id: 'win-25',  label: '9 – 25 Giorni',   from: 9,  to: 25  },
  { id: 'win-47',  label: '26 – 47 Giorni',  from: 26, to: 47  },
  { id: 'win-80',  label: '48 – 80 Giorni',  from: 48, to: 80  },
  { id: 'win-250', label: '81 – 250 Giorni', from: 81, to: 250 },
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
const formatRate = (r: number) => `€ ${r.toFixed(2).replace('.', ',')}`

// Guida assistita — calcolo a step occupancy × finestra
const GUIDA_OCC = ['100 %','95 %','90 %','85 %','80 %','75 %','70 %','60 %','50 %','40 %','30 %']
const GUIDA_WIN = ['0 – 7','8 – 21','22 – 45','46 – 90','91 – 365']

const STAGIONI = ['Low Season', 'Mid Season', 'High Season', 'Peak Season']

// ── Color picker libero (react-colorful) ───────────────────────────────────────
// Selezione di un colore arbitrario, senza liste di colori predefiniti.
function ColorPickerField({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const preview = value || '#204769'

  return (
    <div className="crea-strat__color" ref={ref}>
      <button
        type="button"
        className={clsx('crea-strat__color-trigger', open && 'crea-strat__color-trigger--open')}
        onClick={() => setOpen(o => !o)}
      >
        {value
          ? <><span className="crea-strat__color-dot" style={{ background: value }} aria-hidden="true" /><span className="crea-strat__color-val">{value.toUpperCase()}</span></>
          : <span className="crea-strat__color-placeholder">Seleziona colore</span>}
        <i className="fa-light fa-chevron-down crea-strat__color-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="crea-strat__color-pop">
          <HexColorPicker color={preview} onChange={onChange} />
          <div className="crea-strat__color-hexrow">
            <span className="crea-strat__color-dot" style={{ background: preview }} aria-hidden="true" />
            <HexColorInput className="crea-strat__color-input" color={preview} onChange={onChange} prefixed />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function CreaStrategia({ navigate }: { navigate: (p: string) => void }) {
  const [categoria,      setCategoria]      = useState<string>('-')
  const [struttura,      setStruttura]      = useState(STRUTTURE[0])
  const [tipoCalendario, setTipoCalendario] = useState<TipoCalendario>('Tariffe')
  const [tipoStrategia,  setTipoStrategia]  = useState<TipoStrategia>('Individuali')
  const [nome,           setNome]           = useState('')
  const [colore,         setColore]         = useState<string>('')
  const [saved,          setSaved]          = useState(false)
  const [copied,         setCopied]         = useState(false)
  const [touched,        setTouched]        = useState(false)
  const [showGuida,      setShowGuida]      = useState(false)
  const [tipoStagione,   setTipoStagione]   = useState(STAGIONI[0])
  const [cifraBase,      setCifraBase]      = useState('')

  // matrice principale: righe (occupazione) × colonne (finestre) → barId
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

  const isValid = nome.trim().length > 0 && !!colore

  const handleSave = () => {
    setTouched(true)
    if (!isValid) return
    setSaved(true)
    window.setTimeout(() => setSaved(false), 3000)
  }

  // Duplica la strategia corrente come base per una nuova bozza.
  const handleCopy = () => {
    setNome(n => (n.trim() ? `${n.trim()} - Copia` : 'Nuova strategia - Copia'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 3000)
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

  const tipoLabel = tipoStrategia === 'Individuali' ? 'INDIVIDUALE' : 'GRUPPI'
  const tipoIcon  = tipoStrategia === 'Individuali' ? 'fa-user' : 'fa-users'

  return (
    <div className="crea-strat">
      <BtnBack onClick={() => navigate('calendario-strategie')}/>
      <PageHeader
        title="Crea strategia"
        subtitle="Definisci la BAR per ogni combinazione di occupazione struttura e finestra di prenotazione."
      />

      {saved && <AlertBanner type="success">Strategia salvata con successo</AlertBanner>}
      {copied && <AlertBanner type="info">Strategia copiata: modifica e salva la nuova bozza</AlertBanner>}
      {touched && !isValid && (
        <AlertBanner type="warning">
          Compila <strong>Nome strategia</strong> e <strong>Colore</strong> per poter salvare.
        </AlertBanner>
      )}

      {/* ── Toolbar parametri (riga unica) + azioni ─────────────────── */}
      <div className="crea-strat__bar">
        <div className="crea-strat__params">
          <SelectField
            name="categoria"
            label="Categoria"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            options={CATEGORIE.map(c => ({ value: c, label: c }))}
            className="crea-strat__field crea-strat__field--narrow"
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
          <InputField
            name="nome"
            label="Nome strategia"
            placeholder="Nome della strategia"
            value={nome}
            onChange={e => setNome(e.target.value)}
            error={touched && !nome.trim() ? 'Obbligatorio' : undefined}
            className="crea-strat__field crea-strat__field--name"
          />
          <div className="crea-strat__static">
            <label className="text-[12px] font-semibold font-poppins text-primary">Tipo strategia</label>
            <button
              type="button"
              className="crea-strat__static-val"
              title="Clicca per cambiare tipo strategia"
              onClick={() => setTipoStrategia(t => t === 'Individuali' ? 'Gruppi' : 'Individuali')}
            >
              {tipoStrategia}
            </button>
          </div>
          <div className="crea-strat__static">
            <label className="text-[12px] font-semibold font-poppins text-primary">Colore strategia</label>
            <ColorPickerField value={colore} onChange={setColore} />
          </div>
        </div>

        <div className="crea-strat__actions">
          <button type="button" className="sib-btn sib-btn--secondary crea-strat__btn" onClick={() => setShowGuida(true)}>
            <i className="fa-duotone fa-wand-magic-sparkles" aria-hidden="true"/>
            Guida assistita smart
          </button>
          <button type="button" className="sib-btn sib-btn--secondary crea-strat__btn" onClick={handleCopy}>
            <i className="fa-duotone fa-copy" aria-hidden="true"/>
            Copia strategia
          </button>
          <button type="button" className="sib-btn sib-btn--secondary crea-strat__btn" onClick={handleSave}>
            <i className="fa-duotone fa-floppy-disk" aria-hidden="true"/>
            Salva
          </button>
        </div>
      </div>

      {/* ── Matrice BAR ───────────────────────────────────────────── */}
      <div className="crea-strat__matrix-wrap">
        <div className="crea-strat__matrix-scroll">
          <table className="crea-strat__matrix" role="grid">
            <colgroup>
              <col className="crea-strat__col-vlabel" />
              <col className="crea-strat__col-occ" />
              {BOOKING_WINS.map(w => <col key={w.id} />)}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="crea-strat__th-corner" colSpan={2} />
                {BOOKING_WINS.map(w => (
                  <th key={w.id} scope="col" className="crea-strat__th">{w.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OCC_RANGES.map((occ, ri) => (
                <tr key={occ.id}>
                  {ri === 0 && (
                    <th scope="col" className="crea-strat__vlabel" rowSpan={OCC_RANGES.length}>
                      <div className="crea-strat__vlabel-inner">
                        <span className="crea-strat__vlabel-text">Strategia {tipoLabel}</span>
                        <i className={`fa-duotone ${tipoIcon} crea-strat__vlabel-ico`} aria-hidden="true"/>
                      </div>
                    </th>
                  )}
                  <th scope="row" className="crea-strat__occ-cell">
                    <div className="crea-strat__occ">
                      <span className="crea-strat__occ-val">{occ.to} %</span>
                      <i className="fa-light fa-arrow-up-arrow-down crea-strat__occ-arrow" aria-hidden="true"/>
                      <span className="crea-strat__occ-val">{occ.from} %</span>
                    </div>
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
                          aria-label={`BAR per occupazione ${occ.from}–${occ.to}% – ${win.label}`}
                          onChange={e => setCell(ri, ci, e.target.value)}
                        >
                          <option value="">Seleziona Bar</option>
                          {BARS.map(b => (
                            <option key={b.id} value={b.id}>{formatRate(b.rate)}</option>
                          ))}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
