import React, { forwardRef } from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';

type To = RouterLinkProps['to'];

export type LinkProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: To;
};

function isExternalHref(href: To): boolean {
  if (typeof href !== 'string') return false;
  return /^(?:[a-z][a-z0-9+\-.]*:|\/\/|mailto:|tel:|#)/i.test(href);
}

export const Link = forwardRef(function Link(
  { href, ...props }: LinkProps,
  ref: React.ForwardedRef<HTMLAnchorElement>,
) {
  if (isExternalHref(href)) {
    return <a ref={ref} href={href as string} {...props} />;
  }
  return <RouterLink ref={ref} to={href} {...(props as any)} />;
});
