import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';

/**
 * Settings tab letting a user link their Solana wallet to their account.
 * Used by sellers to receive payouts and by buyers as the address that
 * the API will validate against `pay_invoice.buyer`.
 */
export function CryptoSettings() {
  const { publicKey, connected } = useWallet();
  const { session, refetchSession } = useAuthContext();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const linkedWallet =
    (session?.user as { solanaWallet?: string } | undefined)?.solanaWallet ??
    (session as { solanaWallet?: string } | null | undefined)?.solanaWallet;

  const connectedWallet = publicKey?.toBase58() ?? null;
  const matches = !!linkedWallet && !!connectedWallet && linkedWallet === connectedWallet;

  useEffect(() => {
    // No-op effect — used so changes to `connected` re-render the comparison.
  }, [connected]);

  const link = async () => {
    if (!connectedWallet) return;
    setSaving(true);
    try {
      await cryptoAPI.setMyWallet(connectedWallet);
      toast({ title: 'Wallet linked', description: connectedWallet });
      await refetchSession();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to link', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const unlink = async () => {
    setSaving(true);
    try {
      await cryptoAPI.setMyWallet(null);
      toast({ title: 'Wallet unlinked' });
      await refetchSession();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to unlink', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Solana Wallet</h2>
        <p className="text-sm text-muted-foreground">
          Link your Solana wallet to pay with USDC and (for sellers) receive crypto payouts on
          devnet.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <span className="text-xs text-muted-foreground">Linked wallet</span>
          <div className="font-mono text-sm break-all">
            {linkedWallet ?? <span className="italic">not linked</span>}
          </div>
        </div>

        <div>
          <span className="text-xs text-muted-foreground">Connected wallet</span>
          <div className="font-mono text-sm break-all">
            {connectedWallet ?? <span className="italic">not connected</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <WalletMultiButton />
        {connectedWallet && !matches && (
          <Button onClick={link} disabled={saving}>
            {linkedWallet ? 'Replace linked wallet' : 'Link this wallet'}
          </Button>
        )}
        {linkedWallet && (
          <Button variant="outline" onClick={unlink} disabled={saving}>
            Unlink
          </Button>
        )}
      </div>
    </Card>
  );
}
