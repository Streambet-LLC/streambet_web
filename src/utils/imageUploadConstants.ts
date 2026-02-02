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
  
  /** Maximum width in pixels after resize */
  MAX_WIDTH: 1920,
  
  /** Maximum height in pixels after resize */
  MAX_HEIGHT: 1080,
  
  /** Maximum width for promo cards (ultra-wide) */
  PROMO_MAX_WIDTH: 3200,
  
  /** Maximum height for promo cards */
  PROMO_MAX_HEIGHT: 600,
  
  /** JPEG compression quality (0-100) */
  QUALITY: 90,
} as const;
