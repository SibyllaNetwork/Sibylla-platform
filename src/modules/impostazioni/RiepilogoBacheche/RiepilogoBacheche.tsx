import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import './RiepilogoBacheche.sass'

interface Struttura {
  id: string
  nome: string
  stelle: number
  indirizzo: string
  citta: string
  regione: string
  prezzoB2b: number
  prezzoB2c: number
  cameraTipo: string
  descrizione: string
}

interface CardData {
  nome: string
  stelle: number
  indirizzo: string
  citta: string
  regione: string
  cameraTipo: string
  prezzo: number
  descrizione: string
  foto: string | null
}

const STRUTTURE: Struttura[] = [
  { id: 'azzurro',  nome: 'Hotel Azzurro Mare', stelle: 4, indirizzo: 'Via dei Mille, 123, 98123 Messina ME, Italia', citta: 'Messina', regione: 'Sicilia', prezzoB2b: 95,  prezzoB2c: 135, cameraTipo: '1 camera doppia',  descrizione: '' },
  { id: 'archim',   nome: 'Hotel Archimede',     stelle: 4, indirizzo: 'Via della Repubblica, 12, 00100 Roma RM, Italia', citta: 'Roma',    regione: 'Lazio',   prezzoB2b: 110, prezzoB2c: 145, cameraTipo: '1 camera singola', descrizione: 'Hotel storico nel cuore di Roma a pochi passi dal Colosseo.' },
  { id: 'siracusa', nome: 'Hotel Siracusa',      stelle: 3, indirizzo: 'Via Roma, 1, 96100 Siracusa SR, Italia',           citta: 'Siracusa', regione: 'Sicilia', prezzoB2b: 75,  prezzoB2c: 99,  cameraTipo: '1 camera doppia',  descrizione: '' },
  { id: 'lux',      nome: 'Hotel Lux',           stelle: 4, indirizzo: 'Piazza Navona, 8, 00186 Roma RM, Italia',          citta: 'Roma',    regione: 'Lazio',   prezzoB2b: 140, prezzoB2c: 189, cameraTipo: '1 suite',          descrizione: '' },
]

function toCardData(s: Struttura, channel: 'b2b' | 'b2c'): CardData {
  return {
    nome: s.nome,
    stelle: s.stelle,
    indirizzo: s.indirizzo,
    citta: s.citta,
    regione: s.regione,
    cameraTipo: s.cameraTipo,
    prezzo: channel === 'b2b' ? s.prezzoB2b : s.prezzoB2c,
    descrizione: s.descrizione,
    foto: null,
  }
}

export default function RiepilogoBacheche({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState(STRUTTURE[0].id)
  const struttura = STRUTTURE.find(s => s.id === strutturaId)!

  const [b2b, setB2b] = useState<CardData>(toCardData(struttura, 'b2b'))
  const [b2c, setB2c] = useState<CardData>(toCardData(struttura, 'b2c'))
  const [editB2b, setEditB2b] = useState(false)
  const [editB2c, setEditB2c] = useState(false)

  useEffect(() => {
    setB2b(toCardData(struttura, 'b2b'))
    setB2c(toCardData(struttura, 'b2c'))
    setEditB2b(false)
    setEditB2c(false)
  }, [strutturaId, struttura])

  return (
    <div className="riep-bach">
      <PageHead
        back
        title="Riepilogo bacheche"
        subtitle="Sintesi dei contenuti pubblicati verso il B2C (Network) e il B2B (Agorà)"
      />

      <FilterToolbar>
        <SelectField
          name="struttura" label="Strutture"
          value={strutturaId}
          onChange={e => setStrutturaId(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s.id, label: s.nome }))}
        />
      </FilterToolbar>

      <div className="riep-bach__grid">
        {/* ── B2B ────────────────────────────────────────── */}
        <ChannelPanel
          variant="b2b"
          title="Anteprima Agorà"
          subtitle="Come appare la struttura sul portale B2B"
          editing={editB2b}
          onEdit={() => setEditB2b(true)}
          onSave={() => setEditB2b(false)}
          onCancel={() => { setB2b(toCardData(struttura, 'b2b')); setEditB2b(false) }}
        >
          <CardB2B data={b2b} editing={editB2b} onChange={setB2b} />
        </ChannelPanel>

        {/* ── B2C ────────────────────────────────────────── */}
        <ChannelPanel
          variant="b2c"
          title="Anteprima Network"
          subtitle="Come appare la struttura sul portale B2C"
          editing={editB2c}
          onEdit={() => setEditB2c(true)}
          onSave={() => setEditB2c(false)}
          onCancel={() => { setB2c(toCardData(struttura, 'b2c')); setEditB2c(false) }}
        >
          <CardB2C data={b2c} editing={editB2c} onChange={setB2c} />
        </ChannelPanel>
      </div>
    </div>
  )
}

