import React, { useState } from 'react'
import clsx from 'clsx'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, InputField, TextareaField, RadioGroup, RangeField, ToggleSwitch, SearchField, DatePickerField } from '../../../core/components/form'
import ColorePicker, { PaletteMarchio } from './ColorePicker'
import {
  SFONDI, TRANSIZIONI, ANIM_FX, ANIM_LOOP, AZIONI_TOUCH, LISTINI_PREZZO, TRACCE_AUDIO, FONT_SPOT, prezzoDelGiorno, eurT, durataProgetto,
  type Elemento, type Progetto, type Slide, type SfondoCustom, type AnimFx, type AnimLoop, type AzioneTouch, type Ombra, type FiltroImg, type FormaTipo, type WidgetTipo, type Transizione,
} from '../../../store/useTotemStore'
import { TIPO_ICO, TIPO_LBL, FORME, WIDGETS, CATEGORIE_ICONE, TUTTE_ICONE, hQuadrata, r1, punteggio, type Controllo } from './editorModel'
import './PannelloProprieta.sass'

/**
 * Pannello destro dell'Editor palinsesti.
 *  · Elemento selezionato → schede Stile / Tempi e animazione / Interazione.
 *  · Nessuna selezione → schede Slide / Spot / Controllo di Sibylla.
 * Ogni modifica passa da `key`: le modifiche ravvicinate sullo stesso campo
 * diventano un solo passo di Annulla.
 */

export type TabSlide = 'slide' | 'spot' | 'controllo'
type TabEl = 'stile' | 'tempi' | 'azione'

interface Props {
  progetto: Progetto
  slide: Slide
  elemento: Elemento | null
  setEl: (id: string, patch: Partial<Elemento>, key?: string) => void
  setSlide: (patch: Partial<Slide>, key?: string) => void
  setProgetto: (patch: Partial<Progetto>, key?: string) => void
  onLivello: (dir: 1 | -1) => void
  onDuplica: () => void
  onElimina: () => void
  onCaricaImg: (dove: 'el' | 'bg') => void
  onAnteprimaEl: () => void
  tabSlide: TabSlide
  setTabSlide: (t: TabSlide) => void
  checks: Controllo[]
  onVai: (c: Controllo) => void
  onFix: (c: Controllo) => void
  onFixAll: () => void
  totemTouch: number
}

const OMBRE: { value: Ombra; label: string }[] = [{ value: 'nessuna', label: 'Nessuna' }, { value: 'morbida', label: 'Morbida' }, { value: 'forte', label: 'Netta' }, { value: 'bagliore', label: 'Bagliore' }]
const FILTRI: { value: FiltroImg; label: string }[] = [{ value: 'nessuno', label: 'Originale' }, { value: 'bn', label: 'Bianco e nero' }, { value: 'seppia', label: 'Seppia' }, { value: 'caldo', label: 'Caldo' }, { value: 'freddo', label: 'Freddo' }, { value: 'vivido', label: 'Vivido' }]
const sec = (v: number) => `${v.toLocaleString('it-IT', { maximumFractionDigits: 1 })} s`

function Sezione({ titolo, ico, children, aperta = true }: { titolo: string; ico: string; children: React.ReactNode; aperta?: boolean }) {
  const [on, setOn] = useState(aperta)
  return (
    <section className={clsx('pp__sec', on && 'pp__sec--on')}>
      <button type="button" className="pp__sec-head" aria-expanded={on} onClick={() => setOn(!on)}>
        <i className={`fa-solid fa-${ico}`} aria-hidden="true" /><span>{titolo}</span>
        <i className="fa-solid fa-chevron-down pp__sec-chev" aria-hidden="true" />
      </button>
      {on && <div className="pp__sec-body">{children}</div>}
    </section>
  )
}

function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; ico?: string; txt?: string; tip: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="pp__field">
      <span className="pp__lbl">{label}</span>
      <span className="pp__seg">
        {options.map(o => (
          <Tooltip key={String(o.v)} text={o.tip}>
            <button type="button" aria-label={o.tip} className={clsx('pp__seg-btn', value === o.v && 'pp__seg-btn--on')} onClick={() => onChange(o.v)}>
              {o.ico ? <i className={`fa-solid fa-${o.ico}`} aria-hidden="true" /> : o.txt}
            </button>
          </Tooltip>
        ))}
      </span>
    </div>
  )
}

