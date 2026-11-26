import React, { useState } from 'react'
import { CheckboxField, DatePickerField, InputField, RadioGroup, SelectField, TextareaField } from '../../core/components/form'
import { FOTO, eur, oggiIso } from '../sitoData'
import { TipoRichiesta, useSitoStore } from '../useSitoStore'
import { useSitoAccountStore } from '../useSitoAccountStore'
import { t } from '../i18n'
import { SnwEsito, SnwStepper } from '../SnwUi'
import SnwTestata from './SnwTestata'
import './SnwRichiesta.sass'

/**
 * Servizi su richiesta di sibyllanetwork.com: Trasferimenti (/transfers),
 * Ristoranti per gruppi (/restaurants) e Deposito bagagli (/luggage). Stessi
 * campi del sito; il totale si aggiorna dal vivo e «Invia richiesta» passa la
 * pratica al booking, che conferma via e-mail.
 */
const TESTE: Record<TipoRichiesta, { kicker: string; titolo: string; enfasi: string; sotto: string; foto: string; icona: string }> = {
  transfer: { kicker: 'Servizi su richiesta', titolo: 'Trasferimenti', enfasi: '', sotto: 'Servizi comodi, senza pensieri: da e per aeroporti, stazioni e hotel con autista dedicato.', foto: FOTO.valigia, icona: 'fa-van-shuttle' },
  ristoranti: { kicker: 'Servizi su richiesta', titolo: 'Ristoranti', enfasi: 'per gruppi', sotto: 'Servizio esclusivo per gruppi da 12 persone: colazione, pranzo o cena nei ristoranti della rete.', foto: FOTO.ristorante, icona: 'fa-utensils' },
  bagagli: { kicker: 'Servizi su richiesta', titolo: 'Deposito', enfasi: 'bagagli', sotto: 'Servizi comodi, senza pensieri: lascia le valigie e goditi la città fino all\'ultimo minuto.', foto: FOTO.valigia, icona: 'fa-suitcase-rolling' },
}

const VEICOLI = [
  { value: 'berlina', label: 'Berlina privata · 1-3 persone', prezzo: 65 },
  { value: 'van', label: 'Van privato · 4-8 persone', prezzo: 95 },
  { value: 'minibus', label: 'Minibus · 9-16 persone', prezzo: 180 },
]
const PARTENZE = ['Personalizzato', 'Aeroporto di Ciampino', 'Stazione Termini', 'Aeroporto di Fiumicino', 'Stazione Tiburtina']
const ORARI: Record<string, string[]> = {
  colazione: ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'],
  pranzo: ['12:00', '12:30', '13:00', '13:30', '14:00'],
  cena: ['19:00', '19:30', '20:00', '20:30', '21:00'],
}
const MENU = [
  { id: 'base', nome: 'Menù', prezzo: 14.9, txt: 'Antipasto, primo, secondo, dolce e acqua 50 cl' },
  { id: 'xl', nome: 'Menù XL', prezzo: 17.9, txt: 'Lo stesso, ma più grande!' },
]
const DEPOSITI = ['Depositi & valute · Stazione Termini', 'Infopoint Sibylla · Via Vicenza 5/A', 'Hotel Archimede · Via dei Mille 19']
const TARIFFA_BAGAGLIO = 6

