import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import {
  SelectField, InputField, TextareaField, DatePickerField, CheckboxField, ToggleSwitch,
} from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import {
  useMenuGiornoStore,
  menuOrdinati,
  menuStessoGiorno,
  prezzoMenu,
  sommaVoci,
  categorieVoci,
  voceMeta,
  VOCI_MENU_DISPONIBILI,
  type MenuGiorno as MenuGiornoRec,
} from '../../../../../store/useMenuGiornoStore'
import './MenuGiorno.sass'

// ─── MENU DEL GIORNO (F&B) ────────────────────────────────────────────────────
//  Elenco dei menu giornalieri dell'outlet: data, nome, voci incluse, prezzo e
//  stato. La composizione passa dalla stessa modale per creazione e modifica:
//  si scelgono le voci dal catalogo (checkbox, filtro per categoria, elenco con
//  scroll proprio) e si decide se il menu ha un prezzo fisso o vale la somma
//  delle voci incluse. Le voci NON sono un elenco locale: arrivano dal catalogo
//  F&B (vedi useMenuGiornoStore).

const PANE_ID = 'fb-menu-giorno'

const OUTLET = [{ id: 1, nome: 'Sibylla Restaurant' }]

const oggiISO = () => new Date().toISOString().slice(0, 10)

const euro = (n: number) => `€ ${n.toFixed(2)}`

/** yyyy-mm-dd → gg/mm/aaaa (le date si leggono in formato italiano). */
const dataIT = (iso: string) => {
  const [a, m, g] = iso.split('-')
  return a && m && g ? `${g}/${m}/${a}` : iso
}

interface MenuForm {
  nome: string
  data: string
  prezzoFisso: string
  note: string
  voci: string[]
}

const FORM_VUOTO: MenuForm = { nome: '', data: oggiISO(), prezzoFisso: '', note: '', voci: [] }

