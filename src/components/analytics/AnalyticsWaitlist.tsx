import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Download } from 'lucide-react';
import { waitlistAPI, type WaitlistSignup } from '@/integrations/api/client';

/**
 * Admin view of public waitlist signups captured on the landing page during
 * private testing. Newest first, with a total count and CSV export.
 */
export const AnalyticsWaitlist = () => {
  const [rows, setRows] = useState<WaitlistSignup[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await waitlistAPI.list(limit, 0);
      setRows(r.data);
      setTotal(r.total);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const header = 'email,name,source,signed_up_at\n';
    const body = rows
      .map(r =>
        [
          r.email,
          (r.name ?? '').replace(/,/g, ' '),
          r.source ?? '',
          r.createdAt,
        ].join(',')
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-sm font-medium text-white">Waitlist</span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
            {total} signup{total === 1 ? '' : 's'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="h-8 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No signups yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-medium">Email</th>
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Source</th>
                <th className="px-2 py-2 font-medium text-right">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]"
                >
                  <td className="px-2 py-2.5">{r.email}</td>
                  <td className="px-2 py-2.5 text-white/70">{r.name || '—'}</td>
                  <td className="px-2 py-2.5 text-white/50">{r.source || '—'}</td>
                  <td className="px-2 py-2.5 text-right text-muted-foreground">
                    {moment(r.createdAt).format('MMM D, YYYY h:mm A')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > rows.length && (
            <button
              type="button"
              onClick={() => setLimit(l => l + 50)}
              className="mt-3 w-full rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
            >
              Load more ({total - rows.length})
            </button>
          )}
        </div>
      )}
    </Card>
  );
};
