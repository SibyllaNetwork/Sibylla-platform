import React from 'react'

interface FilterToolbarProps {
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

const FilterToolbar: React.FC<FilterToolbarProps> = ({ children, actions, className = '' }) => (
  <div className={`flex items-end gap-3.5 mb-5 flex-wrap ${className}`}>
    {children}
    {actions && <div className="flex items-center gap-2 ml-auto shrink-0">{actions}</div>}
  </div>
)

export default FilterToolbar
