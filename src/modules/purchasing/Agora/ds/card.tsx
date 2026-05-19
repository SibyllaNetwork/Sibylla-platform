import clsx from 'clsx';
import React, { forwardRef } from 'react';
import { Link } from '../catalyst/link';

/* Sibylla Card — rounded-card (15px), border soft #DBDBDB, bg surface.
   Use `href` to render as a RouterLink (whole card clickable). */

type BaseCardProps = {
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
};

type CardStaticProps = BaseCardProps & React.HTMLAttributes<HTMLDivElement>;
type CardLinkProps = BaseCardProps & {
  href: string;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'>;
type CardButtonProps = BaseCardProps & {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'onClick'>;

type CardProps = CardStaticProps | CardLinkProps | CardButtonProps;

const baseClasses =
  'block rounded-card border border-border-soft bg-surface transition-colors';
const interactiveClasses =
  'cursor-pointer hover:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export const Card = forwardRef(function Card(
  props: CardProps,
  ref: React.ForwardedRef<HTMLElement>,
) {
  const { className, children, padded = true } = props;
  const padding = padded ? 'p-5' : '';

  if ('href' in props && typeof props.href === 'string') {
    const { href, ...rest } = props as CardLinkProps;
    return (
      <Link
        ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        href={href}
        className={clsx(baseClasses, interactiveClasses, padding, className)}
        {...(rest as Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href' | 'className' | 'children'>)}
      >
        {children}
      </Link>
    );
  }

  if ('onClick' in props && typeof props.onClick === 'function') {
    const { onClick, ...rest } = props as CardButtonProps;
    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={clsx(baseClasses, interactiveClasses, padding, 'text-left', className)}
        {...(rest as Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children' | 'onClick'>)}
      >
        {children}
      </button>
    );
  }

  const { ...rest } = props as CardStaticProps;
  return (
    <div
      ref={ref as React.ForwardedRef<HTMLDivElement>}
      className={clsx(baseClasses, padding, className)}
      {...(rest as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
});
