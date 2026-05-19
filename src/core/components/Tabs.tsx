import React from 'react'

interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex gap-0 border-b border-line mb-4 ${className}`}>
    {tabs.map(t => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={`px-4 py-2.5 text-[13px] font-semibold font-opensans cursor-pointer border-b-2 transition-colors duration-150 ${
          active === t.id
            ? 'text-primary border-primary'
            : 'text-ink-muted border-transparent hover:text-ink hover:border-primary-300'
        }`}
      >
        {t.label}
      </button>
    ))}
  </div>
)

export default Tabs
