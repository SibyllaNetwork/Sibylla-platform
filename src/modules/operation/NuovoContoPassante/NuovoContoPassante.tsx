import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import {
  InputField,
  SelectField,
  RadioGroup,
  CheckboxField,
  SearchField,
} from '../../../core/components/form'
import './NuovoContoPassante.sass'

interface Addebito {
  id: number
  data: string
  descrizione: string
  prezzo: number
  iva: number
}

const SEGMENTI = ['B2B', 'B2C', 'OTA', 'Diretto', 'Corporate']

const TIPOLOGIA_OPTIONS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'agenzia', label: 'Agenzia' },
]

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

export default function NuovoContoPassante({ navigate }: { navigate: (p: string) => void }) {
  const [tipologia, setTipologia] = useState<'cliente' | 'agenzia'>('agenzia')
  const [nominativo, setNominativo] = useState('')
  const [segmento, setSegmento] = useState('')
  const [collegaAnticipo, setCollegaAnticipo] = useState(false)
  const [anticipo, setAnticipo] = useState('')
  const [cercaAnticipo, setCercaAnticipo] = useState('')
  const [addebiti, setAddebiti] = useState<Addebito[]>([])
  const [selectedAddebiti, setSelectedAddebiti] = useState<number[]>([])

  const totale = addebiti.reduce((s, a) => s + a.prezzo, 0)

  const aggiungiAddebito = () => {
    const newId = (addebiti[addebiti.length - 1]?.id ?? 0) + 1
    const today = new Date().toLocaleDateString('it-IT')
    setAddebiti([...addebiti, { id: newId, data: today, descrizione: '', prezzo: 0, iva: 22 }])
  }

  const toggleAddebito = (id: number) =>
    setSelectedAddebiti((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAll = () =>
    setSelectedAddebiti((p) => (p.length === addebiti.length ? [] : addebiti.map((a) => a.id)))

  const eliminaAddebito = (id: number) => {
    setAddebiti((p) => p.filter((a) => a.id !== id))
    setSelectedAddebiti((p) => p.filter((x) => x !== id))
  }

  return (
    <div className="nuovo-cp">
      <PageHead
        onBack={() => navigate('conti-passanti')}
        title="Nuovo conto passante"
        subtitle="Crea un conto per un cliente o un'agenzia esterna"
      />

      <h3 className="sib-section-title">Anagrafica</h3>
      <FormGrid cols={3}>
        <RadioGroup
          name="tipologia" label="Tipologia"
          options={TIPOLOGIA_OPTIONS}
          value={tipologia}
          onChange={(v) => setTipologia(v as 'cliente' | 'agenzia')}
        />
        <InputField
          name="nominativo" label="Nominativo"
          type="text"
          placeholder={tipologia === 'agenzia' ? 'Cerca agenzia...' : 'Cerca cliente...'}
          iconLeft="fa-light fa-magnifying-glass"
          value={nominativo}
          onChange={(e) => setNominativo(e.target.value)}
        />
        <SelectField
          name="segmento" label="Segmento"
          placeholder="Seleziona"
          value={segmento}
          onChange={(e) => setSegmento(e.target.value)}
          options={SEGMENTI.map(s => ({ value: s, label: s }))}
        />
      </FormGrid>

      <h3 className="sib-section-title">Anticipo</h3>
      <FormGrid cols={3}>
        <div className="nuovo-cp__check-cell">
          <CheckboxField
            name="collega-anticipo" label="Collega anticipo"
            checked={collegaAnticipo}
            onChange={(e) => setCollegaAnticipo(e.target.checked)}
          />
        </div>
        <SelectField
          name="suggerimenti-anticipo" label="Suggerimenti anticipi"
          placeholder="Seleziona anticipi..."
          disabled={!collegaAnticipo}
          value={anticipo}
          onChange={(e) => setAnticipo(e.target.value)}
          options={[]}
        />
        <div className="nuovo-cp__search-field">
          <span className="nuovo-cp__search-label">Cerca</span>
          <SearchField
            placeholder="Cerca per importo o data..."
            value={cercaAnticipo}
            onChange={(e) => setCercaAnticipo(e.target.value)}
            onClear={() => setCercaAnticipo('')}
            disabled={!collegaAnticipo}
          />
        </div>
      </FormGrid>

      <h3 className="sib-section-title">Lista addebiti</h3>
      <div className="sib-table-wrap">
        <table className="sib-table nuovo-cp__table">
          <thead>
            <tr>
              <th className="nuovo-cp__th-check">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={addebiti.length > 0 && selectedAddebiti.length === addebiti.length}
                  onChange={toggleAll}
                />
              </th>
              <th>Data</th>
              <th>Descrizione</th>
              <th className="nuovo-cp__th-num">Prezzo</th>
              <th className="nuovo-cp__th-num">IVA</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {addebiti.length === 0 && (
              <tr>
                <td colSpan={6} className="sib-empty">Nessun addebito. Aggiungi il primo cliccando "+ Aggiungi addebito".</td>
              </tr>
            )}
            {addebiti.map((a) => (
              <tr key={a.id}>
                <td className="nuovo-cp__td-center">
                  <input
                    type="checkbox"
                    className="sib-checkbox"
                    checked={selectedAddebiti.includes(a.id)}
                    onChange={() => toggleAddebito(a.id)}
                  />
                </td>
                <td>{a.data}</td>
                <td>{a.descrizione || <span className="sib-cell--muted">-</span>}</td>
                <td className="nuovo-cp__td-num">{fmtCurrency(a.prezzo)}</td>
                <td className="nuovo-cp__td-num">{a.iva} %</td>
                <td>
                  <Tooltip text="Elimina addebito">
                    <button
                      type="button"
                      className="sib-btn sib-btn--icon"
                      aria-label="Elimina"
                      onClick={() => eliminaAddebito(a.id)}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
          {addebiti.length > 0 && (
            <tfoot>
              <tr className="nuovo-cp__total-row">
                <td colSpan={3}>Totale</td>
                <td className="nuovo-cp__td-num nuovo-cp__total-cell">{fmtCurrency(totale)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="nuovo-cp__bar">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={aggiungiAddebito}>
          <i className="fa-light fa-circle-plus" /> Aggiungi addebito
        </button>
        <button type="button" className="sib-btn sib-btn--secondary" disabled={addebiti.length === 0}>
          <i className="fa-light fa-credit-card" /> Paga ora
        </button>
      </div>

      <FormActions
        onCancel={() => navigate('conti-passanti')}
        onConfirm={() => navigate('conti-passanti')}
        confirmLabel="Salva"
        confirmIcon="fa-floppy-disk"
      />
    </div>
  )
}
