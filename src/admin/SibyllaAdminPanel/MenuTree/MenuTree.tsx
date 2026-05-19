import React from 'react'
import Ico from '../../../core/icons/Ico'
import MenuIco from '../../../core/icons/MenuIco'
import { getAllPages } from '../helpers'
import './MenuTree.sass'

interface Props {
  items: any[]
  selected: Set<string>
  onTogglePage: (pageId: string) => void
  onToggleGroup: (children: any[]) => void
  depth?: number
}

export default function MenuTree({ items, selected, onTogglePage, onToggleGroup, depth = 0 }: Props) {
  return (
    <div className={depth === 0 ? 'mtree' : 'mtree__nested'}>
      {items.map((item: any) => {
        const hasChildren = (item.children?.length ?? 0) > 0
        const childPages: string[] = hasChildren ? getAllPages(item.children) : []
        const allOn = hasChildren
          ? childPages.every(pg => selected.has(pg))
          : selected.has(item.page)
        const someOn = hasChildren ? childPages.some(pg => selected.has(pg)) : false
        const checkedCount = hasChildren ? childPages.filter(pg => selected.has(pg)).length : 0

        const checkboxClass = `mtree__checkbox${
          allOn ? ' mtree__checkbox--all'
          : someOn ? ' mtree__checkbox--some'
          : ''
        }`

        const labelClass = [
          'mtree__label',
          `mtree__label--depth-${Math.min(depth, 2)}`,
          allOn ? 'mtree__label--active' : '',
        ].filter(Boolean).join(' ')

        const dotClass = `mtree__dot${allOn ? ' mtree__dot--active' : ''}`

        return (
          <div key={item.id} className="mtree__item">
            <div className="mtree__row">
              <div
                className={checkboxClass}
                onClick={() => hasChildren ? onToggleGroup(item.children) : onTogglePage(item.page)}
                role="checkbox"
                aria-checked={allOn ? 'true' : someOn ? 'mixed' : 'false'}
              >
                {allOn && (
                  <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {someOn && !allOn && <div className="mtree__indeterminate" />}
              </div>
              <div className="mtree__label-wrap">
                {depth === 0 && item.icon && (
                  <Ico n={item.icon} s={13} c={allOn ? 'var(--color-primary)' : 'var(--color-text-disabled)'} />
                )}
                {depth === 1 && (
                  <MenuIco id={item.id} s={11} c={allOn ? 'var(--color-primary)' : 'var(--color-text-disabled)'} />
                )}
                {depth >= 2 && <div className={dotClass} />}
                <span className={labelClass}>{item.label}</span>
                {hasChildren && (
                  <span className="mtree__count">{checkedCount}/{childPages.length}</span>
                )}
              </div>
            </div>
            {hasChildren && (
              <MenuTree
                items={item.children}
                selected={selected}
                onTogglePage={onTogglePage}
                onToggleGroup={onToggleGroup}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
