/**
 * Thin wrapper around the API's /crypto/* endpoints. We import the underlying
 * axios instance from the main client to inherit auth interceptors.
 */
import axios from 'axios';
import type { CryptoPaymentQuote } from '../solana/program';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
// Re-attach auth header from localStorage on every request (matches the
// existing apiClient pattern; we don't need the full interceptor chain here).
client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('accessToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export interface CryptoConfig {
  programId: string;
  paymentMint: string;
  treasuryAta: string;
}

export const cryptoAPI = {
  config: async (): Promise<CryptoConfig> => (await client.get('/crypto/config')).data,

  quote: async (orderId: string, buyerWallet: string): Promise<CryptoPaymentQuote> =>
    (await client.post('/crypto/quote', { orderId, buyerWallet })).data,

  confirm: async (
    orderId: string,
    txSignature: string,
    buyerWallet: string
  ): Promise<{ ok: true; status: string }> =>
    (await client.post('/crypto/confirm', { orderId, txSignature, buyerWallet })).data,

  setMyWallet: async (walletAddress: string | null) =>
    (await client.patch('/crypto/me/wallet', { walletAddress: walletAddress ?? undefined })).data,

  // Admin
  /**
   * Approve a seller without requiring their wallet up front. Sets the DB
   * flag and dispatches a CardCade-styled email; the on-chain allowance is
   * granted automatically the next time the seller links their wallet.
   */
  approveSeller: async (userId: string) =>
    (await client.post(`/admin/crypto/sellers/${userId}/approve`)).data as {
      ok: true;
      wasNewlyEnabled: boolean;
      emailSent: boolean;
      hasWalletOnFile: boolean;
      txSignature: string | null;
      alreadyOnChain: boolean;
    },

  enableSeller: async (userId: string, sellerWallet: string) =>
    (await client.post(`/admin/crypto/sellers/${userId}/enable`, { sellerWallet })).data,

  disableSeller: async (userId: string, sellerWallet: string) =>
    (await client.post(`/admin/crypto/sellers/${userId}/disable`, { sellerWallet })).data,

  setOverrideFee: async (userId: string, sellerWallet: string, overrideFeeBps: number | null) =>
    (
      await client.patch(`/admin/crypto/sellers/${userId}/fee`, {
        sellerWallet,
        overrideFeeBps,
      })
    ).data,
};
