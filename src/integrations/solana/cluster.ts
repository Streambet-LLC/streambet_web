/**
 * Helpers for deriving the active Solana cluster + building explorer links.
 *
 * Cluster is inferred from `VITE_SOLANA_RPC_URL` (same env var the wallet
 * provider uses), which keeps everything in sync with one knob:
 *   - default / dev / staging  → devnet RPC  → "devnet"
 *   - mainnet RPC              → "mainnet-beta"
 *
 * Solscan only needs the `?cluster=` query string for non-mainnet clusters;
 * mainnet links should NOT include it (so prod links stay clean and don't
 * accidentally leak a devnet hint).
 */

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

const RPC_URL =
  (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ?? 'https://api.devnet.solana.com';

export function getSolanaCluster(): SolanaCluster {
  const url = RPC_URL.toLowerCase();
  if (url.includes('devnet')) return 'devnet';
  if (url.includes('testnet')) return 'testnet';
  // Treat anything else (mainnet RPC, custom RPC providers like Helius/QuickNode)
  // as mainnet. Override via VITE_SOLANA_RPC_URL if you need testnet on a
  // non-standard host.
  return 'mainnet-beta';
}

/** Build a Solscan transaction URL appropriate for the active cluster. */
export function getSolscanTxUrl(signature: string): string {
  const cluster = getSolanaCluster();
  const base = `https://solscan.io/tx/${signature}`;
  return cluster === 'mainnet-beta' ? base : `${base}?cluster=${cluster}`;
}

/** Build a Solscan account URL appropriate for the active cluster. */
export function getSolscanAccountUrl(address: string): string {
  const cluster = getSolanaCluster();
  const base = `https://solscan.io/account/${address}`;
  return cluster === 'mainnet-beta' ? base : `${base}?cluster=${cluster}`;
}
