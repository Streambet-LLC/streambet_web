import { useState } from 'react';
import { Buffer } from 'buffer';
import { Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { hermesAPI } from '@/integrations/api/hermes';
import { getMessage } from '@/utils/helper';
import { fmtUsd } from './format';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * SOL the bidder's wallet needs to send a deposit. The first deposit creates
 * the escrow account (97 bytes) and its USDC vault (165 bytes); the bidder
 * pays their rent (refunded when the escrow closes). Every deposit also pays
 * the network fee. Rent is read from the cluster; this is the fallback.
 */
const ESCROW_ACCOUNT_BYTES = 97;
const VAULT_ACCOUNT_BYTES = 165;
const FEE_HEADROOM_LAMPORTS = 50_000;
const FALLBACK_FIRST_DEPOSIT_LAMPORTS = 3_000_000;

function fmtSol(lamports: number): string {
  return `${(lamports / LAMPORTS_PER_SOL).toFixed(lamports >= 1_000_000 ? 3 : 5)} SOL`;
}

/**
 * USDC escrow for one auction. The bidder deposits enough to cover their max
 * bid + the USDC buyer fee + shipping into an on-chain escrow that only Hermes can
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
  /** This auction's USDC buyer fee, for the copy only (`requiredUsd` already includes it). */
  premiumPct?: number;
}) {
  const extras = premiumPct > 0 ? `${premiumPct}% buyer fee + shipping` : 'shipping';
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const shortfall = Math.max(0, Math.round((requiredUsd - escrowUsd) * 100) / 100);
  const rent = useQuery({
    queryKey: ['hermes-escrow-rent', connection.rpcEndpoint],
    queryFn: async () => {
      const [escrow, vault] = await Promise.all([
        connection.getMinimumBalanceForRentExemption(ESCROW_ACCOUNT_BYTES),
        connection.getMinimumBalanceForRentExemption(VAULT_ACCOUNT_BYTES),
      ]);
      return escrow + vault + FEE_HEADROOM_LAMPORTS;
    },
    staleTime: Infinity,
  });
  const firstDepositLamports = rent.data ?? FALLBACK_FIRST_DEPOSIT_LAMPORTS;
  // No escrow yet (or it was refunded and closed) → this deposit creates one.
  const neededLamports = escrowUsd > 0 ? FEE_HEADROOM_LAMPORTS : firstDepositLamports;
  const solBalance = useQuery({
    queryKey: ['hermes-sol-balance', publicKey?.toBase58()],
    queryFn: () => connection.getBalance(publicKey!),
    enabled: !!publicKey && shortfall > 0,
    refetchInterval: 20_000,
  });
  // Only block on a balance we actually read; an RPC hiccup shouldn't.
  const lowSol = solBalance.data != null && solBalance.data < neededLamports;

  const deposit = async () => {
    if (!publicKey) return;
    setBusy(true);
    try {
      const lamports = await connection.getBalance(publicKey).catch(() => null);
      if (lamports != null && lamports < neededLamports) {
        toast.error(
          `Your wallet needs about ${fmtSol(neededLamports)} for Solana network fees. Add a little SOL and try again.`
        );
        solBalance.refetch();
        return;
      }
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
          taken and the rest comes back. Deposits are public on Solana. Your wallet also needs about{' '}
          {fmtSol(firstDepositLamports)} for network fees; most of it comes back when the escrow
          closes.
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
        <>
          {lowSol && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              This wallet has {fmtSol(solBalance.data!)}. Add at least {fmtSol(neededLamports)} to
              cover Solana network fees, then deposit.
            </p>
          )}
          <Button
            type="button"
            onClick={deposit}
            disabled={busy || lowSol}
            className="h-10 w-full bg-white font-bold text-black hover:bg-white/90"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Deposit ${fmtUsd(shortfall, { cents: true })} USDC`
            )}
          </Button>
        </>
      ) : (
        <p className="text-center text-xs font-semibold text-[#C7FA09]">Escrow covers this bid ✓</p>
      )}
      {cluster === 'devnet' && (
        <p className="text-center text-[11px] text-white/40">
          Staging uses Solana devnet — get test USDC (Solana Devnet) at{' '}
          <a
            href="https://faucet.circle.com/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white/70"
          >
            faucet.circle.com
          </a>{' '}
          and test SOL at{' '}
          <a
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white/70"
          >
            faucet.solana.com
          </a>
          .
        </p>
      )}
    </div>
  );
}
