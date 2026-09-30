// ─── Registro chiusure (Magazzino) ────────────────────────────────────────────
//  Lo storico dei periodi chiusi, magazzino per magazzino: rimanenze finali,
//  consumi e differenze inventariali a costo medio, cioè i numeri che il
//  controllo di gestione riprende per il conto economico dei reparti.
//
//  Una chiusura non si modifica: si riapre. Si può riaprire solo l'ultima di un
//  magazzino e solo finché il periodo successivo non è stato movimentato, con un
//  motivo scritto; la chiusura riaperta resta nel registro (traccia di
//  revisione) e la nuova ne porta il seguito nel numero (…-R1).
import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import Modal from '../../../core/components/Modal'
import Pagination from '../../../core/components/Pagination'
import { SelectField, SearchField, TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  useChiusureMagazzinoStore, magazziniDi, ultimaChiusura,
} from '../../../store/useChiusureMagazzinoStore'
import {
  PERIODO_CORRENTE, STRUTTURE_MAG,
  articoloById, consumoDi, dataOra, decimaliDi, euro, labelPeriodo, labelPeriodoBreve, magazzinoById, perCategoria,
  qta, righeDiChiusura, strutturaById, teoricaDi, valoriVuoti,
  type Chiusura, type StatoChiusura,
} from '../_data/chiusure.model'
import './RegistroChiusure.sass'

const PER_PAGINA = 12

const tondo = (n: number, dec: number) => Math.round(n * 10 ** dec) / 10 ** dec

