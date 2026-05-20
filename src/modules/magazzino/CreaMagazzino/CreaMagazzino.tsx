import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import Tooltip from '../../../core/components/Tooltip'
import {
  InputField,
  SelectField,
  TextareaField,
  CheckboxField,
} from '../../../core/components/form'
import './CreaMagazzino.sass'

interface Struttura {
  id: string
  nome: string
}

interface Magazzino {
  id: string
  nome: string
  strutture: string[]
  collocazioni: string[]
  note?: string
}

interface Prodotto {
  id: string
  codice: string
  nome: string
  giacenza: number
}

interface Movimento {
  id: string
  magazzinoId: string
  prodottoId: string
  prodottoNome: string
  prodottoCodice: string
  collocazione: string
  quantita: number
  tipo: 'entrata' | 'uscita'
  note?: string
  data: string
}

const STRUTTURE: Struttura[] = [
  { id: 'ciao',     nome: 'ciao' },
  { id: 'grim',     nome: "Grim's Hotel" },
  { id: 'azzurro',  nome: 'Hotel Azzurro Mare' },
  { id: 'tutorial', nome: 'Hotel Tutorial' },
  { id: 'test',     nome: 'test' },
]

const PRODOTTI: Prodotto[] = [
  { id: 'p1', codice: 'ZFGT6KC', nome: 'Pastetta',                  giacenza: 12 },
  { id: 'p2', codice: 'A1B2C3D', nome: 'Olio EVO 1L',               giacenza: 24 },
  { id: 'p3', codice: 'X9Y8Z7W', nome: 'Vino bianco IGT',           giacenza: 30 },
  { id: 'p4', codice: 'M5N6O7P', nome: 'Detergente piatti 5L',      giacenza: 6 },
]

