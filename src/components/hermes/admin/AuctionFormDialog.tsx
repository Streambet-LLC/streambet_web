import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Loader2, Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  hermesAPI,
  hermesAdminAPI,
  type AcceptedPayments,
  type AdminAuctionDetail,
  type AuctionCategory,
  type AuctionImage,
  type AuctionInput,
  type LengthPreset,
} from '@/integrations/api/hermes';
import { CATEGORIES, CATEGORY_LABEL, fmtDateTime, fmtUsd } from '../format';
import { DEFAULT_BUYER_PREMIUM_PERCENT } from '../useHermesConfig';
import { FieldError, FieldHint, Segmented, UsdInput } from './adminUi';
import { EstValueField } from './EstValueField';
import { PhotoUploader, VideoUploader, type VideoItem } from './MediaUploader';
import { SpinMaker } from './SpinMaker';
import {
  DAY_MS,
  FIELD_CLASS,
  GHOST_BUTTON_CLASS,
  LIME_BUTTON_CLASS,
  MAX_LENGTH_MS,
  MIN_LENGTH_MS,
  NATIVE_FIELD_CLASS,
  adminKeys,
  defaultScheduleStart,
  errorMessage,
  estValueSource,
  fmtSpan,
  fromLocalInput,
  hasAtMostCents,
  parseUsd,
  roundCents,
  toLocalInput,
  useNow,
  type EstValueState,
} from './adminUtils';

type AdminAuction = AdminAuctionDetail['auction'];

interface FormState {
  images: AuctionImage[];
  videos: VideoItem[];
  title: string;
  description: string;
  category: AuctionCategory | '';
  startMode: 'now' | 'schedule';
  startLocal: string;
  lengthPreset: LengthPreset;
  endLocal: string;
  startingPrice: string;
  hasReserve: boolean;
  reservePrice: string;
  shipping: string;
  acceptedPayments: AcceptedPayments;
  est: EstValueState;
  showEstValue: boolean;
  sellerName: string;
  isFeatured: boolean;
}

const HOUSE_SELLER_NAME = 'Hermes Auctions';

type FieldKey =
  | 'photos'
  | 'title'
  | 'category'
  | 'description'
  | 'start'
  | 'end'
  | 'startingPrice'
  | 'reservePrice'
  | 'shipping'
  | 'payments'
  | 'estValue';

const FIELD_ORDER: FieldKey[] = [
  'photos',
  'title',
  'category',
  'description',
  'start',
  'end',
  'startingPrice',
  'reservePrice',
  'shipping',
  'payments',
  'estValue',
];

const PAYMENT_OPTIONS: ReadonlyArray<{ value: AcceptedPayments; label: string }> = [
  { value: 'both', label: 'Both' },
  { value: 'fiat', label: 'Fiat (card + bank)' },
  { value: 'crypto', label: 'Crypto (USDC)' },
];

const PAYMENT_HINT: Record<AcceptedPayments, string> = {
  both: 'Bidders choose card, bank (ACH) or USDC.',
  fiat: 'Card or bank (ACH) only.',
  crypto: 'USDC only, held in on-chain escrow.',
};

/** `required` errors only show after a submit attempt; the rest show live. */
type FieldErrors = Partial<Record<FieldKey, { msg: string; required?: boolean }>>;

const LENGTH_OPTIONS: ReadonlyArray<{ value: LengthPreset; label: string }> = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '21', label: '21 days' },
  { value: 'custom', label: 'Custom' },
];

