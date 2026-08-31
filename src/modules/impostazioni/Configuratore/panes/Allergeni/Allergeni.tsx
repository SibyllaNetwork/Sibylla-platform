import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { SelectField, InputField, TextareaField } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useVociMenuStore } from '../../../../../store/useVociMenuStore'
import {
  useAllergeniStore,
  allergeniOrdinati,
  prossimaSigla,
  type Allergene,
} from '../../../../../store/useAllergeniStore'
import type { CfgPaneComponentProps } from '../../Configuratore'
import './Allergeni.sass'

// ─── ALLERGENI (F&B) ──────────────────────────────────────────────────────────
//  Catalogo delle diciture da stampare su menu e web menu. Rispetto alla pagina
//  precedente, che era un elenco libero (e mostrava «Cereali» due volte più due
//  righe di prova):
//   • i 14 dell'allegato II sono righe di legge: si correggono nei testi, non
//     si eliminano e non se ne aggiungono altre a quell'insieme;
//   • le voci proprie (intolleranze, preferenze) sono ammesse ma marcate come
//     personalizzate, e quelle sì si eliminano;
//   • ogni riga dice su quante voci di menu è dichiarata: prima per saperlo
//     bisognava aprire il catalogo voce per voce.

const PANE_ID = 'fb-allergeni'

type Filtro = 'tutti' | 'ue' | 'propri'

interface Form {
  codice: string
  nome: string
  descrizione: string
}

const FORM_VUOTO: Form = { codice: '', nome: '', descrizione: '' }

