// ─── Libro prenotazioni ───────────────────────────────────────────────────────
//  Il libro del ristorante: il mese a colpo d'occhio con il carico di ogni
//  giorno, la giornata scelta in tabella (una riga per prenotazione, con stato,
//  tavolo assegnato e note di servizio) e la modale per prendere o correggere
//  una prenotazione.
//
//  Divisione dei compiti con "Ospiti del giorno": qui si pianifica (si prende,
//  si sposta, si conferma), là si lavora il servizio della giornata.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import {
  InputField, SelectField, TextareaField, SearchField, DatePickerField,
} from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, SALE } from '../../../../store/useFbStore'
import {
  CATEGORIE_CLIENTE, STATO_PRENOTAZIONE,
  type OriginePrenotazione, type Prenotazione, type StatoPrenotazione,
} from '../fb.model'
import './LibroPrenotazioni.sass'

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const ORIGINI: Array<{ id: OriginePrenotazione; label: string; ico: string }> = [
  { id: 'telefono',      label: 'Telefono',      ico: 'fa-phone' },
  { id: 'web',           label: 'Web',           ico: 'fa-globe' },
  { id: 'reception',     label: 'Reception',     ico: 'fa-bell-concierge' },
  { id: 'walk-in',       label: 'Walk-in',       ico: 'fa-person-walking' },
  { id: 'tour-operator', label: 'Tour operator', ico: 'fa-suitcase-rolling' },
]

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtData = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : ''

/** Prenotazione vuota per la modale "Nuova". */
const nuova = (
  outletId: number, salaId: number, turnoId: number | null, data: string, ora = '20:00',
): Omit<Prenotazione, 'id'> => ({
  outletId, salaId, turnoId, data,
  ora,
  ospite: '', pax: 2, telefono: '', email: '', note: '', camera: '',
  stato: 'confermata', origine: 'telefono', tavoloId: null, categoriaClienteId: 0,
})

