import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { UserTable } from './UserTable';
import { StreamTable } from './StreamTable';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import api from '@/integrations/api/client';
import { ArrowLeft, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { getMessage } from '@/utils/helper';

export const AdminManagement = ({
  streams,
  refetchStreams,
  searchStreamQuery,
  setSearchStreamQuery }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isCreateStream, setIsCreateStream] = useState(false);

  // Create livestream form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kickEmbedUrl, setKickEmbedUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const { toast } = useToast();

  // Replace with real data
  const totalUsers = 1280;
  const activeBets = 91.42;
  const totalLiveTime = 42321;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'livestreams', label: 'Livestreams' },
    { key: 'users', label: 'Users' },
  ];

  const createStreamMutation = useMutation({
    mutationFn: async (payload: any) => api.admin.createStream(payload),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Stream created successfully!' });
      setIsCreateStream(false);
      resetForm();
      refetchStreams();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to create stream', variant: 'destructive' });
    },
  });

  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);

  const [errors, setErrors] = useState({
    title: '',
    kickEmbedUrl: '',
    thumbnail: '',
    startDate: '',
  });
  const [startTime, setStartTime] = useState(''); // format: 'HH:mm'
  const [endTime, setEndTime] = useState('');
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | undefined>(undefined);

  // Refs for error scrolling
  const titleRef = useRef<HTMLInputElement>(null);
  const kickEmbedUrlRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  function resetForm() {
    setTitle('');
    setDescription('');
    setKickEmbedUrl('');
    setStartDate('');
    setEndDate('');
    setThumbnailError(null);
    setErrors({
      title: '',
      kickEmbedUrl: '',
      thumbnail: '',
      startDate: '',
    });
    setStartTime('');
    setEndTime('');
  }

  function scrollToFirstError() {
    if (errors.title && titleRef.current) {
      titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.kickEmbedUrl && kickEmbedUrlRef.current) {
      kickEmbedUrlRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.thumbnail && thumbnailRef.current) {
      thumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.startDate && startDateRef.current) {
      startDateRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function formatDateTimeForDisplay(date: Date | null, time: string): string {
    if (!date) return 'Select date';
    const dateStr = format(date, 'MM/dd/yyyy');
    if (!time) return dateStr;
    
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeStr = `${displayHour}:${minutes} ${ampm}`;
    
    return `${dateStr} ${timeStr}`;
  }

  function formatDateTimeForISO(date: Date | null, time: string): string | undefined {
    if (!date || !time) return undefined;
    
    // Create a new date object with the selected date and time
    const dateTime = new Date(date);
    const [hours, minutes] = time.split(':');
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Format as ISO 8601 string
    return dateTime.toISOString();
  }

  function validateForm() {
    const newErrors: any = {};
    if (title.trim().length < 3 || title.trim().length > 70) {
      newErrors.title = 'Title must be 3-70 characters';
    }
    if (!kickEmbedUrl.trim() || (!kickEmbedUrl.includes('http') && !kickEmbedUrl.includes('www') && !kickEmbedUrl.includes('kick'))) {
      newErrors.kickEmbedUrl = 'Embed URL is required and should be valid';
    }
    if (!selectedThumbnailFile) {
      newErrors.thumbnail = 'Thumbnail is required';
    }
    if (!startDateObj) {
      newErrors.startDate = 'Start date is required';
    } else if (!startTime) {
      newErrors.startDate = 'Start time is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleUploadClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }
  async function handleFile(file: File) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(errors => ({ ...errors, thumbnail: 'Please upload an image file' }));
      return;
    }
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(errors => ({ ...errors, thumbnail: 'Please upload an image smaller than 5MB' }));
      return;
    }
    // Validate image dimensions
    const isValid = await validateImage(file);
    if (!isValid) return;
    setSelectedThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
    setErrors(errors => ({ ...errors, thumbnail: '' }));
  }
  async function validateImage(file: File): Promise<boolean> {
    return new Promise(resolve => {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const isValidSize = img.width <= 800 && img.height <= 400;
        if (!isValidSize) {
          setErrors(errors => ({ ...errors, thumbnail: 'Image must be max 800x400px' }));
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        setErrors(errors => ({ ...errors, thumbnail: 'Failed to load image for validation' }));
        resolve(false);
      };
    });
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDeleteThumbnail() {
    setSelectedThumbnailFile(null);
    setThumbnailPreviewUrl(undefined);
    // Clear the file input to allow reselection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleCreateStream() {
    if (!validateForm()) {
      // Scroll to first error after validation
      setTimeout(() => scrollToFirstError(), 100);
      return;
    }

    let thumbnailImageUrl = '';

    if (selectedThumbnailFile?.name) {
        try {
          setIsUploading(true);
          const response = await api.auth.uploadImage(selectedThumbnailFile, 'thumbnail');
          thumbnailImageUrl = response?.data?.Key;
          setIsUploading(false);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Error uploading stream thumbnail',
            description: getMessage(error) || 'Failed to upload thumbnail. Please try again.',
          });
          setIsUploading(false);
        }
    }

    const payload = {
      name: title,
      description,
      kickEmbedUrl,
      thumbnailUrl: thumbnailImageUrl,
      scheduledStartTime: formatDateTimeForISO(startDateObj, startTime),
      endTime: formatDateTimeForISO(endDateObj, endTime),
    };

    createStreamMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      {isCreateStream ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Card className="w-full max-w-xl bg-[#0D0D0D] p-2 rounded-2xl shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              {/* Back button only at top */}
              <div className="mb-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex items-center gap-2 bg-[#272727] text-white px-5 py-2 rounded-lg shadow-none border-none"
                  style={{ borderRadius: '10px', fontWeight: 400 }}
                  onClick={() => { setIsCreateStream(false); resetForm(); }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
              {/* Label and Create button in same row */}
              <div className="flex flex-row items-center justify-between mb-6">
                <span className="text-lg text-white font-normal">Create new livestream</span>
                <Button
                  type="submit"
                  className="bg-primary text-black font-semibold px-6 py-2 rounded-lg shadow-none border-none"
                  style={{ borderRadius: '10px', fontWeight: 500 }}
                  onClick={async (e) => {
                    e.preventDefault();
                    await handleCreateStream();
                  }}
                  disabled={createStreamMutation.isPending || isUploading}
                >
                  {createStreamMutation.isPending || isUploading ? 'Creating...' : 'Create'}
                </Button>
              </div>
              <Separator className="my-4 bg-[#232323]" />
              {/* Form fields */}
              <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                {/* Title */}
                <div>
                  <Label className="text-white font-normal mb-3 block">Title</Label>
                  <Input
                    ref={titleRef}
                    className={`bg-[#272727] text-[#D7DFEF] placeholder:text-[#667085] mt-2 ${errors.title ? 'border border-red-500' : 'border-none'}`}
                    placeholder="Title of livestream"
                    value={title}
                    maxLength={70}
                    minLength={3}
                    onChange={e => { setTitle(e.target.value); setErrors({ ...errors, title: '' }); }}
                    required
                  />
                  {errors.title && <div className="text-destructive text-xs mt-1">{errors.title}</div>}
                </div>
                {/* Description */}
                <div>
                  <Label className="text-white font-normal mb-3 block">Description</Label>
                  <Textarea
                    className="bg-[#272727] text-[#D7DFEF] placeholder:text-[#667085] border-none mt-2"
                    placeholder="Stream description"
                    rows={10}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                {/* Kick embed URL */}
                <div>
                  <Label className="text-white font-normal mb-3 block">Kick embed URL</Label>
                  <Input
                    ref={kickEmbedUrlRef}
                    className={`bg-[#272727] text-[#D7DFEF] placeholder:text-[#667085] mt-2 ${errors.kickEmbedUrl ? 'border border-red-500' : 'border-none'}`}
                    placeholder="Kick embed URL"
                    value={kickEmbedUrl}
                    onChange={e => { setKickEmbedUrl(e.target.value); setErrors({ ...errors, kickEmbedUrl: '' }); }}
                    required
                  />
                  {errors.kickEmbedUrl && <div className="text-destructive text-xs mt-1">{errors.kickEmbedUrl}</div>}
                </div>
                {/* Thumbnail upload */}
                <div ref={thumbnailRef}>
                  <Label className="text-white font-normal mb-3 block">Thumbnail</Label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {/* Left: Preview */}
                    <div className="w-[215px] h-[136px] bg-[#808080] flex items-center justify-center rounded-none overflow-hidden border border-[#272727]">
                      {thumbnailPreviewUrl ? (
                        <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-white text-xs">No image</span>
                      )}
                    </div>
                    {/* Right: Upload */}
                    <div
                      className={`flex-1 w-full flex flex-col items-center justify-center bg-[#272727] rounded-xl py-4 px-2 cursor-pointer border border-dashed border-[#121212] ${isDragging ? 'ring-2 ring-primary' : ''} ${errors.thumbnail ? 'border-red-500' : ''}`}
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
                        onChange={handleFileChange}
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
                          {thumbnailPreviewUrl && !isUploading && (
                            <button
                              type="button"
                              className="absolute -top-2 -right-2 bg-[#232323] rounded-full p-1 hover:bg-destructive"
                              onClick={e => { e.stopPropagation(); handleDeleteThumbnail(); }}
                            >
                              <XIcon className="h-4 w-4 text-white" />
                            </button>
                          )}
                        </div>
                        <span className="text-sm text-center" style={{ lineHeight: '1.7' }}>
                          <span className="text-primary font-semibold">Click to upload</span> or drag and drop<br />
                          <span className="text-[#667085]">SVG, PNG, JPG or GIF (max. 800x400px)</span>
                        </span>
                      </div>
                      {errors.thumbnail && <div className="text-destructive text-xs mt-1">{errors.thumbnail}</div>}
                    </div>
                  </div>
                </div>
                {/* Start date */}
                <div>
                  <Label className="text-white font-normal mb-3 block">Start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        ref={startDateRef}
                        type="button"
                        className={`w-full bg-[#272727] text-[#D7DFEF] pl-10 mt-2 flex items-center h-10 rounded-md relative ${errors.startDate ? 'border border-red-500' : 'border-none'}`}
                        style={{ textAlign: 'left' }}
                      >
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          <CalendarIcon className="h-5 w-5 text-white" />
                        </span>
                        <span className={startDateObj ? '' : 'text-[#667085]'}>
                          {formatDateTimeForDisplay(startDateObj, startTime)}
                        </span>
                        {(startDateObj || startTime) && (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent p-0"
                            onClick={e => { e.stopPropagation(); setStartDateObj(null); setStartTime(''); }}
                          >
                            <XIcon className="h-4 w-4 text-white" />
                          </button>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDateObj || undefined}
                        onSelect={date => {
                          setStartDateObj(date as Date);
                          setErrors({ ...errors, startDate: '' });
                        }}
                        initialFocus
                        showOutsideDays
                        disabled={date => date < new Date(new Date().setHours(0,0,0,0))}
                      />
                      <div className="flex items-center gap-2 p-2">
                        <span className="text-xs text-white">Time:</span>
                        <input
                          ref={startTimeRef}
                          type="time"
                          value={startTime}
                          onChange={e => { setStartTime(e.target.value); setErrors({ ...errors, startDate: '' }); }}
                          className="bg-[#272727] text-[#D7DFEF] border border-input rounded px-2 py-1 text-sm"
                          style={{ color: 'white' }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  {errors.startDate && <div className="text-destructive text-xs mt-1">{errors.startDate}</div>}
                </div>
                {/* End date */}
                <div>
                  <Label className="text-white font-normal mb-3 block">End date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full bg-[#272727] text-[#D7DFEF] border-none pl-10 mt-2 flex items-center h-10 rounded-md relative"
                        style={{ textAlign: 'left' }}
                      >
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">
                          <CalendarIcon className="h-5 w-5 text-white" />
                        </span>
                        <span className={endDateObj ? '' : 'text-[#667085]'}>
                          {formatDateTimeForDisplay(endDateObj, endTime)}
                        </span>
                        {(endDateObj || endTime) && (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent p-0"
                            onClick={e => { e.stopPropagation(); setEndDateObj(null); setEndTime(''); }}
                          >
                            <XIcon className="h-4 w-4 text-white" />
                          </button>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDateObj || undefined}
                        onSelect={date => setEndDateObj(date as Date)}
                        initialFocus
                        showOutsideDays
                        disabled={date => date < new Date(new Date().setHours(0,0,0,0))}
                      />
                      <div className="flex items-center gap-2 p-2">
                        <span className="text-xs text-white">Time:</span>
                        <input
                          ref={endTimeRef}
                          type="time"
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          className="bg-[#272727] text-[#D7DFEF] border border-input rounded px-2 py-1 text-sm"
                          style={{ color: 'white' }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Top bar (tabs, search, create button) only when not creating stream */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex">
              {tabs.map((tab, idx) => {
                const isActive = activeTab === tab.key;
                const isFirst = idx === 0;
                const isLast = idx === tabs.length - 1;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
              px-6 py-2 text-sm font-medium
              border border-[#2D343E]
              ${isLast ? 'border-r-1' : ''}
              ${isFirst ? 'rounded-l-lg' : ''}
              ${isLast ? 'rounded-r-lg' : ''}
              ${isActive ? 'bg-[#2A2A2A] text-white' : ' text-white hover:bg-[#1f1f1f]'}
            `}
                    style={{
                      borderColor: '#2D343E',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'users' && (
              <div  className="relative rounded-md w-[200px] lg:w-[400px] border" style={{ border: '1px solid #2D343E'}}>
                <Input
                  id="search-users"
                  type="text"
                  placeholder="Search"
                  value={searchUserQuery}
                  onChange={e => setSearchUserQuery(e.target.value)}
                  className="pl-9 rounded-md"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {activeTab === 'livestreams' && (
              <div className="flex items-center justify-end w-full">
                <div className="relative mr-2" style={{ border: '1px solid #2D343E' }}>
                  <Input
                    id="search-streams"
                    type="text"
                    placeholder="Search"
                    value={searchStreamQuery}
                    onChange={e => setSearchStreamQuery(e.target.value)}
                    className="pl-9"
                    style={{ minWidth: 180 }}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <button
                  type="button"
                  className="bg-primary text-black font-bold px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors"
                  onClick={() => setIsCreateStream(true)}
                >
                  Create new livestream
                </button>
              </div>
            )}
            </div>
            <Separator className="!mt-1" />
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Users
                </p>
                <p className="text-2xl font-semibold">${totalUsers}</p>
              </div>

              <div className="bg-zinc-900 text-white p-4 rounded-lg shadow relative">
                <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Active Streams
                </p>
                <p className="text-2xl font-semibold">14</p>
              </div>

              <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Active Bets
                </p>
                <p className="text-2xl font-semibold">${activeBets.toFixed(2)}</p>
              </div>

              <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                  Time Live
                </p>
                <p className="text-2xl font-semibold">{totalLiveTime.toLocaleString()} hours</p>
              </div>
            </div>
          )}

          {activeTab === 'livestreams' && (
            <div className="space-y-4">
                <StreamTable
                  streams={streams}
                  refetchStreams={() => refetchStreams()}
                />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <UserTable searchUserQuery={searchUserQuery} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
