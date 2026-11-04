import React, { useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import AlertBanner from '../../../core/components/AlertBanner'
import { toast } from '../../../core/components/Toast/useToast'
import { InputField, SelectField, DatePickerField, CheckboxField, TextareaField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import { useHrConfigStore, findById } from '../../../store/useHrConfigStore'
import {
  useCollaboratoriEsterniStore, chiaveOpEsterno, statoAutorizzazione, documentiMancanti, STATO_AUT_LABEL,
  type CollaboratoreEsterno as Collab, type DocumentoEsterno,
} from '../../../store/useCollaboratoriEsterniStore'
import { useAnagraficaOpStore, abilitazioneVuota, type AbilitazioneOp } from '../../../store/useAnagraficaOpStore'
import { useModuloAttivo } from '../../../hooks/useModuloAttivo'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { nomeReparto } from '../../appop/opCatalogo'
import OpAccessoAnagrafica from '../../appop/OpAccessoAnagrafica'
import { emailValida } from '../../appop/invitoAnagrafica'
import BadgeAnteprima from '../_badge/BadgeAnteprima'
import { stampaBadge } from '../_badge/badgeEsterno'
import './CollaboratoreEsterno.sass'

// ─── HUMAN RESOURCES › COLLABORATORE ESTERNO ─────────────────────────────────
//  Scheda leggera dell'addetto di una ditta in appalto (fornitore di Purchasing):
//  dati personali, azienda e categoria (Configurazione HR › Collaboratori
//  esterni), strutture, periodo di autorizzazione, documenti richiesti dalla
//  categoria e accesso all'App Op! limitato ai reparti della categoria.
//  Nessun contratto di lavoro, ferie o cedolino: non è un dipendente.

const oggi = () => new Date().toISOString().slice(0, 10)
const piuMesi = (isoDate: string, mesi: number) => {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + mesi)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
const fmt = (isoDate?: string) => (isoDate ? isoDate.split('-').reverse().join('/') : '—')

const NUOVA_AZIENDA = '__nuova'

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="colest__section">
      <header className="colest__section-head"><i className={`fa-duotone ${icon}`} aria-hidden="true" /><h3>{title}</h3></header>
      <div className="colest__section-body">{children}</div>
    </section>
  )
}

