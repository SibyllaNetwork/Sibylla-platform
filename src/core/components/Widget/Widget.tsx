import React from 'react'
import './Widget.sass'

interface WidgetProps {
  id:                string
  title:             string
  collapsed?:        boolean
  onToggleCollapse?: (id: string) => void
  onDragStart?:      (id: string) => void
  onDragOver?:       (e: React.DragEvent, id: string) => void
  onDrop?:           (e: React.DragEvent, id: string) => void
  onDragEnd?:        () => void
  isDragOver?:       boolean
  className?:        string
  bodyClassName?:    string
  children:          React.ReactNode
}

export default function Widget({
  id,
  title,
  collapsed         = false,
  onToggleCollapse,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver        = false,
  className         = '',
  bodyClassName     = '',
  children,
}: WidgetProps) {
  return (
    <section
      className={`widget ${collapsed ? 'widget--collapsed' : ''} ${isDragOver ? 'widget--drag-over' : ''} ${className}`}
      onDragOver={onDragOver ? (e) => onDragOver(e, id) : undefined}
      onDrop={onDrop ? (e) => onDrop(e, id) : undefined}
    >
      <header
        className="widget__header"
        draggable={!!onDragStart}
        onDragStart={onDragStart ? () => onDragStart(id) : undefined}
        onDragEnd={onDragEnd}
      >
        <h3 className="widget__title">{title}</h3>
        <div className="widget__actions">
          {onToggleCollapse && (
            <button
              type="button"
              className="widget__action"
              aria-label={collapsed ? 'Espandi' : 'Comprimi'}
              onClick={() => onToggleCollapse(id)}
            >
              <i className={`fa-light ${collapsed ? 'fa-plus' : 'fa-minus'}`} />
            </button>
          )}
          {onDragStart && (
            <span className="widget__action widget__action--drag" aria-hidden="true" title="Trascina">
              <i className="fa-light fa-up-down-left-right" />
            </span>
          )}
        </div>
      </header>
      {!collapsed && (
        <div className={`widget__body ${bodyClassName}`}>
          {children}
        </div>
      )}
    </section>
  )
}
