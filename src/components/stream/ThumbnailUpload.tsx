import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ThumbnailUploadProps {
  onUploadComplete: (url: string) => void;
}

export const ThumbnailUpload = ({ onUploadComplete }: ThumbnailUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const aspectRatio = img.width / img.height;
        const isValidRatio = Math.abs(aspectRatio - 16 / 9) < 0.1; // Allow small deviation from 16:9
        const isValidSize = img.width >= 1280 && img.height >= 720; // Minimum 720p

        if (!isValidRatio || !isValidSize) {
          toast({
            title: 'Invalid image dimensions',
            description:
              'Please upload an image with 16:9 aspect ratio and minimum resolution of 1280x720',
            variant: 'destructive',
          });
          resolve(false);
        }
        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        toast({
          title: 'Error',
          description: 'Failed to load image for validation',
          variant: 'destructive',
        });
        resolve(false);
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate image dimensions
    const isValid = await validateImage(file);
    if (!isValid) return;

    setSelectedFile(file);
    setIsUploading(true);

    try {
      console.log('Starting file upload process...');
      const fileName = `${crypto.randomUUID()}-${file.name}`;

      console.log('Uploading file to Supabase storage...', { fileName });
      const { data, error } = await supabase.storage
        .from('stream-thumbnails')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      console.log('File uploaded successfully:', data);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('stream-thumbnails').getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);

      toast({
        title: 'Success',
        description: 'Thumbnail uploaded successfully',
      });

      // Return the public URL
      onUploadComplete(publicUrl);
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: 'Upload failed',
        description: 'An error occurred while uploading the thumbnail',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Upload a thumbnail image (16:9 aspect ratio, minimum 1280x720)
        </p>
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isUploading}
            key={selectedFile ? undefined : 'reset'} // Reset input when upload completes
          />
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </div>
      {selectedFile && !isUploading && (
        <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>
      )}
    </div>
  );
};
