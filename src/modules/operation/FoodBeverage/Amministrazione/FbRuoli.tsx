// ─── Ruoli e permessi (Food & Beverage) ───────────────────────────────────────
//  Cosa vede ciascun ruolo, pagina per pagina. Il permesso ha tre livelli e si
//  cambia con un tocco che li fa ruotare (nascosta → sola lettura → completa):
//  su venti pagine, tre select per riga sarebbero venti menu da aprire.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, TextareaField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import {
  LIVELLO_PERMESSO, PAGINE_PERMESSI, type LivelloPermesso, type RuoloFb,
} from '../fb.model'
import './FbRuoli.sass'

const GIRO: LivelloPermesso[] = ['nascosta', 'lettura', 'completa']

const vuoto = (): RuoloFb => ({
  id: 0, nome: '', descrizione: '', admin: false,
  permessi: Object.fromEntries(
    PAGINE_PERMESSI.flatMap(g => g.pagine.map(p => [p.id, 'nascosta' as LivelloPermesso])),
  ),
})

export default function FbRuoli({ navigate }: { navigate?: (p: string) => void }) {
  const ruoli   = useFbStore(s => s.ruoli)
  const utenti  = useFbStore(s => s.utenti)
  const salva   = useFbStore(s => s.salvaRuolo)
  const elimina = useFbStore(s => s.eliminaRuolo)
  const confirm = useConfirmStore(s => s.confirm)

  const [selId, setSelId] = useState<number | null>(ruoli[0]?.id ?? null)
  const [form, setForm]   = useState<RuoloFb | null>(null)

  const ruolo = ruoli.find(r => r.id === selId)

  const conteggi = useMemo(() => {
    if (!ruolo) return { completa: 0, lettura: 0, nascosta: 0 }
    const tutte = PAGINE_PERMESSI.flatMap(g => g.pagine)
    return tutte.reduce((a, p) => {
      const l = ruolo.admin ? 'completa' : (ruolo.permessi[p.id] ?? 'nascosta')
      return { ...a, [l]: a[l] + 1 }
    }, { completa: 0, lettura: 0, nascosta: 0 } as Record<LivelloPermesso, number>)
  }, [ruolo])

  /** Un tocco fa ruotare il livello: nascosta → lettura → completa → nascosta. */
  const ruota = (pagina: string) => {
    if (!ruolo || ruolo.admin) return
    const ora = ruolo.permessi[pagina] ?? 'nascosta'
    const next = GIRO[(GIRO.indexOf(ora) + 1) % GIRO.length]
    salva({ ...ruolo, permessi: { ...ruolo.permessi, [pagina]: next } })
  }

  const impostaTutto = (l: LivelloPermesso) => {
    if (!ruolo || ruolo.admin) return
    salva({
      ...ruolo,
      permessi: Object.fromEntries(PAGINE_PERMESSI.flatMap(g => g.pagine.map(p => [p.id, l]))),
    })
    toast.info(`Tutte le pagine impostate su “${LIVELLO_PERMESSO[l].label.toLowerCase()}”`)
  }

  const impostaGruppo = (gruppo: string, l: LivelloPermesso) => {
    if (!ruolo || ruolo.admin) return
    const pagine = PAGINE_PERMESSI.find(g => g.gruppo === gruppo)?.pagine ?? []
    salva({
      ...ruolo,
      permessi: { ...ruolo.permessi, ...Object.fromEntries(pagine.map(p => [p.id, l])) },
    })
  }

  const chiediElimina = async (r: RuoloFb) => {
    const n = utenti.filter(u => u.ruoloId === r.id).length
    const ok = await confirm({
      message: n
        ? `Eliminare il ruolo “${r.nome}”? ${n} ${n === 1 ? 'utente resta' : 'utenti restano'} senza ruolo.`
        : `Eliminare il ruolo “${r.nome}”?`,
      confirmLabel: 'Elimina',
    })
    if (ok) {
      elimina(r.id)
      if (selId === r.id) setSelId(ruoli.find(x => x.id !== r.id)?.id ?? null)
      toast.info('Ruolo eliminato')
    }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome del ruolo'); return }
    salva(form)
    toast.success(form.id ? 'Ruolo aggiornato' : `Ruolo “${form.nome}” creato`)
    setForm(null)
  }

  return (
    <div className="fbruoli">
      <PageHead
        title="Ruoli e permessi"
        subtitle="Cosa vede ciascun ruolo, pagina per pagina"
        actions={
          <div className="fbruoli__head-acts">
            <button type="button" className="fbruoli__head-btn" onClick={() => navigate?.('fb-utenti')}>
              <i className="fa-solid fa-users-gear" aria-hidden="true" /> Utenti
            </button>
            <button
              type="button" className="fbruoli__head-btn fbruoli__head-btn--go"
              onClick={() => setForm(vuoto())}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo ruolo
            </button>
          </div>
        }
      />

      <div className="fbruoli__body">
        {/* ── Ruoli configurati ─────────────────────────────────────────────── */}
        <aside className="fbruoli__lista">
          <header className="fbruoli__lista-head">
            <h3>Ruoli configurati</h3>
            <span>{ruoli.length}</span>
          </header>
          <ul>
            {ruoli.map(r => {
              const n = utenti.filter(u => u.ruoloId === r.id).length
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`fbruoli__voce ${selId === r.id ? 'is-on' : ''}`}
                    onClick={() => setSelId(r.id)}
                  >
                    <span className="fbruoli__voce-nome">
                      {r.admin && <i className="fa-solid fa-shield-halved" aria-hidden="true" />}
                      <TruncatedText text={r.nome} />
                    </span>
                    <span className="fbruoli__voce-sotto">
                      {r.admin ? 'accesso completo' : `${n} ${n === 1 ? 'utente' : 'utenti'}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* ── Permessi del ruolo scelto ─────────────────────────────────────── */}
        <section className="fbruoli__perm">
          {!ruolo && (
            <div className="fbruoli__vuoto">
              <i className="fa-solid fa-hand-pointer" aria-hidden="true" />
              <p>Scegli un ruolo dall’elenco per vederne i permessi.</p>
            </div>
          )}

          {ruolo && (
            <>
              <header className="fbruoli__perm-head">
                <div className="fbruoli__perm-tit">
                  <h3><TruncatedText text={ruolo.nome} /></h3>
                  <p><TruncatedText text={ruolo.descrizione || 'Nessuna descrizione'} /></p>
                </div>
                <div className="fbruoli__perm-act">
                  <button type="button" onClick={() => setForm({ ...ruolo })}>
                    <Tooltip text="Modifica nome e descrizione"><i className="fa-solid fa-pen" /></Tooltip>
                  </button>
                  <button type="button" onClick={() => chiediElimina(ruolo)} disabled={ruolo.admin}>
                    <Tooltip text={ruolo.admin ? 'Il ruolo amministratore non si elimina' : 'Elimina'}>
                      <i className="fa-solid fa-trash" />
                    </Tooltip>
                  </button>
                </div>
              </header>

              {ruolo.admin ? (
                <p className="fbruoli__admin">
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                  È il ruolo amministratore: vede e modifica tutto, i permessi per pagina non si applicano.
                </p>
              ) : (
                <div className="fbruoli__sommario">
                  {(['completa', 'lettura', 'nascosta'] as LivelloPermesso[]).map(l => (
                    <span key={l} className="fbruoli__somma" data-livello={l}>
                      <strong>{conteggi[l]}</strong> {LIVELLO_PERMESSO[l].label.toLowerCase()}
                    </span>
                  ))}
                  <div className="fbruoli__tutto">
                    <span>Imposta tutto</span>
                    {GIRO.map(l => (
                      <button key={l} type="button" data-livello={l} onClick={() => impostaTutto(l)}>
                        <i className={`fa-solid ${LIVELLO_PERMESSO[l].ico}`} aria-hidden="true" />
                        {LIVELLO_PERMESSO[l].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="fbruoli__gruppi">
                {PAGINE_PERMESSI.map(g => (
                  <section key={g.gruppo} className="fbruoli__gruppo">
                    <header>
                      <h4>{g.gruppo}</h4>
                      {!ruolo.admin && (
                        <div className="fbruoli__gruppo-act">
                          {GIRO.map(l => (
                            <Tooltip key={l} text={`Tutto il gruppo su “${LIVELLO_PERMESSO[l].label.toLowerCase()}”`}>
                              <button type="button" data-livello={l} onClick={() => impostaGruppo(g.gruppo, l)}>
                                <i className={`fa-solid ${LIVELLO_PERMESSO[l].ico}`} aria-hidden="true" />
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </header>
                    <ul>
                      {g.pagine.map(p => {
                        const l: LivelloPermesso = ruolo.admin ? 'completa' : (ruolo.permessi[p.id] ?? 'nascosta')
                        return (
                          <li key={p.id}>
                            <span className="fbruoli__pagina"><TruncatedText text={p.label} /></span>
                            <Tooltip text={ruolo.admin ? 'Accesso completo per il ruolo amministratore' : 'Tocca per cambiare livello'}>
                              <button
                                type="button"
                                className="fbruoli__livello"
                                data-livello={l}
                                disabled={ruolo.admin}
                                onClick={() => ruota(p.id)}
                              >
                                <i className={`fa-solid ${LIVELLO_PERMESSO[l].ico}`} aria-hidden="true" />
                                {LIVELLO_PERMESSO[l].label}
                              </button>
                            </Tooltip>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Ruolo — ${form.nome}` : 'Nuovo ruolo'}
        size="md"
      >
        {form && (
          <div className="fbruoli-form">
            <InputField
              name="nome" label="Nome del ruolo" value={form.nome}
              placeholder="es. Cameriere"
              onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
            />
            <TextareaField
              name="descrizione" label="Descrizione" rows={2} value={form.descrizione}
              placeholder="Cosa può fare chi ha questo ruolo"
              onChange={e => setForm(f => f && ({ ...f, descrizione: e.target.value }))}
            />
            <label className="fbruoli-form__flag">
              <input
                type="checkbox" className="sib-checkbox" checked={form.admin}
                onChange={e => setForm(f => f && ({ ...f, admin: e.target.checked }))}
              />
              Ruolo amministratore <em>— accesso completo, i permessi per pagina non si applicano</em>
            </label>

            <footer className="fbruoli-form__foot">
              <button type="button" className="fbruoli-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbruoli-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Crea il ruolo'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
