import { ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';

/**
 * Wallet context for USDC bidding, mounted only on auction pages. Wallets
 * that implement Wallet Standard (Phantom, Solflare, Backpack…) are detected
 * automatically; Phantom is listed explicitly for its mobile deep link.
 */
export function SolanaProviders({
  cluster,
  children,
}: {
  cluster: 'devnet' | 'mainnet-beta' | 'custom';
  children: ReactNode;
}) {
  const endpoint = useMemo(
    () =>
      import.meta.env.VITE_SOLANA_RPC_URL ||
      clusterApiUrl(cluster === 'mainnet-beta' ? 'mainnet-beta' : 'devnet'),
    [cluster],
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
