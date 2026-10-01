import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tabs from '../../../core/components/Tabs'
import StatusBadge from '../../../core/components/StatusBadge'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import Button from '../../../core/components/Button/Button'
import { DatePickerField, InputField, SearchField, SelectField, TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import OpModuliEditor from '../../../modules/appop/OpModuliEditor'
import OpDipendenteModal from '../../../modules/appop/OpDipendenteModal'
import OpDipendentiTable from '../../../modules/appop/OpDipendentiTable'
import OpInvitoModal from '../../../modules/appop/OpInvitoModal'
import { nomeReparto, type RepartiModuli, type RepartoOp } from '../../../modules/appop/opCatalogo'
import {
  formatoData, opAdminApi,
  type ClienteOp, type DatiCliente, type DettaglioCliente, type DipendenteOp, type DipendenteRichiesta, type InvitoOp, type PianoCliente,
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

const DATI_VUOTI: DatiCliente = {
  ragioneSociale: '', partitaIva: null, indirizzo: null, referente: null, emailReferente: null, telefono: null,
  piano: 'base', attivoDal: null, scadeIl: null, note: null,
}

const soloData = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const errore = (e: unknown) => (e instanceof Error ? e.message : 'Operazione non riuscita.')

// ─── SIBYLLA OP! ──────────────────────────────────────────────────────────────
//  Clienti indipendenti dell'app Op! (aziende senza Sibylla Platform): elenco con
//  abbonamento e dipendenti, poi la scheda del cliente con i dati dell'azienda,
//  i reparti con i moduli e le utenze dei dipendenti (invito, blocco, eliminazione).
//  Dati e regole stanno in Op.Api (/admin/indipendenti). Sta nel pannello
//  Sibylla Admin → Piattaforma, dopo "Piattaforma admin".
export default function SibyllaOp({ incorporata = false }: Props) {
  const [clienti, setClienti] = useState<ClienteOp[] | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [cerca, setCerca] = useState('')
  const [aperto, setAperto] = useState<number | null>(null)
  const [nuovo, setNuovo] = useState(false)

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

  if (aperto !== null) {
    return <SchedaCliente id={aperto} onBack={() => { setAperto(null); carica() }} />
  }

  return (
    <div className="sibylla-op">
      {!incorporata && (
        <PageHead title="Sibylla Op!" subtitle="Clienti indipendenti dell’app Op!: aziende che la usano senza Sibylla Platform." back={false} />
      )}

      <div className="sibylla-op__bar">
        <SearchField value={cerca} placeholder="Cerca per ragione sociale o partita IVA" onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} className="sibylla-op__cerca" />
        <Button icon="plus" onClick={() => setNuovo(true)}>Nuovo cliente</Button>
      </div>
      {problema && <p className="sibylla-op__errore">{problema}</p>}

      <div className="sib-table-wrap">
        <table className="sib-table sibylla-op__tabella">
          <colgroup>
            <col className="sibylla-op__c-nome" /><col className="sibylla-op__c-piva" /><col className="sibylla-op__c-piano" />
            <col className="sibylla-op__c-stato" /><col className="sibylla-op__c-scade" /><col className="sibylla-op__c-dip" />
            <col className="sibylla-op__c-reparti" /><col className="sibylla-op__c-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th>Ragione sociale</th><th>Partita IVA</th><th>Piano</th><th>Stato</th><th>Scadenza</th>
              <th>Dipendenti</th><th>Reparti</th><th className="sibylla-op__th-azioni">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti === null && <tr><td colSpan={8} className="sibylla-op__vuoto">Caricamento…</td></tr>}
            {clienti !== null && filtrati.length === 0 && (
              <tr><td colSpan={8} className="sibylla-op__vuoto">{clienti.length ? 'Nessun cliente trovato.' : 'Nessun cliente indipendente: aggiungi il primo.'}</td></tr>
            )}
            {filtrati.map(c => {
              const reparti = c.reparti.map(nomeReparto).join(', ') || '—'
              return (
                <tr key={c.id}>
                  <td><TruncatedText text={c.ragioneSociale} className="sibylla-op__testo sibylla-op__forte" /></td>
                  <td>{c.partitaIva ?? '—'}</td>
                  <td>{PIANI.find(p => p.value === c.piano)?.label ?? c.piano}</td>
                  <td><StatusBadge variant={c.stato === 'attivo' ? 'success' : 'warning'}>{c.stato === 'attivo' ? 'Attivo' : 'Sospeso'}</StatusBadge></td>
                  <td>{formatoData(c.scadeIl)}</td>
                  <td className="sibylla-op__num">{c.dipendentiAttivi} / {c.dipendenti}</td>
                  <td><TruncatedText text={reparti} className="sibylla-op__testo" /></td>
                  <td className="sibylla-op__azioni">
                    <Tooltip text="Apri la scheda del cliente">
                      <button type="button" className="sibylla-op__btn" aria-label={`Apri ${c.ragioneSociale}`} onClick={() => setAperto(c.id)}>
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

      <NuovoCliente
        open={nuovo}
        onClose={() => setNuovo(false)}
        onCreato={id => { setNuovo(false); setAperto(id) }}
      />
    </div>
  )
}

// ─── Nuovo cliente ────────────────────────────────────────────────────────────

function NuovoCliente({ open, onClose, onCreato }: { open: boolean; onClose: () => void; onCreato: (id: number) => void }) {
  const [dati, setDati] = useState<DatiCliente>(DATI_VUOTI)
  const [sede, setSede] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)

  useEffect(() => { if (open) { setDati(DATI_VUOTI); setSede(''); setProblema(null) } }, [open])

  const crea = async () => {
    if (dati.ragioneSociale.trim().length < 2) { setProblema('Indica la ragione sociale.'); return }
    setSalvo(true)
    try {
      const c = await opAdminApi.nuovoCliente({ ...dati, ragioneSociale: dati.ragioneSociale.trim() }, {}, sede.trim() || undefined)
      toast.success(`${c.ragioneSociale} creato: ora attiva i reparti e invita i dipendenti.`, 'Sibylla Op!')
      onCreato(c.id)
    } catch (e) {
      setProblema(errore(e))
    } finally {
      setSalvo(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuovo cliente indipendente" size="lg">
      <div className="sibylla-op-modal">
        <DatiForm dati={dati} onChange={setDati} />
        <InputField name="sede" label="Nome della sede" hint="Facoltativo: se vuoto si usa la ragione sociale." value={sede} onChange={e => setSede(e.target.value)} maxLength={200} />
        {problema && <p className="sibylla-op__errore">{problema}</p>}
        <div className="sibylla-op-modal__azioni">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={crea} loading={salvo}>Crea cliente</Button>
        </div>
      </div>
    </Modal>
  )
}

function DatiForm({ dati, onChange }: { dati: DatiCliente; onChange: (d: DatiCliente) => void }) {
  const set = <K extends keyof DatiCliente>(k: K, v: DatiCliente[K]) => onChange({ ...dati, [k]: v })
  const testo = (v: string) => (v.trim() ? v : null)
  return (
    <div className="sibylla-op-form">
      <InputField name="ragioneSociale" label="Ragione sociale" required value={dati.ragioneSociale} onChange={e => set('ragioneSociale', e.target.value)} maxLength={200} />
      <InputField name="partitaIva" label="Partita IVA" value={dati.partitaIva ?? ''} onChange={e => set('partitaIva', testo(e.target.value))} maxLength={20} />
      <InputField name="indirizzo" label="Indirizzo" value={dati.indirizzo ?? ''} onChange={e => set('indirizzo', testo(e.target.value))} maxLength={300} />
      <InputField name="referente" label="Referente" value={dati.referente ?? ''} onChange={e => set('referente', testo(e.target.value))} maxLength={120} />
      <InputField name="emailReferente" type="email" label="Email del referente" value={dati.emailReferente ?? ''} onChange={e => set('emailReferente', testo(e.target.value))} maxLength={254} />
      <InputField name="telefono" type="tel" label="Telefono" value={dati.telefono ?? ''} onChange={e => set('telefono', testo(e.target.value))} maxLength={40} />
      <SelectField name="piano" label="Piano" value={dati.piano} options={PIANI} onChange={e => set('piano', e.target.value as PianoCliente)} />
      <DatePickerField name="attivoDal" label="Attivo dal" value={soloData(dati.attivoDal)} onChange={e => set('attivoDal', e.target.value ? `${e.target.value}T00:00:00Z` : null)} />
      <DatePickerField name="scadeIl" label="Scadenza abbonamento" value={soloData(dati.scadeIl)} onChange={e => set('scadeIl', e.target.value ? `${e.target.value}T00:00:00Z` : null)} />
      <TextareaField name="note" label="Note" rows={3} value={dati.note ?? ''} onChange={e => set('note', testo(e.target.value))} className="sibylla-op-form__note" />
    </div>
  )
}

// ─── Scheda del cliente ───────────────────────────────────────────────────────

type Scheda = 'azienda' | 'reparti' | 'dipendenti'

function SchedaCliente({ id, onBack }: { id: number; onBack: () => void }) {
  const confirm = useConfirmStore(s => s.confirm)
  const [cliente, setCliente] = useState<DettaglioCliente | null>(null)
  const [scheda, setScheda] = useState<Scheda>('dipendenti')
  const [dati, setDati] = useState<DatiCliente>(DATI_VUOTI)
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [dipendenti, setDipendenti] = useState<DipendenteOp[]>([])
  const [problema, setProblema] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [modifica, setModifica] = useState<DipendenteOp | null | undefined>(undefined)
  const [invito, setInvito] = useState<{ invito: InvitoOp; nome: string } | null>(null)

  const carica = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([opAdminApi.cliente(id), opAdminApi.dipendenti(id)])
      setCliente(c)
      setDati(c)
      setReparti(c.reparti)
      setDipendenti(d)
      setProblema(null)
      if (Object.keys(c.reparti).length === 0) setScheda('reparti')
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

  const elimina = async (d: DipendenteOp) => {
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
      title: 'Sospendere l’abbonamento?',
      message: `Tutti i dipendenti di ${cliente.ragioneSociale} escono subito dall’app e non possono rientrare finché non lo riattivi.`,
      confirmLabel: 'Sospendi', danger: true,
    }))) return
    await esegui(() => opAdminApi.stato(id, sospendi ? 'sospeso' : 'attivo'), sospendi ? 'Abbonamento sospeso.' : 'Abbonamento riattivato.')
  }

  const caricaEsempio = async () => {
    if (!cliente) return
    if (!(await confirm({
      title: 'Caricare i dati di esempio?',
      message: `In ${cliente.ragioneSociale} arrivano dipendenti ipotetici e dati fittizi in tutte le sezioni dell’app (turni, timbrature, pulizie, magazzino, front office, F&B, chat…), per simulare l’uso. Le utenze reali ricevono turni, richieste e comunicazioni d’esempio. Si fa una volta sola.`,
      confirmLabel: 'Carica dati di esempio',
    }))) return
    await esegui(() => opAdminApi.esempio(id), 'Dati di esempio caricati.')
  }

  const repartiAttivi = Object.keys(cliente?.reparti ?? {}) as RepartoOp[]

  return (
    <div className="sibylla-op">
      <PageHead
        title={cliente?.ragioneSociale ?? 'Cliente'}
        subtitle={cliente ? `Cliente indipendente · ${cliente.stato === 'attivo' ? 'abbonamento attivo' : 'abbonamento sospeso'}` : undefined}
        backLabel="Clienti"
        onBack={onBack}
        actions={cliente && (
          <>
            <Button variant="secondary" icon="database" onClick={caricaEsempio} loading={salvo}>Carica dati di esempio</Button>
            <Button variant={cliente.stato === 'attivo' ? 'secondary' : 'primary'} onClick={cambiaStato} loading={salvo}>
              {cliente.stato === 'attivo' ? 'Sospendi abbonamento' : 'Riattiva abbonamento'}
            </Button>
          </>
        )}
      />
      {problema && <p className="sibylla-op__errore">{problema}</p>}

      {cliente && (
        <>
          <Tabs
            tabs={[{ id: 'dipendenti', label: `Dipendenti (${dipendenti.length})` }, { id: 'reparti', label: 'Reparti e moduli' }, { id: 'azienda', label: 'Azienda e abbonamento' }]}
            active={scheda}
            onChange={t => setScheda(t as Scheda)}
          />

          {scheda === 'dipendenti' && (
            <div className="sibylla-op__sezione">
              <div className="sibylla-op__bar">
                <p className="sibylla-op__nota">Ogni dipendente riceve un codice di invito via email e con quello crea la password nell’app.</p>
                <Button icon="plus" onClick={() => setModifica(null)} disabled={repartiAttivi.length === 0}>Nuova utenza</Button>
              </div>
              <OpDipendentiTable dipendenti={dipendenti} onModifica={setModifica} onInvito={invita} onBlocco={blocca} onElimina={elimina} />
            </div>
          )}

          {scheda === 'reparti' && (
            <div className="sibylla-op__sezione">
              <p className="sibylla-op__nota">Attiva i reparti del cliente e scegli le funzioni dell’app per ognuno. I dipendenti vedono solo i moduli attivi.</p>
              <OpModuliEditor value={reparti} onChange={setReparti} indipendente />
              <div className="sibylla-op__salva">
                <Button variant="secondary" onClick={() => setReparti(cliente.reparti)}>Annulla</Button>
                <Button onClick={() => esegui(() => opAdminApi.reparti(id, reparti), 'Reparti e moduli salvati.')} loading={salvo} disabled={Object.keys(reparti).length === 0}>
                  Salva reparti e moduli
                </Button>
              </div>
            </div>
          )}

          {scheda === 'azienda' && (
            <div className="sibylla-op__sezione">
              <DatiForm dati={dati} onChange={setDati} />
              <p className="sibylla-op__nota">
                Sedi: {cliente.strutture.map(s => s.nome).join(', ') || '—'} · cliente dal {formatoData(cliente.creatoIl)}
              </p>
              <div className="sibylla-op__salva">
                <Button variant="secondary" onClick={() => setDati(cliente)}>Annulla</Button>
                <Button onClick={() => esegui(() => opAdminApi.aggiornaCliente(id, dati), 'Dati dell’azienda salvati.')} loading={salvo}>Salva</Button>
              </div>
            </div>
          )}
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
