import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { SelectField, TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import {
  useHrGestioneStore, DIPENDENTI_HR, TRASPORTI, VITTO_ALTRO, VALORE_BUONO, nomeDipendente,
  repartoDipendente, eurHr, fmtDataHr, type CategoriaSpesa, type NotaSpesa,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import ModaleNota from './ModaleNota'
import {
  approvabile, cifra, etichettaMese, SENZA_RICEVUTA_APPROVA, foglio, meseCorrente, riepilogoMese, spostaMese, statoMese,
} from './notaSpeseModel'
import { scaricaDistintaRicevute, scaricaNotaSpesePdf } from './notaSpesePdf'
import './NotaSpeseMensile.sass'

/**
 * Nota spese mensile — il dettaglio di un dipendente: un foglio per mese con una
 * riga per giorno e una colonna per voce, come il modulo cartaceo del rimborso.
 * Le note le inserisce il dipendente dall'App Op!; da qui l'ufficio del personale
 * le corregge, approva, rifiuta, rimborsa o elimina, e a fine mese tira fuori il
 * report per la busta paga (PDF, ricevute, Excel, vista di tutti).
 */

const statoCls = (s: string | null) =>
  s === 'Da approvare' ? 'attesa' : s === 'Approvata' ? 'info' : s === 'Rimborsata' ? 'ok' : s === 'Rifiutata' ? 'ko' : s === 'misto' ? 'misto' : ''

const ULTIMI_MESI = Array.from({ length: 12 }, (_, i) => spostaMese(meseCorrente(), -i))

export default function NotaSpeseMensile({ navigate, dipendenteId, mese }: { navigate: (p: string) => void; dipendenteId?: number; mese?: string }) {
  const noteSpese = useHrGestioneStore(s => s.noteSpese)
  const buoni = useHrGestioneStore(s => s.buoniPasto)
  const setStato = useHrGestioneStore(s => s.setStatoSpesa)
  const elimina = useHrGestioneStore(s => s.eliminaSpesa)
  const toggleBuono = useHrGestioneStore(s => s.toggleBuono)
  const confirm = useConfirmStore(s => s.confirm)

  const [dip, setDip] = useState(dipendenteId && DIPENDENTI_HR.some(d => d.id === dipendenteId) ? dipendenteId : DIPENDENTI_HR[0].id)
  const [ym, setYm] = useState(mese && /^\d{4}-\d{2}$/.test(mese) ? mese : meseCorrente())
  const [report, setReport] = useState('con-note')
  const [inModifica, setInModifica] = useState<NotaSpesa | null>(null)
  const [giorno, setGiorno] = useState<{ iso: string; voce?: CategoriaSpesa } | null>(null)
  const [rifiuto, setRifiuto] = useState<{ n: NotaSpesa; motivo: string } | null>(null)
  const [totale, setTotale] = useState(false)

  const f = useMemo(() => foglio(dip, ym, noteSpese, buoni), [dip, ym, noteSpese, buoni])
  const riep = useMemo(() => riepilogoMese(ym, noteSpese, buoni), [ym, noteSpese, buoni])
  const conNote = riep.filter(r => r.f.note.length || r.f.nBuoni)
  const selezione = report === 'con-note' ? conNote.map(r => r.dip.id) : [Number(report)]

  const noteGiorno = giorno ? f.note.filter(n => n.data === giorno.iso && (!giorno.voce || n.categoria === giorno.voce)) : []

  // ── Azioni ──
  const approva = (n: NotaSpesa) => {
    if (!approvabile(n)) { toast.error(SENZA_RICEVUTA_APPROVA + '.', 'Spesa non approvata'); return }
    setStato(n.id, 'Approvata'); toast.success(`${n.categoria} di ${eurHr(n.importo)} approvata.`, 'Spesa approvata')
  }
  const rimborsa = async (n: NotaSpesa) => {
    const ok = await confirm({ title: 'Segna come rimborsata', message: `Confermi il rimborso di ${eurHr(n.importo)} a ${nomeDipendente(n.dipendenteId)}?`, confirmLabel: 'Conferma rimborso', danger: false })
    if (!ok) return
    setStato(n.id, 'Rimborsata'); toast.success(`Rimborso di ${eurHr(n.importo)} registrato.`, 'Spesa rimborsata')
  }
  const cancella = async (n: NotaSpesa) => {
    const ok = await confirm({
      title: 'Elimina nota',
      message: `Eliminare la nota "${n.descrizione}" del ${fmtDataHr(n.data)} (${eurHr(n.importo)})?${n.stato === 'Rimborsata' ? ' È già stata rimborsata: il rimborso resta in busta paga, ma la spesa sparirà dalla nota.' : ''} L'operazione non si può annullare.`,
      confirmLabel: 'Elimina',
    })
    if (!ok) return
    elimina(n.id); toast.success('Nota eliminata.', 'Eliminata')
  }
  const confermaRifiuto = () => {
    if (!rifiuto || !rifiuto.motivo.trim()) return
    setStato(rifiuto.n.id, 'Rifiutata', rifiuto.motivo.trim())
    toast.info(`${rifiuto.n.categoria} di ${eurHr(rifiuto.n.importo)} rifiutata.`, 'Spesa rifiutata')
    setRifiuto(null)
  }
  const approvaMese = async () => {
    const ok = await confirm({ title: 'Approva il mese', message: `Approvare le ${f.daApprovare.length} note in attesa di ${nomeDipendente(dip)} (${eurHr(f.eurDaApprovare)})? Quelle senza ricevuta restano da controllare.`, confirmLabel: 'Approva', danger: false })
    if (!ok) return
    const conRicevuta = f.daApprovare.filter(approvabile)
    conRicevuta.forEach(n => setStato(n.id, 'Approvata'))
    toast.success(`${conRicevuta.length} note approvate${conRicevuta.length < f.daApprovare.length ? `, ${f.daApprovare.length - conRicevuta.length} senza ricevuta da controllare` : ''}.`, 'Mese approvato')
  }
  const rimborsaMese = async () => {
    const ok = await confirm({ title: 'Inserisci in busta paga', message: `Segnare come rimborsate le note approvate di ${nomeDipendente(dip)} (${eurHr(f.eurApprovate)})?`, confirmLabel: 'Segna rimborsate', danger: false })
    if (!ok) return
    f.approvate.forEach(n => setStato(n.id, 'Rimborsata'))
    toast.success(`${eurHr(f.eurApprovate)} inseriti nel rimborso di ${etichettaMese(ym).toLowerCase()}.`, 'Rimborso registrato')
  }

  const scaricaPdf = () => {
    if (!selezione.length) { toast.info('Nessun dipendente ha note in questo mese.', 'Niente da stampare'); return }
    scaricaNotaSpesePdf(ym, selezione)
  }
  const scaricaRicevute = () => {
    if (!selezione.length) { toast.info('Nessuna ricevuta in questo mese.', 'Niente da scaricare'); return }
    scaricaDistintaRicevute(ym, selezione)
  }
  const excelRiepilogo = () => exportXls(`riepilogo-nota-spese_${ym}`,
    ['Dipendente', 'Reparto', 'Trasferte', ...TRASPORTI, ...VITTO_ALTRO, 'Buoni pasto', 'Valore buoni', 'Totale spese', 'Da approvare', 'Approvato', 'Rimborsato', 'Stato'],
    (report === 'con-note' ? conNote : riep.filter(r => r.dip.id === Number(report))).map(({ dip: d, f: x }) => [
      `${d.nome} ${d.cognome}`, d.reparto, x.trasferte,
      ...TRASPORTI.map(v => cifra(x.perVoce[v])), ...VITTO_ALTRO.map(v => cifra(x.perVoce[v])),
      x.nBuoni, cifra(x.buoniEur), cifra(x.spese), cifra(x.eurDaApprovare), cifra(x.eurApprovate), cifra(x.eurRimborsate), statoMese(x).label,
    ]))

  const cella = (iso: string, voce: CategoriaSpesa, sep: boolean) => {
    const r = f.righe.find(x => x.iso === iso)!
    const c = r.celle[voce]
    if (!c.note.length) {
      return <td key={voce} className={clsx('nsm__num', sep && 'nsm__sep')} />
    }
    const tip = c.note.map(n => `${n.descrizione} · ${eurHr(n.importo)} · ${n.stato}`).join('\n')
    return (
      <td key={voce} className={clsx('nsm__num nsm__cell', sep && 'nsm__sep')}>
        <Tooltip text={tip}>
          <button type="button" className={`nsm__val nsm__val--${statoCls(c.stato)}`} onClick={() => setGiorno({ iso, voce })}>
            <span className="nsm__dot" />
            {c.importo ? cifra(c.importo) : cifra(c.note.reduce((s, n) => s + n.importo, 0))}
            {c.note.length > 1 && <span className="nsm__count">{c.note.length}</span>}
          </button>
        </Tooltip>
      </td>
    )
  }

  const st = statoMese(f)

  return (
    <div className="nsm">
      <PageHead
        title="Nota spese mensile"
        subtitle={`Il foglio rimborsi di ${nomeDipendente(dip)} · ${repartoDipendente(dip)}`}
        onBack={() => navigate('hr-note-spese')}
      />

      {/* ── Mese ── */}
      <div className="nsm__nav">
        <button type="button" className="sib-btn sib-btn--secondary nsm__navbtn" onClick={() => setYm(spostaMese(ym, -1))}>
          <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Prec
        </button>
        <button type="button" className="sib-btn sib-btn--secondary nsm__navbtn" onClick={() => setYm(meseCorrente())}>Oggi</button>
        <button type="button" className="sib-btn sib-btn--secondary nsm__navbtn" onClick={() => setYm(spostaMese(ym, 1))}>
          Succ <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
        <span className="nsm__mese">{etichettaMese(ym)}</span>
      </div>

      {/* ── Report di fine mese ── */}
      <section className="nsm__report">
        <div className="nsm__report-txt">
          <span className="nsm__report-tit">Report di fine mese</span>
          <span className="nsm__report-sub">Per l'inserimento dei rimborsi in busta paga · {etichettaMese(ym)}</span>
        </div>
        <div className="nsm__report-acts">
          <SelectField name="nsm-report" ariaLabel="Dipendenti del report" className="nsm__report-sel" value={report}
            onChange={e => setReport(e.target.value)}
            options={[{ value: 'con-note', label: `Tutti i dipendenti con note (${conNote.length})` }, ...DIPENDENTI_HR.map(d => ({ value: d.id, label: `${d.nome} ${d.cognome}` }))]} />
          <button type="button" className="sib-btn sib-btn--secondary" onClick={scaricaPdf}>
            <i className="fa-regular fa-file-pdf" aria-hidden="true" /> PDF
          </button>
          <Tooltip text="Distinta in PDF delle ricevute del mese, con quelle mancanti in evidenza">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={scaricaRicevute}>
              <i className="fa-solid fa-download" aria-hidden="true" /> Download ricevute
            </button>
          </Tooltip>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={excelRiepilogo}>
            <i className="fa-regular fa-file-xls" aria-hidden="true" /> Excel riepilogo
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setTotale(true)}>
            <i className="fa-solid fa-table-list" aria-hidden="true" /> Total view
          </button>
        </div>
      </section>

      {/* ── Foglio ── */}
      <section className="nsm__sheet">
        <header className="nsm__sheet-head">
          <div className="nsm__sheet-tit">
            <span className="nsm__eyebrow">Sibylla · Rimborso spese</span>
            <h2 className="nsm__h2">Nota spese mensile</h2>
            <span className={`nsm__stato nsm__stato--${st.cls}`}>{st.label}</span>
          </div>
          <div className="nsm__sheet-fields">
            <SelectField name="nsm-dip" label="Nominativo" className="nsm__f-dip" value={dip}
              onChange={e => setDip(Number(e.target.value))}
              options={DIPENDENTI_HR.map(d => ({ value: d.id, label: `${d.nome} ${d.cognome}` }))} />
            <SelectField name="nsm-mese" label="Mese / anno" className="nsm__f-mese" value={ym}
              onChange={e => setYm(e.target.value)}
              options={(ULTIMI_MESI.includes(ym) ? ULTIMI_MESI : [ym, ...ULTIMI_MESI]).map(m => ({ value: m, label: etichettaMese(m) }))} />
          </div>
        </header>

        <div className="nsm__summary">
          <span className="nsm__chip nsm__chip--attesa"><span className="nsm__dot" />Da approvare <strong>{eurHr(f.eurDaApprovare)}</strong></span>
          <span className="nsm__chip nsm__chip--info"><span className="nsm__dot" />Approvate <strong>{eurHr(f.eurApprovate)}</strong></span>
          <span className="nsm__chip nsm__chip--ok"><span className="nsm__dot" />Rimborsate <strong>{eurHr(f.eurRimborsate)}</strong></span>
          {f.eurRifiutate > 0 && <span className="nsm__chip nsm__chip--ko"><span className="nsm__dot" />Rifiutate <strong>{eurHr(f.eurRifiutate)}</strong></span>}
          <span className="nsm__summary-push">
            {f.daApprovare.length > 0 && (
              <button type="button" className="sib-btn sib-btn--secondary" onClick={approvaMese}>
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> Approva il mese
              </button>
            )}
            {f.approvate.length > 0 && (
              <button type="button" className="sib-btn sib-btn--secondary" onClick={rimborsaMese}>
                <i className="fa-solid fa-money-bill" aria-hidden="true" /> Segna rimborsate
              </button>
            )}
          </span>
        </div>

        <div className="sib-table-wrap nsm__wrap">
          <table className="sib-table nsm__table">
            <colgroup>
              <col className="nsm__col-data" />
              <col className="nsm__col-trasf" />
              {TRASPORTI.map(v => <col key={v} className="nsm__col-voce" />)}
              {VITTO_ALTRO.map(v => <col key={v} className="nsm__col-voce" />)}
              <col className="nsm__col-buono" />
              <col className="nsm__col-tot" />
            </colgroup>
            <thead>
              <tr className="nsm__groups">
                <th colSpan={2} />
                <th colSpan={TRASPORTI.length} className="nsm__g nsm__g--tr">Trasporti</th>
                <th colSpan={VITTO_ALTRO.length} className="nsm__g nsm__g--vi">Vitto e altro</th>
                <th className="nsm__g nsm__g--bu">Buoni</th>
                <th className="nsm__g nsm__g--to">Totali</th>
              </tr>
              <tr>
                <th>Data</th>
                <th className="nsm__num">N° trasf.</th>
                {TRASPORTI.map((v, i) => <th key={v} className={clsx('nsm__num', i === 0 && 'nsm__sep')}>{v}</th>)}
                {VITTO_ALTRO.map((v, i) => <th key={v} className={clsx('nsm__num', i === 0 && 'nsm__sep')}>{v}</th>)}
                <th className="nsm__c nsm__sep">Pasto</th>
                <th className="nsm__num nsm__sep">Tot. spese</th>
              </tr>
            </thead>
            <tbody>
              {f.righe.map(r => (
                <tr key={r.iso} className={clsx(r.festivo && 'nsm__row--we', r.oggi && 'nsm__row--oggi', r.futuro && 'nsm__row--fut')}>
                  <td>
                    <button type="button" className="nsm__day" disabled={!r.totale && !f.note.some(n => n.data === r.iso)} onClick={() => setGiorno({ iso: r.iso })}>
                      <span className="nsm__day-n">{String(r.giorno).padStart(2, '0')}</span>
                      <span className="nsm__day-w">{r.settimana}</span>
                    </button>
                  </td>
                  <td className="nsm__num">{r.trasferte || ''}</td>
                  {TRASPORTI.map((v, i) => cella(r.iso, v, i === 0))}
                  {VITTO_ALTRO.map((v, i) => cella(r.iso, v, i === 0))}
                  <td className="nsm__c nsm__sep">
                    <input
                      type="checkbox" className="nsm__check" checked={r.buono} disabled={r.futuro}
                      aria-label={`Buono pasto del ${fmtDataHr(r.iso)}`}
                      onChange={() => toggleBuono(dip, r.iso)}
                    />
                  </td>
                  <td className="nsm__num nsm__sep nsm__tot">{r.totale ? cifra(r.totale) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="nsm__foot">
                <td>Totali mese</td>
                <td className="nsm__num">{f.trasferte || ''}</td>
                {TRASPORTI.map((v, i) => <td key={v} className={clsx('nsm__num nsm__foot--tr', i === 0 && 'nsm__sep')}>{f.perVoce[v] ? cifra(f.perVoce[v]) : '–'}</td>)}
                {VITTO_ALTRO.map((v, i) => <td key={v} className={clsx('nsm__num nsm__foot--vi', i === 0 && 'nsm__sep')}>{f.perVoce[v] ? cifra(f.perVoce[v]) : '–'}</td>)}
                <td className="nsm__c nsm__foot--bu nsm__sep">{f.nBuoni}</td>
                <td className="nsm__num nsm__foot--to nsm__sep">{cifra(f.spese)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="nsm__legend">
          <span className="nsm__legend-st">
            <span className="nsm__key nsm__key--attesa">Da approvare</span>
            <span className="nsm__key nsm__key--info">Approvata</span>
            <span className="nsm__key nsm__key--ok">Rimborsata</span>
            <span className="nsm__key nsm__key--ko">Rifiutata (esclusa dai totali)</span>
          </span>
          <span className="nsm__legend-tot">
            Spese <strong>{eurHr(f.spese)}</strong> · Buoni pasto {f.nBuoni} × {VALORE_BUONO} € = <strong>{eurHr(f.buoniEur)}</strong>
          </span>
        </div>
      </section>

      <ModaleNota nota={inModifica} onClose={() => setInModifica(null)} />

      {/* ── Note del giorno ── */}
      <Modal open={!!giorno} onClose={() => setGiorno(null)} title={giorno ? `${fmtDataHr(giorno.iso)}${giorno.voce ? ` · ${giorno.voce}` : ''}` : ''} size="md">
        {giorno && (
          <div className="nsm-day">
            <ul className="nsm-day__list">
              {noteGiorno.map(n => (
                <li key={n.id} className="nsm-day__item">
                  <span className={`nsm-day__voce nsm-day__voce--${TRASPORTI.includes(n.categoria) ? 'tr' : 'vi'}`}>{n.categoria}</span>
                  <span className="nsm-day__txt">
                    <TruncatedText text={n.descrizione} className="nsm-day__descr" />
                    <span className="nsm-day__file">
                      {n.giustificativo
                        ? <><i className="fa-solid fa-file-pdf" aria-hidden="true" /> <TruncatedText text={n.giustificativo} /></>
                        : <span className="nsm-day__missing"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Ricevuta mancante</span>}
                    </span>
                    {n.stato === 'Rifiutata' && n.motivo && <span className="nsm-day__motivo">{n.motivo}</span>}
                  </span>
                  <span className="nsm-day__imp">{eurHr(n.importo)}</span>
                  <span className={`nsm-day__stato nsm-day__stato--${statoCls(n.stato)}`}>{n.stato}</span>
                  <span className="nsm-day__acts">
                    <Tooltip text="Modifica"><button type="button" className="nsm-day__act" aria-label="Modifica" onClick={() => { setGiorno(null); setInModifica(n) }}><i className="fa-solid fa-pen" aria-hidden="true" /></button></Tooltip>
                    {(n.stato === 'Da approvare' || n.stato === 'Rifiutata') && <Tooltip text={approvabile(n) ? 'Approva' : SENZA_RICEVUTA_APPROVA}><button type="button" className="nsm-day__act" aria-label={approvabile(n) ? 'Approva' : SENZA_RICEVUTA_APPROVA} disabled={!approvabile(n)} onClick={() => approva(n)}><i className="fa-solid fa-circle-check" aria-hidden="true" /></button></Tooltip>}
                    {(n.stato === 'Da approvare' || n.stato === 'Approvata') && <Tooltip text="Rifiuta"><button type="button" className="nsm-day__act" aria-label="Rifiuta" onClick={() => setRifiuto({ n, motivo: '' })}><i className="fa-solid fa-circle-xmark" aria-hidden="true" /></button></Tooltip>}
                    {n.stato === 'Approvata' && <Tooltip text="Segna come rimborsata"><button type="button" className="nsm-day__act" aria-label="Segna come rimborsata" onClick={() => rimborsa(n)}><i className="fa-solid fa-money-bill" aria-hidden="true" /></button></Tooltip>}
                    <Tooltip text="Elimina"><button type="button" className="nsm-day__act" aria-label="Elimina" onClick={() => cancella(n)}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
                  </span>
                </li>
              ))}
              {!noteGiorno.length && <li className="nsm-day__empty">Nessuna nota in questo giorno.</li>}
            </ul>
          </div>
        )}
      </Modal>

      {/* ── Rifiuto ── */}
      <Modal open={!!rifiuto} onClose={() => setRifiuto(null)} title="Rifiuta spesa" size="sm">
        {rifiuto && (
          <div className="nsm-day">
            <p className="nsm-day__intro">{rifiuto.n.categoria} del {fmtDataHr(rifiuto.n.data)} · <strong>{eurHr(rifiuto.n.importo)}</strong></p>
            <TextareaField name="nsm-motivo" label="Motivo del rifiuto" required rows={3} value={rifiuto.motivo}
              hint="Il dipendente lo vedrà accanto alla spesa" onChange={e => setRifiuto({ ...rifiuto, motivo: e.target.value })} />
            <div className="nsm-day__foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setRifiuto(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--danger" disabled={!rifiuto.motivo.trim()} onClick={confermaRifiuto}>Rifiuta</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Total view ── */}
      <Modal open={totale} onClose={() => setTotale(false)} title={`Total view · ${etichettaMese(ym)}`} size="xl">
        <div className="nsm-tv">
          <div className="sib-table-wrap nsm-tv__wrap">
            <table className="sib-table nsm-tv__table">
              <colgroup>
                <col className="nsm-tv__c-dip" /><col className="nsm-tv__c-n" />
                <col className="nsm-tv__c-e" /><col className="nsm-tv__c-e" /><col className="nsm-tv__c-n" />
                <col className="nsm-tv__c-e" /><col className="nsm-tv__c-e" /><col className="nsm-tv__c-st" />
              </colgroup>
              <thead>
                <tr>
                  <th><ThLabel full="Dipendente" /></th>
                  <th className="nsm__num"><ThLabel full="Trasferte" short="Trasf." /></th>
                  <th className="nsm__num"><ThLabel full="Trasporti" short="Trasp." /></th>
                  <th className="nsm__num"><ThLabel full="Vitto e altro" short="Vitto" /></th>
                  <th className="nsm__num"><ThLabel full="Buoni pasto" short="Buoni" /></th>
                  <th className="nsm__num"><ThLabel full="Tot. spese" /></th>
                  <th className="nsm__num"><ThLabel full="Da approvare" short="Da appr." /></th>
                  <th><ThLabel full="Stato" /></th>
                </tr>
              </thead>
              <tbody>
                {riep.map(({ dip: d, f: x }) => {
                  const s = statoMese(x)
                  return (
                    <tr key={d.id} className={clsx('nsm-tv__row', d.id === dip && 'nsm-tv__row--on')} onClick={() => { setDip(d.id); setTotale(false) }}>
                      <td>
                        <Tooltip text={`${d.nome} ${d.cognome} · ${d.reparto}`}>
                          <span className="nsm-tv__name">{d.nome} {d.cognome}</span>
                        </Tooltip>
                      </td>
                      <td className="nsm__num">{x.trasferte}</td>
                      <td className="nsm__num">{cifra(x.trasporti)}</td>
                      <td className="nsm__num">{cifra(x.vitto)}</td>
                      <td className="nsm__num">{x.nBuoni}</td>
                      <td className="nsm__num nsm__tot">{cifra(x.spese)}</td>
                      <td className="nsm__num">{x.eurDaApprovare ? cifra(x.eurDaApprovare) : '–'}</td>
                      <td className={`nsm-tv__st nsm-tv__st--${s.cls}`}><TruncatedText text={s.label} /></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="nsm-tv__foot">
                  <td>Totale struttura</td>
                  <td className="nsm__num">{riep.reduce((s, r) => s + r.f.trasferte, 0)}</td>
                  <td className="nsm__num">{cifra(riep.reduce((s, r) => s + r.f.trasporti, 0))}</td>
                  <td className="nsm__num">{cifra(riep.reduce((s, r) => s + r.f.vitto, 0))}</td>
                  <td className="nsm__num">{riep.reduce((s, r) => s + r.f.nBuoni, 0)}</td>
                  <td className="nsm__num">{cifra(riep.reduce((s, r) => s + r.f.spese, 0))}</td>
                  <td className="nsm__num">{cifra(riep.reduce((s, r) => s + r.f.eurDaApprovare, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="nsm-tv__hint">Clicca un dipendente per aprire il suo foglio.</p>
        </div>
      </Modal>
    </div>
  )
}
