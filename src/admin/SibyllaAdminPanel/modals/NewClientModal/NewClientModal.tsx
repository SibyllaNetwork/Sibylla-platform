import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import Tooltip from '../../../../core/components/Tooltip'
import { CATEGORIE_STRUTTURA, PACCHETTI_INIT } from '../../constants'
import type { NewClientForm, PianoRow, TipologiaCategoria } from '../../types'
import './NewClientModal.sass'

interface Props {
  open: boolean
  form: NewClientForm
  setForm: (f: NewClientForm) => void
  onClose: () => void
  onConfirm: () => void
}

const ROOM_TYPES = ['SNGL', 'DBL', 'DBLECO', 'TPL', 'MATDEL', 'MATECO', 'MAT', 'DBL+2', 'MATSUP', 'DBL+1', 'DBLDEL', 'DBLSUP', 'SUITE', 'DUS', 'MAT+2', 'MAT+1']
// Nome esteso (tooltip) + posti letto di default per tipologia.
const ROOM_TYPE_INFO: Record<string, { name: string; base: number; extra: number }> = {
  SNGL: { name: 'Singola', base: 1, extra: 0 },
  DBL: { name: 'Doppia', base: 2, extra: 0 },
  DBLECO: { name: 'Doppia Economy', base: 2, extra: 0 },
  TPL: { name: 'Tripla', base: 3, extra: 0 },
  MATDEL: { name: 'Matrimoniale Deluxe', base: 2, extra: 0 },
  MATECO: { name: 'Matrimoniale Economy', base: 2, extra: 0 },
  MAT: { name: 'Matrimoniale', base: 2, extra: 0 },
  'DBL+2': { name: 'Doppia + 2 letti aggiunti', base: 2, extra: 2 },
  MATSUP: { name: 'Matrimoniale Superior', base: 2, extra: 0 },
  'DBL+1': { name: 'Doppia + 1 letto aggiunto', base: 2, extra: 1 },
  DBLDEL: { name: 'Doppia Deluxe', base: 2, extra: 0 },
  DBLSUP: { name: 'Doppia Superior', base: 2, extra: 0 },
  SUITE: { name: 'Suite', base: 2, extra: 2 },
  DUS: { name: 'Doppia Uso Singola', base: 1, extra: 0 },
  'MAT+2': { name: 'Matrimoniale + 2 letti aggiunti', base: 2, extra: 2 },
  'MAT+1': { name: 'Matrimoniale + 1 letto aggiunto', base: 2, extra: 1 },
}
const typeName = (t: string) => ROOM_TYPE_INFO[t]?.name || t
const TIPOLOGIE_GRUPPO = ['Catena', 'Gruppo indipendente', 'Franchising', 'Consorzio']
const CARATTERISTICHE = [
  'Aria condizionata', 'Balcone', 'Vasca', 'TV a schermo piatto', 'Terrazza',
  'Bollitore elettrico', 'Armadio o guardaroba', 'Riscaldamento', 'Cassaforte', 'Insonorizzazione',
  'Scrivania', 'Presa elettrica vicino al letto', 'Bagno privato', 'Bagno in comune', 'Bidet',
  'Accappatoio', 'Prodotti da bagno in omaggio', 'Asciugacapelli', 'Pantofole', 'Vino/champagne',
  'Asciugamani', 'Accesso disabili', 'Dep. Bagagli', 'Colazione', 'Reception h24',
]

function Card({ icon, title, sub, children }: { icon: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="ncm__card">
      <header className="ncm__ch">
        <span className="ncm__ch-ico"><Ico n={icon} s={14} c="#fff" /></span>
        <div className="ncm__ch-tx">
          <h3>{title}</h3>
          <p>{sub}</p>
        </div>
      </header>
      <div className="ncm__cb">{children}</div>
    </section>
  )
}

