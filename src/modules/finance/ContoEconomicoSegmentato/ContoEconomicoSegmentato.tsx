import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import VistaSwitch, { VistaOpzione } from '../../../core/components/VistaSwitch'
import { SelectField } from '../../../core/components/form'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import {
  BaseRiparto, Fonte, Voce, calcola, contoGruppo, contoStruttura, fmtNum, fmtPct, tot,
} from './cesData'
import CostiComuniModal from './CostiComuniModal'
import AnalisiSegmentataModal from './AnalisiSegmentataModal'
import CesPannello from './CesPannello'
import './ContoEconomicoSegmentato.sass'

/**
 * Conto economico segmentato — riclassifica il conto economico (bilancio o
 * preventivo da Business Central) per segmento:
 * Ricavi − Costi variabili → Margine di contribuzione − Costi fissi specifici
 * → Margine specifico − Costi comuni allocati al segmento → Margine netto.
 *
 * Impianto dal disegno di Matteo: colonna del totale (gruppo o struttura) in
 * testa, poi i segmenti; "Analisi segmentata" sopra le voci apre la modale a
 * card; a destra le card Ricavi (totale + ripartizione) e Costi comuni
 * (totale + criterio di riparto); il margine netto chiude ogni colonna in un
 * riquadro. Multi-struttura: cliccando un hotel si apre il suo conto per linee
 * di ricavo (Soggiorno, F&B, SPA).
 */

const ANNI = ['2024', '2025', '2026', '2027']

const FONTI: VistaOpzione<Fonte>[] = [
  { value: 'consuntivo', label: 'Bilancio',   icon: 'fa-file-invoice',   hint: 'Consuntivo' },
  { value: 'preventivo', label: 'Preventivo', icon: 'fa-calendar-lines-pen', hint: 'Bilancio preventivo' },
]

type Sezione = 'var' | 'fix' | 'com'
type NomeEbitda = 'EBITDA' | 'MOL'

// Denominazione scelta col tasto destro: preferenza del singolo utente
const CHIAVE_NOME = 'sibylla.ces.nome-ebitda'
function leggiNome(): NomeEbitda {
  try { return localStorage.getItem(CHIAVE_NOME) === 'MOL' ? 'MOL' : 'EBITDA' } catch { return 'EBITDA' }
}
type Card = 'ricavi' | 'comuni'

