import React, { useCallback, useEffect, useMemo, useState } from 'react'
import AlertBanner from '../../core/components/AlertBanner'
import Button from '../../core/components/Button/Button'
import EmptyState from '../../core/components/EmptyState'
import Modal from '../../core/components/Modal'
import Tooltip from '../../core/components/Tooltip'
import TruncatedText from '../../core/components/TruncatedText'
import { CheckboxField, InputField, SearchField } from '../../core/components/form'
import { toast } from '../../core/components/Toast/useToast'
import { useConfirmStore } from '../../store/useConfirmStore'
import { labelLivello } from './opCatalogo'
import { OpApiError, opStruttureApi, type CameraRichiesta, type DipendenteOp, type StrutturaCliente } from './opApi'
import './OpStruttureEditor.sass'

// ─── STRUTTURE, PIANI E CAMERE (CLIENTE INDIPENDENTE) ─────────────────────────
//  Il cliente stand alone non ha un gestionale: qui si inseriscono le sue
//  strutture, i piani con le camere (numero, tipo, posizione) e i dipendenti che
//  lavorano in ciascuna. Le camere ricevono il QR alla creazione (scheda QR code);
//  le strutture del dipendente decidono dove timbra e quali camere vede nell'app.

type Sezione = 'camere' | 'dipendenti' | 'dati'

/** Camera in modifica: `chiave` distingue anche le righe nuove (senza id). */
interface RigaCamera extends CameraRichiesta { chiave: string }

const errore = (e: unknown) => (e instanceof Error ? e.message : 'Operazione non riuscita.')
const testo = (v: string) => (v.trim() ? v.trim() : null)
let progressivo = 0
const nuovaChiave = () => `n${++progressivo}`

const righeDa = (s: StrutturaCliente): RigaCamera[] =>
  s.camere.map(c => ({ chiave: `c${c.id}`, id: c.id, numero: c.numero, nome: c.nome, piano: c.piano, tipo: c.tipo, posizione: c.posizione }))

const ordinaPiani = (piani: string[]) => [...piani].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }))
const ordinaNumeri = (a: RigaCamera, b: RigaCamera) => a.numero.localeCompare(b.numero, 'it', { numeric: true })

export default function OpStruttureEditor({ idCliente, dipendenti }: { idCliente: number; dipendenti: DipendenteOp[] }) {
  const confirm = useConfirmStore(s => s.confirm)
  const [strutture, setStrutture] = useState<StrutturaCliente[] | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [scelta, setScelta] = useState<number | null>(null)
  const [nuova, setNuova] = useState(false)

  const carica = useCallback(async (seleziona?: number) => {
    try {
      const elenco = await opStruttureApi.elenco(idCliente)
      setStrutture(elenco)
      setScelta(id => {
        const voluta = seleziona ?? id
        return elenco.some(s => s.id === voluta) ? voluta! : elenco[0]?.id ?? null
      })
      setProblema(null)
    } catch (e) {
      setStrutture([])
      // 404 sull'elenco: Op.Api in esecuzione è una versione senza la gestione delle strutture.
      setProblema(e instanceof OpApiError && e.status === 404
        ? 'Op.Api non gestisce ancora strutture e camere dei clienti indipendenti: aggiorna e riavvia il backend dell’app Op!.'
        : errore(e))
    }
  }, [idCliente])

  useEffect(() => { carica() }, [carica])

  const aggiorna = (s: StrutturaCliente) => setStrutture(l => (l ?? []).map(x => (x.id === s.id ? s : x)))
  const struttura = strutture?.find(s => s.id === scelta) ?? null

  const elimina = async (s: StrutturaCliente) => {
    if (!(await confirm({
      title: 'Eliminare la struttura?',
      message: `${s.nome}, le sue ${s.camere.length} camere con i loro QR e l’associazione dei dipendenti vengono cancellati. Le etichette già stampate smettono di funzionare.`,
      confirmLabel: 'Elimina', danger: true,
    }))) return
    try {
      await opStruttureApi.elimina(idCliente, s.id)
      toast.success('Struttura eliminata.', 'Sibylla Op!')
      await carica()
    } catch (e) {
      toast.error(errore(e), 'Sibylla Op!')
    }
  }

  if (problema) return <AlertBanner type="error">{problema}</AlertBanner>
  if (!strutture) return <p className="op-strutture__nota">Caricamento…</p>

  return (
    <div className="op-strutture">
      <aside className="op-strutture__elenco">
        <div className="op-strutture__elenco-testa">
          <span>Strutture ({strutture.length})</span>
          <Button size="sm" icon="plus" onClick={() => setNuova(true)}>Nuova</Button>
        </div>
        {strutture.map(s => (
          <button
            key={s.id}
            type="button"
            className={`op-strutture__voce${s.id === scelta ? ' is-attiva' : ''}`}
            onClick={() => setScelta(s.id)}
          >
            <i className="fa-solid fa-hotel" aria-hidden="true" />
            <span className="op-strutture__voce-testo">
              <TruncatedText text={s.nome} className="op-strutture__voce-nome" />
              <span className="op-strutture__voce-sub">{s.camere.length} camere · {s.dipendenti.length} dipendenti</span>
            </span>
          </button>
        ))}
      </aside>

      <section className="op-strutture__dettaglio">
        {struttura
          ? <DettaglioStruttura
              key={struttura.id}
              idCliente={idCliente}
              struttura={struttura}
              dipendenti={dipendenti}
              unica={strutture.length === 1}
              onAggiornata={aggiorna}
              onElimina={() => elimina(struttura)}
            />
          : <EmptyState icon="hotel" title="Nessuna struttura" subtitle="Aggiungi la prima struttura del cliente, poi i piani e le camere." />}
      </section>

      <ModaleStruttura
        open={nuova}
        titolo="Nuova struttura"
        onClose={() => setNuova(false)}
        onSalva={async d => {
          const s = await opStruttureApi.nuova(idCliente, d)
          toast.success(`${s.nome} aggiunta: ora inserisci piani e camere.`, 'Sibylla Op!')
          setNuova(false)
          await carica(s.id)
        }}
      />
    </div>
  )
}

