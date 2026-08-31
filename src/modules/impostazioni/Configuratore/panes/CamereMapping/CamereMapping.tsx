import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, RadioGroup } from '../../../../../core/components/form'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Tooltip from '../../../../../core/components/Tooltip'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './CamereMapping.sass'

// ─── MAPPING CAMERE (§4.1) ────────────────────────────────────────────────────
//  Da vista di sola lettura a mapping EDITABILE: ogni camera della struttura
//  viene ricondotta a uno standard Sibylla, con camera di riferimento (radio)
//  e stato del mapping a icona (spunta al posto della parola "Associato").
//  Due origini dell'anagrafica, rese evidenti in interfaccia:
//   • PMS esterno → i nomi camera arrivano dal sistema di provenienza
//     (sola lettura), associabili allo standard;
//   • PMS Sibylla → i nomi sono attribuiti dall'utente QUI (campo editabile):
//     da questo configuratore deriva il campo Nome di "Allestisci camera".

const PANE_ID = 'camere-mapping'

type Origine = 'pms' | 'sibylla'

interface Standard { id: number; nome: string }
interface RowCamera {
  id: number
  /** Nome camera: dal PMS di provenienza, oppure attribuito dall'utente. */
  nome: string
  standardId: number | null
}
interface Struttura { Id: number; nome: string }

interface Data {
  configured: boolean
  Strutture: Struttura[]
  StrutturaId: number | null
  origine: Origine
  /** Nome del PMS di provenienza (solo con origine 'pms'). */
  pmsNome: string
  standards: Standard[]
  rows: RowCamera[]
  riferimentoId: number | null
}

const FALLBACK: Data = {
  configured: true,
  Strutture: [],
  StrutturaId: null,
  origine: 'pms',
  pmsNome: 'Opera Cloud',
  standards: [
    { id: 1, nome: 'Camera singola' },
    { id: 2, nome: 'Camera doppia' },
    { id: 3, nome: 'Camera tripla' },
    { id: 4, nome: 'Camera quadrupla' },
    { id: 5, nome: 'Junior suite' },
    { id: 6, nome: 'Suite' },
  ],
  rows: [
    { id: 1, nome: 'DBL CLASSIC',    standardId: 2 },
    { id: 2, nome: 'DBL SUPERIOR',   standardId: 2 },
    { id: 3, nome: 'TWN GARDEN',     standardId: 2 },
    { id: 4, nome: 'SGL ECONOMY',    standardId: 1 },
    { id: 5, nome: 'TRP FAMILY',     standardId: null },
    { id: 6, nome: 'JSU PANORAMIC',  standardId: null },
  ],
  riferimentoId: 1,
}

interface Snapshot {
  origine: Origine
  rows: RowCamera[]
  riferimentoId: number | null
}

function countChanges(saved: Snapshot, draft: Snapshot): number {
  let n = 0
  if (saved.origine !== draft.origine) n++
  if (saved.riferimentoId !== draft.riferimentoId) n++
  n += Math.abs(saved.rows.length - draft.rows.length)
  const len = Math.min(saved.rows.length, draft.rows.length)
  for (let i = 0; i < len; i++) {
    if (saved.rows[i].nome !== draft.rows[i].nome
      || saved.rows[i].standardId !== draft.rows[i].standardId) n++
  }
  return n
}

