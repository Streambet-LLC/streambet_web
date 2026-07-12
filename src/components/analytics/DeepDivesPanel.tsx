import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Telescope, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiDeepResearchJob } from '@/types/analytics-api';

const STATUS: Record<
  string,
  { label: string; className: string; spin?: boolean }
> = {
  pending: {
    label: 'Queued',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    spin: true,
  },
  running: {
    label: 'Researching…',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    spin: true,
  },
  done: {
    label: 'Ready',
    className: 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]',
  },
  error: {
    label: 'Failed',
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
};

/**
 * Deep Dives — the pending/results area for backgrounded deep-research reports.
 * Polls for status, lets you start one directly, and opens the full brief when
 * a job is ready. Jobs are also started from the Insights chat.
 */
export const DeepDivesPanel = ({ refreshSignal }: { refreshSignal?: number }) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ApiDeepResearchJob[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(8);
  const [subject, setSubject] = useState('');
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await analyticsAPI.listDeepResearch(limit, 0);
      setJobs(r.data);
      setTotal(r.total);
    } catch {
      /* keep last known */
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  // Poll faster while a job is active so results appear promptly.
  const hasActive = jobs.some(
    j => j.status === 'pending' || j.status === 'running'
  );
  useEffect(() => {
    const t = window.setInterval(load, hasActive ? 4000 : 12000);
    return () => window.clearInterval(t);
  }, [load, hasActive]);

  const start = async () => {
    const s = subject.trim();
    if (!s || starting) return;
    setStarting(true);
    try {
      await analyticsAPI.startDeepResearch(s);
      setSubject('');
      await load();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not start deep dive.';
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Telescope className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-xs font-medium uppercase tracking-wide text-white/80">
            Deep dives
          </span>
          {hasActive && (
            <span className="flex items-center gap-1 text-[11px] text-amber-300">
              <Loader2 className="h-3 w-3 animate-spin" /> researching
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                start();
              }
            }}
            placeholder="Deep-dive a card… e.g. Crown Zenith Charizard UPC"
            className="h-9 bg-black/40 border-white/10 text-sm"
          />
          <Button
            onClick={start}
            disabled={!subject.trim() || starting}
            size="sm"
            className="h-9 shrink-0 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90 disabled:opacity-40"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Deep dive'
            )}
          </Button>
        </div>

        {jobs.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto">
            {jobs.map(j => {
              const st = STATUS[j.status] ?? STATUS.pending;
              const ready = j.status === 'done' && j.result;
              return (
                <button
                  key={j.id}
                  type="button"
                  disabled={!ready}
                  onClick={() => ready && navigate(`/analytics/deep-dive/${j.id}`)}
                  className={`w-full flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-left ${
                    ready ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm text-white/90">
                      {j.subject}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {moment(j.completedAt ?? j.createdAt).fromNow()}
                      {j.status === 'error' && j.error ? ` · ${j.error}` : ''}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 gap-1 text-[10px] font-medium ${st.className}`}
                  >
                    {st.spin && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                    {st.label}
                  </Badge>
                  {ready && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
            {total > jobs.length && (
              <button
                type="button"
                onClick={() => setLimit(l => l + 8)}
                className="w-full rounded-lg border border-white/5 bg-black/20 px-3 py-1.5 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                Load more ({total - jobs.length})
              </button>
            )}
          </div>
        )}
      </Card>
    </>
  );
};
