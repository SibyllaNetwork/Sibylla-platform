import React, { useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { InputField, SelectField, DatePickerField } from '../../../core/components/form'
import { withFlag } from '../../../core/utils/countryFlags'
import { apiFetchSibylla } from '../../../services/api'
import { useContrattiPersonaleStore } from '../../../store/useContrattiPersonaleStore'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { getEditingAnagrafica, clearEditingAnagrafica } from './_state'
import './CreaAnagrafica.sass'

/**
 * Crea anagrafica personale — scheda del dipendente (stile "scheda personale",
 * sezioni raggruppate) anziché il vecchio layout "profilo" con avatar dominante.
 * BE: `anagrafica-personale/Insert`.
 */

const SESSI = [
  { value: '', label: 'Seleziona sesso' },
  { value: 'M', label: 'Maschio' },
  { value: 'F', label: 'Femmina' },
  { value: 'A', label: 'Altro' },
]

const NAZIONALITA = ['ITALIA', 'FRANCIA', 'GERMANIA', 'SPAGNA', 'REGNO UNITO', 'STATI UNITI', 'ALBANIA', 'ROMANIA', 'MAROCCO', 'CINA']
const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']
const FASCE_TURNI = ['Mattina', 'Pomeriggio', 'Notte', 'Spezzato']
const REPARTI = ['Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Amministrazione', 'Marketing', 'Direzione', 'Cucina']
const CREDENZIALI = ['Nessuna', 'Operatore base', 'Operatore avanzato', 'Manager']
const TIPOLOGIE_CONTRATTO = [
  'Tempo indeterminato', 'Tempo determinato', 'Stagionale', 'Apprendistato',
  'Somministrazione', 'Collaborazione (Co.co.co.)', 'Tirocinio / Stage', 'Part-time', 'Intermittente',
]
const LIVELLI_CONTRATTO = ['1° livello', '2° livello', '3° livello', '4° livello', '5° livello', '6° livello', 'Quadro', 'Dirigente']

// Sezione comprimibile: header cliccabile (icona + titolo + chevron) per
// espandere/richiudere e recuperare spazio verticale; `actions` è uno slot a
// destra dell'header (es. il pulsante "Storico" dei Contratti) che non innesca
// il toggle.
function Section({ icon, title, actions, defaultOpen = true, children }: {
  icon: string; title: string; actions?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`crea-anag__section${open ? '' : ' crea-anag__section--collapsed'}`}>
      <header className="crea-anag__section-head">
        <button
          type="button"
          className="crea-anag__section-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <i className={`fa-duotone ${icon}`} aria-hidden="true" />
          <h3>{title}</h3>
          <i className={`fa-solid fa-chevron-down crea-anag__section-chev${open ? '' : ' is-collapsed'}`} aria-hidden="true" />
        </button>
        {actions && <div className="crea-anag__section-actions">{actions}</div>}
      </header>
      {open && <div className="crea-anag__section-body">{children}</div>}
    </section>
  )
}

interface AcqFile { name: string; dataUrl?: string }

// NB: il "Contratto di lavoro" NON è più qui — è gestito nella sezione
// "Contratti del personale" (con tipologia/RAL/storico + PDF).
type DocKey = 'identita' | 'codiceFiscale' | 'privacy' | 'sicurezza'
const DOC_SLOTS: { key: DocKey; label: string }[] = [
  { key: 'identita',      label: "Documento d'identità" },
  { key: 'codiceFiscale', label: 'Codice fiscale / Tessera sanitaria' },
  { key: 'privacy',       label: 'Informativa privacy' },
  { key: 'sicurezza',     label: 'Formazione sicurezza' },
]

const viewDoc = (f: AcqFile) => { if (f.dataUrl) window.open(f.dataUrl, '_blank') }
const printDoc = (f: AcqFile) => {
  if (!f.dataUrl) return
  const w = window.open('', '_blank')
  if (w) { w.document.write(`<img src="${f.dataUrl}" style="max-width:100%" onload="window.focus();window.print()" />`); w.document.close() }
}

