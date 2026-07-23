import React from 'react';
import clsx from 'clsx';
import { useSectionThemeStore } from '../../../../store/useSectionThemeStore';

// ── DS Agorà (modalità dissociata) ────────────────────────────────────────────
import { Button as AgoraButton } from '../ds/button';
import { Input as AgoraInput } from '../ds/input';
import { Label as AgoraLabel } from '../ds/label';
import { H3 as AgoraH3, P3 as AgoraP3 } from '../ds/typography';
import { PageHeader as AgoraPageHeader } from './PageHeader';

// ── DS Platform (modalità unificata) ──────────────────────────────────────────
import PlatformButton from '../../../../core/components/Button/Button';
import PageHead from '../../../../core/components/PageHead';

/*
 * Adattatori DS per la pagina "Pacchetti dinamici".
 *
 * La pagina segue la logica del tema per-sezione (useSectionThemeStore):
 *   • visualizzazione UNIFICATA  (dissociato = false) → DS di Platform;
 *   • visualizzazione DISSOCIATA (dissociato = true)  → DS di Agorà (quello storico).
 *
 * I colori si adattano già da soli via i token --color-* (override [data-section]);
 * qui scambiamo i COMPONENTI (forma bottoni, stile label, tipografia, header).
 * Icon / Slider / Field non hanno un contro-altare Platform e restano invariati.
 */
export function usePlatformDs(): boolean {
  // Unificata = NON dissociato → DS Platform.
  return !useSectionThemeStore((s) => s.dissociato);
}

/* ── Button ──────────────────────────────────────────────────────────────────*/
interface DsButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}
export function DsButton({ variant = 'primary', size = 'md', children, ...rest }: DsButtonProps) {
  const platform = usePlatformDs();
  if (platform) {
    return (
      <PlatformButton variant={variant} size={size} {...rest}>
        {children}
      </PlatformButton>
    );
  }
  return (
    <AgoraButton variant={variant} size={size} {...rest}>
      {children}
    </AgoraButton>
  );
}

/* ── Input ───────────────────────────────────────────────────────────────────*/
type DsInputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export function DsInput({ className, invalid, ...rest }: DsInputProps) {
  const platform = usePlatformDs();
  if (platform) {
    return (
      <input
        className={clsx('sib-input', invalid && 'sib-input--error', className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    );
  }
  return <AgoraInput className={className} invalid={invalid} {...rest} />;
}

/* ── Label ───────────────────────────────────────────────────────────────────*/
export function DsLabel({ className, children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const platform = usePlatformDs();
  if (platform) {
    return (
      <label className={clsx('font-poppins text-[12px] font-semibold text-primary', className)} {...rest}>
        {children}
      </label>
    );
  }
  return (
    <AgoraLabel className={className} {...rest}>
      {children}
    </AgoraLabel>
  );
}

/* ── Tipografia ──────────────────────────────────────────────────────────────*/
export function DsH3({ className, children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  const platform = usePlatformDs();
  if (platform) {
    return (
      <h3 className={clsx('font-poppins text-[18px] font-semibold leading-[1.3] text-primary', className)} {...rest}>
        {children}
      </h3>
    );
  }
  return (
    <AgoraH3 className={className} {...rest}>
      {children}
    </AgoraH3>
  );
}

export function DsP3({ className, children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  const platform = usePlatformDs();
  if (platform) {
    return (
      <p className={clsx('font-opensans text-[13px] leading-[1.5] text-ink-muted', className)} {...rest}>
        {children}
      </p>
    );
  }
  return (
    <AgoraP3 className={className} {...rest}>
      {children}
    </AgoraP3>
  );
}

/* ── Header di pagina ─────────────────────────────────────────────────────────*/
interface DsPageHeaderProps {
  title: string;
  subtitle?: string;
}
export function DsPageHeader({ title, subtitle }: DsPageHeaderProps) {
  const platform = usePlatformDs();
  if (platform) {
    return <PageHead title={title} subtitle={subtitle} />;
  }
  return <AgoraPageHeader title={title} subtitle={subtitle} />;
}
