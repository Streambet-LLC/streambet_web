import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/integrations/api/client';
import { getMessage } from '@/utils/helper';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, _ and - only'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[a-z]/, 'Add a lowercase letter')
    .regex(/[A-Z]/, 'Add an uppercase letter')
    .regex(/\d/, 'Add a number')
    .regex(/[^A-Za-z0-9]/, 'Add a symbol'),
  tos: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms' }) }),
});

/** Bidder sign-up (Hermes Auctions). New accounts are regular users. */
export default function SignUp() {
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/auctions';
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/auctions';
  const [form, setForm] = useState({ email: '', username: '', password: '', tos: false });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      api.auth.register({
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        tosAccepted: true,
        profileImageUrl: '',
        lastKnownIp: '',
        // VerifyEmail sends the user on to /login?redirect=<this>.
        redirect: safeRedirect,
      } as Parameters<typeof api.auth.register>[0]),
    onSuccess: () => setSentTo(form.email.trim()),
    onError: err => toast.error(getMessage(err) || 'Could not create your account.'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.errors.map(er => [String(er.path[0]), er.message])),
      );
      return;
    }
    setErrors({});
    register.mutate();
  };

  const google = () => {
    sessionStorage.setItem('post_auth_redirect', safeRedirect);
    api.auth.googleAuth();
  };

  return (
    <div className="relative h-[100dvh] overflow-y-auto bg-[#0a0a0a] text-white">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
        <Link to="/auctions" className="mx-auto mb-8">
          <img src="/hermes/hermes-auctions-logo.png" alt="Hermes Auctions" className="h-16 w-auto" />
        </Link>

        {sentTo ? (
          <div className="rounded-2xl border border-[#C7FA09]/30 bg-[#C7FA09]/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#C7FA09]" />
            <h1 className="mt-3 text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-white/70">
              We sent a verification link to <span className="font-semibold text-white">{sentTo}</span>.
              Verify, then log in to start bidding.
            </p>
            <Button asChild className="mt-5 h-11 w-full bg-[#C7FA09] font-bold text-black hover:bg-[#d6ff3d]">
              <Link to={`/login?redirect=${encodeURIComponent(safeRedirect)}`}>Go to log in</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-6">
            <h1 className="text-2xl font-extrabold">Create your bidder account</h1>
            <p className="mt-1 text-sm text-white/60">
              Zero-fee auctions for sports cards, TCG and memorabilia.
            </p>

            <button
              type="button"
              onClick={google}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white font-semibold text-black hover:bg-white/90"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.3-.4-3.5z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-white/40">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              {(
                [
                  ['email', 'Email', 'email', 'email'],
                  ['username', 'Username', 'text', 'username'],
                ] as const
              ).map(([k, label, type, ac]) => (
                <div key={k}>
                  <Label htmlFor={`su-${k}`} className="text-xs text-white/60">
                    {label}
                  </Label>
                  <Input
                    id={`su-${k}`}
                    type={type}
                    autoComplete={ac}
                    value={form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="mt-1 h-11 border-white/10 bg-black/40 text-white"
                  />
                  {errors[k] && <p className="mt-1 text-xs text-red-400">{errors[k]}</p>}
                </div>
              ))}
              <div>
                <Label htmlFor="su-password" className="text-xs text-white/60">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="su-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="h-11 border-white/10 bg-black/40 pr-10 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
              </div>
              <label className="flex items-start gap-2 text-sm text-white/70">
                <Checkbox
                  checked={form.tos}
                  onCheckedChange={c => setForm(f => ({ ...f, tos: !!c }))}
                  className="mt-0.5 border-white/30"
                />
                <span>
                  I'm 18+ and agree to the{' '}
                  <Link to="/terms" className="text-[#C7FA09] underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-[#C7FA09] underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.tos && <p className="-mt-2 text-xs text-red-400">{errors.tos}</p>}
              <Button
                type="submit"
                disabled={register.isPending}
                className="h-11 w-full bg-[#C7FA09] font-bold text-black hover:bg-[#d6ff3d]"
              >
                {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-white/60">
              Already have an account?{' '}
              <Link to={`/login?redirect=${encodeURIComponent(safeRedirect)}`} className="font-semibold text-[#C7FA09] hover:underline">
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
