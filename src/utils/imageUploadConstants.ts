/**
 * Shared configuration for image uploads across the application
 * Used for prize tier images, stream thumbnails, bet images, and promo card banners
 */
export const IMAGE_UPLOAD_CONFIG = {
  /** Maximum file size in bytes (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  /** Accepted image MIME types */
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  
  /** Target aspect ratio for cropping (16:9) */
  ASPECT_RATIO: 16 / 9,
  
  /** Promo card banner aspect ratio (48:9) */
  PROMO_ASPECT_RATIO: 48 / 9,
  
  /** Prize card slab aspect ratio (2:3 portrait for graded trading cards) */
  PRIZE_CARD_ASPECT_RATIO: 2 / 3,
  
  /** Single graded card slab aspect ratio (4" × 6.5" = 8:13 ratio) */
  PRIZE_SINGLE_SLAB_ASPECT_RATIO: 8 / 13,
  
  /** Double slab - front & back side-by-side (8" × 6.5" = 16:13 ratio) */
  PRIZE_DOUBLE_SLAB_ASPECT_RATIO: 16 / 13,
  
  /** Maximum width in pixels after resize */
  MAX_WIDTH: 1920,
  
  /** Maximum height in pixels after resize */
  MAX_HEIGHT: 1080,
  
  /** Maximum width for prize card slabs */
  PRIZE_CARD_MAX_WIDTH: 1200,
  
  /** Maximum height for prize card slabs (maintains 2:3 ratio) */
  PRIZE_CARD_MAX_HEIGHT: 1800,
  
  /** Maximum width for single slab (4" × 6.5") */
  PRIZE_SINGLE_SLAB_MAX_WIDTH: 1200,
  
  /** Maximum height for single slab (maintains 8:13 ratio) */
  PRIZE_SINGLE_SLAB_MAX_HEIGHT: 1950,
  
  /** Maximum width for double slab (8" × 6.5") */
  PRIZE_DOUBLE_SLAB_MAX_WIDTH: 2400,
  
  /** Maximum height for double slab (maintains 16:13 ratio) */
  PRIZE_DOUBLE_SLAB_MAX_HEIGHT: 1950,
  
  /** Maximum width for promo cards (ultra-wide) */
  PROMO_MAX_WIDTH: 3200,
  
  /** Maximum height for promo cards */
  PROMO_MAX_HEIGHT: 600,
  
  /** JPEG compression quality (0-100) */
  QUALITY: 90,
} as const;
