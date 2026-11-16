import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { DatePickerField, SelectField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { DIPENDENTI_PRESENZE, SENZA_APP, useGiornataPresenze, useRegistroPresenzeStore } from '../../../store/useRegistroPresenzeStore'
import { dataDa, isoDi } from '../_presenze/presenze.model'
import { useStrutturaPagina, useStruttureCliente } from '../../../hooks/useStrutturaCorrente'
import { idStruttura } from '../../../core/demo/struttureDemo'
import { generaPms, type CameraDemo } from '../../operation/_data/pmsDemo'
import Kiosk, { APP_URL, POSTAZIONE_DEFAULT, kioskPath, useAdesso, useQr, useQrTimbratura } from '../Timbrature/Kiosk'
import './QrKiosk.sass'

/**
 * Qr Code & kiosk — HR › Gestione delle presenze, subito dopo Timbrature.
 * Tutti i QR che il personale inquadra con l'App Op!:
 *  - il QR di timbratura del kiosk all'ingresso (si rinnova ogni minuto);
 *  - il QR d'installazione dell'app, con lo stato di attivazione (gli avvisi
 *    di ritardo dall'app arrivano come notifica al responsabile HR);
 *  - il QR di ogni camera della struttura, da attaccare in camera: la cameriera
 *    lo inquadra per aprire e chiudere la pulizia. Divisi per piano, si
 *    stampano uno alla volta, per piano o tutti insieme.
 */

const KIOSK_PATH = kioskPath(POSTAZIONE_DEFAULT)

/** Contenuto del QR della camera letto dall'App Op! (struttura + numero). */
const testoQrCamera = (idStr: number, numero: string) => `${APP_URL}pulizie?s=${idStr}&c=${encodeURIComponent(numero)}`

const etichettaPiano = (p: number) => (p === 0 ? 'Piano terra' : `Piano ${p}`)

/** Tipo camera leggibile dal gestionale: "SGL CLASSICA (Singola Classic)" → "Singola Classic". */
const tipoBreve = (t: string) => t.match(/\(([^)]+)\)/)?.[1] ?? t.charAt(0) + t.slice(1).toLowerCase()