export default function CreaMagazzino({
  navigate,
  autoOpen,
}: {
  navigate: (p: string) => void
  autoOpen?: boolean
}) {
  const [strutturaId, setStrutturaId] = useState<string>('azzurro')
  const [magazzini, setMagazzini]     = useState<Magazzino[]>([])
  const [magazzinoId, setMagazzinoId] = useState<string>('')
  const [movimenti, setMovimenti]     = useState<Movimento[]>([])

  const [createOpen, setCreateOpen] = useState<boolean>(!!autoOpen)
  const [moveOpen,   setMoveOpen]   = useState(false)

  useEffect(() => {
    if (autoOpen) setCreateOpen(true)
  }, [autoOpen])

  const strutturaName = STRUTTURE.find(s => s.id === strutturaId)?.nome ?? ''
  const magazziniDisp = magazzini.filter(m => m.strutture.includes(strutturaName))
  const movimentiDisp = movimenti.filter(m => m.magazzinoId === magazzinoId)

  function saveMagazzino(m: Magazzino) {
    setMagazzini(prev => [...prev, m])
    setMagazzinoId(m.id)
    setCreateOpen(false)
  }

  function saveMovimento(m: Movimento) {
    setMovimenti(prev => [m, ...prev])
    setMoveOpen(false)
  }

  return (
    <div className="crea-mag">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Movimenti scorte"
        subtitle="Monitoraggio e gestione delle scorte di magazzino per tenere traccia delle giacenze, automatizzare il riordino e ottimizzare i livelli di stock"
      />

      <div className="crea-mag__toolbar">
        <div className="crea-mag__filters">
          <SelectField
            name="struttura" label="Struttura"
            value={strutturaId}
            onChange={e => { setStrutturaId(e.target.value); setMagazzinoId('') }}
            options={STRUTTURE.map(s => ({ value: s.id, label: s.nome }))}
          />
          <SelectField
            name="magazzino" label="Magazzino"
            value={magazzinoId}
            onChange={e => setMagazzinoId(e.target.value)}
            placeholder={magazziniDisp.length === 0 ? 'Nessun magazzino' : 'Seleziona magazzino'}
            options={magazziniDisp.map(m => ({ value: m.id, label: m.nome }))}
            disabled={magazziniDisp.length === 0}
          />
          <button
            type="button"
            className="sib-btn sib-btn--primary crea-mag__btn-create"
            onClick={() => setCreateOpen(true)}
          >
            <i className="fa-light fa-circle-play" /> Crea magazzino
          </button>
        </div>

        <button
          type="button"
          className="sib-btn sib-btn--secondary"
          onClick={() => setMoveOpen(true)}
          disabled={!magazzinoId}
        >
          <i className="fa-light fa-cube" /> Nuovo movimento
        </button>
      </div>

      {magazzinoId && movimentiDisp.length > 0 ? (
        <div className="crea-mag__movimenti">
          <table className="crea-mag__movimenti-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Prodotto</th>
                <th>Cod. prodotto</th>
                <th>Collocazione</th>
                <th>Tipo</th>
                <th className="crea-mag__col-num">Quantità</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {movimentiDisp.map(m => (
                <tr key={m.id}>
                  <td>{new Date(m.data).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{m.prodottoNome}</td>
                  <td className="crea-mag__mono">{m.prodottoCodice}</td>
                  <td>{m.collocazione}</td>
                  <td>
                    <span className={'crea-mag__tag crea-mag__tag--' + m.tipo}>
                      <i className={'fa-light ' + (m.tipo === 'entrata' ? 'fa-cart-arrow-down' : 'fa-cart-flatbed')} />
                      {m.tipo === 'entrata' ? 'In entrata' : 'In uscita'}
                    </span>
                  </td>
                  <td className="crea-mag__col-num">{m.tipo === 'entrata' ? '+' : '−'}{m.quantita}</td>
                  <td className="crea-mag__note-cell">{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="crea-mag__empty">
          <i className="fa-light fa-boxes-stacked" aria-hidden="true" />
          <p>
            {magazzinoId
              ? 'Non sono presenti movimenti per questo magazzino.'
              : magazziniDisp.length === 0
                ? 'Nessun magazzino configurato per questa struttura. Crea il primo per iniziare.'
                : 'Seleziona un magazzino dalla tendina per visualizzarne i movimenti.'}
          </p>
          {magazziniDisp.length === 0 && (
            <button
              type="button"
              className="sib-btn sib-btn--primary"
              onClick={() => setCreateOpen(true)}
            >
              <i className="fa-light fa-circle-plus" /> Crea il primo magazzino
            </button>
          )}
        </div>
      )}

      {createOpen && (
        <NuovoMagazzinoModal
          strutture={STRUTTURE}
          defaultStruttura={strutturaName}
          onSave={saveMagazzino}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {moveOpen && (
        <NuovoMovimentoModal
          prodotti={PRODOTTI}
          collocazioni={magazzini.find(m => m.id === magazzinoId)?.collocazioni ?? []}
          magazzinoId={magazzinoId}
          onSave={saveMovimento}
          onClose={() => setMoveOpen(false)}
          navigate={navigate}
        />
      )}
    </div>
  )
}

// ─── Modale Nuovo magazzino ──────────────────────────────────────────
function NuovoMagazzinoModal({
  strutture, defaultStruttura, onSave, onClose,
}: {
  strutture: Struttura[]
  defaultStruttura: string
  onSave: (m: Magazzino) => void
  onClose: () => void
}) {
  const [nome, setNome]                 = useState('')
  const [selStrutture, setSelStrutture] = useState<string[]>(defaultStruttura ? [defaultStruttura] : [])
  const [collocazione, setColloc]       = useState('')
  const [note, setNote]                 = useState('')

  const canSave = nome.trim() !== '' && selStrutture.length > 0 && collocazione.trim() !== ''

  function toggle(name: string) {
    setSelStrutture(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  function handleSave() {
    if (!canSave) return
    onSave({
      id: `m-${Date.now()}`,
      nome: nome.trim(),
      strutture: selStrutture,
      collocazioni: collocazione.split(',').map(c => c.trim()).filter(Boolean),
      note: note.trim() || undefined,
    })
  }

  return (
    <div className="crea-mag__backdrop" onClick={onClose}>
      <div className="crea-mag__modal" onClick={e => e.stopPropagation()}>
        <header className="crea-mag__modal-head">
          <h3 className="crea-mag__modal-title">Nuovo magazzino</h3>
          <Tooltip text="Chiudi">
            <button type="button" className="sib-btn sib-btn--icon" onClick={onClose} aria-label="Chiudi">
              <i className="fa-light fa-xmark" />
            </button>
          </Tooltip>
        </header>

        <div className="crea-mag__modal-body">
          <InputField
            name="nome" label="Nome magazzino" required
            value={nome}
            onChange={e => setNome(e.target.value)}
          />

          <div className="crea-mag__field">
            <label className="crea-mag__field-label">Strutture<span className="crea-mag__req">*</span></label>
            <div className="crea-mag__strutture">
              {strutture.map(s => (
                <CheckboxField
                  key={s.id}
                  name={`str-${s.id}`}
                  label={s.nome}
                  checked={selStrutture.includes(s.nome)}
                  onChange={() => toggle(s.nome)}
                />
              ))}
            </div>
          </div>

          <InputField
            name="collocazione" label="Collocazione magazzino" required
            placeholder="Inserire nome collocazione"
            hint="Più collocazioni separate da virgola (es. Cantina, Scaffale A)"
            value={collocazione}
            onChange={e => setColloc(e.target.value)}
          />

          <TextareaField
            name="note" label="Note" rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <footer className="crea-mag__modal-foot">
          <FormActions
            onCancel={onClose}
            onConfirm={handleSave}
            confirmLabel="Salva"
            confirmIcon="fa-floppy-disk"
            confirmDisabled={!canSave}
          />
        </footer>
      </div>
    </div>
  )
}

// ─── Modale Nuovo movimento ──────────────────────────────────────────
function NuovoMovimentoModal({
  prodotti, collocazioni, magazzinoId, onSave, onClose, navigate,
}: {
  prodotti: Prodotto[]
  collocazioni: string[]
  magazzinoId: string
  onSave: (m: Movimento) => void
  onClose: () => void
  navigate: (p: string) => void
}) {
  const [prodottoId, setProdottoId] = useState('')
  const [colloc, setColloc]         = useState('')
  const [quantita, setQuantita]     = useState(1)
  const [note, setNote]             = useState('')
  const [tipo, setTipo]             = useState<'entrata' | 'uscita'>('entrata')

  const prodotto = prodotti.find(p => p.id === prodottoId)
  const canSave = !!prodotto && !!colloc && quantita > 0

  function handleSave() {
    if (!prodotto || !canSave) return
    onSave({
      id: `mov-${Date.now()}`,
      magazzinoId,
      prodottoId: prodotto.id,
      prodottoNome: prodotto.nome,
      prodottoCodice: prodotto.codice,
      collocazione: colloc,
      quantita,
      tipo,
      note: note.trim() || undefined,
      data: new Date().toISOString(),
    })
  }

  return (
    <div className="crea-mag__backdrop" onClick={onClose}>
      <div className="crea-mag__modal" onClick={e => e.stopPropagation()}>
        <header className="crea-mag__modal-head">
          <h3 className="crea-mag__modal-title">Nuovo movimento</h3>
          <Tooltip text="Chiudi">
            <button type="button" className="sib-btn sib-btn--icon" onClick={onClose} aria-label="Chiudi">
              <i className="fa-light fa-xmark" />
            </button>
          </Tooltip>
        </header>

        <div className="crea-mag__modal-body">
          <div>
            <SelectField
              name="prodotto" label="Nome prodotto"
              placeholder="Seleziona"
              value={prodottoId}
              onChange={e => setProdottoId(e.target.value)}
              options={prodotti.map(p => ({ value: p.id, label: p.nome }))}
            />
            <p className="crea-mag__hint-link">
              Se il prodotto non è presente: <button
                type="button"
                className="crea-mag__link-btn"
                onClick={() => { onClose(); navigate('crea-prodotto') }}
              >Crea prodotto</button>
            </p>
          </div>

          <FormGrid cols={2}>
            <div>
              <span className="crea-mag__field-label">Cod. prodotto</span>
              <p className="crea-mag__static">{prodotto?.codice ?? '—'}</p>
            </div>
            <div>
              <span className="crea-mag__field-label">Giacenza magazzino</span>
              <p className="crea-mag__static">{prodotto ? `${prodotto.giacenza} pz` : '—'}</p>
            </div>
          </FormGrid>

          <SelectField
            name="collocazione" label="Collocazione"
            placeholder="Seleziona"
            value={colloc}
            onChange={e => setColloc(e.target.value)}
            options={collocazioni.length > 0
              ? collocazioni.map(c => ({ value: c, label: c }))
              : [{ value: 'Magazzino', label: 'Magazzino' }]}
          />

          <FormGrid cols={2}>
            <InputField
              name="quantita" label="Quantità" type="number" min={1}
              value={quantita}
              onChange={e => setQuantita(Math.max(1, Number(e.target.value) || 1))}
            />
            <InputField
              name="note" label="Note"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </FormGrid>

          <div className="crea-mag__field">
            <label className="crea-mag__field-label">Tipo movimento</label>
            <div className="crea-mag__tipo">
              <button
                type="button"
                className={'crea-mag__tipo-btn' + (tipo === 'entrata' ? ' crea-mag__tipo-btn--active' : '')}
                onClick={() => setTipo('entrata')}
                aria-pressed={tipo === 'entrata'}
              >
                <i className="fa-light fa-cart-arrow-down" />
                In entrata
              </button>
              <button
                type="button"
                className={'crea-mag__tipo-btn' + (tipo === 'uscita' ? ' crea-mag__tipo-btn--active' : '')}
                onClick={() => setTipo('uscita')}
                aria-pressed={tipo === 'uscita'}
              >
                <i className="fa-light fa-cart-flatbed" />
                In uscita
              </button>
            </div>
          </div>
        </div>

        <footer className="crea-mag__modal-foot">
          <FormActions
            onCancel={onClose}
            onConfirm={handleSave}
            confirmLabel="Salva"
            confirmIcon="fa-floppy-disk"
            confirmDisabled={!canSave}
          />
        </footer>
      </div>
    </div>
  )
}
