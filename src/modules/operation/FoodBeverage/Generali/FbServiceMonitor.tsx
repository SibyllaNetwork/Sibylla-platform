// ─── Service monitor (Food & Beverage) ────────────────────────────────────────
//  I display di reparto (KDS): ogni monitor ha un indirizzo da aprire su un
//  tablet in cucina o al bar e mostra le comande da preparare. Il tema conta più
//  di quanto sembri — quei display si guardano da due metri, di fretta, con le
//  mani occupate — quindi la scheda ne mostra l'anteprima mentre lo si sceglie.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, SelectField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import {
  REPARTO_KDS, TEMI_KDS, URL_MONITOR, type MonitorKds, type RepartoKds,
} from '../fb.model'
import './FbServiceMonitor.sass'

const REPARTI = Object.keys(REPARTO_KDS) as RepartoKds[]

const slugDi = (nome: string, reparto: string) =>
  `${nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 28)}-${reparto}-${Math.random().toString(36).slice(2, 8)}`

const vuoto = (): MonitorKds => {
  const tema = TEMI_KDS[0]
  return {
    id: 0, nome: '', reparto: 'cucina', outletId: null, slug: '',
    sfondo: tema.sfondo, testo: tema.testo, griglia: tema.griglia, topbar: tema.topbar,
    attivo: true,
  }
}

