import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { SelectField, DatePickerField } from '../../../../core/components/form'
import './GrigliaDisponibilitaEstesa.sass'

// ── Tipi ─────────────────────────────────────────────────────────────────────
interface RoomRow {
  tipo:         string
  totale:       number
  vendute:      number
  impegnate:    number
  disponibili:  number
  prenotate:    number
  opzionate:    number
  occupate:     number
  manutenzione: number
}

interface GiornoGroup {
  label:  string
  struttura: string
  camere: RoomRow[]
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const TIPI_CAMERA = ['Singola Classic','Doppia Classic','Tripla Classic','Doppia convertibile in Tripla','Doppia convertibile in Quadrupla']

function genGiornoGroup(date: Date, struttura: string): GiornoGroup {
  const label = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const n = Math.floor(1 + Math.random() * 3)
  const tipi = TIPI_CAMERA.slice(0, n)
  const camere: RoomRow[] = tipi.map(tipo => {
    const totale      = 1
    const vendute     = 0
    const impegnate   = 0
    const disponibili = totale - vendute - impegnate
    return { tipo, totale, vendute, impegnate, disponibili, prenotate: 0, opzionate: 0, occupate: 0, manutenzione: 0 }
  })
  return { label, struttura, camere }
}

function genGruppi(startDate: Date, nGiorni: number, struttura: string): GiornoGroup[] {
  return Array.from({ length: nGiorni }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return genGiornoGroup(d, struttura)
  })
}

const STRUTTURE = ['Tutte','Hotel Tutorial','Grim\'s Hotel','Hotel Azzurro Mare']

// ── Componente ────────────────────────────────────────────────────────────────
export default function GrigliaDisponibilitaEstesa({ navigate }: { navigate: (p: string) => void }) {
  const [categoria, setCategoria] = useState('Tutte')
  const [struttura, setStruttura] = useState('Tutte')
  const [periodo,   setPeriodo]   = useState(() => new Date().toISOString().slice(0, 10))
  const [nGiorni,   setNGiorni]   = useState(5)

  const startDate = new Date(periodo)
  const gruppi    = genGruppi(startDate, nGiorni, struttura)

  const Cell = ({ v }: { v: number }) =>
    v === 0
      ? <span className="griglia-estesa__zero">0</span>
      : <span className="griglia-estesa__positive">{v}</span>

  return (
    <div className="griglia-estesa">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader title="Griglia disponibilità estesa" subtitle="Stato delle prenotazioni per categoria, struttura, tipo di camera e periodo"/>

      {/* ── Toolbar ── */}
      <div className="griglia-estesa__toolbar">
        <div className="griglia-estesa__filters">
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
            className="w-[200px]"
            value={struttura}
            onChange={e => setStruttura(e.target.value)}
            options={STRUTTURE.map(s => ({ value: s, label: s }))}
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
          <span className="text-[12px] font-semibold font-poppins text-primary">&nbsp;</span>
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
      <div className="griglia-estesa__table-wrap">
        <table className="griglia-estesa__table">
          <thead>
            <tr>
              <th className="griglia-estesa__th griglia-estesa__th--left">Data</th>
              <th className="griglia-estesa__th">Numero Totale</th>
              <th className="griglia-estesa__th">Vendute</th>
              <th className="griglia-estesa__th">Impegnate</th>
              <th className="griglia-estesa__th">Disponibili</th>
              <th className="griglia-estesa__th">Prenotate</th>
              <th className="griglia-estesa__th">Opzionate</th>
              <th className="griglia-estesa__th">Occupate</th>
              <th className="griglia-estesa__th">Manutenzione</th>
            </tr>
          </thead>
          <tbody>
            {gruppi.map((gruppo, gi) => {
              const tot = {
                totale:       gruppo.camere.reduce((s, r) => s + r.totale, 0),
                vendute:      gruppo.camere.reduce((s, r) => s + r.vendute, 0),
                impegnate:    gruppo.camere.reduce((s, r) => s + r.impegnate, 0),
                disponibili:  gruppo.camere.reduce((s, r) => s + r.disponibili, 0),
                prenotate:    gruppo.camere.reduce((s, r) => s + r.prenotate, 0),
                opzionate:    gruppo.camere.reduce((s, r) => s + r.opzionate, 0),
                occupate:     gruppo.camere.reduce((s, r) => s + r.occupate, 0),
                manutenzione: gruppo.camere.reduce((s, r) => s + r.manutenzione, 0),
              }

              return (
                <React.Fragment key={gi}>
                  {/* Header giorno */}
                  <tr className="griglia-estesa__tr-date">
                    <td colSpan={9}>{gruppo.label}</td>
                  </tr>

                  {/* Righe tipo camera */}
                  {gruppo.camere.map((cam, ci) => (
                    <tr key={ci} className="griglia-estesa__tr-room">
                      <td>{cam.tipo}</td>
                      <td>{cam.totale}</td>
                      <td><Cell v={cam.vendute} /></td>
                      <td><Cell v={cam.impegnate} /></td>
                      <td><Cell v={cam.disponibili} /></td>
                      <td><Cell v={cam.prenotate} /></td>
                      <td><Cell v={cam.opzionate} /></td>
                      <td><Cell v={cam.occupate} /></td>
                      <td><Cell v={cam.manutenzione} /></td>
                    </tr>
                  ))}

                  {/* Totale giorno */}
                  <tr className="griglia-estesa__tr-total">
                    <td>Totale</td>
                    <td>{tot.totale}</td>
                    <td><Cell v={tot.vendute} /></td>
                    <td><Cell v={tot.impegnate} /></td>
                    <td><Cell v={tot.disponibili} /></td>
                    <td><Cell v={tot.prenotate} /></td>
                    <td><Cell v={tot.opzionate} /></td>
                    <td><Cell v={tot.occupate} /></td>
                    <td><Cell v={tot.manutenzione} /></td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
