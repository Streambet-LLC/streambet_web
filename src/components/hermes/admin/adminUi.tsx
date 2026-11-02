import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AuctionStatus } from '@/integrations/api/hermes';
import { STATUS_LABEL, fmtUsd } from '../format';
import { FIELD_CLASS, GHOST_BUTTON_CLASS } from './adminUtils';

// ── Badges ──────────────────────────────────────────────────────────────

const STATUS_TONE: Record<AuctionStatus, string> = {
  scheduled: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  active: 'border-[#C7FA09]/40 bg-[#C7FA09]/10 text-[#C7FA09]',
  ended: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  paid: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  unsold: 'border-white/15 bg-white/5 text-white/60',
  failed: 'border-red-400/30 bg-red-400/10 text-red-300',
  cancelled: 'border-white/10 bg-white/[0.03] text-white/45',
};

export function Pill({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4',
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: AuctionStatus; className?: string }) {
  return (
    <Pill className={cn(STATUS_TONE[status], className)}>
      {status === 'active' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C7FA09]" aria-hidden />
      )}
      {STATUS_LABEL[status]}
    </Pill>
  );
}

/** Reserve amount (admins can see it) + whether the high bid clears it. */
export function ReserveCell({
  reserveUsd,
  bidUsd,
  compact,
}: {
  reserveUsd: number | null;
  bidUsd: number | null;
  compact?: boolean;
}) {
  if (reserveUsd == null) return <span className="text-white/40">No reserve</span>;
  const met = bidUsd != null && bidUsd >= reserveUsd;
  return (
    <span className={cn('inline-flex items-center gap-1.5', compact ? 'flex-wrap' : '')}>
      <span className="tabular-nums text-white/85">{fmtUsd(reserveUsd)}</span>
      <Pill
        className={
          met
            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
            : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
        }
      >
        {met ? 'Met' : 'Not met'}
      </Pill>
    </span>
  );
}

export function ReliabilityBadge({ reliability }: { reliability: string | null }) {
  if (!reliability) return null;
  const tone =
    reliability === 'grounded'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
      : reliability === 'thin'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
        : 'border-red-400/30 bg-red-400/10 text-red-300';
  const label =
    reliability === 'grounded'
      ? 'Grounded'
      : reliability === 'thin'
        ? 'Thin data'
        : reliability === 'unverified'
          ? 'Unverified'
          : reliability;
  return <Pill className={tone}>{label}</Pill>;
}

// ── Segmented control ───────────────────────────────────────────────────

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  ariaLabel: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex max-w-full items-center overflow-x-auto rounded-md border border-white/10 bg-black/40 p-0.5',
        disabled && 'opacity-50',
        className
      )}
    >
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60 disabled:cursor-not-allowed',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8',
              active
                ? 'bg-[#C7FA09] font-semibold text-black'
                : 'text-muted-foreground hover:text-white'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Form bits ───────────────────────────────────────────────────────────

/** USD text input with a "$" adornment. */
export const UsdInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<'input'>, 'type'> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <div className="relative">
    <span
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40"
      aria-hidden
    >
      $
    </span>
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn(FIELD_CLASS, 'pl-6 tabular-nums', invalid && 'border-red-400/60', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  </div>
));
UsdInput.displayName = 'UsdInput';

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-300">
      {children}
    </p>
  );
}

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-1 text-xs text-muted-foreground', className)}>{children}</p>;
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white">{children}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Confirm dialog ──────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={o => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-md border-white/10 bg-[rgba(18,18,18,1)] text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm leading-relaxed text-white/70">{body}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className={GHOST_BUTTON_CLASS}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Keep it
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
