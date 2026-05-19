import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { InputField, SelectField, CheckboxField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Assegna obiettivo — replica `Views/HumanResource/AssegnaObiettivo.cshtml`.
 * BE: `PremioPerformanceController.SaveObiettivo` → catch-all
 * `/Sibylla/premio-performance/SaveObiettivo`.
 */

interface ObiettivoItem {
  id?: number
  nome?: string
  reparto?: string
  tipologia?: string
  [key: string]: unknown
}

const FALLBACK: ObiettivoItem[] = [
  { id: 1, nome: 'Obiettivo 2024 Reparto Pulizie',         reparto: 'Housekeeping',     tipologia: 'reparto' },
  { id: 2, nome: 'Obiettivo 2024 Reparto Manutenzione',    reparto: 'Manutenzione',     tipologia: 'reparto' },
  { id: 3, nome: 'Obiettivo 2024 Reparto Amministrazione', reparto: 'Amministrazione',  tipologia: 'reparto' },
  { id: 4, nome: 'Obiettivo 2024 Front Office',            reparto: 'Front office',     tipologia: 'reparto' },
]

const REPARTI = ['General Manager', 'Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Amministrazione', 'Marketing', 'Direzione']
const PERCENTUALI = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%']
const PREMI = ['Buono Amazon 50€', 'Buono Amazon 100€', 'Bonus 1 giorno ferie', 'Bonus 2 giorni ferie', 'Cena per 2 persone', 'Weekend SPA']

type TipologiaT = 'reparto' | 'individuale'
type ParametroT = 'percentuale' | 'numerico'

interface Traguardo {
  abilitato: boolean
  data: string
  premio: string
}

const TRAGUARDI_DEFAULT: Record<string, Traguardo> = {
  t1:    { abilitato: false, data: '2026-04-29 / 2026-05-09', premio: '' },
  t2:    { abilitato: false, data: '2026-04-29 / 2026-05-09', premio: '' },
  t3:    { abilitato: false, data: '2026-04-29 / 2026-05-09', premio: '' },
  t4:    { abilitato: false, data: '2026-04-29 / 2026-05-09', premio: '' },
  finale:{ abilitato: false, data: '2026-04-29 / 2026-05-09', premio: '' },
}

export default function AssegnaObiettivo({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<ObiettivoItem[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [nome, setNome] = useState('Premio produzione')
  const [tipologia, setTipologia] = useState<TipologiaT>('reparto')
  const [reparto, setReparto] = useState('General Manager')
  const [vendita, setVendita] = useState({ prodotti: false, servizi: true, soggiorni: false, esperienze: false })
  const [parametro, setParametro] = useState<ParametroT>('percentuale')
  const [percentuale, setPercentuale] = useState('40%')
  const [data, setData] = useState('2026-04-29 / 2026-05-09')
  const [frammenta, setFrammenta] = useState(true)
  const [traguardi, setTraguardi] = useState<Record<string, Traguardo>>(TRAGUARDI_DEFAULT)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<ObiettivoItem[]>('premio-performance/GetObiettivi', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { setItems(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [])

  const setTraguardo = (k: string, patch: Partial<Traguardo>) =>
    setTraguardi((t) => ({ ...t, [k]: { ...t[k], ...patch } }))

  async function handleSave() {
    if (!nome.trim()) { setError('Nome obiettivo obbligatorio'); return }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla('premio-performance/SaveObiettivo', {
        method: 'POST',
        body: { nome, tipologia, reparto, vendita, parametro, percentuale, data, frammenta, traguardi },
      })
      navigate('home')
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Assegna obiettivo" />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio.</AlertBanner>
      )}

      {/* Lista obiettivi esistenti */}
      <div className="bg-white border border-line rounded-field overflow-hidden mb-6">
        {items.map((o, i) => (
          <div
            key={o.id}
            className={`flex items-center justify-between px-4 py-2.5 text-[13px] ${i < items.length - 1 ? 'border-b border-line' : ''}`}
          >
            <span>{o.nome}</span>
            <div className="flex items-center gap-4">
              <button className="sib-btn sib-btn--ghost text-[12px]">
                Modifica <i className="fa-duotone fa-pen-to-square ml-1" />
              </button>
              <button className="sib-btn sib-btn--ghost text-[12px] text-error">
                Elimina <i className="fa-duotone fa-trash ml-1" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form a SX */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField name="nome" label="Nome obiettivo" value={nome} onChange={(e) => setNome(e.target.value)} />

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold font-opensans text-ink">Tipologia</label>
              <div className="flex items-center gap-4 h-9">
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="tipologia" checked={tipologia === 'reparto'}     onChange={() => setTipologia('reparto')} />
                  Reparto
                </label>
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="tipologia" checked={tipologia === 'individuale'} onChange={() => setTipologia('individuale')} />
                  Individuale
                </label>
              </div>
            </div>

            <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)}
              options={REPARTI.map((r) => ({ value: r, label: r }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold font-opensans text-ink">Tipologia vendita</label>
              <div className="flex items-center gap-3 h-9 flex-wrap">
                <CheckboxField name="prodotti"  label="Prodotti"   checked={vendita.prodotti}  onChange={(e) => setVendita((v) => ({ ...v, prodotti: e.target.checked }))} />
                <CheckboxField name="servizi"   label="Servizi"    checked={vendita.servizi}   onChange={(e) => setVendita((v) => ({ ...v, servizi: e.target.checked }))} />
                <CheckboxField name="soggiorni" label="Soggiorni"  checked={vendita.soggiorni} onChange={(e) => setVendita((v) => ({ ...v, soggiorni: e.target.checked }))} />
                <CheckboxField name="esperienze" label="Esperienze" checked={vendita.esperienze} onChange={(e) => setVendita((v) => ({ ...v, esperienze: e.target.checked }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold font-opensans text-ink">Parametro valutazione</label>
              <div className="flex items-center gap-4 h-9">
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="parametro" checked={parametro === 'percentuale'} onChange={() => setParametro('percentuale')} />
                  Percentuale
                </label>
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="parametro" checked={parametro === 'numerico'}    onChange={() => setParametro('numerico')} />
                  Numerico
                </label>
              </div>
            </div>

            <SelectField name="percentuale" label="Percentuale" value={percentuale} onChange={(e) => setPercentuale(e.target.value)}
              options={PERCENTUALI.map((p) => ({ value: p, label: p }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <InputField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} placeholder="29/04/2026 a 09/05/2026" />
            <div className="h-9 flex items-center">
              <CheckboxField name="frammenta" label="Frammenta obiettivo" checked={frammenta} onChange={(e) => setFrammenta(e.target.checked)} />
            </div>
          </div>
        </div>

        {/* Premi e traguardi a DX */}
        <div>
          <h3 className="text-[16px] font-bold font-poppins text-ink mb-4">Definisci premi e intervallo traguardi</h3>

          <TraguardoRow label="Traguardo 1"     trofei={1}      data={traguardi.t1}     premiOpts={PREMI} onChange={(p) => setTraguardo('t1', p)}     dataLabel="Data" />
          <TraguardoRow label="Traguardo 2"     trofei={2}      data={traguardi.t2}     premiOpts={PREMI} onChange={(p) => setTraguardo('t2', p)}     dataLabel="Data fine" />
          <TraguardoRow label="Traguardo 3"     trofei={3}      data={traguardi.t3}     premiOpts={PREMI} onChange={(p) => setTraguardo('t3', p)}     dataLabel="Data fine" />
          <TraguardoRow label="Traguardo 4"     trofei={'star'} data={traguardi.t4}     premiOpts={PREMI} onChange={(p) => setTraguardo('t4', p)}     dataLabel="Data fine" />
          <TraguardoRow label="Traguardo finale" trofei={'party'} data={traguardi.finale} premiOpts={PREMI} onChange={(p) => setTraguardo('finale', p)} dataLabel="Data fine" />
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Assegna obiettivo'}
        </button>
      </div>
    </div>
  )
}

function TraguardoRow({
  label, trofei, data, premiOpts, onChange, dataLabel,
}: {
  label: string
  trofei: number | 'star' | 'party'
  data: Traguardo
  premiOpts: string[]
  onChange: (p: Partial<Traguardo>) => void
  dataLabel: string
}) {
  return (
    <div className="grid grid-cols-[180px_1fr_1fr] gap-4 items-end mb-4">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold font-opensans text-ink">{label}</label>
        <div className="flex items-center gap-2 h-9">
          <input type="checkbox" className="sib-checkbox" checked={data.abilitato} onChange={(e) => onChange({ abilitato: e.target.checked })} />
          <TrofeiVisual trofei={trofei} />
        </div>
      </div>
      <InputField name={`data-${label}`}   label={dataLabel}        value={data.data}   onChange={(e) => onChange({ data: e.target.value })} />
      <SelectField name={`premio-${label}`} label="Premio associato" value={data.premio} onChange={(e) => onChange({ premio: e.target.value })}
        options={[{ value: '', label: 'Seleziona Premio' }, ...premiOpts.map((p) => ({ value: p, label: p }))]}
      />
    </div>
  )
}

function TrofeiVisual({ trofei }: { trofei: number | 'star' | 'party' }) {
  if (trofei === 'star') {
    return (
      <span className="inline-flex items-center gap-1">
        <i className="fa-solid fa-star text-warning text-[18px]" />
        <i className="fa-solid fa-trophy text-primary text-[18px]" />
      </span>
    )
  }
  if (trofei === 'party') {
    return <i className="fa-solid fa-party-horn text-warning text-[20px]" />
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: trofei }).map((_, i) => (
        <i key={i} className="fa-solid fa-trophy text-primary text-[16px]" />
      ))}
    </span>
  )
}