export default function SnwRichiesta({ tipo }: { tipo: TipoRichiesta }) {
  const vai = useSitoStore(s => s.vai)
  const utente = useSitoAccountStore(s => s.utente)
  const testa = TESTE[tipo]
  const [email, setEmail] = useState(utente?.email ?? '')
  const [inviata, setInviata] = useState('')
  const [prova, setProva] = useState(false)

  // Trasferimenti
  const [veicolo, setVeicolo] = useState('berlina')
  const [da, setDa] = useState(PARTENZE[3])
  const [indirizzo, setIndirizzo] = useState('')
  const [dataT, setDataT] = useState(oggiIso(7))
  const [oraT, setOraT] = useState('10:00')
  const [ritorno, setRitorno] = useState(false)
  const [dataR, setDataR] = useState(oggiIso(10))
  const [oraR, setOraR] = useState('16:00')
  // Ristoranti
  const [tel, setTel] = useState(utente?.tel ?? '')
  const [dataG, setDataG] = useState(oggiIso(14))
  const [persone, setPersone] = useState(12)
  const [pasto, setPasto] = useState('pranzo')
  const [orario, setOrario] = useState('13:00')
  const [menu, setMenu] = useState('base')
  const [note, setNote] = useState('')
  // Bagagli
  const [deposito, setDeposito] = useState(DEPOSITI[0])
  const [dataD, setDataD] = useState(oggiIso(3))
  const [oraD, setOraD] = useState('10:00')
  const [dataP, setDataP] = useState(oggiIso(3))
  const [oraP, setOraP] = useState('18:00')
  const [colli, setColli] = useState(2)

  const prezzoV = VEICOLI.find(v => v.value === veicolo)!.prezzo
  const giorniB = Math.max(1, Math.ceil((+new Date(`${dataP}T${oraP}`) - +new Date(`${dataD}T${oraD}`)) / 86400000))
  const totale = tipo === 'transfer' ? prezzoV * (ritorno ? 2 : 1)
    : tipo === 'ristoranti' ? persone * MENU.find(m => m.id === menu)!.prezzo
      : colli * TARIFFA_BAGAGLIO * giorniB
  const mailOk = /.+@.+\..+/.test(email.trim())
  const ritiroOk = `${dataP}T${oraP}` > `${dataD}T${oraD}`
  const ok = mailOk && (tipo !== 'transfer' || (da !== 'Personalizzato' || indirizzo.trim())) && (tipo !== 'bagagli' || ritiroOk)

  function invia(e: React.FormEvent) {
    e.preventDefault(); setProva(true)
    if (ok) setInviata(`RQ-${String(Math.floor(Math.random() * 90000) + 10000)}`)
  }

  return (
    <div className="snw-rq">
      <SnwTestata kicker={t(testa.kicker)} titolo={t(testa.titolo)} enfasi={testa.enfasi ? t(testa.enfasi) : undefined} sotto={t(testa.sotto)} foto={testa.foto} icona={testa.icona}
        briciole={[{ nome: t('Servizi'), vai: { nome: 'catalogo', cat: 'servizi' } }, { nome: `${t(testa.titolo)} ${testa.enfasi ? t(testa.enfasi) : ''}`.trim() }]} />
      <div className="snw__wrap snw-rq__layout">
        {inviata ? (
          <SnwEsito icona="fa-paper-plane" titolo={t('Richiesta inviata')} variante="riquadro" azioni={<>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'home' })}>{t('Torna alla home')}</button>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setInviata('')}>{t('Nuova richiesta')}</button>
          </>}>
            {t('Pratica')} <b>{inviata}</b> · {t('totale indicativo')} <b>{eur(totale)}</b>. {t('Il booking Sibylla conferma disponibilità e dettagli a')} <b>{email.trim()}</b> {t('entro 2 ore lavorative.')}
          </SnwEsito>
        ) : (
          <form className="snw-rq__form" onSubmit={invia} noValidate>
            <div className="snw-rq__griglia">
              <InputField name="rq-mail" type="email" label={t('Email di contatto')} required iconLeft="fa-regular fa-envelope" value={email} onChange={e => setEmail(e.target.value)}
                error={prova && !mailOk ? t('Inserisci un indirizzo e-mail valido') : undefined} />
              {tipo === 'ristoranti' && <InputField name="rq-tel" type="tel" label={t('Cellulare')} iconLeft="fa-regular fa-mobile" value={tel} onChange={e => setTel(e.target.value)} />}

              {tipo === 'transfer' && (
                <>
                  <SelectField name="rq-veicolo" label={t('Servizio')} required value={veicolo} onChange={e => setVeicolo(e.target.value)}
                    options={VEICOLI.map(v => ({ value: v.value, label: `${t(v.label)} · ${eur(v.prezzo)}` }))} />
                  <SelectField name="rq-da" label={t('Luogo di partenza')} value={da} onChange={e => setDa(e.target.value)} options={PARTENZE.map(p => ({ value: p, label: t(p) }))} />
                  <InputField name="rq-ind" label={da === 'Personalizzato' ? t('Partenza') : t('Destinazione')} required={da === 'Personalizzato'} iconLeft="fa-regular fa-location-dot"
                    placeholder={da === 'Personalizzato' ? t('Indirizzo di partenza') : t('Hotel o indirizzo di arrivo')} value={indirizzo} onChange={e => setIndirizzo(e.target.value)}
                    error={prova && da === 'Personalizzato' && !indirizzo.trim() ? t('Obbligatorio') : undefined} />
                  <DatePickerField name="rq-data" label={t('Data partenza')} required value={dataT} min={oggiIso()} onChange={e => setDataT(e.target.value)} />
                  <DatePickerField name="rq-ora" type="time" label={t('Ora partenza')} required value={oraT} onChange={e => setOraT(e.target.value)} />
                  <div className="snw-rq__largo"><CheckboxField name="rq-rit" label={t('Prenota ritorno')} checked={ritorno} onChange={e => setRitorno(e.target.checked)} /></div>
                  {ritorno && (
                    <>
                      <DatePickerField name="rq-data-r" label={t('Data ritorno')} value={dataR} min={dataT} onChange={e => setDataR(e.target.value)} />
                      <DatePickerField name="rq-ora-r" type="time" label={t('Ora ritorno')} value={oraR} onChange={e => setOraR(e.target.value)} />
                    </>
                  )}
                </>
              )}

              {tipo === 'ristoranti' && (
                <>
                  <DatePickerField name="rq-data-g" label={t('Data')} required value={dataG} min={oggiIso(1)} onChange={e => setDataG(e.target.value)} />
                  <div className="snw-rq__stepper">
                    <span className="snw-rq__lbl">{t('N° di persone (minimo 12)')}</span>
                    <SnwStepper valore={persone} min={12} max={120} onChange={setPersone} etichetta={t('persone')} />
                  </div>
                  <div className="snw-rq__largo">
                    <RadioGroup name="rq-pasto" label={t('Pasto')} value={pasto} onChange={v => { setPasto(v); setOrario(ORARI[v][1]) }}
                      options={[{ value: 'colazione', label: t('Colazione') }, { value: 'pranzo', label: t('Pranzo') }, { value: 'cena', label: t('Cena') }]} />
                  </div>
                  <SelectField name="rq-orario" label={t('Orario')} value={orario} onChange={e => setOrario(e.target.value)} options={ORARI[pasto].map(h => ({ value: h, label: h }))} />
                  <div className="snw-rq__largo snw-rq__menu" role="radiogroup" aria-label={t('Menù')}>
                    {MENU.map(m => (
                      <button key={m.id} type="button" role="radio" aria-checked={menu === m.id} className={menu === m.id ? 'snw-rq__m snw-rq__m--on' : 'snw-rq__m'} onClick={() => setMenu(m.id)}>
                        <span><b>{t(m.nome)}</b><small>{t(m.txt)}</small></span>
                        <strong>{eur(m.prezzo)}</strong>
                        {menu === m.id && <i className="fa-solid fa-circle-check" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                  <div className="snw-rq__largo"><TextareaField name="rq-note" label={t('Note')} rows={3} placeholder={t('Specifica se ci sono intolleranze o allergie…')} value={note} onChange={e => setNote(e.target.value)} /></div>
                </>
              )}

              {tipo === 'bagagli' && (
                <>
                  <SelectField name="rq-dep" label={t('Deposito')} value={deposito} onChange={e => setDeposito(e.target.value)} options={DEPOSITI.map(d => ({ value: d, label: t(d) }))} />
                  <div className="snw-rq__stepper">
                    <span className="snw-rq__lbl">{t('Bagagli')}</span>
                    <SnwStepper valore={colli} min={1} max={20} onChange={setColli} etichetta={t('Bagagli').toLowerCase()} />
                  </div>
                  <DatePickerField name="rq-dd" label={t('Data di deposito')} required value={dataD} min={oggiIso()} onChange={e => setDataD(e.target.value)} />
                  <DatePickerField name="rq-od" type="time" label={t('Ora deposito')} required value={oraD} onChange={e => setOraD(e.target.value)} />
                  <DatePickerField name="rq-dp" label={t('Data di ritiro')} required value={dataP} min={dataD} onChange={e => setDataP(e.target.value)} />
                  <DatePickerField name="rq-op" type="time" label={t('Ora ritiro')} required value={oraP} onChange={e => setOraP(e.target.value)}
                    error={prova && !ritiroOk ? t('Il ritiro deve essere dopo il deposito') : undefined} />
                </>
              )}
            </div>

            <footer className="snw-rq__piede">
              <span className="snw-rq__tot">
                <small>{t('Totale')}</small>
                <b>{eur(totale)}</b>
                <em>
                  {tipo === 'transfer' && `${t('{prezzo} a tratta', { prezzo: eur(prezzoV) })}${ritorno ? ` · ${t('andata e ritorno')}` : ''}`}
                  {tipo === 'ristoranti' && `${t('{n} persone', { n: persone })} × ${eur(MENU.find(m => m.id === menu)!.prezzo)}`}
                  {tipo === 'bagagli' && `${colli === 1 ? t('{n} bagaglio', { n: colli }) : t('{n} bagagli', { n: colli })} × ${eur(TARIFFA_BAGAGLIO)} × ${giorniB === 1 ? t('{n} giorno', { n: giorniB }) : t('{n} giorni', { n: giorniB })}`}
                </em>
              </span>
              <button type="submit" className="sib-btn sib-btn--primary">{t('Invia richiesta')}</button>
            </footer>
          </form>
        )}

        <aside className="snw-rq__lato">
          <h3>{t('Come funziona')}</h3>
          <ol>
            <li><b>{t('Invii la richiesta')}</b><span>{t('Senza pagare nulla adesso.')}</span></li>
            <li><b>{t('Il booking conferma')}</b><span>{t('Disponibilità e dettagli via e-mail entro 2 ore lavorative.')}</span></li>
            <li><b>{t('Paghi e ricevi il voucher')}</b><span>{t('Con carta o Sibylla Token, dall\'area riservata.')}</span></li>
          </ol>
          <div className="snw-rq__altri">
            {(['transfer', 'ristoranti', 'bagagli'] as TipoRichiesta[]).filter(x => x !== tipo).map(x => (
              <button key={x} type="button" onClick={() => vai({ nome: 'richiesta', tipo: x })}>
                <i className={`fa-light ${TESTE[x].icona}`} aria-hidden="true" /> {`${t(TESTE[x].titolo)} ${TESTE[x].enfasi ? t(TESTE[x].enfasi) : ''}`.trim()} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
