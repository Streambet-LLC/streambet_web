import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react';
import type { AuctionImage, AuctionVideo } from '@/integrations/api/hermes';

type Slide = { type: 'image'; src: string; n: number } | { type: 'video'; video: AuctionVideo };

function VideoSlide({ video }: { video: AuctionVideo }) {
  if (video.kind === 'upload' && video.spin) {
    // Generated 360° spin: a silent seamless loop, no player chrome.
    return (
      <video
        src={video.url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="360° spin"
        className="h-full w-full bg-black object-contain"
      />
    );
  }
  if (video.kind === 'upload') {
    return (
      <video
        src={video.url}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
      />
    );
  }
  return (
    <iframe
      src={video.embedUrl ?? video.url}
      title="Auction video"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      className="h-full w-full bg-black"
    />
  );
}

/** Photos + videos with thumbnails, swipe/arrow-key navigation and a lightbox. */
export function MediaGallery({
  images,
  videos,
  title,
}: {
  images: AuctionImage[];
  videos: AuctionVideo[];
  title: string;
}) {
  // Cover first, then any 360° spin, then the other photos and videos.
  const slides = useMemo<Slide[]>(() => {
    const photos = images.map((img, i) => ({ type: 'image' as const, src: img.url, n: i + 1 }));
    const spins = videos.filter(v => v.spin).map(v => ({ type: 'video' as const, video: v }));
    const clips = videos.filter(v => !v.spin).map(v => ({ type: 'video' as const, video: v }));
    return [...photos.slice(0, 1), ...spins, ...photos.slice(1), ...clips];
  }, [images, videos]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = slides.length;
  const go = (d: number) => setIndex(i => (i + d + count) % count);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, count]);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-black text-white/30">
        No media
      </div>
    );
  }
  const current = slides[Math.min(index, count - 1)];

  const stage = (big: boolean) => (
    <div
      className={`relative overflow-hidden ${big ? 'h-full w-full' : 'aspect-square rounded-2xl border border-white/10'} bg-black`}
      onTouchStart={e => setTouchX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        setTouchX(null);
      }}
    >
      {current.type === 'image' ? (
        <img
          src={current.src}
          alt={`${title} — photo ${current.n}`}
          className="h-full w-full object-contain"
          onClick={() => !big && setZoom(true)}
        />
      ) : (
        <VideoSlide video={current.video} />
      )}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      {!big && current.type === 'image' && (
        <button
          type="button"
          aria-label="Full screen"
          onClick={() => setZoom(true)}
          className="absolute bottom-2 right-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
        >
          <Expand className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div>
      {stage(false)}
      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={
                s.type === 'video' && s.video.spin ? 'Show 360° spin' : `Show ${s.type} ${i + 1}`
              }
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-black ${
                i === index ? 'border-[#C7FA09]' : 'border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              {s.type === 'image' ? (
                <img src={s.src} alt="" className="h-full w-full object-cover" />
              ) : s.video.spin ? (
                <span className="flex h-full w-full items-center justify-center text-xs font-extrabold text-[#C7FA09]">
                  360°
                </span>
              ) : (
                <span className="flex h-full w-full items-center justify-center text-white">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-label={title}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setZoom(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 p-4 sm:p-10">{stage(true)}</div>
          <p className="pb-4 text-center text-xs text-white/50">
            {index + 1} / {count}
          </p>
        </div>
      )}
    </div>
  );
}
