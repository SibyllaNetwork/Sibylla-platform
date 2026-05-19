import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, className = '' }) => (
  <div className={`page-header ${className}`}>
    <h1 className="page-header__title">{title}</h1>
    {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
  </div>
)

export default PageHeader