export default function RegistroChiusure({ navigate }: { navigate?: (p: string) => void }) {
  const chiusure = useChiusureMagazzinoStore(s => s.chiusure)
  const riapri = useChiusureMagazzinoStore(s => s.riapriChiusura)

  const [strutturaId, setStrutturaId] = useState<string>('tutte')
  const [magazzinoId, setMagazzinoId] = useState<string>('tutti')
  const [stato, setStato] = useState<StatoChiusura | 'tutti'>('tutti')
  const [cerca, setCerca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [aperta, setAperta] = useState<Chiusura | null>(null)
  const [daRiaprire, setDaRiaprire] = useState<Chiusura | null>(null)
  const [motivo, setMotivo] = useState('')

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return chiusure
      .filter(c => {
        const m = magazzinoById(c.magazzinoId)
        return (strutturaId === 'tutte' || m?.strutturaId === strutturaId)
          && (magazzinoId === 'tutti' || c.magazzinoId === magazzinoId)
          && (stato === 'tutti' || c.stato === stato)
          && (!q || c.numero.toLowerCase().includes(q) || labelPeriodo(c.periodo).toLowerCase().includes(q))
      })
      .sort((a, b) =>
        b.periodo.localeCompare(a.periodo)
        || (magazzinoById(a.magazzinoId)?.strutturaId ?? '').localeCompare(magazzinoById(b.magazzinoId)?.strutturaId ?? '')
        || a.magazzinoId.localeCompare(b.magazzinoId)
        || b.chiusaIl - a.chiusaIl)
  }, [chiusure, strutturaId, magazzinoId, stato, cerca])

  const pagine = Math.max(1, Math.ceil(righe.length / PER_PAGINA))
  const pag = Math.min(pagina, pagine)
  const vista = righe.slice((pag - 1) * PER_PAGINA, pag * PER_PAGINA)

  const totali = righe
    .filter(c => c.stato === 'definitiva')
    .reduce((t, c) => ({
      finale: t.finale + c.valori.finale,
      consumo: t.consumo + consumoDi(c.valori),
      differenza: t.differenza + c.valori.differenza,
    }), { finale: 0, consumo: 0, differenza: 0 })

  /** Perché una chiusura non si può riaprire (undefined = si può). */
  const bloccoRiapertura = (c: Chiusura): string | undefined => {
    if (c.stato === 'riaperta') return 'Chiusura già riaperta'
    if (ultimaChiusura({ chiusure }, c.magazzinoId)?.id !== c.id) return 'Si può riaprire solo l’ultima chiusura del magazzino'
    if (c.periodo < PERIODO_CORRENTE) return 'Il periodo successivo è già movimentato: la chiusura è consolidata'
    return undefined
  }

  const esportaElenco = () => {
    exportTableToXls(
      'registro-chiusure-magazzino.xlsx',
      ['Numero', 'Periodo', 'Struttura', 'Magazzino', 'Chiusa il', 'Operatore', 'Rimanenza iniziale', 'Entrate', 'Uscite', 'Rimanenza finale', 'Consumo', 'Differenze', 'Stato'],
      righe.map(c => {
        const m = magazzinoById(c.magazzinoId)
        return [
          c.numero, labelPeriodo(c.periodo), strutturaById(m?.strutturaId ?? '')?.nome ?? '', m?.nome ?? '',
          dataOra(c.chiusaIl), c.operatore,
          +c.valori.iniziale.toFixed(2), +c.valori.entrate.toFixed(2), +c.valori.uscite.toFixed(2),
          +c.valori.finale.toFixed(2), +consumoDi(c.valori).toFixed(2), +c.valori.differenza.toFixed(2),
          c.stato === 'definitiva' ? 'Definitiva' : 'Riaperta',
        ]
      }),
      'Registro chiusure',
    )
    toast.success('Registro esportato')
  }

  const esportaChiusura = (c: Chiusura) => {
    exportTableToXls(
      `${c.numero}.xlsx`,
      ['Codice', 'Articolo', 'Categoria', 'U.M.', 'Iniziale', 'Entrate', 'Uscite', 'Teorica', 'Contato', 'Differenza', 'Costo medio', 'Valore finale', 'Valore differenza', 'Causale'],
      righeDiChiusura(c).map(r => {
        const a = articoloById(r.articoloId)!
        const dec = decimaliDi(a.um)
        const t = tondo(teoricaDi(r), dec)
        const fin = r.contato ?? t
        return [
          a.codice, a.nome, a.categoria, a.um, r.iniziale, r.entrate, r.uscite, t, fin, tondo(fin - t, dec),
          r.costo, +(fin * r.costo).toFixed(2), +((fin - t) * r.costo).toFixed(2), r.causale ?? '',
        ]
      }),
      c.numero,
    )
    toast.success(`${c.numero} esportata`)
  }

  const confermaRiapertura = () => {
    if (!daRiaprire) return
    if (!motivo.trim()) { toast.warning('Scrivi il motivo della riapertura'); return }
    riapri(daRiaprire.id, motivo.trim())
    toast.success(`${labelPeriodo(daRiaprire.periodo)} riaperto: la conta è di nuovo nel preliminare`, magazzinoById(daRiaprire.magazzinoId)?.nome)
    setDaRiaprire(null)
    setAperta(null)
    setMotivo('')
  }

  const pulsanteRiapri = (c: Chiusura, conTesto = false) => {
    const blocco = bloccoRiapertura(c)
    const btn = (
      <button
        type="button"
        className={conTesto ? 'sib-btn sib-btn--secondary' : 'regch__act'}
        disabled={!!blocco}
        onClick={() => { setDaRiaprire(c); setMotivo('') }}
        aria-label={`Riapri ${c.numero}`}
      >
        <i className="fa-solid fa-lock-open" aria-hidden="true" />{conTesto && ' Riapri periodo'}
      </button>
    )
    return <Tooltip text={blocco ?? 'Riapri il periodo per correggere la conta'}>{btn}</Tooltip>
  }

  return (
    <div className="regch">
      <PageHead
        title="Registro chiusure"
        subtitle="Storico delle chiusure di magazzino con rimanenze, consumi e differenze inventariali a costo medio"
        actions={
          <button type="button" className="sib-btn sib-btn--secondary" onClick={esportaElenco}>
            <i className="fa-regular fa-file-xls" aria-hidden="true" /> Scarica Excel
          </button>
        }
      />

      <FilterToolbar className="regch__bar">
        <SelectField
          name="struttura" label="Struttura" className="regch__f"
          value={strutturaId}
          options={[{ value: 'tutte', label: 'Tutte' }, ...STRUTTURE_MAG.map(s => ({ value: s.id, label: s.nome }))]}
          onChange={e => { setStrutturaId(e.target.value); setMagazzinoId('tutti'); setPagina(1) }}
        />
        <SelectField
          name="magazzino" label="Magazzino" className="regch__f"
          value={magazzinoId}
          options={[
            { value: 'tutti', label: 'Tutti' },
            ...(strutturaId === 'tutte'
              ? STRUTTURE_MAG.flatMap(s => magazziniDi(s.id).map(m => ({ value: m.id, label: `${m.nome} · ${s.nome}` })))
              : magazziniDi(strutturaId).map(m => ({ value: m.id, label: m.nome }))),
          ]}
          onChange={e => { setMagazzinoId(e.target.value); setPagina(1) }}
        />
        <SelectField
          name="stato" label="Stato" className="regch__f regch__f--sm"
          value={stato}
          options={[
            { value: 'tutti', label: 'Tutti' },
            { value: 'definitiva', label: 'Definitive' },
            { value: 'riaperta', label: 'Riaperte' },
          ]}
          onChange={e => { setStato(e.target.value as StatoChiusura | 'tutti'); setPagina(1) }}
        />
        <div className="regch__cerca">
          <span className="regch__lab">Cerca</span>
          <SearchField
            name="cerca" value={cerca} placeholder="Numero o periodo…"
            onChange={e => { setCerca(e.target.value); setPagina(1) }} onClear={() => setCerca('')}
          />
        </div>
      </FilterToolbar>

      <div className="regch__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table regch__table">
            <colgroup>
              <col className="regch__c-num" /><col className="regch__c-per" />
              <col className="regch__c-str" /><col className="regch__c-mag" />
              <col className="regch__c-data" /><col className="regch__c-eur" />
              <col className="regch__c-eur" /><col className="regch__c-diff" />
              <col className="regch__c-stato" /><col className="regch__c-act" />
            </colgroup>
            <thead>
              <tr>
                <th>Numero</th>
                <th>Periodo</th>
                <th>Struttura</th>
                <th>Magazzino</th>
                <th>Chiusa il</th>
                <th className="regch__amt"><TruncatedText text="Rim. finale" full="Rimanenza finale a costo medio" /></th>
                <th className="regch__amt"><TruncatedText text="Consumo" full="Rimanenza iniziale + entrate − rimanenza finale" /></th>
                <th className="regch__amt"><TruncatedText text="Differenze" full="Differenze inventariali (contato − teorico) a costo medio" /></th>
                <th>Stato</th>
                <th aria-label="Azioni" />
              </tr>
            </thead>
            <tbody>
              {vista.map(c => {
                const m = magazzinoById(c.magazzinoId)
                const quota = c.valori.teorica ? c.valori.differenza / c.valori.teorica : 0
                return (
                  <tr key={c.id} className={c.stato === 'riaperta' ? 'is-riaperta' : ''}>
                    <td>
                      <button type="button" className="regch__link" onClick={() => setAperta(c)}>
                        <TruncatedText text={c.numero} />
                      </button>
                    </td>
                    <td><TruncatedText text={labelPeriodoBreve(c.periodo)} full={labelPeriodo(c.periodo)} /></td>
                    <td><TruncatedText text={strutturaById(m?.strutturaId ?? '')?.nome ?? '—'} /></td>
                    <td><TruncatedText text={m?.nome ?? '—'} /></td>
                    <td>
                      <Tooltip text={`Alle ${new Date(c.chiusaIl).toLocaleTimeString('it-IT', { timeStyle: 'short' })}, da ${c.operatore}`}>
                        <span>{new Date(c.chiusaIl).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                      </Tooltip>
                    </td>
                    <td className="regch__amt">{euro(c.valori.finale)}</td>
                    <td className="regch__amt">{euro(consumoDi(c.valori))}</td>
                    <td className={`regch__amt ${c.valori.differenza < 0 ? 'regch__neg' : c.valori.differenza > 0 ? 'regch__pos' : ''}`}>
                      <Tooltip text={`${(quota * 100).toLocaleString('it-IT', { maximumFractionDigits: 2 })}% del valore teorico`}>
                        <span>{euro(c.valori.differenza)}</span>
                      </Tooltip>
                    </td>
                    <td>
                      {c.stato === 'definitiva'
                        ? <span className="regch__stato regch__stato--ok"><i className="fa-solid fa-lock" aria-hidden="true" /> Definitiva</span>
                        : (
                          <Tooltip text={c.riapertura ? `Riaperta da ${c.riapertura.da} il ${dataOra(c.riapertura.il)}: ${c.riapertura.motivo}` : 'Riaperta'}>
                            <span className="regch__stato regch__stato--open"><i className="fa-solid fa-lock-open" aria-hidden="true" /> Riaperta</span>
                          </Tooltip>
                        )}
                    </td>
                    <td>
                      <div className="regch__acts">
                        <Tooltip text="Dettaglio della chiusura">
                          <button type="button" className="regch__act" onClick={() => setAperta(c)} aria-label={`Dettaglio ${c.numero}`}>
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Scarica Excel della chiusura">
                          <button type="button" className="regch__act" onClick={() => esportaChiusura(c)} aria-label={`Excel ${c.numero}`}>
                            <i className="fa-solid fa-file-xls" aria-hidden="true" />
                          </button>
                        </Tooltip>
                        {pulsanteRiapri(c)}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!vista.length && (
                <tr><td colSpan={10} className="regch__vuoto">Nessuna chiusura con questi filtri.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="regch__somma">
          {righe.length} {righe.length === 1 ? 'chiusura' : 'chiusure'}
          {' · '}rimanenze finali <b>{euro(totali.finale)}</b>
          {' · '}consumi <b>{euro(totali.consumo)}</b>
          {' · '}differenze <b className={totali.differenza < 0 ? 'regch__neg' : ''}>{euro(totali.differenza)}</b>
          <span className="regch__somma-nota">(solo chiusure definitive)</span>
          <button type="button" className="regch__somma-link" onClick={() => navigate?.('preliminare')}>
            <i className="fa-solid fa-clipboard-check" aria-hidden="true" /> Vai al preliminare di {labelPeriodo(PERIODO_CORRENTE).toLowerCase()}
          </button>
        </p>

        <div className="regch__pag">
          <Pagination page={pag} totalPages={pagine} onPageChange={setPagina} />
        </div>
      </div>

      {/* ── Dettaglio ──────────────────────────────────────────────────────── */}
      <Modal open={!!aperta} onClose={() => setAperta(null)} size="xl" title={aperta ? `Chiusura ${aperta.numero}` : ''}>
        {aperta && <DettaglioChiusura c={aperta} onExcel={() => esportaChiusura(aperta)} riapri={pulsanteRiapri(aperta, true)} />}
      </Modal>

      {/* ── Riapertura ─────────────────────────────────────────────────────── */}
      <Modal open={!!daRiaprire} onClose={() => setDaRiaprire(null)} size="sm" title={daRiaprire ? `Riapri ${labelPeriodo(daRiaprire.periodo)}` : ''}>
        {daRiaprire && (
          <div className="regch-form">
            <p className="regch-form__txt">
              La chiusura <b>{daRiaprire.numero}</b> di {magazzinoById(daRiaprire.magazzinoId)?.nome} resterà nel registro
              come <b>riaperta</b> e il periodo tornerà nel Preliminare di chiusura con la conta di prima, da correggere e
              richiudere.
            </p>
            <TextareaField
              name="motivo" label="Motivo della riapertura" rows={3} required
              placeholder="Es. DDT di fine mese registrato in ritardo"
              value={motivo} onChange={e => setMotivo(e.target.value)}
            />
            <footer className="regch-form__foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setDaRiaprire(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaRiapertura} disabled={!motivo.trim()}>
                <i className="fa-solid fa-lock-open" aria-hidden="true" /> Riapri periodo
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Dettaglio della chiusura ─────────────────────────────────────────────────
function DettaglioChiusura({ c, onExcel, riapri }: { c: Chiusura; onExcel: () => void; riapri: React.ReactNode }) {
  const m = magazzinoById(c.magazzinoId)
  const righe = righeDiChiusura(c)
  const gruppi = perCategoria(righe)
  const rettifiche = righe.filter(r => {
    const a = articoloById(r.articoloId)!
    return r.contato != null && tondo(r.contato - teoricaDi(r), decimaliDi(a.um)) !== 0
  })
  const tot = gruppi.reduce((t, g) => {
    (Object.keys(t) as Array<keyof typeof t>).forEach(k => { t[k] += g.valori[k] })
    return t
  }, valoriVuoti())

  return (
    <div className="regch-det">
      <dl className="regch-det__info">
        <div><dt>Struttura</dt><dd>{strutturaById(m?.strutturaId ?? '')?.nome}</dd></div>
        <div><dt>Magazzino</dt><dd>{m?.nome}{m?.reparto && <span> · {m.reparto}</span>}</dd></div>
        <div><dt>Periodo</dt><dd>{labelPeriodo(c.periodo)}</dd></div>
        <div><dt>Chiusa il</dt><dd>{dataOra(c.chiusaIl)} da {c.operatore}</dd></div>
        <div>
          <dt>Stato</dt>
          <dd>
            {c.stato === 'definitiva'
              ? <span className="regch__stato regch__stato--ok"><i className="fa-solid fa-lock" aria-hidden="true" /> Definitiva</span>
              : <span className="regch__stato regch__stato--open"><i className="fa-solid fa-lock-open" aria-hidden="true" /> Riaperta</span>}
          </dd>
        </div>
      </dl>

      {c.sostituisce && (
        <p className="regch-det__nota">
          <i className="fa-solid fa-code-branch" aria-hidden="true" />
          Sostituisce la chiusura {c.sostituisce}, riaperta per correzione
        </p>
      )}
      {c.riapertura && (
        <p className="regch-det__nota regch-det__nota--warn">
          <i className="fa-solid fa-lock-open" aria-hidden="true" />
          Riaperta da {c.riapertura.da} il {dataOra(c.riapertura.il)}: {c.riapertura.motivo}
        </p>
      )}
      {c.note && (
        <p className="regch-det__nota">
          <i className="fa-solid fa-note-sticky" aria-hidden="true" /> {c.note}
        </p>
      )}

      <h4 className="regch-det__h">Valorizzazione per categoria</h4>
      <div className="sib-table-wrap">
        <table className="sib-table regch-det__table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="regch__amt"><TruncatedText text="Rim. iniziale" full="Rimanenza iniziale" /></th>
              <th className="regch__amt">Entrate</th>
              <th className="regch__amt">Uscite</th>
              <th className="regch__amt"><TruncatedText text="Rim. finale" full="Rimanenza finale" /></th>
              <th className="regch__amt">Differenze</th>
              <th className="regch__amt">Consumo</th>
            </tr>
          </thead>
          <tbody>
            {gruppi.map(g => (
              <tr key={g.categoria}>
                <td>{g.categoria}</td>
                <td className="regch__amt">{euro(g.valori.iniziale)}</td>
                <td className="regch__amt">{euro(g.valori.entrate)}</td>
                <td className="regch__amt">{euro(g.valori.uscite)}</td>
                <td className="regch__amt">{euro(g.valori.finale)}</td>
                <td className={`regch__amt ${g.valori.differenza < 0 ? 'regch__neg' : g.valori.differenza > 0 ? 'regch__pos' : ''}`}>{euro(g.valori.differenza)}</td>
                <td className="regch__amt">{euro(consumoDi(g.valori))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="regch-det__tot">
              <td>Totale</td>
              <td className="regch__amt">{euro(tot.iniziale)}</td>
              <td className="regch__amt">{euro(tot.entrate)}</td>
              <td className="regch__amt">{euro(tot.uscite)}</td>
              <td className="regch__amt">{euro(tot.finale)}</td>
              <td className="regch__amt">{euro(tot.differenza)}</td>
              <td className="regch__amt">{euro(consumoDi(tot))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h4 className="regch-det__h">Rettifiche inventariali ({rettifiche.length})</h4>
      {rettifiche.length ? (
        <div className="sib-table-wrap">
          <table className="sib-table regch-det__table regch-det__table--ret">
            <thead>
              <tr>
                <th>Articolo</th>
                <th>Causale</th>
                <th className="regch__amt">Teorica</th>
                <th className="regch__amt">Contato</th>
                <th className="regch__amt">Differenza</th>
                <th className="regch__amt">Valore</th>
              </tr>
            </thead>
            <tbody>
              {rettifiche.map(r => {
                const a = articoloById(r.articoloId)!
                const dec = decimaliDi(a.um)
                const t = tondo(teoricaDi(r), dec)
                const d = tondo(r.contato! - t, dec)
                return (
                  <tr key={r.articoloId}>
                    <td><TruncatedText text={a.nome} /></td>
                    <td><TruncatedText text={r.causale ?? '—'} /></td>
                    <td className="regch__amt">{qta(t, a.um)} {a.um}</td>
                    <td className="regch__amt">{qta(r.contato!, a.um)} {a.um}</td>
                    <td className={`regch__amt ${d < 0 ? 'regch__neg' : 'regch__pos'}`}>{d > 0 ? '+' : ''}{qta(d, a.um)}</td>
                    <td className={`regch__amt ${d < 0 ? 'regch__neg' : 'regch__pos'}`}>{euro(d * r.costo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="regch-det__vuoto">La conta coincideva con il teorico: nessuna rettifica.</p>
      )}

      <footer className="regch-det__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onExcel}>
          <i className="fa-regular fa-file-xls" aria-hidden="true" /> Scarica Excel
        </button>
        {riapri}
      </footer>
    </div>
  )
}