export default function Allergeni({ onGoTo }: CfgPaneComponentProps) {
  const allergeni = useAllergeniStore(s => s.allergeni)
  const addAllergene    = useAllergeniStore(s => s.addAllergene)
  const updateAllergene = useAllergeniStore(s => s.updateAllergene)
  const removeAllergene = useAllergeniStore(s => s.removeAllergene)
  const voci    = useVociMenuStore(s => s.voci)
  const confirm = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [modalOpen, setModalOpen] = useState(false)
  /** Codice in modifica; null = nuova voce propria. */
  const [editCodice, setEditCodice] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VUOTO)

  const righe = useMemo(() => allergeniOrdinati(allergeni).filter(a =>
    filtro === 'tutti' || (filtro === 'ue' ? a.ue : !a.ue)), [allergeni, filtro])

  /** Quante voci di menu dichiarano ciascun allergene. */
  const conteggi = useMemo(() => {
    const m = new Map<string, number>()
    voci.forEach(v => v.allergeni.forEach(c => m.set(c, (m.get(c) ?? 0) + 1)))
    return m
  }, [voci])

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const apriNuovo = () => {
    setEditCodice(null)
    setForm({ ...FORM_VUOTO, codice: prossimaSigla(allergeni) })
    setModalOpen(true)
  }

  const apriModifica = (a: Allergene) => {
    setEditCodice(a.codice)
    setForm({ codice: a.codice, nome: a.nome, descrizione: a.descrizione })
    setModalOpen(true)
  }

  const inModifica = editCodice ? allergeni.find(a => a.codice === editCodice) : undefined
  const codiceUe = !!inModifica?.ue

  const codiceDuplicato = !codiceUe && allergeni.some(a =>
    a.codice.toUpperCase() === form.codice.trim().toUpperCase() && a.codice !== editCodice)
  const nomeDuplicato = allergeni.some(a =>
    a.nome.trim().toLowerCase() === form.nome.trim().toLowerCase() && a.codice !== editCodice)

  const salvabile = !!form.nome.trim()
    && !!form.descrizione.trim()
    && !!form.codice.trim()
    && !codiceDuplicato
    && !nomeDuplicato

  const salva = () => {
    if (!salvabile) return
    const dati = {
      codice: form.codice.trim().toUpperCase(),
      nome: form.nome.trim(),
      descrizione: form.descrizione.trim(),
    }
    if (editCodice) {
      updateAllergene(editCodice, dati)
      toast.success(`Allergene «${dati.nome}» aggiornato`)
    } else {
      addAllergene({ ...dati, ue: false })
      toast.success(`Allergene «${dati.nome}» aggiunto`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (a: Allergene) => {
    const usato = conteggi.get(a.codice) ?? 0
    const ok = await confirm({
      title: 'Elimina allergene',
      message: usato > 0
        ? `«${a.nome}» è dichiarato su ${usato} voci di menu: eliminandolo la dichiarazione sparisce da quelle voci. Procedere?`
        : `Eliminare «${a.nome}» dal catalogo?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeAllergene(a.codice)
    toast.success('Allergene eliminato')
  }

  return (
    <div className="allergeni">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuova voce propria
          </button>
        )}
      >
        <SelectField
          name="filtro"
          label="Mostra"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          options={[
            { value: 'tutti',  label: `Tutti (${allergeni.length})` },
            { value: 'ue',     label: `Allegato II — obbligatori (${allergeni.filter(a => a.ue).length})` },
            { value: 'propri', label: `Voci proprie (${allergeni.filter(a => !a.ue).length})` },
          ]}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'cod',    label: 'Cod.',        width: '7%' },
          { key: 'nome',   label: 'Allergene',   width: '20%' },
          { key: 'descr',  label: 'Dicitura',    width: '41%' },
          { key: 'orig',   label: 'Origine',     width: '14%' },
          { key: 'voci',   label: 'Voci',        width: '8%', align: 'right' },
          { key: 'azioni', label: 'Azioni',      width: '10%', align: 'right' },
        ]}
        empty={<span>Nessun allergene per il filtro impostato.</span>}
      >
        {righe.map(a => {
          const usato = conteggi.get(a.codice) ?? 0
          return (
            <tr key={a.codice}>
              <td>
                <span className={clsx('allergeni__cod', !a.ue && 'allergeni__cod--proprio')}>
                  {a.codice}
                </span>
              </td>
              <td className="allergeni__td-nome">
                <TruncatedText text={a.nome} />
              </td>
              <td className="allergeni__td-descr">
                <TruncatedText text={a.descrizione} />
              </td>
              <td>
                <span className={clsx('allergeni__orig', a.ue ? 'allergeni__orig--ue' : 'allergeni__orig--proprio')}>
                  {a.ue ? 'Obbligatorio' : 'Personalizzato'}
                </span>
              </td>
              <td className="allergeni__td-num">
                {usato > 0 ? (
                  <Tooltip content={`Dichiarato su ${usato} voci di menu`}>
                    <span>{usato}</span>
                  </Tooltip>
                ) : <span className="allergeni__zero">0</span>}
              </td>
              <td className="allergeni__td-azioni">
                <Tooltip content={a.ue ? 'Correggi nome e dicitura' : 'Modifica'}>
                  <button
                    type="button" className="sib-btn sib-btn--icon"
                    onClick={() => apriModifica(a)}
                    aria-label={`Modifica ${a.nome}`}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                </Tooltip>
                {a.ue ? (
                  <Tooltip content="Allergene dell'allegato II: per legge non si elimina">
                    <span className="allergeni__lock" aria-hidden="true">
                      <i className="fa-solid fa-lock" />
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip content="Elimina">
                    <button
                      type="button" className="sib-btn sib-btn--icon"
                      onClick={() => elimina(a)}
                      aria-label={`Elimina ${a.nome}`}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </Tooltip>
                )}
              </td>
            </tr>
          )
        })}
      </CfgTable>

      <p className="allergeni__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        I 14 allergeni dell'allegato II del Reg. UE 1169/2011 sono obbligatori e non
        si eliminano: si può correggere la dicitura che verrà stampata. Le voci proprie
        servono a segnalare intolleranze in sala e non sostituiscono la dichiarazione di legge.
        {onGoTo && (
          <> Gli allergeni si dichiarano voce per voce in{' '}
            <button type="button" className="allergeni__link" onClick={() => onGoTo('fb-voci-menu')}>
              Voci menu
            </button>.
          </>
        )}
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editCodice
            ? (codiceUe ? `Dicitura di «${inModifica?.nome}»` : `Modifica «${inModifica?.nome}»`)
            : 'Nuova voce propria'}
          size="md"
        >
          <div className="allergeni__form">
            {codiceUe && (
              <p className="allergeni__avviso">
                <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
                Allergene a dichiarazione obbligatoria: codice fisso, si possono correggere
                nome e dicitura da stampare.
              </p>
            )}
            <div className="allergeni__form-grid">
              <InputField
                name="codice"
                label="Codice"
                required
                disabled={codiceUe}
                maxLength={4}
                value={form.codice}
                placeholder="es. P2"
                error={codiceDuplicato ? 'Codice già in uso.' : undefined}
                onChange={(e) => upd('codice', e.target.value.toUpperCase())}
              />
              <InputField
                className="allergeni__form-nome"
                name="nome"
                label="Nome"
                required
                value={form.nome}
                placeholder="es. Nichel"
                error={nomeDuplicato ? 'Esiste già un allergene con questo nome.' : undefined}
                onChange={(e) => upd('nome', e.target.value)}
              />
              <TextareaField
                className="allergeni__form-full"
                name="descrizione"
                label="Dicitura da stampare"
                required
                rows={3}
                value={form.descrizione}
                placeholder="es. Frutta a guscio e loro prodotti (mandorle, nocciole, …)"
                onChange={(e) => upd('descrizione', e.target.value)}
              />
            </div>
            <div className="allergeni__form-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
                Salva
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