function initialState(a: AdminAuction | null): FormState {
  if (!a) {
    const start = defaultScheduleStart();
    return {
      images: [],
      videos: [],
      title: '',
      description: '',
      category: '',
      startMode: 'now',
      startLocal: toLocalInput(start),
      lengthPreset: '7',
      endLocal: toLocalInput(new Date(start.getTime() + 7 * DAY_MS)),
      startingPrice: '',
      hasReserve: false,
      reservePrice: '',
      shipping: '0',
      acceptedPayments: 'both',
      est: { mode: 'pull', amount: '', accepted: null },
      showEstValue: true,
      sellerName: '',
      isFeatured: false,
    };
  }
  const pulled = a.estValueSource === 'pulled' && !!a.estValueMeta && a.estValueUsd != null;
  return {
    images: a.images.map(i => ({ key: i.key, url: i.url })),
    videos: a.videos.map(v => ({
      kind: v.kind,
      url: v.url,
      key: v.key,
      embedUrl: v.embedUrl,
      spin: v.spin,
    })),
    title: a.title ?? '',
    description: a.description ?? '',
    category: a.category ?? '',
    startMode: 'schedule',
    startLocal: toLocalInput(a.startsAt),
    lengthPreset: a.lengthPreset ?? 'custom',
    endLocal: toLocalInput(a.endsAt),
    startingPrice: String(a.startingPriceUsd),
    hasReserve: a.reservePriceUsd != null,
    reservePrice: a.reservePriceUsd != null ? String(a.reservePriceUsd) : '',
    shipping: String(a.shippingUsd ?? 0),
    acceptedPayments: a.acceptedPayments ?? 'both',
    est: pulled
      ? {
          mode: 'pull',
          amount: String(a.estValueUsd),
          accepted: { meta: a.estValueMeta!, usd: a.estValueUsd! },
        }
      : {
          mode: a.estValueUsd != null ? 'manual' : 'pull',
          amount: a.estValueUsd != null ? String(a.estValueUsd) : '',
          accepted: null,
        },
    showEstValue: a.showEstValue !== false,
    sellerName: a.sellerName ?? '',
    isFeatured: a.isFeatured,
  };
}

function usdError(
  raw: string,
  { label, min, required }: { label: string; min: number; required: boolean }
): { msg: string; required?: boolean } | null {
  const n = parseUsd(raw);
  if (n == null) return required ? { msg: `Enter the ${label}.`, required: true } : null;
  if (Number.isNaN(n)) return { msg: 'Enter a dollar amount, like 125 or 49.99.' };
  if (n < min) return { msg: min > 0 ? `Must be at least ${fmtUsd(min)}.` : "Can't be negative." };
  if (!hasAtMostCents(n)) return { msg: 'Use at most two decimal places.' };
  return null;
}

/**
 * Create / edit a Hermes auction. Once bidding has opened the server freezes
 * the terms (starting bid, reserve, shipping, timing); those fields lock here
 * too and only content can change.
 */
