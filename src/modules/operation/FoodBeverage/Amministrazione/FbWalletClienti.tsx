// ─── Wallet clienti (Food & Beverage) ─────────────────────────────────────────
//  La carta monetica nominativa: si ricarica e si scala al tavolo inquadrando il
//  QR. Tre colonne — chi, quanto ha, cosa ha fatto — perché la domanda che si fa
//  al bancone è sempre la stessa: «questo cliente quanto ha ancora?».
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import {
  InputField, SelectField, SearchField, DatePickerField, NumCell,
} from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import {
  saldoWallet, type MovimentoWallet, type TipoMovimentoWallet, type WalletCliente,
} from '../fb.model'
import './FbWalletClienti.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const fmtData = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '—'

const TIPI: Array<{ id: TipoMovimentoWallet; label: string; ico: string; segno: 1 | -1 }> = [
  { id: 'ricarica', label: 'Ricarica', ico: 'fa-plus',           segno: 1 },
  { id: 'consumo',  label: 'Consumo',  ico: 'fa-utensils',       segno: -1 },
  { id: 'rimborso', label: 'Rimborso', ico: 'fa-rotate-left',    segno: 1 },
  { id: 'omaggio',  label: 'Omaggio',  ico: 'fa-gift',           segno: 1 },
]

const vuoto = (): WalletCliente => ({
  id: 0, nome: '', email: '', telefono: '', categoriaClienteId: null,
  scadenza: '', attivo: true, movimenti: [],
})

