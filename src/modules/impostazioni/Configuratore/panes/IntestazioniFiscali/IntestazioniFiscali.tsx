import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import './IntestazioniFiscali.sass'

// ─── INTESTAZIONI FISCALI (§4.23) ─────────────────────────────────────────────
//  Anagrafica delle intestazioni fiscali + mapping per struttura: documenti
//  fiscali e flussi amministrativi vengono emessi con l'intestazione indicata
//  qui (quella dedicata alla struttura, o la predefinita aziendale).

interface Intestazione {
  id: number
  ragioneSociale: string
  partitaIva: string
  sdi: string
  pec: string
  rea: string
  attiva: boolean
  predefinita: boolean
}

interface MappingRow {
  struttura: string
  /** null = usa l'intestazione predefinita aziendale. */
  intestazioneId: number | null
}

interface Data {
  intestazioni: Intestazione[]
  mapping: MappingRow[]
}

const FALLBACK: Data = {
  intestazioni: [
    {
      id: 1, ragioneSociale: 'Sibylla S.r.l.', partitaIva: '80979970466',
      sdi: 'M5UXCR1', pec: 'amministrazione@pec.sibylla.it', rea: 'Non emessi',
      attiva: true, predefinita: true,
    },
    {
      id: 2, ragioneSociale: 'PlayWorld S.R.L.S.', partitaIva: '80979970466',
      sdi: 'M5UXCR1', pec: 'playworld@pec.it', rea: 'Non emessi',
      attiva: true, predefinita: false,
    },
  ],
  mapping: [
    { struttura: 'HOTEL DEI MILLE', intestazioneId: null },
    { struttura: "GRIM'S HOTEL", intestazioneId: null },
    { struttura: 'HOTEL PARKER', intestazioneId: 2 },
  ],
}

const EMPTY_FORM = { ragioneSociale: '', partitaIva: '', sdi: '', pec: '', rea: '', attiva: true }
type FormState = typeof EMPTY_FORM

