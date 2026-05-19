import React from 'react'
import Ico from '../../../../core/icons/Ico'
import MENU from '../../../../navigation/menu'
import { FN_OPTIONS } from '../../helpers'
import type { FnType, Ruolo } from '../../types'
import './FunzioniTab.sass'

interface Props {
  ruoli: Ruolo[]
  selRuoloId: string | null
  enabled: Set<string>
  fnSearch: string
  setSelRuoloId: (id: string) => void
  setFnSearch: (v: string) => void
  goToRuoli: () => void
  goToModuli: () => void
  getFn: (ruoloId: string, pageId: string) => FnType
  setFn: (ruoloId: string, pageId: string, val: FnType) => void
  setAllFn: (ruoloId: string, val: FnType) => void
}

function getEnabledPagesWithLabel(enabled: Set<string>): Array<{ pageId: string; label: string; modulo: string }> {
  const result: Array<{ pageId: string; label: string; modulo: string }> = []
  const walk = (items: any[], moduloLabel: string) => {
    for (const it of items) {
      if (it.page && enabled.has(it.page)) result.push({ pageId: it.page, label: it.label, modulo: moduloLabel })
      if (it.children) walk(it.children, moduloLabel || it.label)
    }
  }
  ;(MENU as any[]).forEach(top => walk(top.children || [], top.label))
  return result
}

export default function FunzioniTab({
  ruoli, selRuoloId, enabled, fnSearch,
  setSelRuoloId, setFnSearch, goToRuoli, goToModuli,
  getFn, setFn, setAllFn,
}: Props) {
  const selRuolo = ruoli.find(r => r.id === selRuoloId) || null
  const pages = getEnabledPagesWithLabel(enabled)
  const filtered = fnSearch
    ? pages.filter(p =>
        p.label.toLowerCase().includes(fnSearch.toLowerCase()) ||
        p.modulo.toLowerCase().includes(fnSearch.toLowerCase()))
    : pages
  const byModulo: Record<string, typeof pages> = filtered.reduce((acc, p) => {
    if (!acc[p.modulo]) acc[p.modulo] = []
    acc[p.modulo].push(p)
    return acc
  }, {} as Record<string, typeof pages>)

  return (
    <div className="fn-tab">
      <aside className="fn-tab__list">
        <div className="fn-tab__list-title">Seleziona ruolo</div>
        {ruoli.length === 0 ? (
          <div className="fn-tab__empty-list">
            Nessun ruolo.<br />
            <button className="fn-tab__link" onClick={goToRuoli}>Crea un ruolo →</button>
          </div>
        ) : ruoli.map(r => {
          const active = selRuoloId === r.id
          const cls = `fn-tab__list-item${active ? ' fn-tab__list-item--active' : ''}`
          const labelCls = `fn-tab__list-label${active ? ' fn-tab__list-label--active' : ''}`
          return (
            <div
              key={r.id}
              className={cls}
              onClick={() => setSelRuoloId(r.id)}
              style={{ ['--ruolo-color' as any]: r.colore }}
            >
              <div className="fn-tab__list-avatar">
                <Ico n="org" s={13} c="#fff" />
              </div>
              <span className={labelCls}>{r.nome}</span>
            </div>
          )
        })}
      </aside>

      <div className="fn-tab__content">
        {!selRuolo ? (
          <div className="fn-tab__placeholder">
            <Ico n="gear" s={32} c="var(--color-text-disabled)" />
            <p className="fn-tab__placeholder-text">Seleziona un ruolo per configurare le funzioni</p>
          </div>
        ) : (
          <div>
            <div className="fn-tab__header" style={{ ['--ruolo-color' as any]: selRuolo.colore }}>
              <div className="fn-tab__header-left">
                <div className="fn-tab__header-avatar">
                  <Ico n="org" s={13} c="#fff" />
                </div>
                <div>
                  <div className="fn-tab__header-name">{selRuolo.nome}</div>
                  <div className="fn-tab__header-sub">{pages.length} pagine configurabili</div>
                </div>
              </div>
              <div className="fn-tab__header-actions">
                {FN_OPTIONS.map(opt => (
                  <button
                    key={opt.val}
                    className="fn-tab__bulk-btn"
                    onClick={() => setAllFn(selRuolo.id, opt.val)}
                  >
                    <Ico n={opt.icon} s={11} c="currentColor" /> Tutto {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fn-tab__search">
              <Ico n="search" s={12} c="var(--color-text-disabled)" />
              <input
                value={fnSearch}
                onChange={e => setFnSearch(e.target.value)}
                placeholder="Cerca pagina..."
                className="sib-search-input text-xs"
              />
              {fnSearch && (
                <button className="fn-tab__search-clear" onClick={() => setFnSearch('')}>
                  <Ico n="x" s={11} c="var(--color-text-disabled)" />
                </button>
              )}
            </div>

            {enabled.size === 0 ? (
              <div className="fn-tab__empty-pages">
                Nessun modulo assegnato.<br />
                <button className="fn-tab__link" onClick={goToModuli}>Assegna moduli →</button>
              </div>
            ) : (
              <div className="fn-tab__matrix">
                {Object.entries(byModulo).map(([modulo, mPages]) => (
                  <div key={modulo} className="fn-tab__group">
                    <div className="fn-tab__group-head">
                      <span className="fn-tab__group-name">{modulo}</span>
                      <span className="fn-tab__group-count">{mPages.length} pagine</span>
                    </div>
                    <div className="fn-tab__col-head">
                      <div className="fn-tab__col-head-cell">Pagina</div>
                      {FN_OPTIONS.map(opt => (
                        <div key={opt.val} className={`fn-tab__col-head-cell fn-tab__col-head-cell--${opt.val}`}>
                          {opt.label}
                        </div>
                      ))}
                    </div>
                    {mPages.map((pg, i) => {
                      const current = getFn(selRuolo.id, pg.pageId)
                      const rowCls = `fn-tab__row${i < mPages.length - 1 ? ' fn-tab__row--bordered' : ''}`
                      return (
                        <div key={pg.pageId} className={rowCls}>
                          <div className="fn-tab__row-label">{pg.label}</div>
                          {FN_OPTIONS.map(opt => {
                            const radioCls = `fn-tab__radio fn-tab__radio--${opt.val}${current === opt.val ? ' fn-tab__radio--on' : ''}`
                            return (
                              <div key={opt.val} className="fn-tab__radio-cell">
                                <div
                                  className={radioCls}
                                  onClick={() => setFn(selRuolo.id, pg.pageId, opt.val)}
                                  role="radio"
                                  aria-checked={current === opt.val}
                                >
                                  {current === opt.val && (
                                    <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
                                      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
