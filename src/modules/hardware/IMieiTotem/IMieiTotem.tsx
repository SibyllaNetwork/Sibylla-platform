import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { SelectField, SearchField, ToggleSwitch } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import ItaliaTotem, { type PuntoTotem } from '../_shared/ItaliaTotem'
import SpotPlayer, { CreativitaView, TotemFrame } from '../_shared/SpotPlayer'
import {
  useTotemStore, FASCE, fasciaOra, oggiT, trasmissioniDi, inserzioniDi, etichettaTotem, eurT, giornoT,
  type StatoTotem, type Totem,
} from '../../../store/useTotemStore'
import './IMieiTotem.sass'

/**
 * I miei totem — Dispositivi › Totem.
 * La rete dei totem del cliente sul territorio nazionale: mappa, elenco con
 * stato in tempo reale, cosa va in onda adesso e spazi in vendita a terzi.
 * Da qui si apre la scheda di amministrazione e configurazione di ogni totem.
 */

const STATO_LBL: Record<StatoTotem, string> = { online: 'Online', offline: 'Offline', manutenzione: 'Manutenzione' }

const fraFa = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'adesso'
  if (m < 60) return `${m} min fa`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h fa` : `${Math.round(h / 24)} gg fa`
}

export default function IMieiTotem({ navigate }: { navigate: (p: string) => void }) {
  const { totem, progetti, trasmissioni, inserzioni, aggiornaTotem, riavvia } = useTotemStore()
  const [cerca, setCerca] = useState('')
  const [regione, setRegione] = useState('')
  const [stato, setStato] = useState('')
  const [sel, setSel] = useState<string>(() => totem[0]?.id ?? '')

  const oggi = oggiT()
  const fascia = fasciaOra()

  // Cosa va in onda adesso su un totem: inserzione di terzi, poi trasmissione propria, poi riempimento.
  const inOnda = (t: Totem) => {
    if (t.stato !== 'online') return null
    const ins = inserzioniDi(inserzioni, t.id, oggi, fascia)[0]
    const tr = trasmissioniDi(trasmissioni, t.id, oggi, fascia)
    const prog = progetti.find(p => p.id === (tr[0]?.progettoId ?? t.config.progettoRiempimento))
    return { ins, prog, riempimento: !tr.length, nTr: tr.length }
  }

  const regioni = useMemo(() => Array.from(new Set(totem.map(t => t.regione))).sort(), [totem])
  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return totem
      .filter(t => !regione || t.regione === regione)
      .filter(t => !stato || t.stato === stato)
      .filter(t => !q || `${t.luogo} ${t.nome} ${t.citta} ${t.indirizzo}`.toLowerCase().includes(q))
  }, [totem, cerca, regione, stato])

  // Segnaposto raggruppati per città (stato peggiore del gruppo).
  const punti: PuntoTotem[] = useMemo(() => {
    const per = new Map<string, Totem[]>()
    righe.forEach(t => per.set(t.citta, [...(per.get(t.citta) ?? []), t]))
    return Array.from(per.entries()).map(([citta, ts]) => ({
      id: ts.find(t => t.id === sel)?.id ?? ts[0].id,
      lat: ts[0].lat, lng: ts[0].lng, n: ts.length,
      stato: ts.some(t => t.stato === 'offline') ? 'offline' : ts.some(t => t.stato === 'manutenzione') ? 'manutenzione' : 'online',
      label: `${citta}: ${ts.map(t => etichettaTotem(t)).join(', ')}`,
    }))
  }, [righe, sel])

  const totemSel = totem.find(t => t.id === sel) ?? righe[0]
  const ondaSel = totemSel ? inOnda(totemSel) : null
  const prossima = totemSel ? (() => {
    const i = FASCE.findIndex(f => f.id === fascia)
    for (let k = 1; k <= 4; k++) {
      const f = FASCE[(i + k) % 4]
      const tr = trasmissioniDi(trasmissioni, totemSel.id, k + i >= 4 ? giornoT(1) : oggi, f.id)[0]
      if (tr) return { fascia: f, prog: progetti.find(p => p.id === tr.progettoId) }
    }
    return null
  })() : null

  const problemi = totem.filter(t => t.stato !== 'online')
  const ricaviMese = inserzioni.filter(x => x.stato === 'Approvata' && x.al >= oggi.slice(0, 8) + '01').reduce((s, x) => s + x.importo, 0)

  const toggleVendita = (t: Totem) => {
    aggiornaTotem(t.id, { inVendita: !t.inVendita })
    toast.success(t.inVendita ? `${etichettaTotem(t)}: spazi ritirati dalla vendita.` : `${etichettaTotem(t)}: spazi in vendita agli inserzionisti.`, 'Spazi pubblicitari')
  }

  const act = (tip: string, ico: string, onClick: () => void) => (
    <Tooltip text={tip}>
      <button type="button" className="imt__act" aria-label={tip} onClick={onClick}><i className={`fa-solid fa-${ico}`} aria-hidden="true" /></button>
    </Tooltip>
  )

  return (
    <div className="imt">
      <PageHead
        title="I miei totem"
        subtitle="La tua rete di totem in Italia: stato in tempo reale, cosa va in onda e spazi in vendita"
        actions={
          <div className="imt__head-acts">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('totem-editor')}>
              <i className="fa-solid fa-pen-ruler" aria-hidden="true" /> Editor palinsesti
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('gest-advertising')}>
              <i className="fa-solid fa-calendar-plus" aria-hidden="true" /> Pianifica trasmissione
            </button>
          </div>
        }
      />

      {problemi.length > 0 && (
        <div className="imt__alert" role="status">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <span>
            {problemi.map((t, k) => (
              <React.Fragment key={t.id}>
                {k > 0 && ' · '}
                <strong>{etichettaTotem(t)}</strong> ({t.citta}) {t.stato === 'offline' ? `offline, ultimo contatto ${fraFa(t.ultimoPing)}` : 'in manutenzione'}
              </React.Fragment>
            ))}
          </span>
          <button type="button" className="imt__alert-btn" onClick={() => { problemi.filter(t => t.stato === 'offline').forEach(t => riavvia(t.id)); toast.success('Comando di riavvio inviato ai totem offline.', 'Totem') }}>
            <i className="fa-solid fa-power-off" aria-hidden="true" /> Riavvia da remoto
          </button>
        </div>
      )}

      <div className="imt__layout">
        {/* ── Mappa ── */}
        <section className="imt__card imt__map-card">
          <header className="imt__card-head">
            <h2 className="imt__card-title">Rete nazionale</h2>
            {regione && <button type="button" className="imt__link" onClick={() => setRegione('')}>Tutta Italia</button>}
          </header>
          <ItaliaTotem punti={punti} selezionato={sel} regione={regione} onPick={setSel} onRegione={r => setRegione(regioni.includes(r) ? (regione === r ? '' : r) : regione)} />
          <ul className="imt__legend">
            <li><span className="imt__dot imt__dot--online" />Online</li>
            <li><span className="imt__dot imt__dot--manutenzione" />Manutenzione</li>
            <li><span className="imt__dot imt__dot--offline" />Offline</li>
          </ul>
        </section>

        {/* ── Elenco ── */}
        <section className="imt__list">
          <div className="imt__toolbar">
            <div className="imt__search"><SearchField name="cerca-totem" placeholder="Cerca totem o città…" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} /></div>
            <SelectField name="regione" className="imt__field" ariaLabel="Regione" value={regione} onChange={e => setRegione(e.target.value)}
              options={[{ value: '', label: 'Tutte le regioni' }, ...regioni.map(r => ({ value: r, label: r }))]} />
            <SelectField name="stato" className="imt__field" ariaLabel="Stato" value={stato} onChange={e => setStato(e.target.value)}
              options={[{ value: '', label: 'Tutti gli stati' }, ...(['online', 'manutenzione', 'offline'] as StatoTotem[]).map(s => ({ value: s, label: STATO_LBL[s] }))]} />
          </div>
          <div className="sib-table-wrap imt__wrap">
            <table className="sib-table imt__table">
              <colgroup>
                <col className="imt__col-totem" /><col className="imt__col-stato" /><col className="imt__col-onda" />
                <col className="imt__col-vend" /><col className="imt__col-act" />
              </colgroup>
              <thead>
                <tr>
                  <th><ThLabel full="Totem" /></th>
                  <th><ThLabel full="Stato" /></th>
                  <th><ThLabel full="In onda adesso" short="In onda" /></th>
                  <th className="imt__c"><ThLabel full="Spazi in vendita" short="In vendita" /></th>
                  <th className="imt__c"><ThLabel full="Azioni" /></th>
                </tr>
              </thead>
              <tbody>
                {righe.map(t => {
                  const o = inOnda(t)
                  return (
                    <tr key={t.id} className={clsx(sel === t.id && 'imt__row--sel')} onClick={() => setSel(t.id)}>
                      <td>
                        <span className="imt__totem">
                          <span className={`imt__totem-ico imt__totem-ico--${t.stato}`}><i className="fa-solid fa-display" aria-hidden="true" /></span>
                          <span className="imt__totem-txt">
                            <TruncatedText text={etichettaTotem(t)} className="imt__strong" />
                            <TruncatedText text={`${t.indirizzo} · ${t.citta}`} className="imt__sub" />
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`imt__stato imt__stato--${t.stato}`}><span className={`imt__dot imt__dot--${t.stato}`} />{STATO_LBL[t.stato]}</span>
                        <span className="imt__sub">{fraFa(t.ultimoPing)}</span>
                      </td>
                      <td>
                        {!o ? <span className="imt__dash">Schermo spento</span>
                          : o.ins ? <><TruncatedText text={o.ins.inserzionista} className="imt__strong" /><span className="imt__sub imt__sub--gold">Inserzione di terzi</span></>
                          : <><TruncatedText text={o.prog?.nome ?? '—'} className="imt__strong" /><span className="imt__sub">{o.riempimento ? 'Spot di riempimento' : o.nTr > 1 ? `${o.nTr} trasmissioni in rotazione` : 'Trasmissione programmata'}</span></>}
                      </td>
                      <td className="imt__c" onClick={e => e.stopPropagation()}>
                        <span className="imt__toggle"><ToggleSwitch checked={t.inVendita} onChange={() => toggleVendita(t)} /></span>
                      </td>
                      <td className="imt__c" onClick={e => e.stopPropagation()}>
                        <span className="imt__acts">
                          {act('Guarda in anteprima', 'eye', () => setSel(t.id))}
                          {act('Gestisci e configura', 'sliders', () => navigate(`totem-scheda:${t.id}`))}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {righe.length === 0 && <tr><td colSpan={5} className="imt__empty">Nessun totem corrisponde ai filtri.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="imt__foot">
            <span><strong>{totem.filter(t => t.stato === 'online').length}</strong> di {totem.length} totem online</span>
            <span><strong>{totem.filter(t => t.inVendita).length}</strong> con spazi in vendita</span>
            <span>Ricavi da inserzionisti nel mese: <strong>{eurT(ricaviMese)}</strong></span>
          </p>
        </section>

        {/* ── Anteprima del totem selezionato ── */}
        {totemSel && (
          <aside className="imt__preview">
            <TotemFrame spento={totemSel.stato !== 'online'} caption={
              <span className="imt__cap">
                <strong>{etichettaTotem(totemSel)}</strong>
                <span>{totemSel.citta} · {totemSel.modello}</span>
              </span>
            }>
              {ondaSel?.ins ? <CreativitaView c={ondaSel.ins.creativita} /> : <SpotPlayer progetto={ondaSel?.prog} play={totemSel.stato === 'online'} />}
            </TotemFrame>
            <div className="imt__next">
              <span className={clsx('imt__live', totemSel.stato !== 'online' && 'imt__live--off')}>{totemSel.stato === 'online' ? 'LIVE' : 'OFF'}</span>
              <span className="imt__next-txt">
                {prossima ? <>Dopo, in fascia {prossima.fascia.label.toLowerCase()}: <strong>{prossima.prog?.nome}</strong></> : 'Nessun\'altra trasmissione in programma oggi'}
              </span>
            </div>
            <button type="button" className="sib-btn sib-btn--secondary imt__manage" onClick={() => navigate(`totem-scheda:${totemSel.id}`)}>
              <i className="fa-solid fa-sliders" aria-hidden="true" /> Gestisci il totem
            </button>
          </aside>
        )}
      </div>
    </div>
  )
}
