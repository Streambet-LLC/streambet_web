import { ExternalLink } from 'lucide-react';
import type { ApiCardValuation } from '@/types/analytics-api';
import { SaveToPortfolioMenu } from './SaveToPortfolioMenu';

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`;

const confColor = (pct: number) =>
  pct >= 75 ? '#B4FF39' : pct >= 55 ? '#fbbf24' : '#f87171';

const METHOD_LABEL: Record<string, string> = {
  'anchor-and-adjust': 'Anchor + index',
  'recent-median': 'Median of comps',
  triangulation: 'Triangulated',
};
const SRC_LABEL: Record<string, string> = {
  'auction-sale': 'auction',
  'private-sale': 'private',
  'marketplace-listing': 'listing',
  'price-guide': 'guide',
  index: 'index',
};
const RELIABILITY: Record<string, { label: string; className: string }> = {
  grounded: {
    label: 'Grounded',
    className: 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]',
  },
  thin: {
    label: 'Thin data',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
  unverified: {
    label: 'Unverified',
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
};

/**
 * The structured, code-computed valuation shown in chat — big number +
 * confidence meter + method + the comps behind it (each linked to its source).
 * Makes the number visibly defensible instead of a line of prose.
 */
export const ChatValuationCard = ({ v }: { v: ApiCardValuation }) => {
  if (!v.isCard || v.pointUsd == null) return null;
  const rel = RELIABILITY[v.reliability] ?? RELIABILITY.thin;
  const range =
    v.lowUsd != null && v.highUsd != null
      ? `${money(v.lowUsd)}–${money(v.highUsd)}`
      : null;
  const comps = (v.compsUsed ?? []).filter(c => c.url).slice(0, 5);

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      {/* Headline number + confidence */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-bold text-white">
            {money(v.pointUsd)}
          </div>
          {range && (
            <div className="text-[11px] text-muted-foreground">{range}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Confidence
          </div>
          <div
            className="text-lg font-bold leading-none"
            style={{ color: confColor(v.confidencePct) }}
          >
            {v.confidencePct}%
          </div>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(4, Math.min(100, v.confidencePct))}%`,
            background: confColor(v.confidencePct),
          }}
        />
      </div>

      {/* Badges */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${rel.className}`}
        >
          {rel.label}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
          {METHOD_LABEL[v.method] ?? v.method}
        </span>
        {v.indexAdjustment && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
            {v.indexAdjustment.index}:{' '}
            <span
              style={{ color: v.indexAdjustment.movePct >= 0 ? '#B4FF39' : '#f87171' }}
            >
              {v.indexAdjustment.movePct >= 0 ? '+' : ''}
              {v.indexAdjustment.movePct}%
            </span>
          </span>
        )}
      </div>

      {v.confidenceBasis && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {v.confidenceBasis}
        </div>
      )}

      {/* Comps */}
      {comps.length > 0 && (
        <div className="mt-2.5 space-y-1 border-t border-white/5 pt-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Comps used
          </div>
          {comps.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <a
                href={c.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#B4FF39] hover:underline"
              >
                {money(c.priceUsd)}
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
              <span className="truncate text-muted-foreground">
                {[c.date, c.grade, SRC_LABEL[c.sourceType] ?? c.sourceType]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Analogs — only when there were no direct comps. Labelled hard so an
          estimate built off a PSA 9 is never mistaken for a sale of this card. */}
      {(v.analogsUsed?.length ?? 0) > 0 && (
        <div className="mt-2.5 space-y-1 border-t border-white/5 pt-2">
          <div className="text-[10px] uppercase tracking-wide text-amber-300/80">
            Estimated from comparable cards — not sales of this card
          </div>
          {v.analogsUsed!.slice(0, 4).map((a, i) => (
            <div key={i} className="text-xs">
              <div className="flex items-center gap-2">
                <a
                  href={a.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:underline"
                >
                  {money(a.priceUsd)}
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
                <span className="text-muted-foreground">
                  × {a.multiplier} ={' '}
                  <span className="text-white/80">
                    {money(a.priceUsd * a.multiplier)}
                  </span>
                </span>
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {[a.title, a.rationale].filter(Boolean).join(' — ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live eBay listing context — asks, not comps (labeled as such). */}
      {v.marketContext && v.marketContext.activeCount > 0 && (
        <div className="mt-2 border-t border-white/5 pt-2 text-[11px] text-muted-foreground">
          <a
            href={v.marketContext.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/80"
          >
            {v.marketContext.activeCount.toLocaleString('en-US')} listed on eBay
            {v.marketContext.lowestAskUsd != null &&
              ` · from ${money(v.marketContext.lowestAskUsd)}`}{' '}
            <span className="opacity-60">(current asks, not sold)</span>
          </a>
        </div>
      )}

      {v.note && (
        <div className="mt-2 text-[11px] italic text-muted-foreground">
          {v.note}
        </div>
      )}

      {/* Save action sits on the disclaimer row — present on every valuation,
          so it doesn't depend on Cardy remembering to offer. */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
        <span className="text-[10px] text-muted-foreground/70">
          Market estimate, not financial advice.
        </span>
        <SaveToPortfolioMenu subject={v.subject} className="-mr-1" />
      </div>
    </div>
  );
};
