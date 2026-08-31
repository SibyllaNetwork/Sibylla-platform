import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgTable, CfgToolbar } from '../../../../../core/cfg'
import { SelectField, RadioGroup, InputField } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import {
  GRIGLIA_DB_TOTALE,
  TIPOLOGIE_CAMERA,
  MATRICE_COLONNE,
  composizioneBar,
  sintesiBar,
  useBarFitStore,
  type BarMode,
  type BarMatrix,
  type MatriceColKey,
} from './barFitData'
import './BarFit.sass'

// ─── B.A.R. / F.I.T. ─────────────────────────────────────────────────────────
//  Master-detail dentro il pane: la lista (sinistra) mostra le BAR del
//  profilo con le informazioni di sintesi; l'occhio apre il dettaglio della
//  BAR nella parte destra della schermata (NON una modale). L'eliminazione
//  passa dal cestino sulla riga (con conferma) e agisce SOLO sul profilo:
//  la griglia di consulenza a DB (450 BAR) non viene toccata.

const PANE_ID = 'bar-fit'

const fmtEur = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const fmtEur2 = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v)

export default function BarFit() {
  const [mode, setMode] = useState<BarMode>('BAR')
  const modeLabel = mode === 'BAR' ? 'B.A.R.' : 'F.I.T.'

  const profilo  = useBarFitStore(s => s.profilo)
  const custom   = useBarFitStore(s => s.custom)
  const rimuovi  = useBarFitStore(s => s.rimuovi)
  const aggiungi = useBarFitStore(s => s.aggiungi)

  const numeri = profilo[mode]

  // Righe di lista: sintesi della composizione (la BAR è la somma delle
  // tipologie camera che la compongono per il calendario tariffario annuale).
  const righe = useMemo(
    () => numeri.map(n => {
      const rows = composizioneBar(mode, n, custom[`${mode}-${n}`])
      return { n, rows, sintesi: sintesiBar(rows) }
    }),
    [numeri, mode, custom],
  )

  const [selectedN, setSelectedN] = useState<number | null>(null)
  const [detailN, setDetailN] = useState<number | null>(null)
  const [creaOpen, setCreaOpen] = useState(false)

  // Cambio modalità: selezione e dettaglio non hanno più senso.
  useEffect(() => { setSelectedN(null); setDetailN(null) }, [mode])

  const setCompletion = useConfiguratoreStore(s => s.setCompletion)
  useEffect(() => {
    setCompletion(PANE_ID, profilo.BAR.length > 0 || profilo.FIT.length > 0 ? 'configured' : 'empty')
  }, [profilo, setCompletion])

  const confirm = useConfirmStore(s => s.confirm)
  const elimina = async (n: number) => {
    const ok = await confirm({
      title: `Rimuovi ${modeLabel} n. ${n}`,
      message: `Rimuovere la ${modeLabel} n. ${n} dal profilo della struttura? La griglia di consulenza a DB non viene modificata: la ${modeLabel} resterà disponibile per gli altri profili.`,
      confirmLabel: 'Rimuovi',
      danger: true,
    })
    if (!ok) return
    rimuovi(mode, n)
    if (detailN === n) setDetailN(null)
    if (selectedN === n) setSelectedN(null)
    toast.success(`${modeLabel} n. ${n} rimossa dal profilo`)
  }

  const salvaNuova = (matrix: BarMatrix) => {
    const n = aggiungi(mode, matrix)
    setCreaOpen(false)
    setSelectedN(n)
    setDetailN(n)
    toast.success(`${modeLabel} n. ${n} aggiunta al profilo`)
  }

  const dettaglio = detailN != null ? righe.find(r => r.n === detailN) ?? null : null

  return (
    <div className="bar-fit">
      <CfgToolbar
        actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setCreaOpen(true)}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" />
            Crea {modeLabel}
          </button>
        }
      >
        <SelectField
          name="struttura"
          label="Struttura"
          value=""
          onChange={() => { /* struttura unica nel profilo demo */ }}
          options={[{ value: '', label: 'Hotel Tutorial' }]}
        />
        <RadioGroup
          name="tipologia"
          label="Tipologia"
          value={mode}
          onChange={(v) => setMode(v as BarMode)}
          options={[
            { value: 'BAR', label: 'B.A.R.' },
            { value: 'FIT', label: 'F.I.T.' },
          ]}
        />
      </CfgToolbar>

      <div className={clsx('bar-fit__layout', dettaglio && 'bar-fit__layout--split')}>
        {/* ── Master: le BAR presenti nel profilo ── */}
        <div className="bar-fit__master">
          <CfgTable
            className="bar-fit__table"
            columns={[
              { key: 'n',         label: modeLabel,        width: '18%' },
              { key: 'tipologie', label: 'Composizione',   width: '26%' },
              { key: 'doppia',    label: 'Doppia Classic', width: '20%', align: 'right' },
              { key: 'range',     label: 'Tariffe',        width: '22%', align: 'right' },
              { key: 'azioni',    label: '',               width: '14%', align: 'right' },
            ]}
            empty={<span>Nessuna {modeLabel} nel profilo: creane una o chiedi alla consulenza di abilitarla dalla griglia.</span>}
          >
            {righe.map(({ n, sintesi }) => (
              <tr
                key={n}
                className={clsx('bar-fit__row', selectedN === n && 'bar-fit__row--selected')}
                onClick={() => setSelectedN(prev => prev === n ? null : n)}
              >
                <td className="bar-fit__td-n">{modeLabel} {n}</td>
                <td>{sintesi.tipologie} tipologie camera</td>
                <td className="bar-fit__td-num">{fmtEur(sintesi.doppia)}</td>
                <td className="bar-fit__td-num">{fmtEur(sintesi.min)} – {fmtEur(sintesi.max)}</td>
                <td className="bar-fit__td-azioni">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    aria-label={`Dettaglio ${modeLabel} ${n}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedN(n); setDetailN(n) }}
                  >
                    <i className="fa-solid fa-eye" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon bar-fit__del"
                    aria-label={`Rimuovi ${modeLabel} ${n} dal profilo`}
                    onClick={(e) => { e.stopPropagation(); void elimina(n) }}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </CfgTable>
          <p className="bar-fit__count">
            {righe.length === 1 ? '1' : righe.length} {modeLabel} nel profilo · griglia di consulenza a DB: {GRIGLIA_DB_TOTALE}
          </p>
        </div>

        {/* ── Detail: la BAR aperta con l'occhio, a destra ── */}
        {dettaglio && (
          <aside className="bar-fit__detail" aria-label={`Dettaglio ${modeLabel} ${dettaglio.n}`}>
            <header className="bar-fit__detail-head">
              <div className="bar-fit__detail-titles">
                <h3 className="bar-fit__detail-title">{modeLabel} n. {dettaglio.n}</h3>
                <p className="bar-fit__detail-sub">
                  Somma delle tipologie camera che compongono la {modeLabel} per il calendario tariffario annuale
                </p>
              </div>
              <button
                type="button"
                className="bar-fit__detail-close"
                aria-label="Chiudi dettaglio"
                onClick={() => setDetailN(null)}
              >
                <i className="fa-light fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <CfgTable
              className="bar-fit__detail-table"
              columns={[
                { key: 'tipologia',   label: 'Tipologia camera', width: '46%' },
                { key: 'individuale', label: 'Indiv.',           width: '18%', align: 'right' },
                { key: 'gruppo',      label: 'Gruppo',           width: '18%', align: 'right' },
                { key: 'bambini',     label: 'Bamb.',            width: '18%', align: 'right' },
              ]}
            >
              {dettaglio.rows.map(r => (
                <tr key={r.tipologia}>
                  <td>
                    <TruncatedText text={r.tipologia} className="bar-fit__detail-tipo" />
                  </td>
                  <td className="bar-fit__td-num">{fmtEur2(r.individuale)}</td>
                  <td className="bar-fit__td-num">{fmtEur2(r.gruppo)}</td>
                  <td className="bar-fit__td-num">{fmtEur2(r.bambini)}</td>
                </tr>
              ))}
            </CfgTable>

            <p className="bar-fit__detail-foot">
              {dettaglio.sintesi.tipologie} tipologie · tariffa minima {fmtEur(dettaglio.sintesi.min)} · massima {fmtEur(dettaglio.sintesi.max)}
            </p>
          </aside>
        )}
      </div>

      {creaOpen && (
        <CreaBarModal
          modeLabel={modeLabel}
          onClose={() => setCreaOpen(false)}
          onSave={salvaNuova}
        />
      )}
    </div>
  )
}

// ─── Matrice di creazione (9 tipologie × 10 colonne) ─────────────────────────
//  Su Modal condiviso; niente scroll orizzontale: table-layout fixed con
//  colonne in %, intestazioni abbreviate + tooltip col nome completo.

function CreaBarModal({ modeLabel, onClose, onSave }: {
  modeLabel: string
  onClose: () => void
  onSave: (matrix: BarMatrix) => void
}) {
  const [matrix, setMatrix] = useState<BarMatrix>({})

  const set = (tipo: string, key: MatriceColKey, v: number) => {
    setMatrix(prev => ({ ...prev, [tipo]: { ...prev[tipo], [key]: v } }))
  }

  const haValori = Object.values(matrix).some(riga => Object.values(riga).some(v => v != null && v > 0))

  return (
    <Modal open onClose={onClose} title={`Crea ${modeLabel}`} size="xl" className="bar-fit-crea-modal">
      <p className="bar-fit-crea__hint">
        Imposta la best available rate per le tipologie camera che la compongono: la nuova {modeLabel} viene aggiunta al profilo sul primo slot libero della griglia.
      </p>

      <div className="bar-fit-crea__matrix-wrap">
        <table className="bar-fit-crea__matrix">
          <colgroup>
            <col className="bar-fit-crea__col-tipo" />
            {MATRICE_COLONNE.map(c => <col key={c.key} className="bar-fit-crea__col-val" />)}
          </colgroup>
          <thead>
            <tr>
              <th className="bar-fit-crea__th-tipo">Tipologia camera</th>
              {MATRICE_COLONNE.map(c => (
                <th key={c.key} className="bar-fit-crea__th-val">
                  <TruncatedText text={c.breve} full={c.estesa} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIPOLOGIE_CAMERA.map(tipo => (
              <tr key={tipo}>
                <td className="bar-fit-crea__td-tipo">
                  <TruncatedText text={tipo} className="bar-fit-crea__tipo-testo" />
                </td>
                {MATRICE_COLONNE.map(c => (
                  <td key={c.key} className="bar-fit-crea__td-val">
                    <InputField
                      name={`bar-${tipo}-${c.key}`}
                      type="number"
                      dense
                      min={0}
                      step={0.01}
                      className="bar-fit-crea__input"
                      value={matrix[tipo]?.[c.key] ?? ''}
                      onChange={(e) => set(tipo, c.key, Number(e.target.value) || 0)}
                      ariaLabel={`${tipo} — ${c.estesa} (€)`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="bar-fit-crea__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          disabled={!haValori}
          onClick={() => onSave(matrix)}
        >
          Salva
        </button>
      </footer>
    </Modal>
  )
}
