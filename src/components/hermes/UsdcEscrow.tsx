import { useState } from 'react';
import { Buffer } from 'buffer';
import { Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { hermesAPI } from '@/integrations/api/hermes';
import { getMessage } from '@/utils/helper';
import { fmtUsd } from './format';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * USDC escrow for one auction. The bidder deposits enough to cover their max
 * bid + buyer premium + shipping into an on-chain escrow that only Hermes can
 * settle (if they win) or refund (outbid / unsold / cancelled); after the
 * auction they can always withdraw it themselves.
 */
export function UsdcEscrow({
  auctionId,
  escrowUsd,
  requiredUsd,
  cluster,
  premiumPct = 0,
}: {
  auctionId: string;
  escrowUsd: number;
  requiredUsd: number;
  cluster: string;
  /** This auction's buyer premium, for the copy only (`requiredUsd` already includes it). */
  premiumPct?: number;
}) {
  const extras = premiumPct > 0 ? `${premiumPct}% premium + shipping` : 'shipping';
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const shortfall = Math.max(0, Math.round((requiredUsd - escrowUsd) * 100) / 100);

  const deposit = async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const wallet = publicKey.toBase58();
      const quote = await hermesAPI.cryptoQuote(auctionId, wallet, shortfall);
      const tx = Transaction.from(Buffer.from(quote.transaction, 'base64'));
      const sig = await sendTransaction(tx, connection);
      toast.message('Deposit sent — confirming on Solana…');
      await connection.confirmTransaction(sig, 'confirmed');
      let confirmed = false;
      for (let i = 0; i < 6 && !confirmed; i++) {
        try {
          await hermesAPI.cryptoConfirm(auctionId, wallet, sig);
          confirmed = true;
        } catch (err) {
          if (i === 5) throw err;
          await sleep(2000);
        }
      }
      toast.success(`Escrowed ${fmtUsd(shortfall, { cents: true })} USDC`);
      qc.invalidateQueries({ queryKey: ['hermes-auction', auctionId] });
    } catch (err) {
      toast.error(getMessage(err) || (err as Error)?.message || 'Deposit failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-start gap-2 text-xs text-white/60">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C7FA09]" />
        <p>
          Your USDC is held in an on-chain escrow for this auction. You're refunded automatically if
          you're outbid or the item doesn't sell; if you win, only the winning bid + {extras} is
          taken and the rest comes back. Deposits are public on Solana.
        </p>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">In escrow</span>
        <span className="font-semibold">{fmtUsd(escrowUsd, { cents: true })}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">Needed for this max (+ {extras})</span>
        <span className="font-semibold">{fmtUsd(requiredUsd, { cents: true })}</span>
      </div>
      {!connected ? (
        <WalletMultiButton
          style={{
            width: '100%',
            justifyContent: 'center',
            height: 40,
            borderRadius: 10,
            background: '#1f1f1f',
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Connect wallet
          </span>
        </WalletMultiButton>
      ) : shortfall > 0 ? (
        <Button
          type="button"
          onClick={deposit}
          disabled={busy}
          className="h-10 w-full bg-white font-bold text-black hover:bg-white/90"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `Deposit ${fmtUsd(shortfall, { cents: true })} USDC`
          )}
        </Button>
      ) : (
        <p className="text-center text-xs font-semibold text-[#C7FA09]">Escrow covers this bid ✓</p>
      )}
      {cluster === 'devnet' && (
        <p className="text-center text-[11px] text-white/40">
          Staging uses Solana devnet — get test USDC at{' '}
          <a
            href="https://spl-token-faucet.com/?token-name=USDC-Dev"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white/70"
          >
            spl-token-faucet.com
          </a>
          .
        </p>
      )}
    </div>
  );
}
