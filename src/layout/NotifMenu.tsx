import React, { useState, useRef, useEffect } from 'react'
import T from '../core/tokens'
import Ico from '../core/icons/Ico'
import { useChatStore } from '../store/useChatStore'
import { useNotifPrefsStore } from '../store/useNotifPrefsStore'
import './notif.sass'

// ── Tipi ─────────────────────────────────────────────────────────────────────
type Sev    = 'error' | 'warning' | 'info'
type Origin = 'platform' | 'tableau' | 'agora'

interface Notif {
  id:     number
  sev:    Sev
  origin: Origin
  title:  string
  text:   string
  ref:    string
  date:   string
  read:   boolean
  // Pagina report da aprire con il pulsante "Visualizza report" (se presente).
  reportPage?: string
}

// ── Dati mock ─────────────────────────────────────────────────────────────────
const INIT_DATA: Notif[] = [
  { id:100, sev:'info',    origin:'platform', title:'Report Pickup disponibile',           text:'Il report Pickup settimanale è pronto da consultare.',                          ref:'',           date:'Oggi 15:10',  read:false, reportPage:'report-pickup' },
  { id:101, sev:'warning', origin:'platform', title:'Segnalazione presa in carico',         text:'',                                                                              ref:'',           date:'Oggi 14:32',  read:false },
  { id:102, sev:'info',    origin:'tableau',  title:'Richiesta extra da Tableau',           text:'Nuova richiesta extra da Tableau: Sibylla.',                                    ref:'',           date:'Oggi 12:08',  read:false },
  { id:103, sev:'info',    origin:'agora',    title:'Nuova prenotazione da Agora',          text:'Ricevuta prenotazione 2026/014510 dal canale Agora.',                           ref:'ID: 014510', date:'Oggi 11:42',  read:false },
  { id:1,   sev:'error',   origin:'tableau',  title:'Annullamento prenotazione da Tableau', text:'Il tour-operator Tour Operator Test ha annullato la prenotazione 2026/014505.', ref:'',           date:'26 Mar 12:31', read:true },
  { id:2,   sev:'warning', origin:'platform', title:'Segnalazione presa in carico',         text:'',                                                                              ref:'',           date:'17 Mar 15:53', read:true },
  { id:3,   sev:'info',    origin:'tableau',  title:'Richiesta extra da Tableau',           text:'Nuova richiesta extra da Tableau: Tour Operator Test.',                         ref:'ID: 014474', date:'19 Feb 09:15', read:true },
  { id:4,   sev:'warning', origin:'tableau',  title:'Richiesta extra',                      text:'La prenotazione 2026014463 è passata in Extra a...',                            ref:'',           date:'19 Feb 09:14', read:true },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
// Il colore primario della notifica (icona, badge, accenti) deriva dall'origine
// della richiesta: Platform → blu, Tableau → verde, Agora → grigio ardesia (#708090).
const ORIGIN_CONFIG: Record<Origin, { bg: string; color: string; label: string }> = {
  platform: { bg: '#E8EEF4', color: '#204769', label: 'Platform' },
  tableau:  { bg: '#E6F2EC', color: '#206953', label: 'Tableau'  },
  agora:    { bg: '#EEF1F3', color: '#708090', label: 'Agora'    },
}

const SEV_LABEL: Record<Sev, string> = {
  error:   'Errore',
  warning: 'Avviso',
  info:    'Info',
}

type TabFilter = 'all' | 'unread' | 'platform' | 'tableau' | 'agora'

export default function NotifMenu({ navigate }: { navigate: (p: string) => void }) {
  const [open,    setOpen]    = useState(false)
  const [tab,     setTab]     = useState<TabFilter>('all')
  const [notifs,  setNotifs]  = useState<Notif[]>(INIT_DATA)
  const ref = useRef<HTMLDivElement>(null)
  const selectChatFromNotif = useChatStore(s => s.selectFromNotif)
  // Le notifiche-report compaiono solo se l'opzione è attiva nel Configuratore notifiche.
  const reportPickupOn = useNotifPrefsStore(s => s.reportPickup)

  // Escludi le notifiche-report disabilitate dal configuratore.
  const visibili = notifs.filter(n => !n.reportPage || (n.reportPage === 'report-pickup' && reportPickupOn))

  const unreadCount = visibili.filter(n => !n.read).length

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

  const filtered = visibili.filter(n => {
    if (tab === 'unread')   return !n.read
    if (tab === 'platform') return n.origin === 'platform'
    if (tab === 'tableau')  return n.origin === 'tableau'
    if (tab === 'agora')    return n.origin === 'agora'
    return true
  })

  const TABS: { id: TabFilter; label: string }[] = [
    { id: 'all',    label: 'Tutte' },
    { id: 'unread', label: `Non lette${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
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
              const cfg = ORIGIN_CONFIG[n.origin]
              return (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  {!n.read && (
                    <div className="notif-item__dot" style={{ background: cfg.color }} />
                  )}
                  <div className="notif-item__icon-wrap">
                    <Ico n="bell" s={24} c={cfg.color} />
                  </div>
                  <div className="notif-item__body">
                    <div className="notif-item__top">
                      <span className="notif-item__title" style={{ color: cfg.color }}>
                        {n.title}
                      </span>
                      <div className="notif-item__meta">
                        <span className="notif-item__date">{n.date}</span>
                        <span className="notif-item__id">ID #{n.id}</span>
                        <button
                          type="button"
                          className="notif-item__chat-btn"
                          title={`Apri chat (${cfg.label})`}
                          aria-label="Apri chat con il mittente"
                          style={{ color: cfg.color }}
                          onClick={e => {
                            e.stopPropagation()
                            selectChatFromNotif(n.id)
                            navigate('chat')
                            setOpen(false)
                          }}
                        >
                          <i className="fa-light fa-comments" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {n.ref && <div className="notif-item__ref">{n.ref}</div>}
                    {n.text && <p className="notif-item__text">{n.text}</p>}
                    <div className="notif-item__badges">
                      <span
                        className="notif-item__origin-badge"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}
                      >
                        {cfg.label}
                      </span>
                      <span className="notif-item__sev-badge">
                        {SEV_LABEL[n.sev]}
                      </span>
                    </div>
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
