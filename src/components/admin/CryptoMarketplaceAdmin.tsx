import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

/**
 * Admin panel covering all marketplace-level (i.e. non per-seller) on-chain
 * actions exposed by the cardcade-marketplace contract:
 *
 *   - Marketplace config: buyer fee, default seller fee, treasury, authority,
 *     paused flag.
 *   - Seller groups: create/update tiers (label + fee bps) — sellers can
 *     then be assigned via the per-row dropdown in `CryptoSellersAdmin`.
 *   - Buyer waivers: grant or revoke a permanent buyer-fee waiver per wallet.
 *
 * Each form maps directly onto an Anchor instruction signed by the API's
 * authority key.
 */
export function CryptoMarketplaceAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const showError = (title: string, e: unknown) =>
    toast({
      title,
      description: e instanceof Error ? e.message : 'Unknown error',
      variant: 'destructive',
    });

  // ─── Marketplace config ────────────────────────────────────────────
  const cfgQuery = useQuery({
    queryKey: ['admin', 'crypto', 'marketplace'],
    queryFn: cryptoAPI.getMarketplace,
  });
  const cfg = cfgQuery.data;

  const [buyerFeeBps, setBuyerFeeBps] = useState('');
  const [defaultSellerFeeBps, setDefaultSellerFeeBps] = useState('');
  const [treasury, setTreasury] = useState('');
  const [authority, setAuthority] = useState('');
  const [paused, setPaused] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    setBuyerFeeBps(String(cfg.buyerFeeBps));
    setDefaultSellerFeeBps(String(cfg.defaultSellerFeeBps));
    setTreasury(cfg.treasury);
    setAuthority(cfg.authority);
    setPaused(cfg.paused);
  }, [cfg]);

  const saveCfg = async () => {
    if (!cfg) return;
    const patch: Parameters<typeof cryptoAPI.updateMarketplace>[0] = {};
    const bf = Number(buyerFeeBps);
    const sf = Number(defaultSellerFeeBps);
    if (Number.isFinite(bf) && bf !== cfg.buyerFeeBps) patch.buyerFeeBps = bf;
    if (Number.isFinite(sf) && sf !== cfg.defaultSellerFeeBps)
      patch.defaultSellerFeeBps = sf;
    if (treasury && treasury !== cfg.treasury) patch.treasury = treasury;
    if (authority && authority !== cfg.authority) patch.authority = authority;
    if (paused !== cfg.paused) patch.paused = paused;

    if (Object.keys(patch).length === 0) {
      toast({ title: 'No changes' });
      return;
    }

    setSavingCfg(true);
    try {
      const r = await cryptoAPI.updateMarketplace(patch);
      const sigs = Object.entries(r.txSignatures)
        .map(([k, v]) => `${k}: ${v.slice(0, 8)}…`)
        .join(' · ');
      toast({ title: 'Marketplace updated', description: sigs });
      await qc.invalidateQueries({ queryKey: ['admin', 'crypto'] });
    } catch (e) {
      showError('Update failed', e);
    } finally {
      setSavingCfg(false);
    }
  };

  // ─── Groups ────────────────────────────────────────────────────────
  const groupsQuery = useQuery({
    queryKey: ['admin', 'crypto', 'groups'],
    queryFn: cryptoAPI.listGroups,
  });
  const groups = groupsQuery.data?.data ?? [];

  const [gId, setGId] = useState('');
  const [gFee, setGFee] = useState('');
  const [gLabel, setGLabel] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const submitGroup = async () => {
    const id = Number(gId);
    const fee = Number(gFee);
    if (!Number.isInteger(id) || id < 0 || id > 255) {
      toast({
        title: 'Invalid group id',
        description: '0-255',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(fee) || fee < 0 || fee > 10000) {
      toast({
        title: 'Invalid fee',
        description: '0-10000 bps',
        variant: 'destructive',
      });
      return;
    }
    setSavingGroup(true);
    try {
      const r = await cryptoAPI.upsertGroup(id, fee, gLabel.trim());
      toast({
        title: `Group ${id} saved`,
        description: `tx: ${r.txSignature.slice(0, 8)}…`,
      });
      setGId('');
      setGFee('');
      setGLabel('');
      await qc.invalidateQueries({ queryKey: ['admin', 'crypto'] });
    } catch (e) {
      showError('Group save failed', e);
    } finally {
      setSavingGroup(false);
    }
  };

  // ─── Buyer waivers ────────────────────────────────────────────────
  const waiversQuery = useQuery({
    queryKey: ['admin', 'crypto', 'waivers'],
    queryFn: cryptoAPI.listWaivers,
  });
  const waivers = waiversQuery.data?.data ?? [];

  const [waiverWallet, setWaiverWallet] = useState('');
  const [pendingWaiver, setPendingWaiver] = useState<string | null>(null);

  const grantWaiver = async () => {
    const w = waiverWallet.trim();
    if (!w) return;
    setPendingWaiver('grant');
    try {
      const r = await cryptoAPI.grantWaiver(w);
      toast({
        title: 'Waiver granted',
        description: `tx: ${r.txSignature.slice(0, 8)}…`,
      });
      setWaiverWallet('');
      await qc.invalidateQueries({ queryKey: ['admin', 'crypto', 'waivers'] });
    } catch (e) {
      showError('Grant failed', e);
    } finally {
      setPendingWaiver(null);
    }
  };

  const revokeWaiver = async (wallet: string) => {
    setPendingWaiver(wallet);
    try {
      const r = await cryptoAPI.revokeWaiver(wallet);
      toast({
        title: 'Waiver revoked',
        description: `tx: ${r.txSignature.slice(0, 8)}…`,
      });
      await qc.invalidateQueries({ queryKey: ['admin', 'crypto', 'waivers'] });
    } catch (e) {
      showError('Revoke failed', e);
    } finally {
      setPendingWaiver(null);
    }
  };

  // ─── Treasury ──────────────────────────────────────────────────────
  const treasuryQuery = useQuery({
    queryKey: ['admin', 'crypto', 'treasury'],
    queryFn: cryptoAPI.getTreasury,
    refetchInterval: 30_000,
  });
  const treasuryStatus = treasuryQuery.data;

  const [withdrawDest, setWithdrawDest] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const submitWithdraw = async () => {
    const dest = withdrawDest.trim();
    const amtUi = Number(withdrawAmount);
    if (!dest) {
      toast({ title: 'Destination required', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(amtUi) || amtUi <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter USDC amount > 0',
        variant: 'destructive',
      });
      return;
    }
    if (
      treasuryStatus?.usdcBalanceUi != null &&
      amtUi > treasuryStatus.usdcBalanceUi
    ) {
      toast({
        title: 'Amount exceeds treasury balance',
        variant: 'destructive',
      });
      return;
    }
    // USDC base units (6 decimals). Round to integer to dodge fp dust.
    const baseUnits = BigInt(Math.round(amtUi * 1_000_000)).toString();
    setWithdrawing(true);
    try {
      const r = await cryptoAPI.withdrawTreasury(dest, baseUnits);
      toast({
        title: `Withdrew ${amtUi} USDC`,
        description: `tx: ${r.txSignature.slice(0, 8)}…`,
      });
      setWithdrawAmount('');
      await qc.invalidateQueries({ queryKey: ['admin', 'crypto', 'treasury'] });
    } catch (e) {
      showError('Withdraw failed', e);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Treasury */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Treasury</div>
            <div className="text-xs text-muted-foreground break-all">
              ATA: {treasuryStatus?.treasuryAta ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground break-all">
              Owner: {treasuryStatus?.treasuryOwner ?? '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {treasuryStatus?.usdcBalanceUi != null
                ? treasuryStatus.usdcBalanceUi.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })
                : '—'}{' '}
              <span className="text-sm font-normal text-muted-foreground">USDC</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Owner SOL:{' '}
              {treasuryStatus?.ownerSolLamports != null
                ? (treasuryStatus.ownerSolLamports / 1e9).toFixed(4)
                : '—'}
            </div>
          </div>
        </div>

        {treasuryStatus && !treasuryStatus.treasurySignerLoaded && (
          <div className="text-xs text-amber-500">
            ⚠ No treasury signer loaded on the API. Set
            CARDCADE_TREASURY_SECRET_BASE58 (or CARDCADE_AUTHORITY_SECRET_BASE58)
            to enable withdrawals.
          </div>
        )}
        {treasuryStatus &&
          treasuryStatus.treasurySignerLoaded &&
          treasuryStatus.treasurySignerMatchesOwner === false && (
            <div className="text-xs text-red-500">
              ⚠ Loaded treasury signer does NOT own the treasury ATA. Withdraws
              will fail until the env secret matches the on-chain owner.
            </div>
          )}

        <div className="grid gap-2 md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Destination wallet</Label>
            <Input
              value={withdrawDest}
              onChange={e => setWithdrawDest(e.target.value)}
              placeholder="Recipient base58 wallet"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount (USDC)</Label>
            <Input
              type="number"
              min={0}
              step="0.000001"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <Button
            onClick={submitWithdraw}
            disabled={
              withdrawing ||
              !treasuryStatus?.treasurySignerLoaded ||
              treasuryStatus?.treasurySignerMatchesOwner === false
            }
          >
            {withdrawing ? 'Sending…' : 'Withdraw'}
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Sends from the treasury ATA via SPL transfer signed by the treasury
          key. Destination's USDC ATA is auto-created (~0.002 SOL rent paid by
          the treasury wallet).
        </div>
      </Card>

      {/* Marketplace config */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Marketplace config</div>
            <div className="text-xs text-muted-foreground">
              On-chain program {cfg?.programId ?? '—'} · USDC mint{' '}
              {cfg?.paymentMint ?? '—'}
            </div>
          </div>
          {cfg?.paused && (
            <span className="text-xs uppercase font-bold text-red-500">
              Paused
            </span>
          )}
        </div>

        {cfgQuery.isLoading && <div>Loading…</div>}

        {cfg && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Buyer fee (bps)</Label>
              <Input
                type="number"
                min={0}
                max={10000}
                value={buyerFeeBps}
                onChange={e => setBuyerFeeBps(e.target.value)}
              />
              <div className="text-[11px] text-muted-foreground">
                {(Number(buyerFeeBps || 0) / 100).toFixed(2)}% — current{' '}
                {(cfg.buyerFeeBps / 100).toFixed(2)}%
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default seller fee (bps)</Label>
              <Input
                type="number"
                min={0}
                max={10000}
                value={defaultSellerFeeBps}
                onChange={e => setDefaultSellerFeeBps(e.target.value)}
              />
              <div className="text-[11px] text-muted-foreground">
                {(Number(defaultSellerFeeBps || 0) / 100).toFixed(2)}% — current{' '}
                {(cfg.defaultSellerFeeBps / 100).toFixed(2)}%. Group 0 PDA is
                separate; update it via the Groups card to keep them aligned.
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Treasury wallet (USDC ATA owner)</Label>
              <Input
                value={treasury}
                onChange={e => setTreasury(e.target.value)}
                className="font-mono text-xs"
              />
              <div className="text-[11px] text-muted-foreground break-all">
                Treasury ATA: {cfg.treasuryAta}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Program authority</Label>
              <Input
                value={authority}
                onChange={e => setAuthority(e.target.value)}
                className="font-mono text-xs"
              />
              <div className="text-[11px] text-amber-500">
                ⚠ Rotating the authority requires updating
                CARDCADE_AUTHORITY_SECRET_BASE58 on the API or every admin call
                will fail.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="paused"
                checked={paused}
                onCheckedChange={setPaused}
              />
              <Label htmlFor="paused" className="text-xs">
                Pause all crypto sales / payments
              </Label>
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button onClick={saveCfg} disabled={savingCfg}>
                {savingCfg ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Groups */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Seller groups (fee tiers)</div>
            <div className="text-xs text-muted-foreground">
              Create tiers, then move sellers into them from the table below.
              Group 0 is the implicit default.
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[80px_120px_1fr_auto] md:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Group ID</Label>
            <Input
              type="number"
              min={0}
              max={255}
              value={gId}
              onChange={e => setGId(e.target.value)}
              placeholder="0-255"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fee (bps)</Label>
            <Input
              type="number"
              min={0}
              max={10000}
              value={gFee}
              onChange={e => setGFee(e.target.value)}
              placeholder="e.g. 300"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Label (max 32 chars)</Label>
            <Input
              maxLength={32}
              value={gLabel}
              onChange={e => setGLabel(e.target.value)}
              placeholder="e.g. partner-tier"
            />
          </div>
          <Button onClick={submitGroup} disabled={savingGroup}>
            {savingGroup ? 'Saving…' : 'Create / update'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Label</th>
                <th className="py-2 pr-4">Fee</th>
                <th className="py-2 pr-4">PDA</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.groupId} className="border-t">
                  <td className="py-2 pr-4 font-mono">{g.groupId}</td>
                  <td className="py-2 pr-4">
                    {g.label ?? <span className="text-muted-foreground">—</span>}
                    {g.groupId === 0 && (
                      <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                        default
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {(g.feeBps / 100).toFixed(2)}%{' '}
                    <span className="text-muted-foreground">({g.feeBps} bps)</span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-[11px] break-all">
                    {g.pda}
                  </td>
                </tr>
              ))}
              {groups.length === 0 && !groupsQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No on-chain seller groups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Buyer waivers */}
      <Card className="p-4 space-y-4">
        <div>
          <div className="font-semibold">Buyer fee waivers</div>
          <div className="text-xs text-muted-foreground">
            Wallets in this list pay 0 buyer fee on every crypto purchase.
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={waiverWallet}
            onChange={e => setWaiverWallet(e.target.value)}
            placeholder="Buyer wallet (base58)"
            className="font-mono text-xs"
          />
          <Button onClick={grantWaiver} disabled={pendingWaiver === 'grant'}>
            Grant waiver
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Buyer</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Granted</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {waivers.map(w => (
                <tr key={w.buyer} className="border-t">
                  <td className="py-2 pr-4 font-mono text-xs break-all max-w-xs">
                    {w.buyer}
                  </td>
                  <td className="py-2 pr-4">
                    {w.user ? (
                      <div>
                        <div>{w.user.username ?? w.user.email ?? w.user.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {w.user.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {w.grantedAt
                      ? new Date(w.grantedAt * 1000).toLocaleString()
                      : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pendingWaiver === w.buyer}
                      onClick={() => revokeWaiver(w.buyer)}
                    >
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
              {waivers.length === 0 && !waiversQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    No buyer waivers granted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
