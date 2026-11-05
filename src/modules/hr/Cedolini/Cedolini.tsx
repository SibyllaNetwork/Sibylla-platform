import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Pagination from '../../../core/components/Pagination'
import { useColFilters } from '../../../core/components/ColFilters'
import Ico from '../../../core/icons/Ico'
import { SelectField, SearchField, CheckboxField } from '../../../core/components/form'
import VistaSwitch from '../../../core/components/VistaSwitch'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import {
  useHrGestioneStore, DIPENDENTI_HR, REPARTI_HR, nomeDipendente, repartoDipendente,
  fmtDataHr, fmtMeseHr, eurHr, type Cedolino,
} from '../../../store/useHrGestioneStore'
import { exportXls } from '../hrExport'
import { useGiornataPresenze, useRegistroPresenzeStore } from '../../../store/useRegistroPresenzeStore'
import RegistroMensile, { type DipendenteMese } from '../_presenze/RegistroMensile'
import { esportaPresenzePdf, esportaRegistroXlsx } from '../_presenze/presenzeExport'
import { chiaveGiorno, repartoIcon } from '../_presenze/presenze.model'
import './Cedolini.sass'

/**
 * Cedolini — HR › Gestione delle presenze.
 * L'ufficio del personale carica i cedolini del mese (in bozza), li controlla e li
 * pubblica: da quel momento il dipendente li trova nella sua area e la colonna
 * "Visto" indica se li ha aperti.
 * Vista dettagliata: le presenze del mese di ogni dipendente (dal Registro
 * presenze) per controllare la busta paga e approvare lo straordinario giorno
 * per giorno; da qui anche il PDF del calendario presenze con lo straordinario
 * approvato, da firmare, e il registro Excel per il consulente del lavoro.
 */

const VISTA_KEY = 'sibylla.cedolini.vista'
const leggiDettagliata = () => { try { return localStorage.getItem(VISTA_KEY) === 'dettagliata' } catch { return false } }

const PAGE_SIZE = 12
/** Valori del filtro di colonna "Visto" (le bozze non sono ancora visibili al dipendente). */
const VISTO_OPZ = ['Aperto', 'Non aperto', 'Non pubblicato']

const meseCorrente = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const mesePrecedente = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

