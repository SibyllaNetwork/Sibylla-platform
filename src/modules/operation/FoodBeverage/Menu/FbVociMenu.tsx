// ─── Voci menu (Food & Beverage) ──────────────────────────────────────────────
//  Il catalogo vero: ogni piatto e ogni bevanda con prezzo, allergeni e reparto
//  che la prepara. È la tabella su cui si lavora di più — si cerca, si corregge
//  un prezzo, si sospende una voce finita — quindi prezzo e disponibilità si
//  cambiano dalla riga, senza aprire la scheda.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import {
  InputField, SelectField, SearchField, TextareaField, NumCell,
} from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import {
  ALLERGENI_UE, CATEGORIE_CLIENTE, LINGUA_META, LINGUE,
  type Lingua, type PrezzoSpeciale, type VoceMenu,
} from '../fb.model'
import './FbVociMenu.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

const REPARTI: Array<{ id: VoceMenu['reparto']; label: string; ico: string }> = [
  { id: 'cucina',      label: 'Cucina',      ico: 'fa-kitchen-set' },
  { id: 'bar',         label: 'Bar',         ico: 'fa-martini-glass' },
  { id: 'cantina',     label: 'Cantina',     ico: 'fa-wine-bottle' },
  { id: 'pasticceria', label: 'Pasticceria', ico: 'fa-cake-candles' },
]

const vuota = (categoriaId: number): VoceMenu => ({
  id: 0, categoriaId, nome: '', traduzioni: {}, descrizione: '', prezzo: 0,
  allergeni: [], attiva: true, reparto: 'cucina',
  outletIds: [], nelWebMenu: true, prezziSpeciali: [],
})

/** Nome nella lingua scelta; se manca resta l'italiano, segnalato. */
const nomeIn = (v: VoceMenu, l: Lingua) =>
  l === 'it' ? v.nome : (v.traduzioni[l as Exclude<Lingua, 'it'>] || v.nome)

const tradotta = (v: VoceMenu, l: Lingua) =>
  l === 'it' || !!v.traduzioni[l as Exclude<Lingua, 'it'>]

