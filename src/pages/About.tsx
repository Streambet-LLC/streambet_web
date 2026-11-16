import { Briefcase, GraduationCap, Instagram, Mail, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HermesShell } from '@/components/hermes/HermesShell';
import { COLLECTIQ_INSTAGRAM_URL, NICK_EMAIL } from '@/lib/contact';
import nickPhoto from '@/assets/about/nick.jpg';

/**
 * How Hermes runs its auctions. `text` is Nick's wording (2026-11-14/15);
 * the short titles are ours, so the list scans. He wants these at the top
 * of the page and himself at the bottom; the reserves line sits next to the
 * hand-delivery line, as he asked.
 */
const PILLARS: Array<{ title: string; text: string }> = [
  {
    title: 'Reserves that protect sellers',
    text: 'Barring seller preferences otherwise, we aim to include reserves in all our auctions as a protection to sellers, while always aiming to keep them reasonable and fairly below comps.',
  },
  {
    title: 'Hand delivery on $25K+ lots',
    text: 'For lot sales over $25,000, we hand-deliver anywhere in the continental U.S.',
  },
  {
    title: 'Never more than 20 live auctions',
    text: 'We never run more than 20 auctions at any given time, to ensure everything has visibility and exposure.',
  },
  {
    title: 'A paid campaign for every batch',
    text: 'All auction batches receive at least one full paid marketing campaign (i.e. at least one lot per batch gets a marketing boost, using our proprietary matching / distribution engines).',
  },
  {
    // Aaron, 2026-11-15. "Resets the clock to 2 minutes" is what the API does
    // (ANTI_SNIPE_WINDOW_SECONDS: ends_at = bid time + 2 min); lengths are the
    // 7 / 14 / 21-day presets.
    title: 'Extended bidding',
    text: 'Auctions run 1–3 weeks, and any bid in the final 2 minutes resets the clock to 2 minutes — no sniping.',
  },
];

/** Nick's bio, in his words (2026-11-09). First name only, by his choice. */
const CREDENTIALS: Array<{ icon: LucideIcon; text: string }> = [
  { icon: GraduationCap, text: 'MBA, University of Southern California' },
  { icon: GraduationCap, text: 'MS Finance, Georgetown' },
  { icon: Briefcase, text: '4x Founder' },
  { icon: Sparkles, text: 'Avid Collector — sports cards & memorabilia; TCG; books & manga' },
];

/** About page: how the auctions are run, then who's behind them and how to reach him. */
export default function About() {
  return (
    <HermesShell>
      <div className="mx-auto max-w-2xl py-4 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C7FA09]">About</p>
        <h1 className="mt-2 text-3xl font-black italic uppercase leading-tight sm:text-4xl">
          How we run our auctions
        </h1>

        {/* Numbered, headline-led list: the numbers carry the visual weight
            (no icons), and dividers keep uneven lengths from looking ragged. */}
        <ol className="mt-8 border-t border-white/10">
          {PILLARS.map(({ title, text }, i) => (
            <li key={title} className="flex gap-4 border-b border-white/10 py-6 sm:gap-6">
              <span
                aria-hidden
                className="w-9 shrink-0 text-2xl font-black italic leading-none text-[#C7FA09] sm:w-12 sm:text-3xl"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold leading-snug sm:text-xl">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-2xl font-black italic uppercase leading-tight sm:text-3xl">
          Meet the founder
        </h2>

        <section
          aria-labelledby="founder-name"
          className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#C7FA09]/10 via-[#141414] to-[#0a0a0a] p-6 sm:p-8"
        >
          <div className="flex items-center gap-4">
            <img
              src={nickPhoto}
              alt="Nick"
              width={96}
              height={96}
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[#C7FA09] ring-offset-2 ring-offset-[#141414] sm:h-24 sm:w-24"
            />
            <div>
              <h3 id="founder-name" className="text-2xl font-extrabold">
                Nick
              </h3>
              <p className="text-sm font-semibold text-white/60">Founder</p>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {CREDENTIALS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[15px] text-white/85">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#C7FA09]" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold text-white/70">Questions? Reach out.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`mailto:${NICK_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#C7FA09] px-4 py-2 text-sm font-bold text-black hover:bg-[#d6ff3d]"
              >
                <Mail className="h-4 w-4" aria-hidden />
                {NICK_EMAIL}
              </a>
              <a
                href={COLLECTIQ_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#C7FA09]/60"
              >
                <Instagram className="h-4 w-4" aria-hidden />
                @collectiq.co
                <span className="sr-only">(opens Instagram in a new tab)</span>
              </a>
            </div>
          </div>

          {/* Nick's closing line (2026-11-13), in his words: inside the card,
              small and italic so it still reads as a quote. */}
          <figure className="mt-6 border-t border-white/10 pt-6">
            <blockquote className="text-sm font-semibold italic text-white/70">
              “If you want to win at the highest level, you have to be willing to be misunderstood
              for very long periods of time.”
            </blockquote>
          </figure>
        </section>
      </div>
    </HermesShell>
  );
}
