import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import FormActions from '../../../core/components/FormActions'
import { SelectField, RadioGroup, CheckboxField, SearchField } from '../../../core/components/form'
import AnagraficaCombobox, { type Anagrafica } from './AnagraficaCombobox'
import CreaAnagraficaModal from './CreaAnagraficaModal'
import ContiCamera from '../ContiCamera/ContiCamera'
import './NuovoContoPassante.sass'

const SEGMENTI = ['B2B', 'B2C', 'OTA', 'Diretto', 'Corporate']
const TIPOLOGIA_OPTIONS = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'agenzia', label: 'Agenzia' },
]

// Anagrafiche di esempio per la ricerca live del Nominativo.
const SEED_CLIENTI: Anagrafica[] = [
  { id: 'cli-1', nome: 'Mario Rossi', sub: 'Italia' },
  { id: 'cli-2', nome: 'Giulia Bianchi', sub: 'Italia' },
  { id: 'cli-3', nome: 'Luca Verdi', sub: 'Svizzera' },
]
const SEED_AGENZIE: Anagrafica[] = [
  { id: 'ag-1', nome: 'Welcome Travel', sub: 'P.IVA 01234567890' },
  { id: 'ag-2', nome: 'Bluvacanze', sub: 'P.IVA 09876543210' },
  { id: 'ag-3', nome: 'Gattinoni', sub: 'P.IVA 05555512345' },
]

// Card di sezione: header con icona + titolo, corpo.
function Card({ icon, title, full, disabled, children }: {
  icon: string; title: string; full?: boolean; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <section className={'ncp__card' + (full ? ' ncp__card--full' : '') + (disabled ? ' ncp__card--disabled' : '')}>
      <header className="ncp__card-head">
        <span className="ncp__card-title"><i className={`fa-duotone ${icon}`} aria-hidden="true" /> {title}</span>
      </header>
      <div className="ncp__card-body">{children}</div>
    </section>
  )
}

export default function NuovoContoPassante({ navigate }: { navigate: (p: string) => void }) {
  const [tipologia, setTipologia] = useState<'cliente' | 'agenzia'>('agenzia')
  const [clienti, setClienti] = useState<Anagrafica[]>(SEED_CLIENTI)
  const [agenzie, setAgenzie] = useState<Anagrafica[]>(SEED_AGENZIE)
  const [selected, setSelected] = useState<Anagrafica | null>(null)
  const [segmento, setSegmento] = useState('')
  const [collegaAcconto, setCollegaAcconto] = useState(false)
  const [acconto, setAcconto] = useState('')
  const [cercaAcconto, setCercaAcconto] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const anagrafiche = tipologia === 'agenzia' ? agenzie : clienti

  const resetSelezione = (a: Anagrafica | null) => { setSelected(a); setSaved(false) }

  const handleSaveAnagrafica = (a: Anagrafica) => {
    if (tipologia === 'agenzia') setAgenzie((p) => [a, ...p])
    else setClienti((p) => [a, ...p])
    resetSelezione(a)
    setModalOpen(false)
  }

  const salvaConto = () => { if (selected) setSaved(true) }

  return (
    <div className="ncp">
      <PageHead
        onBack={() => navigate('conti-passanti')}
        title="Nuovo conto passante"
        subtitle="Crea un conto per un cliente o un'agenzia esterna, poi gestisci addebiti e anticipi"
      />

      <Card icon="fa-address-card" title="Intestatario">
        <div className="ncp__grid ncp__grid--intestatario">
          <RadioGroup
            name="tipologia" label="Tipologia"
            options={TIPOLOGIA_OPTIONS}
            value={tipologia}
            onChange={(v) => { setTipologia(v as 'cliente' | 'agenzia'); resetSelezione(null) }}
          />
          <AnagraficaCombobox
            tipo={tipologia}
            items={anagrafiche}
            value={selected}
            onSelect={resetSelezione}
            onClear={() => resetSelezione(null)}
            onCreate={() => setModalOpen(true)}
          />
          <SelectField
            name="segmento" label="Segmento"
            placeholder="Seleziona"
            value={segmento}
            onChange={(e) => setSegmento(e.target.value)}
            options={SEGMENTI.map((s) => ({ value: s, label: s }))}
          />
          <div className="ncp__save-cell">
            <button
              type="button"
              className="sib-btn sib-btn--primary ncp__save-btn"
              disabled={!selected || saved}
              onClick={salvaConto}
            >
              <i className={`fa-light ${saved ? 'fa-circle-check' : 'fa-floppy-disk'}`} aria-hidden="true" />
              {saved ? 'Conto salvato' : 'Salva conto'}
            </button>
          </div>
        </div>
      </Card>

      <Card icon="fa-hand-holding-dollar" title="Anticipo">
        <CheckboxField
          name="collega-anticipo" label="Collega un anticipo già incassato a questo conto"
          checked={collegaAcconto}
          onChange={(e) => setCollegaAcconto(e.target.checked)}
        />
        {collegaAcconto ? (
          <div className="ncp__grid ncp__grid--2 ncp__acconto-fields">
            <SelectField
              name="suggerimenti-anticipo" label="Anticipi disponibili"
              placeholder="Seleziona un anticipo…"
              value={acconto}
              onChange={(e) => setAcconto(e.target.value)}
              options={[]}
            />
            <div className="ncp__field">
              <label className="ncp__label">Cerca anticipo</label>
              <SearchField
                name="cerca-anticipo"
                placeholder="Per importo o data…"
                value={cercaAcconto}
                onChange={(e) => setCercaAcconto(e.target.value)}
                onClear={() => setCercaAcconto('')}
              />
            </div>
          </div>
        ) : (
          <p className="ncp__hint"><i className="fa-light fa-circle-info" aria-hidden="true" /> Attiva l'opzione per collegare un anticipo esistente e scalarlo dal totale.</p>
        )}
      </Card>

      <Card icon="fa-receipt" title="Lista addebiti-anticipi" full disabled={!saved}>
        {saved ? (
          <ContiCamera navigate={navigate} embedded />
        ) : (
          <div className="ncp__locked">
            <i className="fa-light fa-lock ncp__locked-ico" aria-hidden="true" />
            <p>Salva il conto per attivare gli addebiti e gli anticipi.</p>
          </div>
        )}
      </Card>

      <FormActions
        onCancel={() => navigate('conti-passanti')}
        onConfirm={() => navigate('conti-passanti')}
        confirmLabel="Salva conto passante"
        confirmIcon="fa-floppy-disk"
        confirmDisabled={!saved}
      />

      <CreaAnagraficaModal
        open={modalOpen}
        tipo={tipologia}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAnagrafica}
      />
    </div>
  )
}