export default function FbWalletClienti({ navigate }: { navigate?: (p: string) => void }) {
  const wallet    = useFbStore(s => s.wallet)
  const categorie = useFbStore(s => s.categorieCliente)
  const salva     = useFbStore(s => s.salvaWallet)
  const elimina   = useFbStore(s => s.eliminaWallet)
  const aggiungi  = useFbStore(s => s.aggiungiMovimento)
  const confirm   = useConfirmStore(s => s.confirm)

  const [cerca, setCerca] = useState('')
  const [selId, setSelId] = useState<number | null>(wallet[0]?.id ?? null)
  const [form, setForm]   = useState<WalletCliente | null>(null)
  // Movimento in inserimento sul wallet scelto
  const [mov, setMov] = useState<{ tipo: TipoMovimentoWallet; importo: number; causale: string } | null>(null)

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return wallet.filter(w => !q || w.nome.toLowerCase().includes(q) || w.email.toLowerCase().includes(q))
  }, [wallet, cerca])

  const scelto = wallet.find(w => w.id === selId)
  const movimenti = useMemo(
    () => scelto ? [...scelto.movimenti].sort((a, b) => b.data.localeCompare(a.data)) : [],
    [scelto],
  )

  const chiediElimina = async (w: WalletCliente) => {
    const saldo = saldoWallet(w)
    const ok = await confirm({
      message: saldo > 0
        ? `Eliminare il wallet di ${w.nome}? Ha ancora ${euro(saldo)} di credito.`
        : `Eliminare il wallet di ${w.nome}?`,
      confirmLabel: 'Elimina',
    })
    if (ok) {
      elimina(w.id)
      if (selId === w.id) setSelId(wallet.find(x => x.id !== w.id)?.id ?? null)
      toast.info('Wallet eliminato')
    }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome del cliente'); return }
    salva(form)
    toast.success(form.id ? 'Wallet aggiornato' : `Wallet di ${form.nome} creato`)
    setForm(null)
  }

  const registraMovimento = () => {
    if (!scelto || !mov) return
    if (!mov.importo) { toast.warning('Indica un importo'); return }
    const saldo = saldoWallet(scelto)
    if (mov.tipo === 'consumo' && mov.importo > saldo) {
      toast.warning(`Il credito disponibile è ${euro(saldo)}`)
      return
    }
    aggiungi(scelto.id, {
      data: new Date().toISOString().slice(0, 10),
      tipo: mov.tipo,
      importo: mov.importo,
      causale: mov.causale || TIPI.find(t => t.id === mov.tipo)!.label,
    })
    toast.success(`${TIPI.find(t => t.id === mov.tipo)!.label} di ${euro(mov.importo)} registrata`)
    setMov(null)
  }

  return (
    <div className="fbwc">
      <PageHead
        title="Wallet clienti"
        subtitle="La carta monetica nominativa: si ricarica e si scala al tavolo"
        actions={
          <div className="fbwc__head-acts">
            <button type="button" className="fbwc__head-btn" onClick={() => navigate?.('fb-mobile-wallet')}>
              <i className="fa-solid fa-mobile-screen" aria-hidden="true" /> Mobile wallet
            </button>
            <button type="button" className="fbwc__head-btn fbwc__head-btn--go" onClick={() => setForm(vuoto())}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo wallet
            </button>
          </div>
        }
      />

      <div className="fbwc__body">
        {/* ── Clienti ───────────────────────────────────────────────────────── */}
        <aside className="fbwc__lista">
          <div className="fbwc__cerca">
            <SearchField
              name="cerca" value={cerca} placeholder="Cerca cliente…"
              onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')}
            />
          </div>
          <ul>
            {righe.map(w => {
              const cat = categorie.find(c => c.id === w.categoriaClienteId)
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    className={`fbwc__voce ${selId === w.id ? 'is-on' : ''}`}
                    onClick={() => { setSelId(w.id); setMov(null) }}
                  >
                    <span className="fbwc__voce-nome"><TruncatedText text={w.nome} /></span>
                    <span className="fbwc__voce-mail"><TruncatedText text={w.email || w.telefono || '—'} /></span>
                    <span className="fbwc__voce-riga">
                      {cat && <em className="fbwc__voce-cat">{cat.nome}{cat.scontoPerc ? ` −${cat.scontoPerc}%` : ''}</em>}
                      <strong className="fbwc__voce-saldo">{euro(saldoWallet(w))}</strong>
                    </span>
                  </button>
                </li>
              )
            })}
            {!righe.length && <li className="fbwc__vuoto-lista">Nessun cliente trovato.</li>}
          </ul>
        </aside>

        {/* ── Credito ───────────────────────────────────────────────────────── */}
        <section className="fbwc__carta">
          {!scelto && (
            <div className="fbwc__vuoto">
              <i className="fa-solid fa-id-card" aria-hidden="true" />
              <p>Scegli un cliente per vederne il credito.</p>
            </div>
          )}

          {scelto && (
            <>
              <div className="fbwc__tessera">
                <header>
                  <span>Wallet Sibylla</span>
                  <i className="fa-solid fa-qrcode" aria-hidden="true" />
                </header>
                <strong className="fbwc__saldo">{euro(saldoWallet(scelto))}</strong>
                <span className="fbwc__intestatario"><TruncatedText text={scelto.nome} /></span>
                <footer>
                  <span>{scelto.scadenza ? `Scade il ${fmtData(scelto.scadenza)}` : 'Senza scadenza'}</span>
                  <span className={scelto.attivo ? 'is-on' : ''}>{scelto.attivo ? 'Attivo' : 'Sospeso'}</span>
                </footer>
              </div>

              <div className="fbwc__azioni">
                {TIPI.map(t => (
                  <button
                    key={t.id} type="button"
                    className={`fbwc__azione ${mov?.tipo === t.id ? 'is-on' : ''}`}
                    onClick={() => setMov({ tipo: t.id, importo: 0, causale: '' })}
                  >
                    <i className={`fa-solid ${t.ico}`} aria-hidden="true" /> {t.label}
                  </button>
                ))}
              </div>

              {mov && (
                <div className="fbwc__mov">
                  <div className="fbwc__mov-riga">
                    <div className="fbwc__mov-imp">
                      <span className="fbwc__lab">Importo</span>
                      <NumCell
                        className="sib-input fbwc__mov-in" min={0} decimals={2} value={mov.importo}
                        aria-label="Importo del movimento"
                        onChange={n => setMov(m => m && ({ ...m, importo: n }))}
                      />
                    </div>
                    <InputField
                      name="causale" label="Causale" className="fbwc__mov-causale" value={mov.causale}
                      placeholder={TIPI.find(t => t.id === mov.tipo)!.label}
                      onChange={e => setMov(m => m && ({ ...m, causale: e.target.value }))}
                    />
                  </div>
                  <div className="fbwc__mov-foot">
                    <button type="button" className="fbwc__mov-annulla" onClick={() => setMov(null)}>Annulla</button>
                    <button type="button" className="fbwc__mov-ok" onClick={registraMovimento}>
                      <i className="fa-solid fa-check" aria-hidden="true" /> Registra
                    </button>
                  </div>
                </div>
              )}

              <div className="fbwc__scheda">
                <button type="button" onClick={() => setForm({ ...scelto })}>
                  <i className="fa-solid fa-pen" aria-hidden="true" /> Modifica il cliente
                </button>
                <button type="button" onClick={() => toast.success(`QR del wallet inviato a ${scelto.email || 'il cliente'}`)}>
                  <i className="fa-solid fa-envelope" aria-hidden="true" /> Invia il QR
                </button>
                <button type="button" className="fbwc__scheda--danger" onClick={() => chiediElimina(scelto)}>
                  <i className="fa-solid fa-trash" aria-hidden="true" /> Elimina
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── Movimenti ─────────────────────────────────────────────────────── */}
        <section className="fbwc__storico">
          <header className="fbwc__storico-head">
            <h3>Storico dei movimenti</h3>
            {scelto && <span>{movimenti.length} movimenti</span>}
          </header>

          {!scelto ? (
            <div className="fbwc__vuoto">
              <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
              <p>Scegli un wallet per vederne i movimenti.</p>
            </div>
          ) : (
            <div className="sib-table-wrap">
              <table className="sib-table fbwc__table">
                <colgroup>
                  <col className="fbwc__c-data" /><col className="fbwc__c-tipo" />
                  <col className="fbwc__c-causale" /><col className="fbwc__c-imp" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Causale</th>
                    <th className="fbwc__amt">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimenti.map((m: MovimentoWallet) => {
                    const t = TIPI.find(x => x.id === m.tipo)!
                    return (
                      <tr key={m.id}>
                        <td className="fbwc__data">{fmtData(m.data)}</td>
                        <td>
                          <span className="fbwc__tipo" data-tipo={m.tipo}>
                            <i className={`fa-solid ${t.ico}`} aria-hidden="true" /> {t.label}
                          </span>
                        </td>
                        <td><TruncatedText text={m.causale} /></td>
                        <td className={`fbwc__amt ${t.segno < 0 ? 'is-meno' : 'is-piu'}`}>
                          {t.segno < 0 ? '−' : '+'}{euro(m.importo)}
                        </td>
                      </tr>
                    )
                  })}
                  {!movimenti.length && (
                    <tr><td colSpan={4} className="fbwc__vuoto-riga">Nessun movimento su questo wallet.</td></tr>
                  )}
                </tbody>
                {!!movimenti.length && (
                  <tfoot>
                    <tr className="fbwc__tot">
                      <td colSpan={3}>Credito disponibile</td>
                      <td className="fbwc__amt">{euro(saldoWallet(scelto))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Scheda cliente ────────────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Wallet — ${form.nome}` : 'Nuovo wallet cliente'}
        size="md"
      >
        {form && (
          <div className="fbwc-form">
            <InputField
              name="nome" label="Cliente" value={form.nome}
              placeholder="Cognome e nome"
              onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
            />
            <div className="fbwc-form__row">
              <InputField
                name="email" label="E-mail" type="email" className="fbwc-form__grow" value={form.email}
                onChange={e => setForm(f => f && ({ ...f, email: e.target.value }))}
              />
              <InputField
                name="telefono" label="Telefono" value={form.telefono}
                onChange={e => setForm(f => f && ({ ...f, telefono: e.target.value }))}
              />
            </div>
            <div className="fbwc-form__row">
              <SelectField
                name="categoria" label="Categoria cliente" value={form.categoriaClienteId ?? ''}
                options={[{ value: '', label: 'Nessuna' }, ...categorie.map(c => ({ value: c.id, label: c.nome }))]}
                onChange={e => setForm(f => f && ({ ...f, categoriaClienteId: e.target.value ? +e.target.value : null }))}
              />
              <DatePickerField
                name="scadenza" label="Scadenza del credito" value={form.scadenza}
                onChange={e => setForm(f => f && ({ ...f, scadenza: e.target.value }))}
              />
            </div>
            <label className="fbwc-form__flag">
              <input
                type="checkbox" className="sib-checkbox" checked={form.attivo}
                onChange={e => setForm(f => f && ({ ...f, attivo: e.target.checked }))}
              />
              Wallet attivo
            </label>

            <footer className="fbwc-form__foot">
              <button type="button" className="fbwc-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbwc-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Salva
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
