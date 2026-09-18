import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InfoTip } from './InfoTip';

/**
 * A page/section header matching the "CRM / Sales Intelligence" style: a bold
 * title with an optional muted subtitle. Used to break long analytics pages
 * into labeled sections.
 */
export const SectionHeader = ({
  title,
  subtitle,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    {subtitle && (
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
    )}
  </div>
);

/**
 * A prominent top-level section banner (accent bar + uppercase label + divider)
 * for grouping a page into its major areas, with an optional info tip and a
 * right-aligned action slot.
 */
export const SectionBanner = ({
  label,
  tip,
  action,
  className,
}: {
  label: ReactNode;
  tip?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex items-center gap-2 border-b border-white/10 pb-2', className)}>
    <span className="h-4 w-1 rounded-full bg-[#B4FF39]" />
    <span className="text-sm font-bold uppercase tracking-[0.16em] text-white">{label}</span>
    {tip && <InfoTip>{tip}</InfoTip>}
    {action && <span className="ml-auto">{action}</span>}
  </div>
);
