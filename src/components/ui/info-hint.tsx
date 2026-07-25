import * as React from 'react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type InfoHintProps = {
  /** The explainer shown in the floating panel. */
  content: React.ReactNode;
  /** The visible trigger (icon, label, etc.). */
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  'aria-label'?: string;
};

/**
 * A hover-AND-tap explainer. Unlike a plain tooltip (hover/focus only), this
 * opens on pointer hover, keyboard focus, and click/tap — so it works the same
 * on desktop and touch. Content is portaled, so it never gets clipped by a
 * parent's `overflow-hidden` (e.g. widget cards).
 */
export function InfoHint({
  content,
  children,
  className,
  contentClassName,
  side = 'top',
  align = 'center',
  'aria-label': ariaLabel = 'More info',
}: InfoHintProps) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<number | undefined>(undefined);

  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // Small grace period so the pointer can travel from trigger into the panel.
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  React.useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn('cursor-help outline-none', className)}
          onPointerEnter={openNow}
          onPointerLeave={closeSoon}
          onFocus={openNow}
          onBlur={closeSoon}
          onClick={() => setOpen(o => !o)}
        >
          {children}
        </button>
      </PopoverAnchor>
      <PopoverContent
        side={side}
        align={align}
        onOpenAutoFocus={e => e.preventDefault()}
        onCloseAutoFocus={e => e.preventDefault()}
        onPointerEnter={openNow}
        onPointerLeave={closeSoon}
        className={cn(
          'w-auto max-w-[260px] border-white/10 bg-[rgba(18,18,18,0.98)] p-2.5 text-xs leading-snug text-white/85 shadow-xl',
          contentClassName,
        )}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
