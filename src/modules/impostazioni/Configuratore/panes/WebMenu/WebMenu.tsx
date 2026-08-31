import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgEmpty } from '../../../../../core/cfg'
import { SelectField, InputField, DateRangeField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import {
  useWebMenuStore,
  webMenuOrdinati,
  slugOccupato,
  slugDaNome,
  webMenuUrl,
  COLORI_TESTATA,
  WEB_MENU_BASE,
  type WebMenu as WebMenuRec,
} from '../../../../../store/useWebMenuStore'
import './WebMenu.sass'

// ─── WEB MENU (F&B) ───────────────────────────────────────────────────────────
//  Elenco dei menu digitali dell'outlet: una scheda per menu web, con la
//  testata nel colore scelto (titolo, claim, numero di voci), stato e outlet di
//  riferimento, l'URL pubblico generato dal nome e il QR code con il suo
//  periodo di validità. Creazione e modifica passano dalla stessa modale; lo
//  slug e l'URL non sono scrivibili a mano (li deriva `slugDaNome`) e nella
//  modale si vedono in anteprima.

const PANE_ID = 'fb-web-menu'

const OUTLET = [
  { id: 1, nome: 'Sibylla Restaurant' },
  { id: 2, nome: 'Enoteca Sibylla' },
  { id: 3, nome: 'Bistrot Madonita' },
]

const outletLabel = (id: number) => {
  const o = OUTLET.find(x => x.id === id)
  return o ? `${o.id} - ${o.nome}` : `${id} - Outlet non configurato`
}

/** ISO → gg/mm/aaaa: sulla piattaforma le date si leggono in italiano. */
const dataIt = (iso: string): string => {
  if (!iso) return '—'
  const [a, m, g] = iso.split('-')
  return g && m && a ? `${g}/${m}/${a}` : iso
}

const oggiISO = () => new Date().toISOString().slice(0, 10)

const traGiorniISO = (giorni: number) => {
  const d = new Date()
  d.setDate(d.getDate() + giorni)
  return d.toISOString().slice(0, 10)
}

// ─── QR CODE — MOCK ───────────────────────────────────────────────────────────
//  ATTENZIONE: questo NON è un QR code valido e non è scansionabile. È un
//  pattern deterministico derivato dall'URL (stesso URL → sempre lo stesso
//  disegno) con i tre quadrati di allineamento agli angoli, così la scheda si
//  vede com'è in produzione senza aggiungere una dipendenza npm.
//  Con il backend il QR reale arriverà dal servizio che pubblica il web menu
//  (immagine o SVG già codificato): a quel punto queste funzioni vanno via e al
//  loro posto si mette la risorsa restituita dall'API.

const QR_MODULI = 25   // moduli per lato della griglia
const QR_QUIET  = 2    // margine chiaro attorno al codice, in moduli
const QR_LATO   = QR_MODULI + QR_QUIET * 2

/** PRNG deterministico (mulberry32): stesso seme → stessa sequenza. */
function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const semeDa = (s: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Quadrati di allineamento: 7×7 in alto a sinistra/destra e in basso a sinistra. */
function moduloDiAllineamento(r: number, c: number): boolean | null {
  const angoli: Array<[number, number]> = [[0, 0], [0, QR_MODULI - 7], [QR_MODULI - 7, 0]]
  for (const [r0, c0] of angoli) {
    const dr = r - r0
    const dc = c - c0
    if (dr < 0 || dc < 0 || dr > 6 || dc > 6) continue
    const bordo = dr === 0 || dr === 6 || dc === 0 || dc === 6
    const centro = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
    return bordo || centro
  }
  return null
}

/** Matrice dei moduli accesi del QR mock. */
function qrMatrice(url: string): boolean[][] {
  const rnd = prng(semeDa(url))
  const m: boolean[][] = []
  for (let r = 0; r < QR_MODULI; r++) {
    const riga: boolean[] = []
    for (let c = 0; c < QR_MODULI; c++) {
      const allineamento = moduloDiAllineamento(r, c)
      if (allineamento !== null) { riga.push(allineamento); continue }
      // Riga/colonna di sincronizzazione alternata, come in un QR vero
      if (r === 6 || c === 6) { riga.push((r + c) % 2 === 0); continue }
      riga.push(rnd() > 0.5)
    }
    m.push(riga)
  }
  return m
}

/**
 * SVG del QR mock come testo, per il download: colori letterali (il file esce
 * dall'applicazione e non può dipendere dai token del tema).
 */
function qrSvgTesto(url: string): string {
  const px = 8
  const lato = QR_LATO * px
  const rects = qrMatrice(url)
    .flatMap((riga, r) =>
      riga.map((on, c) => on
        ? `<rect x="${(c + QR_QUIET) * px}" y="${(r + QR_QUIET) * px}" width="${px}" height="${px}"/>`
        : ''))
    .join('')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lato}" height="${lato}" viewBox="0 0 ${lato} ${lato}">`,
    `<title>QR web menu — ${url}</title>`,
    `<rect width="${lato}" height="${lato}" fill="white"/>`,
    `<g fill="black">${rects}</g>`,
    '</svg>',
  ].join('')
}

