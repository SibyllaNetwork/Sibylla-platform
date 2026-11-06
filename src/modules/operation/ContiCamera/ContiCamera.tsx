import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Tabs from '../../../core/components/Tabs'
import { useColFilters } from '../../../core/components/ColFilters'
import { apiFetchSibylla } from '../../../services/api'
import { InputField, SelectField } from '../../../core/components/form'
import { useEmissioneStore, type EmAddebito } from '../../../store/useEmissioneStore'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useAccessStore } from '../../../store/useAccessStore'
import './ContiCamera.sass'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { usePmsStore } from '../_data/pmsDemo'
import StoricoConto from './StoricoConto'
import {
  type Addebito, type Anticipo, type Azione, type Data, type Dettaglio, type TassaInfo,
  datiDemo, camereStruttura, camereDelConto, isoDaIt, itDi, isoDi, tsOra, round2, TASSA_PER_ADULTO,
} from './contiCamera.data'

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

/** Parsing tollerante di un importo digitato ("12,50", "12.50 €"). */
const num = (s: string) => {
  const v = Number(s.replace(/[^\d,.-]/g, '').replace(',', '.'))
  return Number.isFinite(v) ? v : NaN
}

// Normalizza la risposta del backend: data ISO per ordinare e storico vuoto
// se il servizio non lo restituisce ancora.
const normalizza = (d: Data): Data => ({
  ...d,
  addebiti: d.addebiti.map((a) => ({ ...a, iso: a.iso ?? isoDaIt(a.data) })),
  storico: d.storico ?? [],
})

const tooltipTassa = (t: TassaInfo, importo: number) => {
  const ospiti = `${t.tassati} ${t.tassati === 1 ? 'adulto' : 'adulti'} × ${fmtCurrency(TASSA_PER_ADULTO)}${t.esenti ? ` · ${t.esenti} ${t.esenti === 1 ? 'esente' : 'esenti'}` : ''}`
  return t.stato === 'pagata'
    ? `Pagata da ${t.pagataDa} · ${t.metodo} · ${t.il} — ${fmtCurrency(importo)} (${ospiti})`
    : `Da pagare — ${fmtCurrency(importo)} (${ospiti})`
}

