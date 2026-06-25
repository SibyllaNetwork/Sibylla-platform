import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import { getNotifiche, type NotificaDto } from '../../../services/notifiche.service'
import { useChatStore } from '../../../store/useChatStore'
import { useRichiesteOperativeStore } from '../../../store/useRichiesteOperativeStore'
import { usePraticheStore, praticheInRitardo } from '../../../store/usePraticheStore'
import { useEfficienzaStore, deltaEur, deltaPct } from '../../../store/useEfficienzaStore'
import './CentroNotifiche.sass'

interface ExtraBookingInfo {
  bookingId: string
  nazionalita: string
  checkIn: string
  checkOut: string
  stato: string
  camere: number
  persone: number
  tipologia: string
  pernotto: number
  servizi: number
}

interface NotificaUI {
  id: number
  sev: 'error' | 'warning' | 'info'
  title: string
  text: string
  ref: string
  date: string
  time: string
  group: 'oggi' | 'mese-scorso' | 'precedenti'
  read: boolean
  extra?: ExtraBookingInfo
}

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

const FALLBACK: NotificaUI[] = [
  { id:101, sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'MAR 07 APR', time:'14:32', group:'oggi',         read:false },
  { id:102, sev:'info',    title:'Richiesta extra da TO',        text:'Nuova richiesta extra da TO: Tour Operator Test.', ref:'', date:'MAR 31 MAR', time:'12:08', group:'mese-scorso', read:false,
    extra: { bookingId:'0001/015161', nazionalita:'ITA', checkIn:'sab 25/04/2026', checkOut:'lun 27/04/2026', stato:'Opzionata', camere:50, persone:110, tipologia:'Studenti', pernotto:10600, servizi:0 } },
  { id:103, sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'LUN 23 MAR', time:'12:07', group:'mese-scorso', read:true  },
  { id:104, sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'LUN 23 MAR', time:'11:14', group:'mese-scorso', read:true  },
  { id:1,   sev:'error',   title:'Annullamento prenotazione da TO', text:'Il tour-operator Tour Operator Test ha annullato la prenotazione 2026/014505.', ref:'', date:'26 Mar', time:'12:31', group:'precedenti', read:true },
  { id:2,   sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'17 Mar', time:'15:53', group:'precedenti', read:true },
  { id:3,   sev:'info',    title:'Richiesta extra da TO', text:'Nuova richiesta extra da TO: Tour Operator Test.', ref:'', date:'19 Feb', time:'09:15', group:'precedenti', read:true,
    extra: { bookingId:'0001/014474', nazionalita:'GER', checkIn:'ven 19/02/2026', checkOut:'dom 21/02/2026', stato:'Confermata', camere:12, persone:24, tipologia:'Famiglie', pernotto:4200, servizi:350 } },
  { id:4,   sev:'warning', title:'richiesta extra', text:'La prenotazione 2026014463 è passata in Extra a...', ref:'', date:'19 Feb', time:'09:14', group:'precedenti', read:true },
]

const groups = [
  { id:'oggi',        label:'Oggi',        icon:'fa-calendar-day'   },
  { id:'mese-scorso', label:'Mese scorso', icon:'fa-calendar-days'  },
  { id:'precedenti',  label:'Precedenti',  icon:'fa-folder-open'    },
]

const sevLabel: Record<string,string> = { error:'Errore', warning:'Avviso', info:'Info' }

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB']
const MONTHS = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC']

