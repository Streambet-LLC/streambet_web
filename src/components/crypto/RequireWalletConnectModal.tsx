import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';

/**
 * Full-screen blocking modal shown when an admin has approved this user to
 * accept crypto payments (`session.cryptoPaymentsEnabled === true`) but
 * they have not yet linked a Solana wallet (`session.solanaWallet` is empty).
 *
 * The user must connect a Phantom/Solflare/etc. wallet and confirm linking
 * before they can interact with the rest of the app. Linking via
 * `cryptoAPI.setMyWallet` also fires the on-chain `grant_crypto_seller`
 * server-side, so they're ready to receive USDC immediately.
 */
export function RequireWalletConnectModal() {
  const { session, refetchSession } = useAuthContext();
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const cryptoApproved = !!(session as { cryptoPaymentsEnabled?: boolean } | null)
    ?.cryptoPaymentsEnabled;
  const linkedWallet = (session as { solanaWallet?: string | null } | null)?.solanaWallet ?? null;

  // Only block when approved AND no wallet linked yet.
  const open = !!session && cryptoApproved && !linkedWallet;
  if (!open) return null;

  const connectedWallet = publicKey?.toBase58() ?? null;

  const link = async () => {
    if (!connectedWallet) return;
    setSaving(true);
    try {
      const res = await cryptoAPI.setMyWallet(connectedWallet);
      const onChain = (res as { txSignature?: string | null; alreadyOnChain?: boolean })
        ?.txSignature;
      toast({
        title: 'Wallet linked!',
        description: onChain
          ? `On-chain seller allowance granted • tx ${String(onChain).slice(0, 8)}…`
          : 'You can now accept USDC payments.',
      });
      await refetchSession();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to link wallet', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} modal={false}>
      {/*
        modal={false} so the wallet-adapter's own portal modal
        (Phantom / Solflare / etc. picker) stays clickable.
        We still block dismissal by overriding interact-outside + escape and
        hiding the close button.
      */}
      <div className="fixed inset-0 z-40 bg-black/80" aria-hidden="true" />
      <DialogContent
        className="sm:max-w-lg z-50 [&>button]:hidden"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Connect your Solana wallet</DialogTitle>
          <DialogDescription>
            You've been approved to accept crypto payments on CardCade. Before you continue, please
            connect the Solana wallet where you'd like to receive your USDC payouts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium">What you'll need</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              <li>A Solana wallet extension (Phantom, Solflare, Backpack, etc.)</li>
              <li>The wallet you want USDC payouts to be sent to</li>
            </ul>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Connected wallet</span>
            <div className="font-mono text-sm break-all min-h-[1.25rem]">
              {connectedWallet ?? <span className="italic">not connected yet</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <WalletMultiButton />
            {connectedWallet && (
              <Button onClick={link} disabled={saving}>
                {saving ? 'Linking…' : 'Link this wallet'}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Need a different account? Disconnect in your wallet extension and choose another one
            before linking. You can change it later in Settings → Crypto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
