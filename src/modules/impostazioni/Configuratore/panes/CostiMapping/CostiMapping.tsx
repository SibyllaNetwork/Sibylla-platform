import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import Pagination from '../../../../../core/components/Pagination'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import './CostiMapping.sass'

// ─── COSTI MAPPING (§4.26 — PDF §1.28) ────────────────────────────────────────
//  Mappa le tipologie di costo dell'anno e ne imposta la ripartizione
//  variabile/fisso in percentuale (le due quote sono complementari: modificare
//  una aggiorna l'altra). "Copia costi anno" è stata rinominata "Copia centro
//  di costo" come da documento; le select degli anni includono anche gli anni
//  passati e MAI l'anno attuale (requisito esplicito del funzionale).

interface Costo {
  id: number
  nome: string
  variabile: number
  fisso: number
  validato: boolean
}

interface Data {
  /** costi[anno] — tipologie di costo configurate per quell'anno. */
  costi: Record<number, Costo[]>
}

const CURRENT_YEAR = new Date().getFullYear()

/** Anni selezionabili: passati e futuri, MAI l'anno attuale (requisito §4.26). */
const ANNI: number[] = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 4 + i)
  .filter(y => y !== CURRENT_YEAR)

const DEFAULT_ANNO = ANNI.find(y => y > CURRENT_YEAR) ?? ANNI[ANNI.length - 1]

const FALLBACK: Data = {
  costi: {
    [DEFAULT_ANNO]: [
      { id: 1, nome: 'Amministrativi',   variabile: 2,  fisso: 98, validato: true },
      { id: 2, nome: 'Ammortamenti',     variabile: 10, fisso: 90, validato: true },
      { id: 3, nome: 'Energia',          variabile: 30, fisso: 70, validato: true },
      { id: 4, nome: 'Food & Beverage',  variabile: 60, fisso: 40, validato: false },
      { id: 5, nome: 'Lavanderia',       variabile: 55, fisso: 45, validato: true },
      { id: 6, nome: 'Manutenzioni',     variabile: 25, fisso: 75, validato: false },
      { id: 7, nome: 'Marketing',        variabile: 40, fisso: 60, validato: true },
      { id: 8, nome: 'Room Division',    variabile: 15, fisso: 85, validato: true },
      { id: 9, nome: 'Utenze',           variabile: 35, fisso: 65, validato: false },
    ],
    [CURRENT_YEAR - 1]: [
      { id: 21, nome: 'Amministrativi',  variabile: 5,  fisso: 95, validato: true },
      { id: 22, nome: 'Energia',         variabile: 28, fisso: 72, validato: true },
      { id: 23, nome: 'Room Division',   variabile: 18, fisso: 82, validato: true },
    ],
  },
}

const PAGE_SIZE = 6

