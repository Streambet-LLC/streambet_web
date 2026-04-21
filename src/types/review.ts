/**
 * Buyer/seller reviews tied to a PrizeOrder.
 *
 * For a single order there can be up to two reviews:
 *  - one written BY the buyer ABOUT the seller (reviewerRole: 'buyer')
 *  - one written BY the seller ABOUT the buyer (reviewerRole: 'seller')
 *
 * These types mirror the backend's SerializedReview / ReviewableOrderSide
 * payloads exactly.
 */

export type ReviewerRole = 'buyer' | 'seller';

export interface PublicUserSummary {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
}

export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment: string;
  reviewerRole: ReviewerRole;
  createdAt: string;
  updatedAt: string;
  /** True when the current authenticated user can edit (own review, within edit window). */
  canEdit: boolean;
  /** True when the current authenticated user can delete (own review, within delete window). */
  canDelete: boolean;
  reviewer: PublicUserSummary;
  reviewee: PublicUserSummary;
  itemName?: string | null;
}

export interface ReviewSideStats {
  /** Average rating (0 if count === 0). */
  average: number;
  /** Total number of reviews on this side. */
  count: number;
}

export interface ReviewStats {
  /** Reviews ABOUT this user written by sellers (i.e. their behavior as a buyer). */
  asBuyer: ReviewSideStats;
  /** Reviews ABOUT this user written by buyers (i.e. their behavior as a seller). */
  asSeller: ReviewSideStats;
}

export type ReviewListRole = 'as_buyer' | 'as_seller' | 'all';
export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface ListReviewsQuery {
  role?: ReviewListRole;
  sort?: ReviewSort;
  page?: number;
  perPage?: number;
}

export interface PaginatedReviews {
  items: Review[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * One reviewable side of one order for the current user. The same orderId
 * can appear twice (once as buyer, once as seller) if the user is on both
 * sides — in practice each user is on a single side per order.
 */
export interface ReviewableOrderSide {
  orderId: string;
  itemName: string;
  itemImageUrl: string | null;
  purchasedAt: string;
  shippedAt: string | null;
  /** The other party (the user being reviewed). */
  counterparty: PublicUserSummary;
  /** Side the current viewer was on. */
  myRole: ReviewerRole;
  /** Existing review by the current user on this side, if any. */
  existingReview: Review | null;
  /** Timestamp at which this order first becomes reviewable. */
  reviewableAt: string;
  /** True when reviewableAt has already passed. */
  isReviewable: boolean;
}

export interface CreateReviewPayload {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
}
