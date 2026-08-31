import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SearchField, InputField } from '../../../../../core/components/form'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import Pagination from '../../../../../core/components/Pagination'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './MarketSpecifics.sass'

// ─── MARKET SPECIFICS (§4.16) ─────────────────────────────────────────────────
//  Specificità per mercato geografico, riferite al SEGMENTO GRUPPI (indicato
//  accanto alla voce). Rispetto al pane precedente:
//   • campo di ricerca nazionalità (35 righe erano senza filtro);
//   • «Scontistica» → «Promozione»;
//   • box numerici senza frecce e più compatti, nazioni senza bold;
//   • conteggio sotto la tabella e paginazione CENTRATA (standard piattaforma);
//   • salvataggio su CfgSaveBar con dirty state.

const PANE_ID = 'market-specifics'
const PAGE_SIZE = 10

interface Naz { id: number; nome: string; flagEmoji: string; promozione: number }
interface Data { naz: Naz[] }

const FALLBACK: Naz[] = [
  { id: 1,  nome: 'Italia',          flagEmoji: '🇮🇹', promozione: 3 },
  { id: 2,  nome: 'Germania',        flagEmoji: '🇩🇪', promozione: 3 },
  { id: 3,  nome: 'Francia',         flagEmoji: '🇫🇷', promozione: 3 },
  { id: 4,  nome: 'Spagna',          flagEmoji: '🇪🇸', promozione: 3 },
  { id: 5,  nome: 'Grecia',          flagEmoji: '🇬🇷', promozione: 3 },
  { id: 6,  nome: 'Svizzera',        flagEmoji: '🇨🇭', promozione: 3 },
  { id: 7,  nome: 'Inghilterra',     flagEmoji: '🇬🇧', promozione: 3 },
  { id: 8,  nome: 'USA',             flagEmoji: '🇺🇸', promozione: 3 },
  { id: 9,  nome: 'Canada',          flagEmoji: '🇨🇦', promozione: 3 },
  { id: 10, nome: 'Russia',          flagEmoji: '🇷🇺', promozione: 3 },
  { id: 11, nome: 'Austria',         flagEmoji: '🇦🇹', promozione: 3 },
  { id: 12, nome: 'Belgio',          flagEmoji: '🇧🇪', promozione: 3 },
  { id: 13, nome: 'Paesi Bassi',     flagEmoji: '🇳🇱', promozione: 3 },
  { id: 14, nome: 'Portogallo',      flagEmoji: '🇵🇹', promozione: 3 },
  { id: 15, nome: 'Danimarca',       flagEmoji: '🇩🇰', promozione: 3 },
  { id: 16, nome: 'Svezia',          flagEmoji: '🇸🇪', promozione: 3 },
  { id: 17, nome: 'Norvegia',        flagEmoji: '🇳🇴', promozione: 3 },
  { id: 18, nome: 'Finlandia',       flagEmoji: '🇫🇮', promozione: 3 },
  { id: 19, nome: 'Polonia',         flagEmoji: '🇵🇱', promozione: 3 },
  { id: 20, nome: 'Repubblica Ceca', flagEmoji: '🇨🇿', promozione: 3 },
  { id: 21, nome: 'Ungheria',        flagEmoji: '🇭🇺', promozione: 3 },
  { id: 22, nome: 'Romania',         flagEmoji: '🇷🇴', promozione: 3 },
  { id: 23, nome: 'Irlanda',         flagEmoji: '🇮🇪', promozione: 3 },
  { id: 24, nome: 'Turchia',         flagEmoji: '🇹🇷', promozione: 3 },
  { id: 25, nome: 'Croazia',         flagEmoji: '🇭🇷', promozione: 3 },
  { id: 26, nome: 'Slovenia',        flagEmoji: '🇸🇮', promozione: 3 },
  { id: 27, nome: 'Giappone',        flagEmoji: '🇯🇵', promozione: 3 },
  { id: 28, nome: 'Cina',            flagEmoji: '🇨🇳', promozione: 3 },
  { id: 29, nome: 'Corea del Sud',   flagEmoji: '🇰🇷', promozione: 3 },
  { id: 30, nome: 'India',           flagEmoji: '🇮🇳', promozione: 3 },
  { id: 31, nome: 'Brasile',         flagEmoji: '🇧🇷', promozione: 3 },
  { id: 32, nome: 'Argentina',       flagEmoji: '🇦🇷', promozione: 3 },
  { id: 33, nome: 'Australia',       flagEmoji: '🇦🇺', promozione: 3 },
  { id: 34, nome: 'Nuova Zelanda',   flagEmoji: '🇳🇿', promozione: 3 },
  { id: 35, nome: 'Messico',         flagEmoji: '🇲🇽', promozione: 3 },
]