export default function IntestazioniFiscali() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saved, setSaved] = useState<Data>(FALLBACK)

  // Modale crea/modifica: null = chiusa, 'new' = nuova, number = id in modifica
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)
  const confirm       = useConfirmStore(s => s.confirm)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetIntestazioniFiscali', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setData(d); setSaved(d) } })
      .catch(() => { /* fallback silenzioso */ })
    return () => { cancelled = true }
  }, [])

  // ── Dirty: intestazioni aggiunte/modificate/eliminate + mapping cambiati ────
  const dirty = useMemo(() => {
    let n = 0
    const savedById = new Map(saved.intestazioni.map(i => [i.id, i]))
    for (const i of data.intestazioni) {
      const s = savedById.get(i.id)
      if (!s || JSON.stringify(s) !== JSON.stringify(i)) n += 1
    }
    n += saved.intestazioni.filter(s => !data.intestazioni.some(i => i.id === s.id)).length
    const savedMap = new Map(saved.mapping.map(m => [m.struttura, m.intestazioneId]))
    n += data.mapping.filter(m => savedMap.get(m.struttura) !== m.intestazioneId).length
    return n
  }, [data, saved])

  useEffect(() => { markDirty('intestazioni-fiscali', dirty) }, [dirty, markDirty])

  const persist = () => new Promise<void>((resolve) => {
    setTimeout(() => {
      setSaved(data)
      setCompletion('intestazioni-fiscali', data.intestazioni.length > 0 ? 'configured' : 'empty')
      resetDirty()
      resolve()
    }, 450)
  })

  const cancel = () => {
    setData(saved)
    resetDirty()
  }

  // ── Azioni intestazioni ──────────────────────────────────────────────────────
  const openNew = () => { setForm(EMPTY_FORM); setEditing('new') }

  const openEdit = (i: Intestazione) => {
    setForm({ ragioneSociale: i.ragioneSociale, partitaIva: i.partitaIva, sdi: i.sdi, pec: i.pec, rea: i.rea, attiva: i.attiva })
    setEditing(i.id)
  }

  const submitForm = () => {
    if (!form.ragioneSociale.trim() || !form.partitaIva.trim()) return
    if (editing === 'new') {
      const first = data.intestazioni.length === 0
      setData(d => ({
        ...d,
        intestazioni: [...d.intestazioni, {
          id: Date.now(), ...form, rea: form.rea.trim() || 'Non emessi', predefinita: first,
        }],
      }))
    } else if (typeof editing === 'number') {
      setData(d => ({
        ...d,
        intestazioni: d.intestazioni.map(i => i.id === editing
          ? { ...i, ...form, rea: form.rea.trim() || 'Non emessi' }
          : i),
      }))
    }
    setEditing(null)
  }

  const setPredefinita = (id: number) => {
    setData(d => ({
      ...d,
      intestazioni: d.intestazioni.map(i => ({ ...i, predefinita: i.id === id })),
    }))
  }

  const remove = async (i: Intestazione) => {
    const ok = await confirm({
      title: 'Elimina intestazione',
      message: `Eliminare l'intestazione "${i.ragioneSociale}"? Le strutture che la usano torneranno al predefinito aziendale.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setData(d => ({
      ...d,
      intestazioni: d.intestazioni.filter(x => x.id !== i.id),
      mapping: d.mapping.map(m => m.intestazioneId === i.id ? { ...m, intestazioneId: null } : m),
    }))
  }

  // ── Mapping strutture ────────────────────────────────────────────────────────
  const setMapping = (struttura: string, value: string) => {
    setData(d => ({
      ...d,
      mapping: d.mapping.map(m => m.struttura === struttura
        ? { ...m, intestazioneId: value === '' ? null : Number(value) }
        : m),
    }))
  }

  const predefinita = data.intestazioni.find(i => i.predefinita)

  return (
    <div className="cfg-intestazioni">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={openNew}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" /> Nuova intestazione
          </button>
        )}
      >
        <p className="cfg-intestazioni__lead">
          Le intestazioni definite qui compaiono su fatture, quietanze e flussi amministrativi.
        </p>
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'stato', label: 'Stato', width: '16%' },
          { key: 'ragione', label: 'Ragione sociale', width: '22%' },
          { key: 'piva', label: 'Partita IVA', width: '14%' },
          { key: 'sdipec', label: 'SDI / PEC', width: '24%' },
          { key: 'rea', label: 'REA', width: '11%' },
          { key: 'azioni', label: 'Azioni', width: '13%', align: 'right' },
        ]}
        empty={<span className="cfg-table__empty-text">Nessuna intestazione fiscale: creane una con “Nuova intestazione”.</span>}
      >
        {data.intestazioni.map((i) => (
          <tr key={i.id}>
            <td>
              <span className="cfg-intestazioni__badges">
                {i.attiva
                  ? <span className="cfg-intestazioni__badge cfg-intestazioni__badge--attivo">Attivo</span>
                  : <span className="cfg-intestazioni__badge cfg-intestazioni__badge--spento">Non attivo</span>}
                {i.predefinita && (
                  <span className="cfg-intestazioni__badge cfg-intestazioni__badge--predefinito">Predefinito</span>
                )}
              </span>
            </td>
            <td><TruncatedText text={i.ragioneSociale} className="cfg-intestazioni__cell-text" /></td>
            <td>{i.partitaIva}</td>
            <td><TruncatedText text={`${i.sdi} · ${i.pec}`} className="cfg-intestazioni__cell-text" /></td>
            <td className="sib-cell--muted">{i.rea}</td>
            <td className="cfg-intestazioni__actions-cell">
              <Tooltip text="Modifica intestazione">
                <button type="button" className="sib-btn sib-btn--icon" onClick={() => openEdit(i)} aria-label={`Modifica ${i.ragioneSociale}`}>
                  <i className="fa-solid fa-pen" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text={i.predefinita ? 'Intestazione predefinita' : 'Imposta come predefinita'}>
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  disabled={i.predefinita}
                  onClick={() => setPredefinita(i.id)}
                  aria-label={`Imposta ${i.ragioneSociale} come predefinita`}
                >
                  <i className={i.predefinita ? 'fa-solid fa-star' : 'fa-regular fa-star'} aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text={i.predefinita ? 'La predefinita non si può eliminare' : 'Elimina intestazione'}>
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  disabled={i.predefinita}
                  onClick={() => { void remove(i) }}
                  aria-label={`Elimina ${i.ragioneSociale}`}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>

      <section className="cfg-intestazioni__mapping">
        <h3 className="cfg-intestazioni__section-title">Mapping strutture</h3>
        <p className="cfg-intestazioni__section-desc">
          Ogni struttura emette con l'intestazione predefinita aziendale
          {predefinita ? ` (${predefinita.ragioneSociale})` : ''}, salvo un'assegnazione dedicata.
        </p>

        <CfgTable
          columns={[
            { key: 'struttura', label: 'Struttura', width: '32%' },
            { key: 'intestazione', label: 'Intestazione', width: '32%' },
            { key: 'stato', label: 'Stato', width: '22%' },
            { key: 'azioni', label: 'Azioni', width: '14%', align: 'right' },
          ]}
          empty={<span className="cfg-table__empty-text">Nessuna struttura da mappare.</span>}
        >
          {data.mapping.map((m) => (
            <tr key={m.struttura}>
              <td><TruncatedText text={m.struttura} className="cfg-intestazioni__cell-text" /></td>
              <td>
                <SelectField
                  name={`map-${m.struttura}`}
                  value={m.intestazioneId ?? ''}
                  onChange={(e) => setMapping(m.struttura, e.target.value)}
                  options={[
                    { value: '', label: 'Predefinito aziendale' },
                    ...data.intestazioni.filter(i => i.attiva).map(i => ({ value: i.id, label: i.ragioneSociale })),
                  ]}
                  className="cfg-intestazioni__map-select"
                />
              </td>
              <td>
                {m.intestazioneId == null
                  ? <span className="cfg-intestazioni__badge cfg-intestazioni__badge--spento">Predefinita</span>
                  : <span className="cfg-intestazioni__badge cfg-intestazioni__badge--attivo">Dedicata</span>}
              </td>
              <td className="cfg-intestazioni__actions-cell">
                <Tooltip text={m.intestazioneId == null ? 'Usa già il predefinito aziendale' : 'Ripristina il predefinito aziendale'}>
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    disabled={m.intestazioneId == null}
                    onClick={() => setMapping(m.struttura, '')}
                    aria-label={`Ripristina predefinito per ${m.struttura}`}
                  >
                    <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      <CfgSaveBar
        count={dirty}
        onSave={persist}
        onCancel={cancel}
        successMessage="Intestazioni fiscali salvate"
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Nuova intestazione' : 'Modifica intestazione'}
        size="md"
        className="cfg-intestazioni-modal"
      >
        <div className="cfg-intestazioni-modal__body">
          <InputField
            name="int-ragione" label="Ragione sociale" required
            placeholder="Es. Sibylla S.r.l."
            value={form.ragioneSociale}
            onChange={(e) => setForm({ ...form, ragioneSociale: e.target.value })}
          />
          <div className="cfg-intestazioni-modal__row">
            <InputField
              name="int-piva" label="Partita IVA" required
              placeholder="11 cifre" maxLength={11}
              value={form.partitaIva}
              onChange={(e) => setForm({ ...form, partitaIva: e.target.value })}
            />
            <InputField
              name="int-rea" label="REA"
              placeholder="Non emessi"
              value={form.rea}
              onChange={(e) => setForm({ ...form, rea: e.target.value })}
            />
          </div>
          <div className="cfg-intestazioni-modal__row">
            <InputField
              name="int-sdi" label="Codice SDI"
              placeholder="Es. M5UXCR1" maxLength={7}
              value={form.sdi}
              onChange={(e) => setForm({ ...form, sdi: e.target.value.toUpperCase() })}
            />
            <InputField
              name="int-pec" label="PEC" type="email"
              placeholder="nome@pec.it"
              value={form.pec}
              onChange={(e) => setForm({ ...form, pec: e.target.value })}
            />
          </div>
          <ToggleSwitch
            label="Intestazione attiva"
            description="Solo le intestazioni attive sono assegnabili alle strutture."
            checked={form.attiva}
            onChange={(checked) => setForm({ ...form, attiva: checked })}
          />
        </div>
        <div className="cfg-intestazioni-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setEditing(null)}>Annulla</button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            disabled={!form.ragioneSociale.trim() || !form.partitaIva.trim()}
            onClick={submitForm}
          >
            {editing === 'new' ? 'Crea intestazione' : 'Salva modifiche'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
