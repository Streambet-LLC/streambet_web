import { useCallback, useEffect, useMemo, useState } from 'react';
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

/** Friendly labels for each granular prompt type (feature key). */
const FEATURE_LABELS: Record<string, string> = {
  chat: 'Cardy chat',
  chat_scope: 'Cardy scope check',
  deep_dive: 'AI Market Report',
  deep_dive_identify: 'AI Market Report · photo ID',
  card_forecast: 'Card forecast',
  market_refresh: 'Market pulse refresh',
  card_profile: 'Card price profile',
  lead_qualify: 'Lead qualification',
  suggest_queries: 'Query suggestions',
  portfolio: 'Portfolio tracking',
  other: 'Other',
};
const featureLabel = (k: string) => FEATURE_LABELS[k] ?? k;

/** High-level category each feature rolls up into (the "ways we use it"). */
const FEATURE_CATEGORY: Record<string, string> = {
  chat: 'Cardy chat',
  chat_scope: 'Cardy chat',
  deep_dive: 'AI Market Reports',
  deep_dive_identify: 'AI Market Reports',
  card_forecast: 'Card pricing & forecasts',
  card_profile: 'Card pricing & forecasts',
  market_refresh: 'Market pulse',
  lead_qualify: 'Lead generation',
  suggest_queries: 'Lead generation',
  portfolio: 'Portfolio tracking',
  other: 'Other',
};
const categoryFor = (k: string) => FEATURE_CATEGORY[k] ?? 'Other';

const userLabel = (u: { email: string | null; adminId: string | null }) =>
  u.email || (u.adminId ? `${u.adminId.slice(0, 8)}…` : 'System');

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
  const [userId, setUserId] = useState('all');
  const [data, setData] = useState<ApiUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await analyticsAPI.getAiUsage(days, userId));
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [days, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;
  // Real users (non-null adminId) for the filter dropdown.
  const userOptions = (data?.users ?? []).filter(u => u.adminId);

  // Roll the granular per-feature rows up into high-level categories.
  const byCategory = useMemo(() => {
    const map = new Map<
      string,
      { category: string; prompts: number; totalTokens: number; costUsd: number }
    >();
    for (const r of data?.byType ?? []) {
      const cat = categoryFor(r.feature);
      const row =
        map.get(cat) ??
        { category: cat, prompts: 0, totalTokens: 0, costUsd: 0 };
      row.prompts += r.prompts;
      row.totalTokens += r.totalTokens;
      row.costUsd += r.costUsd;
      map.set(cat, row);
    }
    return [...map.values()].sort((a, b) => b.costUsd - a.costUsd);
  }, [data]);
  const grandCost = totals?.costUsd ?? 0;

  return (
    <div className="space-y-5">
      {/* Header + range + totals */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[#B4FF39]" />
            <span className="text-sm font-medium text-white">AI usage</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-8 w-[170px] bg-black/40 border-white/10 text-xs">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {userOptions.map(u => (
                  <SelectItem key={u.adminId ?? 'system'} value={u.adminId ?? 'system'}>
                    {userLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Prompts', value: totals ? nf.format(totals.prompts) : '—' },
            { label: 'Total tokens used', value: totals ? tokens(totals.totalTokens) : '—' },
            {
              label: 'Est. total cost for full tokens used',
              value: totals ? usd(totals.costUsd) : '—',
            },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-white/8 bg-black/20 px-3 py-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 text-xl font-semibold text-white tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Cost is an <span className="text-white/70">estimate</span> from token counts (Anthropic
          list pricing + ~$0.01/web search). Sonnet has intro pricing through Aug 2026, so actual
          spend may run lower.
        </p>
      </Card>

      {/* By category — high-level rollup of the ways we use tokens */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-3 text-sm font-medium text-white">
          By feature area
        </div>
        {loading && !data ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : byCategory.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No AI usage recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {byCategory.map(c => {
              const pct = grandCost > 0 ? (c.costUsd / grandCost) * 100 : 0;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-white/85">
                    {c.category}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[#B4FF39]/70"
                      style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {tokens(c.totalTokens)}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-[#B4FF39]">
                    {usd(c.costUsd)}
                  </span>
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* By prompt type */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
        <div className="mb-3 text-sm font-medium text-white">
          By prompt type <span className="text-muted-foreground">(granular)</span>
        </div>
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
                  <th className="px-2 py-2 font-medium text-right">Total tokens used</th>
                  <th className="px-2 py-2 font-medium text-right">Avg tokens</th>
                  <th className="px-2 py-2 font-medium text-right">Est. total cost</th>
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
                    <td className="px-2 py-2.5 text-right tabular-nums">{nf.format(r.prompts)}</td>
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
        <div className="mb-3 text-sm font-medium text-white">By user &amp; prompt type</div>
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
                  <th className="px-2 py-2 font-medium text-right">Total tokens used</th>
                  <th className="px-2 py-2 font-medium text-right">Avg tokens</th>
                  <th className="px-2 py-2 font-medium text-right">Est. total cost</th>
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
                      {r.email ?? r.adminId ? (
                        userLabel(r)
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-white/70">{featureLabel(r.feature)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{nf.format(r.prompts)}</td>
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
