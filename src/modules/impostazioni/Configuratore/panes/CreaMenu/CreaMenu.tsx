import React, { useEffect, useMemo, useState } from 'react'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { SelectField, InputField, RadioGroup } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useCategorieMenuStore } from '../../../../../store/useCategorieMenuStore'
import {
  useVociMenuStore,
  marginePerc,
  formattaPrezzo,
  prezzoDaTesto,
  categoriaNome,
  OUTLET_FB,
  type VoceMenu,
} from '../../../../../store/useVociMenuStore'
import {
  useMenuCartaStore,
  type MenuCarta,
  type RigaMenu,
} from '../../../../../store/useMenuCartaStore'
import type { CfgPaneComponentProps } from '../../Configuratore'
import './CreaMenu.sass'

// ─── CREA MENU (F&B) ──────────────────────────────────────────────────────────
//  Composizione di un menu: intestazione (outlet, nome, dettagli, prezzo) +
//  righe scelte dal catalogo voci. Rispetto alla pagina precedente:
//   • food cost, prezzo e margine NON si digitano: arrivano dalla voce di
//     catalogo (`useVociMenuStore`), così un ritocco al catalogo si riflette
//     su tutti i menu che quella voce compone;
//   • un solo salvataggio. Prima c'erano due bottoni («Crea» in testa e
//     «Salva» in fondo) per una sola entità: qui la barra delle modifiche
//     pendenti compare quando c'è qualcosa da salvare, come negli altri pane;
//   • le righe si ordinano da sé secondo l'ordine delle categorie, che è
//     l'ordine con cui il menu va stampato;
//   • i totali stanno nel piede della tabella, non in riquadri in cima.

const PANE_ID = 'fb-crea-menu'

interface Draft {
  /** Id del menu in modifica; null = menu nuovo. */
  id: string | null
  outletId: number
  nome: string
  dettagli: string
  fisso: boolean
  prezzoVendita: string
  righe: RigaMenu[]
}

const DRAFT_VUOTO: Draft = {
  id: null, outletId: OUTLET_FB[0].id, nome: '', dettagli: '',
  fisso: false, prezzoVendita: '', righe: [],
}

const draftDaMenu = (m: MenuCarta): Draft => ({
  id: m.id,
  outletId: m.outletId,
  nome: m.nome,
  dettagli: m.dettagli,
  fisso: m.fisso,
  prezzoVendita: m.prezzoVendita != null ? m.prezzoVendita.toFixed(2) : '',
  righe: m.righe.map(r => ({ ...r })),
})

