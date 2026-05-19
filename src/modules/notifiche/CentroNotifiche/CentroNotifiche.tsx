import React, { useEffect, useMemo, useState } from 'react'
import T from '../../../core/tokens'
import Ico from '../../../core/icons/Ico'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { getNotifiche, type NotificaDto } from '../../../services/notifiche.service'
import './CentroNotifiche.sass'

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
}

const FALLBACK: NotificaUI[] = [
  { id:101, sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'MAR 07 APR', time:'14:32', group:'oggi',         read:false },
  { id:102, sev:'info',    title:'Richiesta extra da TO',        text:'Nuova richiesta extra da TO: Sibylla.', ref:'', date:'MAR 31 MAR', time:'12:08', group:'mese-scorso', read:false },
  { id:103, sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'LUN 23 MAR', time:'12:07', group:'mese-scorso', read:true  },
  { id:104, sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'LUN 23 MAR', time:'11:14', group:'mese-scorso', read:true  },
  { id:1,   sev:'error',   title:'Annullamento prenotazione da TO', text:'Il tour-operator Tour Operator Test ha annullato la prenotazione 2026/014505.', ref:'', date:'26 Mar', time:'12:31', group:'precedenti', read:true },
  { id:2,   sev:'warning', title:'Segnalazione presa in carico', text:'', ref:'', date:'17 Mar', time:'15:53', group:'precedenti', read:true },
  { id:3,   sev:'info',    title:'Richiesta extra da TO', text:'Nuova richiesta extra da TO: Tour Operator Test.', ref:'ID: 014474', date:'19 Feb', time:'09:15', group:'precedenti', read:true },
  { id:4,   sev:'warning', title:'richiesta extra', text:'La prenotazione 2026014463 è passata in Extra a...', ref:'', date:'19 Feb', time:'09:14', group:'precedenti', read:true },
]

const groups = [
  { id:'oggi',        label:'Oggi',        icon:'📅' },
  { id:'mese-scorso', label:'Mese scorso', icon:'🗓' },
  { id:'precedenti',  label:'Precedenti',  icon:'📁' },
]

const sevLabel: Record<string,string> = { error:'Errore', warning:'Avviso', info:'Info' }
const sevColor: Record<string,string> = { error:T.error, warning:'#E07B39', info:T.primary }
const sevBg:    Record<string,string> = { error:'#FFF0F0', warning:'#FFF6EE', info:T.blueLight }

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
  const [tipoFilter, setTipoFilter] = useState('Tutte')
  const [search,     setSearch]     = useState('')
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set())
  const [items,      setItems]      = useState<NotificaUI[]>(FALLBACK)
  const [loaded,     setLoaded]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

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

  const allNotifications = items
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

  const filtered = allNotifications.filter(n => {
    const matchTipo   = tipoFilter === 'Tutte' || sevLabel[n.sev] === tipoFilter
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.text.toLowerCase().includes(search.toLowerCase())
    return matchTipo && matchSearch
  })

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />

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
              <Ico n="check" s={13} c="currentColor" /> Segna tutte lette
            </button>
          )}
          <button className="notifiche__configure-btn" onClick={() => navigate('configura-notifiche')}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
            </svg>
            Configura notifiche
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="notifiche__filters">
        <div>
          <span className="text-[11px] font-semibold font-opensans text-ink block mb-1">Tipo notifica</span>
          <select className="sib-select w-[130px]" value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}>
            {['Tutte','Errore','Avviso','Info'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <span className="text-[11px] font-semibold font-opensans text-ink block mb-1">Ricerca</span>
          <div className="notifiche__search-wrap">
            <Ico n="search" s={13} c={T.textDisabled} />
            <input className="sib-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca notifica..." />
            {search && <button className="notifiche__search-clear" onClick={() => setSearch('')}><Ico n="x" s={12} c={T.textDisabled} /></button>}
          </div>
        </div>
        <div style={{ alignSelf: 'flex-end', height: 34, display: 'flex', alignItems: 'center' }}>
          <span className="notifiche__count">{filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'}</span>
        </div>
      </div>

      {/* Groups */}
      <div className="notifiche__groups">
        {groups.map(group => {
          const items       = filtered.filter(n => n.group === group.id)
          if (items.length === 0) return null
          const isCollapsed  = collapsed.has(group.id)
          const groupUnread  = items.filter(n => !readSet.has(n.id)).length

          return (
            <div key={group.id} className="notifiche__group">
              <div
                className={`notifiche__group-header ${isCollapsed ? 'notifiche__group-header--collapsed' : 'notifiche__group-header--expanded'}`}
                onClick={() => toggleGroup(group.id)}
              >
                <div className="notifiche__group-left">
                  <span className="notifiche__group-icon">{group.icon}</span>
                  <span className="notifiche__group-label">{group.label}</span>
                  {groupUnread > 0 && <span className="notifiche__group-badge">{groupUnread}</span>}
                </div>
                <div className={`notifiche__group-chevron ${isCollapsed ? 'notifiche__group-chevron--collapsed' : ''}`}>
                  <Ico n="chevd" s={13} c={T.textDisabled} />
                </div>
              </div>

              {!isCollapsed && items.map((n, i) => {
                const isRead = readSet.has(n.id)
                const c  = sevColor[n.sev]
                const bg = sevBg[n.sev]
                return (
                  <div
                    key={n.id}
                    className={`notifiche__row ${!isRead ? 'notifiche__row--unread' : ''}`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="notifiche__row-icon" style={{ background: bg, border: `1px solid ${c}22` }}>
                      <Ico n="bell" s={17} c={c} />
                    </div>
                    <div className="notifiche__row-content">
                      <div className="notifiche__row-top">
                        <div className="notifiche__row-title-wrap">
                          {!isRead && <div className="notifiche__unread-dot" />}
                          <span className={`notifiche__row-title ${!isRead ? 'notifiche__row-title--unread' : ''}`}>{n.title}</span>
                          <span className="notifiche__sev-badge" style={{ color: c, background: bg, border: `1px solid ${c}33` }}>
                            {sevLabel[n.sev]}
                          </span>
                        </div>
                        <div className="notifiche__row-date">
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
            <Ico n="bell" s={32} c={T.textDisabled} />
            <p className="notifiche__empty-text">Nessuna notifica trovata</p>
          </div>
        )}
      </div>
    </div>
  )
}
