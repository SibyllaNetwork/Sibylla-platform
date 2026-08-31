import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import './BusinessCentral.sass'

// ─── BUSINESS CENTRAL (§4.24 — PDF §1.24–1.26) ────────────────────────────────
//  Integrazione contabile verso Microsoft Dynamics 365 Business Central.
//  Le tre aree del PDF (Documenti / Conti / Journal Batch) sono TAB interni:
//  sono tre configurazioni indipendenti tra loro, ognuna sta in una schermata
//  e i tab evitano una pagina-fiume con tre tabelle in sequenza (il vincolo
//  "una vista alla volta" tiene anche il contesto del selettore Struttura
//  sempre visibile). Copy riscritta come richiesto ("RIVEDERE COPY E FRONT").

type TabId = 'documenti' | 'conti' | 'journal'

interface DocumentoRow {
  id: string
  nome: string
  iniziale: string
  post: boolean
  invioAuto: boolean
}

interface ContoRow { id: number; tipologia: string; numero: string }

interface JournalRow {
  id: string
  codice: string
  voce: string
  codScel: string
  codFel: string
  journalBatch: string
}

interface Data {
  strutture: string[]
  documenti: DocumentoRow[]
  conti: {
    camera: ContoRow[]
    anticipo: ContoRow[]
    passante: ContoRow[]
  }
  tipologieCamera: string[]
  tipologieAnticipo: string[]
  journal: JournalRow[]
}

const FALLBACK: Data = {
  strutture: ['HOTEL DEI MILLE', "GRIM'S HOTEL", 'HOTEL PARKER'],
  documenti: [
    { id: 'fattura',    nome: 'Fattura',                iniziale: 'F', post: true,  invioAuto: true },
    { id: 'nota',       nome: 'Nota di credito',        iniziale: 'N', post: true,  invioAuto: false },
    { id: 'quietanza',  nome: 'Quietanza',              iniziale: 'Q', post: true,  invioAuto: false },
    { id: 'scontrino',  nome: 'Scontrino',              iniziale: 'S', post: false, invioAuto: false },
    { id: 'annullo',    nome: 'Annullamento scontrino', iniziale: 'A', post: false, invioAuto: false },
    { id: 'caparra',    nome: 'Caparra',                iniziale: 'C', post: true,  invioAuto: false },
    { id: 'reso',       nome: 'Reso caparra',           iniziale: 'R', post: false, invioAuto: false },
  ],
  conti: {
    camera: [{ id: 1, tipologia: 'Ricavi camera', numero: '400010' }],
    anticipo: [],
    passante: [],
  },
  tipologieCamera: ['Ricavi camera', 'Ricavi day use', 'Ricavi no-show'],
  tipologieAnticipo: ['Caparra confirmatoria', 'Acconto soggiorno', 'Anticipo gruppi'],
  journal: [
    { id: 'nexy',     codice: 'nexy',     voce: 'Carte di credito',  codScel: '2', codFel: 'MP08', journalBatch: 'INCASSI-POS' },
    { id: 'contanti', codice: 'contanti', voce: 'Contanti',          codScel: '–', codFel: '–',    journalBatch: '' },
    { id: 'bonifico', codice: 'bonifico', voce: 'Bonifico bancario', codScel: '3', codFel: 'MP05', journalBatch: '' },
  ],
}

const EMPTY_CONTO = { tipologia: '', numero: '' }

