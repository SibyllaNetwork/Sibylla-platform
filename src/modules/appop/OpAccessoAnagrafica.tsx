import React, { useEffect, useState } from 'react'
import AlertBanner from '../../core/components/AlertBanner'
import { toast } from '../../core/components/Toast/useToast'
import { InputField, SelectField, ToggleSwitch, CheckboxField } from '../../core/components/form'
import { useAnagraficaOpStore, type AbilitazioneOp } from '../../store/useAnagraficaOpStore'
import { REPARTI_OP, LIVELLI_OP, type LivelloOp, type RepartoOp } from './opCatalogo'
import { formatoData, type InvitoOp } from './opApi'
import OpInvitoModal from './OpInvitoModal'
import { emailValida, invitaDipendenteOp, leggiStatoOp, useStrutturaOp, type StatoOpDipendente } from './invitoAnagrafica'
import './OpAccessoAnagrafica.sass'

// ─── ACCESSO ALL'APP OP! DA UN'ANAGRAFICA ────────────────────────────────────
//  Corpo della sezione «App Op!» delle schede HR: abilitazione, email a cui
//  arriva il token di invito, grado e reparti dell'app, stato dell'utenza e
//  invio (o reinvio) del token. Usato da Crea anagrafica personale (dipendenti)
//  e dalla scheda del collaboratore esterno, che passa `esterno`: grado fisso
//  Impiegato, niente funzioni HR né responsabilità, reparti limitati a quelli
//  consentiti dalla sua categoria e invito bloccabile (es. autorizzazione scaduta).

export interface OpAccessoAnagraficaProps {
  anagraficaId: string
  persona: { nome: string; cognome: string }
  email: string
  onEmail: (v: string) => void
  abil: AbilitazioneOp
  onAbil: (p: Partial<AbilitazioneOp>) => void
  /** Reparto proposto all'abilitazione (dal reparto HR o dalla categoria). */
  repartiSuggeriti?: RepartoOp[]
  /** Solo questi reparti sono selezionabili (collaboratori esterni). */
  repartiConsentiti?: RepartoOp[]
  esterno?: boolean
  /** Motivo per cui l'invito non si può inviare (es. autorizzazione scaduta). */
  bloccoInvito?: string
}