/** Nomi storici in maiuscolo → forma leggibile (senza bold, richiesta §4.16). */
function titleCase(nome: string): string {
  if (nome === nome.toUpperCase() && nome.length > 3) {
    return nome.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
  }
  return nome
}

function countChanges(saved: Naz[], draft: Naz[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (saved[i].promozione !== draft[i].promozione) n++
  }
  return n
}

export default function MarketSpecifics() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [saved, setSaved] = useState<Naz[]>(FALLBACK)
  const [naz, setNaz]     = useState<Naz[]>(FALLBACK)
  const [query, setQuery] = useState('')
  const [page, setPage]   = useState(1)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetMarketSpecifics', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.naz) || d.naz.length === 0) return
        // Compatibilità con il payload storico («sconto» → «promozione»)
        const rows = d.naz.map((r: any) => ({ ...r, promozione: r.promozione ?? r.sconto ?? 0 }))
        setSaved(rows)
        setNaz(rows)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, naz), [saved, naz])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  // ── Ricerca nazionalità + paginazione ───────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? naz.filter(n => n.nome.toLowerCase().includes(q)) : naz
  }, [naz, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageItems  = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  const update = (id: number, promozione: number) =>
    setNaz(ns => ns.map((n) => n.id === id ? { ...n, promozione } : n))

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetMarketSpecifics', { method: 'POST', body: { naz } })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[MarketSpecifics] persistenza remota non disponibile:', err)
    }
    setSaved(naz)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  return (
    <div className="market-specifics">
      <CfgToolbar
        actions={
          <span className="market-specifics__segmento" role="note">
            <i className="fa-light fa-users" aria-hidden="true" />
            Configurazione riferita al segmento Gruppi
          </span>
        }
      >
        <SearchField
          name="cerca-nazionalita"
          placeholder="Cerca nazionalità…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          onClear={() => { setQuery(''); setPage(1) }}
          className="market-specifics__search"
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'nazionalita', label: 'Nazionalità', width: '64%' },
          { key: 'promozione',  label: 'Promozione',  width: '36%' },
        ]}
        empty={<span>Nessuna nazionalità corrisponde a «{query}»</span>}
      >
        {pageItems.map((n) => (
          <tr key={n.id}>
            <td>
              <span className="market-specifics__naz">
                <span className="market-specifics__flag" aria-hidden="true">{n.flagEmoji}</span>
                <span>{titleCase(n.nome)}</span>
              </span>
            </td>
            <td>
              <span className="market-specifics__promo">
                <InputField
                  name={`promozione-${n.id}`}
                  type="number"
                  value={n.promozione}
                  min={0}
                  max={100}
                  onChange={(e) => update(n.id, Number(e.target.value) || 0)}
                  className="market-specifics__promo-input"
                />
                <span className="market-specifics__unit">%</span>
              </span>
            </td>
          </tr>
        ))}
      </CfgTable>

      <div className="market-specifics__count">
        {query
          ? `${filtered.length} di ${naz.length} nazionalità`
          : `${naz.length} nazionalità`}
      </div>

      <div className="market-specifics__pagination">
        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <CfgSaveBar
        className="market-specifics__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setNaz(saved)}
        successMessage="Market specifics salvati"
      />
    </div>
  )
}
