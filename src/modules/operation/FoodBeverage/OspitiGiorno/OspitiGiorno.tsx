// ─── Ospiti del giorno ────────────────────────────────────────────────────────
//  La giornata vista dal servizio: chi è atteso, a che ora, a quale tavolo, e a
//  che punto è (atteso → arrivato → accomodato). Da qui si allocano i tavoli —
//  uno per uno o in automatico — e si accomoda l'ospite, che significa aprire il
//  tavolo in sala e la sua comanda.
//
//  Il Libro prenotazioni è la pianificazione; questa è la lista di lavoro.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import { SelectField, SearchField, DatePickerField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, OUTLETS, SALE, TURNI } from '../../../../store/useFbStore'
import { CAMERIERI, STATO_PRENOTAZIONE, type Prenotazione, type StatoPrenotazione } from '../fb.model'
import './OspitiGiorno.sass'

const ORIGINE_ICO: Record<string, string> = {
  telefono: 'fa-phone', web: 'fa-globe', reception: 'fa-bell-concierge',
  'walk-in': 'fa-person-walking', 'tour-operator': 'fa-suitcase-rolling',
}

export default function OspitiGiorno({ navigate }: { navigate?: (p: string) => void }) {
  const contesto     = useFbStore(s => s.contesto)
  const setContesto  = useFbStore(s => s.setContesto)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const tavoli       = useFbStore(s => s.tavoli)
  const comande      = useFbStore(s => s.comande)
  const aggiorna     = useFbStore(s => s.aggiornaPrenotazione)
  const assegnaTavolo = useFbStore(s => s.assegnaTavolo)
  const apriTavolo   = useFbStore(s => s.apriTavolo)
  const confirm      = useConfirmStore(s => s.confirm)

  const { outletId, salaId, turnoId, data } = contesto
  const [cerca, setCerca]   = useState('')
  const [filtroTurno, setFiltroTurno] = useState<number | 'tutti'>('tutti')
  const [filtroSala, setFiltroSala]   = useState<number | 'tutte'>('tutte')
  const [soloDaFare, setSoloDaFare]   = useState(false)

  const saleOutlet  = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId])

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return prenotazioni
      .filter(p => p.data === data && p.outletId === outletId && p.stato !== 'annullata')
      .filter(p => filtroSala === 'tutte' || p.salaId === filtroSala)
      .filter(p => filtroTurno === 'tutti' || p.turnoId === filtroTurno)
      .filter(p => !soloDaFare || p.stato !== 'arrivata')
      .filter(p => !q || p.ospite.toLowerCase().includes(q) || p.telefono.includes(q) || p.camera.includes(q))
      .sort((a, b) => a.ora.localeCompare(b.ora))
  }, [prenotazioni, data, outletId, filtroSala, filtroTurno, soloDaFare, cerca])

  const pax       = righe.reduce((a, p) => a + p.pax, 0)
  const assegnate = righe.filter(p => p.tavoloId).length
  const arrivate  = righe.filter(p => p.stato === 'arrivata').length

  const tavoloDi = (p: Prenotazione) => p.tavoloId ? tavoli.find(t => t.id === p.tavoloId) : undefined
  const tavoliDiSala = (sid: number | null) => tavoli.filter(t => t.salaId === (sid ?? salaId))

  // ── Allocazione automatica ────────────────────────────────────────────────
  //  A ogni prenotazione senza tavolo va il tavolo libero più piccolo che la
  //  contiene: si riempie la sala senza sprecare i tavoli grandi.
  const allocaTutti = () => {
    const occupati = new Set(prenotazioni.filter(p => p.data === data && p.tavoloId).map(p => p.tavoloId))
    let fatti = 0
    righe.filter(p => !p.tavoloId).forEach(p => {
      const libero = tavoliDiSala(p.salaId)
        .filter(t => !occupati.has(t.id) && t.stato !== 'bloccato' && t.capienza >= p.pax)
        .sort((a, b) => a.capienza - b.capienza)[0]
      if (!libero) return
      occupati.add(libero.id)
      assegnaTavolo(p.id, libero.id)
      fatti++
    })
    toast[fatti ? 'success' : 'warning'](
      fatti ? `${fatti} ${fatti === 1 ? 'tavolo assegnato' : 'tavoli assegnati'}` : 'Nessun tavolo libero della capienza giusta',
    )
  }

  const resetAllocazione = async () => {
    const ok = await confirm({
      message: 'Togliere l’assegnazione dei tavoli a tutte le prenotazioni della giornata?',
      confirmLabel: 'Azzera',
    })
    if (!ok) return
    righe.filter(p => p.tavoloId).forEach(p => assegnaTavolo(p.id, null))
    toast.info('Allocazione azzerata')
  }

  /** Accomoda l'ospite: apre il tavolo in sala con la sua comanda. */
  const accomoda = (p: Prenotazione) => {
    const t = tavoloDi(p)
    if (!t) { toast.warning('Assegna prima un tavolo'); return }
    apriTavolo(t.id, p.pax, CAMERIERI[0], p.turnoId, p.categoriaClienteId ?? 0)
    aggiorna(p.id, { stato: 'arrivata' })
    setContesto({ tavoloId: t.id, salaId: t.salaId, turnoId: p.turnoId ?? turnoId })
    toast.success(`${p.ospite} accomodato al tavolo ${t.numero}`)
  }

  return (
    <div className="fbosp">
      <PageHead
        title="Ospiti del giorno"
        subtitle="Chi è atteso, a che tavolo e a che punto è l'accoglienza"
        actions={
          <div className="fbosp__head-acts">
            <Tooltip text="Assegna un tavolo a tutte le prenotazioni scoperte">
              <button type="button" className="fbosp__head-btn" onClick={allocaTutti}>
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Alloca tavoli
              </button>
            </Tooltip>
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel" onClick={() => toast.info('Elenco esportato in Excel')}>
              <Tooltip text="Esporta in Excel"><i className="fa-regular fa-file-xls" /></Tooltip>
            </button>
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Stampa la lista" onClick={() => window.print()}>
              <Tooltip text="Stampa la lista"><i className="fa-regular fa-file-pdf" /></Tooltip>
            </button>
          </div>
        }
      />

      <FilterToolbar className="fbosp__bar">
        <SelectField
          name="outlet" label="Outlet" className="fbosp__f fbosp__f--lg"
          value={outletId}
          options={OUTLETS.map(o => ({ value: o.id, label: o.nome }))}
          onChange={e => {
            const id = +e.target.value
            setContesto({ outletId: id, salaId: SALE.find(s => s.outletId === id)?.id ?? salaId })
            setFiltroSala('tutte'); setFiltroTurno('tutti')
          }}
        />
        <DatePickerField
          name="data" label="Giorno" className="fbosp__f"
          value={data} onChange={e => setContesto({ data: e.target.value })}
        />
        <SelectField
          name="sala" label="Sala" className="fbosp__f"
          value={filtroSala}
          options={[{ value: 'tutte', label: 'Tutte' }, ...saleOutlet.map(s => ({ value: s.id, label: s.nome }))]}
          onChange={e => setFiltroSala(e.target.value === 'tutte' ? 'tutte' : +e.target.value)}
        />
        <SelectField
          name="turno" label="Turno" className="fbosp__f fbosp__f--lg"
          value={filtroTurno}
          options={[{ value: 'tutti', label: 'Tutti' }, ...turniOutlet.map(t => ({ value: t.id, label: `${t.servizio} · ${t.nome} ${t.oraInizio}` }))]}
          onChange={e => setFiltroTurno(e.target.value === 'tutti' ? 'tutti' : +e.target.value)}
        />
        <div className="fbosp__f fbosp__f--lg fbosp__cerca">
          <span className="fbosp__cerca-lab">Cerca ospite</span>
          <SearchField
            name="cerca" value={cerca} placeholder="Nome, telefono o camera…"
            onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')}
          />
        </div>
        <label className="fbosp__only">
          <input type="checkbox" className="sib-checkbox" checked={soloDaFare} onChange={e => setSoloDaFare(e.target.checked)} />
          Solo da accogliere
        </label>
      </FilterToolbar>

      <div className="fbosp__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table fbosp__table">
            <colgroup>
              <col className="fbosp__c-ora" /><col className="fbosp__c-osp" />
              <col className="fbosp__c-pax" /><col className="fbosp__c-sala" />
              <col className="fbosp__c-tav" /><col className="fbosp__c-turno" />
              <col className="fbosp__c-note" /><col className="fbosp__c-stato" />
              <col className="fbosp__c-act" />
            </colgroup>
            <thead>
              <tr>
                <th>Ora</th>
                <th>Ospite</th>
                <th>Pax</th>
                <th>Sala</th>
                <th>Tavolo</th>
                <th>Turno</th>
                <th>Note</th>
                <th>Stato</th>
                <th className="fbosp__c-act" aria-label="Azioni" />
              </tr>
            </thead>
            <tbody>
              {righe.map(p => {
                const t = tavoloDi(p)
                const turno = TURNI.find(x => x.id === p.turnoId)
                const sala = SALE.find(x => x.id === p.salaId)
                const comanda = t ? comande.find(c => c.tavoloId === t.id && c.stato === 'aperta') : undefined
                return (
                  <tr key={p.id} className={p.stato === 'arrivata' ? 'is-done' : ''}>
                    <td className="fbosp__ora">{p.ora}</td>
                    <td>
                      <span className="fbosp__osp">
                        <Tooltip text={`Prenotazione da ${p.origine}`}>
                          <i className={`fa-solid ${ORIGINE_ICO[p.origine]} fbosp__org`} aria-hidden="true" />
                        </Tooltip>
                        <TruncatedText text={p.ospite} />
                        {!!p.camera && <span className="fbosp__camera">cam. {p.camera}</span>}
                      </span>
                    </td>
                    <td className="fbosp__pax">{p.pax}</td>
                    <td><TruncatedText text={sala?.nome ?? '—'} /></td>
                    <td>
                      <select
                        className="sib-input fbosp__sel"
                        value={p.tavoloId ?? ''}
                        aria-label={`Tavolo per ${p.ospite}`}
                        onChange={e => assegnaTavolo(p.id, e.target.value ? +e.target.value : null)}
                      >
                        <option value="">da assegnare</option>
                        {tavoliDiSala(p.salaId).map(tv => (
                          <option key={tv.id} value={tv.id} disabled={tv.capienza < p.pax && tv.id !== p.tavoloId}>
                            {tv.numero} · {tv.capienza}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td><TruncatedText text={turno ? `${turno.servizio} · ${turno.nome}` : '—'} /></td>
                    <td><TruncatedText text={p.note || '—'} /></td>
                    <td>
                      <span className="fbosp__stato" data-stato={p.stato}>
                        {STATO_PRENOTAZIONE[p.stato].label}
                      </span>
                    </td>
                    <td className="fbosp__act">
                      {p.stato !== 'arrivata' ? (
                        <>
                          <button type="button" aria-label="Accomoda l’ospite" onClick={() => accomoda(p)}>
                            <Tooltip text="Accomoda: apre il tavolo e la comanda"><i className="fa-solid fa-chair" /></Tooltip>
                          </button>
                          <button
                            type="button" aria-label="Segna come no show"
                            onClick={() => { aggiorna(p.id, { stato: 'no-show' as StatoPrenotazione }); toast.info(`${p.ospite} segnato come no show`) }}
                          >
                            <Tooltip text="No show"><i className="fa-solid fa-user-slash" /></Tooltip>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button" aria-label="Vai alla comanda"
                          disabled={!comanda}
                          onClick={() => { if (t) { setContesto({ tavoloId: t.id, salaId: t.salaId }); navigate?.('gest-comanda') } }}
                        >
                          <Tooltip text="Vai alla comanda"><i className="fa-solid fa-receipt" /></Tooltip>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!righe.length && (
                <tr>
                  <td colSpan={9} className="fbosp__vuoto">Nessun ospite atteso con questi filtri.</td>
                </tr>
              )}
            </tbody>
            {!!righe.length && (
              <tfoot>
                <tr className="fbosp__tot">
                  <td>{righe.length}</td>
                  <td>Totale ospiti attesi</td>
                  <td className="fbosp__pax">{pax}</td>
                  <td colSpan={4}>
                    {assegnate}/{righe.length} con tavolo · {arrivate}/{righe.length} accomodati
                  </td>
                  <td colSpan={2} className="fbosp__tot-act">
                    <button type="button" onClick={resetAllocazione}>
                      <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Azzera allocazione
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
