import React, { useEffect, useMemo, useState } from 'react'
import AlertBanner from '../../core/components/AlertBanner'
import Button from '../../core/components/Button/Button'
import { DatePickerField, InputField, RadioGroup, SelectField, TextareaField } from '../../core/components/form'
import { elencoAziendePlatform, type AziendaPlatform } from './aziendePlatform'
import OpModuliEditor from './OpModuliEditor'
import {
  formatoData, OpApiError, opAdminApi,
  type DatiCliente, type DettaglioCliente, type InvitoOp, type PianoCliente, type TipoAziendaOp,
} from './opApi'
import type { RepartiModuli } from './opCatalogo'
import './OpNuovaAzienda.sass'

// ─── NUOVA AZIENDA OP! (dalla sezione Sibylla Op! di Sibylla Admin) ───────────
//  Rispecchia sibyllaop.it/admin → Nuova azienda: tipo (una struttura o gruppo),
//  dati e abbonamento, strutture, reparti e moduli, amministratore che riceve
//  l'invito. In più, creata dentro Platform, l'azienda si può collegare subito a
//  un'azienda di Sibylla Platform (POST /admin/indipendenti con
//  idAziendaPlatform, sibylla-op scheda 09) oppure lasciare non collegata.

interface Props {
  /** Aziende Op già collegate, per segnare nel selettore le aziende di Platform già usate: id Platform → ragione sociale Op. */
  collegate: Map<number, string>
  onAnnulla: () => void
  /** Azienda creata: si torna all'elenco aggiornato. */
  onFine: () => void
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

type Collegamento = 'nessuno' | 'platform'

interface Testi {
  ragioneSociale: string; partitaIva: string; telefono: string; indirizzo: string; sedeLegale: string; pec: string
  referente: string; emailReferente: string; note: string; attivoDal: string; scadeIl: string
}

const VUOTO: Testi = {
  ragioneSociale: '', partitaIva: '', telefono: '', indirizzo: '', sedeLegale: '', pec: '',
  referente: '', emailReferente: '', note: '', attivoDal: '', scadeIl: '',
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
const oNull = (s: string) => (s.trim() ? s.trim() : null)
/** Data del calendario (yyyy-MM-dd) → mezzanotte UTC, come le date gg/mm/aaaa di sibyllaop.it/admin. */
const iso = (d: string) => (d ? `${d}T00:00:00.000Z` : null)

const messaggio = (e: unknown, base: string) => (e instanceof OpApiError ? e.message : base)

interface Esito { azienda: DettaglioCliente; invito: InvitoOp | null; avviso?: string; platform: string | null }

export default function OpNuovaAzienda({ collegate, onAnnulla, onFine }: Props) {
  const [tipo, setTipo] = useState<TipoAziendaOp>('struttura')
  const [piano, setPiano] = useState<PianoCliente>('completo')
  const [t, setT] = useState<Testi>(VUOTO)
  const [sede, setSede] = useState('')
  const [strutture, setStrutture] = useState<string[]>([''])
  const [reparti, setReparti] = useState<RepartiModuli>({})
  const [admin, setAdmin] = useState({ nome: '', cognome: '', email: '' })
  const [collegamento, setCollegamento] = useState<Collegamento>('nessuno')
  const [aziende, setAziende] = useState<AziendaPlatform[] | null>(null)
  const [senzaPortal, setSenzaPortal] = useState(false)
  const [scelta, setScelta] = useState('')
  const [tentato, setTentato] = useState(false)
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<Esito | null>(null)

  // Le aziende di Platform si chiedono al Portal solo quando servono.
  useEffect(() => {
    if (collegamento !== 'platform' || aziende || senzaPortal) return
    let annullato = false
    elencoAziendePlatform()
      .then(a => { if (!annullato) setAziende(a) })
      .catch(() => { if (!annullato) setSenzaPortal(true) })
    return () => { annullato = true }
  }, [collegamento, aziende, senzaPortal])

  const set = (k: keyof Testi) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setT(p => ({ ...p, [k]: e.target.value }))

  // ── Validazione (come validaDati di sibyllaop.it/admin) ──
  const errori: Partial<Record<keyof Testi, string>> = {}
  if (t.ragioneSociale.trim().length < 2) errori.ragioneSociale = 'Indica la ragione sociale.'
  if (t.partitaIva.trim() && !/^[A-Z]{0,2}\d{8,13}$/i.test(t.partitaIva.replace(/\s/g, ''))) errori.partitaIva = 'Partita IVA non valida.'
  if (t.emailReferente.trim() && !emailOk(t.emailReferente)) errori.emailReferente = 'Email non valida.'
  if (t.pec.trim() && !emailOk(t.pec)) errori.pec = 'Indirizzo PEC non valido.'
  if (t.attivoDal && t.scadeIl && t.scadeIl < t.attivoDal) errori.scadeIl = 'La scadenza è prima dell’attivazione.'
  const erroriAdmin = {
    nome: !admin.nome.trim() ? 'Indica il nome.' : undefined,
    cognome: !admin.cognome.trim() ? 'Indica il cognome.' : undefined,
    email: !emailOk(admin.email) ? 'Indica un’email valida.' : undefined,
  }
  const nomiStrutture = strutture.map(x => x.trim()).filter(Boolean)
  const idPlatform = collegamento === 'platform' && /^[1-9]\d{0,9}$/.test(scelta.trim()) ? Number(scelta.trim()) : null
  const erroreCollegamento = collegamento !== 'platform' ? null
    : idPlatform === null ? (senzaPortal ? 'Indica l’id numerico dell’azienda in Sibylla Platform.' : 'Scegli l’azienda di Sibylla Platform.')
      : collegate.has(idPlatform) ? `Azienda di Platform già collegata a «${collegate.get(idPlatform)}».` : null
  const ok = Object.keys(errori).length === 0
  const adminOk = !erroriAdmin.nome && !erroriAdmin.cognome && !erroriAdmin.email
  const repartiOk = Object.keys(reparti).length > 0
  const struttureOk = tipo !== 'gruppo' || nomiStrutture.length > 0
  const tuttoOk = ok && adminOk && repartiOk && struttureOk && !erroreCollegamento
  const err = <K extends keyof Testi>(k: K) => (tentato ? errori[k] : undefined)

  const opzioniPlatform = useMemo(() => (aziende ?? []).map(a => {
    const giaDi = collegate.get(a.id)
    return {
      value: String(a.id),
      label: `${a.nome}${a.partitaIva ? ` · P.IVA ${a.partitaIva}` : ''} (id ${a.id})${giaDi ? ` — già collegata a ${giaDi}` : ''}`,
      disabled: !!giaDi,
    }
  }), [aziende, collegate])

  const salva = async () => {
    setTentato(true)
    if (!tuttoOk) return
    setLavoro(true); setErrore(null)
    const dati: DatiCliente = {
      ragioneSociale: t.ragioneSociale.trim(), partitaIva: t.partitaIva.replace(/\s/g, '') || null,
      indirizzo: oNull(t.indirizzo), sedeLegale: oNull(t.sedeLegale), pec: oNull(t.pec), tipo,
      referente: oNull(t.referente), emailReferente: oNull(t.emailReferente), telefono: oNull(t.telefono),
      piano, attivoDal: iso(t.attivoDal), scadeIl: iso(t.scadeIl), note: oNull(t.note),
    }
    let azienda: DettaglioCliente
    try {
      azienda = await opAdminApi.nuovoCliente({
        dati, reparti, idAziendaPlatform: idPlatform,
        ...(tipo === 'gruppo' ? { strutture: nomiStrutture } : { nomeSede: sede.trim() || undefined }),
      })
    } catch (e) {
      setErrore(messaggio(e, 'Azienda non creata.'))
      setLavoro(false)
      return
    }
    const platform = idPlatform === null ? null : aziende?.find(a => a.id === idPlatform)?.nome ?? `id ${idPlatform}`
    // L'azienda c'è: se l'invito dell'amministratore non parte, si riprova da sibyllaop.it/admin.
    try {
      const r = await opAdminApi.nuovoAmministratore(azienda.id, { nome: admin.nome.trim(), cognome: admin.cognome.trim(), email: admin.email.trim() })
      setEsito({ azienda, invito: r.invito, platform })
    } catch (e) {
      setEsito({
        azienda, invito: null, platform,
        avviso: `Azienda creata, ma l’amministratore non è stato invitato: ${messaggio(e, 'errore')}. Aggiungilo da sibyllaop.it/admin.`,
      })
    } finally {
      setLavoro(false)
    }
  }

  if (esito) {
    return (
      <div className="op-nuova">
        <section className="op-nuova__riquadro">
          <h3 className="op-nuova__titolo">Azienda creata: {esito.azienda.ragioneSociale}</h3>
          <p className="op-nuova__sotto">
            {esito.platform
              ? `Collegata all’azienda di Sibylla Platform «${esito.platform}»: i suoi utenti vedono i dati di Op in AppOp! › Business Intelligence.`
              : 'Non collegata a un’azienda di Sibylla Platform: si può collegare in seguito da sibyllaop.it/admin.'}
          </p>
          {esito.avviso && <AlertBanner type="warning">{esito.avviso}</AlertBanner>}
          {esito.invito && (
            <>
              <AlertBanner type="success">
                L’invito è partito per {esito.invito.emailMascherata}. Con il codice qui sotto l’amministratore attiva il suo account
                nell’app o su sibyllaop.it e poi configura l’azienda su sibyllaop.it/azienda.
              </AlertBanner>
              <div className="op-nuova__codice">
                <span className="op-nuova__codice-etichetta">Codice d’invito (puoi darlo anche a voce)</span>
                <span className="op-nuova__codice-testo">{esito.invito.codice}</span>
                <span className="op-nuova__codice-etichetta">Valido fino al {formatoData(esito.invito.scadeIl)}</span>
              </div>
            </>
          )}
          <div className="op-nuova__azioni">
            <a className="sib-btn sib-btn--secondary" href={`https://sibyllaop.it/admin/azienda?id=${esito.azienda.id}`} target="_blank" rel="noopener noreferrer">
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Apri su sibyllaop.it/admin
            </a>
            <Button onClick={onFine}>Torna all’elenco</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="op-nuova">
      <div className="op-nuova__testa">
        <div>
          <h3 className="op-nuova__titolo">Nuova azienda</h3>
          <p className="op-nuova__sotto">Dati e abbonamento, reparti e moduli dell’app, l’amministratore che configurerà l’azienda e il collegamento a Sibylla Platform.</p>
        </div>
        <Button variant="secondary" onClick={onAnnulla}>Annulla</Button>
      </div>

      <section className="op-nuova__riquadro">
        <h4 className="op-nuova__sezione">Azienda e abbonamento</h4>
        <div className="op-nuova__griglia">
          <RadioGroup className="op-nuova__largo" label="Tipo di azienda" name="op-tipo" options={TIPI} value={tipo} onChange={v => setTipo(v as TipoAziendaOp)} />
          <InputField className="op-nuova__largo" label="Ragione sociale" name="op-ragione" required maxLength={200} value={t.ragioneSociale} onChange={set('ragioneSociale')} error={err('ragioneSociale')} />
          <InputField label="Partita IVA" name="op-piva" maxLength={20} value={t.partitaIva} onChange={set('partitaIva')} error={err('partitaIva')} />
          <InputField label="Telefono" name="op-tel" type="tel" maxLength={40} value={t.telefono} onChange={set('telefono')} />
          <InputField label="Sede operativa" name="op-sede-operativa" maxLength={300} value={t.indirizzo} onChange={set('indirizzo')} />
          <InputField label="Sede legale" name="op-sede-legale" maxLength={300} value={t.sedeLegale} onChange={set('sedeLegale')} />
          <InputField label="Contatto PEC" name="op-pec" type="email" maxLength={254} placeholder="azienda@pec.it" value={t.pec} onChange={set('pec')} error={err('pec')} />
          <InputField label="Referente" name="op-referente" maxLength={120} value={t.referente} onChange={set('referente')} />
          <InputField label="Email del referente" name="op-email-referente" type="email" maxLength={254} value={t.emailReferente} onChange={set('emailReferente')} error={err('emailReferente')} />
          <RadioGroup className="op-nuova__largo" label="Piano" name="op-piano" options={PIANI} value={piano} onChange={v => setPiano(v as PianoCliente)} />
          <DatePickerField label="Attivo dal" name="op-attivo-dal" value={t.attivoDal} onChange={set('attivoDal')} hint="Vuoto: da oggi" />
          <DatePickerField label="Scade il" name="op-scade-il" value={t.scadeIl} min={t.attivoDal || undefined} onChange={set('scadeIl')} error={err('scadeIl')} hint="Vuoto: senza scadenza" />
          <TextareaField className="op-nuova__largo" label="Note" name="op-note" rows={3} value={t.note} onChange={set('note')} />
          {tipo === 'struttura' && (
            <InputField className="op-nuova__largo" label="Nome della struttura" name="op-nome-sede" maxLength={120}
              placeholder={t.ragioneSociale || 'Come la ragione sociale'} value={sede} onChange={e => setSede(e.target.value)}
              hint="L’azienda coincide con questa struttura: l’amministratore ne configura piani e camere." />
          )}
        </div>
      </section>

      {tipo === 'gruppo' && (
        <section className="op-nuova__riquadro">
          <h4 className="op-nuova__sezione">Strutture del gruppo</h4>
          <p className="op-nuova__sotto">Gli alberghi che fanno capo all’azienda: ognuno ha i suoi piani e camere, che configura l’amministratore. L’azienda non ha piani né camere sue.</p>
          {strutture.map((nome, i) => (
            <div key={i} className="op-nuova__riga">
              <InputField className="op-nuova__flex" label={`Struttura ${i + 1}`} name={`op-struttura-${i}`} maxLength={120} placeholder="Es. Hotel Archimede"
                value={nome} onChange={e => setStrutture(xs => xs.map((x, j) => (j === i ? e.target.value : x)))} />
              {strutture.length > 1 && (
                <Button variant="tertiary" icon="xmark" onClick={() => setStrutture(xs => xs.filter((_, j) => j !== i))}>Togli</Button>
              )}
            </div>
          ))}
          <div><Button variant="secondary" size="sm" icon="plus" onClick={() => setStrutture(xs => [...xs, ''])}>Aggiungi struttura</Button></div>
          {tentato && !struttureOk && <AlertBanner type="error">Indica almeno una struttura del gruppo.</AlertBanner>}
        </section>
      )}

      <section className="op-nuova__riquadro">
        <h4 className="op-nuova__sezione">Reparti e moduli</h4>
        <p className="op-nuova__sotto">Cosa può usare l’azienda nell’app. Si può cambiare in seguito.</p>
        <OpModuliEditor value={reparti} onChange={setReparti} senzaPms />
        {!repartiOk && <p className="op-nuova__errore">Attiva almeno un reparto.</p>}
      </section>

      <section className="op-nuova__riquadro">
        <h4 className="op-nuova__sezione">Amministratore dell’azienda</h4>
        <p className="op-nuova__sotto">Riceve l’invito via email. Entra nell’area admin dell’azienda e crea strutture, piani, camere e utenti.</p>
        <div className="op-nuova__griglia op-nuova__griglia--tre">
          <InputField label="Nome" name="op-admin-nome" required value={admin.nome} onChange={e => setAdmin({ ...admin, nome: e.target.value })} error={tentato ? erroriAdmin.nome : undefined} />
          <InputField label="Cognome" name="op-admin-cognome" required value={admin.cognome} onChange={e => setAdmin({ ...admin, cognome: e.target.value })} error={tentato ? erroriAdmin.cognome : undefined} />
          <InputField label="Email" name="op-admin-email" type="email" required value={admin.email} onChange={e => setAdmin({ ...admin, email: e.target.value })} error={tentato ? erroriAdmin.email : undefined} />
        </div>
      </section>

      <section className="op-nuova__riquadro">
        <h4 className="op-nuova__sezione">Collegamento a Sibylla Platform</h4>
        <p className="op-nuova__sotto">Se l’azienda usa anche Sibylla Platform, i suoi utenti vedono in AppOp! › Business Intelligence i dati di Op di questa azienda (sola lettura). Un’azienda di Platform si collega a una sola azienda Op.</p>
        <RadioGroup name="op-collegamento" value={collegamento} onChange={v => setCollegamento(v as Collegamento)}
          options={[{ value: 'nessuno', label: 'Non collegata' }, { value: 'platform', label: 'Collegata a un’azienda di Sibylla Platform' }]} />
        {collegamento === 'platform' && !senzaPortal && (
          aziende === null
            ? <p className="op-nuova__sotto">Carico le aziende di Sibylla Platform…</p>
            : <SelectField label="Azienda di Sibylla Platform" name="op-azienda-platform" required placeholder="Scegli l’azienda" options={opzioniPlatform}
                value={scelta} onChange={e => setScelta(e.target.value)} error={tentato ? erroreCollegamento ?? undefined : undefined} />
        )}
        {collegamento === 'platform' && senzaPortal && (
          <>
            <AlertBanner type="warning">Elenco delle aziende di Sibylla Platform non disponibile (Portal non raggiungibile): indica l’id dell’azienda.</AlertBanner>
            <InputField label="Id dell’azienda in Sibylla Platform" name="op-id-platform" required maxLength={10} value={scelta}
              onChange={e => setScelta(e.target.value)} error={tentato ? erroreCollegamento ?? undefined : undefined} hint="È l’id_azienda dell’azienda in Sibylla Platform." />
          </>
        )}
      </section>

      {tentato && !tuttoOk && <AlertBanner type="error">Controlla i campi segnati.</AlertBanner>}
      {errore && <AlertBanner type="error">{errore}</AlertBanner>}
      <div className="op-nuova__azioni">
        <Button loading={lavoro} disabled={lavoro} onClick={salva}>Crea l’azienda e invita l’amministratore</Button>
      </div>
    </div>
  )
}
