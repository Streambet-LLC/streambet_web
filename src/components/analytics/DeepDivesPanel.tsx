import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Telescope,
  Loader2,
  ChevronRight,
  ChevronDown,
  ImagePlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiDeepResearchJob } from '@/types/analytics-api';
import { fileToCardImage } from '@/utils/cardImage';

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
  const [fromPhoto, setFromPhoto] = useState(false);
  // Deep-dive history list — collapsible, tucked away by default. Auto-expands
  // while a job is researching (see effect below) so in-progress dives show.
  const [historyOpen, setHistoryOpen] = useState(false);
  // Set once a photo has been identified — holds the preview thumbnail while the
  // admin confirms (or edits `subject`) before we commit to a research run.
  const [pendingPhoto, setPendingPhoto] = useState<{ dataUrl: string } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Auto-expand the history while a job is researching so its progress is
  // visible; the admin can still collapse it manually afterwards.
  useEffect(() => {
    if (hasActive) setHistoryOpen(true);
  }, [hasActive]);

  const start = async () => {
    const s = subject.trim();
    if (!s || starting) return;
    setStarting(true);
    try {
      await analyticsAPI.startDeepResearch(s);
      setSubject('');
      setPendingPhoto(null);
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

  // Snap/upload a card photo → server identifies it → we prefill the subject and
  // show a confirm step ("is this the right card?") rather than starting blindly.
  // Any text already typed in the subject box is passed along as a disambiguation hint.
  const identifyFromPhoto = async (file?: File | null) => {
    if (!file || fromPhoto) return;
    setFromPhoto(true);
    try {
      const image = await fileToCardImage(file);
      const note = subject.trim() || undefined;
      const { isCard, subject: guess } = await analyticsAPI.identifyCardImage(
        image,
        note
      );
      if (!isCard || !guess) {
        toast.error(
          "Couldn't identify a card. Try a clearer, well-lit shot of the front."
        );
        return;
      }
      setSubject(guess);
      setPendingPhoto({ dataUrl: image.dataUrl });
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (e as Error).message ??
        'Could not read that photo.';
      toast.error(msg);
    } finally {
      setFromPhoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cancelPhoto = () => {
    setPendingPhoto(null);
    setSubject('');
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

        {/* Confirm step: shown after a photo is identified, before we commit. */}
        {pendingPhoto && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#B4FF39]/25 bg-[#B4FF39]/5 px-2 py-2">
            <img
              src={pendingPhoto.dataUrl}
              alt="Identified card"
              className="h-12 w-12 shrink-0 rounded-md border border-white/10 object-cover"
            />
            <span className="flex-1 text-xs text-white/80">
              Is this the right card?{' '}
              <span className="text-muted-foreground">
                Edit the name below if not, then confirm.
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelPhoto}
              disabled={starting}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-white"
              aria-label="Discard photo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => identifyFromPhoto(e.target.files?.[0])}
          />
          {!pendingPhoto && (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={fromPhoto || starting}
              size="sm"
              title="Deep dive from a photo — take one or upload"
              aria-label="Deep dive from a card photo"
              className="h-9 w-9 shrink-0 border-white/10 bg-black/40 p-0 text-white/80 hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              {fromPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            onClick={start}
            disabled={!subject.trim() || starting || fromPhoto}
            size="sm"
            className="h-9 shrink-0 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90 disabled:opacity-40"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pendingPhoto ? (
              'Confirm & deep dive'
            ) : (
              'Deep dive'
            )}
          </Button>
        </div>
        {!pendingPhoto && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Type a card, or tap the photo button to snap/upload one and let AI
            identify it.
          </p>
        )}

        {jobs.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(o => !o)}
              className="flex w-full items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-white/80"
              aria-expanded={historyOpen}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  historyOpen ? '' : '-rotate-90'
                }`}
              />
              History
              <span className="text-muted-foreground/70">({total})</span>
            </button>

            {historyOpen && (
              <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
                {jobs.map(j => {
                  const st = STATUS[j.status] ?? STATUS.pending;
                  const ready = j.status === 'done' && j.result;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      disabled={!ready}
                      onClick={() =>
                        ready && navigate(`/analytics/deep-dive/${j.id}`)
                      }
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
                        {st.spin && (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        )}
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
          </div>
        )}
      </Card>
    </>
  );
};