/** QR mock disegnato inline: i moduli prendono il colore dal CSS (currentColor). */
function QrMock({ url, titolo }: { url: string; titolo: string }) {
  const matrice = useMemo(() => qrMatrice(url), [url])
  return (
    <svg
      className="web-menu__qr-img"
      viewBox={`0 0 ${QR_LATO} ${QR_LATO}`}
      role="img"
      aria-label={`QR code del menu web ${titolo}`}
    >
      {matrice.map((riga, r) => riga.map((on, c) => on
        ? <rect key={`${r}-${c}`} x={c + QR_QUIET} y={r + QR_QUIET} width="1" height="1" />
        : null))}
    </svg>
  )
}

// ─── Modale ───────────────────────────────────────────────────────────────────

interface WebMenuForm {
  nome: string
  claim: string
  outletId: number
  colore: string
  qrDal: string
  qrAl: string
}

const formVuoto = (outletId: number): WebMenuForm => ({
  nome: '',
  claim: '',
  outletId,
  colore: COLORI_TESTATA[0].value,
  qrDal: oggiISO(),
  qrAl: traGiorniISO(90),
})

export default function WebMenu() {
  const menu       = useWebMenuStore(s => s.menu)
  const addMenu    = useWebMenuStore(s => s.addMenu)
  const updateMenu = useWebMenuStore(s => s.updateMenu)
  const removeMenu = useWebMenuStore(s => s.removeMenu)
  const toggleMenu = useWebMenuStore(s => s.toggleMenu)
  const confirm    = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  // 0 = tutti gli outlet: i menu web di una struttura si guardano insieme
  const [outletId, setOutletId] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<WebMenuForm>(() => formVuoto(OUTLET[0].id))

  const schede = useMemo(() => webMenuOrdinati(menu, outletId), [menu, outletId])

  const upd = <K extends keyof WebMenuForm>(k: K, v: WebMenuForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const apriNuovo = () => {
    setEditId(null)
    setForm(formVuoto(outletId === 0 ? OUTLET[0].id : outletId))
    setModalOpen(true)
  }

  const apriModifica = (m: WebMenuRec) => {
    setEditId(m.id)
    setForm({
      nome: m.nome, claim: m.claim, outletId: m.outletId,
      colore: m.colore, qrDal: m.qrDal, qrAl: m.qrAl,
    })
    setModalOpen(true)
  }

  // Anteprima di slug e URL: si ricalcolano dal nome a ogni battuta, sono gli
  // stessi che lo store scriverà al salvataggio (`slugDaNome`)
  const nome = form.nome.trim()
  const slugAnteprima = nome ? slugDaNome(nome) : ''
  const urlAnteprima = slugAnteprima ? webMenuUrl(slugAnteprima) : ''

  // Validazione: nome, URL non già occupato e periodo del QR coerente
  const occupato = nome ? slugOccupato(menu, nome, editId ?? undefined) : null
  const periodoCompleto = !!form.qrDal && !!form.qrAl
  const periodoCoerente = periodoCompleto && form.qrAl >= form.qrDal
  const salvabile = !!nome && !occupato && periodoCoerente

  const salva = () => {
    if (!salvabile) return
    const dati = {
      outletId: form.outletId,
      nome,
      claim: form.claim.trim(),
      colore: form.colore,
      qrDal: form.qrDal,
      qrAl: form.qrAl,
    }
    if (editId) {
      updateMenu(editId, dati)
      toast.success(`Menu web «${nome}» aggiornato`)
    } else {
      // Le voci non si scelgono qui: arrivano dal catalogo F&B (voci con
      // «includi nel web menu» attivo), quindi un menu nuovo parte da zero
      addMenu({ ...dati, voci: 0, attivo: true })
      toast.success(`Menu web «${nome}» creato`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (m: WebMenuRec) => {
    const ok = await confirm({
      title: 'Elimina menu web',
      message: `Eliminare il menu web «${m.nome}»? L'URL ${webMenuUrl(m.slug)} non risponderà più e i QR code già stampati resteranno senza pagina.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeMenu(m.id)
    toast.success('Menu web eliminato')
  }

  const copiaUrl = async (m: WebMenuRec) => {
    const url = webMenuUrl(m.slug)
    try {
      if (!navigator.clipboard) throw new Error('appunti non disponibili')
      await navigator.clipboard.writeText(url)
      toast.success('URL copiato')
    } catch {
      toast.error("Copia non riuscita: seleziona l'URL e copialo a mano")
    }
  }

  const apriUrl = (m: WebMenuRec) => {
    window.open(webMenuUrl(m.slug), '_blank', 'noopener')
  }

  // Download del QR: Blob + link temporaneo, senza passare da un server
  const scaricaQr = (m: WebMenuRec) => {
    const blobUrl = URL.createObjectURL(
      new Blob([qrSvgTesto(webMenuUrl(m.slug))], { type: 'image/svg+xml' }),
    )
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `qr-${m.slug}.svg`
    a.rel = 'noopener'
    // Il link va agganciato al documento: senza, alcuni browser ignorano il
    // click programmatico e il file non viene scaricato.
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    toast.success(`QR di «${m.nome}» scaricato`)
  }

  return (
    <div className="web-menu">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuovo menu
          </button>
        )}
      >
        <SelectField
          name="outlet"
          label="Outlet"
          value={outletId}
          onChange={(e) => setOutletId(Number(e.target.value))}
          options={[
            { value: 0, label: 'Tutti gli outlet' },
            ...OUTLET.map(o => ({ value: o.id, label: outletLabel(o.id) })),
          ]}
        />
      </CfgToolbar>

      <p className="web-menu__nota">
        <i className="fa-light fa-mobile-screen" aria-hidden="true" />
        <span>
          I menu web sono accessibili via link diretto o QR code da qualsiasi dispositivo,
          senza app. L'URL viene generato automaticamente:{' '}
          <code className="web-menu__nota-url">{WEB_MENU_BASE}/nome-slug</code>
        </span>
      </p>

      {schede.length === 0 ? (
        <CfgEmpty
          icon="globe"
          title="Nessun menu web"
          subtitle="Crea il primo menu digitale: l'ospite lo apre dal QR sul tavolo, senza installare nulla."
          action={(
            <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Nuovo menu
            </button>
          )}
        />
      ) : (
        <div className="web-menu__list">
          {schede.map(m => {
            const url = webMenuUrl(m.slug)
            return (
              <article
                key={m.id}
                className={clsx('web-menu__card', !m.attivo && 'web-menu__card--off')}
                style={{ ['--wm-c' as any]: m.colore }}
              >
                {/* Testata nel colore scelto per questo menu */}
                <header className="web-menu__head">
                  <div className="web-menu__head-titles">
                    <h3 className="web-menu__title">
                      <TruncatedText text={m.nome} />
                    </h3>
                    {m.claim && (
                      <p className="web-menu__claim">
                        <TruncatedText text={m.claim} />
                      </p>
                    )}
                  </div>
                  <span className="web-menu__voci">{m.voci} voci</span>
                </header>

                {/* Stato · outlet · azioni: ognuno nella sua colonna, il nome
                    dell'outlet tronca invece di finire sotto i pulsanti */}
                <div className="web-menu__meta">
                  <ToggleSwitch
                    className="web-menu__stato"
                    checked={m.attivo}
                    label={m.attivo ? 'Attivo' : 'Disattivo'}
                    onChange={() => toggleMenu(m.id)}
                  />
                  <span className="web-menu__outlet">
                    <i className="fa-solid fa-utensils" aria-hidden="true" />
                    <span className="web-menu__shrink">
                      <TruncatedText text={outletLabel(m.outletId)} className="web-menu__outlet-nome" />
                    </span>
                  </span>
                  <div className="web-menu__azioni">
                    <Tooltip content="Modifica menu web">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon web-menu__icon-btn"
                        onClick={() => apriModifica(m)}
                        aria-label={`Modifica il menu web ${m.nome}`}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Elimina menu web">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon web-menu__icon-btn"
                        onClick={() => elimina(m)}
                        aria-label={`Elimina il menu web ${m.nome}`}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* URL pubblico */}
                <section className="web-menu__block">
                  <span className="web-menu__block-label">URL web menu</span>
                  <div className="web-menu__url-row">
                    <span className="web-menu__shrink">
                      <TruncatedText text={url} className="web-menu__url" />
                    </span>
                    <div className="web-menu__url-cmds">
                      <Tooltip content="Copia negli appunti">
                        <button
                          type="button"
                          className="sib-btn sib-btn--icon web-menu__icon-btn"
                          onClick={() => copiaUrl(m)}
                          aria-label={`Copia l'URL del menu web ${m.nome}`}
                        >
                          <i className="fa-solid fa-copy" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Apri in una nuova scheda">
                        <button
                          type="button"
                          className="sib-btn sib-btn--icon web-menu__icon-btn"
                          onClick={() => apriUrl(m)}
                          aria-label={`Apri il menu web ${m.nome} in una nuova scheda`}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </section>

                {/* QR code + validità */}
                <section className="web-menu__block web-menu__qr">
                  <div className="web-menu__qr-box">
                    <QrMock url={url} titolo={m.nome} />
                  </div>
                  <div className="web-menu__qr-info">
                    <span className="web-menu__block-label">QR code</span>
                    <span className="web-menu__qr-periodo">
                      <i className="fa-solid fa-calendar-days" aria-hidden="true" />
                      {dataIt(m.qrDal)} → {dataIt(m.qrAl)}
                    </span>
                    <button
                      type="button"
                      className="sib-btn sib-btn--secondary web-menu__qr-btn"
                      onClick={() => scaricaQr(m)}
                    >
                      <i className="fa-solid fa-download" aria-hidden="true" />
                      Scarica QR
                    </button>
                  </div>
                </section>
              </article>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica menu web' : 'Nuovo menu web'}
          size="md"
        >
          <div className="web-menu__form">
            <div className="web-menu__form-grid">
              <InputField
                className="web-menu__form-full"
                name="nome"
                label="Nome del menu"
                required
                value={form.nome}
                placeholder="es. Il nostro menu di pranzo"
                onChange={(e) => upd('nome', e.target.value)}
              />
              <InputField
                className="web-menu__form-full"
                name="claim"
                label="Claim / sottotitolo"
                value={form.claim}
                placeholder="es. Cucina tipica Madonita dal 1981"
                onChange={(e) => upd('claim', e.target.value)}
              />
              <SelectField
                name="outletMenu"
                label="Outlet"
                value={form.outletId}
                onChange={(e) => upd('outletId', Number(e.target.value))}
                options={OUTLET.map(o => ({ value: o.id, label: outletLabel(o.id) }))}
              />
              <DateRangeField
                label="Validità del QR code"
                nameFrom="qrDal"
                nameTo="qrAl"
                required
                valueFrom={form.qrDal}
                valueTo={form.qrAl}
                onChangeFrom={(e) => upd('qrDal', e.target.value)}
                onChangeTo={(e) => upd('qrAl', e.target.value)}
              />

              {/* Colore della testata: solo gli slot della palette validata */}
              <fieldset className="web-menu__colori web-menu__form-full">
                <legend className="web-menu__colori-label">Colore della testata</legend>
                <div className="web-menu__colori-row" role="radiogroup" aria-label="Colore della testata">
                  {COLORI_TESTATA.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={form.colore === c.value}
                      aria-label={c.label}
                      title={c.label}
                      className={clsx('web-menu__swatch', form.colore === c.value && 'web-menu__swatch--on')}
                      style={{ ['--wm-c' as any]: c.value }}
                      onClick={() => upd('colore', c.value)}
                    >
                      {form.colore === c.value && <i className="fa-solid fa-check" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Anteprima: slug e URL si generano dal nome e non si scrivono a mano */}
            <div className="web-menu__anteprima">
              <span className="web-menu__block-label">URL generato dal nome</span>
              <code className="web-menu__anteprima-url">
                {urlAnteprima || `${WEB_MENU_BASE}/…`}
              </code>
              <span className="web-menu__anteprima-hint">
                Lo slug è derivato dal nome (minuscolo, senza accenti, spazi sostituiti da «-»,
                più un suffisso breve stabile) e non è modificabile a mano.
              </span>
            </div>

            {occupato && (
              <p className="web-menu__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Questo nome genera lo stesso URL del menu «{occupato.nome}»: cambia il nome.
              </p>
            )}
            {!periodoCompleto && (
              <p className="web-menu__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Indica il periodo di validità del QR code.
              </p>
            )}
            {periodoCompleto && !periodoCoerente && (
              <p className="web-menu__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                La fine della validità non può precedere l'inizio.
              </p>
            )}

            <div className="web-menu__form-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
                Salva
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
