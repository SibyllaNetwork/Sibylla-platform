import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, RadioGroup } from '../../../../../core/components/form'
import { CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Tooltip from '../../../../../core/components/Tooltip'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './MappingSegmentoMercato.sass'

// ─── MAPPING SEGMENTI (§4.2) ──────────────────────────────────────────────────
//  Conserva l'impianto a card + progress del pane originale, con le nuove
//  logiche del brief:
//   • PMS esterno → i segmenti del PMS si uniformano agli standard, ma in
//     Operation restano visualizzati col nome originale (avvertenza in pagina);
//   • PMS Sibylla → la lista non deriva da un sistema esterno: si crea con
//     «+ Nuovo segmento» (segmenti personalizzati con mapping agli standard);
//   • l'indicazione «Parametro associato» resta sulle righe mappate.

const PANE_ID = 'mapping-segmento-mercato'

type Origine = 'pms' | 'sibylla'

interface Sib { id: number; nome: string }
interface SegmentoRiga { id: number; nome: string; idSibylla: number | null }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  origine: Origine
  pmsNome: string
  segmentiSibylla: Sib[]
  segmentiHotel: SegmentoRiga[]
  segmentiCustom: SegmentoRiga[]
}

const SEGMENT_META: Record<string, { icon: string; tone: string; descr: string }> = {
  'Dirette':       { icon: 'globe',     tone: 'blue',   descr: 'Prenotazioni dirette dal sito o reception' },
  'Corporate':     { icon: 'briefcase', tone: 'slate',  descr: 'Aziende e contratti business'              },
  'B2C':           { icon: 'user',      tone: 'orange', descr: 'Online travel agency e portali'            },
  'Gruppi':        { icon: 'users',     tone: 'violet', descr: 'Tour operator e gruppi organizzati'        },
  'B2B':           { icon: 'handshake', tone: 'green',  descr: 'Tour operator e canali B2B'                },
  'Complementary': { icon: 'gift',      tone: 'pink',   descr: 'Servizi accessori e cortesie'              },
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  origine: 'pms',
  pmsNome: 'Opera Cloud',
  segmentiSibylla: [
    { id: 1, nome: 'Dirette'       },
    { id: 2, nome: 'Corporate'     },
    { id: 3, nome: 'B2C'           },
    { id: 4, nome: 'Gruppi'        },
    { id: 5, nome: 'B2B'           },
    { id: 6, nome: 'Complementary' },
  ],
  segmentiHotel: [
    { id: 1, nome: 'WEB',         idSibylla: 1    },
    { id: 2, nome: 'BOOKING',     idSibylla: 3    },
    { id: 3, nome: 'EXPEDIA',     idSibylla: 3    },
    { id: 4, nome: 'CORP',        idSibylla: 2    },
    { id: 5, nome: 'GRUPPI 2026', idSibylla: null },
    { id: 6, nome: 'OMAGGI',      idSibylla: null },
  ],
  segmentiCustom: [
    { id: 1, nome: 'Convenzioni locali', idSibylla: 2 },
    { id: 2, nome: 'Wedding',            idSibylla: 4 },
  ],
}

interface Snapshot {
  origine: Origine
  segmentiHotel: SegmentoRiga[]
  segmentiCustom: SegmentoRiga[]
}

function diffRows(a: SegmentoRiga[], b: SegmentoRiga[]): number {
  let n = Math.abs(a.length - b.length)
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i].nome !== b[i].nome || a[i].idSibylla !== b[i].idSibylla) n++
  }
  return n
}

function countChanges(saved: Snapshot, draft: Snapshot): number {
  return (saved.origine !== draft.origine ? 1 : 0)
    + diffRows(saved.segmentiHotel, draft.segmentiHotel)
    + diffRows(saved.segmentiCustom, draft.segmentiCustom)
}