export default function MenuGiorno() {
  const menu       = useMenuGiornoStore(s => s.menu)
  const addMenu    = useMenuGiornoStore(s => s.addMenu)
  const updateMenu = useMenuGiornoStore(s => s.updateMenu)
  const removeMenu = useMenuGiornoStore(s => s.removeMenu)
  const toggleMenu = useMenuGiornoStore(s => s.toggleMenu)
  const confirm    = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [outletId, setOutletId] = useState(OUTLET[0].id)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<MenuForm>(FORM_VUOTO)
  const [categoria, setCategoria] = useState('')

  const righe = useMemo(() => menuOrdinati(menu, outletId), [menu, outletId])

  const categorieOptions = useMemo(
    () => [
      { value: '', label: 'Tutte le categorie' },
      ...categorieVoci().map(c => ({ value: c, label: c })),
    ],
    [],
  )

  const vociFiltrate = useMemo(
    () => (categoria ? VOCI_MENU_DISPONIBILI.filter(v => v.categoria === categoria) : VOCI_MENU_DISPONIBILI),
    [categoria],
  )

  const upd = <K extends keyof MenuForm>(k: K, v: MenuForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleVoce = (id: string) =>
    setForm(f => ({
      ...f,
      voci: f.voci.includes(id) ? f.voci.filter(v => v !== id) : [...f.voci, id],
    }))

  const apriNuovo = () => {
    setEditId(null)
    setForm({ ...FORM_VUOTO, data: oggiISO(), voci: [] })
    setCategoria('')
    setModalOpen(true)
  }

  const apriModifica = (m: MenuGiornoRec) => {
    setEditId(m.id)
    setForm({
      nome: m.nome,
      data: m.data,
      prezzoFisso: m.prezzoFisso != null ? String(m.prezzoFisso) : '',
      note: m.note,
      voci: [...m.voci],
    })
    setCategoria('')
    setModalOpen(true)
  }

  // Somma delle voci selezionate: è il prezzo del menu quando il prezzo fisso
  // resta vuoto, e in ogni caso il riferimento per capire cosa si sta vendendo
  const somma = sommaVoci(form.voci)

  // Validazione: nome, data e almeno una voce; il prezzo fisso, se scritto,
  // deve essere un numero non negativo
  const prezzoTrim = form.prezzoFisso.trim()
  const prezzoNum = prezzoTrim === '' ? null : Number(prezzoTrim.replace(',', '.'))
  const prezzoValido = prezzoNum == null || (Number.isFinite(prezzoNum) && prezzoNum >= 0)
  const salvabile = !!form.nome.trim() && !!form.data && form.voci.length > 0 && prezzoValido

  const duplicatoGiorno = form.data
    ? menuStessoGiorno(menu, { id: editId ?? '__nuovo', outletId, data: form.data })
    : null

  const salva = () => {
    if (!salvabile) return
    const payload = {
      outletId,
      data: form.data,
      nome: form.nome.trim(),
      voci: [...form.voci],
      prezzoFisso: prezzoNum,
      note: form.note.trim(),
    }
    if (editId) {
      updateMenu(editId, payload)
      toast.success(`Menu «${payload.nome}» aggiornato`)
    } else {
      addMenu({ ...payload, attivo: true })
      toast.success(`Menu «${payload.nome}» creato`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (m: MenuGiornoRec) => {
    const ok = await confirm({
      title: 'Elimina menu del giorno',
      message: `Eliminare il menu «${m.nome}» del ${dataIT(m.data)}? Le voci di menu restano nel catalogo.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeMenu(m.id)
    toast.success('Menu eliminato')
  }

  return (
    <div className="menu-giorno">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuovo menu
          </button>
        )}
      >
        <SelectField
          name="outlet"
          label="Outlet"
          value={outletId}
          onChange={(e) => setOutletId(Number(e.target.value))}
          options={OUTLET.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` }))}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'data',   label: 'Data',      width: '14%' },
          { key: 'nome',   label: 'Nome menu', width: '32%' },
          { key: 'voci',   label: 'Voci',      width: '13%' },
          { key: 'prezzo', label: 'Prezzo',    width: '13%', align: 'right' },
          { key: 'stato',  label: 'Stato',     width: '16%' },
          { key: 'azioni', label: 'Azioni',    width: '12%', align: 'right' },
        ]}
        empty={<span>Nessun menu del giorno per questo outlet: creane uno con «Nuovo menu».</span>}
      >
        {righe.map(m => (
          <tr key={m.id} className={clsx(!m.attivo && 'menu-giorno__row--off')}>
            <td className="menu-giorno__td-data">{dataIT(m.data)}</td>
            <td className="menu-giorno__td-nome">
              <TruncatedText text={m.nome} />
            </td>
            <td>
              <span className="menu-giorno__voci-badge">
                {m.voci.length} {m.voci.length === 1 ? 'piatto' : 'piatti'}
              </span>
            </td>
            <td className="menu-giorno__td-num">
              {euro(prezzoMenu(m))}
              {m.prezzoFisso == null && (
                <Tooltip content="Nessun prezzo fisso: il prezzo è la somma delle voci incluse">
                  <i className="fa-solid fa-calculator menu-giorno__somma-ico" aria-hidden="true" />
                </Tooltip>
              )}
            </td>
            <td>
              <ToggleSwitch
                checked={m.attivo}
                label={m.attivo ? 'Attivo' : 'Disattivo'}
                onChange={() => toggleMenu(m.id)}
              />
            </td>
            <td className="menu-giorno__td-azioni">
              <Tooltip content="Modifica menu">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => apriModifica(m)}
                  aria-label={`Modifica il menu ${m.nome} del ${dataIT(m.data)}`}
                >
                  <i className="fa-solid fa-pen" />
                </button>
              </Tooltip>
              <Tooltip content="Elimina menu">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => elimina(m)}
                  aria-label={`Elimina il menu ${m.nome} del ${dataIT(m.data)}`}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>

      <p className="menu-giorno__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Le voci sono quelle del catalogo «Voci di menu»: il menu del giorno le referenzia, quindi
        un ritocco di prezzo in catalogo si riflette qui. Senza prezzo fisso il menu vale la somma
        delle voci incluse.
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica menu del giorno' : 'Nuovo menu del giorno'}
          size="lg"
        >
          <div className="menu-giorno__form">
            <div className="menu-giorno__form-grid">
              <InputField
                name="nome"
                label="Nome menu"
                required
                value={form.nome}
                placeholder="es. Menu Pasqua 2026"
                onChange={(e) => upd('nome', e.target.value)}
              />
              <DatePickerField
                name="data"
                label="Data"
                required
                value={form.data}
                onChange={(e) => upd('data', e.target.value)}
              />
              <InputField
                name="prezzoFisso"
                label="Prezzo fisso €"
                type="number"
                min={0}
                step={0.5}
                value={form.prezzoFisso}
                placeholder="vuoto = somma delle voci"
                hint={prezzoNum == null
                  ? `Vuoto: il menu vale la somma delle voci (${euro(somma)})`
                  : undefined}
                onChange={(e) => upd('prezzoFisso', e.target.value)}
              />
              <TextareaField
                name="note"
                label="Note"
                rows={2}
                value={form.note}
                placeholder="es. servito solo a pranzo, bevande escluse"
                onChange={(e) => upd('note', e.target.value)}
              />
            </div>

            {/* Selettore voci: elenco lungo → scroll proprio, la modale non cresce */}
            <div className="menu-giorno__picker">
              <div className="menu-giorno__picker-head">
                <div className="menu-giorno__picker-titolo">
                  <span className="menu-giorno__picker-label">Seleziona voci da includere</span>
                  <span className="menu-giorno__pill menu-giorno__pill--count">
                    {form.voci.length} sel.
                  </span>
                  <span className="menu-giorno__pill menu-giorno__pill--tot">
                    {euro(somma)}
                  </span>
                </div>
                <SelectField
                  className="menu-giorno__picker-filtro"
                  name="categoriaVoci"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  options={categorieOptions}
                />
              </div>

              <ul className="menu-giorno__lista">
                {vociFiltrate.map(v => {
                  const on = form.voci.includes(v.id)
                  return (
                    <li
                      key={v.id}
                      className={clsx('menu-giorno__voce', on && 'menu-giorno__voce--on')}
                    >
                      <CheckboxField
                        className="menu-giorno__voce-check"
                        name={`voce-${v.id}`}
                        label={v.nome}
                        checked={on}
                        onChange={() => toggleVoce(v.id)}
                      />
                      <span className="menu-giorno__voce-cat">{v.categoria}</span>
                      <span className="menu-giorno__voce-prezzo">{euro(v.prezzo)}</span>
                    </li>
                  )
                })}
                {vociFiltrate.length === 0 && (
                  <li className="menu-giorno__lista-vuota">
                    Nessuna voce in questa categoria.
                  </li>
                )}
              </ul>

              <p className="menu-giorno__riepilogo">
                <span>
                  {form.voci.length === 0
                    ? 'Nessuna voce selezionata'
                    : `${form.voci.length} ${form.voci.length === 1 ? 'voce' : 'voci'} selezionate`}
                  {form.voci.length > 0 && (
                    <span className="menu-giorno__riepilogo-voci">
                      {' · '}
                      {form.voci.map(id => voceMeta(id)?.nome ?? id).join(', ')}
                    </span>
                  )}
                </span>
                <span className="menu-giorno__riepilogo-tot">
                  {prezzoNum == null
                    ? `Prezzo del menu: ${euro(somma)}`
                    : `Prezzo fisso ${euro(prezzoNum)} · somma voci ${euro(somma)}`}
                </span>
              </p>
            </div>

            {form.voci.length === 0 && (
              <p className="menu-giorno__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Seleziona almeno una voce: un menu del giorno senza piatti non è vendibile.
              </p>
            )}
            {!prezzoValido && (
              <p className="menu-giorno__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Il prezzo fisso deve essere un importo non negativo (lascia vuoto per usare la
                somma delle voci).
              </p>
            )}
            {duplicatoGiorno && (
              <p className="menu-giorno__avviso">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                Esiste già «{duplicatoGiorno.nome}» per il {dataIT(form.data)}: verifica di non
                creare un doppione.
              </p>
            )}

            <div className="menu-giorno__form-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
                Salva menu
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
