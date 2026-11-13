import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { InfiniteData, QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  hermesAPI,
  type MarketPage,
  type MyAuction,
  type PublicAuction,
} from '@/integrations/api/hermes';
import { getMessage } from '@/utils/helper';

/**
 * Watchlist: a heart on lot cards and a Watch button on the lot page.
 * Logged out, the tap remembers the lot and sends the user to log in; once
 * there's a session, <PendingWatchHandler /> adds it (works through Google
 * sign-in and email verification too, since it lives in localStorage).
 */

const PENDING_KEY = 'hermes.pendingWatch';
/** Long enough to cover signing up and verifying an email. */
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function rememberPendingWatch(auctionId: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ id: auctionId, at: Date.now() }));
  } catch {
    // Storage blocked: they can tap the heart again after logging in.
  }
}

function takePendingWatch(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_KEY);
    const { id, at } = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof id !== 'string' || typeof at !== 'number') return null;
    return Date.now() - at <= PENDING_TTL_MS ? id : null;
  } catch {
    return null;
  }
}

/** Writes a watch change into every cached copy of the lot. */
function applyWatch(qc: QueryClient, id: string, watching: boolean, watcherCount?: number) {
  const patch = <T extends PublicAuction>(a: T): T =>
    a.id !== id
      ? a
      : {
          ...a,
          watcherCount: watcherCount ?? Math.max(0, (a.watcherCount ?? 0) + (watching ? 1 : -1)),
          viewer: a.viewer ? { ...a.viewer, isWatching: watching } : a.viewer,
        };
  qc.setQueryData<PublicAuction>(['hermes-auction', id], old => (old ? patch(old) : old));
  qc.setQueriesData<InfiniteData<MarketPage>>({ queryKey: ['hermes-market'] }, old =>
    old ? { ...old, pages: old.pages.map(p => ({ ...p, rows: p.rows.map(patch) })) } : old
  );
  qc.setQueryData<MyAuction[]>(['hermes-mine'], old => old?.map(patch));
}

/** Watch state + toggle for one lot. */
export function useWatch(auction: PublicAuction) {
  const { session } = useAuthContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const watching = !!auction.viewer?.isWatching;

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      next ? hermesAPI.watch(auction.id) : hermesAPI.unwatch(auction.id),
    onMutate: next => applyWatch(qc, auction.id, next),
    onSuccess: (res, next) => {
      applyWatch(qc, auction.id, res.watching, res.watcherCount);
      qc.invalidateQueries({ queryKey: ['hermes-watchlist'] });
      if (next) toast.success('Added to your watchlist');
    },
    onError: (err, next) => {
      applyWatch(qc, auction.id, !next);
      qc.invalidateQueries({ queryKey: ['hermes-auction', auction.id] });
      toast.error(getMessage(err) || "Couldn't update your watchlist.");
    },
  });

  const toggle = () => {
    if (!session) {
      rememberPendingWatch(auction.id);
      toast.info('Log in and this lot goes straight onto your watchlist.');
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (!mutation.isPending) mutation.mutate(!watching);
  };

  return { watching, toggle, pending: mutation.isPending };
}

/**
 * Finishes a watch tapped while logged out, as soon as there's a session.
 * Mounted once, app-wide.
 */
export function PendingWatchHandler() {
  const { session } = useAuthContext();
  const qc = useQueryClient();
  useEffect(() => {
    if (!session) return;
    const id = takePendingWatch();
    if (!id) return;
    hermesAPI
      .watch(id)
      .then(res => {
        applyWatch(qc, id, res.watching, res.watcherCount);
        qc.invalidateQueries({ queryKey: ['hermes-auction', id] });
        qc.invalidateQueries({ queryKey: ['hermes-market'] });
        qc.invalidateQueries({ queryKey: ['hermes-watchlist'] });
        toast.success('Added to your watchlist');
      })
      // The lot may have ended meanwhile; nothing useful to tell them.
      .catch(() => undefined);
  }, [session, qc]);
  return null;
}

/** Round heart for lot cards (sits on the photo). */
export function WatchHeart({ auction, className }: { auction: PublicAuction; className?: string }) {
  const { watching, toggle, pending } = useWatch(auction);
  const label = watching ? 'Remove from watchlist' : 'Add to watchlist';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={watching}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-full bg-black/70 p-2 backdrop-blur transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]',
        watching ? 'text-[#C7FA09]' : 'text-white hover:text-[#C7FA09]',
        className
      )}
    >
      <Heart className={cn('h-4 w-4', watching && 'fill-current')} aria-hidden />
    </button>
  );
}

/** "Watch" / "Watching" pill for the lot page, with the public watcher count. */
export function WatchButton({ auction }: { auction: PublicAuction }) {
  const { watching, toggle, pending } = useWatch(auction);
  const ended = auction.bucket === 'settled';
  const count = auction.watcherCount ?? 0;
  // Nothing to watch once it's over, but a watcher can still remove it.
  if (ended && !watching) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={watching}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60 disabled:opacity-60',
          watching
            ? 'border-[#C7FA09]/60 bg-[#C7FA09]/10 text-[#C7FA09] hover:bg-[#C7FA09]/15'
            : 'border-white/15 text-white hover:border-[#C7FA09]/60'
        )}
      >
        <Heart className={cn('h-4 w-4', watching && 'fill-current')} aria-hidden />
        {watching ? 'Watching' : 'Watch'}
      </button>
      {!ended && count > 0 && (
        <span className="text-sm text-white/55">{count.toLocaleString()} watching</span>
      )}
    </div>
  );
}
