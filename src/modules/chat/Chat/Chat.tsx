import React, { useEffect, useMemo, useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import {
  useChatStore,
  type ChatMessage,
  type Conversation,
  type MessageAttachment,
} from '../../../store/useChatStore'
import './Chat.sass'

const ORIGIN_COLOR: Record<Conversation['origin'], string> = {
  platform: '#204769',
  to:       '#206953',
}

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀','😁','😂','🤣','😅','😊','😍','😘','😎','🤔','😴','🤩','😇','🙄','😬','😢','😭','😡','😱','🤯','🤝','🙏','👏','🤞','✌️'] },
  { label: 'Gesti',   emojis: ['👍','👎','👌','✋','🖐️','🤚','👋','🫶','🤲','💪','🙌','👀','🧠','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💯','🔥'] },
  { label: 'Oggetti', emojis: ['📎','📌','📍','📷','🎯','🚀','✅','❌','⚠️','💡','📅','⏰','💬','📞','📧','🔗','📁','📄','💾','🔔','🛒','💼','🏷️','🎁','⭐'] },
]

function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (isToday)     return 'Oggi'
  if (isYesterday) return 'Ieri'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function fmtPreviewTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return fmtTime(iso)
  const diff = (now.getTime() - d.getTime()) / 86400000
  if (diff < 1) return 'Ieri'
  if (diff < 7) return d.toLocaleDateString('it-IT', { weekday: 'short' })
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('')
}

