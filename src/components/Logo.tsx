import logoUrl from '@/assets/brand/fanittLogoNew.png';

interface LogoProps {
  className?: string;
  dark?: boolean;
}

/** Real brand logo (uploaded artwork) — used everywhere the logo appears.
 * Pass a className to fully control sizing for a specific spot (e.g. the
 * navbar); otherwise it falls back to the default large size. */
export function Logo({ className }: LogoProps) {
  return <img src={logoUrl} alt="Fanitt — Live This Life" className={className || 'h-9 w-auto sm:h-10'} />;
}