export default function CostiMapping() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saved, setSaved] = useState<Data>(FALLBACK)
  const [anno, setAnno] = useState<number>(DEFAULT_ANNO)
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Modale "Copia costi"
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyFrom, setCopyFrom] = useState<number | ''>('')
  const [copyTo, setCopyTo] = useState<number | ''>('')

  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)
  const confirm       = useConfirmStore(s => s.confirm)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetCostiMapping', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setData(d); setSaved(d) } })
      .catch(() => { /* fallback silenzioso */ })
    return () => { cancelled = true }
  }, [])

  const rows = data.costi[anno] ?? []
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Dirty: costi aggiunti/modificati/eliminati su tutti gli anni ────────────
  const dirty = useMemo(() => {
    let n = 0
    const anni = Array.from(new Set([...Object.keys(data.costi), ...Object.keys(saved.costi)].map(Number)))
    for (const y of anni) {
      const cur = data.costi[y] ?? []
      const old = saved.costi[y] ?? []
      const oldById = new Map(old.map(c => [c.id, c]))
      n += cur.filter(c => JSON.stringify(oldById.get(c.id)) !== JSON.stringify(c)).length
      n += old.filter(c => !cur.some(x => x.id === c.id)).length
    }
    return n
  }, [data, saved])

  useEffect(() => { markDirty('costi-mapping', dirty) }, [dirty, markDirty])

  const persist = () => new Promise<void>((resolve) => {
    setTimeout(() => {
      setSaved(data)
      const all = Object.values(data.costi).flat()
      setCompletion('costi-mapping', all.length === 0 ? 'empty' : all.every(c => c.validato) ? 'configured' : 'partial')
      resetDirty()
      setEditingId(null)
      resolve()
    }, 450)
  })

  const cancel = () => {
    setData(saved)
    setEditingId(null)
    resetDirty()
  }

  // ── Mutazioni ────────────────────────────────────────────────────────────────
  const patchCosto = (id: number, patch: Partial<Costo>) => {
    setData(d => ({
      ...d,
      costi: { ...d.costi, [anno]: (d.costi[anno] ?? []).map(c => c.id === id ? { ...c, ...patch } : c) },
    }))
  }

  // Le due quote sono complementari: modificare una aggiorna l'altra.
  const setQuota = (id: number, field: 'variabile' | 'fisso', raw: string) => {
    const v = Math.min(100, Math.max(0, Number(raw) || 0))
    patchCosto(id, field === 'variabile'
      ? { variabile: v, fisso: 100 - v, validato: false }
      : { fisso: v, variabile: 100 - v, validato: false })
  }

  const addCosto = () => {
    const id = Date.now()
    setData(d => ({
      ...d,
      costi: {
        ...d.costi,
        [anno]: [...(d.costi[anno] ?? []), { id, nome: '', variabile: 50, fisso: 50, validato: false }],
      },
    }))
    setEditingId(id)
    setPage(Math.max(1, Math.ceil((rows.length + 1) / PAGE_SIZE)))
  }

  const removeCosto = async (c: Costo) => {
    const ok = await confirm({
      title: 'Elimina tipologia di costo',
      message: `Eliminare la tipologia "${c.nome || 'senza nome'}" dall'anno ${anno}?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setData(d => ({ ...d, costi: { ...d.costi, [anno]: (d.costi[anno] ?? []).filter(x => x.id !== c.id) } }))
  }

  // ── Copia centro di costo ────────────────────────────────────────────────────
  const openCopy = () => {
    const past = ANNI.filter(y => (data.costi[y]?.length ?? 0) > 0)
    setCopyFrom(past[0] ?? '')
    setCopyTo('')
    setCopyOpen(true)
  }

  const swapCopy = () => {
    setCopyFrom(copyTo)
    setCopyTo(copyFrom)
  }

  const doCopy = async () => {
    if (copyFrom === '' || copyTo === '' || copyFrom === copyTo) return
    if ((data.costi[copyTo]?.length ?? 0) > 0) {
      const ok = await confirm({
        title: 'Sovrascrivi centro di costo',
        message: `L'anno ${copyTo} ha già delle tipologie di costo: la copia le sostituirà tutte.`,
        confirmLabel: 'Sovrascrivi',
        danger: true,
      })
      if (!ok) return
    }
    const source = data.costi[copyFrom] ?? []
    setData(d => ({
      ...d,
      costi: {
        ...d.costi,
        [copyTo]: source.map((c, i) => ({ ...c, id: Date.now() + i, validato: false })),
      },
    }))
    setCopyOpen(false)
    setAnno(copyTo)
    setPage(1)
    toast.success(`Centro di costo ${copyFrom} copiato sull'anno ${copyTo}`)
  }

  return (
    <div className="cfg-costi">
      <CfgToolbar
        actions={(
          <>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={openCopy}>
              <i className="fa-light fa-copy" aria-hidden="true" /> Copia centro di costo
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={addCosto}>
              <i className="fa-light fa-circle-plus" aria-hidden="true" /> Aggiungi costo
            </button>
          </>
        )}
      >
        <SelectField
          name="costi-anno"
          label="Anno"
          value={anno}
          onChange={(e) => { setAnno(Number(e.target.value)); setPage(1); setEditingId(null) }}
          options={ANNI.map(y => ({ value: y, label: String(y) }))}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome', label: 'Tipologia di costo', width: '26%' },
          { key: 'quote', label: 'Impostazione %', width: '54%' },
          { key: 'azioni', label: 'Azioni', width: '20%', align: 'right' },
        ]}
        empty={(
          <span className="cfg-table__empty-text">
            Nessuna tipologia di costo per il {anno}: aggiungine una o copia un centro di costo da un altro anno.
          </span>
        )}
      >
        {pageRows.map((c) => (
          <tr key={c.id}>
            <td>
              {editingId === c.id ? (
                <InputField
                  name={`nome-${c.id}`}
                  placeholder="Nome tipologia"
                  value={c.nome}
                  onChange={(e) => patchCosto(c.id, { nome: e.target.value })}
                  className="cfg-costi__nome-input"
                />
              ) : (
                <TruncatedText text={c.nome || '—'} className="cfg-costi__cell-text" />
              )}
            </td>
            <td>
              <div className="cfg-costi__quote">
                <span className="cfg-costi__quota-label">Variabile</span>
                <InputField
                  name={`var-${c.id}`}
                  type="number" min={0} max={100} step={1}
                  value={c.variabile}
                  onChange={(e) => setQuota(c.id, 'variabile', e.target.value)}
                  iconRight="fa-light fa-percent"
                  className="cfg-costi__quota-input"
                />
                <span className="cfg-costi__split" aria-hidden="true">
                  {/* --split: quota variabile della barra (custom property letta dal .sass) */}
                  <span className="cfg-costi__split-var" style={{ ['--split' as any]: `${c.variabile}%` }} />
                </span>
                <span className="cfg-costi__quota-label">Fisso</span>
                <InputField
                  name={`fix-${c.id}`}
                  type="number" min={0} max={100} step={1}
                  value={c.fisso}
                  onChange={(e) => setQuota(c.id, 'fisso', e.target.value)}
                  iconRight="fa-light fa-percent"
                  className="cfg-costi__quota-input"
                />
              </div>
            </td>
            <td className="cfg-costi__actions-cell">
              <Tooltip text={editingId === c.id ? 'Fine modifica' : 'Modifica nome tipologia'}>
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                  aria-label={`Modifica ${c.nome}`}
                >
                  <i className={`fa-solid ${editingId === c.id ? 'fa-check-to-slot' : 'fa-pen'}`} aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text="Elimina tipologia">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => { void removeCosto(c) }}
                  aria-label={`Elimina ${c.nome}`}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text={c.validato ? 'Costo convalidato' : 'Convalida la ripartizione'}>
                <button
                  type="button"
                  className={`sib-btn sib-btn--icon cfg-costi__validate${c.validato ? ' cfg-costi__validate--on' : ''}`}
                  onClick={() => patchCosto(c.id, { validato: !c.validato })}
                  aria-label={`${c.validato ? 'Rimuovi convalida da' : 'Convalida'} ${c.nome}`}
                >
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>

      {totalPages > 1 && (
        <div className="cfg-costi__pagination">
          <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <CfgSaveBar
        count={dirty}
        onSave={persist}
        onCancel={cancel}
        successMessage={`Costi ${anno} salvati`}
      />

      <Modal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        title="Copia costi"
        size="sm"
        className="cfg-costi-modal"
      >
        <p className="cfg-costi-modal__desc">
          Copia l'intero centro di costo di un anno su un altro: le tipologie copiate
          arrivano da riconvalidare.
        </p>
        <div className="cfg-costi-modal__row">
          <SelectField
            name="copy-from"
            label="Anno da copiare"
            placeholder="Seleziona"
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value === '' ? '' : Number(e.target.value))}
            options={ANNI.map(y => ({
              value: y,
              label: `${y}${(data.costi[y]?.length ?? 0) > 0 ? '' : ' (vuoto)'}`,
            }))}
          />
          <Tooltip text="Scambia gli anni">
            <button
              type="button"
              className="sib-btn sib-btn--icon cfg-costi-modal__swap"
              onClick={swapCopy}
              aria-label="Scambia anno di origine e destinazione"
            >
              <i className="fa-solid fa-right-left" aria-hidden="true" />
            </button>
          </Tooltip>
          <SelectField
            name="copy-to"
            label="Seleziona anno"
            placeholder="Seleziona"
            value={copyTo}
            onChange={(e) => setCopyTo(e.target.value === '' ? '' : Number(e.target.value))}
            options={ANNI.filter(y => y !== copyFrom).map(y => ({ value: y, label: String(y) }))}
          />
        </div>
        <div className="cfg-costi-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setCopyOpen(false)}>Annulla</button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            disabled={copyFrom === '' || copyTo === '' || copyFrom === copyTo || (data.costi[copyFrom]?.length ?? 0) === 0}
            onClick={() => { void doCopy() }}
          >
            Copia
          </button>
        </div>
      </Modal>
    </div>
  )
}