export function AuctionFormDialog({
  open,
  onOpenChange,
  auction,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The auction to edit, or null to create one. */
  auction: AdminAuction | null;
  onSaved: (detail: AdminAuctionDetail, created: boolean) => void;
}) {
  // The form registers a guard so an accidental close doesn't drop uploads.
  const canClose = useRef<() => boolean>(() => true);
  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o && !canClose.current()) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[94dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden border-white/10 bg-[rgba(18,18,18,1)] p-0 text-white sm:w-[calc(100%-2rem)]">
        {/* Radix unmounts this after the close animation, so every open starts fresh. */}
        <AuctionForm
          key={auction?.id ?? 'new'}
          auction={auction}
          canCloseRef={canClose}
          onCancel={() => {
            if (canClose.current()) onOpenChange(false);
          }}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function AuctionForm({
  auction,
  canCloseRef,
  onCancel,
  onSaved,
}: {
  auction: AdminAuction | null;
  canCloseRef: MutableRefObject<() => boolean>;
  onCancel: () => void;
  onSaved: (detail: AdminAuctionDetail, created: boolean) => void;
}) {
  const uid = useId();
  const ids = useMemo(
    () => Object.fromEntries(FIELD_ORDER.map(k => [k, `${uid}-${k}`])) as Record<FieldKey, string>,
    [uid]
  );
  const queryClient = useQueryClient();
  const isEdit = !!auction;
  const locked = isEdit && auction.status !== 'scheduled';

  const [init] = useState(() => initialState(auction));
  const [form, setForm] = useState<FormState>(init);
  const [submitted, setSubmitted] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [videosBusy, setVideosBusy] = useState(false);
  const busy = photosBusy || videosBusy;

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(init), [form, init]);

  // ── Timing ─────────────────────────────────────────────────────────────
  const timingDirty =
    !isEdit ||
    form.startMode !== init.startMode ||
    form.startLocal !== init.startLocal ||
    form.lengthPreset !== init.lengthPreset ||
    (form.lengthPreset === 'custom' && form.endLocal !== init.endLocal);
  const termsDirty =
    !isEdit ||
    form.startingPrice !== init.startingPrice ||
    form.hasReserve !== init.hasReserve ||
    (form.hasReserve && form.reservePrice !== init.reservePrice) ||
    form.shipping !== init.shipping ||
    form.acceptedPayments !== init.acceptedPayments;

  // Crypto-only needs the USDC escrow live (the API refuses it otherwise).
  const hermesConfig = useQuery({
    queryKey: ['hermes-config'],
    queryFn: hermesAPI.config,
    staleTime: 60_000,
  });
  const cryptoLive = !!hermesConfig.data?.crypto.enabled;
  // An existing lot keeps the rate it was listed with; a new one gets today's.
  const premiumPct =
    auction?.buyerPremiumPercent ??
    hermesConfig.data?.fees.buyerPremiumPercent ??
    DEFAULT_BUYER_PREMIUM_PERCENT;

  // "Start now" moves the computed end with the clock.
  const now = useNow(form.startMode === 'now' && !locked ? 30_000 : 0);
  const startDate: Date | null = locked
    ? new Date(auction!.startsAt)
    : form.startMode === 'now'
      ? new Date(now)
      : fromLocalInput(form.startLocal);
  const endDate: Date | null = locked
    ? new Date(auction!.endsAt)
    : form.lengthPreset === 'custom'
      ? fromLocalInput(form.endLocal)
      : startDate
        ? new Date(startDate.getTime() + Number(form.lengthPreset) * DAY_MS)
        : null;

  // ── Validation ─────────────────────────────────────────────────────────
  const errors: FieldErrors = {};
  if (!form.images.length) errors.photos = { msg: 'Add at least one photo.', required: true };
  if (!form.title.trim()) errors.title = { msg: 'Enter the item name.', required: true };
  else if (form.title.trim().length > 200) errors.title = { msg: 'Keep it to 200 characters.' };
  if (!form.category) errors.category = { msg: 'Pick a category.', required: true };
  if (form.description.length > 10_000)
    errors.description = { msg: 'Keep the description under 10,000 characters.' };

  if (!locked && timingDirty) {
    const nowMs = Date.now();
    if (form.startMode === 'schedule') {
      if (!startDate) errors.start = { msg: 'Pick a start date and time.', required: true };
      else if (startDate.getTime() <= nowMs)
        errors.start = { msg: 'That time has passed — pick a future time or choose Start now.' };
      else if (startDate.getTime() > nowMs + 365 * DAY_MS)
        errors.start = { msg: 'The start must be within the next year.' };
    }
    if (form.lengthPreset === 'custom' && !endDate) {
      errors.end = { msg: 'Pick an end date and time.', required: true };
    } else if (startDate && endDate) {
      const len = endDate.getTime() - startDate.getTime();
      if (len <= 0) errors.end = { msg: 'The end must be after the start.' };
      else if (len < MIN_LENGTH_MS) errors.end = { msg: 'Auctions must run at least 1 hour.' };
      else if (len > MAX_LENGTH_MS) errors.end = { msg: 'Auctions can run at most 60 days.' };
    }
  }

  const startingNum = parseUsd(form.startingPrice);
  const reserveNum = parseUsd(form.reservePrice);
  const shippingNum = parseUsd(form.shipping);
  const estNum = parseUsd(form.est.amount);
  if (!locked) {
    const s = usdError(form.startingPrice, { label: 'starting bid', min: 1, required: true });
    if (s) errors.startingPrice = s;
    if (form.hasReserve) {
      const r = usdError(form.reservePrice, { label: 'reserve price', min: 1, required: true });
      if (r) errors.reservePrice = r;
      else if (startingNum != null && !Number.isNaN(startingNum) && reserveNum! < startingNum)
        errors.reservePrice = {
          msg: `The reserve can't be below the starting bid (${fmtUsd(startingNum)}).`,
        };
    }
    const sh = usdError(form.shipping, { label: 'shipping', min: 0, required: false });
    if (sh) errors.shipping = sh;
    if (
      form.acceptedPayments === 'crypto' &&
      hermesConfig.isSuccess &&
      !cryptoLive &&
      form.acceptedPayments !== init.acceptedPayments
    )
      errors.payments = {
        msg: "USDC escrow isn't live yet, so nobody could bid. Choose Fiat or Both for now.",
      };
  }
  const ev = usdError(form.est.amount, { label: 'est. value', min: 0, required: false });
  if (ev) errors.estValue = ev;

  const visibleError = (k: FieldKey): string | null => {
    const e = errors[k];
    if (!e) return null;
    return !e.required || submitted ? e.msg : null;
  };
  const hasErrors = Object.keys(errors).length > 0;

  // ── Save ───────────────────────────────────────────────────────────────
  const buildBody = (): Partial<AuctionInput> => {
    const content: Partial<AuctionInput> = {
      title: form.title.trim(),
      description: form.description,
      category: form.category as AuctionCategory,
      images: form.images.map(i => ({ key: i.key, url: i.url })),
      videos: form.videos.map(v =>
        v.key
          ? { kind: v.kind, url: v.url, key: v.key, ...(v.spin ? { spin: true } : {}) }
          : { kind: v.kind, url: v.url }
      ),
      isFeatured: form.isFeatured,
      showEstValue: form.showEstValue,
      sellerName: form.sellerName.trim() || null,
    };

    const source = estValueSource(form.est);
    const est: Partial<AuctionInput> = {
      estValueUsd: estNum != null ? roundCents(estNum) : null,
      estValueSource: estNum != null ? source : null,
      estValueMeta: source === 'pulled' ? (form.est.accepted?.meta ?? null) : null,
    };
    const estDirty =
      !isEdit ||
      form.est.amount.trim() !== init.est.amount.trim() ||
      source !== estValueSource(init.est) ||
      (source === 'pulled' && form.est.accepted?.meta !== init.est.accepted?.meta);

    const terms: Partial<AuctionInput> = {
      startingPriceUsd: roundCents(startingNum ?? 0),
      reservePriceUsd: form.hasReserve && reserveNum != null ? roundCents(reserveNum) : null,
      shippingUsd: roundCents(shippingNum ?? 0),
      acceptedPayments: form.acceptedPayments,
    };

    const timing: Partial<AuctionInput> = {
      lengthPreset: form.lengthPreset,
      ...(form.startMode === 'schedule' && startDate
        ? { startsAt: startDate.toISOString() }
        : isEdit
          ? { startsAt: new Date().toISOString() } // starts it right away
          : {}),
      ...(form.lengthPreset === 'custom' && endDate ? { endsAt: endDate.toISOString() } : {}),
    };

    return {
      ...content,
      ...(estDirty ? est : {}),
      ...(!locked && termsDirty ? terms : {}),
      ...(!locked && timingDirty ? timing : {}),
    };
  };

  const save = useMutation({
    mutationFn: (body: Partial<AuctionInput>) =>
      isEdit
        ? hermesAdminAPI.update(auction!.id, body)
        : hermesAdminAPI.create(body as AuctionInput),
    onSuccess: detail => {
      queryClient.setQueryData(adminKeys.detail(detail.auction.id), detail);
      void queryClient.invalidateQueries({ queryKey: adminKeys.lists });
      if (isEdit) toast.success('Auction updated.');
      else
        toast.success(
          detail.auction.status === 'active'
            ? 'Auction created — it’s live now.'
            : `Auction scheduled for ${fmtDateTime(detail.auction.startsAt)}.`
        );
      canCloseRef.current = () => true;
      onSaved(detail, !isEdit);
    },
    onError: err => toast.error(errorMessage(err, "Couldn't save the auction.")),
  });

  // Guard closes while uploads run or there are unsaved edits.
  useEffect(() => {
    canCloseRef.current = () => {
      if (save.isPending) return false;
      if (busy) return window.confirm('Uploads are still running. Close and discard them?');
      if (dirty) return window.confirm('Discard your changes to this auction?');
      return true;
    };
  });
  useEffect(
    () => () => {
      canCloseRef.current = () => true;
    },
    [canCloseRef]
  );

  const submit = () => {
    setSubmitted(true);
    if (busy) {
      toast.error('Wait for the uploads to finish.');
      return;
    }
    if (hasErrors) {
      const first = FIELD_ORDER.find(k => errors[k]);
      if (first) {
        const el = document.getElementById(ids[first]);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus({ preventScroll: true });
      }
      toast.error('Fix the highlighted fields first.');
      return;
    }
    save.mutate(buildBody());
  };

  const durationMs = startDate && endDate ? endDate.getTime() - startDate.getTime() : null;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <DialogHeader className="border-b border-white/10 px-4 py-4 pr-12 text-left sm:px-6">
        <DialogTitle className="flex items-center gap-2 text-white">
          <img src="/hermes/hermes-mark-32.png" alt="" className="h-6 w-6" />
          {isEdit ? 'Edit auction' : 'New auction'}
        </DialogTitle>
        <DialogDescription className="text-xs">
          {isEdit
            ? auction!.title
            : `Listed on Hermes Auctions. The winner pays the hammer price plus a ${premiumPct}% buyer premium and shipping.`}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
        {/* ── Media ─────────────────────────────────────────────────── */}
        <Section title="Photos" required>
          <PhotoUploader
            inputId={ids.photos}
            images={form.images}
            onChange={fn => setForm(f => ({ ...f, images: fn(f.images) }))}
            onBusyChange={setPhotosBusy}
            invalid={!!visibleError('photos')}
            describedBy={visibleError('photos') ? `${ids.photos}-error` : undefined}
          />
          <FieldError id={`${ids.photos}-error`}>{visibleError('photos')}</FieldError>
        </Section>

        <Section title="Videos" hint="Optional — upload a clip or link one from YouTube or Vimeo.">
          <VideoUploader
            inputId={`${uid}-video`}
            videos={form.videos}
            onChange={fn => setForm(f => ({ ...f, videos: fn(f.videos) }))}
            onBusyChange={setVideosBusy}
          />
        </Section>

        <Section
          title="360° spin"
          hint="Optional — Pika turns a front and back photo into a looping spin video. You preview it before it's added."
        >
          <SpinMaker
            images={form.images}
            videos={form.videos}
            category={form.category}
            onVideosChange={fn => setForm(f => ({ ...f, videos: fn(f.videos) }))}
          />
        </Section>

        {/* ── Details ───────────────────────────────────────────────── */}
        <Section title="Item">
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={ids.title} className="text-white/85">
                  Item name
                </Label>
                <span
                  className={cn(
                    'text-[11px] tabular-nums',
                    form.title.length > 200 ? 'text-red-300' : 'text-muted-foreground'
                  )}
                >
                  {form.title.length}/200
                </span>
              </div>
              <Input
                id={ids.title}
                value={form.title}
                maxLength={200}
                onChange={e => set({ title: e.target.value })}
                placeholder="2018 Panini Prizm Luka Doncic Silver PSA 10"
                aria-invalid={!!visibleError('title') || undefined}
                aria-describedby={visibleError('title') ? `${ids.title}-error` : undefined}
                className={cn(FIELD_CLASS, 'mt-1.5', visibleError('title') && 'border-red-400/60')}
              />
              <FieldError id={`${ids.title}-error`}>{visibleError('title')}</FieldError>
            </div>
            <div>
              <Label htmlFor={ids.category} className="text-white/85">
                Category
              </Label>
              <Select
                value={form.category}
                onValueChange={v => set({ category: v as AuctionCategory })}
              >
                <SelectTrigger
                  id={ids.category}
                  aria-invalid={!!visibleError('category') || undefined}
                  aria-describedby={visibleError('category') ? `${ids.category}-error` : undefined}
                  className={cn(
                    FIELD_CLASS,
                    'mt-1.5',
                    visibleError('category') && 'border-red-400/60'
                  )}
                >
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#161616] text-white">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id={`${ids.category}-error`}>{visibleError('category')}</FieldError>
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor={ids.description} className="text-white/85">
              Description
            </Label>
            <textarea
              id={ids.description}
              value={form.description}
              onChange={e => set({ description: e.target.value })}
              rows={5}
              maxLength={10_000}
              placeholder="Condition, grading, provenance, anything a bidder should know."
              aria-invalid={!!visibleError('description') || undefined}
              aria-describedby={
                visibleError('description') ? `${ids.description}-error` : undefined
              }
              className={cn(NATIVE_FIELD_CLASS, 'mt-1.5 min-h-[110px] resize-y leading-relaxed')}
            />
            <FieldError id={`${ids.description}-error`}>{visibleError('description')}</FieldError>
          </div>
          <div className="mt-4">
            <Label htmlFor={`${uid}-seller`} className="text-white/85">
              Seller name
            </Label>
            <Input
              id={`${uid}-seller`}
              value={form.sellerName}
              onChange={e => set({ sellerName: e.target.value })}
              maxLength={80}
              placeholder={HOUSE_SELLER_NAME}
              aria-describedby={`${uid}-seller-hint`}
              className={cn(FIELD_CLASS, 'mt-1.5')}
            />
            <FieldHint>
              <span id={`${uid}-seller-hint`}>
                Bidders see "Sold by {form.sellerName.trim() || HOUSE_SELLER_NAME}". Leave blank for{' '}
                {HOUSE_SELLER_NAME}, or name a consignor.
              </span>
            </FieldHint>
          </div>
        </Section>

        {/* ── Timing ────────────────────────────────────────────────── */}
        <Section title="Timing">
          {locked && <LockedNote />}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-white/85">Start</p>
              <Segmented
                className="mt-1.5"
                ariaLabel="Start"
                value={form.startMode}
                disabled={locked}
                onChange={v => set({ startMode: v })}
                options={[
                  {
                    value: 'now',
                    label: (
                      <>
                        <Zap className="h-3.5 w-3.5" aria-hidden /> Start now
                      </>
                    ),
                  },
                  {
                    value: 'schedule',
                    label: (
                      <>
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Schedule
                      </>
                    ),
                  },
                ]}
              />
              {(form.startMode === 'schedule' || locked) && (
                <div className="mt-2">
                  <Label htmlFor={ids.start} className="sr-only">
                    Start date and time
                  </Label>
                  <Input
                    id={ids.start}
                    type="datetime-local"
                    value={locked ? toLocalInput(auction!.startsAt) : form.startLocal}
                    min={toLocalInput(new Date())}
                    disabled={locked}
                    onChange={e => set({ startLocal: e.target.value })}
                    aria-invalid={!!visibleError('start') || undefined}
                    aria-describedby={visibleError('start') ? `${ids.start}-error` : undefined}
                    className={cn(
                      FIELD_CLASS,
                      '[color-scheme:dark]',
                      visibleError('start') && 'border-red-400/60'
                    )}
                  />
                  <FieldError id={`${ids.start}-error`}>{visibleError('start')}</FieldError>
                </div>
              )}
              {form.startMode === 'now' && !locked && (
                <FieldHint>Bidding opens as soon as you {isEdit ? 'save' : 'create it'}.</FieldHint>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-white/85">Length</p>
              <Segmented
                className="mt-1.5"
                ariaLabel="Auction length"
                value={form.lengthPreset}
                disabled={locked}
                onChange={v => {
                  if (v === 'custom' && form.lengthPreset !== 'custom' && startDate) {
                    // Seed the custom end from the current preset.
                    const days = Number(form.lengthPreset) || 7;
                    set({
                      lengthPreset: v,
                      endLocal: toLocalInput(new Date(startDate.getTime() + days * DAY_MS)),
                    });
                  } else set({ lengthPreset: v });
                }}
                options={LENGTH_OPTIONS}
              />
              {form.lengthPreset === 'custom' && !locked && (
                <div className="mt-2">
                  <Label htmlFor={ids.end} className="sr-only">
                    End date and time
                  </Label>
                  <Input
                    id={ids.end}
                    type="datetime-local"
                    value={form.endLocal}
                    min={
                      startDate
                        ? toLocalInput(new Date(startDate.getTime() + MIN_LENGTH_MS))
                        : undefined
                    }
                    onChange={e => set({ endLocal: e.target.value })}
                    aria-invalid={!!visibleError('end') || undefined}
                    aria-describedby={`${ids.end}-error`}
                    className={cn(
                      FIELD_CLASS,
                      '[color-scheme:dark]',
                      visibleError('end') && 'border-red-400/60'
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              'mt-4 rounded-md border px-3 py-2.5 text-sm',
              visibleError('end')
                ? 'border-red-400/40 bg-red-400/[0.06]'
                : 'border-[#C7FA09]/25 bg-[#C7FA09]/[0.05]'
            )}
          >
            {endDate ? (
              <p className="text-white">
                <span className="font-semibold">Ends {fmtDateTime(endDate)}</span>
                {durationMs != null && durationMs > 0 && (
                  <span className="text-white/60"> · runs {fmtSpan(durationMs)}</span>
                )}
              </p>
            ) : (
              <p className="text-white/60">Pick an end date to see when it closes.</p>
            )}
            {locked && auction!.extensionCount > 0 && (
              <p className="mt-0.5 text-xs text-white/60">
                Extended {auction!.extensionCount}× by late bids.
              </p>
            )}
            {!locked && (
              <p className="mt-0.5 text-xs text-white/60">
                Soft close: a bid in the final 2 minutes resets the clock to 2 minutes.
              </p>
            )}
            <FieldError id={`${ids.end}-error`}>{visibleError('end')}</FieldError>
          </div>
        </Section>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        <Section title="Pricing">
          {locked && <LockedNote />}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor={ids.startingPrice} className="text-white/85">
                Starting bid
              </Label>
              <div className="mt-1.5">
                <UsdInput
                  id={ids.startingPrice}
                  value={form.startingPrice}
                  onChange={e => set({ startingPrice: e.target.value })}
                  placeholder="50"
                  disabled={locked}
                  invalid={!!visibleError('startingPrice')}
                  aria-describedby={
                    visibleError('startingPrice') ? `${ids.startingPrice}-error` : undefined
                  }
                />
              </div>
              <FieldError id={`${ids.startingPrice}-error`}>
                {visibleError('startingPrice')}
              </FieldError>
            </div>

            <div>
              <div className="flex h-[14px] items-center gap-2">
                <Checkbox
                  id={`${uid}-has-reserve`}
                  checked={form.hasReserve}
                  disabled={locked}
                  onCheckedChange={c => set({ hasReserve: c === true })}
                  className="border-white/30 data-[state=checked]:border-[#C7FA09] data-[state=checked]:bg-[#C7FA09] data-[state=checked]:text-black"
                />
                <Label htmlFor={`${uid}-has-reserve`} className="cursor-pointer text-white/85">
                  Reserve price
                </Label>
              </div>
              {form.hasReserve ? (
                <div className="mt-1.5">
                  <Label htmlFor={ids.reservePrice} className="sr-only">
                    Reserve amount
                  </Label>
                  <UsdInput
                    id={ids.reservePrice}
                    value={form.reservePrice}
                    onChange={e => set({ reservePrice: e.target.value })}
                    placeholder={startingNum ? String(startingNum) : '100'}
                    disabled={locked}
                    invalid={!!visibleError('reservePrice')}
                    aria-describedby={`${ids.reservePrice}-hint`}
                  />
                </div>
              ) : (
                <p className="mt-1.5 flex h-10 items-center text-sm text-muted-foreground">
                  No reserve
                </p>
              )}
              <FieldError id={`${ids.reservePrice}-error`}>
                {visibleError('reservePrice')}
              </FieldError>
              <FieldHint>
                <span id={`${ids.reservePrice}-hint`}>
                  Bidders only see whether the reserve is met, never the amount.
                </span>
              </FieldHint>
            </div>

            <div>
              <Label htmlFor={ids.shipping} className="text-white/85">
                Shipping (flat)
              </Label>
              <div className="mt-1.5">
                <UsdInput
                  id={ids.shipping}
                  value={form.shipping}
                  onChange={e => set({ shipping: e.target.value })}
                  placeholder="0"
                  disabled={locked}
                  invalid={!!visibleError('shipping')}
                  aria-describedby={`${ids.shipping}-hint`}
                />
              </div>
              <FieldError id={`${ids.shipping}-error`}>{visibleError('shipping')}</FieldError>
              <FieldHint>
                <span id={`${ids.shipping}-hint`}>
                  Buyer pays this on top of the winning bid and the {premiumPct}% buyer premium.
                </span>
              </FieldHint>
            </div>
          </div>
        </Section>

        {/* ── Payments ──────────────────────────────────────────────── */}
        <Section title="Payments" hint="Which payment methods bidders can use on this auction.">
          <Segmented
            value={form.acceptedPayments}
            onChange={v => set({ acceptedPayments: v })}
            options={PAYMENT_OPTIONS}
            ariaLabel="Accepted payments"
            disabled={locked}
          />
          <FieldHint>
            {PAYMENT_HINT[form.acceptedPayments]}
            {form.acceptedPayments !== 'fiat' && hermesConfig.isSuccess && !cryptoLive && (
              <span className="text-amber-300">
                {' '}
                USDC escrow isn't live yet — until it is, bidders only see card and bank.
              </span>
            )}
          </FieldHint>
          <FieldError id={`${ids.payments}-error`}>{visibleError('payments')}</FieldError>
        </Section>

        {/* ── Est. value ────────────────────────────────────────────── */}
        <Section
          title="Est. value"
          hint="Optional. You always see it here; choose whether bidders do."
        >
          <EstValueField
            inputId={ids.estValue}
            value={form.est}
            onChange={est => set({ est })}
            category={form.category}
            title={form.title}
            description={form.description}
            imageUrls={form.images.map(i => i.url)}
            error={visibleError('estValue')}
          />
          <div className="mt-3 flex items-start gap-3">
            <Checkbox
              id={`${uid}-show-est`}
              checked={form.showEstValue}
              onCheckedChange={c => set({ showEstValue: c === true })}
              className="mt-0.5 border-white/30 data-[state=checked]:border-[#C7FA09] data-[state=checked]:bg-[#C7FA09] data-[state=checked]:text-black"
            />
            <div>
              <Label htmlFor={`${uid}-show-est`} className="cursor-pointer text-white">
                Show Est. Value to bidders
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.showEstValue
                  ? 'Shown on the auction page and cards next to the current bid.'
                  : 'Hidden from bidders. It stays saved here for your own reference.'}
              </p>
            </div>
          </div>
        </Section>

        {/* ── Visibility ────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
          <Checkbox
            id={`${uid}-featured`}
            checked={form.isFeatured}
            onCheckedChange={c => set({ isFeatured: c === true })}
            className="mt-0.5 border-white/30 data-[state=checked]:border-[#C7FA09] data-[state=checked]:bg-[#C7FA09] data-[state=checked]:text-black"
          />
          <div>
            <Label htmlFor={`${uid}-featured`} className="cursor-pointer text-white">
              Featured
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Shows a Featured badge on this lot&apos;s card in the marketplace.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-[rgba(18,18,18,1)] px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        {busy && (
          <p
            className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto"
            role="status"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Waiting for uploads…
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={save.isPending}
          className={GHOST_BUTTON_CLASS}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || busy} className={LIME_BUTTON_CLASS}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {isEdit
            ? 'Save changes'
            : form.startMode === 'now'
              ? 'Create & go live'
              : 'Schedule auction'}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  required,
  children,
}: {
  title: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
          {title}
          {required && (
            <span className="ml-1 text-[#C7FA09]" aria-hidden>
              *
            </span>
          )}
        </h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function LockedNote() {
  return (
    <p className="mb-3 flex items-start gap-2 rounded-md border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      Bidding has opened, so the starting bid, reserve, shipping, start and length are locked.
      Photos, videos, name, description, category, est. value and featuring can still change.
    </p>
  );
}
