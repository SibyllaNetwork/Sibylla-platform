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
  tipoOspiti: string
  tipologiaBase: string
  tipoLotti: string
  dataDa: string
  dataA: string
  tourOperator: string
  quantita: number
  quantitaMax: number
  tipologiaPagamento: string
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
const TIPO_OSPITI = ['Individuali', 'Gruppi']
const TIPOLOGIA_BASE = ['Base doppia', 'Base singola', 'Base tripla']
const TIPO_LOTTI = ['Lotto', '1/2 Lotto']
const TOUR_OPERATOR = ['Tutti', 'TUI', 'Alpitour', 'Eden Viaggi', 'Veratour', 'Bluvacanze']
const PAGAMENTO = ['VCC', 'Bonifico bancario', 'Carta di credito', 'Rimessa diretta']
const STAGIONI = ['Bassa stagione', 'Media stagione', 'Alta stagione']

const periodLabel = (da: string, a: string) => {
  const f = (iso: string) => { const [y, m] = iso.split('-'); return `${Number(m)}/${y}` }
  return da && a ? `${f(da)} - ${f(a)}` : ''
}

// ─── BACHECA seed ─────────────────────────────────────────────────────────────
const BACHECA_INIT: RigaBacheca[] = [
  { id: 1, periodo: '3/2026 - 6/2026',  tipologia: 'Vendita', preferito: true,  quantita: '1 Lotti', stato: 'Pubblicato' },
  { id: 2, periodo: '3/2026 - 6/2026',  tipologia: 'Vendita', preferito: false, quantita: '1 Lotti', stato: 'Pubblicato' },
  { id: 3, periodo: '2/2026 - 5/2026',  tipologia: 'Vendita', preferito: false, quantita: '1 Lotti', stato: 'Pubblicato' },
  { id: 4, periodo: '11/2025 - 4/2026', tipologia: 'Vendita', preferito: false, quantita: '1 Lotti', stato: 'Pubblicato' },
  { id: 5, periodo: '11/2025 - 4/2026', tipologia: 'Vendita', preferito: false, quantita: '6 Lotti', stato: 'Pubblicato' },
  { id: 6, periodo: '12/2025 - 4/2026', tipologia: 'Vendita', preferito: false, quantita: '1 Lotti', stato: 'Pubblicato' },
]

