import clsx from 'clsx';
import React from 'react';

/* Vertical stack: label + control + optional error message. */
export function Field({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={clsx('flex flex-col gap-1.5', className)}>
      {children}
    </div>
  );
}

export function FieldError({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p
      {...rest}
      className={clsx('font-sans text-[11px] leading-4 text-danger-300', className)}
    >
      {children}
    </p>
  );
}
