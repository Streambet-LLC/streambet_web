import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  value?: string;
  onChange?: (file: File) => void;
  onClear?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-20 w-20',
  lg: 'h-32 w-32',
};

export const AvatarUpload = React.forwardRef<HTMLDivElement, AvatarUploadProps>(
  ({ value, onChange, onClear, className, size = 'md', disabled }, ref) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [preview, setPreview] = React.useState<string | undefined>(value);
    const [isDragging, setIsDragging] = React.useState(false);

    React.useEffect(() => {
      setPreview(value);
    }, [value]);

    const handleFile = (file: File) => {
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        onChange?.(file);
      }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    };

    const handleClick = () => {
      if (!disabled) {
        fileInputRef.current?.click();
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClear?.();
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    };

    return (
      <div ref={ref} className={cn('relative inline-block', className)}>
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative cursor-pointer transition-all duration-200',
            'hover:opacity-90',
            isDragging && 'ring-2 ring-primary ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Avatar className={cn(sizeClasses[size])}>
            <AvatarImage src={preview} />
            <AvatarFallback>
              <Upload className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {preview && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
    );
  }
);

AvatarUpload.displayName = 'AvatarUpload';
