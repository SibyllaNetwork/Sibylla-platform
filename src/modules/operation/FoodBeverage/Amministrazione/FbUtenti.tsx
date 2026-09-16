// ─── Utenti (Food & Beverage) ─────────────────────────────────────────────────
//  Chi entra nella sezione e con quale ruolo. Lo stato si commuta dalla riga —
//  sospendere un accesso è l'operazione che si fa di corsa, quando qualcuno
//  lascia il servizio — mentre la scheda serve per creare e per reimpostare la
//  password.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, SelectField, SearchField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import type { UtenteFb } from '../fb.model'
import './FbUtenti.sass'

const iniziali = (nome: string) =>
  nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

const fmtAccesso = (s: string) => {
  if (!s) return 'mai'
  const [data, ora] = s.split('T')
  return `${new Date(data + 'T12:00:00').toLocaleDateString('it-IT')}${ora ? `, ${ora}` : ''}`
}

const vuoto = (): UtenteFb => ({
  id: 0, nome: '', username: '', email: '', ruoloId: null, attivo: true, ultimoAccesso: '',
})

export default function FbUtenti({ navigate }: { navigate?: (p: string) => void }) {
  const utenti  = useFbStore(s => s.utenti)
  const ruoli   = useFbStore(s => s.ruoli)
  const salva   = useFbStore(s => s.salvaUtente)
  const elimina = useFbStore(s => s.eliminaUtente)
  const confirm = useConfirmStore(s => s.confirm)

  const [cerca, setCerca] = useState('')
  const [form, setForm]   = useState<UtenteFb | null>(null)
  const [nuovo, setNuovo] = useState(false)
  const [password, setPassword] = useState('')

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return utenti.filter(u => !q
      || u.nome.toLowerCase().includes(q)
      || u.username.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q))
  }, [utenti, cerca])

  const chiediElimina = async (u: UtenteFb) => {
    const ok = await confirm({
      message: `Eliminare l’utente “${u.nome}”? Perde subito l’accesso alla sezione.`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(u.id); toast.info('Utente eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim() || !form.username.trim()) { toast.warning('Servono nome e nome utente'); return }
    if (nuovo && !password.trim()) { toast.warning('Imposta una password per il nuovo utente'); return }
    if (nuovo && utenti.some(u => u.username === form.username.trim())) {
      toast.warning('Questo nome utente è già in uso')
      return
    }
    salva({ ...form, username: form.username.trim() })
    toast.success(nuovo
      ? `Utente “${form.nome}” creato`
      : password.trim() ? 'Utente aggiornato e password reimpostata' : 'Utente aggiornato')
    setForm(null); setPassword('')
  }

  return (
    <div className="fbut">
      <PageHead
        title="Utenti"
        subtitle="Chi accede alla sezione Food & Beverage e con quale ruolo"
        actions={
          <div className="fbut__head-acts">
            <button type="button" className="fbut__head-btn" onClick={() => navigate?.('fb-ruoli')}>
              <i className="fa-solid fa-shield-halved" aria-hidden="true" /> Ruoli e permessi
            </button>
            <button
              type="button" className="fbut__head-btn fbut__head-btn--go"
              onClick={() => { setForm(vuoto()); setNuovo(true); setPassword('') }}
            >
              <i className="fa-solid fa-user-plus" aria-hidden="true" /> Nuovo utente
            </button>
          </div>
        }
      />

      <FilterToolbar className="fbut__bar">
        <div className="fbut__cerca">
          <span className="fbut__cerca-lab">Cerca</span>
          <SearchField
            name="cerca" value={cerca} placeholder="Nome, utente o e-mail…"
            onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')}
          />
        </div>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table fbut__table">
          <colgroup>
            <col className="fbut__c-nome" /><col className="fbut__c-mail" />
            <col className="fbut__c-ruolo" /><col className="fbut__c-stato" />
            <col className="fbut__c-acc" /><col className="fbut__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Utente</th>
              <th>E-mail</th>
              <th>Ruolo</th>
              <th>Stato</th>
              <th>Ultimo accesso</th>
              <th className="fbut__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(u => {
              const r = ruoli.find(x => x.id === u.ruoloId)
              return (
                <tr key={u.id} className={u.attivo ? '' : 'is-off'}>
                  <td>
                    <span className="fbut__chi">
                      <span className="fbut__avatar">{iniziali(u.nome || u.username)}</span>
                      <span className="fbut__chi-txt">
                        <TruncatedText text={u.nome} />
                        <em>@{u.username}</em>
                      </span>
                    </span>
                  </td>
                  <td><TruncatedText text={u.email || '—'} /></td>
                  <td>
                    {r ? (
                      <span className={`fbut__ruolo ${r.admin ? 'is-admin' : ''}`}>
                        <TruncatedText text={r.nome} />
                      </span>
                    ) : <span className="fbut__nessuno">nessun ruolo</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`fbut__stato ${u.attivo ? 'is-on' : ''}`}
                      aria-pressed={u.attivo}
                      onClick={() => salva({ ...u, attivo: !u.attivo })}
                    >
                      {u.attivo ? 'Attivo' : 'Sospeso'}
                    </button>
                  </td>
                  <td className="fbut__acc">{fmtAccesso(u.ultimoAccesso)}</td>
                  <td className="fbut__act">
                    <button
                      type="button" aria-label="Modifica l’utente"
                      onClick={() => { setForm({ ...u }); setNuovo(false); setPassword('') }}
                    >
                      <Tooltip text="Modifica o reimposta la password"><i className="fa-solid fa-pen" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Elimina l’utente" onClick={() => chiediElimina(u)}>
                      <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!righe.length && (
              <tr><td colSpan={6} className="fbut__vuoto">Nessun utente con questa ricerca.</td></tr>
            )}
          </tbody>
          {!!righe.length && (
            <tfoot>
              <tr className="fbut__tot">
                <td colSpan={3}>{righe.length} utenti · {righe.filter(u => u.attivo).length} attivi</td>
                <td colSpan={3} className="fbut__tot-nota">
                  lo stato si commuta dal badge, la password si reimposta dalla scheda
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal
        open={!!form}
        onClose={() => { setForm(null); setPassword('') }}
        title={nuovo ? 'Nuovo utente' : `Utente — ${form?.nome ?? ''}`}
        size="md"
      >
        {form && (
          <div className="fbut-form">
            <div className="fbut-form__row">
              <InputField
                name="nome" label="Nome completo" className="fbut-form__grow" value={form.nome}
                placeholder="Mario Rossi"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <InputField
                name="username" label="Nome utente" value={form.username}
                placeholder="mario.rossi"
                onChange={e => setForm(f => f && ({ ...f, username: e.target.value }))}
              />
            </div>

            <InputField
              name="email" label="E-mail" type="email" value={form.email}
              onChange={e => setForm(f => f && ({ ...f, email: e.target.value }))}
            />

            <SelectField
              name="ruolo" label="Ruolo" value={form.ruoloId ?? ''}
              options={[{ value: '', label: 'Nessun ruolo' }, ...ruoli.map(r => ({ value: r.id, label: r.nome }))]}
              onChange={e => setForm(f => f && ({ ...f, ruoloId: e.target.value ? +e.target.value : null }))}
            />

            <InputField
              name="password"
              label={nuovo ? 'Password' : 'Nuova password (vuoto = invariata)'}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <label className="fbut-form__flag">
              <input
                type="checkbox" className="sib-checkbox" checked={form.attivo}
                onChange={e => setForm(f => f && ({ ...f, attivo: e.target.checked }))}
              />
              Accesso attivo
            </label>

            <footer className="fbut-form__foot">
              <button type="button" className="fbut-form__annulla" onClick={() => { setForm(null); setPassword('') }}>Annulla</button>
              <button type="button" className="fbut-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {nuovo ? 'Crea l’utente' : 'Salva'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
