import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Gauge,
  FileText,
  LineChart,
  Scale,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { waitlistAPI } from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Markets we cover — colors mirror the analytics dashboard's segment palette. */
const SEGMENTS: { label: string; color: string }[] = [
  { label: 'Pokémon', color: '#65a30d' },
  { label: 'Sports', color: '#0284c7' },
  { label: 'One Piece', color: '#d97706' },
  { label: 'Magic', color: '#8b5cf6' },
  { label: 'Lorcana', color: '#dc2626' },
  { label: 'Star Wars', color: '#14b8a6' },
  { label: 'Dragon Ball', color: '#f97316' },
  { label: 'Yu-Gi-Oh!', color: '#ec4899' },
];

/** What you can ask Cardy for — the capability set, told user-first. */
const FEATURES: {
  icon: typeof Gauge;
  title: string;
  desc: string;
}[] = [
  {
    icon: Gauge,
    title: 'Market temperature',
    desc: 'Fear/greed analysis on any market or card — heat, momentum, demand, supply pressure, and more distilled into a single 0–100 score.',
  },
  {
    icon: FileText,
    title: 'AI market brief',
    desc: 'Full research reports on cards and markets, based on live, real-time web data.',
  },
  {
    icon: LineChart,
    title: 'Trends over time',
    desc: 'Heat, momentum, and trajectories charted across card markets and individual assets.',
  },
  {
    icon: Scale,
    title: 'Buy, sell & hold signals',
    desc: 'Ask Cardy whether to buy, sell, or hold — it analyzes and suggests timing, tuned to the latest news and happenings.',
  },
  {
    icon: Briefcase,
    title: 'Portfolio management',
    desc: 'Ask Cardy to log cards into your watchlist, held, and sold portfolios anytime.',
  },
];

/**
 * Public landing page. While the product is in private testing, this is the
 * ONLY thing non-admin visitors see — a branded overview of collectIQ's
 * market intelligence plus a waitlist capture. Admins reach the dashboard by
 * logging in (discreet link in the footer).
 */
export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await waitlistAPI.join({
        email: trimmed,
        name: name.trim() || undefined,
        source: 'landing',
      });
      setDone(true);
    } catch (err) {
      setError(getMessage(err) || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Own scroll container: global CSS locks `body { overflow-y: hidden }`
    // (fixed-viewport app shell), so the page must scroll itself.
    <div className="relative h-[100dvh] overflow-y-auto overflow-x-hidden bg-background">
      <div className="auth-bg-gradient" />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-12 sm:pt-16">
        {/* ---------------- Hero ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <img
            src="/collectiq-logo.png"
            alt="collectIQ"
            className="mx-auto mb-8 h-12 w-auto sm:h-14"
          />

          <span className="inline-flex items-center gap-2 rounded-full border border-[#B4FF39]/25 bg-[#B4FF39]/10 px-3 py-1 text-xs font-medium text-[#B4FF39]">
            Private beta
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            The card market, decoded.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
            collectIQ turns live web data into AI-powered market intelligence for trading cards —
            real-time pricing, trend forecasts, and{' '}
            <span className="font-medium text-white">Cardy</span>, our AI research analyst who
            answers any card or collector question. Sign up below for updates.
          </p>

          {/* Waitlist capture */}
          <div ref={formRef} className="scroll-mt-24">
            {done ? (
              <div className="mx-auto mt-8 flex max-w-md flex-col items-center rounded-2xl border border-[#B4FF39]/25 bg-[#B4FF39]/[0.06] px-6 py-8">
                <CheckCircle2 className="h-9 w-9 text-[#B4FF39]" />
                <h2 className="mt-3 text-lg font-semibold text-white">You're on the list!</h2>
                <p className="mt-1 text-sm text-white/70">
                  Thanks for your interest — we'll be in touch at{' '}
                  <span className="text-white">{email.trim()}</span> when access opens up.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="mx-auto mt-8 w-full max-w-md space-y-3">
                <Input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="h-12 border-white/10 bg-black/40 text-center text-sm text-white placeholder:text-gray-500"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="h-12 flex-1 border-white/10 bg-black/40 text-sm text-white placeholder:text-gray-500"
                  />
                  <Button
                    type="submit"
                    disabled={submitting || !email.trim()}
                    className="h-12 shrink-0 bg-[#B4FF39] px-6 font-medium text-black hover:bg-[#a2e833] disabled:opacity-40"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Join waitlist
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </form>
            )}
          </div>
        </motion.div>

        {/* ---------------- Meet Cardy ---------------- */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-24"
        >
          <div className="mx-auto max-w-2xl text-center">
            {/* Cardy mark — swap this badge for the Cardy logo when it's hosted. */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#B4FF39]/25 bg-[#B4FF39]/10 text-[#B4FF39]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
              Use Cardy for all your card intelligence needs
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/60">
              Ask Cardy anything about card markets — Cardy goes far beyond
              specific price checking. Here are some things you can do:
            </p>
          </div>

          {/* Bento: 6-col grid — top row = three 2-wide cards, bottom row =
              two 3-wide cards, so every row fills (no orphan with 5 cards). */}
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map((f, i) => {
              const wide = i >= 3; // bottom-row cards span wider
              const lgSpan = wide ? 'lg:col-span-3' : 'lg:col-span-2';
              // On 2-col screens the 5th card goes full-width to avoid an orphan.
              const smSpan = i === 4 ? 'sm:col-span-2' : '';
              return (
                <div
                  key={f.title}
                  className={`group rounded-2xl border border-white/8 bg-[rgba(22,22,22,0.6)] p-5 transition-colors hover:border-[#B4FF39]/25 ${lgSpan} ${smSpan} ${
                    wide ? 'lg:flex lg:items-center lg:gap-4' : ''
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-[#B4FF39]">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className={wide ? '' : 'contents'}>
                    <h3
                      className={`text-sm font-semibold text-white ${
                        wide ? 'mt-4 lg:mt-0' : 'mt-4'
                      }`}
                    >
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Segment coverage — 8 markets fold into clean rows of 4 (2 on mobile). */}
          <div className="mt-14 flex flex-col items-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              We cover ALL card markets, including:
            </p>
            <div className="mt-5 grid w-full max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-4">
              {SEGMENTS.map(s => (
                <span
                  key={s.label}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-sm text-white/80"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ---------------- Closing CTA ---------------- */}
        {!done && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mx-auto mt-24 max-w-2xl rounded-3xl border border-white/8 bg-gradient-to-b from-[rgba(180,255,57,0.06)] to-transparent px-6 py-12 text-center"
          >
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Get in early</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/60">
              Be among the first 1,000 waitlist signups to get early access!
            </p>
            <Button
              onClick={scrollToForm}
              className="mt-6 h-12 bg-[#B4FF39] px-7 font-medium text-black hover:bg-[#a2e833]"
            >
              Join the waitlist
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.section>
        )}
      </div>

      {/* Footer: legal + discreet admin login */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-8 text-xs text-white/40">
        <span>© collectIQ {new Date().getFullYear()}</span>
        <Link to="/privacy" className="hover:text-white/70">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-white/70">
          Terms
        </Link>
        <Link to="/login" className="hover:text-white/70">
          Log in
        </Link>
      </div>
    </div>
  );
}
