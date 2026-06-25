import React, { useEffect, useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../services/api'
import { SelectField } from '../../../core/components/form'
import './OrdineServizio.sass'

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number
  reparti: string[]
  reparto: string
}

const FALLBACK: Data = {
  Strutture: [
    { Id: 1, nome: 'Hotel Azzurro Mare' },
    { Id: 2, nome: 'Hotel Tutorial' },
  ],
  StrutturaId: 1,
  reparti: ['Tutti', 'Housekeeping', 'Manutenzione', 'Reception', 'F&B'],
  reparto: 'Tutti',
}

export default function OrdineServizio({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [block, setBlock] = useState('Normal')
  const [font, setFont] = useState('Sans Serif')
  const [size, setSize] = useState('Normal')
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetOrdineServizio', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.StrutturaId])

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  return (
    <div className="ord-serv">
      <BtnBack />
      <PageHeader
        title="Ordine di servizio"
        subtitle="Generazione rapida di ordini di servizio per housekeeping, manutenzione, reception e altri reparti"
      />

      <div className="ord-serv__bar">
        <div className="ord-serv__field">
          <SelectField
            label="Strutture"
            name="strutturaId"
            className="ord-serv__select"
            value={data.StrutturaId}
            onChange={(e) => setData({ ...data, StrutturaId: Number(e.target.value) })}
            options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
          />
        </div>
        <div className="ord-serv__field">
          <SelectField
            label="Reparto"
            name="reparto"
            className="ord-serv__select"
            value={data.reparto}
            onChange={(e) => setData({ ...data, reparto: e.target.value })}
            options={data.reparti.map((r) => ({ value: r, label: r }))}
          />
        </div>
      </div>

      {/* ─── Editor ─────────────────────────────────────────────────────────── */}
      <div className="ord-serv__editor">
        <div className="ord-serv__toolbar">
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('bold')} title="Grassetto"><strong>B</strong></button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('italic')} title="Corsivo"><em>I</em></button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('underline')} title="Sottolineato"><u>U</u></button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('strikeThrough')} title="Barrato"><s>S</s></button>

          <span className="ord-serv__tb-sep" />

          <select className="ord-serv__tb-sel" value={block} onChange={(e) => { setBlock(e.target.value); exec('formatBlock', e.target.value) }}>
            <option value="Normal">Normal</option>
            <option value="H1">Titolo 1</option>
            <option value="H2">Titolo 2</option>
            <option value="H3">Titolo 3</option>
            <option value="P">Paragrafo</option>
          </select>
          <select className="ord-serv__tb-sel" value={font} onChange={(e) => { setFont(e.target.value); exec('fontName', e.target.value) }}>
            <option>Sans Serif</option>
            <option>Serif</option>
            <option>Monospace</option>
          </select>
          <select className="ord-serv__tb-sel" value={size} onChange={(e) => { setSize(e.target.value); exec('fontSize', mapSize(e.target.value)) }}>
            <option>Small</option>
            <option>Normal</option>
            <option>Large</option>
            <option>Huge</option>
          </select>

          <span className="ord-serv__tb-sep" />

          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('insertOrderedList')} title="Lista numerata"><i className="fa-light fa-list-ol" /></button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('insertUnorderedList')} title="Lista puntata"><i className="fa-light fa-list-ul" /></button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('justifyLeft')} title="Allinea sinistra"><i className="fa-light fa-align-left" /></button>

          <span className="ord-serv__tb-sep" />

          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('foreColor', '#1F4E5F')} title="Colore testo"><i className="fa-light fa-a" />A</button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('hiliteColor', '#FFF59D')} title="Evidenziatore"><i className="fa-light fa-highlighter" /></button>
          <button type="button" className="ord-serv__tb-btn" onClick={() => {
            const url = window.prompt('URL immagine')
            if (url) exec('insertImage', url)
          }} title="Inserisci immagine"><i className="fa-light fa-image" /></button>

          <span className="ord-serv__tb-sep" />

          <button type="button" className="ord-serv__tb-btn" onClick={() => exec('removeFormat')} title="Rimuovi formattazione"><i className="fa-light fa-eraser" /></button>
        </div>

        <div
          ref={editorRef}
          className="ord-serv__textarea"
          contentEditable
          suppressContentEditableWarning
        />
      </div>

      <div className="ord-serv__foot">
        <button type="button" className="sib-btn sib-btn--primary">Invia</button>
      </div>
    </div>
  )
}

function mapSize(label: string): string {
  if (label === 'Small') return '2'
  if (label === 'Large') return '5'
  if (label === 'Huge') return '7'
  return '3'
}
