import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import './Interfacce.sass'

type Status = 'ok' | 'warning' | 'error'

interface SectionDetail {
  name: string
  detail?: string
  status?: Status
}

interface Sistema {
  id: string
  nome: string
  /** Dominio per fetch del logo via Clearbit Logo API */
  domain?: string
  /** Stile del "logo" testuale di fallback */
  logoStyle?: 'alyante' | 'verticalbooking' | 'hqrevenue' | 'syselicat' | 'gamma' | 'sojern' | 'travco' | 'g2travel' | 'italcamel' | 'avoris' | 'agoda' | 'ratehawk'
  tipologia: string
  ultimoTrasferimento: string | null
  status: Status
  details?: SectionDetail[]
}

const SISTEMI: Sistema[] = [
  { id: 'alyante',         nome: 'ALYANTE',          domain: 'teamsystem.com',     logoStyle: 'alyante',         tipologia: 'Property Management System',  ultimoTrasferimento: '04/05/2026 14:50', status: 'ok' },
  { id: 'verticalbooking', nome: 'VERTICAL BOOKING', domain: 'verticalbooking.com', logoStyle: 'verticalbooking', tipologia: 'Centre Reservation System',   ultimoTrasferimento: '04/05/2026 14:50', status: 'ok' },
  { id: 'hqrevenue',       nome: 'HQ revenue',       domain: 'hqrevenue.com',      logoStyle: 'hqrevenue',       tipologia: 'External Sources',            ultimoTrasferimento: null,               status: 'error' },
  { id: 'syselicat',       nome: 'SYS.ELICAT',       domain: 'elicat.it',          logoStyle: 'syselicat',       tipologia: 'Accounting System',           ultimoTrasferimento: '04/05/2026 14:50', status: 'ok' },
  {
    id: 'gamma', nome: 'Gamma ENTERPRISE', domain: 'teamsystem.com', logoStyle: 'gamma',
    tipologia: 'Accounting System', ultimoTrasferimento: '04/05/2026 14:50', status: 'ok',
    details: [
      { name: 'Documenti Fiscali', detail: 'Dati non presenti', status: 'warning' },
      { name: 'Riconciliazione Passiva' },
      { name: 'Tipo Addebito' },
    ],
  },
  { id: 'sojern',    nome: 'SOJERN',     domain: 'sojern.com',     logoStyle: 'sojern',    tipologia: 'Marketing System',            ultimoTrasferimento: '04/05/2026 14:50', status: 'ok' },
  { id: 'travco',    nome: 'TRAVCO',     domain: 'travco.com',     logoStyle: 'travco',    tipologia: 'Booking engine (mirroring)',  ultimoTrasferimento: '04/05/2026 14:50', status: 'error' },
  { id: 'g2travel',  nome: 'G2 TRAVEL',  domain: 'g2travel.com',   logoStyle: 'g2travel',  tipologia: 'Booking engine (mirroring)',  ultimoTrasferimento: '04/05/2026 14:50', status: 'error' },
  { id: 'italcamel', nome: 'ITALCAMEL',  domain: 'italcamel.com',  logoStyle: 'italcamel', tipologia: 'Booking engine (mirroring)',  ultimoTrasferimento: '04/05/2026 14:50', status: 'error' },
  { id: 'avoris',    nome: 'AVORIS',     domain: 'avoristravel.com', logoStyle: 'avoris',  tipologia: 'Booking engine (mirroring)',  ultimoTrasferimento: '04/05/2026 14:50', status: 'error' },
  { id: 'agoda',     nome: 'agoda',      domain: 'agoda.com',      logoStyle: 'agoda',     tipologia: 'Booking engine (mirroring)',  ultimoTrasferimento: '04/05/2026 14:50', status: 'error' },
  { id: 'ratehawk',  nome: 'Rate Hawk',  domain: 'ratehawk.com',   logoStyle: 'ratehawk',  tipologia: 'Booking engine (mirroring)',  ultimoTrasferimento: '04/05/2026 14:50', status: 'error' },
]

