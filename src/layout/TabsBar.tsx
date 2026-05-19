import React from 'react'
import Ico from '../core/icons/Ico'
import { useViewModeStore } from '../store/useViewModeStore'
import { buildCrumbs } from '../navigation/menuHelpers'
import MENU from '../navigation/menu'
import './TabsBar.sass'

interface Props {
  currentPage: string
  navigate:    (p: string) => void
}

export default function TabsBar({ currentPage, navigate }: Props) {
  const tabs     = useViewModeStore(s => s.openTabs)
  const closeTab = useViewModeStore(s => s.closeTab)

  if (tabs.length === 0) return null

  const handleClose = (page: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const idx = tabs.findIndex(t => t.page === page)
    closeTab(page)
    if (page !== currentPage) return

    const remaining = tabs.filter(t => t.page !== page)
    if (remaining.length > 0) {
      const next = remaining[Math.min(idx, remaining.length - 1)]
      navigate(next.page)
    } else {
      navigate('home')
    }
  }

  return (
    <div className="tabs-bar">
      <div className="tabs-bar__list">
        {tabs.map(t => {
          const active = t.page === currentPage
          const crumbs = buildCrumbs(MENU, t.page) || []
          const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2]?.label : ''
          return (
            <button
              key={t.page}
              type="button"
              className={`tabs-bar__tab${active ? ' tabs-bar__tab--active' : ''}`}
              onClick={() => navigate(t.page)}
              onMouseDown={e => {
                if (e.button === 1) {
                  e.preventDefault()
                  handleClose(t.page, e as unknown as React.MouseEvent)
                }
              }}
              title={parent ? `${parent} › ${t.label}` : t.label}
            >
              <span className="tabs-bar__tab-label">{t.label}</span>
              <span
                role="button"
                tabIndex={-1}
                className="tabs-bar__tab-close"
                onClick={e => handleClose(t.page, e)}
              >
                <Ico n="x" s={9} c="currentColor" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