export default function ComponiAnnunci({ navigate }: { navigate: (p: string) => void }) {
  const confirm = useConfirmStore((s) => s.confirm)

  const [params, setParams] = useState<Params>({
    tipo: 'Vendita', tipologia: 'Struttura', strutturaId: 1,
    tipoOspiti: 'Gruppi', tipologiaBase: 'Base doppia', tipoLotti: 'Lotto',
    dataDa: '2026-07-01', dataA: '2026-10-31', tourOperator: 'Tutti',
    quantita: 1, quantitaMax: 1, tipologiaPagamento: 'VCC',
  })
  const set = <K extends keyof Params>(k: K, v: Params[K]) => setParams((p) => ({ ...p, [k]: v }))

  const [bacheca, setBacheca] = useState<RigaBacheca[]>(BACHECA_INIT)
  const [contratto, setContratto] = useState<Contratto | null>(null)
  // id della riga di bacheca in editing (null = nuovo contratto non ancora salvato)
  const [editingBachecaId, setEditingBachecaId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ bacheca: RigaBacheca[] }>('annunci/GetBacheca', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled && Array.isArray(d?.bacheca)) setBacheca(d.bacheca) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Genera il contratto (bozza) a partire dai parametri.
  const generaContratto = (): Contratto => {
    const struttura = STRUTTURE.find((s) => s.Id === params.strutturaId)?.nome ?? "Grim's Hotel"
    return {
      numero: 'CTR/' + new Date().getFullYear() + '/' + String(Math.floor(Math.random() * 9000) + 1000),
      data: new Date().toLocaleDateString('it-IT'),
      tipo: params.tipo,
      struttura,
      tourOperator: params.tourOperator,
      periodo: periodLabel(params.dataDa, params.dataA),
      pagamento: params.tipologiaPagamento,
      tariffe: STAGIONI.map((s, i) => ({
        id: i + 1, stagionalita: s, tipologiaBase: params.tipologiaBase,
        lotto: params.tipoLotti, quantita: String(params.quantita), prezzo: '0,00',
      })),
      servizi: [
        { id: 1, servizio: 'Pernottamento', condizione: 'Incluso', note: '' },
        { id: 2, servizio: 'Prima colazione', condizione: 'Incluso', note: '' },
        { id: 3, servizio: 'Tassa di soggiorno', condizione: 'Escluso', note: 'A carico ospite' },
      ],
    }
  }

  const avanti = () => { setEditingBachecaId(null); setContratto(generaContratto()) }
  const annullaContratto = () => { setContratto(null); setEditingBachecaId(null) }

  const updTariffa = (id: number, field: keyof RigaTariffa, v: string) =>
    setContratto((c) => c && ({ ...c, tariffe: c.tariffe.map((r) => r.id === id ? { ...r, [field]: v } : r) }))
  const updServizio = (id: number, field: keyof RigaServizio, v: string) =>
    setContratto((c) => c && ({ ...c, servizi: c.servizi.map((r) => r.id === id ? { ...r, [field]: v } : r) }))

  // Salva il contratto nella bacheca come Bozza (o aggiorna quello in editing).
  const salvaInBacheca = () => {
    if (!contratto) return
    const riga: Omit<RigaBacheca, 'id'> = {
      periodo: contratto.periodo || periodLabel(params.dataDa, params.dataA),
      tipologia: contratto.tipo,
      preferito: false,
      quantita: `${params.quantita} Lotti`,
      stato: 'In bozza',
      contratto,
    }
    setBacheca((prev) => {
      if (editingBachecaId != null) {
        return prev.map((b) => b.id === editingBachecaId ? { ...b, ...riga, id: b.id } : b)
      }
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

  const pubblica = (id: number) => {
    // Pubblicazione in Agorà: la riga passa a stato Pubblicato (visibile nel marketplace).
    setBacheca((prev) => prev.map((b) => b.id === id ? { ...b, stato: 'Pubblicato' } : b))
  }

  const eliminaBacheca = async (id: number) => {
    if (await confirm({ title: 'Elimina annuncio', message: "Eliminare questo annuncio dalla bacheca?", confirmLabel: 'Elimina', danger: true })) {
      setBacheca((prev) => prev.filter((b) => b.id !== id))
    }
  }

  return (
    <div className="componi-annunci">
      <BtnBack />
      <PageHeader title="Componi annunci" />

      <div className="componi-annunci__layout">
        {/* ─── Colonna sinistra: parametri + contenuto ───────────────────── */}
        <div className="componi-annunci__left">
          <div className="componi-annunci__filters">
            <RadioGroup label="Tipo" name="tipo" value={params.tipo} onChange={(v) => set('tipo', v as Tipo)}
              options={[{ value: 'Vendita', label: 'Vendita' }, { value: 'Acquisto', label: 'Acquisto' }]} />
            <RadioGroup label="Tipologia" name="tipologia" value={params.tipologia} onChange={(v) => set('tipologia', v as Tipologia)}
              options={[{ value: 'Struttura', label: 'Struttura' }, { value: 'Categoria', label: 'Categoria' }]} />
            <SelectField label="Struttura" name="struttura" className="componi-annunci__f"
              value={params.strutturaId ?? ''} onChange={(e) => set('strutturaId', e.target.value ? Number(e.target.value) : null)}
              options={STRUTTURE.map((s) => ({ value: s.Id, label: s.nome }))} />
            <SelectField label="Tipo ospiti" name="tipoOspiti" className="componi-annunci__f"
              value={params.tipoOspiti} onChange={(e) => set('tipoOspiti', e.target.value)}
              options={TIPO_OSPITI.map((o) => ({ value: o, label: o }))} />
            <SelectField label="Tipologia base" name="tipologiaBase" className="componi-annunci__f"
              value={params.tipologiaBase} onChange={(e) => set('tipologiaBase', e.target.value)}
              options={TIPOLOGIA_BASE.map((o) => ({ value: o, label: o }))} />
            <SelectField label="Tipo lotti" name="tipoLotti" className="componi-annunci__f"
              value={params.tipoLotti} onChange={(e) => set('tipoLotti', e.target.value)}
              options={TIPO_LOTTI.map((o) => ({ value: o, label: o }))} />
            <button type="button" className="sib-btn sib-btn--primary componi-annunci__avanti" onClick={avanti}>Avanti</button>
          </div>

          <div className="componi-annunci__filters">
            <DateRangeField label="Data" nameFrom="dataDa" nameTo="dataA"
              valueFrom={params.dataDa} valueTo={params.dataA}
              onChangeFrom={(e) => set('dataDa', e.target.value)} onChangeTo={(e) => set('dataA', e.target.value)} />
            <SelectField label="Tour operator" name="tourOperator" className="componi-annunci__f"
              value={params.tourOperator} onChange={(e) => set('tourOperator', e.target.value)}
              options={TOUR_OPERATOR.map((o) => ({ value: o, label: o }))} />
            <InputField label="Quantità" name="quantita" type="number" className="componi-annunci__f-num"
              value={params.quantita} onChange={(e) => set('quantita', Number(e.target.value) || 0)} />
            <InputField label="Quantità Massima" name="quantitaMax" type="number" className="componi-annunci__f-num"
              value={params.quantitaMax} onChange={(e) => set('quantitaMax', Number(e.target.value) || 0)} />
            <SelectField label="Tipologia Pagamento" name="tipologiaPagamento" className="componi-annunci__f"
              value={params.tipologiaPagamento} onChange={(e) => set('tipologiaPagamento', e.target.value)}
              options={PAGAMENTO.map((o) => ({ value: o, label: o }))} />
          </div>

          {/* Contenuto: messaggio o anteprima contratto */}
          {!contratto ? (
            <div className="componi-annunci__hint">
              <h2>Imposta la tipologia di annuncio per generare automaticamente opportunità di business.</h2>
            </div>
          ) : (
            <ContrattoPreview
              contratto={contratto}
              onUpdTariffa={updTariffa}
              onUpdServizio={updServizio}
              onSalva={salvaInBacheca}
              onAnnulla={annullaContratto}
              isEditing={editingBachecaId != null}
            />
          )}
        </div>

        {/* ─── Colonna destra: La mia bacheca ────────────────────────────── */}
        <div className="componi-annunci__bacheca">
          <h3 className="componi-annunci__bacheca-title">La mia bacheca</h3>
          <div className="sib-table-wrap componi-annunci__bacheca-wrap">
            <table className="sib-table componi-annunci__table">
              <thead>
                <tr>
                  <th>Periodo</th><th>Tipologia</th><th>Quantità</th>
                  <th className="componi-annunci__td-c">Contratto</th>
                  <th className="componi-annunci__td-c">Elimina</th>
                  <th className="componi-annunci__td-c">Pubblica</th>
                </tr>
              </thead>
              <tbody>
                {bacheca.length === 0 ? (
                  <tr><td colSpan={6} className="sib-empty">Nessun annuncio in bacheca.</td></tr>
                ) : bacheca.map((b) => (
                  <tr key={b.id}>
                    <td className="componi-annunci__periodo"><i className="fa-light fa-paperclip" /> {b.periodo}</td>
                    <td>
                      <span className="componi-annunci__tipologia">{b.tipologia}</span>
                      <button type="button" className="componi-annunci__star-btn" onClick={() => toggleStar(b.id)} aria-label="Preferito">
                        <i className={`${b.preferito ? 'fa-solid' : 'fa-light'} fa-star componi-annunci__star ${b.preferito ? '' : 'componi-annunci__star--off'}`} />
                      </button>
                    </td>
                    <td>{b.quantita}</td>
                    <td className="componi-annunci__td-c">
                      <button type="button" className="componi-annunci__icon-btn componi-annunci__file" onClick={() => apriContratto(b)} aria-label="Apri contratto" title="Apri contratto">
                        <i className="fa-light fa-file-pdf" />
                      </button>
                    </td>
                    <td className="componi-annunci__td-c">
                      <button type="button" className="componi-annunci__icon-btn" onClick={() => eliminaBacheca(b.id)} aria-label="Elimina">
                        <i className="fa-light fa-trash" />
                      </button>
                    </td>
                    <td className="componi-annunci__td-c">
                      {b.stato === 'Pubblicato' ? (
                        <span className="componi-annunci__pubblicato"><i className="fa-solid fa-circle-check" /> Pubblicato</span>
                      ) : (
                        <button type="button" className="componi-annunci__pubblica-btn" onClick={() => pubblica(b.id)}>
                          <i className="fa-solid fa-paper-plane" /> Pubblica
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ANTEPRIMA CONTRATTO (Doc editabile) ────────────────────────────────────────
function ContrattoPreview({ contratto, onUpdTariffa, onUpdServizio, onSalva, onAnnulla, isEditing }: {
  contratto: Contratto
  onUpdTariffa: (id: number, field: keyof RigaTariffa, v: string) => void
  onUpdServizio: (id: number, field: keyof RigaServizio, v: string) => void
  onSalva: () => void
  onAnnulla: () => void
  isEditing: boolean
}) {
  return (
    <div className="ca-contract">
      <div className="ca-contract__toolbar">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onAnnulla}><i className="fa-light fa-arrow-left" /> Indietro</button>
        <div className="ca-contract__toolbar-right">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.print()}><i className="fa-light fa-print" /> Stampa</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onSalva}>
            <i className="fa-light fa-floppy-disk" /> {isEditing ? 'Salva modifiche' : 'Salva nella bacheca'}
          </button>
        </div>
      </div>

      <div className="ca-contract__sheet">
        <header className="ca-contract__head">
          <div className="ca-contract__title">Contratto di {contratto.tipo}</div>
          <div className="ca-contract__meta">
            <div><span>Numero</span><strong>{contratto.numero}</strong></div>
            <div><span>Data</span><strong>{contratto.data}</strong></div>
          </div>
        </header>

        <section className="ca-contract__parties">
          <div><span>Struttura</span><strong>{contratto.struttura}</strong></div>
          <div><span>Tour operator</span><strong>{contratto.tourOperator}</strong></div>
          <div><span>Periodo</span><strong>{contratto.periodo || '—'}</strong></div>
          <div><span>Pagamento</span><strong>{contratto.pagamento}</strong></div>
        </section>

        <h4 className="ca-contract__h">Condizioni economiche</h4>
        <p className="ca-contract__note-edit"><i className="fa-light fa-circle-info" /> Le tabelle sono editabili: clicca sulla matita per modificare i valori.</p>
        <div className="sib-table-wrap">
          <table className="sib-table">
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

        <h4 className="ca-contract__h">Servizi e condizioni</h4>
        <div className="sib-table-wrap">
          <table className="sib-table">
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

        <p className="ca-contract__clausola">
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
        className="sib-input componi-annunci__edit-input"
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
    <span className="componi-annunci__edit-cell">
      <span>{value || '—'}</span>
      <button type="button" className="componi-annunci__edit-ico" onClick={() => setEditing(true)} aria-label="Modifica">
        <i className="fa-light fa-pen" />
      </button>
    </span>
  )
}