type Scheda = 'addebiti' | 'anticipi' | 'documenti'

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ContiCamera({ navigate, embedded = false }: { navigate: (p: string) => void; embedded?: boolean }) {
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const versionePms = usePmsStore((st) => st.versione)
  const [data, setData] = useState<Data>(() => datiDemo(strutturaCorrente))
  const [selAddebiti, setSelAddebiti] = useState<number[]>([])
  const [selAnticipi, setSelAnticipi] = useState<number[]>([])
  const setCheckout = useEmissioneStore((s) => s.setCheckout)
  const confirm = useConfirmStore((s) => s.confirm)
  const operatore = useAccessStore((s) => s.profiles.find((p) => p.id === s.currentProfileId)?.nome) ?? 'Front office'
  const cf = useColFilters()

  // Modali
  const [modModifica, setModModifica] = useState<Addebito | null>(null)
  const [modFrazionato, setModFrazionato] = useState<Addebito | null>(null)
  const [modPartiUguali, setModPartiUguali] = useState<Addebito | null>(null)
  const [modTrasferisci, setModTrasferisci] = useState<number[] | null>(null)
  const [modAggiungi, setModAggiungi] = useState(false)
  const [modAggiungiAnticipo, setModAggiungiAnticipo] = useState(false)
  const [modTassa, setModTassa] = useState<Addebito | null>(null)
  const [tab, setTab] = useState<Scheda>('addebiti')
  const [storicoCamera, setStoricoCamera] = useState<string | null>(null)
  const [estrattoOpen, setEstrattoOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetContiCamera', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(normalizza(d)) })
      .catch(() => { if (!cancelled) setData(datiDemo(strutturaCorrente)) })
    return () => { cancelled = true }
  }, [strutturaCorrente, versionePms])

  const d = data.dettaglio
  const storico = data.storico ?? []

  // ── Storico: ogni azione sulla pagina viene registrata ─────────────────────
  const registra = (a: Omit<Azione, 'id' | 'ts' | 'operatore' | 'camera'> & { camera?: string }) =>
    setData((p) => {
      const st = p.storico ?? []
      const id = st.reduce((m, x) => Math.max(m, x.id), 0) + 1
      return { ...p, storico: [...st, { camera: p.dettaglio.camera, ...a, id, ts: tsOra(), operatore }] }
    })
  const setAddebiti = (fn: (a: Addebito[]) => Addebito[]) =>
    setData((p) => ({ ...p, addebiti: fn(p.addebiti).sort((a, b) => a.iso.localeCompare(b.iso) || a.id - b.id) }))
  const nextId = (rows: { id: number }[]) => rows.reduce((m, x) => Math.max(m, x.id), 0) + 1

  // ── Filtri di colonna (Addebiti) ──────────────────────────────────────────
  const opz = (k: keyof Addebito) => Array.from(new Set(data.addebiti.map((a) => String(a[k] || '—')))).sort()
  const addebitiVisibili = useMemo(() => {
    const filtrati = data.addebiti.filter((a) =>
      cf.matchMulti(a.camera, 'camera') &&
      cf.matchText(a.data, 'iso') &&
      cf.matchMulti(a.pertinenza, 'pertinenza') &&
      cf.matchMulti(a.descrizione, 'descrizione') &&
      cf.matchText(a.descrizione, 'descrizione') &&
      cf.matchMulti(`${a.iva} %`, 'iva') &&
      cf.matchMulti(a.trasf || '—', 'trasf'),
    )
    return cf.sortRows(filtrati)
  }, [data.addebiti, cf])

  const idsVisibili = addebitiVisibili.map((a) => a.id)
  const tuttiSelezionati = idsVisibili.length > 0 && idsVisibili.every((id) => selAddebiti.includes(id))
  const toggleAddebito = (id: number) =>
    setSelAddebiti((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAllAddebiti = () =>
    setSelAddebiti((p) => (tuttiSelezionati ? p.filter((id) => !idsVisibili.includes(id)) : Array.from(new Set([...p, ...idsVisibili]))))
  const toggleAnticipo = (id: number) =>
    setSelAnticipi((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAllAnticipi = () =>
    setSelAnticipi((p) => (p.length === data.anticipi.length ? [] : data.anticipi.map((a) => a.id)))

  const totAddebiti = data.addebiti.reduce((s, a) => s + a.prezzo, 0)
  const totVisibili = addebitiVisibili.reduce((s, a) => s + a.prezzo, 0)
  const totAnticipi = data.anticipi.reduce((s, a) => s + a.prezzo, 0)

  // ── Azioni ────────────────────────────────────────────────────────────────
  // Paga ora → porta gli addebiti selezionati (o tutti, se nessuno) alla pagina
  // Emissione documenti.
  const pagaOra = () => {
    const scelti = selAddebiti.length ? data.addebiti.filter((a) => selAddebiti.includes(a.id)) : data.addebiti
    const emAddebiti: EmAddebito[] = scelti.map((a) => ({
      id: a.id,
      camera: a.camera,
      data: a.data,
      riferimento: a.pertinenza && a.pertinenza !== 'Ospite' ? a.pertinenza : '',
      descrizione: a.descrizione,
      prezzo: a.prezzo,
      iva: a.iva,
    }))
    setCheckout({ addebiti: emAddebiti, caparra: Math.abs(totAnticipi) })
    navigate('emissione-documenti')
  }

  const salvaModifica = (a: Addebito, importo: number, motivazione: string) => {
    setAddebiti((rows) => rows.map((r) => (r.id === a.id ? { ...r, prezzo: importo } : r)))
    registra({ tipo: 'Modifica', camera: a.camera, descrizione: `${a.descrizione} del ${a.data}: importo da ${fmtCurrency(a.prezzo)} a ${fmtCurrency(importo)}`, importo, dettaglio: `Motivazione: ${motivazione}` })
    setModModifica(null)
  }

  const salvaFrazioni = (a: Addebito, parti: number[], uguali: boolean) => {
    setAddebiti((rows) => {
      let id = nextId(rows)
      const nuove = parti.map((v, i) => ({ ...a, id: i === 0 ? a.id : id++, prezzo: v, descrizione: `${a.descrizione} (${i + 1}/${parti.length})`, tassa: undefined }))
      return [...rows.filter((r) => r.id !== a.id), ...nuove]
    })
    registra({ tipo: 'Frazionamento', camera: a.camera, descrizione: `${a.descrizione} del ${a.data} diviso in ${parti.length} parti${uguali ? ' uguali' : ''}`, importo: a.prezzo, dettaglio: parti.map(fmtCurrency).join(' + ') })
    setModFrazionato(null); setModPartiUguali(null)
  }

  const salvaTrasferimento = (ids: number[], dest: string) => {
    const spostati = data.addebiti.filter((a) => ids.includes(a.id) && a.camera !== dest)
    setAddebiti((rows) => rows.map((r) => (ids.includes(r.id) && r.camera !== dest ? { ...r, trasf: `da ${r.camera}`, camera: dest } : r)))
    // Un'azione per camera di provenienza: compare nello storico di entrambe.
    Array.from(new Set(spostati.map((a) => a.camera))).forEach((da) => {
      const gruppo = spostati.filter((a) => a.camera === da)
      registra({ tipo: 'Trasferimento', camera: dest, cameraDa: da, descrizione: `${gruppo.length} ${gruppo.length === 1 ? 'addebito trasferito' : 'addebiti trasferiti'} da camera ${da} a camera ${dest}`, importo: round2(gruppo.reduce((s, a) => s + a.prezzo, 0)), dettaglio: gruppo.map((a) => `${a.descrizione} ${a.data}`).join(', ') })
    })
    setSelAddebiti([])
    setModTrasferisci(null)
  }

  const eliminaAddebito = async (a: Addebito) => {
    const ok = await confirm({ title: 'Elimina addebito', message: <>Eliminare l'addebito <strong>{a.descrizione}</strong> del {a.data} da <strong>{fmtCurrency(a.prezzo)}</strong>? L'eliminazione resta registrata nello storico.</> })
    if (!ok) return
    setAddebiti((rows) => rows.filter((r) => r.id !== a.id))
    setSelAddebiti((p) => p.filter((x) => x !== a.id))
    registra({ tipo: 'Eliminazione', camera: a.camera, descrizione: `Eliminato addebito ${a.descrizione} del ${a.data}`, importo: -a.prezzo })
  }

  const eliminaAnticipo = async (a: Anticipo) => {
    const ok = await confirm({ title: 'Elimina anticipo', message: <>Eliminare l'anticipo <strong>{a.tipologia}</strong> da <strong>{fmtCurrency(Math.abs(a.prezzo))}</strong>?</> })
    if (!ok) return
    setData((p) => ({ ...p, anticipi: p.anticipi.filter((r) => r.id !== a.id) }))
    registra({ tipo: 'Eliminazione', camera: a.camera, descrizione: `Eliminato anticipo ${a.tipologia} del ${a.data}`, importo: Math.abs(a.prezzo) })
  }

  const salvaAddebito = (n: Omit<Addebito, 'id' | 'trasf'>, ospite: string) => {
    setAddebiti((rows) => [...rows, { ...n, id: nextId(rows), trasf: '' }])
    registra({ tipo: 'Addebito', camera: n.camera, descrizione: `${n.descrizione} del ${n.data}`, importo: n.prezzo, dettaglio: [ospite && `Ospite: ${ospite}`, `Pertinenza: ${n.pertinenza}`, `IVA ${n.iva} %`].filter(Boolean).join(' · ') })
    setModAggiungi(false)
  }

  const salvaAnticipo = (n: Omit<Anticipo, 'id' | 'trasf'>) => {
    setData((p) => ({ ...p, anticipi: [...p.anticipi, { ...n, id: nextId(p.anticipi), trasf: '' }] }))
    registra({ tipo: 'Pagamento', camera: n.camera, descrizione: `Anticipo ${n.tipologia} incassato`, importo: n.prezzo })
    setModAggiungiAnticipo(false)
  }

  const salvaTassa = (a: Addebito, pagataDa: string, metodo: string) => {
    const t = new Date()
    const il = `${itDi(isoDi(t))} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
    setAddebiti((rows) => rows.map((r) => (r.id === a.id && r.tassa ? { ...r, tassa: { ...r.tassa, stato: 'pagata', pagataDa, metodo, il, operatore } } : r)))
    registra({ tipo: 'Tassa di soggiorno', camera: a.camera, descrizione: `Tassa di soggiorno del ${a.data} pagata`, importo: -a.prezzo, dettaglio: `Pagata da ${pagataDa} · ${metodo}` })
    setModTassa(null)
  }

  return (
    <div className={'conti-camera' + (embedded ? ' conti-camera--embedded' : '')}>
      {!embedded && (
        <>
          <PageHead
            title="Conti camera"
            subtitle="Gestisci facilmente gli addebiti del soggiorno: sposta le singole voci tra camere o ripartisci il valore della prenotazione"
            onBack={() => navigate('ospiti-in-casa')}
            actions={<div className="conti-camera__stampante">Stampante fiscale ...</div>}
          />

          {/* ─── Dettaglio ─────────────────────────────────────────────────── */}
          <h3 className="conti-camera__section-title">Dettaglio</h3>
          <div className="conti-camera__detail-card">
            <div className="conti-camera__detail-row">
              <DetailField label="N. Prenotazione" value={d.prenotazioneNum} />
              <DetailField label="Nominativo" value={d.nominativo} />
              <DetailField label="Data di arrivo" value={d.dataArrivo} />
              <DetailField label="Data di partenza" value={d.dataPartenza} />
              <DetailField label="Giorni" value={String(d.giorni)} />
              <DetailField label="Ospiti" value={String(d.ospiti)} />
              <DetailField label="Agenzia" value={d.agenzia} />
              <DetailField label="Credit" value={d.credit} />
              <DetailField label="Struttura" value={d.struttura} />
            </div>
            <div className="conti-camera__detail-row">
              <DetailField label="Arrangiamento" value={d.arrangiamento} />
              <DetailField label="N camere" value={String(d.nCamere)} />
              <DetailField label="Totale" value={fmtCurrency(d.totale)} />
              <DetailField label="Di cui camere" value={fmtCurrency(d.diCuiCamere)} />
              <DetailField label="Di cui servizi" value={fmtCurrency(d.diCuiServizi)} />
              <DetailField label="Di cui tasse di soggiorno" value={fmtCurrency(d.diCuiTasse)} />
              <DetailField label="Pagato" value={fmtCurrency(d.pagato)} />
              <DetailField label="Da pagare" value={fmtCurrency(d.daPagare)} />
              <DetailField label="Note" value={d.note} />
            </div>
          </div>
        </>
      )}

      {/* ─── Schede: ogni sezione a tutta larghezza ────────────────────────── */}
      <div className="conti-camera__tabs-bar">
        <Tabs
          className="conti-camera__tabs"
          tabs={[
            { id: 'addebiti', label: `Addebiti (${data.addebiti.length})` },
            { id: 'anticipi', label: `Anticipi (${data.anticipi.length})` },
            ...(embedded ? [] : [{ id: 'documenti', label: `Documenti emessi (${data.documenti.length})` }]),
          ]}
          active={tab}
          onChange={(id) => setTab(id as Scheda)}
        />
        <div className="conti-camera__section-actions">
          {tab === 'addebiti' && cf.hasActive && (
            <button type="button" className="sib-btn sib-btn--secondary" onClick={cf.reset}>
              <i className="fa-solid fa-filter-circle-xmark" /> Azzera filtri
            </button>
          )}
          {tab === 'anticipi' && (
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModAggiungiAnticipo(true)}>
              <i className="fa-regular fa-circle-plus" /> Aggiungi anticipo
            </button>
          )}
        </div>
      </div>

      {tab === 'addebiti' && (
        <div className="conti-camera__pane">
          <div className="conti-camera__addebiti">
          <div className="sib-table-wrap">
            <table className="sib-table conti-camera__table conti-camera__table--addebiti">
              <colgroup>
                <col className="conti-camera__c-check" />
                <col className="conti-camera__c-camera" />
                <col className="conti-camera__c-data" />
                <col className="conti-camera__c-pert" />
                <col />
                <col className="conti-camera__c-prezzo" />
                <col className="conti-camera__c-iva" />
                <col className="conti-camera__c-trasf" />
                <col className="conti-camera__c-azioni" />
              </colgroup>
              <thead>
                <tr>
                  <th className="conti-camera__th-check">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      aria-label="Seleziona tutti gli addebiti visibili"
                      checked={tuttiSelezionati}
                      onChange={toggleAllAddebiti}
                    />
                  </th>
                  <th><span className="sib-colf-head"><ThLabel full="Camera" short="Cam." />{cf.th('camera', 'Camera', { options: opz('camera') })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Data" />{cf.th('iso', 'Data', { search: true, sort: true })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Pertinenza" short="Pert." />{cf.th('pertinenza', 'Pertinenza', { options: opz('pertinenza') })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Descrizione" short="Descr." />{cf.th('descrizione', 'Descrizione', { options: opz('descrizione'), search: true })}</span></th>
                  <th className="conti-camera__th-num"><span className="sib-colf-head"><ThLabel full="Prezzo" short="Pr." />{cf.th('prezzo', 'Prezzo', { sort: true })}</span></th>
                  <th className="conti-camera__th-num"><span className="sib-colf-head"><ThLabel full="IVA" />{cf.th('iva', 'IVA', { options: Array.from(new Set(data.addebiti.map((a) => `${a.iva} %`))).sort() })}</span></th>
                  <th><span className="sib-colf-head"><ThLabel full="Trasf." />{cf.th('trasf', 'Trasferimento', { options: opz('trasf') })}</span></th>
                  <th><ThLabel full="Azioni" /></th>
                </tr>
              </thead>
              <tbody>
                {addebitiVisibili.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? 'conti-camera__row--alt' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        className="sib-checkbox"
                        aria-label={`Seleziona ${a.descrizione} del ${a.data}`}
                        checked={selAddebiti.includes(a.id)}
                        onChange={() => toggleAddebito(a.id)}
                      />
                    </td>
                    <td>
                      <Tooltip text={`Storico camera ${a.camera}`}>
                        <button type="button" className="conti-camera__cam-link" onClick={() => setStoricoCamera(a.camera)}>
                          {a.camera} <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </td>
                    <td><TruncatedText text={a.data} /></td>
                    <td><TruncatedText text={a.pertinenza} /></td>
                    <td>
                      <span className="conti-camera__descr">
                        <TruncatedText text={a.descrizione} className="conti-camera__descr-txt" />
                        {a.tassa && (a.tassa.stato === 'pagata'
                          ? (
                            <Tooltip text={tooltipTassa(a.tassa, a.prezzo)}>
                              <i className="fa-solid fa-circle-check conti-camera__tassa-ico conti-camera__tassa-ico--ok" aria-label={`Pagata da ${a.tassa.pagataDa}`} />
                            </Tooltip>
                          ) : (
                            <Tooltip text={`${tooltipTassa(a.tassa, a.prezzo)} · clicca per registrare il pagamento`}>
                              <button type="button" className="conti-camera__tassa-btn" aria-label={`Registra pagamento tassa del ${a.data}`} onClick={() => setModTassa(a)}>
                                <i className="fa-solid fa-clock conti-camera__tassa-ico conti-camera__tassa-ico--due" />
                              </button>
                            </Tooltip>
                          ))}
                      </span>
                    </td>
                    <td className="conti-camera__td-num"><TruncatedText text={fmtCurrency(a.prezzo)} /></td>
                    <td className="conti-camera__td-num">{a.iva} %</td>
                    <td>
                      {a.trasf
                        ? <TruncatedText text={a.trasf} full={`Trasferito ${a.trasf.replace('da', 'dalla camera')}`} className="conti-camera__trasf" />
                        : ''}
                    </td>
                    <td>
                      <div className="conti-camera__row-actions">
                        <Tooltip text="Modifica addebito"><button type="button" className="conti-camera__act" aria-label="Modifica addebito" onClick={() => setModModifica(a)}><i className="fa-solid fa-pen" /></button></Tooltip>
                        <Tooltip text="Addebito frazionato"><button type="button" className="conti-camera__act" aria-label="Addebito frazionato" onClick={() => setModFrazionato(a)}><i className="fa-solid fa-arrows-split-up-and-left" /></button></Tooltip>
                        <Tooltip text="Addebito in parti uguali"><button type="button" className="conti-camera__act" aria-label="Addebito in parti uguali" onClick={() => setModPartiUguali(a)}><i className="fa-solid fa-equals" /></button></Tooltip>
                        <Tooltip text="Trasferisci addebito"><button type="button" className="conti-camera__act" aria-label="Trasferisci addebito" onClick={() => setModTrasferisci([a.id])}><i className="fa-solid fa-right-left" /></button></Tooltip>
                        <Tooltip text="Elimina"><button type="button" className="conti-camera__act" aria-label="Elimina" onClick={() => eliminaAddebito(a)}><i className="fa-solid fa-trash" /></button></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
                {addebitiVisibili.length === 0 && (
                  <tr>
                    <td colSpan={9} className="conti-camera__empty">
                      {data.addebiti.length ? 'Nessun addebito corrisponde ai filtri.' : 'Nessun addebito sul conto.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>

          <div className="conti-camera__bar">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModAggiungi(true)}><i className="fa-regular fa-circle-plus" /> Aggiungi addebito</button>
            {!embedded && (
              <>
                <button type="button" className="sib-btn sib-btn--secondary" disabled={!data.addebiti.length} onClick={() => setModTrasferisci(selAddebiti)}><i className="fa-regular fa-right-left" /> Trasferisci addebiti</button>
                <div className="conti-camera__estratto">
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEstrattoOpen((v) => !v)}>
                    <i className="fa-regular fa-file-lines" /> Estratto conto <i className="fa-regular fa-chevron-down" />
                  </button>
                  {estrattoOpen && (
                    <>
                      <div className="conti-camera__estratto-overlay" onClick={() => setEstrattoOpen(false)} />
                      <div className="conti-camera__estratto-menu" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setEstrattoOpen(false)}>Estratto conto totale</button>
                        <button type="button" onClick={() => setEstrattoOpen(false)}>Estratto conto cliente</button>
                        <button type="button" onClick={() => setEstrattoOpen(false)}>Estratto conto ospite</button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            <button type="button" className="sib-btn sib-btn--primary" onClick={pagaOra}>Paga ora</button>
            <span className="conti-camera__total">
              {cf.hasActive && addebitiVisibili.length !== data.addebiti.length
                ? <>Filtrati: <strong>{fmtCurrency(totVisibili)}</strong> · Totale: <strong>{fmtCurrency(totAddebiti)}</strong></>
                : <>Totale: <strong>{fmtCurrency(totAddebiti)}</strong></>}
            </span>
          </div>
        </div>
      )}

      {tab === 'anticipi' && (
        <div className="conti-camera__pane">
          <div className="sib-table-wrap">
            <table className="sib-table conti-camera__table">
              <thead>
                <tr>
                  <th className="conti-camera__th-check">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      aria-label="Seleziona tutti gli anticipi"
                      checked={selAnticipi.length === data.anticipi.length && data.anticipi.length > 0}
                      onChange={toggleAllAnticipi}
                    />
                  </th>
                  <th>Camera</th>
                  <th>Data</th>
                  <th>Tipologia</th>
                  <th className="conti-camera__th-num">Prezzo</th>
                  <th className="conti-camera__th-num">IVA</th>
                  <th>Trasf</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {data.anticipi.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="sib-checkbox"
                        aria-label={`Seleziona anticipo ${a.tipologia}`}
                        checked={selAnticipi.includes(a.id)}
                        onChange={() => toggleAnticipo(a.id)}
                      />
                    </td>
                    <td>{a.camera}</td>
                    <td>{a.data}</td>
                    <td>{a.tipologia}</td>
                    <td className="conti-camera__td-num">{fmtCurrency(a.prezzo)}</td>
                    <td className="conti-camera__td-num">{a.iva} %</td>
                    <td>{a.trasf}</td>
                    <td>
                      <div className="conti-camera__row-actions">
                        <Tooltip text="Trasferisci"><button type="button" className="sib-btn sib-btn--icon" aria-label="Trasferisci"><i className="fa-solid fa-right-left" /></button></Tooltip>
                        <Tooltip text="Documento"><button type="button" className="sib-btn sib-btn--icon" aria-label="Documento"><i className="fa-solid fa-file-lines" /></button></Tooltip>
                        <Tooltip text="Elimina"><button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => eliminaAnticipo(a)}><i className="fa-solid fa-trash" /></button></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="conti-camera__total-row">
            Totale: <strong>{fmtCurrency(totAnticipi)}</strong>
          </div>
        </div>
      )}

      {!embedded && tab === 'documenti' && (
        <div className="conti-camera__pane">
              <div className="sib-table-wrap">
                <table className="sib-table conti-camera__table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Data</th>
                      <th>Intestatario</th>
                      <th className="conti-camera__th-num">Totale €</th>
                      <th className="conti-camera__th-num">Pagato €</th>
                      <th className="conti-camera__th-num">Sospeso €</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documenti.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.documento}</td>
                        <td>{doc.data}</td>
                        <td className={doc.intestatario ? '' : 'sib-cell--muted'}>{doc.intestatario || '-'}</td>
                        <td className="conti-camera__td-num">{doc.totale.toFixed(2).replace('.', ',')}</td>
                        <td className="conti-camera__td-num">{doc.pagato.toFixed(2).replace('.', ',')}</td>
                        <td className="conti-camera__td-num">{doc.sospeso.toFixed(2).replace('.', ',')}</td>
                        <td>
                          <div className="conti-camera__row-actions">
                            <Tooltip text="Stampa"><button type="button" className="sib-btn sib-btn--icon" aria-label="Stampa"><i className="fa-solid fa-print" /></button></Tooltip>
                            <Tooltip text="Visualizza"><button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza"><i className="fa-solid fa-eye" /></button></Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        </div>
      )}

      {modModifica && <ModificaAddebitoModal addebito={modModifica} onClose={() => setModModifica(null)} onSave={salvaModifica} />}
      {modFrazionato && <FrazionatoModal addebito={modFrazionato} onClose={() => setModFrazionato(null)} onSave={(p) => salvaFrazioni(modFrazionato, p, false)} />}
      {modPartiUguali && <PartiUgualiModal addebito={modPartiUguali} onClose={() => setModPartiUguali(null)} onSave={(p) => salvaFrazioni(modPartiUguali, p, true)} />}
      {modTrasferisci && <TrasferisciModal iniziali={modTrasferisci} addebiti={data.addebiti} onClose={() => setModTrasferisci(null)} onSave={salvaTrasferimento} />}
      {modAggiungi && <AggiungiAddebitoModal dettaglio={d} onClose={() => setModAggiungi(false)} onSave={salvaAddebito} />}
      {modAggiungiAnticipo && <AggiungiAnticipoModal dettaglio={d} onClose={() => setModAggiungiAnticipo(false)} onSave={salvaAnticipo} />}
      {modTassa && <PagaTassaModal addebito={modTassa} dettaglio={d} onClose={() => setModTassa(null)} onSave={salvaTassa} />}
      {storicoCamera && <StoricoConto dettaglio={d} storico={storico} camere={camereDelConto(data)} camera={storicoCamera} onClose={() => setStoricoCamera(null)} />}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="conti-camera__field">
      <div className="conti-camera__field-label">{label}</div>
      <div className="conti-camera__field-value">{value || '-'}</div>
    </div>
  )
}

const OPZIONI_IVA = [
  { value: '', label: 'Seleziona' },
  { value: '0', label: '0%' },
  { value: '4', label: '4%' },
  { value: '10', label: '10%' },
  { value: '22', label: '22%' },
]

// ─── MODAL: Modifica addebito ────────────────────────────────────────────────
function ModificaAddebitoModal({ addebito, onClose, onSave }: { addebito: Addebito; onClose: () => void; onSave: (a: Addebito, importo: number, motivazione: string) => void }) {
  const [importo, setImporto] = useState('')
  const [motivazione, setMotivazione] = useState('')
  const v = num(importo)

  return (
    <ModalShell title="Modifica addebito" onClose={onClose} maxWidth={520}>
      <p className="cc-modal__totale">Totale addebito <strong>{fmtCurrency(addebito.prezzo)}</strong></p>
      <div className="cc-modal__grid cc-modal__grid--2">
        <InputField
          className="cc-modal__field"
          name="importo"
          label="Modifica importo"
          type="text"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
        />
        <InputField
          className="cc-modal__field"
          name="motivazione"
          label="Motivazione"
          placeholder="Inserire motivazione"
          value={motivazione}
          onChange={(e) => setMotivazione(e.target.value)}
        />
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!Number.isFinite(v) || !motivazione.trim()} onClick={() => onSave(addebito, round2(v), motivazione.trim())}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Addebito frazionato ──────────────────────────────────────────────
function FrazionatoModal({ addebito, onClose, onSave }: { addebito: Addebito; onClose: () => void; onSave: (parti: number[]) => void }) {
  const [parti, setParti] = useState(2)
  const [valori, setValori] = useState<string[]>(['', ''])

  const setNumeroParti = (n: number) => {
    setParti(n)
    setValori((p) => {
      const next = p.slice(0, n)
      while (next.length < n) next.push('')
      return next
    })
  }
  const setValore = (i: number, v: string) =>
    setValori((p) => p.map((x, idx) => (idx === i ? v : x)))

  const numeri = valori.map(num)
  const somma = round2(numeri.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0))
  const differenza = round2(addebito.prezzo - somma)
  const valido = numeri.every((v) => Number.isFinite(v) && v > 0) && Math.abs(differenza) < 0.005

  return (
    <ModalShell title="Addebito frazionato" onClose={onClose} maxWidth={620}>
      <p className="cc-modal__totale">Totale addebito <strong>{fmtCurrency(addebito.prezzo)}</strong></p>
      <div className="cc-modal__frazionato">
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="numeroParti"
          label="Numero parti"
          value={parti}
          onChange={(e) => setNumeroParti(Number(e.target.value))}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        />
        {valori.map((v, i) => (
          <div key={i} className="cc-modal__field-raw cc-modal__field--narrow">
            <label>Parte {i + 1}</label>
            <div className="cc-modal__amount">
              <input className="sib-input" type="text" placeholder="0.00" value={v} onChange={(e) => setValore(i, e.target.value)} />
              <span>€</span>
            </div>
          </div>
        ))}
      </div>
      {valori.some((v) => v) && Math.abs(differenza) >= 0.005 && (
        <p className="cc-modal__avviso">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> La somma delle parti ({fmtCurrency(somma)}) deve essere uguale al totale: {differenza > 0 ? 'mancano' : 'eccedono'} {fmtCurrency(Math.abs(differenza))}
        </p>
      )}
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!valido} onClick={() => onSave(numeri.map(round2))}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Addebito in parti uguali ─────────────────────────────────────────
function PartiUgualiModal({ addebito, onClose, onSave }: { addebito: Addebito; onClose: () => void; onSave: (parti: number[]) => void }) {
  const [parti, setParti] = useState(2)
  // Le parti sono arrotondate al centesimo: l'eventuale resto va sull'ultima.
  const base = Math.floor((addebito.prezzo / parti) * 100) / 100
  const valori = Array.from({ length: parti }, (_, i) => (i === parti - 1 ? round2(addebito.prezzo - base * (parti - 1)) : base))

  return (
    <ModalShell title="Addebito in parti uguali" onClose={onClose} maxWidth={620}>
      <p className="cc-modal__totale">Totale addebito <strong>{fmtCurrency(addebito.prezzo)}</strong></p>
      <div className="cc-modal__frazionato">
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="numeroParti"
          label="Numero parti"
          value={parti}
          onChange={(e) => setParti(Number(e.target.value))}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        />
        {valori.map((v, i) => (
          <div key={i} className="cc-modal__field-raw cc-modal__field--narrow">
            <label>Parte {i + 1}</label>
            <div className="cc-modal__amount">
              <input className="sib-input" type="text" value={v.toFixed(2).replace('.', ',')} readOnly />
              <span>€</span>
            </div>
          </div>
        ))}
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => onSave(valori)}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Trasferisci addebito ─────────────────────────────────────────────
function TrasferisciModal({ iniziali, addebiti, onClose, onSave }: { iniziali: number[]; addebiti: Addebito[]; onClose: () => void; onSave: (ids: number[], dest: string) => void }) {
  const [selected, setSelected] = useState<number[]>(iniziali)
  const [destCamera, setDestCamera] = useState('')
  const camereDisponibili = camereStruttura()

  const toggle = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAll = () =>
    setSelected((p) => (p.length === addebiti.length ? [] : addebiti.map((a) => a.id)))

  const totale = addebiti.filter((a) => selected.includes(a.id)).reduce((s, a) => s + a.prezzo, 0)
  // Non si trasferisce un addebito nella camera dove già si trova.
  const giaLi = addebiti.filter((a) => selected.includes(a.id)).every((a) => a.camera === destCamera)

  return (
    <ModalShell title="Trasferisci addebito" onClose={onClose} maxWidth={760}>
      <p className="cc-modal__subtitle">Seleziona gli addebiti da trasferire</p>
      <div className="sib-table-wrap cc-modal__table-wrap">
        <table className="sib-table cc-modal__table">
          <thead>
            <tr>
              <th className="cc-modal__th-check">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  aria-label="Seleziona tutti"
                  checked={selected.length === addebiti.length && addebiti.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Camera</th>
              <th>Data</th>
              <th>Intestatario</th>
              <th>Descrizione</th>
              <th className="cc-modal__th-num">Prezzo</th>
              <th className="cc-modal__th-num">IVA</th>
            </tr>
          </thead>
          <tbody>
            {addebiti.map((a) => (
              <tr key={a.id}>
                <td className="cc-modal__td-center">
                  <input type="checkbox" className="sib-checkbox" aria-label={`Seleziona ${a.descrizione} del ${a.data}`} checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                </td>
                <td>{a.camera}</td>
                <td>{a.data}</td>
                <td className={a.pertinenza === 'Ospite' ? 'sib-cell--muted' : ''}>{a.pertinenza === 'Ospite' ? '' : a.pertinenza}</td>
                <td>{a.descrizione}</td>
                <td className="cc-modal__td-num">{fmtCurrency(a.prezzo)}</td>
                <td className="cc-modal__td-num">{(a.prezzo * a.iva / 100).toFixed(2).replace('.', ',')} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cc-modal__totale-row">Totale: <strong>{fmtCurrency(totale)}</strong></div>
      <SelectField
        className="cc-modal__field"
        name="destCamera"
        label="Seleziona camera di destinazione"
        value={destCamera}
        onChange={(e) => setDestCamera(e.target.value)}
        options={[
          { value: '', label: 'Seleziona' },
          ...camereDisponibili.map((c) => ({ value: c, label: `Camera ${c}` })),
        ]}
      />
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!destCamera || selected.length === 0 || giaLi} onClick={() => onSave(selected, destCamera)}>Trasferisci</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Aggiungi addebito ────────────────────────────────────────────────
const SERVIZI = [
  { value: 'Room Only', label: 'Room Only' },
  { value: 'Frigo bar', label: 'Frigo Bar' },
  { value: 'Lavanderia', label: 'Lavanderia' },
  { value: 'Parcheggio', label: 'Parcheggio' },
  { value: 'Ristorante', label: 'Ristorante' },
  { value: 'Late check-out', label: 'Late check-out' },
]

function AggiungiAddebitoModal({ dettaglio, onClose, onSave }: { dettaglio: Dettaglio; onClose: () => void; onSave: (a: Omit<Addebito, 'id' | 'trasf'>, ospite: string) => void }) {
  const [nomeServizio, setNomeServizio] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [ospite, setOspite] = useState('')
  const [pertinenza, setPertinenza] = useState('Ospite')
  const [quantita, setQuantita] = useState('1')
  const [prezzo, setPrezzo] = useState('')
  const [iva, setIva] = useState('')
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const [del, setDel] = useState(today)
  const p = num(prezzo)

  const salva = () => {
    const iso = isoDaIt(del)
    onSave({
      camera: dettaglio.camera, data: itDi(iso), iso, pertinenza,
      descrizione: (descrizione.trim() || nomeServizio) + (Number(quantita) > 1 ? ` × ${quantita}` : ''),
      prezzo: round2(p * Number(quantita)), iva: Number(iva),
    }, ospite)
  }

  return (
    <ModalShell title="Aggiungi addebito" onClose={onClose} maxWidth={1100}>
      <div className="cc-modal__detail-row">
        <DetailField label="N. Prenotazione" value={dettaglio.prenotazioneNum} />
        <DetailField label="N. Camera" value={dettaglio.camera} />
        <DetailField label="Nominativo" value={dettaglio.nominativo} />
        <DetailField label="Data di arrivo" value={dettaglio.dataArrivo} />
        <DetailField label="Data di partenza" value={dettaglio.dataPartenza} />
        <DetailField label="Giorni" value={String(dettaglio.giorni)} />
        <DetailField label="Ospiti" value={String(dettaglio.ospiti)} />
      </div>
      <div className="cc-modal__row">
        <SelectField
          className="cc-modal__field cc-modal__field--medium"
          name="nomeServizio"
          label="Nome servizio"
          value={nomeServizio}
          onChange={(e) => setNomeServizio(e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...SERVIZI]}
        />
        <InputField
          className="cc-modal__field cc-modal__field--medium"
          name="descrizione"
          label="Descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--medium"
          name="ospite"
          label="Ospite"
          value={ospite}
          onChange={(e) => setOspite(e.target.value)}
          options={[
            { value: '', label: 'Seleziona' },
            ...(dettaglio.nomiOspiti ?? [dettaglio.nominativo]).map((n) => ({ value: n, label: n })),
          ]}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="pertinenza"
          label="Pertinenza"
          value={pertinenza}
          onChange={(e) => setPertinenza(e.target.value)}
          options={[
            { value: 'Ospite', label: 'Ospite' },
            { value: 'Camera', label: 'Camera' },
            { value: 'Prenotazione', label: 'Prenotazione' },
          ]}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--xs"
          name="quantita"
          label="Quantità"
          value={quantita}
          onChange={(e) => setQuantita(e.target.value)}
          options={[1,2,3,4,5,6,7,8,9,10].map((n) => ({ value: n, label: String(n) }))}
        />
        <div className="cc-modal__field-raw cc-modal__field--xs">
          <label>Prezzo</label>
          <div className="cc-modal__amount">
            <input className="sib-input" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} />
            <span>€</span>
          </div>
        </div>
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="iva"
          label="IVA"
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          options={OPZIONI_IVA}
        />
        <InputField
          className="cc-modal__field cc-modal__field--narrow"
          name="del"
          label="Del"
          value={del}
          onChange={(e) => setDel(e.target.value)}
        />
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--primary" disabled={!nomeServizio || !Number.isFinite(p) || !prezzo || !iva} onClick={salva}>Salva</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Aggiungi anticipo ────────────────────────────────────────────────
const TIPOLOGIE_ANTICIPO = [
  { value: 'Bonifico', label: 'Bonifico' },
  { value: 'Carta di credito', label: 'Carta di credito' },
  { value: 'Contanti', label: 'Contanti' },
  { value: 'Caparra confirmatoria', label: 'Caparra confirmatoria' },
]

function AggiungiAnticipoModal({ dettaglio, onClose, onSave }: { dettaglio: Dettaglio; onClose: () => void; onSave: (a: Omit<Anticipo, 'id' | 'trasf'>) => void }) {
  const [camera, setCamera] = useState(dettaglio.camera)
  const [tipologia, setTipologia] = useState('')
  const [prezzo, setPrezzo] = useState('')
  const [iva, setIva] = useState('')
  const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const [data, setData] = useState(today)
  const p = num(prezzo)
  const camere = camereStruttura()

  return (
    <ModalShell title="Aggiungi anticipo" onClose={onClose} maxWidth={860}>
      <div className="cc-modal__detail-row">
        <DetailField label="N. Prenotazione" value={dettaglio.prenotazioneNum} />
        <DetailField label="Nominativo" value={dettaglio.nominativo} />
        <DetailField label="Data di arrivo" value={dettaglio.dataArrivo} />
        <DetailField label="Data di partenza" value={dettaglio.dataPartenza} />
      </div>
      <div className="cc-modal__row">
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="camera"
          label="Camera"
          value={camera}
          onChange={(e) => setCamera(e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...camere.map((c) => ({ value: c, label: c }))]}
        />
        <SelectField
          className="cc-modal__field cc-modal__field--medium"
          name="tipologia"
          label="Tipologia"
          value={tipologia}
          onChange={(e) => setTipologia(e.target.value)}
          options={[{ value: '', label: 'Seleziona' }, ...TIPOLOGIE_ANTICIPO]}
        />
        <div className="cc-modal__field-raw cc-modal__field--xs">
          <label>Prezzo</label>
          <div className="cc-modal__amount">
            <input className="sib-input" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} />
            <span>€</span>
          </div>
        </div>
        <SelectField
          className="cc-modal__field cc-modal__field--narrow"
          name="iva"
          label="IVA"
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          options={OPZIONI_IVA}
        />
        <InputField
          className="cc-modal__field cc-modal__field--narrow"
          name="data"
          label="Data"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>
      <div className="cc-modal__foot">
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          disabled={!camera || !tipologia || !prezzo || !Number.isFinite(p)}
          onClick={() => onSave({ camera, data: itDi(isoDaIt(data)), tipologia, prezzo: -Math.abs(round2(p)), iva: Number(iva) || 0 })}
        >
          Salva
        </button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL: Registra pagamento tassa di soggiorno ────────────────────────────
const METODI_PAGAMENTO = ['Contanti', 'Carta di credito', 'Bancomat', 'Bonifico', 'Addebito in fattura']

function PagaTassaModal({ addebito, dettaglio, onClose, onSave }: { addebito: Addebito; dettaglio: Dettaglio; onClose: () => void; onSave: (a: Addebito, pagataDa: string, metodo: string) => void }) {
  const pagatori = [
    ...(dettaglio.nomiOspiti ?? [dettaglio.nominativo]),
    ...(dettaglio.agenzia && !['Diretto', 'Sito web'].includes(dettaglio.agenzia) ? [`${dettaglio.agenzia} (agenzia)`] : []),
  ]
  const [pagataDa, setPagataDa] = useState(pagatori[0] ?? '')
  const [metodo, setMetodo] = useState('Contanti')
  const t = addebito.tassa!

  return (
    <ModalShell title="Registra pagamento tassa di soggiorno" onClose={onClose} maxWidth={560}>
      <p className="cc-modal__totale">
        Notte del {addebito.data} · {t.tassati} {t.tassati === 1 ? 'adulto' : 'adulti'}{t.esenti ? ` + ${t.esenti} ${t.esenti === 1 ? 'esente' : 'esenti'}` : ''} · <strong>{fmtCurrency(addebito.prezzo)}</strong>
      </p>
      <div className="cc-modal__grid cc-modal__grid--2">
        <SelectField
          className="cc-modal__field"
          name="pagataDa"
          label="Pagata da"
          value={pagataDa}
          onChange={(e) => setPagataDa(e.target.value)}
          options={pagatori.map((n) => ({ value: n, label: n }))}
        />
        <SelectField
          className="cc-modal__field"
          name="metodo"
          label="Metodo"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          options={METODI_PAGAMENTO.map((m) => ({ value: m, label: m }))}
        />
      </div>
      <div className="cc-modal__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!pagataDa} onClick={() => onSave(addebito, pagataDa, metodo)}>Registra</button>
      </div>
    </ModalShell>
  )
}

// ─── MODAL SHELL ─────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, maxWidth = 600, children }: { title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode }) {
  return (
    <div className="cc-modal__overlay" onClick={onClose}>
      <div className="cc-modal" style={{ '--modal-max-w': `${maxWidth}px` } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal__head">
          <h3>{title}</h3>
          <button type="button" className="cc-modal__close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
        <div className="cc-modal__body">{children}</div>
      </div>
    </div>
  )
}
