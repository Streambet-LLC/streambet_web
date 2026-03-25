import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import PhotoCropper from '@/components/PhotoCropper';
import { IMAGE_UPLOAD_CONFIG } from '@/utils/imageUploadConstants';
import { getThumbnailUrl } from '@/utils/helper';
import { GripVertical, Loader2, Star, Trash2, Upload } from 'lucide-react';

export interface ItemImageInput {
  id: string;
  imageUrl: string;
  file?: File;
  isNew?: boolean;
}

interface ItemImageGalleryProps {
  images: ItemImageInput[];
  coverIndex: number;
  onImagesChange: (images: ItemImageInput[]) => void;
  onCoverIndexChange: (index: number) => void;
  onError?: (error: string | null) => void;
  maxImages?: number;
  disabled?: boolean;
}

interface SortableImageCardProps {
  image: ItemImageInput;
  index: number;
  isCover: boolean;
  disabled?: boolean;
  onSetCover: (index: number) => void;
  onRemove: (index: number) => void;
}

const createImageId = () =>
  `item-image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isBlobPreview = (image: ItemImageInput) =>
  !!image.isNew && image.imageUrl.startsWith('blob:');

const getDisplayImageUrl = (imageUrl: string) =>
  imageUrl.startsWith('blob:') ? imageUrl : getThumbnailUrl(imageUrl);

const revokeImagePreview = (image: ItemImageInput) => {
  if (isBlobPreview(image)) {
    URL.revokeObjectURL(image.imageUrl);
  }
};

const SortableImageCard = ({
  image,
  index,
  isCover,
  disabled,
  onSetCover,
  onRemove,
}: SortableImageCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`relative rounded-md border bg-background overflow-hidden ${
        isCover ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      }`}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        <span className="rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {index + 1}
        </span>
        {isCover && (
          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            Cover
          </span>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant={isCover ? 'default' : 'secondary'}
          className="h-7 w-7"
          onClick={() => onSetCover(index)}
          disabled={disabled}
          title={isCover ? 'Cover image' : 'Set as cover image'}
        >
          <Star className={`h-3.5 w-3.5 ${isCover ? 'fill-current' : ''}`} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-7 w-7"
          onClick={() => onRemove(index)}
          disabled={disabled}
          title="Remove image"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="absolute bottom-2 right-2 z-10">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-7 w-7 cursor-grab active:cursor-grabbing"
          disabled={disabled}
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </Button>
      </div>

      <img
        src={getDisplayImageUrl(image.imageUrl)}
        alt={`Item image ${index + 1}`}
        className="aspect-[8/13] w-full object-cover"
        draggable={false}
      />
    </div>
  );
};

export function ItemImageGallery({
  images,
  coverIndex,
  onImagesChange,
  onCoverIndexChange,
  onError,
  maxImages = 7,
  disabled = false,
}: ItemImageGalleryProps) {
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousImagesRef = useRef<ItemImageInput[]>(images);

  const currentCropFile = cropQueue[0] || null;
  const currentCropFileKey = currentCropFile
    ? `${currentCropFile.name}-${currentCropFile.size}-${currentCropFile.lastModified}`
    : '';
  const isAtLimit = images.length + cropQueue.length >= maxImages;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const acceptedTypes = useMemo(
    () => IMAGE_UPLOAD_CONFIG.ACCEPTED_IMAGE_TYPES.join(','),
    [],
  );

  const setGalleryError = (nextError: string | null) => {
    setError(nextError);
    onError?.(nextError);
  };

  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (!(IMAGE_UPLOAD_CONFIG.ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setGalleryError('Please upload JPEG, PNG, or WebP images only.');
        return;
      }

      if (file.size > IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        setGalleryError('Please upload images smaller than 5MB.');
        return;
      }

      validFiles.push(file);
    });

    return validFiles;
  };

  const enqueueFilesForCropping = (files: File[]) => {
    setGalleryError(null);

    if (!files.length || disabled) {
      return;
    }

    const validFiles = validateFiles(files);
    if (!validFiles.length) {
      return;
    }

    const availableSlots = Math.max(0, maxImages - images.length - cropQueue.length);
    if (availableSlots <= 0) {
      setGalleryError(`You can upload up to ${maxImages} images.`);
      return;
    }

    const filesToQueue = validFiles.slice(0, availableSlots);
    if (filesToQueue.length < validFiles.length) {
      setGalleryError(`Only ${availableSlots} image(s) were added due to the ${maxImages}-image limit.`);
    }

    setCropQueue((prev) => [...prev, ...filesToQueue]);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    enqueueFilesForCropping(files);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    if (croppedFile) {
      const previewUrl = URL.createObjectURL(croppedFile);
      const nextImages = [
        ...images,
        {
          id: createImageId(),
          imageUrl: previewUrl,
          file: croppedFile,
          isNew: true,
        },
      ];

      onImagesChange(nextImages);

      if (nextImages.length === 1) {
        onCoverIndexChange(0);
      }
    }

    setCropQueue((prev) => prev.slice(1));
  };

  const handleCropCancel = () => {
    setCropQueue((prev) => prev.slice(1));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || disabled) {
      return;
    }

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reorderedImages = arrayMove(images, oldIndex, newIndex);
    onImagesChange(reorderedImages);

    if (coverIndex === oldIndex) {
      onCoverIndexChange(newIndex);
    } else if (oldIndex < coverIndex && newIndex >= coverIndex) {
      onCoverIndexChange(coverIndex - 1);
    } else if (oldIndex > coverIndex && newIndex <= coverIndex) {
      onCoverIndexChange(coverIndex + 1);
    }
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index];
    if (imageToRemove) {
      revokeImagePreview(imageToRemove);
    }

    const nextImages = images.filter((_, i) => i !== index);
    onImagesChange(nextImages);

    if (nextImages.length === 0) {
      onCoverIndexChange(0);
      return;
    }

    if (coverIndex === index) {
      onCoverIndexChange(0);
      return;
    }

    if (coverIndex > index) {
      onCoverIndexChange(coverIndex - 1);
    }
  };

  useEffect(() => {
    const previousImages = previousImagesRef.current;
    const currentIds = new Set(images.map((img) => img.id));

    previousImages.forEach((img) => {
      if (!currentIds.has(img.id)) {
        revokeImagePreview(img);
      }
    });

    previousImagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      previousImagesRef.current.forEach((img) => revokeImagePreview(img));
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Item Photos</label>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border'
        } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-primary/50'}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragActive(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (disabled) {
            return;
          }
          const files = Array.from(event.dataTransfer.files || []);
          enqueueFilesForCropping(files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isAtLimit}
        />
        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-primary">Click to upload or drag and drop</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Up to {maxImages} photos. Images are cropped to 8:13 ratio.
        </p>
      </div>

      {!!cropQueue.length && (
        <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Cropping queue: {cropQueue.length} image{cropQueue.length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => (
                <SortableImageCard
                  key={image.id}
                  image={image}
                  index={index}
                  isCover={index === coverIndex}
                  disabled={disabled}
                  onSetCover={onCoverIndexChange}
                  onRemove={handleRemoveImage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {currentCropFile && (
        <PhotoCropper
          key={currentCropFileKey}
          file={currentCropFile}
          onClose={handleCropCancel}
          onCrop={handleCropComplete}
          cropperProps={{
            aspect: IMAGE_UPLOAD_CONFIG.PRIZE_SINGLE_SLAB_ASPECT_RATIO,
          }}
          resizerProps={{
            maxWidth: IMAGE_UPLOAD_CONFIG.PRIZE_SINGLE_SLAB_MAX_WIDTH,
            maxHeight: IMAGE_UPLOAD_CONFIG.PRIZE_SINGLE_SLAB_MAX_HEIGHT,
            compressFormat: 'JPEG',
            quality: IMAGE_UPLOAD_CONFIG.QUALITY,
          }}
        />
      )}
    </div>
  );
}
