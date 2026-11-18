import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Reorder, motion, useDragControls } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, GripVertical, Loader2, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { hermesAdminAPI, type AdminAuctionRow } from '@/integrations/api/hermes';
import { CATEGORY_LABEL } from '../format';
import {
  GHOST_BUTTON_CLASS,
  LIME_BUTTON_CLASS,
  adminKeys,
  errorMessage,
  fmtShortDateTime,
} from './adminUtils';

type OrderBucket = 'live' | 'upcoming';

/**
 * Admin "Reorder" (Nick, 2026-11-17): sets the order bidders see under the
 * marketplace's default "Featured" sort, in All categories and in each
 * category. Featured lots always lead, so they get their own list on top.
 */
export function ReorderDialog({
  bucket,
  open,
  onOpenChange,
}: {
  bucket: OrderBucket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden border-white/10 bg-[rgba(18,18,18,1)] p-0 text-white sm:w-[calc(100%-2rem)]">
        <DialogHeader className="border-b border-white/10 px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-white">
            <img src="/hermes/hermes-mark-32.png" alt="" className="h-6 w-6" />
            Marketplace order · {bucket === 'live' ? 'Live' : 'Upcoming'}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Drag a lot by its handle, or use the arrows. This is the order bidders see on the{' '}
            {bucket === 'live' ? 'Live' : 'Upcoming'} tab under &ldquo;Featured&rdquo; (the default
            sort), in All categories and in each category. Featured lots always come first. New
            lots go to the bottom until you move them.
          </DialogDescription>
        </DialogHeader>
        {/* Radix unmounts this on close, so every open starts from the saved order. */}
        <ReorderBody bucket={bucket} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ReorderBody({ bucket, onDone }: { bucket: OrderBucket; onDone: () => void }) {
  const q = useQuery({
    queryKey: [...adminKeys.list(bucket), 'marketplace'],
    queryFn: () => hermesAdminAPI.list(bucket, 'marketplace'),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  if (q.isPending) {
    return (
      <div className="space-y-2 p-4 sm:p-6" aria-busy aria-label="Loading lots">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full bg-white/5" />
        ))}
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-white/80">Couldn&apos;t load the lots.</p>
        <p className="text-xs text-muted-foreground">{errorMessage(q.error)}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={GHOST_BUTTON_CLASS}
          onClick={() => void q.refetch()}
        >
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }
  return <ReorderEditor bucket={bucket} rows={q.data} onDone={onDone} />;
}

function ReorderEditor({
  bucket,
  rows,
  onDone,
}: {
  bucket: OrderBucket;
  rows: AdminAuctionRow[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const byId = new Map(rows.map(r => [r.id, r]));
  const [initial] = useState(() => rows.map(r => r.id).join(','));
  const [featured, setFeatured] = useState(() => rows.filter(r => r.isFeatured).map(r => r.id));
  const [others, setOthers] = useState(() => rows.filter(r => !r.isFeatured).map(r => r.id));
  const order = [...featured, ...others];
  const dirty = order.join(',') !== initial;

  const save = useMutation({
    mutationFn: () => hermesAdminAPI.reorder(bucket, order),
    onSuccess: () => {
      toast.success('Order saved. The marketplace shows it now.');
      void qc.invalidateQueries({ queryKey: adminKeys.lists });
      void qc.invalidateQueries({ queryKey: ['hermes-market'] });
      onDone();
    },
    onError: err => toast.error(errorMessage(err, "Couldn't save the order.")),
  });

  return (
    <>
      {/* layoutScroll lets the drag follow the list while it scrolls. */}
      <motion.div layoutScroll className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No {bucket === 'live' ? 'live' : 'upcoming'} lots to order.
          </p>
        ) : (
          <div className="space-y-5">
            {featured.length > 0 && (
              <Group
                label="Featured, always first"
                ids={featured}
                setIds={setFeatured}
                byId={byId}
                bucket={bucket}
                startAt={1}
              />
            )}
            {others.length > 0 && (
              <Group
                label={featured.length > 0 ? 'Everything else' : 'Lots'}
                ids={others}
                setIds={setOthers}
                byId={byId}
                bucket={bucket}
                startAt={featured.length + 1}
              />
            )}
          </div>
        )}
      </motion.div>
      <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-[rgba(18,18,18,1)] px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setFeatured(rows.filter(r => r.isFeatured).map(r => r.id));
              setOthers(rows.filter(r => !r.isFeatured).map(r => r.id));
            }}
            disabled={save.isPending}
            className="text-xs font-semibold text-white/55 underline-offset-2 hover:text-white hover:underline sm:mr-auto"
          >
            Undo changes
          </button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={save.isPending}
          className={GHOST_BUTTON_CLASS}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className={LIME_BUTTON_CLASS}
        >
          {save.isPending && <Loader2 className="animate-spin" />}
          Save order
        </Button>
      </div>
    </>
  );
}

function Group({
  label,
  ids,
  setIds,
  byId,
  bucket,
  startAt,
}: {
  label: string;
  ids: string[];
  setIds: (ids: string[]) => void;
  byId: Map<string, AdminAuctionRow>;
  bucket: OrderBucket;
  startAt: number;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id);
    setIds(next);
  };
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <Reorder.Group axis="y" values={ids} onReorder={setIds} as="ol" className="space-y-1.5">
        {ids.map((id, i) => {
          const row = byId.get(id);
          if (!row) return null;
          return (
            <Row
              key={id}
              row={row}
              position={startAt + i}
              bucket={bucket}
              canUp={i > 0}
              canDown={i < ids.length - 1}
              onUp={() => move(i, i - 1)}
              onDown={() => move(i, i + 1)}
            />
          );
        })}
      </Reorder.Group>
    </section>
  );
}

function Row({
  row,
  position,
  bucket,
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  row: AdminAuctionRow;
  position: number;
  bucket: OrderBucket;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const controls = useDragControls();
  const arrow =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]/60';
  return (
    <Reorder.Item
      value={row.id}
      dragListener={false}
      dragControls={controls}
      as="li"
      className="relative flex items-center gap-2 rounded-lg border border-white/10 bg-[rgba(26,26,26,1)] p-2 pr-1 sm:gap-3"
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10 }}
    >
      <button
        type="button"
        aria-label={`Drag ${row.title}`}
        onPointerDown={e => {
          e.preventDefault();
          controls.start(e);
        }}
        className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-white/35 hover:text-white/80 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <span className="w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-white/45">
        {position}
      </span>
      {row.image ? (
        <img
          src={row.image}
          alt=""
          draggable={false}
          className="h-10 w-10 shrink-0 rounded-md border border-white/10 bg-black object-cover"
        />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-md border border-white/10 bg-white/5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-white">{row.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {row.isFeatured && (
            <Star className="h-3 w-3 shrink-0 fill-[#C7FA09] text-[#C7FA09]" aria-hidden />
          )}
          <span className="truncate">
            {CATEGORY_LABEL[row.category] ?? row.category} ·{' '}
            {bucket === 'live'
              ? `ends ${fmtShortDateTime(row.endsAt)}`
              : `starts ${fmtShortDateTime(row.startsAt)}`}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onUp}
          disabled={!canUp}
          aria-label={`Move ${row.title} up`}
          className={arrow}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={!canDown}
          aria-label={`Move ${row.title} down`}
          className={arrow}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </Reorder.Item>
  );
}
