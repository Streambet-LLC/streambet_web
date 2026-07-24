import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Liability disclaimer shown at the bottom of the AI-driven analytics surfaces
 * (Insights chat + deep-dive reports). Content is AI-generated market research
 * and may be wrong — this makes clear it is informational only, not advice.
 */
export const AiDisclaimer = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'mt-4 flex items-start gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground',
      className
    )}
  >
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
    <p>
      collectIQ AI generates automated market estimates and research using AI and
      third-party data. It may be inaccurate, incomplete, or out of date, and is
      provided for informational purposes only — it is not financial,
      investment, tax, or purchasing advice. Prices, forecasts, and card
      identifications are estimates, not guarantees. Verify independently before
      buying, selling, pricing, or otherwise acting on it. collectIQ is not liable
      for decisions made based on this content.
    </p>
  </div>
);
