import { useCallback, useEffect, useRef, useState } from 'react'

export type WidgetLayout = string[][]

interface StoredLayout {
  layout:    WidgetLayout
  collapsed: string[]
}

const STORAGE_PREFIX = 'sibylla.widgetLayout.'

const sameIds = (a: WidgetLayout, b: WidgetLayout) => {
  const fa = a.flat().slice().sort()
  const fb = b.flat().slice().sort()
  if (fa.length !== fb.length) return false
  return fa.every((id, i) => id === fb[i])
}

const load = (key: string, fallback: WidgetLayout): StoredLayout => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return { layout: fallback, collapsed: [] }
    const parsed = JSON.parse(raw) as StoredLayout
    if (!parsed.layout || !Array.isArray(parsed.layout)) return { layout: fallback, collapsed: [] }
    if (!sameIds(parsed.layout, fallback)) return { layout: fallback, collapsed: parsed.collapsed ?? [] }
    return { layout: parsed.layout, collapsed: parsed.collapsed ?? [] }
  } catch {
    return { layout: fallback, collapsed: [] }
  }
}

export function useWidgetLayout(key: string, initial: WidgetLayout) {
  const [layout,    setLayout]    = useState<WidgetLayout>(() => load(key, initial).layout)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(load(key, initial).collapsed))
  const dragId = useRef<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({
        layout,
        collapsed: Array.from(collapsed),
      }))
    } catch {}
  }, [key, layout, collapsed])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    if (!dragId.current || dragId.current === id) return
    e.preventDefault()
    setOverId(id)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const source = dragId.current
    dragId.current = null
    setOverId(null)
    if (!source || source === targetId) return
    setLayout(prev => {
      const next = prev.map(col => [...col])
      let srcCol = -1, srcIdx = -1, tgtCol = -1, tgtIdx = -1
      for (let c = 0; c < next.length; c++) {
        const i = next[c].indexOf(source); if (i >= 0) { srcCol = c; srcIdx = i }
        const j = next[c].indexOf(targetId); if (j >= 0) { tgtCol = c; tgtIdx = j }
      }
      if (srcCol < 0 || tgtCol < 0) return prev
      next[srcCol].splice(srcIdx, 1)
      if (srcCol === tgtCol && srcIdx < tgtIdx) tgtIdx -= 1
      next[tgtCol].splice(tgtIdx, 0, source)
      return next
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    dragId.current = null
    setOverId(null)
  }, [])

  const handleColumnDrop = useCallback((e: React.DragEvent, colIdx: number) => {
    e.preventDefault()
    const source = dragId.current
    dragId.current = null
    setOverId(null)
    if (!source) return
    setLayout(prev => {
      const next = prev.map(col => [...col])
      for (let c = 0; c < next.length; c++) {
        const i = next[c].indexOf(source)
        if (i >= 0) next[c].splice(i, 1)
      }
      next[colIdx].push(source)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setLayout(initial)
    setCollapsed(new Set())
  }, [initial])

  return {
    layout,
    collapsed,
    overId,
    toggleCollapse,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleColumnDrop,
    reset,
  }
}
