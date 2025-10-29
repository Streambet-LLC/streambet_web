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
  const imageRef = useRef<HTMLImageElement>();
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>();
  const [processing, setProcessing] = useState(false);

  const generateCroppedImageUrl = async (
    scale?: number,
    rotate?: number,
  ) => {
    setProcessing(true);
    scale = scale || 1;
    rotate = rotate || 0;

    const image = imageRef.current;

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const canvas = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    );

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const pixelRatio = window.devicePixelRatio;

    canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

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

    const croppedFile = new File([blob], file.name, { type: "image/png" });

    Resizer.imageFileResizer(
      croppedFile,
      isNaN(resizerProps?.maxWidth) ? 112 : resizerProps?.maxWidth,
      isNaN(resizerProps?.maxHeight) ? 112 : resizerProps?.maxHeight,
      resizerProps?.compressFormat || "PNG",
      isNaN(resizerProps?.quality) ? 100 : resizerProps?.quality,
      0,
      (file) => {
        setCroppedImageFile(file as File);
        setProcessing(false);
      },
      "file",
    );
  };

  const handleImageLoad = () => {
    if (!imageRef.current) return;

    const height = imageRef.current.height;
    const width = imageRef.current.width;

    const length = height < width ? height : width;

    setCrop({
      unit: "px",
      x: 0,
      y: 0,
      width: length,
      height: length,
    });
  };

  useEffect(() => {
    if (!completedCrop || !imageRef.current) return;

    generateCroppedImageUrl();
  }, [completedCrop])

  if (!imageUrl) return null;

  return (
    <>
      <Dialog open={!!file} onOpenChange={(state) => { !state && onClose() }}>
        <DialogContent hideCloseButton className='border-2 border-[#7AFF14] max-w-[40vw] max-h-[80vh] w-fit h-fit overflow-auto' style={{ background: '#0D0D0D' }}>
          <DialogHeader className="flex flex-row items-center justify-between bg-background">
            <DialogTitle>Set Avatar</DialogTitle>
            <DialogClose asChild>
              <Button variant="link" size="icon"><X /></Button>
            </DialogClose>
          </DialogHeader>
          <ReactCrop 
            crop={crop} 
            onChange={setCrop}
            aspect={1}
            minWidth={64}
            minHeight={64}
            keepSelection
            onComplete={setCompletedCrop}
            {...cropperProps}
          >
            <img ref={imageRef} src={imageUrl} onLoad={handleImageLoad} />
          </ReactCrop>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={processing} onClick={() => onCrop(croppedImageFile)}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
    
  )
};