import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Ico from '../../../core/icons/Ico'
import { InputField } from '../../../core/components/form'
import { useCatalogoStore, type TipoMovimento } from '../../../store/useCatalogoStore'
import { useOrgStore } from '../../../store/useOrgStore'
import { isValidEAN13 } from '../../../admin/SibyllaAdminPanel/catalogo/helpers'
import { UNITA_MISURA_OPTIONS } from '../../../admin/SibyllaAdminPanel/catalogo/mockData'
import './MovimentiBarcode.sass'

export default function MovimentiBarcode({ navigate }: { navigate: (p: string) => void }) {
  const struttura = useOrgStore(s => s.activeStruttura)
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const movimenti = useCatalogoStore(s => s.movimenti)
  const prodottoByBarcode = useCatalogoStore(s => s.prodottoByBarcode)
  const giacenza = useCatalogoStore(s => s.giacenza)
  const registraMovimento = useCatalogoStore(s => s.registraMovimento)

  const inputRef = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [tipo, setTipo] = useState<TipoMovimento>('entrata')
  const [quantita, setQuantita] = useState('1')
  const [note, setNote] = useState('')
  const [magazzinoId, setMagazzinoId] = useState(struttura || 'principale')
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const prodotto = useMemo(() => prodottoByBarcode(barcode.trim()), [barcode, prodottoByBarcode])
  const fornitore = prodotto ? fornitori.find(f => f.id === prodotto.fornitoreId) : null
  const giacenzaCorrente = prodotto ? giacenza(prodotto.id, magazzinoId) : 0
  const unitaLabel = (u: string) => UNITA_MISURA_OPTIONS.find(o => o.value === u)?.label || u

  const barcodeTrim = barcode.trim()
  const formatoOk = barcodeTrim ? isValidEAN13(barcodeTrim) : true

  const handleSubmit = () => {
    if (!prodotto) {
      setFeedback({ kind: 'error', text: 'Nessun prodotto trovato per il barcode inserito' })
      return
    }
    const qta = parseFloat(quantita)
    if (isNaN(qta) || qta <= 0) {
      setFeedback({ kind: 'error', text: 'Quantità non valida' })
      return
    }
    if (tipo === 'uscita' && qta > giacenzaCorrente) {
      setFeedback({
        kind: 'error',
        text: `Quantità superiore alla giacenza disponibile (${giacenzaCorrente})`,
      })
      return
    }

    registraMovimento({
      prodottoId: prodotto.id,
      barcode: prodotto.barcode,
      tipo,
      quantita: qta,
      magazzinoId,
      operatore: '',
      note,
    })

    setFeedback({
      kind: 'success',
      text: `${tipo === 'entrata' ? 'Carico' : tipo === 'uscita' ? 'Scarico' : 'Rettifica'} registrato: ${qta} × ${prodotto.nome}`,
    })

    // pronto per il prossimo barcode
    setBarcode('')
    setQuantita('1')
    setNote('')
    inputRef.current?.focus()
  }

  // ── Submit on Enter (tipico di scanner USB che invia codice + Enter) ──
  const onBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!barcodeTrim) return
    if (!prodotto) {
      setFeedback({ kind: 'error', text: `Barcode ${barcodeTrim} non trovato nel catalogo Sibylla` })
      return
    }
    setFeedback({ kind: 'info', text: `Prodotto trovato: ${prodotto.nome} — inserisci la quantità e conferma` })
    document.getElementById('mov-barcode-qty')?.focus()
  }

  const recenti = movimenti.slice(0, 10)
  const totaleProdottiAttivi = prodotti.filter(p => p.attivo).length

  return (
    <div className="mov-barcode">
      <PageHead
        back
        title="Movimenti via barcode"
        subtitle="Lettura scanner per registrare entrate, uscite e rettifiche di magazzino — riferimento al catalogo Sibylla"
      />

      <div className="mov-barcode__counters">
        <div className="mov-barcode__counter">
          <i className="fa-duotone fa-warehouse mov-barcode__counter-ico" />
          <div>
            <div className="mov-barcode__counter-value">{struttura || '—'}</div>
            <div className="mov-barcode__counter-label">Struttura attiva</div>
          </div>
        </div>
        <div className="mov-barcode__counter">
          <i className="fa-duotone fa-barcode mov-barcode__counter-ico" />
          <div>
            <div className="mov-barcode__counter-value">{totaleProdottiAttivi}</div>
            <div className="mov-barcode__counter-label">Prodotti a catalogo</div>
          </div>
        </div>
        <div className="mov-barcode__counter">
          <i className="fa-duotone fa-clock-rotate-left mov-barcode__counter-ico" />
          <div>
            <div className="mov-barcode__counter-value">{movimenti.length}</div>
            <div className="mov-barcode__counter-label">Movimenti totali</div>
          </div>
        </div>
      </div>

      <div className="mov-barcode__layout">
        {/* ─── Form ricezione ────────────────────────────────────────────── */}
        <section className="mov-barcode__form">
          <div className="mov-barcode__form-title">Lettura barcode</div>
          <div className="mov-barcode__hint">
            Inquadra il prodotto con lo scanner oppure digita il barcode (EAN-13) e premi Invio.
          </div>

          <div className="mov-barcode__field">
            <label className="mov-barcode__label">Barcode prodotto</label>
            <div className="mov-barcode__bcode">
              <i className="fa-duotone fa-barcode mov-barcode__bcode-ico" />
              <input
                ref={inputRef}
                value={barcode}
                onChange={e => { setBarcode(e.target.value.replace(/\D/g, '').slice(0, 13)); setFeedback(null) }}
                onKeyDown={onBarcodeKeyDown}
                className="sib-input mov-barcode__bcode-text"
                inputMode="numeric"
                placeholder="13 cifre"
                maxLength={13}
              />
            </div>
            {!formatoOk && barcodeTrim && (
              <div className="mov-barcode__inline-err">Formato non valido (atteso EAN-13)</div>
            )}
          </div>

          {prodotto ? (
            <div className="mov-barcode__product-card">
              <div className="mov-barcode__product-head">
                <div>
                  <div className="mov-barcode__product-name">{prodotto.nome}</div>
                  <div className="mov-barcode__product-meta">
                    {fornitore?.nome ?? '—'} · {prodotto.quantitaUnita} {unitaLabel(prodotto.unita).split(' ')[0].toLowerCase()}
                  </div>
                </div>
                <span className="mov-barcode__giacenza">
                  Giacenza <strong>{giacenzaCorrente}</strong>
                </span>
              </div>
              {prodotto.scortaMinima > 0 && giacenzaCorrente <= prodotto.scortaMinima && (
                <div className="mov-barcode__warn">
                  <Ico n="alert" s={12} c="var(--color-warning)" />
                  Sotto scorta minima ({prodotto.scortaMinima})
                </div>
              )}
            </div>
          ) : barcodeTrim && (
            <div className="mov-barcode__not-found">
              <Ico n="info" s={12} c="var(--color-text-disabled)" />
              Barcode non presente nel catalogo Sibylla. Chiedi all'assistenza di registrarlo.
            </div>
          )}

          <div className="mov-barcode__row-3">
            <div>
              <label className="mov-barcode__label">Tipo movimento</label>
              <div className="mov-barcode__seg">
                {(['entrata', 'uscita', 'rettifica'] as const).map(t => {
                  const cls = `mov-barcode__seg-btn mov-barcode__seg-btn--${t}${tipo === t ? ' mov-barcode__seg-btn--on' : ''}`
                  return (
                    <button key={t} type="button" className={cls} onClick={() => setTipo(t)}>
                      {t === 'entrata' ? '↓ Entrata' : t === 'uscita' ? '↑ Uscita' : '⇄ Rettifica'}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="mov-barcode__label">Quantità</label>
              <input
                id="mov-barcode-qty"
                type="number"
                step="0.01"
                min="0.01"
                value={quantita}
                onChange={e => setQuantita(e.target.value)}
                className="sib-input"
              />
            </div>
            <div>
              <InputField
                name="magazzino"
                label="Magazzino"
                value={magazzinoId}
                onChange={e => setMagazzinoId(e.target.value)}
                placeholder="principale"
              />
            </div>
          </div>

          <InputField
            className="mov-barcode__field"
            name="note"
            label="Note (opzionale)"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Es. n° DDT, lotto, motivo rettifica..."
          />

          {feedback && (
            <div className={`mov-barcode__feedback mov-barcode__feedback--${feedback.kind}`}>
              <Ico
                n={feedback.kind === 'success' ? 'check' : feedback.kind === 'error' ? 'alert' : 'info'}
                s={13}
                c="currentColor"
              />
              {feedback.text}
            </div>
          )}

          <div className="mov-barcode__actions">
            <button
              className="sib-btn sib-btn--primary"
              disabled={!prodotto || !quantita}
              onClick={handleSubmit}
            >
              Conferma movimento
            </button>
          </div>
        </section>

        {/* ─── Storico ───────────────────────────────────────────────────── */}
        <section className="mov-barcode__history">
          <div className="mov-barcode__history-title">Ultimi movimenti</div>
          {recenti.length === 0 ? (
            <div className="mov-barcode__empty">Nessun movimento registrato.</div>
          ) : (
            <div className="mov-barcode__list">
              {recenti.map(m => {
                const p = prodotti.find(x => x.id === m.prodottoId)
                const dt = new Date(m.ts)
                const dateStr = dt.toLocaleDateString('it-IT')
                const timeStr = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                const sign = m.tipo === 'uscita' ? '−' : m.tipo === 'rettifica' ? '±' : '+'
                const cls = `mov-barcode__entry mov-barcode__entry--${m.tipo}`
                return (
                  <div key={m.id} className={cls}>
                    <div className="mov-barcode__entry-when">
                      <div className="mov-barcode__entry-date">{dateStr}</div>
                      <div className="mov-barcode__entry-time">{timeStr}</div>
                    </div>
                    <div className="mov-barcode__entry-body">
                      <div className="mov-barcode__entry-name">{p?.nome ?? `Prodotto ${m.prodottoId}`}</div>
                      <div className="mov-barcode__entry-meta">
                        <span className="mov-barcode__entry-bar">{m.barcode}</span>
                        {m.note && <span className="mov-barcode__entry-note">— {m.note}</span>}
                      </div>
                    </div>
                    <div className="mov-barcode__entry-qty">
                      <span className="mov-barcode__entry-sign">{sign}</span>{m.quantita}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
