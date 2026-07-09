import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { DateRangeField } from '../../../../core/components/form'
import './PianificazioneAnnualeTO.sass'

// ─── Pianificazione annuale — versione Tour Operator ──────────────────────────
// Griglia calendario (mesi in verticale × booking window) con markup dinamici.
// I valori sono generati da una guida assistita smart (logica Platform: variabili
// booking window × stagionalità), modificabili con doppio clic nella matrice.
// Dopo il salvataggio: box dei markup creati + doppia visualizzazione (come nelle
// strategie).

type Stagione = 'bassa' | 'media' | 'alta' | 'top'

const STAGIONI: { key: Stagione; label: string }[] = [
  { key: 'bassa', label: 'Bassa' },
  { key: 'media', label: 'Media' },
  { key: 'alta',  label: 'Alta' },
  { key: 'top',   label: 'Top' },
]
// stagionalità per mese (Gen → Dic)
const STAGIONE_MESE: Stagione[] = ['bassa', 'bassa', 'media', 'media', 'alta', 'alta', 'top', 'top', 'alta', 'media', 'bassa', 'alta']
const MESI       = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const MESI_FULL  = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

// colonne = fasce di booking window (anticipo di prenotazione)
const BW = [
  { key: '60+',   label: '60+ gg' },
  { key: '31-60', label: '31–60 gg' },
  { key: '16-30', label: '16–30 gg' },
  { key: '8-15',  label: '8–15 gg' },
  { key: '0-7',   label: '0–7 gg' },
]

// generazione "smart" (logica Platform): base per stagione + offset per booking window
const SEASON_BASE: Record<Stagione, number> = { bassa: 5, media: 8, alta: 12, top: 18 }
const BW_OFFSET = [-2, -1, 0, 2, 4]
function smartMatrix(): Record<Stagione, number[]> {
  const out = {} as Record<Stagione, number[]>
  STAGIONI.forEach(s => { out[s.key] = BW.map((_, i) => Math.max(0, SEASON_BASE[s.key] + BW_OFFSET[i])) })
  return out
}

