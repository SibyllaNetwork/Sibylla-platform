import React, { useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import { SelectField, CheckboxField } from '../../../../core/components/form'
import { CfgMultiSelect } from '../../../../core/cfg'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { useStruttureCliente } from '../../../../hooks/useStrutturaCorrente'
import './TargetAggregazioni.sass'

// ─── TARGET E AGGREGAZIONI (solo Tour Operator) ───────────────────────────────
//  Nella sezione Camere del contratto di vendita: per ogni categoria di target
//  (Adulti, Studenti) si sceglie se applicare l'aggregazione e, una volta
//  selezionata, accanto compare la multiselect delle tipologie camere (più le
//  aggregazioni create). «Crea aggregazione», fuori dalle righe delle
//  categorie, apre una modale con Struttura, Categoria e Segmento: «Aggiungi»
//  mostra l'aggregazione in una tabellina sotto e la rende selezionabile nelle
//  multiselect di tutte le categorie.

type TargetKey = 'adulti' | 'studenti'
const TARGETS: { key: TargetKey; label: string }[] = [
  { key: 'adulti',   label: 'Adulti' },
  { key: 'studenti', label: 'Studenti' },
]

const CATEGORIE = ['Classic', 'Superior', 'Economy', 'Family', 'Suite']
const SEGMENTI = ['Gruppi', 'B2B']

interface Aggregazione { id: number; struttura: string; categoria: string; segmento: string }
const nomeAggregazione = (a: Aggregazione) => `${a.struttura} · ${a.categoria} · ${a.segmento}`

interface TargetState { attivo: boolean; tipologie: string[] }

export default function TargetAggregazioni({ tipologieCamere }: { tipologieCamere: string[] }) {
  const confirm = useConfirmStore(s => s.confirm)
  const strutture = useStruttureCliente().filter(s => s.camere > 0).map(s => s.nome)

  const [targets, setTargets] = useState<Record<TargetKey, TargetState>>({
    adulti:   { attivo: false, tipologie: [] },
    studenti: { attivo: false, tipologie: [] },
  })
  const [aggregazioni, setAggregazioni] = useState<Aggregazione[]>([])
  // Tipologie salvate per target: «Salva» si attiva solo con modifiche da salvare
  const [salvate, setSalvate] = useState<Record<TargetKey, string[]>>({ adulti: [], studenti: [] })
  const stessa = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))

  const salva = (k: TargetKey, label: string) => {
    const scelte = targets[k].tipologie
    setSalvate(s => ({ ...s, [k]: scelte }))
    toast.success(`Aggregazione ${label} salvata: ${scelte.length} ${scelte.length === 1 ? 'tipologia' : 'tipologie'}`)
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [struttura, setStruttura] = useState('')
  const [categoria, setCategoria] = useState('')
  const [segmento, setSegmento] = useState('')
  // Aggregazione in modifica nella modale (null = nuova)
  const [editId, setEditId] = useState<number | null>(null)

  const opzioni = [...tipologieCamere, ...aggregazioni.map(nomeAggregazione)]
  const update = (k: TargetKey, patch: Partial<TargetState>) =>
    setTargets(t => ({ ...t, [k]: { ...t[k], ...patch } }))

  const apriModale = () => {
    setStruttura(strutture[0] ?? ''); setCategoria(''); setSegmento(''); setEditId(null)
    setModalOpen(true)
  }

  const duplicata = aggregazioni.some(a => a.id !== editId && a.struttura === struttura && a.categoria === categoria && a.segmento === segmento)
  const valida = !!struttura && !!categoria && !!segmento && !duplicata

  // Rinomina un'aggregazione dentro le selezioni (correnti e salvate) dei target
  const rinomina = (da: string, a: string | null) => {
    const sost = (list: string[]) => a ? list.map(x => (x === da ? a : x)) : list.filter(x => x !== da)
    setTargets(t => ({
      adulti:   { ...t.adulti,   tipologie: sost(t.adulti.tipologie) },
      studenti: { ...t.studenti, tipologie: sost(t.studenti.tipologie) },
    }))
    setSalvate(s => ({ adulti: sost(s.adulti), studenti: sost(s.studenti) }))
  }

  const resetForm = () => { setStruttura(strutture[0] ?? ''); setCategoria(''); setSegmento(''); setEditId(null) }

  const aggiungi = () => {
    if (!valida) return
    if (editId != null) {
      const vecchia = aggregazioni.find(a => a.id === editId)!
      const nuova: Aggregazione = { ...vecchia, struttura, categoria, segmento }
      setAggregazioni(list => list.map(a => (a.id === editId ? nuova : a)))
      rinomina(nomeAggregazione(vecchia), nomeAggregazione(nuova))
      toast.success(`Aggregazione aggiornata: ${nomeAggregazione(nuova)}`)
    } else {
      const nuova: Aggregazione = { id: Date.now(), struttura, categoria, segmento }
      setAggregazioni(a => [...a, nuova])
      toast.success(`Aggregazione ${nomeAggregazione(nuova)} creata`)
    }
    resetForm()
  }

  const modifica = (a: Aggregazione) => {
    setEditId(a.id); setStruttura(a.struttura); setCategoria(a.categoria); setSegmento(a.segmento)
  }

  const elimina = async (a: Aggregazione) => {
    const ok = await confirm({
      title: 'Elimina aggregazione',
      message: `Eliminare l'aggregazione «${nomeAggregazione(a)}»? Verrà tolta anche dai target che la usano.`,
      confirmLabel: 'Elimina',
      cancelLabel: 'Annulla',
      danger: true,
    })
    if (!ok) return
    setAggregazioni(list => list.filter(x => x.id !== a.id))
    rinomina(nomeAggregazione(a), null)
    if (editId === a.id) resetForm()
  }

  return (
    <div className="target-agg">
      <div className="target-agg__head">
        <div>
          <h4 className="target-agg__title">Target e aggregazioni</h4>
          <p className="target-agg__desc">Scegli a quali categorie applicare l'aggregazione e con quali tipologie camere.</p>
        </div>
        <button type="button" className="target-agg__link" onClick={apriModale}>
          <i className="fa-solid fa-layer-plus" aria-hidden="true" /> Crea aggregazione
        </button>
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
                label="Tipologie camere"
                placeholder="Seleziona tipologie"
                nomePlurale="tipologie"
                options={opzioni}
                value={t.tipologie}
                onChange={(next) => update(key, { tipologie: next })}
                className="target-agg__multi"
              />
            )}
            {t.attivo && t.tipologie.length > 0 && (
              stessa(t.tipologie, salvate[key])
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Crea aggregazione"
        size="xl"
        className="target-agg-modal"
      >
        <p className="target-agg-modal__lead">
          Definisci l'aggregazione scegliendo struttura, categoria e segmento: sarà selezionabile nelle tipologie camere di Adulti e Studenti.
        </p>

        <div className="target-agg-modal__form">
          <SelectField name="agg-struttura" label="Struttura" value={struttura} placeholder="Seleziona struttura"
            onChange={(e) => setStruttura(e.target.value)}
            options={strutture.map(s => ({ value: s, label: s }))} />
          <SelectField name="agg-categoria" label="Categoria" value={categoria} placeholder="Seleziona categoria"
            onChange={(e) => setCategoria(e.target.value)}
            options={CATEGORIE.map(c => ({ value: c, label: c }))} />
          <SelectField name="agg-segmento" label="Segmento" value={segmento} placeholder="Seleziona segmento"
            onChange={(e) => setSegmento(e.target.value)}
            options={SEGMENTI.map(s => ({ value: s, label: s }))} />
          <div className="target-agg-modal__btns">
            {editId != null && (
              <button type="button" className="sib-btn sib-btn--secondary" onClick={resetForm}>Annulla modifica</button>
            )}
            <button type="button" className="sib-btn sib-btn--primary target-agg-modal__add" disabled={!valida} onClick={aggiungi}>
              <i className={`fa-solid ${editId != null ? 'fa-check' : 'fa-plus'}`} aria-hidden="true" /> {editId != null ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </div>
        {duplicata && <p className="target-agg-modal__warn">Questa aggregazione esiste già.</p>}

        <table className="sib-table target-agg-modal__tbl">
          <colgroup>
            <col /><col className="target-agg-modal__c-cat" /><col className="target-agg-modal__c-seg" /><col className="target-agg-modal__c-act" />
          </colgroup>
          <thead>
            <tr><th>Struttura</th><th>Categoria</th><th>Segmento</th><th className="target-agg-modal__center">Azioni</th></tr>
          </thead>
          <tbody>
            {aggregazioni.length === 0 ? (
              <tr><td colSpan={4} className="target-agg-modal__empty">Nessuna aggregazione creata.</td></tr>
            ) : aggregazioni.map(a => (
              <tr key={a.id} className={editId === a.id ? 'is-edit' : ''}>
                <td>{a.struttura}</td>
                <td>{a.categoria}</td>
                <td>{a.segmento}</td>
                <td className="target-agg-modal__center">
                  <Tooltip text="Modifica">
                    <button type="button" className="sib-btn sib-btn--icon target-agg-modal__act" onClick={() => modifica(a)} aria-label={`Modifica ${nomeAggregazione(a)}`}>
                      <i className="fa-solid fa-pen" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Elimina">
                    <button type="button" className="sib-btn sib-btn--icon target-agg-modal__act" onClick={() => elimina(a)} aria-label={`Elimina ${nomeAggregazione(a)}`}>
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="target-agg-modal__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>Chiudi</button>
        </div>
      </Modal>
    </div>
  )
}
