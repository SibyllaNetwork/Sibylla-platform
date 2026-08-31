import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useCategorieMenuStore } from '../../../../../store/useCategorieMenuStore'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { SelectField, InputField, TextareaField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import {
  useVociMenuStore,
  vociOrdinate,
  voceDuplicata,
  formattaPrezzo,
  prezzoDaTesto,
  categoriaNome,
  allergeneLabel,
  newRigaId,
  ALLERGENI_UE,
  OUTLET_FB,
  STAMPANTI_FB,
  stampanteLabel,
  SERVICE_MONITOR_FB,
  CONTESTI_STAMPA,
  type CodiceAllergene,
  type ContestoStampa,
  type RigaStampante,
  type RigaMonitor,
  type VoceMenu,
} from '../../../../../store/useVociMenuStore'
import './VociMenu.sass'

// ─── VOCI MENU (F&B) ──────────────────────────────────────────────────────────
//  L'anagrafica di piatti, bevande e articoli: la voce più ricca del gruppo F&B.
//  L'elenco si filtra per categoria e porta il contatore delle voci mostrate;
//  creazione e modifica passano dalla stessa modale, organizzata in sezioni
//  (denominazione multilingua → categoria e prezzo → allergeni → outlet →
//  instradamento a stampanti e service monitor) perché un elenco piatto di
//  campi sarebbe illeggibile. Le categorie arrivano dallo store delle voci
//  (vedi il TODO sulla costante CATEGORIE_MENU), non da un elenco locale.

const PANE_ID = 'fb-voci-menu'

/** Allergeni mostrati in tabella prima di collassare nel «+N». */
const ALLERG_IN_CELLA = 5

interface VoceForm {
  nomeIt: string
  nomeEn: string
  nomeDe: string
  nomeFr: string
  descrizione: string
  /** Id categoria come stringa: è il valore di una <select>. */
  categoriaId: string
  /** Prezzo come testo: la validazione avviene al salvataggio. */
  prezzo: string
  allergeni: CodiceAllergene[]
  outletIds: number[]
  stampanti: RigaStampante[]
  monitor: RigaMonitor[]
}

const FORM_VUOTO: VoceForm = {
  nomeIt: '', nomeEn: '', nomeDe: '', nomeFr: '', descrizione: '',
  categoriaId: '', prezzo: '', allergeni: [], outletIds: [],
  stampanti: [], monitor: [],
}

export default function VociMenu() {
  const voci       = useVociMenuStore(s => s.voci)
  const categorie = useCategorieMenuStore(s => s.categorie)
  const addVoce    = useVociMenuStore(s => s.addVoce)
  const updateVoce = useVociMenuStore(s => s.updateVoce)
  const removeVoce = useVociMenuStore(s => s.removeVoce)
  const toggleVoce = useVociMenuStore(s => s.toggleVoce)
  const confirm    = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  // '' = tutte le categorie
  const [filtroCat, setFiltroCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<VoceForm>(FORM_VUOTO)

  const righe = useMemo(
    () => vociOrdinate(voci, filtroCat === '' ? null : filtroCat),
    [voci, filtroCat],
  )

  const upd = <K extends keyof VoceForm>(k: K, val: VoceForm[K]) =>
    setForm(f => ({ ...f, [k]: val }))

  // ── Apertura della modale ───────────────────────────────────────────────────
  const apriNuova = () => {
    setEditId(null)
    // La categoria filtrata fa da default: creando dentro un filtro è quella
    // che l'utente ha in testa
    setForm({ ...FORM_VUOTO, categoriaId: filtroCat })
    setModalOpen(true)
  }

  const apriModifica = (voce: VoceMenu) => {
    setEditId(voce.id)
    setForm({
      nomeIt: voce.nomeIt,
      nomeEn: voce.nomeEn,
      nomeDe: voce.nomeDe,
      nomeFr: voce.nomeFr,
      descrizione: voce.descrizione,
      categoriaId: String(voce.categoriaId),
      prezzo: voce.prezzo.toFixed(2),
      allergeni: [...voce.allergeni],
      outletIds: [...voce.outletIds],
      stampanti: voce.stampanti.map(r => ({ ...r })),
      monitor: voce.monitor.map(r => ({ ...r })),
    })
    setModalOpen(true)
  }

  // ── Tag a selezione multipla (allergeni, outlet) ─────────────────────────────
  const toggleAllergene = (codice: CodiceAllergene) =>
    setForm(f => ({
      ...f,
      allergeni: f.allergeni.includes(codice)
        ? f.allergeni.filter(x => x !== codice)
        : [...f.allergeni, codice],
    }))

  const toggleOutlet = (id: number) =>
    setForm(f => ({
      ...f,
      outletIds: f.outletIds.includes(id)
        ? f.outletIds.filter(x => x !== id)
        : [...f.outletIds, id],
    }))

  // ── Righe stampanti ─────────────────────────────────────────────────────────
  const addStampante = () =>
    setForm(f => ({
      ...f,
      stampanti: [...f.stampanti, {
        rid: newRigaId(), outletId: null, stampanteId: '', contesto: 'reparto-produzione',
      }],
    }))

  const updStampante = (rid: string, patch: Partial<RigaStampante>) =>
    setForm(f => ({
      ...f,
      stampanti: f.stampanti.map(r => r.rid === rid ? { ...r, ...patch } : r),
    }))

  const delStampante = (rid: string) =>
    setForm(f => ({ ...f, stampanti: f.stampanti.filter(r => r.rid !== rid) }))

  // ── Righe service monitor ───────────────────────────────────────────────────
  const addMonitor = () =>
    setForm(f => ({ ...f, monitor: [...f.monitor, { rid: newRigaId(), monitorId: '' }] }))

  const updMonitor = (rid: string, monitorId: string) =>
    setForm(f => ({ ...f, monitor: f.monitor.map(r => r.rid === rid ? { ...r, monitorId } : r) }))

  const delMonitor = (rid: string) =>
    setForm(f => ({ ...f, monitor: f.monitor.filter(r => r.rid !== rid) }))

  // ── Validazione ─────────────────────────────────────────────────────────────
  const prezzo = prezzoDaTesto(form.prezzo)
  const prezzoErrato = form.prezzo.trim() !== '' && prezzo == null
  const candidata: VoceMenu = {
    id: editId ?? '__nuova',
    categoriaId: form.categoriaId,
    nomeIt: form.nomeIt.trim(),
    nomeEn: form.nomeEn.trim(),
    nomeDe: form.nomeDe.trim(),
    nomeFr: form.nomeFr.trim(),
    descrizione: form.descrizione.trim(),
    prezzo: prezzo ?? 0,
    allergeni: form.allergeni,
    outletIds: form.outletIds,
    // Righe incomplete scartate: una stampante senza outlet non instrada nulla
    stampanti: form.stampanti.filter(r => r.outletId != null && r.stampanteId !== ''),
    monitor: form.monitor.filter(r => r.monitorId !== ''),
    attivo: true,
  }
  const duplicata = form.nomeIt.trim() && form.categoriaId
    ? voceDuplicata(voci, candidata)
    : null
  const salvabile = !!candidata.nomeIt && !!form.categoriaId && prezzo != null && !duplicata

  const salva = () => {
    if (!salvabile) return
    if (editId) {
      const attuale = voci.find(x => x.id === editId)
      updateVoce(editId, { ...candidata, id: editId, attivo: attuale?.attivo ?? true })
      toast.success(`Voce «${candidata.nomeIt}» aggiornata`)
    } else {
      const { id: _id, ...nuova } = candidata
      addVoce(nuova)
      toast.success(`Voce «${candidata.nomeIt}» creata`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (voce: VoceMenu) => {
    const ok = await confirm({
      title: 'Elimina voce di menu',
      message: `Eliminare «${voce.nomeIt}» (${categoriaNome(voce.categoriaId)})? `
        + 'La voce sparirà dai menu che la contengono.',
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeVoce(voce.id)
    toast.success('Voce eliminata')
  }

  // ── Opzioni delle select ────────────────────────────────────────────────────
  // Le categorie sono quelle configurate in F&B → Categorie: elenco reattivo,
  // non una copia locale
  const catOptions = useMemo(
    () => [...categorie]
      .sort((a, b) => a.ordine - b.ordine)
      .map(c => ({ value: c.id, label: `${c.emoji} ${c.nome}` })),
    [categorie],
  )

  /** Stampanti selezionabili: quelle dell'outlet scelto sulla riga. */
  const stampanteOptions = (outletId: number | null) =>
    STAMPANTI_FB
      .filter(s => outletId == null || s.outletId === outletId)
      .map(s => ({ value: s.id, label: stampanteLabel(s.id) }))

  return (
    <div className="voci-menu">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuova}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuova voce
          </button>
        )}
      >
        <SelectField
          name="filtro-categoria"
          label="Categoria"
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
          options={[{ value: '', label: 'Tutte le categorie' }, ...catOptions]}
        />
        <span className="voci-menu__conta">
          {righe.length} {righe.length === 1 ? 'voce' : 'voci'}
        </span>
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nome',      label: 'Nome IT',   width: '26%' },
          { key: 'categoria', label: 'Categoria', width: '17%' },
          { key: 'prezzo',    label: 'Prezzo',    width: '12%', align: 'right' },
          { key: 'allergeni', label: 'Allergeni', width: '18%' },
          { key: 'stato',     label: 'Stato',     width: '15%' },
          { key: 'azioni',    label: 'Azioni',    width: '12%', align: 'right' },
        ]}
        empty={(
          <span>
            {filtroCat
              ? 'Nessuna voce in questa categoria: cambia filtro o creane una con «Nuova voce».'
              : 'Nessuna voce di menu configurata: creane una con «Nuova voce».'}
          </span>
        )}
      >
        {righe.map(voce => {
          const visibili = voce.allergeni.slice(0, ALLERG_IN_CELLA)
          const resto = voce.allergeni.length - visibili.length
          return (
            <tr key={voce.id} className={clsx(!voce.attivo && 'voci-menu__row--off')}>
              <td className="voci-menu__td-nome">
                <TruncatedText text={voce.nomeIt} />
              </td>
              <td className="voci-menu__td-cat">
                <TruncatedText text={categoriaNome(voce.categoriaId)} />
              </td>
              <td className="voci-menu__td-num">€ {formattaPrezzo(voce.prezzo)}</td>
              <td>
                {voce.allergeni.length === 0 ? (
                  <span className="voci-menu__vuoto">—</span>
                ) : (
                  <Tooltip content={voce.allergeni.map(allergeneLabel).join(' · ')}>
                    <span className="voci-menu__allerg">
                      {visibili.map(c => (
                        <span key={c} className="voci-menu__allerg-badge">{c}</span>
                      ))}
                      {resto > 0 && (
                        <span className="voci-menu__allerg-badge voci-menu__allerg-badge--more">
                          +{resto}
                        </span>
                      )}
                    </span>
                  </Tooltip>
                )}
              </td>
              <td>
                <ToggleSwitch
                  checked={voce.attivo}
                  label={voce.attivo ? 'Attivo' : 'Disattivo'}
                  onChange={() => toggleVoce(voce.id)}
                />
              </td>
              <td className="voci-menu__td-azioni">
                <Tooltip content="Modifica voce">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => apriModifica(voce)}
                    aria-label={`Modifica la voce ${voce.nomeIt}`}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                </Tooltip>
                <Tooltip content="Elimina voce">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => elimina(voce)}
                    aria-label={`Elimina la voce ${voce.nomeIt}`}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          )
        })}
      </CfgTable>

      <p className="voci-menu__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Le categorie sono quelle definite in «Categorie»; gli allergeni seguono l'allegato II
        del Reg. UE 1169/2011. Una voce senza outlet è attiva su tutti gli outlet.
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica voce di menu' : 'Nuova voce di menu'}
          size="xl"
        >
          <div className="voci-menu__form">
            {/* Il corpo scorre da sé: il form è alto e la modale non deve
                spingere lo scroll sulla pagina sotto */}
            <div className="voci-menu__body">
              {/* ── Denominazione ─────────────────────────────────────────── */}
              <section className="voci-menu__section">
                <h3 className="voci-menu__section-title">
                  <i className="fa-light fa-language" aria-hidden="true" />
                  Denominazione
                  <span className="voci-menu__section-hint">nomi mostrati su menu e comande</span>
                </h3>
                <div className="voci-menu__grid">
                  <InputField
                    name="nomeIt"
                    label="Nome italiano"
                    required
                    value={form.nomeIt}
                    placeholder="es. Spaghetti al pomodoro"
                    onChange={(e) => upd('nomeIt', e.target.value)}
                  />
                  <InputField
                    name="nomeEn"
                    label="Nome inglese"
                    value={form.nomeEn}
                    placeholder="es. Spaghetti with tomato sauce"
                    onChange={(e) => upd('nomeEn', e.target.value)}
                  />
                  <InputField
                    name="nomeDe"
                    label="Nome tedesco"
                    value={form.nomeDe}
                    onChange={(e) => upd('nomeDe', e.target.value)}
                  />
                  <InputField
                    name="nomeFr"
                    label="Nome francese"
                    value={form.nomeFr}
                    onChange={(e) => upd('nomeFr', e.target.value)}
                  />
                  <TextareaField
                    className="voci-menu__full"
                    name="descrizione"
                    label="Descrizione"
                    rows={3}
                    value={form.descrizione}
                    placeholder="Ingredienti e note di servizio, come compaiono sul web menu."
                    onChange={(e) => upd('descrizione', e.target.value)}
                  />
                </div>
              </section>

              {/* ── Categoria e prezzo ────────────────────────────────────── */}
              <section className="voci-menu__section">
                <h3 className="voci-menu__section-title">
                  <i className="fa-light fa-tag" aria-hidden="true" />
                  Categoria e prezzo
                </h3>
                <div className="voci-menu__grid">
                  <SelectField
                    name="categoria"
                    label="Categoria"
                    required
                    value={form.categoriaId}
                    onChange={(e) => upd('categoriaId', e.target.value)}
                    options={[{ value: '', label: '— Seleziona —' }, ...catOptions]}
                  />
                  <InputField
                    name="prezzo"
                    label="Prezzo base (€)"
                    required
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.prezzo}
                    placeholder="0,00"
                    error={prezzoErrato ? 'Inserisci un importo maggiore o uguale a zero.' : undefined}
                    onChange={(e) => upd('prezzo', e.target.value)}
                  />
                </div>
              </section>

              {/* ── Allergeni ─────────────────────────────────────────────── */}
              <section className="voci-menu__section">
                <h3 className="voci-menu__section-title">
                  <i className="fa-light fa-wheat-awn-circle-exclamation" aria-hidden="true" />
                  Allergeni presenti
                  <span className="voci-menu__section-hint">selezione multipla</span>
                </h3>
                <div className="voci-menu__tags" role="group" aria-label="Allergeni presenti">
                  {ALLERGENI_UE.map(a => {
                    const on = form.allergeni.includes(a.codice)
                    return (
                      <button
                        key={a.codice}
                        type="button"
                        aria-pressed={on}
                        className={clsx('voci-menu__tag', on && 'voci-menu__tag--on')}
                        onClick={() => toggleAllergene(a.codice)}
                      >
                        <span className="voci-menu__tag-cod">{a.codice}</span>
                        {a.nome}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* ── Outlet attivi ─────────────────────────────────────────── */}
              <section className="voci-menu__section">
                <h3 className="voci-menu__section-title">
                  <i className="fa-light fa-shop" aria-hidden="true" />
                  Outlet attivi
                  <span className="voci-menu__section-hint">vuoto = tutti gli outlet</span>
                </h3>
                <div className="voci-menu__tags" role="group" aria-label="Outlet attivi">
                  {OUTLET_FB.map(o => {
                    const on = form.outletIds.includes(o.id)
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={on}
                        className={clsx('voci-menu__tag', on && 'voci-menu__tag--on')}
                        onClick={() => toggleOutlet(o.id)}
                      >
                        <span className="voci-menu__tag-cod">{o.id}</span>
                        {o.nome}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* ── Stampanti ─────────────────────────────────────────────── */}
              <section className="voci-menu__section">
                <div className="voci-menu__section-head">
                  <h3 className="voci-menu__section-title">
                    <i className="fa-light fa-print" aria-hidden="true" />
                    Stampanti
                    <span className="voci-menu__section-hint">per outlet e contesto</span>
                  </h3>
                  <button
                    type="button"
                    className="sib-btn sib-btn--secondary sib-btn--sm"
                    onClick={addStampante}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Aggiungi
                  </button>
                </div>

                {form.stampanti.length === 0 ? (
                  <p className="voci-menu__section-empty">Nessuna stampante associata.</p>
                ) : form.stampanti.map((r, i) => (
                  <div key={r.rid} className="voci-menu__riga voci-menu__riga--stampante">
                    <SelectField
                      name={`stamp-outlet-${r.rid}`}
                      label={i === 0 ? 'Outlet' : undefined}
                      value={r.outletId == null ? '' : String(r.outletId)}
                      onChange={(e) => updStampante(r.rid, {
                        outletId: e.target.value === '' ? null : Number(e.target.value),
                        // Cambiando outlet la stampante scelta può non appartenergli più
                        stampanteId: '',
                      })}
                      options={[
                        { value: '', label: '— Outlet —' },
                        ...OUTLET_FB.map(o => ({ value: String(o.id), label: o.nome })),
                      ]}
                    />
                    <SelectField
                      name={`stamp-dev-${r.rid}`}
                      label={i === 0 ? 'Stampante' : undefined}
                      value={r.stampanteId}
                      onChange={(e) => updStampante(r.rid, { stampanteId: e.target.value })}
                      options={[
                        { value: '', label: '— Stampante —' },
                        ...stampanteOptions(r.outletId),
                      ]}
                    />
                    <SelectField
                      name={`stamp-ctx-${r.rid}`}
                      label={i === 0 ? 'Contesto' : undefined}
                      value={r.contesto}
                      onChange={(e) => updStampante(r.rid, { contesto: e.target.value as ContestoStampa })}
                      options={CONTESTI_STAMPA.map(c => ({ value: c.id, label: c.label }))}
                    />
                    <Tooltip content="Rimuovi stampante">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        onClick={() => delStampante(r.rid)}
                        aria-label="Rimuovi questa stampante"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </section>

              {/* ── Service monitor ───────────────────────────────────────── */}
              <section className="voci-menu__section">
                <div className="voci-menu__section-head">
                  <h3 className="voci-menu__section-title">
                    <i className="fa-light fa-display" aria-hidden="true" />
                    Service monitor
                    <span className="voci-menu__section-hint">reparti di destinazione</span>
                  </h3>
                  <button
                    type="button"
                    className="sib-btn sib-btn--secondary sib-btn--sm"
                    onClick={addMonitor}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Aggiungi
                  </button>
                </div>

                {form.monitor.length === 0 ? (
                  <p className="voci-menu__section-empty">
                    Nessun monitor: la voce non comparirà su alcun service monitor.
                  </p>
                ) : form.monitor.map((r, i) => (
                  <div key={r.rid} className="voci-menu__riga voci-menu__riga--monitor">
                    <SelectField
                      name={`mon-${r.rid}`}
                      label={i === 0 ? 'Monitor di destinazione' : undefined}
                      value={r.monitorId}
                      onChange={(e) => updMonitor(r.rid, e.target.value)}
                      options={[
                        { value: '', label: '— Seleziona monitor —' },
                        ...SERVICE_MONITOR_FB.map(m => ({ value: m.id, label: m.nome })),
                      ]}
                    />
                    <Tooltip content="Rimuovi monitor">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        onClick={() => delMonitor(r.rid)}
                        aria-label="Rimuovi questo monitor"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </section>

            </div>

            {/* Errore bloccante fuori dal corpo scrollabile: resta in vista
                anche quando il form è scorso in basso */}
            {duplicata && (
              <p className="voci-menu__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Esiste già «{duplicata.nomeIt}» nella categoria
                {' '}{categoriaNome(duplicata.categoriaId)}: cambia nome o categoria.
              </p>
            )}

            <div className="voci-menu__form-foot">
              <button
                type="button"
                className="sib-btn sib-btn--secondary"
                onClick={() => setModalOpen(false)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="sib-btn sib-btn--primary"
                disabled={!salvabile}
                onClick={salva}
              >
                Salva
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
