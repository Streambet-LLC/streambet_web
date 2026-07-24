import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Gauge } from 'lucide-react';
import { analyticsAPI, type ApiUsageSummary } from '@/integrations/api/client';

/** Friendly labels for each prompt type (feature key). */
const FEATURE_LABELS: Record<string, string> = {
  chat: 'Cardy chat',
  chat_scope: 'Cardy scope check',
  deep_dive: 'Deep dive',
  deep_dive_identify: 'Deep dive · photo ID',
  card_forecast: 'Card forecast',
  market_refresh: 'Market refresh',
  card_profile: 'Card price profile',
  lead_qualify: 'Lead qualification',
  suggest_queries: 'Query suggestions',
  other: 'Other',
};
const featureLabel = (k: string) => FEATURE_LABELS[k] ?? k;

const nf = new Intl.NumberFormat('en-US');
/** Compact token count, e.g. 12.3k / 4.1M. */
const tokens = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return nf.format(n);
};
/** USD with more precision for the small per-prompt figures. */
const usd = (n: number) =>
  n >= 1
    ? `$${n.toFixed(2)}`
    : n > 0
      ? `$${n.toFixed(4)}`
      : '$0';

export const AnalyticsUsage = () => {
  const [days, setDays] = useState(0);
  const [data, setData] = useState<ApiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await analyticsAPI.getAiUsage(days));
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;

  return (
    <div className="space-y-5">
      {/* Header + range + totals */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[#B4FF39]" />
            <span className="text-sm font-medium text-white">AI usage</span>
          </div>
          <Select value={String(days)} onValueChange={v => setDays(parseInt(v, 10))}>
            <SelectTrigger className="h-8 w-[110px] bg-black/40 border-white/10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="0">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Prompts', value: totals ? nf.format(totals.prompts) : '—' },
            { label: 'Total tokens', value: totals ? tokens(totals.totalTokens) : '—' },
            { label: 'Est. cost', value: totals ? usd(totals.costUsd) : '—' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-lg border border-white/8 bg-black/20 px-3 py-3"
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Cost is an <span className="text-white/70">estimate</span> from token
          counts (Anthropic list pricing + ~$0.01/web search). Sonnet has intro
          pricing through Aug 2026, so actual spend may run lower.
        </p>
      </Card>

      {/* By prompt type */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-3 text-sm font-medium text-white">By prompt type</div>
        {loading && !data ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data || data.byType.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No AI usage recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Prompt type</th>
                  <th className="px-2 py-2 font-medium text-right">Prompts</th>
                  <th className="px-2 py-2 font-medium text-right">Total tokens</th>
                  <th className="px-2 py-2 font-medium text-right">Avg tokens</th>
                  <th className="px-2 py-2 font-medium text-right">Est. cost</th>
                  <th className="px-2 py-2 font-medium text-right">Avg / prompt</th>
                </tr>
              </thead>
              <tbody>
                {data.byType.map(r => (
                  <tr
                    key={r.feature}
                    className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]"
                  >
                    <td className="px-2 py-2.5">{featureLabel(r.feature)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {nf.format(r.prompts)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">
                      {tokens(r.totalTokens)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">
                      {tokens(r.avgTokensPerPrompt)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-[#B4FF39]">
                      {usd(r.costUsd)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                      {usd(r.avgCostPerPrompt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* By user × prompt type */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-3 text-sm font-medium text-white">
          By user &amp; prompt type
        </div>
        {loading && !data ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data || data.byUserAndType.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No AI usage recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">User</th>
                  <th className="px-2 py-2 font-medium">Prompt type</th>
                  <th className="px-2 py-2 font-medium text-right">Prompts</th>
                  <th className="px-2 py-2 font-medium text-right">Total tokens</th>
                  <th className="px-2 py-2 font-medium text-right">Avg tokens</th>
                  <th className="px-2 py-2 font-medium text-right">Est. cost</th>
                  <th className="px-2 py-2 font-medium text-right">Avg / prompt</th>
                </tr>
              </thead>
              <tbody>
                {data.byUserAndType.map((r, i) => (
                  <tr
                    key={`${r.adminId ?? 'system'}-${r.feature}-${i}`}
                    className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]"
                  >
                    <td className="px-2 py-2.5">
                      {r.email ?? (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-white/70">
                      {featureLabel(r.feature)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {nf.format(r.prompts)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">
                      {tokens(r.totalTokens)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">
                      {tokens(r.avgTokensPerPrompt)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-[#B4FF39]">
                      {usd(r.costUsd)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                      {usd(r.avgCostPerPrompt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