export default function BusinessCentral() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saved, setSaved] = useState<Data>(FALLBACK)
  const [struttura, setStruttura] = useState<string>(FALLBACK.strutture[0])
  const [tab, setTab] = useState<TabId>('documenti')

  // Form dei tre blocchi Conti
  const [formCamera, setFormCamera] = useState(EMPTY_CONTO)
  const [formAnticipo, setFormAnticipo] = useState(EMPTY_CONTO)
  const [formPassante, setFormPassante] = useState('')

  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)
  const confirm       = useConfirmStore(s => s.confirm)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBusinessCentral', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled) return
        setData(d)
        setSaved(d)
        if (d.strutture.length) setStruttura(d.strutture[0])
      })
      .catch(() => { /* fallback silenzioso */ })
    return () => { cancelled = true }
  }, [])

  // ── Dirty: righe documenti/journal cambiate + conti aggiunti/rimossi ────────
  const dirty = useMemo(() => {
    let n = 0
    const savedDoc = new Map(saved.documenti.map(d => [d.id, d]))
    n += data.documenti.filter(d => JSON.stringify(savedDoc.get(d.id)) !== JSON.stringify(d)).length
    const savedJr = new Map(saved.journal.map(j => [j.id, j]))
    n += data.journal.filter(j => JSON.stringify(savedJr.get(j.id)) !== JSON.stringify(j)).length
    for (const key of ['camera', 'anticipo', 'passante'] as const) {
      const savedIds = new Set(saved.conti[key].map(c => c.id))
      const dataIds = new Set(data.conti[key].map(c => c.id))
      n += data.conti[key].filter(c => !savedIds.has(c.id)).length
      n += saved.conti[key].filter(c => !dataIds.has(c.id)).length
    }
    return n
  }, [data, saved])

  useEffect(() => { markDirty('business-central', dirty) }, [dirty, markDirty])

  const persist = () => new Promise<void>((resolve) => {
    setTimeout(() => {
      setSaved(data)
      const hasConti = data.conti.camera.length > 0 && data.conti.anticipo.length > 0
      const journalOk = data.journal.every(j => j.journalBatch.trim() !== '')
      setCompletion('business-central', hasConti && journalOk ? 'configured' : 'partial')
      resetDirty()
      resolve()
    }, 450)
  })

  const cancel = () => {
    setData(saved)
    resetDirty()
  }

  // ── Documenti ────────────────────────────────────────────────────────────────
  const setDoc = (id: string, patch: Partial<DocumentoRow>) => {
    setData(d => ({ ...d, documenti: d.documenti.map(r => r.id === id ? { ...r, ...patch } : r) }))
  }

  const resetDoc = (id: string) => {
    const orig = saved.documenti.find(r => r.id === id)
    if (orig) setDoc(id, { post: orig.post, invioAuto: orig.invioAuto })
  }

  // ── Conti ────────────────────────────────────────────────────────────────────
  const addConto = (key: 'camera' | 'anticipo' | 'passante', tipologia: string, numero: string) => {
    if (!numero.trim()) return
    if (key !== 'passante' && !tipologia) return
    setData(d => ({
      ...d,
      conti: {
        ...d.conti,
        [key]: [...d.conti[key], {
          id: Date.now(),
          tipologia: key === 'passante' ? 'Conto passante' : tipologia,
          numero: numero.trim(),
        }],
      },
    }))
  }

  const removeConto = async (key: 'camera' | 'anticipo' | 'passante', conto: ContoRow) => {
    const ok = await confirm({
      title: 'Elimina conto',
      message: `Eliminare il conto ${conto.numero} (${conto.tipologia})? I movimenti collegati non verranno più registrati su questo conto.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setData(d => ({ ...d, conti: { ...d.conti, [key]: d.conti[key].filter(c => c.id !== conto.id) } }))
  }

  // ── Journal Batch ────────────────────────────────────────────────────────────
  const setJournal = (id: string, journalBatch: string) => {
    setData(d => ({ ...d, journal: d.journal.map(j => j.id === id ? { ...j, journalBatch } : j) }))
  }

  const resetJournal = (id: string) => {
    const orig = saved.journal.find(j => j.id === id)
    if (orig) setJournal(id, orig.journalBatch)
  }

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'documenti', label: 'Documenti', icon: 'file-lines' },
    { id: 'conti', label: 'Conti', icon: 'book-open' },
    { id: 'journal', label: 'Journal Batch', icon: 'list-check' },
  ]

  return (
    <div className="cfg-bc">
      <CfgToolbar>
        <SelectField
          name="bc-struttura"
          label="Struttura"
          value={struttura}
          onChange={(e) => setStruttura(e.target.value)}
          options={data.strutture.map(s => ({ value: s, label: s }))}
        />
      </CfgToolbar>

      <div className="cfg-bc__tabs" role="tablist" aria-label="Sezioni Business Central">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`cfg-bc__tab${tab === t.id ? ' cfg-bc__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-light fa-${t.icon}`} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'documenti' && (
        <section className="cfg-bc__section">
          <p className="cfg-bc__section-desc">
            Scegli quali documenti vengono registrati in Business Central (PostDocument) e quali
            partono da soli alla chiusura del conto (Invio automatico).
          </p>
          <CfgTable
            columns={[
              { key: 'doc', label: 'Documento', width: '40%' },
              { key: 'post', label: 'PostDocument', width: '20%' },
              { key: 'auto', label: 'Invio automatico', width: '20%' },
              { key: 'azioni', label: 'Azioni', width: '20%', align: 'right' },
            ]}
          >
            {data.documenti.map((doc) => {
              const orig = saved.documenti.find(r => r.id === doc.id)
              const changed = !!orig && (orig.post !== doc.post || orig.invioAuto !== doc.invioAuto)
              return (
                <tr key={doc.id}>
                  <td>
                    <span className="cfg-bc__doc">
                      <span className="cfg-bc__doc-initial" aria-hidden="true">{doc.iniziale}</span>
                      <TruncatedText text={doc.nome} className="cfg-bc__cell-text" />
                    </span>
                  </td>
                  <td>
                    <ToggleSwitch
                      checked={doc.post}
                      onChange={(checked) => setDoc(doc.id, { post: checked, invioAuto: checked ? doc.invioAuto : false })}
                    />
                  </td>
                  <td>
                    <ToggleSwitch
                      checked={doc.invioAuto}
                      disabled={!doc.post}
                      onChange={(checked) => setDoc(doc.id, { invioAuto: checked })}
                    />
                  </td>
                  <td className="cfg-bc__actions-cell">
                    <Tooltip text={changed ? 'Ripristina i valori salvati' : 'Nessuna modifica su questa riga'}>
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        disabled={!changed}
                        onClick={() => resetDoc(doc.id)}
                        aria-label={`Ripristina ${doc.nome}`}
                      >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          </CfgTable>
        </section>
      )}

      {tab === 'conti' && (
        <section className="cfg-bc__section">
          <p className="cfg-bc__section-desc">
            Collega i movimenti del gestionale ai conti di contabilità generale: ricavi camera,
            anticipi e partite di giro (conto passante).
          </p>

          <ContoBlock
            title="Conto camera"
            form={(
              <>
                <SelectField
                  name="bc-tip-camera"
                  label="Tipologia conto camera"
                  placeholder="Seleziona una tipologia"
                  value={formCamera.tipologia}
                  onChange={(e) => setFormCamera({ ...formCamera, tipologia: e.target.value })}
                  options={data.tipologieCamera.map(t => ({ value: t, label: t }))}
                />
                <InputField
                  name="bc-num-camera"
                  label="Numero conto"
                  placeholder="Es. 400010"
                  value={formCamera.numero}
                  onChange={(e) => setFormCamera({ ...formCamera, numero: e.target.value })}
                />
              </>
            )}
            canSave={!!formCamera.tipologia && !!formCamera.numero.trim()}
            onSave={() => { addConto('camera', formCamera.tipologia, formCamera.numero); setFormCamera(EMPTY_CONTO) }}
            onClear={() => setFormCamera(EMPTY_CONTO)}
            rows={data.conti.camera}
            onRemove={(c) => { void removeConto('camera', c) }}
          />

          <ContoBlock
            title="Anticipo"
            form={(
              <>
                <SelectField
                  name="bc-tip-anticipo"
                  label="Tipologia anticipo"
                  placeholder="Seleziona una tipologia"
                  value={formAnticipo.tipologia}
                  onChange={(e) => setFormAnticipo({ ...formAnticipo, tipologia: e.target.value })}
                  options={data.tipologieAnticipo.map(t => ({ value: t, label: t }))}
                />
                <InputField
                  name="bc-num-anticipo"
                  label="Numero conto"
                  placeholder="Es. 240020"
                  value={formAnticipo.numero}
                  onChange={(e) => setFormAnticipo({ ...formAnticipo, numero: e.target.value })}
                />
              </>
            )}
            canSave={!!formAnticipo.tipologia && !!formAnticipo.numero.trim()}
            onSave={() => { addConto('anticipo', formAnticipo.tipologia, formAnticipo.numero); setFormAnticipo(EMPTY_CONTO) }}
            onClear={() => setFormAnticipo(EMPTY_CONTO)}
            rows={data.conti.anticipo}
            onRemove={(c) => { void removeConto('anticipo', c) }}
          />

          <ContoBlock
            title="Conto passante"
            form={(
              <InputField
                name="bc-num-passante"
                label="Numero conto"
                placeholder="Es. 188000"
                value={formPassante}
                onChange={(e) => setFormPassante(e.target.value)}
              />
            )}
            canSave={!!formPassante.trim()}
            onSave={() => { addConto('passante', '', formPassante); setFormPassante('') }}
            onClear={() => setFormPassante('')}
            rows={data.conti.passante}
            onRemove={(c) => { void removeConto('passante', c) }}
          />
        </section>
      )}

      {tab === 'journal' && (
        <section className="cfg-bc__section">
          <p className="cfg-bc__section-desc">
            Assegna a ogni codice d'incasso il journal batch di Business Central su cui
            registrare i movimenti: senza journal batch la voce resta da configurare.
          </p>
          <CfgTable
            columns={[
              { key: 'codice', label: 'Codice incasso', width: '14%' },
              { key: 'voce', label: 'Voce incasso', width: '22%' },
              { key: 'scel', label: 'Cod. SCEL', width: '10%' },
              { key: 'fel', label: 'Cod. FEL', width: '10%' },
              { key: 'stato', label: 'Stato', width: '16%' },
              { key: 'jb', label: 'JournalBatch', width: '18%' },
              { key: 'azioni', label: 'Azioni', width: '10%', align: 'right' },
            ]}
          >
            {data.journal.map((j) => {
              const configured = j.journalBatch.trim() !== ''
              const orig = saved.journal.find(r => r.id === j.id)
              const changed = !!orig && orig.journalBatch !== j.journalBatch
              return (
                <tr key={j.id}>
                  <td>{j.codice}</td>
                  <td><TruncatedText text={j.voce} className="cfg-bc__cell-text" /></td>
                  <td className="sib-cell--muted">{j.codScel}</td>
                  <td className="sib-cell--muted">{j.codFel}</td>
                  <td>
                    {configured
                      ? <span className="cfg-bc__badge cfg-bc__badge--ok">Attivo</span>
                      : <span className="cfg-bc__badge cfg-bc__badge--todo">Da configurare</span>}
                  </td>
                  <td>
                    <InputField
                      name={`jb-${j.id}`}
                      placeholder="Es. INCASSI-POS"
                      value={j.journalBatch}
                      onChange={(e) => setJournal(j.id, e.target.value.toUpperCase())}
                      className="cfg-bc__jb-input"
                    />
                  </td>
                  <td className="cfg-bc__actions-cell">
                    <Tooltip text={changed ? 'Ripristina il valore salvato' : 'Nessuna modifica su questa riga'}>
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        disabled={!changed}
                        onClick={() => resetJournal(j.id)}
                        aria-label={`Ripristina journal batch di ${j.codice}`}
                      >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          </CfgTable>
        </section>
      )}

      <CfgSaveBar
        count={dirty}
        onSave={persist}
        onCancel={cancel}
        successMessage="Configurazione Business Central salvata"
      />
    </div>
  )
}

// ─── Blocco "form + tabella" della sezione Conti ──────────────────────────────
function ContoBlock({ title, form, canSave, onSave, onClear, rows, onRemove }: {
  title: string
  form: React.ReactNode
  canSave: boolean
  onSave: () => void
  onClear: () => void
  rows: ContoRow[]
  onRemove: (c: ContoRow) => void
}) {
  return (
    <div className="cfg-bc__conto-block">
      <h3 className="cfg-bc__conto-title">{title}</h3>
      <div className="cfg-bc__conto-form">
        {form}
        <div className="cfg-bc__conto-form-actions">
          <button type="button" className="sib-btn sib-btn--primary" disabled={!canSave} onClick={onSave}>
            <i className="fa-light fa-floppy-disk" aria-hidden="true" /> Salva
          </button>
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClear}>
            <i className="fa-light fa-eraser" aria-hidden="true" /> Pulisci
          </button>
        </div>
      </div>
      <CfgTable
        columns={[
          { key: 'tipologia', label: 'Tipologia', width: '45%' },
          { key: 'numero', label: 'Numero conto', width: '35%' },
          { key: 'azioni', label: 'Azioni', width: '20%', align: 'right' },
        ]}
        empty={<span className="cfg-table__empty-text">Nessun conto configurato</span>}
      >
        {rows.map((c) => (
          <tr key={c.id}>
            <td><TruncatedText text={c.tipologia} className="cfg-bc__cell-text" /></td>
            <td>{c.numero}</td>
            <td className="cfg-bc__actions-cell">
              <Tooltip text="Elimina conto">
                <button
                  type="button"
                  className="sib-btn sib-btn--icon"
                  onClick={() => onRemove(c)}
                  aria-label={`Elimina conto ${c.numero}`}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </Tooltip>
            </td>
          </tr>
        ))}
      </CfgTable>
    </div>
  )
}
