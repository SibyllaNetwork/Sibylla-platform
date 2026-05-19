import clsx from 'clsx';
import React, { forwardRef } from 'react';

export type InputSize = 'standard' | 'dense';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  invalid?: boolean;
}

/* Sibylla text field.
   Standard: 40px, 2px border. Dense: 30px, 1.5px border.
   Radius 6px. Bg white. Border #CFCFCF. Hint/icon #4A4D53.
   Focused: fill #F8FCFF (surface-subtle).
   Error: border #FF616E. Disabled: text #DBDBDB fill #FFF. */
export const Input = forwardRef(function Input(
  { inputSize = 'standard', invalid, className, type = 'text', disabled, ...rest }: InputProps,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={clsx(
        // layout
        'block w-full appearance-none rounded-control bg-surface font-sans text-[14px] leading-5 text-text-active',
        'placeholder:text-text-inactive',
        // size (border 1px always)
        inputSize === 'standard' ? 'h-10 px-3 border' : 'h-[30px] px-3 border',
        // border colour by state
        invalid
          ? 'border-danger-300'
          : disabled
            ? 'border-border'
            : 'border-border hover:border-primary',
        // focus: keep background white, mark border primary
        'focus:outline-none focus:border-primary',
        // disabled
        disabled && 'text-text-disabled placeholder:text-text-disabled cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  );
});
