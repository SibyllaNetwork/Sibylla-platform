import React from 'react'

interface Props {
  checked  : boolean
  onChange : (v: boolean) => void
  size?    : number
  disabled?: boolean
}

export default function ToggleSwitch({ checked, onChange, size = 18, disabled = false }: Props) {
  return (
    <div
      className={[
        'toggle-switch',
        checked   ? 'toggle-switch--on'       : 'toggle-switch--off',
        disabled  ? 'toggle-switch--disabled' : '',
      ].join(' ')}
      style={{ width: size * 2, height: size, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div
        className="toggle-switch__knob"
        style={{
          width  : size - 4,
          height : size - 4,
          left   : checked ? size - 2 : 2,
        }}
      />
    </div>
  )
}
