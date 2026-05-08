import { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, { Crop, ReactCropProps } from "react-image-crop";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { PixelCrop } from 'react-image-crop'
import { Loader2, X } from "lucide-react";
import Resizer from "react-image-file-resizer";
import { cn } from '@/lib/utils';

const TO_RADIANS = Math.PI / 180;

type ResizerProps = {
  maxWidth?: number;
  maxHeight?: number;
  compressFormat?: 'JPEG' | 'PNG' | 'WEBP';
  quality?: number;
  rotate?: number;
  minWidth?: number;
  minHeight?: number;
};

/**
 * A single crop "preset" surfaced as a chip above the cropper. When
 * `aspect` is null, the cropper hides the ReactCrop UI entirely and just
 * resizes the source file as-is (used for sealed/box photos where the
 * native aspect ratio matters).
 */
export type CropPreset = {
  id: string;
  label: string;
  /** Aspect ratio (w/h) for ReactCrop, or null for "original / no crop". */
  aspect: number | null;
  /** Resizer bounds. Larger images are downscaled to fit. */
  maxWidth: number;
  maxHeight: number;
  compressFormat?: 'JPEG' | 'PNG' | 'WEBP';
  quality?: number;
};

export default function PhotoCropper({
  file,
  onClose,
  onCrop,
  cropperProps,
  resizerProps,
  presets,
  defaultPresetId,
  title,
}: {
  file: File;
  onClose: () => void;
  onCrop: (file: File) => void;
  cropperProps?: Partial<ReactCropProps>;
  resizerProps?: ResizerProps;
  /** Optional preset chips. When provided, supersedes `cropperProps.aspect`. */
  presets?: CropPreset[];
  /** Which preset id to activate by default. Falls back to the first preset. */
  defaultPresetId?: string;
  /** Dialog title override (defaults to "Set Avatar"). */
  title?: string;
}) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const fileToken = useMemo(() => `${file.name}-${file.size}-${file.lastModified}`, [file]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const activeCropJobRef = useRef(0);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    presets && presets.length
      ? defaultPresetId && presets.some(p => p.id === defaultPresetId)
        ? defaultPresetId
        : presets[0].id
      : null
  );
  const activePreset = useMemo<CropPreset | null>(() => {
    if (!presets || !presets.length) return null;
    return presets.find(p => p.id === activePresetId) ?? presets[0];
  }, [presets, activePresetId]);
  const isOriginalMode = !!activePreset && activePreset.aspect === null;
  const effectiveAspect = activePreset?.aspect ?? cropperProps?.aspect ?? 1;
  const effectiveResizer = useMemo<ResizerProps>(() => {
    if (activePreset) {
      return {
        maxWidth: activePreset.maxWidth,
        maxHeight: activePreset.maxHeight,
        compressFormat: activePreset.compressFormat ?? 'JPEG',
        quality: activePreset.quality ?? 90,
      };
    }
    return resizerProps ?? {};
  }, [activePreset, resizerProps]);

  const generateCroppedImageUrl = async (
    nextCrop: PixelCrop,
    image: HTMLImageElement,
    sourceFile: File,
    scale?: number,
    rotate?: number
  ) => {
    const cropJobId = ++activeCropJobRef.current;
    setProcessing(true);
    scale = scale || 1;
    rotate = rotate || 0;

    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const canvas = new OffscreenCanvas(nextCrop.width * scaleX, nextCrop.height * scaleY);

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const pixelRatio = window.devicePixelRatio;

      canvas.width = Math.floor(nextCrop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(nextCrop.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';

      const cropX = nextCrop.x * scaleX;
      const cropY = nextCrop.y * scaleY;

      const rotateRads = rotate * TO_RADIANS;
      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();

      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate(rotateRads);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(
        image,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight,
        0,
        0,
        image.naturalWidth,
        image.naturalHeight
      );

      const blob = await canvas.convertToBlob({
        type: 'image/png',
      });

      if (cropJobId !== activeCropJobRef.current) {
        return;
      }

      const croppedFile = new File([blob], sourceFile.name, { type: 'image/png' });

      Resizer.imageFileResizer(
        croppedFile,
        isNaN(effectiveResizer?.maxWidth) ? 140 : effectiveResizer?.maxWidth,
        isNaN(effectiveResizer?.maxHeight) ? 140 : effectiveResizer?.maxHeight,
        effectiveResizer?.compressFormat || 'PNG',
        isNaN(effectiveResizer?.quality) ? 100 : effectiveResizer?.quality,
        0,
        nextFile => {
          if (cropJobId !== activeCropJobRef.current) {
            return;
          }

          setCroppedImageFile(nextFile as File);
          setProcessing(false);
        },
        'file'
      );
    } catch {
      if (cropJobId === activeCropJobRef.current) {
        setProcessing(false);
      }
    }
  };

  const handleImageLoad = () => {
    if (!imageRef.current) return;

    const height = imageRef.current.height;
    const width = imageRef.current.width;
    const aspect = effectiveAspect || 1;

    let cropWidth: number;
    let cropHeight: number;

    // Calculate dimensions based on aspect ratio
    if (aspect === 1) {
      // Square crop - use existing logic
      const length = height < width ? height : width;
      cropWidth = length;
      cropHeight = length;
    } else {
      // Non-square aspect ratio (e.g., 16:9)
      const imageAspect = width / height;

      if (imageAspect > aspect) {
        // Image is wider than desired aspect - constrain by height
        cropHeight = height;
        cropWidth = height * aspect;
      } else {
        // Image is taller than desired aspect - constrain by width
        cropWidth = width;
        cropHeight = width / aspect;
      }
    }

    // Center the crop
    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;

    setCrop({
      unit: 'px',
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    });
  };

  useEffect(() => {
    // Reset state between queued files so a previous crop cannot be reused.
    activeCropJobRef.current += 1;
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCroppedImageFile(null);
    setProcessing(false);
  }, [fileToken]);

  useEffect(() => {
    if (!completedCrop || !imageRef.current) return;
    if (completedCrop.width <= 0 || completedCrop.height <= 0) return;
    if (isOriginalMode) return;

    void generateCroppedImageUrl(completedCrop, imageRef.current, file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCrop, fileToken, isOriginalMode]);

  // When the user switches to "Original" we resize the source file directly.
  // When they switch back to a crop preset we clear the previous result so
  // the Done button stays disabled until they pick a new crop area.
  useEffect(() => {
    if (!isOriginalMode) {
      setCroppedImageFile(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
      return;
    }

    const jobId = ++activeCropJobRef.current;
    setProcessing(true);
    setCroppedImageFile(null);

    Resizer.imageFileResizer(
      file,
      isNaN(effectiveResizer?.maxWidth) ? 2400 : effectiveResizer?.maxWidth,
      isNaN(effectiveResizer?.maxHeight) ? 2400 : effectiveResizer?.maxHeight,
      effectiveResizer?.compressFormat || 'JPEG',
      isNaN(effectiveResizer?.quality) ? 90 : effectiveResizer?.quality,
      0,
      nextFile => {
        if (jobId !== activeCropJobRef.current) return;
        setCroppedImageFile(nextFile as File);
        setProcessing(false);
      },
      'file'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOriginalMode, fileToken, activePresetId]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  if (!imageUrl) return null;

  return (
    <>
      <Dialog
        open={!!file}
        onOpenChange={state => {
          !state && onClose();
        }}
      >
        <DialogContent
          hideCloseButton
          className="border-2 border-[#7AFF14] w-[95vw] sm:max-w-[50vw] max-h-[90vh] p-0 overflow-hidden flex flex-col"
          style={{ background: '#0D0D0D' }}
        >
          <div className="relative shrink-0">
            <DialogClose asChild className="absolute -top-2 -right-2 z-50">
              <Button variant="link" size="icon" className="rounded-full hover:bg-[#7AFF14]/20">
                <X className="text-[#7AFF14]" />
              </Button>
            </DialogClose>
            <DialogHeader className="flex flex-row items-center justify-center p-4">
              <DialogTitle className="text-white">{title || 'Set Avatar'}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {presets && presets.length > 1 && (
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                {presets.map(preset => {
                  const isActive = preset.id === activePreset?.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActivePresetId(preset.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-[#7AFF14] bg-[#7AFF14]/15 text-[#7AFF14]'
                          : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white'
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mx-auto w-fit">
              {isOriginalMode ? (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Original photo preview"
                  className="max-h-[62vh] w-auto rounded"
                />
              ) : (
                <ReactCrop
                  crop={crop}
                  onChange={nextCrop => {
                    setCrop(nextCrop);
                    setCroppedImageFile(null);
                  }}
                  aspect={effectiveAspect}
                  minWidth={64}
                  minHeight={64}
                  keepSelection
                  onComplete={setCompletedCrop}
                  {...cropperProps}
                  // Re-key on preset change so ReactCrop recomputes the
                  // initial selection rectangle for the new aspect ratio.
                  key={activePreset?.id ?? 'default'}
                >
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    onLoad={handleImageLoad}
                    className="max-h-[62vh] w-auto"
                  />
                </ReactCrop>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-[#7AFF14]/20 bg-[#0D0D0D] p-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={processing || !croppedImageFile}
              onClick={() => {
                if (croppedImageFile) {
                  onCrop(croppedImageFile);
                }
              }}
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};