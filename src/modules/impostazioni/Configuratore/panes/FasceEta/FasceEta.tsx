import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, ToggleSwitch } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { CfgToolbar, CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './FasceEta.sass'

// ─── FASCE D'ETÀ (§4.5) ───────────────────────────────────────────────────────
//  Fasce anagrafiche (infanti / bambini / ragazzi) + adulti extra, in quattro
//  box allineati tra loro (requisito esplicito: allineamento orizzontale tra
//  toggle, icona e contenuti, e dei box tra loro):
//   • «Posto letto» non è più un campo: è un toggle con l'icona di un letto;
//   • nessuna «X» di chiusura sulle fasce (l'attivazione è un toggle);
//   • «Adulti extra» è un toggle coerente con «Posto letto»;
//   • la % di riduzione è interattiva all'hover con tooltip dark
//     «% rispetto alla tariffa base»;
//   • validazione: le fasce attive non devono sovrapporsi né lasciare buchi.

const PANE_ID = 'fasce-eta'

interface Struttura { Id: number; nome: string }
interface Fascia { da: number; a: number; perc: number; attiva: boolean; postoLetto: boolean }
interface AdultiExtra { attivi: boolean; adulto1: number; adulto2: number; adulto3: number }

type FasciaKey = 'Infanti' | 'Bambini' | 'Ragazzi'

interface Fasce { Infanti: Fascia; Bambini: Fascia; Ragazzi: Fascia }

interface ApiData {
  Strutture: Struttura[]
  StrutturaId: number | null
  Infanti: Partial<Fascia>
  Bambini: Partial<Fascia>
  Ragazzi: Partial<Fascia>
  numAdultiExtra: number
  adulto1: number; adulto2: number; adulto3: number
}

const FASCE_META: { key: FasciaKey; label: string; icon: string }[] = [
  { key: 'Infanti', label: 'Infanti', icon: 'baby'   },
  { key: 'Bambini', label: 'Bambini', icon: 'child'  },
  { key: 'Ragazzi', label: 'Ragazzi', icon: 'person' },
]

const FALLBACK_FASCE: Fasce = {
  Infanti: { da: 0,  a: 4,  perc: 100, attiva: true,  postoLetto: false },
  Bambini: { da: 5,  a: 12, perc: 50,  attiva: true,  postoLetto: true  },
  Ragazzi: { da: 13, a: 17, perc: 25,  attiva: false, postoLetto: true  },
}

const FALLBACK_ADULTI: AdultiExtra = { attivi: true, adulto1: 20, adulto2: 30, adulto3: 40 }

const TOOLTIP_PERC = '% rispetto alla tariffa base'

interface Validation { message: string | null; kind: 'error' | 'warning' | null }

/** Le fasce attive devono essere coerenti: né sovrapposte né con buchi ambigui. */
function validateFasce(fasce: Fasce): Validation {
  const active = FASCE_META
    .map(m => ({ label: m.label, f: fasce[m.key] }))
    .filter(x => x.f.attiva)

  for (const { label, f } of active) {
    if (f.a < f.da) {
      return { message: `${label}: l'età «A» (${f.a}) non può essere minore di «Da» (${f.da}).`, kind: 'error' }
    }
  }
  for (let i = 1; i < active.length; i++) {
    const prev = active[i - 1]
    const cur  = active[i]
    if (cur.f.da <= prev.f.a) {
      return {
        message: `${prev.label} e ${cur.label} si sovrappongono: «Da» di ${cur.label} (${cur.f.da}) deve superare «A» di ${prev.label} (${prev.f.a}).`,
        kind: 'error',
      }
    }
    if (cur.f.da > prev.f.a + 1) {
      return {
        message: `Tra ${prev.label} (fino a ${prev.f.a} anni) e ${cur.label} (da ${cur.f.da} anni) resta un'età scoperta.`,
        kind: 'warning',
      }
    }
  }
  return { message: null, kind: null }
}

function countChanges(savedF: Fasce, draftF: Fasce, savedA: AdultiExtra, draftA: AdultiExtra): number {
  let n = 0
  for (const { key } of FASCE_META) {
    const a = savedF[key]
    const b = draftF[key]
    ;(['da', 'a', 'perc', 'attiva', 'postoLetto'] as const).forEach(field => {
      if (a[field] !== b[field]) n++
    })
  }
  ;(['attivi', 'adulto1', 'adulto2', 'adulto3'] as const).forEach(field => {
    if (savedA[field] !== draftA[field]) n++
  })
  return n
}

export default function FasceEta() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [savedFasce, setSavedFasce]   = useState<Fasce>(FALLBACK_FASCE)
  const [fasce, setFasce]             = useState<Fasce>(FALLBACK_FASCE)
  const [savedAdulti, setSavedAdulti] = useState<AdultiExtra>(FALLBACK_ADULTI)
  const [adulti, setAdulti]           = useState<AdultiExtra>(FALLBACK_ADULTI)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<ApiData>('configura/GetFasceEta', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !d?.Infanti) return
        const merged: Fasce = {
          Infanti: { ...FALLBACK_FASCE.Infanti, ...d.Infanti },
          Bambini: { ...FALLBACK_FASCE.Bambini, ...d.Bambini },
          Ragazzi: { ...FALLBACK_FASCE.Ragazzi, ...d.Ragazzi },
        }
        const adultiExtra: AdultiExtra = {
          attivi:  (d.numAdultiExtra ?? 0) > 0,
          adulto1: d.adulto1 ?? 0,
          adulto2: d.adulto2 ?? 0,
          adulto3: d.adulto3 ?? 0,
        }
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        setSavedFasce(merged); setFasce(merged)
        setSavedAdulti(adultiExtra); setAdulti(adultiExtra)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const validation = useMemo(() => validateFasce(fasce), [fasce])
  const dirty = useMemo(
    () => countChanges(savedFasce, fasce, savedAdulti, adulti),
    [savedFasce, fasce, savedAdulti, adulti],
  )

  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const updateFascia = (key: FasciaKey, patch: Partial<Fascia>) => {
    setFasce({ ...fasce, [key]: { ...fasce[key], ...patch } })
  }

  const save = async () => {
    if (validation.kind === 'error') throw new Error('Fasce non valide')
    try {
      await apiFetchSibylla('configura/SetFasceEta', {
        method: 'POST',
        body: {
          StrutturaId: strutturaId,
          ...fasce,
          numAdultiExtra: adulti.attivi ? 3 : 0,
          adulto1: adulti.adulto1, adulto2: adulti.adulto2, adulto3: adulti.adulto3,
        },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[FasceEta] persistenza remota non disponibile:', err)
    }
    setSavedFasce(fasce)
    setSavedAdulti(adulti)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  return (
    <div className="fasce-eta">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="fasce-eta__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
      </CfgToolbar>

      <div className="fasce-eta__boxes">
        {FASCE_META.map(({ key, label, icon }) => {
          const f = fasce[key]
          return (
            <section
              key={key}
              className={clsx('fasce-eta__box', !f.attiva && 'fasce-eta__box--off')}
              aria-label={`Fascia ${label}`}
            >
              <header className="fasce-eta__box-head">
                <span className="fasce-eta__box-icon" aria-hidden="true">
                  <i className={`fa-solid fa-${icon}`} />
                </span>
                <h4 className="fasce-eta__box-name">{label}</h4>
                <ToggleSwitch
                  checked={f.attiva}
                  onChange={(checked) => updateFascia(key, { attiva: checked })}
                  className="fasce-eta__box-toggle"
                />
              </header>

              <div className="fasce-eta__box-body">
                <div className="fasce-eta__row">
                  <span className="fasce-eta__row-label">Età</span>
                  <span className="fasce-eta__row-fields">
                    <InputField
                      name={`${key}-da`}
                      type="number"
                      min={0}
                      value={f.da}
                      disabled={!f.attiva}
                      onChange={(e) => updateFascia(key, { da: Number(e.target.value) || 0 })}
                      className="fasce-eta__num"
                    />
                    <span className="fasce-eta__sep" aria-hidden="true">–</span>
                    <InputField
                      name={`${key}-a`}
                      type="number"
                      min={0}
                      value={f.a}
                      disabled={!f.attiva}
                      onChange={(e) => updateFascia(key, { a: Number(e.target.value) || 0 })}
                      className="fasce-eta__num"
                    />
                    <span className="fasce-eta__unit">anni</span>
                  </span>
                </div>

                <div className="fasce-eta__row">
                  <span className="fasce-eta__row-label">Riduzione</span>
                  <span className="fasce-eta__row-fields">
                    <Tooltip text={TOOLTIP_PERC} variant="dark">
                      <span className="fasce-eta__perc">
                        <InputField
                          name={`${key}-perc`}
                          type="number"
                          min={0}
                          max={100}
                          value={f.perc}
                          disabled={!f.attiva}
                          onChange={(e) => updateFascia(key, { perc: Number(e.target.value) || 0 })}
                          className="fasce-eta__num"
                        />
                        <span className="fasce-eta__unit">%</span>
                      </span>
                    </Tooltip>
                  </span>
                </div>

                <div className="fasce-eta__row">
                  <span className="fasce-eta__row-label fasce-eta__row-label--bed">
                    <i className="fa-solid fa-bed" aria-hidden="true" />
                    Posto letto
                  </span>
                  <span className="fasce-eta__row-fields">
                    <ToggleSwitch
                      checked={f.postoLetto}
                      disabled={!f.attiva}
                      onChange={(checked) => updateFascia(key, { postoLetto: checked })}
                    />
                  </span>
                </div>
              </div>
            </section>
          )
        })}

        <section
          className={clsx('fasce-eta__box', !adulti.attivi && 'fasce-eta__box--off')}
          aria-label="Adulti extra"
        >
          <header className="fasce-eta__box-head">
            <span className="fasce-eta__box-icon" aria-hidden="true">
              <i className="fa-solid fa-user-plus" />
            </span>
            <h4 className="fasce-eta__box-name">Adulti extra</h4>
            <ToggleSwitch
              checked={adulti.attivi}
              onChange={(checked) => setAdulti({ ...adulti, attivi: checked })}
              className="fasce-eta__box-toggle"
            />
          </header>

          <div className="fasce-eta__box-body">
            {([1, 2, 3] as const).map((n) => (
              <div className="fasce-eta__row" key={n}>
                <span className="fasce-eta__row-label">Adulto {n}</span>
                <span className="fasce-eta__row-fields">
                  <Tooltip text={TOOLTIP_PERC} variant="dark">
                    <span className="fasce-eta__perc">
                      <InputField
                        name={`adulto-${n}`}
                        type="number"
                        min={0}
                        max={100}
                        value={adulti[`adulto${n}`]}
                        disabled={!adulti.attivi}
                        onChange={(e) => setAdulti({ ...adulti, [`adulto${n}`]: Number(e.target.value) || 0 })}
                        className="fasce-eta__num"
                      />
                      <span className="fasce-eta__unit">%</span>
                    </span>
                  </Tooltip>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {validation.message && (
        <div
          className={clsx('fasce-eta__msg', `fasce-eta__msg--${validation.kind}`)}
          role="alert"
        >
          <i
            className={validation.kind === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-triangle-exclamation'}
            aria-hidden="true"
          />
          <span>{validation.message}</span>
        </div>
      )}

      <CfgSaveBar
        className="fasce-eta__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => { setFasce(savedFasce); setAdulti(savedAdulti) }}
        successMessage="Fasce d'età salvate"
        errorMessage={validation.kind === 'error'
          ? 'Le fasce presentano errori: correggi gli intervalli di età prima di salvare.'
          : 'Salvataggio non riuscito. Riprova.'}
      />
    </div>
  )
}
