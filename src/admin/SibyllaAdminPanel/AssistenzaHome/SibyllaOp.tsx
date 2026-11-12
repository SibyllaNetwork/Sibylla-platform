import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tabs from '../../../core/components/Tabs'
import Card from '../../../core/components/Card'
import AlertBanner from '../../../core/components/AlertBanner'
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
  type AnteprimaPlatform, type ClienteOp, type DatiCliente, type DettaglioCliente, type DipendenteOp, type DipendenteRichiesta, type InvitoOp,
  type PianoCliente, type TipoAziendaOp,
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
  { value: 'struttura', label: 'Monostruttura' },
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

/**
 * Stesse regole di sibyllaop.it/admin (apps/mobile/src/admin/tecnico/validazione.ts in sibylla-op). Azienda integrata
 * (`soloAbbonamento`): i dati dell'azienda arrivano da Platform, si controllano solo le date dell'abbonamento.
 */
function validaDati(dati: DatiCliente, soloAbbonamento = false) {
  const errori: ErroriDati = {}
  if (!soloAbbonamento) {
    if (dati.ragioneSociale.trim().length < 2) errori.ragioneSociale = 'Indica la ragione sociale.'
    if (dati.partitaIva && !/^[A-Z]{0,2}\d{8,13}$/i.test(dati.partitaIva.replace(/\s/g, ''))) errori.partitaIva = 'Partita IVA non valida.'
    if (dati.emailReferente && !emailOk(dati.emailReferente)) errori.emailReferente = 'Email non valida.'
    if (dati.pec && !emailOk(dati.pec)) errori.pec = 'Indirizzo PEC non valido.'
  }
  if (dati.attivoDal && dati.scadeIl && dati.scadeIl < dati.attivoDal) errori.scadeIl = 'La scadenza è prima dell’attivazione.'
  const pronti: DatiCliente = soloAbbonamento ? dati : {
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
//  stile di Platform: elenco delle aziende Op!, nuova azienda e scheda
//  dell'azienda (dati e abbonamento, integrazione con Platform, reparti e moduli,
//  amministratori, sospensione, eliminazione) più dipendenti, strutture e QR.
//  Come su sibyllaop.it/admin, la prima scelta della nuova azienda è il tipo:
//  - INTEGRATA con Sibylla Platform: dati dell'azienda, strutture, camere e
//    dipendenti con i ruoli arrivano da Platform e si aggiornano da soli (Op.Api
//    rifiuta le loro modifiche); qui si configurano solo abbonamento, reparti e
//    moduli, e dalla scheda si mandano gli inviti. Può usare anche le funzioni
//    del gestionale alberghiero (Check In, Check Out…).
//  - STAND ALONE: si inserisce tutto a mano (dati, strutture, amministratore con
//    invito, che poi configura camere e utenti su sibyllaop.it/azienda).
//  Un'azienda stand alone si può integrare in seguito dalla scheda, e
//  un'integrata può tornare stand alone (i dati restano).
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
        <PageHead title="Sibylla Op!" subtitle="Aziende dell’app Op!, integrate con Sibylla Platform o stand alone." back={false} />
      )}

      <div className="sibylla-op__bar">
        <SearchField value={cerca} placeholder="Cerca per ragione sociale o partita IVA" onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} className="sibylla-op__cerca" />
        <Button icon="plus" onClick={() => setNuova(true)}>Nuova azienda</Button>
      </div>
      <p className="sibylla-op__nota">
        Le aziende che usano Sibylla Op!. Integrate con Sibylla Platform: dati, strutture, camere e dipendenti arrivano da Platform. Stand
        alone: si inserisce tutto a mano e l’amministratore dell’azienda configura il resto.
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
 * Azienda di Sibylla Platform con cui integrare l'azienda Op (una sola per azienda Op, e viceversa). Elenco dal
 * Portal; quelle già integrate con un'altra azienda Op sono disattivate. Senza Portal si scrive l'id a mano.
 */
