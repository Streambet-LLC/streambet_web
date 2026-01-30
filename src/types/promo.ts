/**
 * Promo Card Data Type
 * Represents promotional stream cards displayed in carousels
 * Matches backend response from /stream/promoted-bets endpoint
 */
export interface PromoCardData {
  /** Unique stream identifier (primary key from database) */
  streamId: string;
  
  /** Promo card title/name */
  name: string;
  
  /** Promo card description with possible links */
  description: string;
  
  /** Thumbnail image URL */
  thumbnail: string;
  
  /** Creator username (nullable if no creator assigned) */
  creator: string | null;
  
  /** Stream type (e.g., 'promo', 'stream', 'non-video') */
  type: string;
  
  /** Current stream status (e.g., 'LIVE', 'SCHEDULED', 'ENDED') */
  streamStatus: string;
  
  /** ISO timestamp for scheduled start time */
  scheduledStartTime: string;
}

/**
 * API Response structure for promoted bets endpoint
 */
export interface PromotedBetsResponse {
  bets: any[]; // Regular betting rounds - type exists elsewhere
  promoCards: PromoCardData[];
}
