import React, { useEffect, useState } from 'react'
import { CheckboxField, InputField, RadioGroup, SelectField } from '../../core/components/form'
import { FOTO } from '../sitoData'
import { PaginaSito, useSitoStore } from '../useSitoStore'
import { TIPI_AZIENDA, TipoAccount, TipoAzienda, UtenteSito, profiloBase, useSitoAccountStore } from '../useSitoAccountStore'
import { SnwEsito, SnwFoto } from '../SnwUi'
import SnwAvatarCampo from './SnwAvatarCampo'
import { NAZIONALITA } from './snwNazionalita'
import { t } from '../i18n'
import './SnwAccesso.sass'

/**
 * Area riservata · accesso, sul modello di sibyllanetwork.com (/login,
 * /register, /register-private, /register-business, /reset-password): foto a
 * tutto campo, claim a sinistra, scheda a destra. La registrazione parte dalla
 * scelta Utente privato / Utente business (operatori del settore).
 * Demo: qualunque e-mail e password entrano; due accessi rapidi per la fiera.
 */
type Modo = 'accedi' | 'scelta' | 'privato' | 'business' | 'recupero'
const mailOk = (e: string) => /.+@.+\..+/.test(e.trim())

interface Campi {
  avatar?: string
  nome: string; cognome: string; email: string; tel: string; cf: string; nazionalita: string; indirizzo: string; nascita: string
  pwd: string; sesso: '' | 'M' | 'F'; privacy: boolean; news: boolean
  ragione: string; piva: string; cfAz: string; telAz: string; mailAz: string; indAz: string; tipoAz: TipoAzienda | ''; ruolo: string
}
const VUOTO: Campi = {
  nome: '', cognome: '', email: '', tel: '', cf: '', nazionalita: 'Italia', indirizzo: '', nascita: '', pwd: '', sesso: '', privacy: false, news: false,
  ragione: '', piva: '', cfAz: '', telAz: '', mailAz: '', indAz: '', tipoAz: '', ruolo: '',
}

