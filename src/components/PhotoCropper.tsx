import { useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, { Crop, ReactCropProps } from "react-image-crop";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { PixelCrop } from 'react-image-crop'
import { Loader2, X } from "lucide-react";
import Resizer from "react-image-file-resizer";

const TO_RADIANS = Math.PI / 180;

type ResizerProps = {
  maxWidth?: number;
  maxHeight?: number;
  compressFormat?: 'JPEG' | 'PNG' | 'WEBP';
  quality?: number;
  rotate?: number;
  minWidth?: number;
  minHeight?: number;
}

export default function PhotoCropper({
  file,
  onClose,
  onCrop,
  cropperProps,
  resizerProps,
} : {
  file: File;
  onClose: () => void;
  onCrop: (file: File) => void;
  cropperProps?: Partial<ReactCropProps>;
  resizerProps?: ResizerProps;
}) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const fileToken = useMemo(() => `${file.name}-${file.size}-${file.lastModified}`, [file]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const activeCropJobRef = useRef(0);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const generateCroppedImageUrl = async (
    nextCrop: PixelCrop,
    image: HTMLImageElement,
    sourceFile: File,
    scale?: number,
    rotate?: number,
  ) => {
    const cropJobId = ++activeCropJobRef.current;
    setProcessing(true);
    scale = scale || 1;
    rotate = rotate || 0;

    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const canvas = new OffscreenCanvas(
        nextCrop.width * scaleX,
        nextCrop.height * scaleY,
      );

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
        image.naturalHeight,
      );

      const blob = await canvas.convertToBlob({
        type: 'image/png',
      });

      if (cropJobId !== activeCropJobRef.current) {
        return;
      }

      const croppedFile = new File([blob], sourceFile.name, { type: "image/png" });

      Resizer.imageFileResizer(
        croppedFile,
        isNaN(resizerProps?.maxWidth) ? 140 : resizerProps?.maxWidth,
        isNaN(resizerProps?.maxHeight) ? 140 : resizerProps?.maxHeight,
        resizerProps?.compressFormat || "PNG",
        isNaN(resizerProps?.quality) ? 100 : resizerProps?.quality,
        0,
        (nextFile) => {
          if (cropJobId !== activeCropJobRef.current) {
            return;
          }

          setCroppedImageFile(nextFile as File);
          setProcessing(false);
        },
        "file",
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
    const aspect = cropperProps?.aspect || 1;

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
      unit: "px",
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

    void generateCroppedImageUrl(completedCrop, imageRef.current, file);
  }, [completedCrop, fileToken]);

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
              <DialogTitle className="text-white">Set Avatar</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="mx-auto w-fit">
              <ReactCrop
                crop={crop}
                onChange={nextCrop => {
                  setCrop(nextCrop);
                  setCroppedImageFile(null);
                }}
                aspect={cropperProps?.aspect || 1}
                minWidth={64}
                minHeight={64}
                keepSelection
                onComplete={setCompletedCrop}
                {...cropperProps}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  onLoad={handleImageLoad}
                  className="max-h-[62vh] w-auto"
                />
              </ReactCrop>
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