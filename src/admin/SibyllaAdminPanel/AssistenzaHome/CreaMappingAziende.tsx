import React, { useMemo, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import './CreaMappingAziende.sass'

interface Props {
  navigate: (p: string) => void
}

const CHANNELS = ['Dirette', 'Corporate', 'B2C', 'Gruppi', 'B2B', 'Complementary']

const BASE_AZIENDE = [
  'Transfer S.R.L.', 'm.pieri@sibyllanetwork.com', 'mttpri@gmail2.com', 'zz', 'bubba@gmail.com',
  'Italcamel', 'San Marino Viaggi e Vacanze', 'San Marino Events', 'Malatesta', 'San Marino International',
]
const AZIENDE = [...BASE_AZIENDE, ...Array.from({ length: 30 }, (_, i) => `Azienda Demo ${i + 1}`)]

const PAGE_SIZE = 10

// Mapping iniziale (come da riferimento).
const INITIAL: Record<string, boolean> = {
  'Italcamel:B2C': true, 'Italcamel:Gruppi': true, 'Italcamel:B2B': true,
  'San Marino Viaggi e Vacanze:Gruppi': true,
  'San Marino Events:Gruppi': true,
  'Malatesta:Gruppi': true,
  'San Marino International:Gruppi': true,
}

export default function CreaMappingAziende({ navigate }: Props) {
  const [page, setPage] = useState(1)
  const [marks, setMarks] = useState<Record<string, boolean>>(INITIAL)

  const totalPages = Math.max(1, Math.ceil(AZIENDE.length / PAGE_SIZE))
  const rows = useMemo(() => AZIENDE.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE), [page])

  const toggle = (az: string, ch: string) =>
    setMarks(m => ({ ...m, [`${az}:${ch}`]: !m[`${az}:${ch}`] }))

  return (
    <div className="maz">
      <button type="button" className="maz__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>

      <div className="maz__head">
        <h1 className="maz__title">Crea mapping delle aziende</h1>
        <p className="maz__sub">Associa ogni azienda ai canali di vendita abilitati.</p>
      </div>

      <div className="sib-table-wrap maz__wrap">
        <table className="sib-table maz__table">
          <thead>
            <tr>
              <th className="maz__th-az">Azienda</th>
              {CHANNELS.map(c => <th key={c} className="maz__th-ch">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(az => (
              <tr key={az}>
                <td className="maz__az">{az}</td>
                {CHANNELS.map(ch => (
                  <td key={ch} className="maz__cell">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={!!marks[`${az}:${ch}`]}
                      onChange={() => toggle(az, ch)}
                      aria-label={`${az} — ${ch}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="maz__pag">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