export default function SnwAccesso({ modo: iniziale = 'accedi', poi }: { modo?: 'accedi' | 'registrati'; poi?: PaginaSito }) {
  const vai = useSitoStore(s => s.vai)
  const chiudi = useSitoStore(s => s.chiudi)
  const accedi = useSitoAccountStore(s => s.accedi)
  const accediDemo = useSitoAccountStore(s => s.accediDemo)
  const registra = useSitoAccountStore(s => s.registra)
  const [modo, setModo] = useState<Modo>(iniziale === 'registrati' ? 'scelta' : 'accedi')
  const [scelta, setScelta] = useState<TipoAccount | ''>('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [ricorda, setRicorda] = useState(true)
  const [c, setC] = useState<Campi>(VUOTO)
  const [prova, setProva] = useState(false)
  const [inviato, setInviato] = useState(false)
  // Ogni nuovo arrivo sulla pagina (es. «Area riservata» dall'header) riparte dall'inizio
  const pagina = useSitoStore(s => s.pagina)
  useEffect(() => { setModo(iniziale === 'registrati' ? 'scelta' : 'accedi'); setProva(false); setInviato(false) }, [pagina, iniziale])

  const dopo = (tipo: TipoAccount) => vai(poi ?? { nome: 'account', sez: tipo === 'business' ? 'operatori' : 'ordini' })
  const cambia = (m: Modo) => { setModo(m); setProva(false); setInviato(false) }
  const f = <K extends keyof Campi>(k: K) => (v: Campi[K]) => setC(x => ({ ...x, [k]: v }))
  const obb = (v: string) => (prova && !v.trim() ? t('Obbligatorio') : undefined)

  function login(e: React.FormEvent) {
    e.preventDefault(); setProva(true)
    if (!mailOk(email) || !pwd) return
    accedi(email)
    const u = useSitoAccountStore.getState().utente
    dopo(u?.tipo ?? 'privato')
  }

  function recupero(e: React.FormEvent) {
    e.preventDefault(); setProva(true)
    if (mailOk(email)) setInviato(true)
  }

  function registrati(e: React.FormEvent) {
    e.preventDefault(); setProva(true)
    const biz = modo === 'business'
    const base = c.nome.trim() && c.cognome.trim() && mailOk(c.email) && c.nazionalita && c.pwd.length >= 8 && c.privacy
    const az = !biz || (c.ragione.trim() && /^\d{11}$/.test(c.piva.trim()) && c.telAz.trim() && mailOk(c.mailAz) && c.indAz.trim() && c.tipoAz && c.ruolo.trim())
    if (!base || !az) return
    const u: UtenteSito = profiloBase(biz ? 'business' : 'privato', c.email.trim().toLowerCase(), {
      nome: c.nome.trim(), cognome: c.cognome.trim(), tel: c.tel, cf: c.cf.toUpperCase(), nazionalita: c.nazionalita, indirizzo: c.indirizzo,
      sesso: c.sesso, newsletter: c.news, avatar: c.avatar,
      azienda: biz ? { ragione: c.ragione.trim(), piva: c.piva.trim(), cf: c.cfAz.trim(), tel: c.telAz, email: c.mailAz.trim(), indirizzo: c.indAz, tipo: c.tipoAz as TipoAzienda, ruolo: c.ruolo.trim() } : undefined,
    })
    registra(u)
    dopo(u.tipo)
  }

  const persona = (
    <>
      <div className="snw-acs__griglia">
        <InputField name="r-nome" label={t('Nome')} required value={c.nome} onChange={e => f('nome')(e.target.value)} error={obb(c.nome)} autoComplete="given-name" />
        <InputField name="r-cognome" label={t('Cognome')} required value={c.cognome} onChange={e => f('cognome')(e.target.value)} error={obb(c.cognome)} autoComplete="family-name" />
        <InputField name="r-email" type="email" label={t('Email')} required value={c.email} onChange={e => f('email')(e.target.value)} autoComplete="email"
          error={prova && !mailOk(c.email) ? t('Inserisci un indirizzo e-mail valido') : undefined} />
        <InputField name="r-tel" type="tel" label={t('Telefono')} value={c.tel} onChange={e => f('tel')(e.target.value)} autoComplete="tel" />
        <InputField name="r-cf" label={t('Codice Fiscale')} value={c.cf} maxLength={16} onChange={e => f('cf')(e.target.value)} />
        <SelectField name="r-naz" label={t('Nazionalità')} required value={c.nazionalita} onChange={e => f('nazionalita')(e.target.value)}
          options={NAZIONALITA.map(n => ({ value: n, label: t(n) }))} />
        <div className="snw-acs__largo">
          <InputField name="r-ind" label={t('Indirizzo')} value={c.indirizzo} onChange={e => f('indirizzo')(e.target.value)} autoComplete="street-address" />
        </div>
        <InputField name="r-pwd" type="password" label={t('Password')} required value={c.pwd} onChange={e => f('pwd')(e.target.value)} autoComplete="new-password"
          error={prova && c.pwd.length < 8 ? t('Almeno 8 caratteri') : undefined} hint={!prova ? t('Almeno 8 caratteri') : undefined} />
        <RadioGroup name="r-sesso" label={t('Sesso')} value={c.sesso} onChange={v => f('sesso')(v as Campi['sesso'])}
          options={[{ value: 'M', label: t('M') }, { value: 'F', label: t('F') }]} />
      </div>
      <div className="snw-acs__consensi">
        <CheckboxField name="r-privacy" label={t('Accetto la Privacy Policy')} checked={c.privacy} onChange={e => f('privacy')(e.target.checked)}
          error={prova && !c.privacy ? t('Serve il tuo consenso per creare l\'account') : undefined} />
        <CheckboxField name="r-news" label={t('Voglio ricevere aggiornamenti e offerte')} checked={c.news} onChange={e => f('news')(e.target.checked)} />
      </div>
    </>
  )

  const largo = modo === 'privato' || modo === 'business' || modo === 'scelta'

  return (
    <div className="snw-acs">
      <SnwFoto id={modo === 'scelta' || modo === 'privato' || modo === 'business' ? FOTO.trevi : FOTO.vernazza} w={2000} h={1300} alt="" className="snw-acs__foto" />
      <span className="snw-acs__velo" />
      <div className={`snw__wrap snw-acs__in ${largo ? 'snw-acs__in--largo' : ''}`}>
        <div className="snw-acs__claim">
          {modo === 'scelta' || modo === 'privato' || modo === 'business' ? (
            <>
              <span className="snw-acs__kicker"><i className="fa-solid fa-key" aria-hidden="true" /> {t('Area riservata')}</span>
              <h1>{t('Benvenuto in')} <b>Sibylla</b> Network</h1>
              <p>{t('Scegli come registrarti. Possiedi già un account?')}</p>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => cambia('accedi')}>{t('Accedi')}</button>
            </>
          ) : (
            <>
              <span className="snw-acs__kicker"><i className="fa-solid fa-key" aria-hidden="true" /> {t('Area riservata')}</span>
              <h1><b>Sibylla</b> Network</h1>
              <p>{t('Imprese connesse per dare vita a una nuova dimensione dell\'accoglienza made in Italy.')}</p>
              <ul className="snw-acs__plus">
                <li><i className="fa-solid fa-tags" aria-hidden="true" /> {t('Tariffe nette e promozioni per gli operatori')}</li>
                <li><i className="fa-solid fa-hotel" aria-hidden="true" /> {t('Soggiorni riservati: fam trip, educational, site inspection')}</li>
                <li><i className="fa-solid fa-wallet" aria-hidden="true" /> {t('Portafoglio in Sibylla Token, ordini e preferiti')}</li>
              </ul>
            </>
          )}
        </div>

        <section className="snw-acs__card" aria-live="polite">
          {modo === 'accedi' && (
            <form onSubmit={login} noValidate>
              <h2>{t('Accedi al tuo account')}</h2>
              <p className="snw-acs__sotto">{t('Un\'esperienza di prenotazione e acquisto innovativa, immersiva e semplificata. L\'Ipernetwork che crea valore nel turismo.')}</p>
              <div className="snw-acs__campi">
                <InputField name="a-mail" type="email" label={t('Email')} required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                  error={prova && !mailOk(email) ? t('Inserisci un indirizzo e-mail valido') : undefined} />
                <InputField name="a-pwd" type="password" label={t('Password')} required autoComplete="current-password" value={pwd} onChange={e => setPwd(e.target.value)}
                  error={prova && !pwd ? t('Inserisci la password') : undefined} />
              </div>
              <button type="submit" className="sib-btn sib-btn--primary snw-acs__cta">{t('Accedi')}</button>
              <div className="snw-acs__riga">
                <CheckboxField name="a-ricorda" label={t('Ricorda')} checked={ricorda} onChange={e => setRicorda(e.target.checked)} />
                <button type="button" className="snw-acs__link" onClick={() => cambia('recupero')}>{t('Password dimenticata?')}</button>
              </div>
              <p className="snw-acs__alt">{t('Non hai un account?')} <button type="button" className="snw-acs__link" onClick={() => cambia('scelta')}>{t('Registrati')}</button></p>
              <div className="snw-acs__demo">
                <span><i className="fa-solid fa-circle-info" aria-hidden="true" /> {t('Demo: entra con qualunque e-mail e password, oppure')}</span>
                <div>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { accediDemo('business'); dopo('business') }}>
                    <i className="fa-solid fa-briefcase" aria-hidden="true" /> {t('Operatore')} (Hotel Archimede)
                  </button>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { accediDemo('privato'); dopo('privato') }}>
                    <i className="fa-solid fa-user" aria-hidden="true" /> {t('Privato')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {modo === 'recupero' && (inviato ? (
            <SnwEsito icona="fa-envelope-circle-check" titolo={t('Controlla la posta')} variante="compatto"
              azioni={<button type="button" className="sib-btn sib-btn--primary snw-acs__cta" onClick={() => cambia('accedi')}>{t('Torna alla login')}</button>}>
              {t('Se')} <b>{email.trim()}</b> {t('è registrata, tra poco ricevi il link di reset (valido 30 minuti).')}
            </SnwEsito>
          ) : (
            <form onSubmit={recupero} noValidate>
              <h2>{t('Reset password')}</h2>
              <p className="snw-acs__sotto">{t('Inserisci la tua email per ricevere il link di reset.')}</p>
              <div className="snw-acs__campi">
                <InputField name="p-mail" type="email" label={t('Email')} required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                  error={prova && !mailOk(email) ? t('Inserisci un indirizzo e-mail valido') : undefined} />
              </div>
              <button type="submit" className="sib-btn sib-btn--primary snw-acs__cta">{t('Invia link di reset')}</button>
              <button type="button" className="snw-acs__link snw-acs__torna" onClick={() => cambia('accedi')}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {t('Torna alla login')}</button>
              <p className="snw-acs__alt">{t('Non hai un account?')} <button type="button" className="snw-acs__link" onClick={() => cambia('scelta')}>{t('Registrati')}</button></p>
            </form>
          ))}

          {modo === 'scelta' && (
            <div>
              <div className="snw-acs__scelte" role="radiogroup" aria-label={t('Tipo di account')}>
                {([
                  { id: 'privato', tit: 'Utente Privato', foto: FOTO.mappa, txt: 'Mondo per viaggiatori e curiosi di esperienze: accesso esclusivo a una vasta gamma di contenuti e vantaggi.' },
                  { id: 'business', tit: 'Utente Business', foto: FOTO.assistenza, txt: 'Strumenti e risorse per gli operatori del settore: tariffe, promozioni e soggiorni riservati, e la vendita dei tuoi servizi nel network.' },
                ] as const).map(x => (
                  <button key={x.id} type="button" role="radio" aria-checked={scelta === x.id}
                    className={scelta === x.id ? 'snw-acs__scelta snw-acs__scelta--on' : 'snw-acs__scelta'} onClick={() => setScelta(x.id)}>
                    <b>{t(x.tit)}</b>
                    <small>{t(x.txt)}</small>
                    <span className={`snw-acs__tondo snw-acs__tondo--${x.id}`}><SnwFoto id={x.foto} w={300} h={300} alt="" /></span>
                  </button>
                ))}
              </div>
              <button type="button" className="sib-btn sib-btn--primary snw-acs__cta" disabled={!scelta} onClick={() => { if (scelta) { setC(VUOTO); cambia(scelta) } }}>{t('Registrati')}</button>
            </div>
          )}

          {(modo === 'privato' || modo === 'business') && (
            <form onSubmit={registrati} noValidate>
              <button type="button" className="snw-acs__link snw-acs__torna" onClick={() => cambia('scelta')}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> {t('Cambia tipo di account')}</button>
              <h2>{modo === 'business' ? t('Crea un account business') : t('Crea un account privato')}</h2>
              <SnwAvatarCampo valore={c.avatar} onChange={v => f('avatar')(v)} />
              {modo === 'business' && (
                <fieldset className="snw-acs__gruppo">
                  <legend>{t('Dati aziendali')}</legend>
                  <div className="snw-acs__griglia">
                    <InputField name="b-rag" label={t('Ragione Sociale')} required value={c.ragione} onChange={e => f('ragione')(e.target.value)} error={obb(c.ragione)} autoComplete="organization" />
                    <InputField name="b-piva" label={t('Partita IVA')} required maxLength={11} value={c.piva} onChange={e => f('piva')(e.target.value.replace(/\D/g, ''))}
                      error={prova && !/^\d{11}$/.test(c.piva) ? t('11 cifre') : undefined} />
                    <InputField name="b-cf" label={t('Codice Fiscale Aziendale')} value={c.cfAz} onChange={e => f('cfAz')(e.target.value)} />
                    <InputField name="b-tel" type="tel" label={t('Telefono aziendale')} required value={c.telAz} onChange={e => f('telAz')(e.target.value)} error={obb(c.telAz)} />
                    <InputField name="b-mail" type="email" label={t('Email aziendale')} required value={c.mailAz} onChange={e => f('mailAz')(e.target.value)}
                      error={prova && !mailOk(c.mailAz) ? t('Inserisci un indirizzo e-mail valido') : undefined} />
                    <InputField name="b-ind" label={t('Indirizzo aziendale')} required value={c.indAz} onChange={e => f('indAz')(e.target.value)} error={obb(c.indAz)} />
                    <SelectField name="b-tipo" label={t('Tipo di azienda')} required value={c.tipoAz} onChange={e => f('tipoAz')(e.target.value as TipoAzienda)}
                      placeholder={t('Seleziona')} options={TIPI_AZIENDA.map(x => ({ value: x, label: t(x) }))} error={prova && !c.tipoAz ? t('Obbligatorio') : undefined} />
                    <InputField name="b-ruolo" label={t('Ruolo aziendale')} required value={c.ruolo} onChange={e => f('ruolo')(e.target.value)} error={obb(c.ruolo)} />
                  </div>
                </fieldset>
              )}
              {modo === 'business' ? (
                <fieldset className="snw-acs__gruppo">
                  <legend>{t('Referente')}</legend>
                  {persona}
                </fieldset>
              ) : persona}
              <button type="submit" className="sib-btn sib-btn--primary snw-acs__cta">{t('Registrati')}</button>
              <p className="snw-acs__alt">{t('Possiedi già un account?')} <button type="button" className="snw-acs__link" onClick={() => cambia('accedi')}>{t('Accedi')}</button></p>
            </form>
          )}
        </section>
      </div>

      <div className="snw__wrap snw-acs__partner">
        <i className="fa-light fa-grid-2" aria-hidden="true" />
        <span><b>{t('Usi già Sibylla Platform, Tableau o Agorà?')}</b><small>{t('I gestionali dell\'ecosistema hanno il loro accesso.')}</small></span>
        <button type="button" className="sib-btn sib-btn--secondary" onClick={chiudi}>{t('Vai a Sibylla Platform')} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
      </div>
    </div>
  )
}
