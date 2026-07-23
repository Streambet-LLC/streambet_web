import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { waitlistAPI } from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public landing page. While the product is in private testing, this is the
 * ONLY thing non-admin visitors see — a branded waitlist capture. Admins reach
 * the dashboard by logging in (discreet link at the bottom).
 */
export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="auth-bg-gradient" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <img
            src="/machine-wordmark.svg"
            alt="CardCade"
            className="mx-auto mb-8 h-9"
          />

          <span className="inline-flex items-center gap-2 rounded-full border border-[#B4FF39]/25 bg-[#B4FF39]/10 px-3 py-1 text-xs font-medium text-[#B4FF39]">
            Private beta
          </span>

          <h1 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            The card market, decoded.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
            CardCade is building AI-powered market intelligence for trading
            cards — pricing, trends, and forecasts. We're in private testing and
            opening up soon. Join the waitlist to get early access.
          </p>

          {done ? (
            <div className="mx-auto mt-8 flex max-w-md flex-col items-center rounded-2xl border border-[#B4FF39]/25 bg-[#B4FF39]/[0.06] px-6 py-8">
              <CheckCircle2 className="h-9 w-9 text-[#B4FF39]" />
              <h2 className="mt-3 text-lg font-semibold text-white">
                You're on the list!
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Thanks for your interest — we'll be in touch at{' '}
                <span className="text-white">{email.trim()}</span> when access
                opens up.
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
        </motion.div>
      </div>

      {/* Footer: legal + discreet admin login */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-8 text-xs text-white/40">
        <span>© CardCade {new Date().getFullYear()}</span>
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
