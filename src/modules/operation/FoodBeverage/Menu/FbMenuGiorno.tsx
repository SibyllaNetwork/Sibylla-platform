// ─── Menu del giorno (Food & Beverage) ────────────────────────────────────────
//  Il menu proposto in una giornata: una selezione di voci del catalogo, con o
//  senza prezzo fisso. Se il prezzo fisso manca, il conto è la somma delle voci
//  — e la composizione lo dice mentre la si fa, così si vede subito se il
//  prezzo scelto sta sopra o sotto il valore di carta.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import {
  InputField, SelectField, DatePickerField, NumCell,
} from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import { oggiISO, type MenuGiorno } from '../fb.model'
import './FbMenuGiorno.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const fmtData = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '—'

const vuoto = (outletId: number): MenuGiorno => ({
  id: 0, outletId, data: oggiISO(), nome: '', prezzoFisso: null, note: '', vociIds: [], attivo: true,
})

export default function FbMenuGiorno({ navigate }: { navigate?: (p: string) => void }) {
  const outlets   = useFbStore(s => s.outlets)
  const categorie = useFbStore(s => s.categorie)
  const voci      = useFbStore(s => s.voci)
  const menu      = useFbStore(s => s.menuGiorno)
  const salva     = useFbStore(s => s.salvaMenuGiorno)
  const elimina   = useFbStore(s => s.eliminaMenuGiorno)
  const contesto  = useFbStore(s => s.contesto)
  const setContesto = useFbStore(s => s.setContesto)
  const confirm   = useConfirmStore(s => s.confirm)

  const { outletId } = contesto
  const [form, setForm] = useState<MenuGiorno | null>(null)
  const [catFiltro, setCatFiltro] = useState<number | 'tutte'>('tutte')

  const righe = useMemo(
    () => menu.filter(m => m.outletId === outletId).slice().sort((a, b) => b.data.localeCompare(a.data)),
    [menu, outletId],
  )

  const valoreDi = (m: MenuGiorno) =>
    m.vociIds.reduce((a, id) => a + (voci.find(v => v.id === id)?.prezzo ?? 0), 0)

  const vociScelte = form
    ? voci.filter(v => form.vociIds.includes(v.id))
    : []
  const valoreScelte = vociScelte.reduce((a, v) => a + v.prezzo, 0)

  const vociInLista = useMemo(() => voci
    .filter(v => v.attiva)
    .filter(v => catFiltro === 'tutte' || v.categoriaId === catFiltro)
    .sort((a, b) => {
      const ca = categorie.find(c => c.id === a.categoriaId)?.ordine ?? 0
      const cb = categorie.find(c => c.id === b.categoriaId)?.ordine ?? 0
      return ca - cb || a.nome.localeCompare(b.nome)
    }), [voci, catFiltro, categorie])

  const chiediElimina = async (m: MenuGiorno) => {
    const ok = await confirm({
      message: `Eliminare il menu “${m.nome}” del ${fmtData(m.data)}?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(m.id); toast.info('Menu eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome del menu'); return }
    if (!form.vociIds.length) { toast.warning('Scegli almeno una voce'); return }
    salva(form)
    toast.success(form.id ? 'Menu aggiornato' : `Menu “${form.nome}” creato`)
    setForm(null)
  }

  return (
    <div className="fbmg">
      <PageHead
        title="Menu del giorno"
        subtitle="Il menu proposto in ciascuna giornata di servizio"
        actions={
          <button type="button" className="fbmg__head-btn" onClick={() => { setForm(vuoto(outletId)); setCatFiltro('tutte') }}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo menu
          </button>
        }
      />

      <FilterToolbar className="fbmg__bar">
        <SelectField
          name="outlet" label="Outlet" className="fbmg__f"
          value={outletId}
          options={outlets.map(o => ({ value: o.id, label: o.nome }))}
          onChange={e => setContesto({ outletId: +e.target.value })}
        />
        <button type="button" className="fbmg__link" onClick={() => navigate?.('fb-voci-menu')}>
          <i className="fa-solid fa-plate-utensils" aria-hidden="true" /> Catalogo delle voci
        </button>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table fbmg__table">
          <colgroup>
            <col className="fbmg__c-data" /><col className="fbmg__c-nome" />
            <col className="fbmg__c-voci" /><col className="fbmg__c-note" />
            <col className="fbmg__c-prezzo" /><col className="fbmg__c-val" />
            <col className="fbmg__c-stato" /><col className="fbmg__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome menu</th>
              <th>Voci</th>
              <th>Note</th>
              <th className="fbmg__amt">Prezzo</th>
              <th className="fbmg__amt">Valore in carta</th>
              <th>Stato</th>
              <th className="fbmg__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(m => {
              const valore = valoreDi(m)
              const prezzo = m.prezzoFisso ?? valore
              return (
                <tr key={m.id}>
                  <td className="fbmg__data">{fmtData(m.data)}</td>
                  <td><TruncatedText text={m.nome} /></td>
                  <td>
                    <Tooltip text={m.vociIds.map(id => voci.find(v => v.id === id)?.nome).filter(Boolean).join(', ')}>
                      <span className="fbmg__voci">{m.vociIds.length} {m.vociIds.length === 1 ? 'voce' : 'voci'}</span>
                    </Tooltip>
                  </td>
                  <td><TruncatedText text={m.note || '—'} /></td>
                  <td className="fbmg__amt">
                    {euro(prezzo)}
                    {m.prezzoFisso === null && <em className="fbmg__nota"> somma</em>}
                  </td>
                  <td className="fbmg__amt">
                    {euro(valore)}
                    {m.prezzoFisso !== null && valore > 0 && (
                      <em className={`fbmg__delta ${m.prezzoFisso < valore ? 'is-giu' : 'is-su'}`}>
                        {m.prezzoFisso < valore ? '−' : '+'}{euro(Math.abs(valore - m.prezzoFisso))}
                      </em>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`fbmg__stato ${m.attivo ? 'is-on' : ''}`}
                      aria-pressed={m.attivo}
                      onClick={() => salva({ ...m, attivo: !m.attivo })}
                    >
                      {m.attivo ? 'Attivo' : 'Sospeso'}
                    </button>
                  </td>
                  <td className="fbmg__act">
                    <button type="button" aria-label="Modifica il menu" onClick={() => { setForm({ ...m }); setCatFiltro('tutte') }}>
                      <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Elimina il menu" onClick={() => chiediElimina(m)}>
                      <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!righe.length && (
              <tr><td colSpan={8} className="fbmg__vuoto">Nessun menu del giorno per questo outlet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Composizione del menu ─────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Menu del giorno — ${form.nome}` : 'Nuovo menu del giorno'}
        size="xl"
      >
        {form && (
          <div className="fbmg-form">
            <div className="fbmg-form__row">
              <InputField
                name="nome" label="Nome menu" className="fbmg-form__grow" value={form.nome}
                placeholder="es. Menu di Pasqua"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <DatePickerField
                name="data" label="Data" value={form.data}
                onChange={e => setForm(f => f && ({ ...f, data: e.target.value }))}
              />
              <div className="fbmg-form__prezzo">
                <span className="fbmg-form__lab">Prezzo fisso (€)</span>
                <NumCell
                  className="sib-input fbmg-form__prezzo-in"
                  min={0} decimals={2}
                  value={form.prezzoFisso ?? 0}
                  placeholder="somma delle voci"
                  aria-label="Prezzo fisso del menu"
                  onChange={n => setForm(f => f && ({ ...f, prezzoFisso: n || null }))}
                />
              </div>
            </div>

            <InputField
              name="note" label="Note" value={form.note}
              placeholder="es. acqua e caffè inclusi"
              onChange={e => setForm(f => f && ({ ...f, note: e.target.value }))}
            />

            <div className="fbmg-form__scelta">
              <header>
                <span className="fbmg-form__lab">Voci incluse</span>
                <SelectField
                  name="cat" ariaLabel="Filtra per categoria" className="fbmg-form__cat"
                  value={catFiltro}
                  options={[{ value: 'tutte', label: 'Tutte le categorie' }, ...categorie.slice().sort((a, b) => a.ordine - b.ordine).map(c => ({ value: c.id, label: c.nome }))]}
                  onChange={e => setCatFiltro(e.target.value === 'tutte' ? 'tutte' : +e.target.value)}
                />
                <span className="fbmg-form__conta">{form.vociIds.length} scelte</span>
                <span className="fbmg-form__valore">{euro(valoreScelte)}</span>
              </header>

              <ul className="fbmg-form__lista">
                {vociInLista.map(v => {
                  const cat = categorie.find(c => c.id === v.categoriaId)
                  return (
                    <li key={v.id}>
                      <label>
                        <input
                          type="checkbox" className="sib-checkbox"
                          checked={form.vociIds.includes(v.id)}
                          onChange={() => setForm(f => f && ({
                            ...f,
                            vociIds: f.vociIds.includes(v.id)
                              ? f.vociIds.filter(x => x !== v.id)
                              : [...f.vociIds, v.id],
                          }))}
                        />
                        <span className="fbmg-form__v-nome"><TruncatedText text={v.nome} /></span>
                        <span className="fbmg-form__v-cat"><TruncatedText text={cat?.nome ?? ''} /></span>
                        <span className="fbmg-form__v-prezzo">{euro(v.prezzo)}</span>
                      </label>
                    </li>
                  )
                })}
                {!vociInLista.length && <li className="fbmg-form__vuoto">Nessuna voce in questa categoria.</li>}
              </ul>
            </div>

            <footer className="fbmg-form__foot">
              {form.prezzoFisso !== null && !!valoreScelte && (
                <span className="fbmg-form__confronto">
                  Prezzo fisso {euro(form.prezzoFisso)} su un valore di carta di {euro(valoreScelte)}
                  {form.prezzoFisso < valoreScelte
                    ? ` · sconto di ${euro(valoreScelte - form.prezzoFisso)}`
                    : form.prezzoFisso > valoreScelte ? ` · ricarico di ${euro(form.prezzoFisso - valoreScelte)}` : ''}
                </span>
              )}
              <button type="button" className="fbmg-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbmg-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva il menu' : 'Crea il menu'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
