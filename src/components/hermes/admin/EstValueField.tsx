import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ExternalLink, Loader2, ScanSearch, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hermesAdminAPI, type AuctionCategory, type EstValueMeta } from '@/integrations/api/hermes';
import { fmtUsd } from '../format';
import { FieldError, FieldHint, Pill, ReliabilityBadge, UsdInput } from './adminUi';
import {
  FIELD_CLASS,
  GHOST_BUTTON_CLASS,
  LIME_BUTTON_CLASS,
  errorMessage,
  estValueSource,
  fmtDay,
  fmtShortDateTime,
  parseUsd,
  roundCents,
  useNow,
  valueMethodLabel,
  type EstValueState,
} from './adminUtils';

/**
 * Est. value: either typed by the admin, or pulled from recent sales in two
 * steps — identify the item from the photos/name, then value that subject.
 */
export function EstValueField({
  value,
  onChange,
  category,
  title,
  description,
  imageUrls,
  inputId,
  error,
}: {
  value: EstValueState;
  onChange: (next: EstValueState) => void;
  category: AuctionCategory | '';
  title: string;
  description: string;
  imageUrls: string[];
  inputId: string;
  error?: string | null;
}) {
  const [subject, setSubject] = useState(value.accepted?.meta.subject ?? '');
  const [identified, setIdentified] = useState<{ identified: boolean; notes: string } | null>(null);
  const [rec, setRec] = useState<EstValueMeta | null>(value.accepted?.meta ?? null);
  const [showSubject, setShowSubject] = useState(!!value.accepted);
  const [valueStartedAt, setValueStartedAt] = useState(0);

  const identify = useMutation({
    mutationFn: () =>
      hermesAdminAPI.identify({
        category: category as AuctionCategory,
        title: title.trim().slice(0, 200) || undefined,
        description: description.trim().slice(0, 4000) || undefined,
        imageUrls: imageUrls.length ? imageUrls.slice(0, 6) : undefined,
      }),
    onSuccess: r => {
      setSubject(r.subject);
      setIdentified({ identified: r.identified, notes: r.notes });
      setShowSubject(true);
    },
    onError: err => toast.error(errorMessage(err, "Couldn't identify the item.")),
  });

  const pull = useMutation({
    mutationFn: (s: string) => hermesAdminAPI.value(category as AuctionCategory, s),
    onMutate: () => setValueStartedAt(Date.now()),
    onSuccess: m => setRec(m),
    onError: err => toast.error(errorMessage(err, "Couldn't pull a value right now.")),
  });

  const now = useNow(pull.isPending ? 1000 : 0);
  const elapsed = pull.isPending ? Math.max(0, Math.floor((now - valueStartedAt) / 1000)) : 0;

  const source = estValueSource(value);
  const amountNum = parseUsd(value.amount);
  const canIdentify = !!category && (!!title.trim() || imageUrls.length > 0);
  const subjectOk = subject.trim().length >= 3;
  const usingRec =
    !!rec && rec.pointUsd != null && source === 'pulled' && value.accepted?.meta === rec;

  const applyRecommendation = () => {
    if (!rec || rec.pointUsd == null) return;
    const usd = roundCents(rec.pointUsd);
    onChange({ mode: 'pull', amount: String(usd), accepted: { meta: rec, usd } });
  };

  const setMode = (mode: EstValueState['mode']) =>
    onChange(mode === 'manual' ? { ...value, mode, accepted: null } : { ...value, mode });

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Est. value</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            {
              mode: 'pull',
              label: 'Pull it for me',
              hint: 'Identify the item and price it from recent sales.',
              Icon: Sparkles,
            },
            { mode: 'manual', label: "I'll enter it", hint: 'Type your own estimate.', Icon: null },
          ] as const
        ).map(o => (
          <label
            key={o.mode}
            className={cn(
              'flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-[#C7FA09]/60',
              value.mode === o.mode
                ? 'border-[#C7FA09]/60 bg-[#C7FA09]/[0.05]'
                : 'border-white/10 bg-black/30 hover:border-white/25'
            )}
          >
            <input
              type="radio"
              name={`${inputId}-mode`}
              value={o.mode}
              checked={value.mode === o.mode}
              onChange={() => setMode(o.mode)}
              className="mt-0.5 h-4 w-4 accent-[#C7FA09]"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                {o.Icon && <o.Icon className="h-3.5 w-3.5 text-[#C7FA09]" aria-hidden />}
                {o.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {value.mode === 'pull' && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/25 p-3 sm:p-4">
          {/* Step 1 — identify */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => identify.mutate()}
              disabled={!canIdentify || identify.isPending}
              className={GHOST_BUTTON_CLASS}
            >
              {identify.isPending ? <Loader2 className="animate-spin" /> : <ScanSearch />}
              {identify.isPending
                ? 'Reading photos…'
                : showSubject
                  ? 'Identify again'
                  : 'Identify item'}
            </Button>
            {!showSubject && (
              <button
                type="button"
                onClick={() => {
                  setSubject(title.trim());
                  setShowSubject(true);
                }}
                disabled={!category}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-white hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                Skip — I'll describe it
              </button>
            )}
            {!category ? (
              <span className="text-xs text-amber-300">Pick a category first.</span>
            ) : (
              !canIdentify && (
                <span className="text-xs text-muted-foreground">
                  Add photos or an item name first.
                </span>
              )
            )}
          </div>

          {/* Step 2 — confirm subject, then value */}
          {showSubject && (
            <div className="space-y-2">
              <Label htmlFor={`${inputId}-subject`} className="text-xs text-white/80">
                Is this the item?
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={`${inputId}-subject`}
                  value={subject}
                  maxLength={300}
                  onChange={e => setSubject(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (subjectOk && !pull.isPending) pull.mutate(subject.trim());
                    }
                  }}
                  placeholder="e.g. 2018 Panini Prizm Luka Doncic Silver PSA 10"
                  className={cn(FIELD_CLASS, 'h-9')}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => pull.mutate(subject.trim())}
                  disabled={!subjectOk || !category || pull.isPending}
                  className={cn(LIME_BUTTON_CLASS, 'h-9 shrink-0')}
                >
                  {pull.isPending ? <Loader2 className="animate-spin" /> : <Search />}
                  {rec ? 'Get value again' : 'Get value'}
                </Button>
              </div>
              {identified?.notes && (
                <p
                  className={cn(
                    'text-xs',
                    identified.identified ? 'text-muted-foreground' : 'text-amber-300'
                  )}
                >
                  {identified.notes}
                </p>
              )}
              <FieldHint className="mt-0">
                Edit it until it names the exact item — year, set, player, parallel, grade.
              </FieldHint>
            </div>
          )}

          {pull.isPending && (
            <div
              className="flex items-center gap-3 rounded-md border border-white/10 bg-black/40 p-3"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#C7FA09]" aria-hidden />
              <div className="text-sm">
                <p className="text-white">Searching recent sales…</p>
                <p className="text-xs text-muted-foreground">
                  This can take up to a minute · {elapsed}s
                </p>
              </div>
            </div>
          )}

          {rec && !pull.isPending && (
            <Recommendation rec={rec} using={usingRec} onUse={applyRecommendation} />
          )}
        </div>
      )}

      <div>
        <Label htmlFor={inputId} className="text-white/85">
          Est. value <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <div className="mt-1.5 max-w-[220px]">
          <UsdInput
            id={inputId}
            value={value.amount}
            onChange={e => onChange({ ...value, amount: e.target.value })}
            placeholder="0.00"
            invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
          />
        </div>
        <FieldError id={`${inputId}-error`}>{error}</FieldError>
        {!error && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted-foreground">
            {source === 'pulled' ? (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Check className="h-3 w-3" aria-hidden /> Using the pulled recommendation.
              </span>
            ) : value.mode === 'pull' && value.accepted && amountNum != null ? (
              'Edited — this will be saved as a manual value.'
            ) : (
              'Shown to bidders as the estimated value. Leave blank to hide it.'
            )}
          </p>
        )}
      </div>
    </fieldset>
  );
}

