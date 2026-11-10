// ─── Ricevi merce › Da bolla ─────────────────────────────────────────────────
//  § 8.8 della scheda 17. Si caricano da 1 a 3 foto o un PDF del DDT; Op li fa
//  leggere a Claude (la chiave Anthropic sta solo sul server di Op) e propone
//  fornitore e righe abbinate agli articoli. L'utente controlla e corregge:
//  righe abbinate in verde, da abbinare in giallo ("Scegli articolo" oppure
//  "Crea «…»"). Alla conferma, in quest'ordine:
//   1. `salva_fornitore` se il fornitore va creato;
//   2. `salva_articolo` per ogni riga da creare (e `salva_categoria` se serve);
//   3. un solo `registra` `carico` con `origine: "bolla"`.
//  Le chiavi `id_operazione` nascono una volta per bolla letta e restano fino
//  al carico registrato: "Riprova" rifà i passi senza creare doppioni.

import React, { useMemo, useRef, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { DatePickerField, InputField, SelectField } from '../../../../../core/components/form'
import { eseguiMag, messaggioErrore, nuovaIdOperazione, riuscito } from '../api/magazzinoFbOp'
import type { Articolo, BollaLetta, Esito, FileBolla, Unita } from '../api/tipi'
import { euro, euroU, fmtData, isoConFuso, numero, oraLocale } from '../comune/formato'
import { MagAvvisi, MagCorpo, MagErrore, MagGriglia, MagPiede } from '../comune/MagModale'
import type { MagCtx } from '../comune/MagShell'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import { puntoCarichi, type Registrato } from './MagRicevi'
import FotocameraBolla from './FotocameraBolla'
import TelefonoBolla from './TelefonoBolla'
import './BollaLettura.sass'

const MAX_FILE = 3
const MAX_BYTE = 5 * 1024 * 1024

interface FileCaricato { nome: string; tipo: FileBolla['tipo']; dati: string; anteprima: string | null; byte: number }

interface RigaRev {
  k: number
  inclusa: boolean
  descrizione: string
  codice: string | null
  letta: string
  /** id dell'articolo scelto, 'nuovo' = da creare, '' = da scegliere */
  scelta: number | 'nuovo' | ''
  nuovo: { nome: string; unita: Unita; id_categoria: number | null; categoria: string | null }
  quantita: string
  prezzo: string
  lotto: string
  scadenza: string
}

interface Chiavi {
  fornitore: string
  carico: string
  articoli: Map<number, string>
  categorie: Map<string, string>
  creati: { fornitore: number | null; articoli: Map<number, number>; categorie: Map<string, number> }
}

const fmtIn = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))

// ─── File: base64 e riduzione delle foto troppo pesanti ───────────────────────

const base64Di = (blob: Blob) => new Promise<string>((ok, ko) => {
  const r = new FileReader()
  r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, ''))
  r.onerror = () => ko(r.error)
  r.readAsDataURL(blob)
})

/** Una foto oltre i 5 MB si riduce in JPEG finché ci sta (i numeri piccoli devono restare leggibili). */
async function riduci(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
    for (const lato of [3000, 2400, 1800]) {
      const s = Math.min(1, lato / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      const b = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/jpeg', 0.82))
      if (b && b.size <= MAX_BYTE) return b
    }
    throw new Error('troppo pesante')
  } finally { URL.revokeObjectURL(url) }
}

interface Props {
  ctx: MagCtx
  articoli: Articolo[]
  onArticoliCambiati: () => void
  onRegistrato: (r: Registrato) => void
}

