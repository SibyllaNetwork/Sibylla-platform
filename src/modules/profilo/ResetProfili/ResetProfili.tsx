import React, { useState, useMemo, useRef, useEffect } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import AlertBanner from '../../../core/components/AlertBanner'
import Pagination from '../../../core/components/Pagination'
import StatusBadge from '../../../core/components/StatusBadge'
import { InputField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import './ResetProfili.sass'

// ─── Tipi ─────────────────────────────────────────────────────────────────────
interface Profilo {
  id: string
  nome: string
  seed?: string             // avatar id / seed
  registrato: string        // data registrazione (vuota se mai effettuato accesso)
  email: string
  ruoli: string[]           // autorizzazioni assegnate
  attivo: boolean
  isSelf?: boolean          // profilo dell'amministratore loggato (non disattivabile)
}

// ─── Dati di esempio (in attesa del cablaggio API) ──────────────────────────────
const PROFILI_INIZIALI: Profilo[] = [
  { id: 'p1', nome: 'Mario Rossi',   seed: 'avatar-18', registrato: '23/01/2025 17:24:43', email: 'test@sibyllanetwork.com',              ruoli: ['General Manager', 'Operatore front office'], attivo: true, isSelf: true },
  { id: 'p2', nome: 'Sibylla',       seed: 'avatar-02', registrato: '',                     email: 'test_dev@sibyllanetwork.com',          ruoli: ['General Manager', 'Ruolo di test Auth'],     attivo: true },
  { id: 'p3', nome: 'Andrea Rossi',  seed: 'avatar-07', registrato: '17/03/2025 19:08:13', email: 'test_a.grimaudo@sibyllanetwork.com',   ruoli: ['General Manager'],                           attivo: true },
  { id: 'p4', nome: 'Luigi Rossi',   seed: 'avatar-11', registrato: '05/05/2025 14:29:20', email: 'test_l.rossi@sibyllanetwork.com',      ruoli: ['Operatore front office'],                    attivo: true },
  { id: 'p5', nome: 'John Smith',    seed: 'avatar-21', registrato: '22/05/2025 10:37:41', email: 'test_dfgsd@fsda.com',                  ruoli: [],                                            attivo: true },
  { id: 'p6', nome: 'Ali Aslan',     seed: 'avatar-30', registrato: '22/05/2025 14:57:02', email: 'test_alisahibamiraslan@gmail.com',     ruoli: ['test tirocinio', 'test4'],                   attivo: true },
  { id: 'p7', nome: 'test test',     seed: 'avatar-04', registrato: '22/05/2025 15:32:17', email: 'test_a.alferov@sibyllanetwork.com',    ruoli: ['General Manager', 'test4'],                   attivo: true },
  { id: 'p8', nome: 'dino tacchini', seed: 'avatar-15', registrato: '22/05/2025 16:02:37', email: 'test_h.akkari@sibyllanetwork.com',     ruoli: [],                                            attivo: true },
  { id: 'p9', nome: 'Giulia Bianchi', seed: 'avatar-05', registrato: '01/06/2025 09:12:00', email: 'test_g.bianchi@sibyllanetwork.com',   ruoli: ['Operatore front office'],                    attivo: false },
  { id: 'p10', nome: 'Marco Verdi',  seed: 'avatar-09', registrato: '02/06/2025 11:45:30', email: 'test_m.verdi@sibyllanetwork.com',      ruoli: ['General Manager'],                           attivo: true },
  { id: 'p11', nome: 'Sara Neri',    seed: 'avatar-12', registrato: '03/06/2025 08:30:10', email: 'test_s.neri@sibyllanetwork.com',       ruoli: ['test tirocinio'],                            attivo: true },
  { id: 'p12', nome: 'Paolo Gialli', seed: 'avatar-24', registrato: '04/06/2025 16:05:55', email: 'test_p.gialli@sibyllanetwork.com',     ruoli: [],                                            attivo: true },
]

// Ruoli assegnabili in fase di creazione profilo
const RUOLI_DISPONIBILI = ['General Manager', 'test tirocinio', 'test4', 'Operatore front office', 'Ruolo di test Auth']

const PAGE_SIZE = 8

// ─── Multiselect ruoli (dropdown con checkbox) ──────────────────────────────────
function RuoliMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = (r: string) =>
    onChange(value.includes(r) ? value.filter(x => x !== r) : [...value, r])

  const label = value.length === 0
    ? 'Seleziona'
    : value.length === 1 ? value[0] : `${value.length} ruoli selezionati`

  return (
    <div className="rp__ms" ref={ref}>
      <button type="button" className={`rp__ms-trigger ${open ? 'rp__ms-trigger--open' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className={value.length ? '' : 'rp__ms-placeholder'}>{label}</span>
        <i className="fa-light fa-chevron-down rp__ms-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="rp__ms-menu">
          {RUOLI_DISPONIBILI.map(r => (
            <label key={r} className="rp__ms-option">
              <input type="checkbox" className="sib-checkbox" checked={value.includes(r)} onChange={() => toggle(r)} />
              <span>{r}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResetProfili({ navigate }: { navigate: (p: string) => void }) {
  const [profili, setProfili] = useState<Profilo[]>(PROFILI_INIZIALI)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [banner, setBanner] = useState<{ type: 'success' | 'info'; msg: string } | null>(null)

  // Modali
  const [showCrea, setShowCrea] = useState(false)
  const [showInvita, setShowInvita] = useState(false)
  const [resetTarget, setResetTarget] = useState<Profilo | null>(null)
  const [disattivaTarget, setDisattivaTarget] = useState<Profilo | null>(null)

  // Form "Crea profilo"
  const [crea, setCrea] = useState({ nome: '', cognome: '', email: '', ragione: '', ruoli: [] as string[] })
  // Form "Invita impresa"
  const [invita, setInvita] = useState({ nome: '', cognome: '', email: '' })

  const flash = (type: 'success' | 'info', msg: string) => {
    setBanner({ type, msg })
    setTimeout(() => setBanner(null), 3500)
  }

  // ── Filtro + paginazione ──
  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profili
    return profili.filter(p => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [profili, search])

  const totalPages = Math.max(1, Math.ceil(filtrati.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pageStart = (pageSafe - 1) * PAGE_SIZE
  const pageItems = filtrati.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Azioni ──
  const confermaReset = () => {
    if (!resetTarget) return
    flash('success', `Procedura di reset password inviata a ${resetTarget.email}`)
    setResetTarget(null)
  }

  const confermaToggleAttivo = () => {
    if (!disattivaTarget) return
    const t = disattivaTarget
    setProfili(prev => prev.map(p => p.id === t.id ? { ...p, attivo: !p.attivo } : p))
    flash('info', t.attivo ? `Profilo "${t.nome}" disattivato` : `Profilo "${t.nome}" riattivato`)
    setDisattivaTarget(null)
  }

  const confermaCrea = () => {
    const nuovo: Profilo = {
      id: `p${Date.now()}`,
      nome: `${crea.nome} ${crea.cognome}`.trim() || crea.email,
      seed: 'avatar-18',
      registrato: '',
      email: crea.email,
      ruoli: crea.ruoli,
      attivo: true,
    }
    setProfili(prev => [nuovo, ...prev])
    setShowCrea(false)
    setCrea({ nome: '', cognome: '', email: '', ragione: '', ruoli: [] })
    flash('success', `Invito inviato a ${nuovo.email}`)
  }

  const confermaInvita = () => {
    setShowInvita(false)
    flash('success', `Invito impresa inviato a ${invita.email}`)
    setInvita({ nome: '', cognome: '', email: '' })
  }

  const creaValido = crea.email.trim() !== '' && crea.ruoli.length > 0
  const invitaValido = invita.nome.trim() !== '' && invita.email.trim() !== ''

  return (
    <div className="reset-profili">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader title="Reset profili" subtitle="Configura e controlla i profili in modo centralizzato" />

      {banner && <AlertBanner type={banner.type} className="rp__banner">{banner.msg}</AlertBanner>}

      {/* ── Barra info amministratore ─────────────────────────────────── */}
      <div className="rp__info-wrap">
        <div className="rp__info-head">
          {['Profilo', 'Azienda', 'Partita iva', 'Indirizzo', 'E-mail', 'Profilo amministratore associato'].map((h, i) => (
            <div key={i} className={`rp__info-hcell ${i < 5 ? 'rp__info-hcell--border' : ''}`}>{h}</div>
          ))}
        </div>
        <div className="rp__info-body">
          <div className="rp__info-cell rp__info-cell--border">
            <i className="fa-duotone fa-user rp__info-usericon" aria-hidden="true" />
            <span className="rp__info-bold">Mario Rossi</span>
          </div>
          <div className="rp__info-cell rp__info-cell--border">Sibylla</div>
          <div className="rp__info-cell rp__info-cell--border">80979970466</div>
          <div className="rp__info-cell rp__info-cell--border">Via del Corso 23, datidatidati, 00187, Roma RM, Italia</div>
          <div className="rp__info-cell rp__info-cell--border rp__info-link">test@sibyllanetwork.com</div>
          <div className="rp__info-cell" />
        </div>
      </div>

      {/* ── Toolbar: ricerca + azioni ─────────────────────────────────── */}
      <div className="rp__toolbar">
        <div className="rp__search">
          <InputField
            name="search"
            placeholder="Inserisci nome utente o e-mail"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            iconRight="fa-light fa-magnifying-glass"
          />
        </div>
        <div className="rp__toolbar-actions">
          <button className="sib-btn sib-btn--secondary rp__btn-icon" onClick={() => setShowInvita(true)}>
            <i className="fa-duotone fa-envelope" aria-hidden="true" /> Invita impresa
          </button>
          <button className="sib-btn sib-btn--primary" onClick={() => setShowCrea(true)}>
            Crea profilo
          </button>
        </div>
      </div>

      {/* ── Tabella profili ───────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table rp__table">
          <thead>
            <tr>
              <th>Profilo</th>
              <th>Registrato il</th>
              <th>E-mail</th>
              <th>Stato</th>
              <th>Autorizzazioni</th>
              <th className="rp__th-actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(p => (
              <tr key={p.id} className={p.attivo ? '' : 'rp__row--off'}>
                <td>
                  <div className="rp__profile">
                    <img className="rp__avatar" src={avatarUrl(p.seed || p.nome)} alt={p.nome} />
                    <strong>{p.nome}</strong>
                  </div>
                </td>
                <td className="sib-cell--muted">{p.registrato || '—'}</td>
                <td className="sib-cell--muted">{p.email}</td>
                <td>
                  {p.attivo
                    ? <StatusBadge variant="success">Attivo</StatusBadge>
                    : <StatusBadge variant="disabled">Disattivato</StatusBadge>}
                </td>
                <td>
                  {p.ruoli.length === 0 ? (
                    <span className="rp__no-role">—</span>
                  ) : (
                    <span className="rp__auth">
                      {p.ruoli[0]}
                      {p.ruoli.length > 1 && (
                        <Tooltip
                          position="top"
                          content={
                            <div className="rp__auth-tooltip">
                              <div className="rp__auth-tooltip-title">Ruoli assegnati ({p.ruoli.length})</div>
                              <ul className="rp__auth-tooltip-list">
                                {p.ruoli.map((r, i) => (
                                  <li key={i} className="rp__auth-tooltip-item">
                                    <span className="rp__auth-tooltip-bullet" />{r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          }
                        >
                          <i className="fa-duotone fa-circle-info rp__auth-ico" aria-label={`${p.ruoli.length} ruoli`} />
                        </Tooltip>
                      )}
                    </span>
                  )}
                </td>
                <td>
                  <div className="rp__actions">
                    <Tooltip text="Reset password">
                      <button type="button" className="rp__act-btn" onClick={() => setResetTarget(p)} aria-label="Reset password">
                        <i className="fa-duotone fa-key" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    {!p.isSelf && (
                      <Tooltip text={p.attivo ? 'Disattiva profilo' : 'Riattiva profilo'}>
                        <button
                          type="button"
                          className={`rp__act-btn ${p.attivo ? 'rp__act-btn--danger' : 'rp__act-btn--ok'}`}
                          onClick={() => setDisattivaTarget(p)}
                          aria-label={p.attivo ? 'Disattiva profilo' : 'Riattiva profilo'}
                        >
                          <i className={`fa-duotone ${p.attivo ? 'fa-ban' : 'fa-circle-check'}`} aria-hidden="true" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="sib-empty">Nessun profilo trovato.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rp__pager">
        <Pagination page={pageSafe} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* ── Modal: Crea profilo ───────────────────────────────────────── */}
      <Modal open={showCrea} onClose={() => setShowCrea(false)} title="Crea Profilo" size="md">
        <p className="rp__modal-sub">Invita un consulente nella tua organizzazione</p>
        <div className="rp__form">
          <div className="rp__form-grid">
            <InputField name="crea-nome" label="Nome" value={crea.nome} onChange={(e) => setCrea({ ...crea, nome: e.target.value })} />
            <InputField name="crea-cognome" label="Cognome" value={crea.cognome} onChange={(e) => setCrea({ ...crea, cognome: e.target.value })} />
            <InputField name="crea-email" label="E-mail" type="email" value={crea.email} onChange={(e) => setCrea({ ...crea, email: e.target.value })} />
            <InputField name="crea-ragione" label="Ragione sociale" value={crea.ragione} onChange={(e) => setCrea({ ...crea, ragione: e.target.value })} />
          </div>
          <div className="rp__field">
            <label className="rp__label">Definisci ruoli</label>
            <RuoliMultiSelect value={crea.ruoli} onChange={(v) => setCrea({ ...crea, ruoli: v })} />
          </div>
          <div className="rp__modal-actions">
            <button className="sib-btn sib-btn--secondary" onClick={() => setShowCrea(false)}>Annulla</button>
            <button className="sib-btn sib-btn--primary" disabled={!creaValido} onClick={confermaCrea}>Invita</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Invita impresa ─────────────────────────────────────── */}
      <Modal open={showInvita} onClose={() => setShowInvita(false)} title="Invita impresa" size="md">
        <p className="rp__modal-sub">
          Inserisci i dati di un referente e invita un nuovo Partner.<br />
          Riceverai Sibylla Token nel momento della sua registrazione.
        </p>
        <div className="rp__form">
          <div className="rp__form-grid">
            <InputField name="inv-nome" label="Nome" value={invita.nome} onChange={(e) => setInvita({ ...invita, nome: e.target.value })} />
            <InputField name="inv-cognome" label="Cognome" value={invita.cognome} onChange={(e) => setInvita({ ...invita, cognome: e.target.value })} />
          </div>
          <InputField name="inv-email" label="E-mail" type="email" value={invita.email} onChange={(e) => setInvita({ ...invita, email: e.target.value })} />
          <div className="rp__modal-actions">
            <button className="sib-btn sib-btn--secondary" onClick={() => setShowInvita(false)}>Annulla</button>
            <button className="sib-btn sib-btn--primary" disabled={!invitaValido} onClick={confermaInvita}>Invita</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: conferma reset password ────────────────────────────── */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset password" size="sm">
        <p className="rp__confirm-text">
          Verrà inviata un'e-mail a <strong>{resetTarget?.email}</strong> con la procedura di
          reimpostazione della password. L'utente sceglierà una nuova password al primo accesso.
        </p>
        <div className="rp__modal-actions">
          <button className="sib-btn sib-btn--secondary" onClick={() => setResetTarget(null)}>Annulla</button>
          <button className="sib-btn sib-btn--primary" onClick={confermaReset}>Invia reset</button>
        </div>
      </Modal>

      {/* ── Modal: conferma disattiva/riattiva ────────────────────────── */}
      <Modal open={!!disattivaTarget} onClose={() => setDisattivaTarget(null)} title={disattivaTarget?.attivo ? 'Disattiva profilo' : 'Riattiva profilo'} size="sm">
        <p className="rp__confirm-text">
          {disattivaTarget?.attivo
            ? <>Il profilo <strong>{disattivaTarget?.nome}</strong> verrà disattivato e non potrà più accedere alla piattaforma. Potrai riattivarlo in qualsiasi momento.</>
            : <>Il profilo <strong>{disattivaTarget?.nome}</strong> verrà riattivato e potrà nuovamente accedere alla piattaforma.</>}
        </p>
        <div className="rp__modal-actions">
          <button className="sib-btn sib-btn--secondary" onClick={() => setDisattivaTarget(null)}>Annulla</button>
          <button
            className={`sib-btn ${disattivaTarget?.attivo ? 'sib-btn--danger' : 'sib-btn--primary'}`}
            onClick={confermaToggleAttivo}
          >
            {disattivaTarget?.attivo ? 'Disattiva' : 'Riattiva'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
