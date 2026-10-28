import React, { useEffect, useMemo, useState } from 'react'
import {
  ApprovalsPage, AttendanceHrPage, BalancesPage, ChatPage, CommunicationsHrPage, CompanyDocumentsPage, createHrApi, DepartmentsPage,
  DirectoryPage, EmployeesPage, errorMessage, ExpensesPage, HomePage, HrApiError, HrApiProvider, ImportEmployeesPage, Me,
  MyAttendancePage, MyCommunicationsPage, MyDocumentsPage, MyLeavePage, NewsPage, PayslipsHrPage, TeamCalendarPage, TeamLeavePage,
  TenantModules, TenantSettings, TodayPage, VacationPlanPage, VacationPlansPage,
} from '@sibylla-hr/hr-pages'
import { getToken } from '../../../services/auth.service'

// Modulo Sibylla HR dentro la platform: le pagine vengono dal pacchetto @sibylla-hr/hr-pages (repo HR-Manager),
// le chiamate passano dal proxy (/Hr/... → servizio HR) con il JWT della platform.
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5289'

export type SibyllaHrView =
  | 'home' | 'assenze' | 'calendario' | 'piano-ferie' | 'presenze' | 'note-spese' | 'documenti'
  | 'news' | 'chat' | 'comunicazioni' | 'rubrica'
  | 'approvazioni' | 'richieste' | 'presenze-oggi'
  | 'presenze-hr' | 'saldi' | 'cedolini' | 'documenti-aziendali' | 'comunicazioni-hr' | 'dipendenti' | 'reparti' | 'importa'

type Access = { module?: keyof TenantModules; role?: 'manager' | 'hr' }

// Chi vede cosa: lo stesso menu dell'app stand-alone (navFor), per modulo attivo e ruolo
const ACCESS: Record<SibyllaHrView, Access> = {
  home: {},
  assenze: { module: 'leave' },
  calendario: { module: 'leave' },
  'piano-ferie': { module: 'leave' },
  presenze: { module: 'attendance' },
  'note-spese': { module: 'expenses' },
  documenti: { module: 'payslips' },
  news: { module: 'social' },
  chat: { module: 'social' },
  comunicazioni: { module: 'social' },
  rubrica: { module: 'social' },
  approvazioni: { module: 'leave', role: 'manager' },
  richieste: { module: 'leave', role: 'manager' },
  'presenze-oggi': { module: 'attendance', role: 'manager' },
  'presenze-hr': { module: 'attendance', role: 'hr' },
  saldi: { module: 'leave', role: 'hr' },
  cedolini: { module: 'payslips', role: 'hr' },
  'documenti-aziendali': { module: 'payslips', role: 'hr' },
  'comunicazioni-hr': { module: 'social', role: 'hr' },
  dipendenti: { role: 'hr' },
  reparti: { role: 'hr' },
  importa: { role: 'hr' },
}

// Percorsi delle pagine HR (come nell'app stand-alone) → pagine della platform, per i link della dashboard
const PLATFORM_PAGES: Record<string, string> = {
  '/assenze': 'hr-sib-assenze', '/approvazioni': 'hr-sib-approvazioni', '/documenti': 'hr-sib-documenti', '/comunicazioni': 'hr-sib-comunicazioni',
  '/chat': 'hr-sib-chat', '/news': 'hr-sib-news', '/piano-ferie': 'hr-sib-piano-ferie', '/presenze-hr': 'hr-sib-presenze-hr', '/oggi': 'hr-sib-presenze-oggi',
}

export default function SibyllaHr({ view, navigate }: { view: SibyllaHrView; navigate?: (page: string) => void }) {
  // Un 401 del servizio HR non vuol dire token scaduto (lo gestisce già la platform): di solito l'utente non è
  // collegato a un cliente HR. Quindi niente logout, solo un messaggio.
  const api = useMemo(() => createHrApi({ baseUrl: `${BASE_URL}/Hr`, getToken }), [])
  const [me, setMe] = useState<Me | null>(null)
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.me(), api.settings()]).then(
      ([m, s]) => { setMe(m); setSettings(s) },
      err => setError(err instanceof HrApiError && err.status === 401
        ? 'Il tuo utente non è collegato a Sibylla HR: chiedi all\'HR della tua azienda di aggiungerti con il tuo Id utente.'
        : errorMessage(err)),
    )
  }, [api])

  if (error) return <Notice text={error} />
  if (!me) return null
  const role = me.user.role
  const isHr = role === 'Hr'
  const access = ACCESS[view]
  if (access.module && !settings?.modules[access.module]) return <Notice text="Questa funzione non è attiva per la tua azienda." />
  if ((access.role === 'hr' && !isHr) || (access.role === 'manager' && role === 'Employee'))
    return <Notice text={access.role === 'hr' ? "Questa sezione è riservata all'HR." : 'Questa sezione è riservata ai responsabili e all\'HR.'} />

  return (
    <HrApiProvider api={api}>
      {view === 'home' && <HomePage me={me} modules={settings?.modules}
        onNavigate={navigate ? to => PLATFORM_PAGES[to] && navigate(PLATFORM_PAGES[to]) : undefined} />}
      {view === 'assenze' && <MyLeavePage />}
      {view === 'calendario' && <TeamCalendarPage isHr={isHr} />}
      {view === 'piano-ferie' && (plan
        ? <VacationPlanPage key={plan} id={plan} isHr={isHr} onBack={() => setPlan(null)} />
        : <VacationPlansPage isHr={isHr} onOpen={setPlan} />)}
      {view === 'presenze' && <MyAttendancePage />}
      {view === 'note-spese' && <ExpensesPage isHr={isHr} />}
      {view === 'documenti' && <MyDocumentsPage />}
      {view === 'news' && <NewsPage isHr={isHr} />}
      {view === 'chat' && <ChatPage isHr={isHr} />}
      {view === 'comunicazioni' && <MyCommunicationsPage />}
      {view === 'rubrica' && <DirectoryPage isHr={isHr} />}
      {view === 'approvazioni' && <ApprovalsPage />}
      {view === 'richieste' && <TeamLeavePage isHr={isHr} />}
      {view === 'presenze-oggi' && <TodayPage isHr={isHr} />}
      {view === 'presenze-hr' && <AttendanceHrPage />}
      {view === 'saldi' && <BalancesPage />}
      {view === 'cedolini' && <PayslipsHrPage />}
      {view === 'documenti-aziendali' && <CompanyDocumentsPage />}
      {view === 'comunicazioni-hr' && <CommunicationsHrPage />}
      {view === 'dipendenti' && <EmployeesPage integrated />}
      {view === 'reparti' && <DepartmentsPage />}
      {view === 'importa' && <ImportEmployeesPage />}
    </HrApiProvider>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <div className="alert-banner alert-banner--info" role="status">
      <i className="fa-duotone fa-circle-info" style={{ fontSize: 16 }} aria-hidden="true" />
      {text}
    </div>
  )
}