export default function NewClientModal({ open, form, setForm, onClose, onConfirm }: Props) {
  const disabled = !form.nome.trim()
  const stars = parseInt(form.classificazione) || 0

  const toggleModulo = (id: string) => {
    const has = form.moduli.includes(id)
    setForm({ ...form, moduli: has ? form.moduli.filter(m => m !== id) : [...form.moduli, id] })
  }
  const toggleCaratteristica = (c: string) => {
    const has = form.caratteristiche.includes(c)
    setForm({ ...form, caratteristiche: has ? form.caratteristiche.filter(x => x !== c) : [...form.caratteristiche, c] })
  }

  const setNumeroPiani = (n: number) => {
    const num = Math.max(0, Math.min(50, n || 0))
    const piani: PianoRow[] = Array.from({ length: num }, (_, i) => form.piani[i] || { nome: '', camere: {} })
    setForm({ ...form, numeroPiani: num, piani })
  }
  const setPianoNome = (idx: number, nome: string) => {
    setForm({ ...form, piani: form.piani.map((p, i) => i === idx ? { ...p, nome } : p) })
  }
  const setRoomCount = (idx: number, type: string, raw: string) => {
    const n = raw === '' ? 0 : Math.max(0, parseInt(raw) || 0)
    setForm({ ...form, piani: form.piani.map((p, i) => i === idx ? { ...p, camere: { ...p.camere, [type]: n } } : p) })
  }
  const rowTotal = (p: PianoRow) => ROOM_TYPES.reduce((s, t) => s + (p.camere[t] || 0), 0)
  const colTotal = (type: string) => form.piani.reduce((s, p) => s + (p.camere[type] || 0), 0)
  const grandTotal = form.piani.reduce((s, p) => s + rowTotal(p), 0)

  // Numerazione automatica "per piano": numero = piano × 10^cifre + progressivo (default 101, 102…).
  // Ogni numero è uno "slot" a cui si assegna la tipologia (anche non sequenziale).
  const mult = Math.pow(10, form.numDigits)
  const floorsRooms = form.piani.map((p, i) => {
    const f = i + 1
    const counts = ROOM_TYPES.map(t => ({ t, n: p.camere[t] || 0 })).filter(x => x.n > 0)
    const total = counts.reduce((s, x) => s + x.n, 0)
    // Pre-assegnazione di default: espande i conteggi nell'ordine delle tipologie.
    const defaultTypes: string[] = []
    counts.forEach(({ t, n }) => { for (let k = 0; k < n; k++) defaultTypes.push(t) })
    const slots = Array.from({ length: total }, (_, s) => {
      const key = `${i}|${s}`
      const type = form.roomTypes[key] ?? defaultTypes[s] ?? ''
      return {
        key,
        number: form.roomOverrides[key] ?? String(f * mult + form.numStart + s),
        type,
        extra: form.roomExtra[key] ?? ROOM_TYPE_INFO[type]?.extra ?? 0,
      }
    })
    const tally: Record<string, number> = {}
    slots.forEach(sl => { if (sl.type) tally[sl.type] = (tally[sl.type] || 0) + 1 })
    return { idx: i, label: p.nome.trim() || `Piano ${f}`, slots, counts, tally, total }
  }).filter(fl => fl.total > 0)
  const setRoomNum = (key: string, val: string) => setForm({ ...form, roomOverrides: { ...form.roomOverrides, [key]: val } })
  const setRoomType = (key: string, val: string) => setForm({ ...form, roomTypes: { ...form.roomTypes, [key]: val } })
  const setRoomExtra = (key: string, val: number) => setForm({ ...form, roomExtra: { ...form.roomExtra, [key]: Math.max(0, val || 0) } })

  // Tipologie effettivamente usate (presenti nei conteggi della matrice) + posti letto.
  const usedTypes = ROOM_TYPES.filter(t => form.piani.some(p => (p.camere[t] || 0) > 0))
  const postiBase = (t: string) => form.postiConfig[t]?.base ?? ROOM_TYPE_INFO[t]?.base ?? 1
  const postiExtra = (t: string) => form.postiConfig[t]?.extra ?? ROOM_TYPE_INFO[t]?.extra ?? 0
  const setPosti = (t: string, k: 'base' | 'extra', v: number) =>
    setForm({ ...form, postiConfig: { ...form.postiConfig, [t]: { base: postiBase(t), extra: postiExtra(t), [k]: Math.max(0, v || 0) } } })
  // Nome mostrato (personalizzato dall'albergatore, altrimenti nome esteso di default).
  const customName = (t: string) => form.tipologieNomi[t]?.trim() || typeName(t)
  const setTipoNome = (t: string, v: string) => setForm({ ...form, tipologieNomi: { ...form.tipologieNomi, [t]: v } })

  const fileName = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0]?.name || ''
  const galleryNames = (e: React.ChangeEvent<HTMLInputElement>) => Array.from(e.target.files || []).map(f => f.name)

  return (
    <Modal open={open} onClose={onClose} title="Nuova struttura cliente" size="xl" className="ncm-box">
      <div className="ncm">
        <Card icon="building" title="Informazioni struttura" sub="Dati principali, tipologia e classificazione">
          <div className="ncm__grid">
            <div className="ncm__f">
              <label className="ncm__label">PMS</label>
              <div className="ncm__radios">
                {(['Sibylla', 'Esterno'] as const).map(p => (
                  <label key={p} className="ncm__radio">
                    <input type="radio" name="ncm-pms" checked={form.pms === p} onChange={() => setForm({ ...form, pms: p })} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div className="ncm__f">
              <label className="ncm__label">Tipologia struttura</label>
              <select className="sib-select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as TipologiaCategoria })}>
                {CATEGORIE_STRUTTURA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="ncm__f">
              <label className="ncm__label">Categoria</label>
              <div className="ncm__stars">
                {[1, 2, 3, 4, 5].map(n => (
                  <button type="button" key={n} className={`ncm__star${n <= stars ? ' ncm__star--on' : ''}`} onClick={() => setForm({ ...form, classificazione: n === stars ? '' : `${n}★` })} aria-label={`${n} stelle`}>★</button>
                ))}
              </div>
            </div>
            <div className="ncm__f">
              <label className="ncm__label">Nome struttura *</label>
              <input className="sib-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Es. Hotel Firenze Arte" />
            </div>
            <div className="ncm__f ncm__f--2">
              <label className="ncm__label">Numero piani</label>
              <input className="sib-input" type="number" min={0} max={50} value={form.numeroPiani} onChange={e => setNumeroPiani(parseInt(e.target.value))} />
            </div>
            <div className="ncm__f ncm__f--2">
              <label className="ncm__label">Tipologia Gruppo</label>
              <select className="sib-select" value={form.tipologiaGruppo} onChange={e => setForm({ ...form, tipologiaGruppo: e.target.value })}>
                <option value="">Tipologia Gruppo</option>{TIPOLOGIE_GRUPPO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="ncm__f ncm__f--2"><label className="ncm__label">Indirizzo</label><input className="sib-input" value={form.indirizzo} onChange={e => setForm({ ...form, indirizzo: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Località</label><input className="sib-input" value={form.localita} onChange={e => setForm({ ...form, localita: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Provincia</label><input className="sib-input" value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Città</label><input className="sib-input" value={form.citta} onChange={e => setForm({ ...form, citta: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">CAP</label><input className="sib-input" value={form.cap} onChange={e => setForm({ ...form, cap: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Nazione</label><input className="sib-input" value={form.nazione} onChange={e => setForm({ ...form, nazione: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Telefono</label><input className="sib-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="ncm__f ncm__f--2"><label className="ncm__label">Email</label><input className="sib-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@struttura.it" /></div>
            <div className="ncm__f"><label className="ncm__label">P. IVA</label><input className="sib-input" value={form.piva} onChange={e => setForm({ ...form, piva: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Codice SDI</label><input className="sib-input" value={form.codiceSdi} onChange={e => setForm({ ...form, codiceSdi: e.target.value })} /></div>
            <div className="ncm__f ncm__f--2"><label className="ncm__label">PEC</label><input className="sib-input" value={form.pec} onChange={e => setForm({ ...form, pec: e.target.value })} /></div>
          </div>
        </Card>

        {form.numeroPiani > 0 && (
          <Card icon="bed" title="Camere per piano" sub={`Distribuzione per tipologia · ${grandTotal} camere totali`}>
            <div className="ncm__matrix-wrap">
              <table className="ncm__matrix">
                <thead>
                  <tr>
                    <th className="ncm__sticky-l">Piani</th><th className="ncm__sticky-n">Nome</th>
                    {ROOM_TYPES.map(t => <th key={t} className="ncm__mc"><Tooltip text={customName(t)}><span>{t}</span></Tooltip></th>)}
                    <th className="ncm__mc ncm__sticky-r">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {form.piani.map((p, i) => (
                    <tr key={i}>
                      <td className="ncm__mc ncm__sticky-l"><span className="ncm__pnum">{i + 1}</span></td>
                      <td className="ncm__sticky-n"><input className="ncm__nome-inp" value={p.nome} onChange={e => setPianoNome(i, e.target.value)} placeholder="Nome" /></td>
                      {ROOM_TYPES.map(t => (
                        <td key={t} className="ncm__mc">
                          <input className="ncm__mini-inp" type="number" min={0} value={p.camere[t] ?? ''} onChange={e => setRoomCount(i, t, e.target.value)} placeholder="0" />
                        </td>
                      ))}
                      <td className="ncm__mc ncm__rowtot ncm__sticky-r">{rowTotal(p)}</td>
                    </tr>
                  ))}
                  <tr className="ncm__tot-row">
                    <td className="ncm__mc ncm__sticky-l" colSpan={2}>Totale</td>
                    {ROOM_TYPES.map(t => <td key={t} className="ncm__mc">{colTotal(t)}</td>)}
                    <td className="ncm__mc ncm__sticky-r">{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {usedTypes.length > 0 && (
          <Card icon="bed" title="Tipologie e posti letto" sub="Personalizza nome e posti base di ogni tipologia (i posti aggiunti si impostano per camera)">
            <div className="ncm__types">
              {usedTypes.map(t => (
                <div key={t} className="ncm__type">
                  <div className="ncm__type-code">
                    <Tooltip text={customName(t)}><span className="ncm__type-sigla">{t}</span></Tooltip>
                    <span className="ncm__type-def">{typeName(t)}</span>
                  </div>
                  <div className="ncm__type-fields">
                    <label className="ncm__f">
                      <span className="ncm__label">Nome tipologia</span>
                      <input className="sib-input" value={form.tipologieNomi[t] ?? ''} onChange={e => setTipoNome(t, e.target.value)} placeholder={typeName(t)} />
                    </label>
                    <label className="ncm__f ncm__f--narrow">
                      <span className="ncm__label">Posti base</span>
                      <input className="sib-input" type="number" min={0} value={postiBase(t)} onChange={e => setPosti(t, 'base', parseInt(e.target.value))} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {grandTotal > 0 && (
          <Card icon="grid" title="Numerazione e tipologie camere" sub={`Numeri generati per piano · assegna la tipologia a ogni numero · ${grandTotal} camere`}>
            <div className="ncm__numcfg">
              <div className="ncm__f">
                <label className="ncm__label">Schema</label>
                <div className="ncm__scheme">Per piano · 101, 102…</div>
              </div>
              <div className="ncm__f">
                <label className="ncm__label">Numero di partenza</label>
                <input className="sib-input" type="number" min={0} value={form.numStart} onChange={e => setForm({ ...form, numStart: Math.max(0, parseInt(e.target.value) || 0) })} />
              </div>
              <div className="ncm__f">
                <label className="ncm__label">Cifre progressivo</label>
                <select className="sib-select" value={form.numDigits} onChange={e => setForm({ ...form, numDigits: parseInt(e.target.value) })}>
                  <option value={2}>2 (es. 101)</option>
                  <option value={3}>3 (es. 1001)</option>
                </select>
              </div>
              <button type="button" className="ncm__regen" onClick={() => setForm({ ...form, roomOverrides: {}, roomTypes: {}, roomExtra: {} })}>Rigenera</button>
            </div>
            <div className="ncm__floors">
              {floorsRooms.map(fl => (
                <div key={fl.idx} className="ncm__floor">
                  <div className="ncm__floor-h">{fl.label} <span>· {fl.total} camere</span></div>
                  <div className="ncm__tally">
                    {fl.counts.map(c => {
                      const got = fl.tally[c.t] || 0
                      const ok = got === c.n
                      return <Tooltip key={c.t} text={customName(c.t)}><span className={`ncm__tag${ok ? ' ncm__tag--ok' : ' ncm__tag--warn'}`}>{c.t} {got}/{c.n}</span></Tooltip>
                    })}
                  </div>
                  <div className="ncm__rooms">
                    {fl.slots.map(sl => (
                      <div key={sl.key} className="ncm__room">
                        <input className="ncm__room-num" value={sl.number} onChange={e => setRoomNum(sl.key, e.target.value)} />
                        <select className="ncm__room-sel" value={sl.type} onChange={e => setRoomType(sl.key, e.target.value)}>
                          {fl.counts.map(c => <option key={c.t} value={c.t}>{customName(c.t)}</option>)}
                        </select>
                        <Tooltip text="Posti aggiunti (letti extra)">
                          <div className="ncm__room-extra">
                            <span className="ncm__room-extra-sign">+</span>
                            <input className="ncm__room-extra-inp" type="number" min={0} value={sl.extra} onChange={e => setRoomExtra(sl.key, parseInt(e.target.value))} />
                            <span className="ncm__room-extra-lbl">letti</span>
                          </div>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card icon="image" title="Media & descrizione" sub="Immagini, logo, tassa e descrizione breve">
          <div className="ncm__grid">
            <div className="ncm__f ncm__f--2"><label className="ncm__label">Tassa giornaliera</label><input className="sib-input" value={form.tassaGiornaliera} onChange={e => setForm({ ...form, tassaGiornaliera: e.target.value })} /></div>
            <div className="ncm__f"><label className="ncm__label">Immagine principale</label><label className="ncm__file"><span className="ncm__file-btn">Seleziona</span><span className="ncm__file-name">{form.immaginePrincipale || 'Nessun file'}</span><input type="file" accept="image/*" hidden onChange={e => setForm({ ...form, immaginePrincipale: fileName(e) })} /></label></div>
            <div className="ncm__f"><label className="ncm__label">Logo struttura</label><label className="ncm__file"><span className="ncm__file-btn">Seleziona</span><span className="ncm__file-name">{form.logoStruttura || 'Nessun file'}</span><input type="file" accept="image/*" hidden onChange={e => setForm({ ...form, logoStruttura: fileName(e) })} /></label></div>
            <div className="ncm__f ncm__f--2"><label className="ncm__label">Crea gallery</label><label className="ncm__file"><span className="ncm__file-btn">Seleziona</span><span className="ncm__file-name">{form.gallery.length ? `${form.gallery.length} file selezionati` : 'Nessun file'}</span><input type="file" accept="image/*" multiple hidden onChange={e => setForm({ ...form, gallery: galleryNames(e) })} /></label></div>
            <div className="ncm__f ncm__f--full"><label className="ncm__label">Breve descrizione</label><textarea className="ncm__textarea" rows={3} value={form.breveDescrizione} onChange={e => setForm({ ...form, breveDescrizione: e.target.value })} /></div>
          </div>
        </Card>

        <Card icon="sliders" title="Caratteristiche" sub={`Servizi e dotazioni · ${form.caratteristiche.length} selezionate`}>
          <div className="ncm__feats">
            {CARATTERISTICHE.map(c => (
              <label key={c} className="ncm__feat">
                <input type="checkbox" checked={form.caratteristiche.includes(c)} onChange={() => toggleCaratteristica(c)} />
                {c}
              </label>
            ))}
          </div>
        </Card>

        <Card icon="lock" title="Accesso piattaforma" sub="Moduli abilitati per l'account del cliente">
          <label className="ncm__label ncm__label--mb">Moduli sottoscritti</label>
          <div className="ncm__mods">
            {PACCHETTI_INIT.map(m => {
              const on = form.moduli.includes(m.id)
              return (
                <label key={m.id} className={`ncm__mod${on ? ' ncm__mod--on' : ''}`}>
                  <input type="checkbox" className="ncm__mod-check" checked={on} onChange={() => toggleModulo(m.id)} />
                  <span className="ncm__mod-text">
                    <span className="ncm__mod-name">{m.label}</span>
                    {m.desc && <span className="ncm__mod-desc">{m.desc}</span>}
                  </span>
                </label>
              )
            })}
          </div>
          <span className="ncm__hint">Definiscono il menu che l'account del cliente potrà visualizzare. Vuoto = accesso completo.</span>
        </Card>
      </div>

      <div className="ncm__footer">
        <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
        <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>Crea struttura</button>
      </div>
    </Modal>
  )
}
