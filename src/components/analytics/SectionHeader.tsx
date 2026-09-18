import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