export default function Interfacce({ navigate }: { navigate: (p: string) => void }) {
  const [openId, setOpenId] = useState<string | null>('gamma')

  function toggle(id: string) {
    setOpenId(prev => (prev === id ? null : id))
  }

  return (
    <div className="interfacce">
      <BtnBack />
      <PageHeader
        title="Interfacce"
        subtitle="Stato delle integrazioni con i sistemi esterni e ultimo trasferimento dati"
      />

      <div className="sib-table-wrap">
        <table className="sib-table interfacce__table">
          <thead>
            <tr>
              <th className="interfacce__th-toggle" />
              <th className="interfacce__th-name">Nome sistema</th>
              <th>Tipologia di sistema</th>
              <th>Ultimo trasferimento dati</th>
              <th className="interfacce__th-status">Stato</th>
            </tr>
          </thead>
          <tbody>
            {SISTEMI.map(s => {
              const isOpen = openId === s.id
              return (
                <React.Fragment key={s.id}>
                  <tr
                    className={'interfacce__row' + (isOpen ? ' interfacce__row--open' : '')}
                    onClick={() => toggle(s.id)}
                  >
                    <td className="interfacce__td-toggle">
                      <i className={'fa-light fa-chevron-' + (isOpen ? 'up' : 'down')} aria-hidden="true" />
                    </td>
                    <td className="interfacce__td-name">
                      <SystemLogo s={s} />
                    </td>
                    <td>{s.tipologia}</td>
                    <td className={s.ultimoTrasferimento ? '' : 'sib-cell--muted'}>
                      {s.ultimoTrasferimento ?? '–'}
                    </td>
                    <td>
                      <StatusLights status={s.status} />
                    </td>
                  </tr>
                  {isOpen && s.details && (
                    <tr className="interfacce__detail-row">
                      <td />
                      <td colSpan={4}>
                        <DetailTable details={s.details} />
                      </td>
                    </tr>
                  )}
                  {isOpen && !s.details && (
                    <tr className="interfacce__detail-row">
                      <td />
                      <td colSpan={4}>
                        <p className="interfacce__no-details">
                          Nessun dettaglio aggiuntivo per questo sistema.
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Logo dei sistemi (Clearbit + fallback testuale) ─────────────────
function SystemLogo({ s }: { s: Sistema }) {
  const [errored, setErrored] = useState(false)

  if (s.domain && !errored) {
    return (
      <span className="interfacce__logo-img-wrap">
        <img
          src={`https://logo.clearbit.com/${s.domain}?size=120`}
          alt={s.nome}
          className="interfacce__logo-img"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      </span>
    )
  }

  return (
    <span className={`interfacce__logo interfacce__logo--${s.logoStyle ?? 'default'}`}>
      {s.nome}
    </span>
  )
}

// ─── Semaforo a 3 stati ───────────────────────────────────────────────
function StatusLights({ status }: { status: Status }) {
  return (
    <span className="interfacce__lights" role="img" aria-label={`Stato: ${status}`}>
      <Tooltip text="Operativo">
        <span className={'interfacce__light interfacce__light--ok' + (status === 'ok' ? ' interfacce__light--active' : '')}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
        </span>
      </Tooltip>
      <Tooltip text="Avviso">
        <span className={'interfacce__light interfacce__light--warn' + (status === 'warning' ? ' interfacce__light--active' : '')}>
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
        </span>
      </Tooltip>
      <Tooltip text="Errore">
        <span className={'interfacce__light interfacce__light--err' + (status === 'error' ? ' interfacce__light--active' : '')}>
          <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
        </span>
      </Tooltip>
    </span>
  )
}

// ─── Sub-table dettagli ───────────────────────────────────────────────
function DetailTable({ details }: { details: SectionDetail[] }) {
  return (
    <table className="interfacce__sub-table">
      <tbody>
        {details.map((d, i) => (
          <tr key={i}>
            <td className="interfacce__sub-section">{d.name}</td>
            <td className="interfacce__sub-detail">
              {d.detail ? (
                <span className={'interfacce__sub-pill' + (d.status ? ` interfacce__sub-pill--${d.status}` : '')}>
                  {d.detail}
                </span>
              ) : (
                <span className="sib-cell--muted">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
