// ─── Ingredienti e listino (Food & Beverage) ──────────────────────────────────
//  La materia prima: cosa si compra, a che prezzo e quanta ce n'è. È la base di
//  tutto il resto — il food cost di un piatto non è altro che la somma di queste
//  righe — quindi costo e giacenza si correggono dalla riga, senza aprire la
//  scheda: sono i due numeri che cambiano a ogni consegna.
//
//  Quando per un ingrediente c'è un gruppo d'acquisto aperto in Agorà, la riga
//  lo dice con il prezzo spuntato: è lì che si recupera margine senza toccare
//  la carta.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import Pagination from '../../../../core/components/Pagination'
import {
  InputField, SelectField, SearchField, NumCell, CheckboxField,
} from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import {
  ALLERGENI_UE, FORNITORI, GRUPPI_INGREDIENTE,
  type GruppoIngrediente, type Ingrediente, type UnitaIngrediente,
} from '../fb.model'
import './FbIngredienti.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const num = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 3 })

const UNITA: Array<{ value: UnitaIngrediente; label: string }> = [
  { value: 'kg', label: 'kg' },
  { value: 'l',  label: 'litri' },
  { value: 'pz', label: 'pezzi' },
]

const PER_PAGINA = 14

const vuoto = (): Ingrediente => ({
  id: 0, nome: '', gruppo: 'Verdure', prezzoExtra: 0, allergeni: [],
  unita: 'kg', costo: 0, porzione: 0.05, giacenza: 0, scorta: 0, fornitoreId: 1,
})

