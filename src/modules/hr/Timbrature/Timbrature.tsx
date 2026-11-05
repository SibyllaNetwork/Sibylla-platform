import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import Pagination from '../../../core/components/Pagination'
import { DatePickerField, DateRangeField, InputField, SearchField, SelectField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { REPARTI_HR } from '../../../store/useHrGestioneStore'
import {
  DIPENDENTI_PRESENZE, SENZA_APP, useGiornataPresenze, useRegistroPresenzeStore, type DipendentePresenze,
} from '../../../store/useRegistroPresenzeStore'
import {
  chiaveGiorno, dataDa, hhmmToMin, isoDi, minToHHMM, repartoIcon, ritardoDi, turnoPrevisto,
  type Timbratura, type VersoTimbratura,
} from '../_presenze/presenze.model'
import { POSTAZIONI } from '../_presenze/ModaleTimbrature'
import { exportXls } from '../hrExport'
import './Timbrature.sass'

/**
 * Timbrature — HR › Gestione delle presenze.
 * Come entra ed esce il personale: il QR del kiosk all'ingresso (si rinnova ogni
 * minuto, il dipendente lo inquadra con l'App Op!), gli avvisi di ritardo
 * arrivati oggi dall'app, lo stato di attivazione dell'app e lo storico di
 * tutte le timbrature, che l'ufficio del personale può aggiungere, correggere
 * o eliminare. Le timbrature sono le stesse del Registro presenze.
 */

const PAGE_SIZE = 10
const DURATA_QR = 60
const APP_URL = 'https://app.sibyllaop.it/'
const KIOSK_PATH = '/kiosk?p=principale'

const MOTIVI_RITARDO = ['Traffico sulla statale', 'Visita medica', 'Sciopero dei mezzi', 'Accompagno i figli a scuola', '']

interface RigaTimbratura {
  key: string
  dip: DipendentePresenze
  iso: string
  t: Timbratura
  manuale: boolean
}

interface FormTimbratura {
  /** Timbratura in modifica: giorno e id d'origine. */
  orig?: { dipId: number; iso: string; id: string }
  dipId: string
  data: string
  ora: string
  verso: VersoTimbratura
  postazione: string
  note: string
}

const fmtData = (iso: string) => iso.split('-').reverse().join('/')
const iniziali = (d: { nome: string; cognome: string }) => `${d.nome[0]}${d.cognome[0]}`

/** Token del QR: cambia a ogni finestra di DURATA_QR secondi. */
const tokenQr = (finestra: number) => (finestra * 2654435761 >>> 0).toString(36).toUpperCase()

function useQr(testo: string, larghezza = 240) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(testo, { errorCorrectionLevel: 'M', margin: 1, width: larghezza, color: { dark: '#1E293B', light: '#FFFFFF' } })
      .then((u) => { if (vivo) setUrl(u) })
      .catch(() => { if (vivo) setUrl('') })
    return () => { vivo = false }
  }, [testo, larghezza])
  return url
}

/** Orologio al secondo (per countdown del QR e kiosk). */
function useAdesso() {
  const [ora, setOra] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => setOra(new Date()), 1000); return () => window.clearInterval(t) }, [])
  return ora
}

