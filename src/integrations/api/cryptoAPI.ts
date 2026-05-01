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
  /** When true, on-chain sales are paused — UI should hide the option. */
  paused: boolean;
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

  /**
   * Admin: list users that have a Solana wallet on file. Backs the
   * `Crypto Sellers` admin tab — narrower and unpaginated compared to the
   * generic `/admin/users` list, so wallet-linked users always show up.
   */
  listSellers: async (search?: string) =>
    (
      await client.get(`/admin/crypto/sellers`, {
        params: search ? { search } : undefined,
      })
    ).data as {
      data: Array<{
        id: string;
        username?: string;
        email?: string;
        name?: string;
        isSeller: boolean;
        solanaWallet: string | null;
        cryptoPaymentsEnabled: boolean;
        cryptoOverrideFeeBps: number | null;
        onChainGroupId: number | null;
        onChainGroupLabel: string | null;
        onChainGroupFeeBps: number | null;
        onChainOverrideFeeBps: number | null;
        onChainEffectiveFeeBps: number | null;
        onChainProfileExists: boolean;
        onChainIsDefaultGroup: boolean | null;
      }>;
      total: number;
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

  // ─── Marketplace config ───────────────────────────────────────────
  getMarketplace: async () =>
    (await client.get(`/admin/crypto/marketplace`)).data as {
      programId: string;
      paymentMint: string;
      treasuryAta: string;
      authority: string;
      treasury: string;
      buyerFeeBps: number;
      defaultSellerFeeBps: number;
      paused: boolean;
    },

  updateMarketplace: async (patch: {
    buyerFeeBps?: number;
    defaultSellerFeeBps?: number;
    treasury?: string;
    authority?: string;
    paused?: boolean;
  }) =>
    (await client.patch(`/admin/crypto/marketplace`, patch)).data as {
      ok: true;
      txSignatures: Record<string, string>;
    },

  // ─── Seller groups ────────────────────────────────────────────────
  listGroups: async () =>
    (await client.get(`/admin/crypto/groups`)).data as {
      data: Array<{
        groupId: number;
        feeBps: number;
        label: string | null;
        pda: string;
      }>;
      total: number;
    },

  upsertGroup: async (groupId: number, feeBps: number, label: string) =>
    (await client.post(`/admin/crypto/groups`, { groupId, feeBps, label }))
      .data as { ok: true; txSignature: string; groupId: number },

  setSellerGroup: async (userId: string, sellerWallet: string, groupId: number) =>
    (
      await client.post(`/admin/crypto/sellers/${userId}/group`, {
        sellerWallet,
        groupId,
      })
    ).data as { ok: true; txSignature: string; groupId: number },

  // ─── Buyer waivers ────────────────────────────────────────────────
  listWaivers: async () =>
    (await client.get(`/admin/crypto/waivers`)).data as {
      data: Array<{
        buyer: string;
        grantedAt: number;
        pda: string;
        user: { id: string; username?: string; email?: string } | null;
      }>;
      total: number;
    },

  grantWaiver: async (buyerWallet: string) =>
    (await client.post(`/admin/crypto/waivers`, { buyerWallet })).data as {
      ok: true;
      txSignature: string;
    },

  revokeWaiver: async (buyerWallet: string) =>
    (
      await client.post(
        `/admin/crypto/waivers/${encodeURIComponent(buyerWallet)}/revoke`,
      )
    ).data as { ok: true; txSignature: string },

  // ─── Treasury ─────────────────────────────────────────────────────
  getTreasury: async () =>
    (await client.get(`/admin/crypto/treasury`)).data as {
      treasuryAta: string;
      treasuryOwner: string | null;
      treasurySignerLoaded: boolean;
      treasurySignerMatchesOwner: boolean | null;
      usdcBalance: string | null;
      usdcBalanceUi: number | null;
      decimals: number;
      ownerSolLamports: number | null;
    },

  withdrawTreasury: async (destinationWallet: string, amountBaseUnits: string) =>
    (
      await client.post(`/admin/crypto/treasury/withdraw`, {
        destinationWallet,
        amountBaseUnits,
      })
    ).data as {
      ok: true;
      txSignature: string;
      destinationAta: string;
      amountBaseUnits: string;
    },
};