export default function MappingSegmentoMercato() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [pmsNome, setPmsNome]                 = useState(FALLBACK.pmsNome)
  const [segmentiSibylla, setSegmentiSibylla] = useState<Sib[]>(FALLBACK.segmentiSibylla)

  const initialSnap: Snapshot = {
    origine: FALLBACK.origine,
    segmentiHotel: FALLBACK.segmentiHotel,
    segmentiCustom: FALLBACK.segmentiCustom,
  }
  const [saved, setSaved] = useState<Snapshot>(initialSnap)
  const [draft, setDraft] = useState<Snapshot>(initialSnap)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetSegmentiMapping', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.segmentiSibylla) || d.segmentiSibylla.length === 0) return
        setPmsNome(d.pmsNome ?? 'PMS esterno')
        setSegmentiSibylla(d.segmentiSibylla)
        const snap: Snapshot = {
          origine: d.origine === 'sibylla' ? 'sibylla' : 'pms',
          segmentiHotel: d.segmentiHotel ?? [],
          segmentiCustom: d.segmentiCustom ?? [],
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
  const rows      = isSibylla ? draft.segmentiCustom : draft.segmentiHotel
  const listKey   = isSibylla ? 'segmentiCustom' as const : 'segmentiHotel' as const

  const updateRow = (id: number, patch: Partial<SegmentoRiga>) =>
    setDraft(d => ({ ...d, [listKey]: d[listKey].map(r => r.id === id ? { ...r, ...patch } : r) }))

  const addSegmento = () =>
    setDraft(d => {
      const nextId = d.segmentiCustom.reduce((max, r) => Math.max(max, r.id), 0) + 1
      return { ...d, segmentiCustom: [...d.segmentiCustom, { id: nextId, nome: '', idSibylla: null }] }
    })

  const removeSegmento = async (row: SegmentoRiga) => {
    const ok = await confirm({
      title: 'Elimina segmento',
      message: `Eliminare il segmento personalizzato «${row.nome || 'senza nome'}»?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) setDraft(d => ({ ...d, segmentiCustom: d.segmentiCustom.filter(r => r.id !== row.id) }))
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetSegmentiMapping', { method: 'POST', body: draft })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[MappingSegmentoMercato] persistenza remota non disponibile:', err)
    }
    setSaved(draft)
    const allMapped = rows.length > 0 && rows.every(r => r.idSibylla != null)
    setCompletion(PANE_ID, allMapped ? 'configured' : 'partial')
    resetDirty()
  }

  const stats = useMemo(() => ({
    total:  rows.length,
    mapped: rows.filter(r => r.idSibylla != null).length,
  }), [rows])

  const sibyllaById = (id: number | null) => segmentiSibylla.find(s => s.id === id) ?? null
  const linkedCount = (sibId: number) => rows.filter(r => r.idSibylla === sibId).length

  return (
    <div className="mapping-segmento">
      <div className="mapping-segmento__intro">
        <div className="mapping-segmento__intro-icon">
          <i className="fa-light fa-diagram-project" aria-hidden="true" />
        </div>
        <div className="mapping-segmento__intro-text">
          <h3>Segmenti standard di Sibylla</h3>
          <p>
            Sei categorie con cui Sibylla classifica le prenotazioni. I segmenti commerciali
            della struttura si mappano verso questi standard.
          </p>
        </div>
        <RadioGroup
          name="origine-segmenti"
          label="Origine segmenti"
          className="mapping-segmento__origine"
          value={draft.origine}
          onChange={(val) => setDraft(d => ({ ...d, origine: val as Origine }))}
          options={[
            { value: 'pms',     label: `PMS esterno (${pmsNome})`, tooltip: 'I segmenti arrivano dal sistema di provenienza' },
            { value: 'sibylla', label: 'PMS Sibylla',              tooltip: 'La lista si crea qui con «+ Nuovo segmento»' },
          ]}
        />
      </div>

      <div className="mapping-segmento__cards">
        {segmentiSibylla.map((s) => {
          const meta = SEGMENT_META[s.nome] ?? { icon: 'tag', tone: 'slate', descr: '' }
          return (
            <div key={s.id} className={`mapping-segmento__card mapping-segmento__card--${meta.tone}`}>
              <div className="mapping-segmento__card-icon">
                <i className={`fa-light fa-${meta.icon}`} aria-hidden="true" />
              </div>
              <div className="mapping-segmento__card-body">
                <div className="mapping-segmento__card-name">{s.nome}</div>
                <div className="mapping-segmento__card-descr">{meta.descr}</div>
              </div>
              {linkedCount(s.id) > 0 && (
                <Tooltip text="Segmenti della struttura collegati" variant="dark">
                  <span className="mapping-segmento__card-badge">{linkedCount(s.id)}</span>
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>

      <div className="mapping-segmento__map-header">
        <h3>{isSibylla ? 'Segmenti personalizzati' : `Segmenti ${pmsNome}`}</h3>
        <div className="mapping-segmento__map-header-side">
          <div className="mapping-segmento__progress">
            <span className="mapping-segmento__progress-text">
              <strong>{stats.mapped}</strong> di {stats.total} associati
            </span>
            <div
              className="mapping-segmento__progress-bar"
              role="progressbar"
              aria-valuenow={stats.total === 0 ? 0 : Math.round((stats.mapped / stats.total) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              /* --fill: avanzamento del mapping (custom property dinamica letta
                 dal .sass — l'inline style diretto è vietato) */
              style={{ ['--fill' as any]: `${stats.total === 0 ? 0 : (stats.mapped / stats.total) * 100}%` }}
            >
              <span className="mapping-segmento__progress-bar-fill" />
            </div>
          </div>
          {isSibylla && (
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={addSegmento}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo segmento
            </button>
          )}
        </div>
      </div>

      {!isSibylla && (
        <p className="mapping-segmento__warning" role="note">
          <i className="fa-light fa-circle-info" aria-hidden="true" />
          I segmenti uniformati agli standard restano visualizzati in Operation con il nome
          originale del PMS, per continuità e riconoscibilità.
        </p>
      )}

      <CfgTable
        columns={[
          { key: 'segmento', label: isSibylla ? 'Segmento personalizzato' : 'Segmento PMS', width: '30%' },
          { key: 'arrow',    label: '',                 width: '6%',  align: 'center' },
          { key: 'sibylla',  label: 'Segmento Sibylla', width: '30%' },
          { key: 'stato',    label: 'Stato',            width: isSibylla ? '22%' : '34%' },
          ...(isSibylla ? [{ key: 'azioni', label: 'Azioni', width: '12%', align: 'right' as const }] : []),
        ]}
        empty={<span>Nessun segmento: {isSibylla ? 'creane uno con «+ Nuovo segmento»' : 'nessun segmento ricevuto dal PMS'}</span>}
      >
        {rows.map((r) => {
          const sib  = sibyllaById(r.idSibylla)
          const meta = sib ? SEGMENT_META[sib.nome] : null
          return (
            <tr key={r.id}>
              <td>
                {isSibylla ? (
                  <InputField
                    name={`segmento-${r.id}`}
                    value={r.nome}
                    placeholder="Nome segmento"
                    onChange={(e) => updateRow(r.id, { nome: e.target.value })}
                    className="mapping-segmento__nome-input"
                  />
                ) : (
                  <span className="mapping-segmento__td-name">{r.nome}</span>
                )}
              </td>
              <td className="mapping-segmento__td--arrow">
                <i className="fa-solid fa-arrow-right-long" aria-hidden="true" />
              </td>
              <td>
                <SelectField
                  name={`mapping-${r.id}`}
                  value={r.idSibylla ?? ''}
                  onChange={(e) => updateRow(r.id, { idSibylla: e.target.value ? Number(e.target.value) : null })}
                  options={[
                    { value: '', label: '— Non associato —' },
                    ...segmentiSibylla.map((s) => ({ value: s.id, label: s.nome })),
                  ]}
                  className="mapping-segmento__select"
                />
              </td>
              <td>
                {sib && meta ? (
                  <span className={`mapping-segmento__chip mapping-segmento__chip--${meta.tone}`}>
                    <i className="fa-light fa-check" aria-hidden="true" />
                    <span>Parametro associato</span>
                  </span>
                ) : (
                  <span className="mapping-segmento__chip mapping-segmento__chip--empty">
                    <i className="fa-light fa-circle-dashed" aria-hidden="true" />
                    <span>Da associare</span>
                  </span>
                )}
              </td>
              {isSibylla && (
                <td className="mapping-segmento__td--actions">
                  <Tooltip text="Elimina segmento" variant="dark">
                    <button
                      type="button"
                      className="sib-btn sib-btn--icon"
                      onClick={() => removeSegmento(r)}
                      aria-label={`Elimina il segmento ${r.nome || 'senza nome'}`}
                    >
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </td>
              )}
            </tr>
          )
        })}
      </CfgTable>

      <CfgSaveBar
        className="mapping-segmento__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setDraft(saved)}
        successMessage="Mapping segmenti salvato"
      />
    </div>
  )
}
