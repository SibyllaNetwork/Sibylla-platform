import React, { useState } from 'react'
import { CheckboxField } from '../../../../core/components/form'
import { CfgMultiSelect } from '../../../../core/cfg'
import { toast } from '../../../../core/components/Toast/useToast'
import './TargetAggregazioni.sass'

// ─── TARGET E AGGREGAZIONI (solo Tour Operator) ───────────────────────────────
//  Nella sezione Camere del contratto di vendita: per ogni categoria di target
//  (Adulti, Studenti) si sceglie se applicare l'aggregazione e, una volta
//  selezionata, accanto compare la multiselect delle AGGREGAZIONI disponibili,
//  con Salva per riga. Demo: aggregazioni già presenti e salvate su Adulti.

type TargetKey = 'adulti' | 'studenti'
const TARGETS: { key: TargetKey; label: string }[] = [
  { key: 'adulti',   label: 'Adulti' },
  { key: 'studenti', label: 'Studenti' },
]

// Demo: aggregazioni disponibili, scelte e salvate sulla riga Adulti
const AGGREGAZIONI = ['Comitive culturali', 'Famiglie estate']

interface TargetState { attivo: boolean; aggregazioni: string[] }

export default function TargetAggregazioni() {
  const [targets, setTargets] = useState<Record<TargetKey, TargetState>>({
    adulti:   { attivo: true,  aggregazioni: AGGREGAZIONI },
    studenti: { attivo: false, aggregazioni: [] },
  })
  // Aggregazioni salvate per target: «Salva» si attiva solo con modifiche da salvare
  const [salvate, setSalvate] = useState<Record<TargetKey, string[]>>({ adulti: AGGREGAZIONI, studenti: [] })
  const stessa = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))

  const update = (k: TargetKey, patch: Partial<TargetState>) =>
    setTargets(t => ({ ...t, [k]: { ...t[k], ...patch } }))

  const salva = (k: TargetKey, label: string) => {
    const scelte = targets[k].aggregazioni
    setSalvate(s => ({ ...s, [k]: scelte }))
    toast.success(`${label}: ${scelte.length} ${scelte.length === 1 ? 'aggregazione salvata' : 'aggregazioni salvate'}`)
  }

  return (
    <div className="target-agg">
      <div className="target-agg__head">
        <div>
          <h4 className="target-agg__title">Target e aggregazioni</h4>
          <p className="target-agg__desc">Scegli a quali categorie applicare le aggregazioni.</p>
        </div>
      </div>

      {TARGETS.map(({ key, label }) => {
        const t = targets[key]
        return (
          <div key={key} className={`target-agg__row ${t.attivo ? 'is-on' : ''}`}>
            <CheckboxField
              name={`target-${key}`}
              label={label}
              checked={t.attivo}
              onChange={(e) => update(key, { attivo: e.target.checked })}
              className="target-agg__check"
            />
            {t.attivo && (
              <CfgMultiSelect
                label="Aggregazioni"
                placeholder="Seleziona aggregazioni"
                nomePlurale="aggregazioni"
                options={AGGREGAZIONI}
                value={t.aggregazioni}
                onChange={(next) => update(key, { aggregazioni: next })}
                className="target-agg__multi"
              />
            )}
            {t.attivo && t.aggregazioni.length > 0 && (
              stessa(t.aggregazioni, salvate[key])
                ? <span className="target-agg__saved"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Salvata</span>
                : (
                  <button type="button" className="sib-btn sib-btn--primary target-agg__save" onClick={() => salva(key, label)}>
                    <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> Salva
                  </button>
                )
            )}
          </div>
        )
      })}
    </div>
  )
}
