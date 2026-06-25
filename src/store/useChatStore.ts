import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Tipi ─────────────────────────────────────────────────────────────
export type MessageAttachment = {
  id:   string
  name: string
  size: number
  type: 'image' | 'file'
  url:  string
}

export interface ChatMessage {
  id:          string
  conversationId: string
  authorId:    string
  text:        string
  attachments: MessageAttachment[]
  createdAt:   string
  read:        boolean
}

export interface Conversation {
  id:           string
  userId:       string
  userName:     string
  userRole:     string
  azienda:      string
  online:       boolean
  lastSeen?:    string
  origin:       'platform' | 'to'
  unreadCount:  number
  lastPreview?: string
  lastAt?:      string
  pinned?:      boolean
}

/** Contatto Platform ricercabile per email per avviare una nuova conversazione. */
export interface DirectoryUser {
  userId:   string
  userName: string
  userRole: string
  azienda:  string
  email:    string
  online:   boolean
  origin:   'platform' | 'to'
}

// ── Mock data iniziali ──────────────────────────────────────────────
const NOW = () => new Date().toISOString()
const T = (h: number, m: number) => {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
const DAYS_AGO = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  { id:'c1', userId:'u-mr', userName:'Marco Rossi',         userRole:'Operatore Platform',   azienda:'Hotel Tutorial',      online:true,  origin:'platform', unreadCount:2, lastPreview:'Buongiorno, ho ricevuto la segnalazione…', lastAt:T(14,32) },
  { id:'c2', userId:'u-to', userName:'Tour Operator Test',  userRole:'Tour Operator',        azienda:'Viaggi Demo S.r.l.',  online:false, lastSeen:'2 ore fa', origin:'to', unreadCount:1, lastPreview:'Ho una richiesta extra per la prenotazione 2026/014505', lastAt:T(12,15) },
  { id:'c3', userId:'u-gb', userName:'Giulia Bianchi',      userRole:'Amministratore Hotel', azienda:'Hotel Azzurro Mare',  online:true,  origin:'platform', unreadCount:0, lastPreview:'Perfetto, grazie mille!', lastAt:DAYS_AGO(1) },
  { id:'c4', userId:'u-sn', userName:'Sibylla Network',     userRole:'Tour Operator',        azienda:'Sibylla Network',     online:false, lastSeen:'ieri',     origin:'to', unreadCount:0, lastPreview:'Possiamo confermare per giovedì?', lastAt:DAYS_AGO(2) },
  { id:'c5', userId:'u-lf', userName:'Luca Ferraro',        userRole:'Front Office',         azienda:'Hotel Tutorial',      online:false, lastSeen:'3 giorni fa', origin:'platform', unreadCount:0, lastPreview:'Documento allegato.', lastAt:DAYS_AGO(5) },
]

// Rubrica utenti Platform ricercabili per email (nuova conversazione, stile Teams)
const DIRECTORY: DirectoryUser[] = [
  { userId:'u-mr', userName:'Marco Rossi',     userRole:'Operatore Platform',     azienda:'Hotel Tutorial',     email:'marco.rossi@sibyllanetwork.com',     online:true,  origin:'platform' },
  { userId:'u-gb', userName:'Giulia Bianchi',  userRole:'Amministratore Hotel',   azienda:'Hotel Azzurro Mare', email:'giulia.bianchi@sibyllanetwork.com',  online:true,  origin:'platform' },
  { userId:'u-lf', userName:'Luca Ferraro',    userRole:'Front Office',           azienda:'Hotel Tutorial',     email:'luca.ferraro@sibyllanetwork.com',    online:false, origin:'platform' },
  { userId:'u-ar', userName:'Anna Ricci',      userRole:'Revenue Manager',        azienda:'Hotel Lux',          email:'anna.ricci@sibyllanetwork.com',      online:true,  origin:'platform' },
  { userId:'u-pv', userName:'Paolo Verdi',     userRole:'Direttore di struttura', azienda:'Hotel Lux',          email:'paolo.verdi@sibyllanetwork.com',     online:false, origin:'platform' },
  { userId:'u-cm', userName:'Chiara Moretti',  userRole:'Housekeeping Manager',   azienda:'Hotel Azzurro Mare', email:'chiara.moretti@sibyllanetwork.com',  online:true,  origin:'platform' },
  { userId:'u-sg', userName:'Stefano Greco',   userRole:'Manutenzione',           azienda:'Hotel Tutorial',     email:'stefano.greco@sibyllanetwork.com',   online:false, origin:'platform' },
  { userId:'u-er', userName:'Elena Russo',     userRole:'Marketing',              azienda:'Hotel Lux',          email:'elena.russo@sibyllanetwork.com',     online:true,  origin:'platform' },
  { userId:'u-dv', userName:'Davide Conti',    userRole:'F&B Manager',            azienda:'Hotel Azzurro Mare', email:'davide.conti@sibyllanetwork.com',    online:false, origin:'platform' },
]

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    { id:'m1-1', conversationId:'c1', authorId:'u-mr', text:'Buongiorno, ho ricevuto la segnalazione e la sto prendendo in carico.', attachments:[], createdAt:T(14,30), read:true },
    { id:'m1-2', conversationId:'c1', authorId:'u-mr', text:'Mi serve qualche dettaglio in più: puoi inviarmi una foto del problema?', attachments:[], createdAt:T(14,32), read:false },
  ],
  c2: [
    { id:'m2-1', conversationId:'c2', authorId:'u-to', text:'Ho una richiesta extra per la prenotazione 2026/014505', attachments:[], createdAt:T(12,15), read:false },
  ],
  c3: [
    { id:'m3-1', conversationId:'c3', authorId:'me', text:'Ciao Giulia, ti ho inviato il file con il riepilogo mensile.', attachments:[], createdAt:DAYS_AGO(1), read:true },
    { id:'m3-2', conversationId:'c3', authorId:'u-gb', text:'Perfetto, grazie mille!', attachments:[], createdAt:DAYS_AGO(1), read:true },
  ],
  c4: [
    { id:'m4-1', conversationId:'c4', authorId:'u-sn', text:'Possiamo confermare per giovedì?', attachments:[], createdAt:DAYS_AGO(2), read:true },
    { id:'m4-2', conversationId:'c4', authorId:'me', text:'Certamente, confermo la disponibilità.', attachments:[], createdAt:DAYS_AGO(2), read:true },
  ],
  c5: [
    { id:'m5-1', conversationId:'c5', authorId:'u-lf', text:'Documento allegato.', attachments:[{ id:'a1', name:'report-202604.pdf', size:184320, type:'file', url:'#' }], createdAt:DAYS_AGO(5), read:true },
  ],
}

