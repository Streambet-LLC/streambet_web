import { useEffect, useState } from 'react';
import { Loader2, ImageOff, Check, X, Pencil, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ApiCardCandidate } from '@/types/analytics-api';

/** A minimal name-only candidate — used when the reference lookup fails. */
export const nameOnlyCandidate = (subject: string): ApiCardCandidate => ({
  isCard: true,
  subject,
  name: subject,
  imageUrl: null,
  brand: null,
  set: null,
  number: null,
  grade: null,
  confidence: 'low',
});

/**
 * "Is this the right card?" — the shared verify step. Shows a reference image
 * (sourced live) plus the card name (editable) so the admin can confirm we're
 * about to analyze the correct card, or fix it. Used by both the Cardy chat
 * and the AI Market Reports panel.
 */
export const CardConfirm = ({
  candidate,
  loading,
  imageLoading,
  userPhotoUrl,
  name,
  onNameChange,
  onConfirm,
  onCancel,
  onReidentify,
  confirmLabel = 'Confirm',
  busy,
}: {
  /** The identified card + reference image (null while still loading). */
  candidate: ApiCardCandidate | null;
  /** True while we're identifying the card NAME (blocks confirm briefly). */
  loading?: boolean;
  /** True while the reference IMAGE is still loading (never blocks confirm). */
  imageLoading?: boolean;
  /** The admin's own uploaded photo, shown next to the reference (photo flow). */
  userPhotoUrl?: string;
  /** Editable card name (controlled). */
  name: string;
  onNameChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** Re-run identification on the (edited) name — refreshes name + image. */
  onReidentify?: () => void;
  confirmLabel?: string;
  /** True while the confirmed action (run report / send) is in flight. */
  busy?: boolean;
}) => {
  const [imgBroken, setImgBroken] = useState(false);
  const imageUrl = candidate?.imageUrl ?? null;
  const showImg = !!imageUrl && !imgBroken;

  // A fresh reference image (e.g. after a re-check) gets a clean chance to load.
  useEffect(() => setImgBroken(false), [imageUrl]);

  const identity = [candidate?.set, candidate?.number, candidate?.grade]
    .filter(Boolean)
    .join(' · ');

  // The admin has edited the name away from what we identified — the shown
  // image is now stale, so nudge them to re-check before confirming.
  const edited =
    !loading &&
    !!candidate &&
    name.trim().length > 0 &&
    name.trim() !== candidate.name.trim();

  return (
    <div className="rounded-lg border border-[#B4FF39]/25 bg-[#B4FF39]/5 p-2.5">
      <div className="flex items-start gap-3">
        {/* Reference image (and the admin's photo, if this came from one) */}
        <div className="flex shrink-0 gap-2">
          {userPhotoUrl && (
            <div className="flex flex-col items-center gap-1">
              <img
                src={userPhotoUrl}
                alt="Your photo"
                className="h-16 w-16 rounded-md border border-white/10 object-cover"
              />
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Yours
              </span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/40">
              {loading || imageLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : showImg ? (
                <img
                  src={imageUrl!}
                  alt={candidate?.name ?? 'Reference card'}
                  onError={() => setImgBroken(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageOff className="h-4 w-4 text-muted-foreground/60" />
              )}
            </div>
            {userPhotoUrl && (
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Match
              </span>
            )}
          </div>
        </div>

        {/* Name + identity + actions */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-xs font-medium text-white/90">
            Is this the right card?{' '}
            <span className="font-normal text-muted-foreground">
              Wrong? Fix the name and re-check.
            </span>
          </div>
          <div className="relative">
            <Pencil className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Enter re-checks after an edit, otherwise confirms.
                  if (!name.trim() || busy || loading) return;
                  if (edited && onReidentify) onReidentify();
                  else onConfirm();
                }
              }}
              placeholder="Card name"
              disabled={busy}
              className="h-8 border-white/10 bg-black/40 pl-7 text-sm"
            />
          </div>
          {(identity || edited || (!loading && !imageLoading && !showImg)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {identity && <span>{identity}</span>}
              {edited && (
                <span className="text-amber-300/90">
                  Name edited — re-check to update the image.
                </span>
              )}
              {!edited && !loading && !imageLoading && !showImg && (
                <span className="text-amber-300/80">
                  No reference image found — verify by name.
                </span>
              )}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* After an edit, the primary action is to re-check the new name. */}
            {onReidentify && (
              <Button
                type="button"
                size="sm"
                variant={edited ? 'default' : 'outline'}
                onClick={onReidentify}
                disabled={!name.trim() || busy || loading}
                className={
                  edited
                    ? 'h-8 gap-1.5 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90 disabled:opacity-40'
                    : 'h-8 gap-1.5 border-white/10 bg-black/40 text-white/80 hover:bg-white/5 hover:text-white disabled:opacity-40'
                }
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Re-check
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant={edited ? 'outline' : 'default'}
              onClick={onConfirm}
              disabled={!name.trim() || busy || loading}
              className={
                edited
                  ? 'h-8 gap-1.5 border-white/10 bg-black/40 text-white/80 hover:bg-white/5 hover:text-white disabled:opacity-40'
                  : 'h-8 gap-1.5 bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90 disabled:opacity-40'
              }
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {confirmLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={busy}
              className="h-8 gap-1.5 text-muted-foreground hover:text-white"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
