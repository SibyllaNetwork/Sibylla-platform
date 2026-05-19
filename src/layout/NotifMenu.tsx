import React, { useState, useRef, useEffect } from 'react'
import T from '../core/tokens'
import Ico from '../core/icons/Ico'
import './notif.sass'

// ── Tipi ─────────────────────────────────────────────────────────────────────
type Sev = 'error' | 'warning' | 'info'

interface Notif {
  id:    number
  sev:   Sev
  title: string
  text:  string
  ref:   string
  date:  string
  read:  boolean
}

// ── Dati mock ─────────────────────────────────────────────────────────────────
const INIT_DATA: Notif[] = [
  { id:101, sev:'warning', title:'Segnalazione presa in carico',       text:'',                                                              ref:'',           date:'Oggi 14:32',  read:false },
  { id:102, sev:'info',    title:'Richiesta extra da TO',              text:'Nuova richiesta extra da TO: Sibylla.',                         ref:'',           date:'Oggi 12:08',  read:false },
  { id:1,   sev:'error',   title:'Annullamento prenotazione da TO',    text:'Il tour-operator Tour Operator Test ha annullato la prenotazione 2026/014505.', ref:'', date:'26 Mar 12:31', read:true },
  { id:2,   sev:'warning', title:'Segnalazione presa in carico',       text:'',                                                              ref:'',           date:'17 Mar 15:53', read:true },
  { id:3,   sev:'info',    title:'Richiesta extra da TO',              text:'Nuova richiesta extra da TO: Tour Operator Test.',              ref:'ID: 014474', date:'19 Feb 09:15', read:true },
  { id:4,   sev:'warning', title:'Richiesta extra',                    text:'La prenotazione 2026014463 è passata in Extra a...',            ref:'',           date:'19 Feb 09:14', read:true },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEV_CONFIG: Record<Sev, { bg: string; color: string; label: string }> = {
  error:   { bg: '#FFF0F0', color: T.error,    label: 'Errore'  },
  warning: { bg: '#FFF6EE', color: '#E07B39',  label: 'Avviso'  },
  info:    { bg: T.blueLight, color: T.blue,   label: 'Info'    },
}

type TabFilter = 'all' | 'unread' | 'error' | 'warning' | 'info'

export default function NotifMenu({ navigate }: { navigate: (p: string) => void }) {
  const [open,    setOpen]    = useState(false)
  const [tab,     setTab]     = useState<TabFilter>('all')
  const [notifs,  setNotifs]  = useState<Notif[]>(INIT_DATA)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifs.filter(n => !n.read).length

  // Chiudi cliccando fuori
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const markRead    = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const filtered = notifs.filter(n => {
    if (tab === 'unread')  return !n.read
    if (tab === 'error')   return n.sev === 'error'
    if (tab === 'warning') return n.sev === 'warning'
    if (tab === 'info')    return n.sev === 'info'
    return true
  })

  const TABS: { id: TabFilter; label: string }[] = [
    { id: 'all',     label: 'Tutte' },
    { id: 'unread',  label: `Non lette${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'error',   label: 'Errori' },
    { id: 'warning', label: 'Avvisi' },
    { id: 'info',    label: 'Info' },
  ]

  return (
    <div ref={ref} className="notif-trigger">

      {/* ── Bottone campanella ── */}
      <button
        className={`notif-trigger__btn ${open ? 'notif-trigger__btn--active' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <Ico n="bell" s={19} c="rgba(255,255,255,0.85)" />
      </button>

      {/* Badge contatore — posizionato sotto l'icona, non sopra */}
      {unreadCount > 0 && (
        <span className="notif-trigger__badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* ── Dropdown ── */}
      {open && (
        <div className="notif-panel">

          {/* Header */}
          <div className="notif-header">
            <div className="notif-header__left">
              <h3 className="notif-header__title">Notifiche</h3>
              {unreadCount > 0 && (
                <span className="notif-header__unread">{unreadCount} nuove</span>
              )}
            </div>
            <div className="notif-header__actions">
              {unreadCount > 0 && (
                <button className="notif-header__mark-btn" onClick={markAllRead}>
                  Segna tutte lette
                </button>
              )}
              <button className="notif-header__close" onClick={() => setOpen(false)}>
                <Ico n="x" s={15} c={T.textDisabled} />
              </button>
            </div>
          </div>

          {/* Tabs filtro */}
          <div className="notif-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`notif-tabs__tab ${tab === t.id ? 'notif-tabs__tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="notif-list">
            {filtered.length === 0 ? (
              <div className="notif-empty">
                <Ico n="bell" s={28} c={T.textDisabled} />
                <p className="notif-empty__text">Nessuna notifica</p>
              </div>
            ) : filtered.map(n => {
              const cfg = SEV_CONFIG[n.sev]
              return (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  {!n.read && <div className="notif-item__dot" />}
                  <div
                    className="notif-item__icon-wrap"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}
                  >
                    <Ico n="bell" s={16} c={cfg.color} />
                  </div>
                  <div className="notif-item__body">
                    <div className="notif-item__top">
                      <span className={`notif-item__title notif-item__title--${n.sev}`}>
                        {n.title}
                      </span>
                      <span className="notif-item__date">{n.date}</span>
                    </div>
                    {n.ref && <div className="notif-item__ref">{n.ref}</div>}
                    {n.text && <p className="notif-item__text">{n.text}</p>}
                    <span
                      className="notif-item__sev-badge"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="notif-footer">
            <button
              className="notif-footer__btn"
              onClick={() => { setOpen(false); navigate('centro-notifiche') }}
            >
              Vai al centro notifiche →
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
