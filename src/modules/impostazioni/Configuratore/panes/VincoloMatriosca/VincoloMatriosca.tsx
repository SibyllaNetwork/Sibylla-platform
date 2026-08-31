import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField } from '../../../../../core/components/form'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Modal from '../../../../../core/components/Modal'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './VincoloMatriosca.sass'

// ─── VINCOLO MATRIOSCA (§4.12) ────────────────────────────────────────────────
//  Relazioni gerarchiche tra tipologie di camera. Rinomine e ristrutturazione
//  del pop-up richieste dal brief:
//   • pop-up su Modal condiviso, titolo «Configura corrispondenze» (era Modifica);
//   • box SINISTRO = tipologie di camera configurate,
//     box DESTRO   = corrispondenze tra le camere configurate;
//   • colonna «Tipo camera sostitutiva» → «Corrispondenza matriosca».

const PANE_ID = 'vincolo-matriosca'

interface Riga { id: number; tipo: string; corrispondenze: string[] }
interface Struttura { Id: number; nome: string }

interface Data {
  Strutture: Struttura[]
  StrutturaId: number | null
  rows: Riga[]
}

const FALLBACK_ROWS: Riga[] = [
  { id: 1, tipo: 'Doppia',    corrispondenze: ['Matrimoniale Classic'] },
  { id: 2, tipo: 'Singola',   corrispondenze: ['Doppia Uso Singola', 'Singola Classic'] },
  { id: 3, tipo: 'Tripla',    corrispondenze: [] },
  { id: 4, tipo: 'Quadrupla', corrispondenze: [] },
  { id: 5, tipo: 'Superior',  corrispondenze: ['Suite Junior'] },
]

function countChanges(saved: Riga[], draft: Riga[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (saved[i].corrispondenze.join('|') !== draft[i].corrispondenze.join('|')) n++
  }
  return n
}

export default function VincoloMatriosca() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [saved, setSaved]             = useState<Riga[]>(FALLBACK_ROWS)
  const [rows, setRows]               = useState<Riga[]>(FALLBACK_ROWS)
  const [editingId, setEditingId]     = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetVincoloMatriosca', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.rows) || d.rows.length === 0) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        setSaved(d.rows)
        setRows(d.rows)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, rows), [saved, rows])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const editing = useMemo(() => rows.find(r => r.id === editingId) ?? null, [rows, editingId])

  const saveCorrispondenze = (next: string[]) => {
    if (editingId == null) return
    setRows(rs => rs.map(r => r.id === editingId ? { ...r, corrispondenze: next } : r))
    setEditingId(null)
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetVincoloMatriosca', {
        method: 'POST',
        body: { StrutturaId: strutturaId, rows },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[VincoloMatriosca] persistenza remota non disponibile:', err)
    }
    setSaved(rows)
    setCompletion(PANE_ID, rows.some(r => r.corrispondenze.length > 0) ? 'configured' : 'partial')
    resetDirty()
  }

  return (
    <div className="vincolo-matriosca">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="vincolo-matriosca__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'tipo',           label: 'Tipo camera',              width: '26%' },
          { key: 'corrispondenza', label: 'Corrispondenza matriosca', width: '54%' },
          { key: 'azioni',         label: 'Azioni',                   width: '20%', align: 'right' },
        ]}
      >
        {rows.map((r) => {
          const configured = r.corrispondenze.length > 0
          return (
            <tr key={r.id}>
              <td className="vincolo-matriosca__td-name">{r.tipo}</td>
              <td>
                {configured ? (
                  <span className="vincolo-matriosca__corr-list">{r.corrispondenze.join(', ')}</span>
                ) : (
                  <span className="vincolo-matriosca__empty">Nessuna corrispondenza configurata</span>
                )}
              </td>
              <td className="vincolo-matriosca__td-actions">
                <button
                  type="button"
                  className="sib-btn sib-btn--secondary sib-btn--sm"
                  onClick={() => setEditingId(r.id)}
                >
                  {/* Il titolo "Configura corrispondenze" sta nel pop-up (§4.12):
                      in riga basta l'azione, altrimenti la colonna non tiene. */}
                  {configured ? 'Modifica' : 'Configura'}
                </button>
              </td>
            </tr>
          )
        })}
      </CfgTable>

      {editing && (
        <CorrispondenzeModal
          key={editing.id}
          row={editing}
          allRows={rows}
          onClose={() => setEditingId(null)}
          onSave={saveCorrispondenze}
        />
      )}

      <CfgSaveBar
        className="vincolo-matriosca__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setRows(saved)}
        successMessage="Vincolo matriosca salvato"
      />
    </div>
  )
}

// ─── POP-UP «Configura corrispondenze» ────────────────────────────────────────
//  Su Modal condiviso. Box sinistro: le tipologie di camera CONFIGURATE nella
//  struttura (da cui si aggiunge); box destro: le CORRISPONDENZE tra le camere
//  configurate per la tipologia selezionata.

interface ModalProps {
  row: Riga
  allRows: Riga[]
  onClose: () => void
  onSave: (next: string[]) => void
}

function CorrispondenzeModal({ row, allRows, onClose, onSave }: ModalProps) {
  const [corrispondenze, setCorrispondenze] = useState<string[]>(row.corrispondenze)

  const configurate = useMemo(
    () => allRows.map(r => r.tipo).filter(t => t !== row.tipo && !corrispondenze.includes(t)),
    [allRows, row.tipo, corrispondenze],
  )

  const add    = (tipo: string) => setCorrispondenze(prev => [...prev, tipo])
  const remove = (tipo: string) => setCorrispondenze(prev => prev.filter(t => t !== tipo))

  return (
    <Modal open onClose={onClose} title="Configura corrispondenze" size="lg" className="vincolo-matriosca__modal">
      <p className="vincolo-matriosca__modal-sub">
        Tipologia <strong>{row.tipo}</strong>: scegli tra le tipologie configurate le camere
        che possono sostituirla (corrispondenza matriosca).
      </p>

      <div className="vincolo-matriosca__columns">
        <section className="vincolo-matriosca__column">
          <h4 className="vincolo-matriosca__column-title">Tipologie di camera configurate</h4>
          <ul className="vincolo-matriosca__avail">
            {configurate.length === 0 ? (
              <li className="vincolo-matriosca__avail-empty">Nessuna tipologia disponibile</li>
            ) : configurate.map(tipo => (
              <li key={tipo} className="vincolo-matriosca__avail-row">
                <span>{tipo}</span>
                <button
                  type="button"
                  className="vincolo-matriosca__add"
                  onClick={() => add(tipo)}
                  aria-label={`Aggiungi ${tipo} alle corrispondenze`}
                >
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="vincolo-matriosca__column">
          <h4 className="vincolo-matriosca__column-title">Corrispondenze</h4>
          <div className="vincolo-matriosca__chips">
            {corrispondenze.length === 0 ? (
              <div className="vincolo-matriosca__chips-empty">
                Nessuna corrispondenza: aggiungi una tipologia dal box a sinistra
              </div>
            ) : corrispondenze.map(tipo => (
              <span key={tipo} className="vincolo-matriosca__chip">
                <span>{tipo}</span>
                <button
                  type="button"
                  className="vincolo-matriosca__chip-x"
                  onClick={() => remove(tipo)}
                  aria-label={`Rimuovi ${tipo} dalle corrispondenze`}
                >
                  <i className="fa-light fa-xmark" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </section>
      </div>

      <footer className="vincolo-matriosca__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>
          Annulla
        </button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => onSave(corrispondenze)}>
          Conferma
        </button>
      </footer>
    </Modal>
  )
}