// ─── Dettaglio della struttura ────────────────────────────────────────────────

interface DettaglioProps {
  idCliente: number
  struttura: StrutturaCliente
  dipendenti: DipendenteOp[]
  unica: boolean
  onAggiornata: (s: StrutturaCliente) => void
  onElimina: () => void
}

function DettaglioStruttura({ idCliente, struttura, dipendenti, unica, onAggiornata, onElimina }: DettaglioProps) {
  const [sezione, setSezione] = useState<Sezione>('camere')
  return (
    <div className="op-strutture__corpo">
      <div className="op-strutture__testa">
        <div className="op-strutture__testa-info">
          <h3 className="op-strutture__titolo">{struttura.nome}</h3>
          <p className="op-strutture__nota">{struttura.indirizzo ?? 'Indirizzo non indicato'}</p>
        </div>
        <div className="op-strutture__schede" role="tablist">
          {([['camere', `Piani e camere (${struttura.camere.length})`], ['dipendenti', `Dipendenti (${struttura.dipendenti.length})`], ['dati', 'Dati della struttura']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={sezione === id} className={`op-strutture__scheda${sezione === id ? ' is-attiva' : ''}`} onClick={() => setSezione(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {sezione === 'camere' && <CamereStruttura idCliente={idCliente} struttura={struttura} onAggiornata={onAggiornata} />}
      {sezione === 'dipendenti' && <DipendentiStruttura idCliente={idCliente} struttura={struttura} dipendenti={dipendenti} onAggiornata={onAggiornata} />}
      {sezione === 'dati' && <DatiStruttura idCliente={idCliente} struttura={struttura} unica={unica} onAggiornata={onAggiornata} onElimina={onElimina} />}
    </div>
  )
}

// ─── Piani e camere ───────────────────────────────────────────────────────────

function CamereStruttura({ idCliente, struttura, onAggiornata }: { idCliente: number; struttura: StrutturaCliente; onAggiornata: (s: StrutturaCliente) => void }) {
  const confirm = useConfirmStore(s => s.confirm)
  const [righe, setRighe] = useState<RigaCamera[]>(() => righeDa(struttura))
  const [aggiungi, setAggiungi] = useState<string | null | undefined>(undefined)
  const [salvo, setSalvo] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)

  const salvate = useMemo(() => JSON.stringify(righeDa(struttura).map(({ chiave, ...r }) => r)), [struttura])
  const modificate = JSON.stringify(righe.map(({ chiave, ...r }) => r)) !== salvate

  const piani = useMemo(() => ordinaPiani(Array.from(new Set(righe.map(r => r.piano)))), [righe])
  const duplicati = useMemo(() => {
    const visti = new Map<string, number>()
    righe.forEach(r => visti.set(r.numero.trim().toLowerCase(), (visti.get(r.numero.trim().toLowerCase()) ?? 0) + 1))
    return new Set(Array.from(visti).filter(([, n]) => n > 1).map(([k]) => k))
  }, [righe])
  const vuoti = righe.some(r => !r.numero.trim() || !r.piano.trim())

  const cambia = (chiave: string, campo: keyof CameraRichiesta, valore: string) =>
    setRighe(l => l.map(r => (r.chiave === chiave ? { ...r, [campo]: campo === 'numero' || campo === 'piano' ? valore : testo(valore) } : r)))

  const togli = async (r: RigaCamera) => {
    if (r.id && !(await confirm({
      title: `Togliere la camera ${r.numero}?`,
      message: 'Al salvataggio la camera e il suo QR vengono cancellati: l’etichetta già stampata smette di funzionare.',
      confirmLabel: 'Togli', danger: true,
    }))) return
    setRighe(l => l.filter(x => x.chiave !== r.chiave))
  }

  const togliPiano = async (piano: string) => {
    const delPiano = righe.filter(r => r.piano === piano)
    if (!(await confirm({
      title: `Togliere il piano ${piano}?`,
      message: `Al salvataggio le ${delPiano.length} camere del piano e i loro QR vengono cancellati.`,
      confirmLabel: 'Togli piano', danger: true,
    }))) return
    setRighe(l => l.filter(x => x.piano !== piano))
  }

  const salva = async () => {
    setSalvo(true)
    try {
      const s = await opStruttureApi.camere(idCliente, struttura.id, righe.map(({ chiave, ...r }) => ({ ...r, numero: r.numero.trim(), piano: r.piano.trim() })))
      onAggiornata(s)
      setRighe(righeDa(s))
      setProblema(null)
      toast.success('Piani e camere salvati: i QR delle camere nuove sono nella scheda QR code.', 'Sibylla Op!')
    } catch (e) {
      setProblema(errore(e))
    } finally {
      setSalvo(false)
    }
  }

  return (
    <div className="op-strutture__sezione">
      <div className="op-strutture__bar">
        <p className="op-strutture__nota">Ogni camera riceve un QR da attaccare in camera: l’addetto lo inquadra con Op! all’inizio e alla fine della pulizia.</p>
        <Button icon="layer-plus" onClick={() => setAggiungi(null)}>Aggiungi piano</Button>
      </div>

      {piani.length === 0 && (
        <EmptyState icon="door-closed" title="Nessuna camera" subtitle="Aggiungi un piano con l’intervallo dei numeri delle camere (es. 101–120)." />
      )}

      {piani.map(piano => {
        const delPiano = righe.filter(r => r.piano === piano).sort(ordinaNumeri)
        return (
          <div key={piano} className="op-strutture__piano">
            <div className="op-strutture__piano-testa">
              <span className="op-strutture__piano-nome">Piano {piano}</span>
              <span className="op-strutture__nota">{delPiano.length} camere</span>
              <span className="op-strutture__spazio" />
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setAggiungi(piano)}>Aggiungi camere</Button>
              <Tooltip text={`Togli il piano ${piano}`}>
                <button type="button" className="op-strutture__azione" aria-label={`Togli il piano ${piano}`} onClick={() => togliPiano(piano)}>
                  <i className="fa-solid fa-trash" />
                </button>
              </Tooltip>
            </div>
            <div className="sib-table-wrap">
              <table className="sib-table op-strutture__tabella">
                <colgroup>
                  <col className="op-strutture__c-numero" /><col className="op-strutture__c-nome" /><col className="op-strutture__c-tipo" />
                  <col className="op-strutture__c-posizione" /><col className="op-strutture__c-azioni" />
                </colgroup>
                <thead>
                  <tr><th>Numero</th><th>Nome</th><th>Tipo</th><th>Posizione (sull’etichetta)</th><th className="op-strutture__th-azioni">Azioni</th></tr>
                </thead>
                <tbody>
                  {delPiano.map(r => (
                    <tr key={r.chiave}>
                      <td>
                        <InputField dense name={`numero-${r.chiave}`} ariaLabel="Numero camera" value={r.numero} maxLength={20}
                          error={duplicati.has(r.numero.trim().toLowerCase()) ? 'Doppio' : !r.numero.trim() ? 'Obbligatorio' : undefined}
                          onChange={e => cambia(r.chiave, 'numero', e.target.value)} />
                      </td>
                      <td><InputField dense name={`nome-${r.chiave}`} ariaLabel="Nome camera" placeholder="Facoltativo" value={r.nome ?? ''} maxLength={60} onChange={e => cambia(r.chiave, 'nome', e.target.value)} /></td>
                      <td><InputField dense name={`tipo-${r.chiave}`} ariaLabel="Tipo camera" placeholder="Es. Doppia" value={r.tipo ?? ''} maxLength={40} onChange={e => cambia(r.chiave, 'tipo', e.target.value)} /></td>
                      <td><InputField dense name={`posizione-${r.chiave}`} ariaLabel="Posizione" placeholder="Es. Corridoio A, lato mare" value={r.posizione ?? ''} maxLength={80} onChange={e => cambia(r.chiave, 'posizione', e.target.value)} /></td>
                      <td className="op-strutture__azioni">
                        <Tooltip text={`Togli la camera ${r.numero}`}>
                          <button type="button" className="op-strutture__azione" aria-label={`Togli la camera ${r.numero}`} onClick={() => togli(r)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {problema && <AlertBanner type="error">{problema}</AlertBanner>}
      {duplicati.size > 0 && <p className="op-strutture__errore">Ogni camera della struttura deve avere un numero diverso.</p>}
      <div className="op-strutture__salva">
        <Button variant="secondary" onClick={() => setRighe(righeDa(struttura))} disabled={!modificate || salvo}>Annulla</Button>
        <Button onClick={salva} loading={salvo} disabled={!modificate || duplicati.size > 0 || vuoti}>Salva piani e camere</Button>
      </div>

      <ModaleCamere
        open={aggiungi !== undefined}
        piano={aggiungi ?? null}
        numeriUsati={new Set(righe.map(r => r.numero.trim().toLowerCase()))}
        onClose={() => setAggiungi(undefined)}
        onAggiungi={nuove => {
          setRighe(l => [...l, ...nuove.map(n => ({ ...n, chiave: nuovaChiave() }))])
          setAggiungi(undefined)
        }}
      />
    </div>
  )
}

/** Piano nuovo o camere in più su un piano: intervallo di numeri con tipo e posizione comuni. */
function ModaleCamere({ open, piano, numeriUsati, onClose, onAggiungi }: {
  open: boolean
  piano: string | null
  numeriUsati: Set<string>
  onClose: () => void
  onAggiungi: (camere: CameraRichiesta[]) => void
}) {
  const [nomePiano, setNomePiano] = useState('')
  const [da, setDa] = useState('')
  const [a, setA] = useState('')
  const [prefisso, setPrefisso] = useState('')
  const [tipo, setTipo] = useState('')
  const [posizione, setPosizione] = useState('')

  useEffect(() => {
    if (!open) return
    setNomePiano(piano ?? ''); setDa(''); setA(''); setPrefisso(''); setTipo(''); setPosizione('')
  }, [open, piano])

  const inizio = Number(da)
  const fine = a.trim() ? Number(a) : inizio
  const valido = !!nomePiano.trim() && Number.isInteger(inizio) && Number.isInteger(fine) && da.trim() !== '' && fine >= inizio && fine - inizio < 500
  const numeri = valido ? Array.from({ length: fine - inizio + 1 }, (_, i) => `${prefisso.trim()}${inizio + i}`) : []
  const giaUsati = numeri.filter(n => numeriUsati.has(n.toLowerCase()))
  const nuovi = numeri.filter(n => !numeriUsati.has(n.toLowerCase()))

  return (
    <Modal open={open} onClose={onClose} title={piano ? `Aggiungi camere al piano ${piano}` : 'Aggiungi piano'} size="md">
      <div className="op-strutture-modal">
        <InputField name="piano" label="Piano" required value={nomePiano} placeholder="Es. 1, Terra, Mansarda" maxLength={20} readOnly={!!piano} onChange={e => setNomePiano(e.target.value)} />
        <div className="op-strutture-modal__riga">
          <InputField name="da" type="number" label="Dal numero" required value={da} placeholder="101" min={0} onChange={e => setDa(e.target.value)} />
          <InputField name="a" type="number" label="Al numero" value={a} placeholder="120" hint="Vuoto = una camera sola" min={0} onChange={e => setA(e.target.value)} />
          <InputField name="prefisso" label="Prefisso" value={prefisso} placeholder="Es. A-" hint="Facoltativo" maxLength={6} onChange={e => setPrefisso(e.target.value)} />
        </div>
        <InputField name="tipo" label="Tipo" value={tipo} placeholder="Es. Doppia" hint="Uguale per tutte, modificabile dopo" maxLength={40} onChange={e => setTipo(e.target.value)} />
        <InputField name="posizione" label="Posizione" value={posizione} placeholder="Es. Corridoio A, lato mare" hint="Stampata sull’etichetta del QR" maxLength={80} onChange={e => setPosizione(e.target.value)} />
        {valido && (
          <p className="op-strutture__nota">
            {nuovi.length > 0 ? `Si aggiungono ${nuovi.length} camere: ${nuovi[0]}${nuovi.length > 1 ? ` … ${nuovi[nuovi.length - 1]}` : ''}.` : 'Nessuna camera nuova.'}
            {giaUsati.length > 0 && ` Già presenti e saltate: ${giaUsati.slice(0, 5).join(', ')}${giaUsati.length > 5 ? '…' : ''}.`}
          </p>
        )}
        <div className="op-strutture-modal__azioni">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button
            disabled={!valido || nuovi.length === 0}
            onClick={() => onAggiungi(nuovi.map(n => ({ id: null, numero: n, nome: null, piano: nomePiano.trim(), tipo: testo(tipo), posizione: testo(posizione) })))}
          >
            Aggiungi {nuovi.length || ''} camere
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Dipendenti della struttura ───────────────────────────────────────────────

function DipendentiStruttura({ idCliente, struttura, dipendenti, onAggiornata }: {
  idCliente: number
  struttura: StrutturaCliente
  dipendenti: DipendenteOp[]
  onAggiornata: (s: StrutturaCliente) => void
}) {
  const [scelti, setScelti] = useState<Set<number>>(() => new Set(struttura.dipendenti))
  const [cerca, setCerca] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)

  const modificati = scelti.size !== struttura.dipendenti.length || struttura.dipendenti.some(id => !scelti.has(id))
  const filtrati = dipendenti.filter(d => {
    const t = cerca.trim().toLowerCase()
    return !t || `${d.nome} ${d.cognome} ${d.email}`.toLowerCase().includes(t)
  })

  const cambia = (id: number, on: boolean) => setScelti(s => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n })

  const salva = async () => {
    setSalvo(true)
    try {
      const s = await opStruttureApi.dipendenti(idCliente, struttura.id, Array.from(scelti))
      onAggiornata(s)
      setScelti(new Set(s.dipendenti))
      setProblema(null)
      toast.success('Dipendenti della struttura salvati.', 'Sibylla Op!')
    } catch (e) {
      setProblema(errore(e))
    } finally {
      setSalvo(false)
    }
  }

  if (dipendenti.length === 0) {
    return <EmptyState icon="users" title="Nessun dipendente" subtitle="Crea le utenze nella scheda Dipendenti, poi associale alle strutture." />
  }

  return (
    <div className="op-strutture__sezione">
      <div className="op-strutture__bar">
        <p className="op-strutture__nota">I dipendenti associati timbrano con il QR di questa struttura e ne vedono le camere e le segnalazioni.</p>
        <SearchField value={cerca} placeholder="Cerca dipendente" onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} className="op-strutture__cerca" />
      </div>
      <div className="op-strutture__azioni-elenco">
        <button type="button" className="op-strutture__link" onClick={() => setScelti(new Set(dipendenti.map(d => d.id)))}>Seleziona tutti</button>
        <button type="button" className="op-strutture__link" onClick={() => setScelti(new Set())}>Nessuno</button>
        <span className="op-strutture__nota">{scelti.size} di {dipendenti.length} associati</span>
      </div>
      <div className="op-strutture__dipendenti">
        {filtrati.map(d => (
          <div key={d.id} className="op-strutture__dipendente">
            <CheckboxField name={`dip-${d.id}`} label={`${d.nome} ${d.cognome}`} checked={scelti.has(d.id)} onChange={e => cambia(d.id, e.target.checked)} />
            <span className="op-strutture__nota">{labelLivello(d.livello)}{d.stato === 'bloccato' ? ' · bloccato' : ''}</span>
          </div>
        ))}
      </div>
      {problema && <AlertBanner type="error">{problema}</AlertBanner>}
      <div className="op-strutture__salva">
        <Button variant="secondary" onClick={() => setScelti(new Set(struttura.dipendenti))} disabled={!modificati || salvo}>Annulla</Button>
        <Button onClick={salva} loading={salvo} disabled={!modificati}>Salva dipendenti</Button>
      </div>
    </div>
  )
}

// ─── Dati della struttura ─────────────────────────────────────────────────────

function DatiStruttura({ idCliente, struttura, unica, onAggiornata, onElimina }: {
  idCliente: number
  struttura: StrutturaCliente
  unica: boolean
  onAggiornata: (s: StrutturaCliente) => void
  onElimina: () => void
}) {
  const [nome, setNome] = useState(struttura.nome)
  const [indirizzo, setIndirizzo] = useState(struttura.indirizzo ?? '')
  const [salvo, setSalvo] = useState(false)
  const modificati = nome.trim() !== struttura.nome || testo(indirizzo) !== struttura.indirizzo

  const salva = async () => {
    setSalvo(true)
    try {
      onAggiornata(await opStruttureApi.aggiorna(idCliente, struttura.id, { nome: nome.trim(), indirizzo: testo(indirizzo) }))
      toast.success('Dati della struttura salvati.', 'Sibylla Op!')
    } catch (e) {
      toast.error(errore(e), 'Sibylla Op!')
    } finally {
      setSalvo(false)
    }
  }

  return (
    <div className="op-strutture__sezione">
      <div className="op-strutture__form">
        <InputField name="nome-struttura" label="Nome della struttura" required value={nome} maxLength={200} onChange={e => setNome(e.target.value)} />
        <InputField name="indirizzo-struttura" label="Indirizzo" value={indirizzo} maxLength={300} onChange={e => setIndirizzo(e.target.value)} />
      </div>
      <div className="op-strutture__salva">
        <Tooltip text={unica ? 'È l’unica struttura del cliente: aggiungine un’altra prima di eliminarla.' : 'Elimina la struttura con camere e QR'}>
          <span><Button variant="secondary" icon="trash" onClick={onElimina} disabled={unica}>Elimina struttura</Button></span>
        </Tooltip>
        <span className="op-strutture__spazio" />
        <Button variant="secondary" onClick={() => { setNome(struttura.nome); setIndirizzo(struttura.indirizzo ?? '') }} disabled={!modificati || salvo}>Annulla</Button>
        <Button onClick={salva} loading={salvo} disabled={!modificati || nome.trim().length < 2}>Salva</Button>
      </div>
    </div>
  )
}

function ModaleStruttura({ open, titolo, onClose, onSalva }: {
  open: boolean
  titolo: string
  onClose: () => void
  onSalva: (d: { nome: string; indirizzo: string | null }) => Promise<void>
}) {
  const [nome, setNome] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [problema, setProblema] = useState<string | null>(null)

  useEffect(() => { if (open) { setNome(''); setIndirizzo(''); setProblema(null) } }, [open])

  const salva = async () => {
    setSalvo(true)
    try {
      await onSalva({ nome: nome.trim(), indirizzo: testo(indirizzo) })
    } catch (e) {
      setProblema(errore(e))
    } finally {
      setSalvo(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={titolo} size="md">
      <div className="op-strutture-modal">
        <InputField name="nuova-nome" label="Nome della struttura" required value={nome} maxLength={200} onChange={e => setNome(e.target.value)} />
        <InputField name="nuova-indirizzo" label="Indirizzo" value={indirizzo} maxLength={300} onChange={e => setIndirizzo(e.target.value)} />
        <p className="op-strutture__nota">Gli amministratori del cliente vengono associati subito; gli altri dipendenti li scegli nella scheda Dipendenti della struttura.</p>
        {problema && <AlertBanner type="error">{problema}</AlertBanner>}
        <div className="op-strutture-modal__azioni">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button onClick={salva} loading={salvo} disabled={nome.trim().length < 2}>Crea struttura</Button>
        </div>
      </div>
    </Modal>
  )
}