export default function Timbrature({ navigate }: { navigate: (p: string) => void }) {
  const giornata = useGiornataPresenze()
  const timbratureManuali = useRegistroPresenzeStore((s) => s.timbrature)
  const impostaTimbrature = useRegistroPresenzeStore((s) => s.impostaTimbrature)
  const conNomeFino = useRegistroPresenzeStore((s) => s.timbraturaConNomeFino)
  const setConNomeFino = useRegistroPresenzeStore((s) => s.setTimbraturaConNomeFino)
  const confirm = useConfirmStore((s) => s.confirm)

  const adesso = useAdesso()
  const oggiIso = isoDi(adesso)
  const minutiOra = adesso.getHours() * 60 + adesso.getMinutes()

  // ── QR del kiosk ──
  const finestra = Math.floor(adesso.getTime() / 1000 / DURATA_QR)
  const scadeTra = DURATA_QR - (Math.floor(adesso.getTime() / 1000) % DURATA_QR)
  const testoQr = `${APP_URL}timbra?p=principale&k=${tokenQr(finestra)}`
  const qrKiosk = useQr(testoQr, 480)
  const qrApp = useQr(APP_URL, 240)
  const [kiosk, setKiosk] = useState(false)
  const kioskUrl = `${window.location.origin}${KIOSK_PATH}`

  // ── Filtri dello storico ──
  const [dal, setDal] = useState(oggiIso)
  const [al, setAl] = useState(oggiIso)
  const [reparto, setReparto] = useState('')
  const [verso, setVerso] = useState('')
  const [cerca, setCerca] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<FormTimbratura | null>(null)

  // Timbrature dei giorni del filtro (fino a oggi: le future non esistono ancora).
  const righe = useMemo(() => {
    const out: RigaTimbratura[] = []
    const fine = al > oggiIso ? oggiIso : al
    const d = dataDa(dal)
    for (let n = 0; isoDi(d) <= fine && n < 93; n++, d.setDate(d.getDate() + 1)) {
      const iso = isoDi(d)
      DIPENDENTI_PRESENZE.forEach((dip) => {
        const g = giornata(dip.id, iso)
        const manuale = !!timbratureManuali[chiaveGiorno(dip.id, iso)]
        g.timbrature.forEach((t) => out.push({ key: `${dip.id}|${iso}|${t.id}`, dip, iso, t, manuale }))
      })
    }
    return out.sort((a, b) => (b.iso + minToHHMM(b.t.min)).localeCompare(a.iso + minToHHMM(a.t.min)))
  }, [dal, al, oggiIso, giornata, timbratureManuali])

  const filtrate = useMemo(() => righe.filter((r) =>
    (!reparto || r.dip.reparto === reparto) &&
    (!verso || r.t.verso === verso) &&
    (!cerca.trim() || `${r.dip.nome} ${r.dip.cognome}`.toLowerCase().includes(cerca.trim().toLowerCase()))), [righe, reparto, verso, cerca])

  useEffect(() => { setPage(1) }, [dal, al, reparto, verso, cerca])
  const totalPages = Math.max(1, Math.ceil(filtrate.length / PAGE_SIZE))
  const pageRows = filtrate.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Avvisi di ritardo di oggi (dall'App Op!) ──
  const avvisi = useMemo(() => {
    const oggi = dataDa(oggiIso)
    return DIPENDENTI_PRESENZE.flatMap((dip) => {
      const turno = turnoPrevisto(dip.id, oggi)
      const ritardo = ritardoDi(dip.id, oggi)
      if (!turno || !ritardo) return []
      const g = giornata(dip.id, oggiIso)
      // Chi oggi è in ferie o assente non ha un turno da rispettare.
      if (!g.segmenti.some((s) => s.tipo === 'presente') && !g.timbrature.length && minutiOra > turno.inizio) return []
      const avvisatoAlle = turno.inizio - 12 - (dip.id % 4) * 7
      if (avvisatoAlle > minutiOra) return []
      const entrata = [...g.timbrature].sort((a, b) => a.min - b.min).find((t) => t.verso === 'entrata')
      return [{ dip, previsto: turno.inizio + ritardo, turno: turno.inizio, motivo: MOTIVI_RITARDO[dip.id % MOTIVI_RITARDO.length], avvisatoAlle, entrata: entrata?.min }]
    })
  }, [giornata, oggiIso, minutiOra])

  // ── App dipendenti ──
  const attivi = DIPENDENTI_PRESENZE.filter((d) => !SENZA_APP.includes(d.id))
  const daAttivare = DIPENDENTI_PRESENZE.filter((d) => SENZA_APP.includes(d.id))
  const dallApp7gg = useMemo(() => {
    let n = 0
    const d = dataDa(oggiIso)
    for (let i = 0; i < 7; i++) {
      const iso = isoDi(d)
      DIPENDENTI_PRESENZE.forEach((dip) => { n += giornata(dip.id, iso).timbrature.filter((t) => t.postazione === 'App Op!').length })
      d.setDate(d.getDate() - 1)
    }
    return n
  }, [giornata, oggiIso])

  // ── Nuova / modifica / elimina ──
  const nuova = () => setForm({ dipId: '', data: oggiIso, ora: minToHHMM(minutiOra), verso: 'entrata', postazione: 'inserita dall\'HR', note: '' })
  const modifica = (r: RigaTimbratura) => setForm({
    orig: { dipId: r.dip.id, iso: r.iso, id: r.t.id },
    dipId: String(r.dip.id), data: r.iso, ora: minToHHMM(r.t.min), verso: r.t.verso, postazione: r.t.postazione, note: r.t.note ?? '',
  })

  function salva() {
    if (!form || !form.dipId || !form.data || !form.ora) return
    const dipId = Number(form.dipId)
    const voce: Timbratura = {
      id: form.orig?.id ?? `t${Date.now()}`,
      min: hhmmToMin(form.ora), verso: form.verso, postazione: form.postazione, note: form.note.trim() || undefined,
    }
    const stessoGiorno = form.orig && form.orig.dipId === dipId && form.orig.iso === form.data
    if (form.orig && !stessoGiorno) {
      // Spostata su un altro giorno o dipendente: esce dalla giornata d'origine.
      const o = form.orig
      impostaTimbrature(chiaveGiorno(o.dipId, o.iso), giornata(o.dipId, o.iso).timbrature.filter((t) => t.id !== o.id))
    }
    const lista = giornata(dipId, form.data).timbrature
    impostaTimbrature(chiaveGiorno(dipId, form.data), stessoGiorno ? lista.map((t) => (t.id === voce.id ? voce : t)) : [...lista, voce])
    const nome = DIPENDENTI_PRESENZE.find((d) => d.id === dipId)
    toast.success(`${voce.verso === 'entrata' ? 'Entrata' : 'Uscita'} delle ${form.ora} di ${nome?.nome} ${nome?.cognome} ${form.orig ? 'aggiornata' : 'registrata'}.`, form.orig ? 'Timbratura modificata' : 'Timbratura aggiunta')
    setForm(null)
  }

  async function elimina(r: RigaTimbratura) {
    const ok = await confirm({
      title: 'Elimina timbratura',
      message: `Eliminare l'${r.t.verso} delle ${minToHHMM(r.t.min)} del ${fmtData(r.iso)} di ${r.dip.nome} ${r.dip.cognome}? La presenza della giornata verrà ricalcolata.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    impostaTimbrature(chiaveGiorno(r.dip.id, r.iso), giornata(r.dip.id, r.iso).timbrature.filter((t) => t.id !== r.t.id))
    toast.success('Timbratura eliminata.', 'Eliminata')
  }

  const esporta = () => exportXls(`timbrature_${dal}_${al}`, ['Dipendente', 'Reparto', 'Tipo', 'Data', 'Ora', 'Postazione', 'Note'],
    filtrate.map((r) => [`${r.dip.nome} ${r.dip.cognome}`, r.dip.reparto, r.t.verso === 'entrata' ? 'Entrata' : 'Uscita', fmtData(r.iso), minToHHMM(r.t.min), r.t.postazione, r.t.note ?? '']))

  const copia = (testo: string, msg = 'Indirizzo del kiosk copiato.') => {
    navigator.clipboard?.writeText(testo).then(() => toast.success(msg, 'Copiato')).catch(() => toast.error('Copia non riuscita.', 'Errore'))
  }

  const fuoriTermine = conNomeFino < oggiIso

  return (
    <div className="tmb">
      <PageHead
        title="Timbrature"
        subtitle="Entrate e uscite del personale: QR di timbratura, avvisi di ritardo, app dipendenti e storico"
        onBack={() => navigate('home')}
        actions={
          <div className="tmb__head-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setKiosk(true)}>
              <i className="fa-solid fa-display" aria-hidden="true" />Apri kiosk
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={nuova}>
              <i className="fa-solid fa-plus" aria-hidden="true" />Nuova timbratura
            </button>
          </div>
        }
      />

      <div className="tmb__top">
        {/* ── QR code timbratura ── */}
        <section className="tmb__card">
          <header className="tmb__card-head">
            <h2 className="tmb__card-title"><i className="fa-solid fa-qrcode" aria-hidden="true" />QR code timbratura</h2>
          </header>
          <div className="tmb__qr-body">
            <div className="tmb__qr">
              {qrKiosk ? <img src={qrKiosk} alt="QR code di timbratura del kiosk" /> : <span className="tmb__qr-ph" />}
              <span className={`tmb__qr-scade${scadeTra <= 10 ? ' tmb__qr-scade--warn' : ''}`}>Si rinnova tra {scadeTra}s</span>
            </div>
            <div className="tmb__how">
              <h3 className="tmb__how-title">Come funziona</h3>
              <ol className="tmb__steps">
                <li>Apri il <b>kiosk</b> su un tablet o un monitor all'ingresso del personale.</li>
                <li>Il dipendente apre l'<b>App Op!</b> sul telefono.</li>
                <li>Inquadra il QR: Sibylla riconosce da sola se è un'entrata o un'uscita.</li>
              </ol>
              <p className="tmb__hint">Il codice cambia ogni minuto: una foto del QR non basta per timbrare da casa.</p>
              <div className="tmb__url">
                <span className="tmb__url-lbl">Indirizzo del kiosk</span>
                <code className="tmb__code">{KIOSK_PATH}</code>
                <Tooltip text="Copia l'indirizzo">
                  <button type="button" className="sib-btn sib-btn--icon tmb__ico" aria-label="Copia l'indirizzo del kiosk" onClick={() => copia(kioskUrl)}>
                    <i className="fa-solid fa-copy" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>

        {/* ── App dipendenti ── */}
        <section className="tmb__card">
          <header className="tmb__card-head">
            <h2 className="tmb__card-title"><i className="fa-solid fa-mobile-screen" aria-hidden="true" />App dipendenti</h2>
          </header>
          <div className="tmb__qr-body">
            <div className="tmb__qr tmb__qr--sm">
              {qrApp ? <img src={qrApp} alt="QR code per installare l'App Op!" /> : <span className="tmb__qr-ph" />}
              <span className="tmb__qr-note">Inquadralo per installare l'app</span>
            </div>
            <div className="tmb__how">
              <p className="tmb__app-stat"><b>{attivi.length}</b> di {DIPENDENTI_PRESENZE.length} dipendenti hanno attivato l'App Op!</p>
              <p className="tmb__app-stat">Ultimi 7 giorni: <b>{dallApp7gg}</b> timbrature dall'app.</p>
              {daAttivare.length > 0 && (
                <div className="tmb__attivare">
                  <span>Da attivare:</span>
                  {daAttivare.map((d) => <span key={d.id} className="tmb__pill">{d.nome} {d.cognome}</span>)}
                  <button type="button" className="sib-btn sib-btn--ghost tmb__invita"
                    onClick={() => toast.success(`Invito all'App Op! inviato a ${daAttivare.map((d) => d.nome).join(' e ')}.`, 'Invito inviato')}>
                    <i className="fa-solid fa-paper-plane" aria-hidden="true" />Invia invito
                  </button>
                </div>
              )}
              <div className="tmb__url">
                <span className="tmb__url-lbl">Link d'installazione</span>
                <code className="tmb__code">{APP_URL.replace('https://', '')}</code>
                <Tooltip text="Copia il link">
                  <button type="button" className="sib-btn sib-btn--icon tmb__ico" aria-label="Copia il link d'installazione dell'App Op!" onClick={() => copia(APP_URL, 'Link d\'installazione copiato.')}>
                    <i className="fa-solid fa-copy" />
                  </button>
                </Tooltip>
              </div>
              <ol className="tmb__steps tmb__steps--muted">
                <li>Il dipendente inquadra questo QR (o apre il link d'installazione) dal telefono.</li>
                <li>Su iPhone: Condividi → <i>Aggiungi alla schermata Home</i>. Su Android: <i>Installa app</i>.</li>
                <li>Accede con email aziendale o cellulare e il codice ricevuto via email.</li>
              </ol>
              <div className="tmb__nome">
                <DatePickerField name="con-nome" label="Timbratura con nome e cognome consentita fino al" value={conNomeFino}
                  onChange={(e) => e.target.value && setConNomeFino(e.target.value)} />
                <p className={`tmb__hint${fuoriTermine ? ' tmb__hint--warn' : ''}`}>
                  {fuoriTermine
                    ? 'Scaduta: ora si timbra solo inquadrando il QR del kiosk.'
                    : "Fino a questa data chi non riesce a inquadrare il QR può timbrare scrivendo nome e cognome nell'app."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Avvisi di ritardo ── */}
      <section className="tmb__card">
        <header className="tmb__card-head">
          <h2 className="tmb__card-title"><i className="fa-solid fa-alarm-clock" aria-hidden="true" />Avvisi di ritardo di oggi ({avvisi.length})</h2>
        </header>
        {avvisi.length ? (
          <div className="sib-table-wrap tmb__table tmb__table--avvisi">
            <table className="sib-table">
              <colgroup><col className="tmb__c-dip" /><col /><col /><col className="tmb__c-motivo" /><col /><col /></colgroup>
              <thead><tr><th>Dipendente</th><th>Turno</th><th>Arrivo previsto</th><th>Motivo</th><th>Avvisato alle</th><th>Entrata</th></tr></thead>
              <tbody>
                {avvisi.map((a) => (
                  <tr key={a.dip.id}>
                    <td><Persona d={a.dip} /></td>
                    <td>{minToHHMM(a.turno)}</td>
                    <td className="tmb__num">{minToHHMM(a.previsto)} <span className="tmb__ritardo">+{a.previsto - a.turno}'</span></td>
                    <td><TruncatedText text={a.motivo || '—'} /></td>
                    <td className="tmb__muted">{minToHHMM(a.avvisatoAlle)}</td>
                    <td>{a.entrata != null
                      ? <span className={a.entrata > a.previsto ? 'tmb__late' : 'tmb__ok'}>{minToHHMM(a.entrata)}</span>
                      : <span className="tmb__muted">Non ancora entrato</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tmb__empty-card">Nessun avviso di ritardo oggi.</p>
        )}
      </section>

      {/* ── Storico timbrature ── */}
      <section className="tmb__card">
        <header className="tmb__card-head tmb__card-head--tools">
          <h2 className="tmb__card-title"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />Storico timbrature</h2>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="sib-btn sib-btn--icon tmb__ico" aria-label="Esporta in Excel" onClick={esporta} disabled={!filtrate.length}>
              <i className="fa-regular fa-file-xls" />
            </button>
          </Tooltip>
        </header>
        <div className="tmb__filters">
          <DateRangeField nameFrom="dal" nameTo="al" label="Periodo" valueFrom={dal} valueTo={al}
            onChangeFrom={(e) => e.target.value && setDal(e.target.value)} onChangeTo={(e) => e.target.value && setAl(e.target.value)} />
          <SelectField name="reparto" label="Reparto" className="tmb__field" value={reparto} onChange={(e) => setReparto(e.target.value)}
            options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map((r) => ({ value: r, label: r }))]} />
          <SelectField name="verso" label="Tipo" className="tmb__field tmb__field--sm" value={verso} onChange={(e) => setVerso(e.target.value)}
            options={[{ value: '', label: 'Entrate e uscite' }, { value: 'entrata', label: 'Entrate' }, { value: 'uscita', label: 'Uscite' }]} />
          <div className="tmb__search">
            <SearchField name="cerca" placeholder="Cerca dipendente…" value={cerca} onChange={(e) => setCerca(e.target.value)} onClear={() => setCerca('')} />
          </div>
        </div>
        <div className="sib-table-wrap tmb__table">
          <table className="sib-table">
            <colgroup>
              <col className="tmb__c-dip" /><col className="tmb__c-tipo" /><col className="tmb__c-ora" /><col className="tmb__c-post" /><col /><col className="tmb__c-az" />
            </colgroup>
            <thead><tr><th>Dipendente</th><th>Tipo</th><th>Orario</th><th>Postazione</th><th>Note</th><th className="tmb__az">Azioni</th></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.key}>
                  <td><Persona d={r.dip} /></td>
                  <td>
                    <span className={`tmb__verso tmb__verso--${r.t.verso}`}>
                      <i className={`fa-solid ${r.t.verso === 'entrata' ? 'fa-right-to-bracket' : 'fa-right-from-bracket'}`} aria-hidden="true" />
                      {r.t.verso === 'entrata' ? 'Entrata' : 'Uscita'}
                    </span>
                  </td>
                  <td className="tmb__num"><b>{fmtData(r.iso)} {minToHHMM(r.t.min)}</b></td>
                  <td><TruncatedText text={r.t.postazione} /></td>
                  <td>
                    {r.manuale && (
                      <Tooltip text="Inserita o corretta dall'ufficio del personale">
                        <i className="fa-solid fa-pen tmb__mod" aria-label="Modificata dall'ufficio del personale" />
                      </Tooltip>
                    )}
                    <TruncatedText text={r.t.note ?? (r.manuale ? '' : '—')} />
                  </td>
                  <td className="tmb__az">
                    <Tooltip text="Modifica">
                      <button type="button" className="sib-btn sib-btn--icon tmb__ico" aria-label="Modifica timbratura" onClick={() => modifica(r)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina">
                      <button type="button" className="sib-btn sib-btn--icon tmb__ico" aria-label="Elimina timbratura" onClick={() => elimina(r)}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={6} className="tmb__empty">Nessuna timbratura per i filtri impostati.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="tmb__pager">
          <span className="tmb__count">{filtrate.length} {filtrate.length === 1 ? 'timbratura' : 'timbrature'}</span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </section>

      {/* ── Nuova / modifica timbratura ── */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.orig ? 'Modifica timbratura' : 'Nuova timbratura'} size="md">
        {form && (
          <div className="tmb-form">
            <SelectField name="dipendente" label="Dipendente" required value={form.dipId} onChange={(e) => setForm({ ...form, dipId: e.target.value })}
              placeholder="Scegli il dipendente"
              options={DIPENDENTI_PRESENZE.map((d) => ({ value: String(d.id), label: `${d.cognome} ${d.nome} · ${d.reparto}` }))} />
            <div className="tmb-form__grid">
              <DatePickerField name="data" label="Data" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              <DatePickerField name="ora" label="Ora" type="time" value={form.ora} onChange={(e) => setForm({ ...form, ora: e.target.value })} />
              <SelectField name="tipo" label="Tipo" value={form.verso} onChange={(e) => setForm({ ...form, verso: e.target.value as VersoTimbratura })}
                options={[{ value: 'entrata', label: 'Entrata' }, { value: 'uscita', label: 'Uscita' }]} />
            </div>
            <SelectField name="postazione" label="Postazione" value={form.postazione} onChange={(e) => setForm({ ...form, postazione: e.target.value })}
              options={Array.from(new Set([...POSTAZIONI, form.postazione])).map((p) => ({ value: p, label: p }))} />
            <InputField name="note" label="Note (opzionale)" placeholder="Es. recupero, timbratura dimenticata…" value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {form.data > oggiIso && (
              <p className="tmb__hint tmb__hint--warn">La data è nel futuro: la timbratura comparirà nello storico da quel giorno.</p>
            )}
            <div className="tmb-form__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={salva} disabled={!form.dipId || !form.data || !form.ora}>
                {form.orig ? 'Salva modifiche' : 'Aggiungi timbratura'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {kiosk && createPortal(
        <Kiosk qr={qrKiosk} scadeTra={scadeTra} adesso={adesso} onClose={() => setKiosk(false)} />,
        document.body,
      )}
    </div>
  )
}

function Persona({ d }: { d: DipendentePresenze }) {
  return (
    <span className="tmb__persona">
      <span className="tmb__avatar">{iniziali(d)}</span>
      <span className="tmb__persona-txt">
        <span className="tmb__persona-nome"><TruncatedText text={`${d.nome} ${d.cognome}`} /></span>
        <span className="tmb__persona-rep"><i className={`fa-solid ${repartoIcon(d.reparto)}`} aria-hidden="true" />{d.reparto}</span>
      </span>
    </span>
  )
}

/** Schermata del kiosk: QR grande che si rinnova, orologio e istruzioni. Esc per uscire. */
function Kiosk({ qr, scadeTra, adesso, onClose }: { qr: string; scadeTra: number; adesso: Date; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  const ora = `${String(adesso.getHours()).padStart(2, '0')}:${String(adesso.getMinutes()).padStart(2, '0')}`
  const data = adesso.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="tmb-kiosk" role="dialog" aria-label="Kiosk di timbratura">
      <button type="button" className="tmb-kiosk__close" onClick={onClose} aria-label="Chiudi il kiosk">
        <i className="fa-solid fa-xmark" />
      </button>
      <div className="tmb-kiosk__clock">{ora}</div>
      <div className="tmb-kiosk__date">{data}</div>
      <div className="tmb-kiosk__qr">{qr && <img src={qr} alt="QR code di timbratura" />}</div>
      <p className="tmb-kiosk__msg">Inquadra il codice con l'<b>App Op!</b> per timbrare l'entrata o l'uscita</p>
      <div className="tmb-kiosk__bar"><span className="tmb-kiosk__bar-fill" style={{ '--p': `${(scadeTra / DURATA_QR) * 100}%` } as React.CSSProperties} /></div>
      <p className="tmb-kiosk__scade">Il codice si rinnova tra {scadeTra}s · Esc per uscire</p>
    </div>
  )
}
