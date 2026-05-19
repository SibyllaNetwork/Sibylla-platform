import React, { forwardRef, useRef } from 'react'
import clsx from 'clsx'

export interface SearchFieldProps {
  name?:         string
  value?:        string
  defaultValue?: string
  placeholder?:  string
  disabled?:     boolean
  loading?:      boolean
  onSearch?:     (value: string) => void
  onChange?:     (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear?:      () => void
  className?:    string
}

const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>((
  {
    name = 'search', value, defaultValue,
    placeholder = 'Cerca...', disabled = false, loading = false,
    onSearch, onChange, onClear, className,
  },
  ref
) => {
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef    = (ref as React.RefObject<HTMLInputElement>) ?? internalRef
  const showClear   = value !== undefined && value.length > 0

  return (
    <div className={clsx('relative w-full', className)}>
      <i
        className={clsx(
          'absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-subtle pointer-events-none',
          loading ? 'fa-light fa-spinner-third animate-spin' : 'fa-light fa-magnifying-glass',
        )}
        aria-hidden="true"
      />
      <input
        ref={ref ?? internalRef}
        id={name}
        name={name}
        type="search"
        className="sib-input pl-9 pr-9"
        value={value}
        defaultValue={defaultValue}
        title={value || undefined}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && onSearch && inputRef.current) onSearch(inputRef.current.value)
        }}
        autoComplete="off"
      />
      {showClear && !disabled && (
        <button
          type="button"
          onClick={() => {
            onClear?.()
            if (inputRef.current) { inputRef.current.value = ''; inputRef.current.focus() }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-subtle cursor-pointer"
        >
          <i className="fa-light fa-xmark" aria-hidden="true" />
        </button>
      )}
    </div>
  )
})

SearchField.displayName = 'SearchField'
export default SearchField