// Riga documento: etichetta + stato; se presente mostra file con azioni
// (visualizza / stampa / elimina); le opzioni di acquisizione (Scanner / File /
// Fotocamera) sono sempre disponibili (per inserire o sostituire).
function DocSlot({ label, value, onAcquire, onRemove }: {
  label: string; value: AcqFile | null; onAcquire: (f: AcqFile) => void; onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = () => onAcquire({ name: f.name, dataUrl: r.result as string })
      r.readAsDataURL(f)
    } else onAcquire({ name: f.name })
  }
  return (
    <div className="crea-anag__doc-row">
      <div className="crea-anag__doc-row-label">
        <span className="crea-anag__doc-row-title">{label}</span>
        {value
          ? <span className="crea-anag__doc-badge crea-anag__doc-badge--ok"><i className="fa-solid fa-circle-check" /> Caricato</span>
          : <span className="crea-anag__doc-badge crea-anag__doc-badge--ko"><i className="fa-solid fa-triangle-exclamation" /> Mancante</span>}
      </div>
      <div className="crea-anag__doc-row-main">
        {value && (
          <span className="crea-anag__doc-file">
            {value.dataUrl
              ? <img className="crea-anag__doc-thumb" src={value.dataUrl} alt={value.name} />
              : <i className="fa-light fa-file-lines crea-anag__doc-ico" />}
            <span className="crea-anag__doc-name" title={value.name}>{value.name}</span>
            <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" onClick={() => viewDoc(value)}><i className="fa-light fa-eye" /></button>
            <button type="button" className="sib-btn sib-btn--icon" title="Stampa" onClick={() => printDoc(value)}><i className="fa-light fa-print" /></button>
            <button type="button" className="sib-btn sib-btn--icon" title="Elimina" onClick={onRemove}><i className="fa-light fa-trash-can" /></button>
          </span>
        )}
        <span className="crea-anag__doc-ins">
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" title={value ? 'Sostituisci da scanner' : 'Scanner'} onClick={() => fileRef.current?.click()}><i className="fa-light fa-scanner-image" /> Scanner</button>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" title={value ? 'Sostituisci da file' : 'File'} onClick={() => fileRef.current?.click()}><i className="fa-light fa-folder-open" /> File</button>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" title={value ? 'Sostituisci da fotocamera' : 'Fotocamera'} onClick={() => camRef.current?.click()}><i className="fa-light fa-camera" /> Foto</button>
        </span>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      </div>
    </div>
  )
}

// ─── Contratti del personale ────────────────────────────────────────────────
// Sezione dedicata al caricamento del contratto (operativo: ruolo, livello,
// retribuzione) collegata all'anagrafica. Ogni variazione contrattuale è un
// nuovo record dello storico (pulsante "Storico" in alto a destra). Il PDF
// caricato è quello poi visualizzabile dall'"Archivio del personale".
const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