export default function Chat({ navigate }: { navigate: (p: string) => void }) {
  const conversations = useChatStore(s => s.conversations)
  const messagesAll   = useChatStore(s => s.messages)
  const selectedId    = useChatStore(s => s.selectedId)
  const select        = useChatStore(s => s.select)
  const sendMessage   = useChatStore(s => s.sendMessage)

  const [search, setSearch]           = useState('')
  const [draft, setDraft]             = useState('')
  const [pending, setPending]         = useState<MessageAttachment[]>([])
  const [emojiOpen, setEmojiOpen]     = useState(false)
  const [emojiGroup, setEmojiGroup]   = useState(0)
  const fileRef  = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const emojiBtnRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find(c => c.id === selectedId) ?? null
  const messages = selectedId ? (messagesAll[selectedId] ?? []) : []

  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c =>
      c.userName.toLowerCase().includes(q) ||
      c.userRole.toLowerCase().includes(q) ||
      (c.lastPreview ?? '').toLowerCase().includes(q),
    )
  }, [conversations, search])

  // Scroll alla fine quando cambia conversazione o si aggiunge messaggio
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [selectedId, messages.length])

  // Chiudi emoji picker cliccando fuori
  useEffect(() => {
    if (!emojiOpen) return
    const handler = (e: MouseEvent) => {
      if (emojiBtnRef.current && !emojiBtnRef.current.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [emojiOpen])

  const handleSend = () => {
    if (!draft.trim() && pending.length === 0) return
    sendMessage(draft, pending)
    setDraft('')
    setPending([])
    setEmojiOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFiles = (files: FileList | null, asImage: boolean) => {
    if (!files || files.length === 0) return
    const next: MessageAttachment[] = Array.from(files).map(f => ({
      id:   `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      type: asImage ? 'image' : 'file',
      url:  URL.createObjectURL(f),
    }))
    setPending(prev => [...prev, ...next])
  }

  const removePending = (id: string) => {
    const removed = pending.find(p => p.id === id)
    if (removed) URL.revokeObjectURL(removed.url)
    setPending(prev => prev.filter(p => p.id !== id))
  }

  const insertEmoji = (e: string) => {
    setDraft(prev => prev + e)
  }

  // Raggruppa messaggi per giorno
  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = []
    let currentDay = ''
    messages.forEach(m => {
      const day = fmtDay(m.createdAt)
      if (day !== currentDay) {
        out.push({ day, items: [m] })
        currentDay = day
      } else {
        out[out.length - 1].items.push(m)
      }
    })
    return out
  }, [messages])

  const selectedColor = selected ? ORIGIN_COLOR[selected.origin] : '#204769'

  return (
    <div className="chat">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Chat"
        subtitle="Comunica con operatori Platform e Tour Operator"
      />

      <div className="chat__layout">
        {/* ─── Sidebar conversazioni ─── */}
        <aside className="chat__sidebar">
          <div className="chat__search">
            <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
            <input
              type="text"
              placeholder="Cerca conversazione…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="chat__search-clear"
                onClick={() => setSearch('')}
                aria-label="Pulisci"
              >
                <i className="fa-light fa-xmark" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="chat__conv-list">
            {filteredConvs.length === 0 ? (
              <div className="chat__conv-empty">
                <i className="fa-light fa-comments" aria-hidden="true" />
                <p>Nessuna conversazione</p>
              </div>
            ) : (
              filteredConvs.map(c => {
                const color = ORIGIN_COLOR[c.origin]
                const active = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={'chat__conv' + (active ? ' chat__conv--active' : '')}
                    onClick={() => select(c.id)}
                  >
                    <div className="chat__avatar" style={{ background: color }}>
                      {initials(c.userName)}
                      {c.online && <span className="chat__avatar-dot" />}
                    </div>
                    <div className="chat__conv-body">
                      <div className="chat__conv-top">
                        <span className="chat__conv-name">{c.userName}</span>
                        <span className="chat__conv-time">{fmtPreviewTime(c.lastAt)}</span>
                      </div>
                      <div className="chat__conv-bottom">
                        <span className="chat__conv-preview">{c.lastPreview ?? '—'}</span>
                        {c.unreadCount > 0 && (
                          <span className="chat__conv-badge" style={{ background: color }}>
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="chat__conv-origin" style={{ color, borderColor: `${color}40` }}>
                        {c.origin === 'platform' ? 'Platform' : 'TO'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ─── Pannello chat ─── */}
        <section className="chat__main">
          {!selected ? (
            <div className="chat__empty">
              <i className="fa-light fa-comments" aria-hidden="true" />
              <h3>Seleziona una conversazione</h3>
              <p>Scegli un contatto dall'elenco a sinistra per iniziare a chattare.</p>
            </div>
          ) : (
            <>
              <header className="chat__header">
                <div className="chat__header-info">
                  <div className="chat__avatar chat__avatar--md" style={{ background: selectedColor }}>
                    {initials(selected.userName)}
                    {selected.online && <span className="chat__avatar-dot" />}
                  </div>
                  <div className="chat__header-text">
                    <span className="chat__header-name">{selected.userName}</span>
                    <span className="chat__header-status">
                      {selected.online
                        ? <><span className="chat__status-dot" /> Online</>
                        : <>Ultimo accesso: {selected.lastSeen ?? '—'}</>
                      }
                      <span className="chat__header-sep">·</span>
                      <span style={{ color: selectedColor, fontWeight: 600 }}>
                        {selected.userRole}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="chat__header-actions">
                  <Tooltip text="Chiama">
                    <button type="button" className="chat__icon-btn" aria-label="Chiama">
                      <i className="fa-light fa-phone" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Videochiamata">
                    <button type="button" className="chat__icon-btn" aria-label="Videochiamata">
                      <i className="fa-light fa-video" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Cerca nei messaggi">
                    <button type="button" className="chat__icon-btn" aria-label="Cerca">
                      <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Altre opzioni">
                    <button type="button" className="chat__icon-btn" aria-label="Opzioni">
                      <i className="fa-light fa-ellipsis-vertical" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              </header>

              <div ref={scrollRef} className="chat__messages">
                {grouped.length === 0 && (
                  <div className="chat__messages-empty">
                    <i className="fa-light fa-comments" aria-hidden="true" />
                    <p>Nessun messaggio. Scrivi il primo qui sotto!</p>
                  </div>
                )}
                {grouped.map((g, gi) => (
                  <div key={gi} className="chat__day-group">
                    <div className="chat__day-sep"><span>{g.day}</span></div>
                    {g.items.map(m => {
                      const mine = m.authorId === 'me'
                      return (
                        <div
                          key={m.id}
                          className={'chat__msg' + (mine ? ' chat__msg--mine' : '')}
                        >
                          <div
                            className="chat__bubble"
                            style={mine ? { background: selectedColor } : undefined}
                          >
                            {m.attachments.length > 0 && (
                              <div className="chat__atts">
                                {m.attachments.map(a => (
                                  a.type === 'image' ? (
                                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="chat__att-img">
                                      <img src={a.url} alt={a.name} />
                                    </a>
                                  ) : (
                                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="chat__att-file">
                                      <i className="fa-light fa-file" aria-hidden="true" />
                                      <span>
                                        <strong>{a.name}</strong>
                                        <em>{fmtSize(a.size)}</em>
                                      </span>
                                    </a>
                                  )
                                ))}
                              </div>
                            )}
                            {m.text && <p className="chat__bubble-text">{m.text}</p>}
                            <span className="chat__bubble-meta">
                              {fmtTime(m.createdAt)}
                              {mine && (
                                <i
                                  className={'fa-light ' + (m.read ? 'fa-check-double' : 'fa-check')}
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* ── Anteprima allegati pending ── */}
              {pending.length > 0 && (
                <div className="chat__pending">
                  {pending.map(a => (
                    <div key={a.id} className="chat__pending-item">
                      {a.type === 'image' ? (
                        <img src={a.url} alt={a.name} className="chat__pending-thumb" />
                      ) : (
                        <i className="fa-light fa-file chat__pending-icon" aria-hidden="true" />
                      )}
                      <div className="chat__pending-info">
                        <span className="chat__pending-name">{a.name}</span>
                        <span className="chat__pending-size">{fmtSize(a.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="chat__pending-remove"
                        onClick={() => removePending(a.id)}
                        aria-label="Rimuovi allegato"
                      >
                        <i className="fa-light fa-xmark" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Input composer ── */}
              <footer className="chat__composer">
                <div ref={emojiBtnRef} className="chat__composer-emoji-wrap">
                  <Tooltip text="Emoji">
                    <button
                      type="button"
                      className={'chat__icon-btn' + (emojiOpen ? ' chat__icon-btn--active' : '')}
                      onClick={() => setEmojiOpen(v => !v)}
                      aria-label="Emoji"
                      aria-expanded={emojiOpen}
                    >
                      <i className="fa-light fa-face-smile" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  {emojiOpen && (
                    <div className="chat__emoji-panel">
                      <div className="chat__emoji-tabs">
                        {EMOJI_GROUPS.map((g, i) => (
                          <button
                            key={g.label}
                            type="button"
                            className={'chat__emoji-tab' + (i === emojiGroup ? ' chat__emoji-tab--active' : '')}
                            onClick={() => setEmojiGroup(i)}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                      <div className="chat__emoji-grid">
                        {EMOJI_GROUPS[emojiGroup].emojis.map((e, i) => (
                          <button
                            key={`${emojiGroup}-${i}`}
                            type="button"
                            className="chat__emoji-item"
                            onClick={() => insertEmoji(e)}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Tooltip text="Allega file">
                  <button
                    type="button"
                    className="chat__icon-btn"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Allega file"
                  >
                    <i className="fa-light fa-paperclip" aria-hidden="true" />
                  </button>
                </Tooltip>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={e => { handleFiles(e.target.files, false); e.target.value = '' }}
                />

                <Tooltip text="Allega immagine">
                  <button
                    type="button"
                    className="chat__icon-btn"
                    onClick={() => imageRef.current?.click()}
                    aria-label="Allega immagine"
                  >
                    <i className="fa-light fa-image" aria-hidden="true" />
                  </button>
                </Tooltip>
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={e => { handleFiles(e.target.files, true); e.target.value = '' }}
                />

                <textarea
                  className="chat__composer-input"
                  placeholder="Scrivi un messaggio…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />

                <button
                  type="button"
                  className="chat__send"
                  onClick={handleSend}
                  disabled={!draft.trim() && pending.length === 0}
                  style={{ background: selectedColor }}
                  aria-label="Invia messaggio"
                >
                  <i className="fa-light fa-paper-plane" aria-hidden="true" />
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