export default function FbServiceMonitor({ navigate }: { navigate?: (p: string) => void }) {
  const monitor = useFbStore(s => s.monitor)
  const outlets = useFbStore(s => s.outlets)
  const comande = useFbStore(s => s.comande)
  const voci    = useFbStore(s => s.voci)
  const salva   = useFbStore(s => s.salvaMonitor)
  const elimina = useFbStore(s => s.eliminaMonitor)
  const confirm = useConfirmStore(s => s.confirm)

  const [form, setForm] = useState<MonitorKds | null>(null)

  /** Righe in lavorazione per reparto: è quello che il monitor mostrerebbe ora. */
  const inLavorazione = useMemo(() => {
    const m = new Map<RepartoKds, number>()
    comande.filter(c => c.stato === 'aperta').forEach(c => c.righe.forEach(r => {
      if (r.stato !== 'inviata' && r.stato !== 'in-preparazione') return
      const rep = voci.find(v => v.id === r.voceId)?.reparto
      if (!rep) return
      m.set(rep as RepartoKds, (m.get(rep as RepartoKds) ?? 0) + r.qta)
    }))
    return m
  }, [comande, voci])

  const copiaUrl = (m: MonitorKds) => {
    navigator.clipboard?.writeText(URL_MONITOR + m.slug)
    toast.success('Indirizzo del monitor copiato')
  }

  const chiediElimina = async (m: MonitorKds) => {
    const ok = await confirm({
      message: `Eliminare il monitor “${m.nome}”? Il display collegato smette di aggiornarsi.`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(m.id); toast.info('Monitor eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome del monitor'); return }
    salva({ ...form, slug: form.slug || slugDi(form.nome, form.reparto) })
    toast.success(form.id ? 'Monitor aggiornato' : `Monitor “${form.nome}” creato`)
    setForm(null)
  }

  return (
    <div className="fbkds">
      <PageHead
        title="Service monitor"
        subtitle="I display di reparto che mostrano le comande da preparare"
        actions={
          <button type="button" className="fbkds__head-btn" onClick={() => setForm(vuoto())}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo monitor
          </button>
        }
      />

      <p className="fbkds__nota">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        Ogni monitor ha un indirizzo da aprire su un display in reparto: la pagina si
        aggiorna da sola e mostra le comande attive di quell’outlet.
      </p>

      <div className="fbkds__griglia">
        {monitor.map(m => {
          const o = m.outletId ? outlets.find(x => x.id === m.outletId) : null
          const attese = inLavorazione.get(m.reparto) ?? 0
          return (
            <article
              key={m.id} className="fbkds__card"
              style={{ '--sfondo': m.sfondo, '--testo': m.testo, '--topbar': m.topbar, '--griglia': m.griglia } as React.CSSProperties}
            >
              <header className="fbkds__card-head">
                <div>
                  <h3><TruncatedText text={m.nome} /></h3>
                  <p>
                    <i className={`fa-solid ${REPARTO_KDS[m.reparto].ico}`} aria-hidden="true" />
                    {REPARTO_KDS[m.reparto].label} · {o?.nome ?? 'Tutti gli outlet'}
                  </p>
                </div>
                <Tooltip text={attese ? `${attese} portate in lavorazione ora` : 'Nessuna portata in lavorazione'}>
                  <span className="fbkds__card-n">{attese}</span>
                </Tooltip>
              </header>

              <div className="fbkds__card-riga">
                <button
                  type="button"
                  className={`fbkds__stato ${m.attivo ? 'is-on' : ''}`}
                  aria-pressed={m.attivo}
                  onClick={() => salva({ ...m, attivo: !m.attivo })}
                >
                  {m.attivo ? 'Attivo' : 'Spento'}
                </button>
                <button type="button" aria-label="Modifica il monitor" onClick={() => setForm({ ...m })}>
                  <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                </button>
                <button type="button" aria-label="Elimina il monitor" onClick={() => chiediElimina(m)}>
                  <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                </button>
              </div>

              <div className="fbkds__url">
                <span className="fbkds__url-lab">Indirizzo del display</span>
                <code>{URL_MONITOR}{m.slug}</code>
                <div className="fbkds__url-act">
                  <button type="button" onClick={() => copiaUrl(m)} aria-label="Copia l’indirizzo">
                    <Tooltip text="Copia"><i className="fa-solid fa-copy" /></Tooltip>
                  </button>
                  <button
                    type="button" aria-label="Apri il monitor"
                    onClick={() => toast.info('Il monitor si apre sul display di reparto')}
                  >
                    <Tooltip text="Apri"><i className="fa-solid fa-arrow-up-right-from-square" /></Tooltip>
                  </button>
                </div>
              </div>
            </article>
          )
        })}

        {!monitor.length && (
          <div className="fbkds__vuoto">
            <i className="fa-solid fa-display" aria-hidden="true" />
            <p>Nessun monitor configurato.</p>
          </div>
        )}
      </div>

      {/* ── Scheda del monitor ────────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Monitor — ${form.nome}` : 'Nuovo monitor di reparto'}
        size="lg"
      >
        {form && (
          <div className="fbkds-form">
            <div className="fbkds-form__row">
              <InputField
                name="nome" label="Nome monitor" className="fbkds-form__grow" value={form.nome}
                placeholder="es. Monitor cucina principale"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <SelectField
                name="reparto" label="Reparto" value={form.reparto}
                options={REPARTI.map(r => ({ value: r, label: REPARTO_KDS[r].label }))}
                onChange={e => setForm(f => f && ({ ...f, reparto: e.target.value as RepartoKds }))}
              />
              <SelectField
                name="outlet" label="Outlet" value={form.outletId ?? ''}
                options={[{ value: '', label: 'Tutti' }, ...outlets.map(o => ({ value: o.id, label: o.nome }))]}
                onChange={e => setForm(f => f && ({ ...f, outletId: e.target.value ? +e.target.value : null }))}
              />
            </div>

            <div className="fbkds-form__tema">
              <div className="fbkds-form__blk">
                <span className="fbkds-form__lab">Tema del display</span>
                <div className="fbkds-form__temi">
                  {TEMI_KDS.map(t => (
                    <Tooltip key={t.id} text={t.nome}>
                      <button
                        type="button"
                        className={`fbkds-form__tema-btn ${form.sfondo === t.sfondo ? 'is-on' : ''}`}
                        style={{ '--sfondo': t.sfondo, '--testo': t.testo } as React.CSSProperties}
                        aria-label={`Tema ${t.nome}`}
                        onClick={() => setForm(f => f && ({
                          ...f, sfondo: t.sfondo, testo: t.testo, griglia: t.griglia, topbar: t.topbar,
                        }))}
                      >A</button>
                    </Tooltip>
                  ))}
                </div>

                <div className="fbkds-form__row">
                  <InputField
                    name="sfondo" label="Sfondo" value={form.sfondo}
                    onChange={e => setForm(f => f && ({ ...f, sfondo: e.target.value }))}
                  />
                  <InputField
                    name="testo" label="Testo" value={form.testo}
                    onChange={e => setForm(f => f && ({ ...f, testo: e.target.value }))}
                  />
                </div>
                <div className="fbkds-form__row">
                  <InputField
                    name="griglia" label="Card della comanda" value={form.griglia}
                    onChange={e => setForm(f => f && ({ ...f, griglia: e.target.value }))}
                  />
                  <InputField
                    name="topbar" label="Barra in alto" value={form.topbar}
                    onChange={e => setForm(f => f && ({ ...f, topbar: e.target.value }))}
                  />
                </div>
              </div>

              {/* Anteprima del display, così come lo vede la cucina */}
              <div className="fbkds-form__ant">
                <span className="fbkds-form__lab">Anteprima</span>
                <div
                  className="fbkds-form__display"
                  style={{ '--sfondo': form.sfondo, '--testo': form.testo, '--topbar': form.topbar, '--griglia': form.griglia } as React.CSSProperties}
                >
                  <header>
                    <span>{(form.nome || 'MONITOR').toUpperCase()}</span>
                    <span>00:00</span>
                  </header>
                  <div className="fbkds-form__display-body">
                    <div className="fbkds-form__card-ex">
                      <strong>T.001</strong>
                      <span>2× Carbonara</span>
                      <span>1× Bistecca</span>
                    </div>
                    <div className="fbkds-form__card-ex">
                      <strong>T.004</strong>
                      <span>3× Bruschetta</span>
                    </div>
                  </div>
                  <footer>{REPARTO_KDS[form.reparto].label}</footer>
                </div>
              </div>
            </div>

            <label className="fbkds-form__flag">
              <input
                type="checkbox" className="sib-checkbox" checked={form.attivo}
                onChange={e => setForm(f => f && ({ ...f, attivo: e.target.checked }))}
              />
              Monitor attivo
            </label>

            <footer className="fbkds-form__foot">
              <button type="button" className="fbkds-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbkds-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Salva
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