export default function FbVociMenu({ navigate }: { navigate?: (p: string) => void }) {
  const tipi      = useFbStore(s => s.tipiMenu)
  const categorie = useFbStore(s => s.categorie)
  const voci      = useFbStore(s => s.voci)
  const outlets   = useFbStore(s => s.outlets)
  const salva     = useFbStore(s => s.salvaVoce)
  const elimina   = useFbStore(s => s.eliminaVoce)
  const confirm   = useConfirmStore(s => s.confirm)

  const [tipoId, setTipoId] = useState<number | 'tutti'>('tutti')
  const [catId, setCatId]   = useState<number | 'tutte'>('tutte')
  const [reparto, setReparto] = useState<VoceMenu['reparto'] | 'tutti'>('tutti')
  const [cerca, setCerca]   = useState('')
  const [lingua, setLingua] = useState<Lingua>('it')
  const [form, setForm]     = useState<VoceMenu | null>(null)

  const catDelTipo = useMemo(
    () => categorie.filter(c => tipoId === 'tutti' || c.tipoId === tipoId).sort((a, b) => a.ordine - b.ordine),
    [categorie, tipoId],
  )

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const idCat = catDelTipo.map(c => c.id)
    return voci
      .filter(v => idCat.includes(v.categoriaId))
      .filter(v => catId === 'tutte' || v.categoriaId === catId)
      .filter(v => reparto === 'tutti' || v.reparto === reparto)
      .filter(v => !q
        || v.nome.toLowerCase().includes(q)
        || v.descrizione.toLowerCase().includes(q)
        || Object.values(v.traduzioni).some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => {
        const ca = categorie.find(c => c.id === a.categoriaId)?.ordine ?? 0
        const cb = categorie.find(c => c.id === b.categoriaId)?.ordine ?? 0
        return ca - cb || a.nome.localeCompare(b.nome)
      })
  }, [voci, catDelTipo, catId, reparto, cerca, categorie])

  const prezzoMedio = righe.length ? righe.reduce((a, v) => a + v.prezzo, 0) / righe.length : 0

  const chiediElimina = async (v: VoceMenu) => {
    const ok = await confirm({
      message: `Eliminare “${v.nome}” dal catalogo? Le comande già scritte non cambiano.`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(v.id); toast.info('Voce eliminata') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome della voce'); return }
    salva(form)
    toast.success(form.id ? 'Voce aggiornata' : `“${form.nome}” aggiunta al catalogo`)
    setForm(null)
  }

  return (
    <div className="fbvoci">
      <PageHead
        title="Voci menu"
        subtitle="Il catalogo di piatti e bevande, con prezzi, allergeni e reparto"
        actions={
          <>
            {/* Il prezzo si decide guardando il margine: la pagina è a un tocco */}
            <button
              type="button" className="fbvoci__head-btn fbvoci__head-btn--ghost"
              onClick={() => navigate?.('fb-food-cost')}
            >
              <i className="fa-solid fa-scale-balanced" aria-hidden="true" /> Food cost e margini
            </button>
            <button
              type="button" className="fbvoci__head-btn"
              onClick={() => setForm(vuota(catId === 'tutte' ? (catDelTipo[0]?.id ?? 1) : catId))}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova voce
            </button>
          </>
        }
      />

      <FilterToolbar className="fbvoci__bar">
        <SelectField
          name="tipo" label="Tipo menu" className="fbvoci__f"
          value={tipoId}
          options={[{ value: 'tutti', label: 'Tutti' }, ...tipi.map(t => ({ value: t.id, label: t.nome }))]}
          onChange={e => { setTipoId(e.target.value === 'tutti' ? 'tutti' : +e.target.value); setCatId('tutte') }}
        />
        <SelectField
          name="categoria" label="Categoria" className="fbvoci__f fbvoci__f--lg"
          value={catId}
          options={[{ value: 'tutte', label: 'Tutte' }, ...catDelTipo.map(c => ({ value: c.id, label: c.nome }))]}
          onChange={e => setCatId(e.target.value === 'tutte' ? 'tutte' : +e.target.value)}
        />
        <SelectField
          name="reparto" label="Reparto" className="fbvoci__f"
          value={reparto}
          options={[{ value: 'tutti', label: 'Tutti' }, ...REPARTI.map(r => ({ value: r.id, label: r.label }))]}
          onChange={e => setReparto(e.target.value as VoceMenu['reparto'] | 'tutti')}
        />
        <div className="fbvoci__lingue">
          <span className="fbvoci__cerca-lab">Lingua della carta</span>
          <div className="fbvoci__seg">
            {LINGUE.map(l => (
              // Tooltip standard della piattaforma, non il `title` nativo
              <Tooltip key={l} text={LINGUA_META[l].label}>
                <button
                  type="button"
                  className={l === lingua ? 'is-on' : ''}
                  onClick={() => setLingua(l)}
                >{l.toUpperCase()}</button>
              </Tooltip>
            ))}
          </div>
        </div>
        <div className="fbvoci__f fbvoci__f--lg fbvoci__cerca">
          <span className="fbvoci__cerca-lab">Cerca</span>
          <SearchField
            name="cerca" value={cerca} placeholder="Nome o descrizione…"
            onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')}
          />
        </div>
      </FilterToolbar>

      <div className="fbvoci__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table fbvoci__table">
            <colgroup>
              <col className="fbvoci__c-nome" /><col className="fbvoci__c-cat" />
              <col className="fbvoci__c-desc" /><col className="fbvoci__c-rep" />
              <col className="fbvoci__c-all" /><col className="fbvoci__c-prezzo" />
              <col className="fbvoci__c-stato" /><col className="fbvoci__c-act" />
            </colgroup>
            <thead>
              <tr>
                <th>Voce</th>
                <th>Categoria</th>
                <th>Descrizione</th>
                <th>Reparto</th>
                <th>Allergeni</th>
                <th className="fbvoci__amt">Prezzo</th>
                <th>In carta</th>
                <th className="fbvoci__c-act" aria-label="Azioni" />
              </tr>
            </thead>
            <tbody>
              {righe.map(v => {
                const cat = categorie.find(c => c.id === v.categoriaId)
                const rep = REPARTI.find(r => r.id === v.reparto)
                return (
                  <tr key={v.id} className={v.attiva ? '' : 'is-off'}>
                    <td>
                      <span className="fbvoci__voce">
                        <TruncatedText text={nomeIn(v, lingua)} />
                        {!tradotta(v, lingua) && (
                          <Tooltip text={`Manca la traduzione in ${LINGUA_META[lingua].label}: in carta compare l'italiano`}>
                            <i className="fa-solid fa-language fbvoci__manca" aria-hidden="true" />
                          </Tooltip>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="fbvoci__cat" style={{ '--cat': cat?.colore } as React.CSSProperties}>
                        <i aria-hidden="true" />
                        <TruncatedText text={cat?.nome ?? '—'} />
                      </span>
                    </td>
                    <td><TruncatedText text={v.descrizione || '—'} /></td>
                    <td>
                      <Tooltip text={rep?.label ?? ''}>
                        <span className="fbvoci__rep"><i className={`fa-solid ${rep?.ico}`} aria-hidden="true" /> {rep?.label}</span>
                      </Tooltip>
                    </td>
                    <td>
                      {v.allergeni.length ? (
                        <span className="fbvoci__alls">
                          {v.allergeni.map(a => (
                            <Tooltip key={a} text={ALLERGENI_UE.find(x => x.codice === a)?.nome ?? a}>
                              <span className="fbvoci__all">{a}</span>
                            </Tooltip>
                          ))}
                        </span>
                      ) : <span className="fbvoci__nessuno">—</span>}
                    </td>
                    <td className="fbvoci__amt">
                      <NumCell
                        className="sib-input fbvoci__prezzo"
                        min={0} decimals={2} value={v.prezzo}
                        aria-label={`Prezzo di ${v.nome}`}
                        onChange={n => salva({ ...v, prezzo: n })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`fbvoci__attiva ${v.attiva ? 'is-on' : ''}`}
                        aria-pressed={v.attiva}
                        onClick={() => salva({ ...v, attiva: !v.attiva })}
                      >
                        {v.attiva ? 'In carta' : 'Sospesa'}
                      </button>
                    </td>
                    <td className="fbvoci__act">
                      <button type="button" aria-label="Modifica la voce" onClick={() => setForm({ ...v })}>
                        <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                      </button>
                      <button type="button" aria-label="Elimina la voce" onClick={() => chiediElimina(v)}>
                        <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!righe.length && (
                <tr><td colSpan={8} className="fbvoci__vuoto">Nessuna voce con questi filtri.</td></tr>
              )}
            </tbody>
            {!!righe.length && (
              <tfoot>
                <tr className="fbvoci__tot">
                  <td colSpan={2}>{righe.length} voci in elenco</td>
                  <td colSpan={3}>{righe.filter(v => v.attiva).length} in carta · {righe.filter(v => v.allergeni.length).length} con allergeni</td>
                  <td className="fbvoci__amt">{euro(prezzoMedio)}</td>
                  <td colSpan={2} className="fbvoci__tot-nota">prezzo medio</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Scheda voce ───────────────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Voce — ${form.nome}` : 'Nuova voce di menu'}
        size="lg"
      >
        {form && (
          <div className="fbvoci-form">
            <div className="fbvoci-form__row">
              <InputField
                name="nome" label="Nome" className="fbvoci-form__grow" value={form.nome}
                placeholder="es. Tagliolini al tartufo"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <SelectField
                name="categoria" label="Categoria" value={form.categoriaId}
                options={categorie.slice().sort((a, b) => a.ordine - b.ordine).map(c => ({ value: c.id, label: c.nome }))}
                onChange={e => setForm(f => f && ({ ...f, categoriaId: +e.target.value }))}
              />
              <InputField
                name="prezzo" label="Prezzo (€)" type="number" value={form.prezzo}
                onChange={e => setForm(f => f && ({ ...f, prezzo: +e.target.value || 0 }))}
              />
            </div>

            <div className="fbvoci-form__blk">
              <span className="fbvoci-form__lab">Nome in carta nelle altre lingue</span>
              <div className="fbvoci-form__row">
                {LINGUE.filter(l => l !== 'it').map(l => (
                  <InputField
                    key={l}
                    name={`nome-${l}`}
                    label={LINGUA_META[l].label}
                    value={form.traduzioni[l as Exclude<Lingua, 'it'>] ?? ''}
                    placeholder={form.nome}
                    onChange={e => setForm(f => f && ({
                      ...f,
                      traduzioni: { ...f.traduzioni, [l]: e.target.value },
                    }))}
                  />
                ))}
              </div>
            </div>

            <TextareaField
              name="descrizione" label="Descrizione" rows={2} value={form.descrizione}
              placeholder="Come viene presentata in carta e in comanda"
              onChange={e => setForm(f => f && ({ ...f, descrizione: e.target.value }))}
            />

            <div className="fbvoci-form__blk">
              <span className="fbvoci-form__lab">Reparto che la prepara</span>
              <div className="fbvoci-form__chips">
                {REPARTI.map(r => (
                  <button
                    key={r.id} type="button"
                    className={`fbvoci-form__chip ${r.id === form.reparto ? 'is-on' : ''}`}
                    onClick={() => setForm(f => f && ({ ...f, reparto: r.id }))}
                  >
                    <i className={`fa-solid ${r.ico}`} aria-hidden="true" /> {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fbvoci-form__blk">
              <span className="fbvoci-form__lab">Allergeni (14 UE)</span>
              <div className="fbvoci-form__chips">
                {ALLERGENI_UE.map(a => (
                  <button
                    key={a.codice} type="button"
                    className={`fbvoci-form__chip fbvoci-form__chip--all ${form.allergeni.includes(a.codice) ? 'is-on' : ''}`}
                    onClick={() => setForm(f => f && ({
                      ...f,
                      allergeni: f.allergeni.includes(a.codice)
                        ? f.allergeni.filter(x => x !== a.codice)
                        : [...f.allergeni, a.codice].sort(),
                    }))}
                  >
                    <strong>{a.codice}</strong> — {a.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="fbvoci-form__blk">
              <span className="fbvoci-form__lab">
                Outlet in cui è ordinabile <em>(nessuno selezionato = tutti)</em>
              </span>
              <div className="fbvoci-form__chips">
                {outlets.map(o => (
                  <button
                    key={o.id} type="button"
                    className={`fbvoci-form__chip ${form.outletIds.includes(o.id) ? 'is-on' : ''}`}
                    onClick={() => setForm(f => f && ({
                      ...f,
                      outletIds: f.outletIds.includes(o.id)
                        ? f.outletIds.filter(x => x !== o.id)
                        : [...f.outletIds, o.id],
                    }))}
                  >{o.nome}</button>
                ))}
              </div>
            </div>

            {/* Prezzi speciali: scavalcano il prezzo base per outlet e/o categoria cliente */}
            <div className="fbvoci-form__blk">
              <span className="fbvoci-form__lab">
                Prezzi speciali <em>(per outlet e/o categoria cliente)</em>
              </span>
              <ul className="fbvoci-form__prezzi">
                {form.prezziSpeciali.map(ps => (
                  <li key={ps.id}>
                    <SelectField
                      name={`ps-outlet-${ps.id}`} ariaLabel="Outlet del prezzo speciale"
                      value={ps.outletId ?? ''}
                      options={[{ value: '', label: 'Tutti gli outlet' }, ...outlets.map(o => ({ value: o.id, label: o.nome }))]}
                      onChange={e => setForm(f => f && ({
                        ...f,
                        prezziSpeciali: f.prezziSpeciali.map(x => x.id === ps.id
                          ? { ...x, outletId: e.target.value ? +e.target.value : null } : x),
                      }))}
                    />
                    <SelectField
                      name={`ps-cat-${ps.id}`} ariaLabel="Categoria cliente del prezzo speciale"
                      value={ps.categoriaClienteId ?? ''}
                      options={[{ value: '', label: 'Tutte le categorie' }, ...CATEGORIE_CLIENTE.map(c => ({ value: c.id, label: c.nome }))]}
                      onChange={e => setForm(f => f && ({
                        ...f,
                        prezziSpeciali: f.prezziSpeciali.map(x => x.id === ps.id
                          ? { ...x, categoriaClienteId: e.target.value ? +e.target.value : null } : x),
                      }))}
                    />
                    <NumCell
                      className="sib-input fbvoci-form__ps-prezzo"
                      min={0} decimals={2} value={ps.prezzo}
                      aria-label="Prezzo speciale"
                      onChange={n => setForm(f => f && ({
                        ...f,
                        prezziSpeciali: f.prezziSpeciali.map(x => x.id === ps.id ? { ...x, prezzo: n } : x),
                      }))}
                    />
                    <button
                      type="button" className="fbvoci-form__ps-x" aria-label="Togli il prezzo speciale"
                      onClick={() => setForm(f => f && ({
                        ...f, prezziSpeciali: f.prezziSpeciali.filter(x => x.id !== ps.id),
                      }))}
                    >
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button" className="fbvoci-form__aggiungi"
                onClick={() => setForm(f => f && ({
                  ...f,
                  prezziSpeciali: [...f.prezziSpeciali, {
                    id: Math.random().toString(36).slice(2, 8),
                    outletId: null, categoriaClienteId: null, prezzo: f.prezzo,
                  } as PrezzoSpeciale],
                }))}
              >
                <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi un prezzo speciale
              </button>
            </div>

            <div className="fbvoci-form__flag">
              <label>
                <input
                  type="checkbox" className="sib-checkbox" checked={form.nelWebMenu}
                  onChange={e => setForm(f => f && ({ ...f, nelWebMenu: e.target.checked }))}
                />
                <i className="fa-solid fa-globe" aria-hidden="true" /> Pubblicata nel web menu
              </label>
              <label>
                <input
                  type="checkbox" className="sib-checkbox" checked={form.attiva}
                  onChange={e => setForm(f => f && ({ ...f, attiva: e.target.checked }))}
                />
                <i className="fa-solid fa-utensils" aria-hidden="true" /> Voce attiva in carta
              </label>
            </div>

            <footer className="fbvoci-form__foot">
              <button type="button" className="fbvoci-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbvoci-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Aggiungi al catalogo'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
