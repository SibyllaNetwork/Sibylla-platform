import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { SelectField, DatePickerField } from '../../../../core/components/form'
import './GrigliaDisponibilita.sass'

// ── Mock data ─────────────────────────────────────────────────────────────────
const STRUTTURE_DATA = [
  { id: 'grim',    nome: "Grim's Hotel",      licenza: 59, buffer: 0,  stopSales: false },
  { id: 'tut',     nome: 'Hotel Tutorial',     licenza: 120, buffer: 5, stopSales: false },
  { id: 'azzurro', nome: 'Hotel Azzurro Mare', licenza: 1,  buffer: 0,  stopSales: true  },
  { id: 'ciao',    nome: 'ciao',               licenza: 7,  buffer: 0,  stopSales: true  },
]

function genGiorni(startDate: Date, nGiorni: number) {
  return Array.from({ length: nGiorni }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function mockStanze(lic: number) {
  return Math.round(lic * (0.3 + Math.random() * 0.5))
}
function mockPersone(stanze: number) {
  return Math.round(stanze * (1.4 + Math.random() * 0.8))
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function GrigliaDisponibilita({ navigate }: { navigate: (p: string) => void }) {
  const [categoria, setCategoria] = useState('Tutte')
  const [struttura, setStruttura] = useState('Tutte')
  const [periodo,   setPeriodo]   = useState(() => new Date().toISOString().slice(0, 10))
  const [nGiorni,   setNGiorni]   = useState(5)

  const startDate = new Date(periodo)
  const giorni    = genGiorni(startDate, nGiorni)

  const struttureFiltered = struttura === 'Tutte'
    ? STRUTTURE_DATA
    : STRUTTURE_DATA.filter(s => s.nome === struttura)

  // Pre-calcola dati per ogni struttura/giorno
  const grid = struttureFiltered.map(s => ({
    ...s,
    giorni: giorni.map(() => {
      const st = mockStanze(s.licenza)
      return { stanze: st, persone: mockPersone(st) }
    }),
  }))

  // Totali per giorno
  const totaliGiorni = giorni.map((_, gi) => ({
    stanze:  grid.reduce((sum, s) => sum + s.giorni[gi].stanze, 0),
    persone: grid.reduce((sum, s) => sum + s.giorni[gi].persone, 0),
  }))
  const totLicenza = grid.reduce((s, r) => s + r.licenza, 0)
  const totBuffer  = grid.reduce((s, r) => s + r.buffer, 0)

  return (
    <div className="griglia-disp">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader title="Griglia disponibilità" subtitle="Stato delle prenotazioni per categoria, struttura, tipo di camera e periodo"/>

      {/* ── Toolbar ── */}
      <div className="griglia-disp__toolbar">
        <div className="griglia-disp__filters">
          <SelectField
            label="Categoria"
            name="categoria"
            className="w-[110px]"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            options={['Tutte','Standard','Superior','Suite'].map(c => ({ value: c, label: c }))}
          />
          <SelectField
            label="Struttura"
            name="struttura"
            className="w-[140px]"
            value={struttura}
            onChange={e => setStruttura(e.target.value)}
            options={[
              { value: 'Tutte', label: 'Tutte' },
              ...STRUTTURE_DATA.map(s => ({ value: s.nome, label: s.nome })),
            ]}
          />
          <DatePickerField
            label="Periodo"
            name="periodo"
            className="w-[150px]"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
          />
          <SelectField
            label="Giorni"
            name="nGiorni"
            className="w-[80px]"
            value={nGiorni}
            onChange={e => setNGiorni(+e.target.value)}
            options={[3, 5, 7, 10, 14].map(n => ({ value: n, label: String(n) }))}
          />
        </div>
        <div className="flex flex-col gap-1 ml-auto">
          <span className="text-[11px] font-semibold font-opensans text-ink">&nbsp;</span>
          <div className="flex items-center gap-1.5">
            <button className="sib-btn sib-btn--icon" title="Esporta CSV">
              <i className="fa-duotone fa-file-csv text-[14px]" aria-hidden="true"/>
            </button>
            <button className="sib-btn sib-btn--icon" title="Esporta PDF">
              <i className="fa-duotone fa-file-pdf text-[14px]" aria-hidden="true"/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabella ── */}
      <div className="griglia-disp__table-wrap">
        <table className="griglia-disp__table">
          <thead>
            <tr>
              {/* Intestazioni fisse */}
              <th className="griglia-disp__th griglia-disp__th--left" rowSpan={2} style={{ minWidth: 160 }}>
                Data
              </th>
              <th className="griglia-disp__th" rowSpan={2}>
                <div className="griglia-disp__th-icon-wrap">
                  <Ico n="grid" s={14} c={T.primary} />
                  <span>LICENZA</span>
                </div>
              </th>
              <th className="griglia-disp__th" rowSpan={2}>
                <div className="griglia-disp__th-icon-wrap">
                  <Ico n="layers" s={14} c={T.primary} />
                  <span>BUFFER</span>
                </div>
              </th>
              {/* Intestazioni per giorno */}
              {giorni.map((g, i) => (
                <th key={i} className="griglia-disp__th griglia-disp__th--date" colSpan={2}>
                  {formatDate(g)}
                </th>
              ))}
            </tr>
            <tr>
              {giorni.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="griglia-disp__th griglia-disp__th--border-left">
                    <div className="griglia-disp__th-icon-wrap">
                      <Ico n="briefcase" s={13} c={T.primary} />
                      <span>STANZE</span>
                    </div>
                  </th>
                  <th className="griglia-disp__th">
                    <div className="griglia-disp__th-icon-wrap">
                      <Ico n="user" s={13} c={T.primary} />
                      <span>PERSONE</span>
                    </div>
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Riga struttura */}
            <tr>
              <td className="griglia-disp__td griglia-disp__td--left" style={{ fontFamily: 'Poppins,sans-serif', fontSize: 12, fontWeight: 700, color: T.textDisabled, textTransform: 'uppercase', letterSpacing: '0.4px', background: '#F8FAFC' }}>
                Struttura
              </td>
              <td className="griglia-disp__td" style={{ background: '#F8FAFC' }} />
              <td className="griglia-disp__td" style={{ background: '#F8FAFC' }} />
              {giorni.map((_, i) => (
                <React.Fragment key={i}>
                  <td className="griglia-disp__td griglia-disp__td--border-left" style={{ background: '#F8FAFC' }} />
                  <td className="griglia-disp__td" style={{ background: '#F8FAFC' }} />
                </React.Fragment>
              ))}
            </tr>

            {/* Righe dati */}
            {grid.map(row => (
              <tr key={row.id} className="griglia-disp__tr">
                <td className="griglia-disp__td griglia-disp__td--left">{row.nome}</td>
                <td className="griglia-disp__td">{row.licenza}</td>
                <td className="griglia-disp__td">
                  {row.stopSales
                    ? <span className="griglia-disp__stop-badge"><Ico n="minus" s={10} c={T.error} /></span>
                    : <span className="griglia-disp__buffer-plus">+ {row.buffer}</span>
                  }
                </td>
                {row.giorni.map((g, i) => (
                  <React.Fragment key={i}>
                    <td className="griglia-disp__td griglia-disp__td--border-left">{g.stanze}</td>
                    <td className="griglia-disp__td">{g.persone}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}

            {/* Totale */}
            <tr className="griglia-disp__tr griglia-disp__tr--total">
              <td className="griglia-disp__td griglia-disp__td--left">TOTALE</td>
              <td className="griglia-disp__td">{totLicenza}</td>
              <td className="griglia-disp__td">
                {totBuffer > 0 ? <span className="griglia-disp__buffer-plus">+ {totBuffer}</span> : '0'}
              </td>
              {totaliGiorni.map((t, i) => (
                <React.Fragment key={i}>
                  <td className="griglia-disp__td griglia-disp__td--border-left">{t.stanze}</td>
                  <td className="griglia-disp__td">{t.persone}</td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
