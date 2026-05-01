import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cryptoAPI } from '@/integrations/api/cryptoAPI';
import { buildPayInvoiceTx } from '@/integrations/solana/program';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface CryptoCheckoutButtonProps {
  orderId: string;
  /** Called with the on-chain signature after a successful confirm. */
  onPaid?: (txSignature: string) => void;
  /** Called when verification or sending fails (already toasted). */
  onError?: (err: unknown) => void;
  className?: string;
}

/**
 * Single-button checkout that, when the user clicks:
 *   1. Asks API for a quote (creates Invoice id server-side).
 *   2. Builds the pay_invoice tx in-browser.
 *   3. Sends it through the connected wallet.
 *   4. Calls /confirm to verify on-chain and mark order paid.
 *
 * If no wallet is connected, renders the wallet-adapter modal trigger instead.
 */
export function CryptoCheckoutButton({
  orderId,
  onPaid,
  onError,
  className,
}: CryptoCheckoutButtonProps) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions, sendTransaction } = useWallet();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const pay = useCallback(async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const buyerWallet = publicKey.toBase58();
      const quote = await cryptoAPI.quote(orderId, buyerWallet);

      const tx = await buildPayInvoiceTx(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        quote
      );

      // Simulate first so we can surface the actual program error
      // (Phantom only shows a generic "reverted during simulation" toast).
      // No signers passed → simulator skips signature verification.
      try {
        const sim = await connection.simulateTransaction(tx);
        if (sim.value.err) {
          const logs = (sim.value.logs ?? []).join('\n');
          // eslint-disable-next-line no-console
          console.error('[crypto] simulate failed', sim.value.err, '\n', logs);
          const programLine =
            sim.value.logs?.find(l => l.includes('Error') || l.includes('failed')) ||
            JSON.stringify(sim.value.err);
          throw new Error(`Simulation reverted: ${programLine}`);
        }
      } catch (simErr) {
        // Re-throw with the program log so the user toast is informative.
        throw simErr;
      }

      const sig = await sendTransaction(tx, connection, { skipPreflight: false });

      toast({
        title: 'Transaction sent',
        description: 'Waiting for confirmation…',
      });

      // Wait for the cluster to confirm before asking the API to verify.
      const latest = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');

      await cryptoAPI.confirm(orderId, sig, buyerWallet);

      toast({ title: 'Payment confirmed', description: `tx: ${sig.slice(0, 8)}…` });
      onPaid?.(sig);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({
        title: 'Crypto payment failed',
        description: msg,
        variant: 'destructive',
      });
      onError?.(e);
    } finally {
      setBusy(false);
    }
  }, [
    publicKey,
    signTransaction,
    signAllTransactions,
    sendTransaction,
    connection,
    orderId,
    toast,
    onPaid,
    onError,
  ]);

  if (!publicKey) {
    return (
      <div className={className}>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <Button onClick={pay} disabled={busy} className={className}>
      {busy ? 'Processing…' : 'Pay with USDC'}
    </Button>
  );
}