export default function Cedolini({ navigate }: { navigate: (p: string) => void }) {
  const cedolini = useHrGestioneStore(s => s.cedolini)
  const carica = useHrGestioneStore(s => s.caricaCedolini)
  const pubblica = useHrGestioneStore(s => s.pubblicaCedolini)
  const elimina = useHrGestioneStore(s => s.eliminaCedolino)
  const confirm = useConfirmStore(s => s.confirm)
  const cf = useColFilters()
  const giornata = useGiornataPresenze()
  const straordinarioApprovato = useRegistroPresenzeStore(s => s.straordinarioApprovato)
  const approvaStraordinario = useRegistroPresenzeStore(s => s.approvaStraordinario)
  const [dettagliata, setDettagliataState] = useState(leggiDettagliata)
  const [esportando, setEsportando] = useState(false)
  const setDettagliata = (v: boolean) => { setDettagliataState(v); try { localStorage.setItem(VISTA_KEY, v ? 'dettagliata' : 'tabella') } catch { /* preferenza non salvata */ } }

  const mesi = useMemo(() => Array.from(new Set([meseCorrente(), ...cedolini.map(c => c.mese)])).sort().reverse(), [cedolini])
  const [mese, setMese] = useState(() => (cedolini.some(c => c.mese === mesePrecedente()) ? mesePrecedente() : mesi[0]))
  const [reparto, setReparto] = useState('')
  const [stato, setStato] = useState('')
  const [cerca, setCerca] = useState('')
  const [page, setPage] = useState(1)
  const [anteprima, setAnteprima] = useState<Cedolino | null>(null)
  const [upload, setUpload] = useState<{ mese: string; ids: number[] } | null>(null)

  const delMese = useMemo(() => cedolini.filter(c => c.mese === mese), [cedolini, mese])
  const rows = useMemo(() => delMese
    .map(c => ({
      ...c,
      dipendente: nomeDipendente(c.dipendenteId),
      reparto: repartoDipendente(c.dipendenteId),
      pubblicato: c.pubblicatoAt ?? '',
      vistoLbl: c.stato === 'Bozza' ? VISTO_OPZ[2] : c.visto ? VISTO_OPZ[0] : VISTO_OPZ[1],
    }))
    .filter(c => !reparto || c.reparto === reparto)
    .filter(c => !stato || c.stato === stato)
    .filter(c => !cerca.trim() || c.dipendente.toLowerCase().includes(cerca.trim().toLowerCase()))
    .filter(c =>
      cf.matchText(c.dipendente, 'dipendente') &&
      cf.matchMulti(c.reparto, 'reparto') &&
      cf.matchMulti(c.stato, 'stato') &&
      cf.matchMulti(c.vistoLbl, 'visto'))
    .sort((a, b) => a.dipendente.localeCompare(b.dipendente)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [delMese, reparto, stato, cerca, cf.text, cf.multi])
  const sorted = useMemo(() => cf.sortRows(rows),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rows, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [mese, reparto, stato, cerca, cf.text, cf.multi])
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const bozze = delMese.filter(c => c.stato === 'Bozza')
  const pubblicati = delMese.filter(c => c.stato === 'Pubblicato')
  const nonVisti = pubblicati.filter(c => !c.visto).length
  const mancanti = DIPENDENTI_HR.filter(d => !delMese.some(c => c.dipendenteId === d.id))

  const pubblicaUno = (c: Cedolino) => {
    pubblica([c.id])
    toast.success(`Cedolino di ${nomeDipendente(c.dipendenteId)} pubblicato.`, 'Pubblicato')
  }
  const pubblicaTutti = async () => {
    const ok = await confirm({
      title: 'Pubblica cedolini',
      message: `Pubblicare ${bozze.length === 1 ? 'il cedolino in bozza' : `i ${bozze.length} cedolini in bozza`} di ${fmtMeseHr(mese)}? I dipendenti riceveranno la notifica nella loro area.`,
      confirmLabel: 'Pubblica',
      danger: false,
    })
    if (!ok) return
    pubblica(bozze.map(c => c.id))
    toast.success(`${bozze.length} cedolini di ${fmtMeseHr(mese)} pubblicati.`, 'Pubblicati')
  }
  const cancella = async (c: Cedolino) => {
    const ok = await confirm({ title: 'Elimina cedolino', message: `Eliminare il cedolino di ${fmtMeseHr(c.mese)} di ${nomeDipendente(c.dipendenteId)}?`, confirmLabel: 'Elimina' })
    if (!ok) return
    elimina(c.id)
    toast.success('Cedolino eliminato.', 'Eliminato')
  }

  const apriUpload = () => setUpload({ mese, ids: mancanti.map(d => d.id) })
  const confermaUpload = () => {
    if (!upload || upload.ids.length === 0) return
    const n = carica(upload.mese, upload.ids)
    setMese(upload.mese)
    setUpload(null)
    toast.success(n === 1 ? '1 cedolino caricato in bozza.' : `${n} cedolini caricati in bozza.`, 'Caricamento completato')
  }
  const mancantiUpload = upload ? DIPENDENTI_HR.filter(d => !cedolini.some(c => c.mese === upload.mese && c.dipendenteId === d.id)) : []

  const esporta = () => exportXls(`cedolini-${mese}`, ['Dipendente', 'Reparto', 'Mese', 'Lordo', 'Netto', 'Stato', 'Pubblicato il', 'Visto dal dipendente'],
    rows.map(c => [c.dipendente, c.reparto, fmtMeseHr(c.mese), eurHr(c.lordo), eurHr(c.netto), c.stato, c.pubblicatoAt ? fmtDataHr(c.pubblicatoAt) : '', c.stato === 'Pubblicato' ? (c.visto ? 'Sì' : 'No') : '']))

  // ── Vista dettagliata: presenze del mese per dipendente ──
  const [annoSel, meseSel] = mese.split('-').map(Number)
  const statoCed = (id: number) => delMese.find(c => c.dipendenteId === id)
  const dipDettaglio: DipendenteMese[] = DIPENDENTI_HR
    .filter(d => !reparto || d.reparto === reparto)
    .filter(d => !stato || statoCed(d.id)?.stato === stato)
    .filter(d => !cerca.trim() || `${d.nome} ${d.cognome}`.toLowerCase().includes(cerca.trim().toLowerCase()))
    .map(d => ({ id: d.id, nome: d.nome, cognome: d.cognome, reparto: d.reparto }))
    .sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`))
  const opzExport = () => ({ dipendenti: dipDettaglio, anno: annoSel, mese: meseSel - 1, giornata, straordinarioApprovato, titolo: 'Calendario presenze' })
  const scaricaPdf = async () => { setEsportando(true); try { await esportaPresenzePdf(opzExport()) } finally { setEsportando(false) } }
  const approva = (dipId: number, iso: string, minuti: number | null) => approvaStraordinario(chiaveGiorno(dipId, iso), minuti)
  const azioniDip = (d: DipendenteMese) => {
    const c = statoCed(d.id)
    if (!c) return <span className="ced__det-stato ced__det-stato--manca"><i className="fa-regular fa-file-circle-xmark" aria-hidden="true" />Cedolino non caricato</span>
    return (
      <>
        <span className={`ced__det-stato ced__det-stato--${c.stato === 'Bozza' ? 'bozza' : 'pub'}`}>
          <i className={`fa-solid ${c.stato === 'Bozza' ? 'fa-file-pen' : 'fa-circle-check'}`} aria-hidden="true" />
          {c.stato === 'Bozza' ? 'Cedolino in bozza' : 'Cedolino pubblicato'}
        </span>
        <Tooltip text="Anteprima del cedolino">
          <button type="button" className="ced__act" onClick={() => setAnteprima(c)} aria-label="Anteprima del cedolino">
            <Ico n="eye" w="solid" s={16} c="currentColor" />
          </button>
        </Tooltip>
      </>
    )
  }

  const selettoreVista = (
    <VistaSwitch ariaLabel="Vista dei cedolini" value={dettagliata ? 'dettagliata' : 'tabella'} onChange={(v) => setDettagliata(v === 'dettagliata')} options={[
      { value: 'tabella', label: 'Tabella', icon: 'fa-table-list' },
      { value: 'dettagliata', label: 'Dettagliata', icon: 'fa-calendar-days' },
    ]} />
  )

  const act = (tip: string, ico: string, onClick: () => void) => (
    <Tooltip text={tip}>
      <button type="button" className="ced__act" onClick={onClick} aria-label={tip}>
        <Ico n={ico} w="solid" s={16} c="currentColor" />
      </button>
    </Tooltip>
  )

  return (
    <div className="ced">
      <PageHead
        title="Cedolini"
        subtitle="Carica, controlla e pubblica le buste paga del personale"
        onBack={() => navigate('home')}
        actions={
          <div className="ced__head-actions">
            <button type="button" className="sib-btn sib-btn--primary" onClick={apriUpload}>
              <Ico n="upload" s={14} c="currentColor" /> Carica cedolini
            </button>
          </div>
        }
      />

      <div className="ced__toolbar">
        <SelectField name="mese" label="Mese" className="ced__field" value={mese} onChange={e => setMese(e.target.value)}
          options={mesi.map(m => ({ value: m, label: fmtMeseHr(m) }))} />
        <SelectField name="reparto" label="Reparto" className="ced__field" value={reparto} onChange={e => setReparto(e.target.value)}
          options={[{ value: '', label: 'Tutti i reparti' }, ...REPARTI_HR.map(r => ({ value: r, label: r }))]} />
        <SelectField name="stato" label="Stato" className="ced__field ced__field--stato" value={stato} onChange={e => setStato(e.target.value)}
          options={[{ value: '', label: 'Tutti' }, { value: 'Bozza', label: 'Bozza' }, { value: 'Pubblicato', label: 'Pubblicato' }]} />
        <div className="ced__search">
          <SearchField name="cerca" placeholder="Cerca dipendente…" value={cerca}
            onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
        </div>
        <div className="ced__push">
          {bozze.length > 0 && (
            <button type="button" className="sib-btn sib-btn--secondary" onClick={pubblicaTutti}>
              <Ico n="send" s={13} c="currentColor" /> Pubblica bozze ({bozze.length})
            </button>
          )}
          {dettagliata ? (
            <>
              <button type="button" className="sib-btn sib-btn--secondary ced__exp" onClick={() => esportaRegistroXlsx(opzExport())} disabled={!dipDettaglio.length}>
                <i className="fa-regular fa-file-xls" aria-hidden="true" />Registro Excel
              </button>
              <button type="button" className="sib-btn sib-btn--secondary ced__exp" onClick={scaricaPdf} disabled={!dipDettaglio.length || esportando}>
                <i className={`fa-regular ${esportando ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} aria-hidden="true" />PDF presenze
              </button>
            </>
          ) : (
            <Tooltip text="Esporta in Excel">
              <button type="button" className="ced__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
                <Ico n="excel" w="regular" s={16} c="#fff" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {dettagliata && (
        <RegistroMensile dipendenti={dipDettaglio} anno={annoSel} mese={meseSel - 1} giornata={giornata} repartoIcon={repartoIcon}
          variante="cedolino" straordinarioApprovato={straordinarioApprovato} onApprovaStraordinario={approva} azioniDipendente={azioniDip}
          legendaExtra={selettoreVista} />
      )}

      {!dettagliata && (<>
      <div className="ced__vista-row">{selettoreVista}</div>

      <div className="sib-table-wrap ced__wrap">
        <table className="sib-table ced__table">
          <colgroup>
            <col className="ced__col-dip" />
            <col className="ced__col-rep" />
            <col className="ced__col-mese" />
            <col className="ced__col-imp" />
            <col className="ced__col-imp" />
            <col className="ced__col-stato" />
            <col className="ced__col-pub" />
            <col className="ced__col-visto" />
            <col className="ced__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Dipendente" short="Dip." />{cf.th('dipendente', 'dipendente', { search: true, sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Reparto" short="Rep." />{cf.th('reparto', 'reparto', { options: REPARTI_HR, sort: true })}</span></th>
              <th><ThLabel full="Mese" /></th>
              <th className="ced__r"><span className="sib-colf-head"><ThLabel full="Lordo" />{cf.th('lordo', 'lordo', { sort: true })}</span></th>
              <th className="ced__r"><span className="sib-colf-head"><ThLabel full="Netto" />{cf.th('netto', 'netto', { sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: ['Bozza', 'Pubblicato'] })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Pubblicato il" short="Pubbl. il" />{cf.th('pubblicato', 'pubblicato il', { sort: true })}</span></th>
              <th className="ced__c"><span className="sib-colf-head"><ThLabel full="Visto" />{cf.th('visto', 'visto', { options: VISTO_OPZ })}</span></th>
              <th className="ced__c"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(c => (
              <tr key={c.id}>
                <td className="ced__strong"><TruncatedText text={c.dipendente} /></td>
                <td><TruncatedText text={c.reparto} /></td>
                <td><TruncatedText text={fmtMeseHr(c.mese)} /></td>
                <td className="ced__r"><TruncatedText text={eurHr(c.lordo)} /></td>
                <td className="ced__r ced__strong"><TruncatedText text={eurHr(c.netto)} /></td>
                <td><span className={`ced__stato ced__stato--${c.stato === 'Bozza' ? 'attesa' : 'ok'}`}><TruncatedText text={c.stato} /></span></td>
                <td><TruncatedText text={c.pubblicatoAt ? fmtDataHr(c.pubblicatoAt) : '-'} /></td>
                <td className="ced__c">
                  {c.stato === 'Bozza'
                    ? <span className="ced__dash">-</span>
                    : c.visto
                      ? <Tooltip text="Aperto dal dipendente"><span className="ced__visto"><Ico n="eye" w="solid" s={16} c="currentColor" /></span></Tooltip>
                      : <Tooltip text="Non ancora aperto dal dipendente"><span className="ced__nonvisto"><Ico n="eye-off" w="solid" s={16} c="currentColor" /></span></Tooltip>}
                </td>
                <td className="ced__c">
                  <span className="ced__acts">
                    {act('Visualizza cedolino', 'file-pdf', () => setAnteprima(c))}
                    {c.stato === 'Bozza' && act('Pubblica', 'send', () => pubblicaUno(c))}
                    {c.stato === 'Bozza' && act('Elimina', 'trash', () => cancella(c))}
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={9} className="ced__empty">
                {delMese.length === 0 ? `Nessun cedolino caricato per ${fmtMeseHr(mese)}.` : 'Nessun cedolino corrisponde ai filtri impostati.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ced__foot">
        <span>{fmtMeseHr(mese)}: <strong>{pubblicati.length}</strong> pubblicati, <strong>{bozze.length}</strong> in bozza</span>
        {nonVisti > 0 && <span><strong>{nonVisti}</strong> non ancora aperti dal dipendente</span>}
        {mancanti.length > 0 && <span>Mancano <strong>{mancanti.length}</strong> dipendenti</span>}
        <span>Netto del mese: <strong>{eurHr(delMese.reduce((s, c) => s + c.netto, 0))}</strong></span>
      </div>

      <div className="ced__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>
      </>)}

      {/* ── Carica cedolini ── */}
      <Modal open={!!upload} onClose={() => setUpload(null)} title="Carica cedolini" size="md">
        {upload && (
          <div className="ced-modal">
            <SelectField name="up-mese" label="Mese di competenza" value={upload.mese}
              onChange={e => {
                const m = e.target.value
                setUpload({ mese: m, ids: DIPENDENTI_HR.filter(d => !cedolini.some(c => c.mese === m && c.dipendenteId === d.id)).map(d => d.id) })
              }}
              options={[meseCorrente(), ...mesi].filter((m, i, a) => a.indexOf(m) === i).map(m => ({ value: m, label: fmtMeseHr(m) }))} />
            {mancantiUpload.length === 0 ? (
              <p className="ced-modal__text">Tutto il personale ha già il cedolino di {fmtMeseHr(upload.mese)}.</p>
            ) : (
              <>
                <div className="ced-modal__head">
                  <span className="ced-modal__label">Dipendenti senza cedolino ({mancantiUpload.length})</span>
                  <button type="button" className="ced-modal__link" onClick={() =>
                    setUpload({ ...upload, ids: upload.ids.length === mancantiUpload.length ? [] : mancantiUpload.map(d => d.id) })}>
                    {upload.ids.length === mancantiUpload.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                  </button>
                </div>
                <div className="ced-modal__list">
                  {mancantiUpload.map(d => (
                    <CheckboxField key={d.id} name={`up-${d.id}`} label={`${d.nome} ${d.cognome} · ${d.reparto}`}
                      checked={upload.ids.includes(d.id)}
                      onChange={() => setUpload({ ...upload, ids: upload.ids.includes(d.id) ? upload.ids.filter(x => x !== d.id) : [...upload.ids, d.id] })} />
                  ))}
                </div>
                <p className="ced-modal__hint">I cedolini vengono caricati in bozza: li pubblichi dopo averli controllati.</p>
              </>
            )}
            <div className="ced-modal__actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setUpload(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={upload.ids.length === 0} onClick={confermaUpload}>
                Carica {upload.ids.length > 0 ? `(${upload.ids.length})` : ''}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Anteprima ── */}
      <Modal open={!!anteprima} onClose={() => setAnteprima(null)} title="Cedolino" size="sm">
        {anteprima && (
          <div className="ced-modal">
            <div className="ced-slip">
              <div className="ced-slip__head">
                <span className="ced-slip__name">{nomeDipendente(anteprima.dipendenteId)}</span>
                <span className="ced-slip__mese">{fmtMeseHr(anteprima.mese)}</span>
              </div>
              <dl className="ced-slip__rows">
                <dt>Retribuzione lorda</dt><dd>{eurHr(anteprima.lordo)}</dd>
                <dt>Contributi e ritenute</dt><dd>-{eurHr(anteprima.lordo - anteprima.netto)}</dd>
                <dt className="ced-slip__tot">Netto in busta</dt><dd className="ced-slip__tot">{eurHr(anteprima.netto)}</dd>
              </dl>
              <span className="ced-slip__file"><Ico n="file-pdf" w="solid" s={13} c="currentColor" /> <TruncatedText text={anteprima.file} /></span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
