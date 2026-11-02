import { apiClient } from './client';

/**
 * Hermes Auctions API client. Mirrors streambet_api `src/auctions/*`
 * (AuctionsController, AdminAuctionsController).
 */

export type AuctionCategory = 'sports_cards' | 'tcg' | 'sports_memorabilia';
export type AuctionStatus =
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'paid'
  | 'unsold'
  | 'failed'
  | 'cancelled';
export type AuctionBucket = 'live' | 'upcoming' | 'settled';
export type FundingMethod = 'card' | 'ach' | 'usdc';
export type LengthPreset = '7' | '14' | '21' | 'custom';

export interface AuctionImage {
  key: string;
  url: string;
}

export interface AuctionVideo {
  kind: 'upload' | 'youtube' | 'vimeo';
  url: string;
  embedUrl?: string | null;
  key?: string;
}

export interface PublicAuction {
  id: string;
  title: string;
  description: string;
  category: AuctionCategory;
  images: AuctionImage[];
  videos: AuctionVideo[];
  status: AuctionStatus;
  bucket: AuctionBucket;
  startsAt: string;
  endsAt: string;
  lengthPreset: LengthPreset | null;
  startingPriceUsd: number;
  currentBidUsd: number | null;
  minNextBidUsd: number;
  minIncrementUsd: number;
  bidCount: number;
  extensionCount: number;
  hasReserve: boolean;
  reserveMet: boolean | null;
  estValueUsd: number | null;
  estValueSource: 'manual' | 'pulled' | null;
  shippingUsd: number;
  isFeatured: boolean;
  leader: string | null;
  result: { sold: boolean; winningBidUsd: number | null; winner: string | null } | null;
  viewer: {
    isLeader: boolean;
    isBidder: boolean;
    isWinner: boolean;
    myMaxUsd: number | null;
    fundingMethod: FundingMethod | null;
    escrowUsd: number | null;
  } | null;
  fees: {
    buyerPremiumPercent: number;
    cardProcessingPercent: number;
    cardProcessingFixedUsd: number;
  };
}

export interface MyAuction extends PublicAuction {
  state: 'leading' | 'outbid' | 'won' | 'lost' | 'pay';
}

export interface PublicBid {
  id: string;
  bidder: string;
  amountUsd: number;
  isAuto: boolean;
  createdAt: string;
}

export interface SavedPaymentMethod {
  id: string;
  kind: 'card' | 'ach';
  label: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
}

export interface HermesConfig {
  crypto: {
    enabled: boolean;
    cluster: 'devnet' | 'mainnet-beta' | 'custom';
    programId: string | null;
    paymentMint: string | null;
    authority: string | null;
  };
  fees: PublicAuction['fees'];
}

export interface WinTotals {
  hammerUsd: number;
  shippingUsd: number;
  cardFeeUsd: number;
  totalUsd: number;
}

export interface PaymentInfo {
  auctionId: string;
  title: string;
  image: string | null;
  status: AuctionStatus;
  paymentMethod: FundingMethod | null;
  intentStatus: string | null;
  hammerUsd: number;
  shippingUsd: number;
  cardFeeUsd: number;
  totalUsd: number;
  paymentDueAt: string | null;
  paidAt: string | null;
  canPay: boolean;
  options: { card: WinTotals; ach: WinTotals };
  fulfillment: {
    status: 'pending' | 'shipped' | 'delivered';
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
  };
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | null;
}

export interface DepositQuote {
  transaction: string;
  escrow: string;
  vault: string;
  amountUnits: string;
  currentEscrowUsd: number;
}

// ── Admin ───────────────────────────────────────────────────────────────

export interface AdminAuctionRow {
  id: string;
  title: string;
  category: AuctionCategory;
  image: string | null;
  status: AuctionStatus;
  bucket: AuctionBucket;
  startsAt: string;
  endsAt: string;
  startingPriceUsd: number;
  reservePriceUsd: number | null;
  currentBidUsd: number | null;
  estValueUsd: number | null;
  bidCount: number;
  leader: string | null;
  winner: string | null;
  winningAmountUsd: number | null;
  paymentMethod: FundingMethod | null;
  fulfillmentStatus: 'pending' | 'shipped' | 'delivered';
  isFeatured: boolean;
  isOverdue: boolean;
}

export interface EstValueComp {
  title: string | null;
  priceUsd: number;
  date: string | null;
  url: string | null;
  source: string | null;
}

export interface EstValueMeta {
  subject: string;
  pointUsd: number | null;
  lowUsd: number | null;
  highUsd: number | null;
  confidencePct: number | null;
  reliability: string | null;
  method: string | null;
  comps: EstValueComp[];
  note: string | null;
  pulledAt: string;
}

export interface AdminAuctionDetail {
  auction: {
    id: string;
    title: string;
    description: string;
    category: AuctionCategory;
    images: AuctionImage[];
    videos: AuctionVideo[];
    status: AuctionStatus;
    bucket: AuctionBucket;
    startsAt: string;
    endsAt: string;
    lengthPreset: LengthPreset | null;
    durationDays: number | null;
    startingPriceUsd: number;
    reservePriceUsd: number | null;
    currentBidUsd: number | null;
    proxyMaxUsd: number | null;
    estValueUsd: number | null;
    estValueSource: 'manual' | 'pulled' | null;
    estValueMeta: EstValueMeta | null;
    shippingUsd: number;
    isFeatured: boolean;
    bidCount: number;
    extensionCount: number;
    currentLeaderUserId: string | null;
    winnerUserId: string | null;
    winningAmountUsd: number | null;
    paymentMethod: FundingMethod | null;
    cardFeeUsd: number | null;
    totalChargedUsd: number | null;
    paymentIntentId: string | null;
    paymentDueAt: string | null;
    paidAt: string | null;
    shippingAddress: PaymentInfo['shippingAddress'];
    fulfillmentStatus: 'pending' | 'shipped' | 'delivered';
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
  };
  winner: { id: string; username: string; email: string } | null;
  bids: Array<{
    id: string;
    userId: string;
    username: string | null;
    email: string | null;
    amountUsd: number;
    proxyMaxUsd: number;
    isAuto: boolean;
    fundingMethod: FundingMethod;
    createdAt: string;
  }>;
  deposits: Array<{
    id: string;
    userId: string;
    wallet: string;
    escrow: string;
    amountUsd: number;
    status: 'held' | 'refunded' | 'settled';
    refundSignature: string | null;
    settleSignature: string | null;
  }>;
}

