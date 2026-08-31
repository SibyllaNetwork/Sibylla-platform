import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, CheckboxField, ToggleSwitch } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './Arrangiamenti.sass'

// ─── ARRANGIAMENTI (§4.13) ────────────────────────────────────────────────────
//  Filtri Struttura + Segmento e due tabelle su CfgTable:
//   1. Trattamenti base con il valore economico: Room Only, Colazione,
//      Pranzo, Cena (come da brief);
//   2. Trattamenti composti: combinazione trattamento ↔ pasti associati.
//      Le mezze pensioni «diurna» (colazione+pranzo) e «serale»
//      (colazione+cena) sono già configurate e il «+» aggiunge nuove
//      combinazioni (prima la lista era fissa a 4 righe).
//  Al cambio dei pasti di un trattamento, costo e importo si ricalcolano
//  dalla somma dei pasti selezionati (restano poi modificabili a mano).
//  Componenti condivisi al posto di checkbox/select raw; Salva su CfgSaveBar.

const PANE_ID = 'arrangiamenti'

type Segmento = 'B2B' | 'B2C' | 'Gruppi' | 'Dirette'
type PastoKey = 'colazione' | 'pranzo' | 'cena'

interface Struttura { Id: number; nome: string }

interface Base {
  key: 'roomonly' | PastoKey
  label: string
  icon: string
  costo: number
  importo: number
}

interface Combo {
  id: number
  nome: string
  icon: string
  colazione: boolean
  pranzo: boolean
  cena: boolean
  costo: number
  importo: number
  attivo: boolean
  /** true = trattamento canonico (nome non editabile, non eliminabile). */
  fisso?: boolean
}

const PASTI: { key: PastoKey; label: string }[] = [
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo',    label: 'Pranzo'    },
  { key: 'cena',      label: 'Cena'      },
]

const FALLBACK_BASE: Base[] = [
  { key: 'roomonly',  label: 'Room Only', icon: 'bed',            costo: 0,  importo: 0  },
  { key: 'colazione', label: 'Colazione', icon: 'mug-hot',        costo: 5,  importo: 10 },
  { key: 'pranzo',    label: 'Pranzo',    icon: 'plate-utensils', costo: 10, importo: 25 },
  { key: 'cena',      label: 'Cena',      icon: 'utensils',       costo: 12, importo: 30 },
]

const FALLBACK_COMBOS: Combo[] = [
  { id: 1, nome: 'Bed and breakfast',      icon: 'mug-hot',   colazione: true, pranzo: false, cena: false, costo: 5,  importo: 10, attivo: true, fisso: true },
  { id: 2, nome: 'Mezza pensione diurna',  icon: 'sun',       colazione: true, pranzo: true,  cena: false, costo: 15, importo: 35, attivo: true, fisso: true },
  { id: 3, nome: 'Mezza pensione serale',  icon: 'moon',      colazione: true, pranzo: false, cena: true,  costo: 17, importo: 40, attivo: true, fisso: true },
  { id: 4, nome: 'Pensione completa',      icon: 'plate-utensils', colazione: true, pranzo: true, cena: true, costo: 27, importo: 65, attivo: true, fisso: true },
]

function countChanges(savedB: Base[], draftB: Base[], savedC: Combo[], draftC: Combo[]): number {
  let n = 0
  for (let i = 0; i < draftB.length; i++) {
    const a = savedB[i]
    const b = draftB[i]
    if (!a) { n++; continue }
    if (a.costo !== b.costo || a.importo !== b.importo) n++
  }
  n += Math.abs(savedC.length - draftC.length)
  const len = Math.min(savedC.length, draftC.length)
  for (let i = 0; i < len; i++) {
    const a = savedC[i]
    const b = draftC[i]
    if (
      a.nome !== b.nome || a.colazione !== b.colazione || a.pranzo !== b.pranzo
      || a.cena !== b.cena || a.costo !== b.costo || a.importo !== b.importo
      || a.attivo !== b.attivo
    ) n++
  }
  return n
}

