import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Pagination from '../../../core/components/Pagination'
import StatusBadge from '../../../core/components/StatusBadge'
import { SearchField } from '../../../core/components/form'
import './LogDiSistema.sass'

interface LogEvent {
  id: string
  date: string
  name: string
}

interface UserLog {
  id: string
  fullName: string
  email: string
  registeredAt: string
  lastAccess: string
  active: boolean
  events: LogEvent[]
}

const PAGE_SIZE = 10

const MOCK_USERS: UserLog[] = [
  {
    id: 'mario-rossi',
    fullName: 'Mario Rossi',
    email: 'test@sibyllanetwork.com',
    registeredAt: '23/01/2025',
    lastAccess: '03/07/2025',
    active: true,
    events: [
      { id: '1', date: '04/05/2026 - 12:03:36', name: 'Log Out' },
      { id: '2', date: '04/05/2026 - 11:15:24', name: 'Log Out' },
      { id: '3', date: '04/05/2026 - 10:55:45', name: 'SetAssignedRoles' },
      { id: '4', date: '04/05/2026 - 10:55:36', name: 'SetAssignedRoles' },
      { id: '5', date: '04/05/2026 - 10:55:35', name: 'SetAssignedRoles' },
      { id: '6', date: '04/05/2026 - 10:55:07', name: 'SetAssignedRoles' },
      { id: '7', date: '04/05/2026 - 10:54:51', name: 'SetAssignedRoles' },
      { id: '8', date: '04/05/2026 - 10:54:50', name: 'SetAssignedRoles' },
      { id: '9', date: '04/05/2026 - 10:54:50', name: 'Set_Ruoli_Funzioni_Mapping' },
    ],
  },
  {
    id: 'sibylla',
    fullName: 'Sibylla',
    email: 'test_dev@sibyllanetwork.com',
    registeredAt: '04/04/2026',
    lastAccess: '04/04/2026',
    active: true,
    events: [
      { id: '1', date: '04/04/2026 - 09:12:00', name: 'Log In' },
      { id: '2', date: '04/04/2026 - 09:12:35', name: 'GetUserPreferences' },
      { id: '3', date: '04/04/2026 - 09:14:02', name: 'Log Out' },
    ],
  },
  {
    id: 'andrea-rossi',
    fullName: 'Andrea Rossi',
    email: 'test_a.grimaudo@sibyllanetwork.com',
    registeredAt: '17/03/2025',
    lastAccess: '17/03/2025',
    active: true,
    events: [
      { id: '1', date: '17/03/2025 - 14:22:10', name: 'Log In' },
      { id: '2', date: '17/03/2025 - 14:30:45', name: 'Log Out' },
    ],
  },
  {
    id: 'luigi-rossi',
    fullName: 'Luigi Rossi',
    email: 'test_l.rossi@sibyllanetwork.com',
    registeredAt: '05/05/2025',
    lastAccess: '05/05/2025',
    active: true,
    events: [
      { id: '1', date: '05/05/2025 - 08:45:22', name: 'Log In' },
    ],
  },
  {
    id: 'john-smith',
    fullName: 'John Smith',
    email: 'test_dfgsd@fsda.com',
    registeredAt: '22/05/2025',
    lastAccess: '04/04/2026',
    active: true,
    events: [
      { id: '1', date: '04/04/2026 - 10:00:00', name: 'Log In' },
      { id: '2', date: '04/04/2026 - 10:25:18', name: 'CreateBooking' },
      { id: '3', date: '04/04/2026 - 11:42:55', name: 'Log Out' },
    ],
  },
  {
    id: 'ali-aslan',
    fullName: 'Ali Aslan',
    email: 'test_alisahibamiraslan@gmail.com',
    registeredAt: '22/05/2025',
    lastAccess: '04/04/2026',
    active: true,
    events: [],
  },
  {
    id: 'test-test',
    fullName: 'test test',
    email: 'test_a.alferov@sibyllanetwork.com',
    registeredAt: '22/05/2025',
    lastAccess: '22/05/2025',
    active: true,
    events: [],
  },
  {
    id: 'dino-tacchini',
    fullName: 'dino tacchini',
    email: 'test_h.akkari@sibyllanetwork.com',
    registeredAt: '22/05/2025',
    lastAccess: '22/05/2025',
    active: true,
    events: [],
  },
  {
    id: 'paolo-bianchi',
    fullName: 'Paolo Bianchi',
    email: 'p.bianchi@sibyllanetwork.com',
    registeredAt: '12/06/2025',
    lastAccess: '01/03/2026',
    active: false,
    events: [
      { id: '1', date: '01/03/2026 - 18:12:00', name: 'Log Out' },
    ],
  },
  {
    id: 'giulia-verdi',
    fullName: 'Giulia Verdi',
    email: 'g.verdi@sibyllanetwork.com',
    registeredAt: '15/07/2025',
    lastAccess: '02/04/2026',
    active: true,
    events: [],
  },
  {
    id: 'marco-neri',
    fullName: 'Marco Neri',
    email: 'm.neri@sibyllanetwork.com',
    registeredAt: '01/08/2025',
    lastAccess: '03/04/2026',
    active: true,
    events: [],
  },
  {
    id: 'lucia-gialli',
    fullName: 'Lucia Gialli',
    email: 'l.gialli@sibyllanetwork.com',
    registeredAt: '20/09/2025',
    lastAccess: '15/02/2026',
    active: false,
    events: [],
  },
]