export default function BollaLettura({ ctx, articoli, onArticoliCambiati, onRegistrato }: Props) {
  const aggiornaContesto = useMagazzinoFb(s => s.aggiorna)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<FileCaricato[]>([])
  const [fase, setFase] = useState<'carica' | 'lettura' | 'revisione'>('carica')
  /** Passi dell'attesa animata: 0 carico le pagine, 1 l'AI legge, 2 abbino, 3 fatto. */
  const [passoLettura, setPassoLettura] = useState(0)
  const [trascina, setTrascina] = useState(false)
  const [fotocamera, setFotocamera] = useState(false)
  const [telefono, setTelefono] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [bolla, setBolla] = useState<BollaLetta | null>(null)
  const [fornitore, setFornitore] = useState<number | 'nuovo' | ''>('')
  const [documento, setDocumento] = useState('')
  const [data, setData] = useState(oraLocale())
  const [idPunto, setIdPunto] = useState(String(puntoCarichi(ctx) ?? ''))
  const [righe, setRighe] = useState<RigaRev[]>([])
  const [editNuovo, setEditNuovo] = useState<RigaRev | null>(null)
  const [invio, setInvio] = useState<{ inCorso: boolean; passo: string | null; errore: string | null }>({ inCorso: false, passo: null, errore: null })
  const chiavi = useRef<Chiavi | null>(null)

  const opzioniArt = useMemo(() => articoli.map(a => ({ value: a.id, label: `${a.nome} (${a.unita})` })), [articoli])
  const perId = useMemo(() => new Map(articoli.map(a => [a.id, a])), [articoli])

  // ── 1. Caricamento ──────────────────────────────────────────────────────────
  const aggiungi = async (lista: FileList | File[] | null) => {
    if (!lista) return
    setErrore(null)
    const nuovi: FileCaricato[] = []
    for (const f of Array.from(lista)) {
      if (file.length + nuovi.length >= MAX_FILE) { setErrore('Al massimo 3 pagine per bolla.'); break }
      const tipo = f.type === 'image/png' ? 'image/png' : f.type === 'application/pdf' ? 'application/pdf' : f.type === 'image/jpeg' ? 'image/jpeg' : null
      if (!tipo) { setErrore('File non valido: servono immagini JPEG o PNG, oppure un PDF.'); continue }
      let blob: Blob = f
      let tipoFinale: FileBolla['tipo'] = tipo
      if (f.size > MAX_BYTE) {
        if (tipo === 'application/pdf') { setErrore(`«${f.name}» è troppo pesante (massimo 5 MB).`); continue }
        try { blob = await riduci(f); tipoFinale = 'image/jpeg' } catch { setErrore(`«${f.name}» è troppo pesante (massimo 5 MB).`); continue }
      }
      nuovi.push({ nome: f.name, tipo: tipoFinale, dati: await base64Di(blob), anteprima: tipoFinale === 'application/pdf' ? null : URL.createObjectURL(blob), byte: blob.size })
    }
    setFile(fs => [...fs, ...nuovi])
    if (input.current) input.current.value = ''
  }

  /** Foto arrivate dal telefono (§ 8.13): già in base64, si aggiungono come se fossero state caricate. */
  const aggiungiDalTelefono = (fb: FileBolla[]) => {
    setErrore(null)
    setFile(fs => {
      const posto = MAX_FILE - fs.length
      if (fb.length > posto) setErrore('Al massimo 3 pagine per bolla: alcune foto del telefono non sono state aggiunte.')
      return [...fs, ...fb.slice(0, Math.max(0, posto)).map((f, i) => {
        const bin = atob(f.dati)
        const blob = new Blob([Uint8Array.from(bin, c => c.charCodeAt(0))], { type: f.tipo })
        return { nome: `Foto dal telefono ${i + 1}`, tipo: f.tipo, dati: f.dati, anteprima: f.tipo === 'application/pdf' ? null : URL.createObjectURL(blob), byte: blob.size }
      })]
    })
  }

  const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))

  const leggi = async () => {
    setErrore(null)
    setPassoLettura(0)
    setFase('lettura')
    // Il primo passo (invio delle pagine) si spunta presto; poi si aspetta la lettura vera di Op.
    const primo = setTimeout(() => setPassoLettura(p => Math.max(p, 1)), 700)
    try {
      const b = await eseguiMag('leggi_bolla', { id_struttura: ctx.idStruttura, file: file.map(f => ({ tipo: f.tipo, dati: f.dati })) })
      clearTimeout(primo)
      setPassoLettura(2)
      await pausa(700)
      setPassoLettura(3)
      await pausa(450)
      if (!b.leggibile) {
        setErrore(b.avvisi.join(' ') || 'La bolla non si legge: riprova con una foto più nitida.')
        setFase('carica')
        return
      }
      chiavi.current = { fornitore: nuovaIdOperazione(), carico: nuovaIdOperazione(), articoli: new Map(), categorie: new Map(), creati: { fornitore: null, articoli: new Map(), categorie: new Map() } }
      setBolla(b)
      setFornitore(b.fornitore?.id_fornitore ?? (b.fornitore?.nome ? 'nuovo' : ''))
      setDocumento(b.documento ?? '')
      setRighe(b.righe.map((r, i) => ({
        k: i,
        inclusa: true,
        descrizione: r.descrizione,
        codice: r.codice ?? r.ean,
        letta: [r.quantita_letta != null ? `${fmtIn(r.quantita_letta)} ${r.unita_letta ?? ''}`.trim() : null, r.prezzo_letto != null ? euroU(r.prezzo_letto) : null].filter(Boolean).join(' · '),
        scelta: r.id_articolo ?? (r.proposta ? 'nuovo' : ''),
        nuovo: { nome: r.proposta?.nome ?? r.descrizione, unita: r.proposta?.unita ?? 'pz', id_categoria: r.proposta?.id_categoria ?? null, categoria: r.proposta?.categoria ?? null },
        quantita: fmtIn(r.quantita ?? r.proposta?.quantita ?? null),
        prezzo: fmtIn(r.prezzo_unitario),
        lotto: r.lotto ?? '',
        scadenza: r.scadenza ?? '',
      })))
      setFase('revisione')
    } catch (e) {
      clearTimeout(primo)
      setErrore(messaggioErrore(e))
      setFase('carica')
    }
  }

  const sposta = (i: number, d: -1 | 1) => setFile(fs => {
    const j = i + d
    if (j < 0 || j >= fs.length) return fs
    const n = [...fs]; [n[i], n[j]] = [n[j], n[i]]; return n
  })

  const ricomincia = () => {
    file.forEach(f => f.anteprima && URL.revokeObjectURL(f.anteprima))
    setFile([]); setBolla(null); setRighe([]); setErrore(null); setFase('carica'); chiavi.current = null
    setInvio({ inCorso: false, passo: null, errore: null })
  }

  // ── 3. Conferma: fornitore → articoli → carico ──────────────────────────────
  const set = (k: number, p: Partial<RigaRev>) => setRighe(rs => rs.map(r => (r.k === k ? { ...r, ...p } : r)))
  const incluse = righe.filter(r => r.inclusa)
  const daScegliere = incluse.filter(r => r.scelta === '').length
  const pronta = fornitore !== '' && incluse.length > 0 && daScegliere === 0 && incluse.every(r => (numero(r.quantita) ?? 0) > 0)

  const conferma = async () => {
    const c = chiavi.current
    if (!c || !bolla) return
    const passo = (testo: string) => setInvio({ inCorso: true, passo: testo, errore: null })
    const ferma = (msg: string) => setInvio({ inCorso: false, passo: null, errore: msg })
    const ok = (e: Esito) => riuscito(e) && e.id != null
    try {
      // 1. Fornitore
      let idForn = typeof fornitore === 'number' ? fornitore : c.creati.fornitore
      if (fornitore === 'nuovo' && idForn == null) {
        passo('Creo il fornitore…')
        const f = bolla.fornitore!
        const e = await eseguiMag('salva_fornitore', {
          id: null, id_operazione: c.fornitore, nome: f.nome ?? '', partita_iva: f.partita_iva, codice_fiscale: f.codice_fiscale,
          indirizzo: f.indirizzo, cap: f.cap, comune: f.comune, provincia: f.provincia, telefono: f.telefono, email: f.email, pec: f.pec,
        })
        if (!ok(e)) return ferma(e.error_message || 'Fornitore non creato.')
        idForn = e.id
        c.creati.fornitore = e.id
        aggiornaContesto()
      }

      // 2. Articoli nuovi (e le loro categorie, se il gestore può crearle)
      for (const r of incluse.filter(x => x.scelta === 'nuovo' && !c.creati.articoli.has(x.k))) {
        let idCat = r.nuovo.id_categoria
        const nomeCat = r.nuovo.categoria?.trim()
        if (idCat == null && nomeCat && ctx.gestore) {
          idCat = c.creati.categorie.get(nomeCat) ?? null
          if (idCat == null) {
            passo(`Creo la categoria «${nomeCat}»…`)
            if (!c.categorie.has(nomeCat)) c.categorie.set(nomeCat, nuovaIdOperazione())
            const e = await eseguiMag('salva_categoria', { id: null, id_operazione: c.categorie.get(nomeCat)!, nome: nomeCat })
            if (!ok(e)) return ferma(e.error_message || 'Categoria non creata.')
            idCat = e.id
            c.creati.categorie.set(nomeCat, e.id!)
          }
        }
        passo(`Creo «${r.nuovo.nome}»…`)
        if (!c.articoli.has(r.k)) c.articoli.set(r.k, nuovaIdOperazione())
        const e = await eseguiMag('salva_articolo', {
          id: null, id_operazione: c.articoli.get(r.k)!, nome: r.nuovo.nome.trim(), id_categoria: idCat, unita: r.nuovo.unita,
          codici_a_barre: [], fornitori: idForn != null ? [{ id_fornitore: idForn, codice_fornitore: r.codice }] : [],
          scorta_minima: 0, id_punto_predefinito: null, attivo: true, note: null,
        })
        if (!ok(e)) return ferma(`«${r.nuovo.nome}»: ${e.error_message || 'articolo non creato.'}`)
        c.creati.articoli.set(r.k, e.id!)
      }
      if (c.creati.articoli.size) onArticoliCambiati()
      if (c.creati.categorie.size) aggiornaContesto()

      // 3. Un solo carico
      passo('Registro il carico…')
      const e = await eseguiMag('registra', {
        id_operazione: c.carico,
        tipo: 'carico',
        id_struttura: ctx.idStruttura,
        id_punto: idPunto ? Number(idPunto) : null,
        data: data ? isoConFuso(data) : null,
        id_fornitore: idForn,
        documento: documento.trim() || null,
        origine: 'bolla',
        righe: incluse.map(r => ({
          id_articolo: r.scelta === 'nuovo' ? c.creati.articoli.get(r.k)! : (r.scelta as number),
          quantita: numero(r.quantita),
          prezzo_unitario: numero(r.prezzo),
          lotto: r.lotto.trim() || null,
          scadenza: r.scadenza || null,
        })),
      })
      if (!riuscito(e)) return ferma(e.error_message || 'Carico non registrato.')
      const nomeForn = typeof fornitore === 'number' ? ctx.contesto.fornitori.find(f => f.id === fornitore)?.nome ?? '' : bolla.fornitore?.nome ?? ''
      onRegistrato({ esito: e, righe: incluse.length, fornitore: nomeForn, documento: documento.trim() || null })
    } catch (err) {
      ferma(messaggioErrore(err))
    }
  }

  // ── Vista ───────────────────────────────────────────────────────────────────
  if (fase === 'lettura') {
    const prima = file[0]
    const passi = ['Carico le pagine', 'L’AI di Sibylla legge il documento', 'Abbino fornitore e articoli']
    return (
      <div className="magbol__lettura" aria-live="polite">
        <div className="magbol__scanner">
          {prima?.anteprima
            ? <img src={prima.anteprima} alt="Bolla in lettura" className="magbol__scan-img" />
            : <i className="fa-regular fa-file-pdf magbol__scan-pdf" aria-hidden="true" />}
          <span className="magbol__scan-linea" aria-hidden="true" />
          <span className="magbol__scan-velo" aria-hidden="true" />
          {file.length > 1 && <span className="magbol__scan-pagine">{file.length} pagine</span>}
        </div>
        <div className="magbol__passi">
          <span className="magbol__ai"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> AI di Sibylla</span>
          <h3 className="magbol__passi-tit">L’AI di Sibylla sta leggendo la bolla…</h3>
          <ol className="magbol__passi-lista">
            {passi.map((t, i) => {
              const stato = passoLettura > i ? 'fatto' : passoLettura === i ? 'attivo' : 'dopo'
              return (
                <li key={t} className={`magbol__passo magbol__passo--${stato}`}>
                  <span className="magbol__passo-ico" aria-hidden="true">
                    <i className={`fa-solid ${stato === 'fatto' ? 'fa-check' : stato === 'attivo' ? 'fa-circle-notch fa-spin' : 'fa-circle'}`} />
                  </span>
                  {t}
                </li>
              )
            })}
          </ol>
          <p className="magpag__nota">Riconosce fornitore, articoli, quantità, lotti e scadenze. Può volerci qualche decina di secondi.</p>
        </div>
      </div>
    )
  }

  if (fase === 'carica') {
    const pesoTot = file.reduce((t, f) => t + f.byte, 0)
    return (
      <div className="magbol__carica">
        <div
          role="button" tabIndex={0}
          className={`magbol__drop ${trascina ? 'is-sopra' : ''} ${file.length ? 'is-piena' : ''}`}
          onClick={() => file.length < MAX_FILE && input.current?.click()}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && file.length < MAX_FILE) { e.preventDefault(); input.current?.click() } }}
          onDragOver={e => { e.preventDefault(); setTrascina(true) }}
          onDragLeave={() => setTrascina(false)}
          onDrop={e => { e.preventDefault(); setTrascina(false); aggiungi(e.dataTransfer.files) }}
        >
          <span className="magbol__drop-ico" aria-hidden="true"><i className="fa-solid fa-file-invoice" /></span>
          <span className="magbol__drop-tit">{file.length >= MAX_FILE ? 'Hai caricato tutte le 3 pagine' : 'Trascina qui la bolla o scegli i file'}</span>
          <span className="magbol__drop-sub">Foto (JPEG o PNG) o PDF del documento di trasporto · fino a 3 pagine · massimo 5 MB l’una</span>
          {file.length < MAX_FILE && (
            <span className="magbol__altri">
              <span className="magbol__oppure">oppure</span>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={e => { e.stopPropagation(); setFotocamera(true) }}>
                <i className="fa-solid fa-camera" aria-hidden="true" /> Scatta dalla fotocamera
              </button>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={e => { e.stopPropagation(); setTelefono(true) }}>
                <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" /> Fotografa col telefono
              </button>
            </span>
          )}
          <span className="magbol__ai"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Letta dall’AI di Sibylla: controlli e confermi tu, niente si registra prima</span>
          <input
            ref={input} type="file" className="magbol__input" accept="image/jpeg,image/png,application/pdf" multiple capture="environment"
            onChange={e => aggiungi(e.target.files)}
          />
        </div>

        {file.length > 0 && (
          <div className="magbol__file">
            {file.map((f, i) => (
              <figure key={f.dati.slice(0, 32) + i} className="magbol__pagina">
                <span className="magbol__pagina-num">{i + 1}</span>
                {f.anteprima
                  ? <img src={f.anteprima} alt={`Pagina ${i + 1}`} className="magbol__img" />
                  : <span className="magbol__pdf"><i className="fa-regular fa-file-pdf" aria-hidden="true" /></span>}
                <figcaption className="magbol__pagina-nome"><TruncatedText text={f.nome} /></figcaption>
                <span className="magbol__pagina-azioni">
                  <Tooltip text="Sposta prima">
                    <button type="button" className="magpag__act" aria-label="Sposta prima" disabled={i === 0} onClick={() => sposta(i, -1)}><i className="fa-solid fa-arrow-left" aria-hidden="true" /></button>
                  </Tooltip>
                  <Tooltip text="Togli la pagina">
                    <button type="button" className="magpag__act" aria-label="Togli la pagina" onClick={() => setFile(fs => fs.filter((_, j) => j !== i))}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
                  </Tooltip>
                  <Tooltip text="Sposta dopo">
                    <button type="button" className="magpag__act" aria-label="Sposta dopo" disabled={i === file.length - 1} onClick={() => sposta(i, 1)}><i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
                  </Tooltip>
                </span>
              </figure>
            ))}
          </div>
        )}

        <FotocameraBolla open={fotocamera} posti={MAX_FILE - file.length} onClose={() => setFotocamera(false)} onScatto={f => aggiungi([f])} />
        <TelefonoBolla open={telefono} idStruttura={ctx.idStruttura} onClose={() => setTelefono(false)} onFoto={aggiungiDalTelefono} />
        <MagErrore testo={errore} />
        <footer className="magbol__piede">
          <span className="magpag__nota">
            {file.length === 0 ? 'Nessuna pagina caricata' : `${file.length === 1 ? '1 pagina' : `${file.length} pagine`} · ${pesoTot < 1024 * 1024 ? `${Math.max(1, Math.round(pesoTot / 1024))} KB` : `${(pesoTot / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`}`}
          </span>
          <button type="button" className="sib-btn sib-btn--primary magbol__leggi" disabled={file.length === 0} onClick={leggi}>
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Leggi la bolla con l’AI di Sibylla
          </button>
        </footer>
      </div>
    )
  }

  // Revisione
  const letto = bolla!.fornitore
  const abbinate = incluse.filter(r => typeof r.scelta === 'number').length
  const nuove = incluse.filter(r => r.scelta === 'nuovo').length
  const totaleBolla = incluse.reduce((t, r) => t + (numero(r.quantita) ?? 0) * (numero(r.prezzo) ?? 0), 0)
  const fornAbbinato = letto?.id_fornitore != null && fornitore === letto.id_fornitore
  const indirizzo = letto && [letto.indirizzo, [letto.cap, letto.comune].filter(Boolean).join(' '), letto.provincia && `(${letto.provincia})`].filter(Boolean).join(', ')
  return (
    <div className="magbol__rev">
      <div className="magbol__intesta">
        <section className={`magbol__fcard ${fornitore === 'nuovo' ? 'is-nuovo' : fornAbbinato ? 'is-ok' : fornitore === '' ? 'is-da' : 'is-ok'}`}>
          <span className="magbol__fcard-ico" aria-hidden="true"><i className="fa-solid fa-truck-field" /></span>
          <div className="magbol__fcard-corpo">
            <span className="magbol__fcard-lab">Fornitore letto sulla bolla</span>
            <strong className="magbol__fcard-nome"><TruncatedText text={letto?.nome ?? 'Non leggibile'} /></strong>
            <span className="magbol__fcard-det"><TruncatedText text={[letto?.partita_iva && `P. IVA ${letto.partita_iva}`, indirizzo].filter(Boolean).join(' · ') || '—'} /></span>
            <span className={`magbol__abb ${fornAbbinato ? 'magbol__abb--ok' : fornitore === 'nuovo' ? 'magbol__abb--nuovo' : ''}`}>
              {fornitore === 'nuovo'
                ? <><i className="fa-solid fa-circle-plus" aria-hidden="true" /> Nuovo: sarà creato alla conferma</>
                : fornAbbinato
                  ? <><i className="fa-solid fa-circle-check" aria-hidden="true" /> Abbinato a un fornitore esistente</>
                  : fornitore === ''
                    ? <><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> Scegli il fornitore</>
                    : <><i className="fa-solid fa-circle-check" aria-hidden="true" /> Scelto a mano</>}
            </span>
          </div>
          <SelectField
            name="bol-forn" ariaLabel="Fornitore" className="magbol__fcard-sel" value={fornitore === '' ? '' : String(fornitore)}
            options={[
              { value: '', label: 'Scegli il fornitore' },
              ...(letto?.nome && letto.id_fornitore == null ? [{ value: 'nuovo', label: `Crea «${letto.nome}»` }] : []),
              ...ctx.contesto.fornitori.map(f => ({ value: f.id, label: f.nome })),
            ]}
            onChange={e => setFornitore(e.target.value === 'nuovo' ? 'nuovo' : e.target.value ? Number(e.target.value) : '')}
          />
        </section>
        <div className="magbol__testa">
          <InputField name="bol-doc" label="Documento" value={documento} onChange={e => setDocumento(e.target.value)} hint={bolla?.data ? `Bolla del ${fmtData(bolla.data)}` : undefined} />
          <DatePickerField name="bol-data" label="Arrivata il" type="datetime-local" value={data} max={oraLocale()} onChange={e => setData(e.target.value)} />
          <SelectField name="bol-punto" label="Carica in" value={idPunto} options={ctx.puntiAttivi.map(p => ({ value: p.id, label: p.nome }))} onChange={e => setIdPunto(e.target.value)} />
        </div>
      </div>

      <p className="magbol__conta">
        <span className="magbol__ai"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Letta dall’AI di Sibylla: controlla prima di confermare</span>
        <span className="magbol__conta-voci">
          <strong>{incluse.length === 1 ? '1 riga' : `${incluse.length} righe`}</strong>
          <span className="magbol__leg magbol__leg--ok"><span className="magbol__dot" aria-hidden="true" />{abbinate} abbinate</span>
          {nuove > 0 && <span className="magbol__leg magbol__leg--nuovo"><span className="magbol__dot" aria-hidden="true" />{nuove} da creare</span>}
          {daScegliere > 0 && <span className="magbol__leg magbol__leg--da"><span className="magbol__dot" aria-hidden="true" />{daScegliere} da controllare</span>}
          <span className="magbol__totale">Totale bolla <strong>{euro(totaleBolla)}</strong></span>
        </span>
      </p>

      <MagAvvisi avvisi={bolla!.avvisi} />

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table magbol__table">
            <colgroup>
              <col className="magbol__c-letto" /><col className="magbol__c-art" /><col className="magbol__c-q" />
              <col className="magbol__c-pr" /><col className="magbol__c-lot" /><col className="magbol__c-sca" /><col className="magbol__c-act" />
            </colgroup>
            <thead>
              <tr><th>Sulla bolla</th><th>Articolo</th><th>Quantità</th><th><TruncatedText text="Prezzo unitario" /></th><th>Lotto</th><th>Scadenza</th><th aria-label="Azioni" /></tr>
            </thead>
            <tbody>
              {righe.map(r => {
                const a = typeof r.scelta === 'number' ? perId.get(r.scelta) : undefined
                const unita = r.scelta === 'nuovo' ? r.nuovo.unita : a?.unita
                const stato = !r.inclusa ? 'is-esclusa' : r.scelta === '' ? 'is-da' : r.scelta === 'nuovo' ? 'is-nuovo' : 'is-ok'
                return (
                  <tr key={r.k} className={`magbol__riga ${stato}`}>
                    <td>
                      <span className="magbol__letto">
                        <TruncatedText text={r.descrizione} />
                        <span className="magbol__letto-det"><TruncatedText text={[r.codice, r.letta].filter(Boolean).join(' · ') || '—'} /></span>
                      </span>
                    </td>
                    <td>
                      <span className="magbol__scelta">
                        <SelectField
                          name={`bol-art-${r.k}`} ariaLabel="Articolo" disabled={!r.inclusa}
                          value={r.scelta === '' ? '' : String(r.scelta)}
                          options={[
                            { value: '', label: 'Scegli articolo' },
                            { value: 'nuovo', label: `Crea «${r.nuovo.nome}»` },
                            ...opzioniArt,
                          ]}
                          onChange={e => set(r.k, { scelta: e.target.value === 'nuovo' ? 'nuovo' : e.target.value ? Number(e.target.value) : '' })}
                        />
                        {r.scelta === 'nuovo' && r.inclusa && (
                          <Tooltip text="Modifica il nuovo articolo">
                            <button type="button" className="magpag__act" aria-label="Modifica il nuovo articolo" onClick={() => setEditNuovo(r)}>
                              <i className="fa-solid fa-pen" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="magbol__q">
                        <InputField name={`bol-q-${r.k}`} ariaLabel="Quantità" dense disabled={!r.inclusa} value={r.quantita} onChange={e => set(r.k, { quantita: e.target.value })} />
                        <span className="magbol__u">{unita ?? ''}</span>
                      </span>
                    </td>
                    <td>
                      <span className="magbol__q">
                        <InputField name={`bol-p-${r.k}`} ariaLabel="Prezzo unitario" dense disabled={!r.inclusa} value={r.prezzo} onChange={e => set(r.k, { prezzo: e.target.value })} />
                        <span className="magbol__u">{unita ? `€/${unita}` : ''}</span>
                      </span>
                    </td>
                    <td><InputField name={`bol-l-${r.k}`} ariaLabel="Lotto" dense disabled={!r.inclusa} value={r.lotto} onChange={e => set(r.k, { lotto: e.target.value })} /></td>
                    <td><DatePickerField name={`bol-s-${r.k}`} type="date" disabled={!r.inclusa} value={r.scadenza} onChange={e => set(r.k, { scadenza: e.target.value })} /></td>
                    <td className="magbol__acts">
                      <Tooltip text={r.inclusa ? 'Non caricare questa riga' : 'Carica questa riga'}>
                        <button type="button" className="magpag__act" aria-label={r.inclusa ? 'Non caricare questa riga' : 'Carica questa riga'} onClick={() => set(r.k, { inclusa: !r.inclusa })}>
                          <i className={`fa-solid ${r.inclusa ? 'fa-xmark' : 'fa-rotate-left'}`} aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>


      <MagErrore testo={invio.errore} />
      <footer className="magbol__piede">
        <span className="magpag__nota">
          {invio.passo ?? (daScegliere > 0
            ? `${daScegliere === 1 ? '1 riga' : `${daScegliere} righe`} da abbinare: scegli l'articolo o crealo`
            : `${incluse.length === 1 ? '1 riga' : `${incluse.length} righe`} da caricare`)}
        </span>
        <button type="button" className="sib-btn sib-btn--secondary" disabled={invio.inCorso} onClick={ricomincia}>
          <i className="fa-solid fa-file-circle-plus" aria-hidden="true" /> Leggi un’altra bolla
        </button>
        <button type="button" className={`sib-btn sib-btn--primary ${invio.inCorso ? 'sib-btn--loading' : ''}`} disabled={!pronta || invio.inCorso} onClick={conferma}>
          <i className={`fa-solid ${invio.errore ? 'fa-rotate-right' : 'fa-check'}`} aria-hidden="true" /> {invio.errore ? 'Riprova' : 'Conferma carico'}
        </button>
      </footer>

      <NuovoDaBolla
        riga={editNuovo} ctx={ctx} onClose={() => setEditNuovo(null)}
        onSalva={n => { if (editNuovo) set(editNuovo.k, { nuovo: n }); setEditNuovo(null) }}
      />
    </div>
  )
}

/** Correzione dei dati del nuovo articolo proposto dalla lettura (si crea solo alla conferma del carico). */
function NuovoDaBolla({ riga, ctx, onClose, onSalva }: { riga: RigaRev | null; ctx: MagCtx; onClose: () => void; onSalva: (n: RigaRev['nuovo']) => void }) {
  const [n, setN] = useState<RigaRev['nuovo'] | null>(null)
  const corrente = n ?? riga?.nuovo ?? null
  const chiudi = () => { setN(null); onClose() }
  const catPropostaNuova = riga?.nuovo.id_categoria == null && riga?.nuovo.categoria
  return (
    <Modal open={!!riga} onClose={chiudi} title="Nuovo articolo dalla bolla" size="md">
      {corrente && (
        <MagCorpo>
          <MagGriglia colonne={2}>
            <InputField name="bn-nome" label="Nome" maxLength={120} value={corrente.nome} onChange={e => setN({ ...corrente, nome: e.target.value })} />
            <SelectField name="bn-unita" label="Unità di misura" value={corrente.unita} options={ctx.contesto.unita.map(u => ({ value: u.key, label: `${u.nome} (${u.key})` }))} onChange={e => setN({ ...corrente, unita: e.target.value as Unita })} />
          </MagGriglia>
          <SelectField
            name="bn-cat" label="Categoria"
            value={corrente.id_categoria != null ? String(corrente.id_categoria) : corrente.categoria ? 'proposta' : ''}
            options={[
              { value: '', label: 'Nessuna categoria' },
              ...(catPropostaNuova && ctx.gestore ? [{ value: 'proposta', label: `Crea «${riga!.nuovo.categoria}»` }] : []),
              ...ctx.contesto.categorie.map(c => ({ value: c.id, label: c.nome })),
            ]}
            onChange={e => setN({
              ...corrente,
              id_categoria: e.target.value && e.target.value !== 'proposta' ? Number(e.target.value) : null,
              categoria: e.target.value === 'proposta' ? riga!.nuovo.categoria : e.target.value ? ctx.contesto.categorie.find(c => c.id === Number(e.target.value))?.nome ?? null : null,
            })}
          />
          {catPropostaNuova && !ctx.gestore && <p className="magpag__nota">La categoria «{riga!.nuovo.categoria}» non esiste: può crearla solo il responsabile F&B.</p>}
          <p className="magpag__nota">Le quantità della riga sono nell’unità dell’articolo ({corrente.unita}).</p>
          <MagPiede onAnnulla={chiudi} onConferma={() => { onSalva({ ...corrente, nome: corrente.nome.trim() }); setN(null) }} etichetta="Usa questi dati" disabilitato={!corrente.nome.trim()} />
        </MagCorpo>
      )}
    </Modal>
  )
}