// ── Store ───────────────────────────────────────────────────────────
interface ChatState {
  conversations: Conversation[]
  messages:      Record<string, ChatMessage[]>
  directory:     DirectoryUser[]
  selectedId:    string | null
  hydrated:      boolean

  select:        (id: string | null) => void
  selectFromNotif: (notifId: number) => void
  startConversation: (userId: string) => void
  sendMessage:   (text: string, attachments?: MessageAttachment[]) => void
  markRead:      (conversationId: string) => void
  markUnread:    (conversationId: string) => void
  clearMessages: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  totalUnread:   () => number
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: INITIAL_CONVERSATIONS,
      messages:      INITIAL_MESSAGES,
      directory:     DIRECTORY,
      selectedId:    'c1',
      hydrated:      false,

      select: (id) => {
        set({ selectedId: id })
        if (id) get().markRead(id)
      },

      // Apre la chat partendo da una notifica: mappa l'id notifica
      // sulla conversazione corrispondente (fallback alla prima).
      selectFromNotif: (notifId) => {
        // Mappa euristica id notifica → conversazione (in attesa di backend)
        const NOTIF_TO_CONV: Record<number, string> = {
          100: 'c1', 101: 'c1', 102: 'c2',
          1:   'c2', 2:   'c1', 3:   'c2', 4: 'c2',
        }
        const target = NOTIF_TO_CONV[notifId] ?? get().conversations[0]?.id ?? null
        set({ selectedId: target })
        if (target) get().markRead(target)
      },

      // Avvia (o riapre) una conversazione con un utente Platform della rubrica.
      startConversation: (userId) => {
        const existing = get().conversations.find(c => c.userId === userId)
        if (existing) {
          set({ selectedId: existing.id })
          get().markRead(existing.id)
          return
        }
        const u = get().directory.find(d => d.userId === userId)
        if (!u) return
        const id = `c-${Date.now()}`
        const conv: Conversation = {
          id,
          userId:      u.userId,
          userName:    u.userName,
          userRole:    u.userRole,
          azienda:     u.azienda,
          online:      u.online,
          origin:      u.origin,
          unreadCount: 0,
          lastSeen:    u.online ? undefined : 'di recente',
        }
        set((s) => ({
          conversations: [conv, ...s.conversations],
          messages:      { ...s.messages, [id]: [] },
          selectedId:    id,
        }))
      },

      sendMessage: (text, attachments = []) => {
        const convId = get().selectedId
        if (!convId) return
        const trimmed = text.trim()
        if (!trimmed && attachments.length === 0) return

        const msg: ChatMessage = {
          id:             `m-${Date.now()}`,
          conversationId: convId,
          authorId:       'me',
          text:           trimmed,
          attachments,
          createdAt:      NOW(),
          read:           true,
        }
        set((s) => ({
          messages: { ...s.messages, [convId]: [...(s.messages[convId] ?? []), msg] },
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? { ...c, lastPreview: trimmed || (attachments[0]?.name ?? 'Allegato'), lastAt: msg.createdAt }
              : c,
          ),
        }))
      },

      markRead: (conversationId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).map((m) => ({ ...m, read: true })),
          },
        }))
      },

      markUnread: (conversationId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: Math.max(1, c.unreadCount) } : c,
          ),
        }))
      },

      clearMessages: (conversationId) => {
        set((s) => ({
          messages: { ...s.messages, [conversationId]: [] },
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, lastPreview: undefined, lastAt: undefined } : c,
          ),
        }))
      },

      deleteConversation: (conversationId) => {
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== conversationId)
          const messages = { ...s.messages }
          delete messages[conversationId]
          const selectedId = s.selectedId === conversationId
            ? (conversations[0]?.id ?? null)
            : s.selectedId
          return { conversations, messages, selectedId }
        })
      },

      totalUnread: () => get().conversations.reduce((acc, c) => acc + c.unreadCount, 0),
    }),
    {
      name: 'sibylla.chat',
      // Bump quando cambia lo schema dei dati seed (es. aggiunta `azienda`):
      // resetta lo stato persistito ai nuovi seed.
      version: 1,
      migrate: () => ({
        conversations: INITIAL_CONVERSATIONS,
        messages:      INITIAL_MESSAGES,
        directory:     DIRECTORY,
        selectedId:    'c1',
      }),
      onRehydrateStorage: () => (state) => { if (state) state.hydrated = true },
    },
  ),
)
