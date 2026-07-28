import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import FormActions from '../../../core/components/FormActions'
import { InputField, SelectField, RadioGroup, CheckboxField, SearchField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import './NuovoContoPassante.sass'

interface Addebito {
  id: number
  data: string
  descrizione: string
  prezzo: number   // imponibile (€)
  iva: number      // aliquota %
}

const SEGMENTI = ['B2B', 'B2C', 'OTA', 'Diretto', 'Corporate']
const IVA_OPTS = [22, 10, 4, 0]
const TIPOLOGIA_OPTIONS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'agenzia', label: 'Agenzia' },
]

const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// Card di sezione: header con icona + titolo, corpo.
function Card({ icon, title, actions, full, children }: {
  icon: string; title: string; actions?: React.ReactNode; full?: boolean; children: React.ReactNode
}) {
  return (
    <section className={'ncp__card' + (full ? ' ncp__card--full' : '')}>
      <header className="ncp__card-head">
        <span className="ncp__card-title"><i className={`fa-duotone ${icon}`} aria-hidden="true" /> {title}</span>
        {actions && <span className="ncp__card-actions">{actions}</span>}
      </header>
      <div className="ncp__card-body">{children}</div>
    </section>
  )
}

export default function NuovoContoPassante({ navigate }: { navigate: (p: string) => void }) {
  const confirm = useConfirmStore((s) => s.confirm)

  const [tipologia, setTipologia] = useState<'cliente' | 'agenzia'>('agenzia')
  const [nominativo, setNominativo] = useState('')
  const [segmento, setSegmento] = useState('')
  const [collegaAnticipo, setCollegaAnticipo] = useState(false)
  const [anticipo, setAnticipo] = useState('')
  const [cercaAnticipo, setCercaAnticipo] = useState('')
  const [addebiti, setAddebiti] = useState<Addebito[]>([])
  const [selectedAddebiti, setSelectedAddebiti] = useState<number[]>([])

  const imponibile = addebiti.reduce((s, a) => s + (a.prezzo || 0), 0)
  const ivaTot = addebiti.reduce((s, a) => s + (a.prezzo || 0) * (a.iva || 0) / 100, 0)
  const totale = imponibile + ivaTot

  const aggiungiAddebito = () => {
    const newId = (addebiti[addebiti.length - 1]?.id ?? 0) + 1
    const today = new Date().toLocaleDateString('it-IT')
    setAddebiti([...addebiti, { id: newId, data: today, descrizione: '', prezzo: 0, iva: 22 }])
  }
  const setAddebito = (id: number, patch: Partial<Addebito>) =>
    setAddebiti((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const toggleAddebito = (id: number) =>
    setSelectedAddebiti((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAll = () =>
    setSelectedAddebiti((p) => (p.length === addebiti.length ? [] : addebiti.map((a) => a.id)))

  const eliminaAddebito = async (id: number) => {
    if (await confirm({ message: 'Rimuovere questo addebito dalla lista?', danger: true })) {
      setAddebiti((p) => p.filter((a) => a.id !== id))
      setSelectedAddebiti((p) => p.filter((x) => x !== id))
    }
  }

  return (
    <div className="ncp">
      <PageHead
        onBack={() => navigate('conti-passanti')}
        title="Nuovo conto passante"
        subtitle="Crea un conto per un cliente o un'agenzia esterna, con eventuale anticipo e lista addebiti"
      />

      <Card icon="fa-address-card" title="Intestatario">
        <div className="ncp__grid ncp__grid--3">
          <RadioGroup
            name="tipologia" label="Tipologia"
            options={TIPOLOGIA_OPTIONS}
            value={tipologia}
            onChange={(v) => setTipologia(v as 'cliente' | 'agenzia')}
          />
          <InputField
            name="nominativo" label="Nominativo"
            placeholder={tipologia === 'agenzia' ? 'Cerca agenzia…' : 'Cerca cliente…'}
            iconLeft="fa-light fa-magnifying-glass"
            value={nominativo}
            onChange={(e) => setNominativo(e.target.value)}
          />
          <SelectField
            name="segmento" label="Segmento"
            placeholder="Seleziona"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value)}
            options={SEGMENTI.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </Card>

      <Card icon="fa-hand-holding-dollar" title="Anticipo">
        <CheckboxField
          name="collega-anticipo" label="Collega un anticipo già incassato a questo conto"
          checked={collegaAnticipo}
          onChange={(e) => setCollegaAnticipo(e.target.checked)}
        />
        {collegaAnticipo ? (
          <div className="ncp__grid ncp__grid--2 ncp__anticipo-fields">
            <SelectField
              name="suggerimenti-anticipo" label="Anticipi disponibili"
              placeholder="Seleziona un anticipo…"
              value={anticipo}
              onChange={(e) => setAnticipo(e.target.value)}
              options={[]}
            />
            <div className="ncp__field">
              <label className="ncp__label">Cerca anticipo</label>
              <SearchField
                name="cerca-anticipo"
                placeholder="Per importo o data…"
                value={cercaAnticipo}
                onChange={(e) => setCercaAnticipo(e.target.value)}
                onClear={() => setCercaAnticipo('')}
              />
            </div>
          </div>
        ) : (
          <p className="ncp__hint"><i className="fa-light fa-circle-info" /> Attiva l'opzione per collegare un anticipo esistente e scalarlo dal totale.</p>
        )}
      </Card>

      <Card
        icon="fa-receipt" title="Lista addebiti" full
        actions={
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={aggiungiAddebito}>
            <i className="fa-light fa-circle-plus" /> Aggiungi addebito
          </button>
        }
      >
        <div className="sib-table-wrap">
          <table className="sib-table ncp__table">
            <thead>
              <tr>
                <th className="ncp__th-check">
                  <input type="checkbox" className="sib-checkbox"
                    checked={addebiti.length > 0 && selectedAddebiti.length === addebiti.length}
                    onChange={toggleAll} aria-label="Seleziona tutti" />
                </th>
                <th className="ncp__th-data">Data</th>
                <th>Descrizione</th>
                <th className="ncp__th-num">Imponibile</th>
                <th className="ncp__th-iva">IVA</th>
                <th className="ncp__th-num">Totale</th>
                <th className="ncp__th-act" />
              </tr>
            </thead>
            <tbody>
              {addebiti.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ncp__empty">
                    <i className="fa-light fa-receipt ncp__empty-ico" />
                    <span>Nessun addebito. Aggiungi la prima voce con “Aggiungi addebito”.</span>
                  </td>
                </tr>
              ) : addebiti.map((a) => (
                <tr key={a.id} className={selectedAddebiti.includes(a.id) ? 'ncp__row--sel' : ''}>
                  <td className="ncp__td-center">
                    <input type="checkbox" className="sib-checkbox"
                      checked={selectedAddebiti.includes(a.id)}
                      onChange={() => toggleAddebito(a.id)} aria-label={`Seleziona addebito ${a.id}`} />
                  </td>
                  <td className="ncp__td-data">{a.data}</td>
                  <td>
                    <input className="sib-input ncp__cell-in" value={a.descrizione}
                      placeholder="Descrizione voce…"
                      onChange={(e) => setAddebito(a.id, { descrizione: e.target.value })} />
                  </td>
                  <td className="ncp__td-num">
                    <div className="ncp__euro">
                      <input type="number" min={0} step={0.01} className="sib-input ncp__cell-num" value={a.prezzo}
                        onChange={(e) => setAddebito(a.id, { prezzo: Number(e.target.value || 0) })} />
                      <span className="ncp__euro-sfx">€</span>
                    </div>
                  </td>
                  <td className="ncp__td-iva">
                    <select className="sib-select ncp__cell-sel" value={a.iva}
                      onChange={(e) => setAddebito(a.id, { iva: Number(e.target.value) })}>
                      {IVA_OPTS.map((v) => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </td>
                  <td className="ncp__td-num ncp__td-tot">{eur((a.prezzo || 0) * (1 + (a.iva || 0) / 100))}</td>
                  <td className="ncp__td-center">
                    <Tooltip text="Rimuovi addebito">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Rimuovi" onClick={() => eliminaAddebito(a.id)}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Riepilogo totali */}
        <div className="ncp__summary">
          <div className="ncp__sum-item">
            <span className="ncp__sum-k">Imponibile</span>
            <span className="ncp__sum-v">{eur(imponibile)}</span>
          </div>
          <div className="ncp__sum-item">
            <span className="ncp__sum-k">IVA</span>
            <span className="ncp__sum-v">{eur(ivaTot)}</span>
          </div>
          <div className="ncp__sum-item ncp__sum-item--tot">
            <span className="ncp__sum-k">Totale conto</span>
            <span className="ncp__sum-v">{eur(totale)}</span>
          </div>
          <button type="button" className="sib-btn sib-btn--secondary ncp__pay" disabled={addebiti.length === 0}>
            <i className="fa-light fa-credit-card" /> Paga ora
          </button>
        </div>
      </Card>

      <FormActions
        onCancel={() => navigate('conti-passanti')}
        onConfirm={() => navigate('conti-passanti')}
        confirmLabel="Salva conto"
        confirmIcon="fa-floppy-disk"
      />
    </div>
  )
}
