import clsx from 'clsx';
import React from 'react';

/* Sibylla form label — Poppins bold, primary color (#204769). */
export function Label({
  className,
  children,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={clsx(
        'inline-flex items-center gap-1.5 font-sans font-bold text-[0.8125rem] leading-[0.5rem] text-primary select-none',
        'data-disabled:opacity-50',
        className,
      )}
    >
      {children}
    </label>
  );
}
