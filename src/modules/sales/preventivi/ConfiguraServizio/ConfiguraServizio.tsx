import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import AlertBanner from '../../../../core/components/AlertBanner'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import { InputField, RadioGroup, SelectField, ToggleSwitch } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { useStrutturaPagina } from '../../../../hooks/useStrutturaCorrente'
import { PROVIDER_EMAIL } from '../../../operation/FoodBeverage/fb.model'
import {
  configDi, useConfigInvioMailStore, type ConfigInvioMail, type ProviderInvio, type Sicurezza,
} from '../../../../store/useConfigInvioMailStore'
import './ConfiguraServizio.sass'

/**
 * Configura servizio (Gestione dei preventivi): i dati per attivare l'invio
 * delle mail dei preventivi (preventivo, conferma, pagamento non riuscito) e
 * dei pagamenti con carta. Per struttura.
 *
 * La piattaforma non ha ancora il servizio di invio sul server: la pagina
 * raccoglie e verifica i dati (formati, campi obbligatori, record DNS da
 * pubblicare) e li tiene pronti; password e chiavi non si salvano nel browser.
 * Finché il server non è collegato le mail si scaricano come .eml.
 */

const PROVIDER: Record<ProviderInvio, { label: string; spf: string; regione?: boolean; guida: string }> = {
  brevo:    { label: 'Brevo',      spf: 'include:spf.brevo.com', guida: 'Impostazioni › SMTP e API › Chiavi API' },
  sendgrid: { label: 'SendGrid',   spf: 'include:sendgrid.net', guida: 'Settings › API Keys (permesso Mail Send)' },
  ses:      { label: 'Amazon SES', spf: 'include:amazonses.com', regione: true, guida: 'IAM › utente con permesso ses:SendEmail' },
  postmark: { label: 'Postmark',   spf: 'include:spf.mtasv.net', guida: 'Server › API Tokens' },
  mailgun:  { label: 'Mailgun',    spf: 'include:mailgun.org', guida: 'API Security › Private API key' },
}

const REGIONI_SES = ['eu-south-1', 'eu-west-1', 'eu-central-1', 'us-east-1']

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
const dominioOk = (s: string) => /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(s.trim())
const urlOk = (s: string) => /^https:\/\/[^\s/]+\.[^\s]+$/i.test(s.trim())

interface Controllo { ok: boolean; testo: string; sezione: string }

function controlli(c: ConfigInvioMail): Controllo[] {
  const out: Controllo[] = []
  if (c.metodo === 'smtp') {
    out.push({ ok: !!c.smtpHost.trim(), testo: 'Server SMTP', sezione: 'credenziali' })
    out.push({ ok: c.smtpPorta > 0 && c.smtpPorta < 65536, testo: 'Porta valida', sezione: 'credenziali' })
    out.push({ ok: !!c.smtpUtente.trim(), testo: 'Utente della casella', sezione: 'credenziali' })
    out.push({ ok: !!c.smtpPassword || c.smtpPasswordImpostata, testo: 'Password della casella', sezione: 'credenziali' })
  } else {
    out.push({ ok: !!c.apiKey || c.apiKeyImpostata, testo: `Chiave API ${PROVIDER[c.provider].label}`, sezione: 'credenziali' })
    if (PROVIDER[c.provider].regione) out.push({ ok: !!c.regione, testo: 'Regione', sezione: 'credenziali' })
  }
  out.push({ ok: !!c.nomeMittente.trim(), testo: 'Nome del mittente', sezione: 'mittente' })
  out.push({ ok: emailOk(c.emailMittente), testo: 'Indirizzo del mittente', sezione: 'mittente' })
  if (c.rispondiA) out.push({ ok: emailOk(c.rispondiA), testo: 'Indirizzo "Rispondi a"', sezione: 'mittente' })
  if (c.metodo === 'provider' || c.dominio) {
    out.push({ ok: dominioOk(c.dominio), testo: 'Dominio di invio', sezione: 'dominio' })
    out.push({
      ok: !c.emailMittente.includes('@') || !c.dominio || c.emailMittente.trim().toLowerCase().endsWith('@' + c.dominio.trim().toLowerCase()),
      testo: 'Mittente sul dominio verificato', sezione: 'dominio',
    })
  }
  out.push({ ok: urlOk(c.urlPubblico), testo: 'Indirizzo della pagina pubblica (https)', sezione: 'link' })
  if (c.nexiAttivo) {
    out.push({ ok: !!c.nexiAlias.trim(), testo: 'Alias Nexi XPay', sezione: 'nexi' })
    out.push({ ok: !!c.nexiChiave || c.nexiChiaveImpostata, testo: 'Chiave segreta (MAC) Nexi', sezione: 'nexi' })
  }
  return out
}

