import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { InputField, TextareaField, CheckboxField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import {
  useCategorieOspiteStore,
  categorieOspiteOrdinate,
  type CategoriaOspite,
} from '../../../../../store/useCategorieOspiteStore'
import './CategorieOspite.sass'

// ─── CATEGORIA OSPITE (F&B) ───────────────────────────────────────────────────
//  Con quale trattamento un cliente consuma all'outlet. Rispetto alla pagina
//  precedente, che teneva solo nome, descrizione e sconto — e quindi rendeva
//  «All Inclusive» e «Direzione» indistinguibili pur essendo due cose diverse:
//   • l'addebito in camera è un dato a sé: l'esterno non ce l'ha;
//   • gli omaggi al 100% possono richiedere l'autorizzazione di un
//     responsabile, che è l'unico controllo sensato su uno sconto totale;
//   • lo sconto è validato 0–100 e mostrato con una scala di colore.

const PANE_ID = 'fb-categoria-ospite'

interface Form {
  nome: string
  descrizione: string
  sconto: string
  addebitoInCamera: boolean
  richiedeAutorizzazione: boolean
}

const FORM_VUOTO: Form = {
  nome: '', descrizione: '', sconto: '0',
  addebitoInCamera: false, richiedeAutorizzazione: false,
}

export default function CategorieOspite() {
  const categorie      = useCategorieOspiteStore(s => s.categorie)
  const addCategoria    = useCategorieOspiteStore(s => s.addCategoria)
  const updateCategoria = useCategorieOspiteStore(s => s.updateCategoria)
  const removeCategoria = useCategorieOspiteStore(s => s.removeCategoria)
  const toggleCategoria = useCategorieOspiteStore(s => s.toggleCategoria)
  const confirm = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VUOTO)

  const righe = useMemo(() => categorieOspiteOrdinate(categorie), [categorie])

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const apriNuova = () => {
    setEditId(null)
    setForm(FORM_VUOTO)
    setModalOpen(true)
  }

  const apriModifica = (c: CategoriaOspite) => {
    setEditId(c.id)
    setForm({
      nome: c.nome,
      descrizione: c.descrizione,
      sconto: String(c.sconto),
      addebitoInCamera: c.addebitoInCamera,
      richiedeAutorizzazione: c.richiedeAutorizzazione,
    })
    setModalOpen(true)
  }

  const sconto = Number(form.sconto)
  const scontoErrato = form.sconto.trim() === ''
    || Number.isNaN(sconto) || sconto < 0 || sconto > 100
  const nomeDuplicato = categorie.some(c =>
    c.id !== editId && c.nome.trim().toLowerCase() === form.nome.trim().toLowerCase())

  const salvabile = !!form.nome.trim() && !nomeDuplicato && !scontoErrato

  const salva = () => {
    if (!salvabile) return
    const dati = {
      nome: form.nome.trim(),
      descrizione: form.descrizione.trim(),
      sconto: Math.round(sconto),
      addebitoInCamera: form.addebitoInCamera,
      richiedeAutorizzazione: form.richiedeAutorizzazione,
    }
    if (editId) {
      updateCategoria(editId, dati)
      toast.success(`Categoria «${dati.nome}» aggiornata`)
    } else {
      addCategoria({ ...dati, attiva: true })
      toast.success(`Categoria «${dati.nome}» creata`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (c: CategoriaOspite) => {
    const ok = await confirm({
      title: 'Elimina categoria',
      message: `Eliminare la categoria «${c.nome}»? I conti già chiusi con questa categoria non cambiano.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeCategoria(c.id)
    toast.success('Categoria eliminata')
  }

  /** Classe della pastiglia sconto: l'omaggio totale si distingue a vista. */
  const classeSconto = (s: number): string =>
    s >= 100 ? 'cat-ospite__sconto--pieno'
      : s >= 50 ? 'cat-ospite__sconto--alto'
        : s > 0 ? 'cat-ospite__sconto--medio'
          : 'cat-ospite__sconto--nullo'

  return (
    <div className="cat-ospite">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuova}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuova categoria
          </button>
        )}
      >
        <span className="cat-ospite__conteggio">
          <i className="fa-solid fa-user-tag" aria-hidden="true" />
          {righe.length} categorie
        </span>
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome',   label: 'Nome',            width: '19%' },
          { key: 'descr',  label: 'Descrizione',     width: '33%' },
          { key: 'sconto', label: 'Sconto',          width: '10%', align: 'right' },
          { key: 'camera', label: 'Addebito camera', width: '13%', align: 'center' },
          { key: 'auth',   label: 'Autorizzazione',  width: '13%', align: 'center' },
          { key: 'stato',  label: 'Stato',           width: '12%' },
          { key: 'azioni', label: 'Azioni',          width: '8%',  align: 'right' },
        ]}
        empty={<span>Nessuna categoria cliente configurata.</span>}
      >
        {righe.map(c => (
          <tr key={c.id} className={clsx(!c.attiva && 'cat-ospite__row--off')}>
            <td className="cat-ospite__td-nome">
              <TruncatedText text={c.nome} />
            </td>
            <td className="cat-ospite__td-descr">
              <TruncatedText text={c.descrizione || '—'} />
            </td>
            <td className="cat-ospite__td-sconto">
              <Tooltip content={c.sconto >= 100
                ? 'Omaggio: il conto si chiude a zero'
                : `Sconto di default del ${c.sconto}% sul conto`}>
                <span className={clsx('cat-ospite__sconto', classeSconto(c.sconto))}>
                  {c.sconto}%
                </span>
              </Tooltip>
            </td>
            <td className="cat-ospite__td-flag">
              {c.addebitoInCamera ? (
                <Tooltip content="Il conto può essere addebitato alla camera">
                  <i className="fa-solid fa-bed cat-ospite__si" aria-label="sì" />
                </Tooltip>
              ) : (
                <Tooltip content="Nessun addebito in camera: pagamento al tavolo">
                  <span className="cat-ospite__no" aria-label="no">—</span>
                </Tooltip>
              )}
            </td>
            <td className="cat-ospite__td-flag">
              {c.richiedeAutorizzazione ? (
                <Tooltip content="La chiusura del conto richiede l'autorizzazione di un responsabile">
                  <i className="fa-solid fa-user-shield cat-ospite__si" aria-label="richiesta" />
                </Tooltip>
              ) : (
                <Tooltip content="Nessuna autorizzazione richiesta">
                  <span className="cat-ospite__no" aria-label="non richiesta">—</span>
                </Tooltip>
              )}
            </td>
            <td>
              <ToggleSwitch
                checked={c.attiva}
                label={c.attiva ? 'Attiva' : 'Disattiva'}
                onChange={() => toggleCategoria(c.id)}
              />
            </td>
            <td className="cat-ospite__td-azioni">
              <Tooltip content="Modifica">
                <button
                  type="button" className="sib-btn sib-btn--icon"
                  onClick={() => apriModifica(c)}
                  aria-label={`Modifica ${c.nome}`}
                >
                  <i className="fa-solid fa-pen" />
                </button>
              </Tooltip>
              <Tooltip content="Elimina">
                <button
                  type="button" className="sib-btn sib-btn--icon"
                  onClick={() => elimina(c)}
                  aria-label={`Elimina ${c.nome}`}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>

      <p className="cat-ospite__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        La categoria si sceglie all'apertura del conto e porta con sé lo sconto di default,
        che il cameriere può ancora correggere sul singolo conto. Uno sconto del 100% chiude
        il conto a zero: per gli omaggi conviene richiedere l'autorizzazione.
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica categoria' : 'Nuova categoria'}
          size="md"
        >
          <div className="cat-ospite__form">
            <InputField
              name="nome"
              label="Nome"
              required
              value={form.nome}
              placeholder="es. Ospiti hotel"
              error={nomeDuplicato ? 'Esiste già una categoria con questo nome.' : undefined}
              onChange={(e) => upd('nome', e.target.value)}
            />
            <TextareaField
              name="descrizione"
              label="Descrizione"
              rows={2}
              value={form.descrizione}
              placeholder="A chi si applica e con quale trattamento."
              onChange={(e) => upd('descrizione', e.target.value)}
            />
            <InputField
              className="cat-ospite__form-sconto"
              name="sconto"
              label="Sconto % di default"
              required
              type="number"
              min={0}
              max={100}
              step={5}
              value={form.sconto}
              error={scontoErrato ? 'Inserisci una percentuale da 0 a 100.' : undefined}
              hint={!scontoErrato && sconto >= 100 ? 'Omaggio: il conto si chiude a zero.' : undefined}
              onChange={(e) => upd('sconto', e.target.value)}
            />
            <div className="cat-ospite__form-flags">
              <CheckboxField
                name="camera"
                label="Consente l'addebito in camera"
                checked={form.addebitoInCamera}
                onChange={(e) => upd('addebitoInCamera', e.target.checked)}
              />
              <CheckboxField
                name="auth"
                label="Richiede l'autorizzazione di un responsabile"
                checked={form.richiedeAutorizzazione}
                onChange={(e) => upd('richiedeAutorizzazione', e.target.checked)}
              />
            </div>
            <div className="cat-ospite__form-foot">
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
