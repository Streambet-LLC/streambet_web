import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { UserTable } from './UserTable';
import { StreamTable } from './StreamTable';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import api, { adminAPI } from '@/integrations/api/client';
import { ArrowLeft, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { getImageLink, getMessage } from '@/utils/helper';
import OverView from './OverView';
import { TabSwitch } from '../navigation/TabSwitch';
import { CopyableInput } from '../ui/CopyableInput';
import { useIsMobile } from '@/hooks/use-mobile';
import { BettingRounds } from './BettingRounds';
import { AdminStreamContent } from './AdminStreamContent';
import { BettingRoundStatus } from '@/types/bet';

interface BettingOption {
  optionId?: string;
  option: string;
}

interface BettingRound {
  roundId?: string;
  roundName: string;
  options: BettingOption[];
}

export const AdminManagement = ({
  session,
  streams,
  refetchStreams,
  searchStreamQuery,
  setSearchStreamQuery }) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeEditStreamTab, setActiveEditStreamTab] = useState('info');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isCreateStream, setIsCreateStream] = useState(false);
  const [viewStreamId, setViewStreamId] = useState('');
  const [editStreamId, setEditStreamId] = useState('');

  // Create livestream form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [embeddedUrl, setEmbeddedUrl] = useState('');
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Betting rounds state
  const [bettingRounds, setBettingRounds] = useState<BettingRound[]>([]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'livestreams', label: 'Livestreams' },
    { key: 'users', label: 'Users' },
  ];

  const editStreamTabs = [
    { key: 'info', label: 'Information' },
    { key: 'betting', label: 'Betting' },
  ];

  const createStreamMutation = useMutation({
    mutationFn: (payload: any) => editStreamId ? api.admin.updateStream(editStreamId, payload)
      : api.admin.createStream(payload),
    onSuccess: () => {
      if (!bettingRounds?.length)
      {
        toast({ title: 'Success', description: 'Stream saved successfully!' });
        handleRestAll();
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to create stream', variant: 'destructive' });
    },
  });

  const createBetMutation = useMutation({
    mutationFn: (payload: any) => payload?.rounds?.[0]?.roundId ?
      api.admin.updateBettingData(payload)
      : api.admin.createBettingData(payload),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Stream and Betting saved successfully!' });
      handleRestAll();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to create stream', variant: 'destructive' });
    },
  });

  const [errors, setErrors] = useState({
    title: '',
    embeddedUrl: '',
    thumbnail: '',
    startDate: '',
  });
  const [startTime, setStartTime] = useState(''); // format: 'HH:mm'

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | undefined>(undefined);

  // Refs for error scrolling
  const titleRef = useRef<HTMLInputElement>(null);
  const embeddedUrlRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Add new helper functions for time validation
  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const isTimeValid = (time: string, date: Date | null) => {
    if (!date || !time) return true;
    if (!isToday(date)) return true;

    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const selectedTime = new Date(date);
    selectedTime.setHours(hours, minutes);

    return selectedTime > now;
  };

  // Add handler for start date changes
  const handleStartDateChange = (date: Date | null) => {
    setStartDateObj(date);
    // Reset end date and time when start date changes
    setStartTime('');
    validateForm();
  };

  // Add handler for start time changes
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setStartTime(newTime);
    validateForm();
  };

  function resetForm() {
    // Reset text inputs
    setTitle('');
    setDescription('');
    setEmbeddedUrl('');

    // Reset dates and times
    setStartDateObj(null);
    setStartTime('');

    // Reset thumbnail related states
    setSelectedThumbnailFile(null);
    setThumbnailPreviewUrl(undefined);
    setThumbnailError(null);
    setIsDragging(false);
    setIsUploading(false);

    // Reset betting rounds
    setBettingRounds([]);

    // Clear the file input
    if (fileInputRef.current)
    {
      fileInputRef.current.value = '';
    }

    // Reset all errors
    setErrors({
      title: '',
      embeddedUrl: '',
      thumbnail: '',
      startDate: '',
    });
  }

  function scrollToFirstError() {
    if (errors.title && titleRef.current)
    {
      titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.embeddedUrl && embeddedUrlRef.current)
    {
      embeddedUrlRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.thumbnail && thumbnailRef.current)
    {
      thumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.startDate && startDateRef.current)
    {
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
    const newErrors = {
      title: '',
      embeddedUrl: '',
      thumbnail: '',
      startDate: '',
    };

    let isValid = true;

    if (!title)
    {
      newErrors.title = 'Title is required';
      isValid = false;
    }
    else if (title?.trim().length < 3 || title?.trim().length > 70)
    {
      newErrors.title = 'Title must be 3-70 characters';
      isValid = false;
    }

    if (!embeddedUrl?.trim() || (!embeddedUrl?.includes('http') && !embeddedUrl.includes('www') && !embeddedUrl.includes('kick')))
    {
      newErrors.embeddedUrl = 'Embed URL is required and should be valid';
      isValid = false;
    }
    if (!selectedThumbnailFile && !thumbnailPreviewUrl)
    {
      newErrors.thumbnail = 'Thumbnail is required';
      isValid = false;
    }
    if (!startDateObj)
    {
      newErrors.startDate = 'Start date is required';
      isValid = false;
    } else if (!startTime)
    {
      newErrors.startDate = 'Start time is required';
      isValid = false;
    } else if (isToday(startDateObj) && !isTimeValid(startTime, startDateObj))
    {
      newErrors.startDate = 'Cannot select past time for today';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const {
    data: betStreamData,
    isLoading: isBetStreamLoading,
    refetch: refetchBetStreamData,
  } = useQuery({
    queryKey: ['adminBetStreamData'],
    queryFn: async () => {
      const streamId = viewStreamId || editStreamId;
      if (streamId)
      {
        const response = await adminAPI.getStreamBetData(streamId);
        return response?.data;
      }
      return undefined;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchBetStreamData();
  }, [viewStreamId, editStreamId, refetchBetStreamData]);

  const { isPending: isBetStatusUpdating, mutateAsync: betStatusUpdate } = useMutation({
    mutationFn: ({ streamId, payload }: { streamId: string, payload: any }) => api.admin.updateBetStatus(streamId, payload),
    onSuccess: () => {
      refetchBetStreamData();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to update bet', variant: 'destructive' });
    },
  });

  const { isPending: isDeclareWinnerUpdating, mutateAsync: betDeclareWinner } = useMutation({
    mutationFn: (payload: any) => api.admin.declareWinner(payload),
    onSuccess: () => {
      refetchBetStreamData();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to declare the winner', variant: 'destructive' });
    },
  });

  const {
    data: streamData,
    isFetching: isStreamLoading,
    refetch: refetchStreamData,
  } = useQuery({
    queryKey: ['adminStreamData'],
    queryFn: async () => {
      if (editStreamId)
      {
        const response = await adminAPI.getStream(editStreamId);
        return response?.data;
      }
      return undefined;
    },
    enabled: false,
  });

  useEffect(() => {
    refetchStreamData();
  }, [editStreamId, refetchStreamData]);

  const handleOpenRound = (streamId: string) => {
    betStatusUpdate({ streamId, payload: { status: BettingRoundStatus.OPEN } });
  };

  const handleLockBets = (streamId: string) => {
    betStatusUpdate({ streamId, payload: { status: BettingRoundStatus.LOCKED } });
  };

  const handleEndRound = (optionId: string) => {
    betDeclareWinner(optionId);
  };

  useEffect(() => {
    if (!isStreamLoading && streamData)
    {
      setTitle(streamData?.streamName);
      setDescription(streamData?.description);
      setEmbeddedUrl(streamData?.embeddedUrl);
      setBettingRounds(streamData?.rounds || []);

      // Set thumbnail if available
      if (streamData.thumbnailUrl)
      {
        setThumbnailPreviewUrl(getImageLink(streamData.thumbnailUrl));
      }

      // Set start date and time if scheduledStartTime is available
      if (streamData.scheduledStartTime)
      {
        const date = new Date(streamData.scheduledStartTime);
        setStartDateObj(date);

        // Extract time in HH:mm format
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setStartTime(`${hours}:${minutes}`);
      }
    }
  }, [streamData, isStreamLoading]);

  function handleUploadClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  }
  async function handleFile(file: File) {
    // Validate file type
    if (!file.type.startsWith('image/'))
    {
      setErrors({
        ...errors,
        thumbnail: 'Please upload an image file',
        title: '',
        embeddedUrl: '',
        startDate: '',
      });
      return;
    }
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024)
    {
      setErrors({
        ...errors,
        thumbnail: 'Please upload an image smaller than 5MB',
        title: '',
        embeddedUrl: '',
        startDate: '',
      });
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
        const isValidSize = img.width <= 1920 && img.height <= 1080;
        if (!isValidSize)
        {
          setErrors(errors => ({ ...errors, thumbnail: 'Image must be maximum 1920x1080px' }));
          resolve(false);
        } else
        {
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
    if (e.dataTransfer.files && e.dataTransfer.files[0])
    {
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
    setErrors({
      ...errors,
      thumbnail: '',
      title: '',
      embeddedUrl: '',
      startDate: '',
    });
    // Clear the file input to allow reselection
    if (fileInputRef.current)
    {
      fileInputRef.current.value = '';
    }
  }

  async function handleCreateStream() {
    if (!validateForm())
    {
      // Scroll to first error after validation
      setTimeout(() => scrollToFirstError(), 100);
      toast({
        title: 'Form error',
        description: 'Please check your form for any validation error',
        variant: 'destructive'
      });
      return;
    }

    let thumbnailImageUrl = streamData?.thumbnailUrl || '';

    if (selectedThumbnailFile?.name)
    {
      try
      {
        setIsUploading(true);
        const response = await api.auth.uploadImage(selectedThumbnailFile, 'thumbnail');
        thumbnailImageUrl = response?.data?.Key;
        setIsUploading(false);
      } catch (error)
      {
        toast({
          variant: 'destructive',
          title: 'Error uploading stream thumbnail',
          description: getMessage(error) || 'Failed to upload thumbnail. Please try again.',
        });
        setIsUploading(false);
        return;
      }
    }

    const payload = {
      name: title,
      description,
      embeddedUrl,
      thumbnailUrl: thumbnailImageUrl,
      scheduledStartTime: formatDateTimeForISO(startDateObj, startTime),
    };

    createStreamMutation.mutate(payload);

    if (bettingRounds.length > 0)
    {
      const bettingPayload = {
        streamId: editStreamId,
        rounds: bettingRounds,
      };
      createBetMutation.mutate(bettingPayload);
    }
  }

  const handleRestAll = () => {
    setIsCreateStream(false);
    setViewStreamId('');
    setEditStreamId('');
    setActiveEditStreamTab('info');
    resetForm();
    setBettingRounds([]);
  };

  return (
    <div className="space-y-6">
      {isCreateStream || editStreamId ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Card className="w-full max-w-xl bg-[#0D0D0D] p-2 rounded-2xl shadow-lg border-none">
            <CardContent className="p-4 !pt-2 sm:p-6">
              {/* Back button only at top */}
              <div className="mb-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex w-[94px] h-[44px] items-center gap-2 bg-[#272727] text-white px-5 py-2 rounded-lg shadow-none border-none"
                  style={{ borderRadius: '10px', fontWeight: 400 }}
                  onClick={() => { handleRestAll() }}
                >
                  <ArrowLeft className="h-4 w-4 mr-0" /> Back
                </Button>
              </div>
              {/* Label and Create button in same row */}
              <div className="flex flex-row items-center justify-between mb-6">
                <span className="text-lg text-white font-light">{editStreamId ? 'Manage Livestream' : 'Create new livestream'}</span>
                <Button
                  type="submit"
                  className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[79px] h-[40px]"
                  style={{ borderRadius: '10px' }}
                  onClick={async (e) => {
                    e.preventDefault();
                    await handleCreateStream();
                  }}
                  disabled={createStreamMutation.isPending
                    || createBetMutation.isPending
                    || isUploading}
                >
                  {editStreamId ? (createStreamMutation.isPending
                    || createBetMutation.isPending
                    || isUploading ?
                    'Saving...' : 'Save')
                    : (createStreamMutation.isPending || isUploading) ? 'Creating...' : 'Create'}
                </Button>
              </div>
              {!!editStreamId && <TabSwitch tabs={editStreamTabs} activeTab={activeEditStreamTab} setActiveTab={setActiveEditStreamTab} />}
              <Separator className="my-4 bg-[#232323]" />
              {/* Form fields */}
              <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                {(isCreateStream || activeEditStreamTab === 'info') && <>
                  {/* Title */}
                  <div>
                    <Label className="text-white font-light mb-3 block">Title</Label>
                    <Input
                      ref={titleRef}
                      className={`bg-[#272727] text-[#D7DFEF] placeholder:text-[#D7DFEF60] mt-2 ${errors.title ? 'border border-red-500' : 'border-none'}`}
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
                    <Label className="text-white font-light mb-3 block">Description</Label>
                    <Textarea
                      className="bg-[#272727] text-[#D7DFEF] placeholder:text-[#D7DFEF60] border-none mt-2"
                      placeholder="Stream description"
                      rows={10}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                  {/* Stream URL */}
                  {!!editStreamId && <div>
                    <Label className="text-white font-light mb-3 block">Stream url</Label>
                    <CopyableInput value={`${window.location.origin}/stream/${editStreamId}`} />
                  </div>}
                  {/* Embed URL */}
                  <div>
                    <Label className="text-white font-light mb-3 block">Embed URL</Label>
                    <Input
                      ref={embeddedUrlRef}
                      className={`bg-[#272727] text-[#D7DFEF] placeholder:text-[#D7DFEF60] mt-2 ${errors.embeddedUrl ? 'border border-red-500' : 'border-none'}`}
                      placeholder="Embed URL"
                      value={embeddedUrl}
                      onChange={e => { setEmbeddedUrl(e.target.value); setErrors({ ...errors, embeddedUrl: '' }); }}
                      required
                    />
                    {errors.embeddedUrl && <div className="text-destructive text-xs mt-1">{errors.embeddedUrl}</div>}
                  </div>
                  {/* Thumbnail upload */}
                  <div ref={thumbnailRef}>
                    <Label className="text-white font-light mb-3 block">Thumbnail</Label>
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
                          ref={startDateRef}
                          type="button"
                          className={`w-full bg-[#272727] text-[#D7DFEF] pl-10 mt-2 flex items-center h-10 rounded-md relative ${errors.startDate ? 'border border-red-500' : 'border-none'}`}
                          style={{ textAlign: 'left' }}
                        >
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">
                            <CalendarIcon className="h-5 w-5 text-white" />
                          </span>
                          <span className={startDateObj ? '' : 'text-[#FFFFFFBF]'}>
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
                          onSelect={handleStartDateChange}
                          initialFocus
                          showOutsideDays
                          disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                        <div className="flex items-center gap-2 p-2">
                          <span className="text-xs text-white">Time:</span>
                          <input
                            ref={startTimeRef}
                            type="time"
                            value={startTime}
                            onChange={handleStartTimeChange}
                            min={startDateObj && isToday(startDateObj) ? getCurrentTime() : undefined}
                            className="bg-[#272727] text-[#D7DFEF] border border-input rounded px-2 py-1 text-sm"
                            style={{ color: 'white' }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    {errors.startDate && <div className="text-destructive text-xs mt-1">{errors.startDate}</div>}
                  </div>
                </>}
                {editStreamId && activeEditStreamTab === 'betting' && <>
                  <BettingRounds
                    rounds={bettingRounds}
                    onRoundsChange={setBettingRounds}
                  />
                </>}
              </form>
            </CardContent>
          </Card>
        </div>
      ) : viewStreamId ? <AdminStreamContent
        streamId={viewStreamId}
        session={session}
          betData={betStreamData?.rounds}
          isUpdatingAction={isBetStatusUpdating}
        handleOpenRound={handleOpenRound}
        handleLockBets={handleLockBets}
          handleEndRound={handleEndRound}
      /> : (
        <>
          {/* Top bar (tabs, search, create button) only when not creating stream */}
          <div className={`${isMobile ? 'flex flex-col space-y-4' : 'flex items-center justify-between'} w-full mb-4`}>
            <TabSwitch tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'users' && (
              <div className={`relative rounded-md border ${isMobile ? 'w-full' : 'w-[200px] lg:w-[400px]'}`} style={{ border: '1px solid #2D343E' }}>
                <Input
                  id="search-users"
                  type="text"
                  placeholder="Search users..."
                  value={searchUserQuery}
                  onChange={e => setSearchUserQuery(e.target.value)}
                  className="pl-9 rounded-md"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {activeTab === 'livestreams' && (
              <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-end'} w-full`}>
                <div className={`relative rounded-md ${isMobile ? 'w-full' : 'mr-2'}`} style={{ border: '1px solid #2D343E' }}>
                  <Input
                    id="search-streams"
                    type="text"
                    placeholder="Search streams..."
                    value={searchStreamQuery}
                    onChange={e => setSearchStreamQuery(e.target.value)}
                    className="pl-9 rounded-md"
                    style={isMobile ? {} : { minWidth: 180 }}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <button
                  type="button"
                  className={`bg-primary text-black font-bold px-6 py-2 rounded-full hover:bg-opacity-90 transition-colors ${isMobile ? 'w-full' : ''}`}
                  onClick={() => setIsCreateStream(true)}
                >
                  {isMobile ? 'Create Livestream' : 'Create new livestream'}
                </button>
              </div>
            )}
          </div>
          <Separator className="!mt-1" />
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverView />
            // <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            //   <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
            //     <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            //       Users
            //     </p>
            //     <p className="text-2xl font-semibold">${totalUsers}</p>
            //   </div>

            //   <div className="bg-zinc-900 text-white p-4 rounded-lg shadow relative">
            //     <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            //       Active Streams
            //     </p>
            //     <p className="text-2xl font-semibold">14</p>
            //   </div>

            //   <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
            //     <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            //       Active Bets
            //     </p>
            //     <p className="text-2xl font-semibold">${activeBets.toFixed(2)}</p>
            //   </div>

            //   <div className="bg-zinc-900 text-white p-4 rounded-lg shadow">
            //     <p className="text-sm font-medium pb-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>
            //       Time Live
            //     </p>
            //     <p className="text-2xl font-semibold">{totalLiveTime.toLocaleString()} hours</p>
            //   </div>
            // </div>
          )}

          {activeTab === 'livestreams' && (
            <div className="space-y-4">
              <StreamTable
                streams={streams}
                refetchStreams={refetchStreams}
                setViewStreamId={setViewStreamId}
                setEditStreamId={setEditStreamId}
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
