import React, { useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import VistaSwitch, { VistaOpzione } from '../../../core/components/VistaSwitch'
import { SelectField } from '../../../core/components/form'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import MwfFlusso from './MwfFlusso'
import MwfCascata from './MwfCascata'
import MwfMacchina from './MwfMacchina'
import { CAMERE, Prospettiva, SEGMENTI, Voce, conto, fmtCompatto, fmtEuro, fmtPct, genera } from './mwfData'
import './MarginWaterfall.sass'

/**
 * Margin waterfall (disegno del CEO): dai ricavi si tolgono i costi variabili,
 * resta il margine di contribuzione, si tolgono i costi fissi, resta l'utile.
 *
 * Flusso del denaro (Sankey animato): i ricavi di ogni segmento (o tipologia
 * di camera) sono mattoncini nell'elenco a destra; quelli attivi entrano nel
 * flusso, che si divide in costi variabili, margine di contribuzione, costi
 * fissi e utile. Si tolgono e rimettono con un clic o trascinandoli sul
 * grafico. Il carosello in basso filtra sull'altra dimensione; lo switch
 * inverte la prospettiva. In alternativa la Macchina (linea di produzione:
 * tramoggia, digestore, nastro, pressa, bancale) e la Cascata.
 */

const ANNI = [2024, 2025, 2026]

const PROSPETTIVE: VistaOpzione<Prospettiva>[] = [
  { value: 'segmento', label: 'Segmenti → camere', icon: 'fa-users', hint: 'Mattoncini per segmento' },
  { value: 'camera', label: 'Camere → segmenti', icon: 'fa-bed', hint: 'Mattoncini per tipologia' },
]
type Forma = 'flusso' | 'macchina' | 'cascata'
const FORME: VistaOpzione<Forma>[] = [
  { value: 'flusso', label: 'Flusso', icon: 'fa-water', hint: 'Dove va ogni euro' },
  { value: 'macchina', label: 'Macchina', icon: 'fa-industry', hint: 'Linea di produzione' },
  { value: 'cascata', label: 'Cascata', icon: 'fa-chart-waterfall', hint: 'Waterfall' },
]

export default function MarginWaterfall({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const [anno, setAnno] = useState(2026)
  const [prospettiva, setProspettiva] = useState<Prospettiva>('segmento')
  const [forma, setForma] = useState<Forma>('flusso')
  // Mattoncini attivi nel flusso (voci dell'elenco a destra) e filtro del carosello
  const [dentro, setDentro] = useState<string[]>(SEGMENTI.map(v => v.id))
  const [sopra, setSopra] = useState(false)
  const [selCarosello, setSelCarosello] = useState<string | null>(null)
  // Macchina: ultimo pacchetto caricato a mano (cade solo lui nella tramoggia)
  const [ultimo, setUltimo] = useState<string | null>(null)
  const macchina = forma === 'macchina'

  const d = useMemo(() => genera(struttura, anno), [struttura, anno])
  const elenco: Voce[] = prospettiva === 'segmento' ? SEGMENTI : CAMERE
  const carosello: Voce[] = prospettiva === 'segmento' ? CAMERE : SEGMENTI
  const nomeElenco = prospettiva === 'segmento' ? 'segmento' : 'tipologia di camera'
  const nomeCarosello = prospettiva === 'segmento' ? 'Tipologie di camera' : 'Segmenti'

  // camera / segmento dalla coppia (elenco, carosello) secondo la prospettiva
  type F = string | string[] | null
  const filtro = (el: F, ca: F) => (prospettiva === 'segmento' ? conto(d, ca, el) : conto(d, el, ca))

  const mattoncini = elenco.map(v => ({ ...v, ricavi: filtro(v.id, selCarosello).ricavi }))
  const cTutti = filtro(null, selCarosello)
  const cImbuto = filtro(dentro, selCarosello)
  const nome = (lista: Voce[], id: string | null) => lista.find(v => v.id === id)?.nome

  const versa = (id: string) => { setDentro(x => (x.includes(id) ? x : [...x, id])); setUltimo(id) }
  const togli = (id: string) => { setDentro(x => x.filter(v => v !== id)); setUltimo(null) }
  const versaTutti = () => { setDentro(elenco.map(v => v.id)); setUltimo(null) }
  const scambia = (id: string, versato: boolean) => (versato ? togli(id) : versa(id))

  // La Macchina parte con la tramoggia vuota: i ricavi si caricano uno per volta
  function cambiaForma(f: Forma) {
    setForma(f)
    if (f === 'macchina') { setDentro([]); setUltimo(null) }
  }

  function cambiaProspettiva(p: Prospettiva) {
    setProspettiva(p)
    setDentro((p === 'segmento' ? SEGMENTI : CAMERE).map(v => v.id))
    setSelCarosello(null)
    setUltimo(null)
  }

  // ── Carosello ────────────────────────────────────────────────────────
  const trackRef = useRef<HTMLDivElement>(null)
  const scorri = (dir: number) => trackRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' })

  function exportXls() {
    const header = ['Tipologia di camera', 'Segmento', 'Notti', 'Ricavi', 'Costi di camera', 'Commissioni', 'Margine di contribuzione', 'Costi fissi (ripartiti)', 'Utile']
    const rows = CAMERE.flatMap(c => SEGMENTI.map(s => {
      const k = conto(d, c.id, s.id)
      return [c.nome, s.nome, k.notti, k.ricavi, k.costiCamera, k.commissioni, k.mdc, k.costiFissi, k.utile]
    }))
    exportTableToXls(`margin-waterfall-${anno}.xls`, header, rows, `Margin waterfall — ${struttura} ${anno}`)
  }

  const sorgenti = elenco.filter(v => dentro.includes(v.id)).map(v => ({ id: v.id, nome: v.nome, conto: filtro(v.id, selCarosello) }))
  const riproduci = `${struttura}|${anno}|${prospettiva}|${selCarosello ?? ''}`

  const passo = (v: number, tot: number) => (tot > 0 ? Math.max(0, Math.min(20, Math.round((v / tot) * 20))) : 0)
  const titoloGraf = nome(carosello, selCarosello) ?? 'Tutta la struttura'

  return (
    <div className="mwf">
      <PageHead title="Margin waterfall" subtitle="Dai ricavi al margine: costi variabili, margine di contribuzione, costi fissi e utile per segmento e tipologia di camera" />

      <div className="mwf__toolbar">
        <div className="mwf__filters">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)} options={opzioniStrutture} className="w-56" />
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(Number(e.target.value))} options={ANNI.map(a => ({ value: a, label: String(a) }))} className="w-24" />
          <div className="mwf__switch">
            <span className="mwf__lbl">Prospettiva</span>
            <VistaSwitch value={prospettiva} options={PROSPETTIVE} onChange={cambiaProspettiva} ariaLabel="Prospettiva di analisi" />
          </div>
        </div>
        <div className="mwf__actions">
          <VistaSwitch value={forma} options={FORME} onChange={cambiaForma} ariaLabel="Forma del grafico" />
          <Tooltip text="Esporta Excel"><button className="sib-btn sib-btn--icon" aria-label="Esporta Excel" onClick={exportXls}><i className="fa-regular fa-file-xls" /></button></Tooltip>
        </div>
      </div>

      <div className="mwf__layout">
        {/* ── Grafico ───────────────────────────────────────────────── */}
        <section
          className={`mwf__card mwf__graf ${sopra ? 'mwf__graf--sopra' : ''}`}
          onDragOver={e => { e.preventDefault(); setSopra(true) }}
          onDragLeave={() => setSopra(false)}
          onDrop={e => { e.preventDefault(); setSopra(false); const id = e.dataTransfer.getData('text/plain'); if (id) versa(id) }}
        >
          <header className="mwf__graf-head">
            <div>
              <h2>{titoloGraf}</h2>
              <p>
                {dentro.length === elenco.length
                  ? `Tutti i ricavi per ${nomeElenco}`
                  : `${dentro.length} di ${elenco.length} voci di ricavo ${forma === 'flusso' ? 'nel flusso' : forma === 'macchina' ? 'nella macchina' : 'nel grafico'}`} · {struttura} {anno}
              </p>
            </div>
            <span className="mwf__graf-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={versaTutti} disabled={dentro.length === elenco.length}>
                <i className="fa-solid fa-layer-group" aria-hidden="true" /> Tutti
              </button>
              <Tooltip text="Togli tutti i ricavi">
                <button type="button" className="sib-btn sib-btn--icon" aria-label="Togli tutti i ricavi" onClick={() => setDentro([])} disabled={!dentro.length}>
                  <i className="fa-solid fa-eraser" />
                </button>
              </Tooltip>
            </span>
          </header>
          {forma === 'flusso' ? (
            <MwfFlusso sorgenti={sorgenti} totale={cImbuto} riproduci={riproduci} />
          ) : forma === 'macchina' ? (
            <MwfMacchina sorgenti={sorgenti} totale={cImbuto} riproduci={`${riproduci}|${dentro.join(',')}`} ultimo={ultimo} />
          ) : (
            <MwfCascata c={cImbuto} />
          )}
        </section>

        {/* ── Ricavi: i mattoncini da trascinare ────────────────────── */}
        <aside className="mwf__card mwf__elenco">
          <span className="mwf__card-tit"><i className="fa-solid fa-sack-dollar" aria-hidden="true" />Ricavi</span>
          <strong className="mwf__big">{fmtCompatto(cTutti.ricavi)}</strong>
          <span className="mwf__sub">{titoloGraf} · per {nomeElenco}</span>
          <ul className="mwf__righe">
            {mattoncini.map(m => {
              const k = filtro(m.id, selCarosello)
              const versato = dentro.includes(m.id)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`mwf__brick ${versato ? 'mwf__brick--versato' : 'mwf__brick--fuori'}`}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', m.id); e.dataTransfer.effectAllowed = 'move' }}
                    onClick={macchina ? undefined : () => scambia(m.id, versato)}
                    onDoubleClick={macchina ? () => scambia(m.id, versato) : undefined}
                    aria-pressed={versato}
                    aria-label={`${m.nome}: ${macchina
                      ? (versato ? 'nella macchina, doppio clic per toglierlo' : 'trascina sulla macchina o fai doppio clic per caricarlo')
                      : (versato ? 'nel flusso, clic per toglierlo' : 'trascina sul grafico o clicca per aggiungerlo')}`}
                  >
                    <span className="mwf__brick-top">
                      <i className={`fa-solid ${versato ? 'fa-check' : 'fa-plus'} mwf__brick-grip`} aria-hidden="true" />
                      <i className={`fa-solid ${m.icona}`} aria-hidden="true" />
                      <TruncatedText text={m.nome} className="mwf__brick-nome" />
                      <span className="mwf__brick-val">{fmtCompatto(m.ricavi)}</span>
                    </span>
                    <span className="mwf__brick-bot">
                      <span className="mwf__bar"><span className={`mwf__fill mwf__w${passo(m.ricavi, cTutti.ricavi)}`} /></span>
                      <Tooltip text={`Margine di contribuzione ${fmtEuro(k.mdc)}`}>
                        <span className={`mwf__brick-pct ${k.mdc < 0 ? 'mwf__neg' : ''}`}>MdC {fmtPct(k.ricavi ? k.mdc / k.ricavi : 0, 0)}</span>
                      </Tooltip>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <span className="mwf__hint">
            <i className="fa-solid fa-hand-pointer" aria-hidden="true" />{' '}
            {macchina
              ? 'Carica i ricavi uno per volta: trascina un mattoncino sulla macchina o fai doppio clic (doppio clic di nuovo per toglierlo). La barra è la quota dei ricavi.'
              : 'Clicca un mattoncino per toglierlo o rimetterlo nel flusso (o trascinalo sul grafico). La barra è la quota dei ricavi.'}
          </span>
        </aside>
      </div>

      {/* ── Carosello in basso: filtra sull'altra dimensione ──────────── */}
      <section className="mwf__car" aria-label={nomeCarosello}>
        <h3 className="mwf__car-tit">{nomeCarosello}</h3>
        <div className="mwf__car-row">
          <button type="button" className="mwf__car-nav" aria-label="Precedenti" onClick={() => scorri(-1)}><i className="fa-solid fa-chevron-left" /></button>
          <div className="mwf__car-track" ref={trackRef}>
            {[{ id: null as string | null, nome: 'Tutte', icona: 'fa-layer-group' }, ...carosello].map(v => {
              const k = filtro(dentro.length ? dentro : null, v.id)
              const on = selCarosello === v.id
              return (
                <button key={v.id ?? 'tutte'} type="button" className={`mwf__tile ${on ? 'mwf__tile--on' : ''}`} aria-pressed={on}
                  onClick={() => setSelCarosello(v.id)}>
                  <span className="mwf__tile-head">
                    <i className={`fa-solid ${v.icona}`} aria-hidden="true" />
                    <TruncatedText text={v.nome} className="mwf__tile-nome" />
                  </span>
                  <span className="mwf__tile-big">{fmtCompatto(k.mdc)}</span>
                  <span className="mwf__tile-sub">margine di contribuzione</span>
                  <span className="mwf__bar"><span className={`mwf__fill mwf__w${passo(k.mdc, k.ricavi)}`} /></span>
                  <span className="mwf__tile-dl">
                    <span>Ricavi <strong>{fmtCompatto(k.ricavi)}</strong></span>
                    <span>MdC <strong className={k.mdc < 0 ? 'mwf__neg' : ''}>{fmtPct(k.ricavi ? k.mdc / k.ricavi : 0, 0)}</strong></span>
                  </span>
                  <span className="mwf__tile-dl">
                    <span>Utile <strong className={k.utile < 0 ? 'mwf__neg' : ''}>{fmtCompatto(k.utile)}</strong></span>
                  </span>
                </button>
              )
            })}
          </div>
          <button type="button" className="mwf__car-nav" aria-label="Successivi" onClick={() => scorri(1)}><i className="fa-solid fa-chevron-right" /></button>
        </div>
      </section>

      <p className="mwf__fonte">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        Costi attribuiti con il mapping costi al livello più analitico (in prospettiva da Business Central). Provvisorio: i costi variabili
        si ripartiscono fra tipologie e segmenti per notti (pulizie, lavanderia, amenities) e per canale (commissioni); i costi fissi sui ricavi.
        <button type="button" className="mwf__link" onClick={() => navigate('configuratore:costi-mapping')}>
          Mapping costi <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </p>
    </div>
  )
}
