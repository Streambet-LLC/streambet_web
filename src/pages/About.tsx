import {
  Briefcase,
  Eye,
  GraduationCap,
  Instagram,
  Mail,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HermesShell } from '@/components/hermes/HermesShell';
import { COLLECTIQ_INSTAGRAM_URL, NICK_EMAIL } from '@/lib/contact';
import nickPhoto from '@/assets/about/nick.jpg';

/**
 * How Hermes runs its auctions, in Nick's words (2026-11-14/15). He wants
 * these at the top of the page and himself at the bottom; the reserves line
 * sits next to the hand-delivery line, as he asked.
 */
const PILLARS: Array<{ icon: LucideIcon; text: string }> = [
  {
    icon: ShieldCheck,
    text: 'Barring seller preferences otherwise, we aim to include reserves in all our auctions as a protection to sellers, while always aiming to keep them reasonable and fairly below comps.',
  },
  {
    icon: Truck,
    text: 'For lot sales over $25,000, we hand-deliver anywhere in the continental U.S.',
  },
  {
    icon: Eye,
    text: 'We never run more than 20 auctions at any given time, to ensure everything has visibility and exposure.',
  },
  {
    icon: Megaphone,
    text: 'All auction batches receive at least one full paid marketing campaign (i.e. at least one lot per batch gets a marketing boost, using our proprietary matching / distribution engines).',
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

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#C7FA09]/[0.07] to-[#141414] p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C7FA09]/15">
                <Icon className="h-5 w-5 text-[#C7FA09]" aria-hidden />
              </span>
              <p className="mt-3 text-[15px] leading-relaxed text-white/85">{text}</p>
            </li>
          ))}
        </ul>

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