export default function PannelloProprieta(p: Props) {
  const { progetto, slide, elemento: el } = p
  const [tabEl, setTabEl] = useState<TabEl>('stile')
  const [cercaIco, setCercaIco] = useState('')
  const pal = progetto.palette ?? []

  if (el) {
    const set = (patch: Partial<Elemento>, key?: string) => p.setEl(el.id, patch, key)
    const conTesto = el.tipo === 'testo' || el.tipo === 'prezzo' || el.tipo === 'widget'
    const quadrato = el.tipo === 'qr'
    const fine = el.fine ?? slide.durata
    const icone = cercaIco.trim() ? TUTTE_ICONE.filter(i => i.includes(cercaIco.trim().toLowerCase())) : null
    return (
      <div className="pp">
        <header className="pp__head">
          <span className="pp__title"><i className={`fa-solid fa-${TIPO_ICO[el.tipo]}`} aria-hidden="true" /> {el.nome || TIPO_LBL[el.tipo]}</span>
          <span className="pp__acts">
            <Tooltip text="Porta avanti"><button type="button" className="pp__icon" aria-label="Porta avanti" onClick={() => p.onLivello(1)}><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button></Tooltip>
            <Tooltip text="Porta indietro"><button type="button" className="pp__icon" aria-label="Porta indietro" onClick={() => p.onLivello(-1)}><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button></Tooltip>
            <Tooltip text="Duplica (Ctrl+D)"><button type="button" className="pp__icon" aria-label="Duplica" onClick={p.onDuplica}><i className="fa-solid fa-clone" aria-hidden="true" /></button></Tooltip>
            <Tooltip text={el.bloccato ? 'Sblocca' : 'Blocca la posizione'}><button type="button" className={clsx('pp__icon', el.bloccato && 'pp__icon--on')} aria-label="Blocca" onClick={() => set({ bloccato: !el.bloccato })}><i className={`fa-solid fa-${el.bloccato ? 'lock' : 'lock-open'}`} aria-hidden="true" /></button></Tooltip>
            <Tooltip text="Elimina (Canc)"><button type="button" className="pp__icon" aria-label="Elimina elemento" onClick={p.onElimina}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
          </span>
        </header>
        <nav className="pp__tabs">
          {([['stile', 'palette', 'Stile'], ['tempi', 'stopwatch', 'Tempi'], ['azione', 'hand-pointer', 'Interazione']] as const).map(([k, ico, l]) => (
            <button key={k} type="button" className={clsx('pp__tab', tabEl === k && 'pp__tab--on')} onClick={() => setTabEl(k)}><i className={`fa-solid fa-${ico}`} aria-hidden="true" />{l}</button>
          ))}
        </nav>

        <div className="pp__body">
          {tabEl === 'stile' && (
            <>
              <InputField name="el-nome" label="Nome del livello" value={el.nome ?? ''} placeholder={TIPO_LBL[el.tipo]} onChange={e => set({ nome: e.target.value }, 'nome')} />

              {el.tipo === 'testo' && <TextareaField name="el-testo" label="Testo" rows={3} value={el.testo ?? ''} onChange={e => set({ testo: e.target.value }, 'testo')} />}

              {el.tipo === 'prezzo' && (
                <Sezione titolo="Prezzo" ico="tag">
                  <RadioGroup name="el-prezzo-modo" value={el.prezzoModo} onChange={v => set({ prezzoModo: v as Elemento['prezzoModo'] })}
                    options={[{ value: 'dinamico', label: 'Dal listino' }, { value: 'manuale', label: 'Fisso' }]} />
                  {el.prezzoModo === 'dinamico' ? (
                    <>
                      <SelectField name="el-fonte" label="Listino" value={el.fonte ?? ''} onChange={e => set({ fonte: e.target.value })}
                        options={LISTINI_PREZZO.map(l => ({ value: l.id, label: l.label }))} />
                      <p className="pp__hint"><i className="fa-solid fa-arrows-rotate" aria-hidden="true" /> Ogni mattina lo spot mostra la tariffa del giorno dalla Gestione del pricing: oggi <strong>{eurT(prezzoDelGiorno(el.fonte, el.prezzo ?? 0))}</strong>.</p>
                      <ToggleSwitch label="Bollino «prezzo del giorno»" checked={el.bollino !== false} onChange={v => set({ bollino: v })} />
                    </>
                  ) : (
                    <InputField name="el-prezzo" type="number" label="Prezzo" min={0} iconLeft="fa-solid fa-euro-sign" value={el.prezzo ?? 0} onChange={e => set({ prezzo: Number(e.target.value) || 0 }, 'prezzo')} />
                  )}
                  <div className="pp__row2">
                    <InputField name="el-pre" label="Testo sopra" placeholder="Es. a partire da" value={el.prefisso ?? ''} onChange={e => set({ prefisso: e.target.value || undefined }, 'pre')} />
                    <InputField name="el-suf" label="Testo sotto" placeholder="Es. a notte" value={el.suffisso ?? ''} onChange={e => set({ suffisso: e.target.value || undefined }, 'suf')} />
                  </div>
                  <InputField name="el-prima" type="number" label="Prezzo barrato (promo)" min={0} iconLeft="fa-solid fa-euro-sign" value={el.prezzoPrima ?? ''} hint="Lascia vuoto per non mostrarlo"
                    onChange={e => set({ prezzoPrima: Number(e.target.value) || undefined }, 'prima')} />
                </Sezione>
              )}

              {el.tipo === 'icona' && (
                <Sezione titolo="Icona" ico="icons">
                  <SearchField name="cerca-ico" placeholder="Cerca icona (in inglese)…" value={cercaIco} onChange={e => setCercaIco(e.target.value)} onClear={() => setCercaIco('')} />
                  <div className="pp__icons">
                    {(icone ?? CATEGORIE_ICONE.find(c => c.icone.includes(el.icona ?? ''))?.icone ?? CATEGORIE_ICONE[0].icone).map(ic => (
                      <button key={ic} type="button" aria-label={ic} className={clsx('pp__ic', el.icona === ic && 'pp__ic--on')} onClick={() => set({ icona: ic })}><i className={`fa-solid fa-${ic}`} aria-hidden="true" /></button>
                    ))}
                  </div>
                  {!icone && <p className="pp__hint">Altre icone nella scheda Aggiungi, a sinistra, o cercandole qui.</p>}
                  <RangeField name="el-isize" label="Dimensione" min={6} max={60} value={el.size ?? 16} onChange={v => set({ size: v }, 'size')} valueLabel={`${el.size ?? 16}`} resetTo={16} />
                </Sezione>
              )}

              {el.tipo === 'immagine' && (
                <Sezione titolo="Immagine" ico="image">
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => p.onCaricaImg('el')}><i className="fa-solid fa-upload" aria-hidden="true" /> {el.src ? 'Sostituisci immagine' : 'Carica immagine'}</button>
                  <Seg label="Adattamento" value={el.adatta ?? 'cover'} onChange={v => set({ adatta: v })}
                    options={[{ v: 'cover', ico: 'expand', tip: 'Riempi il riquadro' }, { v: 'contain', ico: 'compress', tip: 'Mostra tutta l\'immagine' }]} />
                  <SelectField name="el-filtro" label="Filtro" value={el.filtro ?? 'nessuno'} onChange={e => set({ filtro: e.target.value as FiltroImg })} options={FILTRI} />
                </Sezione>
              )}

              {el.tipo === 'qr' && (
                <Sezione titolo="QR code" ico="qrcode">
                  <InputField name="el-link" label="Indirizzo da aprire" iconLeft="fa-solid fa-link" value={el.link ?? ''} placeholder="https://" onChange={e => set({ link: e.target.value }, 'link')}
                    hint="Pagina di prenotazione, menu, Wi-Fi (WIFI:T:WPA;S:rete;P:password;;)" />
                </Sezione>
              )}

              {el.tipo === 'widget' && (
                <Sezione titolo="Widget" ico="gauge-high">
                  <Seg label="Mostra" value={el.widget ?? 'ora'} onChange={v => set({ widget: v as WidgetTipo })}
                    options={WIDGETS.map(w => ({ v: w.id, ico: w.ico, tip: `${w.label}: ${w.hint}` }))} />
                  {el.widget === 'countdown' && <DatePickerField name="el-cd" type="datetime-local" label="Fino a" value={el.countdownA ?? ''} onChange={e => set({ countdownA: e.target.value })} />}
                  <p className="pp__hint">{WIDGETS.find(w => w.id === el.widget)?.hint}. Si aggiorna da solo sul totem.</p>
                </Sezione>
              )}

              {el.tipo === 'forma' && (
                <Sezione titolo="Forma" ico="shapes">
                  <Seg label="Tipo" value={el.forma ?? 'rettangolo'} onChange={v => set({ forma: v as FormaTipo, ...(v === 'cerchio' ? { h: hQuadrata(el.w, progetto.formato) } : v === 'linea' ? { h: 0.6 } : {}) })}
                    options={FORME.map(f => ({ v: f.id, ico: f.ico, tip: f.label }))} />
                </Sezione>
              )}

              {conTesto && (
                <Sezione titolo="Carattere" ico="font">
                  <div className="pp__row2">
                    <SelectField name="el-font" label="Carattere" value={el.font} onChange={e => set({ font: e.target.value as Elemento['font'] })} options={FONT_SPOT.map(f => ({ value: f, label: f }))} />
                    <SelectField name="el-peso" label="Peso" value={el.peso ?? 400} onChange={e => set({ peso: Number(e.target.value) as Elemento['peso'] })}
                      options={[{ value: 400, label: 'Regular' }, { value: 600, label: 'Semibold' }, { value: 800, label: 'Bold' }]} />
                  </div>
                  <RangeField name="el-size" label="Dimensione (pt)" min={8} max={140} value={el.size ?? 16} onChange={v => set({ size: v }, 'size')} valueLabel={`${el.size ?? 16} pt`} resetTo={16}
                    hint={(el.size ?? 16) < 12 ? 'Sotto i 12 pt è difficile da leggere a distanza' : undefined} />
                  <div className="pp__row2">
                    <Seg label="Allineamento" value={el.allinea ?? 'center'} onChange={v => set({ allinea: v })}
                      options={[{ v: 'left', ico: 'align-left', tip: 'A sinistra' }, { v: 'center', ico: 'align-center', tip: 'Centrato' }, { v: 'right', ico: 'align-right', tip: 'A destra' }]} />
                    <div className="pp__field">
                      <span className="pp__lbl">Stile</span>
                      <span className="pp__seg">
                        <Tooltip text="Corsivo"><button type="button" aria-label="Corsivo" className={clsx('pp__seg-btn', el.corsivo && 'pp__seg-btn--on')} onClick={() => set({ corsivo: !el.corsivo })}><i className="fa-solid fa-italic" aria-hidden="true" /></button></Tooltip>
                        <Tooltip text="Tutto maiuscolo"><button type="button" aria-label="Maiuscolo" className={clsx('pp__seg-btn', el.maiuscolo && 'pp__seg-btn--on')} onClick={() => set({ maiuscolo: !el.maiuscolo })}><i className="fa-solid fa-font-case" aria-hidden="true" /></button></Tooltip>
                      </span>
                    </div>
                  </div>
                  <RangeField name="el-ls" label="Spaziatura lettere" min={-5} max={40} value={el.spaziatura ?? 0} onChange={v => set({ spaziatura: v }, 'ls')} valueLabel={`${el.spaziatura ?? 0}`} />
                  <RangeField name="el-lh" label="Interlinea" min={80} max={200} step={5} value={el.interlinea ?? 110} onChange={v => set({ interlinea: v }, 'lh')} valueLabel={`${((el.interlinea ?? 110) / 100).toLocaleString('it-IT')}`} resetTo={110} />
                </Sezione>
              )}

              {el.tipo !== 'immagine' && (
                <Sezione titolo="Colori" ico="droplet">
                  {el.tipo !== 'forma' && <ColorePicker label={el.tipo === 'qr' ? 'Colore del codice' : 'Colore'} value={el.colore} palette={pal} onChange={c => set({ colore: c ?? '#FFFFFF' }, 'colore')} />}
                  <ColorePicker label={el.tipo === 'forma' ? 'Riempimento' : el.tipo === 'qr' ? 'Fondo del codice' : 'Evidenziatore dietro'} value={el.sfondo} palette={pal} nessuno={el.tipo !== 'qr'} onChange={c => set({ sfondo: c, ...(c ? {} : { sfondo2: undefined }) }, 'sfondo')} />
                  {el.sfondo && el.tipo !== 'qr' && (
                    <>
                      <ToggleSwitch label="Sfumatura" description="Passa a un secondo colore" checked={!!el.sfondo2} onChange={v => set({ sfondo2: v ? '#FFFFFF' : undefined })} />
                      {el.sfondo2 && <ColorePicker label="Secondo colore" value={el.sfondo2} palette={pal} onChange={c => set({ sfondo2: c }, 'sfondo2')} />}
                    </>
                  )}
                </Sezione>
              )}

              <Sezione titolo="Bordo, ombra e opacità" ico="square-dashed" aperta={false}>
                <RangeField name="el-raggio" label="Arrotondamento" min={0} max={80} value={el.raggio ?? 0} onChange={v => set({ raggio: v }, 'raggio')} valueLabel={`${el.raggio ?? 0}`} />
                <RangeField name="el-bordo" label="Bordo" min={0} max={12} value={el.bordo ?? 0} onChange={v => set({ bordo: v }, 'bordo')} valueLabel={`${el.bordo ?? 0} px`} />
                {!!el.bordo && <ColorePicker label="Colore del bordo" value={el.bordoColore ?? '#FFFFFF'} palette={pal} onChange={c => set({ bordoColore: c }, 'bc')} />}
                <SelectField name="el-ombra" label="Ombra" value={el.ombra ?? 'nessuna'} onChange={e => set({ ombra: e.target.value as Ombra })} options={OMBRE} />
                <RangeField name="el-op" label="Opacità" min={10} max={100} step={5} value={el.opacita ?? 100} onChange={v => set({ opacita: v }, 'op')} valueLabel={`${el.opacita ?? 100}%`} resetTo={100} />
              </Sezione>

              <Sezione titolo="Posizione e dimensioni" ico="up-down-left-right" aperta={false}>
                <div className="pp__row2">
                  <InputField name="el-x" type="number" label="X (%)" step={0.5} value={el.x} onChange={e => set({ x: Number(e.target.value) || 0 }, 'x')} />
                  <InputField name="el-y" type="number" label="Y (%)" step={0.5} value={el.y} onChange={e => set({ y: Number(e.target.value) || 0 }, 'y')} />
                  <InputField name="el-w" type="number" label="Larghezza (%)" min={2} step={0.5} value={el.w} onChange={e => { const w = Math.max(2, Number(e.target.value) || 2); set({ w, ...(quadrato ? { h: hQuadrata(w, progetto.formato) } : {}) }, 'w') }} />
                  <InputField name="el-h" type="number" label="Altezza (%)" min={0.5} step={0.5} value={el.h} disabled={quadrato} onChange={e => set({ h: Math.max(0.5, Number(e.target.value) || 0.5) }, 'h')} />
                </div>
                <RangeField name="el-rot" label="Rotazione" min={-180} max={180} value={el.rot ?? 0} onChange={v => set({ rot: v }, 'rot')} valueLabel={`${el.rot ?? 0}°`} />
              </Sezione>
            </>
          )}

          {tabEl === 'tempi' && (
            <>
              <div className="pp__timebar" style={{ '--a': `${((el.inizio ?? 0) / slide.durata) * 100}%`, '--b': `${(fine / slide.durata) * 100}%` } as React.CSSProperties}>
                <span className="pp__timebar-fill" />
                <span className="pp__timebar-lbl">In scena da {sec(el.inizio ?? 0)} a {sec(fine)} su {sec(slide.durata)}</span>
              </div>
              <Sezione titolo="Ingresso" ico="right-to-bracket">
                <SelectField name="el-in" label="Animazione" value={el.ingresso ?? 'nessuna'} onChange={e => set({ ingresso: e.target.value as AnimFx })}
                  options={ANIM_FX.filter(a => !a.soloTesto || el.tipo === 'testo').map(a => ({ value: a.id, label: a.label }))} />
                <RangeField name="el-ini" label="Entra dopo" min={0} max={Math.max(0, slide.durata - 0.5)} step={0.1} value={el.inizio ?? 0} onChange={v => set({ inizio: r1(v), ...(el.fine != null && el.fine <= v ? { fine: undefined } : {}) }, 'ini')} valueLabel={sec(el.inizio ?? 0)} />
                {el.ingresso && el.ingresso !== 'nessuna' && (
                  <RangeField name="el-din" label="Durata dell'animazione" min={0.2} max={3} step={0.1} value={el.durIngresso ?? (el.ingresso === 'scrivi' ? 1.5 : 0.6)} onChange={v => set({ durIngresso: r1(v) }, 'din')} valueLabel={sec(el.durIngresso ?? (el.ingresso === 'scrivi' ? 1.5 : 0.6))} hideReset />
                )}
              </Sezione>
              <Sezione titolo="Uscita" ico="right-from-bracket">
                <SelectField name="el-out" label="Animazione" value={el.uscita ?? 'nessuna'} onChange={e => set({ uscita: e.target.value as AnimFx })}
                  options={ANIM_FX.filter(a => !a.soloTesto).map(a => ({ value: a.id, label: a.label }))} />
                <RangeField name="el-fine" label="Esce a" min={Math.min(slide.durata, (el.inizio ?? 0) + 0.5)} max={slide.durata} step={0.1} value={fine}
                  onChange={v => set({ fine: v >= slide.durata ? undefined : r1(v) }, 'fine')} valueLabel={el.fine == null ? 'fine slide' : sec(fine)} resetTo={slide.durata} />
              </Sezione>
              <Sezione titolo="Animazione continua" ico="arrows-spin">
                <SelectField name="el-loop" label="Mentre è in scena" value={el.loop ?? 'nessuna'} onChange={e => set({ loop: e.target.value as AnimLoop })} options={ANIM_LOOP.map(a => ({ value: a.id, label: a.label }))} />
                <p className="pp__hint">Usala su un solo elemento per slide (di solito l'invito all'azione): attira lo sguardo senza distrarre.</p>
              </Sezione>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={p.onAnteprimaEl}><i className="fa-solid fa-play" aria-hidden="true" /> Riproduci la slide</button>
            </>
          )}

          {tabEl === 'azione' && (
            <>
              <SelectField name="el-az" label="Al tocco dell'ospite" value={el.azione ?? 'nessuna'} onChange={e => set({ azione: e.target.value as AzioneTouch })} options={AZIONI_TOUCH.map(a => ({ value: a.id, label: a.label }))} />
              {AZIONI_TOUCH.find(a => a.id === el.azione)?.campo && (
                <InputField name="el-azv" label={AZIONI_TOUCH.find(a => a.id === el.azione)!.campo} value={el.azioneVal ?? ''} onChange={e => set({ azioneVal: e.target.value }, 'azv')} />
              )}
              <p className="pp__hint"><i className="fa-solid fa-hand-pointer" aria-hidden="true" /> Funziona sui totem con il touch abilitato ({p.totemTouch} della tua rete). Sugli altri l'elemento resta solo da guardare.</p>
              {el.azione && el.azione !== 'nessuna' && el.tipo !== 'forma' && !el.loop && (
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => set({ loop: 'pulsa' })}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Fallo pulsare per invitare al tocco</button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Slide / Spot / Controllo ──
  const b = slide.bg
  const modoBg = b?.modo ?? 'preset'
  const setBg = (patch: Partial<SfondoCustom>, key?: string) => p.setSlide({ bg: { ...(b ?? { modo: 'colore', c1: '#204769', c2: '#A2864C', angolo: 160 }), ...patch } as SfondoCustom }, key)
  const idx = progetto.slides.findIndex(s => s.id === slide.id)
  const score = punteggio(p.checks)
  const ko = p.checks.filter(c => !c.ok)

  return (
    <div className="pp">
      <nav className="pp__tabs pp__tabs--top">
        <button type="button" className={clsx('pp__tab', p.tabSlide === 'slide' && 'pp__tab--on')} onClick={() => p.setTabSlide('slide')}><i className="fa-solid fa-image-portrait" aria-hidden="true" />Slide {idx + 1}</button>
        <button type="button" className={clsx('pp__tab', p.tabSlide === 'spot' && 'pp__tab--on')} onClick={() => p.setTabSlide('spot')}><i className="fa-solid fa-film" aria-hidden="true" />Spot</button>
        <button type="button" className={clsx('pp__tab', p.tabSlide === 'controllo' && 'pp__tab--on')} onClick={() => p.setTabSlide('controllo')}>
          <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />Controllo{ko.length > 0 && <span className="pp__badge">{ko.length}</span>}
        </button>
      </nav>

      <div className="pp__body">
        {p.tabSlide === 'slide' && (
          <>
            <InputField name="sl-nome" label="Nome della slide" placeholder={`Slide ${idx + 1}`} value={slide.nome ?? ''} onChange={e => p.setSlide({ nome: e.target.value || undefined }, 'sl-nome')} />
            <div className="pp__row2">
              <InputField name="sl-durata" type="number" label="Durata (s)" min={2} max={30} step={0.5} value={slide.durata} onChange={e => p.setSlide({ durata: Math.max(2, Math.min(30, Number(e.target.value) || 2)) }, 'sl-dur')} />
              <SelectField name="sl-trans" label="Transizione" value={slide.transizione} onChange={e => p.setSlide({ transizione: e.target.value as Transizione })} options={TRANSIZIONI.map(x => ({ value: x.id, label: x.label }))} />
            </div>
            <Sezione titolo="Sfondo" ico="fill-drip">
              <Seg label="Tipo di sfondo" value={modoBg} onChange={v => v === 'preset' ? p.setSlide({ bg: undefined }) : setBg({ modo: v as SfondoCustom['modo'] })}
                options={[{ v: 'preset', ico: 'swatchbook', tip: 'Sfondi pronti' }, { v: 'colore', ico: 'square', tip: 'Tinta unita' }, { v: 'gradiente', ico: 'circle-half-stroke', tip: 'Sfumatura' }, { v: 'immagine', ico: 'image', tip: 'Foto' }]} />
              {modoBg === 'preset' && (
                <span className="pp__bgs">
                  {SFONDI.map(x => (
                    <Tooltip key={x.id} text={x.label}>
                      <button type="button" aria-label={x.label} className={clsx('pp__bg', `spot-bg--${x.id}`, slide.sfondo === x.id && 'pp__bg--on')} onClick={() => p.setSlide({ sfondo: x.id })} />
                    </Tooltip>
                  ))}
                </span>
              )}
              {modoBg === 'colore' && b && <ColorePicker label="Colore" value={b.c1} palette={pal} onChange={c => setBg({ c1: c ?? '#204769' }, 'bg-c1')} />}
              {modoBg === 'gradiente' && b && (
                <>
                  <ColorePicker label="Primo colore" value={b.c1} palette={pal} onChange={c => setBg({ c1: c ?? '#204769' }, 'bg-c1')} />
                  <ColorePicker label="Secondo colore" value={b.c2} palette={pal} onChange={c => setBg({ c2: c ?? '#A2864C' }, 'bg-c2')} />
                  <ToggleSwitch label="Sfumatura circolare" checked={!!b.radiale} onChange={v => setBg({ radiale: v })} />
                  {!b.radiale && <RangeField name="bg-ang" label="Direzione" min={0} max={360} step={5} value={b.angolo} onChange={v => setBg({ angolo: v }, 'bg-ang')} valueLabel={`${b.angolo}°`} resetTo={160} />}
                </>
              )}
              {modoBg === 'immagine' && b && (
                <>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => p.onCaricaImg('bg')}><i className="fa-solid fa-upload" aria-hidden="true" /> {b.src ? 'Sostituisci la foto' : 'Carica una foto'}</button>
                  <RangeField name="bg-velo" label="Velatura scura" min={0} max={80} step={5} value={b.velatura ?? 0} onChange={v => setBg({ velatura: v }, 'bg-velo')} valueLabel={`${b.velatura ?? 0}%`} hint="Rende leggibili i testi bianchi sopra la foto" />
                  <RangeField name="bg-blur" label="Sfocatura" min={0} max={20} value={b.sfocatura ?? 0} onChange={v => setBg({ sfocatura: v }, 'bg-blur')} valueLabel={`${b.sfocatura ?? 0}`} />
                  <ToggleSwitch label="Effetto Ken Burns" description="Lento zoom sulla foto per tutta la slide" checked={!!b.kenBurns} onChange={v => setBg({ kenBurns: v })} />
                </>
              )}
            </Sezione>
            <TextareaField name="sl-note" label="Note di produzione" rows={2} placeholder="Non vanno in onda: indicazioni per chi lavora allo spot" value={slide.note ?? ''} onChange={e => p.setSlide({ note: e.target.value || undefined }, 'sl-note')} />
            <p className="pp__hint">Clicca un elemento sulla slide per modificarlo, o aggiungine uno dalla scheda Aggiungi.</p>
          </>
        )}

        {p.tabSlide === 'spot' && (
          <>
            <InputField name="sp-nome" label="Nome dello spot" value={progetto.nome} onChange={e => p.setProgetto({ nome: e.target.value }, 'sp-nome')} />
            <InputField name="sp-cartella" label="Cartella" value={progetto.cartella} onChange={e => p.setProgetto({ cartella: e.target.value }, 'sp-cart')} />
            <RadioGroup name="sp-formato" label="Formato" value={progetto.formato ?? 'verticale'} onChange={v => p.setProgetto({ formato: v as Progetto['formato'] })}
              options={[{ value: 'verticale', label: 'Verticale 9:16' }, { value: 'orizzontale', label: 'Orizzontale 16:9' }]} />
            <p className="pp__hint">Va in onda sui totem con lo stesso orientamento (Scheda totem › Configurazione).</p>
            <Sezione titolo="Colori del marchio" ico="swatchbook">
              <PaletteMarchio colori={pal} onChange={c => p.setProgetto({ palette: c }, 'palette')} />
              <p className="pp__hint">Compaiono per primi in ogni selettore colore dello spot.</p>
            </Sezione>
            <Sezione titolo="Musica di sottofondo" ico="music">
              <SelectField name="sp-audio" label="Traccia" value={progetto.audio?.traccia ?? ''} onChange={e => p.setProgetto({ audio: { traccia: e.target.value, volume: progetto.audio?.volume ?? 40 } })} options={TRACCE_AUDIO.map(t => ({ value: t.id, label: t.label }))} />
              {!!progetto.audio?.traccia && <RangeField name="sp-vol" label="Volume rispetto al totem" min={0} max={100} step={5} value={progetto.audio.volume} onChange={v => p.setProgetto({ audio: { traccia: progetto.audio!.traccia, volume: v } }, 'vol')} valueLabel={`${progetto.audio.volume}%`} resetTo={40} />}
              <p className="pp__hint">Brani senza diritti SIAE inclusi nell'abbonamento. Il volume massimo resta quello impostato sul totem.</p>
            </Sezione>
            <Sezione titolo="Applica a tutte le slide" ico="layer-group" aperta={false}>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => p.setProgetto({ slides: progetto.slides.map(s => ({ ...s, transizione: slide.transizione })) })}><i className="fa-solid fa-shuffle" aria-hidden="true" /> Transizione «{TRANSIZIONI.find(t => t.id === slide.transizione)?.label}»</button>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => p.setProgetto({ slides: progetto.slides.map(s => ({ ...s, sfondo: slide.sfondo, bg: slide.bg ? { ...slide.bg } : undefined })) })}><i className="fa-solid fa-fill-drip" aria-hidden="true" /> Sfondo della slide {idx + 1}</button>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => p.setProgetto({ slides: progetto.slides.map(s => ({ ...s, durata: slide.durata })) })}><i className="fa-solid fa-stopwatch" aria-hidden="true" /> Durata di {sec(slide.durata)}</button>
            </Sezione>
            <p className="pp__hint">{progetto.slides.length} slide · {durataProgetto(progetto)} s in tutto · {progetto.slides.reduce((n, s) => n + s.elementi.length, 0)} elementi</p>
          </>
        )}

        {p.tabSlide === 'controllo' && (
          <>
            <div className="pp__score" style={{ '--score': score } as React.CSSProperties}>
              <span className={clsx('pp__ring', score >= 85 ? 'pp__ring--ok' : score >= 60 ? 'pp__ring--mid' : 'pp__ring--ko')}><strong>{score}</strong></span>
              <span className="pp__score-txt">
                <strong>{score >= 85 ? 'Pronto per andare in onda' : score >= 60 ? 'Quasi pronto' : 'Da sistemare'}</strong>
                {ko.length ? `${ko.length} ${ko.length === 1 ? 'cosa da rivedere' : 'cose da rivedere'}` : 'Nessun problema trovato'}
              </span>
            </div>
            {ko.some(c => c.fix) && <button type="button" className="sib-btn sib-btn--primary" onClick={p.onFixAll}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Correggi tutto ({ko.filter(c => c.fix).length})</button>}
            <ul className="pp__checks">
              {p.checks.map((c, i) => (
                <li key={i} className={c.ok ? 'pp__check--ok' : 'pp__check--ko'}>
                  <i className={`fa-solid ${c.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} aria-hidden="true" />
                  <span className="pp__check-txt">{c.txt}</span>
                  {!c.ok && (c.slideId || c.fix) && (
                    <span className="pp__check-acts">
                      {c.slideId && <button type="button" className="pp__link" onClick={() => p.onVai(c)}>Mostra</button>}
                      {c.fix && <button type="button" className="pp__link" onClick={() => p.onFix(c)}>Correggi</button>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
