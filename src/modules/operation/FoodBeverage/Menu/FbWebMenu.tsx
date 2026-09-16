// ─── Web menu (Food & Beverage) ───────────────────────────────────────────────
//  Il menu che legge l'ospite dal suo telefono: si pubblica a un indirizzo e si
//  raggiunge dal QR sul tavolo. Ogni menu è una card con il suo indirizzo, il
//  periodo di validità e l'anteprima di come apparirà.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import {
  InputField, SelectField, TextareaField, DatePickerField,
} from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import { URL_WEB_MENU, oggiISO, type Servizio, type WebMenu } from '../fb.model'
import './FbWebMenu.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const fmtData = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '—'

const COLORI = ['#B08A4A', '#204769', '#2E6F5E', '#8E4B3C', '#5C4E7A', '#3E7FC1', '#1B1D23']
const SERVIZI: Array<Servizio | 'Tutti'> = ['Tutti', 'Colazione', 'Pranzo', 'Cena']

/** Indirizzo leggibile a partire dal titolo, con una coda che lo rende unico. */
const slugDi = (nome: string) =>
  nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32)
  + '-' + Math.random().toString(36).slice(2, 8)

const vuoto = (outletId: number): WebMenu => ({
  id: 0, outletId, nome: '', titolo: '', sottotitolo: '', slug: '', logo: '',
  notePiede: 'Allergeni disponibili su richiesta. Prezzi IVA inclusa.',
  vociIds: [], dal: oggiISO(), al: oggiISO(),
  servizio: 'Tutti', mostraPrezzi: true, mostraAllergeni: true,
  attivo: true, colore: COLORI[0],
})

type Scheda = 'info' | 'design' | 'voci'

