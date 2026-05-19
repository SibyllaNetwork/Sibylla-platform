import clsx from 'clsx';
import React from 'react';

/* Thin wrapper around the FontAwesome Pro Kit <i> API.
   The kit script (loaded in index.html) auto-injects the SVG inside the <i>.
   We deliberately do NOT use @fortawesome/react-fontawesome here — the kit
   delivers all styles (light/regular/solid/duotone/thin/sharp/kit) without
   needing the React helper or the icon packages. */

export type IconFamily =
  | 'solid'
  | 'regular'
  | 'light'
  | 'thin'
  | 'duotone'
  | 'sharp-solid'
  | 'sharp-regular'
  | 'sharp-light'
  | 'brands'
  | 'kit';

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  family?: IconFamily;
  name: string;
  fixedWidth?: boolean;
  spin?: boolean;
}

export function Icon({
  family = 'solid',
  name,
  fixedWidth,
  spin,
  className,
  'aria-hidden': ariaHidden = true,
  ...rest
}: IconProps) {
  return (
    <i
      {...rest}
      aria-hidden={ariaHidden}
      className={clsx(
        `fa-${family}`,
        `fa-${name}`,
        fixedWidth && 'fa-fw',
        spin && 'fa-spin',
        className,
      )}
    />
  );
}