export default function ConfiguraServizio({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioni] = useStrutturaPagina()
  const salvate = useConfigInvioMailStore((s) => s.config)
  const salvaStore = useConfigInvioMailStore((s) => s.salva)
  const confirm = useConfirmStore((s) => s.confirm)
  const [c, setC] = useState<ConfigInvioMail>(() => configDi(struttura, salvate))
  const [modificato, setModificato] = useState(false)
  const [prova, setProva] = useState('')

  // Cambiando struttura si carica la sua configurazione.
  useEffect(() => { setC(configDi(struttura, useConfigInvioMailStore.getState().config)); setModificato(false) }, [struttura])

  const set = (patch: Partial<ConfigInvioMail>) => { setC((x) => ({ ...x, ...patch })); setModificato(true) }
  const lista = useMemo(() => controlli(c), [c])
  const mancanti = lista.filter((x) => !x.ok)
  const completa = mancanti.length === 0
  const salvata = salvate[struttura]

  const cambiaStruttura = async (s: string) => {
    const ok = !modificato || await confirm({
      title: 'Modifiche non salvate', message: `Passare a ${s} senza salvare la configurazione di ${struttura}?`, confirmLabel: 'Cambia senza salvare', danger: true,
    })
    if (ok) setStruttura(s)
  }
  const salva = () => {
    salvaStore(struttura, c)
    setC((x) => ({ ...x, smtpPasswordImpostata: x.smtpPasswordImpostata || !!x.smtpPassword, apiKeyImpostata: x.apiKeyImpostata || !!x.apiKey, nexiChiaveImpostata: x.nexiChiaveImpostata || !!x.nexiChiave }))
    setModificato(false)
    toast.success(completa
      ? 'Configurazione completa e salvata. Password e chiavi restano solo in questa sessione finché il server di invio non è collegato.'
      : `Configurazione salvata: mancano ${mancanti.length} ${mancanti.length === 1 ? 'dato' : 'dati'} per attivare il servizio.`, struttura)
  }
  const applicaPreset = (id: string) => {
    const p = PROVIDER_EMAIL.find((x) => x.id === id)
    if (!p) return
    set({ smtpPreset: id, ...(id === 'custom' ? {} : { smtpHost: p.host, smtpPorta: p.porta, smtpSicurezza: p.ssl ? 'ssl' : p.starttls ? 'starttls' : 'nessuna' }) })
  }
  const copia = (testo: string, cosa: string) => { navigator.clipboard?.writeText(testo); toast.info(`${cosa} copiato`) }

  // Record DNS da pubblicare sul dominio (valori indicativi: quelli esatti li dà il servizio scelto).
  const dom = c.dominio.trim() || 'tuodominio.it'
  const spf = c.metodo === 'provider' ? PROVIDER[c.provider].spf
    : c.smtpPreset === 'gmail' ? 'include:_spf.google.com' : c.smtpPreset === 'outlook' ? 'include:spf.protection.outlook.com' : 'include:<server del provider della casella>'
  const dns = [
    { tipo: 'TXT', nome: dom, valore: `v=spf1 ${spf} ~all`, scopo: 'SPF: autorizza il servizio a spedire per il dominio' },
    { tipo: c.metodo === 'provider' && ['sendgrid', 'ses'].includes(c.provider) ? 'CNAME' : 'TXT', nome: `<selettore>._domainkey.${dom}`, valore: 'Fornito dal servizio (chiave DKIM)', scopo: 'DKIM: firma le mail, evita lo spam' },
    { tipo: 'TXT', nome: `_dmarc.${dom}`, valore: `v=DMARC1; p=none; rua=mailto:dmarc@${dom}`, scopo: 'DMARC: regola per le mail non firmate' },
  ]
  const base = c.urlPubblico.trim().replace(/\/+$/, '') || 'https://<pagina pubblica>'
  const urlNexi = [
    { label: 'URL di ritorno (esito al cliente)', valore: `${base}/pagamento/esito` },
    { label: 'URL di notifica (server-to-server)', valore: `${base}/api/nexi/notifica` },
    { label: 'URL di annullamento', valore: `${base}/pagamento/annullato` },
  ]

  const segreto = (name: string, label: string, valore: string, impostata: boolean, onChange: (v: string) => void, hint?: string) => (
    <InputField name={name} label={label} required type="password" value={valore} autoComplete="new-password"
      placeholder={impostata && !valore ? '•••••••• inserita in precedenza: reinseriscila per il server' : ''} hint={hint}
      onChange={(e) => onChange(e.target.value)} />
  )
  // Completa solo se la sezione ha dati richiesti e sono tutti a posto.
  const sezioneOk = (s: string) => lista.some((x) => x.sezione === s) && !lista.some((x) => x.sezione === s && !x.ok)
  // Icona di sezione allo standard piattaforma (fa-solid, blu, 16px, senza riquadro);
  // a sezione completa la spunta verde accanto al titolo.
  const Ico = ({ ico }: { ico: string }) => <i className={`fa-solid ${ico} cfgsrv__sec-ico`} aria-hidden="true" />
  const Ok = ({ s }: { s: string }) => (sezioneOk(s)
    ? <Tooltip text="Sezione completa"><i className="fa-solid fa-circle-check cfgsrv__sec-ok" aria-label="Sezione completa" /></Tooltip>
    : null)

  return (
    <div className="cfgsrv">
      <PageHead title="Configura servizio" subtitle="I dati per attivare l'invio delle mail dei preventivi e i pagamenti con carta"
        onBack={() => navigate('crea-preventivo')} />

      <div className="cfgsrv__top">
        <SelectField name="cfg-struttura" label="Struttura" value={struttura} onChange={(e) => cambiaStruttura(e.target.value)} options={opzioni} />
        <span className={'cfgsrv__stato ' + (completa ? 'is-ok' : 'is-warn')}>
          <i className={'fa-solid ' + (completa ? 'fa-circle-check' : 'fa-circle-exclamation')} aria-hidden="true" />
          {completa ? 'Dati completi · in attesa del collegamento al server di invio' : `Mancano ${mancanti.length} ${mancanti.length === 1 ? 'dato' : 'dati'}`}
        </span>
        {salvata?.aggiornato && <span className="cfgsrv__agg">Salvata il {salvata.aggiornato}</span>}
        <ToggleSwitch label="Servizio attivo" checked={c.attivo} disabled={!completa} onChange={(v) => set({ attivo: v })}
          description={completa ? 'Le mail partiranno dal servizio appena collegato' : 'Completa i dati per attivarlo'} />
      </div>

      <AlertBanner type="info">
        Il server di invio non è ancora collegato alla piattaforma: questa pagina prepara e verifica i dati, che serviranno al momento del collegamento.
        Fino ad allora le mail dei preventivi si scaricano come file .eml da spedire dal programma di posta.
        Password e chiavi non vengono salvate nel browser: restano solo in questa sessione e, a server collegato, saranno conservate cifrate.
      </AlertBanner>

      <div className="cfgsrv__layout">
        <div className="cfgsrv__main">
          {/* 1. Metodo */}
          <section className="cfgsrv__card">
            <header className="cfgsrv__head"><Ico ico="fa-paper-plane" /><div><h3>Metodo di invio</h3><span>Da dove partono le mail ai clienti</span></div></header>
            <div className="cfgsrv__body">
              <div className="cfgsrv__metodi" role="radiogroup" aria-label="Metodo di invio">
                {([
                  ['smtp', 'fa-inbox', 'Casella di posta (SMTP)', 'La casella dell\'hotel (Gmail, Outlook, Aruba…): le mail partono dal vostro indirizzo. Adatta a pochi invii al giorno.'],
                  ['provider', 'fa-paper-plane', 'Servizio di invio', 'Brevo, SendGrid, Amazon SES, Postmark o Mailgun: alta consegnabilità, statistiche di apertura, nessun limite di casella.'],
                ] as const).map(([v, ico, t, d]) => (
                  <button key={v} type="button" role="radio" aria-checked={c.metodo === v} className={'cfgsrv__metodo' + (c.metodo === v ? ' is-on' : '')} onClick={() => set({ metodo: v })}>
                    <i className={`fa-solid ${ico}`} aria-hidden="true" />
                    <strong>{t}</strong>
                    <small>{d}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Credenziali */}
          <section className="cfgsrv__card">
            <header className="cfgsrv__head"><Ico ico="fa-key" /><div><h3>{c.metodo === 'smtp' ? 'Casella SMTP' : `Credenziali ${PROVIDER[c.provider].label}`} <Ok s="credenziali" /></h3><span>Per autenticarsi al servizio</span></div>
            </header>
            <div className="cfgsrv__body">
              {c.metodo === 'smtp' ? (
                <div className="cfgsrv__grid">
                  <SelectField name="smtp-preset" label="Provider della casella" value={c.smtpPreset} onChange={(e) => applicaPreset(e.target.value)}
                    options={PROVIDER_EMAIL.map((p) => ({ value: p.id, label: p.label }))} />
                  <InputField name="smtp-host" label="Server SMTP" required value={c.smtpHost} placeholder="smtp.miohotel.it" onChange={(e) => set({ smtpHost: e.target.value })} />
                  <InputField name="smtp-porta" label="Porta" required type="number" min={1} max={65535} value={c.smtpPorta} onChange={(e) => set({ smtpPorta: Number(e.target.value) || 0 })} />
                  <SelectField name="smtp-sic" label="Sicurezza" value={c.smtpSicurezza} onChange={(e) => set({ smtpSicurezza: e.target.value as Sicurezza })}
                    options={[{ value: 'starttls', label: 'STARTTLS (porta 587)' }, { value: 'ssl', label: 'SSL/TLS (porta 465)' }, { value: 'nessuna', label: 'Nessuna (sconsigliato)' }]} />
                  <InputField name="smtp-user" label="Utente" required value={c.smtpUtente} placeholder="prenotazioni@miohotel.it" autoComplete="off" onChange={(e) => set({ smtpUtente: e.target.value })} />
                  {segreto('smtp-pwd', 'Password', c.smtpPassword, c.smtpPasswordImpostata, (v) => set({ smtpPassword: v }),
                    ['gmail', 'outlook'].includes(c.smtpPreset) ? 'Con la verifica in due passaggi serve una "password per le app", non quella dell\'account' : undefined)}
                </div>
              ) : (
                <div className="cfgsrv__grid">
                  <SelectField name="prov" label="Servizio" value={c.provider} onChange={(e) => set({ provider: e.target.value as ProviderInvio })}
                    options={(Object.keys(PROVIDER) as ProviderInvio[]).map((k) => ({ value: k, label: PROVIDER[k].label }))} />
                  {segreto('prov-key', 'Chiave API', c.apiKey, c.apiKeyImpostata, (v) => set({ apiKey: v }), `Dove trovarla: ${PROVIDER[c.provider].guida}`)}
                  {PROVIDER[c.provider].regione && (
                    <SelectField name="prov-reg" label="Regione" value={c.regione} onChange={(e) => set({ regione: e.target.value })}
                      options={REGIONI_SES.map((r) => ({ value: r, label: r }))} />
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 3. Mittente */}
          <section className="cfgsrv__card">
            <header className="cfgsrv__head"><Ico ico="fa-id-card" /><div><h3>Mittente <Ok s="mittente" /></h3><span>Come appare la mail al cliente</span></div></header>
            <div className="cfgsrv__body">
              <div className="cfgsrv__grid">
                <InputField name="from-nome" label="Nome del mittente" required value={c.nomeMittente} placeholder={struttura} onChange={(e) => set({ nomeMittente: e.target.value })} />
                <InputField name="from-mail" label="Indirizzo del mittente" required type="email" value={c.emailMittente} placeholder="prenotazioni@miohotel.it"
                  onChange={(e) => set({ emailMittente: e.target.value })} error={c.emailMittente && !emailOk(c.emailMittente) ? 'Indirizzo non valido' : undefined} />
                <InputField name="reply" label="Rispondi a" type="email" value={c.rispondiA} placeholder="Se diverso dal mittente"
                  onChange={(e) => set({ rispondiA: e.target.value })} error={c.rispondiA && !emailOk(c.rispondiA) ? 'Indirizzo non valido' : undefined} />
                <InputField name="bcc" label="Copia nascosta all'hotel" type="email" value={c.copiaNascosta} placeholder="Per archiviare ogni mail inviata"
                  onChange={(e) => set({ copiaNascosta: e.target.value })} />
              </div>
            </div>
          </section>

          {/* 4. Dominio */}
          <section className="cfgsrv__card">
            <header className="cfgsrv__head"><Ico ico="fa-globe" /><div><h3>Dominio e consegna <Ok s="dominio" /></h3><span>I record DNS che evitano lo spam</span></div></header>
            <div className="cfgsrv__body">
              <InputField name="dominio" label="Dominio di invio" required={c.metodo === 'provider'} value={c.dominio} placeholder="miohotel.it"
                onChange={(e) => set({ dominio: e.target.value.trim().toLowerCase() })} error={c.dominio && !dominioOk(c.dominio) ? 'Dominio non valido' : undefined}
                hint="Il dominio dell'indirizzo del mittente: i record qui sotto vanno pubblicati da chi gestisce il DNS (registrar o hosting)" />
              <div className="sib-table-wrap cfgsrv__dns">
                <table className="sib-table">
                  <colgroup><col className="cfgsrv__c-tipo" /><col className="cfgsrv__c-nome" /><col /><col className="cfgsrv__c-stato" /><col className="cfgsrv__c-az" /></colgroup>
                  <thead><tr><th>Tipo</th><th>Nome</th><th>Valore</th><th>Stato</th><th aria-label="Copia" /></tr></thead>
                  <tbody>
                    {dns.map((r) => (
                      <tr key={r.nome}>
                        <td>{r.tipo}</td>
                        <td><TruncatedText text={r.nome} /></td>
                        <td><TruncatedText text={r.valore} full={`${r.valore} · ${r.scopo}`} /></td>
                        <td><span className="cfgsrv__pill">Da verificare</span></td>
                        <td>
                          <Tooltip text="Copia il valore">
                            <button type="button" className="sib-btn sib-btn--icon cfgsrv__ico" aria-label={`Copia ${r.tipo} ${r.nome}`} onClick={() => copia(r.valore, 'Valore')}>
                              <i className="fa-solid fa-copy" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="cfgsrv__hint">Valori indicativi: SPF e DMARC sono già pronti per il servizio scelto; la chiave DKIM e il suo selettore li fornisce il servizio al momento della verifica del dominio. La verifica automatica dei record si attiva col server collegato.</p>
            </div>
          </section>

          {/* 5. Link */}
          <section className="cfgsrv__card">
            <header className="cfgsrv__head"><Ico ico="fa-link" /><div><h3>Link nelle mail <Ok s="link" /></h3><span>La pagina che si apre dai pulsanti Accetta, Paga e Riprova</span></div></header>
            <div className="cfgsrv__body">
              <div className="cfgsrv__grid">
                <InputField name="url" label="Indirizzo della pagina pubblica" required value={c.urlPubblico} placeholder="https://preventivi.miohotel.it"
                  onChange={(e) => set({ urlPubblico: e.target.value.trim() })} error={c.urlPubblico && !urlOk(c.urlPubblico) ? 'Serve un indirizzo https://' : undefined}
                  hint="Un sottodominio dell'hotel puntato alla piattaforma, oppure l'indirizzo fornito da Sibylla" />
                <SelectField name="validita" label="Validità dei link" value={String(c.validitaLink)} onChange={(e) => set({ validitaLink: Number(e.target.value) })}
                  options={[7, 15, 30, 60, 90].map((g) => ({ value: String(g), label: `${g} giorni` }))} />
              </div>
            </div>
          </section>

          {/* 6. Nexi */}
          <section className="cfgsrv__card">
            <header className="cfgsrv__head"><Ico ico="fa-credit-card" /><div><h3>Pagamenti con carta · Nexi XPay {c.nexiAttivo && <Ok s="nexi" />}</h3><span>Caparra o saldo dopo l'accettazione della proposta</span></div>
              <ToggleSwitch label="Attivi" checked={c.nexiAttivo} onChange={(v) => set({ nexiAttivo: v })} className="cfgsrv__show" />
            </header>
            {c.nexiAttivo && (
              <div className="cfgsrv__body">
                <RadioGroup name="nexi-amb" label="Ambiente" value={c.nexiAmbiente} onChange={(v) => set({ nexiAmbiente: v as 'test' | 'produzione' })}
                  options={[{ value: 'test', label: 'Test (nessun addebito)' }, { value: 'produzione', label: 'Produzione' }]} />
                <div className="cfgsrv__grid">
                  <InputField name="nexi-alias" label="Alias" required value={c.nexiAlias} placeholder="ALIAS_WEB_00000000" autoComplete="off" onChange={(e) => set({ nexiAlias: e.target.value.trim() })}
                    hint="Nel back office Nexi XPay, sezione Amministrazione › Gestione chiavi" />
                  {segreto('nexi-mac', 'Chiave segreta (MAC)', c.nexiChiave, c.nexiChiaveImpostata, (v) => set({ nexiChiave: v }), 'Firma le richieste di pagamento: non va mai condivisa')}
                </div>
                <span className="cfgsrv__group">Da comunicare a Nexi</span>
                <ul className="cfgsrv__urls">
                  {urlNexi.map((u) => (
                    <li key={u.label}>
                      <span>{u.label}</span>
                      <code><TruncatedText text={u.valore} /></code>
                      <Tooltip text="Copia l'indirizzo">
                        <button type="button" className="sib-btn sib-btn--icon cfgsrv__ico" aria-label={`Copia ${u.label}`} onClick={() => copia(u.valore, 'Indirizzo')}>
                          <i className="fa-solid fa-copy" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Riepilogo */}
        <aside className="cfgsrv__aside">
          <div className="cfgsrv__check">
            <h4>Verifica dei dati</h4>
            <ul>
              {lista.map((x) => (
                <li key={x.testo} className={x.ok ? 'is-ok' : ''}>
                  <i className={'fa-solid ' + (x.ok ? 'fa-circle-check' : 'fa-circle')} aria-hidden="true" /> {x.testo}
                </li>
              ))}
            </ul>
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>
              <i className="fa-regular fa-floppy-disk" aria-hidden="true" /> Salva configurazione
            </button>
            {modificato && <span className="cfgsrv__dirty"><i className="fa-solid fa-circle" aria-hidden="true" /> Modifiche non salvate</span>}
          </div>

          <div className="cfgsrv__check">
            <h4>Mail di prova</h4>
            <InputField name="prova" label="Invia una prova a" type="email" value={prova} placeholder="tuo@indirizzo.it" onChange={(e) => setProva(e.target.value)} />
            <Tooltip text="Si attiva quando il server di invio è collegato: oggi la piattaforma non può spedire mail">
              <span className="cfgsrv__tt">
                <button type="button" className="sib-btn sib-btn--secondary cfgsrv__full" disabled>
                  <i className="fa-regular fa-paper-plane" aria-hidden="true" /> Invia la prova
                </button>
              </span>
            </Tooltip>
            <p className="cfgsrv__hint">Intanto puoi provare la mail vera scaricandola dall'editor del template (Invia › mail di prova).</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