function adaptNotifica(n: NotificaDto): NotificaUI {
  const d = new Date(n.data_notifica)
  const valid = !Number.isNaN(d.getTime())
  const today = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const sameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

  const group: NotificaUI['group'] = !valid
    ? 'precedenti'
    : sameDay(d, today)
    ? 'oggi'
    : sameMonth(d, today) || (today.getMonth() - d.getMonth() + (today.getFullYear() - d.getFullYear()) * 12 === 1)
    ? 'mese-scorso'
    : 'precedenti'

  const sev: NotificaUI['sev'] = (() => {
    if (n.urgente) return 'error'
    if ((n.colore_notifica || '').toLowerCase().includes('red')) return 'error'
    if ((n.colore_notifica || '').toLowerCase().includes('orange')) return 'warning'
    return 'info'
  })()

  return {
    id: n.id_notifica,
    sev,
    title: n.nome || n.tipo_notifica || 'Notifica',
    text: n.descrizione || n.notifica_completa || '',
    ref: n.id_segnalazione ? `ID: ${String(n.id_segnalazione).padStart(6, '0')}` : '',
    date: valid
      ? `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`
      : '',
    time: valid ? d.toTimeString().slice(0, 5) : '',
    group,
    read: n.letta,
  }
}

export default function CentroNotifiche({ navigate }: { navigate: (p: string) => void }) {
  const [tipoFilter,  setTipoFilter]  = useState('Tutte')
  const [search,      setSearch]      = useState('')
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set())
  const [items,       setItems]       = useState<NotificaUI[]>(FALLBACK)
  const [loaded,      setLoaded]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [selectedId,  setSelectedId]  = useState<number | null>(null)

  const selectChatFromNotif = useChatStore(s => s.selectFromNotif)
  const openChat = (notifId: number) => {
    selectChatFromNotif(notifId)
    navigate('chat')
  }

  useEffect(() => {
    let cancelled = false
    getNotifiche()
      .then((data) => {
        if (cancelled) return
        setItems(data.map(adaptNotifica))
        setLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? 'Impossibile caricare le notifiche')
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Richieste operative dei Tour Operator → notifiche "Richiesta operativa da TO".
  const richiesteOp = useRichiesteOperativeStore((s) => s.richieste)
  const richiesteNotifs: NotificaUI[] = useMemo(
    () =>
      richiesteOp.map((r, i) => {
        const d = new Date(r.createdAt)
        const today = new Date()
        const sameDay = d.toDateString() === today.toDateString()
        const sameMonth = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
        const group: NotificaUI['group'] = sameDay ? 'oggi' : sameMonth ? 'mese-scorso' : 'precedenti'
        const extra = r.servizi.length ? ` Extra: ${r.servizi.map((s) => s.label).join(', ')}.` : ''
        return {
          id: 900000 + i,
          sev: 'info',
          title: 'Richiesta operativa da TO',
          text: `${r.nominativo} (booking ${r.bookingId}): ${r.descrizione}${extra}`,
          ref: `Booking ${r.bookingId}`,
          date: `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`,
          time: d.toTimeString().slice(0, 5),
          group,
          read: r.stato === 'eseguita',
        }
      }),
    [richiesteOp],
  )

  // Pratiche in attesa oltre la soglia SLA → notifica di sollecito (se attiva nel Configuratore).
  const pratiche = usePraticheStore((s) => s.pratiche)
  const slaHours = usePraticheStore((s) => s.slaHours)
  const notificaSolleciti = usePraticheStore((s) => s.notificaSolleciti)
  const praticheNotifs: NotificaUI[] = useMemo(() => {
    if (!notificaSolleciti) return []
    const nowMs = Date.now()
    return praticheInRitardo(pratiche, slaHours, nowMs).map((p, i) => ({
      id: 950000 + i,
      sev: 'warning',
      title: 'Sollecito gestione pratica',
      text: `La pratica "${p.destinazione}" è in attesa da oltre ${slaHours}h: accelera la gestione.`,
      ref: `Pratica ${p.destinazione}`,
      date: 'Oggi',
      time: '',
      group: 'oggi',
      read: false,
    }))
  }, [pratiche, slaHours, notificaSolleciti])

  // Ottimizzazioni dalla pagina "Efficienza operativa" → notifica ricavo (€ o %),
  // mostrata solo se il flag è attivo nelle impostazioni del Centro notifiche.
  const ottimizzazioni = useEfficienzaStore((s) => s.ottimizzazioni)
  const notificaEffOn  = useEfficienzaStore((s) => s.notificaOn)
  const modalitaEff    = useEfficienzaStore((s) => s.modalita)
  const efficienzaNotifs: NotificaUI[] = useMemo(() => {
    if (!notificaEffOn) return []
    return ottimizzazioni.map((o, i) => {
      const d = new Date(o.createdAt)
      const today = new Date()
      const sameDay = d.toDateString() === today.toDateString()
      const sameMonth = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
      const group: NotificaUI['group'] = sameDay ? 'oggi' : sameMonth ? 'mese-scorso' : 'precedenti'
      const valore = modalitaEff === 'eur'
        ? `+${fmtEUR(deltaEur(o))}`
        : `+${deltaPct(o).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
      return {
        id: 970000 + i,
        sev: 'info',
        title: 'Ricavo da ottimizzazione',
        text: `Riallocate ${o.camere} camere su ${o.struttura} (${o.destinazione}) da ${o.daStruttura}: ${valore} di ricavo.`,
        ref: o.struttura,
        date: `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`,
        time: d.toTimeString().slice(0, 5),
        group,
        read: false,
      }
    })
  }, [ottimizzazioni, notificaEffOn, modalitaEff])

  const allNotifications = useMemo(
    () => [...efficienzaNotifs, ...praticheNotifs, ...richiesteNotifs, ...items],
    [efficienzaNotifs, praticheNotifs, richiesteNotifs, items],
  )
  const initialReadIds = useMemo(
    () => allNotifications.filter((n) => n.read).map((n) => n.id),
    [allNotifications]
  )
  const [readSet, setReadSet] = useState<Set<number>>(new Set(initialReadIds))

  useEffect(() => {
    setReadSet(new Set(initialReadIds))
  }, [initialReadIds])

  const toggleGroup  = (g: string) => setCollapsed(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n })
  const markRead     = (id: number) => setReadSet(prev => { const n = new Set(prev); n.add(id); return n })
  const markAllRead  = () => setReadSet(new Set(allNotifications.map(n => n.id)))
  const unreadCount  = allNotifications.filter(n => !readSet.has(n.id)).length

  const selectNotif = (id: number) => {
    setSelectedId(id)
    markRead(id)
  }

  const filtered = allNotifications.filter(n => {
    const matchTipo   = tipoFilter === 'Tutte' || sevLabel[n.sev] === tipoFilter
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.text.toLowerCase().includes(search.toLowerCase())
    return matchTipo && matchSearch
  })

  const selectedNotif = selectedId == null ? null : allNotifications.find(n => n.id === selectedId) ?? null

  return (
    <div>
      <BtnBack />

      {/* Header */}
      {error && loaded && (
        <div className="notifiche__error" role="status">
          Backend non raggiungibile — mostrando dati di esempio. ({error})
        </div>
      )}
      <div className="notifiche__top-bar">
        <PageHeader
          title="Centro notifiche"
          subtitle={unreadCount > 0 ? `${unreadCount} notifiche non lette` : 'Tutte le notifiche sono state lette'}
        />
        <div className="notifiche__actions">
          {unreadCount > 0 && (
            <button className="sib-btn sib-btn--secondary" onClick={markAllRead}>
              <i className="fa-light fa-check" aria-hidden="true" /> Segna tutte lette
            </button>
          )}
          <button className="sib-btn sib-btn--primary" onClick={() => navigate('configura-notifiche')}>
            <i className="fa-light fa-gear" aria-hidden="true" />
            Configura notifiche
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="notifiche__filters">
        <SelectField
          name="tipoFilter"
          label="Tipo notifica"
          className="notifiche__filter-select"
          value={tipoFilter}
          onChange={e => setTipoFilter(e.target.value)}
          options={['Tutte','Errore','Avviso','Info'].map(o => ({ value: o, label: o }))}
        />
        <div className="notifiche__filter-search">
          <span className="notifiche__filter-label">Cerca</span>
          <div className="notifiche__search-wrap">
            <i className="fa-light fa-magnifying-glass notifiche__search-icon" aria-hidden="true" />
            <input className="sib-search-input notifiche__search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca notifica..." />
            {search && (
              <button className="notifiche__search-clear" onClick={() => setSearch('')} aria-label="Pulisci ricerca">
                <i className="fa-light fa-xmark" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <div className="notifiche__filter-count">
          <span className="notifiche__count">{filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'}</span>
        </div>
      </div>

      {/* Split layout: list (left) | detail (right) */}
      <div className="notifiche__split">
        <section className="notifiche__list-col" aria-label="Elenco notifiche">
          <div className="notifiche__groups">
            {groups.map(group => {
              const groupItems  = filtered.filter(n => n.group === group.id)
              if (groupItems.length === 0) return null
              const isCollapsed = collapsed.has(group.id)
              const groupUnread = groupItems.filter(n => !readSet.has(n.id)).length

              return (
                <div key={group.id} className="notifiche__group">
                  <div
                    className={`notifiche__group-header ${isCollapsed ? 'notifiche__group-header--collapsed' : 'notifiche__group-header--expanded'}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="notifiche__group-left">
                      <span className="notifiche__group-icon">
                        <i className={`fa-light ${group.icon}`} aria-hidden="true" />
                      </span>
                      <span className="notifiche__group-label">{group.label}</span>
                      {groupUnread > 0 && <span className="notifiche__group-badge">{groupUnread}</span>}
                    </div>
                    <div className={`notifiche__group-chevron ${isCollapsed ? 'notifiche__group-chevron--collapsed' : ''}`}>
                      <i className="fa-light fa-chevron-down" aria-hidden="true" />
                    </div>
                  </div>

                  {!isCollapsed && groupItems.map((n) => {
                    const isRead     = readSet.has(n.id)
                    const isSelected = selectedId === n.id
                    return (
                      <div
                        key={n.id}
                        className={
                          'notifiche__row'
                          + (!isRead ? ' notifiche__row--unread' : '')
                          + (isSelected ? ' notifiche__row--selected' : '')
                        }
                        onClick={() => selectNotif(n.id)}
                      >
                        <div className="notifiche__row-icon" data-sev={n.sev}>
                          <i className="fa-light fa-bell" aria-hidden="true" />
                        </div>
                        <div className="notifiche__row-content">
                          <div className="notifiche__row-top">
                            <div className="notifiche__row-title-wrap">
                              {!isRead && <div className="notifiche__unread-dot" />}
                              <span className={`notifiche__row-title ${!isRead ? 'notifiche__row-title--unread' : ''}`}>{n.title}</span>
                              <span className="notifiche__sev-badge" data-sev={n.sev}>
                                {sevLabel[n.sev]}
                              </span>
                            </div>
                            <div className="notifiche__row-meta">
                              <div className="notifiche__date-main">{n.date}</div>
                              <div className="notifiche__date-time">{n.time}</div>
                            </div>
                          </div>
                          {n.ref  && <div className="notifiche__row-ref">{n.ref}</div>}
                          {n.text && <p className="notifiche__row-text">{n.text}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="notifiche__empty">
                <i className="fa-light fa-bell notifiche__empty-icon" aria-hidden="true" />
                <p className="notifiche__empty-text">Nessuna notifica trovata</p>
              </div>
            )}
          </div>
        </section>

        <aside className="notifiche__detail-col" aria-label="Dettaglio notifica">
          {selectedNotif ? (
            <article className="notifiche__detail-panel" key={selectedNotif.id}>
              <header className="notifiche__detail-head">
                <div className="notifiche__detail-title-wrap">
                  <h3 className="notifiche__detail-title">{selectedNotif.title}</h3>
                  <span className="notifiche__sev-badge" data-sev={selectedNotif.sev}>
                    {sevLabel[selectedNotif.sev]}
                  </span>
                </div>
                <Tooltip text="Chiudi dettaglio">
                  <button
                    type="button"
                    className="notifiche__detail-close"
                    onClick={() => setSelectedId(null)}
                    aria-label="Chiudi dettaglio"
                  >
                    <i className="fa-light fa-xmark" aria-hidden="true" />
                  </button>
                </Tooltip>
              </header>

              {selectedNotif.text && (
                <p className="notifiche__detail-lead">{selectedNotif.text}</p>
              )}

              {selectedNotif.extra ? (
                <>
                  <dl className="notifiche__detail-list">
                    <div className="notifiche__detail-list-row">
                      <dt>ID</dt>
                      <dd>{selectedNotif.extra.bookingId}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Nazionalità</dt>
                      <dd>{selectedNotif.extra.nazionalita}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Check-in</dt>
                      <dd>{selectedNotif.extra.checkIn}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Check-out</dt>
                      <dd>{selectedNotif.extra.checkOut}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Stato</dt>
                      <dd>{selectedNotif.extra.stato}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Camere</dt>
                      <dd>{selectedNotif.extra.camere}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Persone</dt>
                      <dd>{selectedNotif.extra.persone}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Tipologia</dt>
                      <dd>{selectedNotif.extra.tipologia}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Pernott.</dt>
                      <dd>{fmtEUR(selectedNotif.extra.pernotto)}</dd>
                    </div>
                    <div className="notifiche__detail-list-row">
                      <dt>Servizi</dt>
                      <dd>{fmtEUR(selectedNotif.extra.servizi)}</dd>
                    </div>
                    <div className="notifiche__detail-list-row notifiche__detail-list-row--total">
                      <dt>Totale</dt>
                      <dd>{fmtEUR(selectedNotif.extra.pernotto + selectedNotif.extra.servizi)}</dd>
                    </div>
                  </dl>

                  <div className="notifiche__detail-actions">
                    <button
                      type="button"
                      className="sib-btn sib-btn--primary"
                      onClick={() => { /* TODO: hook to gestione prenotazione extra */ }}
                    >
                      Gestione della prenotazione extra
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <dl className="notifiche__detail-grid">
                    <div className="notifiche__detail-item">
                      <dt>ID notifica</dt>
                      <dd>#{selectedNotif.id}</dd>
                    </div>
                    <div className="notifiche__detail-item">
                      <dt>Tipologia</dt>
                      <dd>{sevLabel[selectedNotif.sev]}</dd>
                    </div>
                    <div className="notifiche__detail-item">
                      <dt>Ricevuta il</dt>
                      <dd>{selectedNotif.date}{selectedNotif.time ? ` · ${selectedNotif.time}` : ''}</dd>
                    </div>
                    <div className="notifiche__detail-item">
                      <dt>Stato</dt>
                      <dd>{readSet.has(selectedNotif.id) ? 'Letta' : 'Non letta'}</dd>
                    </div>
                    {selectedNotif.ref && (
                      <div className="notifiche__detail-item notifiche__detail-item--wide">
                        <dt>Riferimento</dt>
                        <dd>{selectedNotif.ref}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="notifiche__detail-actions">
                    <button
                      type="button"
                      className="sib-btn sib-btn--secondary"
                      onClick={() => openChat(selectedNotif.id)}
                    >
                      <i className="fa-light fa-comments" aria-hidden="true" /> Apri chat
                    </button>
                  </div>
                </>
              )}
            </article>
          ) : (
            <div className="notifiche__detail-empty">
              <i className="fa-light fa-envelope-open notifiche__detail-empty-icon" aria-hidden="true" />
              <p className="notifiche__detail-empty-text">
                Seleziona una notifica per visualizzarne il dettaglio
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
