import React, { useEffect, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../../services/api'
import './ComponiAnnunci.sass'

type Tipo = 'Vendita' | 'Acquisto'
type Tipologia = 'Struttura' | 'Categoria'
type StatoBacheca = 'In bozza' | 'Pubblicato'

interface RigaAnnuncio {
  id: number
  destinatario: string
  segmento: string
  periodo: string
  stagionalita: string
  tipologiaBase: string
  lotto: string
  quantita: number
}

interface RigaBacheca {
  id: number
  periodo: string
  tipologia: 'VENDITA' | 'ACQUISTO'
  preferito: boolean
  quantita: string
  hasContratto: boolean
  stato: StatoBacheca
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  tipo: Tipo
  tipologia: Tipologia
  tipoOspiti: 'Individuali' | 'Gruppi'
  tipologiaBase: 'base doppia' | 'base singola' | 'base tripla'
  tipoLotti: 'lotto' | '1/2 lotto'
  righe: RigaAnnuncio[]
  bacheca: RigaBacheca[]
}

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Grimm' }],
  StrutturaId: 1,
  tipo: 'Vendita',
  tipologia: 'Struttura',
  tipoOspiti: 'Individuali',
  tipologiaBase: 'base doppia',
  tipoLotti: 'lotto',
  righe: Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    destinatario: 'Tour Operator All',
    segmento: 'B2B',
    periodo: '01/03/2026 - 30/06/2026',
    stagionalita: 'LS1',
    tipologiaBase: 'Base doppia',
    lotto: 'Intero',
    quantita: 3,
  })),
  bacheca: [
    { id: 1, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: true,  quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
    { id: 2, periodo: '10/01/2024', tipologia: 'ACQUISTO', preferito: true,  quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
    { id: 3, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: true,  quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
    { id: 4, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: false, quantita: '1 lotto', hasContratto: true, stato: 'Pubblicato' },
    { id: 5, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: false, quantita: '1 lotto', hasContratto: true, stato: 'Pubblicato' },
    { id: 6, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: false, quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
    { id: 7, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: false, quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
    { id: 8, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: false, quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
    { id: 9, periodo: '10/01/2024', tipologia: 'VENDITA',  preferito: false, quantita: '1 lotto', hasContratto: true, stato: 'In bozza' },
  ],
}

export default function ComponiAnnunci({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('annunci/GetGestione', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setData({ ...data, [k]: v })

  const eliminaBacheca = (id: number) => {
    setData({ ...data, bacheca: data.bacheca.filter((b) => b.id !== id) })
  }

  const togglePubblica = (id: number) => {
    setData({
      ...data,
      bacheca: data.bacheca.map((b) =>
        b.id === id ? { ...b, stato: b.stato === 'Pubblicato' ? 'In bozza' : 'Pubblicato' } : b,
      ),
    })
  }

  const updateRiga = (id: number, field: keyof RigaAnnuncio, value: string) => {
    setData((prev) => ({
      ...prev,
      righe: prev.righe.map((r) =>
        r.id === id ? { ...r, [field]: field === 'quantita' ? Number(value) || 0 : value } : r,
      ),
    }))
  }

  return (
    <div className="componi-annunci">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Componi annunci" />

      <div className="componi-annunci__filters">
        <div className="componi-annunci__field">
          <label>Tipo</label>
          <div className="componi-annunci__radio-group">
            <label className="componi-annunci__radio">
              <input type="radio" className="sib-radio" checked={data.tipo === 'Vendita'} onChange={() => set('tipo', 'Vendita')} />
              <span>Vendita</span>
            </label>
            <label className="componi-annunci__radio">
              <input type="radio" className="sib-radio" checked={data.tipo === 'Acquisto'} onChange={() => set('tipo', 'Acquisto')} />
              <span>Acquisto</span>
            </label>
          </div>
        </div>

        <div className="componi-annunci__field">
          <label>Tipologia</label>
          <div className="componi-annunci__radio-group">
            <label className="componi-annunci__radio">
              <input type="radio" className="sib-radio" checked={data.tipologia === 'Struttura'} onChange={() => set('tipologia', 'Struttura')} />
              <span>Struttura</span>
            </label>
            <label className="componi-annunci__radio">
              <input type="radio" className="sib-radio" checked={data.tipologia === 'Categoria'} onChange={() => set('tipologia', 'Categoria')} />
              <span>Categoria</span>
            </label>
          </div>
        </div>

        <div className="componi-annunci__field">
          <label>Struttura</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => set('StrutturaId', e.target.value ? Number(e.target.value) : null)}>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="componi-annunci__field">
          <label>Tipo ospiti</label>
          <select className="sib-select" value={data.tipoOspiti} onChange={(e) => set('tipoOspiti', e.target.value as Data['tipoOspiti'])}>
            <option value="Individuali">Individuali</option>
            <option value="Gruppi">Gruppi</option>
          </select>
        </div>

        <div className="componi-annunci__field">
          <label>Tipologia base</label>
          <select className="sib-select" value={data.tipologiaBase} onChange={(e) => set('tipologiaBase', e.target.value as Data['tipologiaBase'])}>
            <option value="base doppia">base doppia</option>
            <option value="base singola">base singola</option>
            <option value="base tripla">base tripla</option>
          </select>
        </div>

        <div className="componi-annunci__field">
          <label>Tipo lotti</label>
          <select className="sib-select" value={data.tipoLotti} onChange={(e) => set('tipoLotti', e.target.value as Data['tipoLotti'])}>
            <option value="lotto">lotto</option>
            <option value="1/2 lotto">1/2 lotto</option>
          </select>
        </div>

        <button type="button" className="sib-btn sib-btn--primary componi-annunci__avanti">Avanti</button>
      </div>

      <div className="componi-annunci__columns">
        {/* ─── Sx: tabella struttura corrente ──────────────────────────────── */}
        <div className="componi-annunci__col">
          <h3 className="componi-annunci__col-title">{data.Strutture.find((s) => s.Id === data.StrutturaId)?.nome ?? "Grimm's Hotel"}</h3>
          <div className="sib-table-wrap">
            <table className="sib-table componi-annunci__table">
              <thead>
                <tr>
                  <th>Destinatario</th>
                  <th>Segmento</th>
                  <th>Periodo</th>
                  <th>Stagionalità</th>
                  <th>Tipologia base</th>
                  <th>Lotto</th>
                  <th>Quantità</th>
                </tr>
              </thead>
              <tbody>
                {data.righe.length === 0 ? (
                  <tr><td colSpan={7} className="sib-empty">Nessun annuncio configurato.</td></tr>
                ) : data.righe.map((r) => (
                  <tr key={r.id}>
                    <td><EditCell value={r.destinatario}  onChange={(v) => updateRiga(r.id, 'destinatario',  v)} /></td>
                    <td><EditCell value={r.segmento}      onChange={(v) => updateRiga(r.id, 'segmento',      v)} /></td>
                    <td><EditCell value={r.periodo}       onChange={(v) => updateRiga(r.id, 'periodo',       v)} /></td>
                    <td><EditCell value={r.stagionalita}  onChange={(v) => updateRiga(r.id, 'stagionalita',  v)} /></td>
                    <td><EditCell value={r.tipologiaBase} onChange={(v) => updateRiga(r.id, 'tipologiaBase', v)} /></td>
                    <td><EditCell value={r.lotto}         onChange={(v) => updateRiga(r.id, 'lotto',         v)} /></td>
                    <td><EditCell value={String(r.quantita)} onChange={(v) => updateRiga(r.id, 'quantita',   v)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Dx: bacheca ────────────────────────────────────────────────── */}
        <div className="componi-annunci__col">
          <h3 className="componi-annunci__col-title">Bacheca</h3>
          <div className="sib-table-wrap">
            <table className="sib-table componi-annunci__table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Tipologia</th>
                  <th>Quantità</th>
                  <th>Contratto</th>
                  <th>Elimina</th>
                  <th>Pubblica</th>
                </tr>
              </thead>
              <tbody>
                {data.bacheca.map((b) => (
                  <tr key={b.id}>
                    <td className="componi-annunci__periodo">
                      <i className="fa-light fa-paperclip" /> {b.periodo}
                    </td>
                    <td>
                      <span className="componi-annunci__tipologia">{b.tipologia}</span>
                      {b.preferito && <i className="fa-solid fa-star componi-annunci__star" />}
                      {!b.preferito && <i className="fa-light fa-star componi-annunci__star componi-annunci__star--off" />}
                    </td>
                    <td>{b.quantita}</td>
                    <td className="componi-annunci__td-c">
                      {b.hasContratto && <i className="fa-light fa-file-pdf componi-annunci__file" />}
                    </td>
                    <td className="componi-annunci__td-c">
                      <button type="button" className="componi-annunci__icon-btn" onClick={() => eliminaBacheca(b.id)} aria-label="Elimina">
                        <i className="fa-light fa-trash" />
                      </button>
                    </td>
                    <td className="componi-annunci__td-c">
                      {b.stato === 'Pubblicato' ? (
                        <span className="componi-annunci__pubblicato">
                          <i className="fa-solid fa-circle-check" /> Pubblicato
                        </span>
                      ) : (
                        <button type="button" className="componi-annunci__pubblica-btn" onClick={() => togglePubblica(b.id)} aria-label="Pubblica">
                          <i className="fa-solid fa-paper-plane" />
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

      <div className="componi-annunci__actions">
        <button type="button" className="sib-btn sib-btn--primary">Salva nella bacheca</button>
        <button type="button" className="sib-btn sib-btn--secondary">Annulla</button>
      </div>
    </div>
  )
}

// ─── EDIT CELL ────────────────────────────────────────────────────────────────
function EditCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
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
      <span>{value}</span>
      <button
        type="button"
        className="componi-annunci__edit-ico"
        onClick={() => setEditing(true)}
        aria-label="Modifica"
      >
        <i className="fa-light fa-pen" />
      </button>
    </span>
  )
}