function ContrattiSection({ anagraficaId, nomeDefault }: { anagraficaId: string; nomeDefault: string }) {
  // sottoscrivo l'array così la lista si aggiorna a ogni add/remove
  const contratti = useContrattiPersonaleStore((s) => s.contratti)
  const addContratto = useContrattiPersonaleStore((s) => s.addContratto)
  const removeContratto = useContrattiPersonaleStore((s) => s.removeContratto)
  const confirm = useConfirmStore((s) => s.confirm)

  const storico = [...contratti]
    .filter((r) => r.anagraficaId === anagraficaId)
    .sort((a, b) => (b.decorrenza ?? b.createdAt).localeCompare(a.decorrenza ?? a.createdAt))
  const [showStorico, setShowStorico] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pdfRef = useRef<HTMLInputElement>(null)
  const [pdf, setPdf] = useState<AcqFile | null>(null)
  const [c, setC] = useState({
    nomeImpiegato: nomeDefault,
    ruolo: '', livello: '', tipologia: '', ral: '', decorrenza: '', note: '',
  })
  const setField = (k: keyof typeof c, v: string) => setC((p) => ({ ...p, [k]: v }))

  const onPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => setPdf({ name: f.name, dataUrl: r.result as string })
    r.readAsDataURL(f)
  }

  const aggiungiVariazione = () => {
    if (!c.tipologia) { setError('Seleziona la tipologia del contratto.'); return }
    if (!pdf) { setError('Carica il PDF del contratto.'); return }
    setError(null)
    addContratto({
      anagraficaId,
      nomeImpiegato: c.nomeImpiegato || nomeDefault,
      ruolo: c.ruolo, livello: c.livello, tipologia: c.tipologia, ral: c.ral,
      decorrenza: c.decorrenza, note: c.note,
      pdfName: pdf.name, pdfDataUrl: pdf.dataUrl,
    })
    setC({ nomeImpiegato: nomeDefault, ruolo: '', livello: '', tipologia: '', ral: '', decorrenza: '', note: '' })
    setPdf(null)
    setShowStorico(true)
  }

  const elimina = async (id: string) => {
    if (await confirm({ message: 'Eliminare questa variazione contrattuale dallo storico?', danger: true })) {
      removeContratto(id)
    }
  }

  return (
    <Section
      icon="fa-file-contract"
      title="Contratti del personale"
      actions={
        <button
          type="button"
          className="sib-btn sib-btn--secondary sib-btn--sm"
          onClick={() => setShowStorico((s) => !s)}
        >
          <i className={`fa-light ${showStorico ? 'fa-chevron-up' : 'fa-clock-rotate-left'}`} /> Storico
          {storico.length > 0 && <span className="crea-anag__ctr-count">{storico.length}</span>}
        </button>
      }
    >
      {error && <p className="crea-anag__error"><i className="fa-light fa-circle-exclamation" /> {error}</p>}

      {/* Nuova variazione contrattuale */}
      <div className="crea-anag__grid crea-anag__grid--3">
        <InputField  name="ctr_nome"      label="Nome impiegato"          value={c.nomeImpiegato} onChange={(e) => setField('nomeImpiegato', e.target.value)} />
        <InputField  name="ctr_ruolo"     label="Ruolo"                   value={c.ruolo}         onChange={(e) => setField('ruolo', e.target.value)} placeholder="es. Addetto ricevimento" />
        <SelectField name="ctr_livello"   label="Livello"                 value={c.livello}       onChange={(e) => setField('livello', e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...LIVELLI_CONTRATTO.map((l) => ({ value: l, label: l }))]} />
        <SelectField name="ctr_tipologia" label="Tipologia del contratto" value={c.tipologia}     onChange={(e) => setField('tipologia', e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...TIPOLOGIE_CONTRATTO.map((t) => ({ value: t, label: t }))]} />
        <InputField  name="ctr_ral"       label="RAL (€)"                 value={c.ral}           onChange={(e) => setField('ral', e.target.value)} placeholder="es. 28.000" iconLeft="fa-light fa-euro-sign" />
        <DatePickerField name="ctr_decorrenza" label="Decorrenza"         value={c.decorrenza}    onChange={(e) => setField('decorrenza', e.target.value)} />
      </div>

      {/* Caricamento PDF del contratto */}
      <div className="crea-anag__ctr-pdf">
        <div className="crea-anag__ctr-pdf-label">
          <span className="crea-anag__doc-row-title">Contratto (PDF)</span>
          {pdf
            ? <span className="crea-anag__doc-badge crea-anag__doc-badge--ok"><i className="fa-solid fa-circle-check" /> Caricato</span>
            : <span className="crea-anag__doc-badge crea-anag__doc-badge--ko"><i className="fa-solid fa-triangle-exclamation" /> Da caricare</span>}
        </div>
        <div className="crea-anag__ctr-pdf-main">
          {pdf && (
            <span className="crea-anag__doc-file">
              <i className="fa-light fa-file-pdf crea-anag__doc-ico" />
              <span className="crea-anag__doc-name" title={pdf.name}>{pdf.name}</span>
              {pdf.dataUrl && <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" onClick={() => window.open(pdf.dataUrl!, '_blank')}><i className="fa-light fa-eye" /></button>}
              <button type="button" className="sib-btn sib-btn--icon" title="Rimuovi" onClick={() => setPdf(null)}><i className="fa-light fa-trash-can" /></button>
            </span>
          )}
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => pdfRef.current?.click()}>
            <i className="fa-light fa-folder-open" /> {pdf ? 'Sostituisci PDF' : 'Carica PDF'}
          </button>
          <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={onPdf} />
        </div>
      </div>

      <div className="crea-anag__ctr-add">
        <button type="button" className="sib-btn sib-btn--primary" onClick={aggiungiVariazione}>
          <i className="fa-light fa-circle-plus" /> Aggiungi variazione contrattuale
        </button>
      </div>

      {/* Storico delle variazioni */}
      {showStorico && (
        <div className="crea-anag__ctr-storico">
          <h4 className="crea-anag__ctr-storico-title"><i className="fa-light fa-clock-rotate-left" /> Storico contrattuale</h4>
          {storico.length === 0 ? (
            <p className="crea-anag__ctr-empty">Nessun contratto registrato per questo profilo.</p>
          ) : (
            <ul className="crea-anag__ctr-list">
              {storico.map((r, i) => (
                <li key={r.id} className="crea-anag__ctr-item">
                  <div className="crea-anag__ctr-item-main">
                    {i === 0 && <span className="crea-anag__ctr-tag">Vigente</span>}
                    <span className="crea-anag__ctr-item-tip">{r.tipologia}</span>
                    <span className="crea-anag__ctr-item-meta">
                      {r.ruolo || '—'}{r.livello ? ` · ${r.livello}` : ''} · RAL € {r.ral || '—'} · dal {fmtDate(r.decorrenza)}
                    </span>
                  </div>
                  <div className="crea-anag__ctr-item-acts">
                    {r.pdfName && (
                      <span className="crea-anag__ctr-item-pdf" title={r.pdfName}><i className="fa-light fa-file-pdf" /> {r.pdfName}</span>
                    )}
                    {r.pdfDataUrl && (
                      <button type="button" className="sib-btn sib-btn--icon" title="Visualizza PDF" onClick={() => window.open(r.pdfDataUrl!, '_blank')}><i className="fa-light fa-eye" /></button>
                    )}
                    <button type="button" className="sib-btn sib-btn--icon" title="Elimina variazione" onClick={() => elimina(r.id)}><i className="fa-light fa-trash-can" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  )
}

export default function CreaAnagrafica({ navigate, editing = false }: { navigate: (p: string) => void; editing?: boolean }) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const initial = editing ? getEditingAnagrafica() : null

  // Chiave stabile per collegare i contratti a questa anagrafica: in modifica è
  // l'id del dipendente, in creazione un id di sessione (i contratti restano
  // agganciati al profilo appena creato).
  const [anagId] = useState(() =>
    initial?.id != null ? String(initial.id) : `nuovo-${Math.round(performance.now())}`)

  const mkSlot = (name?: string): AcqFile | null => (name ? { name } : null)
  const [docs, setDocs] = useState<Record<DocKey, AcqFile | null>>({
    identita:      mkSlot(initial?.documenti?.identita),
    codiceFiscale: mkSlot(initial?.documenti?.codiceFiscale),
    privacy:       mkSlot(initial?.documenti?.privacy),
    sicurezza:     mkSlot(initial?.documenti?.sicurezza),
  })
  const [altri, setAltri] = useState<AcqFile[]>((initial?.documenti?.altri ?? []).map((n) => ({ name: n })))
  const altriRef = useRef<HTMLInputElement>(null)
  const onAltri = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = e.target.files
    e.target.value = ''
    if (!fs) return
    Array.from(fs).forEach((f) => {
      if (f.type.startsWith('image/')) {
        const r = new FileReader()
        r.onload = () => setAltri((p) => [...p, { name: f.name, dataUrl: r.result as string }])
        r.readAsDataURL(f)
      } else setAltri((p) => [...p, { name: f.name }])
    })
  }
  const setDoc = (k: DocKey, f: AcqFile | null) => setDocs((p) => ({ ...p, [k]: f }))

  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', sesso: '',
    codice_fiscale: '', email: '', telefono: '', contatto_emergenza: '',
    indirizzo: '', indirizzo2: '', cap: '', provincia: '', nazionalita: 'ITALIA',
    strutture: '', credenziali: '', numero_turni: 1, fasce_turni: '', reparti: '',
    ...(initial ? {
      nome: initial.nome ?? '', cognome: initial.cognome ?? '', data_nascita: initial.data_nascita ?? '',
      codice_fiscale: initial.codice_fiscale ?? '', indirizzo: initial.indirizzo ?? '',
      cap: initial.cap ?? '', provincia: initial.provincia ?? '', nazionalita: initial.nazionalita ?? 'ITALIA',
    } : {}),
  })

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function handleSave() {
    if (!form.nome || !form.cognome) {
      setError('Nome e cognome sono obbligatori'); return
    }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla(editing ? 'anagrafica-personale/Update' : 'anagrafica-personale/Insert', { method: 'POST', body: form })
    } catch { /* mock: salva comunque */ }
    setPending(false)
    clearEditingAnagrafica()
    navigate('archivio-personale')
  }

  return (
    <div className="crea-anag">
      <PageHead
        title={editing ? 'Modifica anagrafica personale' : 'Crea anagrafica personale'}
        subtitle="Scheda del dipendente: dati anagrafici, contatti, residenza e inquadramento"
        onBack={() => { clearEditingAnagrafica(); navigate('archivio-personale') }}
      />

      {error && <p className="crea-anag__error"><i className="fa-light fa-circle-exclamation" /> {error}</p>}

      <div className="crea-anag__sheet">
        <Section icon="fa-id-card" title="Dati anagrafici">
          <div className="crea-anag__identity">
            {/* Foto compatta */}
            <div className="crea-anag__photo">
              <div className="crea-anag__photo-thumb" onClick={() => photoInputRef.current?.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="anteprima" />
                  : <i className="fa-duotone fa-user" />}
              </div>
              <div className="crea-anag__photo-btns">
                <button type="button" className="sib-btn sib-btn--icon" title="Scatta foto" onClick={() => photoInputRef.current?.click()}>
                  <i className="fa-duotone fa-camera" />
                </button>
                <button type="button" className="sib-btn sib-btn--icon" title="Carica immagine" onClick={() => photoInputRef.current?.click()}>
                  <i className="fa-duotone fa-image" />
                </button>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </div>

            {/* Campi anagrafici */}
            <div className="crea-anag__grid crea-anag__grid--3 crea-anag__identity-fields">
              <InputField      name="nome"           label="Nome"            value={form.nome}           onChange={(e) => set('nome', e.target.value)} />
              <InputField      name="cognome"        label="Cognome"         value={form.cognome}        onChange={(e) => set('cognome', e.target.value)} />
              <DatePickerField name="data_nascita"   label="Data di nascita" value={form.data_nascita}   onChange={(e) => set('data_nascita', e.target.value)} />
              <SelectField     name="sesso"          label="Sesso"           value={form.sesso}          onChange={(e) => set('sesso', e.target.value)} options={SESSI} />
              <InputField      name="codice_fiscale" label="Codice fiscale"  value={form.codice_fiscale} onChange={(e) => set('codice_fiscale', e.target.value)} />
              <SelectField     name="nazionalita"    label="Nazionalità"     value={form.nazionalita}    onChange={(e) => set('nazionalita', e.target.value)}
                options={NAZIONALITA.map((n) => ({ value: n, label: withFlag(n) }))} />
            </div>
          </div>
        </Section>

        <Section icon="fa-address-book" title="Contatti">
          <div className="crea-anag__grid crea-anag__grid--3">
            <InputField name="email"              label="E-mail"   type="email" value={form.email}              onChange={(e) => set('email', e.target.value)} />
            <InputField name="telefono"           label="Telefono" type="tel"   value={form.telefono}           onChange={(e) => set('telefono', e.target.value)} />
            <InputField name="contatto_emergenza" label="Contatto di emergenza" value={form.contatto_emergenza} onChange={(e) => set('contatto_emergenza', e.target.value)} />
          </div>
        </Section>

        <Section icon="fa-location-dot" title="Residenza">
          <div className="crea-anag__grid crea-anag__grid--res">
            <InputField name="indirizzo"  label="Indirizzo"                 value={form.indirizzo}  onChange={(e) => set('indirizzo', e.target.value)} />
            <InputField name="indirizzo2" label="Indirizzo 2 (facoltativo)" value={form.indirizzo2} onChange={(e) => set('indirizzo2', e.target.value)} />
            <InputField name="cap"        label="CAP"                       value={form.cap}        onChange={(e) => set('cap', e.target.value)} />
            <InputField name="provincia"  label="Provincia"                 value={form.provincia}  onChange={(e) => set('provincia', e.target.value)} />
          </div>
        </Section>

        <Section icon="fa-briefcase" title="Inquadramento e turni">
          <div className="crea-anag__grid crea-anag__grid--3">
            <SelectField name="strutture"   label="Strutture abilitate"     value={form.strutture}   onChange={(e) => set('strutture', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]} />
            <SelectField name="credenziali" label="Credenziali da generare" value={form.credenziali} onChange={(e) => set('credenziali', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...CREDENZIALI.map((c) => ({ value: c, label: c }))]} />
            <InputField  name="numero_turni" label="Numero turni" type="number" value={String(form.numero_turni)} onChange={(e) => set('numero_turni', Number(e.target.value || 1))} />
            <SelectField name="fasce_turni" label="Fasce turni"             value={form.fasce_turni} onChange={(e) => set('fasce_turni', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...FASCE_TURNI.map((f) => ({ value: f, label: f }))]} />
            <SelectField name="reparti"     label="Reparti"                 value={form.reparti}     onChange={(e) => set('reparti', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...REPARTI.map((r) => ({ value: r, label: r }))]} />
          </div>
        </Section>

        <ContrattiSection anagraficaId={anagId} nomeDefault={`${form.nome} ${form.cognome}`.trim()} />

        <Section icon="fa-folder-open" title="Documenti e allegati">
          <div className="crea-anag__doc-rows">
            {DOC_SLOTS.map((s) => (
              <DocSlot key={s.key} label={s.label} value={docs[s.key]}
                onAcquire={(f) => setDoc(s.key, f)} onRemove={() => setDoc(s.key, null)} />
            ))}
          </div>

          <div className="crea-anag__field crea-anag__doc-altri">
            <label className="crea-anag__label">Documentazione contrattuale / altri allegati</label>
            <div className="crea-anag__docs">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => altriRef.current?.click()}>
                <i className="fa-light fa-circle-plus" /> Aggiungi documenti
              </button>
              <input ref={altriRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={onAltri} />
              {altri.length > 0 && (
                <ul className="crea-anag__doc-list">
                  {altri.map((d, i) => (
                    <li key={i} className="crea-anag__doc-item">
                      <span><i className="fa-light fa-file-lines" /> {d.name}</span>
                      <span className="crea-anag__doc-item-acts">
                        <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" onClick={() => viewDoc(d)}><i className="fa-light fa-eye" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Stampa" onClick={() => printDoc(d)}><i className="fa-light fa-print" /></button>
                        <button type="button" className="sib-btn sib-btn--icon" title="Elimina" onClick={() => setAltri((prev) => prev.filter((_, idx) => idx !== i))}><i className="fa-light fa-trash-can" /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      </div>

      <div className="crea-anag__actions">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={() => { clearEditingAnagrafica(); navigate('archivio-personale') }}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
