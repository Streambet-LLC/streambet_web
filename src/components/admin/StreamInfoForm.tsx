import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X as XIcon, Loader2 } from 'lucide-react';
import { CopyableInput } from '../ui/CopyableInput';
import { getImageLink } from '@/utils/helper';

interface StreamInfoFormProps {
  isEdit?: boolean;
  initialValues: {
    title: string;
    description: string;
    embeddedUrl: string;
    thumbnailPreviewUrl?: string;
    startDateObj: Date | null;
    startTime: string;
    streamId?: string;
  };
  errors: {
    title?: string;
    embeddedUrl?: string;
    thumbnail?: string;
    startDate?: string;
  };
  isUploading: boolean;
  loading: boolean;
  isDragging: boolean;
  onChange: (fields: Partial<StreamInfoFormProps['initialValues']>) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  onDeleteThumbnail: () => void;
  onStartDateChange: (date: Date | null) => void;
  onStartTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Helper to format 24-hour time string to 12-hour format with AM/PM
function formatTime12hr(time24) {
  if (!time24) return '';
  const [hour, minute] = time24.split(':');
  const date = new Date();
  date.setHours(Number(hour), Number(minute));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const StreamInfoForm = ({
  isEdit = false,
  initialValues,
  errors,
  isUploading,
  loading,
  isDragging,
  onChange,
  onFileChange,
  onSubmit,
  onDeleteThumbnail,
  onStartDateChange,
  onStartTimeChange,
}: StreamInfoFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Drag and drop handlers
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    onFileChange(file);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <form className="space-y-8" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
      {/* Title */}
      <div>
        <Label className="text-white font-light mb-3 block">Title</Label>
        <Input
          className={`bg-[#272727] text-[#D7DFEF] placeholder:text-[#D7DFEF60] mt-2 ${errors.title ? 'border border-red-500' : 'border-none'}`}
          placeholder="Title of livestream"
          value={initialValues.title}
          maxLength={70}
          minLength={3}
          onChange={e => onChange({ title: e.target.value })}
          required
        />
        {errors.title && <div className="text-destructive text-xs mt-1">{errors.title}</div>}
      </div>
      {/* Description */}
      <div>
        <Label className="text-white font-light mb-3 block">Description</Label>
        <Textarea
          className="bg-[#272727] text-[#D7DFEF] placeholder:text-[#D7DFEF60] border-none mt-2"
          placeholder="Stream description"
          rows={10}
          value={initialValues.description}
          onChange={e => onChange({ description: e.target.value })}
        />
      </div>
      {/* Stream URL (if editing) */}
      {!!initialValues.streamId && (
        <div>
          <Label className="text-white font-light mb-3 block">Stream url</Label>
          <CopyableInput value={`${window.location.origin}/stream/${initialValues.streamId}`} />
        </div>
      )}
      {/* Embed URL */}
      <div>
        <Label className="text-white font-light mb-3 block">Embed URL</Label>
        <Input
          className={`bg-[#272727] text-[#D7DFEF] placeholder:text-[#D7DFEF60] mt-2 ${errors.embeddedUrl ? 'border border-red-500' : 'border-none'}`}
          placeholder="Embed URL"
          value={initialValues.embeddedUrl}
          disabled={isEdit && !!initialValues.embeddedUrl}
          onChange={e => onChange({ embeddedUrl: e.target.value })}
          required
        />
        {errors.embeddedUrl && <div className="text-destructive text-xs mt-1">{errors.embeddedUrl}</div>}
      </div>
      {/* Thumbnail upload */}
      <div ref={thumbnailRef}>
        <Label className="text-white font-light mb-3 block">Thumbnail</Label>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Left: Preview */}
          <div className="w-[215px] h-[136px] bg-[#808080] flex items-center justify-center rounded-none overflow-hidden border border-[#272727] relative">
            {initialValues.thumbnailPreviewUrl ? (
              <>
                <img src={getImageLink(initialValues.thumbnailPreviewUrl)} alt="Thumbnail preview" className="object-cover w-full h-full" />
                {!isUploading && (
                  <button
                    type="button"
                    className="absolute top-1 right-1 z-10 bg-[#232323] rounded-full p-1 hover:bg-destructive"
                    onClick={e => { e.stopPropagation(); onDeleteThumbnail(); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  >
                    <XIcon className="h-4 w-4 text-white" />
                  </button>
                )}
              </>
            ) : (
              <span className="text-white text-xs">No image</span>
            )}
          </div>
          {/* Right: Upload */}
          <div
            className={`flex-1 w-full flex flex-col items-center justify-center bg-[#272727] rounded-xl py-4 px-2 cursor-pointer border border-[#121212] ${isDragging ? 'ring-2 ring-primary' : ''} ${errors.thumbnail ? 'border-red-500' : ''}`}
            style={{ minHeight: 120 }}
            onClick={isUploading ? undefined : handleUploadClick}
            onDrop={isUploading ? undefined : handleDrop}
            onDragOver={isUploading ? undefined : handleDragOver}
            onDragLeave={isUploading ? undefined : handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center mt-2">
              <div className="flex items-center justify-center mb-1 relative">
                <div className="rounded-full bg-[#171717] border-4 border-[#121212] flex items-center justify-center" style={{ width: 44, height: 44 }}>
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <img src="/icons/cloud_upload.png" alt="Upload" style={{ width: 28, height: 19, objectFit: 'contain', display: 'block' }} />
                  )}
                </div>
              </div>
              <span className="text-sm text-center text-[#667085]" style={{ lineHeight: '1.7' }}>
                <span className="text-primary font-medium">Click to upload</span> or drag and drop<br />
                <span className="text-[#667085] text-[12px]">SVG, PNG, JPG or GIF (max. 1920x1080px)</span>
              </span>
            </div>
            {errors.thumbnail && <div className="text-destructive text-xs mt-1">{errors.thumbnail}</div>}
          </div>
        </div>
      </div>
      {/* Start date */}
      <div>
        <Label className="text-white font-light mb-3 block">Start date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`w-full bg-[#272727] text-[#D7DFEF] pl-10 mt-2 flex items-center h-10 rounded-md relative ${errors.startDate ? 'border border-red-500' : 'border-none'}`}
              style={{ textAlign: 'left' }}
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <CalendarIcon className="h-5 w-5 text-white" />
              </span>
              <span className={initialValues.startDateObj ? '' : 'text-[#FFFFFFBF]'}>
                {initialValues.startDateObj ? initialValues.startDateObj.toLocaleDateString() + (initialValues.startTime ? ` ${formatTime12hr(initialValues.startTime)}` : '') : 'Pick a date'}
              </span>
              {(initialValues.startDateObj || initialValues.startTime) && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent p-0"
                  onClick={e => { e.stopPropagation(); onChange({ startDateObj: null, startTime: '' }); }}
                >
                  <XIcon className="h-4 w-4 text-white" />
                </button>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={initialValues.startDateObj || undefined}
              onSelect={onStartDateChange}
              initialFocus
              showOutsideDays
              disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
            <div className="flex items-center gap-2 p-2">
              <span className="text-xs text-white">Time:</span>
              <input
                type="time"
                value={initialValues.startTime}
                onChange={onStartTimeChange}
                className="bg-[#272727] text-[#D7DFEF] border border-input rounded px-2 py-1 text-sm"
                style={{ color: 'white' }}
              />
            </div>
          </PopoverContent>
        </Popover>
        {errors.startDate && <div className="text-destructive text-xs mt-1">{errors.startDate}</div>}
      </div>
    </form>
  );
}; 