export interface AuctionInput {
  title: string;
  description: string;
  category: AuctionCategory;
  images: AuctionImage[];
  videos?: Array<{ kind: AuctionVideo['kind']; url: string; key?: string }>;
  startsAt?: string;
  lengthPreset: LengthPreset;
  endsAt?: string;
  startingPriceUsd: number;
  reservePriceUsd?: number | null;
  estValueUsd?: number | null;
  estValueSource?: 'manual' | 'pulled' | null;
  estValueMeta?: EstValueMeta | null;
  shippingUsd: number;
  isFeatured?: boolean;
}

const data = <T>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data);

export const hermesAPI = {
  config: () => data<HermesConfig>(apiClient.get('/auctions/config')),
  list: (bucket: 'live' | 'upcoming', category?: AuctionCategory) =>
    data<PublicAuction[]>(
      apiClient.get('/auctions', { params: { bucket, ...(category ? { category } : {}) } }),
    ),
  featured: (limit = 6) =>
    data<PublicAuction[]>(apiClient.get('/auctions/featured', { params: { limit } })),
  get: (id: string) => data<PublicAuction>(apiClient.get(`/auctions/${id}`)),
  bids: (id: string) => data<PublicBid[]>(apiClient.get(`/auctions/${id}/bids`)),
  mine: () => data<MyAuction[]>(apiClient.get('/auctions/me')),
  paymentMethods: () =>
    data<SavedPaymentMethod[]>(apiClient.get('/auctions/me/payment-methods')),
  paymentSetup: (method: 'card' | 'ach', returnUrl: string) =>
    data<{ url: string }>(apiClient.post('/auctions/payment-setup', { method, returnUrl })),
  placeBid: (
    id: string,
    body: { proxyMaxUsd: number; fundingMethod: FundingMethod; stripePaymentMethodId?: string },
  ) =>
    data<{ leading: boolean; currentBidUsd: number; myMaxUsd: number; endsAt: string }>(
      apiClient.post(`/auctions/${id}/bids`, body),
    ),
  cryptoQuote: (id: string, wallet: string, amountUsd: number) =>
    data<DepositQuote>(apiClient.post(`/auctions/${id}/crypto/quote`, { wallet, amountUsd })),
  cryptoConfirm: (id: string, wallet: string, signature: string) =>
    data<{ escrowUsd: number; escrow: string }>(
      apiClient.post(`/auctions/${id}/crypto/confirm`, { wallet, signature }),
    ),
  payment: (id: string) => data<PaymentInfo>(apiClient.get(`/auctions/${id}/payment`)),
  paymentCheckout: (id: string, method: 'card' | 'ach', returnUrl: string) =>
    data<{ url: string }>(
      apiClient.post(`/auctions/${id}/payment/checkout`, { method, returnUrl }),
    ),
  paymentConfirm: (id: string, sessionId: string) =>
    data<PaymentInfo>(apiClient.post(`/auctions/${id}/payment/confirm`, { sessionId })),
};

export const hermesAdminAPI = {
  list: (bucket: AuctionBucket) =>
    data<AdminAuctionRow[]>(apiClient.get('/admin/auctions', { params: { bucket } })),
  get: (id: string) => data<AdminAuctionDetail>(apiClient.get(`/admin/auctions/${id}`)),
  create: (body: AuctionInput) =>
    data<AdminAuctionDetail>(apiClient.post('/admin/auctions', body)),
  update: (id: string, body: Partial<AuctionInput>) =>
    data<AdminAuctionDetail>(apiClient.patch(`/admin/auctions/${id}`, body)),
  cancel: (id: string) =>
    data<AdminAuctionDetail>(apiClient.post(`/admin/auctions/${id}/cancel`)),
  forceClose: (id: string) =>
    data<AdminAuctionDetail>(apiClient.post(`/admin/auctions/${id}/force-close`)),
  ship: (id: string, carrier: string, trackingNumber: string) =>
    data<AdminAuctionDetail>(
      apiClient.post(`/admin/auctions/${id}/ship`, { carrier, trackingNumber }),
    ),
  /** Streams one photo or video to S3. Large videos: pass onProgress. */
  upload: (kind: 'image' | 'video', file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return data<{ key: string; url: string; kind: 'image' | 'video' }>(
      apiClient.post(`/admin/auctions/media/${kind}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: e => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      }),
    );
  },
  identify: (body: {
    category: AuctionCategory;
    title?: string;
    description?: string;
    imageUrls?: string[];
  }) =>
    data<{ identified: boolean; subject: string; notes: string }>(
      apiClient.post('/admin/auctions/estimate/identify', body),
    ),
  value: (category: AuctionCategory, subject: string) =>
    data<EstValueMeta>(
      apiClient.post('/admin/auctions/estimate/value', { category, subject }, { timeout: 90_000 }),
    ),
};
