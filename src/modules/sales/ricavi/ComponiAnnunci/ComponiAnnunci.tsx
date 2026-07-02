import React, { useEffect, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../../services/api'
import { SelectField, RadioGroup, InputField, DateRangeField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import './ComponiAnnunci.sass'

// ─── TIPI ─────────────────────────────────────────────────────────────────────
type Tipo = 'Vendita' | 'Acquisto'
type Tipologia = 'Struttura' | 'Categoria'
type StatoBacheca = 'In bozza' | 'Pubblicato'

interface Params {
  tipo: Tipo
  tipologia: Tipologia
  strutturaId: number | null
  categoria: string
  tipoOspiti: string
  tipologiaBase: string
  tipoLotti: string
  dataDa: string
  dataA: string
  tourOperator: string
  quantita: number
  quantitaMax: number
  tipologiaPagamento: string
  // Solo per Tipo = Acquisto
  citta: string
  categoriaLivello: string
  tipologiaCamere: string
}

interface RigaTariffa { id: number; stagionalita: string; tipologiaBase: string; lotto: string; quantita: string; prezzo: string }
interface RigaServizio { id: number; servizio: string; condizione: string; note: string }

interface Contratto {
  numero: string
  data: string
  tipo: Tipo
  struttura: string
  tourOperator: string
  periodo: string
  pagamento: string
  tariffe: RigaTariffa[]
  servizi: RigaServizio[]
}

interface RigaBacheca {
  id: number
  periodo: string
  tipologia: Tipo
  preferito: boolean
  quantita: string
  stato: StatoBacheca
  contratto?: Contratto
}

// ─── OPZIONI ────────────────────────────────────────────────────────────────
const STRUTTURE = [{ Id: 1, nome: "Grim's Hotel" }, { Id: 2, nome: 'Hotel Azzurro Mare' }]
const CATEGORIE = ['Hotel', 'Resort', 'B&B', 'Villaggio', 'Agriturismo', 'Boutique hotel']
const CITTA = ['Roma', 'Milano', 'Catania', 'Firenze', 'Napoli', 'Torino', 'Bologna', 'Venezia']
const LIVELLI = ['1', '2', '3', '4', '5']
const TIPOLOGIA_CAMERE = ['Singola Classic', 'Doppia Classic', 'Doppia Superior', 'Tripla Classic', 'Matrimoniale', 'Suite']
const STEPS = ['Tipo e ambito', 'Configurazione', 'Periodo e condizioni']
const TIPO_OSPITI = ['Individuali', 'Gruppi']
const TIPOLOGIA_BASE = ['Base doppia', 'Base singola', 'Base tripla']
const TIPO_LOTTI = ['Lotto', '1/2 Lotto']
const TOUR_OPERATOR = ['Tutti', 'TUI', 'Alpitour', 'Eden Viaggi', 'Veratour', 'Bluvacanze']
const PAGAMENTO = ['VCC', 'Bonifico']
const STAGIONI = ['Bassa stagione', 'Media stagione', 'Alta stagione']

const periodLabel = (da: string, a: string) => {
  const f = (iso: string) => { const [y, m] = iso.split('-'); return `${Number(m)}/${y}` }
  return da && a ? `${f(da)} - ${f(a)}` : ''
}

// ─── BACHECA seed ─────────────────────────────────────────────────────────────
const BACHECA_INIT: RigaBacheca[] = [
  { id: 1, periodo: '3/2026 - 6/2026',  tipologia: 'Vendita', preferito: true,  quantita: '1 Lotto',  stato: 'Pubblicato' },
  { id: 2, periodo: '2/2026 - 5/2026',  tipologia: 'Vendita', preferito: false, quantita: '1 Lotto',  stato: 'Pubblicato' },
  { id: 3, periodo: '11/2025 - 4/2026', tipologia: 'Acquisto', preferito: false, quantita: '6 Lotti', stato: 'In bozza'   },
  { id: 4, periodo: '12/2025 - 4/2026', tipologia: 'Vendita', preferito: false, quantita: '1 Lotto',  stato: 'In bozza'   },
  { id: 5, periodo: '11/2025 - 4/2026', tipologia: 'Vendita', preferito: false, quantita: '4 Lotti', stato: 'Pubblicato' },
]

export default function ComponiAnnunci({ navigate }: { navigate: (p: string) => void }) {
  const confirm = useConfirmStore((s) => s.confirm)

  const [params, setParams] = useState<Params>({
    tipo: 'Vendita', tipologia: 'Struttura', strutturaId: 1, categoria: 'Hotel',
    tipoOspiti: 'Gruppi', tipologiaBase: 'Base doppia', tipoLotti: 'Lotto',
    dataDa: '2026-07-01', dataA: '2026-10-31', tourOperator: 'Tutti',
    quantita: 1, quantitaMax: 1, tipologiaPagamento: 'VCC',
    citta: 'Roma', categoriaLivello: '5', tipologiaCamere: 'Singola Classic',
  })
  const set = <K extends keyof Params>(k: K, v: Params[K]) => setParams((p) => ({ ...p, [k]: v }))

  const [bacheca, setBacheca] = useState<RigaBacheca[]>(BACHECA_INIT)
  const [contratto, setContratto] = useState<Contratto | null>(null)
  const [editingBachecaId, setEditingBachecaId] = useState<number | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ bacheca: RigaBacheca[] }>('annunci/GetBacheca', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled && Array.isArray(d?.bacheca)) setBacheca(d.bacheca) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const generaContratto = (): Contratto => {
    const isAcquisto = params.tipo === 'Acquisto'
    const struttura = isAcquisto
      ? `${params.citta} · Categoria ${params.categoriaLivello}`
      : params.tipologia === 'Categoria'
        ? `Categoria: ${params.categoria}`
        : (STRUTTURE.find((s) => s.Id === params.strutturaId)?.nome ?? "Grim's Hotel")
    return {
      numero: 'CTR/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random() * 9000) + 1000),
      data: new Date().toLocaleDateString('it-IT'),
      tipo: params.tipo,
      struttura,
      tourOperator: isAcquisto ? '—' : params.tourOperator,
      periodo: periodLabel(params.dataDa, params.dataA),
      pagamento: isAcquisto ? '—' : params.tipologiaPagamento,
      tariffe: STAGIONI.map((s, i) => ({
        id: i + 1, stagionalita: s,
        tipologiaBase: params.tipoOspiti === 'Individuali' ? params.tipologiaCamere : params.tipologiaBase,
        lotto: isAcquisto ? '—' : params.tipoLotti, quantita: String(params.quantita), prezzo: '0,00',
      })),
      servizi: [
        { id: 1, servizio: 'Pernottamento', condizione: 'Incluso', note: '' },
        { id: 2, servizio: 'Prima colazione', condizione: 'Incluso', note: '' },
        { id: 3, servizio: 'Tassa di soggiorno', condizione: 'Escluso', note: 'A carico ospite' },
      ],
    }
  }

  const genera = () => { setEditingBachecaId(null); setContratto(generaContratto()) }
  const chiudiContratto = () => { setContratto(null); setEditingBachecaId(null) }

  const updTariffa = (id: number, field: keyof RigaTariffa, v: string) =>
    setContratto((c) => c && ({ ...c, tariffe: c.tariffe.map((r) => r.id === id ? { ...r, [field]: v } : r) }))
  const updServizio = (id: number, field: keyof RigaServizio, v: string) =>
    setContratto((c) => c && ({ ...c, servizi: c.servizi.map((r) => r.id === id ? { ...r, [field]: v } : r) }))

  const salvaInBacheca = () => {
    if (!contratto) return
    const riga: Omit<RigaBacheca, 'id'> = {
      periodo: contratto.periodo || periodLabel(params.dataDa, params.dataA),
      tipologia: contratto.tipo,
      preferito: false,
      quantita: `${params.quantita} ${params.quantita === 1 ? 'Lotto' : 'Lotti'}`,
      stato: 'In bozza',
      contratto,
    }
    setBacheca((prev) => {
      if (editingBachecaId != null) return prev.map((b) => b.id === editingBachecaId ? { ...b, ...riga, id: b.id } : b)
      const id = Math.max(0, ...prev.map((b) => b.id)) + 1
      return [{ id, ...riga }, ...prev]
    })
    setContratto(null)
    setEditingBachecaId(null)
  }

  const apriContratto = (b: RigaBacheca) => {
    setEditingBachecaId(b.id)
    setContratto(b.contratto ?? {
      numero: `CTR/${b.periodo}`, data: new Date().toLocaleDateString('it-IT'), tipo: b.tipologia,
      struttura: STRUTTURE.find((s) => s.Id === params.strutturaId)?.nome ?? "Grim's Hotel",
      tourOperator: params.tourOperator, periodo: b.periodo, pagamento: params.tipologiaPagamento,
      tariffe: [{ id: 1, stagionalita: 'Stagione', tipologiaBase: params.tipologiaBase, lotto: params.tipoLotti, quantita: b.quantita, prezzo: '0,00' }],
      servizi: [{ id: 1, servizio: 'Pernottamento', condizione: 'Incluso', note: '' }],
    })
  }

  const toggleStar = (id: number) =>
    setBacheca((prev) => prev.map((b) => b.id === id ? { ...b, preferito: !b.preferito } : b))

  const pubblica = (id: number) =>
    setBacheca((prev) => prev.map((b) => b.id === id ? { ...b, stato: 'Pubblicato' } : b))

  const eliminaBacheca = async (id: number) => {
    if (await confirm({ title: 'Elimina annuncio', message: 'Eliminare questo annuncio dalla bacheca?', confirmLabel: 'Elimina', danger: true })) {
      setBacheca((prev) => prev.filter((b) => b.id !== id))
      if (editingBachecaId === id) chiudiContratto()
    }
  }

  return (
    <div className="ca">
      <BtnBack />
      <PageHeader title="Componi annunci" subtitle="Configura i parametri, genera il contratto, modificalo e pubblicalo in Agorà." />

      {/* ── Riga superiore: parametri (40%) + bacheca (60%) ───────────────── */}
      <div className="ca-top">
        <section className="ca-setup">
          <div className="ca-setup__head"><i className="fa-light fa-sliders" /> Parametri annuncio</div>

          <div className="ca-steps">
            {STEPS.map((label, i) => (
              <button key={i} type="button" className={`ca-step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`} onClick={() => setStep(i)}>
                <span className="ca-step__num">{i < step ? <i className="fa-light fa-check" /> : i + 1}</span>
                <span className="ca-step__label">{label}</span>
              </button>
            ))}
          </div>

          <div className="ca-setup__grid">
            {step === 0 && (
              <>
                <RadioGroup label="Tipo" name="tipo" value={params.tipo} onChange={(v) => set('tipo', v as Tipo)}
                  options={[{ value: 'Vendita', label: 'Vendita' }, { value: 'Acquisto', label: 'Acquisto' }]} />
                <RadioGroup label="Tipologia" name="tipologia" value={params.tipologia} onChange={(v) => set('tipologia', v as Tipologia)}
                  options={[{ value: 'Struttura', label: 'Struttura' }, { value: 'Categoria', label: 'Categoria' }]} />
                {params.tipo === 'Acquisto' ? (
                  <>
                    <SelectField label="Città" name="citta" value={params.citta} onChange={(e) => set('citta', e.target.value)}
                      options={CITTA.map((c) => ({ value: c, label: c }))} />
                    <SelectField label="Categoria" name="categoriaLivello" value={params.categoriaLivello} onChange={(e) => set('categoriaLivello', e.target.value)}
                      options={LIVELLI.map((c) => ({ value: c, label: c }))} />
                  </>
                ) : params.tipologia === 'Categoria' ? (
                  <SelectField label="Categoria" name="categoria" value={params.categoria} onChange={(e) => set('categoria', e.target.value)}
                    options={CATEGORIE.map((c) => ({ value: c, label: c }))} />
                ) : (
                  <SelectField label="Struttura" name="struttura" value={params.strutturaId ?? ''}
                    onChange={(e) => set('strutturaId', e.target.value ? Number(e.target.value) : null)}
                    options={STRUTTURE.map((s) => ({ value: s.Id, label: s.nome }))} />
                )}
              </>
            )}

            {step === 1 && (
              <>
                <SelectField label={params.tipo === 'Acquisto' ? 'Tipologia' : 'Tipo ospiti'} name="tipoOspiti"
                  value={params.tipoOspiti} onChange={(e) => set('tipoOspiti', e.target.value)}
                  options={TIPO_OSPITI.map((o) => ({ value: o, label: o }))} />
                {params.tipoOspiti === 'Gruppi' ? (
                  <SelectField label="Tipologia base" name="tipologiaBase" value={params.tipologiaBase} onChange={(e) => set('tipologiaBase', e.target.value)}
                    options={TIPOLOGIA_BASE.map((o) => ({ value: o, label: o }))} />
                ) : (
                  <SelectField label="Tipologia Camere" name="tipologiaCamere" value={params.tipologiaCamere} onChange={(e) => set('tipologiaCamere', e.target.value)}
                    options={TIPOLOGIA_CAMERE.map((o) => ({ value: o, label: o }))} />
                )}
                {params.tipo !== 'Acquisto' && (
                  <SelectField label="Tipo lotti" name="tipoLotti" value={params.tipoLotti} onChange={(e) => set('tipoLotti', e.target.value)}
                    options={TIPO_LOTTI.map((o) => ({ value: o, label: o }))} />
                )}
              </>
            )}

            {step === 2 && (
              <>
                <DateRangeField label="Data" nameFrom="dataDa" nameTo="dataA" className="ca-field--wide"
                  valueFrom={params.dataDa} valueTo={params.dataA}
                  onChangeFrom={(e) => set('dataDa', e.target.value)} onChangeTo={(e) => set('dataA', e.target.value)} />
                <InputField label="Quantità" name="quantita" type="number" value={params.quantita} onChange={(e) => set('quantita', Number(e.target.value) || 0)} />
                {params.tipo !== 'Acquisto' && (
                  <>
                    <InputField label="Quantità Massima" name="quantitaMax" type="number" value={params.quantitaMax} onChange={(e) => set('quantitaMax', Number(e.target.value) || 0)} />
                    <SelectField label="Tour operator" name="tourOperator" value={params.tourOperator} onChange={(e) => set('tourOperator', e.target.value)}
                      options={TOUR_OPERATOR.map((o) => ({ value: o, label: o }))} />
                    <SelectField label="Tipologia Pagamento" name="tipologiaPagamento" value={params.tipologiaPagamento} onChange={(e) => set('tipologiaPagamento', e.target.value)}
                      options={PAGAMENTO.map((o) => ({ value: o, label: o }))} />
                  </>
                )}
              </>
            )}
          </div>

          <div className="ca-setup__foot">
            <button type="button" className="sib-btn sib-btn--secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <i className="fa-light fa-arrow-left" /> Indietro
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
                Avanti <i className="fa-light fa-arrow-right" />
              </button>
            ) : (
              <button type="button" className="sib-btn sib-btn--primary" onClick={genera}>
                <i className="fa-light fa-file-contract" /> Genera contratto
              </button>
            )}
          </div>
        </section>

        <aside className="ca-board">
          <div className="ca-board__head">
            <span className="ca-board__title"><i className="fa-light fa-clipboard-list" /> La mia bacheca</span>
            <span className="ca-board__count">{bacheca.length}</span>
          </div>
          <div className="ca-board__list">
            {bacheca.length === 0 ? (
              <div className="ca-board__empty">Nessun annuncio in bacheca.</div>
            ) : bacheca.map((b) => (
              <article key={b.id} className={`ca-item ${editingBachecaId === b.id ? 'ca-item--active' : ''}`}>
                <span className={`ca-item__pin ca-item__pin--${b.tipologia.toLowerCase()}`} aria-hidden="true" />
                <button type="button" className="ca-item__open" onClick={() => apriContratto(b)} title="Apri e modifica il contratto">
                  <span className={`ca-chip ca-chip--${b.tipologia.toLowerCase()}`}>{b.tipologia}</span>
                  <span className="ca-item__period"><i className="fa-light fa-calendar-range" /> {b.periodo}</span>
                  <span className="ca-item__qty"><i className="fa-light fa-cubes" /> {b.quantita}</span>
                </button>
                <span className={`ca-badge ca-badge--${b.stato === 'Pubblicato' ? 'pub' : 'draft'}`}>
                  <i className={`fa-solid ${b.stato === 'Pubblicato' ? 'fa-circle-check' : 'fa-pen-ruler'}`} /> {b.stato}
                </span>
                <span className="ca-item__actions">
                  <button type="button" className="ca-item__act" title="Preferito" onClick={() => toggleStar(b.id)}>
                    <i className={`${b.preferito ? 'fa-solid ca-item__star--on' : 'fa-light'} fa-star`} />
                  </button>
                  <button type="button" className="ca-item__act" title="Modifica contratto" onClick={() => apriContratto(b)}>
                    <i className="fa-light fa-file-pen" />
                  </button>
                  <button type="button" className="ca-item__act ca-item__act--danger" title="Elimina" onClick={() => eliminaBacheca(b.id)}>
                    <i className="fa-light fa-trash" />
                  </button>
                  {b.stato !== 'Pubblicato' && (
                    <button type="button" className="ca-item__act ca-item__act--publish" title="Pubblica in Agorà" onClick={() => pubblica(b.id)}>
                      <i className="fa-solid fa-paper-plane" />
                    </button>
                  )}
                </span>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Editor del contratto (a tutta larghezza, sotto) ───────────────── */}
      {contratto ? (
        <ContrattoPreview
          contratto={contratto}
          onUpdTariffa={updTariffa}
          onUpdServizio={updServizio}
          onSalva={salvaInBacheca}
          onChiudi={chiudiContratto}
          isEditing={editingBachecaId != null}
        />
      ) : (
        <div className="ca-hint">
          <i className="fa-light fa-file-pen" />
          <span>Completa i parametri e premi <strong>Genera contratto</strong>, oppure apri un annuncio dalla bacheca: l'editor del documento si aprirà qui, a tutta larghezza.</span>
        </div>
      )}
    </div>
  )
}

// ─── ANTEPRIMA CONTRATTO (Doc editabile) ────────────────────────────────────────
function ContrattoPreview({ contratto, onUpdTariffa, onUpdServizio, onSalva, onChiudi, isEditing }: {
  contratto: Contratto
  onUpdTariffa: (id: number, field: keyof RigaTariffa, v: string) => void
  onUpdServizio: (id: number, field: keyof RigaServizio, v: string) => void
  onSalva: () => void
  onChiudi: () => void
  isEditing: boolean
}) {
  return (
    <div className="ca-contract">
      <div className="ca-contract__toolbar">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onChiudi}><i className="fa-light fa-xmark" /> Chiudi</button>
        <div className="ca-contract__toolbar-right">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}><i className="fa-light fa-print" /> Stampa</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onSalva}>
            <i className="fa-light fa-floppy-disk" /> {isEditing ? 'Salva modifiche' : 'Salva nella bacheca'}
          </button>
        </div>
      </div>

      <div className="ca-sheet">
        <header className="ca-sheet__head">
          <div>
            <div className="ca-sheet__kicker">Contratto di {contratto.tipo.toLowerCase()}</div>
            <div className="ca-sheet__struttura">{contratto.struttura}</div>
          </div>
          <div className="ca-sheet__meta">
            <div><span>Numero</span><strong>{contratto.numero}</strong></div>
            <div><span>Data</span><strong>{contratto.data}</strong></div>
          </div>
        </header>

        <section className="ca-sheet__parties">
          <div className="ca-sheet__party"><span>Tour operator</span><strong>{contratto.tourOperator}</strong></div>
          <div className="ca-sheet__party"><span>Periodo</span><strong>{contratto.periodo || '—'}</strong></div>
          <div className="ca-sheet__party"><span>Pagamento</span><strong>{contratto.pagamento}</strong></div>
        </section>

        <div className="ca-sheet__section-head">
          <h4>Condizioni economiche</h4>
          <span className="ca-sheet__editable"><i className="fa-light fa-pen" /> Tabella editabile</span>
        </div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead>
              <tr><th>Stagionalità</th><th>Tipologia base</th><th>Lotto</th><th>Quantità</th><th>Prezzo (€)</th></tr>
            </thead>
            <tbody>
              {contratto.tariffe.map((r) => (
                <tr key={r.id}>
                  <td><EditCell value={r.stagionalita}  onChange={(v) => onUpdTariffa(r.id, 'stagionalita', v)} /></td>
                  <td><EditCell value={r.tipologiaBase} onChange={(v) => onUpdTariffa(r.id, 'tipologiaBase', v)} /></td>
                  <td><EditCell value={r.lotto}         onChange={(v) => onUpdTariffa(r.id, 'lotto', v)} /></td>
                  <td><EditCell value={r.quantita}      onChange={(v) => onUpdTariffa(r.id, 'quantita', v)} /></td>
                  <td><EditCell value={r.prezzo}        onChange={(v) => onUpdTariffa(r.id, 'prezzo', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ca-sheet__section-head">
          <h4>Servizi e condizioni</h4>
          <span className="ca-sheet__editable"><i className="fa-light fa-pen" /> Tabella editabile</span>
        </div>
        <div className="sib-table-wrap">
          <table className="sib-table ca-sheet__table">
            <thead>
              <tr><th>Servizio</th><th>Condizione</th><th>Note</th></tr>
            </thead>
            <tbody>
              {contratto.servizi.map((r) => (
                <tr key={r.id}>
                  <td><EditCell value={r.servizio}   onChange={(v) => onUpdServizio(r.id, 'servizio', v)} /></td>
                  <td><EditCell value={r.condizione} onChange={(v) => onUpdServizio(r.id, 'condizione', v)} /></td>
                  <td><EditCell value={r.note}       onChange={(v) => onUpdServizio(r.id, 'note', v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="ca-sheet__clausola">
          Il presente contratto disciplina la {contratto.tipo.toLowerCase()} dei lotti secondo le condizioni sopra riportate.
          Le parti si impegnano al rispetto dei termini di pagamento ({contratto.pagamento}) e delle quantità concordate.
        </p>
      </div>
    </div>
  )
}

// ─── EDIT CELL ────────────────────────────────────────────────────────────────
function EditCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="sib-input ca-edit-input"
        defaultValue={value}
        onBlur={(e) => { onChange(e.target.value); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onChange((e.target as HTMLInputElement).value); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <span className="ca-edit-cell" onClick={() => setEditing(true)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}>
      <span>{value || '—'}</span>
      <i className="fa-light fa-pen ca-edit-cell__ico" />
    </span>
  )
}