export default function QrKiosk({ navigate }: { navigate: (p: string) => void }) {
  const giornata = useGiornataPresenze()
  const conNomeFino = useRegistroPresenzeStore((s) => s.timbraturaConNomeFino)
  const setConNomeFino = useRegistroPresenzeStore((s) => s.setTimbraturaConNomeFino)

  const adesso = useAdesso()
  const oggiIso = isoDi(adesso)

  // ── QR del kiosk e dell'app ──
  const { qr: qrKiosk, scadeTra } = useQrTimbratura(POSTAZIONE_DEFAULT, adesso)
  const qrApp = useQr(APP_URL, 240)
  const [kiosk, setKiosk] = useState(false)
  const kioskUrl = `${window.location.origin}${KIOSK_PATH}`

  // ── Camere della struttura ──
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const schede = useStruttureCliente()
  const [piano, setPiano] = useState('')
  const camere = useMemo(() => {
    const s = schede.find((x) => x.nome === struttura)
    if (!s || !s.camere) return []
    return generaPms({ nome: s.nome, categoria: s.categoria, camere: s.camere }).camere
  }, [schede, struttura])
  const idStr = idStruttura(struttura)
  const piani = useMemo(() => {
    const m = new Map<number, CameraDemo[]>()
    camere.forEach((c) => m.set(c.piano, [...(m.get(c.piano) ?? []), c]))
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0])
  }, [camere])
  const pianiVisibili = piano === '' ? piani : piani.filter(([p]) => String(p) === piano)

  // ── App dipendenti ──
  const attivi = DIPENDENTI_PRESENZE.filter((d) => !SENZA_APP.includes(d.id))
  const daAttivare = DIPENDENTI_PRESENZE.filter((d) => SENZA_APP.includes(d.id))
  const dallApp7gg = useMemo(() => {
    const oggi = dataDa(oggiIso)
    const giorni = Array.from({ length: 7 }, (_, i) => isoDi(new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - i)))
    return giorni.reduce((n, iso) => n + DIPENDENTI_PRESENZE.reduce((k, dip) =>
      k + giornata(dip.id, iso).timbrature.filter((t) => t.postazione === 'App Op!').length, 0), 0)
  }, [giornata, oggiIso])

  const copia = (testo: string, msg = 'Indirizzo del kiosk copiato.') => {
    navigator.clipboard?.writeText(testo).then(() => toast.success(msg, 'Copiato')).catch(() => toast.error('Copia non riuscita.', 'Errore'))
  }

  const stampa = (gruppi: [number, CameraDemo[]][], titolo: string) =>
    stampaQrCamere(struttura, idStr, gruppi, titolo)

  const fuoriTermine = conNomeFino < oggiIso

  return (
    <div className="qrk">
      <PageHead
        title="Qr Code & kiosk"
        subtitle="QR di timbratura, kiosk all'ingresso, App Op! dei dipendenti e QR delle camere per le pulizie"
        onBack={() => navigate('home')}
        actions={
          <button type="button" className="sib-btn sib-btn--secondary qrk__head-btn" onClick={() => setKiosk(true)}>
            <i className="fa-solid fa-display" aria-hidden="true" />Apri kiosk
          </button>
        }
      />

      <div className="qrk__top">
        {/* ── QR code timbratura e kiosk ── */}
        <section className="qrk__card">
          <header className="qrk__card-head">
            <h2 className="qrk__card-title"><i className="fa-solid fa-qrcode" aria-hidden="true" />QR code timbratura e kiosk</h2>
          </header>
          <div className="qrk__qr-body">
            <div className="qrk__qr">
              {qrKiosk ? <img src={qrKiosk} alt="QR code di timbratura del kiosk" /> : <span className="qrk__qr-ph" />}
              <span className={`qrk__qr-scade${scadeTra <= 10 ? ' qrk__qr-scade--warn' : ''}`}>Si rinnova tra {scadeTra}s</span>
            </div>
            <div className="qrk__how">
              <h3 className="qrk__how-title">Come funziona</h3>
              <ol className="qrk__steps">
                <li>Apri il <b>kiosk</b> su un tablet o un monitor all'ingresso del personale.</li>
                <li>Il dipendente apre l'<b>App Op!</b> sul telefono.</li>
                <li>Inquadra il QR: Sibylla riconosce da sola se è un'entrata o un'uscita.</li>
              </ol>
              <p className="qrk__hint">Il codice cambia ogni minuto: una foto del QR non basta per timbrare da casa.</p>
              <div className="qrk__url">
                <span className="qrk__url-lbl">Indirizzo del kiosk</span>
                <code className="qrk__code">{KIOSK_PATH}</code>
                <span className="qrk__url-tools">
                  <Tooltip text="Copia l'indirizzo">
                    <button type="button" className="sib-btn sib-btn--icon qrk__ico" aria-label="Copia l'indirizzo del kiosk" onClick={() => copia(kioskUrl)}>
                      <i className="fa-solid fa-copy" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Apri in una nuova scheda">
                    <button type="button" className="sib-btn sib-btn--icon qrk__ico" aria-label="Apri il kiosk in una nuova scheda"
                      onClick={() => window.open(kioskUrl, '_blank', 'noopener')}>
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                    </button>
                  </Tooltip>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── App dipendenti ── */}
        <section className="qrk__card">
          <header className="qrk__card-head">
            <h2 className="qrk__card-title"><i className="fa-solid fa-mobile-screen" aria-hidden="true" />App dipendenti</h2>
          </header>
          <div className="qrk__qr-body">
            <div className="qrk__qr qrk__qr--sm">
              {qrApp ? <img src={qrApp} alt="QR code per installare l'App Op!" /> : <span className="qrk__qr-ph" />}
              <span className="qrk__qr-note">Inquadralo per installare l'app</span>
            </div>
            <div className="qrk__how">
              <p className="qrk__app-info"><b>{attivi.length}</b> di {DIPENDENTI_PRESENZE.length} dipendenti hanno attivato l'App Op!</p>
              <p className="qrk__app-info">Ultimi 7 giorni: <b>{dallApp7gg}</b> timbrature dall'app.</p>
              {daAttivare.length > 0 && (
                <div className="qrk__attivare">
                  <span>Da attivare:</span>
                  {daAttivare.map((d) => <span key={d.id} className="qrk__pill">{d.nome} {d.cognome}</span>)}
                  <button type="button" className="sib-btn sib-btn--ghost qrk__invita"
                    onClick={() => toast.success(`Invito all'App Op! inviato a ${daAttivare.map((d) => d.nome).join(' e ')}.`, 'Invito inviato')}>
                    <i className="fa-solid fa-paper-plane" aria-hidden="true" />Invia invito
                  </button>
                </div>
              )}
              <div className="qrk__url">
                <span className="qrk__url-lbl">Link d'installazione</span>
                <code className="qrk__code">{APP_URL.replace('https://', '')}</code>
                <Tooltip text="Copia il link">
                  <button type="button" className="sib-btn sib-btn--icon qrk__ico" aria-label="Copia il link d'installazione dell'App Op!" onClick={() => copia(APP_URL, 'Link d\'installazione copiato.')}>
                    <i className="fa-solid fa-copy" />
                  </button>
                </Tooltip>
              </div>
              <ol className="qrk__steps qrk__steps--muted">
                <li>Il dipendente inquadra questo QR (o apre il link d'installazione) dal telefono.</li>
                <li>Su iPhone: Condividi → <i>Aggiungi alla schermata Home</i>. Su Android: <i>Installa app</i>.</li>
                <li>Accede con email aziendale o cellulare e il codice ricevuto via email.</li>
              </ol>
              <div className="qrk__nome">
                <DatePickerField name="con-nome" label="Timbratura con nome e cognome consentita fino al" value={conNomeFino}
                  onChange={(e) => e.target.value && setConNomeFino(e.target.value)} />
                <p className={`qrk__hint${fuoriTermine ? ' qrk__hint--warn' : ''}`}>
                  {fuoriTermine
                    ? 'Scaduta: ora si timbra solo inquadrando il QR del kiosk.'
                    : "Fino a questa data chi non riesce a inquadrare il QR può timbrare scrivendo nome e cognome nell'app."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── QR code delle camere ── */}
      <section className="qrk__card">
        <header className="qrk__card-head qrk__card-head--tools">
          <h2 className="qrk__card-title"><i className="fa-solid fa-broom" aria-hidden="true" />QR code delle camere</h2>
          <button type="button" className="sib-btn sib-btn--primary qrk__head-btn" disabled={!camere.length}
            onClick={() => stampa(pianiVisibili, piano === '' ? 'Tutte le camere' : etichettaPiano(Number(piano)))}>
            <i className="fa-solid fa-print" aria-hidden="true" />{piano === '' ? 'Stampa tutti' : `Stampa ${etichettaPiano(Number(piano)).toLowerCase()}`}
          </button>
        </header>
        <div className="qrk__filters">
          <SelectField name="struttura" label="Struttura" className="qrk__field" value={struttura}
            onChange={(e) => { setStruttura(e.target.value); setPiano('') }} options={opzioniStrutture} />
          <SelectField name="piano" label="Piano" className="qrk__field qrk__field--sm" value={piano} onChange={(e) => setPiano(e.target.value)}
            options={[{ value: '', label: 'Tutti i piani' }, ...piani.map(([p]) => ({ value: String(p), label: etichettaPiano(p) }))]} />
          <p className="qrk__filters-info">
            Da attaccare in camera: la cameriera inquadra il QR con l'<b>App Op!</b> per <b>aprire</b> la pulizia e lo inquadra di nuovo per <b>chiuderla</b>.
          </p>
        </div>

        {camere.length === 0 ? (
          <p className="qrk__empty">La struttura selezionata non ha camere: non ci sono QR da generare.</p>
        ) : pianiVisibili.map(([p, lista]) => (
          <div key={p} className="qrk__piano">
            <div className="qrk__piano-head">
              <h3 className="qrk__piano-title">{etichettaPiano(p)}</h3>
              <span className="qrk__piano-count">{lista.length} {lista.length === 1 ? 'camera' : 'camere'}</span>
              {piano === '' && (
                <button type="button" className="qrk__link" onClick={() => stampa([[p, lista]], etichettaPiano(p))}>
                  <i className="fa-solid fa-print" aria-hidden="true" />Stampa il piano
                </button>
              )}
            </div>
            <ul className="qrk__rooms">
              {lista.map((c) => (
                <CameraQr key={c.numero} camera={c} idStr={idStr} onStampa={() => stampa([[p, [c]]], `Camera ${c.numero}`)} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {kiosk && createPortal(
        <Kiosk postazione={POSTAZIONE_DEFAULT} onClose={() => setKiosk(false)} />,
        document.body,
      )}
    </div>
  )
}

function CameraQr({ camera, idStr, onStampa }: { camera: CameraDemo; idStr: number; onStampa: () => void }) {
  const qr = useQr(testoQrCamera(idStr, camera.numero), 200)
  return (
    <li className="qrk__room">
      {qr ? <img src={qr} alt={`QR code della camera ${camera.numero}`} className="qrk__room-qr" /> : <span className="qrk__room-qr" />}
      <div className="qrk__room-foot">
        <span className="qrk__room-txt">
          <span className="qrk__room-num">Camera {camera.numero}</span>
          <span className="qrk__room-tipo"><TruncatedText text={tipoBreve(camera.tipo)} /></span>
        </span>
        <Tooltip text={`Stampa il QR della camera ${camera.numero}`}>
          <button type="button" className="sib-btn sib-btn--icon qrk__ico" aria-label={`Stampa il QR della camera ${camera.numero}`} onClick={onStampa}>
            <i className="fa-solid fa-print" />
          </button>
        </Tooltip>
      </div>
    </li>
  )
}

// ─── Stampa ───────────────────────────────────────────────────────────────────
//  Etichette 3 per riga su A4, un piano per pagina; la singola camera esce in
//  formato grande al centro del foglio.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

async function stampaQrCamere(struttura: string, idStr: number, gruppi: [number, CameraDemo[]][], titolo: string) {
  // La finestra va aperta subito (nel click), poi si riempie quando i QR sono pronti.
  const win = window.open('', '_blank', 'width=1000,height=760')
  if (!win) { toast.error('Consenti i popup del browser per stampare.', 'Stampa bloccata'); return }
  win.document.write('<!doctype html><title>Preparazione della stampa…</title><p style="font-family:Arial,sans-serif;padding:24px">Preparazione dei QR code…</p>')
  const singola = gruppi.length === 1 && gruppi[0][1].length === 1
  try {
    const sezioni = await Promise.all(gruppi.map(async ([p, lista]) => {
      const etichette = await Promise.all(lista.map(async (c) => {
        const img = await QRCode.toDataURL(testoQrCamera(idStr, c.numero), { errorCorrectionLevel: 'M', margin: 1, width: singola ? 720 : 360, color: { dark: '#1E293B', light: '#FFFFFF' } })
        return `<div class="lab"><div class="num">Camera ${esc(c.numero)}</div><img src="${img}" alt=""/><div class="tipo">${esc(tipoBreve(c.tipo))} · ${esc(etichettaPiano(p))}</div><div class="hint">Inquadra con l'App Op! per aprire e chiudere la pulizia</div><div class="str">${esc(struttura)}</div></div>`
      }))
      return singola
        ? etichette.join('')
        : `<section><h2>${esc(etichettaPiano(p))} <span>· ${lista.length} ${lista.length === 1 ? 'camera' : 'camere'}</span></h2><div class="grid">${etichette.join('')}</div></section>`
    }))
    const css = singola
      ? '@page{size:A4;margin:20mm}body{margin:0;font-family:Poppins,Arial,sans-serif;color:#204769;display:flex;justify-content:center}.lab{width:120mm;text-align:center;border:1px solid #cfd8e1;border-radius:6mm;padding:10mm}.num{font-size:30pt;font-weight:700}img{width:90mm;height:90mm;margin:6mm 0}.tipo{font-size:13pt;color:#43617c}.hint{font-size:11pt;color:#6E7175;margin-top:4mm}.str{font-size:10pt;color:#6E7175;margin-top:2mm}'
      : '@page{size:A4;margin:12mm}body{margin:0;font-family:Poppins,Arial,sans-serif;color:#204769}header{margin-bottom:6mm}h1{font-size:15pt;margin:0}header p{font-size:10pt;color:#6E7175;margin:1mm 0 0}section+section{break-before:page;page-break-before:always}h2{font-size:13pt;margin:0 0 4mm}h2 span{font-weight:400;color:#6E7175;font-size:10pt}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.lab{break-inside:avoid;page-break-inside:avoid;text-align:center;border:1px dashed #9fb0c0;border-radius:3mm;padding:4mm}.num{font-size:15pt;font-weight:700}img{width:42mm;height:42mm;margin:2mm 0}.tipo{font-size:9pt;color:#43617c}.hint{font-size:7.5pt;color:#6E7175;margin-top:1mm}.str{font-size:7pt;color:#6E7175;margin-top:1mm}'
    const head = singola ? '' : `<header><h1>QR code delle camere · ${esc(struttura)}</h1><p>${esc(titolo)} · inquadra il QR con l'App Op! per aprire e chiudere la pulizia</p></header>`
    win.document.open()
    win.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>QR camere · ${esc(struttura)} · ${esc(titolo)}</title><style>${css}</style></head><body>${head}${sezioni.join('')}<scr` + `ipt>window.onload=function(){setTimeout(function(){window.print()},250)}</scr` + `ipt></body></html>`)
    win.document.close()
  } catch {
    win.close()
    toast.error('Non è stato possibile generare i QR code.', 'Errore')
  }
}
