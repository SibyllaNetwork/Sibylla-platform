import React, { useState } from 'react'
import { CheckboxField, DatePickerField, InputField, RadioGroup, SelectField, TextareaField } from '../../core/components/form'
import { FOTO, eur, oggiIso } from '../sitoData'
import { TipoRichiesta, useSitoStore } from '../useSitoStore'
import { useSitoAccountStore } from '../useSitoAccountStore'
import { SnwStepper } from '../SnwUi'
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
  const t = TESTE[tipo]
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
      <SnwTestata kicker={t.kicker} titolo={t.titolo} enfasi={t.enfasi || undefined} sotto={t.sotto} foto={t.foto} icona={t.icona}
        briciole={[{ nome: 'Servizi', vai: { nome: 'catalogo', cat: 'servizi' } }, { nome: `${t.titolo} ${t.enfasi}`.trim() }]} />
      <div className="snw__wrap snw-rq__layout">
        {inviata ? (
          <div className="snw-rq__ok">
            <i className="fa-light fa-paper-plane" aria-hidden="true" />
            <h2>Richiesta inviata</h2>
            <p>Pratica <b>{inviata}</b> · totale indicativo <b>{eur(totale)}</b>. Il booking Sibylla conferma disponibilità e dettagli a <b>{email.trim()}</b> entro 2 ore lavorative.</p>
            <div>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'home' })}>Torna alla home</button>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setInviata('')}>Nuova richiesta</button>
            </div>
          </div>
        ) : (
          <form className="snw-rq__form" onSubmit={invia} noValidate>
            <div className="snw-rq__griglia">
              <InputField name="rq-mail" type="email" label="Email di contatto" required iconLeft="fa-regular fa-envelope" value={email} onChange={e => setEmail(e.target.value)}
                error={prova && !mailOk ? 'Inserisci un indirizzo e-mail valido' : undefined} />
              {tipo === 'ristoranti' && <InputField name="rq-tel" type="tel" label="Cellulare" iconLeft="fa-regular fa-mobile" value={tel} onChange={e => setTel(e.target.value)} />}

              {tipo === 'transfer' && (
                <>
                  <SelectField name="rq-veicolo" label="Servizio" required value={veicolo} onChange={e => setVeicolo(e.target.value)}
                    options={VEICOLI.map(v => ({ value: v.value, label: `${v.label} · ${eur(v.prezzo)}` }))} />
                  <SelectField name="rq-da" label="Luogo di partenza" value={da} onChange={e => setDa(e.target.value)} options={PARTENZE.map(p => ({ value: p, label: p }))} />
                  <InputField name="rq-ind" label={da === 'Personalizzato' ? 'Partenza' : 'Destinazione'} required={da === 'Personalizzato'} iconLeft="fa-regular fa-location-dot"
                    placeholder={da === 'Personalizzato' ? 'Indirizzo di partenza' : 'Hotel o indirizzo di arrivo'} value={indirizzo} onChange={e => setIndirizzo(e.target.value)}
                    error={prova && da === 'Personalizzato' && !indirizzo.trim() ? 'Obbligatorio' : undefined} />
                  <DatePickerField name="rq-data" label="Data partenza" required value={dataT} min={oggiIso()} onChange={e => setDataT(e.target.value)} />
                  <DatePickerField name="rq-ora" type="time" label="Ora partenza" required value={oraT} onChange={e => setOraT(e.target.value)} />
                  <div className="snw-rq__largo"><CheckboxField name="rq-rit" label="Prenota ritorno" checked={ritorno} onChange={e => setRitorno(e.target.checked)} /></div>
                  {ritorno && (
                    <>
                      <DatePickerField name="rq-data-r" label="Data ritorno" value={dataR} min={dataT} onChange={e => setDataR(e.target.value)} />
                      <DatePickerField name="rq-ora-r" type="time" label="Ora ritorno" value={oraR} onChange={e => setOraR(e.target.value)} />
                    </>
                  )}
                </>
              )}

              {tipo === 'ristoranti' && (
                <>
                  <DatePickerField name="rq-data-g" label="Data" required value={dataG} min={oggiIso(1)} onChange={e => setDataG(e.target.value)} />
                  <div className="snw-rq__stepper">
                    <span className="snw-rq__lbl">N° di persone (minimo 12)</span>
                    <SnwStepper valore={persone} min={12} max={120} onChange={setPersone} etichetta="persone" />
                  </div>
                  <div className="snw-rq__largo">
                    <RadioGroup name="rq-pasto" label="Pasto" value={pasto} onChange={v => { setPasto(v); setOrario(ORARI[v][1]) }}
                      options={[{ value: 'colazione', label: 'Colazione' }, { value: 'pranzo', label: 'Pranzo' }, { value: 'cena', label: 'Cena' }]} />
                  </div>
                  <SelectField name="rq-orario" label="Orario" value={orario} onChange={e => setOrario(e.target.value)} options={ORARI[pasto].map(h => ({ value: h, label: h }))} />
                  <div className="snw-rq__largo snw-rq__menu" role="radiogroup" aria-label="Menù">
                    {MENU.map(m => (
                      <button key={m.id} type="button" role="radio" aria-checked={menu === m.id} className={menu === m.id ? 'snw-rq__m snw-rq__m--on' : 'snw-rq__m'} onClick={() => setMenu(m.id)}>
                        <span><b>{m.nome}</b><small>{m.txt}</small></span>
                        <strong>{eur(m.prezzo)}</strong>
                        {menu === m.id && <i className="fa-solid fa-circle-check" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                  <div className="snw-rq__largo"><TextareaField name="rq-note" label="Note" rows={3} placeholder="Specifica se ci sono intolleranze o allergie…" value={note} onChange={e => setNote(e.target.value)} /></div>
                </>
              )}

              {tipo === 'bagagli' && (
                <>
                  <SelectField name="rq-dep" label="Deposito" value={deposito} onChange={e => setDeposito(e.target.value)} options={DEPOSITI.map(d => ({ value: d, label: d }))} />
                  <div className="snw-rq__stepper">
                    <span className="snw-rq__lbl">Bagagli</span>
                    <SnwStepper valore={colli} min={1} max={20} onChange={setColli} etichetta="bagagli" />
                  </div>
                  <DatePickerField name="rq-dd" label="Data di deposito" required value={dataD} min={oggiIso()} onChange={e => setDataD(e.target.value)} />
                  <DatePickerField name="rq-od" type="time" label="Ora deposito" required value={oraD} onChange={e => setOraD(e.target.value)} />
                  <DatePickerField name="rq-dp" label="Data di ritiro" required value={dataP} min={dataD} onChange={e => setDataP(e.target.value)} />
                  <DatePickerField name="rq-op" type="time" label="Ora ritiro" required value={oraP} onChange={e => setOraP(e.target.value)}
                    error={prova && !ritiroOk ? 'Il ritiro deve essere dopo il deposito' : undefined} />
                </>
              )}
            </div>

            <footer className="snw-rq__piede">
              <span className="snw-rq__tot">
                <small>Totale</small>
                <b>{eur(totale)}</b>
                <em>
                  {tipo === 'transfer' && `${eur(prezzoV)} a tratta${ritorno ? ' · andata e ritorno' : ''}`}
                  {tipo === 'ristoranti' && `${persone} persone × ${eur(MENU.find(m => m.id === menu)!.prezzo)}`}
                  {tipo === 'bagagli' && `${colli} ${colli === 1 ? 'bagaglio' : 'bagagli'} × ${eur(TARIFFA_BAGAGLIO)} × ${giorniB} ${giorniB === 1 ? 'giorno' : 'giorni'}`}
                </em>
              </span>
              <button type="submit" className="sib-btn sib-btn--primary">Invia richiesta</button>
            </footer>
          </form>
        )}

        <aside className="snw-rq__lato">
          <h3>Come funziona</h3>
          <ol>
            <li><b>Invii la richiesta</b><span>Senza pagare nulla adesso.</span></li>
            <li><b>Il booking conferma</b><span>Disponibilità e dettagli via e-mail entro 2 ore lavorative.</span></li>
            <li><b>Paghi e ricevi il voucher</b><span>Con carta o Sibylla Token, dall'area riservata.</span></li>
          </ol>
          <div className="snw-rq__altri">
            {(['transfer', 'ristoranti', 'bagagli'] as TipoRichiesta[]).filter(x => x !== tipo).map(x => (
              <button key={x} type="button" onClick={() => vai({ nome: 'richiesta', tipo: x })}>
                <i className={`fa-light ${TESTE[x].icona}`} aria-hidden="true" /> {`${TESTE[x].titolo} ${TESTE[x].enfasi}`.trim()} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
