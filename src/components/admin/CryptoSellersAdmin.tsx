import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '@/integrations/api/client';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  username?: string;
  email?: string;
  solanaWallet?: string | null;
  cryptoPaymentsEnabled?: boolean;
  cryptoOverrideFeeBps?: number | null;
  isSeller?: boolean;
}

/**
 * Admin tab for managing crypto-payment-enabled sellers:
 * - Toggle on-chain crypto allowance for any user with a linked wallet.
 * - Set/clear per-seller fee override (basis points).
 *
 * Filters down to users that have a `solanaWallet` set (others can't have
 * on-chain state anyway).
 */
export function CryptoSellersAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'crypto', 'users', search],
    queryFn: () => adminAPI.getUsers({ search, limit: 100 }),
  });

  const users: AdminUser[] = useMemo(() => {
    const list = (data?.data ?? data?.users ?? data ?? []) as AdminUser[];
    return list.filter(u => !!u.solanaWallet);
  }, [data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'crypto'] });

  const enable = async (u: AdminUser) => {
    if (!u.solanaWallet) return;
    setPendingId(u.id);
    try {
      const r = await cryptoAPI.enableSeller(u.id, u.solanaWallet);
      toast({
        title: 'Seller enabled',
        description: r.alreadyOnChain
          ? 'Allowance already on-chain'
          : `tx: ${String(r.txSignature ?? '').slice(0, 8)}…`,
      });
      refresh();
    } catch (e: unknown) {
      toast({
        title: 'Enable failed',
        description: e instanceof Error ? e.message : 'Unknown',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  const disable = async (u: AdminUser) => {
    if (!u.solanaWallet) return;
    setPendingId(u.id);
    try {
      const r = await cryptoAPI.disableSeller(u.id, u.solanaWallet);
      toast({
        title: 'Seller disabled',
        description: r.removedOnChain
          ? `tx: ${String(r.txSignature ?? '').slice(0, 8)}…`
          : 'No on-chain allowance to remove',
      });
      refresh();
    } catch (e: unknown) {
      toast({
        title: 'Disable failed',
        description: e instanceof Error ? e.message : 'Unknown',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  const setFee = async (u: AdminUser, raw: string) => {
    if (!u.solanaWallet) return;
    const trimmed = raw.trim();
    const bps = trimmed === '' ? null : Number(trimmed);
    if (bps !== null && (!Number.isFinite(bps) || bps < 0 || bps > 10000)) {
      toast({
        title: 'Invalid fee',
        description: 'Must be 0-10000 bps, or empty to clear',
        variant: 'destructive',
      });
      return;
    }
    setPendingId(u.id);
    try {
      const r = await cryptoAPI.setOverrideFee(u.id, u.solanaWallet, bps);
      toast({
        title: 'Override fee updated',
        description: `tx: ${String(r.txSignature).slice(0, 8)}…`,
      });
      refresh();
    } catch (e: unknown) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Unknown',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search users by name/email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && <div>Loading…</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Solana wallet</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Fee override (bps)</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t">
                <td className="py-2 pr-4">
                  <div className="font-medium">{u.username ?? u.email ?? u.id}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="py-2 pr-4 font-mono text-xs break-all max-w-xs">{u.solanaWallet}</td>
                <td className="py-2 pr-4">
                  {u.cryptoPaymentsEnabled ? (
                    <span className="text-green-600">enabled</span>
                  ) : (
                    <span className="text-muted-foreground">disabled</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1 items-center">
                    <Input
                      type="number"
                      min={0}
                      max={10000}
                      placeholder={
                        u.cryptoOverrideFeeBps != null ? String(u.cryptoOverrideFeeBps) : 'group'
                      }
                      value={feeDraft[u.id] ?? ''}
                      onChange={e => setFeeDraft(s => ({ ...s, [u.id]: e.target.value }))}
                      className="w-24"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === u.id}
                      onClick={() => setFee(u, feeDraft[u.id] ?? '')}
                    >
                      Save
                    </Button>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-2">
                    {u.cryptoPaymentsEnabled ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pendingId === u.id}
                        onClick={() => disable(u)}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button size="sm" disabled={pendingId === u.id} onClick={() => enable(u)}>
                        Enable
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  No users with linked Solana wallets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
