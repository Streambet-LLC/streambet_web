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
import { formatDateTimeForISO, getImageLink, getMessage } from '@/utils/helper';
import OverView from './OverView';
import { TabSwitch } from '../navigation/TabSwitch';
import { CopyableInput } from '../ui/CopyableInput';
import { useIsMobile } from '@/hooks/use-mobile';
import { BettingRounds, validateRounds, ValidationError } from './BettingRounds';
import { AdminStreamContent } from './AdminStreamContent';
import { BettingRoundStatus } from '@/enums';
import { StreamInfoForm } from './StreamInfoForm';

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
  const [activeTab, setActiveTab] = useState('livestreams');
  const [createStep, setCreateStep] = useState<'info' | 'betting'>('info');
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

  // Add error state for betting
  const [bettingErrorRounds, setBettingErrorRounds] = useState<number[]>([]);
  const [showBettingValidation, setShowBettingValidation] = useState(false);

  const [bettingValidationErrors, setBettingValidationErrors] = useState<ValidationError[]>([]);

  const tabs = [
    { key: 'livestreams', label: 'Livestreams' },
    { key: 'users', label: 'Users' },
  ];

  const createStreamMutation = useMutation({
    mutationFn: (payload: any) => editStreamId ? api.admin.updateStream(editStreamId, payload)
      : api.admin.createStream(payload),
    onSuccess: (response) => {
      if (bettingRounds.length > 0)
        {
          const bettingPayload = {
            streamId: editStreamId || response?.data?.id,
            rounds: bettingRounds,
          };
          createBetMutation.mutate(bettingPayload);
        }
      else
      {
        toast({ title: 'Success', description: 'Stream saved successfully!' });
        handleResetAll();
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
      handleResetAll();
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

  const [validationStarted, setValidationStarted] = useState(false);

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
    isFetching: isBetStreamLoading,
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

  const { isPending: isBetRoundCancelling, mutateAsync: cancelBetRound } = useMutation({
    mutationFn: (payload: any) => api.admin.cancelBetRound(payload),
    onSuccess: () => {
      refetchBetStreamData();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to update bet', variant: 'destructive' });
    },
  });

  const { isPending: isStreamEnding, mutateAsync: initiateEndStream } = useMutation({
    mutationFn: (streamId: string) => api.admin.endStream(streamId),
    onSuccess: () => {
      toast({
        title: 'Stream ended',
        description: 'Stream has successfully ended',
      });
      handleResetAll();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: getMessage(error) || 'Failed to end stream', variant: 'destructive' });
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
    betStatusUpdate({ streamId, payload: { newStatus: BettingRoundStatus.OPEN } });
  };

  const handleLockBets = (streamId: string) => {
    betStatusUpdate({ streamId, payload: { newStatus: BettingRoundStatus.LOCKED } });
  };
  
  const handleEndRound = (optionId: string) => {
    betDeclareWinner(optionId);
  };

  const handleCancelRound = (roundId: string) => {
    cancelBetRound(roundId);
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
    setValidationStarted(true);
    // Validate betting rounds
    const validationErrors = validateRounds(bettingRounds);
    setBettingValidationErrors(validationErrors);
    if (validationErrors.length > 0) {
      setShowBettingValidation(true);
      // Scroll to first error
      setTimeout(() => {
        const first = validationErrors[0];
        const el = document.querySelector('[data-round-index="' + first.roundIndex + '"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      toast({
        title: 'Validation Error',
        description: validationErrors[0].message,
        variant: 'destructive',
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
  }

  const handleResetAll = () => {
    setIsCreateStream(false);
    setViewStreamId('');
    setEditStreamId('');
    setCreateStep('info');
    resetForm();
    setBettingRounds([]);
  };

  // New: handle next step from info to betting
  const handleNextStep = async () => {
    if (!validateForm()) {
      setTimeout(() => scrollToFirstError(), 100);
      toast({
        title: 'Form error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    setCreateStep('betting');
  };

  // New: handle back from betting to info
  const handleBackStep = () => {
    setCreateStep('info');
    setBettingValidationErrors([]);
    setBettingErrorRounds([]);
    setShowBettingValidation(false);
  };

  // Wrap setBettingRounds to auto-clear errors if all rounds have at least one option
  const handleRoundsChange = (newRounds: BettingRound[]) => {
    setBettingRounds(newRounds);
    // Revalidate immediately on any name change
    const validationErrors = validateRounds(newRounds);
    setBettingValidationErrors(validationErrors);
    // If all rounds have at least one option, clear errors
    if (newRounds.every(r => r.options.length > 0)) {
      setBettingErrorRounds([]);
      setShowBettingValidation(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchStreamQuery]);

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
                  onClick={() => {
                    if (createStep === 'betting') {
                      handleBackStep();
                    } else {
                      handleResetAll();
                    }
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-0" /> Back
                </Button>
              </div>
              {/* Label and Create button in same row */}
              <div className="flex flex-row items-center justify-between mb-6">
                <span className="text-lg text-white font-light">{createStep === 'betting' ? (editStreamId ? 'Edit your betting options' : 'Create your betting options') : (editStreamId ? 'Manage Livestream' : 'Create new livestream')}</span>
                {/* Step 1: Next button, Step 2: Submit button */}
                {createStep === 'info' ? (
                  <Button
                    type="button"
                    className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[79px] h-[40px]"
                    style={{ borderRadius: '10px' }}
                    onClick={async (e) => {
                      e.preventDefault();
                      setValidationStarted(true);
                      await handleNextStep();
                    }}
                    disabled={createStreamMutation.isPending || createBetMutation.isPending || isUploading}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-primary text-black font-bold px-6 py-2 rounded-lg shadow-none border-none w-[140px] h-[40px]"
                    style={{ borderRadius: '10px' }}
                    onClick={async (e) => {
                      e.preventDefault();
                      await handleCreateStream();
                    }}
                    disabled={createStreamMutation.isPending || createBetMutation.isPending || isUploading}
                  >
                    {editStreamId ? (createStreamMutation.isPending || createBetMutation.isPending || isUploading ? 'Saving...' : 'Save') : (createStreamMutation.isPending || createBetMutation.isPending || isUploading) ? 'Creating...' : 'Create stream'}
                  </Button>
                )}
              </div>
              <Separator className="my-4 bg-[#232323]" />
              {/* Form fields */}
              <form className="space-y-8" onSubmit={e => e.preventDefault()}>
                {/* Step 1: Info */}
                {createStep === 'info' && (
                  <StreamInfoForm
                    initialValues={{
                      title,
                      description,
                      embeddedUrl,
                      thumbnailPreviewUrl,
                      startDateObj,
                      startTime,
                      streamId: editStreamId || undefined,
                    }}
                    errors={errors}
                    isUploading={isUploading}
                    loading={createStreamMutation.isPending || createBetMutation.isPending}
                    isDragging={isDragging}
                    onChange={fields => {
                      if (!validationStarted) {
                        if ('title' in fields) setTitle(fields.title ?? '');
                        if ('description' in fields) setDescription(fields.description ?? '');
                        if ('embeddedUrl' in fields) setEmbeddedUrl(fields.embeddedUrl ?? '');
                        if ('startDateObj' in fields) setStartDateObj(fields.startDateObj ?? null);
                        if ('startTime' in fields) setStartTime(fields.startTime ?? '');
                        return;
                      }
                      const newErrors = { ...errors };
                      if ('title' in fields) {
                        setTitle(fields.title ?? '');
                        const value = fields.title ?? '';
                        if (!value) newErrors.title = 'Title is required';
                        else if (value.trim().length < 3 || value.trim().length > 70) newErrors.title = 'Title must be 3-70 characters';
                        else newErrors.title = '';
                      }
                      if ('description' in fields) {
                        setDescription(fields.description ?? '');
                        // No validation for description
                      }
                      if ('embeddedUrl' in fields) {
                        setEmbeddedUrl(fields.embeddedUrl ?? '');
                        const value = fields.embeddedUrl ?? '';
                        if (!value.trim() || (!value.includes('http') && !value.includes('www') && !value.includes('kick')))
                          newErrors.embeddedUrl = 'Embed URL is required and should be valid';
                        else newErrors.embeddedUrl = '';
                      }
                      if ('startDateObj' in fields) {
                        setStartDateObj(fields.startDateObj ?? null);
                        const date = fields.startDateObj ?? null;
                        if (!date) newErrors.startDate = 'Start date is required';
                        else if (!startTime) newErrors.startDate = 'Start time is required';
                        else if (isToday(date) && !isTimeValid(startTime, date)) newErrors.startDate = 'Cannot select past time for today';
                        else newErrors.startDate = '';
                      }
                      if ('startTime' in fields) {
                        setStartTime(fields.startTime ?? '');
                        const value = fields.startTime ?? '';
                        if (!startDateObj) newErrors.startDate = 'Start date is required';
                        else if (!value) newErrors.startDate = 'Start time is required';
                        else if (isToday(startDateObj) && !isTimeValid(value, startDateObj)) newErrors.startDate = 'Cannot select past time for today';
                        else newErrors.startDate = '';
                      }
                      setErrors(newErrors);
                    }}
                    onFileChange={file => handleFileChange({ target: { files: file ? [file] : [] } } as any)}
                    onSubmit={async () => {
                      setValidationStarted(true);
                      await handleNextStep();
                    }}
                    onDeleteThumbnail={handleDeleteThumbnail}
                    onStartDateChange={handleStartDateChange}
                    onStartTimeChange={handleStartTimeChange}
                  />
                )}
                {/* Step 2: Betting */}
                {createStep === 'betting' && (
                  <BettingRounds
                    statusMap={betStreamData?.data?.rounds ? Object.fromEntries(betStreamData?.data?.rounds.map((r) => [r?.roundId, r?.status])) : {}}
                    rounds={bettingRounds}
                    onRoundsChange={handleRoundsChange}
                    onErrorRoundsChange={(errorRounds) => setBettingErrorRounds(errorRounds)}
                    editStreamId={editStreamId}
                    showValidationErrors={showBettingValidation}
                    errorRounds={bettingErrorRounds}
                    validationErrors={bettingValidationErrors}
                  />
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      ) : viewStreamId ? <AdminStreamContent
            streamId={viewStreamId}
            session={session}
            betData={betStreamData?.data?.rounds}
            isStreamEnding={isStreamEnding}
            isBetRoundCancelling={isBetRoundCancelling}
            isUpdatingAction={isBetStatusUpdating || isDeclareWinnerUpdating || isBetStreamLoading}
            handleOpenRound={handleOpenRound}
            handleLockBets={handleLockBets}
            handleEndRound={handleEndRound}
            handleCancelRound={handleCancelRound}
            handleEndStream={initiateEndStream}
            refetchBetData={refetchBetStreamData}
            handleBack={() => handleResetAll()}
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
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
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
