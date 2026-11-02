import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { hermesAdminAPI, type AuctionImage, type AuctionVideo } from '@/integrations/api/hermes';
import {
  FIELD_CLASS,
  GHOST_BUTTON_CLASS,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  MAX_IMAGES,
  MAX_VIDEOS,
  VIDEO_MAX_BYTES,
  VIDEO_TYPES,
  detectVideoLink,
  errorMessage,
  fmtBytes,
} from './adminUtils';

type Updater<T> = (fn: (prev: T) => T) => void;

export interface VideoItem {
  kind: AuctionVideo['kind'];
  url: string;
  key?: string;
  embedUrl?: string | null;
}

const VIDEO_KIND_LABEL: Record<AuctionVideo['kind'], string> = {
  upload: 'Uploaded video',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
};

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function useDropZone(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setOver(true);
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
      },
    },
  };
}

// ── Photos ──────────────────────────────────────────────────────────────

interface PendingImage {
  id: number;
  name: string;
  preview: string;
  file: File;
}

export function PhotoUploader({
  images,
  onChange,
  onBusyChange,
  inputId,
  invalid,
  describedBy,
}: {
  images: AuctionImage[];
  onChange: Updater<AuctionImage[]>;
  onBusyChange?: (busy: boolean) => void;
  inputId: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    onBusyChange?.(pending.length > 0);
  }, [pending.length, onBusyChange]);

  const handleFiles = async (files: File[]) => {
    const accepted: File[] = [];
    for (const f of files) {
      if (!IMAGE_TYPES.includes(f.type)) {
        toast.error(`${f.name}: use JPG, PNG or WebP.`);
      } else if (f.size > IMAGE_MAX_BYTES) {
        toast.error(`${f.name} is ${fmtBytes(f.size)} — photos can be up to 15 MB.`);
      } else {
        accepted.push(f);
      }
    }
    const room = MAX_IMAGES - images.length - pending.length;
    if (accepted.length > room) {
      toast.error(
        `Up to ${MAX_IMAGES} photos per auction — skipped ${accepted.length - Math.max(0, room)}.`
      );
      accepted.splice(Math.max(0, room));
    }
    if (!accepted.length) return;

    const items: PendingImage[] = accepted.map(file => ({
      id: ++seq.current,
      name: file.name,
      preview: URL.createObjectURL(file),
      file,
    }));
    setPending(p => [...p, ...items]);

    // Small worker pool: a few photos at a time keeps big batches quick
    // without saturating the connection.
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const item = items[next++];
        try {
          const res = await hermesAdminAPI.upload('image', item.file);
          onChange(prev => [...prev, { key: res.key, url: res.url }]);
        } catch (err) {
          toast.error(`${item.name}: ${errorMessage(err, 'upload failed.')}`);
        } finally {
          setPending(p => p.filter(x => x.id !== item.id));
          URL.revokeObjectURL(item.preview);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, items.length) }, worker));
  };

  const drop = useDropZone(files => void handleFiles(files));
  const full = images.length + pending.length >= MAX_IMAGES;

  return (
    <div className="space-y-3">
      <div
        {...drop.props}
        className={cn(
          'relative rounded-lg border border-dashed transition-colors focus-within:ring-2 focus-within:ring-[#C7FA09]/60',
          drop.over
            ? 'border-[#C7FA09] bg-[#C7FA09]/[0.06]'
            : invalid
              ? 'border-red-400/60 bg-red-400/[0.03]'
              : 'border-white/15 bg-black/30 hover:border-white/30',
          full && 'pointer-events-none opacity-50'
        )}
      >
        <input
          id={inputId}
          type="file"
          multiple
          accept={IMAGE_TYPES.join(',')}
          disabled={full}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="sr-only"
          onChange={e => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = '';
            if (files.length) void handleFiles(files);
          }}
        />
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 px-4 py-6 text-center"
        >
          <ImagePlus className="h-6 w-6 text-[#C7FA09]" aria-hidden />
          <span className="text-sm text-white">
            Drop photos here or{' '}
            <span className="font-semibold text-[#C7FA09] underline-offset-2 hover:underline">
              browse
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG or WebP · up to 15 MB each · the first photo is the cover
          </span>
        </label>
      </div>

      {(images.length > 0 || pending.length > 0) && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5" aria-label="Photos">
          {images.map((img, i) => (
            <li
              key={img.key}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-md border bg-black',
                i === 0 ? 'border-[#C7FA09]/70' : 'border-white/10'
              )}
            >
              <img
                src={img.url}
                alt={`Photo ${i + 1}${i === 0 ? ' (cover)' : ''}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-[#C7FA09] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(prev => prev.filter(x => x.key !== img.key))}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white/90 hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => onChange(prev => move(prev, i, i - 1))}
                  aria-label={`Move photo ${i + 1} earlier`}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white/90 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09] disabled:invisible"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={i === images.length - 1}
                  onClick={() => onChange(prev => move(prev, i, i + 1))}
                  aria-label={`Move photo ${i + 1} later`}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white/90 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09] disabled:invisible"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {pending.map(p => (
            <li
              key={`pending-${p.id}`}
              className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black"
            >
              <img src={p.preview} alt="" className="h-full w-full object-cover opacity-40" />
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] text-white/80">
                <Loader2 className="h-5 w-5 animate-spin text-[#C7FA09]" aria-hidden />
                Uploading…
              </span>
              <span className="sr-only">Uploading {p.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {images.length} of {MAX_IMAGES} photos
        {pending.length > 0 && ` · ${pending.length} uploading`}
      </p>
    </div>
  );
}

// ── Videos ──────────────────────────────────────────────────────────────

interface PendingVideo {
  id: number;
  name: string;
  size: number;
  pct: number;
}

export function VideoUploader({
  videos,
  onChange,
  onBusyChange,
  inputId,
}: {
  videos: VideoItem[];
  onChange: Updater<VideoItem[]>;
  onBusyChange?: (busy: boolean) => void;
  inputId: string;
}) {
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    onBusyChange?.(pending.length > 0);
  }, [pending.length, onBusyChange]);

  const full = videos.length + pending.length >= MAX_VIDEOS;

  const handleFiles = async (files: File[]) => {
    const accepted: File[] = [];
    for (const f of files) {
      if (!VIDEO_TYPES.includes(f.type)) {
        toast.error(`${f.name}: use MP4, MOV or WebM.`);
      } else if (f.size > VIDEO_MAX_BYTES) {
        toast.error(`${f.name} is ${fmtBytes(f.size)} — videos can be up to 500 MB.`);
      } else {
        accepted.push(f);
      }
    }
    const room = MAX_VIDEOS - videos.length - pending.length;
    if (accepted.length > room) {
      toast.error(`Up to ${MAX_VIDEOS} videos per auction.`);
      accepted.splice(Math.max(0, room));
    }
    if (!accepted.length) return;

    const items = accepted.map(file => ({ id: ++seq.current, file }));
    setPending(p => [
      ...p,
      ...items.map(({ id, file }) => ({ id, name: file.name, size: file.size, pct: 0 })),
    ]);
    // One at a time — these can be hundreds of MB.
    for (const { id, file } of items) {
      try {
        const res = await hermesAdminAPI.upload('video', file, pct =>
          setPending(p => p.map(x => (x.id === id ? { ...x, pct } : x)))
        );
        onChange(prev => [...prev, { kind: 'upload', url: res.url, key: res.key }]);
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err, 'upload failed.')}`);
      } finally {
        setPending(p => p.filter(x => x.id !== id));
      }
    }
  };

  const addLink = () => {
    const url = link.trim();
    if (!url) return;
    const kind = detectVideoLink(url);
    if (!kind) {
      setLinkError("That doesn't look like a YouTube or Vimeo video link.");
      return;
    }
    if (videos.some(v => v.url === url)) {
      setLinkError('That video is already added.');
      return;
    }
    if (full) {
      setLinkError(`Up to ${MAX_VIDEOS} videos per auction.`);
      return;
    }
    onChange(prev => [...prev, { kind, url }]);
    setLink('');
    setLinkError(null);
  };

  const drop = useDropZone(files => void handleFiles(files));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          {...drop.props}
          className={cn(
            'relative rounded-lg border border-dashed transition-colors focus-within:ring-2 focus-within:ring-[#C7FA09]/60',
            drop.over
              ? 'border-[#C7FA09] bg-[#C7FA09]/[0.06]'
              : 'border-white/15 bg-black/30 hover:border-white/30',
            full && 'pointer-events-none opacity-50'
          )}
        >
          <input
            id={inputId}
            type="file"
            multiple
            accept={[...VIDEO_TYPES, '.mov'].join(',')}
            disabled={full}
            className="sr-only"
            onChange={e => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = '';
              if (files.length) void handleFiles(files);
            }}
          />
          <label
            htmlFor={inputId}
            className="flex h-full cursor-pointer flex-col items-center justify-center gap-1 px-4 py-4 text-center"
          >
            <Upload className="h-5 w-5 text-[#C7FA09]" aria-hidden />
            <span className="text-sm text-white">
              Upload a video <span className="text-muted-foreground">or drop it here</span>
            </span>
            <span className="text-xs text-muted-foreground">MP4, MOV or WebM · up to 500 MB</span>
          </label>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <label
            htmlFor={`${inputId}-link`}
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/80"
          >
            <Link2 className="h-3.5 w-3.5 text-[#C7FA09]" aria-hidden /> Or paste a YouTube / Vimeo
            link
          </label>
          <div className="flex gap-2">
            <Input
              id={`${inputId}-link`}
              value={link}
              onChange={e => {
                setLink(e.target.value);
                if (linkError) setLinkError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLink();
                }
              }}
              placeholder="https://youtu.be/…"
              inputMode="url"
              autoComplete="off"
              disabled={full}
              aria-invalid={!!linkError || undefined}
              aria-describedby={linkError ? `${inputId}-link-error` : undefined}
              className={cn(FIELD_CLASS, 'h-9', linkError && 'border-red-400/60')}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLink}
              disabled={full || !link.trim()}
              className={cn(GHOST_BUTTON_CLASS, 'h-9 shrink-0')}
            >
              <Plus /> Add
            </Button>
          </div>
          {linkError ? (
            <p id={`${inputId}-link-error`} role="alert" className="mt-1 text-xs text-red-300">
              {linkError}
            </p>
          ) : (
            link.trim() &&
            detectVideoLink(link) && (
              <p className="mt-1 text-xs text-emerald-300">
                {VIDEO_KIND_LABEL[detectVideoLink(link)!]} link detected
              </p>
            )
          )}
        </div>
      </div>

      {(videos.length > 0 || pending.length > 0) && (
        <ul className="space-y-2" aria-label="Videos">
          {videos.map((v, i) => (
            <li
              key={`${v.kind}-${v.key ?? v.url}`}
              className="flex items-center gap-3 rounded-md border border-white/10 bg-black/30 p-2"
            >
              {v.kind === 'upload' ? (
                <video
                  src={v.url}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-10 w-16 shrink-0 rounded bg-black object-cover"
                  aria-hidden
                />
              ) : (
                <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-white/5">
                  <Film className="h-4 w-4 text-white/60" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">{VIDEO_KIND_LABEL[v.kind]}</p>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-muted-foreground hover:text-white hover:underline"
                >
                  {v.url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}
                aria-label={`Remove video ${i + 1}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-red-500/20 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FA09]"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
          {pending.map(p => (
            <li
              key={`pending-${p.id}`}
              className="rounded-md border border-white/10 bg-black/30 p-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-white/85">
                  <Loader2
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-[#C7FA09]"
                    aria-hidden
                  />
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-muted-foreground">({fmtBytes(p.size)})</span>
                </span>
                <span className="shrink-0 tabular-nums text-white/70">{p.pct}%</span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-label={`Uploading ${p.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={p.pct}
              >
                <div
                  className="h-full rounded-full bg-[#C7FA09] transition-[width] duration-200"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