export default function FbIngredienti({ navigate }: { navigate?: (p: string) => void }) {
  const ingredienti = useFbStore(s => s.ingredienti)
  const ricette     = useFbStore(s => s.ricette)
  const salva       = useFbStore(s => s.salvaIngrediente)
  const elimina     = useFbStore(s => s.eliminaIngrediente)
  const muovi       = useFbStore(s => s.muoviGiacenza)
  const confirm     = useConfirmStore(s => s.confirm)

  const [gruppo, setGruppo]     = useState<GruppoIngrediente | 'tutti'>('tutti')
  const [fornitore, setFornitore] = useState<number | 'tutti'>('tutti')
  const [cerca, setCerca]       = useState('')
  const [soloSotto, setSoloSotto] = useState(false)
  const [soloAgora, setSoloAgora] = useState(false)
  const [pagina, setPagina]     = useState(1)
  const [form, setForm]         = useState<Ingrediente | null>(null)
  const [carico, setCarico]     = useState<Ingrediente | null>(null)
  const [qtaCarico, setQtaCarico] = useState(0)

  /** In quante schede tecniche compare: dice se si può togliere dal listino. */
  const usiDi = useMemo(() => {
    const m = new Map<number, number>()
    Object.values(ricette).forEach(righe =>
      righe.forEach(r => m.set(r.ingredienteId, (m.get(r.ingredienteId) ?? 0) + 1)))
    return m
  }, [ricette])

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return ingredienti.filter(i =>
      (gruppo === 'tutti' || i.gruppo === gruppo)
      && (fornitore === 'tutti' || i.fornitoreId === fornitore)
      && (!soloSotto || i.giacenza <= i.scorta)
      && (!soloAgora || (!!i.agora && i.agora < i.costo))
      && (!q || i.nome.toLowerCase().includes(q)))
  }, [ingredienti, gruppo, fornitore, soloSotto, soloAgora, cerca])

  const pagine = Math.max(1, Math.ceil(righe.length / PER_PAGINA))
  const pag = Math.min(pagina, pagine)
  const vista = righe.slice((pag - 1) * PER_PAGINA, pag * PER_PAGINA)

  /** Quanto si risparmierebbe aderendo a tutti i gruppi d'acquisto aperti. */
  const risparmioAgora = useMemo(
    () => ingredienti.reduce((a, i) =>
      a + (i.agora && i.agora < i.costo ? (i.costo - i.agora) * i.giacenza : 0), 0),
    [ingredienti],
  )
  const sottoScorta = ingredienti.filter(i => i.giacenza <= i.scorta).length

  const chiediElimina = async (i: Ingrediente) => {
    const usi = usiDi.get(i.id) ?? 0
    const ok = await confirm({
      message: usi
        ? `“${i.nome}” compone ${usi} ${usi === 1 ? 'scheda tecnica' : 'schede tecniche'}: togliendolo dal listino sparisce anche da quelle. Procedere?`
        : `Togliere “${i.nome}” dal listino?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(i.id); toast.info(`${i.nome} tolto dal listino`) }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome dell’ingrediente'); return }
    salva(form)
    toast.success(form.id ? 'Ingrediente aggiornato' : `“${form.nome}” aggiunto al listino`)
    setForm(null)
  }

  const confermaCarico = () => {
    if (!carico || !qtaCarico) { setCarico(null); return }
    muovi(carico.id, qtaCarico)
    toast.success(`${carico.nome}: ${qtaCarico > 0 ? '+' : ''}${num(qtaCarico)} ${carico.unita}`)
    setCarico(null)
  }

  return (
    <div className="fbing">
      <PageHead
        title="Ingredienti e listino"
        subtitle="La materia prima: prezzo d’acquisto, giacenza e gruppi d’acquisto aperti"
        actions={
          <button type="button" className="fbing__head-btn" onClick={() => setForm(vuoto())}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo ingrediente
          </button>
        }
      />

      <FilterToolbar className="fbing__bar">
        <SelectField
          name="gruppo" label="Famiglia" className="fbing__f fbing__f--lg"
          value={gruppo}
          options={[{ value: 'tutti', label: 'Tutte' }, ...GRUPPI_INGREDIENTE.map(g => ({ value: g.id, label: g.id }))]}
          onChange={e => { setGruppo(e.target.value as GruppoIngrediente | 'tutti'); setPagina(1) }}
        />
        <SelectField
          name="fornitore" label="Fornitore" className="fbing__f fbing__f--lg"
          value={fornitore}
          options={[{ value: 'tutti', label: 'Tutti' }, ...FORNITORI.map(f => ({ value: f.id, label: f.nome }))]}
          onChange={e => { setFornitore(e.target.value === 'tutti' ? 'tutti' : +e.target.value); setPagina(1) }}
        />
        <div className="fbing__f fbing__f--lg fbing__cerca">
          <span className="fbing__cerca-lab">Cerca</span>
          <SearchField
            name="cerca" value={cerca} placeholder="Nome dell’ingrediente…"
            onChange={e => { setCerca(e.target.value); setPagina(1) }}
            onClear={() => setCerca('')}
          />
        </div>
        <CheckboxField
          name="sotto" label={`Sotto scorta (${sottoScorta})`}
          checked={soloSotto} onChange={e => { setSoloSotto(e.target.checked); setPagina(1) }}
        />
        <CheckboxField
          name="agora" label="Con gruppo d’acquisto"
          checked={soloAgora} onChange={e => { setSoloAgora(e.target.checked); setPagina(1) }}
        />
      </FilterToolbar>

      <div className="fbing__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table fbing__table">
            <colgroup>
              <col className="fbing__c-nome" /><col className="fbing__c-gru" />
              <col className="fbing__c-forn" /><col className="fbing__c-costo" />
              <col className="fbing__c-gia" /><col className="fbing__c-extra" />
              <col className="fbing__c-usi" /><col className="fbing__c-act" />
            </colgroup>
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Famiglia</th>
                <th>Fornitore</th>
                <th className="fbing__amt">Costo</th>
                <th className="fbing__amt">Giacenza</th>
                <th className="fbing__amt">Aggiunta</th>
                <th className="fbing__amt">Ricette</th>
                <th className="fbing__c-act" aria-label="Azioni" />
              </tr>
            </thead>
            <tbody>
              {vista.map(i => {
                const forn = FORNITORI.find(f => f.id === i.fornitoreId)
                const sotto = i.giacenza <= i.scorta
                const occasione = !!i.agora && i.agora < i.costo
                const sconto = occasione ? Math.round((1 - i.agora! / i.costo) * 100) : 0
                return (
                  <tr key={i.id} className={sotto ? 'is-sotto' : ''}>
                    <td>
                      <span className="fbing__nome">
                        <TruncatedText text={i.nome} />
                        {!!i.allergeni.length && (
                          <Tooltip text={i.allergeni.map(a => ALLERGENI_UE.find(x => x.codice === a)?.nome ?? a).join(', ')}>
                            <span className="fbing__all">{i.allergeni.join('')}</span>
                          </Tooltip>
                        )}
                      </span>
                    </td>
                    <td><TruncatedText text={i.gruppo} /></td>
                    <td><TruncatedText text={forn?.nome ?? '—'} /></td>
                    <td className="fbing__amt">
                      <span className="fbing__costo">
                        <NumCell
                          className="sib-input fbing__num"
                          min={0} decimals={2} value={i.costo}
                          aria-label={`Costo di ${i.nome}`}
                          onChange={n => salva({ ...i, costo: n })}
                        />
                        <span className="fbing__unita">/{i.unita}</span>
                      </span>
                      {occasione && (
                        <Tooltip text={`Gruppo d’acquisto Agorà a ${euro(i.agora!)}/${i.unita}: −${sconto}% sul tuo ultimo prezzo`}>
                          <button
                            type="button" className="fbing__agora"
                            onClick={() => navigate?.('group-purchases')}
                          >
                            <i className="fa-solid fa-people-group" aria-hidden="true" /> −{sconto}%
                          </button>
                        </Tooltip>
                      )}
                    </td>
                    <td className="fbing__amt">
                      <span className="fbing__gia">
                        {num(i.giacenza)} {i.unita}
                        {sotto && (
                          <Tooltip text={`Sotto la scorta minima di ${num(i.scorta)} ${i.unita}`}>
                            <i className="fa-solid fa-triangle-exclamation fbing__alert" aria-hidden="true" />
                          </Tooltip>
                        )}
                      </span>
                    </td>
                    <td className="fbing__amt">
                      {i.soloRicetta
                        ? <span className="fbing__nessuno">—</span>
                        : <>{euro(i.prezzoExtra)} <span className="fbing__unita">/{num(i.porzione)} {i.unita}</span></>}
                    </td>
                    <td className="fbing__amt">{usiDi.get(i.id) ?? 0}</td>
                    <td className="fbing__c-act">
                      <div className="fbing__acts">
                        <Tooltip text="Carico o rettifica di magazzino">
                          <button
                            type="button" className="fbing__act"
                            onClick={() => { setCarico(i); setQtaCarico(0) }}
                            aria-label={`Carico di ${i.nome}`}
                          >
                            <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" />
                          </button>
                        </Tooltip>
                        <button
                          type="button" className="fbing__act"
                          onClick={() => setForm(i)} aria-label={`Scheda di ${i.nome}`}
                        >
                          <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                        </button>
                        <button
                          type="button" className="fbing__act fbing__act--danger"
                          onClick={() => chiediElimina(i)} aria-label={`Elimina ${i.nome}`}
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!vista.length && (
                <tr><td colSpan={8} className="fbing__vuoto">Nessun ingrediente con questi filtri.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Il totale sta sotto la tabella, dove si è appena finito di leggerla */}
        <p className="fbing__somma">
          {righe.length} {righe.length === 1 ? 'ingrediente' : 'ingredienti'} a listino
          {!!risparmioAgora && (
            <>
              {' · '}
              <button type="button" className="fbing__somma-link" onClick={() => navigate?.('group-purchases')}>
                <i className="fa-solid fa-people-group" aria-hidden="true" />
                {euro(risparmioAgora)} recuperabili dai gruppi d’acquisto aperti
              </button>
            </>
          )}
        </p>

        <div className="fbing__pag">
          <Pagination page={pag} totalPages={pagine} onPageChange={setPagina} />
        </div>
      </div>

      {/* ── Scheda dell'ingrediente ──────────────────────────────────────── */}
      <Modal
        open={!!form} onClose={() => setForm(null)} size="lg"
        title={form?.id ? `Ingrediente — ${form.nome}` : 'Nuovo ingrediente'}
      >
        {form && (
          <div className="fbing-form">
            <div className="fbing-form__griglia">
              <InputField
                name="nome" label="Nome" value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
              />
              <SelectField
                name="gruppo" label="Famiglia" value={form.gruppo}
                options={GRUPPI_INGREDIENTE.map(g => ({ value: g.id, label: g.id }))}
                onChange={e => setForm({ ...form, gruppo: e.target.value as GruppoIngrediente })}
              />
              <SelectField
                name="fornitore" label="Fornitore" value={form.fornitoreId}
                options={FORNITORI.map(f => ({ value: f.id, label: f.nome }))}
                onChange={e => setForm({ ...form, fornitoreId: +e.target.value })}
              />
              <SelectField
                name="unita" label="Unità d’acquisto" value={form.unita}
                options={UNITA}
                onChange={e => setForm({ ...form, unita: e.target.value as UnitaIngrediente })}
              />
              <InputField
                name="costo" label={`Costo per ${form.unita}`} type="number" step={0.01} value={form.costo}
                onChange={e => setForm({ ...form, costo: +e.target.value })}
              />
              <InputField
                name="agora" label="Prezzo gruppo d’acquisto" type="number" step={0.01} value={form.agora ?? ''}
                onChange={e => setForm({ ...form, agora: e.target.value === '' ? undefined : +e.target.value })}
              />
              <InputField
                name="giacenza" label={`Giacenza (${form.unita})`} type="number" step={0.001} value={form.giacenza}
                onChange={e => setForm({ ...form, giacenza: +e.target.value })}
              />
              <InputField
                name="scorta" label={`Scorta minima (${form.unita})`} type="number" step={0.001} value={form.scorta}
                onChange={e => setForm({ ...form, scorta: +e.target.value })}
              />
              <InputField
                name="porzione" label={`Porzione di un’aggiunta (${form.unita})`} type="number" step={0.001} value={form.porzione}
                onChange={e => setForm({ ...form, porzione: +e.target.value })}
              />
              <InputField
                name="prezzoExtra" label="Prezzo dell’aggiunta in carta" type="number" step={0.1} value={form.prezzoExtra}
                onChange={e => setForm({ ...form, prezzoExtra: +e.target.value })}
              />
            </div>

            <div className="fbing-form__blocco">
              <span className="fbing-form__lab">Allergeni</span>
              <div className="fbing-form__all">
                {ALLERGENI_UE.map(a => (
                  <button
                    key={a.codice} type="button"
                    className={`fbing-form__chip ${form.allergeni.includes(a.codice) ? 'is-on' : ''}`}
                    onClick={() => setForm({
                      ...form,
                      allergeni: form.allergeni.includes(a.codice)
                        ? form.allergeni.filter(x => x !== a.codice)
                        : [...form.allergeni, a.codice],
                    })}
                  >{a.codice} · {a.nome}</button>
                ))}
              </div>
            </div>

            <div className="fbing-form__blocco">
              <CheckboxField
                name="soloRicetta" label="Solo per le ricette (non proponibile come aggiunta)"
                checked={!!form.soloRicetta}
                onChange={e => setForm({ ...form, soloRicetta: e.target.checked })}
              />
              <CheckboxField
                name="frequente" label="Fra le aggiunte più richieste (in comanda senza cercare)"
                checked={!!form.frequente}
                onChange={e => setForm({ ...form, frequente: e.target.checked })}
              />
            </div>

            <footer className="fbing-form__foot">
              <button type="button" className="fbing-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbing-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Salva
              </button>
            </footer>
          </div>
        )}
      </Modal>

      {/* ── Carico di magazzino ──────────────────────────────────────────── */}
      <Modal
        open={!!carico} onClose={() => setCarico(null)} size="sm"
        title={carico ? `Magazzino — ${carico.nome}` : ''}
      >
        {carico && (
          <div className="fbing-form">
            <p className="fbing-form__ora">
              In magazzino ora: <strong>{num(carico.giacenza)} {carico.unita}</strong>
              {' · '}scorta minima {num(carico.scorta)} {carico.unita}
            </p>
            <InputField
              name="qta" label={`Quantità (${carico.unita}) — negativa per una rettifica`}
              type="number" step={0.001} value={qtaCarico}
              onChange={e => setQtaCarico(+e.target.value)}
            />
            <p className="fbing-form__ora">
              Dopo il movimento: <strong>{num(Math.max(0, carico.giacenza + qtaCarico))} {carico.unita}</strong>
            </p>
            <footer className="fbing-form__foot">
              <button type="button" className="fbing-form__annulla" onClick={() => setCarico(null)}>Annulla</button>
              <button type="button" className="fbing-form__ok" onClick={confermaCarico}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Registra
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
