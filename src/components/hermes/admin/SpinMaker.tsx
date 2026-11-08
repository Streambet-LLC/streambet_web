import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2, RotateCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  hermesAdminAPI,
  type AuctionCategory,
  type AuctionImage,
  type SpinJob,
} from '@/integrations/api/hermes';
import { fmtUsd } from '../format';
import type { VideoItem } from './MediaUploader';
import { GHOST_BUTTON_CLASS, LIME_BUTTON_CLASS, MAX_VIDEOS, errorMessage } from './adminUtils';

type Updater<T> = (fn: (prev: T) => T) => void;

const POLL_MS = 5_000;
const GIVE_UP_MS = 12 * 60 * 1000;

function ThumbPicker({
  label,
  images,
  selected,
  disabledKey,
  onSelect,
  disabled,
}: {
  label: string;
  images: AuctionImage[];
  selected: string | undefined;
  disabledKey: string | undefined;
  onSelect: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-white/80">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => {
          const checked = img.key === selected;
          const blocked = img.key === disabledKey;
          return (
            <button
              key={img.key}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${label}: photo ${i + 1}`}
              disabled={disabled || blocked}
              onClick={() => onSelect(img.key)}
              className={cn(
                'relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]',
                checked ? 'border-[#C7FA09] ring-1 ring-[#C7FA09]' : 'border-white/10',
                blocked ? 'opacity-25' : !checked && 'opacity-70 hover:opacity-100'
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              {checked && (
                <span className="absolute right-0.5 top-0.5 rounded-full bg-[#C7FA09] p-0.5 text-black">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "360° spin": the admin picks a front and back photo, Pika animates
 * front → back → front, and the admin previews the clip and chooses
 * whether to include it. Included spins ride along in `videos` with
 * `spin: true` and are saved with the rest of the form.
 */
export function SpinMaker({
  images,
  videos,
  category,
  onVideosChange,
}: {
  images: AuctionImage[];
  videos: VideoItem[];
  category: AuctionCategory | '';
  onVideosChange: Updater<VideoItem[]>;
}) {
  const config = useQuery({
    queryKey: ['hermes-admin', 'spin-config'],
    queryFn: hermesAdminAPI.spinConfig,
    staleTime: 5 * 60_000,
  });
  const [frontKey, setFrontKey] = useState<string>();
  const [backKey, setBackKey] = useState<string>();
  const [job, setJob] = useState<SpinJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(0);

  // Defaults (and recovery when a chosen photo is removed): cover = front,
  // next photo = back.
  const front = images.find(i => i.key === frontKey) ?? images[0];
  const back =
    images.find(i => i.key === backKey && i.key !== front?.key) ??
    images.find(i => i.key !== front?.key);

  const pending = job?.status === 'queued' || job?.status === 'running';
  const jobId = pending ? job.jobId : null;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const next = await hermesAdminAPI.spinStatus(jobId);
        if (cancelled) return;
        if (next.status === 'completed' || next.status === 'failed') {
          setJob(next);
          if (next.status === 'completed') toast.success('360° spin is ready — preview it below.');
          return;
        }
        if (Date.now() - startedAt.current > GIVE_UP_MS) {
          setJob({
            jobId,
            status: 'failed',
            error: 'Pika is taking longer than usual. Try again in a few minutes.',
          });
          return;
        }
      } catch (err) {
        if (cancelled) return;
        // A failed poll isn't a failed job; keep trying until the cap.
        console.warn('Spin status poll failed', err);
      }
      timer = window.setTimeout(tick, POLL_MS);
    };
    timer = window.setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [jobId]);

  if (config.isLoading) return null;
  const cfg = config.data;
  if (!cfg?.enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        Not set up yet. Add a Pika API key (<code className="text-white/70">PIKA_API_KEY</code>) to
        the API environment to turn on generated spins.
      </p>
    );
  }

  const included = videos.find(v => v.spin);
  const result = job?.status === 'completed' ? job.video : undefined;
  const resultIncluded = !!result && included?.url === result.url;
  const otherVideos = videos.filter(v => !v.spin).length;
  const roomForSpin = otherVideos < MAX_VIDEOS;

  const generate = async () => {
    if (!front || !back) return;
    setSubmitting(true);
    try {
      const started = await hermesAdminAPI.startSpin({
        frontUrl: front.url,
        backUrl: back.url,
        ...(category ? { category } : {}),
      });
      startedAt.current = Date.now();
      setJob(started);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't start the spin."));
    } finally {
      setSubmitting(false);
    }
  };

  const include = () => {
    if (!result) return;
    if (!roomForSpin) {
      toast.error(`Up to ${MAX_VIDEOS} videos per auction — remove one to add the spin.`);
      return;
    }
    // One spin per lot; it leads the video list.
    onVideosChange(prev => [
      { kind: 'upload', url: result.url, key: result.key, spin: true },
      ...prev.filter(v => !v.spin),
    ]);
  };

  const remove = () => onVideosChange(prev => prev.filter(v => !v.spin));

  if (images.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        Upload at least two photos (the front and the back) to make a spin.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <ThumbPicker
          label="Front"
          images={images}
          selected={front?.key}
          disabledKey={back?.key}
          onSelect={setFrontKey}
          disabled={pending || submitting}
        />
        <ThumbPicker
          label="Back"
          images={images}
          selected={back?.key}
          disabledKey={front?.key}
          onSelect={setBackKey}
          disabled={pending || submitting}
        />
      </div>

      {included && !result && (
        <p className="text-xs text-white/70">
          This listing already has a spin (see Videos). A new one replaces it only if you include
          it.
        </p>
      )}

      {pending ? (
        <div
          className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/85"
          role="status"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#C7FA09]" aria-hidden />
          Generating with Pika. This usually takes 1–3 minutes; keep this dialog open.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void generate()}
            disabled={submitting || !front || !back}
            className={cn(result || included ? GHOST_BUTTON_CLASS : LIME_BUTTON_CLASS)}
            variant={result || included ? 'outline' : 'default'}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <RotateCw />}
            {result || included ? 'Generate a new spin' : 'Generate spin'}
          </Button>
          <span className="text-xs text-muted-foreground">
            ~{fmtUsd(cfg.estimatedCostUsd, { cents: true })} per spin · {cfg.seconds}s loop ·{' '}
            {cfg.resolution}
          </span>
        </div>
      )}

      {job?.status === 'failed' && (
        <p role="alert" className="text-xs text-red-300">
          {job.error ?? 'The spin failed. Try again.'}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center">
          <video
            src={result.url}
            autoPlay
            muted
            loop
            playsInline
            className="h-44 w-full rounded bg-black object-contain sm:w-44"
            aria-label="360° spin preview"
          />
          <div className="flex-1 space-y-2">
            {resultIncluded ? (
              <>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#C7FA09]">
                  <Check className="h-4 w-4" /> Included in the listing
                </p>
                <p className="text-xs text-muted-foreground">
                  Bidders see it right after the cover photo. Save the auction to keep it.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={remove}
                  className={GHOST_BUTTON_CLASS}
                >
                  <X /> Remove from listing
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Include this spin?</p>
                <p className="text-xs text-muted-foreground">
                  Check that the front and back look right and nothing warped.
                  {included ? ' Including it replaces the current spin.' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={include}
                    disabled={!roomForSpin}
                    className={LIME_BUTTON_CLASS}
                  >
                    <Check /> Include in listing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setJob(null)}
                    className={GHOST_BUTTON_CLASS}
                  >
                    Discard
                  </Button>
                </div>
                {!roomForSpin && (
                  <p className="text-xs text-amber-300">
                    This lot already has {MAX_VIDEOS} videos; remove one first.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