// ─── Pannello canale (header + bottoni edit) ─────────────────────────
function ChannelPanel({
  variant, title, subtitle, editing, onEdit, onSave, onCancel, children,
}: {
  variant: 'b2b' | 'b2c'
  title: string
  subtitle: string
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  children: React.ReactNode
}) {
  return (
    <section className={`riep-bach__channel riep-bach__channel--${variant}`}>
      <header className="riep-bach__channel-head">
        <div>
          <h3 className="riep-bach__channel-title">{title}</h3>
          <p className="riep-bach__channel-subtitle">{subtitle}</p>
        </div>
        <span className="riep-bach__channel-actions">
          <span className={`riep-bach__badge riep-bach__badge--${variant}`}>{variant.toUpperCase()}</span>
          {editing ? (
            <>
              <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={onCancel}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" onClick={onSave}>
                <i className="fa-light fa-floppy-disk" /> Salva
              </button>
            </>
          ) : (
            <Tooltip text="Modifica anteprima">
              <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={onEdit}>
                <i className="fa-light fa-pen-to-square" /> Modifica
              </button>
            </Tooltip>
          )}
        </span>
      </header>

      <div className="riep-bach__preview-wrap">{children}</div>
    </section>
  )
}

// ─── Card preview B2B (Agorà) ─────────────────────────────────────────
function CardB2B({
  data, editing, onChange,
}: {
  data: CardData
  editing: boolean
  onChange: (d: CardData) => void
}) {
  function patch<K extends keyof CardData>(k: K, v: CardData[K]) {
    onChange({ ...data, [k]: v })
  }

  return (
    <article className="riep-bach__cardb2b">
      <PhotoArea
        editing={editing}
        foto={data.foto}
        onChange={f => patch('foto', f)}
        actions={
          <button type="button" className="riep-bach__cardb2b-fav" aria-label="Aggiungi ai preferiti">
            <i className="fa-light fa-heart" />
          </button>
        }
      />
      <div className="riep-bach__cardb2b-body">
        <StarsEdit n={data.stelle} editing={editing} onChange={v => patch('stelle', v)} />

        <FieldText
          editing={editing} value={data.nome}
          onChange={v => patch('nome', v)}
          className="riep-bach__cardb2b-name"
          placeholder="Nome struttura"
        />

        <p className="riep-bach__cardb2b-addr">
          <i className="fa-light fa-location-dot" />
          <FieldText
            editing={editing} value={data.indirizzo}
            onChange={v => patch('indirizzo', v)}
            className="riep-bach__cardb2b-addr-text"
            placeholder="Indirizzo"
          />
        </p>

        <FieldText
          editing={editing} value={data.cameraTipo}
          onChange={v => patch('cameraTipo', v)}
          className="riep-bach__cardb2b-camera"
          placeholder="Es. 1 camera doppia"
        />

        <hr className="riep-bach__cardb2b-sep" />

        <div className="riep-bach__cardb2b-foot">
          <div>
            <span className="riep-bach__cardb2b-from">a partire da</span>
            <PriceEdit
              editing={editing} value={data.prezzo}
              onChange={v => patch('prezzo', v)}
              className="riep-bach__cardb2b-price"
            />
          </div>
          <button type="button" className="riep-bach__btn-prenota riep-bach__btn-prenota--blue">
            <i className="fa-light fa-cart-shopping" /> Prenota
          </button>
        </div>

        <DescrInline
          editing={editing} value={data.descrizione}
          onChange={v => patch('descrizione', v)}
        />
      </div>
    </article>
  )
}

// ─── Card preview B2C (Network) ───────────────────────────────────────
function CardB2C({
  data, editing, onChange,
}: {
  data: CardData
  editing: boolean
  onChange: (d: CardData) => void
}) {
  function patch<K extends keyof CardData>(k: K, v: CardData[K]) {
    onChange({ ...data, [k]: v })
  }

  return (
    <article className="riep-bach__cardb2c">
      <PhotoArea
        editing={editing}
        foto={data.foto}
        onChange={f => patch('foto', f)}
        actions={
          <span className="riep-bach__cardb2c-actions">
            <button type="button" className="riep-bach__cardb2c-iconbtn" aria-label="Aggiungi ai preferiti">
              <i className="fa-light fa-heart" />
            </button>
            <button type="button" className="riep-bach__cardb2c-iconbtn" aria-label="Condividi">
              <i className="fa-light fa-share-nodes" />
            </button>
          </span>
        }
      />
      <div className="riep-bach__cardb2c-body">
        <FieldText
          editing={editing} value={data.regione}
          onChange={v => patch('regione', v)}
          className="riep-bach__cardb2c-region"
          placeholder="Regione"
        />
        <FieldText
          editing={editing} value={data.nome}
          onChange={v => patch('nome', v)}
          className="riep-bach__cardb2c-name"
          placeholder="Nome struttura"
        />
        <p className="riep-bach__cardb2c-sub">
          <FieldText
            editing={editing} value={data.cameraTipo}
            onChange={v => patch('cameraTipo', v)}
            className="riep-bach__cardb2c-sub-part"
            placeholder="Tipo camera"
          />
          {' · '}
          <FieldText
            editing={editing} value={data.citta}
            onChange={v => patch('citta', v)}
            className="riep-bach__cardb2c-sub-part"
            placeholder="Città"
          />
        </p>

        <p className="riep-bach__cardb2c-price">
          a partire da{' '}
          <PriceEdit
            editing={editing} value={data.prezzo}
            onChange={v => patch('prezzo', v)}
            className="riep-bach__cardb2c-price-num"
            decimals={2}
          />
        </p>

        <button type="button" className="riep-bach__btn-prenota riep-bach__btn-prenota--orange riep-bach__btn-prenota--full">
          <i className="fa-light fa-cart-shopping" /> Prenota
        </button>

        <DescrInline
          editing={editing} value={data.descrizione}
          onChange={v => patch('descrizione', v)}
        />
      </div>
    </article>
  )
}