const newRid = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export default function CreaMenu({ onGoTo }: CfgPaneComponentProps) {
  const menu           = useMenuCartaStore(s => s.menu)
  const addMenu        = useMenuCartaStore(s => s.addMenu)
  const updateMenu     = useMenuCartaStore(s => s.updateMenu)
  const menuInModifica = useMenuCartaStore(s => s.menuInModifica)
  const setMenuInModifica = useMenuCartaStore(s => s.setMenuInModifica)
  const voci       = useVociMenuStore(s => s.voci)
  const categorie  = useCategorieMenuStore(s => s.categorie)
  const confirm    = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [draft, setDraft] = useState<Draft>(DRAFT_VUOTO)
  const [voceId, setVoceId] = useState('')

  // Staffetta da «Lista menu»: il menu scelto lì si apre qui in composizione
  useEffect(() => {
    if (!menuInModifica) return
    const m = menu.find(x => x.id === menuInModifica)
    if (m) setDraft(draftDaMenu(m))
    setMenuInModifica(null)
  }, [menuInModifica, menu, setMenuInModifica])

  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }))

  // ── Catalogo: voci attive non ancora nel menu ───────────────────────────────
  const vociAttive = useMemo(
    () => voci.filter(v => v.attivo).sort((a, b) => a.nomeIt.localeCompare(b.nomeIt, 'it')),
    [voci],
  )
  const giaNelMenu = useMemo(() => new Set(draft.righe.map(r => r.voceId)), [draft.righe])
  const vociOptions = useMemo(() => [
    { value: '', label: '— Seleziona una voce del catalogo —' },
    ...vociAttive
      .filter(v => !giaNelMenu.has(v.id))
      .map(v => ({ value: v.id, label: `${v.nomeIt} · ${categoriaNome(v.categoriaId)}` })),
  ], [vociAttive, giaNelMenu])

  const voceDi = (id: string): VoceMenu | undefined => voci.find(v => v.id === id)

  /** Ordine di stampa: prima l'ordine della categoria, poi il nome. */
  const ordineRiga = (r: RigaMenu): number => {
    const v = voceDi(r.voceId)
    const cat = categorie.find(c => c.id === v?.categoriaId)
    return cat ? cat.ordine : 999
  }

  const righeOrdinate = useMemo(
    () => [...draft.righe].sort((a, b) =>
      ordineRiga(a) - ordineRiga(b)
      || (voceDi(a.voceId)?.nomeIt ?? '').localeCompare(voceDi(b.voceId)?.nomeIt ?? '', 'it')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.righe, voci, categorie],
  )

  const aggiungiVoce = () => {
    const v = voceDi(voceId)
    if (!v) return
    setDraft(d => ({
      ...d,
      righe: [...d.righe, { rid: newRid(), voceId: v.id, descrizione: v.descrizione }],
    }))
    setVoceId('')
  }

  const rimuoviRiga = (rid: string) =>
    setDraft(d => ({ ...d, righe: d.righe.filter(r => r.rid !== rid) }))

  const cambiaDescrizione = (rid: string, testo: string) =>
    setDraft(d => ({
      ...d,
      righe: d.righe.map(r => r.rid === rid ? { ...r, descrizione: testo } : r),
    }))

  // ── Economia del menu ──────────────────────────────────────────────────────
  const prezzoFissoNum = prezzoDaTesto(draft.prezzoVendita)
  const prezzoFissoErrato = draft.fisso && draft.prezzoVendita.trim() !== '' && prezzoFissoNum == null

  const totFoodCost = draft.righe.reduce((t, r) => t + (voceDi(r.voceId)?.foodCost ?? 0), 0)
  const totListino  = draft.righe.reduce((t, r) => t + (voceDi(r.voceId)?.prezzo ?? 0), 0)
  const prezzoVend  = draft.fisso ? (prezzoFissoNum ?? 0) : totListino
  const margineTot  = marginePerc(prezzoVend, totFoodCost)

  // ── Modifiche pendenti ─────────────────────────────────────────────────────
  const salvato = draft.id ? menu.find(m => m.id === draft.id) : undefined
  const impronta = (d: Draft) => JSON.stringify([
    d.outletId, d.nome.trim(), d.dettagli.trim(), d.fisso,
    d.fisso ? (prezzoDaTesto(d.prezzoVendita) ?? 0) : null,
    [...d.righe].sort((a, b) => a.voceId.localeCompare(b.voceId))
      .map(r => [r.voceId, r.descrizione.trim()]),
  ])
  const impronaSalvata = salvato ? impronta(draftDaMenu(salvato)) : impronta(DRAFT_VUOTO)
  const modificato = impronta(draft) !== impronaSalvata

  const nomeDuplicato = menu.some(m =>
    m.id !== draft.id
    && m.outletId === draft.outletId
    && m.nome.trim().toLowerCase() === draft.nome.trim().toLowerCase())

  const salvabile = !!draft.nome.trim()
    && draft.righe.length > 0
    && !nomeDuplicato
    && !prezzoFissoErrato
    && (!draft.fisso || prezzoFissoNum != null)

  const salva = () => {
    if (!salvabile) {
      toast.error('Completa nome, prezzo e almeno una voce prima di salvare.')
      return
    }
    const dati = {
      outletId: draft.outletId,
      nome: draft.nome.trim(),
      dettagli: draft.dettagli.trim(),
      fisso: draft.fisso,
      prezzoVendita: draft.fisso ? (prezzoFissoNum ?? 0) : null,
      righe: draft.righe.map(r => ({ ...r, descrizione: r.descrizione.trim() })),
      attivo: true,
    }
    if (draft.id) {
      updateMenu(draft.id, dati)
      toast.success(`Menu «${dati.nome}» aggiornato`)
    } else {
      const creato = addMenu({ ...dati, dataCreazione: new Date().toISOString().slice(0, 10) })
      setDraft(d => ({ ...d, id: creato.id }))
      toast.success(`Menu «${dati.nome}» creato`)
    }
    setCompletion(PANE_ID, 'configured')
  }

  const annulla = () => {
    setDraft(salvato ? draftDaMenu(salvato) : DRAFT_VUOTO)
  }

  const nuovoMenu = async () => {
    if (modificato) {
      const ok = await confirm({
        title: 'Nuovo menu',
        message: 'Ci sono modifiche non salvate: abbandonarle e iniziare un menu nuovo?',
        confirmLabel: 'Abbandona e continua',
      })
      if (!ok) return
    }
    setDraft(DRAFT_VUOTO)
    setVoceId('')
  }

  return (
    <div className="crea-menu">
      <CfgToolbar
        actions={(
          <>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={nuovoMenu}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Nuovo menu
            </button>
            <button
              type="button"
              className="sib-btn sib-btn--secondary"
              onClick={() => onGoTo?.('fb-lista-menu')}
            >
              <i className="fa-solid fa-list-ul" aria-hidden="true" />
              Lista menu
            </button>
          </>
        )}
      >
        <span className="crea-menu__stato">
          {draft.id
            ? <><i className="fa-solid fa-pen" aria-hidden="true" /> In modifica: <strong>{salvato?.nome}</strong></>
            : <><i className="fa-solid fa-sparkles" aria-hidden="true" /> Nuovo menu</>}
        </span>
      </CfgToolbar>

      {/* ── Intestazione del menu ───────────────────────────────────────────── */}
      <section className="crea-menu__box">
        <h3 className="crea-menu__box-title">
          <i className="fa-light fa-circle-info" aria-hidden="true" />
          Intestazione del menu
        </h3>
        <div className="crea-menu__grid">
          <SelectField
            name="outlet"
            label="Outlet"
            value={draft.outletId}
            onChange={(e) => upd('outletId', Number(e.target.value))}
            options={OUTLET_FB.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` }))}
          />
          <InputField
            name="nome"
            label="Nome menu"
            required
            value={draft.nome}
            placeholder="es. Menu Pesce"
            error={nomeDuplicato ? 'Esiste già un menu con questo nome su questo outlet.' : undefined}
            onChange={(e) => upd('nome', e.target.value)}
          />
          <InputField
            className="crea-menu__full"
            name="dettagli"
            label="Dettagli"
            value={draft.dettagli}
            placeholder="es. Menu di pesce fresco"
            onChange={(e) => upd('dettagli', e.target.value)}
          />
          <div className="crea-menu__prezzo">
            {/* Tipo di prezzo come scelta esplicita fra due alternative: la
                spunta «Menu fisso» accanto a un campo disabilitato non diceva
                che cosa succede quando è spenta. */}
            <RadioGroup
              name="tipoPrezzo"
              label="Tipo di prezzo"
              value={draft.fisso ? 'fisso' : 'carta'}
              options={[
                { value: 'carta', label: 'A la carte' },
                { value: 'fisso', label: 'Menu fisso' },
              ]}
              onChange={(v) => upd('fisso', v === 'fisso')}
            />
            <InputField
              name="prezzoVendita"
              label="Prezzo di vendita (€)"
              type="number"
              min={0}
              step={1}
              disabled={!draft.fisso}
              value={draft.prezzoVendita}
              placeholder={draft.fisso ? '0,00' : formattaPrezzo(totListino)}
              error={prezzoFissoErrato ? 'Inserisci un importo valido.' : undefined}
              onChange={(e) => upd('prezzoVendita', e.target.value)}
            />
          </div>
          <p className="crea-menu__hint">
            {draft.fisso
              ? 'Menu fisso: il prezzo indicato vale per tutto il menu, a prescindere dai prezzi di carta delle voci.'
              : `Menu a la carte: il prezzo è la somma dei prezzi di carta delle voci incluse (€ ${formattaPrezzo(totListino)}).`}
          </p>
        </div>
      </section>

      {/* ── Voci del menu ───────────────────────────────────────────────────── */}
      <section className="crea-menu__box">
        <h3 className="crea-menu__box-title">
          <i className="fa-light fa-utensils" aria-hidden="true" />
          Voci del menu
          <span className="crea-menu__count">{draft.righe.length} voci</span>
        </h3>
        <div className="crea-menu__add">
          <SelectField
            className="crea-menu__add-voce"
            name="voce"
            label="Voce di catalogo"
            value={voceId}
            onChange={(e) => setVoceId(e.target.value)}
            options={vociOptions}
          />
          <button
            type="button"
            className="sib-btn sib-btn--primary crea-menu__add-btn"
            disabled={!voceId}
            onClick={aggiungiVoce}
          >
            <i className="fa-solid fa-circle-plus" aria-hidden="true" />
            Aggiungi
          </button>
        </div>
      </section>

      <CfgTable
        columns={[
          { key: 'nome',   label: 'Nome',        width: '20%' },
          { key: 'descr',  label: 'Descrizione', width: '27%' },
          { key: 'fc',     label: 'Food cost',   width: '11%', align: 'right' },
          { key: 'prezzo', label: 'Prezzo',      width: '11%', align: 'right' },
          { key: 'marg',   label: 'Margine',     width: '10%', align: 'right' },
          { key: 'gruppo', label: 'Gruppo',      width: '13%' },
          { key: 'azioni', label: 'Azioni',      width: '8%',  align: 'right' },
        ]}
        empty={<span>Nessuna voce nel menu: scegline una dal catalogo e premi «Aggiungi».</span>}
      >
        {righeOrdinate.map(r => {
          const v = voceDi(r.voceId)
          if (!v) return null
          const marg = marginePerc(v.prezzo, v.foodCost)
          return (
            <tr key={r.rid}>
              <td className="crea-menu__td-nome">
                <TruncatedText text={v.nomeIt} />
              </td>
              <td>
                <InputField
                  dense
                  name={`descr-${r.rid}`}
                  ariaLabel={`Descrizione di ${v.nomeIt} in questo menu`}
                  value={r.descrizione}
                  placeholder="Ingredienti e note come compaiono a menu"
                  onChange={(e) => cambiaDescrizione(r.rid, e.target.value)}
                />
              </td>
              <td className="crea-menu__td-num">€ {formattaPrezzo(v.foodCost)}</td>
              <td className="crea-menu__td-num">€ {formattaPrezzo(v.prezzo)}</td>
              <td className="crea-menu__td-num">
                <span className={marg >= 60 ? 'crea-menu__marg--alto' : marg >= 30 ? 'crea-menu__marg--medio' : 'crea-menu__marg--basso'}>
                  {marg}%
                </span>
              </td>
              <td className="crea-menu__td-gruppo">
                <TruncatedText text={categoriaNome(v.categoriaId)} />
              </td>
              <td className="crea-menu__td-azioni">
                <Tooltip content="Togli dal menu">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => rimuoviRiga(r.rid)}
                    aria-label={`Togli ${v.nomeIt} dal menu`}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          )
        })}
      </CfgTable>

      {/* Totali sotto la tabella: mai riquadri di riepilogo in cima alla pagina */}
      {draft.righe.length > 0 && (
        <div className="crea-menu__totali">
          <span>Food cost del menu <strong>€ {formattaPrezzo(totFoodCost)}</strong></span>
          <span>
            {draft.fisso ? 'Prezzo di vendita' : 'Somma dei prezzi di carta'}
            <strong> € {formattaPrezzo(prezzoVend)}</strong>
          </span>
          <span>
            Margine
            <strong className={margineTot >= 60 ? 'crea-menu__marg--alto' : margineTot >= 30 ? 'crea-menu__marg--medio' : 'crea-menu__marg--basso'}>
              {' '}{margineTot}%
            </strong>
          </span>
        </div>
      )}

      <p className="crea-menu__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Food cost, prezzo e allergeni arrivano dalle voci di «Voci menu»: qui si scelgono
        e si descrivono, non si riscrivono. Le voci compaiono nell'ordine delle categorie
        definito in «Categorie», che è l'ordine di stampa del menu.
      </p>

      <CfgSaveBar
        count={modificato ? 1 : 0}
        onSave={salva}
        onCancel={annulla}
        saveLabel={draft.id ? 'Salva modifiche' : 'Salva menu'}
        successMessage={draft.id ? 'Menu aggiornato' : 'Menu salvato'}
      />
    </div>
  )
}
