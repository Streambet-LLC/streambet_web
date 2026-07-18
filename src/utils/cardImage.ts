import Resizer from 'react-image-file-resizer';

/** A card photo prepared for the vision API. */
export interface CardImage {
  /** Raw base64 (no `data:` prefix) — what the API expects. */
  data: string;
  /** MIME type, e.g. 'image/jpeg'. */
  mediaType: string;
  /** Full `data:` URL — handy for an inline preview thumbnail. */
  dataUrl: string;
}

/** MIME types Claude's vision accepts. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Downscale + compress a chosen/captured photo to a base64 JPEG small enough
 * to POST but still legible (card numbers, set names, grades). Card detail
 * matters, so we keep a generous max dimension and high-ish quality.
 */
export const fileToCardImage = (file: File): Promise<CardImage> =>
  new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) {
      reject(new Error('Please choose a JPEG, PNG, WebP, or GIF image.'));
      return;
    }
    try {
      Resizer.imageFileResizer(
        file,
        1400, // maxWidth
        1400, // maxHeight
        'JPEG',
        82, // quality
        0, // rotation
        (uri) => {
          const dataUrl = String(uri);
          const comma = dataUrl.indexOf(',');
          const match = /^data:(.*?);base64$/.exec(
            dataUrl.slice(0, comma > -1 ? comma : 0)
          );
          if (comma === -1 || !match) {
            reject(new Error('Could not process that image.'));
            return;
          }
          resolve({
            data: dataUrl.slice(comma + 1),
            mediaType: match[1] || 'image/jpeg',
            dataUrl,
          });
        },
        'base64'
      );
    } catch {
      reject(new Error('Could not process that image.'));
    }
  });
