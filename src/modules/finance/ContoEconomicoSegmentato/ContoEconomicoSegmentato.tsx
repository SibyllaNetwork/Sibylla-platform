import React, { useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import VistaSwitch, { VistaOpzione } from '../../../core/components/VistaSwitch'
import { SelectField } from '../../../core/components/form'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import {
  BaseRiparto, Fonte, Voce, BASI, calcola, contoGruppo, contoStruttura, fmtNum, fmtPct, tot,
} from './cesData'
import CostiComuniModal from './CostiComuniModal'
import AnalisiSegmentataModal from './AnalisiSegmentataModal'
import './ContoEconomicoSegmentato.sass'

/**
 * Conto economico segmentato — riclassifica il conto economico (bilancio o
 * preventivo da Business Central) per segmento:
 * Ricavi − Costi variabili → Margine di contribuzione − Costi fissi specifici
 * → Margine di segmento specifico − Costi comuni allocati → EBIT; EBITDA.
 *
 * Multi-struttura: i segmenti sono le strutture del gruppo; cliccando il nome
 * di una struttura si apre il suo conto segmentato per linee di ricavo (Room
 * department, F&B, SPA, Servizi ancillari). Struttura singola: si parte dalle
 * linee di ricavo.
 */

const ANNI = ['2024', '2025', '2026', '2027']

const FONTI: VistaOpzione<Fonte>[] = [
  { value: 'consuntivo', label: 'Bilancio',   icon: 'fa-file-invoice',   hint: 'Consuntivo' },
  { value: 'preventivo', label: 'Preventivo', icon: 'fa-calendar-lines-pen', hint: 'Bilancio preventivo' },
]

type Sezione = 'var' | 'fix' | 'com'

export default function ContoEconomicoSegmentato({ navigate }: { navigate: (p: string) => void }) {
  const { elenco } = useStrutturaCorrente()
  const gruppo = elenco.length > 1
  const [anno, setAnno] = useState('2026')
  const [fonte, setFonte] = useState<Fonte>('consuntivo')
  const [base, setBase] = useState<BaseRiparto>('ricavi')
  // Struttura aperta (drill-down); con struttura singola è sempre quella
  const [aperta, setAperta] = useState<string | null>(null)
  const struttura = gruppo ? aperta : elenco[0] ?? null
  const [chiuse, setChiuse] = useState<Record<Sezione, boolean>>({ var: false, fix: false, com: false })
  const [modal, setModal] = useState<null | 'comuni' | 'analisi'>(null)

  const conto = useMemo(
    () => (struttura ? contoStruttura(struttura, anno, fonte, base, gruppo ? elenco : undefined) : contoGruppo(elenco, anno, fonte)),
    [struttura, anno, fonte, base, gruppo, elenco],
  )
  const c = useMemo(() => calcola(conto, base), [conto, base])
  const seg = conto.segmenti
  const baseInfo = BASI.find(b => b.value === base)!
  // "Per numero di hotel" ha senso solo fra strutture: fra le linee è "in parti uguali"
  const baseBreve = base === 'uguale' && struttura ? 'parti uguali' : baseInfo.breve
  const titoloVista = struttura ? `${struttura} · linee di ricavo` : 'Gruppo · strutture'

  // ── Righe della tabella ─────────────────────────────────────────────────
  type Riga =
    | { tipo: 'voce'; label: string; valori: number[]; sez: Sezione }
    | { tipo: 'sub'; label: string; valori: number[]; sez?: Sezione; costo?: boolean }
    | { tipo: 'margine'; label: string; valori: number[]; forte?: boolean; hint?: string }
    | { tipo: 'spazio' }
  const dettaglio = (voci: Voce[], src: Record<string, number[]>, sez: Sezione): Riga[] =>
    voci.filter(v => src[v.key].some(x => x !== 0)).map(v => ({ tipo: 'voce', label: v.label, valori: src[v.key], sez }))

  const righe: Riga[] = [
    { tipo: 'margine', label: 'Ricavi', valori: c.ricavi },
    { tipo: 'spazio' },
    ...dettaglio(conto.vociVariabili, c.variabili, 'var'),
    { tipo: 'sub', label: 'Costi variabili', valori: c.totVariabili, sez: 'var', costo: true },
    { tipo: 'margine', label: 'Margine di contribuzione', valori: c.mdc, hint: 'Ricavi − Costi variabili' },
    { tipo: 'spazio' },
    ...dettaglio(conto.vociFisse, c.fissi, 'fix'),
    { tipo: 'sub', label: 'Costi fissi specifici', valori: c.totFissi, sez: 'fix', costo: true },
    { tipo: 'margine', label: 'Margine di segmento specifico', valori: c.mss, hint: 'Margine di contribuzione − Costi fissi specifici' },
    { tipo: 'spazio' },
    ...dettaglio(conto.vociComuni, c.comuni, 'com'),
    { tipo: 'sub', label: `Costi comuni allocati`, valori: c.totComuni, sez: 'com', costo: true },
    { tipo: 'margine', label: 'EBIT', valori: c.ebit, forte: true, hint: 'Margine netto: Margine di segmento specifico − Costi comuni allocati' },
    { tipo: 'margine', label: 'EBITDA', valori: c.ebitda, forte: true, hint: 'EBIT + ammortamenti (specifici e comuni allocati)' },
  ]
  const visibili = righe.filter(r => r.tipo !== 'voce' || !chiuse[r.sez])

  // ── Export ──────────────────────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null)
  const nomeFile = `conto-economico-segmentato-${struttura ? struttura.toLowerCase().replace(/\s+/g, '-') : 'gruppo'}-${anno}-${fonte}`
  const titoloExport = `Conto economico segmentato — ${titoloVista} · ${fonte === 'consuntivo' ? 'Bilancio' : 'Preventivo'} ${anno}`
  function exportXls() {
    const header = ['Voce', ...seg.map(s => s.nome), 'Totale']
    const rows: (string | number)[][] = [['Peso costi comuni', ...c.pesi.map(p => fmtPct(p, 0)), '100%']]
    righe.forEach(r => { if (r.tipo !== 'spazio') rows.push([r.label, ...r.valori, tot(r.valori)]) })
    exportTableToXls(`${nomeFile}.xls`, header, rows, titoloExport)
  }
  const exportPdf = () => exportElementToPdf(tableRef.current, `${nomeFile}.pdf`, titoloExport)

  const toggle = (s: Sezione) => setChiuse(x => ({ ...x, [s]: !x[s] }))
  const tono = (v: number) => (v < 0 ? 'ces__neg' : '')

  return (
    <div className="ces">
      <PageHead title="Conto economico segmentato" subtitle="Margini per segmento: contribuzione, margine specifico, EBIT ed EBITDA" />

      <div className="ces__toolbar">
        <div className="ces__filters">
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(e.target.value)} options={ANNI.map(a => ({ value: a, label: a }))} className="w-24" />
          <VistaSwitch value={fonte} options={FONTI} onChange={setFonte} ariaLabel="Fonte del conto economico" />
        </div>
        <div className="ces__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModal('comuni')}>
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Costi comuni
            <span className="ces__btn-sub">· {baseBreve}</span>
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setModal('analisi')}>
            <i className="fa-solid fa-chart-mixed" aria-hidden="true" />
            Analisi segmentata
          </button>
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
            <span className="ces__crumb-hint">linee di ricavo</span>
          </>
        ) : gruppo ? (
          <>
            <span className="ces__crumb-cur"><i className="fa-solid fa-hotel" aria-hidden="true" /> Gruppo</span>
            <span className="ces__crumb-hint">{seg.length} strutture · clicca il nome di una struttura per vederne le linee di ricavo</span>
          </>
        ) : (
          <>
            <span className="ces__crumb-cur">{struttura}</span>
            <span className="ces__crumb-hint">linee di ricavo</span>
          </>
        )}
      </div>

      <div className="sib-table-wrap ces__wrap">
        <table className="sib-table ces__table" ref={tableRef}>
          <colgroup>
            <col className="ces__col-voce" />
            {seg.map(s => <col key={s.id} />)}
            <col className="ces__col-tot" />
          </colgroup>
          <thead>
            {/* Pesi dei costi comuni (criterio scelto con "Costi comuni") */}
            <tr className="ces__pesi">
              <th className="ces__voce">
                <button type="button" className="ces__pesi-btn" onClick={() => setModal('comuni')}>
                  Peso costi comuni <span>· {baseBreve}</span>
                </button>
              </th>
              {c.pesi.map((p, i) => (
                <th key={seg[i].id} className="ces__num">
                  <span className="ces__peso">
                    <span className="ces__peso-bar"><span className={`ces__peso-fill ces__w${Math.round(p * 20)}`} /></span>
                    {fmtPct(p, 0)}
                  </span>
                </th>
              ))}
              <th className="ces__num ces__tot">100%</th>
            </tr>
            <tr>
              <th className="ces__voce">Valori in €</th>
              {seg.map(s => (
                <th key={s.id} className="ces__num ces__seg">
                  {!struttura ? (
                    <Tooltip text={`Apri il conto segmentato di ${s.nome} per linee di ricavo`}>
                      <button type="button" className="ces__seg-link" onClick={() => setAperta(s.nome)}>
                        <TruncatedText text={s.nome} className="ces__seg-txt" />
                        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  ) : (
                    <TruncatedText text={s.nome} className="ces__seg-txt" />
                  )}
                </th>
              ))}
              <th className="ces__num ces__tot">Totale</th>
            </tr>
          </thead>
          <tbody>
            {visibili.map((r, idx) => {
              if (r.tipo === 'spazio') return <tr key={`sp-${idx}`} className="ces__spazio"><td colSpan={seg.length + 2} /></tr>
              const t = tot(r.valori)
              if (r.tipo === 'voce') return (
                <tr key={`${r.sez}-${r.label}`} className="ces__row-voce">
                  <td className="ces__voce ces__voce--det"><TruncatedText text={r.label} className="ces__voce-txt" /></td>
                  {r.valori.map((v, i) => <td key={i} className="ces__num">{v ? fmtNum(v) : '—'}</td>)}
                  <td className="ces__num ces__tot">{fmtNum(t)}</td>
                </tr>
              )
              if (r.tipo === 'sub') return (
                <tr key={r.label} className="ces__row-sub">
                  <td className="ces__voce">
                    <button type="button" className="ces__sub-toggle" aria-expanded={!chiuse[r.sez!]} onClick={() => toggle(r.sez!)}>
                      <i className={`fa-solid fa-chevron-${chiuse[r.sez!] ? 'right' : 'down'}`} aria-hidden="true" />
                      {r.label}
                    </button>
                  </td>
                  {r.valori.map((v, i) => <td key={i} className="ces__num">{fmtNum(v)}</td>)}
                  <td className="ces__num ces__tot">{fmtNum(t)}</td>
                </tr>
              )
              // margine / ricavi
              return (
                <tr key={r.label} className={`ces__row-mrg ${r.forte ? 'ces__row-mrg--forte' : ''}`}>
                  <td className="ces__voce">
                    {r.hint ? (
                      <Tooltip text={r.hint}><span className="ces__mrg-lbl">{r.label}</span></Tooltip>
                    ) : <span className="ces__mrg-lbl">{r.label}</span>}
                  </td>
                  {r.valori.map((v, i) => (
                    <td key={i} className={`ces__num ${tono(v)}`}>
                      {fmtNum(v)}
                      {r.label !== 'Ricavi' && c.ricavi[i] > 0 && <span className="ces__inc">{fmtPct(v / c.ricavi[i])}</span>}
                    </td>
                  ))}
                  <td className={`ces__num ces__tot ${tono(t)}`}>
                    {fmtNum(t)}
                    {r.label !== 'Ricavi' && tot(c.ricavi) > 0 && <span className="ces__inc">{fmtPct(t / tot(c.ricavi))}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="ces__fonte">
        <i className="fa-solid fa-plug" aria-hidden="true" />
        <span>Fonte: Business Central · {fonte === 'consuntivo' ? 'bilancio' : 'bilancio preventivo'} {anno}. Le % sotto i margini sono l'incidenza sui ricavi del segmento.</span>
        <button type="button" className="ces__link" onClick={() => navigate('configuratore:costi-mapping')}>
          Classificazione dei costi <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </div>

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
