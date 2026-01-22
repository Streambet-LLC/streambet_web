import { useState, useEffect } from 'react';
import { IMAGE_UPLOAD_CONFIG } from '@/utils/imageUploadConstants';
import { isImageSFW } from '@/utils/helper';

interface UseImageCropperOptions {
  /** Whether to check for NSFW content before showing cropper */
  checkNSFW?: boolean;
  /** Maximum file size in bytes (defaults to 5MB) */
  maxFileSize?: number;
  /** Accepted MIME types (defaults to JPEG/PNG/WebP) */
  acceptedTypes?: string[];
  /** Callback when validation error occurs */
  onError?: (error: string) => void;
}

export interface UseImageCropperReturn {
  /** URL for PhotoCropper component (null when not cropping) */
  imageToCrop: string | null;
  /** The original file for PhotoCropper component */
  fileToCrop: File | null;
  /** The cropped file ready for upload */
  selectedFile: File | null;
  /** Preview URL of the cropped image */
  previewUrl: string;
  /** Current validation error message */
  error: string;
  /** Whether NSFW validation is in progress */
  isValidating: boolean;
  /** Handle file selection from input */
  handleFileSelect: (file: File) => Promise<void>;
  /** Handle crop completion from PhotoCropper */
  handleCropComplete: (croppedFile: File) => void;
  /** Clear all image state */
  clearImage: () => void;
  /** Cancel cropping and close PhotoCropper */
  cancelCrop: () => void;
}

/**
 * Reusable hook for handling image cropping workflow
 * 
 * Handles:
 * - File type validation
 * - File size validation
 * - Optional NSFW checking
 * - Image cropping state management
 * - Preview management
 * 
 * @example
 * ```tsx
 * const imageUpload = useImageCropper({ 
 *   checkNSFW: true,
 *   onError: (err) => setErrors({ ...errors, thumbnail: err })
 * });
 * 
 * // Use in JSX:
 * <input type="file" onChange={(e) => {
 *   const file = e.target.files?.[0];
 *   if (file) imageUpload.handleFileSelect(file);
 * }} />
 * 
 * {imageUpload.fileToCrop && (
 *   <PhotoCropper
 *     file={imageUpload.fileToCrop}
 *     onClose={imageUpload.cancelCrop}
 *     onCrop={imageUpload.handleCropComplete}
 *     cropperProps={{
 *       aspect: IMAGE_UPLOAD_CONFIG.ASPECT_RATIO,
 *     }}
 *     resizerProps={{
 *       maxWidth: IMAGE_UPLOAD_CONFIG.MAX_WIDTH,
 *       maxHeight: IMAGE_UPLOAD_CONFIG.MAX_HEIGHT,
 *       compressFormat: 'JPEG',
 *       quality: IMAGE_UPLOAD_CONFIG.QUALITY,
 *     }}
 *   />
 * )}
 * ```
 */
export function useImageCropper(options?: UseImageCropperOptions): UseImageCropperReturn {
  const {
    checkNSFW = false,
    maxFileSize = IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE,
    acceptedTypes = IMAGE_UPLOAD_CONFIG.ACCEPTED_IMAGE_TYPES,
    onError,
  } = options || {};

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const handleFileSelect = async (file: File) => {
    // Reset error state
    setError('');

    // Validate file type
    if (!(acceptedTypes as readonly string[]).includes(file.type)) {
      const err = `Please upload a valid image type (${acceptedTypes.map(t => t.split('/')[1]).join(', ')})`;
      setError(err);
      onError?.(err);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      const sizeInMB = Math.round(maxFileSize / (1024 * 1024));
      const err = `Please upload an image smaller than ${sizeInMB}MB`;
      setError(err);
      onError?.(err);
      return;
    }

    // Optional NSFW check
    if (checkNSFW) {
      setIsValidating(true);
      const objectUrl = URL.createObjectURL(file);
      
      try {
        const isSfw = await isImageSFW(objectUrl);
        
        if (!isSfw) {
          const err = 'Sorry, but the chosen image might be inappropriate. Please choose a different one.';
          setError(err);
          onError?.(err);
          setIsValidating(false);
          URL.revokeObjectURL(objectUrl);
          return;
        }
      } catch (error) {
        // If NSFW detection mechanism errors (model load failure, etc.),
        // allow upload to proceed rather than blocking the user
        console.error('NSFW check failed:', error);
      } finally {
        URL.revokeObjectURL(objectUrl);
        setIsValidating(false);
      }
    }

    // Revoke existing previewUrl when starting new crop session
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Show cropper
    setImageToCrop(URL.createObjectURL(file));
    setFileToCrop(file);
  };

  const handleCropComplete = (croppedFile: File) => {
    // Revoke old imageToCrop URL before clearing
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    // Revoke old previewUrl before creating new one
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setSelectedFile(croppedFile);
    setPreviewUrl(URL.createObjectURL(croppedFile));
    setImageToCrop(null);
    setFileToCrop(null);
    setError('');
  };

  const clearImage = () => {
    // Revoke blob URLs to prevent memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    
    setSelectedFile(null);
    setPreviewUrl('');
    setImageToCrop(null);
    setFileToCrop(null);
    setError('');
  };

  const cancelCrop = () => {
    // Revoke the crop URL to prevent memory leak
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    
    setImageToCrop(null);
    setFileToCrop(null);
  };

  // Cleanup on unmount: revoke any remaining blob URLs
  useEffect(() => {
    return () => {
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [imageToCrop, previewUrl]);

  return {
    // State
    imageToCrop,
    fileToCrop,
    selectedFile,
    previewUrl,
    error,
    isValidating,
    
    // Handlers
    handleFileSelect,
    handleCropComplete,
    clearImage,
    cancelCrop,
  };
}
