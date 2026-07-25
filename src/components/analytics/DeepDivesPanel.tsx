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
} from 'lucide-react';
import { toast } from 'sonner';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiDeepResearchJob, ApiCardCandidate } from '@/types/analytics-api';
import { fileToCardImage } from '@/utils/cardImage';
import { useAnswerDepth } from '@/hooks/useAnswerDepth';
import { DepthSettings } from './DepthSettings';
import { CardConfirm, nameOnlyCandidate } from './CardConfirm';

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
export const DeepDivesPanel = ({
  refreshSignal,
  chatDive,
}: {
  refreshSignal?: number;
  /** A deep dive the chat just started — autofill + scroll + highlight here. */
  chatDive?: { subject: string; nonce: number } | null;
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const [jobs, setJobs] = useState<ApiDeepResearchJob[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(8);
  const [subject, setSubject] = useState('');
  const [starting, setStarting] = useState(false);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [depth, setDepth] = useAnswerDepth();
  // Deep-dive history list — collapsible, tucked away by default. Auto-expands
  // while a job is researching (see effect below) so in-progress dives show.
  const [historyOpen, setHistoryOpen] = useState(false);
  // The "is this the right card?" step — set once we're verifying a card (from
  // typed text or a photo). Holds the reference-image candidate and, for the
  // photo flow, the admin's own uploaded thumbnail. Non-null → show CardConfirm.
  const [verify, setVerify] = useState<{
    candidate: ApiCardCandidate | null;
    loading: boolean;
    imageLoading: boolean;
    userPhotoUrl?: string;
  } | null>(null);
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

  // The chat kicked off a deep dive: reflect it here — autofill the subject,
  // reveal the history, scroll this panel into view, and pulse-highlight it so
  // the user sees their dive is running in this area. (The job itself is
  // already started server-side by the chat's start_deep_dive tool.)
  useEffect(() => {
    if (!chatDive?.subject) return;
    setSubject(chatDive.subject);
    setHistoryOpen(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFlash(true);
    load();
    const t = window.setTimeout(() => setFlash(false), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatDive?.nonce]);

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
      await analyticsAPI.startDeepResearch(
        s,
        depth,
        verify?.candidate?.imageUrl ?? null
      );
      setSubject('');
      setVerify(null);
      await load();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not start the report.';
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  // Show the "is this the right card?" step: fetch a reference image (and
  // normalize the name) for the subject before we commit to a research run.
  // `userPhotoUrl` is set when the subject came from an uploaded photo.
  const beginVerify = (subj: string, userPhotoUrl?: string) => {
    const s = subj.trim();
    if (!s) return;
    setVerify({ candidate: null, loading: true, imageLoading: false, userPhotoUrl });
    // Phase 1: fast card name (no web search).
    analyticsAPI
      .identifyCard(s)
      .then(c => {
        setSubject(c.name || s);
        setVerify(cur =>
          cur ? { ...cur, candidate: c, loading: false, imageLoading: true } : cur
        );
        // Phase 2: reference image (Pokémon TCG API → web search) — async.
        analyticsAPI
          .cardImage({
            subject: c.subject || s,
            name: c.name,
            brand: c.brand,
            number: c.number,
          })
          .then(({ imageUrl }) =>
            setVerify(cur =>
              cur && cur.candidate
                ? {
                    ...cur,
                    candidate: { ...cur.candidate, imageUrl },
                    imageLoading: false,
                  }
                : cur
            )
          )
          .catch(() =>
            setVerify(cur => (cur ? { ...cur, imageLoading: false } : cur))
          );
      })
      .catch(() =>
        setVerify(cur =>
          cur
            ? {
                ...cur,
                candidate: nameOnlyCandidate(s),
                loading: false,
                imageLoading: false,
              }
            : cur
        )
      );
  };

  // Typed a subject and hit "Run report" → verify the card first (name + image).
  const requestVerify = () => {
    const s = subject.trim();
    if (!s || starting || fromPhoto) return;
    beginVerify(s);
  };

  // Snap/upload a card photo → server identifies it → we show the confirm step
  // ("is this the right card?") with the admin's photo next to a live reference
  // image, rather than starting blindly. Any text already typed is passed along
  // as a disambiguation hint.
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
      beginVerify(guess, image.dataUrl);
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

  const cancelVerify = () => {
    setVerify(null);
  };

  return (
    <>
      <Card
        ref={cardRef}
        className={`bg-[rgba(22,22,22,1)] p-3 sm:p-4 mb-4 scroll-mt-20 transition-shadow duration-500 ${
          flash ? 'border-[#B4FF39]/50 ring-2 ring-[#B4FF39]/40' : 'border-white/5'
        }`}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Telescope className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-xs font-medium uppercase tracking-wide text-white/80">
            AI Market Reports
          </span>
          {hasActive && (
            <span className="flex items-center gap-1 text-[11px] text-amber-300">
              <Loader2 className="h-3 w-3 animate-spin" /> researching
            </span>
          )}
          <DepthSettings
            value={depth}
            onChange={setDepth}
            disabled={starting || fromPhoto}
            className="ml-auto"
          />
        </div>

        {/* File picker (shared by the photo button below). */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => identifyFromPhoto(e.target.files?.[0])}
        />

        {verify ? (
          /* Confirm step — verify the card (name + reference image) first. */
          <CardConfirm
            candidate={verify.candidate}
            loading={verify.loading}
            imageLoading={verify.imageLoading}
            userPhotoUrl={verify.userPhotoUrl}
            name={subject}
            onNameChange={setSubject}
            onConfirm={start}
            onReidentify={() => beginVerify(subject)}
            onCancel={cancelVerify}
            confirmLabel="Confirm & run report"
            busy={starting}
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    requestVerify();
                  }
                }}
                placeholder="Structured live data research report on cards"
                className="h-9 bg-black/40 border-white/10 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={fromPhoto || starting}
                size="sm"
                title="AI Market Report from a photo — take one or upload"
                aria-label="AI Market Report from a card photo"
                className="h-9 w-9 shrink-0 border-white/10 bg-black/40 p-0 text-white/80 hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                {fromPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={requestVerify}
                disabled={!subject.trim() || starting || fromPhoto}
                size="sm"
                className="h-9 shrink-0 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90 disabled:opacity-40"
              >
                {fromPhoto ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Run report'
                )}
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Type a card, or tap the photo button to snap/upload one and let AI identify it.
            </p>
          </>
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
                className={`h-3.5 w-3.5 transition-transform ${historyOpen ? '' : '-rotate-90'}`}
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
                      onClick={() => ready && navigate(`/analytics/deep-dive/${j.id}`)}
                      className={`w-full flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-left ${
                        ready ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm text-white/90">{j.subject}</span>
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
                      {ready && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
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
