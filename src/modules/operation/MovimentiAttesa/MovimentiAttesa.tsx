import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import EmptyState from '../../../core/components/EmptyState'
import { Pagination } from '../../../core/components'
import { SelectField, SearchField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { usePmsStore } from '../_data/pmsDemo'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  ORIGINI, movimentiAttesaDemo, contiAbbinabili,
  type MovimentoAttesa, type Origine, type StatoAttesa,
} from './movimentiAttesa.data'
import './MovimentiAttesa.sass'

const PAGE_SIZE = 12

const CODE: Array<{ id: StatoAttesa; label: string; icon: string; hint: string }> = [
  { id: 'abbinare',  label: 'Da abbinare',         icon: 'link-slash',      hint: 'Addebiti arrivati dagli outlet che non trovano un conto valido' },
  { id: 'approvare', label: 'Da approvare',        icon: 'user-check',      hint: 'Sconti, storni, penali e addebiti oltre la soglia dell\'operatore' },
  { id: 'fatturare', label: 'Pronti da fatturare', icon: 'file-invoice',    hint: 'Conti chiusi o saldi agenzia senza documento fiscale emesso' },
]

const fmtEuro = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtOra = (d: Date) => {
  const oggi = new Date().toDateString() === d.toDateString()
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return oggi ? `Oggi ${hh}` : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hh}`
}
/** Da quanto il movimento è in coda, e se ha superato la soglia (12 h). */
const attesa = (d: Date) => {
  const min = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000))
  const label = min < 60 ? `${min} min` : min < 1440 ? `${Math.floor(min / 60)} h` : `${Math.floor(min / 1440)} g`
  return { label, tardi: min >= 720 }
}

export default function MovimentiAttesa({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const versionePms = usePmsStore((s) => s.versione)
  const confirm = useConfirmStore((s) => s.confirm)

  const [righe, setRighe] = useState<MovimentoAttesa[]>(() => movimentiAttesaDemo(struttura))
  useEffect(() => { setRighe(movimentiAttesaDemo(struttura)); setSel(new Set()) }, [struttura, versionePms])

  const [coda, setCoda] = useState<StatoAttesa>('abbinare')
  const [origine, setOrigine] = useState<'' | Origine>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [abbina, setAbbina] = useState<MovimentoAttesa | null>(null)
  const [destinazione, setDestinazione] = useState('')

  const conteggi = useMemo(() => {
    const c: Record<StatoAttesa, number> = { abbinare: 0, approvare: 0, fatturare: 0 }
    righe.forEach((r) => { c[r.stato]++ })
    return c
  }, [righe])

  const filtrate = useMemo(() => {
    const q = search.toLowerCase().trim()
    return righe.filter((r) =>
      r.stato === coda &&
      (!origine || r.origine === origine) &&
      (!q || [r.descrizione, r.camera, r.booking ?? '', r.intestatario, r.operatore, r.motivo].some((t) => t.toLowerCase().includes(q))),
    )
  }, [righe, coda, origine, search])

  useEffect(() => { setPage(1); setSel(new Set()) }, [coda, origine, search, struttura])
  const totalPages = Math.max(1, Math.ceil(filtrate.length / PAGE_SIZE))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageRows = filtrate.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const opzioniOrigine = useMemo(() => {
    const presenti = Array.from(new Set(righe.filter((r) => r.stato === coda).map((r) => r.origine)))
    return [{ value: '', label: 'Tutte' }, ...presenti.map((o) => ({ value: o, label: ORIGINI[o].label }))]
  }, [righe, coda])

  const totale = filtrate.reduce((s, r) => s + r.importo, 0)
  const inRitardo = filtrate.filter((r) => attesa(r.quando).tardi).length
  const selezionate = filtrate.filter((r) => sel.has(r.id))
  const totaleSel = selezionate.reduce((s, r) => s + r.importo, 0)

  const allSel = pageRows.length > 0 && pageRows.every((r) => sel.has(r.id))
  const someSel = pageRows.some((r) => sel.has(r.id))
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSel((p) => { const n = new Set(p); pageRows.forEach((r) => (allSel ? n.delete(r.id) : n.add(r.id))); return n })

  const rimuovi = (ids: string[]) => {
    setRighe((rs) => rs.filter((r) => !ids.includes(r.id)))
    setSel((p) => { const n = new Set(p); ids.forEach((i) => n.delete(i)); return n })
  }

  // ── Azioni ────────────────────────────────────────────────────────────────
  const conti = useMemo(() => contiAbbinabili(struttura), [struttura, versionePms]) // eslint-disable-line react-hooks/exhaustive-deps
  const apriAbbina = (r: MovimentoAttesa) => {
    const stessa = conti.find((c) => c.camera === r.camera)
    setDestinazione(stessa ? stessa.booking : conti[0]?.booking ?? 'passante')
    setAbbina(r)
  }
  const confermaAbbina = () => {
    if (!abbina) return
    const c = conti.find((x) => x.booking === destinazione)
    rimuovi([abbina.id])
    toast.success(c ? `${abbina.descrizione} addebitato in camera ${c.camera} (${c.intestatario})` : `${abbina.descrizione} spostato su un nuovo conto passante`, 'Movimento abbinato')
    setAbbina(null)
  }
  const approva = (rs: MovimentoAttesa[]) => {
    rimuovi(rs.map((r) => r.id))
    toast.success(rs.length === 1 ? `${rs[0].descrizione}: registrato sul conto della camera ${rs[0].camera}` : `${rs.length} movimenti registrati sui conti`, 'Approvato')
  }
  const rifiuta = async (r: MovimentoAttesa) => {
    const ok = await confirm({
      title: 'Rifiutare il movimento?',
      message: <>«{r.descrizione}» di <strong>{fmtEuro(r.importo)}</strong> non verrà registrato sul conto e l'operatore {r.operatore} riceverà una notifica.</>,
      confirmLabel: 'Rifiuta', danger: true,
    })
    if (ok) { rimuovi([r.id]); toast.info(`Movimento rifiutato e segnalato a ${r.operatore}`) }
  }
  const storna = async (r: MovimentoAttesa) => {
    const ok = await confirm({
      title: 'Stornare l\'addebito?',
      message: <>L'addebito «{r.descrizione}» di <strong>{fmtEuro(r.importo)}</strong> sarà annullato e rimandato all'outlet di origine ({ORIGINI[r.origine].label}).</>,
      confirmLabel: 'Storna', danger: true,
    })
    if (ok) { rimuovi([r.id]); toast.info(`Addebito stornato e rimandato a ${ORIGINI[r.origine].label}`) }
  }
  const emetti = (rs: MovimentoAttesa[]) => {
    rimuovi(rs.map((r) => r.id))
    toast.success(rs.length === 1 ? `${rs[0].documento} emessa per ${rs[0].intestatario}` : `${rs.length} documenti emessi (${fmtEuro(rs.reduce((s, r) => s + r.importo, 0))})`, 'Documenti emessi')
  }

  const esporta = () => {
    const header = ['Data e ora', 'Origine', 'Descrizione', 'Camera', 'Prenotazione', 'Intestatario', 'Operatore', 'Motivo', 'Imponibile', 'IVA %', 'Importo']
    const rows = filtrate.map((r) => [fmtOra(r.quando), ORIGINI[r.origine].label, r.descrizione, r.camera, r.booking ?? '', r.intestatario, r.operatore, r.motivo, fmtEuro(r.imponibile), String(r.aliquota), fmtEuro(r.importo)])
    exportTableToXls('movimenti-in-attesa.xls', header, rows, CODE.find((c) => c.id === coda)!.label)
  }

  const codaAttiva = CODE.find((c) => c.id === coda)!

  return (
    <div className="mov-att">
      <PageHead title="Movimenti in attesa" subtitle="Tieni sotto controllo i conti pronti per essere fatturati" />

      <div className="mov-att__tabs" role="tablist" aria-label="Code dei movimenti">
        {CODE.map((c) => (
          <Tooltip key={c.id} text={c.hint} position="bottom">
            <button type="button" role="tab" aria-selected={coda === c.id}
              className={`mov-att__tab ${coda === c.id ? 'is-active' : ''}`}
              onClick={() => setCoda(c.id)}>
              <i className={`fa-light fa-${c.icon}`} aria-hidden="true" /> {c.label}
              <em className="mov-att__tab-count">{conteggi[c.id]}</em>
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="mov-att__bar">
        <SelectField className="mov-att__field" label="Struttura" name="struttura" options={opzioniStrutture}
          value={struttura} onChange={(e) => setStruttura(e.target.value)} />
        <SelectField className="mov-att__field" label="Origine" name="origine" options={opzioniOrigine}
          value={origine} onChange={(e) => setOrigine(e.target.value as '' | Origine)} />
        <div className="mov-att__field mov-att__field--grow">
          <span className="mov-att__label">Cerca</span>
          <SearchField value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')}
            placeholder="Descrizione, camera, prenotazione, intestatario o operatore" />
        </div>
        <div className="mov-att__bar-actions">
          <Tooltip text="Esporta in Excel">
            <button type="button" className="sib-btn sib-btn--icon mov-att__icon-btn" aria-label="Esporta in Excel" onClick={esporta}>
              <i className="fa-regular fa-file-xls" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table mov-att__table">
          <colgroup>
            <col className="mov-att__c-check" />
            <col className="mov-att__c-ora" />
            <col className="mov-att__c-orig" />
            <col />
            <col className="mov-att__c-cam" />
            <col className="mov-att__c-int" />
            <col className="mov-att__c-mot" />
            <col className="mov-att__c-att" />
            <col className="mov-att__c-imp" />
            <col className="mov-att__c-az" />
          </colgroup>
          <thead>
            <tr>
              <th className="mov-att__center">
                <input type="checkbox" className="sib-checkbox" aria-label="Seleziona tutti"
                  checked={allSel} ref={(el) => { if (el) el.indeterminate = someSel && !allSel }} onChange={toggleAll} />
              </th>
              <th>Data e ora</th>
              <th>Origine</th>
              <th>Descrizione</th>
              <th>Camera</th>
              <th>{coda === 'fatturare' ? 'Intestatario documento' : 'Intestatario'}</th>
              <th>Motivo</th>
              <th>In attesa</th>
              <th className="mov-att__num">Importo</th>
              <th className="mov-att__center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={10}>
                <EmptyState icon="circle-check" title="Nessun movimento in attesa"
                  subtitle={`Non ci sono movimenti nella coda «${codaAttiva.label}» per i criteri selezionati.`} />
              </td></tr>
            ) : pageRows.map((r) => {
              const a = attesa(r.quando)
              return (
                <tr key={r.id} className={sel.has(r.id) ? 'mov-att__row--sel' : undefined}>
                  <td className="mov-att__center">
                    <input type="checkbox" className="sib-checkbox" aria-label={`Seleziona ${r.descrizione}`}
                      checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="mov-att__nowrap">{fmtOra(r.quando)}</td>
                  <td>
                    <span className="mov-att__orig">
                      <i className={`fa-solid fa-${ORIGINI[r.origine].icon}`} aria-hidden="true" />
                      <TruncatedText text={ORIGINI[r.origine].label} className="mov-att__trunc" />
                    </span>
                  </td>
                  <td><TruncatedText text={r.descrizione} full={`${r.descrizione} — inserito da ${r.operatore}`} className="mov-att__trunc" /></td>
                  <td className="mov-att__nowrap">
                    {r.booking
                      ? <Tooltip text={`Prenotazione ${r.booking}`}><span>{r.camera}</span></Tooltip>
                      : <Tooltip text="Nessuna prenotazione collegata"><span className="mov-att__cam-ko">{r.camera}</span></Tooltip>}
                  </td>
                  <td><TruncatedText text={r.intestatario} className="mov-att__trunc" /></td>
                  <td>
                    <span className={`mov-att__motivo mov-att__motivo--${r.stato}`}>
                      <TruncatedText text={r.motivo} className="mov-att__trunc" />
                    </span>
                  </td>
                  <td className={`mov-att__nowrap ${a.tardi ? 'mov-att__tardi' : ''}`}>
                    {a.tardi
                      ? <Tooltip text="In coda da più di 12 ore"><span><i className="fa-solid fa-clock" aria-hidden="true" /> {a.label}</span></Tooltip>
                      : a.label}
                  </td>
                  <td className={`mov-att__num ${r.importo < 0 ? 'mov-att__neg' : ''}`}>{fmtEuro(r.importo)}</td>
                  <td className="mov-att__center mov-att__nowrap">
                    {r.stato === 'abbinare' && <>
                      <Tooltip text="Abbina a un conto"><button type="button" className="sib-btn sib-btn--icon mov-att__act" aria-label="Abbina" onClick={() => apriAbbina(r)}><i className="fa-solid fa-link" /></button></Tooltip>
                      <Tooltip text="Storna all'outlet"><button type="button" className="sib-btn sib-btn--icon mov-att__act" aria-label="Storna" onClick={() => storna(r)}><i className="fa-solid fa-rotate-left" /></button></Tooltip>
                    </>}
                    {r.stato === 'approvare' && <>
                      <Tooltip text="Approva e registra sul conto"><button type="button" className="sib-btn sib-btn--icon mov-att__act" aria-label="Approva" onClick={() => approva([r])}><i className="fa-solid fa-check" /></button></Tooltip>
                      <Tooltip text="Rifiuta"><button type="button" className="sib-btn sib-btn--icon mov-att__act" aria-label="Rifiuta" onClick={() => rifiuta(r)}><i className="fa-solid fa-xmark" /></button></Tooltip>
                    </>}
                    {r.stato === 'fatturare' && <>
                      <Tooltip text={`Emetti ${r.documento?.toLowerCase()}`}><button type="button" className="sib-btn sib-btn--icon mov-att__act" aria-label="Emetti documento" onClick={() => emetti([r])}><i className="fa-solid fa-file-invoice" /></button></Tooltip>
                      <Tooltip text="Apri in Emissione documenti"><button type="button" className="sib-btn sib-btn--icon mov-att__act" aria-label="Apri in Emissione documenti" onClick={() => navigate('emissione-documenti')}><i className="fa-solid fa-arrow-up-right-from-square" /></button></Tooltip>
                    </>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mov-att__footer">
        <div className="mov-att__stats">
          <span>Movimenti: <strong>{filtrate.length}</strong></span>
          <span>Totale coda: <strong>{fmtEuro(totale)}</strong></span>
          <span className={inRitardo ? 'mov-att__tardi' : undefined}>Oltre 12 h: <strong>{inRitardo}</strong></span>
          {selezionate.length > 0 && <span>Selezionati: <strong>{selezionate.length} · {fmtEuro(totaleSel)}</strong></span>}
        </div>
        {coda === 'approvare' && (
          <button type="button" className="sib-btn sib-btn--primary" disabled={!selezionate.length} onClick={() => approva(selezionate)}>
            Approva selezionati
          </button>
        )}
        {coda === 'fatturare' && (
          <button type="button" className="sib-btn sib-btn--primary" disabled={!selezionate.length} onClick={() => emetti(selezionate)}>
            Emetti documenti selezionati
          </button>
        )}
      </div>

      <div className="mov-att__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal open={!!abbina} onClose={() => setAbbina(null)} title="Abbina movimento" size="sm">
        {abbina && (
          <div className="mov-att__modal">
            <p className="mov-att__modal-desc">
              <strong>{abbina.descrizione}</strong> · {fmtEuro(abbina.importo)}<br />
              {ORIGINI[abbina.origine].label} · camera indicata <strong>{abbina.camera}</strong> · {abbina.motivo.toLowerCase()}
            </p>
            <SelectField label="Addebita su" name="destinazione" value={destinazione} onChange={(e) => setDestinazione(e.target.value)}
              options={[
                ...conti.map((c) => ({ value: c.booking, label: `Camera ${c.camera} — ${c.intestatario}` })),
                { value: 'passante', label: 'Nuovo conto passante' },
              ]} />
            <div className="mov-att__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setAbbina(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaAbbina}>Abbina</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
