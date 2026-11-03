import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tabs from '../../../core/components/Tabs'
import Card from '../../../core/components/Card'
import StatusBadge from '../../../core/components/StatusBadge'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import Button from '../../../core/components/Button/Button'
import { DatePickerField, InputField, RadioGroup, SearchField, SelectField, TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import OpModuliEditor from '../../../modules/appop/OpModuliEditor'
import OpDipendenteModal from '../../../modules/appop/OpDipendenteModal'
import OpDipendentiTable from '../../../modules/appop/OpDipendentiTable'
import OpInvitoModal from '../../../modules/appop/OpInvitoModal'
import OpQrGenerator from '../../../modules/appop/OpQrGenerator'
import OpStruttureEditor from '../../../modules/appop/OpStruttureEditor'
import { elencoAziendePlatform, type AziendaPlatform } from '../../../modules/appop/aziendePlatform'
import { nomeReparto, type RepartiModuli, type RepartoOp } from '../../../modules/appop/opCatalogo'
import {
  formatoData, opAdminApi,
  type ClienteOp, type DatiCliente, type DettaglioCliente, type DipendenteOp, type DipendenteRichiesta, type InvitoOp, type PianoCliente,
  type TipoAziendaOp,
} from '../../../modules/appop/opApi'
import './SibyllaOp.sass'

interface Props {
  /** Dentro il pannello Sibylla Admin → Piattaforma: il titolo lo mostra già il pannello. */
  incorporata?: boolean
}

const PIANI: { value: PianoCliente; label: string }[] = [
  { value: 'base', label: 'Base' },
  { value: 'completo', label: 'Completo' },
  { value: 'personalizzato', label: 'Personalizzato' },
]

const TIPI: { value: TipoAziendaOp; label: string }[] = [
  { value: 'struttura', label: 'Una sola struttura (l’azienda è l’albergo)' },
  { value: 'gruppo', label: 'Gruppo con più strutture' },
]

// Come sibyllaop.it/admin → Nuova azienda (DATI_VUOTI di apps/mobile/src/admin/tecnico/catalogo.ts in sibylla-op).
const DATI_VUOTI: DatiCliente = {
  ragioneSociale: '', partitaIva: null, indirizzo: null, sedeLegale: null, pec: null, tipo: 'struttura',
  referente: null, emailReferente: null, telefono: null, piano: 'completo', attivoDal: null, scadeIl: null, note: null,
}

const soloData = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const errore = (e: unknown) => (e instanceof Error ? e.message : 'Operazione non riuscita.')
const nomePiano = (p: string) => PIANI.find(x => x.value === p)?.label ?? p
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

type ErroriDati = Partial<Record<keyof DatiCliente, string>>

/** Stesse regole di sibyllaop.it/admin (apps/mobile/src/admin/tecnico/validazione.ts in sibylla-op). */
function validaDati(dati: DatiCliente) {
  const errori: ErroriDati = {}
  if (dati.ragioneSociale.trim().length < 2) errori.ragioneSociale = 'Indica la ragione sociale.'
  if (dati.partitaIva && !/^[A-Z]{0,2}\d{8,13}$/i.test(dati.partitaIva.replace(/\s/g, ''))) errori.partitaIva = 'Partita IVA non valida.'
  if (dati.emailReferente && !emailOk(dati.emailReferente)) errori.emailReferente = 'Email non valida.'
  if (dati.pec && !emailOk(dati.pec)) errori.pec = 'Indirizzo PEC non valido.'
  if (dati.attivoDal && dati.scadeIl && dati.scadeIl < dati.attivoDal) errori.scadeIl = 'La scadenza è prima dell’attivazione.'
  const pronti: DatiCliente = {
    ...dati, ragioneSociale: dati.ragioneSociale.trim(), partitaIva: dati.partitaIva?.replace(/\s/g, '') || null,
  }
  return { errori, pronti, ok: Object.keys(errori).length === 0 }
}

// Aziende di Sibylla Platform per l'integrazione: una sola richiesta al Portal finché va a buon fine.
let aziendePlatform: Promise<AziendaPlatform[]> | null = null
const caricaAziendePlatform = () => {
  if (!aziendePlatform) aziendePlatform = elencoAziendePlatform().catch(e => { aziendePlatform = null; throw e })
  return aziendePlatform
}

function useAziendePlatform() {
  const [aziende, setAziende] = useState<AziendaPlatform[] | null>(null)
  const [problema, setProblema] = useState(false)
  useEffect(() => {
    let vivo = true
    caricaAziendePlatform()
      .then(a => { if (vivo) setAziende(a) })
      .catch(() => { if (vivo) { setAziende([]); setProblema(true) } })
    return () => { vivo = false }
  }, [])
  return { aziende, problema }
}

type Apertura = { id: number; scheda?: Scheda; invito?: { invito: InvitoOp; nome: string } }

// ─── SIBYLLA OP! ──────────────────────────────────────────────────────────────
//  Le stesse funzioni di sibyllaop.it/admin (area dei tecnici Sibylla), con lo
//  stile di Platform: elenco delle aziende Op!, nuova azienda (tipo, dati e
//  abbonamento, strutture, reparti e moduli, amministratore con invito) e scheda
//  dell'azienda (dati, collegamento a Platform, reparti e moduli, amministratori,
//  sospensione, eliminazione) più dipendenti, strutture e QR. Unica differenza:
//  qui l'azienda nasce INTEGRATA con un'azienda di Sibylla Platform
//  (idAziendaPlatform, sibylla-op schede 09 e 15); su sibyllaop.it/admin nasce
//  stand alone. Integrata, può usare anche le funzioni del gestionale alberghiero
//  (Check In, Check Out…), che sibyllaop.it/admin non offre alle stand alone.
//  Dati e regole stanno in Op.Api (/admin/indipendenti).
export default function SibyllaOp({ incorporata = false }: Props) {
  const [clienti, setClienti] = useState<ClienteOp[] | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [cerca, setCerca] = useState('')
  const [aperto, setAperto] = useState<Apertura | null>(null)
  const [nuova, setNuova] = useState(false)
  const { aziende } = useAziendePlatform()

  const carica = useCallback(async () => {
    try {
      setClienti(await opAdminApi.clienti())
      setProblema(null)
    } catch (e) {
      setClienti([])
      setProblema(errore(e))
    }
  }, [])

  useEffect(() => { carica() }, [carica])

  const filtrati = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return (clienti ?? []).filter(c => !q || c.ragioneSociale.toLowerCase().includes(q) || (c.partitaIva ?? '').includes(q))
  }, [clienti, cerca])

  const nomePlatform = (id: number) => aziende?.find(a => a.id === id)?.nome ?? `Azienda n. ${id}`

  if (aperto !== null) {
    return (
      <SchedaCliente
        id={aperto.id}
        schedaIniziale={aperto.scheda}
        invitoIniziale={aperto.invito}
        onBack={() => { setAperto(null); carica() }}
      />
    )
  }

  if (nuova) {
    return <NuovaAzienda clienti={clienti ?? []} onBack={() => setNuova(false)} onCreata={a => { setNuova(false); setAperto(a) }} />
  }

  return (
    <div className="sibylla-op">
      {!incorporata && (
        <PageHead title="Sibylla Op!" subtitle="Aziende dell’app Op!: create qui nascono integrate con Sibylla Platform." back={false} />
      )}

      <div className="sibylla-op__bar">
        <SearchField value={cerca} placeholder="Cerca per ragione sociale o partita IVA" onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} className="sibylla-op__cerca" />
        <Button icon="plus" onClick={() => setNuova(true)}>Nuova azienda integrata</Button>
      </div>
      <p className="sibylla-op__nota">
        Le aziende che usano Sibylla Op!: qui le crei integrate con un’azienda di Sibylla Platform, con le loro caratteristiche e il loro
        amministratore. Quelle stand alone si creano su sibyllaop.it/admin.
      </p>
      {problema && <p className="sibylla-op__errore">{problema}</p>}

      <div className="sib-table-wrap">
        <table className="sib-table sibylla-op__tabella">
          <colgroup>
            <col className="sibylla-op__c-nome" /><col className="sibylla-op__c-piva" /><col className="sibylla-op__c-platform" />
            <col className="sibylla-op__c-piano" /><col className="sibylla-op__c-stato" /><col className="sibylla-op__c-dal" />
            <col className="sibylla-op__c-scade" /><col className="sibylla-op__c-dip" /><col className="sibylla-op__c-reparti" />
            <col className="sibylla-op__c-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th>Ragione sociale</th><th>Partita IVA</th><th>Sibylla Platform</th><th>Piano</th><th>Stato</th><th>Attiva dal</th>
              <th>Scadenza</th><th>Utenti attivi</th><th>Reparti</th><th className="sibylla-op__th-azioni">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti === null && <tr><td colSpan={10} className="sibylla-op__vuoto">Caricamento…</td></tr>}
            {clienti !== null && filtrati.length === 0 && (
              <tr><td colSpan={10} className="sibylla-op__vuoto">{clienti.length ? 'Nessuna azienda corrisponde alla ricerca.' : 'Nessuna azienda: crea la prima.'}</td></tr>
            )}
            {filtrati.map(c => {
              const reparti = c.reparti.map(nomeReparto).join(', ') || '—'
              return (
                <tr key={c.id}>
                  <td><TruncatedText text={c.ragioneSociale} className="sibylla-op__testo sibylla-op__forte" /></td>
                  <td>{c.partitaIva ?? '—'}</td>
                  <td>
                    {c.idAziendaPlatform
                      ? <TruncatedText text={`Integrata · ${nomePlatform(c.idAziendaPlatform)}`} className="sibylla-op__testo" />
                      : <span className="sibylla-op__tenue">Stand alone</span>}
                  </td>
                  <td>{nomePiano(c.piano)}</td>
                  <td><StatusBadge variant={c.stato === 'attivo' ? 'success' : 'warning'}>{c.stato === 'attivo' ? 'Attivo' : 'Sospeso'}</StatusBadge></td>
                  <td>{formatoData(c.attivoDal)}</td>
                  <td>{formatoData(c.scadeIl)}</td>
                  <td className="sibylla-op__num">{c.dipendentiAttivi} / {c.dipendenti}</td>
                  <td><TruncatedText text={reparti} className="sibylla-op__testo" /></td>
                  <td className="sibylla-op__azioni">
                    <Tooltip text="Apri l’azienda">
                      <button type="button" className="sibylla-op__btn" aria-label={`Apri ${c.ragioneSociale}`} onClick={() => setAperto({ id: c.id })}>
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Integrazione con Sibylla Platform ────────────────────────────────────────

/**
 * Azienda di Sibylla Platform con cui l'azienda Op è integrata (una sola per azienda Op, e viceversa). Elenco dal
 * Portal; quelle già integrate con un'altra azienda Op sono disattivate. Senza Portal si scrive l'id a mano.
 */
function SelettorePlatform({ value, onChange, clienti, escludi, error, scollegabile = false }: {
  value: number | null
  onChange: (id: number | null, azienda?: AziendaPlatform) => void
  clienti: ClienteOp[]
  /** Azienda Op di cui si modifica il collegamento (il suo collegamento non conta come "già usato"). */
  escludi?: number
  error?: string
  /** Scheda dell'azienda: si può anche scollegare (l'azienda torna stand alone), come su sibyllaop.it/admin. */
  scollegabile?: boolean
}) {
  const { aziende, problema } = useAziendePlatform()
  const [testo, setTesto] = useState(value ? String(value) : '')

  if (aziende === null) return <InputField name="aziendaPlatform" label="Azienda di Sibylla Platform" value="Caricamento…" disabled />

  if (problema) {
    return (
      <InputField
        name="idAziendaPlatform"
        label="Id dell’azienda in Sibylla Platform"
        required={!scollegabile}
        value={testo}
        error={error}
        hint={`Elenco delle aziende di Platform non disponibile: scrivi l’id numerico.${scollegabile ? ' Vuoto per scollegare.' : ''}`}
        onChange={e => {
          const t = e.target.value.replace(/\D/g, '').slice(0, 10)
          setTesto(t)
          onChange(t && Number(t) > 0 ? Number(t) : null)
        }}
      />
    )
  }

  const usate = new Map(clienti.filter(c => c.id !== escludi && c.idAziendaPlatform).map(c => [c.idAziendaPlatform as number, c.ragioneSociale]))
  const opzioni = [
    ...(scollegabile ? [{ value: '', label: 'Nessuna: azienda Op stand alone' }] : []),
    ...aziende.map(a => {
      const usata = usate.get(a.id)
      return {
        value: String(a.id),
        label: `${a.nome}${a.partitaIva ? ` · P.IVA ${a.partitaIva}` : ''}${usata ? ` — già integrata con ${usata}` : ''}`,
        disabled: !!usata,
      }
    }),
    // Collegamento a un'azienda che il Portal non elenca (es. id inserito a mano su sibyllaop.it/admin).
    ...(value && !aziende.some(a => a.id === value) ? [{ value: String(value), label: `Azienda n. ${value}` }] : []),
  ]
  return (
    <SelectField
      name="idAziendaPlatform"
      label="Azienda di Sibylla Platform"
      required={!scollegabile}
      placeholder={scollegabile ? undefined : 'Scegli l’azienda di Platform'}
      options={opzioni}
      value={value ? String(value) : ''}
      error={error}
      onChange={e => {
        const id = e.target.value ? Number(e.target.value) : null
        onChange(id, aziende.find(a => a.id === id))
      }}
    />
  )
}

// ─── Nuova azienda (integrata) ────────────────────────────────────────────────

interface Amministratore { nome: string; cognome: string; email: string }

/**
 * Come sibyllaop.it/admin → Nuova azienda: dati e abbonamento, strutture, reparti con i moduli e l'amministratore
 * dell'azienda, che riceve l'invito via email e configura poi strutture, camere e utenti su sibyllaop.it/azienda.
 * In più, l'azienda di Sibylla Platform con cui nasce integrata (obbligatoria).
 */
function NuovaAzienda({ clienti, onBack, onCreata }: { clienti: ClienteOp[]; onBack: () => void; onCreata: (a: Apertura) => void }) {
  const [idPlatform, setIdPlatform] = useState<number | null>(null)
  const [dati, setDati] = useState<DatiCliente>(DATI_VUOTI)
  const [sede, setSede] = useState('')
  // Gruppo: le strutture che fanno capo all'azienda (Hotel Archimede, Hotel Luce…).
  const [strutture, setStrutture] = useState<string[]>([''])
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [admin, setAdmin] = useState<Amministratore>({ nome: '', cognome: '', email: '' })
  const [tentato, setTentato] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const { errori, pronti, ok } = validaDati(dati)
  const erroriAdmin = erroriAmministratore(admin)
  const adminOk = !erroriAdmin.nome && !erroriAdmin.cognome && !erroriAdmin.email
  const repartiOk = Object.keys(reparti).length > 0
  const nomiStrutture = strutture.map(x => x.trim()).filter(Boolean)
  const struttureOk = dati.tipo !== 'gruppo' || nomiStrutture.length > 0
  const platformOk = idPlatform !== null

  // Scelta l'azienda di Platform, ragione sociale e partita IVA ancora vuote si riempiono con le sue.
  const scegliPlatform = (id: number | null, a?: AziendaPlatform) => {
    setIdPlatform(id)
    if (a) setDati(d => ({ ...d, ragioneSociale: d.ragioneSociale.trim() ? d.ragioneSociale : a.nome, partitaIva: d.partitaIva ?? a.partitaIva }))
  }

  const crea = async () => {
    setTentato(true)
    if (!ok || !adminOk || !repartiOk || !struttureOk || !platformOk) return
    setSalvo(true)
    setProblema(null)
    let azienda: DettaglioCliente
    try {
      azienda = await opAdminApi.nuovoCliente({
        dati: pronti,
        reparti,
        ...(dati.tipo === 'gruppo' ? { strutture: nomiStrutture } : { nomeSede: sede.trim() || undefined }),
        idAziendaPlatform: idPlatform,
      })
    } catch (e) {
      setProblema(e instanceof Error ? e.message : 'Azienda non creata.')
      setSalvo(false)
      return
    }
    // L'azienda c'è: se l'invito dell'amministratore non parte, si riprova dalla scheda Amministratori.
    const nome = `${admin.nome.trim()} ${admin.cognome.trim()}`
    try {
      const r = await opAdminApi.nuovoAmministratore(azienda.id, { nome: admin.nome.trim(), cognome: admin.cognome.trim(), email: admin.email.trim() })
      toast.success(`${azienda.ragioneSociale} creata e integrata con Sibylla Platform.`, 'Sibylla Op!')
      onCreata({ id: azienda.id, invito: r.invito ? { invito: r.invito, nome } : undefined })
    } catch (e) {
      toast.warning(`Azienda creata, ma l’amministratore non è stato invitato: ${errore(e)} Aggiungilo dalla scheda Amministratori.`, 'Sibylla Op!')
      onCreata({ id: azienda.id, scheda: 'amministratori' })
    }
  }

  return (
    <div className="sibylla-op">
      <PageHead
        title="Nuova azienda integrata"
        subtitle="Dati e abbonamento, reparti e moduli dell’app e l’amministratore che configurerà l’azienda."
        backLabel="Aziende"
        onBack={onBack}
      />

      <Card title="Integrazione con Sibylla Platform">
        <div className="sibylla-op__sezione">
          <p className="sibylla-op__nota">
            L’azienda Op nasce integrata con questa azienda di Sibylla Platform: i suoi utenti vedono in AppOp! › Business Intelligence i
            dati di Op dell’azienda. Un’azienda di Platform si integra con una sola azienda Op.
          </p>
          <div className="sibylla-op-form">
            <SelettorePlatform value={idPlatform} onChange={scegliPlatform} clienti={clienti} error={tentato && !platformOk ? 'Scegli l’azienda di Sibylla Platform.' : undefined} />
          </div>
        </div>
      </Card>

      <Card title="Azienda e abbonamento">
        <div className="sibylla-op__sezione">
          <DatiForm dati={dati} onChange={setDati} errori={tentato ? errori : {}} />
          {dati.tipo !== 'gruppo' && (
            <div className="sibylla-op-form">
              <InputField
                name="sede"
                label="Nome della struttura"
                placeholder={dati.ragioneSociale || 'Come la ragione sociale'}
                hint="L’azienda coincide con questa struttura: l’amministratore ne configura piani e camere."
                value={sede}
                onChange={e => setSede(e.target.value)}
                maxLength={200}
                className="sibylla-op-form__largo"
              />
            </div>
          )}
        </div>
      </Card>

      {dati.tipo === 'gruppo' && (
        <Card title="Strutture del gruppo">
          <div className="sibylla-op__sezione">
            <p className="sibylla-op__nota">
              Gli alberghi che fanno capo all’azienda: ognuno ha i suoi piani e camere, che configura l’amministratore. L’azienda non ha piani
              né camere sue.
            </p>
            {strutture.map((nome, i) => (
              <div key={i} className="sibylla-op__riga">
                <InputField
                  name={`struttura-${i}`}
                  label={`Struttura ${i + 1}`}
                  placeholder="Es. Hotel Archimede"
                  value={nome}
                  maxLength={120}
                  onChange={e => { const v = e.target.value; setStrutture(xs => xs.map((x, j) => (j === i ? v : x))) }}
                  className="sibylla-op__riga-campo"
                />
                {strutture.length > 1 && (
                  <Tooltip text="Togli la struttura">
                    <button type="button" className="sibylla-op__btn" aria-label={`Togli la struttura ${i + 1}`} onClick={() => setStrutture(xs => xs.filter((_, j) => j !== i))}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </Tooltip>
                )}
              </div>
            ))}
            <div>
              <Button variant="secondary" size="sm" icon="plus" onClick={() => setStrutture(xs => [...xs, ''])}>Aggiungi struttura</Button>
            </div>
            {tentato && !struttureOk && <p className="sibylla-op__errore">Indica almeno una struttura del gruppo.</p>}
          </div>
        </Card>
      )}

      <Card title="Reparti e moduli">
        <div className="sibylla-op__sezione">
          <p className="sibylla-op__nota">
            Cosa può usare l’azienda nell’app. Si può cambiare in seguito. Integrata con Platform, può usare anche le funzioni del gestionale
            alberghiero (Check In, Check Out, Servizi in camera, Ospiti del giorno).
          </p>
          <OpModuliEditor value={reparti} onChange={setReparti} />
          {!repartiOk && <p className="sibylla-op__errore">Attiva almeno un reparto.</p>}
        </div>
      </Card>

      <Card title="Amministratore dell’azienda">
        <div className="sibylla-op__sezione">
          <p className="sibylla-op__nota">
            Riceve l’invito via email. Entra nell’area admin dell’azienda (sibyllaop.it/azienda) e crea strutture, piani, camere e utenti.
          </p>
          <AmministratoreForm admin={admin} onChange={setAdmin} errori={tentato ? erroriAdmin : {}} />
        </div>
      </Card>

      {tentato && !(ok && adminOk && repartiOk && struttureOk && platformOk) && <p className="sibylla-op__errore">Controlla i campi segnati.</p>}
      {problema && <p className="sibylla-op__errore">{problema}</p>}
      <div className="sibylla-op__salva">
        <Button variant="secondary" onClick={onBack}>Annulla</Button>
        <Button onClick={crea} loading={salvo}>Crea l’azienda e invita l’amministratore</Button>
      </div>
    </div>
  )
}

const erroriAmministratore = (a: Amministratore) => ({
  nome: !a.nome.trim() ? 'Indica il nome.' : undefined,
  cognome: !a.cognome.trim() ? 'Indica il cognome.' : undefined,
  email: !emailOk(a.email) ? 'Indica un’email valida.' : undefined,
})

function AmministratoreForm({ admin, onChange, errori }: {
  admin: Amministratore; onChange: (a: Amministratore) => void; errori: Partial<Record<keyof Amministratore, string>>
}) {
  return (
    <div className="sibylla-op-form">
      <InputField name="adminNome" label="Nome" required value={admin.nome} error={errori.nome} maxLength={80} onChange={e => onChange({ ...admin, nome: e.target.value })} />
      <InputField name="adminCognome" label="Cognome" required value={admin.cognome} error={errori.cognome} maxLength={80} onChange={e => onChange({ ...admin, cognome: e.target.value })} />
      <InputField name="adminEmail" type="email" label="Email" required value={admin.email} error={errori.email} maxLength={254} onChange={e => onChange({ ...admin, email: e.target.value })} />
    </div>
  )
}

/** Dati dell'azienda (anagrafica e abbonamento), con i campi di sibyllaop.it/admin. */
function DatiForm({ dati, onChange, errori }: { dati: DatiCliente; onChange: (d: DatiCliente) => void; errori: ErroriDati }) {
  const set = <K extends keyof DatiCliente>(k: K, v: DatiCliente[K]) => onChange({ ...dati, [k]: v })
  const testo = (v: string) => (v.trim() ? v : null)
  return (
    <div className="sibylla-op-form">
      <RadioGroup name="tipo" label="Tipo di azienda" options={TIPI} value={dati.tipo} onChange={v => set('tipo', v as TipoAziendaOp)} className="sibylla-op-form__largo" />
      <InputField name="ragioneSociale" label="Ragione sociale" required value={dati.ragioneSociale} error={errori.ragioneSociale} onChange={e => set('ragioneSociale', e.target.value)} maxLength={200} className="sibylla-op-form__largo" />
      <InputField name="partitaIva" label="Partita IVA" value={dati.partitaIva ?? ''} error={errori.partitaIva} onChange={e => set('partitaIva', testo(e.target.value))} maxLength={20} />
      <InputField name="telefono" type="tel" label="Telefono" value={dati.telefono ?? ''} onChange={e => set('telefono', testo(e.target.value))} maxLength={40} />
      <InputField name="indirizzo" label="Sede operativa" value={dati.indirizzo ?? ''} onChange={e => set('indirizzo', testo(e.target.value))} maxLength={300} />
      <InputField name="sedeLegale" label="Sede legale" value={dati.sedeLegale ?? ''} onChange={e => set('sedeLegale', testo(e.target.value))} maxLength={300} />
      <InputField name="pec" type="email" label="Contatto PEC" placeholder="azienda@pec.it" value={dati.pec ?? ''} error={errori.pec} onChange={e => set('pec', testo(e.target.value))} maxLength={254} />
      <InputField name="referente" label="Referente" value={dati.referente ?? ''} onChange={e => set('referente', testo(e.target.value))} maxLength={120} />
      <InputField name="emailReferente" type="email" label="Email del referente" value={dati.emailReferente ?? ''} error={errori.emailReferente} onChange={e => set('emailReferente', testo(e.target.value))} maxLength={254} />
      <SelectField name="piano" label="Piano" value={dati.piano} options={PIANI} onChange={e => set('piano', e.target.value as PianoCliente)} />
      <DatePickerField name="attivoDal" label="Attivo dal" hint="Vuoto: da oggi" value={soloData(dati.attivoDal)} error={errori.attivoDal} onChange={e => set('attivoDal', e.target.value ? `${e.target.value}T00:00:00Z` : null)} />
      <DatePickerField name="scadeIl" label="Scade il" hint="Vuoto: senza scadenza" value={soloData(dati.scadeIl)} error={errori.scadeIl} onChange={e => set('scadeIl', e.target.value ? `${e.target.value}T00:00:00Z` : null)} />
      <TextareaField name="note" label="Note" rows={3} value={dati.note ?? ''} onChange={e => set('note', testo(e.target.value))} className="sibylla-op-form__largo" />
    </div>
  )
}

// ─── Scheda dell'azienda ──────────────────────────────────────────────────────

type Scheda = 'azienda' | 'reparti' | 'amministratori' | 'dipendenti' | 'strutture' | 'qr'

function SchedaCliente({ id, schedaIniziale, invitoIniziale, onBack }: {
  id: number
  schedaIniziale?: Scheda
  invitoIniziale?: { invito: InvitoOp; nome: string }
  onBack: () => void
}) {
  const confirm = useConfirmStore(s => s.confirm)
  const [cliente, setCliente] = useState<DettaglioCliente | null>(null)
  const [clienti, setClienti] = useState<ClienteOp[]>([])
  const [scheda, setScheda] = useState<Scheda>(schedaIniziale ?? 'azienda')
  const [dati, setDati] = useState<DatiCliente>(DATI_VUOTI)
  const [tentato, setTentato] = useState(false)
  const [idPlatform, setIdPlatform] = useState<number | null>(null)
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [dipendenti, setDipendenti] = useState<DipendenteOp[]>([])
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [modifica, setModifica] = useState<DipendenteOp | null | undefined>(undefined)
  const [invito, setInvito] = useState<{ invito: InvitoOp; nome: string } | null>(invitoIniziale ?? null)
  const [nuovoAdmin, setNuovoAdmin] = useState(false)
  const [elimina, setElimina] = useState(false)

  const carica = useCallback(async () => {
    try {
      const [c, d, tutti] = await Promise.all([opAdminApi.cliente(id), opAdminApi.dipendenti(id), opAdminApi.clienti()])
      setCliente(c)
      setDati(c)
      setIdPlatform(c.idAziendaPlatform ?? null)
      setReparti(c.reparti)
      setDipendenti(d)
      setClienti(tutti)
      setProblema(null)
    } catch (e) {
      setProblema(errore(e))
    }
  }, [id])

  useEffect(() => { carica() }, [carica])

  const esegui = async (azione: () => Promise<unknown>, ok: string) => {
    setSalvo(true)
    try {
      await azione()
      toast.success(ok, 'Sibylla Op!')
      await carica()
    } catch (e) {
      toast.error(errore(e), 'Sibylla Op!')
    } finally {
      setSalvo(false)
    }
  }

  const salvaDipendente = async (d: DipendenteRichiesta) => {
    if (modifica) {
      await opAdminApi.aggiornaDipendente(id, modifica.id, d)
      toast.success('Utenza aggiornata.', 'Sibylla Op!')
    } else {
      const r = await opAdminApi.nuovoDipendente(id, d)
      toast.success(`Utenza di ${d.nome} ${d.cognome} creata.`, 'Sibylla Op!')
      if (r.invito) setInvito({ invito: r.invito, nome: `${d.nome} ${d.cognome}` })
    }
    setModifica(undefined)
    await carica()
  }

  const invita = async (d: DipendenteOp) => {
    try {
      setInvito({ invito: await opAdminApi.invito(id, d.id), nome: `${d.nome} ${d.cognome}` })
      await carica()
    } catch (e) {
      toast.error(errore(e), 'Sibylla Op!')
    }
  }

  const blocca = async (d: DipendenteOp) => {
    const bloccato = d.stato !== 'bloccato'
    if (bloccato && !(await confirm({
      title: 'Bloccare l’accesso?',
      message: `${d.nome} ${d.cognome} esce subito dall’app e non può più entrare finché non lo sblocchi.`,
      confirmLabel: 'Blocca', danger: true,
    }))) return
    await esegui(() => opAdminApi.blocco(id, d.id, bloccato), bloccato ? 'Accesso bloccato.' : 'Accesso sbloccato.')
  }

  const eliminaDipendente = async (d: DipendenteOp) => {
    if (!(await confirm({
      title: 'Eliminare l’account?',
      message: `L’account di ${d.nome} ${d.cognome} e i suoi dati dell’app (chat, preferenze) vengono cancellati. L’operazione non si annulla.`,
      confirmLabel: 'Elimina', danger: true,
    }))) return
    await esegui(() => opAdminApi.elimina(id, d.id), 'Account eliminato.')
  }

  const cambiaStato = async () => {
    if (!cliente) return
    const sospendi = cliente.stato === 'attivo'
    if (sospendi && !(await confirm({
      title: 'Sospendi abbonamento',
      message: `Con l’abbonamento sospeso nessun utente di ${cliente.ragioneSociale} può entrare nell’app e le sessioni aperte si chiudono. Si può riattivare in seguito.`,
      confirmLabel: 'Sospendi', danger: true,
    }))) return
    await esegui(
      () => opAdminApi.stato(id, sospendi ? 'sospeso' : 'attivo'),
      sospendi ? 'Abbonamento sospeso: nessun utente dell’azienda può entrare.' : 'Abbonamento riattivato.',
    )
  }

  const salvaDati = () => {
    setTentato(true)
    const { pronti, ok } = validaDati(dati)
    if (!ok) return
    esegui(() => opAdminApi.aggiornaCliente(id, pronti), 'Dati salvati.')
  }

  const platformCambiato = idPlatform !== (cliente?.idAziendaPlatform ?? null)
  const salvaPlatform = () => {
    if (!platformCambiato) return
    esegui(
      () => opAdminApi.platform(id, idPlatform),
      idPlatform ? 'Collegamento con Sibylla Platform salvato.' : 'Azienda scollegata da Sibylla Platform: ora è stand alone.',
    )
  }

  const repartiAttivi = Object.keys(cliente?.reparti ?? {}) as RepartoOp[]
  const amministratori = dipendenti.filter(d => d.livello === 'amministratore')
  const erroriDati = tentato ? validaDati(dati).errori : {}

  return (
    <div className="sibylla-op">
      <PageHead
        title={cliente?.ragioneSociale ?? 'Azienda'}
        subtitle={cliente
          ? `Piano ${nomePiano(cliente.piano)} · attiva dal ${formatoData(cliente.attivoDal)}${cliente.scadeIl ? ` · scade il ${formatoData(cliente.scadeIl)}` : ''} · ${cliente.idAziendaPlatform ? 'integrata con Sibylla Platform' : 'stand alone'}`
          : undefined}
        backLabel="Aziende"
        onBack={onBack}
        actions={cliente && (
          <div className="sibylla-op__azioni-testa">
            <StatusBadge variant={cliente.stato === 'attivo' ? 'success' : 'warning'}>{cliente.stato === 'attivo' ? 'Attivo' : 'Sospeso'}</StatusBadge>
            <Button variant={cliente.stato === 'attivo' ? 'secondary' : 'primary'} onClick={cambiaStato} loading={salvo}>
              {cliente.stato === 'attivo' ? 'Sospendi abbonamento' : 'Riattiva abbonamento'}
            </Button>
            <Button variant="secondary" icon="trash" onClick={() => setElimina(true)}>Elimina azienda</Button>
          </div>
        )}
      />
      {problema && <p className="sibylla-op__errore">{problema}</p>}

      {cliente && (
        <>
          <p className="sibylla-op__nota">
            Strutture, piani, camere e utenti li configura l’amministratore dell’azienda nella sua area, su sibyllaop.it/azienda; qui li puoi
            gestire anche tu.
          </p>
          <Tabs
            tabs={[
              { id: 'azienda', label: 'Azienda e abbonamento' },
              { id: 'reparti', label: 'Reparti e moduli' },
              { id: 'amministratori', label: `Amministratori (${amministratori.length})` },
              { id: 'dipendenti', label: `Dipendenti (${dipendenti.length})` },
              { id: 'strutture', label: 'Strutture e camere' },
              { id: 'qr', label: 'QR code' },
            ]}
            active={scheda}
            onChange={t => setScheda(t as Scheda)}
          />

          {scheda === 'azienda' && (
            <div className="sibylla-op__sezione">
              <Card title="Azienda e abbonamento">
                <div className="sibylla-op__sezione">
                  <DatiForm dati={dati} onChange={setDati} errori={erroriDati} />
                  <p className="sibylla-op__nota">
                    Strutture: {cliente.strutture.map(s => s.nome).join(', ') || '—'} · azienda dal {formatoData(cliente.creatoIl)}
                  </p>
                  <div className="sibylla-op__salva">
                    <Button variant="secondary" onClick={() => { setDati(cliente); setTentato(false) }}>Annulla</Button>
                    <Button onClick={salvaDati} loading={salvo}>Salva i dati</Button>
                  </div>
                </div>
              </Card>
              <Card title="Sibylla Platform">
                <div className="sibylla-op__sezione">
                  <p className="sibylla-op__nota">
                    Azienda di Sibylla Platform con cui è integrata: i suoi utenti vedono in AppOp! › Business Intelligence i dati di Op di
                    questa azienda (sola lettura).
                  </p>
                  <div className="sibylla-op-form">
                    <SelettorePlatform value={idPlatform} onChange={setIdPlatform} clienti={clienti} escludi={id} scollegabile />
                  </div>
                  <div className="sibylla-op__salva">
                    <Button onClick={salvaPlatform} loading={salvo} disabled={!platformCambiato}>Salva il collegamento</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {scheda === 'reparti' && (
            <div className="sibylla-op__sezione">
              <p className="sibylla-op__nota">
                Cosa possono usare gli utenti dell’azienda nell’app. I dipendenti vedono solo i moduli attivi.
                {cliente.idAziendaPlatform ? ' Integrata con Platform: ci sono anche le funzioni del gestionale alberghiero.' : ''}
              </p>
              {/* Stand alone: senza le funzioni del gestionale, come su sibyllaop.it/admin; integrata: anche Check In, Check Out… */}
              <OpModuliEditor value={reparti} onChange={setReparti} senzaPms={!cliente.idAziendaPlatform} />
              {Object.keys(reparti).length === 0 && <p className="sibylla-op__errore">Attiva almeno un reparto.</p>}
              <div className="sibylla-op__salva">
                <Button variant="secondary" onClick={() => setReparti(cliente.reparti)}>Annulla</Button>
                <Button onClick={() => esegui(() => opAdminApi.reparti(id, reparti), 'Reparti e moduli salvati.')} loading={salvo} disabled={Object.keys(reparti).length === 0}>
                  Salva reparti e moduli
                </Button>
              </div>
            </div>
          )}

          {scheda === 'amministratori' && (
            <div className="sibylla-op__sezione">
              <div className="sibylla-op__bar">
                <p className="sibylla-op__nota">Entrano nell’area admin dell’azienda (sibyllaop.it/azienda) e configurano strutture, camere e utenti.</p>
                <Button icon="plus" onClick={() => setNuovoAdmin(true)}>Aggiungi amministratore</Button>
              </div>
              {amministratori.length === 0
                ? <p className="sibylla-op__nota">Nessun amministratore: aggiungine uno, riceverà l’invito via email.</p>
                : <OpDipendentiTable dipendenti={amministratori} onModifica={setModifica} onInvito={invita} />}
            </div>
          )}

          {scheda === 'dipendenti' && (
            <div className="sibylla-op__sezione">
              <div className="sibylla-op__bar">
                <p className="sibylla-op__nota">Ogni dipendente riceve un codice di invito via email e con quello crea la password nell’app.</p>
                <Button icon="plus" onClick={() => setModifica(null)} disabled={repartiAttivi.length === 0}>Nuova utenza</Button>
              </div>
              <OpDipendentiTable dipendenti={dipendenti} onModifica={setModifica} onInvito={invita} onBlocco={blocca} onElimina={eliminaDipendente} />
            </div>
          )}

          {scheda === 'strutture' && (
            <div className="sibylla-op__sezione">
              <OpStruttureEditor idCliente={id} dipendenti={dipendenti} />
            </div>
          )}

          {scheda === 'qr' && (
            <div className="sibylla-op__sezione">
              <p className="sibylla-op__nota">QR code dell’azienda per ogni sua struttura, nei formati che l’app Op! riconosce.</p>
              <OpQrGenerator cliente={{ tipo: 'indipendente', id }} />
            </div>
          )}

          <NuovoAmministratore
            open={nuovoAdmin}
            cliente={cliente}
            onClose={() => setNuovoAdmin(false)}
            onCreato={(nome, inv) => { setNuovoAdmin(false); if (inv) setInvito({ nome, invito: inv }); carica() }}
          />
          <EliminaAzienda open={elimina} cliente={cliente} onClose={() => setElimina(false)} onEliminata={onBack} />
        </>
      )}

      <OpDipendenteModal
        open={modifica !== undefined}
        dipendente={modifica}
        reparti={repartiAttivi}
        moduli={cliente?.reparti ?? {}}
        onClose={() => setModifica(undefined)}
        onSalva={salvaDipendente}
      />
      <OpInvitoModal invito={invito?.invito ?? null} nome={invito?.nome ?? ''} onClose={() => setInvito(null)} />
    </div>
  )
}

function NuovoAmministratore({ open, cliente, onClose, onCreato }: {
  open: boolean; cliente: DettaglioCliente; onClose: () => void; onCreato: (nome: string, invito: InvitoOp | null) => void
}) {
  const [admin, setAdmin] = useState<Amministratore>({ nome: '', cognome: '', email: '' })
  const [tentato, setTentato] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => { if (open) { setAdmin({ nome: '', cognome: '', email: '' }); setTentato(false); setProblema(null) } }, [open])

  const errori = erroriAmministratore(admin)

  const crea = async () => {
    setTentato(true)
    if (errori.nome || errori.cognome || errori.email) return
    setSalvo(true)
    setProblema(null)
    try {
      const r = await opAdminApi.nuovoAmministratore(cliente.id, { nome: admin.nome.trim(), cognome: admin.cognome.trim(), email: admin.email.trim() })
      toast.success(`Amministratore ${r.dipendente.nome} ${r.dipendente.cognome} creato.`, 'Sibylla Op!')
      onCreato(`${r.dipendente.nome} ${r.dipendente.cognome}`, r.invito)
    } catch (e) {
      setProblema(errore(e))
    } finally {
      setSalvo(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuovo amministratore" size="lg">
      <div className="sibylla-op-modal">
        <p className="sibylla-op__nota">Riceve via email il codice per attivare il suo account e configurare {cliente.ragioneSociale}.</p>
        <AmministratoreForm admin={admin} onChange={setAdmin} errori={tentato ? errori : {}} />
        {problema && <p className="sibylla-op__errore">{problema}</p>}
        <div className="sibylla-op-modal__azioni">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={crea} loading={salvo}>Crea e invia l’invito</Button>
        </div>
      </div>
    </Modal>
  )
}

/** Come sibyllaop.it/admin: per eliminare l'azienda se ne riscrive la ragione sociale. */
function EliminaAzienda({ open, cliente, onClose, onEliminata }: {
  open: boolean; cliente: DettaglioCliente; onClose: () => void; onEliminata: () => void
}) {
  const [parola, setParola] = useState('')
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => { if (open) { setParola(''); setProblema(null) } }, [open])

  const elimina = async () => {
    setSalvo(true)
    setProblema(null)
    try {
      await opAdminApi.eliminaCliente(cliente.id)
      toast.success(`${cliente.ragioneSociale} eliminata.`, 'Sibylla Op!')
      onEliminata()
    } catch (e) {
      setProblema(e instanceof Error ? e.message : 'Azienda non eliminata.')
      setSalvo(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Elimina azienda" size="md">
      <div className="sibylla-op-modal">
        <p className="sibylla-op__nota">
          Si eliminano {cliente.ragioneSociale} e tutti i suoi dati: strutture, camere, utenti, turni, timbrature, segnalazioni, chat. Gli
          utenti non potranno più entrare{cliente.idAziendaPlatform ? ' e l’integrazione con Sibylla Platform si chiude' : ''}. Non si può
          tornare indietro.
        </p>
        <InputField name="confermaElimina" label={`Per confermare scrivi ${cliente.ragioneSociale}`} value={parola} onChange={e => setParola(e.target.value)} />
        {problema && <p className="sibylla-op__errore">{problema}</p>}
        <div className="sibylla-op-modal__azioni">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={elimina} loading={salvo} disabled={parola.trim() !== cliente.ragioneSociale.trim()}>Elimina definitivamente</Button>
        </div>
      </div>
    </Modal>
  )
}
