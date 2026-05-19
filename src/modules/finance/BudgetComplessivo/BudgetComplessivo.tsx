import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../services/api'
import './BudgetComplessivo.sass'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

interface Voce {
  id: string
  label: string
  values: number[]   // 12 mesi
}

interface Gruppo {
  id: string
  label: string
  voci: Voce[]
  totale?: Voce
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  modo: 'Diretto' | 'Simulato'
  anno: number
  meseCorrente: number
  gruppi: Gruppo[]
  margineOperativoLordo: number[]
}

const ZERO12 = (): number[] => Array(12).fill(0)

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  modo: 'Diretto',
  anno: 2026,
  meseCorrente: 4,
  gruppi: [
    {
      id: 'valore-produzione',
      label: 'Valore della produzione',
      voci: [
        { id: 'rv-vp', label: 'Ricavi delle vendite e delle prestazioni', values: ZERO12() },
        { id: 'rv-pd', label: 'Ricavi e proventi diversi',                values: ZERO12() },
      ],
      totale: { id: 'tot-ricavi', label: 'Totale ricavi', values: ZERO12() },
    },
    {
      id: 'costi-produzione',
      label: 'Costi della produzione',
      voci: [
        { id: 'co-fisso',  label: 'Costo Fisso',     values: ZERO12() },
        { id: 'co-variab', label: 'Costo Variabile', values: ZERO12() },
      ],
      totale: { id: 'tot-costi', label: 'Totale costi', values: ZERO12() },
    },
  ],
  margineOperativoLordo: ZERO12(),
}

function fmtEuro(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`
}

export default function BudgetComplessivo({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('budget/GetComplessivo', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, modo: data.modo, anno: data.anno },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const annoOptions = Array.from({ length: 7 }, (_, i) => 2024 + i)

  const updateCell = (gIdx: number, vIdx: number, mIdx: number, value: number) => {
    setData((prev) => ({
      ...prev,
      gruppi: prev.gruppi.map((g, gi) =>
        gi !== gIdx ? g : ({
          ...g,
          voci: g.voci.map((v, vi) =>
            vi !== vIdx ? v : ({ ...v, values: v.values.map((x, xi) => xi === mIdx ? value : x) })
          ),
        })
      ),
    }))
  }

  return (
    <div className="budget-complessivo">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Budget complessivo"
        subtitle="Pianificazione strategica suddivisa per le diverse voci dei ricavi e dei costi"
      />

      <div className="budget-complessivo__bar">
        <div className="budget-complessivo__field">
          <select
            className="sib-select budget-complessivo__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="budget-complessivo__radio-group">
          <label className="budget-complessivo__radio-item">
            <input type="radio" className="sib-radio" checked={data.modo === 'Diretto'} onChange={() => setData({ ...data, modo: 'Diretto' })} />
            <span>Diretto</span>
          </label>
          <label className="budget-complessivo__radio-item">
            <input type="radio" className="sib-radio" checked={data.modo === 'Simulato'} onChange={() => setData({ ...data, modo: 'Simulato' })} />
            <span>Simulato</span>
          </label>
        </div>

        <div className="budget-complessivo__field">
          <select
            className="sib-select budget-complessivo__select budget-complessivo__select--sm"
            value={data.anno}
            onChange={(e) => setData({ ...data, anno: Number(e.target.value) })}
          >
            {annoOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <button type="button" className="sib-btn sib-btn--secondary budget-complessivo__cabina">
          <i className="fa-light fa-magnifying-glass" /> Cabina di controllo
        </button>
      </div>

      <div className="budget-complessivo__table-wrap">
        <table className="budget-complessivo__table">
          <thead>
            <tr>
              <th className="budget-complessivo__col-label">{data.anno}</th>
              {MESI.map((m, i) => (
                <th key={m} className={'budget-complessivo__th' + (i + 1 < data.meseCorrente ? ' budget-complessivo__th--past' : '')}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.gruppi.map((g, gi) => (
              <React.Fragment key={g.id}>
                <tr className="budget-complessivo__group-row">
                  <td colSpan={13}><strong>{g.label}</strong></td>
                </tr>
                {g.voci.map((v, vi) => (
                  <tr key={v.id} className="budget-complessivo__voce-row">
                    <td className="budget-complessivo__col-label">{v.label}</td>
                    {v.values.map((cell, mi) => {
                      const past = mi + 1 < data.meseCorrente
                      return (
                        <td key={mi} className={'budget-complessivo__cell' + (past ? ' budget-complessivo__cell--past' : '')}>
                          {past ? (
                            <span className="budget-complessivo__cell-value">{fmtEuro(cell)}</span>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              className="budget-complessivo__input"
                              value={cell || ''}
                              placeholder="0,00 €"
                              onChange={(e) => updateCell(gi, vi, mi, Number(e.target.value) || 0)}
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {g.totale && (
                  <tr className="budget-complessivo__total-row">
                    <td className="budget-complessivo__col-label"><strong>{g.totale.label}</strong></td>
                    {g.totale.values.map((cell, mi) => (
                      <td key={mi} className="budget-complessivo__cell">{fmtEuro(cell)}</td>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            ))}

            <tr className="budget-complessivo__total-row">
              <td className="budget-complessivo__col-label"><strong>Margine Operativo Lordo</strong></td>
              {data.margineOperativoLordo.map((cell, mi) => (
                <td key={mi} className="budget-complessivo__cell">{fmtEuro(cell)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
