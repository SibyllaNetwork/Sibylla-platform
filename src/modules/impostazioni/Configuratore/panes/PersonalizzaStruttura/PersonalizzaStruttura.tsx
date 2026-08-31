import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, TextareaField, ToggleSwitch } from '../../../../../core/components/form'
import { CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './PersonalizzaStruttura.sass'

// ─── PERSONALIZZA STRUTTURA (§4.25) ───────────────────────────────────────────
//  Riepilogo assegnazioni della struttura: Struttura · Indirizzo (era
//  «Località») · Descrizione · Sezionale · Check in · Check out · Azioni.
//   • la descrizione popola il Riepilogo Bacheca (lì in sola lettura);
//   • gli orari di check-in/check-out si sincronizzano con Network e Planner;
//   • pop-up SOVRAPPREZZO per Early check-in / Late check-out, con fasce
//     orarie di riferimento coerenti con l'orologio di sistema;
//   • azioni collegate: modifica su pop-up, eliminazione con conferma.

const PANE_ID = 'personalizza-struttura'

// Orari selezionabili con intervalli di 30 minuti: 00:00, 00:30, … 23:30
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

interface Sovrapprezzo {
  attivo: boolean
  /** Fascia oraria di riferimento oltre la quale si applica il sovrapprezzo. */
  soglia: string
  /** Importo del sovrapprezzo in euro. */
  importo: number
}

interface Row {
  id: number
  struttura: string
  indirizzo: string
  descrizione: string
  sezionale: string
  checkIn: string
  checkOut: string
  earlyCheckIn: Sovrapprezzo
  lateCheckOut: Sovrapprezzo
}

interface Data { rows: Row[] }

const FALLBACK_ROWS: Row[] = [
  {
    id: 1, struttura: 'Hotel Archimede', indirizzo: 'Via Appia 24, Ciampino Aeroporto',
    descrizione: 'Struttura ricettiva a quattro stelle vicina all’aeroporto', sezionale: 'HA',
    checkIn: '14:00', checkOut: '10:00',
    earlyCheckIn: { attivo: true,  soglia: '11:00', importo: 25 },
    lateCheckOut: { attivo: true,  soglia: '13:00', importo: 30 },
  },
  {
    id: 2, struttura: 'Hotel Luce', indirizzo: 'Viale dei Romagnoli 8, Fiumicino Aeroporto',
    descrizione: 'Struttura ricettiva con navetta aeroportuale', sezionale: 'HL',
    checkIn: '15:00', checkOut: '11:00',
    earlyCheckIn: { attivo: false, soglia: '12:00', importo: 20 },
    lateCheckOut: { attivo: false, soglia: '14:00', importo: 20 },
  },
  {
    id: 3, struttura: 'Ristorante Tullio', indirizzo: 'Via Salaria 120, Urbe Aeroporto',
    descrizione: 'Ristorante lounge bar', sezionale: 'RT',
    checkIn: '12:00', checkOut: '00:00',
    earlyCheckIn: { attivo: false, soglia: '10:00', importo: 0 },
    lateCheckOut: { attivo: false, soglia: '01:00', importo: 0 },
  },
  {
    id: 4, struttura: 'B&B React', indirizzo: 'Piazza della Stazione 3, Stazione Tiburtina',
    descrizione: 'Accoglienza H24 in centro città', sezionale: 'BR',
    checkIn: '14:30', checkOut: '10:30',
    earlyCheckIn: { attivo: false, soglia: '12:00', importo: 15 },
    lateCheckOut: { attivo: false, soglia: '12:30', importo: 15 },
  },
]

function rowEquals(a: Row, b: Row): boolean {
  return a.struttura === b.struttura && a.indirizzo === b.indirizzo
    && a.descrizione === b.descrizione && a.sezionale === b.sezionale
    && a.checkIn === b.checkIn && a.checkOut === b.checkOut
    && JSON.stringify(a.earlyCheckIn) === JSON.stringify(b.earlyCheckIn)
    && JSON.stringify(a.lateCheckOut) === JSON.stringify(b.lateCheckOut)
}

function countChanges(saved: Row[], draft: Row[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (!rowEquals(saved[i], draft[i])) n++
  }
  return n
}

/** Ora corrente dell'orologio di sistema, in formato HH:MM. */
function oraDiSistema(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export default function PersonalizzaStruttura() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [saved, setSaved] = useState<Row[]>(FALLBACK_ROWS)
  const [rows, setRows]   = useState<Row[]>(FALLBACK_ROWS)
  const [editId, setEditId]       = useState<number | null>(null)
  const [surchargeId, setSurchargeId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetPersonalizzaStruttura', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.rows) || d.rows.length === 0) return
        setSaved(d.rows)
        setRows(d.rows)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, rows), [saved, rows])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))

  const removeRow = async (row: Row) => {
    const ok = await confirm({
      title: 'Elimina struttura',
      message: `Rimuovere «${row.struttura}» dal riepilogo assegnazioni? La descrizione non sarà più mostrata nel Riepilogo Bacheca.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) setRows(rs => rs.filter(r => r.id !== row.id))
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetPersonalizzaStruttura', { method: 'POST', body: { rows } })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[PersonalizzaStruttura] persistenza remota non disponibile:', err)
    }
    setSaved(rows)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  const editing    = rows.find(r => r.id === editId) ?? null
  const surcharging = rows.find(r => r.id === surchargeId) ?? null

  return (
    <div className="personalizza-struttura">
      <CfgTable
        columns={[
          { key: 'struttura',   label: 'Struttura',   width: '15%' },
          { key: 'indirizzo',   label: 'Indirizzo',   width: '20%' },
          { key: 'descrizione', label: 'Descrizione', width: '19%' },
          { key: 'sezionale',   label: 'Sezionale',   width: '8%', align: 'center' },
          { key: 'checkin',     label: 'Check in',    width: '13%' },
          { key: 'checkout',    label: 'Check out',   width: '13%' },
          { key: 'azioni',      label: 'Azioni',      width: '12%', align: 'right' },
        ]}
        empty={<span>Nessuna struttura assegnata</span>}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="personalizza-struttura__td-name">
              <TruncatedText text={r.struttura} className="personalizza-struttura__trunc" />
            </td>
            <td>
              <TruncatedText text={r.indirizzo} className="personalizza-struttura__trunc" />
            </td>
            <td>
              <TruncatedText text={r.descrizione} className="personalizza-struttura__trunc" />
            </td>
            <td className="personalizza-struttura__td-sezionale">{r.sezionale}</td>
            <td>
              <SelectField
                name={`checkin-${r.id}`}
                value={r.checkIn}
                onChange={(e) => updateRow(r.id, { checkIn: e.target.value })}
                options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                className="personalizza-struttura__time"
              />
            </td>
            <td>
              <SelectField
                name={`checkout-${r.id}`}
                value={r.checkOut}
                onChange={(e) => updateRow(r.id, { checkOut: e.target.value })}
                options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                className="personalizza-struttura__time"
              />
            </td>
            <td className="personalizza-struttura__td-actions">
              <Tooltip text="Modifica struttura" variant="dark">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => setEditId(r.id)}
                  aria-label={`Modifica ${r.struttura}`}
                >
                  <i className="fa-solid fa-pen" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text="Sovrapprezzo early check-in / late check-out" variant="dark">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => setSurchargeId(r.id)}
                  aria-label={`Sovrapprezzo orari per ${r.struttura}`}
                >
                  <i className="fa-solid fa-clock" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text="Elimina struttura" variant="dark">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => removeRow(r)}
                  aria-label={`Elimina ${r.struttura}`}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>

      <p className="personalizza-struttura__note">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        La descrizione popola automaticamente il Riepilogo Bacheca (lì in sola lettura);
        gli orari di check-in e check-out si sincronizzano con Network e con il Planner.
      </p>

      {editing && (
        <EditModal
          key={editing.id}
          row={editing}
          onClose={() => setEditId(null)}
          onSave={(patch) => { updateRow(editing.id, patch); setEditId(null) }}
        />
      )}

      {surcharging && (
        <SovrapprezzoModal
          key={surcharging.id}
          row={surcharging}
          onClose={() => setSurchargeId(null)}
          onSave={(patch) => { updateRow(surcharging.id, patch); setSurchargeId(null) }}
        />
      )}

      <CfgSaveBar
        className="personalizza-struttura__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setRows(saved)}
        successMessage="Personalizzazione struttura salvata"
      />
    </div>
  )
}

// ─── Pop-up modifica struttura ────────────────────────────────────────────────

function EditModal({ row, onClose, onSave }: {
  row: Row
  onClose: () => void
  onSave: (patch: Partial<Row>) => void
}) {
  const [indirizzo, setIndirizzo]     = useState(row.indirizzo)
  const [descrizione, setDescrizione] = useState(row.descrizione)
  const [sezionale, setSezionale]     = useState(row.sezionale)

  return (
    <Modal open onClose={onClose} title={`Modifica ${row.struttura}`} size="md">
      <div className="personalizza-struttura__modal-form">
        <InputField
          name="edit-indirizzo"
          label="Indirizzo"
          value={indirizzo}
          onChange={(e) => setIndirizzo(e.target.value)}
        />
        <TextareaField
          name="edit-descrizione"
          label="Descrizione"
          value={descrizione}
          rows={3}
          hint="Mostrata in sola lettura nel Riepilogo Bacheca"
          onChange={(e) => setDescrizione(e.target.value)}
        />
        <InputField
          name="edit-sezionale"
          label="Sezionale"
          value={sezionale}
          maxLength={4}
          className="personalizza-struttura__sezionale-input"
          onChange={(e) => setSezionale(e.target.value.toUpperCase())}
        />
      </div>
      <footer className="personalizza-struttura__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          onClick={() => onSave({ indirizzo, descrizione, sezionale })}
        >
          Conferma
        </button>
      </footer>
    </Modal>
  )
}

// ─── Pop-up sovrapprezzo orari ────────────────────────────────────────────────
//  Sovrapprezzo per Early check-in e Late check-out: si applica oltre le fasce
//  orarie di riferimento, coerenti con l'orologio di sistema.

function SovrapprezzoModal({ row, onClose, onSave }: {
  row: Row
  onClose: () => void
  onSave: (patch: Partial<Row>) => void
}) {
  const [early, setEarly] = useState<Sovrapprezzo>(row.earlyCheckIn)
  const [late, setLate]   = useState<Sovrapprezzo>(row.lateCheckOut)

  return (
    <Modal open onClose={onClose} title="Sovrapprezzo orari" size="lg">
      <p className="personalizza-struttura__modal-sub">
        <strong>{row.struttura}</strong> — check-in dalle {row.checkIn}, check-out entro le {row.checkOut}.
        Le fasce orarie di riferimento sono verificate sull&rsquo;orologio di sistema
        (ora attuale {oraDiSistema()}).
      </p>

      <div className="personalizza-struttura__surcharge-grid">
        <SurchargeSection
          title="Early check-in"
          description={`Arrivo prima delle ${row.checkIn}`}
          fasciaLabel="Si applica per arrivi prima delle"
          fasce={TIME_OPTIONS.filter(t => t <= row.checkIn)}
          value={early}
          onChange={setEarly}
        />
        <SurchargeSection
          title="Late check-out"
          description={`Partenza dopo le ${row.checkOut}`}
          fasciaLabel="Si applica per partenze dopo le"
          fasce={TIME_OPTIONS.filter(t => t >= row.checkOut)}
          value={late}
          onChange={setLate}
        />
      </div>

      <footer className="personalizza-struttura__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          onClick={() => onSave({ earlyCheckIn: early, lateCheckOut: late })}
        >
          Conferma
        </button>
      </footer>
    </Modal>
  )
}

function SurchargeSection({ title, description, fasciaLabel, fasce, value, onChange }: {
  title: string
  description: string
  fasciaLabel: string
  fasce: string[]
  value: Sovrapprezzo
  onChange: (next: Sovrapprezzo) => void
}) {
  return (
    <section className="personalizza-struttura__surcharge">
      <header className="personalizza-struttura__surcharge-head">
        <div>
          <h4 className="personalizza-struttura__surcharge-title">{title}</h4>
          <p className="personalizza-struttura__surcharge-desc">{description}</p>
        </div>
        <ToggleSwitch
          checked={value.attivo}
          label={value.attivo ? 'Attivo' : 'Disattivo'}
          onChange={(attivo) => onChange({ ...value, attivo })}
        />
      </header>
      <div className="personalizza-struttura__surcharge-fields">
        <SelectField
          name={`fascia-${title}`}
          label={fasciaLabel}
          value={value.soglia}
          disabled={!value.attivo}
          onChange={(e) => onChange({ ...value, soglia: e.target.value })}
          options={fasce.map(t => ({ value: t, label: t }))}
        />
        <InputField
          name={`importo-${title}`}
          label="Sovrapprezzo"
          type="number"
          min={0}
          value={value.importo}
          disabled={!value.attivo}
          iconRight="fa-light fa-euro-sign"
          onChange={(e) => onChange({ ...value, importo: Number(e.target.value) || 0 })}
          className="personalizza-struttura__surcharge-importo"
        />
      </div>
    </section>
  )
}