function SelettorePlatform({ value, onChange, clienti, escludi, error }: {
  value: number | null
  onChange: (id: number | null) => void
  clienti: ClienteOp[]
  /** Azienda Op da integrare (il suo collegamento non conta come "già usato"). */
  escludi?: number
  error?: string
}) {
  const { aziende, problema } = useAziendePlatform()
  const [testo, setTesto] = useState(value ? String(value) : '')

  if (aziende === null) return <InputField name="aziendaPlatform" label="Azienda di Sibylla Platform" value="Caricamento…" disabled />

  if (problema) {
    return (
      <InputField
        name="idAziendaPlatform"
        label="Id dell’azienda in Sibylla Platform"
        required
        value={testo}
        error={error}
        hint="Elenco delle aziende di Platform non disponibile: scrivi l’id numerico."
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
      required
      placeholder="Scegli l’azienda di Platform"
      options={opzioni}
      value={value ? String(value) : ''}
      error={error}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
    />
  )
}

/** L'anteprima permette di confermare: azienda di Platform con strutture e non già integrata con un'altra azienda Op. */
const anteprimaValida = (a: AnteprimaPlatform | null): a is AnteprimaPlatform => !!a && a.strutture.length > 0 && !a.giaCollegataA

const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`

/**
 * Azienda di Sibylla Platform con il pulsante "Verifica": legge da Platform cosa arriverà (ragione sociale, strutture
 * con camere, dipendenti) e lo mostra prima della conferma. Come VerificaPlatform di sibyllaop.it/admin.
 */
function VerificaPlatform({ clienti, cliente, anteprima, onAnteprima }: {
  clienti: ClienteOp[]
  /** Azienda Op già esistente da integrare (assente: nuova azienda). */
  cliente?: number
  anteprima: AnteprimaPlatform | null
  onAnteprima: (a: AnteprimaPlatform | null) => void
}) {
  const [idPlatform, setIdPlatform] = useState<number | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [lavoro, setLavoro] = useState(false)

  const verifica = async () => {
    if (!idPlatform) { setProblema('Scegli l’azienda di Sibylla Platform.'); return }
    setLavoro(true)
    setProblema(null)
    onAnteprima(null)
    try {
      onAnteprima(await opAdminApi.anteprimaPlatform(idPlatform, cliente))
    } catch (e) {
      setProblema(errore(e))
    } finally {
      setLavoro(false)
    }
  }

  return (
    <div className="sibylla-op__sezione">
      <div className="sibylla-op__verifica">
        <div className="sibylla-op__verifica-campo">
          <SelettorePlatform
            value={idPlatform}
            clienti={clienti}
            escludi={cliente}
            error={problema ?? undefined}
            onChange={id => { setIdPlatform(id); setProblema(null); if (anteprima) onAnteprima(null) }}
          />
        </div>
        <Button variant="secondary" onClick={verifica} loading={lavoro} disabled={!idPlatform} className="sibylla-op__verifica-btn">Verifica</Button>
      </div>
      {anteprima && <Anteprima a={anteprima} />}
    </div>
  )
}

/** Cosa arriva da Platform: azienda, strutture con camere, dipendenti e cosa va sistemato prima. */
function Anteprima({ a }: { a: AnteprimaPlatform }) {
  const camere = a.strutture.reduce((n, x) => n + x.camere, 0)
  return (
    <div className="sibylla-op__anteprima">
      <span className="sibylla-op__forte">{a.ragioneSociale}</span>
      <span className="sibylla-op__tenue">
        {[a.partitaIva ? `P. IVA ${a.partitaIva}` : null, a.indirizzo].filter(Boolean).join(' · ') || `Azienda n. ${a.idAziendaPlatform} di Sibylla Platform`}
      </span>
      <span>
        {plurale(a.strutture.length, 'struttura', 'strutture')} · {plurale(camere, 'camera', 'camere')} · {plurale(a.dipendenti, 'dipendente', 'dipendenti')}
      </span>
      {a.strutture.length > 0 && (
        <ul className="sibylla-op__anteprima-elenco">
          {a.strutture.map(x => (
            <li key={x.nome}>{x.nome}{x.tipo === 'outlet' ? ' (outlet, senza camere)' : ` · ${plurale(x.camere, 'camera', 'camere')}`}</li>
          ))}
        </ul>
      )}
      {a.strutture.length === 0 && (
        <AlertBanner type="error">In Sibylla Platform l’azienda non ha strutture: aggiungile in Platform prima di continuare.</AlertBanner>
      )}
      {a.dipendentiSenzaEmail > 0 && (
        <AlertBanner type="warning">
          {a.dipendentiSenzaEmail === 1
            ? '1 dipendente non ha l’email in Sibylla Platform: non potrà entrare nell’app finché non viene aggiunta in Platform.'
            : `${a.dipendentiSenzaEmail} dipendenti non hanno l’email in Sibylla Platform: non potranno entrare nell’app finché non viene aggiunta in Platform.`}
        </AlertBanner>
      )}
      {a.giaCollegataA && <AlertBanner type="error">Questa azienda di Sibylla Platform è già integrata con {a.giaCollegataA}.</AlertBanner>}
    </div>
  )
}

/**
 * Riquadro "Sibylla Platform" della scheda. Integrata: stato del riallineamento (in tempo reale dagli avvisi del Portal e
 * dal controllo periodico), "Riallinea ora" e "Termina integrazione". Stand alone: si integra con un'azienda di Platform.
 */
function SchedaIntegrazione({ cliente, clienti, nomePlatform, salvo, onEsegui }: {
  cliente: DettaglioCliente
  clienti: ClienteOp[]
  nomePlatform: (id: number) => string
  salvo: boolean
  onEsegui: (azione: () => Promise<unknown>, ok: string) => Promise<void>
}) {
  const confirm = useConfirmStore(s => s.confirm)
  const [anteprima, setAnteprima] = useState<AnteprimaPlatform | null>(null)

  if (cliente.integrata && cliente.integrazione) {
    const i = cliente.integrazione
    const termina = async () => {
      if (!(await confirm({
        title: 'Terminare l’integrazione?',
        message: `${cliente.ragioneSociale} torna stand alone: i dati restano in Op così come sono, ma non arrivano più da Sibylla Platform e da qui in poi si modificano in Op.`,
        confirmLabel: 'Torna stand alone', danger: true,
      }))) return
      await onEsegui(() => opAdminApi.terminaIntegrazione(cliente.id), 'Integrazione terminata: ora l’azienda è stand alone.')
    }
    return (
      <Card title="Integrazione con Sibylla Platform">
        <div className="sibylla-op__sezione">
          <p className="sibylla-op__nota">
            Integrata con {cliente.idAziendaPlatform ? nomePlatform(cliente.idAziendaPlatform) : 'Sibylla Platform'} dal {formatoData(i.attivaDal)}.
            Dati dell’azienda, strutture, camere e dipendenti con i loro ruoli arrivano da Platform e si aggiornano da soli a ogni modifica in
            Platform. Qui si configurano abbonamento, reparti e moduli.
          </p>
          <p className="sibylla-op__nota">
            Ultimo allineamento: {i.ultimoRiallineamento ? new Date(i.ultimoRiallineamento).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : 'mai'}
          </p>
          {i.errore && <AlertBanner type="error">{i.errore}</AlertBanner>}
          {i.avvisi.map(a => <AlertBanner key={a} type="warning">{a}</AlertBanner>)}
          <div className="sibylla-op__salva">
            <Button variant="secondary" icon="link-slash" onClick={termina} disabled={salvo}>Termina integrazione</Button>
            <Button icon="rotate" onClick={() => onEsegui(() => opAdminApi.riallinea(cliente.id), 'Dati riallineati con Sibylla Platform.')} loading={salvo}>
              Riallinea ora
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const integra = async () => {
    if (!anteprimaValida(anteprima)) return
    const scelta = anteprima
    if (!(await confirm({
      title: 'Integrare con Sibylla Platform?',
      message: `Da ora dati, strutture, camere e dipendenti di ${cliente.ragioneSociale} arrivano da ${scelta.ragioneSociale} in Sibylla Platform. Strutture e dipendenti già in Op si abbinano per nome ed email e tengono i loro dati; chi non è in Platform perde l’accesso all’app.`,
      confirmLabel: 'Integra', danger: false,
    }))) return
    await onEsegui(() => opAdminApi.integra(cliente.id, scelta.idAziendaPlatform), 'Azienda integrata con Sibylla Platform.')
    setAnteprima(null)
  }

  return (
    <Card title="Integra con Sibylla Platform">
      <div className="sibylla-op__sezione">
        <p className="sibylla-op__nota">
          L’azienda è stand alone. Se è un’azienda di Sibylla Platform, integrala: da quel momento dati, strutture, camere e dipendenti
          arrivano da Platform e si aggiornano da soli.
        </p>
        <VerificaPlatform clienti={clienti} cliente={cliente.id} anteprima={anteprima} onAnteprima={setAnteprima} />
        <div className="sibylla-op__salva">
          <Button onClick={integra} loading={salvo} disabled={!anteprimaValida(anteprima)}>Usa i dati di Platform</Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Nuova azienda ────────────────────────────────────────────────────────────

interface Amministratore { nome: string; cognome: string; email: string }

/** Prima scelta di "Azienda e abbonamento", come su sibyllaop.it/admin. */
type Modalita = 'platform' | 'standalone'

const MODALITA: { value: Modalita; label: string }[] = [
  { value: 'platform', label: 'Integrata con Sibylla Platform' },
  { value: 'standalone', label: 'Stand alone' },
]

/**
 * Come sibyllaop.it/admin → Nuova azienda. Integrata: l'azienda di Platform (verificata), abbonamento, reparti e moduli;
 * il resto arriva da Platform. Stand alone: dati e abbonamento, strutture, reparti con i moduli e l'amministratore
 * dell'azienda, che riceve l'invito via email e configura poi strutture, camere e utenti su sibyllaop.it/azienda.
 */
function NuovaAzienda({ clienti, onBack, onCreata }: { clienti: ClienteOp[]; onBack: () => void; onCreata: (a: Apertura) => void }) {
  const [modalita, setModalita] = useState<Modalita>('platform')
  const [anteprima, setAnteprima] = useState<AnteprimaPlatform | null>(null)
  const [dati, setDati] = useState<DatiCliente>(DATI_VUOTI)
  const [sede, setSede] = useState('')
  // Gruppo: le strutture che fanno capo all'azienda (Hotel Archimede, Hotel Luce…).
  const [strutture, setStrutture] = useState<string[]>([''])
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [admin, setAdmin] = useState<Amministratore>({ nome: '', cognome: '', email: '' })
  const [tentato, setTentato] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const integrata = modalita === 'platform'
  const { errori, pronti, ok } = validaDati(dati, integrata)
  const erroriAdmin = erroriAmministratore(admin)
  const adminOk = !erroriAdmin.nome && !erroriAdmin.cognome && !erroriAdmin.email
  const repartiOk = Object.keys(reparti).length > 0
  const nomiStrutture = strutture.map(x => x.trim()).filter(Boolean)
  const struttureOk = dati.tipo !== 'gruppo' || nomiStrutture.length > 0
  const tuttoOk = integrata ? ok && repartiOk && anteprimaValida(anteprima) : ok && adminOk && repartiOk && struttureOk

  const set = <K extends keyof DatiCliente>(k: K, v: DatiCliente[K]) => setDati(d => ({ ...d, [k]: v }))

  const creaIntegrata = async () => {
    if (!anteprimaValida(anteprima)) return
    const azienda = await opAdminApi.nuovaIntegrata({
      idAziendaPlatform: anteprima.idAziendaPlatform, piano: dati.piano, attivoDal: dati.attivoDal, scadeIl: dati.scadeIl, note: dati.note, reparti,
    })
    toast.success(`${azienda.ragioneSociale} creata e integrata con Sibylla Platform: manda gli inviti dalla scheda Dipendenti.`, 'Sibylla Op!')
    onCreata({ id: azienda.id })
  }

  const creaStandAlone = async () => {
    // Stand alone: senza idAziendaPlatform.
    const azienda = await opAdminApi.nuovoCliente({
      dati: pronti,
      reparti,
      ...(dati.tipo === 'gruppo' ? { strutture: nomiStrutture } : { nomeSede: sede.trim() || undefined }),
    })
    // L'azienda c'è: se l'invito dell'amministratore non parte, si riprova dalla scheda Amministratori.
    const nome = `${admin.nome.trim()} ${admin.cognome.trim()}`
    try {
      const r = await opAdminApi.nuovoAmministratore(azienda.id, { nome: admin.nome.trim(), cognome: admin.cognome.trim(), email: admin.email.trim() })
      toast.success(`${azienda.ragioneSociale} creata.`, 'Sibylla Op!')
      onCreata({ id: azienda.id, invito: r.invito ? { invito: r.invito, nome } : undefined })
    } catch (e) {
      toast.warning(`Azienda creata, ma l’amministratore non è stato invitato: ${errore(e)} Aggiungilo dalla scheda Amministratori.`, 'Sibylla Op!')
      onCreata({ id: azienda.id, scheda: 'amministratori' })
    }
  }

  const crea = async () => {
    setTentato(true)
    if (!tuttoOk) return
    setSalvo(true)
    setProblema(null)
    try {
      await (integrata ? creaIntegrata() : creaStandAlone())
    } catch (e) {
      setProblema(e instanceof Error ? e.message : 'Azienda non creata.')
      setSalvo(false)
    }
  }

  return (
    <div className="sibylla-op">
      <PageHead
        title="Nuova azienda"
        subtitle={integrata
          ? 'Integrata con Sibylla Platform: abbonamento, reparti e moduli. Dati, strutture e dipendenti arrivano da Platform.'
          : 'Dati e abbonamento, reparti e moduli dell’app e l’amministratore che configurerà l’azienda.'}
        backLabel="Aziende"
        onBack={onBack}
      />

      <Card title="Azienda e abbonamento">
        <div className="sibylla-op__sezione">
          <div className="sibylla-op-form">
            <RadioGroup
              name="modalita"
              label="L’azienda è"
              options={MODALITA}
              value={modalita}
              onChange={v => { setModalita(v as Modalita); setTentato(false); setProblema(null) }}
              className="sibylla-op-form__largo"
            />
          </div>

          {integrata ? (
            <>
              <p className="sibylla-op__nota">
                Dati dell’azienda, strutture, camere e dipendenti con i loro ruoli arrivano da Sibylla Platform e si aggiornano da soli a ogni
                modifica in Platform. Un’azienda di Platform si integra con una sola azienda Op.
              </p>
              <VerificaPlatform clienti={clienti} anteprima={anteprima} onAnteprima={setAnteprima} />
              {tentato && !anteprimaValida(anteprima) && (
                <p className="sibylla-op__errore">Verifica un’azienda di Sibylla Platform con almeno una struttura e non già integrata.</p>
              )}
              <div className="sibylla-op-form">
                <SelectField name="piano" label="Piano" value={dati.piano} options={PIANI} onChange={e => set('piano', e.target.value as PianoCliente)} />
                <DatePickerField name="attivoDal" label="Attivo dal" hint="Vuoto: da oggi" value={soloData(dati.attivoDal)} onChange={e => set('attivoDal', e.target.value ? `${e.target.value}T00:00:00Z` : null)} />
                <DatePickerField name="scadeIl" label="Scade il" hint="Vuoto: senza scadenza" value={soloData(dati.scadeIl)} error={tentato ? errori.scadeIl : undefined} onChange={e => set('scadeIl', e.target.value ? `${e.target.value}T00:00:00Z` : null)} />
                <TextareaField name="note" label="Note" rows={3} value={dati.note ?? ''} onChange={e => set('note', e.target.value.trim() ? e.target.value : null)} className="sibylla-op-form__largo" />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </Card>

      {!integrata && dati.tipo === 'gruppo' && (
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
            Cosa può usare l’azienda nell’app. Si può cambiare in seguito.
            {integrata ? ' Integrata con Platform, può usare anche le funzioni del gestionale alberghiero (Check In, Check Out, Servizi in camera, Ospiti del giorno).' : ''}
          </p>
          {/* Stand alone: senza le funzioni del gestionale, come su sibyllaop.it/admin; integrata: anche Check In, Check Out… */}
          <OpModuliEditor value={reparti} onChange={setReparti} senzaPms={!integrata} />
          {!repartiOk && <p className="sibylla-op__errore">Attiva almeno un reparto.</p>}
        </div>
      </Card>

      {integrata ? (
        <p className="sibylla-op__nota">
          I dipendenti arrivano da Sibylla Platform con i loro ruoli: gli inviti all’app si mandano dalla scheda dell’azienda, tab Dipendenti.
        </p>
      ) : (
        <Card title="Amministratore dell’azienda">
          <div className="sibylla-op__sezione">
            <p className="sibylla-op__nota">
              Riceve l’invito via email. Entra nell’area admin dell’azienda (sibyllaop.it/azienda) e crea strutture, piani, camere e utenti.
            </p>
            <AmministratoreForm admin={admin} onChange={setAdmin} errori={tentato ? erroriAdmin : {}} />
          </div>
        </Card>
      )}

      {tentato && !tuttoOk && <p className="sibylla-op__errore">Controlla i campi segnati.</p>}
      {problema && <p className="sibylla-op__errore">{problema}</p>}
      <div className="sibylla-op__salva">
        <Button variant="secondary" onClick={onBack}>Annulla</Button>
        {integrata
          ? <Button onClick={crea} loading={salvo} disabled={!anteprimaValida(anteprima)}>Crea l’azienda integrata</Button>
          : <Button onClick={crea} loading={salvo}>Crea l’azienda e invita l’amministratore</Button>}
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

/**
 * Dati dell'azienda (anagrafica e abbonamento), con i campi di sibyllaop.it/admin. Azienda integrata (`soloAbbonamento`):
 * l'anagrafica arriva da Sibylla Platform e si vede soltanto; si modificano referente, abbonamento e note.
 */
function DatiForm({ dati, onChange, errori, soloAbbonamento = false }: {
  dati: DatiCliente; onChange: (d: DatiCliente) => void; errori: ErroriDati; soloAbbonamento?: boolean
}) {
  const set = <K extends keyof DatiCliente>(k: K, v: DatiCliente[K]) => onChange({ ...dati, [k]: v })
  const testo = (v: string) => (v.trim() ? v : null)
  const daPlatform = soloAbbonamento
  return (
    <div className="sibylla-op-form">
      {daPlatform && (
        <p className="sibylla-op__nota sibylla-op-form__largo">
          Ragione sociale, partita IVA, sedi, contatti e tipo di azienda arrivano da Sibylla Platform e si modificano lì.
        </p>
      )}
      <RadioGroup name="tipo" label="Tipo di azienda" options={TIPI} value={dati.tipo} disabled={daPlatform} onChange={v => set('tipo', v as TipoAziendaOp)} className="sibylla-op-form__largo" />
      <InputField name="ragioneSociale" label="Ragione sociale" required value={dati.ragioneSociale} readOnly={daPlatform} error={errori.ragioneSociale} onChange={e => set('ragioneSociale', e.target.value)} maxLength={200} className="sibylla-op-form__largo" />
      <InputField name="partitaIva" label="Partita IVA" value={dati.partitaIva ?? ''} readOnly={daPlatform} error={errori.partitaIva} onChange={e => set('partitaIva', testo(e.target.value))} maxLength={20} />
      <InputField name="telefono" type="tel" label="Telefono" value={dati.telefono ?? ''} readOnly={daPlatform} onChange={e => set('telefono', testo(e.target.value))} maxLength={40} />
      <InputField name="indirizzo" label="Sede operativa" value={dati.indirizzo ?? ''} readOnly={daPlatform} onChange={e => set('indirizzo', testo(e.target.value))} maxLength={300} />
      <InputField name="sedeLegale" label="Sede legale" value={dati.sedeLegale ?? ''} readOnly={daPlatform} onChange={e => set('sedeLegale', testo(e.target.value))} maxLength={300} />
      <InputField name="pec" type="email" label="Contatto PEC" placeholder={daPlatform ? undefined : 'azienda@pec.it'} value={dati.pec ?? ''} readOnly={daPlatform} error={errori.pec} onChange={e => set('pec', testo(e.target.value))} maxLength={254} />
      <InputField name="referente" label="Referente" value={dati.referente ?? ''} onChange={e => set('referente', testo(e.target.value))} maxLength={120} />
      <InputField name="emailReferente" type="email" label="Email del referente" value={dati.emailReferente ?? ''} readOnly={daPlatform} error={errori.emailReferente} onChange={e => set('emailReferente', testo(e.target.value))} maxLength={254} />
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
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [dipendenti, setDipendenti] = useState<DipendenteOp[]>([])
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [modifica, setModifica] = useState<DipendenteOp | null | undefined>(undefined)
  const [invito, setInvito] = useState<{ invito: InvitoOp; nome: string } | null>(invitoIniziale ?? null)
  const [nuovoAdmin, setNuovoAdmin] = useState(false)
  const [elimina, setElimina] = useState(false)
  const { aziende } = useAziendePlatform()

  const carica = useCallback(async () => {
    try {
      const [c, d, tutti] = await Promise.all([opAdminApi.cliente(id), opAdminApi.dipendenti(id), opAdminApi.clienti()])
      setCliente(c)
      setDati(c)
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

  // Integrata con Sibylla Platform: strutture, camere e dipendenti arrivano da Platform (Op.Api ne rifiuta le modifiche).
  const integrata = !!cliente?.integrata

  const salvaDati = () => {
    setTentato(true)
    const { pronti, ok } = validaDati(dati, integrata)
    if (!ok) return
    esegui(() => opAdminApi.aggiornaCliente(id, pronti), 'Dati salvati.')
  }

  const repartiAttivi = Object.keys(cliente?.reparti ?? {}) as RepartoOp[]
  const amministratori = dipendenti.filter(d => d.livello === 'amministratore')
  const erroriDati = tentato ? validaDati(dati, integrata).errori : {}
  const nomePlatform = (idP: number) => aziende?.find(a => a.id === idP)?.nome ?? `l’azienda n. ${idP} di Sibylla Platform`

  return (
    <div className="sibylla-op">
      <PageHead
        title={cliente?.ragioneSociale ?? 'Azienda'}
        subtitle={cliente
          ? `Piano ${nomePiano(cliente.piano)} · attiva dal ${formatoData(cliente.attivoDal)}${cliente.scadeIl ? ` · scade il ${formatoData(cliente.scadeIl)}` : ''} · ${cliente.integrata ? 'integrata con Sibylla Platform' : 'stand alone'}`
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
          {integrata
            ? (
              <AlertBanner type="info">
                Azienda integrata con Sibylla Platform: dati dell’azienda, strutture, camere e dipendenti si modificano in Sibylla Platform e
                arrivano qui da soli. Qui si configurano abbonamento, reparti e moduli e si mandano gli inviti all’app.
              </AlertBanner>
            )
            : (
              <p className="sibylla-op__nota">
                Strutture, piani, camere e utenti li configura l’amministratore dell’azienda nella sua area, su sibyllaop.it/azienda; qui li puoi
                gestire anche tu.
              </p>
            )}
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
                  <DatiForm dati={dati} onChange={setDati} errori={erroriDati} soloAbbonamento={integrata} />
                  <p className="sibylla-op__nota">
                    Strutture: {cliente.strutture.map(s => s.nome).join(', ') || '—'} · azienda dal {formatoData(cliente.creatoIl)}
                  </p>
                  <div className="sibylla-op__salva">
                    <Button variant="secondary" onClick={() => { setDati(cliente); setTentato(false) }}>Annulla</Button>
                    <Button onClick={salvaDati} loading={salvo}>{integrata ? 'Salva referente e abbonamento' : 'Salva i dati'}</Button>
                  </div>
                </div>
              </Card>
              <SchedaIntegrazione cliente={cliente} clienti={clienti} nomePlatform={nomePlatform} salvo={salvo} onEsegui={esegui} />
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
                {integrata
                  ? <p className="sibylla-op__nota">Gli amministratori arrivano da Sibylla Platform con il loro ruolo e si modificano lì: da qui mandi l’invito all’app.</p>
                  : <p className="sibylla-op__nota">Entrano nell’area admin dell’azienda (sibyllaop.it/azienda) e configurano strutture, camere e utenti.</p>}
                {!integrata && <Button icon="plus" onClick={() => setNuovoAdmin(true)}>Aggiungi amministratore</Button>}
              </div>
              {amministratori.length === 0
                ? <p className="sibylla-op__nota">{integrata ? 'Nessun amministratore tra i dipendenti di Sibylla Platform.' : 'Nessun amministratore: aggiungine uno, riceverà l’invito via email.'}</p>
                : <OpDipendentiTable dipendenti={amministratori} onModifica={setModifica} onInvito={invita} />}
            </div>
          )}

          {scheda === 'dipendenti' && (
            <div className="sibylla-op__sezione">
              {integrata && (
                <AlertBanner type="info">
                  I dipendenti, con nome, email, grado e reparti, si modificano in Sibylla Platform e arrivano qui da soli. Da qui mandi gli inviti,
                  blocchi l’accesso e spegni moduli e pagine alla persona.
                </AlertBanner>
              )}
              <div className="sibylla-op__bar">
                <p className="sibylla-op__nota">Ogni dipendente riceve un codice di invito via email e con quello crea la password nell’app.</p>
                {!integrata && <Button icon="plus" onClick={() => setModifica(null)} disabled={repartiAttivi.length === 0}>Nuova utenza</Button>}
              </div>
              <OpDipendentiTable dipendenti={dipendenti} onModifica={setModifica} onInvito={invita} onBlocco={blocca} onElimina={integrata ? undefined : eliminaDipendente} />
            </div>
          )}

          {scheda === 'strutture' && (
            <div className="sibylla-op__sezione">
              {integrata && (
                <AlertBanner type="info">
                  Strutture, camere e dipendenti di ogni struttura si modificano in Sibylla Platform e arrivano qui da soli. I QR sono nella scheda
                  QR code.
                </AlertBanner>
              )}
              <OpStruttureEditor idCliente={id} dipendenti={dipendenti} solaLettura={integrata} />
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
        soloModuli={integrata}
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
          utenti non potranno più entrare{cliente.integrata ? ' e l’integrazione con Sibylla Platform si chiude' : ''}. Non si può
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
