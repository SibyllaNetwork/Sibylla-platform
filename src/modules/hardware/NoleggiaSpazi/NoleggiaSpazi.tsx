import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { SelectField, InputField } from '../../../core/components/form'
import TotemAgoraCta from '../_shared/TotemAgoraCta'
import TotemDettaglioModal from '../_shared/TotemDettaglioModal'
import './NoleggiaSpazi.sass'

type Periodo = 'mattina' | 'pomeriggio' | 'sera' | 'notte'

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

const PERIODI: Array<{ value: Periodo; label: string }> = [
  { value: 'mattina',    label: 'Mattina' },
  { value: 'pomeriggio', label: 'Pomeriggio' },
  { value: 'sera',       label: 'Sera' },
  { value: 'notte',      label: 'Notte' },
]

const PERIODO_LABEL: Record<Periodo, string> = {
  mattina:    'Mattina',
  pomeriggio: 'Pomeriggio',
  sera:       'Sera',
  notte:      'Notte',
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function buildInitialMatrix(): boolean[][] {
  // mock: alcune giornate pre-vendute / non disponibili
  return MESI.map((_, m) =>
    Array.from({ length: 31 }, (_, d) => {
      if (d >= DAYS_IN_MONTH[m]) return false
      // pattern alternato per simulare disponibilità
      const seed = (m * 31 + d) % 7
      return seed < 3
    })
  )
}

export default function NoleggiaSpazi({ navigate }: { navigate: (p: string) => void }) {
  const [periodo, setPeriodo] = useState<Periodo>('mattina')
  const [importo, setImporto] = useState('100')
  const [matrix, setMatrix]   = useState<boolean[][]>(buildInitialMatrix)
  const [dettaglioOpen, setDettaglioOpen] = useState(false)

  function toggleCell(m: number, d: number) {
    if (d >= DAYS_IN_MONTH[m]) return
    setMatrix(prev => prev.map((row, ri) =>
      ri !== m ? row : row.map((v, di) => (di === d ? !v : v))
    ))
  }

  const totSelected = useMemo(
    () => matrix.reduce((s, row) => s + row.filter(Boolean).length, 0),
    [matrix]
  )

  return (
    <div className="noleggia">
      <BtnBack onClick={() => navigate('gest-advertising')} />
      <PageHeader title="Noleggia spazi" />

      <div className="noleggia__layout">
        {/* ── Sinistra: planner ────────────────────────────── */}
        <section className="noleggia__planner">
          <h3 className="noleggia__title">Pianifica la vendita dei tuoi spazi pubblicitari</h3>

          <div className="noleggia__planner-head">
            <h2 className="noleggia__period-title">{PERIODO_LABEL[periodo]}</h2>
            <div className="noleggia__planner-controls">
              <SelectField
                name="periodo" label="Periodo"
                value={periodo}
                onChange={e => setPeriodo(e.target.value as Periodo)}
                options={PERIODI}
              />
              <InputField
                name="importo" label="Importo" type="number" min={0}
                iconLeft="fa-light fa-euro-sign"
                value={importo}
                onChange={e => setImporto(e.target.value)}
              />
              <div className="noleggia__save-wrap">
                <button type="button" className="sib-btn sib-btn--primary noleggia__save-btn">
                  Salva
                </button>
              </div>
            </div>
          </div>

          <div className="noleggia__grid-wrap">
            <table className="noleggia__grid">
              <thead>
                <tr>
                  <th className="noleggia__col-label">Giorni</th>
                  {Array.from({ length: 31 }, (_, i) => (
                    <th key={i} className="noleggia__col-day">{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MESI.map((mese, mi) => (
                  <tr key={mi}>
                    <td className="noleggia__row-label">{mese}</td>
                    {Array.from({ length: 31 }, (_, di) => {
                      const valid = di < DAYS_IN_MONTH[mi]
                      const selected = valid && matrix[mi][di]
                      return (
                        <td key={di} className="noleggia__cell">
                          <button
                            type="button"
                            className={
                              'noleggia__dot' +
                              (!valid ? ' noleggia__dot--invalid' : '') +
                              (selected ? ' noleggia__dot--on' : ' noleggia__dot--off')
                            }
                            onClick={() => toggleCell(mi, di)}
                            disabled={!valid}
                            aria-label={`${mese} ${di + 1} ${selected ? 'venduto' : 'libero'}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="noleggia__legend">
            <span className="noleggia__legend-item">
              <span className="noleggia__dot noleggia__dot--on" /> Seleziona
            </span>
            <span className="noleggia__legend-item">
              <span className="noleggia__dot noleggia__dot--off" /> Deseleziona
            </span>
            <span className="noleggia__legend-info">
              {totSelected} giorni venduti
            </span>
            <button
              type="button"
              className="sib-btn sib-btn--primary noleggia__procedi"
              onClick={() => navigate('pianifica-campagna')}
            >
              Procedi
            </button>
          </div>
        </section>

        {/* ── Centro: posizione scelta ─────────────────────── */}
        <section className="noleggia__pos-section">
          <h3 className="noleggia__pos-title">Posizione scelta</h3>
          <button
            type="button"
            className="noleggia__pos-name-btn"
            onClick={() => setDettaglioOpen(true)}
            aria-label="Dettaglio totem Hotel Archimede"
          >
            <strong>Hotel Archimede</strong>
          </button>
          <p className="noleggia__pos-addr">Via dei Mille 19 Roma</p>
          <div className="noleggia__pos-photo">
            <img
              src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800"
              alt="Reception Hotel Archimede"
              loading="lazy"
            />
          </div>
        </section>

        {/* ── Destra: anteprima totem (senza banner) ───────── */}
        <div className="noleggia__totem-col">
          <TotemAgoraCta showTitle={false} showBanner={false} />
        </div>
      </div>

      <TotemDettaglioModal
        open={dettaglioOpen}
        strutturaName="Hotel Archimede"
        onClose={() => setDettaglioOpen(false)}
      />
    </div>
  )
}