export default function CamereMapping() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>(FALLBACK.Strutture)
  const [strutturaId, setStrutturaId] = useState<number | null>(FALLBACK.StrutturaId)
  const [pmsNome, setPmsNome]         = useState(FALLBACK.pmsNome)
  const [standards, setStandards]     = useState<Standard[]>(FALLBACK.standards)

  const initialSnap: Snapshot = {
    origine: FALLBACK.origine,
    rows: FALLBACK.rows,
    riferimentoId: FALLBACK.riferimentoId,
  }
  const [saved, setSaved] = useState<Snapshot>(initialSnap)
  const [draft, setDraft] = useState<Snapshot>(initialSnap)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetCamereMapping', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.rows) || d.rows.length === 0) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        setPmsNome(d.pmsNome ?? 'PMS esterno')
        if (Array.isArray(d.standards) && d.standards.length > 0) setStandards(d.standards)
        const snap: Snapshot = {
          origine: d.origine === 'sibylla' ? 'sibylla' : 'pms',
          rows: d.rows,
          riferimentoId: d.riferimentoId ?? null,
        }
        setSaved(snap)
        setDraft(snap)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, draft), [saved, draft])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const isSibylla = draft.origine === 'sibylla'

  const updateRow = (id: number, patch: Partial<RowCamera>) =>
    setDraft(d => ({ ...d, rows: d.rows.map(r => r.id === id ? { ...r, ...patch } : r) }))

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetCamereMapping', {
        method: 'POST',
        body: { StrutturaId: strutturaId, ...draft },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[CamereMapping] persistenza remota non disponibile:', err)
    }
    setSaved(draft)
    setCompletion(PANE_ID, draft.rows.every(r => r.standardId != null) ? 'configured' : 'partial')
    resetDirty()
  }

  const mappedCount = draft.rows.filter(r => r.standardId != null).length

  return (
    <div className="camere-mapping">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="camere-mapping__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <RadioGroup
          name="origine-camere"
          label="Origine anagrafica camere"
          value={draft.origine}
          onChange={(val) => setDraft(d => ({ ...d, origine: val as Origine }))}
          options={[
            { value: 'pms',     label: `PMS esterno (${pmsNome})`, tooltip: 'I nomi delle tipologie arrivano dal sistema di provenienza' },
            { value: 'sibylla', label: 'PMS Sibylla',              tooltip: "I nomi delle tipologie sono attribuiti dall'utente in questo configuratore" },
          ]}
        />
      </CfgToolbar>

      {/* Origine resa evidente: banner descrittivo del caso corrente */}
      <div className="camere-mapping__source" role="note">
        <span className="camere-mapping__source-icon" aria-hidden="true">
          <i className={`fa-light ${isSibylla ? 'fa-pen-to-square' : 'fa-plug'}`} />
        </span>
        <div className="camere-mapping__source-text">
          {isSibylla ? (
            <>
              <strong>PMS Sibylla</strong> — i nomi delle camere sono attribuiti qui
              dall&rsquo;utente e associati allo standard Sibylla. In &laquo;Inventario camere &rsaquo;
              Allestisci camera&raquo; il campo Nome deriva da questo configuratore (sola lettura).
            </>
          ) : (
            <>
              <strong>PMS esterno &middot; {pmsNome}</strong> — le tipologie mostrano i nomi
              definiti nel sistema di provenienza: da qui puoi associarle allo standard Sibylla.
            </>
          )}
        </div>
        <span className="camere-mapping__source-progress">
          {mappedCount} di {draft.rows.length} associate
        </span>
      </div>

      <CfgTable
        columns={[
          { key: 'camera',      label: 'Camera hotel',          width: '32%' },
          { key: 'standard',    label: 'Standard Sibylla',      width: '30%' },
          { key: 'riferimento', label: 'Camera di riferimento', width: '22%', align: 'center' },
          { key: 'mapping',     label: 'Mapping',               width: '16%', align: 'center' },
        ]}
      >
        {draft.rows.map((r) => {
          const mapped = r.standardId != null
          return (
            <tr key={r.id}>
              <td>
                {isSibylla ? (
                  <InputField
                    name={`nome-camera-${r.id}`}
                    value={r.nome}
                    onChange={(e) => updateRow(r.id, { nome: e.target.value })}
                    className="camere-mapping__nome-input"
                  />
                ) : (
                  <span className="camere-mapping__nome">
                    {r.nome}
                    <Tooltip text={`Nome definito in ${pmsNome}`} variant="dark">
                      <span className="camere-mapping__pms-tag">{pmsNome}</span>
                    </Tooltip>
                  </span>
                )}
              </td>
              <td>
                <SelectField
                  name={`standard-${r.id}`}
                  value={r.standardId ?? ''}
                  onChange={(e) => updateRow(r.id, { standardId: e.target.value ? Number(e.target.value) : null })}
                  options={[
                    { value: '', label: '— Da associare —' },
                    ...standards.map(s => ({ value: s.id, label: s.nome })),
                  ]}
                  className="camere-mapping__standard-select"
                />
              </td>
              <td className="camere-mapping__td--center">
                <input
                  type="radio"
                  name="camera-riferimento"
                  className="sib-radio"
                  checked={draft.riferimentoId === r.id}
                  onChange={() => setDraft(d => ({ ...d, riferimentoId: r.id }))}
                  aria-label={`Imposta ${r.nome} come camera di riferimento`}
                />
              </td>
              <td className="camere-mapping__td--center">
                {mapped ? (
                  <Tooltip text="Associata allo standard Sibylla" variant="dark">
                    <i className="fa-solid fa-circle-check camere-mapping__check" aria-hidden="true" />
                  </Tooltip>
                ) : (
                  <Tooltip text="Non ancora associata a uno standard" variant="dark">
                    <i className="fa-solid fa-circle-minus camere-mapping__pending" aria-hidden="true" />
                  </Tooltip>
                )}
              </td>
            </tr>
          )
        })}
      </CfgTable>

      <p className="camere-mapping__note">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        La camera di riferimento guida i calcoli tariffari della struttura; i nomi definiti
        qui alimentano l&rsquo;Inventario camere.
      </p>

      <CfgSaveBar
        className="camere-mapping__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setDraft(saved)}
        successMessage="Mapping camere salvato"
      />
    </div>
  )
}