export default function LogDiSistema({ navigate }: { navigate: (p: string) => void }) {
  const [users] = useState<UserLog[]>(MOCK_USERS)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  function toggle(id: string) {
    setOpenId(prev => (prev === id ? null : id))
  }

  return (
    <div className="log-sistema">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Log di sistema"
        subtitle="Cronologia accessi ed eventi degli utenti del sistema"
      />

      <FilterToolbar>
        <div className="log-sistema__search">
          <label className="log-sistema__search-label" htmlFor="search">Cerca</label>
          <SearchField
            placeholder="Cerca utente o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table log-sistema__table">
          <thead>
            <tr>
              <th className="log-sistema__th-toggle" />
              <th>Utente</th>
              <th>Registrato il</th>
              <th>Ultimo accesso</th>
              <th>Email</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={6} className="sib-empty">Nessun utente trovato.</td>
              </tr>
            )}
            {pageItems.map(u => {
              const isOpen = openId === u.id
              return (
                <React.Fragment key={u.id}>
                  <tr
                    className={'log-sistema__row' + (isOpen ? ' log-sistema__row--open' : '')}
                    onClick={() => toggle(u.id)}
                  >
                    <td className="log-sistema__td-toggle">
                      <i className={'fa-light fa-chevron-' + (isOpen ? 'up' : 'down')} aria-hidden="true" />
                    </td>
                    <td>
                      <span className="log-sistema__user">
                        <span className="log-sistema__avatar">
                          <i className="fa-light fa-user" aria-hidden="true" />
                        </span>
                        <strong>{u.fullName}</strong>
                      </span>
                    </td>
                    <td>{u.registeredAt}</td>
                    <td>{u.lastAccess}</td>
                    <td className="sib-cell--muted">{u.email}</td>
                    <td>
                      <StatusBadge variant={u.active ? 'success' : 'neutral'}>
                        {u.active ? 'ATTIVO' : 'INATTIVO'}
                      </StatusBadge>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="log-sistema__detail-row">
                      <td />
                      <td colSpan={5}>
                        <EventTable events={u.events} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="log-sistema__pagination">
        <span className="log-sistema__pagination-info">
          {filtered.length > 0
            ? `Risultati ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filtered.length)} di ${filtered.length}`
            : '0 risultati'}
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}

// ─── Sub-table eventi ─────────────────────────────────────────────────
function EventTable({ events }: { events: LogEvent[] }) {
  if (events.length === 0) {
    return <p className="log-sistema__empty-events">Nessun evento registrato per questo utente.</p>
  }
  return (
    <table className="log-sistema__events">
      <thead>
        <tr>
          <th>Data</th>
          <th>Nome Evento</th>
        </tr>
      </thead>
      <tbody>
        {events.map(e => (
          <tr key={e.id}>
            <td>{e.date}</td>
            <td><strong>{e.name}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