export default function ContoEconomicoSegmentato({ navigate }: { navigate: (p: string) => void }) {
  const { elenco } = useStrutturaCorrente()
  const gruppo = elenco.length > 1
  const [anno, setAnno] = useState('2026')
  const [fonte, setFonte] = useState<Fonte>('consuntivo')
  const [base, setBase] = useState<BaseRiparto>('ricavi')
  // Struttura aperta (drill-down); con struttura singola è sempre quella
  const [aperta, setAperta] = useState<string | null>(null)
  const struttura = gruppo ? aperta : elenco[0] ?? null
  const [chiuse, setChiuse] = useState<Record<Sezione, boolean>>({ var: true, fix: true, com: true })
  const [modal, setModal] = useState<null | 'comuni' | 'analisi'>(null)
  // Card del pannello evidenziata dal clic sulla voce corrispondente in tabella
  const [evidenza, setEvidenza] = useState<Card | null>(null)
  const pannelloRef = useRef<HTMLDivElement>(null)
  // EBITDA ↔ MOL: menu contestuale sull'etichetta della riga
  const [nomeEbitda, setNomeEbitda] = useState<NomeEbitda>(leggiNome)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    if (!menu) return
    const chiudi = () => setMenu(null)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi() }
    window.addEventListener('click', chiudi)
    window.addEventListener('scroll', chiudi, true)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('click', chiudi)
      window.removeEventListener('scroll', chiudi, true)
      window.removeEventListener('keydown', esc)
    }
  }, [menu])
  function scegliNome(n: NomeEbitda) {
    setNomeEbitda(n)
    setMenu(null)
    try { localStorage.setItem(CHIAVE_NOME, n) } catch { /* preferenza non salvata */ }
  }

  const conto = useMemo(
    () => (struttura ? contoStruttura(struttura, anno, fonte, base, gruppo ? elenco : undefined) : contoGruppo(elenco, anno, fonte)),
    [struttura, anno, fonte, base, gruppo, elenco],
  )
  const c = useMemo(() => calcola(conto, base), [conto, base])
  const seg = conto.segmenti
  const nomeTotale = struttura ?? 'Gruppo'
  const titoloVista = struttura ? `${struttura} · linee di ricavo` : 'Gruppo · strutture'

  function mostraCard(card: Card) {
    setEvidenza(card)
    pannelloRef.current?.querySelector(`[data-card="${card}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.setTimeout(() => setEvidenza(e => (e === card ? null : e)), 1600)
  }

  // ── Righe della tabella (ordine del disegno) ────────────────────────────
  type Riga =
    | { tipo: 'voce'; label: string; valori: number[]; sez: Sezione }
    | { tipo: 'sub'; label: string; valori: number[]; sez: Sezione; card?: Card }
    | { tipo: 'margine'; label: string; valori: number[]; hint?: string; card?: Card; netto?: boolean; secondario?: boolean }
  const dettaglio = (voci: Voce[], src: Record<string, number[]>, sez: Sezione): Riga[] =>
    voci.filter(v => src[v.key].some(x => x !== 0)).map(v => ({ tipo: 'voce', label: v.label, valori: src[v.key], sez }))

  const righe: Riga[] = [
    { tipo: 'margine', label: 'Ricavi', valori: c.ricavi, card: 'ricavi' },
    { tipo: 'sub', label: 'Costi variabili', valori: c.totVariabili, sez: 'var' },
    ...dettaglio(conto.vociVariabili, c.variabili, 'var'),
    { tipo: 'margine', label: 'Margine di contribuzione', valori: c.mdc, hint: 'Ricavi − Costi variabili' },
    { tipo: 'sub', label: 'Costi fissi specifici', valori: c.totFissi, sez: 'fix' },
    ...dettaglio(conto.vociFisse, c.fissi, 'fix'),
    { tipo: 'margine', label: 'Margine specifico', valori: c.mss, hint: 'Margine di contribuzione − Costi fissi specifici' },
    { tipo: 'sub', label: 'Costi comuni allocati al segmento', valori: c.totComuni, sez: 'com', card: 'comuni' },
    ...dettaglio(conto.vociComuni, c.comuni, 'com'),
    { tipo: 'margine', label: 'Margine netto', valori: c.ebit, netto: true, hint: 'EBIT: Margine specifico − Costi comuni allocati al segmento' },
    { tipo: 'margine', label: nomeEbitda, valori: c.ebitda, secondario: true, hint: `${nomeEbitda === 'MOL' ? 'Margine operativo lordo' : 'EBITDA'}: margine netto + ammortamenti (specifici e comuni allocati) · tasto destro per chiamarlo ${nomeEbitda === 'MOL' ? 'EBITDA' : 'MOL'}` },
  ]
  const visibili = righe.filter(r => r.tipo !== 'voce' || !chiuse[r.sez])

  // ── Export ──────────────────────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null)
  const nomeFile = `conto-economico-segmentato-${struttura ? struttura.toLowerCase().replace(/\s+/g, '-') : 'gruppo'}-${anno}-${fonte}`
  const titoloExport = `Conto economico segmentato — ${titoloVista} · ${fonte === 'consuntivo' ? 'Bilancio' : 'Preventivo'} ${anno}`
  function exportXls() {
    const header = ['Voce', nomeTotale, ...seg.map(s => s.nome)]
    const rows: (string | number)[][] = [['Peso costi comuni', '100%', ...c.pesi.map(p => fmtPct(p, 0))]]
    righe.forEach(r => rows.push([r.label, tot(r.valori), ...r.valori]))
    exportTableToXls(`${nomeFile}.xls`, header, rows, titoloExport)
  }
  const exportPdf = () => exportElementToPdf(tableRef.current, `${nomeFile}.pdf`, titoloExport)

  const toggle = (s: Sezione) => setChiuse(x => ({ ...x, [s]: !x[s] }))
  const neg = (v: number) => (v < 0 ? 'ces__neg' : '')
  const totRicavi = tot(c.ricavi)

  // Etichetta con collegamento alla card del pannello (Ricavi, Costi comuni)
  const etichetta = (r: Riga) => {
    const testo = r.tipo === 'margine' && r.hint
      ? <Tooltip text={r.hint}><span className="ces__mrg-lbl">{r.label}</span></Tooltip>
      : <TruncatedText text={r.label} className="ces__voce-txt" />
    if (!('card' in r) || !r.card) return testo
    const card = r.card
    return (
      <span className="ces__lbl-card">
        {testo}
        <Tooltip text={card === 'ricavi' ? 'Ripartizione dei ricavi' : 'Criterio di riparto dei costi comuni'}>
          <button type="button" className="ces__card-link" aria-label={card === 'ricavi' ? 'Mostra la card Ricavi' : 'Mostra la card Costi comuni'}
            onClick={e => { e.stopPropagation(); mostraCard(card) }}>
            <i className={`fa-solid ${card === 'ricavi' ? 'fa-chart-pie' : 'fa-sliders'}`} aria-hidden="true" />
          </button>
        </Tooltip>
      </span>
    )
  }

  // Valore di margine con incidenza % sui ricavi
  const cellaMargine = (v: number, ricavi: number, r: Extract<Riga, { tipo: 'margine' }>, key: React.Key, totale = false) => (
    <td key={key} className={`ces__num ${totale ? 'ces__tot' : ''} ${neg(v)}`}>
      {r.netto ? (
        <span className={`ces__box ${v < 0 ? 'ces__box--neg' : ''}`}>
          {fmtNum(v)}
          {ricavi > 0 && <span className="ces__inc">{fmtPct(v / ricavi)}</span>}
        </span>
      ) : (
        <>
          {fmtNum(v)}
          {r.label !== 'Ricavi' && ricavi > 0 && <span className="ces__inc">{fmtPct(v / ricavi)}</span>}
          {r.label === 'Ricavi' && !totale && totRicavi > 0 && <span className="ces__inc">{fmtPct(v / totRicavi, 0)} del totale</span>}
        </>
      )}
    </td>
  )

  return (
    <div className="ces">
      <PageHead title="Conto economico segmentato" subtitle="Margini per segmento: contribuzione, margine specifico e margine netto" />

      <div className="ces__toolbar">
        <div className="ces__filters">
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(e.target.value)} options={ANNI.map(a => ({ value: a, label: a }))} className="w-24" />
          <VistaSwitch value={fonte} options={FONTI} onChange={setFonte} ariaLabel="Fonte del conto economico" />
        </div>
        <div className="ces__actions">
          <Tooltip text="Esporta PDF"><button className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={exportPdf}><i className="fa-regular fa-file-pdf" /></button></Tooltip>
          <Tooltip text="Esporta Excel"><button className="sib-btn sib-btn--icon" aria-label="Esporta Excel" onClick={exportXls}><i className="fa-regular fa-file-xls" /></button></Tooltip>
        </div>
      </div>

      {/* Percorso: gruppo → struttura */}
      <div className="ces__crumbs">
        {gruppo && struttura ? (
          <>
            <button type="button" className="ces__crumb-link" onClick={() => setAperta(null)}>
              <i className="fa-solid fa-hotel" aria-hidden="true" /> Gruppo
            </button>
            <i className="fa-solid fa-chevron-right ces__crumb-sep" aria-hidden="true" />
            <span className="ces__crumb-cur">{struttura}</span>
            <span className="ces__crumb-hint">Soggiorno, F&amp;B e SPA</span>
          </>
        ) : gruppo ? (
          <>
            <span className="ces__crumb-cur"><i className="fa-solid fa-hotel" aria-hidden="true" /> Gruppo</span>
            <span className="ces__crumb-hint">{seg.length} hotel · clicca un hotel per vederne Soggiorno, F&amp;B e SPA</span>
          </>
        ) : (
          <>
            <span className="ces__crumb-cur">{struttura}</span>
            <span className="ces__crumb-hint">Soggiorno, F&amp;B e SPA</span>
          </>
        )}
      </div>

      <div className="ces__layout">
        <div className="sib-table-wrap ces__wrap">
          <table className="sib-table ces__table" ref={tableRef}>
            <colgroup>
              <col className="ces__col-voce" />
              <col className="ces__col-tot" />
              {seg.map(s => <col key={s.id} />)}
            </colgroup>
            <thead>
              {/* Pesi dei costi comuni (criterio scelto nella card Costi comuni) */}
              <tr className="ces__pesi">
                <th className="ces__voce">
                  <button type="button" className="ces__pesi-btn" onClick={() => mostraCard('comuni')}>
                    Peso costi comuni
                  </button>
                </th>
                <th className="ces__num ces__tot">100%</th>
                {c.pesi.map((p, i) => (
                  <th key={seg[i].id} className="ces__num">
                    <span className="ces__peso">
                      <span className="ces__peso-bar"><span className={`ces__peso-fill ces__w${Math.round(p * 20)}`} /></span>
                      {fmtPct(p, 0)}
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="ces__head">
                <th className="ces__voce">
                  <button type="button" className="ces__analisi-btn" onClick={() => setModal('analisi')}>
                    <i className="fa-solid fa-grid-2" aria-hidden="true" />
                    Analisi segmentata
                  </button>
                </th>
                <th className="ces__num ces__tot">
                  <span className="ces__tot-name"><TruncatedText text={nomeTotale} className="ces__seg-txt" /></span>
                </th>
                {seg.map((s, i) => (
                  <th key={s.id} className="ces__num ces__seg">
                    {!struttura ? (
                      <Tooltip text={`Apri ${s.nome}: Soggiorno, F&B e SPA`}>
                        <button type="button" className="ces__seg-link" onClick={() => setAperta(s.nome)}>
                          <i className={`ces__dot ces__dot--${i}`} aria-hidden="true" />
                          <TruncatedText text={s.nome} className="ces__seg-txt" />
                          <i className="fa-solid fa-arrow-down-right ces__seg-go" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    ) : (
                      <span className="ces__seg-name">
                        <i className={`ces__dot ces__dot--${i}`} aria-hidden="true" />
                        <TruncatedText text={s.nome} className="ces__seg-txt" />
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibili.map(r => {
                const t = tot(r.valori)
                if (r.tipo === 'voce') return (
                  <tr key={`${r.sez}-${r.label}`} className="ces__row-voce">
                    <td className="ces__voce ces__voce--det"><TruncatedText text={r.label} className="ces__voce-txt" /></td>
                    <td className="ces__num ces__tot">{fmtNum(t)}</td>
                    {r.valori.map((v, i) => <td key={i} className="ces__num">{v ? fmtNum(v) : '—'}</td>)}
                  </tr>
                )
                if (r.tipo === 'sub') return (
                  <tr key={r.label} className="ces__row-sub">
                    <td className="ces__voce">
                      <span className="ces__sub-cell">
                        <button type="button" className="ces__sub-toggle" aria-expanded={!chiuse[r.sez]} aria-label={`${chiuse[r.sez] ? 'Mostra' : 'Nascondi'} il dettaglio`} onClick={() => toggle(r.sez)}>
                          <i className={`fa-solid fa-chevron-${chiuse[r.sez] ? 'right' : 'down'}`} aria-hidden="true" />
                        </button>
                        {etichetta(r)}
                      </span>
                    </td>
                    <td className="ces__num ces__tot">{fmtNum(t)}</td>
                    {r.valori.map((v, i) => <td key={i} className="ces__num">{fmtNum(v)}</td>)}
                  </tr>
                )
                return (
                  <tr key={r.label} className={`ces__row-mrg ${r.netto ? 'ces__row-mrg--netto' : ''} ${r.secondario ? 'ces__row-mrg--sec' : ''}`}>
                    <td className="ces__voce"
                      onContextMenu={r.secondario ? e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }) } : undefined}>
                      {etichetta(r)}
                    </td>
                    {cellaMargine(t, totRicavi, r, 'tot', true)}
                    {r.valori.map((v, i) => cellaMargine(v, c.ricavi[i], r, i))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <CesPannello
          ref={pannelloRef}
          evidenza={evidenza}
          titolo={nomeTotale}
          segmenti={seg}
          calcolo={c}
          comuni={conto.comuni}
          base={base}
          onBase={setBase}
          vistaStruttura={!!struttura}
          onDettaglioComuni={() => setModal('comuni')}
          sottotitolo={`${fonte === 'consuntivo' ? 'Bilancio' : 'Preventivo'} ${anno}`}
        />
      </div>

      <div className="ces__fonte">
        <i className="fa-solid fa-plug" aria-hidden="true" />
        <span>Valori in € · fonte Business Central, {fonte === 'consuntivo' ? 'bilancio' : 'bilancio preventivo'} {anno}. Le % sotto i margini sono l'incidenza sui ricavi della colonna.</span>
        <button type="button" className="ces__link" onClick={() => navigate('configuratore:costi-mapping')}>
          Classificazione dei costi <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </div>

      {menu && (
        <div className="ces__menu" role="menu" aria-label="Denominazione della riga"
          style={{ '--mx': `${menu.x}px`, '--my': `${menu.y}px` } as React.CSSProperties}
          onClick={e => e.stopPropagation()}>
          <span className="ces__menu-tit">Denominazione</span>
          {(['EBITDA', 'MOL'] as NomeEbitda[]).map(n => (
            <button key={n} type="button" role="menuitemradio" aria-checked={nomeEbitda === n} className="ces__menu-item" onClick={() => scegliNome(n)}>
              <i className={`fa-solid fa-check ${nomeEbitda === n ? '' : 'ces__menu-off'}`} aria-hidden="true" />
              {n === 'MOL' ? 'MOL · Margine operativo lordo' : 'EBITDA'}
            </button>
          ))}
        </div>
      )}

      <CostiComuniModal
        open={modal === 'comuni'}
        onClose={() => setModal(null)}
        base={base}
        onChange={setBase}
        vistaStruttura={!!struttura}
        voci={conto.vociComuni}
        comuni={conto.comuni}
        segmenti={seg.map(s => s.nome)}
        quote={c.comuni}
        pesi={c.pesi}
      />
      <AnalisiSegmentataModal
        open={modal === 'analisi'}
        onClose={() => setModal(null)}
        titolo={titoloVista}
        segmenti={seg}
        calcolo={c}
        vociVariabili={conto.vociVariabili}
      />
    </div>
  )
}