const lvl = (v: number) => (v <= 4 ? 1 : v <= 8 ? 2 : v <= 12 ? 3 : v <= 16 ? 4 : 5)
const fmtData = (iso: string) => iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function PianificazioneAnnualeTO({ navigate }: { navigate: (p: string) => void }) {
  const [da, setDa] = useState('2026-06-01')
  const [al, setAl] = useState('2026-09-30')
  const [markup, setMarkup]       = useState<Record<Stagione, number[]>>(smartMatrix)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [editing, setEditing]     = useState<{ m: number; i: number } | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [view, setView]           = useState<'matrice' | 'risultato'>('matrice')
  const [vista, setVista]         = useState<'matrice' | 'catalogo'>('matrice')

  const key = (m: number, i: number) => `${m}-${i}`
  const cellValue = (m: number, i: number) => overrides[key(m, i)] ?? markup[STAGIONE_MESE[m]][i]
  const setOverride = (m: number, i: number, v: number) =>
    setOverrides(prev => ({ ...prev, [key(m, i)]: Math.max(0, v) }))

  // riepilogo markup per stagione (min–max % + mesi)
  const riepilogo = useMemo(() => STAGIONI.map(s => {
    const mesiSt = STAGIONE_MESE.map((st, m) => (st === s.key ? m : -1)).filter(m => m >= 0)
    const vals = mesiSt.flatMap(m => BW.map((_, i) => cellValue(m, i)))
    return {
      ...s,
      mesi: mesiSt,
      min: vals.length ? Math.min(...vals) : 0,
      max: vals.length ? Math.max(...vals) : 0,
    }
  }), [markup, overrides])

  const generaCatalogo = () => { setOverrides({}); setView('matrice'); setWizardOpen(false) }

  // ── Matrice (riusabile in matrice + risultato) ───────────────────────────────
  const renderMatrice = (editable: boolean) => (
    <div className="pian__matrix-wrap">
      <table className="pian__matrix">
        <thead>
          <tr>
            <th className="pian__corner">Mese \ Booking window</th>
            {BW.map(b => <th key={b.key} className="pian__bw-th">{b.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {MESI.map((mese, m) => {
            const st = STAGIONE_MESE[m]
            return (
              <tr key={m}>
                <th className="pian__month">
                  <span className="pian__month-name">{mese}</span>
                  <span className={`pian__season pian__season--${st}`}>{STAGIONI.find(s => s.key === st)!.label}</span>
                </th>
                {BW.map((b, i) => {
                  const v = cellValue(m, i)
                  const isEd = editable && editing?.m === m && editing?.i === i
                  return (
                    <td key={b.key}
                      className={`pian__cell pian__cell--l${lvl(v)}${editable ? ' is-editable' : ''}`}
                      onDoubleClick={editable ? () => setEditing({ m, i }) : undefined}
                      title={editable ? 'Doppio clic per modificare' : undefined}>
                      {isEd ? (
                        <input
                          autoFocus type="number" className="pian__cell-input"
                          value={v}
                          onChange={e => setOverride(m, i, parseInt(e.target.value, 10) || 0)}
                          onBlur={() => setEditing(null)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(null) }}
                        />
                      ) : (
                        <span className="pian__cell-val">{v}<small>%</small></span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {/* asse booking window */}
      <div className="pian__bw-axis">
        <span className="pian__bw-axis-label"><i className="fa-light fa-clock" aria-hidden="true" /> Booking window</span>
        <div className="pian__bw-axis-track">
          {BW.map((b, i) => (
            <React.Fragment key={b.key}>
              <span className="pian__bw-dot">{b.label}</span>
              {i < BW.length - 1 && <span className="pian__bw-arrow"><i className="fa-solid fa-arrow-right-long" aria-hidden="true" /></span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="pian">
      <PageHead
        title="Pianificazione annuale"
        subtitle="Configura e applica markup dinamici alle tue offerte generando il catalogo annuale"
      />

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="pian__toolbar">
        <DateRangeField
          label="Periodo" nameFrom="da" nameTo="al"
          valueFrom={da} valueTo={al}
          onChange={(f, t) => { setDa(f ? f.toISOString().slice(0, 10) : ''); setAl(t ? t.toISOString().slice(0, 10) : '') }}
          className="pian__range"
        />
        <div className="pian__toolbar-actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setWizardOpen(true)}>
            <i className="fa-light fa-wand-magic-sparkles" aria-hidden="true" /> Guida assistita
          </button>
          {view === 'matrice' ? (
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => setView('risultato')}>
              <i className="fa-light fa-floppy-disk" aria-hidden="true" /> Salva catalogo
            </button>
          ) : (
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setView('matrice')}>
              <i className="fa-light fa-pen" aria-hidden="true" /> Modifica matrice
            </button>
          )}
        </div>
      </div>

      {view === 'matrice' ? (
        <>
          <div className="pian__hint">
            <i className="fa-light fa-circle-info" aria-hidden="true" />
            Markup generati con guida assistita smart (booking window × stagionalità). Doppio clic su una cella per modificarne il valore.
          </div>
          {renderMatrice(true)}
        </>
      ) : (
        // ── Risultato: box markup + doppia visualizzazione ────────────────────
        <div className="pian__result">
          <div className="pian__markup-box">
            <div className="pian__markup-head">
              <span className="pian__markup-title"><i className="fa-light fa-tags" aria-hidden="true" /> Markup creati</span>
              <span className="pian__markup-period">{fmtData(da)} → {fmtData(al)}</span>
            </div>
            <div className="pian__markup-list">
              {riepilogo.map(r => (
                <div key={r.key} className="pian__markup-item">
                  <span className={`pian__season pian__season--${r.key}`}>{r.label}</span>
                  <span className="pian__markup-range">{r.min}% – {r.max}%</span>
                  <span className="pian__markup-mesi">{r.mesi.length} mesi</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pian__dual">
            <div className="pian__dual-head">
              <span className="pian__dual-title">Visualizzazione catalogo</span>
              <div className="pian__seg" role="group" aria-label="Visualizzazione">
                <button type="button" className={`pian__seg-btn ${vista === 'matrice' ? 'is-on' : ''}`} onClick={() => setVista('matrice')}>
                  <i className="fa-light fa-table-cells" aria-hidden="true" /> Matrice
                </button>
                <button type="button" className={`pian__seg-btn ${vista === 'catalogo' ? 'is-on' : ''}`} onClick={() => setVista('catalogo')}>
                  <i className="fa-light fa-grip" aria-hidden="true" /> Catalogo
                </button>
              </div>
            </div>

            {vista === 'matrice' ? (
              renderMatrice(false)
            ) : (
              <div className="pian__catalogo">
                {MESI_FULL.map((mese, m) => {
                  const st = STAGIONE_MESE[m]
                  const vals = BW.map((_, i) => cellValue(m, i))
                  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
                  return (
                    <div key={m} className="pian__cat-card">
                      <div className="pian__cat-top">
                        <span className="pian__cat-mese">{mese}</span>
                        <span className={`pian__season pian__season--${st}`}>{STAGIONI.find(s => s.key === st)!.label}</span>
                      </div>
                      <div className="pian__cat-markup">+{Math.min(...vals)}% – +{Math.max(...vals)}%</div>
                      <div className="pian__cat-sample">
                        <span>Base € 100</span>
                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        <strong>€ {(100 * (1 + avg / 100)).toFixed(0)}</strong>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Guida assistita (wizard) ────────────────────────────────────────────── */}
      {wizardOpen && (
        <div className="pian__modal-backdrop" onClick={() => setWizardOpen(false)}>
          <div className="pian__modal" onClick={e => e.stopPropagation()}>
            <div className="pian__modal-head">
              <div>
                <h3 className="pian__modal-title"><i className="fa-light fa-wand-magic-sparkles" aria-hidden="true" /> Guida assistita — Markup dinamico</h3>
                <p className="pian__modal-sub">La matrice usa <strong>booking window</strong> e <strong>stagionalità</strong> come variabili (logica Platform). Modifica i valori prima di generare il catalogo.</p>
              </div>
              <button type="button" className="pian__modal-close" onClick={() => setWizardOpen(false)} aria-label="Chiudi">
                <i className="fa-light fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <table className="pian__wiz-table">
              <thead>
                <tr>
                  <th className="pian__wiz-corner">Stagionalità \ Booking window</th>
                  {BW.map(b => <th key={b.key}>{b.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {STAGIONI.map(s => (
                  <tr key={s.key}>
                    <th className="pian__wiz-season"><span className={`pian__season pian__season--${s.key}`}>{s.label}</span></th>
                    {BW.map((b, i) => (
                      <td key={b.key} className={`pian__cell pian__cell--l${lvl(markup[s.key][i])}`}>
                        <input type="number" className="pian__wiz-input" value={markup[s.key][i]}
                          onChange={e => {
                            const v = Math.max(0, parseInt(e.target.value, 10) || 0)
                            setMarkup(prev => ({ ...prev, [s.key]: prev[s.key].map((x, j) => (j === i ? v : x)) }))
                          }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pian__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setMarkup(smartMatrix())}>
                <i className="fa-light fa-arrows-rotate" aria-hidden="true" /> Rigenera valori smart
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={generaCatalogo}>
                <i className="fa-light fa-bolt" aria-hidden="true" /> Genera catalogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
