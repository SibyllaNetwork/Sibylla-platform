import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import Ico from '../core/icons/Ico'
import MenuIco from '../core/icons/MenuIco'
import Accordion from '../core/components/Accordion'
import MENU from '../navigation/menu'
import { buildCrumbs, resolveActivePage } from '../navigation/menuHelpers'

// ─── Helper: padding per profondità ──────────────────────────────────────────
// Replica le regole `&--d{1..5}` del vecchio SASS:
//   d1 → 9/12/9/16,  d2 → 7/12/7/26,  d3 → 7/12/7/40,  d4-5 → 6/12/6/54-66
const VERT_PAD   = ['', 'py-[4px]', 'py-[7px]', 'py-[7px]', 'py-1.5', 'py-1.5'] as const
const LEFT_PAD   = ['', 'pl-4',      'pl-[26px]', 'pl-10',   'pl-[54px]', 'pl-[66px]'] as const

const DEPTH_FONT = [
  '',
  'font-poppins  text-[13px] font-medium',   // d1
  'font-opensans text-xs     font-medium',   // d2
  'font-opensans text-xs     font-normal',   // d3
] as const

function NavItem({ item, depth, modColor, currentPage, navigate, sideOpen, favorites, onCtxMenu, openId, setOpenId }: any) {
  const hasChildren  = (item.children?.length ?? 0) > 0
  const effectivePage = resolveActivePage(currentPage)
  const crumbs       = buildCrumbs(MENU, effectivePage) || []
  const isInPath     = crumbs.some((c: any) => c.id === item.id)
  const isActive     = item.page && (item.page === currentPage || item.page === effectivePage)
  const color       = modColor ?? item.color ?? '#5C9CD4'
  const open        = openId === item.id

  const [childOpenId, setChildOpenId] = useState<string | null>(() => {
    if (!hasChildren) return null
    const inPath = item.children?.find((c: any) => crumbs.some((cr: any) => cr.id === c.id))
    return inPath?.id || null
  })

  useEffect(() => {
    if (isInPath && setOpenId) setOpenId(item.id)
    if (hasChildren) {
      const inPath = item.children?.find((c: any) => crumbs.some((cr: any) => cr.id === c.id))
      if (inPath) setChildOpenId(inPath.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleClick = () => {
    if (hasChildren && setOpenId) setOpenId(open ? null : item.id)
    if (item.page) navigate(item.page)
  }

  const d = Math.min(depth, 5)

  const rowClass = clsx(
    'flex items-center gap-2.5 cursor-pointer border-l-[3px] border-l-transparent transition-colors duration-[130ms]',
    VERT_PAD[d],
    !sideOpen ? 'justify-center px-0' : `pr-3 ${LEFT_PAD[d]}`,
    isActive
      ? 'bg-white/10 hover:bg-white/[0.12] border-l-[var(--mod-color,#5C9CD4)] text-[var(--mod-color,#5C9CD4)]'
      : isInPath
        ? 'border-l-white/15 text-white/85 hover:bg-white/[0.06] hover:text-white/90'
        : 'text-white/65 hover:bg-white/[0.06] hover:text-white/90',
  )

  const labelClass = clsx(
    'flex-1 overflow-hidden text-ellipsis whitespace-nowrap',
    DEPTH_FONT[Math.min(d, 3)],
    isActive
      ? 'font-bold text-[var(--mod-color,#5C9CD4)]'
      : isInPath
        ? 'font-semibold text-white/90'
        : '',
  )

  const dotClass = clsx(
    'w-[5px] h-[5px] rounded-full shrink-0',
    isActive
      ? 'bg-[var(--mod-color,#5C9CD4)]'
      : isInPath
        ? 'bg-white/50'
        : 'bg-white/[0.22]',
  )

  const chevronClass = clsx(
    'shrink-0 flex items-center transition-transform duration-200 ease-in-out text-white/95',
    open && 'rotate-180',
  )

  return (
    <div>
      <div
        className={rowClass}
        style={{ '--mod-color': color } as React.CSSProperties}
        onClick={handleClick}
        onContextMenu={e => {
          if (item.page && onCtxMenu) {
            e.preventDefault()
            onCtxMenu(e.clientX, e.clientY, item.page, item.label)
          }
        }}
      >
        {depth === 1 && item.icon && (
          <span className={clsx(
            'w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150',
            isActive ? 'bg-[var(--mod-color,#5C9CD4)]/20' : 'bg-white/[0.06]',
          )}>
            <Ico n={item.icon} s={18} />
          </span>
        )}
        {depth === 2 && <MenuIco id={item.id} s={14} />}
        {depth === 3 && <MenuIco id={item.id} s={13} />}
        {depth === 4 && <MenuIco id={item.id} s={12} />}
        {depth >= 5 && <span className={dotClass} />}

        {sideOpen && (
          <>
            <span className={labelClass}>{item.label}</span>
            {hasChildren && (
              <span className={chevronClass}>
                <Ico n="chevd" s={depth <= 1 ? 11 : 9} />
              </span>
            )}
          </>
        )}
      </div>

      {hasChildren && sideOpen && (
        <Accordion open={open}>
          {item.children.map((child: any) => (
            <NavItem
              key={child.id}
              item={child}
              depth={depth + 1}
              modColor={color}
              currentPage={currentPage}
              navigate={navigate}
              sideOpen={sideOpen}
              favorites={favorites}
              onCtxMenu={onCtxMenu}
              openId={childOpenId}
              setOpenId={setChildOpenId}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}

export default NavItem