export default function FbWebMenu({ navigate }: { navigate?: (p: string) => void }) {
  const outlets   = useFbStore(s => s.outlets)
  const categorie = useFbStore(s => s.categorie)
  const voci      = useFbStore(s => s.voci)
  const webMenu   = useFbStore(s => s.webMenu)
  const salva     = useFbStore(s => s.salvaWebMenu)
  const elimina   = useFbStore(s => s.eliminaWebMenu)
  const contesto  = useFbStore(s => s.contesto)
  const setContesto = useFbStore(s => s.setContesto)
  const confirm   = useConfirmStore(s => s.confirm)

  const { outletId } = contesto
  const [form, setForm] = useState<WebMenu | null>(null)
  const [scheda, setScheda] = useState<Scheda>('info')

  const righe = useMemo(
    () => webMenu.filter(m => m.outletId === null || m.outletId === outletId),
    [webMenu, outletId],
  )

  const pubblicabili = useMemo(() => voci.filter(v => v.attiva && v.nelWebMenu), [voci])

  const copiaUrl = (m: WebMenu) => {
    const url = URL_WEB_MENU + m.slug
    navigator.clipboard?.writeText(url)
    toast.success('Indirizzo copiato')
  }

  const chiediElimina = async (m: WebMenu) => {
    const ok = await confirm({
      message: `Eliminare il web menu “${m.nome}”? L’indirizzo pubblicato smette di funzionare.`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(m.id); toast.info('Web menu eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome interno del menu'); return }
    const m: WebMenu = {
      ...form,
      titolo: form.titolo.trim() || form.nome,
      slug: form.slug || slugDi(form.titolo.trim() || form.nome),
    }
    salva(m)
    toast.success(form.id ? 'Web menu aggiornato' : `“${m.nome}” pubblicato`)
    setForm(null)
  }

  return (
    <div className="fbweb">
      <PageHead
        title="Web menu"
        subtitle="Il menu digitale che l’ospite apre dal QR sul tavolo"
        actions={
          <button type="button" className="fbweb__head-btn" onClick={() => { setForm(vuoto(outletId)); setScheda('info') }}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo web menu
          </button>
        }
      />

      <FilterToolbar className="fbweb__bar">
        <SelectField
          name="outlet" label="Outlet" className="fbweb__f"
          value={outletId}
          options={outlets.map(o => ({ value: o.id, label: o.nome }))}
          onChange={e => setContesto({ outletId: +e.target.value })}
        />
        <button type="button" className="fbweb__link" onClick={() => navigate?.('fb-voci-menu')}>
          <i className="fa-solid fa-plate-utensils" aria-hidden="true" /> Voci pubblicabili: {pubblicabili.length}
        </button>
      </FilterToolbar>

      <p className="fbweb__nota">
        <i className="fa-solid fa-mobile-screen" aria-hidden="true" />
        I web menu si aprono da link o QR, senza installare nulla. L’indirizzo è
        <strong> {URL_WEB_MENU}nome-menu</strong> e resta valido per il periodo impostato.
      </p>

      <div className="fbweb__griglia">
        {righe.map(m => {
          const n = m.vociIds.length
          const o = outlets.find(x => x.id === m.outletId)
          return (
            <article key={m.id} className="fbweb__card" style={{ '--tinta': m.colore } as React.CSSProperties}>
              <header className="fbweb__card-head">
                <div>
                  <h3><TruncatedText text={m.titolo || m.nome} /></h3>
                  <p><TruncatedText text={m.sottotitolo || '—'} /></p>
                </div>
                <span className="fbweb__card-n">{n} {n === 1 ? 'voce' : 'voci'}</span>
              </header>

              <div className="fbweb__card-riga">
                <button
                  type="button"
                  className={`fbweb__stato ${m.attivo ? 'is-on' : ''}`}
                  aria-pressed={m.attivo}
                  onClick={() => salva({ ...m, attivo: !m.attivo })}
                >
                  {m.attivo ? 'Attivo' : 'Sospeso'}
                </button>
                <span className="fbweb__outlet"><TruncatedText text={o?.nome ?? 'Tutti gli outlet'} /></span>
                <button type="button" aria-label="Modifica il web menu" onClick={() => { setForm({ ...m }); setScheda('info') }}>
                  <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                </button>
                <button type="button" aria-label="Elimina il web menu" onClick={() => chiediElimina(m)}>
                  <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                </button>
              </div>

              <div className="fbweb__url">
                <span className="fbweb__url-lab">Indirizzo pubblico</span>
                <code>{URL_WEB_MENU}{m.slug}</code>
                <div className="fbweb__url-act">
                  <button type="button" onClick={() => copiaUrl(m)} aria-label="Copia l’indirizzo">
                    <Tooltip text="Copia"><i className="fa-solid fa-copy" /></Tooltip>
                  </button>
                  <button
                    type="button" aria-label="Apri il menu"
                    onClick={() => toast.info('Il menu si apre all’indirizzo pubblicato')}
                  >
                    <Tooltip text="Apri"><i className="fa-solid fa-arrow-up-right-from-square" /></Tooltip>
                  </button>
                </div>
              </div>

              <div className="fbweb__qr">
                <div className="fbweb__qr-box" aria-hidden="true">
                  <i className="fa-solid fa-qrcode" />
                </div>
                <div className="fbweb__qr-txt">
                  <strong>QR del tavolo</strong>
                  <span>{fmtData(m.dal)} → {fmtData(m.al)}</span>
                  <span className="fbweb__qr-serv">{m.servizio === 'Tutti' ? 'Tutti i servizi' : m.servizio}</span>
                </div>
                <button type="button" className="fbweb__qr-btn" onClick={() => toast.info('QR generato alla pubblicazione')}>
                  <i className="fa-solid fa-download" aria-hidden="true" /> Scarica
                </button>
              </div>
            </article>
          )
        })}

        {!righe.length && (
          <div className="fbweb__vuoto">
            <i className="fa-solid fa-globe" aria-hidden="true" />
            <p>Nessun web menu pubblicato per questo outlet.</p>
          </div>
        )}
      </div>

      {/* ── Scheda del web menu ───────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Web menu — ${form.nome}` : 'Nuovo web menu'}
        size="xl"
      >
        {form && (
          <div className="fbweb-form">
            <div className="fbweb-form__tabs">
              {([['info', 'Informazioni', 'fa-circle-info'], ['design', 'Design', 'fa-palette'], ['voci', 'Voci del menu', 'fa-plate-utensils']] as const).map(([id, label, ico]) => (
                <button
                  key={id} type="button"
                  className={scheda === id ? 'is-on' : ''}
                  onClick={() => setScheda(id as Scheda)}
                >
                  <i className={`fa-solid ${ico}`} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>

            {scheda === 'info' && (
              <div className="fbweb-form__blocco">
                <div className="fbweb-form__row">
                  <InputField
                    name="nome" label="Nome interno" className="fbweb-form__grow" value={form.nome}
                    placeholder="es. Menu pranzo estate"
                    onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
                  />
                  <SelectField
                    name="outlet" label="Outlet" value={form.outletId ?? ''}
                    options={[{ value: '', label: 'Tutti gli outlet' }, ...outlets.map(o => ({ value: o.id, label: o.nome }))]}
                    onChange={e => setForm(f => f && ({ ...f, outletId: e.target.value ? +e.target.value : null }))}
                  />
                </div>

                <div className="fbweb-form__row">
                  <InputField
                    name="titolo" label="Titolo visibile" className="fbweb-form__grow" value={form.titolo}
                    placeholder="Il nostro menu"
                    onChange={e => setForm(f => f && ({ ...f, titolo: e.target.value }))}
                  />
                  <InputField
                    name="sottotitolo" label="Sottotitolo" className="fbweb-form__grow" value={form.sottotitolo}
                    placeholder="Cucina di stagione dal 1980"
                    onChange={e => setForm(f => f && ({ ...f, sottotitolo: e.target.value }))}
                  />
                </div>

                <TextareaField
                  name="note" label="Note a piè di pagina" rows={2} value={form.notePiede}
                  placeholder="Allergeni, informazioni legali, coperto…"
                  onChange={e => setForm(f => f && ({ ...f, notePiede: e.target.value }))}
                />

                <div className="fbweb-form__row">
                  <DatePickerField
                    name="dal" label="Valido dal" value={form.dal}
                    onChange={e => setForm(f => f && ({ ...f, dal: e.target.value }))}
                  />
                  <DatePickerField
                    name="al" label="Valido al" value={form.al}
                    onChange={e => setForm(f => f && ({ ...f, al: e.target.value }))}
                  />
                  <SelectField
                    name="servizio" label="Servizio" value={form.servizio}
                    options={SERVIZI.map(s => ({ value: s, label: s }))}
                    onChange={e => setForm(f => f && ({ ...f, servizio: e.target.value as Servizio | 'Tutti' }))}
                  />
                </div>

                <div className="fbweb-form__flag">
                  <label>
                    <input
                      type="checkbox" className="sib-checkbox" checked={form.mostraPrezzi}
                      onChange={e => setForm(f => f && ({ ...f, mostraPrezzi: e.target.checked }))}
                    />
                    Mostra i prezzi
                  </label>
                  <label>
                    <input
                      type="checkbox" className="sib-checkbox" checked={form.mostraAllergeni}
                      onChange={e => setForm(f => f && ({ ...f, mostraAllergeni: e.target.checked }))}
                    />
                    Mostra gli allergeni
                  </label>
                  <label>
                    <input
                      type="checkbox" className="sib-checkbox" checked={form.attivo}
                      onChange={e => setForm(f => f && ({ ...f, attivo: e.target.checked }))}
                    />
                    Menu attivo
                  </label>
                </div>
              </div>
            )}

            {scheda === 'design' && (
              <div className="fbweb-form__blocco fbweb-form__design">
                <div className="fbweb-form__col">
                  <div className="fbweb-form__blk">
                    <span className="fbweb-form__lab">Tinta dell’intestazione</span>
                    <div className="fbweb-form__colori">
                      {COLORI.map(c => (
                        <button
                          key={c} type="button"
                          className={`fbweb-form__colore ${c === form.colore ? 'is-on' : ''}`}
                          style={{ '--c': c } as React.CSSProperties}
                          aria-label={`Colore ${c}`}
                          onClick={() => setForm(f => f && ({ ...f, colore: c }))}
                        />
                      ))}
                    </div>
                  </div>

                  <InputField
                    name="logo" label="Logo (indirizzo dell’immagine)" value={form.logo}
                    placeholder="https://…"
                    onChange={e => setForm(f => f && ({ ...f, logo: e.target.value }))}
                  />
                </div>

                {/* Anteprima: come l'ospite vedrà il menu sul telefono */}
                <div className="fbweb-form__anteprima">
                  <span className="fbweb-form__lab">Anteprima</span>
                  <div className="fbweb-form__telefono">
                    <header style={{ '--tinta': form.colore } as React.CSSProperties}>
                      <strong>{form.titolo || form.nome || 'Il nostro menu'}</strong>
                      <span>{form.sottotitolo}</span>
                    </header>
                    <ul>
                      {form.vociIds.slice(0, 5).map(id => {
                        const v = voci.find(x => x.id === id)
                        if (!v) return null
                        return (
                          <li key={id}>
                            <span><TruncatedText text={v.nome} /></span>
                            {form.mostraPrezzi && <em>{euro(v.prezzo)}</em>}
                          </li>
                        )
                      })}
                      {!form.vociIds.length && <li className="fbweb-form__ant-vuoto">Nessuna voce scelta</li>}
                    </ul>
                    <footer>{form.notePiede}</footer>
                  </div>
                </div>
              </div>
            )}

            {scheda === 'voci' && (
              <div className="fbweb-form__blocco">
                <header className="fbweb-form__voci-head">
                  <span className="fbweb-form__lab">
                    Voci pubblicate <em>(solo quelle marcate “nel web menu” nel catalogo)</em>
                  </span>
                  <span className="fbweb-form__conta">{form.vociIds.length} scelte</span>
                  <button
                    type="button" className="fbweb-form__tutte"
                    onClick={() => setForm(f => f && ({
                      ...f,
                      vociIds: f.vociIds.length === pubblicabili.length ? [] : pubblicabili.map(v => v.id),
                    }))}
                  >
                    {form.vociIds.length === pubblicabili.length ? 'Togli tutte' : 'Prendi tutte'}
                  </button>
                </header>

                <div className="fbweb-form__categorie">
                  {categorie.slice().sort((a, b) => a.ordine - b.ordine).map(c => {
                    const dentro = pubblicabili.filter(v => v.categoriaId === c.id)
                    if (!dentro.length) return null
                    return (
                      <section key={c.id} className="fbweb-form__gruppo">
                        <h4 style={{ '--cat': c.colore } as React.CSSProperties}>
                          <span>{c.emoji}</span> {c.nome}
                        </h4>
                        <ul>
                          {dentro.map(v => (
                            <li key={v.id}>
                              <label>
                                <input
                                  type="checkbox" className="sib-checkbox"
                                  checked={form.vociIds.includes(v.id)}
                                  onChange={() => setForm(f => f && ({
                                    ...f,
                                    vociIds: f.vociIds.includes(v.id)
                                      ? f.vociIds.filter(x => x !== v.id)
                                      : [...f.vociIds, v.id],
                                  }))}
                                />
                                <span className="fbweb-form__v-nome"><TruncatedText text={v.nome} /></span>
                                <span className="fbweb-form__v-prezzo">{euro(v.prezzo)}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  })}
                </div>
              </div>
            )}

            <footer className="fbweb-form__foot">
              <button type="button" className="fbweb-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbweb-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Pubblica il menu'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
