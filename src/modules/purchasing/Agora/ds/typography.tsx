import clsx from 'clsx';
import React from 'react';

/* Sibylla Design System typography primitives.
   Colors & weights match the Sibylla PDF spec exactly. */

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: HeadingLevel;
}

const headingClasses: Record<HeadingLevel, string> = {
  1: 'font-heading font-semibold text-h1 text-primary',       // Poppins 32/35 w600
  2: 'font-heading font-semibold text-h2 text-primary',       // Poppins 24/30 w600
  3: 'font-heading font-bold text-h3 text-primary',           // Poppins 18/21 w700
  4: 'font-heading font-semibold text-h4 text-primary',       // Poppins 14/14 w600
  5: 'font-sans font-bold text-h5 text-text-active',          // Open Sans 16/19 w700
  6: 'font-sans font-medium text-h6 text-text-inactive',      // Open Sans 10/14 w500
};

function makeHeading(defaultLevel: HeadingLevel) {
  return function Heading({ level, as, className, ...rest }: HeadingProps) {
    const l = (level ?? as ?? defaultLevel) as HeadingLevel;
    const Tag = (`h${l}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag {...rest} className={clsx(headingClasses[l], className)} />;
  };
}

export const H1 = makeHeading(1);
export const H2 = makeHeading(2);
export const H3 = makeHeading(3);
export const H4 = makeHeading(4);
export const H5 = makeHeading(5);
export const H6 = makeHeading(6);

/* Paragraph variants (body text) */

interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function P1({ className, ...rest }: ParagraphProps) {
  // Open Sans 14/20 w400 — default body copy
  return <p {...rest} className={clsx('font-sans font-normal text-p1 text-text-active', className)} />;
}
export function P2({ className, ...rest }: ParagraphProps) {
  // Poppins 14/20 w600 — emphasized body
  return <p {...rest} className={clsx('font-heading font-semibold text-p1 text-text-active', className)} />;
}
export function P3({ className, ...rest }: ParagraphProps) {
  // Open Sans 14/20 w400 — same metrics as P1, used for secondary text (inactive color)
  return <p {...rest} className={clsx('font-sans font-normal text-p1 text-text-inactive', className)} />;
}
export function P4({ className, ...rest }: ParagraphProps) {
  // Open Sans 14/20 w600 — section label body
  return <p {...rest} className={clsx('font-sans font-semibold text-p1 text-text-active', className)} />;
}
export function P5({ className, ...rest }: ParagraphProps) {
  // Open Sans 16/20 w700 — list item heading
  return <p {...rest} className={clsx('font-sans font-bold text-p5 text-text-active', className)} />;
}
export function P6({ className, ...rest }: ParagraphProps) {
  // Poppins 11 w700 — labels on tiny surfaces
  return <p {...rest} className={clsx('font-heading font-bold text-p6 text-text-active', className)} />;
}

/* Labels */
export function L1({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  // Open Sans 14/22 w600
  return <span {...rest} className={clsx('font-sans font-semibold text-l1 text-text-active', className)} />;
}
export function L2({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  // Open Sans 14/20 w200
  return <span {...rest} className={clsx('font-sans font-extralight text-p1 text-text-active', className)} />;
}
