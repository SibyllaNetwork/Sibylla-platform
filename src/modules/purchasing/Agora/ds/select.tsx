import clsx from 'clsx';
import React, { forwardRef } from 'react';
import type { InputSize } from './input';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  inputSize?: InputSize;
  invalid?: boolean;
}

/* Sibylla select — same shell as Input, with an explicit chevron.
   Native chevron suppressed via the `appearance-none` utility class. */
export const Select = forwardRef(function Select(
  { inputSize = 'standard', invalid, className, children, disabled, style, ...rest }: SelectProps,
  ref: React.ForwardedRef<HTMLSelectElement>,
) {
  return (
    <span className={clsx('relative block w-full', className)}>
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        style={style}
        className={clsx(
          // layout
          'appearance-none block w-full rounded-control bg-surface font-sans text-[14px] leading-5 text-text-active cursor-pointer',
          'pl-3 pr-10',
          // size (border 1px always)
          inputSize === 'standard' ? 'h-10 border' : 'h-[30px] border',
          // border colour by state
          invalid
            ? 'border-danger-300'
            : disabled
              ? 'border-border'
              : 'border-border hover:border-primary',
          // focus (no blue fill — just the primary border)
          'focus:outline-none focus:border-primary',
          // disabled
          disabled && 'text-text-disabled cursor-not-allowed',
        )}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-active',
          disabled && 'text-text-disabled',
        )}
      >
        <i className="fa-regular fa-angle-down" />
      </span>
    </span>
  );
});
