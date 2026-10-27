import React, { useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import { SelectField, CheckboxField, InputField, RadioGroup } from '../../../../core/components/form'
import TruncatedText from '../../../../core/components/TruncatedText'
import { CfgMultiSelect } from '../../../../core/cfg'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { useStruttureCliente } from '../../../../hooks/useStrutturaCorrente'
import './TargetAggregazioni.sass'

// ─── TARGET E AGGREGAZIONI (solo Tour Operator) ───────────────────────────────
//  Nella sezione Camere del contratto di vendita: per ogni categoria di target
//  (Adulti, Studenti) si sceglie se applicare l'aggregazione e, una volta
//  selezionata, accanto compare la multiselect delle AGGREGAZIONI create (se
//  non ce ne sono, l'invito a usare «Crea aggregazione»), con Salva per riga.
//  «Crea aggregazione», fuori dalle righe, apre una modale: Nome, aggregazione
//  per Struttura OPPURE per Categoria (si sceglie quale e compare la relativa
//  select) e Segmento. «Aggiungi» la mostra in una tabellina sotto, con
//  Modifica ed Elimina, e la rende selezionabile in Adulti e Studenti.

type TargetKey = 'adulti' | 'studenti'
const TARGETS: { key: TargetKey; label: string }[] = [
  { key: 'adulti',   label: 'Adulti' },
  { key: 'studenti', label: 'Studenti' },
]

const CATEGORIE = ['Classic', 'Superior', 'Economy', 'Family', 'Suite']
const SEGMENTI = ['Gruppi', 'B2B']

type Base = 'struttura' | 'categoria'
const BASI: { value: Base; label: string }[] = [
  { value: 'struttura', label: 'Struttura' },
  { value: 'categoria', label: 'Categoria' },
]

interface Aggregazione { id: number; nome: string; base: Base; valore: string; segmento: string }

interface TargetState { attivo: boolean; aggregazioni: string[] }

export default function TargetAggregazioni() {
  const confirm = useConfirmStore(s => s.confirm)
  const strutture = useStruttureCliente().filter(s => s.camere > 0).map(s => s.nome)

  const [targets, setTargets] = useState<Record<TargetKey, TargetState>>({
    adulti:   { attivo: false, aggregazioni: [] },
    studenti: { attivo: false, aggregazioni: [] },
  })
  const [aggregazioni, setAggregazioni] = useState<Aggregazione[]>([])
  // Aggregazioni salvate per target: «Salva» si attiva solo con modifiche da salvare
  const [salvate, setSalvate] = useState<Record<TargetKey, string[]>>({ adulti: [], studenti: [] })
  const stessa = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))

  const salva = (k: TargetKey, label: string) => {
    const scelte = targets[k].aggregazioni
    setSalvate(s => ({ ...s, [k]: scelte }))
    toast.success(`${label}: ${scelte.length} ${scelte.length === 1 ? 'aggregazione salvata' : 'aggregazioni salvate'}`)
  }

  // Form della modale
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [base, setBase] = useState<Base>('struttura')
  const [valore, setValore] = useState('')
  const [segmento, setSegmento] = useState('')
  // Aggregazione in modifica nella modale (null = nuova)
  const [editId, setEditId] = useState<number | null>(null)

  const opzioni = aggregazioni.map(a => a.nome)
  const update = (k: TargetKey, patch: Partial<TargetState>) =>
    setTargets(t => ({ ...t, [k]: { ...t[k], ...patch } }))

  const resetForm = () => { setNome(''); setBase('struttura'); setValore(''); setSegmento(''); setEditId(null) }
  const apriModale = () => { resetForm(); setModalOpen(true) }

  const nomeUsato = aggregazioni.some(a => a.id !== editId && a.nome.trim().toLowerCase() === nome.trim().toLowerCase())
  const valida = nome.trim() !== '' && !nomeUsato && !!valore && !!segmento

  // Rinomina (o toglie, con null) un'aggregazione nelle selezioni dei target
  const rinomina = (da: string, a: string | null) => {
    const sost = (list: string[]) => a ? list.map(x => (x === da ? a : x)) : list.filter(x => x !== da)
    setTargets(t => ({
      adulti:   { ...t.adulti,   aggregazioni: sost(t.adulti.aggregazioni) },
      studenti: { ...t.studenti, aggregazioni: sost(t.studenti.aggregazioni) },
    }))
    setSalvate(s => ({ adulti: sost(s.adulti), studenti: sost(s.studenti) }))
  }

  const aggiungi = () => {
    if (!valida) return
    const dati = { nome: nome.trim(), base, valore, segmento }
    if (editId != null) {
      const vecchia = aggregazioni.find(a => a.id === editId)!
      setAggregazioni(list => list.map(a => (a.id === editId ? { ...a, ...dati } : a)))
      if (vecchia.nome !== dati.nome) rinomina(vecchia.nome, dati.nome)
      toast.success(`Aggregazione «${dati.nome}» aggiornata`)
    } else {
      setAggregazioni(list => [...list, { id: Date.now(), ...dati }])
      toast.success(`Aggregazione «${dati.nome}» creata`)
    }
    resetForm()
  }

  const modifica = (a: Aggregazione) => {
    setEditId(a.id); setNome(a.nome); setBase(a.base); setValore(a.valore); setSegmento(a.segmento)
  }

  const elimina = async (a: Aggregazione) => {
    const ok = await confirm({
      title: 'Elimina aggregazione',
      message: `Eliminare l'aggregazione «${a.nome}»? Verrà tolta anche da Adulti e Studenti.`,
      confirmLabel: 'Elimina',
      cancelLabel: 'Annulla',
      danger: true,
    })
    if (!ok) return
    setAggregazioni(list => list.filter(x => x.id !== a.id))
    rinomina(a.nome, null)
    if (editId === a.id) resetForm()
  }

  return (
    <div className="target-agg">
      <div className="target-agg__head">
        <div>
          <h4 className="target-agg__title">Target e aggregazioni</h4>
          <p className="target-agg__desc">Scegli a quali categorie applicare le aggregazioni create.</p>
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
            {t.attivo && opzioni.length === 0 && (
              <span className="target-agg__hint">
                <i className="fa-solid fa-circle-info" aria-hidden="true" /> Clicca sul pulsante «Crea aggregazione»
              </span>
            )}
            {t.attivo && opzioni.length > 0 && (
              <CfgMultiSelect
                label="Aggregazioni"
                placeholder="Seleziona aggregazioni"
                nomePlurale="aggregazioni"
                options={opzioni}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Crea aggregazione"
        size="xl"
        className="target-agg-modal"
      >
        <p className="target-agg-modal__lead">
          Dai un nome all'aggregazione e scegli se aggregare per struttura o per categoria: sarà selezionabile nelle righe Adulti e Studenti.
        </p>

        <div className="target-agg-modal__form">
          <InputField name="agg-nome" label="Nome" placeholder="Es. Gruppi scuole primavera" required
            value={nome} onChange={(e) => setNome(e.target.value)}
            error={nomeUsato ? 'Nome già usato' : undefined}
            className="target-agg-modal__nome" />
          <RadioGroup name="agg-base" label="Aggrega per" value={base}
            onChange={(v) => { setBase(v as Base); setValore('') }}
            options={BASI} />
          {base === 'struttura' ? (
            <SelectField name="agg-struttura" label="Struttura" value={valore} placeholder="Seleziona struttura"
              onChange={(e) => setValore(e.target.value)}
              options={strutture.map(x => ({ value: x, label: x }))} />
          ) : (
            <SelectField name="agg-categoria" label="Categoria" value={valore} placeholder="Seleziona categoria"
              onChange={(e) => setValore(e.target.value)}
              options={CATEGORIE.map(c => ({ value: c, label: c }))} />
          )}
          <SelectField name="agg-segmento" label="Segmento" value={segmento} placeholder="Seleziona segmento"
            onChange={(e) => setSegmento(e.target.value)}
            options={SEGMENTI.map(x => ({ value: x, label: x }))} />
          <div className="target-agg-modal__btns">
            {editId != null && (
              <button type="button" className="sib-btn sib-btn--secondary" onClick={resetForm}>Annulla modifica</button>
            )}
            <button type="button" className="sib-btn sib-btn--primary target-agg-modal__add" disabled={!valida} onClick={aggiungi}>
              <i className={`fa-solid ${editId != null ? 'fa-check' : 'fa-plus'}`} aria-hidden="true" /> {editId != null ? 'Aggiorna' : 'Aggiungi'}
            </button>
          </div>
        </div>

        <table className="sib-table target-agg-modal__tbl">
          <colgroup>
            <col className="target-agg-modal__c-nome" /><col /><col className="target-agg-modal__c-seg" /><col className="target-agg-modal__c-act" />
          </colgroup>
          <thead>
            <tr><th>Nome</th><th>Aggregata per</th><th>Segmento</th><th className="target-agg-modal__center">Azioni</th></tr>
          </thead>
          <tbody>
            {aggregazioni.length === 0 ? (
              <tr><td colSpan={4} className="target-agg-modal__empty">Nessuna aggregazione creata.</td></tr>
            ) : aggregazioni.map(a => (
              <tr key={a.id} className={editId === a.id ? 'is-edit' : ''}>
                <td><TruncatedText text={a.nome} className="target-agg-modal__cell" /></td>
                <td><TruncatedText text={`${a.base === 'struttura' ? 'Struttura' : 'Categoria'}: ${a.valore}`} className="target-agg-modal__cell" /></td>
                <td>{a.segmento}</td>
                <td className="target-agg-modal__center">
                  <Tooltip text="Modifica">
                    <button type="button" className="sib-btn sib-btn--icon target-agg-modal__act" onClick={() => modifica(a)} aria-label={`Modifica ${a.nome}`}>
                      <i className="fa-solid fa-pen" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Elimina">
                    <button type="button" className="sib-btn sib-btn--icon target-agg-modal__act" onClick={() => elimina(a)} aria-label={`Elimina ${a.nome}`}>
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
