import clsx from 'clsx';
import React, { forwardRef } from 'react';
import { Link } from '../catalyst/link';

export type SibyllaButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'approve'
  | 'reject-secondary'
  | 'reject-tertiary';

export type SibyllaButtonSize = 'sm' | 'md' | 'lg';

const base = [
  'relative isolate inline-flex items-center justify-center gap-2 rounded-control font-sans font-bold whitespace-nowrap',
  'transition-colors cursor-pointer',
  'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  'disabled:cursor-not-allowed',
];

const sizes: Record<SibyllaButtonSize, string> = {
  lg: 'min-w-[144px] h-10 px-6 text-[14px] leading-4',
  md: 'min-w-[120px] h-[35px] px-4 text-[12px] leading-4',
  sm: 'min-w-[120px] h-7 px-4 text-[12px] leading-4',
};

const variants: Record<SibyllaButtonVariant, string> = {
  primary: clsx(
    'border border-transparent bg-primary text-text-negative',
    'hover:bg-link active:bg-link',
    'disabled:bg-disabled disabled:text-text-disabled',
  ),
  secondary: clsx(
    'border-2 border-primary bg-transparent text-primary',
    'hover:border-link hover:text-link active:border-link active:text-link',
    'disabled:border-text-disabled disabled:text-text-disabled',
  ),
  tertiary: clsx(
    'border border-transparent bg-transparent text-link',
    'hover:bg-link-soft active:bg-link-soft',
    'disabled:text-text-disabled',
  ),
  approve: clsx(
    'border border-transparent bg-confirm-500 text-text-negative',
    'hover:bg-confirm-soft active:bg-confirm-soft',
    'disabled:bg-disabled disabled:text-text-disabled',
  ),
  'reject-secondary': clsx(
    'border-2 border-danger-300 bg-transparent text-danger-300',
    'hover:bg-danger-50 active:bg-danger-50',
    'disabled:border-text-disabled disabled:text-text-disabled',
  ),
  'reject-tertiary': clsx(
    'border border-transparent bg-transparent text-danger-300',
    'hover:bg-danger-50 hover:text-primary active:bg-danger-50 active:text-primary',
    'disabled:text-text-disabled',
  ),
};

type CommonProps = {
  variant?: SibyllaButtonVariant;
  size?: SibyllaButtonSize;
  className?: string;
  /** Icona opzionale renderizzata prima del testo (compat con call-site originale Newagora). */
  icon?: React.ReactNode;
  children: React.ReactNode;
};

type ButtonProps =
  | (CommonProps & { href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | (CommonProps & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>);

export const Button = forwardRef(function SibyllaButton(
  { variant = 'primary', size = 'md', className, icon, children, ...props }: ButtonProps,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const classes = clsx(base, sizes[size], variants[variant], className);
  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (typeof (props as { href?: string }).href === 'string') {
    const { href, ...rest } = props as { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link
        {...(rest as any)}
        href={href}
        className={classes}
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      className={classes}
      ref={ref as React.ForwardedRef<HTMLButtonElement>}
    >
      {content}
    </button>
  );
});