function Recommendation({
  rec,
  using,
  onUse,
}: {
  rec: EstValueMeta;
  using: boolean;
  onUse: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#C7FA09]/25 bg-[#C7FA09]/[0.04] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Recommended est. value
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums text-white">
            {rec.pointUsd != null ? fmtUsd(rec.pointUsd) : 'No estimate'}
          </p>
          {(rec.lowUsd != null || rec.highUsd != null) && (
            <p className="text-xs tabular-nums text-white/60">
              Range {fmtUsd(rec.lowUsd)} – {fmtUsd(rec.highUsd)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ReliabilityBadge reliability={rec.reliability} />
          {rec.confidencePct != null && (
            <Pill className="border-white/15 bg-white/5 text-white/75">
              {rec.confidencePct}% confidence
            </Pill>
          )}
          {rec.method && (
            <Pill className="border-white/15 bg-white/5 text-white/75">
              {valueMethodLabel(rec.method)}
            </Pill>
          )}
        </div>
      </div>

      {rec.note && <p className="mt-2 text-sm leading-relaxed text-white/75">{rec.note}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">
        For “{rec.subject}” · pulled {fmtShortDateTime(rec.pulledAt)}
      </p>

      {rec.comps.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Comparable sales ({rec.comps.length})
          </p>
          <ul className="divide-y divide-white/5 rounded-md border border-white/10 bg-black/30">
            {rec.comps.slice(0, 8).map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-2.5 py-2 text-xs">
                <div className="min-w-0">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-white/90 hover:text-[#C7FA09] hover:underline"
                    >
                      <span className="line-clamp-2 break-words">{c.title || 'Sale'}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="line-clamp-2 break-words text-white/90">
                      {c.title || 'Sale'}
                    </span>
                  )}
                  <p className="mt-0.5 text-muted-foreground">
                    {fmtDay(c.date)}
                    {c.source ? ` · ${c.source}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-white">
                  {fmtUsd(c.priceUsd)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-amber-300">No comparable sales were found.</p>
      )}

      <div className="mt-3">
        {rec.pointUsd == null ? (
          <p className="text-xs text-muted-foreground">
            No reliable estimate — enter a value below, or refine the item and try again.
          </p>
        ) : using ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300">
            <Check className="h-4 w-4" aria-hidden /> Using {fmtUsd(rec.pointUsd)}
          </p>
        ) : (
          <Button type="button" size="sm" onClick={onUse} className={LIME_BUTTON_CLASS}>
            <Check /> Use {fmtUsd(rec.pointUsd)}
          </Button>
        )}
      </div>
    </div>
  );
}
