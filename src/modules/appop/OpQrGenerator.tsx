import React, { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import AlertBanner from '../../core/components/AlertBanner'
import Button from '../../core/components/Button/Button'
import EmptyState from '../../core/components/EmptyState'
import Modal from '../../core/components/Modal'
import { toast } from '../../core/components/Toast/useToast'
import { InputField, RadioGroup, SearchField, SelectField } from '../../core/components/form'
import { opQrApi, type CameraQr, type ClienteQr, type CodiceTotem, type ConfigQr, type StrutturaQr } from './opApi'
import './OpQrGenerator.sass'

// ─── GENERATORE QR CODE (APP OP!) ─────────────────────────────────────────────
//  QR del cliente, per ogni sua struttura, nei formati che l'app Op! riconosce:
//  - Presenze: il QR dinamico del totem di timbratura (firmato da Op.Api, nuovo ogni
//    30 secondi), da mostrare su un tablet all'ingresso: una stampa non funziona.
//  - Camere: il QR di ogni camera, da stampare sull'etichetta. Solo con il reparto
//    Pulizie e il modulo "Avvia camera" attivi.
//  Senza strutture collegate e senza Pulizie resta solo il QR delle presenze.

type Tipo = 'presenze' | 'camere'

const errore = (e: unknown) => (e instanceof Error ? e.message : 'Operazione non riuscita.')

/** QR come immagine PNG (correzione M, come chiede la specifica del totem). */
const qrPng = (testo: string, larghezza = 512) =>
  QRCode.toDataURL(testo, { errorCorrectionLevel: 'M', margin: 2, width: larghezza })

const etichettaCamera = (c: CameraQr) => [c.piano && `Piano ${c.piano}`, c.posizione].filter(Boolean).join(' · ')

export default function OpQrGenerator({ cliente }: { cliente: ClienteQr }) {
  const [config, setConfig] = useState<ConfigQr | null>(null)
  const [problema, setProblema] = useState<string | null>(null)
  const [idStruttura, setIdStruttura] = useState<number | null>(null)
  const [tipo, setTipo] = useState<Tipo>('presenze')

  // La chiave evita di ricaricare a ogni render quando il cliente arriva come oggetto nuovo.
  const chiave = cliente.tipo === 'indipendente' ? `i${cliente.id}` : `c${cliente.struttura?.id ?? ''}`
  const carica = useCallback(async () => {
    try {
      const c = await opQrApi.config(cliente)
      setConfig(c)
      setIdStruttura(id => (c.strutture.some(s => s.id === id) ? id : c.strutture[0]?.id ?? null))
      if (!c.pulizie) setTipo('presenze')
      setProblema(null)
    } catch (e) {
      setProblema(errore(e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave])

  useEffect(() => { carica() }, [carica])

  const struttura = config?.strutture.find(s => s.id === idStruttura) ?? null
  const soloPresenze = !!config && !config.pulizie

  if (problema) return <AlertBanner type="error">{problema}</AlertBanner>
  if (!config) return <p className="op-qr__nota">Caricamento…</p>
  if (config.strutture.length === 0) {
    return <EmptyState icon="qrcode" title="Nessuna struttura" subtitle="Il cliente non ha ancora una sede: i QR si generano per struttura." />
  }

  return (
    <div className="op-qr">
      <div className="op-qr__scelte">
        {config.strutture.length > 1 && (
          <SelectField
            name="op-qr-struttura"
            label="Struttura"
            value={idStruttura ?? ''}
            options={config.strutture.map(s => ({ value: s.id, label: s.nome }))}
            onChange={e => setIdStruttura(Number(e.target.value))}
            className="op-qr__struttura"
          />
        )}
        <RadioGroup
          name="op-qr-tipo"
          label="QR code per"
          value={tipo}
          onChange={v => setTipo(v as Tipo)}
          options={[
            { value: 'presenze', label: 'Registrare le presenze' },
            {
              value: 'camere', label: 'Pulizia delle camere', disabled: soloPresenze,
              tooltip: soloPresenze ? 'Attiva il reparto Pulizie con il modulo “Avvia camera” per generare i QR delle camere.' : undefined,
            },
          ]}
        />
      </div>

      {soloPresenze && (
        <p className="op-qr__nota">
          {config.strutture.length > 1
            ? 'Il modulo Pulizie non è attivo: si generano solo i QR per registrare le presenze.'
            : 'Nessuna struttura collegata e modulo Pulizie non attivo: si genera solo il QR per registrare le presenze.'}
        </p>
      )}

      {struttura && tipo === 'presenze' && <QrPresenze key={struttura.id} cliente={cliente} struttura={struttura} />}
      {struttura && tipo === 'camere' && <QrCamere key={struttura.id} struttura={struttura} azienda={config.azienda} />}
    </div>
  )
}

// ─── Presenze: QR dinamico del totem ──────────────────────────────────────────

function useCodiceTotem(cliente: ClienteQr, idStruttura: number) {
  const [codice, setCodice] = useState<CodiceTotem | null>(null)
  const [png, setPng] = useState<string | null>(null)
  const [restano, setRestano] = useState(0)
  const [problema, setProblema] = useState<string | null>(null)

  useEffect(() => {
    let attivo = true
    let prossimo: ReturnType<typeof setTimeout>
    const leggi = async () => {
      try {
        const c = await opQrApi.totem(cliente, idStruttura)
        const immagine = await qrPng(c.codice, 640)
        if (!attivo) return
        setCodice(c)
        setPng(immagine)
        setRestano(c.scadeTra)
        setProblema(null)
        // Nuovo codice allo scoccare dello step (con un piccolo margine per l'orologio del server).
        prossimo = setTimeout(leggi, c.scadeTra * 1000 + 300)
      } catch (e) {
        if (!attivo) return
        setProblema(errore(e))
        prossimo = setTimeout(leggi, 5000)
      }
    }
    leggi()
    return () => { attivo = false; clearTimeout(prossimo) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idStruttura])

  useEffect(() => {
    const t = setInterval(() => setRestano(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  return { codice, png, restano, problema }
}

function QrPresenze({ cliente, struttura }: { cliente: ClienteQr; struttura: StrutturaQr }) {
  const { codice, png, restano, problema } = useCodiceTotem(cliente, struttura.id)
  const [schermo, setSchermo] = useState(false)
  const periodo = codice?.periodo ?? 30
  const avanzamento = codice ? Math.round((restano / periodo) * 100) : 0

  return (
    <div className="op-qr__presenze">
      <div className="op-qr__totem">
        {png ? <img src={png} alt={`QR code delle presenze di ${struttura.nome}`} className="op-qr__img" /> : <div className="op-qr__img op-qr__img--vuoto" />}
        <div className="op-qr__barra" aria-hidden="true"><span className={`op-qr__barra-fill op-qr__barra-fill--p${Math.round(avanzamento / 5) * 5}`} /></div>
        <p className="op-qr__conto">{codice ? `Nuovo QR tra ${restano} s` : 'Generazione del QR…'}</p>
      </div>
      <div className="op-qr__info">
        <h3 className="op-qr__titolo">{struttura.nome}</h3>
        {struttura.indirizzo && <p className="op-qr__nota">{struttura.indirizzo}</p>}
        <p className="op-qr__testo">
          È il QR del <strong>totem di timbratura</strong>: i dipendenti aprono Op!, toccano <strong>Timbra</strong> e lo inquadrano
          all’ingresso e all’uscita. Cambia ogni {periodo} secondi, quindi va mostrato su un tablet o uno schermo all’ingresso
          della struttura: una foto o una stampa non permettono di timbrare.
        </p>
        {problema && <AlertBanner type="error">{problema}</AlertBanner>}
        <div className="op-qr__azioni">
          <Button variant={cliente.tipo === 'indipendente' ? 'secondary' : 'primary'} icon="expand" onClick={() => setSchermo(true)} disabled={!png}>
            Mostra a schermo intero
          </Button>
        </div>
        {cliente.tipo === 'indipendente' && <LinkTablet idCliente={cliente.id} struttura={struttura} />}
      </div>

      <Modal open={schermo} onClose={() => setSchermo(false)} title={`Totem di timbratura · ${struttura.nome}`} size="xl">
        <div className="op-qr__schermo">
          {png && <img src={png} alt={`QR code delle presenze di ${struttura.nome}`} className="op-qr__img op-qr__img--grande" />}
          <p className="op-qr__invito">Apri Op!, tocca Timbra e inquadra il QR code</p>
          <p className="op-qr__conto">Nuovo QR tra {restano} s</p>
        </div>
      </Modal>
    </div>
  )
}

// ─── Link per il tablet (clienti indipendenti) ────────────────────────────────
//  Pagina pubblica servita da Op.Api con il QR a tutto schermo: si apre sul tablet
//  all'ingresso, senza accedere all'amministrazione. Il link vale finché non si
//  rigenera la chiave del totem.

function LinkTablet({ idCliente, struttura }: { idCliente: number; struttura: StrutturaQr }) {
  const [url, setUrl] = useState<string | null>(null)
  const [qrLink, setQrLink] = useState<string | null>(null)
  const [problema, setProblema] = useState<string | null>(null)

  useEffect(() => {
    let attivo = true
    opQrApi.linkTotem(idCliente, struttura.id)
      .then(async r => {
        const immagine = await qrPng(r.url, 240)
        if (attivo) { setUrl(r.url); setQrLink(immagine); setProblema(null) }
      })
      .catch(e => { if (attivo) setProblema(errore(e)) })
    return () => { attivo = false }
  }, [idCliente, struttura.id])

  const copia = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiato: aprilo nel browser del tablet.', 'Totem di timbratura')
    } catch {
      toast.warning('Copia non riuscita: seleziona il link a mano.', 'Totem di timbratura')
    }
  }

  return (
    <div className="op-qr__link">
      <div className="op-qr__link-testa">
        <i className="fa-solid fa-tablet-screen-button" aria-hidden="true" />
        <span>Link per il tablet all’ingresso</span>
      </div>
      {problema && <AlertBanner type="error">{problema}</AlertBanner>}
      {!problema && (
        <div className="op-qr__link-corpo">
          {qrLink ? <img src={qrLink} alt="QR code del link al totem" className="op-qr__link-qr" /> : <div className="op-qr__link-qr op-qr__img--vuoto" />}
          <div className="op-qr__link-info">
            <p className="op-qr__nota">
              Apri il link sul tablet (o inquadra questo QR con la sua fotocamera): mostra a tutta pagina il QR delle presenze di
              {' '}{struttura.nome}, sempre aggiornato, senza accedere all’amministrazione.
            </p>
            <InputField name="op-qr-link" readOnly value={url ?? 'Generazione del link…'} ariaLabel="Link della pagina totem" iconLeft="fa-light fa-link" onFocus={e => e.target.select()} className="op-qr__link-url" />
            <div className="op-qr__azioni">
              <Button icon="copy" onClick={copia} disabled={!url}>Copia link</Button>
              <Button variant="secondary" icon="arrow-up-right-from-square" onClick={() => url && window.open(url, '_blank', 'noopener')} disabled={!url}>Apri la pagina</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Camere: etichette da stampare ────────────────────────────────────────────

function QrCamere({ struttura, azienda }: { struttura: StrutturaQr; azienda: string }) {
  const [immagini, setImmagini] = useState<Record<string, string>>({})
  const [cerca, setCerca] = useState('')

  useEffect(() => {
    let attivo = true
    Promise.all(struttura.camere.map(async c => [c.qr, await qrPng(c.qr, 320)] as const))
      .then(coppie => { if (attivo) setImmagini(Object.fromEntries(coppie)) })
    return () => { attivo = false }
  }, [struttura])

  const filtrate = useMemo(() => {
    const t = cerca.trim().toLowerCase()
    return struttura.camere.filter(c => !t || [c.numero, c.nome, c.piano, c.posizione].some(v => v?.toLowerCase().includes(t)))
  }, [struttura, cerca])

  const scarica = (c: CameraQr) => {
    const a = document.createElement('a')
    a.href = immagini[c.qr]
    a.download = `QR camera ${c.numero} - ${struttura.nome}.png`
    a.click()
  }

  // Foglio di etichette in una finestra a parte, pronto per la stampa (A4, 3 colonne).
  const stampa = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const etichette = filtrate.map(c => `
      <div class="et">
        <img src="${immagini[c.qr]}" alt="">
        <div class="num">Camera ${esc(c.numero)}</div>
        <div class="sub">${esc(etichettaCamera(c))}</div>
      </div>`).join('')
    w.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>QR camere · ${esc(struttura.nome)}</title>
      <style>
        @page { size: A4; margin: 12mm }
        body { font-family: Poppins, Arial, sans-serif; margin: 0; color: #1E293B }
        h1 { font-size: 14px; margin: 0 0 8mm }
        .griglia { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm }
        .et { border: 1px dashed #94A3B8; border-radius: 3mm; padding: 4mm; text-align: center; break-inside: avoid }
        .et img { width: 45mm; height: 45mm }
        .num { font-size: 15px; font-weight: 700; margin-top: 2mm }
        .sub { font-size: 10px; color: #64748B; min-height: 12px }
      </style></head><body>
      <h1>${esc(azienda)} · ${esc(struttura.nome)} — inquadra il QR con Op! per avviare e chiudere la pulizia</h1>
      <div class="griglia">${etichette}</div>
      <script>window.onload = () => { window.print() }</script>
      </body></html>`)
    w.document.close()
  }

  if (struttura.camere.length === 0) {
    return (
      <EmptyState
        icon="door-closed"
        title="Nessuna camera in questa struttura"
        subtitle="Le camere con il loro QR arrivano dalla struttura (o dai dati di esempio): appena ci sono, qui trovi le etichette da stampare."
      />
    )
  }

  const pronte = Object.keys(immagini).length >= struttura.camere.length

  return (
    <div className="op-qr__camere">
      <div className="op-qr__bar">
        <SearchField value={cerca} placeholder="Cerca camera, piano o posizione" onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} className="op-qr__cerca" />
        <Button icon="print" onClick={stampa} disabled={!pronte || filtrate.length === 0}>
          Stampa etichette ({filtrate.length})
        </Button>
      </div>
      <p className="op-qr__nota">
        Attacca l’etichetta nella camera: l’addetto la inquadra con Op! all’inizio e alla fine della pulizia.
      </p>
      <div className="op-qr__griglia">
        {filtrate.map(c => (
          <div key={c.qr} className="op-qr__etichetta">
            {immagini[c.qr] ? <img src={immagini[c.qr]} alt={`QR code della camera ${c.numero}`} className="op-qr__img op-qr__img--camera" /> : <div className="op-qr__img op-qr__img--camera op-qr__img--vuoto" />}
            <div className="op-qr__numero">Camera {c.numero}</div>
            <div className="op-qr__sub">{etichettaCamera(c) || ' '}</div>
            <button type="button" className="op-qr__scarica" onClick={() => scarica(c)} disabled={!immagini[c.qr]}>
              <i className="fa-solid fa-download" aria-hidden="true" /> PNG
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