export default function LibroPrenotazioni({ navigate }: { navigate?: (p: string) => void }) {
  const OUTLETS = useFbStore(s => s.outlets)
  const TURNI   = useFbStore(s => s.turni)
  const contesto     = useFbStore(s => s.contesto)
  const setContesto  = useFbStore(s => s.setContesto)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const tavoli       = useFbStore(s => s.tavoli)
  const crea         = useFbStore(s => s.creaPrenotazione)
  const aggiorna     = useFbStore(s => s.aggiornaPrenotazione)
  const elimina      = useFbStore(s => s.eliminaPrenotazione)
  const assegnaTavolo = useFbStore(s => s.assegnaTavolo)
  const confirm      = useConfirmStore(s => s.confirm)

  const { outletId, salaId, data } = contesto
  const [mese, setMese]   = useState(() => new Date(data + 'T12:00:00'))
  const [cerca, setCerca] = useState('')
  const [soloSala, setSoloSala] = useState(false)
  const [form, setForm]   = useState<Omit<Prenotazione, 'id'> | null>(null)
  const [editId, setEditId] = useState<number | null>(null)

  const saleOutlet  = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId, TURNI])

  // ── Prenotazioni della giornata ────────────────────────────────────────────
  const delGiorno = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return prenotazioni
      .filter(p => p.data === data && p.outletId === outletId)
      .filter(p => !soloSala || p.salaId === salaId)
      .filter(p => !q || p.ospite.toLowerCase().includes(q) || p.telefono.includes(q))
      .sort((a, b) => a.ora.localeCompare(b.ora))
  }, [prenotazioni, data, outletId, salaId, soloSala, cerca])

  const perTurno = useMemo(() => {
    const m = new Map<number | null, Prenotazione[]>()
    delGiorno.forEach(p => m.set(p.turnoId, [...(m.get(p.turnoId) ?? []), p]))
    return Array.from(m.entries()).sort((a, b) => {
      const ta = TURNI.find(t => t.id === a[0])?.oraInizio ?? ''
      const tb = TURNI.find(t => t.id === b[0])?.oraInizio ?? ''
      return ta.localeCompare(tb)
    })
  }, [delGiorno, TURNI])

  const paxGiorno = delGiorno.reduce((a, p) => a + p.pax, 0)

  // ── Calendario ─────────────────────────────────────────────────────────────
  const celle = useMemo(() => {
    const primo = new Date(mese.getFullYear(), mese.getMonth(), 1)
    const offset = (primo.getDay() + 6) % 7
    const ultimo = new Date(mese.getFullYear(), mese.getMonth() + 1, 0).getDate()
    const out: Array<Date | null> = Array(offset).fill(null)
    for (let g = 1; g <= ultimo; g++) out.push(new Date(mese.getFullYear(), mese.getMonth(), g))
    return out
  }, [mese])

  const caricoGiorno = useMemo(() => {
    const m = new Map<string, { pax: number; pren: number }>()
    prenotazioni.forEach(p => {
      if (p.outletId !== outletId || p.stato === 'annullata') return
      const v = m.get(p.data) ?? { pax: 0, pren: 0 }
      m.set(p.data, { pax: v.pax + p.pax, pren: v.pren + 1 })
    })
    return m
  }, [prenotazioni, outletId])

  /** Coperti disponibili nella giornata, sommando la copertura dei turni. */
  const coperturaGiorno = turniOutlet.reduce((a, t) => a + t.coperturaMax, 0)

  // ── Azioni ─────────────────────────────────────────────────────────────────
  const salva = () => {
    if (!form) return
    if (!form.ospite.trim()) { toast.warning('Manca il nominativo dell’ospite'); return }
    if (editId) { aggiorna(editId, form); toast.success('Prenotazione aggiornata') }
    else { crea(form); toast.success(`Prenotazione di ${form.ospite} registrata`) }
    setForm(null); setEditId(null)
  }

  const chiediElimina = async (p: Prenotazione) => {
    const ok = await confirm({
      message: `Eliminare la prenotazione di ${p.ospite} del ${fmtData(p.data)} alle ${p.ora}?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(p.id); toast.info('Prenotazione eliminata') }
  }

  const tavoliSala = (sid: number | null) => tavoli.filter(t => t.salaId === (sid ?? salaId))

  return (
    <div className="fbpren">
      <PageHead
        title="Libro prenotazioni"
        subtitle="Il carico del mese, la giornata in dettaglio e la presa delle prenotazioni"
        actions={
          <div className="fbpren__head-acts">
            <button type="button" className="fbpren__head-btn" onClick={() => navigate?.('ospiti-giorno')}>
              <i className="fa-solid fa-users" aria-hidden="true" /> Ospiti del giorno
            </button>
            <button
              type="button" className="fbpren__head-btn fbpren__head-btn--go"
              onClick={() => { setEditId(null); setForm(nuova(outletId, salaId, contesto.turnoId, data, TURNI.find(t => t.id === contesto.turnoId)?.oraInizio)) }}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova prenotazione
            </button>
          </div>
        }
      />

      <FilterToolbar className="fbpren__bar">
        <SelectField
          name="outlet" label="Outlet" className="fbpren__f fbpren__f--lg"
          value={outletId}
          options={OUTLETS.map(o => ({ value: o.id, label: o.nome }))}
          onChange={e => {
            const id = +e.target.value
            setContesto({ outletId: id, salaId: SALE.find(s => s.outletId === id)?.id ?? salaId })
          }}
        />
        <SelectField
          name="sala" label="Sala" className="fbpren__f"
          value={salaId}
          options={saleOutlet.map(s => ({ value: s.id, label: s.nome }))}
          onChange={e => setContesto({ salaId: +e.target.value })}
        />
        <DatePickerField
          name="data" label="Giorno" className="fbpren__f"
          value={data}
          onChange={e => { setContesto({ data: e.target.value }); setMese(new Date(e.target.value + 'T12:00:00')) }}
        />
        <div className="fbpren__f fbpren__f--lg fbpren__cerca">
          <span className="fbpren__cerca-lab">Cerca</span>
          <SearchField
            name="cerca"
            value={cerca}
            placeholder="Nome o telefono…"
            onChange={e => setCerca(e.target.value)}
            onClear={() => setCerca('')}
          />
        </div>
        <label className="fbpren__only">
          <input type="checkbox" className="sib-checkbox" checked={soloSala} onChange={e => setSoloSala(e.target.checked)} />
          Solo questa sala
        </label>
      </FilterToolbar>

      <div className="fbpren__body">
        {/* ── Giornata ────────────────────────────────────────────────────── */}
        <section className="fbpren__giorno">
          <header className="fbpren__giorno-head">
            <div className="fbpren__giorno-tit">
              <i className="fa-solid fa-book" aria-hidden="true" />
              <span>{new Date(data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="fbpren__giorno-kpi">
              <span><strong>{delGiorno.length}</strong> prenotazioni</span>
              <span><strong>{paxGiorno}</strong>/{coperturaGiorno} coperti</span>
            </div>
          </header>

          <div className="fbpren__scroll">
            {perTurno.map(([turnoId, righe]) => {
              const t = TURNI.find(x => x.id === turnoId)
              const pax = righe.reduce((a, p) => a + p.pax, 0)
              const pieno = t ? Math.min(100, Math.round((pax / Math.max(1, t.coperturaMax)) * 100)) : 0
              return (
                <div key={String(turnoId)} className="fbpren__turno">
                  <header className="fbpren__turno-head">
                    <span className="fbpren__turno-nome">
                      {t ? `${t.servizio} · ${t.nome}` : 'Senza turno'}
                      {t && <em>{t.oraInizio}–{t.oraFine}</em>}
                    </span>
                    <span className="fbpren__turno-load">
                      <span className="fbpren__turno-barra" style={{ '--pct': pieno } as React.CSSProperties}><span /></span>
                      {pax}{t ? `/${t.coperturaMax}` : ''} coperti
                    </span>
                  </header>

                  <div className="sib-table-wrap">
                    <table className="sib-table fbpren__table">
                      <colgroup>
                        <col className="fbpren__c-ora" /><col className="fbpren__c-osp" />
                        <col className="fbpren__c-pax" /><col className="fbpren__c-tav" />
                        <col className="fbpren__c-org" /><col className="fbpren__c-note" />
                        <col className="fbpren__c-stato" /><col className="fbpren__c-act" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Ora</th>
                          <th>Ospite</th>
                          <th>Pax</th>
                          <th>Tavolo</th>
                          <th>Origine</th>
                          <th>Note</th>
                          <th>Stato</th>
                          <th className="fbpren__c-act" aria-label="Azioni" />
                        </tr>
                      </thead>
                      <tbody>
                        {righe.map(p => {
                          const org = ORIGINI.find(o => o.id === p.origine)
                          return (
                            <tr key={p.id} className={p.stato === 'annullata' ? 'is-off' : ''}>
                              <td className="fbpren__ora">{p.ora}</td>
                              <td>
                                <TruncatedText text={p.ospite} />
                                {!!p.camera && <span className="fbpren__camera">cam. {p.camera}</span>}
                              </td>
                              <td className="fbpren__pax">{p.pax}</td>
                              <td>
                                <select
                                  className="sib-input fbpren__sel"
                                  value={p.tavoloId ?? ''}
                                  aria-label={`Tavolo per ${p.ospite}`}
                                  onChange={e => assegnaTavolo(p.id, e.target.value ? +e.target.value : null)}
                                >
                                  <option value="">—</option>
                                  {tavoliSala(p.salaId).map(t => (
                                    <option key={t.id} value={t.id}>{t.numero}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <Tooltip text={org?.label ?? ''}>
                                  <span className="fbpren__org"><i className={`fa-solid ${org?.ico}`} aria-hidden="true" /></span>
                                </Tooltip>
                              </td>
                              <td><TruncatedText text={p.note || '—'} /></td>
                              <td>
                                <select
                                  className="sib-input fbpren__sel fbpren__sel--stato"
                                  data-stato={p.stato}
                                  value={p.stato}
                                  aria-label={`Stato della prenotazione di ${p.ospite}`}
                                  onChange={e => aggiorna(p.id, { stato: e.target.value as StatoPrenotazione })}
                                >
                                  {(Object.keys(STATO_PRENOTAZIONE) as StatoPrenotazione[]).map(s => (
                                    <option key={s} value={s}>{STATO_PRENOTAZIONE[s].label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="fbpren__act">
                                <button
                                  type="button" aria-label="Modifica la prenotazione"
                                  onClick={() => { setEditId(p.id); const { id, ...resto } = p; setForm(resto) }}
                                >
                                  <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                                </button>
                                <button type="button" aria-label="Elimina la prenotazione" onClick={() => chiediElimina(p)}>
                                  <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            {!delGiorno.length && (
              <div className="fbpren__vuoto">
                <i className="fa-solid fa-book-open" aria-hidden="true" />
                <p>Nessuna prenotazione per questa giornata.</p>
                <button type="button" onClick={() => { setEditId(null); setForm(nuova(outletId, salaId, contesto.turnoId, data, TURNI.find(t => t.id === contesto.turnoId)?.oraInizio)) }}>
                  <i className="fa-solid fa-plus" aria-hidden="true" /> Prendi una prenotazione
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Mese ────────────────────────────────────────────────────────── */}
        <aside className="fbpren__panel">
          <section className="fbpren__blk">
            <header className="fbpren__blk-head">
              <button type="button" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Mese precedente">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
              <h3>{MESI[mese.getMonth()]} {mese.getFullYear()}</h3>
              <button type="button" onClick={() => setMese(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Mese successivo">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </header>
            <div className="fbpren__cal">
              {GIORNI.map(g => <span key={g} className="fbpren__cal-dow">{g}</span>)}
              {celle.map((d, i) => {
                if (!d) return <span key={`v${i}`} className="fbpren__cal-vuoto" />
                const s = iso(d)
                const carico = caricoGiorno.get(s)
                const pieno = carico ? Math.min(100, Math.round((carico.pax / Math.max(1, coperturaGiorno)) * 100)) : 0
                return (
                  <button
                    key={s} type="button"
                    className={`fbpren__cal-g ${s === data ? 'is-on' : ''}`}
                    onClick={() => setContesto({ data: s })}
                  >
                    <span className="fbpren__cal-n">{d.getDate()}</span>
                    {!!carico && (
                      <Tooltip text={`${carico.pren} prenotazioni · ${carico.pax} coperti`}>
                        <span className="fbpren__cal-load" style={{ '--pct': pieno } as React.CSSProperties}><span /></span>
                      </Tooltip>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="fbpren__blk">
            <h3 className="fbpren__blk-tit">Carico dei turni</h3>
            <ul className="fbpren__turni">
              {turniOutlet.map(t => {
                const pax = prenotazioni
                  .filter(p => p.data === data && p.turnoId === t.id && p.stato !== 'annullata')
                  .reduce((a: number, p: Prenotazione) => a + p.pax, 0)
                const pieno = Math.min(100, Math.round((pax / Math.max(1, t.coperturaMax)) * 100))
                return (
                  <li key={t.id}>
                    <span className="fbpren__turni-nome"><TruncatedText text={`${t.servizio} · ${t.nome}`} /></span>
                    <span className="fbpren__turni-barra" style={{ '--pct': pieno } as React.CSSProperties}><span /></span>
                    <span className="fbpren__turni-n">{pax}/{t.coperturaMax}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>
      </div>

      {/* ── Presa prenotazione ─────────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => { setForm(null); setEditId(null) }}
        title={editId ? 'Modifica prenotazione' : 'Nuova prenotazione'}
        size="lg"
      >
        {form && (
          <div className="fbpren-form">
            <div className="fbpren-form__row">
              <InputField
                name="ospite" label="Ospite" className="fbpren-form__grow"
                value={form.ospite} onChange={e => setForm(f => f && ({ ...f, ospite: e.target.value }))}
              />
              <div className="fbpren-form__pax">
                <span className="fbpren-form__lab">Coperti</span>
                <div className="fbpren-form__stepper">
                  <button type="button" onClick={() => setForm(f => f && ({ ...f, pax: Math.max(1, f.pax - 1) }))} aria-label="Meno coperti">
                    <i className="fa-solid fa-minus" aria-hidden="true" />
                  </button>
                  <span>{form.pax}</span>
                  <button type="button" onClick={() => setForm(f => f && ({ ...f, pax: f.pax + 1 }))} aria-label="Più coperti">
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="fbpren-form__row">
              <DatePickerField
                name="data" label="Data" value={form.data}
                onChange={e => setForm(f => f && ({ ...f, data: e.target.value }))}
              />
              <SelectField
                name="turno" label="Turno" value={form.turnoId ?? ''}
                options={turniOutlet.map(t => ({ value: t.id, label: `${t.servizio} · ${t.nome} ${t.oraInizio}` }))}
                onChange={e => {
                  const t = TURNI.find(x => x.id === +e.target.value)
                  setForm(f => f && ({ ...f, turnoId: +e.target.value, ora: t?.oraInizio ?? f.ora }))
                }}
              />
              <div className="fbpren-form__ora">
                <span className="fbpren-form__lab">Ora</span>
                <input
                  type="time" className="sib-input" value={form.ora}
                  aria-label="Ora della prenotazione"
                  onChange={e => setForm(f => f && ({ ...f, ora: e.target.value }))}
                />
              </div>
              <SelectField
                name="sala" label="Sala" value={form.salaId ?? ''}
                options={saleOutlet.map(s => ({ value: s.id, label: s.nome }))}
                onChange={e => setForm(f => f && ({ ...f, salaId: +e.target.value, tavoloId: null }))}
              />
            </div>

            <div className="fbpren-form__row">
              <InputField
                name="telefono" label="Telefono" value={form.telefono}
                onChange={e => setForm(f => f && ({ ...f, telefono: e.target.value }))}
              />
              <InputField
                name="email" label="E-mail" type="email" className="fbpren-form__grow" value={form.email}
                onChange={e => setForm(f => f && ({ ...f, email: e.target.value }))}
              />
              <InputField
                name="camera" label="Camera" value={form.camera}
                onChange={e => setForm(f => f && ({ ...f, camera: e.target.value }))}
              />
            </div>

            <div className="fbpren-form__row">
              <SelectField
                name="origine" label="Origine" value={form.origine}
                options={ORIGINI.map(o => ({ value: o.id, label: o.label }))}
                onChange={e => setForm(f => f && ({ ...f, origine: e.target.value as OriginePrenotazione }))}
              />
              <SelectField
                name="categoria" label="Categoria cliente" value={form.categoriaClienteId ?? 0}
                options={CATEGORIE_CLIENTE.map(c => ({ value: c.id, label: c.nome }))}
                onChange={e => setForm(f => f && ({ ...f, categoriaClienteId: +e.target.value }))}
              />
              <SelectField
                name="stato" label="Stato" value={form.stato}
                options={(Object.keys(STATO_PRENOTAZIONE) as StatoPrenotazione[]).map(s => ({ value: s, label: STATO_PRENOTAZIONE[s].label }))}
                onChange={e => setForm(f => f && ({ ...f, stato: e.target.value as StatoPrenotazione }))}
              />
              <SelectField
                name="tavolo" label="Tavolo" value={form.tavoloId ?? ''}
                options={[{ value: '', label: 'Da assegnare' }, ...tavoliSala(form.salaId).map(t => ({ value: t.id, label: `${t.numero} · ${t.capienza} posti` }))]}
                onChange={e => setForm(f => f && ({ ...f, tavoloId: e.target.value ? +e.target.value : null }))}
              />
            </div>

            <TextareaField
              name="note" label="Note di servizio" rows={2} value={form.note}
              placeholder="Allergie, occasioni speciali, richieste di tavolo…"
              onChange={e => setForm(f => f && ({ ...f, note: e.target.value }))}
            />

            <footer className="fbpren-form__foot">
              <button type="button" className="fbpren-form__annulla" onClick={() => { setForm(null); setEditId(null) }}>Annulla</button>
              <button type="button" className="fbpren-form__ok" onClick={salva}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {editId ? 'Salva le modifiche' : 'Registra la prenotazione'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