// ─── Foto editabile ───────────────────────────────────────────────────
function PhotoArea({
  editing, foto, onChange, actions,
}: {
  editing: boolean
  foto: string | null
  onChange: (f: string | null) => void
  actions: React.ReactNode
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    onChange(URL.createObjectURL(f))
  }

  return (
    <div className="riep-bach__photo-area">
      {foto ? (
        <img src={foto} alt="Foto struttura" className="riep-bach__photo-img" />
      ) : (
        <div className="riep-bach__photo" aria-hidden="true">
          <i className="fa-light fa-hotel" />
        </div>
      )}

      {!editing && actions}

      {editing && (
        <span className="riep-bach__photo-edit">
          <button
            type="button"
            className="sib-btn sib-btn--secondary sib-btn--sm"
            onClick={() => inputRef.current?.click()}
          >
            <i className="fa-light fa-camera" /> {foto ? 'Sostituisci foto' : 'Carica foto'}
          </button>
          {foto && (
            <button
              type="button"
              className="sib-btn sib-btn--secondary sib-btn--sm"
              onClick={() => onChange(null)}
            >
              <i className="fa-light fa-trash" /> Rimuovi
            </button>
          )}
          <input
            ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile}
          />
        </span>
      )}
    </div>
  )
}

// ─── Stelle editabili ─────────────────────────────────────────────────
function StarsEdit({
  n, editing, onChange,
}: {
  n: number
  editing: boolean
  onChange: (v: number) => void
}) {
  if (!editing) {
    return (
      <span className="riep-bach__stars">
        {[1, 2, 3, 4, 5].map(i => (
          <i
            key={i}
            className={'fa-solid fa-star' + (i <= n ? '' : ' riep-bach__star--off')}
            aria-hidden="true"
          />
        ))}
      </span>
    )
  }
  return (
    <span className="riep-bach__stars riep-bach__stars--edit">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          className={'riep-bach__star-btn' + (i <= n ? ' riep-bach__star-btn--filled' : '')}
          onClick={() => onChange(i === n ? 0 : i)}
          aria-label={`${i} stelle`}
        >
          <i className="fa-solid fa-star" />
        </button>
      ))}
    </span>
  )
}

// ─── Campo testo inline editabile ────────────────────────────────────
function FieldText({
  editing, value, onChange, className, placeholder, multiline,
}: {
  editing: boolean
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  multiline?: boolean
}) {
  if (!editing) {
    if (className?.includes('name') || className?.includes('region')) {
      return <span className={className}>{value || placeholder}</span>
    }
    return <span className={className}>{value || placeholder}</span>
  }
  if (multiline) {
    return (
      <textarea
        className={`riep-bach__inline-input ${className ?? ''}`}
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={e => onChange(e.target.value)}
      />
    )
  }
  return (
    <input
      className={`riep-bach__inline-input ${className ?? ''}`}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ─── Prezzo editabile ─────────────────────────────────────────────────
function PriceEdit({
  editing, value, onChange, className, decimals = 0,
}: {
  editing: boolean
  value: number
  onChange: (v: number) => void
  className?: string
  decimals?: number
}) {
  if (!editing) {
    const formatted = decimals
      ? value.toFixed(decimals).replace('.', ',')
      : String(value)
    return <span className={className}>{formatted} €</span>
  }
  return (
    <span className={`riep-bach__price-edit ${className ?? ''}`}>
      <input
        type="number" min={0}
        className="riep-bach__inline-input riep-bach__price-input"
        value={value}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
      <span>€</span>
    </span>
  )
}

// ─── Descrizione inline ───────────────────────────────────────────────
function DescrInline({
  editing, value, onChange,
}: {
  editing: boolean
  value: string
  onChange: (v: string) => void
}) {
  if (!editing) {
    if (!value) return null
    return <p className="riep-bach__cardb2-descr">{value}</p>
  }
  return (
    <textarea
      className="riep-bach__inline-input riep-bach__inline-textarea"
      value={value}
      placeholder="Aggiungi descrizione…"
      rows={3}
      onChange={e => onChange(e.target.value)}
    />
  )
}
