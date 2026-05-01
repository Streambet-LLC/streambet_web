import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  username?: string;
  email?: string;
  solanaWallet?: string | null;
  cryptoPaymentsEnabled?: boolean;
  cryptoOverrideFeeBps?: number | null;
  isSeller?: boolean;
  // On-chain fee snapshot (null when no wallet linked or RPC failed).
  onChainGroupId?: number | null;
  onChainGroupLabel?: string | null;
  onChainGroupFeeBps?: number | null;
  onChainOverrideFeeBps?: number | null;
  onChainEffectiveFeeBps?: number | null;
  onChainProfileExists?: boolean;
  onChainIsDefaultGroup?: boolean | null;
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
    queryFn: () => cryptoAPI.listSellers(search || undefined),
  });

  // List of on-chain groups so we can render a "Move to group" dropdown
  // per seller row. Sourced from the same admin endpoint as the Groups card.
  const groupsQuery = useQuery({
    queryKey: ['admin', 'crypto', 'groups'],
    queryFn: cryptoAPI.listGroups,
  });
  const groups = groupsQuery.data?.data ?? [];

  const users: AdminUser[] = useMemo(() => {
    return (data?.data ?? []) as AdminUser[];
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

  const setGroup = async (u: AdminUser, groupIdRaw: string) => {
    if (!u.solanaWallet) return;
    const groupId = Number(groupIdRaw);
    if (!Number.isInteger(groupId)) return;
    setPendingId(u.id);
    try {
      const r = await cryptoAPI.setSellerGroup(u.id, u.solanaWallet, groupId);
      toast({
        title: `Moved to group ${groupId}`,
        description: `tx: ${String(r.txSignature).slice(0, 8)}…`,
      });
      refresh();
    } catch (e: unknown) {
      toast({
        title: 'Move failed',
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
              <th className="py-2 pr-4">Group</th>
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
                  {u.onChainEffectiveFeeBps != null ? (
                    <div className="flex flex-col gap-1">
                      <Select
                        value={String(u.onChainGroupId ?? 0)}
                        onValueChange={v => setGroup(u, v)}
                        disabled={pendingId === u.id || !u.solanaWallet}
                      >
                        <SelectTrigger className="h-8 cursor-pointer w-[180px]">
                          <SelectValue
                            placeholder={
                              u.onChainGroupLabel ||
                              (u.onChainIsDefaultGroup
                                ? 'default'
                                : `group ${u.onChainGroupId}`)
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(g => (
                            <SelectItem
                              key={g.groupId}
                              value={String(g.groupId)}
                              className="cursor-pointer"
                            >
                              {(g.label || (g.groupId === 0 ? 'default' : `group ${g.groupId}`))}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {(g.feeBps / 100).toFixed(2)}%
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">
                        {(u.onChainEffectiveFeeBps / 100).toFixed(2)}%
                        {u.onChainOverrideFeeBps != null ? (
                          <span className="ml-1 text-amber-500">(override)</span>
                        ) : (
                          <span className="ml-1">
                            (group {(u.onChainGroupFeeBps! / 100).toFixed(2)}%)
                          </span>
                        )}
                        {!u.onChainProfileExists && (
                          <span className="ml-1 text-[10px] uppercase">
                            (implicit)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
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
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
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
