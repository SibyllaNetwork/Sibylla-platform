import React, { useMemo, useRef, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import AlertBanner from '../../../../core/components/AlertBanner'
import FormGrid from '../../../../core/components/FormGrid'
import { InputField, SelectField, TextareaField } from '../../../../core/components/form'
import { useCatalogoStore } from '../../../../store/useCatalogoStore'
import { apiFetchSibylla } from '../../../../services/api'
import './CreaPreventivo.sass'

/**
 * Crea preventivo — generazione di preventivi personalizzabili.
 * Intestatario (dati canonici) + specchietto voci di spesa
 * (descrizione · quantità · prezzo unitario · prezzo totale) + IVA.
 * BE: `/Sibylla/preventivi/InsertPreventivo`.
 */

interface Riga {
  id: number
  descrizione: string
  quantita: number
  prezzoUnitario: number
}

const CATEGORIE_IMPRESA = [
  'Hotel', 'Resort', 'B&B', 'Agriturismo', 'Villaggio turistico',
  'Tour operator', 'Agenzia viaggi', 'Wedding planner', 'Catering & eventi',
]

const STRUTTURE = [
  'Tutte le strutture', 'Sibylla Grand Hotel', 'Sibylla Resort & Spa',
  'Sibylla Country House', 'Sibylla Boutique', 'Sibylla Beach Club',
]

const VALIDITA = [
  { value: '7',  label: '7 giorni' },
  { value: '15', label: '15 giorni' },
  { value: '30', label: '30 giorni' },
  { value: '60', label: '60 giorni' },
  { value: '90', label: '90 giorni' },
]

// Servizi a catalogo (mock realistico — affianca i prodotti dello store).
const SERVIZI_CATALOGO: Array<{ nome: string; prezzo: number }> = [
  { nome: 'Transfer aeroporto (a/r)',     prezzo: 60 },
  { nome: 'Mezza pensione (a persona)',   prezzo: 35 },
  { nome: 'Pensione completa (a persona)',prezzo: 55 },
  { nome: 'Noleggio sala meeting (mezza giornata)', prezzo: 250 },
  { nome: 'Coffee break (a persona)',     prezzo: 12 },
  { nome: 'Spa & wellness day',           prezzo: 80 },
  { nome: 'Escursione guidata',           prezzo: 45 },
  { nome: 'Welcome dinner (a persona)',   prezzo: 65 },
]

const eur = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export default function CreaPreventivo({ navigate }: { navigate: (p: string) => void }) {
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const fornitori = useCatalogoStore(s => s.fornitori)

  const [form, setForm] = useState({
    categoria: '', partner: '', struttura: 'Tutte le strutture', indirizzo: '',
    cap: '', citta: '', telefono: '', email: '', descrizione: '',
    validita: '30', note: '', allegato: '',
  })
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const [righe, setRighe] = useState<Riga[]>([
    { id: 1, descrizione: '', quantita: 1, prezzoUnitario: 0 },
  ])
  const nextId = useRef(2)
  const [ivaPct, setIvaPct] = useState('22')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // ── Righe ──────────────────────────────────────────────────────────
  const addRiga = (descrizione = '', prezzoUnitario = 0) => {
    setRighe(rs => [...rs, { id: nextId.current++, descrizione, quantita: 1, prezzoUnitario }])
  }
  const updRiga = (id: number, patch: Partial<Riga>) =>
    setRighe(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const rmRiga = (id: number) =>
    setRighe(rs => (rs.length === 1 ? rs : rs.filter(r => r.id !== id)))

  // ── Catalogo (prodotti store + servizi mock) ─────────────────────────
  const catalogo = useMemo(() => {
    const fromProdotti = prodotti.map(p => ({
      nome: p.nome,
      prezzo: p.mercati?.network?.prezzoVendita || p.mercati?.agora?.prezzoVendita || p.prezzoBase || 0,
      tipo: 'Prodotto' as const,
    }))
    const fromServizi = SERVIZI_CATALOGO.map(s => ({ ...s, tipo: 'Servizio' as const }))
    return [...fromServizi, ...fromProdotti]
  }, [prodotti])

  const catalogoFiltrato = catalogo.filter(c =>
    !pickerQuery || c.nome.toLowerCase().includes(pickerQuery.toLowerCase()),
  )

  // ── Totali ───────────────────────────────────────────────────────────
  const subTotale = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const ivaN = parseFloat(ivaPct) || 0
  const iva = subTotale * (ivaN / 100)
  const totale = subTotale + iva

  // ── Save ───────────────────────────────────────────────────────────
  const righeValide = righe.filter(r => r.descrizione.trim())

  async function persist(invia: boolean) {
    if (!form.categoria) { setError('Seleziona la categoria impresa dell’intestatario'); return }
    if (righeValide.length === 0) { setError('Inserisci almeno una voce di spesa con descrizione'); return }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla('preventivi/InsertPreventivo', {
        method: 'POST',
        body: {
          ...form,
          righe: righeValide.map(r => ({
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzo_unitario: r.prezzoUnitario,
            prezzo_totale: r.quantita * r.prezzoUnitario,
          })),
          iva_pct: ivaN,
          sub_totale: subTotale,
          iva,
          totale,
          stato: invia ? 'Inviato' : 'Bozza',
        },
      })
      navigate('i-miei-preventivi')
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="crea-preventivo">
      <PageHead
        title="Crea preventivo"
        subtitle="Generazione automatica di preventivi personalizzabili"
        onBack={() => navigate('i-miei-preventivi')}
        actions={
          <div className="crea-preventivo__top-actions">
            <button className="sib-btn sib-btn--secondary" onClick={() => navigate('i-miei-preventivi')}>
              <i className="fa-duotone fa-file-lines" aria-hidden="true" /> Gestione preventivi
            </button>
            <button className="sib-btn sib-btn--secondary" onClick={() => navigate('lista-fornitori')}>
              <i className="fa-duotone fa-clipboard-list" aria-hidden="true" /> Bacheca fornitori
            </button>
          </div>
        }
      />

      {error && <AlertBanner type="error">{error}</AlertBanner>}

      {/* ── Intestatario ─────────────────────────────────────────────── */}
      <section className="crea-preventivo__section">
        <h3 className="sib-section-title crea-preventivo__section-title">Intestatario del preventivo</h3>

        <FormGrid cols={4}>
          <SelectField
            name="categoria" label="Categoria impresa" required
            value={form.categoria} onChange={e => set('categoria', e.target.value)}
            placeholder="Seleziona..."
            options={CATEGORIE_IMPRESA.map(c => ({ value: c, label: c }))}
          />
          <SelectField
            name="partner" label="Partner"
            value={form.partner} onChange={e => set('partner', e.target.value)}
            placeholder="Seleziona..."
            options={fornitori.map(f => ({ value: f.id, label: f.nome }))}
          />
          <SelectField
            name="struttura" label="Strutture"
            value={form.struttura} onChange={e => set('struttura', e.target.value)}
            options={STRUTTURE.map(s => ({ value: s, label: s }))}
          />
          <InputField
            name="indirizzo" label="Indirizzo"
            value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)}
            placeholder="Via, civico"
          />
        </FormGrid>

        <FormGrid cols={4}>
          <InputField name="cap"      label="CAP"      value={form.cap}      onChange={e => set('cap', e.target.value)} placeholder="00000" />
          <InputField name="citta"    label="Città"    value={form.citta}    onChange={e => set('citta', e.target.value)} placeholder="Città" />
          <InputField name="telefono" label="Telefono" type="tel"   value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+39 ..." />
          <InputField name="email"    label="Email"    type="email" value={form.email}    onChange={e => set('email', e.target.value)} placeholder="nome@dominio.it" />
        </FormGrid>

        <InputField
          name="descrizione" label="Breve descrizione"
          value={form.descrizione} onChange={e => set('descrizione', e.target.value)}
          placeholder="Oggetto del preventivo (es. Soggiorno gruppo · 15 pax · 3 notti)"
        />
      </section>

      {/* ── Voci di spesa ────────────────────────────────────────────── */}
      <section className="crea-preventivo__section">
        <div className="crea-preventivo__voci-head">
          <h3 className="sib-section-title crea-preventivo__section-title">Voci di spesa</h3>
          <div className="crea-preventivo__voci-actions">
            <div className="crea-preventivo__picker-wrap">
              <button
                type="button" className="sib-btn sib-btn--ghost"
                onClick={() => setPickerOpen(o => !o)} aria-expanded={pickerOpen}
              >
                <i className="fa-duotone fa-plus" aria-hidden="true" /> Aggiungi prodotto/servizio
              </button>
              {pickerOpen && (
                <div className="crea-preventivo__picker">
                  <input
                    className="sib-input crea-preventivo__picker-search" autoFocus
                    placeholder="Cerca prodotto o servizio…"
                    value={pickerQuery} onChange={e => setPickerQuery(e.target.value)}
                  />
                  <ul className="crea-preventivo__picker-list">
                    {catalogoFiltrato.map((c, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => { addRiga(c.nome, c.prezzo); setPickerOpen(false); setPickerQuery('') }}
                        >
                          <span className={'crea-preventivo__picker-tag crea-preventivo__picker-tag--' + c.tipo.toLowerCase()}>{c.tipo}</span>
                          <span className="crea-preventivo__picker-name">{c.nome}</span>
                          <span className="crea-preventivo__picker-price">{eur(c.prezzo)}</span>
                        </button>
                      </li>
                    ))}
                    {catalogoFiltrato.length === 0 && (
                      <li className="crea-preventivo__picker-empty">Nessun elemento trovato.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <button type="button" className="sib-btn sib-btn--ghost" onClick={() => navigate('crea-prodotto')}>
              <i className="fa-duotone fa-box" aria-hidden="true" /> Crea prodotto
            </button>
            <button type="button" className="sib-btn sib-btn--ghost" onClick={() => navigate('crea-servizio')}>
              <i className="fa-duotone fa-gear" aria-hidden="true" /> Crea servizio
            </button>
          </div>
        </div>

        <div className="crea-preventivo__voci-wrap">
          <table className="crea-preventivo__voci">
            <thead>
              <tr>
                <th className="crea-preventivo__col-idx">#</th>
                <th>Descrizione</th>
                <th className="crea-preventivo__col-qta">Quantità</th>
                <th className="crea-preventivo__col-num">Prezzo unitario</th>
                <th className="crea-preventivo__col-num">Prezzo totale</th>
                <th className="crea-preventivo__col-del" />
              </tr>
            </thead>
            <tbody>
              {righe.map((r, i) => (
                <tr key={r.id}>
                  <td className="crea-preventivo__col-idx">{i + 1}</td>
                  <td>
                    <input
                      className="crea-preventivo__cell-input"
                      value={r.descrizione}
                      onChange={e => updRiga(r.id, { descrizione: e.target.value })}
                      placeholder="Descrizione voce"
                    />
                  </td>
                  <td className="crea-preventivo__col-qta">
                    <input
                      type="number" min={0} step={1}
                      className="crea-preventivo__cell-input crea-preventivo__cell-input--num"
                      value={r.quantita}
                      onChange={e => updRiga(r.id, { quantita: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </td>
                  <td className="crea-preventivo__col-num">
                    <div className="crea-preventivo__cell-money">
                      <input
                        type="number" min={0} step={0.01}
                        className="crea-preventivo__cell-input crea-preventivo__cell-input--num"
                        value={r.prezzoUnitario}
                        onChange={e => updRiga(r.id, { prezzoUnitario: Math.max(0, Number(e.target.value) || 0) })}
                      />
                      <span className="crea-preventivo__cell-cur">€</span>
                    </div>
                  </td>
                  <td className="crea-preventivo__col-num crea-preventivo__cell-total">
                    {eur(r.quantita * r.prezzoUnitario)}
                  </td>
                  <td className="crea-preventivo__col-del">
                    <button
                      type="button" className="crea-preventivo__row-del"
                      onClick={() => rmRiga(r.id)} disabled={righe.length === 1}
                      title="Elimina riga"
                    >
                      <i className="fa-solid fa-trash-can" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="sib-btn sib-btn--ghost crea-preventivo__add-row" onClick={() => addRiga()}>
          <i className="fa-regular fa-plus" aria-hidden="true" /> Aggiungi riga
        </button>

        {/* ── Riepilogo totali ──────────────────────────────────────── */}
        <div className="crea-preventivo__totali">
          <div className="crea-preventivo__totali-row">
            <span className="crea-preventivo__totali-label">Sub Totale</span>
            <span className="crea-preventivo__totali-val">{eur(subTotale)}</span>
          </div>
          <div className="crea-preventivo__totali-row">
            <span className="crea-preventivo__totali-label">
              IVA
              <input
                type="number" min={0} max={100} step={1}
                className="crea-preventivo__iva-input"
                value={ivaPct}
                onChange={e => setIvaPct(e.target.value)}
              />
              <span className="crea-preventivo__iva-pct">%</span>
            </span>
            <span className="crea-preventivo__totali-val">{eur(iva)}</span>
          </div>
          <div className="crea-preventivo__totali-row crea-preventivo__totali-row--grand">
            <span className="crea-preventivo__totali-label">Totale</span>
            <span className="crea-preventivo__totali-val">{eur(totale)}</span>
          </div>
        </div>
      </section>

      {/* ── Allegati, validità, note ─────────────────────────────────── */}
      <section className="crea-preventivo__section">
        <FormGrid cols={3}>
          <div className="crea-preventivo__field">
            <span className="crea-preventivo__label">Allega documentazione</span>
            <label className="crea-preventivo__file">
              <i className="fa-duotone fa-paperclip" aria-hidden="true" />
              <span className="crea-preventivo__file-name">{form.allegato || 'Inserisci file'}</span>
              <input
                type="file" className="crea-preventivo__file-input"
                onChange={e => set('allegato', e.target.files?.[0]?.name ?? '')}
              />
            </label>
          </div>
          <SelectField
            name="validita" label="Periodo validità"
            value={form.validita} onChange={e => set('validita', e.target.value)}
            options={VALIDITA}
          />
          <TextareaField
            name="note" label="Note"
            rows={2}
            value={form.note} onChange={e => set('note', e.target.value)}
            placeholder="Note per l'intestatario del preventivo"
            className="crea-preventivo__note"
          />
        </FormGrid>
      </section>

      <div className="crea-preventivo__actions">
        <button className="sib-btn sib-btn--secondary" onClick={() => navigate('i-miei-preventivi')} disabled={pending}>
          Annulla
        </button>
        <button className="sib-btn sib-btn--primary" onClick={() => persist(false)} disabled={pending}>
          <i className="fa-duotone fa-floppy-disk" aria-hidden="true" /> {pending ? 'Salvataggio…' : 'Salva'}
        </button>
        <button className="sib-btn sib-btn--primary" onClick={() => persist(true)} disabled={pending}>
          <i className="fa-duotone fa-paper-plane" aria-hidden="true" /> Invia preventivo
        </button>
      </div>
    </div>
  )
}
