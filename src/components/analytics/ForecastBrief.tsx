import type { ReactNode } from 'react';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import type { ApiCardForecast } from '@/types/analytics-api';

const OUTLOOK_STYLES: Record<string, string> = {
  Bullish: 'border-[#B4FF39]/40 bg-[#B4FF39]/10 text-[#B4FF39]',
  Neutral: 'border-white/15 bg-white/5 text-white/70',
  Bearish: 'border-red-500/40 bg-red-500/10 text-red-400',
};

const BUZZ_STYLES: Record<string, string> = {
  High: 'text-[#B4FF39]',
  Medium: 'text-amber-400',
  Low: 'text-white/50',
};

const ForecastSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
);

/**
 * Presentational render of a predictive forecast brief (outlook, social buzz,
 * catalysts, precedents, macro factors, risks, action, sources). Shared by the
 * Market card dialog and the Deep Dives panel so both stay consistent.
 */
export const ForecastBrief = ({
  forecast,
  generatedAt,
}: {
  forecast: ApiCardForecast;
  generatedAt?: string | null;
}) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={`text-[11px] font-medium ${
            OUTLOOK_STYLES[forecast.outlook] ?? OUTLOOK_STYLES.Neutral
          }`}
        >
          {forecast.outlook}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {forecast.confidence}% confidence · {forecast.horizon}
        </span>
      </div>

      <p className="text-sm text-white/85">{forecast.thesis}</p>

      {forecast.socialBuzz && (
        <div className="text-xs">
          <span className="text-muted-foreground">Social buzz: </span>
          <span
            className={`font-medium ${
              BUZZ_STYLES[forecast.socialBuzz.level] ?? 'text-white/70'
            }`}
          >
            {forecast.socialBuzz.level}
          </span>
          <span className="text-white/70"> — {forecast.socialBuzz.summary}</span>
        </div>
      )}

      {forecast.catalysts?.length > 0 && (
        <ForecastSection title="Catalysts & scenarios">
          {forecast.catalysts.map((c, i) => (
            <div
              key={i}
              className="rounded-md border border-white/5 bg-black/30 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white truncate">{c.event}</span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium shrink-0 ${
                    c.direction === 'down' ? 'text-red-400' : 'text-[#B4FF39]'
                  }`}
                >
                  {c.direction === 'down' ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  )}
                  {c.probabilityPct}% · {c.magnitude}
                </span>
              </div>
              {c.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
              )}
            </div>
          ))}
        </ForecastSection>
      )}

      {forecast.precedents?.length > 0 && (
        <ForecastSection title="Historical precedents">
          {forecast.precedents.map((p, i) => (
            <div key={i} className="text-xs">
              <span className="text-white/85">{p.comparable}</span>
              <span className="text-muted-foreground"> — {p.outcome}</span>
            </div>
          ))}
        </ForecastSection>
      )}

      {forecast.macroFactors?.length > 0 && (
        <ForecastSection title="Macro factors">
          {forecast.macroFactors.map((m, i) => (
            <div key={i} className="text-xs">
              <span className="text-white/85">{m.factor}</span>
              <span className="text-muted-foreground"> — {m.note}</span>
            </div>
          ))}
        </ForecastSection>
      )}

      {forecast.risks?.length > 0 && (
        <ForecastSection title="Risks">
          {forecast.risks.map((r, i) => (
            <div key={i} className="text-xs">
              <span className="text-white/85">{r.risk}</span>
              <span className="text-muted-foreground"> — {r.note}</span>
            </div>
          ))}
        </ForecastSection>
      )}

      {forecast.suggestedAction && (
        <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Suggested action
          </div>
          <p className="text-sm text-white/90">{forecast.suggestedAction}</p>
        </div>
      )}

      {forecast.sources?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Sources
          </div>
          <div className="flex flex-wrap gap-1.5">
            {forecast.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70 hover:text-white hover:border-white/20"
              >
                <ExternalLink className="h-3 w-3" />
                {s.title || 'source'}
              </a>
            ))}
          </div>
        </div>
      )}

      {generatedAt && (
        <div className="text-[10px] text-muted-foreground">
          Generated {moment(generatedAt).fromNow()} · AI estimate, not financial
          advice
        </div>
      )}
    </div>
  );
};
