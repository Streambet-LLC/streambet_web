import { useCallback, useEffect, useState, type FormEvent } from 'react';
import moment from 'moment';
import { Loader2, Search, Users } from 'lucide-react';
import { localTzAbbr } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminAPI } from '@/integrations/api/client';
import { SectionHeader } from './SectionHeader';

interface AdminUser {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  role: string;
  isActive: boolean;
  isVerify: boolean;
  createdAt: string;
  /** First-touch ad params from signup (Meta ads); null if untagged. */
  signupAttribution?: Record<string, string> | null;
}

/** "meta / paid · tyranitar" from the signup's UTM params; null if untagged. */
function fmtSource(a: AdminUser['signupAttribution']): string | null {
  if (!a) return null;
  const channel = [a.utm_source, a.utm_medium].filter(Boolean).join(' / ');
  const label = [channel, a.utm_campaign].filter(Boolean).join(' · ');
  return label || (a.fbclid ? 'Facebook click' : null);
}

/** Every captured param, for the cell's tooltip. */
function sourceDetail(a: AdminUser['signupAttribution']): string | undefined {
  if (!a) return undefined;
  return Object.entries(a)
    .map(([k, v]) => `${k}: ${k === 'fbclid' && v.length > 24 ? `${v.slice(0, 24)}…` : v}`)
    .join('\n');
}

const PAGE_SIZE = 50;

export const AnalyticsUsers = () => {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getUsers({
        filter: JSON.stringify({ q: search }),
        range: JSON.stringify([0, limit]),
        sort: JSON.stringify(['createdAt', 'DESC']),
      });
      const result = response.data as { data: AdminUser[]; total: number };
      setRows(result.data);
      setTotal(result.total);
    } catch {
      setError('Could not load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [limit, search]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLimit(PAGE_SIZE);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Users"
        subtitle="Registered accounts, including email addresses, account status, the ad they signed up from, and signup date."
      />
      <Card className="border-white/5 bg-[rgba(22,22,22,1)] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#B4FF39]" />
            <span className="text-sm font-medium text-white">Registered users</span>
            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
              {total} user{total === 1 ? '' : 's'}
            </span>
          </div>
          <form onSubmit={submitSearch} className="flex w-full gap-2 sm:w-auto">
            <Input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder="Search email or username"
              aria-label="Search users by email or username"
              className="h-9 min-w-0 border-white/10 bg-black/40 text-sm text-white sm:w-64"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              aria-label="Search users"
              title="Search users"
              className="h-9 w-9 shrink-0 border-white/10 bg-black/40 p-0 text-white hover:bg-white/5"
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {error ? (
          <p role="alert" className="py-10 text-center text-sm text-red-400">
            {error}
          </p>
        ) : loading && rows.length === 0 ? (
          <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? 'No users match that search.' : 'No user accounts yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Username</th>
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 font-medium">Account</th>
                  <th className="px-2 py-2 font-medium">Source</th>
                  <th className="px-2 py-2 text-right font-medium">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 text-white/85 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-2 py-2.5">{user.email || '—'}</td>
                    <td className="px-2 py-2.5 text-white/70">{user.username || '—'}</td>
                    <td className="px-2 py-2.5 text-white/70">{user.name || '—'}</td>
                    <td className="px-2 py-2.5 capitalize text-white/70">{user.role || 'user'}</td>
                    <td className="px-2 py-2.5">
                      <span className={user.isActive ? 'text-emerald-400' : 'text-white/45'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="ml-2 text-xs text-white/45">
                        {user.isVerify ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td
                      className="whitespace-nowrap px-2 py-2.5 text-white/70"
                      title={sourceDetail(user.signupAttribution)}
                    >
                      {fmtSource(user.signupAttribution) ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-muted-foreground">
                      {moment(user.createdAt).format('MMM D, YYYY h:mm A')}{' '}
                      {localTzAbbr(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating users…
              </div>
            )}
            {total > rows.length && (
              <button
                type="button"
                onClick={() => setLimit(current => current + PAGE_SIZE)}
                className="mt-3 w-full rounded-md border border-white/5 bg-black/20 px-3 py-2 text-center text-xs text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                Load more ({total - rows.length})
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