export default function OpAccessoAnagrafica({
  anagraficaId, persona, email, onEmail, abil, onAbil, repartiSuggeriti = [], repartiConsentiti, esterno = false, bloccoInvito,
}: OpAccessoAnagraficaProps) {
  const struttura = useStrutturaOp()
  const [stato, setStato] = useState<StatoOpDipendente | null>(null)
  const [invio, setInvio] = useState(false)
  const [invito, setInvito] = useState<InvitoOp | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const ultimo = useAnagraficaOpStore((s) => s.abilitazioni[anagraficaId]?.ultimoInvito)
  const full: AbilitazioneOp = esterno
    ? { ...abil, emailAziendale: email, livello: 'impiegato', hr: false, responsabile: false }
    : { ...abil, emailAziendale: email }

  useEffect(() => {
    if (!abil.abilitato) return
    let off = false
    leggiStatoOp(full, struttura).then((r) => { if (!off) setStato(r) }).catch(() => { if (!off) setStato(null) })
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abil.abilitato, struttura, invito])

  const elenco = REPARTI_OP.filter((r) => r.key !== 'businessIntelligence' && (!repartiConsentiti || repartiConsentiti.includes(r.key)))
  const abilita = (v: boolean) => onAbil({
    abilitato: v,
    ...(v && abil.reparti.length === 0 && repartiSuggeriti.length ? { reparti: repartiSuggeriti } : {}),
  })
  const toggleReparto = (k: RepartoOp, on: boolean) =>
    onAbil({ reparti: on ? [...abil.reparti, k] : abil.reparti.filter((x) => x !== k) })

  // Reparti validi: per gli esterni scarta quelli non più consentiti dalla categoria
  const repartiValidi = repartiConsentiti ? abil.reparti.filter((r) => repartiConsentiti.includes(r)) : abil.reparti

  const invia = async () => {
    setErrore(null); setInvio(true)
    try {
      const inv = await invitaDipendenteOp(anagraficaId, persona, { ...full, reparti: repartiValidi }, struttura)
      setInvito(inv)
      toast.success(`Token di invito inviato a ${inv.emailMascherata}`, 'App Op!')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Invito non inviato.')
    } finally {
      setInvio(false)
    }
  }

  const dip = stato?.dipendente
  const emailOk = emailValida(email)
  const chi = esterno ? 'Il collaboratore' : 'Il dipendente'

  return (
    <div className="op-acc">
      <ToggleSwitch
        label="Abilita l’accesso all’App Op!"
        description={esterno
          ? 'Il collaboratore riceve per email il token di invito ed entra nell’app solo nei reparti della sua categoria, per il periodo autorizzato.'
          : 'Il dipendente riceve all’email aziendale il token di invito con cui attiva l’app come dipendente dell’azienda.'}
        checked={abil.abilitato}
        onChange={abilita}
      />

      {abil.abilitato && (
        <div className="op-acc__body">
          {stato?.fonte === 'prova' && (
            <AlertBanner type="warning">
              Dati di prova salvati in questo browser: il Portal non espone ancora le API dell’App Op!, l’invito non parte davvero per email.
            </AlertBanner>
          )}
          {bloccoInvito && <AlertBanner type="info">{bloccoInvito}</AlertBanner>}
          {errore && <p className="op-acc__error"><i className="fa-light fa-circle-exclamation" /> {errore}</p>}

          <div className="op-acc__grid">
            <InputField name={`op_email_${anagraficaId}`} label={esterno ? 'E-mail del collaboratore' : 'E-mail aziendale'} type="email" required value={email}
              onChange={(e) => onEmail(e.target.value)} placeholder="nome.cognome@azienda.it" iconLeft="fa-light fa-envelope"
              error={email && !emailOk ? 'Email non valida' : undefined} />
            {esterno ? (
              <InputField name={`op_livello_${anagraficaId}`} label="Grado nell’app" value="Impiegato · collaboratore esterno" readOnly />
            ) : (
              <>
                <SelectField name={`op_livello_${anagraficaId}`} label="Grado nell’app" value={abil.livello}
                  onChange={(e) => onAbil({ livello: e.target.value as LivelloOp })} options={LIVELLI_OP} />
                <div className="op-acc__flags">
                  <ToggleSwitch label="Responsabile dei suoi reparti" checked={abil.responsabile} onChange={(v) => onAbil({ responsabile: v })} />
                  <ToggleSwitch label="Accesso alle funzioni HR" checked={abil.hr} onChange={(v) => onAbil({ hr: v })} />
                </div>
              </>
            )}
          </div>

          <div className="op-acc__reparti">
            <span className="op-acc__label">Reparti dell’app{repartiConsentiti ? ' (consentiti dalla categoria)' : ''}</span>
            <div className="op-acc__reparti-list">
              {elenco.length === 0 && <span className="op-acc__muted">Scegli prima la categoria del collaboratore.</span>}
              {elenco.map((r) => (
                <CheckboxField key={r.key} name={`op_rep_${anagraficaId}_${r.key}`} label={r.nome}
                  checked={abil.reparti.includes(r.key)} onChange={(e) => toggleReparto(r.key, e.target.checked)} />
              ))}
            </div>
          </div>

          <div className="op-acc__bar">
            <span className="op-acc__stato">
              {dip?.stato === 'attivo'
                ? <><i className="fa-solid fa-circle-check op-acc__ok" /> Accesso attivo nell’App Op!{dip.ultimoAccesso ? ` · ultimo accesso ${formatoData(dip.ultimoAccesso)}` : ''}</>
                : dip?.stato === 'bloccato'
                  ? <><i className="fa-solid fa-lock op-acc__ko" /> Accesso bloccato in Utenti e ruoli</>
                  : ultimo
                    ? <><i className="fa-solid fa-paper-plane op-acc__wait" /> Invito inviato a {ultimo.emailMascherata} il {formatoData(ultimo.inviatoIl)} · valido fino al {formatoData(ultimo.scadeIl)}</>
                    : <><i className="fa-light fa-envelope op-acc__wait" /> Nessun invito inviato</>}
            </span>
            <button type="button" className="sib-btn sib-btn--primary"
              disabled={invio || !emailOk || repartiValidi.length === 0 || dip?.stato === 'attivo' || !!bloccoInvito} onClick={invia}
              title={bloccoInvito ?? `${chi} riceve il codice per email`}>
              <i className="fa-light fa-paper-plane" /> {invio ? 'Invio in corso…' : ultimo || dip ? 'Invia nuovo token' : 'Invia token di invito'}
            </button>
          </div>
        </div>
      )}

      <OpInvitoModal invito={invito} nome={`${persona.nome} ${persona.cognome}`.trim()} onClose={() => setInvito(null)} />
    </div>
  )
}
