import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';

export interface TourStep {
  /** CSS selector for the element to spotlight. Omit for a centered step. */
  selector?: string;
  title: string;
  body: ReactNode;
}

const TIP_W = 330;

/**
 * A lightweight, dependency-free guided tour. It dims the page, spotlights the
 * target element for each step, and floats an explainer card with
 * Back / Next / Skip. Falls back to a centered card when a step has no target
 * (or the target isn't on screen). See MarketHeatTour usage in AnalyticsMarket.
 */
export const GuidedTour = ({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}) => {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Measure the card so we can keep it fully on screen (targets can be taller
  // than the viewport, which would otherwise push the card off-screen).
  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, rect, open]);

  const measure = useCallback(() => {
    const sel = steps[i]?.selector;
    const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [i, steps]);

  // Scroll the target into view, then measure once it settles.
  useEffect(() => {
    if (!open) return;
    const sel = steps[i]?.selector;
    const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(measure, el ? 320 : 0);
    return () => clearTimeout(t);
  }, [open, i, steps, measure]);

  // Keep the spotlight aligned on scroll / resize.
  useEffect(() => {
    if (!open) return;
    const on = () => measure();
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('scroll', on, true);
    };
  }, [open, measure]);

  // Keyboard: Esc to skip, arrows to move.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI(v => Math.min(v + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setI(v => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, steps.length, onClose]);

  if (!open || steps.length === 0) return null;

  const step = steps[i];
  const first = i === 0;
  const last = i === steps.length - 1;
  const pad = 6;

  // Card placement. Prefer below the target, else above, else pin to the
  // bottom; then clamp so the whole card always stays on screen and clickable
  // (targets can be taller than the viewport).
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const maxTop = Math.max(12, vh - cardH - 12);
  let tipStyle: CSSProperties;
  if (rect) {
    const left = clamp(rect.left, 12, Math.max(12, vw - TIP_W - 12));
    let top: number;
    if (rect.bottom + 14 + cardH <= vh) top = rect.bottom + 14;
    else if (rect.top - 14 - cardH >= 0) top = rect.top - 14 - cardH;
    else top = maxTop;
    tipStyle = { top: clamp(top, 12, maxTop), left };
  } else {
    tipStyle = {
      top: clamp((vh - cardH) / 2, 12, maxTop),
      left: Math.max(12, (vw - TIP_W) / 2),
    };
  }

  // Keep the spotlight ring inside the viewport so a tall target doesn't ring
  // the whole page and bleed off-screen.
  const ringTop = rect ? clamp(rect.top - pad, 8, Math.max(8, vh - 24)) : 0;
  const ringLeft = rect ? clamp(rect.left - pad, 8, Math.max(8, vw - 24)) : 0;
  const ringBottom = rect ? clamp(rect.bottom + pad, ringTop + 16, vh - 8) : 0;
  const ringRight = rect ? clamp(rect.right + pad, ringLeft + 16, vw - 8) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Click blocker (transparent) so the page isn't interacted with mid-tour. */}
      <div className="absolute inset-0" />

      {/* Dim + spotlight */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg border-2 border-[#B4FF39]/70 transition-all duration-200"
          style={{
            top: ringTop,
            left: ringLeft,
            width: Math.max(16, ringRight - ringLeft),
            height: Math.max(16, ringBottom - ringTop),
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* Explainer card */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute w-[330px] max-w-[calc(100vw-24px)] rounded-xl border border-white/10 bg-[#161616] p-4 shadow-2xl"
        style={tipStyle}
      >
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-white">{step.title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="mt-0.5 shrink-0 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs leading-relaxed text-white/80">{step.body}</div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {i + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 px-2 text-xs text-white/60 hover:text-white"
            >
              Skip
            </Button>
            {!first && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setI(i - 1)}
                className="h-7 gap-1 border-white/10 bg-black/40 px-2 text-xs text-white/80 hover:bg-white/5"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="h-7 gap-1 bg-[#B4FF39] px-2.5 text-xs text-black hover:bg-[#a3ee28]"
            >
              {last ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Done
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