export default function Arrangiamenti() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [segmento, setSegmento]       = useState<Segmento>('B2B')
  const [savedBase, setSavedBase]     = useState<Base[]>(FALLBACK_BASE)
  const [base, setBase]               = useState<Base[]>(FALLBACK_BASE)
  const [savedCombos, setSavedCombos] = useState<Combo[]>(FALLBACK_COMBOS)
  const [combos, setCombos]           = useState<Combo[]>(FALLBACK_COMBOS)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ Strutture: Struttura[]; StrutturaId: number | null }>(
      'configura/GetArrangiamenti', { method: 'POST', body: {} },
    )
      .then((d) => {
        if (cancelled || !d) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(
    () => countChanges(savedBase, base, savedCombos, combos),
    [savedBase, base, savedCombos, combos],
  )

  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const updateBase = (key: Base['key'], field: 'costo' | 'importo', v: number) => {
    setBase(base.map(b => (b.key === key ? { ...b, [field]: v } : b)))
  }

  const updateCombo = <K extends keyof Combo>(id: number, field: K, v: Combo[K]) => {
    setCombos(combos.map(c => (c.id === id ? { ...c, [field]: v } : c)))
  }

  /** Al cambio pasti, costo/importo ripartono dalla somma dei pasti selezionati. */
  const toggleMeal = (id: number, meal: PastoKey, checked: boolean) => {
    setCombos(combos.map(c => {
      if (c.id !== id) return c
      const next = { ...c, [meal]: checked }
      const sum = (field: 'costo' | 'importo') =>
        PASTI.reduce((tot, p) => tot + (next[p.key] ? (base.find(b => b.key === p.key)?.[field] ?? 0) : 0), 0)
      return { ...next, costo: sum('costo'), importo: sum('importo') }
    }))
  }

  const addCombo = (afterId?: number) => {
    const id = Math.max(0, ...combos.map(c => c.id)) + 1
    const created: Combo = {
      id, nome: '', icon: 'utensils',
      colazione: false, pranzo: false, cena: false,
      costo: 0, importo: 0, attivo: true,
    }
    const idx = afterId != null ? combos.findIndex(c => c.id === afterId) : combos.length - 1
    const next = [...combos]
    next.splice(idx + 1, 0, created)
    setCombos(next)
  }

  const removeCombo = async (id: number) => {
    const combo = combos.find(c => c.id === id)
    if (!combo) return
    const ok = await confirm({
      title: 'Elimina trattamento',
      message: `Eliminare il trattamento «${combo.nome || 'senza nome'}»?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) setCombos(combos.filter(c => c.id !== id))
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetArrangiamenti', {
        method: 'POST',
        body: { StrutturaId: strutturaId, Segmento: segmento, base, trattamenti: combos },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[Arrangiamenti] persistenza remota non disponibile:', err)
    }
    setSavedBase(base)
    setSavedCombos(combos)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  const euroField = (
    name: string, value: number,
    onChange: (v: number) => void,
    ariaLabel: string,
  ) => (
    <span className="arrangiamenti__num">
      <InputField
        name={name}
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <span className="arrangiamenti__unit" aria-label={ariaLabel}>€</span>
    </span>
  )

  return (
    <div className="arrangiamenti">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="arrangiamenti__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <SelectField
          name="segmento"
          label="Segmento"
          className="arrangiamenti__field"
          value={segmento}
          onChange={(e) => setSegmento(e.target.value as Segmento)}
          options={[
            { value: 'B2B',     label: 'B2B'     },
            { value: 'B2C',     label: 'B2C'     },
            { value: 'Gruppi',  label: 'Gruppi'  },
            { value: 'Dirette', label: 'Dirette' },
          ]}
        />
      </CfgToolbar>

      <section className="arrangiamenti__section">
        <h3 className="arrangiamenti__section-title">Trattamenti base</h3>
        <p className="arrangiamenti__section-hint">
          Il valore economico dei singoli pasti alimenta il calcolo dei trattamenti composti.
        </p>
        <CfgTable
          className="arrangiamenti__base"
          columns={[
            { key: 'trattamento', label: 'Trattamento',        width: '40%' },
            { key: 'costo',       label: 'Costo',              width: '30%' },
            { key: 'importo',     label: 'Importo di vendita', width: '30%' },
          ]}
        >
          {base.map((b) => (
            <tr key={b.key}>
              <td>
                <span className="arrangiamenti__name">
                  <i className={`fa-solid fa-${b.icon}`} aria-hidden="true" />
                  <span>{b.label}</span>
                </span>
              </td>
              <td>{euroField(`base-costo-${b.key}`, b.costo, (v) => updateBase(b.key, 'costo', v), `Costo ${b.label}`)}</td>
              <td>{euroField(`base-importo-${b.key}`, b.importo, (v) => updateBase(b.key, 'importo', v), `Importo ${b.label}`)}</td>
            </tr>
          ))}
        </CfgTable>
      </section>

      <section className="arrangiamenti__section">
        <h3 className="arrangiamenti__section-title">Trattamenti composti</h3>
        <p className="arrangiamenti__section-hint">
          Ogni trattamento è la combinazione dei pasti associati: il «+» aggiunge una nuova configurazione.
        </p>
        <CfgTable
          className="arrangiamenti__combos"
          columns={[
            { key: 'trattamento', label: 'Trattamento',        width: '24%' },
            { key: 'colazione',   label: 'Colazione',          width: '9%',  align: 'center' },
            { key: 'pranzo',      label: 'Pranzo',             width: '8%',  align: 'center' },
            { key: 'cena',        label: 'Cena',               width: '8%',  align: 'center' },
            { key: 'costo',       label: 'Costo',              width: '13%' },
            { key: 'importo',     label: 'Importo di vendita', width: '16%' },
            { key: 'attivo',      label: 'Attivo',             width: '10%', align: 'center' },
            { key: 'azioni',      label: 'Azioni',             width: '12%', align: 'right'  },
          ]}
        >
          {combos.map((c) => (
            <tr key={c.id}>
              <td>
                {c.fisso ? (
                  <span className="arrangiamenti__name">
                    <i className={`fa-solid fa-${c.icon}`} aria-hidden="true" />
                    <span>{c.nome}</span>
                  </span>
                ) : (
                  <InputField
                    name={`combo-nome-${c.id}`}
                    value={c.nome}
                    placeholder="Nome trattamento"
                    onChange={(e) => updateCombo(c.id, 'nome', e.target.value)}
                    className="arrangiamenti__nome-input"
                  />
                )}
              </td>
              {PASTI.map((p) => (
                <td key={p.key} className="arrangiamenti__td-center">
                  <CheckboxField
                    name={`combo-${c.id}-${p.key}`}
                    checked={c[p.key]}
                    onChange={(e) => toggleMeal(c.id, p.key, e.target.checked)}
                    className="arrangiamenti__check"
                  />
                </td>
              ))}
              <td>{euroField(`combo-costo-${c.id}`, c.costo, (v) => updateCombo(c.id, 'costo', v), `Costo ${c.nome}`)}</td>
              <td>{euroField(`combo-importo-${c.id}`, c.importo, (v) => updateCombo(c.id, 'importo', v), `Importo ${c.nome}`)}</td>
              <td className="arrangiamenti__td-center">
                <ToggleSwitch
                  checked={c.attivo}
                  onChange={(checked) => updateCombo(c.id, 'attivo', checked)}
                  className="arrangiamenti__toggle"
                />
              </td>
              <td className="arrangiamenti__td-actions">
                <Tooltip text="Aggiungi un trattamento sotto" variant="dark">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => addCombo(c.id)}
                    aria-label={`Aggiungi un trattamento dopo ${c.nome || 'questa riga'}`}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip text={c.fisso ? 'Trattamento standard: non eliminabile' : 'Elimina trattamento'} variant="dark">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => removeCombo(c.id)}
                    disabled={c.fisso}
                    aria-label={`Elimina ${c.nome || 'questa riga'}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      <CfgSaveBar
        className="arrangiamenti__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => { setBase(savedBase); setCombos(savedCombos) }}
        successMessage="Arrangiamenti salvati"
      />
    </div>
  )
}