export default function CollaboratoreEsterno({ navigate, id, fornitoreId }: { navigate: (p: string) => void; id?: string; fornitoreId?: string }) {
  const collaboratori = useCollaboratoriEsterniStore((s) => s.collaboratori)
  const add = useCollaboratoriEsterniStore((s) => s.add)
  const update = useCollaboratoriEsterniStore((s) => s.update)
  const remove = useCollaboratoriEsterniStore((s) => s.remove)
  const categorie = useHrConfigStore((s) => s.categorieEsterni)
  const badgeCfg = useHrConfigStore((s) => s.badge)
  const fornitori = useCatalogoStore((s) => s.fornitori)
  const addFornitore = useCatalogoStore((s) => s.addFornitore)
  const salvaAbil = useAnagraficaOpStore((s) => s.set)
  const confirm = useConfirmStore((s) => s.confirm)
  const appOpAttivo = useModuloAttivo('app-op')
  const { elenco: strutture, struttura } = useStrutturaCorrente()
  const fotoRef = useRef<HTMLInputElement>(null)

  const esistente = id ? collaboratori.find((c) => c.id === id) : undefined
  const [form, setForm] = useState<Omit<Collab, 'id' | 'createdAt'>>(() => esistente ?? {
    nome: '', cognome: '', email: '', telefono: '', codiceFiscale: '', fornitoreId: fornitoreId ?? '', categoriaId: '',
    strutture: [], autorizzatoDal: oggi(), autorizzatoAl: '', documenti: {}, note: '',
  })
  const [abil, setAbil] = useState<AbilitazioneOp>(() =>
    (id && useAnagraficaOpStore.getState().abilitazioni[chiaveOpEsterno(id)]) || abilitazioneVuota())
  const [errore, setErrore] = useState<string | null>(null)
  const [nuovaAzienda, setNuovaAzienda] = useState<{ nome: string; citta: string; email: string; telefono: string } | null>(null)
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const aziende = fornitori.filter((f) => f.appalto)
  const categoria = findById(categorie, form.categoriaId)
  const stato = statoAutorizzazione(form)
  const mancanti = documentiMancanti({ ...form, id: '', createdAt: '' }, categoria)
  const limiteAl = categoria && form.autorizzatoDal ? piuMesi(form.autorizzatoDal, categoria.durataMaxMesi) : ''
  const oltreLimite = !!limiteAl && !!form.autorizzatoAl && form.autorizzatoAl > limiteAl

  const scegliCategoria = (catId: string) => {
    const cat = findById(categorie, catId)
    setForm((f) => ({
      ...f, categoriaId: catId,
      autorizzatoAl: f.autorizzatoAl || (cat && f.autorizzatoDal ? piuMesi(f.autorizzatoDal, cat.durataMaxMesi) : ''),
    }))
    // I reparti dell'app seguono la categoria
    if (cat) setAbil((a) => ({ ...a, reparti: a.reparti.filter((r) => cat.repartiOp.includes(r)).length ? a.reparti.filter((r) => cat.repartiOp.includes(r)) : cat.repartiOp }))
  }

  const setDoc = (nome: string, p: Partial<DocumentoEsterno> | null) =>
    setForm((f) => {
      const documenti = { ...f.documenti }
      if (p === null) delete documenti[nome]
      else documenti[nome] = { ...documenti[nome], ...p }
      return { ...f, documenti }
    })

  const creaAzienda = () => {
    if (!nuovaAzienda?.nome.trim()) return
    const f = addFornitore({
      nome: nuovaAzienda.nome.trim(), descrizione: 'Ditta di servizi in appalto.', storia: '', indirizzo: '', citta: nuovaAzienda.citta.trim(),
      regione: '', cap: '', telefono: nuovaAzienda.telefono.trim(), email: nuovaAzienda.email.trim(), sito: '', annoFondazione: new Date().getFullYear(),
      certificazioni: [], caratteristiche: [], categoriaId: '', macroArea: 'servizi', immagineUrl: '', pubblicato: true, appalto: true,
    })
    set('fornitoreId', f.id)
    setNuovaAzienda(null)
    toast.success(`${f.nome} aggiunta ai fornitori di Purchasing`, 'Servizi in appalto')
  }

  const salva = () => {
    if (!form.nome.trim() || !form.cognome.trim()) { setErrore('Nome e cognome sono obbligatori.'); return }
    if (!form.fornitoreId) { setErrore('Scegli l’azienda in appalto da cui dipende il collaboratore.'); return }
    if (!categoria) { setErrore('Scegli la categoria del collaboratore.'); return }
    if (!form.autorizzatoDal || !form.autorizzatoAl) { setErrore('Indica il periodo di autorizzazione.'); return }
    if (form.autorizzatoAl < form.autorizzatoDal) { setErrore('La fine dell’autorizzazione è precedente all’inizio.'); return }
    if (oltreLimite) { setErrore(`Per la categoria «${categoria.nome}» l’autorizzazione dura al massimo ${categoria.durataMaxMesi} mesi (fino al ${fmt(limiteAl)}).`); return }
    if (form.email && !emailValida(form.email)) { setErrore('Email non valida.'); return }
    setErrore(null)
    const clean = { ...form, nome: form.nome.trim(), cognome: form.cognome.trim(), email: form.email.trim() }
    const cid = esistente ? (update(esistente.id, clean), esistente.id) : add(clean)
    salvaAbil(chiaveOpEsterno(cid), {
      ...useAnagraficaOpStore.getState().abilitazioni[chiaveOpEsterno(cid)], ...abil,
      emailAziendale: clean.email, livello: 'impiegato', hr: false, responsabile: false,
      reparti: abil.reparti.filter((r) => categoria.repartiOp.includes(r)),
    })
    toast.success(esistente ? 'Scheda del collaboratore aggiornata' : `${clean.nome} ${clean.cognome} registrato tra i collaboratori esterni`, 'Human Resources')
    if (!esistente) navigate(`modifica-collaboratore-esterno:${cid}`)
  }

  const elimina = async () => {
    if (!esistente) return
    const ok = await confirm({
      title: 'Elimina collaboratore esterno',
      message: `Eliminare la scheda di ${esistente.nome} ${esistente.cognome}? L’eventuale utenza nell’App Op! va bloccata da Utenti e ruoli.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    remove(esistente.id)
    navigate('archivio-personale:esterni')
  }

  const onFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => set('foto', r.result as string)
    r.readAsDataURL(f)
  }

  const datiBadge = {
    collaboratore: { ...form, id: esistente?.id ?? 'nuovo', createdAt: '', numeroBadge: esistente?.numeroBadge ?? 'EST-····' } as Collab,
    azienda: fornitori.find((f) => f.id === form.fornitoreId),
    categoria,
    struttura: struttura || 'Struttura',
  }
  const stampa = async () => {
    try { await stampaBadge([datiBadge], badgeCfg) } catch (e) { toast.error(e instanceof Error ? e.message : 'Stampa non riuscita.', 'Badge') }
  }

  const bloccoInvito = useMemo(() => {
    if (!esistente) return 'Salva la scheda per poter inviare il token di invito.'
    if (stato === 'scaduta') return `Autorizzazione scaduta il ${fmt(form.autorizzatoAl)}: rinnovala per invitare il collaboratore.`
    if (stato === 'futura') return `L’autorizzazione decorre dal ${fmt(form.autorizzatoDal)}: l’invito si potrà inviare da quel giorno.`
    if (!categoria) return 'Scegli la categoria del collaboratore.'
    return undefined
  }, [esistente, stato, form.autorizzatoAl, form.autorizzatoDal, categoria])

  return (
    <div className="colest">
      <PageHead
        title={esistente ? 'Modifica collaboratore esterno' : 'Nuovo collaboratore esterno'}
        subtitle="Addetto di una ditta in appalto (pulizie, manutenzione…): non è un dipendente, ma può usare l’App Op! nei reparti autorizzati"
        onBack={() => navigate('archivio-personale:esterni')}
      />

      {errore && <p className="colest__error"><i className="fa-light fa-circle-exclamation" /> {errore}</p>}

      <div className="colest__sheet">
        <Section icon="fa-id-card" title="Dati personali">
          <div className="colest__identity">
          <div className="colest__photo">
            <button type="button" className="colest__photo-thumb" onClick={() => fotoRef.current?.click()} aria-label="Carica la foto del badge">
              {form.foto ? <img src={form.foto} alt="Foto del collaboratore" /> : <i className="fa-duotone fa-user" />}
            </button>
            <span className="colest__muted">Foto per il badge</span>
            {form.foto && <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => set('foto', undefined)}>Rimuovi</button>}
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={onFoto} />
          </div>
          <div className="colest__grid">
            <InputField name="ce_nome" label="Nome" required value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            <InputField name="ce_cognome" label="Cognome" required value={form.cognome} onChange={(e) => set('cognome', e.target.value)} />
            <InputField name="ce_cf" label="Codice fiscale" value={form.codiceFiscale} onChange={(e) => set('codiceFiscale', e.target.value.toUpperCase())} />
            <InputField name="ce_email" label="E-mail" type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              hint="A questo indirizzo arriva il token di invito dell’App Op!" />
            <InputField name="ce_tel" label="Telefono" type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            <DatePickerField name="ce_nascita" label="Data di nascita" value={form.dataNascita ?? ''} onChange={(e) => set('dataNascita', e.target.value)} />
            <DatePickerField name="ce_assunzione" label="Assunto dall’impresa il" value={form.dataAssunzione ?? ''} onChange={(e) => set('dataAssunzione', e.target.value)}
              hint="Obbligatoria sul badge (L. 136/2010)" />
            <InputField name="ce_badge" label="N. badge" value={esistente?.numeroBadge ?? 'Assegnato al salvataggio'} readOnly />
          </div>
          </div>
        </Section>

        <Section icon="fa-building" title="Azienda e categoria">
          <div className="colest__grid">
            <SelectField name="ce_azienda" label="Azienda in appalto" required value={form.fornitoreId}
              onChange={(e) => (e.target.value === NUOVA_AZIENDA ? setNuovaAzienda({ nome: '', citta: '', email: '', telefono: '' }) : set('fornitoreId', e.target.value))}
              hint="Dai fornitori di Purchasing › Servizi in appalto"
              options={[{ value: '', label: 'Seleziona' }, ...aziende.map((f) => ({ value: f.id, label: f.nome })), { value: NUOVA_AZIENDA, label: '+ Nuova azienda in appalto…' }]} />
            <SelectField name="ce_categoria" label="Categoria" required value={form.categoriaId} onChange={(e) => scegliCategoria(e.target.value)}
              hint={categoria ? `App Op!: ${categoria.repartiOp.map(nomeReparto).join(', ')}` : undefined}
              options={[{ value: '', label: 'Seleziona' }, ...categorie.filter((c) => c.attiva || c.id === form.categoriaId).map((c) => ({ value: c.id, label: c.nome }))]} />
          </div>
          {strutture.length > 1 && (
            <div className="colest__strutture">
              <span className="colest__label">Strutture in cui opera <span className="colest__muted">(nessuna selezione = tutte)</span></span>
              <div className="colest__checks">
                {strutture.map((s) => (
                  <CheckboxField key={s} name={`ce_str_${s}`} label={s} checked={form.strutture.includes(s)}
                    onChange={(e) => set('strutture', e.target.checked ? [...form.strutture, s] : form.strutture.filter((x) => x !== s))} />
                ))}
              </div>
            </div>
          )}
        </Section>

        <Section icon="fa-calendar-check" title="Autorizzazione">
          <div className="colest__grid">
            <DatePickerField name="ce_dal" label="Autorizzato dal" required value={form.autorizzatoDal} onChange={(e) => set('autorizzatoDal', e.target.value)} />
            <DatePickerField name="ce_al" label="Autorizzato fino al" required value={form.autorizzatoAl} onChange={(e) => set('autorizzatoAl', e.target.value)}
              hint={limiteAl ? `Massimo ${categoria!.durataMaxMesi} mesi: entro il ${fmt(limiteAl)}` : undefined}
              error={oltreLimite ? 'Oltre la durata massima della categoria' : undefined} />
            <div className="colest__stato">
              <span className="colest__label">Stato</span>
              <span className={`colest__badge colest__badge--${stato}`}>{STATO_AUT_LABEL[stato]}</span>
            </div>
          </div>
          <p className="colest__hint">Alla scadenza l’accesso all’App Op! non è più consentito: per proseguire va rinnovata l’autorizzazione.</p>
        </Section>

        <Section icon="fa-folder-open" title="Documenti">
          {!categoria ? (
            <p className="colest__hint">Scegli la categoria: i documenti richiesti dipendono da lì.</p>
          ) : (
            <>
              {mancanti.length > 0 && (
                <AlertBanner type="warning">Documentazione incompleta: {mancanti.join(', ')}.</AlertBanner>
              )}
              <div className="colest__docs">
                {categoria.documenti.map((d) => (
                  <DocRow key={d} nome={d} doc={form.documenti[d]} onChange={(p) => setDoc(d, p)} />
                ))}
              </div>
            </>
          )}
        </Section>

        {appOpAttivo && (
          <Section icon="fa-mobile-screen" title="App Op!">
            <OpAccessoAnagrafica
              anagraficaId={esistente ? chiaveOpEsterno(esistente.id) : 'est-nuovo'}
              persona={{ nome: form.nome, cognome: form.cognome }}
              email={form.email}
              onEmail={(v) => set('email', v)}
              abil={abil}
              onAbil={(p) => setAbil((a) => ({ ...a, ...p }))}
              repartiSuggeriti={categoria?.repartiOp}
              repartiConsentiti={categoria?.repartiOp ?? []}
              esterno
              bloccoInvito={bloccoInvito}
            />
          </Section>
        )}

        <Section icon="fa-id-badge" title="Badge di riconoscimento">
          <div className="colest__tessera">
            <BadgeAnteprima dati={datiBadge} />
            <div className="colest__tessera-side">
              {!form.foto && <AlertBanner type="warning">Manca la foto: sul badge comparirebbero le iniziali, ma per legge la tessera deve avere la fotografia.</AlertBanner>}
              {!form.dataAssunzione && <AlertBanner type="warning">Indica la data di assunzione presso l’impresa: è obbligatoria sul badge.</AlertBanner>}
              <p className="colest__hint">Campi, colore e formato si impostano in Human Resources › Configurazione › Collaboratori esterni.</p>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!esistente} onClick={stampa} title={esistente ? undefined : 'Salva la scheda per stampare il badge'}>
                <i className="fa-light fa-print" /> Stampa badge
              </button>
            </div>
          </div>
        </Section>

        <Section icon="fa-note-sticky" title="Note">
          <TextareaField name="ce_note" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Reperibilità, accessi particolari…" />
        </Section>
      </div>

      <div className="colest__actions">
        {esistente && (
          <button type="button" className="sib-btn sib-btn--ghost colest__delete" onClick={elimina}>
            <i className="fa-light fa-trash-can" /> Elimina
          </button>
        )}
        <button type="button" className="sib-btn sib-btn--ghost" onClick={() => navigate('archivio-personale:esterni')}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>{esistente ? 'Salva' : 'Registra collaboratore'}</button>
      </div>

      <Modal open={nuovaAzienda !== null} onClose={() => setNuovaAzienda(null)} title="Nuova azienda in appalto" size="md" className="colest-modal">
        {nuovaAzienda && (
          <>
            <div className="colest-modal__body">
              <p className="colest__hint">La ditta viene aggiunta ai fornitori di Purchasing (Servizi in appalto), dove potrai completarne l’anagrafica.</p>
              <InputField name="na_nome" label="Ragione sociale" required value={nuovaAzienda.nome} onChange={(e) => setNuovaAzienda({ ...nuovaAzienda, nome: e.target.value })} />
              <div className="colest__grid">
                <InputField name="na_citta" label="Città" value={nuovaAzienda.citta} onChange={(e) => setNuovaAzienda({ ...nuovaAzienda, citta: e.target.value })} />
                <InputField name="na_tel" label="Telefono" value={nuovaAzienda.telefono} onChange={(e) => setNuovaAzienda({ ...nuovaAzienda, telefono: e.target.value })} />
                <InputField name="na_email" label="E-mail" type="email" value={nuovaAzienda.email} onChange={(e) => setNuovaAzienda({ ...nuovaAzienda, email: e.target.value })} />
              </div>
            </div>
            <div className="colest-modal__footer">
              <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setNuovaAzienda(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!nuovaAzienda.nome.trim()} onClick={creaAzienda}>Aggiungi azienda</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function DocRow({ nome, doc, onChange }: { nome: string; doc?: DocumentoEsterno; onChange: (p: Partial<DocumentoEsterno> | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const scaduto = !!doc?.scadenza && doc.scadenza < oggi()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => onChange({ file: f.name, dataUrl: r.result as string })
    r.readAsDataURL(f)
  }
  return (
    <div className="colest__doc">
      <div className="colest__doc-label">
        <span className="colest__doc-name">{nome}</span>
        {!doc?.file
          ? <span className="colest__badge colest__badge--scaduta"><i className="fa-solid fa-triangle-exclamation" /> Mancante</span>
          : scaduto
            ? <span className="colest__badge colest__badge--scaduta"><i className="fa-solid fa-triangle-exclamation" /> Scaduto</span>
            : <span className="colest__badge colest__badge--attiva"><i className="fa-solid fa-circle-check" /> Caricato</span>}
      </div>
      <div className="colest__doc-main">
        {doc?.file && (
          <span className="colest__doc-file" title={doc.file}>
            <i className="fa-light fa-file-pdf" /> {doc.file}
            {doc.dataUrl && <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza" onClick={() => window.open(doc.dataUrl!, '_blank')}><i className="fa-light fa-eye" /></button>}
          </span>
        )}
        <DatePickerField name={`doc_scad_${nome}`} value={doc?.scadenza ?? ''} onChange={(e) => onChange({ scadenza: e.target.value })} className="colest__doc-date" />
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => ref.current?.click()}>
          <i className="fa-light fa-folder-open" /> {doc?.file ? 'Sostituisci' : 'Carica'}
        </button>
        <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  )
}
